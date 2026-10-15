// 試算器 id → 計算函式（給自動測試逐一比對 data/testcases/ 用）。
import { annualLeave } from '../site/calc/annual-leave.js';
import { checkMinimumWage } from '../site/calc/minimum-wage.js';

export const CALC_FUNCTIONS = {
  'annual-leave': annualLeave,
  'minimum-wage': checkMinimumWage,
};
