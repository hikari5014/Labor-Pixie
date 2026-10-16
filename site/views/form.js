import { h, field, lawLink, alertBox } from '../lib/ui.js';
import { getJSON } from '../lib/data.js';
import { fillTemplate, monthDays } from '../lib/template.js';
import { todayTaipei } from '../format.js';

const WEEK = '日一二三四五六';

export async function render(root, params) {
  const form = await getJSON(`data/forms/${params.rest}.json`);
  const inputs = form.fields.map((f) => ({ f, ...field({ label: f.label, type: f.type === 'month' ? 'month' : f.type, value: f.type === 'month' ? todayTaipei().slice(0, 7) : '' }) }));
  const doc = h('article', { class: 'doc', 'aria-label': '預覽' });

  function draw() {
    const values = Object.fromEntries(inputs.map(({ f, input }) => [f.id, input.value.trim()]));
    doc.replaceChildren(h('h2', { class: 'doc__title' }, form.title));
    for (const sec of form.sections) {
      doc.append(h('h3', {}, fillTemplate(sec.heading, values, form.fields)), ...sec.paragraphs.map((p) => h('p', {}, fillTemplate(p, values, form.fields))));
    }
    if (form.table && form.table.type === 'month-days' && values.month) {
      doc.append(h('table', { class: 'doc__table' },
        h('thead', {}, h('tr', {}, h('th', {}, '日期'), ...form.table.columns.map((c) => h('th', {}, c)))),
        h('tbody', {}, monthDays(values.month).map(({ day, weekday }) => h('tr', { class: weekday === 0 || weekday === 6 ? 'is-weekend' : null },
          h('td', {}, `${day}（${WEEK[weekday]}）`), ...form.table.columns.map((c, i) => h('td', {}, i < form.table.columns.length - 1 ? '□有 □無' : '')))))));
    }
    doc.append(h('div', { class: 'doc__signs' }, form.signatures.map((s) => h('div', { class: 'doc__sign' }, s))));
  }

  inputs.forEach(({ input }) => input.addEventListener('input', draw));
  root.append(
    h('div', { class: 'page-head' },
      h('a', { class: 'back', href: '#/forms' }, '返回表單範本'),
      h('h1', { class: 'page-head__title' }, form.title),
      h('p', { class: 'page-head__sub' }, form.purpose)),
    h('div', { class: 'calc' },
      h('section', { class: 'panel form-grid no-print' }, ...inputs.map((x) => x.el),
        h('button', { type: 'button', class: 'btn btn--primary', onclick: () => window.print() }, '列印')),
      doc),
    h('section', { class: 'panel no-print' }, h('h2', { class: 'section-title' }, '使用提醒'), h('ul', { class: 'notes' }, form.notes.map((n) => h('li', {}, n))),
      h('p', { class: 'small basis' }, '依據：', ...form.basis.flatMap(([p, no, label], i) => (i ? ['、', lawLink(p, no, label)] : [lawLink(p, no, label)])))),
    h('div', { class: 'no-print' }, alertBox('info', '這是參考範本', '請依公司實際情況調整；填的內容不會存檔，也不會上傳。')),
  );
  draw();
}
