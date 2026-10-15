// K6 加班費（月薪制）與每月 46 小時檢查。純計算，不碰畫面。
import { ceilMoney, entryOn } from '../format.js';

export const DAY_TYPES = {
  weekday: '平日延長工時',
  rest: '休息日出勤',
  holiday: '國定假日出勤',
  dayoff: '例假出勤（天災、事變、突發事件）',
};

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

/** 一天的加班：回傳 { factor（時薪的幾倍）, countHours（計入 46 小時的時數）, overDaily（超過每日 12 小時）, compLeave } */
export function dayOvertime(type, hours, entry) {
  const [w1, w2] = entry.weekday.map((t) => t.rate);
  const [r1, r2, r3] = entry.rest_day.map((t) => t.rate);
  const h = Number(hours) || 0;
  if (type === 'weekday') {
    // hours＝超過正常 8 小時的延長工時
    return { factor: w1 * Math.min(h, 2) + w2 * Math.max(h - 2, 0), countHours: h, overDaily: h > 4 };
  }
  if (type === 'rest') {
    return { factor: r1 * Math.min(h, 2) + r2 * clamp(h - 2, 0, 6) + r3 * Math.max(h - 8, 0), countHours: h, overDaily: h > 12 };
  }
  const extraDays = type === 'holiday' ? entry.national_holiday.extra_pay_days : entry.regular_day_off.extra_pay_days;
  if (h <= 0) return { factor: 0, countHours: 0, overDaily: false };
  // 國定假日、例假：8 小時內以「日」計，加給 1 日；超過 8 小時比照平日延長工時
  const beyond = Math.max(h - 8, 0);
  const factor = extraDays * 8 + w1 * Math.min(beyond, 2) + w2 * Math.max(beyond - 2, 0);
  return {
    factor,
    countHours: type === 'holiday' ? beyond : 0,
    overDaily: h > 12,
    compLeave: type === 'dayoff' ? entry.regular_day_off.compensatory_leave_days : 0,
  };
}

/**
 * input: { date, monthlyWage, days: [{ type, hours }] }
 * monthlyWage：月薪（含每月固定津貼等經常性給與）。時薪＝月薪 ÷ 30 ÷ 8。
 */
export function overtimePay(input, rule) {
  const entry = entryOn(rule.entries, input.date);
  const hourly = input.monthlyWage / 240;
  const days = input.days.map((d) => {
    const r = dayOvertime(d.type, d.hours, entry);
    return { ...d, ...r, pay: hourly * r.factor };
  });
  const countHours = days.reduce((s, d) => s + d.countHours, 0);
  return {
    hourly,
    days,
    total: ceilMoney(days.reduce((s, d) => s + d.pay, 0)),
    countHours,
    over46: countHours > 46,
    over54: countHours > 54,
    overDaily: days.some((d) => d.overDaily),
    dayoffWork: days.some((d) => d.type === 'dayoff' && d.hours > 0),
  };
}
