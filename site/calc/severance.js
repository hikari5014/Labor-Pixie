// 平均工資、資遣費（新舊制）、預告期間。純計算；所有法定數字來自 data/rules/。
import { addDays, addMonths, anniversary, completedMonths, daysBetween, ceilMoney, ruleOn } from '../format.js';

/** 年資：從 start 到 end（兩天都算），回傳 { months, days } */
export function tenure(start, end) {
  const after = addDays(end, 1);
  const months = completedMonths(start, after);
  return { months, days: daysBetween(anniversary(start, months), after) };
}

/**
 * 平均工資：事由發生當日前 N 個月內的工資總額 ÷ 該期間總日數（當日不算）。rules：{ 'average-wage-rules' }
 * input: { eventDate, hireDate, wages, excludedDays?, byDay?, workDays? }
 * excludedDays：不計入的期間日數（職災醫療、普通傷病假、留職停薪…），wages 要先扣掉那段期間的工資。
 */
export function averageWage(input, rules) {
  const r = ruleOn(rules, 'average-wage-rules', input.eventDate);
  const before = addMonths(input.eventDate, -r.lookback_months);
  const periodStart = input.hireDate > before ? input.hireDate : before;
  const periodEnd = addDays(input.eventDate, -1);
  const calendarDays = daysBetween(periodStart, input.eventDate);
  const days = calendarDays - (Number(input.excludedDays) || 0);
  let daily = input.wages / days;
  let floorApplied = false;
  if (input.byDay && input.workDays > 0) {
    const floor = (input.wages / input.workDays) * r.piece_rate_floor_ratio;
    if (floor > daily) { daily = floor; floorApplied = true; }
  }
  return { periodStart, periodEnd, calendarDays, days, daily, monthly: daily * r.days_per_month, floorApplied, shortPeriod: periodStart === input.hireDate };
}

/** 舊制基數：每滿 1 年給一定月數；剩餘月數按比例；未滿 1 個月以 1 個月計 */
export function oldBase(t, r) {
  const partial = (t.months % 12) + (r.old_partial_month_counts_as_month && t.days > 0 ? 1 : 0);
  return (Math.floor(t.months / 12) + partial / 12) * r.old_months_per_year;
}

/** 新制年資（年）：未滿 1 年的部分，日數 ÷ 30 換算成月、月 ÷ 12 換算成年（勞動部算法） */
export function newYears(t, r) {
  return Math.floor(t.months / 12) + ((t.months % 12) + t.days / r.days_per_month) / 12;
}

/** 新制基數：每滿 1 年 0.5 個月，未滿 1 年按比例，有上限 */
export function newBase(t, r) {
  return Math.min(r.new_max_months, newYears(t, r) * r.new_months_per_year);
}

/**
 * 資遣費。input: { hireDate, endDate, avgWage, keepOld?, birthDate? }；rules：{ 'severance-rules', 'retirement-rules' }
 * endDate 是最後工作日。新制施行前到職、後來選新制的人，舊制年資算到施行前一天，之後算新制。
 * keepOld：選擇繼續適用舊制（全部年資照勞基法第 17 條）。
 */
export function severance(input, rules) {
  const r = ruleOn(rules, 'severance-rules', input.endDate);
  const start = r.new_system_start;
  const { hireDate, endDate, avgWage } = input;
  let oldPart = null;
  let newPart = null;
  if (input.keepOld) {
    const t = tenure(hireDate, endDate);
    oldPart = { from: hireDate, to: endDate, ...t, base: oldBase(t, r) };
  } else {
    if (hireDate < start) {
      const to = endDate < start ? endDate : addDays(start, -1);
      const t = tenure(hireDate, to);
      oldPart = { from: hireDate, to, ...t, base: oldBase(t, r) };
    }
    if (endDate >= start) {
      const from = hireDate > start ? hireDate : start;
      const t = tenure(from, endDate);
      newPart = { from, to: endDate, ...t, base: newBase(t, r), capped: newYears(t, r) * r.new_months_per_year > r.new_max_months };
    }
  }
  const base = (oldPart ? oldPart.base : 0) + (newPart ? newPart.base : 0);
  return {
    oldPart, newPart, base, amount: ceilMoney(avgWage * base), payWithinDays: r.pay_within_days, maxMonths: r.new_max_months,
    retirementEligible: oldPart ? retirementEligible(input, rules) : false,
  };
}

/**
 * 是否已符合自請退休條件（勞基法第 53 條，條件來自 retirement-rules）。
 * 符合時，舊制年資要改依退休金計給，不是資遣費（勞動部資遣費試算表的做法）。birthDate 沒填時只看不需要年齡的條件。
 */
export function retirementEligible(input, rules) {
  const r = ruleOn(rules, 'retirement-rules', input.endDate);
  const years = tenure(input.hireDate, input.endDate).months / 12;
  const age = input.birthDate ? completedMonths(input.birthDate, addDays(input.endDate, 1)) / 12 : null;
  return r.voluntary.some((c) => years >= c.years && (c.age === undefined || (age !== null && age >= c.age)));
}

/**
 * 預告期間。input: { hireDate, endDate, monthlyWage? }；rules：{ 'notice-period', 'wage-basis' }
 * 回傳應預告天數、最晚要預告的日子、未預告時應付的預告工資。
 */
export function noticePeriod(input, rules) {
  const entry = ruleOn(rules, 'notice-period', input.endDate);
  const t = tenure(input.hireDate, input.endDate);
  let days = 0;
  for (const tier of entry.tiers) if (t.months >= tier.from_months) days = tier.days;
  const result = { months: t.months, days, latestNoticeDate: days ? addDays(input.endDate, -days) : null, jobSearchPerWeek: entry.job_search_leave_days_per_week };
  if (input.monthlyWage > 0) result.noticePay = ceilMoney((input.monthlyWage / ruleOn(rules, 'wage-basis', input.endDate).days_per_month) * days);
  return result;
}
