// K18 統包（包裹式）薪資反推與每月多退少補。純計算，不碰畫面。
import { ceilMoney, entryOn } from '../format.js';

export const HOUR_KEYS = ['weekday12', 'weekday34', 'rest12', 'rest38', 'rest912'];

/** 每一種加班時段的倍率（從加班倍率規則表取） */
export function ratesFrom(entry) {
  return {
    weekday12: entry.weekday[0].rate,
    weekday34: entry.weekday[1].rate,
    rest12: entry.rest_day[0].rate,
    rest38: entry.rest_day[1].rate,
    rest912: entry.rest_day[2].rate,
  };
}

/** 加權時數＝Σ 倍率 × 時數 */
export function weightedHours(hours, rates) {
  return HOUR_KEYS.reduce((sum, k) => sum + (Number(hours[k]) || 0) * rates[k], 0);
}

export function totalHours(hours) {
  return HOUR_KEYS.reduce((sum, k) => sum + (Number(hours[k]) || 0), 0);
}

/**
 * input: { total, date, hours: {weekday12…}, buffer?, actual?: {weekday12…} }
 * rules: { 'overtime-rates', 'minimum-wage' }
 * 反推：時薪 ＝ 統包總額 ÷（240 ＋ 加權時數）；底薪（含固定津貼）＝ 時薪 × 240，取整數；固定加班費 ＝ 總額 − 底薪。
 * 多退少補：當月依實際時數算出的加班費比固定加班費多，就補差額；比較少，固定加班費照付。
 */
export function packagePay(input, rules) {
  const rates = ratesFrom(entryOn(rules['overtime-rates'].entries, input.date));
  const weighted = weightedHours(input.hours, rates) + (Number(input.buffer) || 0);
  const hourly = input.total / (240 + weighted);
  const base = Math.floor(hourly * 240 + 1e-9);
  const fixedOvertime = input.total - base;
  const plannedHours = totalHours(input.hours);
  const wageEntry = entryOn(rules['minimum-wage'].entries, input.date);
  const result = {
    weighted,
    hourly,
    base,
    fixedOvertime,
    plannedHours,
    hoursOk: plannedHours <= 46,
    minimumWage: wageEntry ? wageEntry.monthly : null,
    minWageOk: wageEntry ? base >= wageEntry.monthly : null,
  };
  if (input.actual) {
    const actualWeighted = weightedHours(input.actual, rates);
    const legalOvertime = ceilMoney(hourly * actualWeighted);
    result.actualHours = totalHours(input.actual);
    result.actualHoursOk = result.actualHours <= 46;
    result.legalOvertime = legalOvertime;
    result.topUp = Math.max(0, legalOvertime - fixedOvertime);
  }
  return result;
}

/** 某個月有幾個星期日（估算例假日數用） */
export function sundaysIn(yearMonth) {
  const [y, m] = yearMonth.split('-').map(Number);
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  let n = 0;
  for (let d = 1; d <= days; d += 1) if (new Date(Date.UTC(y, m - 1, d)).getUTCDay() === 0) n += 1;
  return n;
}
