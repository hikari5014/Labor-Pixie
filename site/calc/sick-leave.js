// 病假、事假的工資與全勤獎金扣款（勞工請假規則）。純計算，不碰畫面。

export const LEAVE_TYPES = {
  sick: '普通傷病假（未住院）',
  miscarriage: '妊娠未滿 3 個月流產，請普通傷病假',
  'family-care': '事假：親自照顧家庭成員',
  personal: '一般事假',
};

const SICK_HALF_PAY_DAYS = 30; // 未住院普通傷病假一年 30 日內工資折半
const PROTECTED_DAYS = 10; // 一年內未超過 10 日不得不利處分

/** 從勞工工資扣的錢，捨去小數（寧可少扣，不多扣） */
const floorMoney = (n) => Math.floor(Math.round(n * 1e6) / 1e6);

/**
 * input: { leaveType, days, monthlyWage, attendanceBonus?, usedThisYear? }
 * usedThisYear：今年在這次之前已請的未住院普通傷病假日數。
 */
export function leaveDeduction(input) {
  const daily = input.monthlyWage / 30;
  const days = Number(input.days) || 0;
  const bonus = Number(input.attendanceBonus) || 0;
  const result = { daily, halfPayDays: 0, unpaidDays: 0, wageDeduction: 0, bonusDeduction: 0, bonusRule: 'none' };
  if (input.leaveType === 'sick' || input.leaveType === 'miscarriage') {
    const used = Number(input.usedThisYear) || 0;
    result.halfPayDays = Math.min(days, Math.max(0, SICK_HALF_PAY_DAYS - used));
    result.unpaidDays = days - result.halfPayDays; // 超過 30 日的部分要改用事假、特休等
    result.wageDeduction = floorMoney(daily * 0.5 * result.halfPayDays + daily * result.unpaidDays);
    result.yearTotal = used + days;
    result.protected = result.yearTotal <= PROTECTED_DAYS;
    if (input.leaveType === 'sick') {
      result.bonusRule = 'proportional';
      result.bonusDeduction = Math.min(bonus, floorMoney((bonus / 30) * days));
    } else {
      result.bonusRule = 'none';
    }
  } else {
    // 事假不給工資
    result.unpaidDays = days;
    result.wageDeduction = floorMoney(daily * days);
    result.bonusRule = input.leaveType === 'family-care' ? 'none' : 'company';
  }
  return result;
}
