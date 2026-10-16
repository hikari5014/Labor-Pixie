// 勞退新制個人專戶推估。純計算；提繳級距與比例來自 data/rules/social-insurance。
import { ruleOn } from '../format.js';
import { gradeFor } from './employment-cost.js';

/**
 * input: { salary, years, balance?, employerRate?, voluntaryRate?, annualReturn?, salaryGrowth?, date? }
 * 每月提繳＝月提繳工資級距 ×（雇主提繳率＋員工自願提繳率）；每月複利；薪資每年依成長率調整一次。
 * 推估值，不是保證；實際收益依勞動基金運用結果（有保證收益下限）。
 */
export function pensionProjection(input, rules) {
  const r = ruleOn(rules, 'social-insurance', input.date).labor_pension;
  const employerRate = Math.max(r.employer_rate, Number(input.employerRate) || 0);
  const voluntaryRate = Math.min(r.employee_voluntary_max_rate, Math.max(0, Number(input.voluntaryRate) || 0));
  const monthlyReturn = (Number(input.annualReturn) || 0) / 12;
  const growth = Number(input.salaryGrowth) || 0;
  let balance = Number(input.balance) || 0;
  let salary = input.salary;
  let contributed = 0;
  const months = Math.round(input.years * 12);
  for (let m = 0; m < months; m += 1) {
    if (m > 0 && m % 12 === 0) salary *= 1 + growth;
    const c = Math.round(gradeFor(r.grades, salary) * (employerRate + voluntaryRate));
    balance = balance * (1 + monthlyReturn) + c;
    contributed += c;
  }
  const firstGrade = gradeFor(r.grades, input.salary);
  return {
    firstGrade,
    firstMonthly: Math.round(firstGrade * (employerRate + voluntaryRate)),
    employerRate,
    voluntaryRate,
    contributed,
    earnings: Math.round(balance - contributed - (Number(input.balance) || 0)),
    balance: Math.round(balance),
  };
}
