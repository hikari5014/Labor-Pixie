import { h, pageHead, field, num, alertBox, resultRow, formula, lawLink, basis, disclaimer } from '../lib/ui.js';
import { allRules } from '../lib/data.js';
import { rocDate, money, todayTaipei, isDate } from '../format.js';
import { averageWage } from '../calc/severance.js';

export async function render(root) {
  const rules = await allRules();
  const event = field({ label: '計算事由發生日', type: 'date', value: todayTaipei(), hint: '例：資遣、退休、職災發生的那一天' });
  const hire = field({ label: '到職日', type: 'date' });
  const wages = field({ label: '這段期間的工資總額', unit: '元', min: 0, hint: '本薪、固定津貼、加班費、經常性獎金都要算；不計入期間的工資要扣掉' });
  const excluded = field({ label: '不計入的日數（選填）', unit: '日', min: 0, hint: '職災醫療中、普通傷病假、留職停薪、減半發薪的產假、雇主因天災停工等期間' });
  const byDay = field({ label: '按日、按時或論件計酬', type: 'checkbox' });
  const workDays = field({ label: '實際工作日數（按日計酬才填）', unit: '日', min: 0 });
  const out = h('div', { class: 'result', 'aria-live': 'polite' });
  const period = h('p', { class: 'small muted' });

  function update() {
    out.replaceChildren();
    const input = { eventDate: event.input.value, hireDate: hire.input.value, wages: num(wages.input), excludedDays: num(excluded.input) || 0, byDay: byDay.input.checked, workDays: num(workDays.input) || 0 };
    if (!isDate(input.eventDate) || !isDate(input.hireDate)) { out.append(alertBox('info', '請填事由發生日與到職日')); return; }
    if (input.hireDate >= input.eventDate) { out.append(alertBox('crit', '到職日要早於事由發生日')); return; }
    const res = averageWage({ ...input, wages: input.wages > 0 ? input.wages : 0 }, rules);
    period.textContent = `計算期間：${rocDate(res.periodStart)}～${rocDate(res.periodEnd)}，共 ${res.calendarDays} 日。`;
    out.append(resultRow('計算期間', `${rocDate(res.periodStart)}～${rocDate(res.periodEnd)}`), resultRow('計入日數', `${res.days} 日`));
    if (!(input.wages > 0)) { out.append(alertBox('info', '請填這段期間的工資總額')); return; }
    if (res.days <= 0) { out.append(alertBox('crit', '不計入的日數太多', '計入日數要大於 0。')); return; }
    out.append(
      resultRow('日平均工資', `${money(res.daily.toFixed(2))} 元`),
      resultRow('月平均工資（× 30）', `${money(res.monthly.toFixed(2))} 元`, true),
    );
    if (res.shortPeriod) out.append(alertBox('info', '工作未滿 6 個月', '以實際工作期間的工資總額 ÷ 工作期間總日數計算。'));
    if (res.floorApplied) out.append(alertBox('warn', '已套用六成下限', `按日計酬的平均工資不得少於「工資總額 ÷ 實際工作日數」的六成，所以用 ${money(res.daily.toFixed(2))} 元。`));
    out.append(
      h('p', { class: 'small' }, h('a', { href: '#/calc/severance' }, '用這個月平均工資算資遣費 →')),
      formula([
        `平均工資＝事由發生當日前 6 個月內的工資總額 ÷ 該期間總日數。事由發生當天不算，所以期間到 ${rocDate(res.periodEnd)}。`,
        `日平均工資＝${money(input.wages)} ÷ ${res.days} ＝ ${money(res.daily.toFixed(4))} 元；月平均工資＝日平均 × 30。`,
        '職災醫療、普通傷病假、留職停薪等期間的日數與工資都不計入，免得把平均工資拉低。',
        '「工資」包含經常性給與：固定津貼、加班費、按月發的獎金都算；恩惠性的年終獎金、紅利一般不算。',
      ]),
    );
  }

  [event, hire, wages, excluded, workDays].forEach((f) => f.input.addEventListener('input', update));
  byDay.input.addEventListener('change', update);
  root.append(
    pageHead('平均工資', '資遣費、退休金、職災補償都用它當基礎。'),
    h('div', { class: 'calc' },
      h('section', { class: 'panel form-grid' }, event.el, hire.el, period, wages.el, excluded.el, byDay.el, workDays.el),
      h('section', { class: 'panel' }, h('h2', { class: 'section-title' }, '結果'), out)),
    basis(lawLink('N0030001', '2', '勞動基準法第 2 條第 4 款'), lawLink('N0030002', '2', '施行細則第 2 條')),
    disclaimer(),
  );
  update();
}
