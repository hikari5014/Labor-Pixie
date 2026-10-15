// 純計算的小工具（不碰畫面），可以用 node --test 測試。

/** 西元 ISO 日期 → 民國年格式，例 2026-10-15 → 115.10.15 */
export function rocDate(iso) {
  const [y, m, d] = iso.split('-');
  return `${Number(y) - 1911}.${m}.${d}`;
}

/** 金額加千分位，例 29500 → 29,500 */
export function money(n) {
  return Number(n).toLocaleString('en-US');
}

/** 兩個 ISO 日期相差幾天（b − a） */
export function daysBetween(a, b) {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
}

/** 今天的 ISO 日期（台灣時間） */
export function todayTaipei(now = new Date()) {
  return new Date(now.getTime() + 8 * 3600000).toISOString().slice(0, 10);
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
