import { h, pageHead, field, alertBox, lawLink } from '../lib/ui.js';
import { getJSON } from '../lib/data.js';

let KEY = 'audit';

function load() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; }
}
function save(state) {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* 存不了就只在這次有效 */ }
}

const INTRO = {
  'company-audit': ['公司體檢清單', '逐項自評：沒有、有但內容不對、對但沒落實、有做但沒紀錄、完整。目標是「正確＋落實＋有紀錄」。'],
  'contract-terms': ['勞動契約條款檢查', '拿一份勞動契約逐項對照：有沒有寫、寫得清不清楚。'],
};

export async function render(root, params) {
  const id = (params && params.rest) || 'company-audit';
  KEY = id === 'company-audit' ? 'audit' : `check-${id}`;
  const list = await getJSON(`data/checklists/${id}.json`);
  const state = load();
  const hasSize = list.groups.some((g) => g.items.some((it) => it.min_employees));
  const size = field({ label: '公司員工人數', unit: '人', min: 1, value: state.size || '' });
  const summary = h('div', { class: 'result', 'aria-live': 'polite' });
  const groups = h('div', { class: 'checklist' });

  function draw() {
    const n = Number(size.input.value) || 0;
    groups.replaceChildren();
    const counts = Object.fromEntries(list.states.map((s) => [s.id, 0]));
    let total = 0;
    let unanswered = 0;
    for (const g of list.groups) {
      groups.append(h('h2', { class: 'section-title' }, g.title));
      for (const it of g.items) {
        total += 1;
        const current = state[it.id] || '';
        if (current) counts[current] += 1; else unanswered += 1;
        const optional = it.min_employees && n && n < it.min_employees;
        const select = h('select', { class: 'input', 'aria-label': it.title }, h('option', { value: '' }, '請選擇'),
          list.states.map((s) => h('option', { value: s.id }, s.name)));
        select.value = current;
        select.addEventListener('input', () => { state[it.id] = select.value; save(state); draw(); });
        groups.append(h('div', { class: `check-item check-item--${current || 'blank'}` },
          h('b', {}, it.title, optional ? h('span', { class: 'pill' }, `${it.min_employees} 人以上才是法定義務`) : null),
          h('span', { class: 'small muted' }, it.why),
          h('span', { class: 'small' }, '依據：', ...it.basis.flatMap(([p, no, label], i) => (i ? ['、', lawLink(p, no, label)] : [lawLink(p, no, label)]))),
          select));
      }
    }
    const bad = ['missing', 'wrong', 'unclear'].reduce((n, k) => n + (counts[k] || 0), 0);
    const mid = ['not-done', 'no-record'].reduce((n, k) => n + (counts[k] || 0), 0);
    summary.replaceChildren(...[
      h('div', { class: 'result-row result-row--main' }, h('span', {}, '完整'), h('b', {}, `${counts.ok} / ${total} 項`)),
      ...list.states.filter((s) => s.id !== 'ok').map((s) => h('div', { class: 'result-row' }, h('span', {}, s.name), h('b', {}, `${counts[s.id]} 項`))),
      unanswered ? h('div', { class: 'result-row' }, h('span', {}, '還沒填'), h('b', {}, `${unanswered} 項`)) : null,
      bad ? alertBox('crit', `先處理 ${bad} 項沒有或不清楚的`, '沒寫或寫錯的條款，發生爭議時反而會對公司不利。')
        : mid ? alertBox('warn', '再補上落實與紀錄', '做了但沒有紀錄，發生爭議時一樣拿不出證據。')
          : !unanswered ? alertBox('good', '全部完整', '記得每年至少檢查一次，法規修正時也要更新。') : null,
    ].filter(Boolean));
  }

  size.input.addEventListener('input', () => { state.size = size.input.value; save(state); draw(); });
  root.append(
    pageHead(...(INTRO[id] || [list.title, list.note])),
    h('div', { class: 'calc' },
      h('section', { class: 'panel form-grid' }, hasSize ? size.el : null, h('p', { class: 'small muted' }, '填的內容只存在這台裝置，不會上傳。')),
      h('section', { class: 'panel' }, h('h2', { class: 'section-title' }, '結果'), summary)),
    h('section', { class: 'panel' }, groups),
    h('div', { class: 'actions' },
      h('button', { type: 'button', class: 'btn', onclick: () => window.print() }, '列印這份清單'),
      h('button', { type: 'button', class: 'btn', onclick: () => { if (window.confirm('確定要清除這台裝置上的自評內容？')) { Object.keys(state).forEach((k) => delete state[k]); save(state); size.input.value = ''; draw(); } } }, '全部清除')),
    alertBox('info', '這是自我檢查，不是法律意見', '每家公司的情況不同；有疑問時請洽勞動主管機關或律師。'),
  );
  draw();
}
