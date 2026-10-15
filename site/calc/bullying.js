// 職場霸凌申訴期限。純計算，不碰畫面。
import { addDays, addMonths, anniversary } from '../format.js';

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
 * 向地方主管機關申訴的期限（職安法第 22-3 條，被申訴人為最高負責人時）：
 * 行為終了起 3 年；事件發生時在職者，離職後 1 年內也可以（取較長者）。
 */
export function authorityDeadline(input) {
  // 期間末日（民法第 121 條）：對應日的前一天；沒有對應日時是該月最後一天
  const threeYears = addDays(anniversary(input.endedOn, 36), -1);
  const afterLeaving = input.leftOn ? addDays(anniversary(input.leftOn, 12), -1) : null;
  return { threeYears, afterLeaving, deadline: afterLeaving && afterLeaving > threeYears ? afterLeaving : threeYears };
}

/** 公司內部處理時程（範例：企業依準則訂定的常見規範，各公司規範可能不同） */
export function internalTimeline(receivedOn) {
  const accept = addWorkdays(receivedOn, 10);
  const team = addWorkdays(accept, 15);
  const report = addMonths(team, 2);
  return { accept, team, report, reportExtended: addMonths(report, 1), decision: addMonths(report, 1) };
}
