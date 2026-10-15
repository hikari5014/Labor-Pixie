import { h, pageHead } from '../lib/ui.js';
import { loadCases } from '../lib/content.js';

export async function render(root) {
  const all = await loadCases();
  const cats = [...new Map(all.map((x) => [x.category.id, x.category])).values()];
  let current = '';
  const input = h('input', { class: 'input', type: 'search', placeholder: '輸入關鍵字，例：打卡、年終、職災', 'aria-label': '搜尋案例' });
  const chips = h('div', { class: 'chips' });
  const list = h('div', { class: 'list', 'aria-live': 'polite' });

  function draw() {
    const q = input.value.trim();
    chips.replaceChildren(...[{ id: '', title: '全部' }, ...cats].map((c) => h('button', {
      type: 'button', class: `chip${c.id === current ? ' is-on' : ''}`, 'aria-pressed': String(c.id === current),
      onclick: () => { current = c.id; draw(); },
    }, c.title)));
    const shown = all.filter(({ category, case: c }) => (!current || category.id === current)
      && (!q || [c.title, c.story, c.issue, ...c.tags].some((s) => s.includes(q))));
    list.replaceChildren(...shown.map(({ category, case: c }) => h('a', { class: 'list-item', href: `#/cases/${c.id}` },
      h('b', {}, c.title), h('span', { class: 'muted small' }, `${category.title}・${c.issue}`))));
    if (!shown.length) list.append(h('p', { class: 'muted' }, '沒有符合的案例。'));
  }

  input.addEventListener('input', draw);
  root.append(pageHead('看案例', `${all.length} 個常見情境：發生什麼事、爭點是什麼、法律怎麼看、雇主和勞工可以怎麼做。`),
    h('div', { class: 'panel form-grid' }, input, chips), list);
  draw();
}
