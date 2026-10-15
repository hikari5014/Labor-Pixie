// 讀取 data/ 的資料（同一個檔只抓一次）。
const cache = new Map();

export function getJSON(path) {
  if (!cache.has(path)) {
    cache.set(path, fetch(path).then((res) => {
      if (!res.ok) throw new Error(`${path} ${res.status}`);
      return res.json();
    }).catch((e) => { cache.delete(path); throw e; }));
  }
  return cache.get(path);
}

export const rule = (id) => getJSON(`data/rules/${id}.json`);
export const law = (id) => getJSON(`data/laws/${id}.json`);
export const meta = () => getJSON('data/meta.json');

/** 重新整理資料時清掉快取 */
export function clearCache() {
  cache.clear();
}
