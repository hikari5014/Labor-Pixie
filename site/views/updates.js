import { h, pageHead, alertBox, disclaimer } from '../lib/ui.js';
import { getJSON } from '../lib/data.js';
import { rocDate } from '../format.js';
import { assess } from '../lib/health.js';

const LEVEL_TEXT = { ok: '正常', warn: '注意', crit: '要處理' };
const LEVEL_PILL = { ok: 'pill--good', warn: 'pill--warn', crit: 'pill--crit' };
const CATEGORY = { laws: '法條', rules: '計算規則', calendar: '行事曆', system: '系統' };

export async function render(root) {
  const [status, log] = await Promise.all([getJSON('data/status.json').catch(() => null), getJSON('data/update-log.json').catch(() => ({ entries: [] }))]);
  const health = assess(status);
  const s = status && status.summary;
  const list = h('div', { class: 'log-list' });
  let filter = 'all';
  const chips = h('div', { class: 'chips', role: 'group', 'aria-label': '篩選類別' });

  function drawLog() {
    const rows = log.entries.filter((e) => filter === 'all' || e.category === filter);
    list.replaceChildren(...(rows.length ? rows.map((e) => h('div', { class: 'log-row' },
      h('span', { class: 'log-row__date' }, rocDate(e.date)),
      h('span', { class: 'pill' }, CATEGORY[e.category] || e.category),
      h('span', {}, h('b', {}, e.item), ` ${e.summary}`))) : [h('p', { class: 'small muted' }, '這個類別還沒有紀錄。')]));
    chips.replaceChildren(...[['all', '全部'], ...Object.entries(CATEGORY)].map(([k, t]) => h('button', {
      type: 'button', class: `chip${filter === k ? ' is-on' : ''}`, 'aria-pressed': String(filter === k), onclick: () => { filter = k; drawLog(); },
    }, t)));
  }

  root.append(
    pageHead('資料更新紀錄', '法條、計算規則、休假行事曆是不是最新的，以及每一次更新的紀錄。'),
    health.level === 'ok'
      ? alertBox('good', '所有資料都是最新的', status && status.checked_at ? `上次自動檢查：${rocDate(status.checked_at.slice(0, 10))} ${status.checked_at.slice(11, 16)}` : '')
      : alertBox(health.level, health.level === 'crit' ? '有資料需要處理' : '有需要注意的地方', '詳細原因與建議做法見下表。'),
    h('section', { class: 'panel' }, h('h2', { class: 'section-title' }, '健康狀態'),
      h('div', { class: 'status-board' }, health.items.map((i) => h('div', { class: `status-row status-row--${i.level}` },
        h('div', { class: 'status-row__head' }, h('b', {}, i.title), h('span', { class: `pill ${LEVEL_PILL[i.level]}` }, LEVEL_TEXT[i.level])),
        h('p', {}, i.text), i.action ? h('p', { class: 'small muted' }, i.action) : null)))),
    s ? h('details', { class: 'panel formula' }, h('summary', {}, `各部法規的最新修正日（${s.laws.length} 部）`),
      h('div', { class: 'table-wrap' }, h('table', { class: 'table' },
        h('thead', {}, h('tr', {}, h('th', {}, '法規'), h('th', {}, '最新修正'))),
        h('tbody', {}, s.laws.map((l) => h('tr', {}, h('td', {}, h('a', { href: `#/laws/${l.id}` }, l.name)), h('td', {}, rocDate(l.modified_on))))))),
      h('p', { class: 'small muted' }, '每天和全國法規資料庫比對，有修法會自動更新。')) : null,
    s ? h('details', { class: 'panel formula' }, h('summary', {}, `計算規則表的查證日（${s.rules.length} 張）`),
      h('div', { class: 'table-wrap' }, h('table', { class: 'table' },
        h('thead', {}, h('tr', {}, h('th', {}, '規則表'), h('th', {}, '目前版本生效'), h('th', {}, '查證日'), h('th', {}, '待生效'))),
        h('tbody', {}, s.rules.map((r) => h('tr', {}, h('td', {}, r.title), h('td', {}, r.effective_from ? rocDate(r.effective_from) : '—'),
          h('td', {}, rocDate(r.checked_on)), h('td', {}, r.pending.length ? r.pending.map(rocDate).join('、') : '—')))))),
      h('p', { class: 'small muted' }, '最低工資、投保級距等由維護者依主管機關公告更新；查證超過一年、或待生效的數字到了生效日還沒核定，都會提醒。')) : null,
    h('section', { class: 'panel' }, h('h2', { class: 'section-title' }, '更新紀錄'), chips, list),
    disclaimer(),
  );
  drawLog();
}
