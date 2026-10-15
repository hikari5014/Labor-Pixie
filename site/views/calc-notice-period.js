import { h, pageHead, field, num, alertBox, resultRow, formula, lawLink, basis, disclaimer } from '../lib/ui.js';
import { rule } from '../lib/data.js';
import { rocDate, money, todayTaipei, isDate, yearsMonths } from '../format.js';
import { noticePeriod } from '../calc/severance.js';

export async function render(root, params, ctx) {
  const r = await rule('notice-period');
  const hire = field({ label: '到職日', type: 'date' });
  const end = field({ label: '契約終止日', type: 'date', value: todayTaipei() });
  const wage = field({ label: '月薪（選填）', unit: '元', min: 0, hint: '要算「沒有預告時要付的預告工資」才填' });
  const out = h('div', { class: 'result', 'aria-live': 'polite' });

  function update() {
    out.replaceChildren();
    const input = { hireDate: hire.input.value, endDate: end.input.value, monthlyWage: num(wage.input) };
    if (!isDate(input.hireDate) || !isDate(input.endDate)) { out.append(alertBox('info', '請填到職日與契約終止日')); return; }
    if (input.endDate < input.hireDate) { out.append(alertBox('crit', '契約終止日早於到職日')); return; }
    const res = noticePeriod(input, r);
    out.append(resultRow('年資', yearsMonths(res.months)), resultRow('應預告期間', res.days ? `${res.days} 日` : '不用預告', true));
    if (res.days) {
      out.append(
        resultRow('最晚預告日', rocDate(res.latestNoticeDate)),
        alertBox('info', '謀職假', `預告期間內，勞工每週可以請最多 ${res.jobSearchPerWeek} 日的工作時間去找工作，工資照給。`),
      );
      if (res.noticePay !== undefined) out.append(resultRow('沒有預告時要付的預告工資', `${money(res.noticePay)} 元`, true));
    } else {
      out.append(alertBox('good', '年資未滿 3 個月，不用預告', '仍要依法給資遣費（按比例）。'));
    }
    out.append(
      h('p', { class: 'small' }, h('a', { href: '#/calc/severance' }, '算資遣費 →')),
      formula([
        '雇主依第 11 條或第 13 條但書終止契約時才要預告；年資算到契約終止日。',
        '滿 3 個月未滿 1 年：10 日；滿 1 年未滿 3 年：20 日；滿 3 年以上：30 日。',
        '沒有依規定預告就終止契約，要付預告期間的工資：月薪 ÷ 30 × 預告日數，無條件進位到元。',
      ]),
    );
  }

  [hire, end, wage].forEach((f) => f.input.addEventListener('input', update));
  root.append(
    pageHead('預告期間與謀職假', '資遣前要提早幾天通知、沒通知要付多少錢。'),
    h('div', { class: 'calc' },
      h('section', { class: 'panel form-grid' }, hire.el, end.el, wage.el),
      h('section', { class: 'panel' }, h('h2', { class: 'section-title' }, '結果'), out)),
    ctx.role() === 'employer'
      ? alertBox('info', '雇主要注意', '試用期間不適任要終止，也要符合資遣事由；年資滿 3 個月後就要預告 10 日。建議在試用約 2 個月時先完成考核判斷。')
      : alertBox('info', '勞工可以留意', '勞工自己要離職時，也要依同樣天數提前告知雇主。'),
    basis(lawLink('N0030001', '16', '勞動基準法第 16 條'), lawLink('N0030001', '15', '第 15 條')),
    disclaimer(),
  );
  update();
}
