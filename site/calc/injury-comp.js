// 職災醫療期間不能工作：雇主的原領工資補償、職災保險傷病給付、雇主要補的差額。純計算；天數與比例來自 data/rules/injury-compensation。
import { ceilMoney, ruleOn } from '../format.js';

/**
 * input: { date?, originalWage, insuredSalary, days }
 * originalWage：原領工資（月薪；職災前最近一個月正常工時的工資）；insuredSalary：平均月投保薪資；days：醫療中不能工作的日數。
 * 雇主補償＝原領工資 ÷ 30 × 日數；傷病給付自第 4 日起，前 60 日按平均月投保薪資 ÷ 30、之後 70%，最長 730 日（推估，四捨五入）。
 * 雇主可用保險給付抵充，只要補差額。
 */
export function injuryCompensation(input, rules) {
  const r = ruleOn(rules, 'injury-compensation', input.date);
  const days = Math.max(0, Math.floor(input.days));
  const employerTotal = ceilMoney((input.originalWage / r.employer_daily_divisor) * days);
  const benefitDays = Math.min(r.max_benefit_days, Math.max(0, days - r.waiting_days));
  const fullDays = Math.min(benefitDays, r.full_benefit_days);
  const reducedDays = benefitDays - fullDays;
  const insuredDaily = (Number(input.insuredSalary) || 0) / r.insured_daily_divisor;
  const insurance = Math.round(insuredDaily * fullDays + insuredDaily * r.reduced_ratio * reducedDays);
  return {
    employerTotal,
    benefitDays,
    fullDays,
    reducedDays,
    insurance,
    topUp: Math.max(0, employerTotal - insurance),
    overMax: days > r.max_benefit_days,
    lumpSumMonths: r.lump_sum_months,
    waitingDays: r.waiting_days,
  };
}
