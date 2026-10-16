import { h, pageHead, field, num, alertBox, resultRow, formula, lawLink, basis, disclaimer } from '../lib/ui.js';
import { allRules } from '../lib/data.js';
import { rocDate, money, todayTaipei, isDate } from '../format.js';
import { checkMinimumWage } from '../calc/minimum-wage.js';

export async function render(root) {
  const rules = await allRules();
  const payType = field({ label: '計薪方式', type: 'select', value: 'monthly', options: [['monthly', '月薪'], ['hourly', '時薪']] });
  const amount = field({ label: '正常工時內的工資', unit: '元', min: 0, hint: '本薪＋固定津貼；不含加班費、休息日或國定假日出勤的加給' });
  const date = field({ label: '哪一天的工資', type: 'date', value: todayTaipei() });
  const out = h('div', { class: 'result', 'aria-live': 'polite' });

  function verdict(res, label) {
    const unit = payType.input.value === 'hourly' ? '時薪' : '月薪';
    const pending = res.entry.status === 'pending' ? '（尚未正式核定）' : '';
    if (res.ok) return alertBox('good', `${label}：沒有低於最低工資`, `${unit}最低 ${money(res.threshold)} 元${pending}。`);
    if (label === '目前') {
      return alertBox('crit', `${label}：低於最低工資 ${money(res.shortfall)} 元`, `${unit}最低 ${money(res.threshold)} 元。議定的工資低於最低工資時，以最低工資為準，要補足差額。`);
    }
    return alertBox('warn', `${label}：會低於最低工資 ${money(res.shortfall)} 元`, `${unit}最低 ${money(res.threshold)} 元${pending}。屆時要調到這個數字以上。`);
  }

  function update() {
    out.replaceChildren();
    const value = num(amount.input);
    if (!(value >= 0) || !isDate(date.input.value)) { out.append(alertBox('info', '請填工資金額')); return; }
    const res = checkMinimumWage({ payType: payType.input.value, amount: value, date: date.input.value }, rules);
    if (!res.current) { out.append(alertBox('warn', '查無這一天的最低工資資料')); return; }
    out.append(resultRow(`${rocDate(res.current.entry.effective_from)} 起的最低${payType.input.value === 'hourly' ? '時薪' : '月薪'}`, `${money(res.current.threshold)} 元`, true), verdict(res.current, '目前'));
    if (res.next) out.append(resultRow(`${rocDate(res.next.entry.effective_from)} 起`, `${money(res.next.threshold)} 元`), verdict(res.next, `${rocDate(res.next.entry.effective_from)} 起`));
    out.append(formula([
      '比較的是「正常工作時間內」的工資：本薪加上每月固定發的津貼。',
      '加班費、休息日與國定假日出勤的加給不能算進去（勞動基準法施行細則第 11 條）。',
      '月薪制部分工時、按日計酬的人，以時薪 × 實際正常工時檢查。',
      '扣完全勤獎金或其他扣款後，實領的正常工時工資也不能低於最低工資。',
    ]));
  }

  [payType, amount, date].forEach((f) => f.input.addEventListener('input', update));
  root.append(
    pageHead('最低工資檢查', '看看月薪或時薪有沒有低於最低工資，順便預告下一次調整。'),
    h('div', { class: 'calc' },
      h('section', { class: 'panel form-grid' }, payType.el, amount.el, date.el),
      h('section', { class: 'panel' }, h('h2', { class: 'section-title' }, '結果'), out)),
    basis(lawLink('N0030028', '5', '最低工資法第 5 條'), lawLink('N0030002', '11', '勞動基準法施行細則第 11 條')),
    disclaimer(),
  );
  update();
}
