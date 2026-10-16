// 資料健康狀態的判斷（不碰畫面）：讀 data/status.json，判斷法條、計算規則、行事曆、自動更新是否正常。

/** 自動檢查超過幾天沒有執行就顯示紅色警告 */
export const RUN_STALE_DAYS = 3;

const LEVELS = ['ok', 'warn', 'crit'];
const worst = (items) => items.reduce((a, b) => (LEVELS.indexOf(b.level) > LEVELS.indexOf(a) ? b.level : a), 'ok');

const roc = (iso) => (iso ? `${Number(iso.slice(0, 4)) - 1911}.${iso.slice(5, 7)}.${iso.slice(8, 10)}` : '');
const rocTime = (stamp) => (stamp ? `${roc(stamp.slice(0, 10))} ${stamp.slice(11, 16)}` : '');

/**
 * status：data/status.json 的內容；nowMs：現在時間（毫秒）。
 * 回傳 { level, items: [{ area, title, level, text, action? }] }，level：ok（正常）、warn（注意）、crit（要處理）
 */
export function assess(status, nowMs = Date.now()) {
  if (!status || !status.summary) {
    return { level: 'warn', items: [{ area: 'system', title: '資料檢查紀錄', level: 'warn', text: '找不到資料檢查紀錄，無法確認資料是否最新。', action: '請連上網路重新整理。' }] };
  }
  const s = status.summary;
  const problems = status.problems || [];
  const checks = status.checks || {};
  const items = [];

  // 自動更新有沒有在跑
  const last = status.checked_at ? Date.parse(status.checked_at) : NaN;
  const days = Number.isNaN(last) ? null : Math.floor((nowMs - last) / 86400000);
  if (days === null) {
    items.push({ area: 'system', title: '自動更新', level: 'warn', text: '還沒有自動檢查的紀錄。', action: '每天台灣時間 03:00 會自動檢查一次。' });
  } else if (days > RUN_STALE_DAYS) {
    items.push({ area: 'system', title: '自動更新', level: 'crit', text: `自動檢查已經 ${days} 天沒有執行（上次 ${rocTime(status.checked_at)}）。`, action: '法條與行事曆可能不是最新的，請維護者查看 GitHub 的自動執行紀錄。' });
  } else {
    items.push({ area: 'system', title: '自動更新', level: 'ok', text: `每天 03:00 自動檢查，上次 ${rocTime(status.checked_at)}。` });
  }

  // 法條
  const newest = s.laws.reduce((a, b) => (b.modified_on > a ? b.modified_on : a), '');
  if (checks.laws && !checks.laws.ok) {
    items.push({ area: 'laws', title: `法條（${s.laws.length} 部）`, level: 'crit', text: `最近一次更新失敗：${checks.laws.message}`, action: checks.laws.last_success ? `上次成功是 ${rocTime(checks.laws.last_success)}，目前顯示的是那時的條文。` : '目前顯示的是之前存下的條文。' });
  } else {
    items.push({ area: 'laws', title: `法條（${s.laws.length} 部）`, level: 'ok', text: `與全國法規資料庫一致，最近一次修法 ${roc(newest)}。` });
  }

  // 計算規則（問題的開頭是規則表代號，換成中文名稱）
  const titles = Object.fromEntries(s.rules.map((r) => [r.id, r.title]));
  const named = (p) => p.replace(/^([a-z0-9-]+)：/, (m, id) => `${titles[id] || (id === 'holiday-calendar' ? '休假行事曆' : id)}：`);
  const ruleProblems = problems.filter((p) => !p.startsWith('holiday-calendar')).map(named);
  const oldest = s.rules.reduce((a, b) => (!a || b.checked_on < a ? b.checked_on : a), '');
  items.push(ruleProblems.length
    ? { area: 'rules', title: `計算規則（${s.rules.length} 張）`, level: 'warn', text: ruleProblems.join(' '), action: '請維護者依主管機關最新公告更新規則表。' }
    : { area: 'rules', title: `計算規則（${s.rules.length} 張）`, level: 'ok', text: `都在有效期內，最久的查證日 ${roc(oldest)}。` });

  // 行事曆
  const calProblems = problems.filter((p) => p.startsWith('holiday-calendar')).map(named);
  const years = s.calendar.years.map((y) => `${y - 1911}`).join('、');
  if (checks.calendar && !checks.calendar.ok) {
    items.push({ area: 'calendar', title: '休假行事曆', level: 'crit', text: `最近一次更新失敗：${checks.calendar.message}`, action: `目前顯示的是之前存下的 ${years} 年行事曆。` });
  } else if (calProblems.length) {
    items.push({ area: 'calendar', title: '休假行事曆', level: 'warn', text: calProblems.join(' '), action: '政府公布後會自動更新；若已公布仍未更新，請維護者確認。' });
  } else {
    items.push({ area: 'calendar', title: '休假行事曆', level: 'ok', text: `已有 ${years} 年的政府行事曆。` });
  }

  return { level: worst(items), items };
}
