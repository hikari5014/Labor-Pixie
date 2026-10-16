// 定期契約檢查、試用期時程。純計算；期限都來自 data/rules/。
import { addDays, anniversary, daysBetween, ruleOn } from '../format.js';

/**
 * 定期契約檢查。input: { kind, a: {start, end}, b?: {start, end}, continued? }；rules：{ 'fixed-term-contracts' }
 * continued：期滿後勞工繼續工作、雇主沒有立刻反對。
 */
export function fixedTermCheck(input, rules) {
  const entry = ruleOn(rules, 'fixed-term-contracts', input.a.start);
  const kind = entry.kinds.find((k) => k.id === input.kind);
  const daysA = daysBetween(input.a.start, input.a.end) + 1;
  const after = addDays(input.a.end, 1);
  const result = {
    daysA,
    converted: false,
    reasons: [],
    overLimit: Boolean(kind.max_months) && after > anniversary(input.a.start, kind.max_months),
    needsReport: Boolean(kind.report_over_months) && after > anniversary(input.a.start, kind.report_over_months),
  };
  if (input.continued && kind.conversion_applies) { result.converted = true; result.reasons.push('continued'); }
  if (input.b && input.b.start) {
    result.daysB = daysBetween(input.b.start, input.b.end) + 1;
    result.totalDays = daysA + result.daysB;
    result.gapDays = daysBetween(input.a.end, input.b.start) - 1;
    if (kind.conversion_applies && result.totalDays > entry.conversion_total_days && result.gapDays <= entry.conversion_max_gap_days) {
      result.converted = true;
      result.reasons.push('renewed');
    }
    result.seniorityMerged = input.b.start < anniversary(addDays(input.a.end, 1), entry.seniority_merge_months);
  }
  result.conversionApplies = kind.conversion_applies;
  return result;
}

/**
 * 試用期時程。input: { hireDate, probationDays }；rules：{ 'notice-period' }（第一級：滿幾個月要預告幾日）
 * 年資算到最後工作日（兩天都算）：最後工作日落在 completesThreeMonths 當天或之後，就要預告。
 * 內部確認時點（期滿前 20 日、10 日）是建議做法，不是法定期限。
 */
export function probationPlan(input, rules) {
  const first = ruleOn(rules, 'notice-period', input.hireDate).tiers[0];
  const end = addDays(input.hireDate, input.probationDays - 1);
  const completesThreeMonths = addDays(anniversary(input.hireDate, first.from_months), -1);
  const check1 = addDays(end, -20);
  const check2 = addDays(end, -10);
  const endsAfterThreeMonths = end >= completesThreeMonths;
  return {
    end,
    completesThreeMonths,
    lastNoNotice: addDays(completesThreeMonths, -1),
    noticeDays: first.days,
    check1: check1 > input.hireDate ? check1 : null,
    check2: check2 > input.hireDate ? check2 : null,
    endsAfterThreeMonths,
    noticeBy: endsAfterThreeMonths ? addDays(end, -first.days) : null,
  };
}
