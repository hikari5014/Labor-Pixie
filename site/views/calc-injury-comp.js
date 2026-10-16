import { h, pageHead, field, num, alertBox, resultRow, formula, lawLink, basis, disclaimer } from '../lib/ui.js';
import { allRules } from '../lib/data.js';
import { money, todayTaipei, ruleOn } from '../format.js';
import { injuryCompensation } from '../calc/injury-comp.js';

export async function render(root, params, ctx) {
  const rules = await allRules();
  const r = ruleOn(rules, 'injury-compensation', todayTaipei());
  const wage = field({ label: '原領工資（月薪）', unit: '元', min: 0, hint: '職災前最近一個月正常工時的工資，不含加班費' });
  const insured = field({ label: '平均月投保薪資', unit: '元', min: 0, hint: '職災發生當月起前 6 個月的平均；沒有投保填 0' });
  const days = field({ label: '醫療中不能工作的日數', unit: '日', min: 0, value: '30' });
  const out = h('div', { class: 'result', 'aria-live': 'polite' });

  function update() {
    out.replaceChildren();
    const w = num(wage.input);
    if (!(w > 0) || !(num(days.input) > 0)) { out.append(alertBox('info', '請填原領工資與不能工作的日數')); return; }
    const res = injuryCompensation({ date: todayTaipei(), originalWage: w, insuredSalary: num(insured.input) || 0, days: num(days.input) }, rules);
    out.append(
      resultRow('雇主應補償的原領工資', `${money(res.employerTotal)} 元`),
      resultRow('職災保險傷病給付（推估）', `${money(res.insurance)} 元`),
      resultRow('　其中全額給付', `${res.fullDays} 日`),
      resultRow('　其中 70% 給付', `${res.reducedDays} 日`),
      resultRow('雇主要補的差額', `${money(res.topUp)} 元`, true),
    );
    if (!(num(insured.input) > 0)) out.append(alertBox('crit', '沒有投保', '雇主未依法投保時，原領工資補償全部由雇主負擔；勞保局先發給勞工的保險給付，也會向公司追繳，另有罰鍰。'));
    else if (res.topUp > 0) out.append(alertBox('warn', `保險給付不夠，雇主要補 ${money(res.topUp)} 元`, '常見原因：前 3 日保險不給付、投保薪資低於實際薪資、第 3 個月起只給 70%。'));
    else out.append(alertBox('good', '保險給付已足夠抵充', '雇主不用另外補差額。'));
    if (res.overMax) out.append(alertBox('warn', '已超過 2 年', `醫療滿 2 年仍未痊癒、經認定喪失原有工作能力，又不合失能給付標準時，雇主可以一次給付 ${res.lumpSumMonths} 個月平均工資，免除之後的工資補償責任。`));
    out.append(formula([
      `雇主補償＝原領工資 ÷ ${r.employer_daily_divisor} × 日數，從第 1 天起算，無條件進位。`,
      `傷病給付自不能工作第 ${r.waiting_days + 1} 日起：前 ${r.full_benefit_days} 日按平均月投保薪資 ÷ ${r.insured_daily_divisor}，之後按 ${Math.round(r.reduced_ratio * 100)}%，最長 ${r.max_benefit_days} 日。實際金額以勞保局核定為準。`,
      '同一事故，雇主可以用職災保險給付抵充補償，只要補不足的部分。',
      '醫療期間雇主不得終止契約（天災事變致事業不能繼續、經主管機關核定的除外）。',
    ]));
  }

  [wage, insured, days].forEach((f) => f.input.addEventListener('input', update));
  root.append(
    pageHead('職災醫療期間工資補償', '職災治療中不能上班時，雇主要補多少、保險付多少。'),
    h('div', { class: 'calc' },
      h('section', { class: 'panel form-grid' }, wage.el, insured.el, days.el),
      h('section', { class: 'panel' }, h('h2', { class: 'section-title' }, '結果'), out)),
    ctx.role() === 'employer'
      ? alertBox('info', '雇主要注意', '投保薪資要照實際薪資申報；低報時差額由公司自己負擔。發生職災要依規定通報，並協助員工申請保險給付。')
      : alertBox('info', '勞工可以留意', '醫療期間的工資補償由雇主負責，保險給付可以抵充；請保留診斷證明與不能工作的證明。'),
    basis(lawLink('N0030001', '59', '勞動基準法第 59 條'), lawLink('N0030001', '13', '第 13 條'), lawLink('N0050031', '42', '職災保險法第 42 條')),
    disclaimer(),
  );
  update();
}
