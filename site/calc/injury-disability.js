// 職災失能：雇主的失能補償與職災保險失能一次金。純計算；等級日數來自 data/rules/injury-compensation。
import { ceilMoney, ruleOn } from '../format.js';

/**
 * input: { date?, grade, averageWage, insuredSalary, insured }
 * grade：失能等級 1～15；averageWage：月平均工資；insuredSalary：平均月投保薪資。
 * 雇主：平均工資 ÷ 30 × 等級日數（勞基法第 59 條第 3 款依勞保條例；職災失能日數＝普通失能日數增給 50%）。
 * 已依法投保並經核定為職災：雇主只就「平均工資－平均投保薪資」的差額計算（施行細則第 34-1 條；職災保險法第 90 條第 3 項）。
 * 保險失能一次金＝平均月投保薪資 ÷ 30 × 等級日數（勞工職業災害保險失能給付標準第 4 條）。
 */
export function disabilityCompensation(input, rules) {
  const r = ruleOn(rules, 'injury-compensation', input.date);
  const days = r.disability_days[input.grade - 1];
  const baseDays = r.disability_base_days[input.grade - 1];
  const insured = Boolean(input.insured);
  const salary = insured ? Number(input.insuredSalary) || 0 : 0;
  const diff = Math.max(0, input.averageWage - salary);
  const ratios = r.disability_annuity_ratios;
  return {
    days,
    baseDays,
    employer: ceilMoney((diff / r.employer_daily_divisor) * days),
    employerFull: ceilMoney((input.averageWage / r.employer_daily_divisor) * days),
    employerBaseDays: ceilMoney((diff / r.employer_daily_divisor) * baseDays),
    insLump: Math.round((salary / r.insured_daily_divisor) * days),
    annuity: {
      complete: Math.round(salary * ratios.complete),
      severe: Math.round(salary * ratios.severe),
      partial: Math.round(salary * ratios.partial),
    },
  };
}
