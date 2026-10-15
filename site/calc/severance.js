// K1 平均工資、K2 資遣費（新舊制）、K3 預告期間。純計算，不碰畫面。
import { addDays, addMonths, anniversary, completedMonths, daysBetween, ceilMoney, entryOn } from '../format.js';

export const NEW_SYSTEM_START = '2005-07-01'; // 勞工退休金條例施行日

/** 年資：從 start 到 end（兩天都算），回傳 { months, days } */
export function tenure(start, end) {
  const after = addDays(end, 1);
  const months = completedMonths(start, after);
  return { months, days: daysBetween(anniversary(start, months), after) };
}

/**
 * K1 平均工資：事由發生當日前 6 個月內的工資總額 ÷ 該期間總日數（當日不算）。
 * input: { eventDate, hireDate, wages, excludedDays?, byDay?, workDays? }
 * excludedDays：不計入的期間日數（職災醫療、普通傷病假、留職停薪…），wages 要先扣掉那段期間的工資。
 * byDay：按日、按時、按件計酬；平均工資不得少於「工資總額 ÷ 實際工作日數」的六成。
 */
export function averageWage(input) {
  const sixMonthsBefore = addMonths(input.eventDate, -6);
  const periodStart = input.hireDate > sixMonthsBefore ? input.hireDate : sixMonthsBefore;
  const periodEnd = addDays(input.eventDate, -1);
  const calendarDays = daysBetween(periodStart, input.eventDate);
  const days = calendarDays - (Number(input.excludedDays) || 0);
  let daily = input.wages / days;
  let floorApplied = false;
  if (input.byDay && input.workDays > 0) {
    const floor = (input.wages / input.workDays) * 0.6;
    if (floor > daily) { daily = floor; floorApplied = true; }
  }
  return { periodStart, periodEnd, calendarDays, days, daily, monthly: daily * 30, floorApplied, shortPeriod: periodStart === input.hireDate };
}

/** 舊制基數：每滿 1 年 1 個月；剩餘月數按比例；未滿 1 個月以 1 個月計（勞基法第 17 條） */
export function oldBase(t) {
  return Math.floor(t.months / 12) + ((t.months % 12) + (t.days > 0 ? 1 : 0)) / 12;
}

/** 新制年資（年）：未滿 1 年的部分，日數 ÷ 30 換算成月、月 ÷ 12 換算成年（勞動部算法） */
export function newYears(t) {
  return Math.floor(t.months / 12) + ((t.months % 12) + t.days / 30) / 12;
}

/** 新制基數：每滿 1 年 1/2 個月，未滿 1 年按比例，最高 6 個月（勞退條例第 12 條） */
export function newBase(t) {
  return Math.min(6, newYears(t) * 0.5);
}

/**
 * K2 資遣費。input: { hireDate, endDate, avgWage, keepOld? }
 * endDate 是最後工作日。2005/7/1 前到職、後來選新制的人，舊制年資算到 2005/6/30，之後算新制。
 * keepOld：選擇繼續適用舊制（全部年資照勞基法第 17 條）。
 */
export function severance(input) {
  const { hireDate, endDate, avgWage } = input;
  let oldPart = null;
  let newPart = null;
  if (input.keepOld) {
    const t = tenure(hireDate, endDate);
    oldPart = { from: hireDate, to: endDate, ...t, base: oldBase(t) };
  } else {
    if (hireDate < NEW_SYSTEM_START) {
      const to = endDate < NEW_SYSTEM_START ? endDate : addDays(NEW_SYSTEM_START, -1);
      const t = tenure(hireDate, to);
      oldPart = { from: hireDate, to, ...t, base: oldBase(t) };
    }
    if (endDate >= NEW_SYSTEM_START) {
      const from = hireDate > NEW_SYSTEM_START ? hireDate : NEW_SYSTEM_START;
      const t = tenure(from, endDate);
      newPart = { from, to: endDate, ...t, base: newBase(t), capped: newYears(t) * 0.5 > 6 };
    }
  }
  const base = (oldPart ? oldPart.base : 0) + (newPart ? newPart.base : 0);
  return { oldPart, newPart, base, amount: ceilMoney(avgWage * base), retirementEligible: oldPart ? retirementEligible(input) : false };
}

/**
 * 是否已符合自請退休條件（勞基法第 53 條）：工作 25 年以上；或 15 年以上滿 55 歲；或 10 年以上滿 60 歲。
 * 符合時，舊制年資要改依退休金計給，不是資遣費（勞動部資遣費試算表的做法）。birthDate 沒填時只看 25 年。
 */
export function retirementEligible(input) {
  const years = tenure(input.hireDate, input.endDate).months / 12;
  if (years >= 25) return true;
  if (!input.birthDate) return false;
  const age = completedMonths(input.birthDate, addDays(input.endDate, 1)) / 12;
  return (years >= 15 && age >= 55) || (years >= 10 && age >= 60);
}

/**
 * K3 預告期間。input: { hireDate, endDate, monthlyWage? }，rule：notice-period
 * 回傳應預告天數、最晚要預告的日子、未預告時應付的預告工資。
 */
export function noticePeriod(input, rule) {
  const entry = entryOn(rule.entries, input.endDate);
  const t = tenure(input.hireDate, input.endDate);
  let days = 0;
  for (const tier of entry.tiers) if (t.months >= tier.from_months) days = tier.days;
  const result = { months: t.months, days, latestNoticeDate: days ? addDays(input.endDate, -days) : null, jobSearchPerWeek: entry.job_search_leave_days_per_week };
  if (input.monthlyWage > 0) result.noticePay = ceilMoney((input.monthlyWage / 30) * days);
  return result;
}
