// 職災死亡：雇主的喪葬費與死亡補償、職災保險的喪葬津貼與遺屬給付。純計算；月數與比例來自 data/rules/injury-compensation。
import { ceilMoney, ruleOn } from '../format.js';

/**
 * input: { date?, averageWage, insuredSalary, insured, hasSurvivors }
 * averageWage：月平均工資；insuredSalary：平均月投保薪資；insured：雇主依法投保且經保險人核定為職災。
 * 雇主：喪葬費 5 個月＋死亡補償 40 個月平均工資（勞基法第 59 條第 4 款）。
 * 已依法投保：雇主只就「平均工資－平均投保薪資」的差額依同樣月數計算（職災保險法第 90 條第 3 項）。
 */
export function deathCompensation(input, rules) {
  const r = ruleOn(rules, 'injury-compensation', input.date);
  const insured = Boolean(input.insured);
  const salary = insured ? Number(input.insuredSalary) || 0 : 0;
  const basis = Math.max(0, input.averageWage - salary);
  const funeral = ceilMoney(basis * r.funeral_months);
  const death = ceilMoney(basis * r.death_months);
  const insFuneralMonths = input.hasSurvivors === false ? r.ins_funeral_months_no_survivor : r.ins_funeral_months;
  return {
    basis,
    funeral,
    death: input.hasSurvivors === false ? 0 : death,
    employerTotal: funeral + (input.hasSurvivors === false ? 0 : death),
    fullWithoutInsurance: ceilMoney(input.averageWage * r.funeral_months) + ceilMoney(input.averageWage * r.death_months),
    insFuneral: Math.round(salary * insFuneralMonths),
    insSurvivorLump: input.hasSurvivors === false ? 0 : Math.round(salary * r.ins_survivor_lump_months),
    insSurvivorAnnuity: input.hasSurvivors === false ? 0 : Math.round(salary * r.ins_survivor_annuity_ratio),
    months: { funeral: r.funeral_months, death: r.death_months, insFuneral: insFuneralMonths, insLump: r.ins_survivor_lump_months },
  };
}
