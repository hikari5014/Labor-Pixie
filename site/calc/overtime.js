// 加班費（月薪制）與每月加班上限檢查。純計算；倍率、時段、上限都來自 data/rules/。
import { ceilMoney, ruleOn, hourRange } from '../format.js';

export const DAY_TYPES = {
  weekday: '平日延長工時',
  rest: '休息日出勤',
  holiday: '國定假日出勤',
  dayoff: '例假出勤（天災、事變、突發事件）',
};

/** 規則表的時段（"1-2"、"3-8"…）→ [[起, 迄, 倍率]] */
export function tiers(list) {
  return list.map((t) => [...hourRange(t.hours), t.rate]);
}

/** 第 from～to 小時（從 0 起算）的倍率加總 */
export function factorBetween(tierList, from, to) {
  return tierList.reduce((s, [a, b, r]) => s + r * Math.max(0, Math.min(to, b) - Math.max(from, a)), 0);
}

/** 超過最後一段時段的時數，以最後一段的倍率計（給「超過每日上限」時仍能算出金額） */
function factorOpen(tierList, hours) {
  const [, last, rate] = tierList[tierList.length - 1];
  return factorBetween(tierList, 0, hours) + rate * Math.max(0, hours - last);
}

/** 一天的加班：回傳 { factor（時薪的幾倍）, countHours（計入每月上限的時數）, overDaily, compLeave } */
export function dayOvertime(type, hours, e, basis, limits) {
  const h = Number(hours) || 0;
  const weekday = tiers(e.weekday);
  const maxExtra = limits.daily_total_hours - basis.hours_per_day;
  if (type === 'weekday') return { factor: factorOpen(weekday, h), countHours: h, overDaily: h > maxExtra };
  if (type === 'rest') return { factor: factorOpen(tiers(e.rest_day), h), countHours: h, overDaily: h > limits.daily_total_hours };
  if (h <= 0) return { factor: 0, countHours: 0, overDaily: false };
  // 國定假日、例假：正常工時內以「日」計加給；超過的部分比照平日延長工時
  const day = type === 'holiday' ? e.national_holiday : e.regular_day_off;
  const beyond = Math.max(h - basis.hours_per_day, 0);
  return {
    factor: day.extra_pay_days * basis.hours_per_day + factorOpen(weekday, beyond),
    countHours: type === 'holiday' ? beyond : 0,
    overDaily: h > limits.daily_total_hours,
    compLeave: type === 'dayoff' ? day.compensatory_leave_days : 0,
  };
}

/**
 * input: { date, monthlyWage, days: [{ type, hours }] }
 * rules：{ 'overtime-rates', 'overtime-limits', 'wage-basis' }
 */
export function overtimePay(input, rules) {
  const e = ruleOn(rules, 'overtime-rates', input.date);
  const limits = ruleOn(rules, 'overtime-limits', input.date);
  const basis = ruleOn(rules, 'wage-basis', input.date);
  const hourly = input.monthlyWage / basis.hours_per_month;
  const days = input.days.map((d) => {
    const r = dayOvertime(d.type, d.hours, e, basis, limits);
    return { ...d, ...r, pay: hourly * r.factor };
  });
  const countHours = days.reduce((s, d) => s + d.countHours, 0);
  return {
    hourly,
    days,
    total: ceilMoney(days.reduce((s, d) => s + d.pay, 0)),
    countHours,
    limits,
    rates: e,
    over46: countHours > limits.monthly_hours,
    over54: countHours > limits.monthly_hours_with_consent,
    overDaily: days.some((d) => d.overDaily),
    dayoffWork: days.some((d) => d.type === 'dayoff' && d.hours > 0),
  };
}
