// K4 特別休假天數與未休折算（週年制）。純計算，不碰畫面。
import { addMonths, completedMonths, ceilMoney, entryOn } from '../format.js';

/** 依年資月數算出特休天數 */
export function leaveDaysFor(months, entry) {
  let days = 0;
  for (const t of entry.tiers) if (months >= t.from_months) days = t.days;
  const extra = entry.after_10_years;
  if (extra && months >= 120) {
    days = Math.min(extra.max_days, days + Math.floor((months - 120) / 12) * extra.add_days_per_year);
  }
  return days;
}

/** 本期特休從哪一天開始（最近一次滿足門檻的日子） */
function periodStart(hireDate, months) {
  if (months < 6) return null;
  if (months < 12) return addMonths(hireDate, 6);
  return addMonths(hireDate, Math.floor(months / 12) * 12);
}

/**
 * input: { hireDate, date, monthlyWage?, unusedDays? }
 * 回傳本期天數、下一次調整、未休折算金額。
 */
export function annualLeave(input, rule) {
  const { hireDate, date } = input;
  const entry = entryOn(rule.entries, date);
  const months = completedMonths(hireDate, date);
  const days = leaveDaysFor(months, entry);
  // 下一次天數變動的日子：滿 6 個月、之後每個週年
  let nextMonths = months < 6 ? 6 : (Math.floor(months / 12) + 1) * 12;
  let next = null;
  for (let i = 0; i < 40 && !next; i += 1, nextMonths += 12) {
    const d = leaveDaysFor(nextMonths, entry);
    if (d !== days) next = { date: addMonths(hireDate, nextMonths), days: d };
  }
  const result = { months, days, periodStart: periodStart(hireDate, months), next };
  if (input.monthlyWage > 0 && input.unusedDays > 0) {
    result.dailyWage = input.monthlyWage / 30;
    result.payout = ceilMoney(result.dailyWage * input.unusedDays);
  }
  return result;
}
