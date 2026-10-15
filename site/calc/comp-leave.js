// 加班補休換算與到期折發。純計算，不碰畫面。
import { ceilMoney, entryOn } from '../format.js';

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

/** 一天加班中，第 from～to 小時（從 0 起算）的倍率加總 */
function factorBetween(type, from, to, e) {
  const tiers = type === 'rest'
    ? [[0, 2, e.rest_day[0].rate], [2, 8, e.rest_day[1].rate], [8, 12, e.rest_day[2].rate]]
    : [[0, 2, e.weekday[0].rate], [2, 4, e.weekday[1].rate]];
  return tiers.reduce((s, [a, b, r]) => s + r * Math.max(0, clamp(to, a, b) - clamp(from, a, b)), 0);
}

/**
 * input: { date, monthlyWage, days: [{ type: 'weekday'|'rest', hours, used }] }
 * 補休時數＝加班時數（1:1）。到期或離職沒休完的，依加班當日的倍率折發工資。
 * 部分已補休時，視為先補掉較早的時數、未休的是較晚（倍率較高）的時數。
 */
export function compLeave(input, rule) {
  const e = entryOn(rule.entries, input.date);
  const hourly = input.monthlyWage / 240;
  const days = input.days.map((d) => {
    const hours = Number(d.hours) || 0;
    const used = clamp(Number(d.used) || 0, 0, hours);
    const unused = hours - used;
    return { ...d, hours, used, unused, pay: hourly * factorBetween(d.type, used, hours, e) };
  });
  return {
    hourly,
    days,
    compHours: days.reduce((s, d) => s + d.hours, 0),
    unusedHours: days.reduce((s, d) => s + d.unused, 0),
    payout: ceilMoney(days.reduce((s, d) => s + d.pay, 0)),
  };
}
