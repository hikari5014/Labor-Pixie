// 純計算的小工具（不碰畫面），可以用 node --test 測試。日期一律用西元 ISO 字串 YYYY-MM-DD。

/** 西元 ISO 日期 → 民國年格式，例 2026-10-15 → 115.10.15 */
export function rocDate(iso) {
  const [y, m, d] = iso.split('-');
  return `${Number(y) - 1911}.${m}.${d}`;
}

/** 金額加千分位，例 29500 → 29,500；小數最多 2 位 */
export function money(n) {
  return Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 });
}

/** 付給勞工的金額一律無條件進位到元，避免短付（先去掉浮點誤差） */
export function ceilMoney(n) {
  return Math.ceil(Math.round(n * 1e6) / 1e6);
}

/** 兩個 ISO 日期相差幾天（b − a） */
export function daysBetween(a, b) {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
}

/** 加減天數 */
export function addDays(iso, n) {
  return new Date(Date.parse(iso) + n * 86400000).toISOString().slice(0, 10);
}

/** 加減月數；目標月份沒有那一天時取月底（例 1/31 加 1 個月 → 2/28） */
export function addMonths(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  const total = y * 12 + (m - 1) + n;
  const ty = Math.floor(total / 12);
  const tm = total - ty * 12 + 1;
  const last = new Date(Date.UTC(ty, tm, 0)).getUTCDate();
  return `${String(ty).padStart(4, '0')}-${String(tm).padStart(2, '0')}-${String(Math.min(d, last)).padStart(2, '0')}`;
}

/**
 * 從 start 起算滿 n 個月後的「下一天」（民法第 121、123 條）：
 * 有對應日就是對應日；沒有對應日（例 1/31 起算 1 個月，2 月沒有 31 日）期間到月底結束，下一天是次月 1 日。
 */
export function anniversary(start, n) {
  const clamped = addMonths(start, n);
  return clamped.slice(8) === start.slice(8) ? clamped : addDays(clamped, 1);
}

/** 從 start 到 end 已經「滿」幾個月（到 anniversary(start, n) 那天就算滿 n 個月） */
export function completedMonths(start, end) {
  if (end < start) return 0;
  let n = Math.max(0, (Number(end.slice(0, 4)) - Number(start.slice(0, 4))) * 12 + Number(end.slice(5, 7)) - Number(start.slice(5, 7)) - 1);
  while (anniversary(start, n + 1) <= end) n += 1;
  return n;
}

/** 月數 → 「X 年 Y 個月」 */
export function yearsMonths(months) {
  const y = Math.floor(months / 12);
  const m = months % 12;
  if (!y) return `${m} 個月`;
  return m ? `${y} 年 ${m} 個月` : `${y} 年`;
}

/** 今天的 ISO 日期（台灣時間） */
export function todayTaipei(now = new Date()) {
  return new Date(now.getTime() + 8 * 3600000).toISOString().slice(0, 10);
}

/** 是否為合法的 ISO 日期字串 */
export function isDate(iso) {
  return typeof iso === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(iso) && !Number.isNaN(Date.parse(iso))
    && new Date(Date.parse(iso)).toISOString().slice(0, 10) === iso;
}

/** 規則表中，在指定日期有效的那一筆（只看已生效的） */
export function entryOn(entries, iso) {
  let found = null;
  for (const e of entries) {
    if (e.status === 'active' && e.effective_from <= iso) found = e;
  }
  return found;
}

/** 指定日期之後才生效的下一筆（含待核定） */
export function nextEntry(entries, iso) {
  return entries.find((e) => e.effective_from > iso && e.status !== 'repealed') || null;
}
