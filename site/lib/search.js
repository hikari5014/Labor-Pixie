// 全站搜尋（純函式，可以測試）：同時找案例、主題卡、試算器、法條。
import { searchArticles } from './laws.js';

function matches(texts, words) {
  const all = texts.join(' ');
  return words.every((w) => all.includes(w));
}

/**
 * sources: { cases: [{category, case}], topics: [], calcs: [], laws: [] }
 * 回傳 { cases, topics, calcs, articles }
 */
export function searchAll(sources, query) {
  const words = query.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return { cases: [], topics: [], calcs: [], articles: [] };
  return {
    topics: sources.topics.filter((t) => matches([t.title, t.question, ...t.tags, ...t.summary], words)),
    cases: sources.cases.filter(({ case: c }) => matches([c.title, c.story, c.issue, ...c.tags], words)),
    calcs: sources.calcs.filter((c) => matches([c.title, c.summary], words)),
    articles: searchArticles(sources.laws, query, 20),
  };
}
