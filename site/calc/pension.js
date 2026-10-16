// 舊制退休金基數（勞基法第 55 條）。純計算；基數規則來自 data/rules/。
import { ceilMoney, ruleOn } from '../format.js';
import { tenure } from './severance.js';

/** 舊制年資（年）：未滿半年以半年計，滿半年以一年計 */
export function pensionYears(t, r) {
  const full = Math.floor(t.months / 12);
  const rest = t.months % 12;
  if (!rest && !t.days) return full;
  return full + (rest >= r.pension_half_year_months ? 1 : 0.5);
}

/**
 * input: { from, to, avgWage, disabilityOnDuty? }；rules：{ 'retirement-rules' }
 * from～to：適用勞基法舊制的年資期間（兩天都算）。
 */
export function oldPension(input, rules) {
  const r = ruleOn(rules, 'retirement-rules', input.to);
  const t = tenure(input.from, input.to);
  const years = pensionYears(t, r);
  const raw = r.pension_bases_first * Math.min(years, r.pension_first_years) + r.pension_bases_after * Math.max(years - r.pension_first_years, 0);
  let bases = Math.min(r.pension_max_bases, raw);
  if (input.disabilityOnDuty) bases *= 1 + r.duty_disability_bonus;
  return { ...t, years, bases, capped: raw > r.pension_max_bases, maxBases: r.pension_max_bases, payWithinDays: r.pay_within_days, amount: ceilMoney(input.avgWage * bases) };
}
