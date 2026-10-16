import { h, alertBox, lawLink } from '../lib/ui.js';
import { loadCases, loadTopics } from '../lib/content.js';
import { CALCULATORS } from '../calc/registry.js';
import { rocDate } from '../format.js';

const bullets = (items) => h('ul', { class: 'notes' }, items.map((x) => h('li', {}, x)));

export async function render(root, params, ctx) {
  const [all, topics] = await Promise.all([loadCases(), loadTopics()]);
  const found = all.find((x) => x.case.id === params.rest);
  if (!found) { root.append(h('p', {}, '找不到這個案例。'), h('a', { href: '#/cases' }, '回案例列表')); return; }
  const { category, case: c } = found;
  const employer = h('section', { class: 'panel' }, h('h2', { class: 'section-title' }, '雇主可以怎麼做'), bullets(c.employer));
  const worker = h('section', { class: 'panel' }, h('h2', { class: 'section-title' }, '勞工可以怎麼做'), bullets(c.worker));
  const relTopics = c.topics.map((id) => topics.find((t) => t.id === id)).filter(Boolean);
  const relCalcs = c.calcs.map((id) => CALCULATORS.find((k) => k.id === id)).filter(Boolean);
  const siblings = all.filter((x) => x.category.id === category.id && x.case.id !== c.id);
  root.append(...[
    h('div', { class: 'page-head' },
      h('a', { class: 'back', href: '#/cases' }, '返回看案例'),
      h('h1', { class: 'page-head__title' }, c.title),
      h('p', { class: 'page-head__sub' }, h('span', { class: 'pill' }, '課堂情境（改寫）'), ' ', category.title)),
    h('section', { class: 'panel case' },
      h('h2', { class: 'section-title' }, '情境'), h('p', {}, c.story),
      h('h2', { class: 'section-title' }, '爭點'), h('p', {}, c.issue),
      h('h2', { class: 'section-title' }, '法律怎麼看'), h('p', {}, c.law),
      c.laws.length ? h('p', { class: 'small basis' }, '依據：', ...c.laws.flatMap(([p, no, label], i) => (i ? ['、', lawLink(p, no, label)] : [lawLink(p, no, label)]))) : null,
      c.refs ? h('p', { class: 'small basis' }, '出處：', ...c.refs.map((r) => h('a', { href: r.url, target: '_blank', rel: 'noopener' }, r.label))) : null),
    c.practice ? h('section', { class: 'panel practice' },
      h('h2', { class: 'section-title' }, h('span', { class: 'pill pill--warn' }, '實務見解，非法定結論')),
      bullets(c.practice),
      h('p', { class: 'small muted' }, '這是實務上的看法或做法建議，查不到法條或主管機關的明文依據，請個案判斷。')) : null,
    ...(ctx.role() === 'employer' ? [employer, worker] : [worker, employer]),
    relTopics.length || relCalcs.length ? h('section', { class: 'panel' }, h('h2', { class: 'section-title' }, '相關'),
      h('div', { class: 'list' },
        ...relTopics.map((t) => h('a', { class: 'list-item', href: `#/topics/${t.id}` }, h('b', {}, `主題卡：${t.title}`), h('span', { class: 'muted small' }, t.question))),
        ...relCalcs.map((k) => h('a', { class: 'list-item', href: `#/calc/${k.id}` }, h('b', {}, `試算：${k.title}`), h('span', { class: 'muted small' }, k.summary))))) : null,
    siblings.length ? h('section', { class: 'panel' }, h('h2', { class: 'section-title' }, `同類案例：${category.title}`),
      h('ul', { class: 'notes' }, siblings.map((x) => h('li', {}, h('a', { href: `#/cases/${x.case.id}` }, x.case.title))))) : null,
    alertBox('info', '這是常見情境的整理，不是判決', `結論傾向依法條與主管機關資料說明，實際結果要看個案事實與證據。最後查證：${rocDate('2026-10-16')}。`),
  ].filter(Boolean));
}
