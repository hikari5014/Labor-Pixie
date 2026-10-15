import { h, pageHead, highlight } from '../lib/ui.js';
import { law, meta } from '../lib/data.js';
import { articleKey, searchArticles } from '../lib/laws.js';
import { rocDate } from '../format.js';

const SUGGEST = ['特別休假', '資遣費', '延長工作時間', '休息日', '試用', '性騷擾', '霸凌', '出勤紀錄'];

export async function render(root) {
  const m = await meta();
  const laws = await Promise.all(m.files.filter((f) => f.startsWith('laws/')).map((f) => law(f.slice(5, -5))));
  laws.sort((a, b) => (a.id === 'labor-standards-act' ? -1 : b.id === 'labor-standards-act' ? 1 : 0));
  const input = h('input', { class: 'input', type: 'search', placeholder: '輸入關鍵字，例：特別休假', 'aria-label': '搜尋條文' });
  const results = h('div', { class: 'list', 'aria-live': 'polite' });
  const list = h('div', { class: 'list' }, laws.map((l) => h('a', { class: 'list-item', href: `#/laws/${l.id}` },
    h('b', {}, l.name), h('span', { class: 'muted small' }, `${l.level}・最後修正 ${rocDate(l.modified_on)}・${l.articles.filter((a) => a.type === 'article').length} 條`))));

  function search() {
    const q = input.value.trim();
    results.replaceChildren();
    list.hidden = Boolean(q);
    if (!q) return;
    const hits = searchArticles(laws, q);
    if (!hits.length) { results.append(h('p', { class: 'muted' }, '找不到符合的條文，換個說法試試（法條用語例：「延長工作時間」＝加班）。')); return; }
    results.append(h('p', { class: 'small muted' }, hits.length >= 50 ? '顯示前 50 筆，請加關鍵字縮小範圍。' : `找到 ${hits.length} 條。`));
    const first = q.split(/\s+/)[0];
    for (const { law: l, article: a } of hits) {
      const i = a.text.indexOf(first);
      const snippet = (i > 40 ? '…' : '') + a.text.slice(Math.max(0, i - 40), i + 80) + (a.text.length > i + 80 ? '…' : '');
      results.append(h('a', { class: 'list-item', href: `#/laws/${l.id}/${articleKey(a.no)}` },
        h('b', {}, `${l.name} ${a.no}`), h('span', { class: 'small' }, ...highlight(snippet, first))));
    }
  }

  input.addEventListener('input', search);
  root.append(
    pageHead('看法條', `收錄 ${laws.length} 部勞動相關法規，每天自動和全國法規資料庫比對更新。`),
    h('div', { class: 'panel form-grid' }, input,
      h('div', { class: 'chips' }, SUGGEST.map((w) => h('button', { type: 'button', class: 'chip', onclick: () => { input.value = w; search(); } }, w)))),
    results, list,
  );
}
