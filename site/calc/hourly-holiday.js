// 時薪人員遇國定假日的工資。純計算；加給日數來自 data/rules/。
import { ceilMoney, ruleOn } from '../format.js';

/**
 * input: { hourlyWage, dailyHours, scheduled, workedHours, date? }；rules：{ 'overtime-rates' }
 * scheduled：國定假日當天原本是約定的工作日。
 * - 原約定工作日：放假工資照給（約定每日工時）；出勤時再加給（以日計，不足約定工時也給整日）。
 * - 非約定工作日：沒有給假給薪的問題；雇主要求出勤時，給平日工資加倍。
 */
export function hourlyHoliday(input, rules) {
  const extra = ruleOn(rules, 'overtime-rates', input.date).national_holiday.extra_pay_days;
  const day = input.hourlyWage * input.dailyHours;
  const worked = Number(input.workedHours) || 0;
  if (input.scheduled) {
    if (!worked) return { pay: ceilMoney(day), basis: 'paid-off' };
    const extraHours = Math.max(0, worked - input.dailyHours);
    return { pay: ceilMoney(day * (1 + extra) + input.hourlyWage * extraHours), basis: 'double', extraHours };
  }
  if (!worked) return { pay: 0, basis: 'none' };
  return { pay: ceilMoney(input.hourlyWage * worked * (1 + extra)), basis: 'double-unscheduled' };
}
