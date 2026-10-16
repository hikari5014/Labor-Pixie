import { h, highlight } from '../lib/ui.js';
import { law } from '../lib/data.js';
import { articleKey } from '../lib/laws.js';
import { rocDate } from '../format.js';

export async function render(root, params) {
  const [id, target] = params.rest.split('/');
  const l = await law(id);
  const input = h('input', { class: 'input', type: 'search', placeholder: '在這部法規裡找…', 'aria-label': '在這部法規裡搜尋' });
  const body = h('div', { class: 'law' });
  const toc = h('details', { class: 'panel' }, h('summary', {}, '章節目錄'));
  const chapters = [];

  function draw() {
    const q = input.value.trim();
    body.replaceChildren();
    let shown = 0;
    l.articles.forEach((a, i) => {
      if (a.type === 'chapter') {
        if (!q) body.append(h('h2', { class: 'law__chapter', id: `ch-${i}` }, a.text));
        return;
      }
      if (q && !`${a.no}${a.text}`.includes(q)) return;
      shown += 1;
      body.append(h('section', { class: 'law__article', id: `art-${articleKey(a.no)}` },
        h('h3', {}, a.no), ...a.text.split('\n').map((line) => h('p', {}, ...highlight(line, q)))));
    });
    if (q && !shown) body.append(h('p', { class: 'muted' }, '這部法規裡找不到這個關鍵字。'));
  }

  l.articles.forEach((a, i) => { if (a.type === 'chapter') chapters.push(h('li', {}, h('a', { href: `#/laws/${id}`, onclick: (e) => { e.preventDefault(); document.getElementById(`ch-${i}`).scrollIntoView(); } }, a.text))); });
  if (chapters.length) toc.append(h('ul', {}, chapters)); else toc.hidden = true;
  input.addEventListener('input', draw);
  root.append(
    h('div', { class: 'page-head' },
      h('a', { class: 'back', href: '#/laws' }, '返回看法條'),
      h('h1', { class: 'page-head__title' }, l.name),
      h('p', { class: 'page-head__sub' }, `${l.level}・最後修正 ${rocDate(l.modified_on)}・`, h('a', { href: l.url, target: '_blank', rel: 'noopener' }, '全國法規資料庫原文')),
      l.abandon_note ? h('p', { class: 'alert alert--crit' }, `本法規已廢止：${l.abandon_note}`) : null),
    h('div', { class: 'panel' }, input), toc, body,
    h('p', { class: 'small muted' }, '條文來自全國法規資料庫開放資料，以官方公布為準。'),
  );
  draw();
  if (target) {
    const el = document.getElementById(`art-${target}`);
    if (el) { el.classList.add('is-target'); el.scrollIntoView(); }
  }
}
