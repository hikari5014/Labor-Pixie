// 職場霸凌申訴期限。純計算；期限來自 data/rules/。
import { addDays, addMonths, anniversary, ruleOn } from '../format.js';

/** 往後算 n 個工作日（只跳過週六日；國定假日請自行順延） */
export function addWorkdays(iso, n) {
  let d = iso;
  let left = n;
  while (left > 0) {
    d = addDays(d, 1);
    const wd = new Date(Date.parse(d)).getUTCDay();
    if (wd !== 0 && wd !== 6) left -= 1;
  }
  return d;
}

/**
 * 向地方主管機關申訴的期限（被申訴人為最高負責人時）。input: { endedOn, leftOn? }；rules：{ 'bullying-deadlines' }
 * 期間末日依民法第 121 條：對應日的前一天；沒有對應日時是該月最後一天。
 */
export function authorityDeadline(input, rules) {
  const r = ruleOn(rules, 'bullying-deadlines'); // 用今天有效的規定（申訴時適用）
  const threeYears = addDays(anniversary(input.endedOn, r.authority_months_after_end), -1);
  const afterLeaving = input.leftOn ? addDays(anniversary(input.leftOn, r.authority_months_after_leaving), -1) : null;
  return { threeYears, afterLeaving, deadline: afterLeaving && afterLeaving > threeYears ? afterLeaving : threeYears };
}

/** 公司內部處理時程（範例：企業依準則訂定的常見規範，各公司規範可能不同） */
export function internalTimeline(receivedOn, rules) {
  const x = ruleOn(rules, 'bullying-deadlines').internal_example;
  const accept = addWorkdays(receivedOn, x.accept_workdays);
  const team = addWorkdays(accept, x.team_workdays);
  const report = addMonths(team, x.report_months);
  return { accept, team, report, reportExtended: addMonths(report, x.report_extend_months), decision: addMonths(report, x.decision_months), noticeWorkdays: x.notice_workdays, appealDays: x.appeal_days };
}
