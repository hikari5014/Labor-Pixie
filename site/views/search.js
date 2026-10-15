import { h, pageHead, highlight } from '../lib/ui.js';
import { loadCases, loadTopics, loadLaws } from '../lib/content.js';
import { CALCULATORS } from '../calc/registry.js';
import { searchAll } from '../lib/search.js';
import { articleKey } from '../lib/laws.js';

function group(title, items) {
  if (!items.length) return null;
  return h('section', { class: 'panel' }, h('h2', { class: 'section-title' }, `${title}（${items.length}）`), h('div', { class: 'list' }, items));
}

export async function render(root, params) {
  const [cases, topics, laws] = await Promise.all([loadCases(), loadTopics(), loadLaws()]);
  const input = h('input', { class: 'input', type: 'search', placeholder: '搜尋爭議、案例、試算器、法條', 'aria-label': '全站搜尋', value: decodeURIComponent(params.rest || '') });
  const out = h('div', { class: 'search-results', 'aria-live': 'polite' });

  function draw() {
    const q = input.value.trim();
    history.replaceState(null, '', `#/search/${encodeURIComponent(q)}`);
    out.replaceChildren();
    if (!q) return;
    const r = searchAll({ cases, topics, calcs: CALCULATORS, laws }, q);
    const first = q.split(/\s+/)[0];
    const sections = [
      group('爭議主題卡', r.topics.map((t) => h('a', { class: 'list-item', href: `#/topics/${t.id}` }, h('b', {}, t.question), h('span', { class: 'muted small' }, t.title)))),
      group('案例', r.cases.map(({ category, case: c }) => h('a', { class: 'list-item', href: `#/cases/${c.id}` }, h('b', {}, c.title), h('span', { class: 'muted small' }, category.title)))),
      group('試算與檢查', r.calcs.map((c) => h('a', { class: 'list-item', href: `#/calc/${c.id}` }, h('b', {}, c.title), h('span', { class: 'muted small' }, c.summary)))),
      group('法條', r.articles.map(({ law, article }) => {
        const i = Math.max(0, article.text.indexOf(first));
        return h('a', { class: 'list-item', href: `#/laws/${law.id}/${articleKey(article.no)}` }, h('b', {}, `${law.name} ${article.no}`),
          h('span', { class: 'small' }, ...highlight(article.text.slice(Math.max(0, i - 30), i + 70), first)));
      })),
    ].filter(Boolean);
    out.append(...(sections.length ? sections : [h('p', { class: 'muted' }, '找不到符合的內容，換個說法試試（例：加班＝延長工作時間）。')]));
  }

  input.addEventListener('input', draw);
  root.append(pageHead('搜尋', '同時找爭議主題卡、案例、試算器與法條。'), h('div', { class: 'panel' }, input), out);
  draw();
  input.focus();
}
