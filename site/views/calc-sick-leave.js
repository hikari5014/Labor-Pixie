import { h, pageHead, field, num, alertBox, resultRow, formula, lawLink, basis, disclaimer } from '../lib/ui.js';
import { allRules } from '../lib/data.js';
import { money } from '../format.js';
import { leaveDeduction, LEAVE_TYPES } from '../calc/sick-leave.js';

export async function render(root, params, ctx) {
  const rules = await allRules();
  const type = field({ label: '假別', type: 'select', value: 'sick', options: Object.entries(LEAVE_TYPES) });
  const days = field({ label: '這次請假日數', unit: '日', min: 0, step: 0.5, value: '1' });
  const used = field({ label: '今年之前已請的未住院病假', unit: '日', min: 0, value: '0' });
  const wage = field({ label: '月薪', unit: '元', min: 0 });
  const bonus = field({ label: '全勤獎金', unit: '元', min: 0, value: '0' });
  const out = h('div', { class: 'result', 'aria-live': 'polite' });

  function update() {
    out.replaceChildren();
    const isSick = type.input.value === 'sick' || type.input.value === 'miscarriage';
    used.el.hidden = !isSick;
    const w = num(wage.input);
    if (!(w > 0) || !(num(days.input) > 0)) { out.append(alertBox('info', '請填月薪與請假日數')); return; }
    const res = leaveDeduction({ leaveType: type.input.value, days: num(days.input), monthlyWage: w, attendanceBonus: num(bonus.input) || 0, usedThisYear: num(used.input) || 0 }, rules);
    if (isSick) out.append(resultRow('工資折半的日數', `${res.halfPayDays} 日`));
    if (res.unpaidDays) out.append(resultRow('不給工資的日數', `${res.unpaidDays} 日`));
    out.append(resultRow('工資最多可扣', `${money(res.wageDeduction)} 元`, true));
    if (res.bonusRule === 'proportional') out.append(resultRow('全勤獎金最多可扣', `${money(res.bonusDeduction)} 元`, true));
    if (res.bonusRule === 'none') out.append(alertBox('good', '不能扣全勤獎金', '這種假不得視為缺勤而影響全勤獎金。'));
    if (res.bonusRule === 'company') out.append(alertBox('info', '全勤獎金依公司規定', '一般事假沒有按比例扣的規定，依工作規則；但扣款要合理，扣完正常工時的工資也不能低於最低工資。'));
    if (isSick && res.unpaidDays) out.append(alertBox('warn', `超過一年 ${res.limits.half_pay_days_per_year} 日`, `未住院病假一年最多 ${res.limits.half_pay_days_per_year} 日；超過的部分要改請事假、特休，或依規定申請留職停薪。`));
    if (isSick) {
      out.append(res.protected
        ? alertBox('good', `今年累計 ${res.yearTotal} 日，未超過 ${res.limits.protected_days} 日`, '雇主不得因為請病假給予不利處分（例：考績、獎金、調職）；有爭議時由雇主舉證處分和病假無關。')
        : alertBox('info', `今年累計 ${res.yearTotal} 日，已超過 ${res.limits.protected_days} 日`, '考核仍要綜合工作能力、態度與實際績效，不能只看病假天數。'));
    }
    out.append(formula([
      `日薪＝月薪 ÷ 30＝${money(res.daily.toFixed(2))} 元。`,
      '未住院普通傷病假：一年 30 日內工資折半發給（有勞保傷病給付但未達半數的，雇主補足）。',
      '病假扣全勤要按比例：全勤獎金 ÷ 30 × 病假日數。婚假、喪假、公傷病假、公假、照顧家人的事假、懷孕未滿 3 個月流產的病假，都不能扣全勤。',
      '扣款捨去小數，寧可少扣、不要多扣。公司約定比法令更好的，從其約定。',
    ]));
  }

  [type, days, used, wage, bonus].forEach((f) => f.input.addEventListener('input', update));
  root.append(
    pageHead('病假、事假與全勤獎金', '依 115 年起的請假新制：病假全勤按比例扣、照顧家人的事假不扣全勤。'),
    h('div', { class: 'calc' },
      h('section', { class: 'panel form-grid' }, type.el, days.el, used.el, wage.el, bonus.el),
      h('section', { class: 'panel' }, h('h2', { class: 'section-title' }, '結果'), out)),
    ctx.role() === 'employer'
      ? alertBox('info', '雇主要注意', '請檢查全勤獎金規則與考績辦法是否已依新制修改；溝通時把「病假（依法按比例）」和「遲到早退（依公司規則）」分開說明。')
      : alertBox('info', '勞工可以留意', '照顧家人的事假一年最多 7 日（併入事假 14 日），可以用小時請，而且不能扣全勤。'),
    basis(lawLink('N0030006', '4', '勞工請假規則第 4 條'), lawLink('N0030006', '7', '第 7 條'), lawLink('N0030006', '9', '第 9 條'), lawLink('N0030006', '9-1', '第 9-1 條')),
    disclaimer(),
  );
  update();
}
