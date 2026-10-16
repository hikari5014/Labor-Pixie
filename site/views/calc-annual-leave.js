import { h, pageHead, field, num, alertBox, resultRow, formula, lawLink, basis, disclaimer } from '../lib/ui.js';
import { allRules } from '../lib/data.js';
import { rocDate, money, todayTaipei, isDate, yearsMonths, ruleOn } from '../format.js';
import { annualLeave } from '../calc/annual-leave.js';

function tierText(e) {
  const parts = e.tiers.map((t) => `滿 ${yearsMonths(t.from_months)} ${t.days} 日`);
  const x = e.after_10_years;
  if (x) parts.push(`之後每滿 1 年加 ${x.add_days_per_year} 日，最多 ${x.max_days} 日`);
  return parts.join('、');
}

export async function render(root, params, ctx) {
  const rules = await allRules();
  const hire = field({ label: '到職日', type: 'date', value: '' });
  const date = field({ label: '計算日', type: 'date', value: todayTaipei(), hint: '預設今天' });
  const wage = field({ label: '月薪（選填）', unit: '元', min: 0, hint: '要算未休特休折發工資時才填' });
  const unused = field({ label: '未休天數（選填）', unit: '日', min: 0, step: 0.5 });
  const out = h('div', { class: 'result', 'aria-live': 'polite' });

  function update() {
    out.replaceChildren();
    const input = { hireDate: hire.input.value, date: date.input.value, monthlyWage: num(wage.input), unusedDays: num(unused.input) };
    if (!isDate(input.hireDate) || !isDate(input.date)) { out.append(alertBox('info', '請填到職日')); return; }
    if (input.date < input.hireDate) { out.append(alertBox('crit', '計算日早於到職日', '請檢查兩個日期。')); return; }
    const res = annualLeave(input, rules);
    out.append(resultRow('年資', yearsMonths(res.months)));
    if (!res.periodStart) {
      out.append(resultRow('目前特休', '0 日', true), alertBox('info', '還沒有特休', `${rocDate(res.next.date)} 起有 ${res.next.days} 日。`));
    } else {
      out.append(resultRow(`本期特休（${rocDate(res.periodStart)} 起）`, `${res.days} 日`, true));
      if (res.next) out.append(resultRow(`${rocDate(res.next.date)} 起`, `${res.next.days} 日`));
    }
    if (res.payout !== undefined) {
      out.append(resultRow('未休特休折發工資', `${money(res.payout)} 元`, true));
    }
    const lines = [
      `從到職日 ${rocDate(input.hireDate)} 算到 ${rocDate(input.date)}，已滿 ${yearsMonths(res.months)}。`,
      `天數：${tierText(ruleOn(rules, 'annual-leave', input.date))}。`,
      '這裡用「週年制」：每到到職週年就換新的一期。公司若用曆年制（每年 1/1 換期），天數要另外按比例換算，但不能少於週年制。',
    ];
    if (res.payout !== undefined) lines.push(`未休折發：月薪 ${money(input.monthlyWage)} ÷ 30 × ${input.unusedDays} 日 ＝ ${money(res.dailyWage * input.unusedDays)}，無條件進位到元。`);
    out.append(formula(lines));
  }

  [hire, date, wage, unused].forEach((f) => f.input.addEventListener('input', update));
  root.append(
    pageHead('特休天數與未休折算', '依勞動基準法第 38 條，算出現在有幾天特休、下一次什麼時候增加。'),
    h('div', { class: 'calc' },
      h('section', { class: 'panel form-grid' }, hire.el, date.el, wage.el, unused.el),
      h('section', { class: 'panel' }, h('h2', { class: 'section-title' }, '結果'), out)),
    ctx.role() === 'employer'
      ? alertBox('info', '雇主要注意', '特休由勞工排定；年度終結或離職時未休的天數要發給工資。要遞延到下一年，須每年和勞工協商並留下書面同意。')
      : alertBox('info', '勞工可以留意', '特休由你排定。年度結束或離職時沒休完的天數，公司要發工資；公司不能片面決定「自動遞延」。'),
    basis(lawLink('N0030001', '38', '勞動基準法第 38 條')),
    disclaimer(),
  );
  update();
}
