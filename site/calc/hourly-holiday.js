// 時薪人員遇國定假日的工資。純計算，不碰畫面。
import { ceilMoney } from '../format.js';

/**
 * input: { hourlyWage, dailyHours, scheduled, workedHours }
 * scheduled：國定假日當天原本是約定的工作日。
 * - 原約定工作日：放假工資照給（約定每日工時）；出勤時再加給一倍（以日計，不足約定工時也給整日）。
 * - 非約定工作日：沒有給假給薪的問題；雇主要求出勤時，給平日工資的兩倍。
 */
export function hourlyHoliday(input) {
  const day = input.hourlyWage * input.dailyHours;
  const worked = Number(input.workedHours) || 0;
  if (input.scheduled) {
    if (!worked) return { pay: ceilMoney(day), basis: 'paid-off', note: '放假，工資照給' };
    const extraHours = Math.max(0, worked - input.dailyHours);
    return { pay: ceilMoney(day * 2 + input.hourlyWage * extraHours), basis: 'double', extraHours };
  }
  if (!worked) return { pay: 0, basis: 'none' };
  return { pay: ceilMoney(input.hourlyWage * worked * 2), basis: 'double-unscheduled' };
}
