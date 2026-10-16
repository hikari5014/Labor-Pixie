import { h, alertBox, lawLink } from '../lib/ui.js';
import { getJSON } from '../lib/data.js';
import { loadCases } from '../lib/content.js';
import { CALCULATORS } from '../calc/registry.js';
import { rocDate } from '../format.js';

function bullets(items) {
  return h('ul', { class: 'notes' }, items.map((x) => h('li', {}, x)));
}

function refItem(ref) {
  return h('li', {}, ref.url ? h('a', { href: ref.url, target: '_blank', rel: 'noopener' }, ref.label) : ref.label,
    ref.verified === false ? h('span', { class: 'pill pill--warn' }, '待核對原文') : null);
}

export async function render(root, params, ctx) {
  const [t, cases] = await Promise.all([getJSON(`data/topics/${params.rest}.json`), loadCases()]);
  const relCases = cases.filter((x) => x.case.topics.includes(t.id));
  const employer = h('section', { class: 'panel' }, h('h2', { class: 'section-title' }, '雇主：怎麼做才合規'), bullets(t.employer));
  const worker = h('section', { class: 'panel' }, h('h2', { class: 'section-title' }, '勞工：該留哪些證據、下一步'), bullets(t.worker));
  const calcs = t.calcs.map((id) => CALCULATORS.find((c) => c.id === id)).filter(Boolean);
  root.append(...[
    h('div', { class: 'page-head' },
      h('a', { class: 'back', href: '#/topics' }, '返回查爭議'),
      h('h1', { class: 'page-head__title' }, t.question),
      h('p', { class: 'page-head__sub' }, t.title)),
    h('section', { class: 'panel' }, h('h2', { class: 'section-title' }, '白話說明'), bullets(t.summary)),
    h('section', { class: 'panel' }, h('h2', { class: 'section-title' }, '相關法條'),
      h('ul', { class: 'notes' }, t.laws.map(([p, no, label]) => h('li', {}, lawLink(p, no, label)))),
      h('h3', { class: 'release__head' }, '重點'), bullets(t.key_points)),
    ...t.disputes.map((d) => h('section', { class: 'panel dispute' },
      h('h2', { class: 'section-title' }, h('span', { class: 'pill pill--warn' }, '見解不一'), ' ', d.question),
      h('div', { class: 'positions' }, d.positions.map((p) => h('div', { class: 'position' },
        h('b', {}, p.holder), h('p', {}, p.view), p.refs.length ? h('ul', { class: 'notes small' }, p.refs.map(refItem)) : null))),
      d.note ? h('p', { class: 'small muted' }, d.note) : null,
      h('p', { class: 'small muted' }, '這裡不替你判斷哪一方會贏；個案結果要看實際事實與證據。'))),
    ...(ctx.role() === 'employer' ? [employer, worker] : [worker, employer]),
    calcs.length ? h('section', { class: 'panel' }, h('h2', { class: 'section-title' }, '相關試算'),
      h('div', { class: 'list' }, calcs.map((c) => h('a', { class: 'list-item', href: `#/calc/${c.id}` }, h('b', {}, c.title), h('span', { class: 'muted small' }, c.summary))))) : null,
    relCases.length ? h('section', { class: 'panel' }, h('h2', { class: 'section-title' }, '相關案例'),
      h('div', { class: 'list' }, relCases.map(({ case: c }) => h('a', { class: 'list-item', href: `#/cases/${c.id}` }, h('b', {}, c.title), h('span', { class: 'muted small' }, c.issue))))) : null,
    h('section', { class: 'panel small' }, h('b', {}, '資料來源'), h('ul', { class: 'notes' }, t.sources.map(refItem)),
      h('p', { class: 'muted' }, `最後查證：${rocDate(t.checked_on)}。內容以法條與主管機關公開資料改寫，不代表主管機關立場。`)),
    alertBox('info', '本頁提供資訊，不取代律師或勞動主管機關的意見', '個案可以洽詢地方勞工局，或申請勞資爭議調解。'),
  ].filter(Boolean));
}
