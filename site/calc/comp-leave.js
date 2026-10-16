// 加班補休換算與到期折發。純計算；倍率與時段來自 data/rules/。
import { ceilMoney, ruleOn } from '../format.js';
import { tiers, factorBetween } from './overtime.js';

/**
 * input: { date, monthlyWage, days: [{ type: 'weekday'|'rest', hours, used }] }
 * rules：{ 'overtime-rates', 'wage-basis' }
 * 補休時數＝加班時數（1:1）。到期或離職沒休完的，依加班當日的倍率折發工資。
 * 部分已補休時，視為先補掉較早的時數、未休的是較晚（倍率較高）的時數。
 */
export function compLeave(input, rules) {
  const e = ruleOn(rules, 'overtime-rates', input.date);
  const hourly = input.monthlyWage / ruleOn(rules, 'wage-basis', input.date).hours_per_month;
  const days = input.days.map((d) => {
    const hours = Number(d.hours) || 0;
    const used = Math.min(Math.max(Number(d.used) || 0, 0), hours);
    const tierList = tiers(d.type === 'rest' ? e.rest_day : e.weekday);
    return { ...d, hours, used, unused: hours - used, pay: hourly * factorBetween(tierList, used, hours) };
  });
  return {
    hourly,
    days,
    compHours: days.reduce((s, d) => s + d.hours, 0),
    unusedHours: days.reduce((s, d) => s + d.unused, 0),
    payout: ceilMoney(days.reduce((s, d) => s + d.pay, 0)),
  };
}
