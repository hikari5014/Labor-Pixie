// K14 最低工資檢查。純計算，不碰畫面。
import { entryOn, nextEntry } from '../format.js';

function compare(payType, amount, entry) {
  const threshold = payType === 'hourly' ? entry.hourly : entry.monthly;
  return { entry, threshold, ok: amount >= threshold, shortfall: Math.max(0, threshold - amount) };
}

/**
 * input: { payType: 'monthly' | 'hourly', amount, date }
 * amount 是正常工作時間內的工資（不含加班費與假日出勤加給）。
 * 回傳當時的比較結果，以及下一次調整（含待核定）的比較結果。
 */
export function checkMinimumWage(input, rule) {
  const now = entryOn(rule.entries, input.date);
  const upcoming = nextEntry(rule.entries, input.date);
  return {
    current: now ? compare(input.payType, input.amount, now) : null,
    next: upcoming ? compare(input.payType, input.amount, upcoming) : null,
  };
}
