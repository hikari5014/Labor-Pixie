// 舊制退休金基數（勞基法第 55 條）。純計算，不碰畫面。
import { ceilMoney } from '../format.js';
import { tenure } from './severance.js';

/** 舊制年資（年）：未滿半年以半年計，滿半年以一年計 */
export function pensionYears(t) {
  const full = Math.floor(t.months / 12);
  const rest = t.months % 12;
  if (!rest && !t.days) return full;
  return full + (rest >= 6 ? 1 : 0.5);
}

/**
 * input: { from, to, avgWage, disabilityOnDuty? }
 * from～to：適用勞基法舊制的年資期間（兩天都算）。
 */
export function oldPension(input) {
  const t = tenure(input.from, input.to);
  const years = pensionYears(t);
  let bases = Math.min(45, 2 * Math.min(years, 15) + Math.max(years - 15, 0));
  const capped = 2 * Math.min(years, 15) + Math.max(years - 15, 0) > 45;
  if (input.disabilityOnDuty) bases *= 1.2;
  return { ...t, years, bases, capped, amount: ceilMoney(input.avgWage * bases) };
}
