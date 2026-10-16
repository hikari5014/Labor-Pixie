// 連續請病假一段期間：哪些日子算病假、哪些是原本的休假（照給工資）。純計算；天數與假日來自 data/rules/。
import { addDays, ruleOn } from '../format.js';

/** 期間內落在週一到週五的國定假日（含補假），依年度規則表 */
export function holidaysBetween(start, end, rules) {
  const set = new Map();
  const years = new Set([start.slice(0, 4), end.slice(0, 4)]);
  for (const y of years) {
    const entry = rules['holiday-calendar'].entries.find((e) => String(e.year) === y);
    if (entry) for (const d of entry.days) if (d.date >= start && d.date <= end) set.set(d.date, d.name);
  }
  return set;
}

/**
 * input: { start, end, restWeekdays?, usedThisYear?, monthlyWage? }
 * restWeekdays：每週的例假與休息日（0＝星期日…6＝星期六），預設 [0, 6]。
 * 規則（勞工請假規則第 4 條；內政部台內勞字第 315405 號函）：病假 30 日以內，期間的例假、休息日、國定假日不算病假，照給工資；
 * 一次連續請病假超過 30 日的部分，期間遇到例假等日子併計為病假。
 * rules：{ 'sick-leave-rules', 'wage-basis', 'holiday-calendar' }
 */
export function sickPeriod(input, rules) {
  const r = ruleOn(rules, 'sick-leave-rules', input.start);
  const limit = r.half_pay_days_per_year;
  const rest = new Set(input.restWeekdays || [0, 6]);
  const holidays = holidaysBetween(input.start, input.end, rules);
  const knownYears = rules['holiday-calendar'].entries.map((e) => String(e.year));
  let sickDays = 0;
  let offDays = 0;
  const offList = [];
  for (let d = input.start; d <= input.end; d = addDays(d, 1)) {
    const wd = new Date(Date.parse(d)).getUTCDay();
    const off = rest.has(wd) || holidays.has(d);
    if (off && sickDays < limit) { offDays += 1; offList.push({ date: d, name: holidays.get(d) || '例假或休息日' }); } else sickDays += 1;
  }
  const used = Number(input.usedThisYear) || 0;
  const halfPayDays = Math.min(sickDays, Math.max(0, limit - used));
  const result = {
    calendarDays: offDays + sickDays,
    sickDays,
    offDays,
    offList,
    halfPayDays,
    unpaidDays: sickDays - halfPayDays,
    longLeave: sickDays > limit,
    calendarMissing: [input.start.slice(0, 4), input.end.slice(0, 4)].some((y) => !knownYears.includes(y)),
  };
  if (input.monthlyWage > 0) {
    const daily = input.monthlyWage / ruleOn(rules, 'wage-basis', input.start).days_per_month;
    result.wageDeduction = Math.floor(Math.round((daily * (1 - r.half_pay_ratio) * halfPayDays + daily * result.unpaidDays) * 1e6) / 1e6);
  }
  return result;
}
