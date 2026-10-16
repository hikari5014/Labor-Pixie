// 最低工資檢查。純計算，不碰畫面。
import { entryOn, nextEntry } from '../format.js';

function compare(payType, amount, entry) {
  const threshold = payType === 'hourly' ? entry.hourly : entry.monthly;
  return { entry, threshold, ok: amount >= threshold, shortfall: Math.max(0, threshold - amount) };
}

/**
 * input: { payType: 'monthly' | 'hourly', amount, date }；rules：{ 'minimum-wage' }
 * amount 是正常工作時間內的工資（不含加班費與假日出勤加給）。
 */
export function checkMinimumWage(input, rules) {
  const entries = rules['minimum-wage'].entries;
  const now = entryOn(entries, input.date);
  const upcoming = nextEntry(entries, input.date);
  return {
    current: now ? compare(input.payType, input.amount, now) : null,
    next: upcoming ? compare(input.payType, input.amount, upcoming) : null,
  };
}
