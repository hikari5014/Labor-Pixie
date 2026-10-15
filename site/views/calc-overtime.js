import { h, pageHead, field, num, alertBox, resultRow, formula, lawLink, basis, disclaimer } from '../lib/ui.js';
import { rule } from '../lib/data.js';
import { money, todayTaipei, isDate } from '../format.js';
import { overtimePay, DAY_TYPES } from '../calc/overtime.js';

const HOURS_HINT = {
  weekday: '超過正常 8 小時的部分',
  rest: '當天實際出勤時數',
  holiday: '當天實際出勤時數',
  dayoff: '當天實際出勤時數',
};

export async function render(root, params, ctx) {
  const r = await rule('overtime-rates');
  const wage = field({ label: '月薪（含每月固定津貼）', unit: '元', min: 0, hint: '每月固定發的津貼、獎金屬於工資，要算進加班費基礎' });
  const date = field({ label: '加班的月份（任一天）', type: 'date', value: todayTaipei() });
  const rows = h('div', { class: 'rows' });
  const out = h('div', { class: 'result', 'aria-live': 'polite' });

  function addRow(type = 'weekday', hours = '2') {
    const t = field({ label: '日別', type: 'select', value: type, options: Object.entries(DAY_TYPES) });
    const hr = field({ label: '時數', unit: '小時', min: 0, step: 0.5, value: hours, hint: HOURS_HINT[type] });
    const hint = hr.el.querySelector('.field__hint');
    t.input.addEventListener('input', () => { hint.textContent = HOURS_HINT[t.input.value]; update(); });
    hr.input.addEventListener('input', update);
    const row = h('div', { class: 'row-item' }, t.el, hr.el,
      h('button', { type: 'button', class: 'btn', onclick: () => { row.remove(); update(); } }, '刪除這一天'));
    row.read = () => ({ type: t.input.value, hours: num(hr.input) || 0 });
    rows.append(row);
    update();
  }

  function update() {
    out.replaceChildren();
    const w = num(wage.input);
    if (!(w > 0) || !isDate(date.input.value)) { out.append(alertBox('info', '請填月薪')); return; }
    const days = [...rows.children].map((row) => row.read());
    if (!days.length) { out.append(alertBox('info', '請新增加班的日子')); return; }
    const res = overtimePay({ date: date.input.value, monthlyWage: w, days }, r);
    out.append(resultRow('時薪（月薪 ÷ 240）', `${money(res.hourly.toFixed(2))} 元`));
    res.days.forEach((d, i) => out.append(resultRow(`第 ${i + 1} 天：${DAY_TYPES[d.type]} ${d.hours} 小時`, `${money(d.pay.toFixed(2))} 元`)));
    out.append(resultRow('加班費合計', `${money(res.total)} 元`, true), resultRow('計入每月上限的時數', `${res.countHours} 小時`));
    if (res.over54) out.append(alertBox('crit', '超過每月 54 小時', '即使經勞資會議同意，每月也不能超過 54 小時，且每 3 個月不超過 138 小時。'));
    else if (res.over46) out.append(alertBox('warn', '超過每月 46 小時', '要經勞資會議同意才能延長到 54 小時（每 3 個月不超過 138 小時），否則違法。'));
    else out.append(alertBox('good', '在每月 46 小時內'));
    if (res.overDaily) out.append(alertBox('crit', '有一天超過 12 小時', '正常工時加延長工時，一天合計不能超過 12 小時。'));
    if (res.dayoffWork) out.append(alertBox('crit', '例假原則上不能出勤', '只有天災、事變或突發事件才可以，工資加倍並要事後補假休息；平常給錢也不能讓例假出勤合法。'));
    out.append(formula([
      '平日延長工時：前 2 小時 × 1.34，再 2 小時 × 1.67（月薪已含正常 8 小時的工資）。',
      '休息日：前 2 小時 × 1.34、第 3–8 小時 × 1.67、第 9–12 小時 × 2.67；出勤時數全部計入每月 46 小時。',
      '國定假日：以「日」計，8 小時內不論做多久都加給 1 日工資（時薪 × 8）；超過 8 小時的部分比照平日延長工時，並計入 46 小時。',
      '例假：限天災、事變、突發事件，加給 1 日並補假，不計入 46 小時。',
      '倍率往上取（1.34、1.67、2.67），合計無條件進位到元，避免短付。',
    ]));
  }

  wage.input.addEventListener('input', update);
  date.input.addEventListener('input', update);
  root.append(
    pageHead('加班費試算', '月薪制員工平日、休息日、國定假日、例假出勤的加班費，並檢查每月 46 小時上限。'),
    h('div', { class: 'calc' },
      h('section', { class: 'panel form-grid' }, wage.el, date.el, h('h2', { class: 'section-title' }, '加班的日子'), rows,
        h('button', { type: 'button', class: 'btn', onclick: () => addRow() }, '＋ 新增一天')),
      h('section', { class: 'panel' }, h('h2', { class: 'section-title' }, '結果'), out)),
    alertBox('info', '時薪人員的規則不同', '時薪制、部分工時人員的國定假日是以約定的每日工時計，休息日、例假的工資已含在時薪裡；本試算器以月薪制計算。'),
    ctx.role() === 'employer'
      ? alertBox('info', '雇主要注意', '出勤紀錄上的時間會被推定為經雇主同意的工作時間；只說「他沒申請加班」不夠，要能證明那段時間沒有工作。加班可以換補休，但要勞工同意，到期沒休完要折發工資。')
      : alertBox('info', '勞工可以留意', '請保留打卡紀錄、加班申請、工作訊息與郵件；這些是主張加班費最重要的證據。'),
    basis(lawLink('N0030001', '24', '勞動基準法第 24 條'), lawLink('N0030001', '32', '第 32 條'), lawLink('N0030001', '39', '第 39 條'), lawLink('N0030001', '40', '第 40 條')),
    disclaimer(),
  );
  addRow('weekday', '2');
}
