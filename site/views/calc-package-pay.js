import { h, pageHead, field, num, alertBox, resultRow, formula, lawLink, basis, disclaimer } from '../lib/ui.js';
import { allRules } from '../lib/data.js';
import { money, todayTaipei, isDate, entryOn } from '../format.js';
import { packagePay, ratesFrom, HOUR_KEYS, sundaysIn } from '../calc/package-pay.js';

const LABELS = {
  weekday12: '平日加班 第 1–2 小時',
  weekday34: '平日加班 第 3–4 小時',
  rest12: '休息日 第 1–2 小時',
  rest38: '休息日 第 3–8 小時',
  rest912: '休息日 第 9–12 小時',
};

function hourFields(prefix) {
  const out = {};
  for (const k of HOUR_KEYS) out[k] = field({ label: `${prefix}${LABELS[k]}`, unit: '小時／月', min: 0, value: '' });
  return out;
}

function readHours(fields) {
  const out = {};
  for (const k of HOUR_KEYS) out[k] = num(fields[k].input) || 0;
  return out;
}

export async function render(root, params, ctx) {
  const rules = await allRules();
  const overtime = rules['overtime-rates'];
  const total = field({ label: '統包月薪（含加班費的總額）', unit: '元', min: 0 });
  const date = field({ label: '適用日期', type: 'date', value: todayTaipei(), hint: '用來選當時的最低工資與倍率' });
  const planned = hourFields('預估 ');
  planned.weekday12.input.value = '20';
  const buffer = field({ label: '保守多抓的加權時數（選填）', unit: '小時', min: 0, hint: '多抓一點，固定加班費就多一點，比較不會短付' });
  const actual = hourFields('實際 ');
  const month = field({ label: '約定休假的月份（選填）', type: 'month', value: todayTaipei().slice(0, 7) });
  const restDays = field({ label: '約定每月休假天數（選填）', unit: '日', min: 0 });
  const checks = [
    field({ label: '契約寫明月薪包含哪些加班費（平日、休息日、國定假日）與預估時數', type: 'checkbox' }),
    field({ label: '薪資單分列底薪、津貼與加班費，不是只有一行總額', type: 'checkbox' }),
    field({ label: '每天都有出勤紀錄（免打卡也要簽到或登載）', type: 'checkbox' }),
  ];

  const out = h('div', { class: 'result', 'aria-live': 'polite' });
  const settle = h('div', { class: 'result', 'aria-live': 'polite' });
  const three = h('div', { class: 'result', 'aria-live': 'polite' });

  function update() {
    out.replaceChildren(); settle.replaceChildren(); three.replaceChildren();
    const t = num(total.input);
    if (!(t > 0) || !isDate(date.input.value)) { out.append(alertBox('info', '請填統包月薪')); return; }
    const actualHours = readHours(actual);
    const hasActual = Object.values(actualHours).some((v) => v > 0);
    const input = { total: t, date: date.input.value, hours: readHours(planned), buffer: num(buffer.input) || 0, actual: hasActual ? actualHours : undefined };
    const res = packagePay(input, rules);
    const rates = ratesFrom(entryOn(overtime.entries, input.date));

    out.append(
      resultRow('換算時薪', `${money(res.hourly.toFixed(2))} 元`),
      resultRow('底薪（含固定津貼）', `${money(res.base)} 元`, true),
      resultRow('固定加班費', `${money(res.fixedOvertime)} 元`, true),
      resultRow('預估加班時數', `${res.plannedHours} 小時／月`),
      res.minWageOk === false
        ? alertBox('crit', `底薪低於最低工資 ${money(res.minimumWage)} 元`, '統包總額不夠涵蓋這麼多加班，請提高總額或減少預估時數。')
        : alertBox('good', '底薪沒有低於最低工資', `最低月薪 ${money(res.minimumWage)} 元。也請確認底薪和職位相稱。`),
      res.hoursOk
        ? alertBox('good', `預估加班在每月 ${res.cap} 小時內`)
        : alertBox('crit', `預估加班超過每月 ${res.cap} 小時`, '經勞資會議同意可以延長，但有每月與每 3 個月的上限（見速查表）。'),
      h('div', { class: 'alert alert--info' }, h('b', {}, '薪資單建議寫法'),
        h('div', {}, `本薪與固定津貼 ${money(res.base)} 元＋固定加班費 ${money(res.fixedOvertime)} 元（含平日加班 ${input.hours.weekday12 + input.hours.weekday34} 小時、休息日 ${input.hours.rest12 + input.hours.rest38 + input.hours.rest912} 小時，以時薪 ${res.hourly.toFixed(2)} 元計）＝ ${money(t)} 元。實際加班超過時依法補發差額；未達時固定加班費照付、不扣減。`)),
    );

    const lines = [
      `加權時數＝Σ 倍率 × 時數：平日 1–2 小時 ×${rates.weekday12}、3–4 小時 ×${rates.weekday34}；休息日 1–2 小時 ×${rates.rest12}、3–8 小時 ×${rates.rest38}、9–12 小時 ×${rates.rest912}${input.buffer ? `，再加保守多抓 ${input.buffer}` : ''}，合計 ${res.weighted.toFixed(2)}。`,
      `時薪＝統包月薪 ${money(t)} ÷（240 ＋ ${res.weighted.toFixed(2)}）＝ ${res.hourly.toFixed(4)} 元。240 是月薪制每月的正常工時（30 日 × 8 小時）。`,
      `底薪＝時薪 × 240，捨去小數＝ ${money(res.base)} 元；固定加班費＝總額 − 底薪＝ ${money(res.fixedOvertime)} 元（捨去的零頭算進加班費，比較不會短付）。`,
      '倍率一律用 1.34、1.67、2.67（法律規定「加給三分之一、三分之二以上」，往上取，不用 1.33）。',
    ];
    if (res.legalOvertime !== undefined) lines.push(`當月應得加班費＝時薪 × 實際加權時數，無條件進位＝ ${money(res.legalOvertime)} 元。`);
    out.append(formula(lines));

    if (res.legalOvertime === undefined) {
      settle.append(alertBox('info', '填入當月實際加班時數，就會算出要不要補發'));
    } else {
      settle.append(
        resultRow('當月實際加班時數', `${res.actualHours} 小時`),
        resultRow('依實際時數應得加班費', `${money(res.legalOvertime)} 元`),
        resultRow('已含在月薪的固定加班費', `${money(res.fixedOvertime)} 元`),
        res.topUp > 0
          ? alertBox('warn', `本月要補發 ${money(res.topUp)} 元`, '實際加班費比固定加班費多，差額必須補足。')
          : alertBox('good', '本月不用補發', '實際加班比預估少時，固定加班費仍要全額照付，不能扣減。'),
      );
      if (!res.actualHoursOk) settle.append(alertBox('crit', `當月實際加班超過 ${res.cap} 小時`, '超過法定上限，可能被裁罰。'));
    }

    const missing = checks.filter((c) => !c.input.checked).length;
    three.append(missing
      ? alertBox('crit', `還有 ${missing} 件沒做到`, '契約、薪資單、出勤紀錄三件事少一件，打官司時都很難證明加班費已經付過。')
      : alertBox('good', '三件事都做到了', '記得每月保留薪資單與出勤紀錄 5 年。'));
    if (month.input.value && num(restDays.input) >= 0 && restDays.input.value !== '') {
      const sundays = sundaysIn(month.input.value);
      three.append(num(restDays.input) < sundays
        ? alertBox('crit', `約定的休假天數少於當月例假日數（約 ${sundays} 日）`, '例假原則上不能出勤，月休天數不能少於當月例假日數。')
        : alertBox('good', `約定的休假天數不少於當月例假日數（約 ${sundays} 日）`, '這裡以星期日估算例假，請依公司實際排班確認。'));
    }
  }

  const all = [total, date, buffer, month, restDays, ...Object.values(planned), ...Object.values(actual), ...checks];
  all.forEach((f) => f.input.addEventListener('input', update));
  checks.forEach((f) => f.input.addEventListener('change', update));

  root.append(
    pageHead('統包薪資反推與多退少補', '「月薪已含加班費」可以約定，但要拆得出來、算得清楚。這裡把統包月薪拆成底薪與固定加班費，並算出每月要不要補發。'),
    h('div', { class: 'calc' },
      h('section', { class: 'panel form-grid' }, h('h2', { class: 'section-title' }, '① 約定內容'), total.el, date.el, ...HOUR_KEYS.map((k) => planned[k].el), buffer.el),
      h('section', { class: 'panel' }, h('h2', { class: 'section-title' }, '拆分結果'), out)),
    h('div', { class: 'calc' },
      h('section', { class: 'panel form-grid' }, h('h2', { class: 'section-title' }, '② 當月實際加班'), ...HOUR_KEYS.map((k) => actual[k].el)),
      h('section', { class: 'panel' }, h('h2', { class: 'section-title' }, '多退少補'), settle)),
    h('div', { class: 'calc' },
      h('section', { class: 'panel form-grid' }, h('h2', { class: 'section-title' }, '③ 三件事有沒有一致'), ...checks.map((c) => c.el), month.el, restDays.el),
      h('section', { class: 'panel' }, h('h2', { class: 'section-title' }, '檢查結果'), three)),
    ctx.role() === 'employer'
      ? alertBox('info', '雇主要注意', '統包約定不違法，但打官司時要能證明「加班費到底是多少、什麼時候付的」。法院與主管機關對統包約定的見解並不一致，最保險的做法是契約寫明、薪資單分列、出勤有紀錄，並且每月多退少補。')
      : alertBox('info', '勞工可以留意', '月薪說「含加班費」時，可以要求公司寫清楚含幾小時、怎麼算。實際加班超過時，差額可以請求補發；請保留出勤紀錄與薪資單。'),
    basis(lawLink('N0030001', '24', '勞動基準法第 24 條'), lawLink('N0030001', '32', '第 32 條'), lawLink('N0030001', '30', '第 30 條'), lawLink('N0030028', '5', '最低工資法第 5 條')),
    disclaimer(),
  );
  update();
}
