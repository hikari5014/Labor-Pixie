import { h, pageHead } from '../lib/ui.js';
import { getJSON, meta } from '../lib/data.js';

export async function render(root, params, ctx) {
  const m = await meta();
  const topics = await Promise.all(m.files.filter((f) => f.startsWith('topics/')).map((f) => getJSON(`data/${f}`)));
  const input = h('input', { class: 'input', type: 'search', placeholder: '輸入關鍵字，例：加班、試用、年終', 'aria-label': '搜尋爭議' });
  const list = h('div', { class: 'list', 'aria-live': 'polite' });

  function draw() {
    const q = input.value.trim();
    const shown = topics.filter((t) => !q || [t.title, t.question, ...t.tags].some((s) => s.includes(q)));
    list.replaceChildren(...shown.map((t) => h('a', { class: 'list-item', href: `#/topics/${t.id}` },
      h('b', {}, t.question), h('span', { class: 'muted small' }, t.title, t.disputes.length ? '・見解不一' : ''))));
    if (!shown.length) list.append(h('p', { class: 'muted' }, '目前沒有這個主題，可以到「看法條」直接搜尋條文。'));
  }

  input.addEventListener('input', draw);
  root.append(
    pageHead('查爭議', ctx.role() === 'employer' ? '選一個爭議，看法條怎麼說、怎麼做才合規。' : '選一個爭議，看法條怎麼說、你該留哪些證據。'),
    h('div', { class: 'panel' }, input), list,
  );
  draw();
}
