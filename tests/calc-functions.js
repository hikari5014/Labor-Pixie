// 試算器 id → 計算函式（給自動測試逐一比對 data/testcases/ 用）。
import { annualLeave } from '../site/calc/annual-leave.js';
import { checkMinimumWage } from '../site/calc/minimum-wage.js';
import { packagePay } from '../site/calc/package-pay.js';
import { averageWage, severance, noticePeriod } from '../site/calc/severance.js';
import { overtimePay } from '../site/calc/overtime.js';
import { fixedTermCheck, probationPlan } from '../site/calc/contracts.js';

export const CALC_FUNCTIONS = {
  'annual-leave': annualLeave,
  'minimum-wage': checkMinimumWage,
  'package-pay': packagePay,
  'average-wage': averageWage,
  severance,
  'notice-period': noticePeriod,
  overtime: overtimePay,
  'fixed-term': fixedTermCheck,
  probation: probationPlan,
};
