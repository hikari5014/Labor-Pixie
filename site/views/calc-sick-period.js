import { h, pageHead, field, num, alertBox, resultRow, formula, lawLink, basis, disclaimer } from '../lib/ui.js';
import { allRules } from '../lib/data.js';
import { rocDate, money, isDate, ruleOn } from '../format.js';
import { sickPeriod } from '../calc/sick-period.js';

const WEEK = '日一二三四五六';

export async function render(root) {
  const rules = await allRules();
  const start = field({ label: '病假第一天', type: 'date' });
  const end = field({ label: '病假最後一天', type: 'date' });
  const rest = field({ label: '每週固定休息的日子', type: 'select', value: '0,6', options: [['0,6', '週六、週日'], ['0,1', '週日、週一'], ['5,6', '週五、週六'], ['0', '只有週日（另有排休）']] });
  const used = field({ label: '今年之前已請的未住院病假（選填）', unit: '日', min: 0, value: '0' });
  const wage = field({ label: '月薪（選填）', unit: '元', min: 0 });
  const out = h('div', { class: 'result', 'aria-live': 'polite' });

  function update() {
    out.replaceChildren();
    if (!isDate(start.input.value) || !isDate(end.input.value)) { out.append(alertBox('info', '請填病假的第一天與最後一天')); return; }
    if (end.input.value < start.input.value) { out.append(alertBox('crit', '最後一天早於第一天')); return; }
    const res = sickPeriod({ start: start.input.value, end: end.input.value, restWeekdays: rest.input.value.split(',').map(Number),
      usedThisYear: num(used.input) || 0, monthlyWage: num(wage.input) || 0 }, rules);
    const limit = ruleOn(rules, 'sick-leave-rules', start.input.value).half_pay_days_per_year;
    out.append(
      resultRow('期間總天數', `${res.calendarDays} 日`),
      resultRow('原本就休假的日子（照給工資，不算病假）', `${res.offDays} 日`),
      resultRow('算病假的日子', `${res.sickDays} 日`, true),
      resultRow('其中工資折半', `${res.halfPayDays} 日`),
    );
    if (res.unpaidDays) out.append(resultRow('超過一年上限、不給工資', `${res.unpaidDays} 日`));
    if (res.wageDeduction !== undefined) out.append(resultRow('工資最多可扣', `${money(res.wageDeduction)} 元`, true));
    if (res.longLeave) out.append(alertBox('warn', `連續請病假超過 ${limit} 日`, `超過 ${limit} 日以後的部分，期間遇到例假、休息日、國定假日也算進病假；可以改請特休或依規定申請留職停薪。`));
    if (res.calendarMissing) out.append(alertBox('warn', '期間有年度的國定假日資料還沒收錄', '那一年的國定假日沒有扣掉，請自行確認。'));
    if (res.offList.length) {
      out.append(h('details', { class: 'formula' }, h('summary', {}, '哪些日子不算病假？'),
        h('ul', { class: 'notes small' }, res.offList.map((d) => h('li', {}, `${rocDate(d.date)}（${WEEK[new Date(Date.parse(d.date)).getUTCDay()]}）${d.name}`)))));
    }
    out.append(formula([
      `病假 ${limit} 日以內，期間遇到例假、休息日、國定假日（含補假）是原本的休假，照給全薪，不算病假。`,
      `一次連續請病假超過 ${limit} 日時，超過的部分期間遇到例假等日子併計為病假。`,
      '國定假日與補假日期依人事行政總處的辦公日曆表；勞工的補假日期可由勞雇雙方另外協商。',
      '扣款捨去小數，寧可少扣、不要多扣。',
    ]));
  }

  [start, end, rest, used, wage].forEach((f) => f.input.addEventListener('input', update));
  root.append(
    pageHead('連續請病假的天數', '請了一段長病假，算出哪些日子算病假、哪些是原本就放假（照給工資）。'),
    h('div', { class: 'calc' },
      h('section', { class: 'panel form-grid' }, start.el, end.el, rest.el, used.el, wage.el),
      h('section', { class: 'panel' }, h('h2', { class: 'section-title' }, '結果'), out)),
    h('p', { class: 'small' }, '相關：', h('a', { href: '#/calc/sick-leave' }, '病假、事假與全勤獎金')),
    basis(lawLink('N0030006', '4', '勞工請假規則第 4 條'), lawLink('N0030002', '23-1', '施行細則第 23-1 條（補假）')),
    disclaimer(),
  );
  update();
}
