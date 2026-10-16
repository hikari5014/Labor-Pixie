// 特別休假天數與未休折算（週年制）。純計算，不碰畫面；天數表與換算基準都來自 data/rules/。
import { anniversary, completedMonths, ceilMoney, ruleOn } from '../format.js';

/** 依年資月數算出特休天數 */
export function leaveDaysFor(months, entry) {
  let days = 0;
  for (const t of entry.tiers) if (months >= t.from_months) days = t.days;
  const extra = entry.after_10_years;
  const last = entry.tiers[entry.tiers.length - 1];
  if (extra && months >= last.from_months) {
    days = Math.min(extra.max_days, last.days + Math.floor((months - last.from_months) / 12) * extra.add_days_per_year);
  }
  return days;
}

/**
 * input: { hireDate, date, monthlyWage?, unusedDays? }；rules：{ 'annual-leave', 'wage-basis' }
 * 回傳本期天數、下一次調整、未休折算金額。
 */
export function annualLeave(input, rules) {
  const { hireDate, date } = input;
  const entry = ruleOn(rules, 'annual-leave', date);
  const first = entry.tiers[0].from_months;
  const months = completedMonths(hireDate, date);
  const days = leaveDaysFor(months, entry);
  let periodStart = null;
  if (months >= first) periodStart = months < 12 ? anniversary(hireDate, first) : anniversary(hireDate, Math.floor(months / 12) * 12);
  // 下一次天數變動的日子：滿第一個門檻、之後每個週年
  let nextMonths = months < first ? first : (Math.floor(months / 12) + 1) * 12;
  let next = null;
  for (let i = 0; i < 60 && !next; i += 1, nextMonths += 12) {
    const d = leaveDaysFor(nextMonths, entry);
    if (d !== days) next = { date: anniversary(hireDate, nextMonths), days: d };
  }
  const result = { months, days, periodStart, next };
  if (input.monthlyWage > 0 && input.unusedDays > 0) {
    result.dailyWage = input.monthlyWage / ruleOn(rules, 'wage-basis', date).days_per_month;
    result.payout = ceilMoney(result.dailyWage * input.unusedDays);
  }
  return result;
}
