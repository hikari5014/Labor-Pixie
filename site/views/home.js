import { h } from '../lib/ui.js';
import { rule, meta } from '../lib/data.js';
import { rocDate, money, todayTaipei, entryOn, nextEntry } from '../format.js';

const intro = {
  employer: '查清楚怎麼做才合規，算清楚該付多少。',
  worker: '查清楚自己的權益，知道該留哪些證據。',
};

function tile(label, href, sub) {
  if (!href) return h('div', { class: 'tile', 'aria-disabled': 'true' }, h('b', {}, label), h('span', { class: 'pill' }, '即將推出'));
  return h('a', { class: 'tile', href }, h('b', {}, label), sub && h('span', { class: 'tile__sub' }, sub));
}

export function render(root, params, ctx) {
  const role = ctx.role();
  const seg = h('div', { class: 'seg', role: 'group', 'aria-label': '選擇身分' },
    ['employer', 'worker'].map((r) => h('button', {
      type: 'button', class: 'seg__btn', 'aria-pressed': String(r === role),
      onclick: () => { ctx.setRole(r); ctx.rerender(); },
    }, r === 'employer' ? '我是雇主' : '我是勞工')));

  const wage = h('p', { class: 'muted' }, '讀取中…');
  const wageNext = h('p', { class: 'small', hidden: true });
  const dataVersion = h('dd', {}, '讀取中…');

  root.append(
    seg,
    h('p', { class: 'muted' }, intro[role]),
    h('section', { class: 'tiles', 'aria-label': '功能' },
      tile('查爭議'),
      tile('算金額', '#/calc', '統包薪資、特休、最低工資…'),
      tile(role === 'employer' ? '檢查公司' : '準備證據'),
      tile('看法條')),
    h('section', { class: 'panel' }, h('h2', { class: 'section-title' }, '目前最低工資'), wage, wageNext),
    h('section', { class: 'panel' },
      h('dl', { class: 'facts' },
        h('dt', {}, '法規資料'), dataVersion,
        h('dt', {}, 'APP 版本'), h('dd', {}, h('a', { href: '#/changelog' }, `v${ctx.version}（本版紀錄）`))),
      ctx.updateButton()),
  );

  const today = todayTaipei();
  meta().then((m) => { dataVersion.textContent = rocDate(m.data_version); }).catch(() => { dataVersion.textContent = '讀取失敗'; });
  rule('minimum-wage').then((w) => {
    const now = entryOn(w.entries, today);
    wage.textContent = now ? `月薪 ${money(now.monthly)} 元／時薪 ${money(now.hourly)} 元（${rocDate(now.effective_from)} 起）` : '查無資料';
    const next = nextEntry(w.entries, today);
    if (next) {
      wageNext.textContent = `${rocDate(next.effective_from)} 起：月薪 ${money(next.monthly)} 元／時薪 ${money(next.hourly)} 元（${next.status === 'pending' ? '尚未正式核定' : '已公告'}）`;
      wageNext.hidden = false;
    }
  }).catch(() => { wage.textContent = '讀取失敗，請連網後重新整理。'; });
}
