// 用人總成本：月薪＋雇主負擔的勞保、就保、職災保險、健保、勞退、墊償基金。純計算；費率與級距來自 data/rules/。
import { ruleOn } from '../format.js';

/** 依薪資找投保級距：不低於薪資的最低一級；超過最高級以最高級計 */
export function gradeFor(grades, salary) {
  return grades.find((g) => g >= salary) || grades[grades.length - 1];
}

const round = (n) => Math.round(Math.round(n * 1e6) / 1e6);

/**
 * input: { salary, date?, occupationalRate?, dependents?, voluntaryRate?, pensionRate? }
 * salary：每月薪資總額（本薪＋固定津貼等經常性給與）。occupationalRate：職災保險費率（例 0.0021）；沒填用平均費率。
 * dependents：員工健保眷屬人數（只影響員工自付）。voluntaryRate：員工自願提繳勞退比例。pensionRate：雇主勞退提繳比例（至少 6%）。
 * rules：{ 'social-insurance' }
 */
export function employmentCost(input, rules) {
  const r = ruleOn(rules, 'social-insurance', input.date);
  const s = input.salary;
  const li = gradeFor(r.labor_insurance.grades, s);
  const oi = gradeFor(r.occupational_insurance.grades, s);
  const hi = gradeFor(r.health_insurance.grades, s);
  const lp = gradeFor(r.labor_pension.grades, s);
  const occRate = input.occupationalRate > 0 ? input.occupationalRate : r.occupational_insurance.average_rate;
  const pensionRate = Math.max(r.labor_pension.employer_rate, Number(input.pensionRate) || 0);
  const H = r.health_insurance;
  const employer = {
    labor: round(li * r.labor_insurance.rate * r.labor_insurance.employer_share),
    employment: round(li * r.employment_insurance.rate * r.employment_insurance.employer_share),
    occupational: round(oi * occRate * r.occupational_insurance.employer_share),
    health: round(hi * H.rate * H.employer_share * (1 + H.average_dependents)),
    pension: round(lp * pensionRate),
    arrears: round(li * r.wage_arrears_fund.rate),
  };
  const employerTotal = Object.values(employer).reduce((a, b) => a + b, 0);
  const deps = Math.min(3, Math.max(0, Number(input.dependents) || 0)); // 健保眷屬超過 3 人以 3 人計
  const employee = {
    labor: round(li * r.labor_insurance.rate * r.labor_insurance.employee_share),
    employment: round(li * r.employment_insurance.rate * r.employment_insurance.employee_share),
    health: round(hi * H.rate * H.employee_share) * (1 + deps),
    pension: round(lp * Math.min(r.labor_pension.employee_voluntary_max_rate, Number(input.voluntaryRate) || 0)),
  };
  const employeeTotal = Object.values(employee).reduce((a, b) => a + b, 0);
  return {
    grades: { labor: li, occupational: oi, health: hi, pension: lp },
    occRate,
    pensionRate,
    employer,
    employerTotal,
    totalCost: s + employerTotal,
    ratio: employerTotal / s,
    employee,
    employeeTotal,
    takeHome: s - employeeTotal,
  };
}
