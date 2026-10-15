// 讀取全部案例與主題卡（依 meta.json 的檔案清單）。
import { getJSON, meta } from './data.js';

export async function loadTopics() {
  const m = await meta();
  return Promise.all(m.files.filter((f) => f.startsWith('topics/')).map((f) => getJSON(`data/${f}`)));
}

/** 回傳 [{ category: {id, title}, case }] */
export async function loadCases() {
  const m = await meta();
  const files = await Promise.all(m.files.filter((f) => f.startsWith('cases/')).map((f) => getJSON(`data/${f}`)));
  return files.flatMap((file) => file.cases.map((c) => ({ category: { id: file.id, title: file.title }, case: c })));
}

export async function loadLaws() {
  const m = await meta();
  return Promise.all(m.files.filter((f) => f.startsWith('laws/')).map((f) => getJSON(`data/${f}`)));
}
