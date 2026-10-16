// 病假、事假的工資與全勤獎金扣款（勞工請假規則）。純計算；天數與比例來自 data/rules/。
import { ruleOn } from '../format.js';

export const LEAVE_TYPES = {
  sick: '普通傷病假（未住院）',
  miscarriage: '妊娠未滿 3 個月流產，請普通傷病假',
  'family-care': '事假：親自照顧家庭成員',
  personal: '一般事假',
};

/** 從勞工工資扣的錢，捨去小數（寧可少扣，不多扣） */
const floorMoney = (n) => Math.floor(Math.round(n * 1e6) / 1e6);

/**
 * input: { leaveType, days, monthlyWage, attendanceBonus?, usedThisYear?, date? }
 * rules：{ 'sick-leave-rules', 'wage-basis' }
 * usedThisYear：今年在這次之前已請的未住院普通傷病假日數。
 */
export function leaveDeduction(input, rules) {
  const r = ruleOn(rules, 'sick-leave-rules', input.date);
  const daily = input.monthlyWage / ruleOn(rules, 'wage-basis', input.date).days_per_month;
  const days = Number(input.days) || 0;
  const bonus = Number(input.attendanceBonus) || 0;
  const result = { daily, halfPayDays: 0, unpaidDays: 0, wageDeduction: 0, bonusDeduction: 0, bonusRule: 'none', limits: r };
  if (input.leaveType === 'sick' || input.leaveType === 'miscarriage') {
    const used = Number(input.usedThisYear) || 0;
    result.halfPayDays = Math.min(days, Math.max(0, r.half_pay_days_per_year - used));
    result.unpaidDays = days - result.halfPayDays; // 超過一年上限的部分要改用事假、特休等
    result.wageDeduction = floorMoney(daily * (1 - r.half_pay_ratio) * result.halfPayDays + daily * result.unpaidDays);
    result.yearTotal = used + days;
    result.protected = result.yearTotal <= r.protected_days;
    if (input.leaveType === 'sick') {
      result.bonusRule = 'proportional';
      result.bonusDeduction = Math.min(bonus, floorMoney((bonus / r.bonus_days_divisor) * days));
    }
  } else {
    // 事假不給工資
    result.unpaidDays = days;
    result.wageDeduction = floorMoney(daily * days);
    result.bonusRule = input.leaveType === 'family-care' ? 'none' : 'company';
  }
  return result;
}
