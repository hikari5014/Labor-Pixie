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

  const q = h('input', { class: 'input', type: 'search', placeholder: '搜尋：加班、試用期、資遣費…', 'aria-label': '全站搜尋' });
  const searchBox = h('form', { class: 'home-search', role: 'search', onsubmit: (e) => { e.preventDefault(); location.hash = `#/search/${encodeURIComponent(q.value.trim())}`; } },
    q, h('button', { type: 'submit', class: 'btn' }, '搜尋'));

  root.append(
    searchBox,
    seg,
    h('p', { class: 'muted' }, intro[role]),
    h('section', { class: 'tiles', 'aria-label': '功能' },
      tile('查爭議', '#/topics', '18 張主題卡：加班、試用、年終、職災…'),
      tile('算金額', '#/calc', '加班費、資遣費、試用期、離職…'),
      role === 'employer' ? tile('檢查公司', '#/check', '27 項制度與紀錄自我檢查') : tile('準備證據', '#/topics', '依爭議看該留哪些證據'),
      tile('看法條', '#/laws', '勞基法等 12 部法規，可搜尋'),
      tile('看案例', '#/cases', '41 個常見情境：怎麼看、怎麼做'),
      tile('速查表', '#/quick', '常用數字、期限、國定假日'),
      tile('表單範本', '#/forms', '加班確認表、特休遞延、減班協議…')),
    h('section', { class: 'panel' }, h('h2', { class: 'section-title' }, '目前最低工資'), wage, wageNext),
    h('section', { class: 'panel' },
      h('dl', { class: 'facts' },
        h('dt', {}, '法規資料'), dataVersion,
        h('dt', {}, 'APP 版本'), h('dd', {}, h('a', { href: '#/changelog' }, `v${ctx.version}（本版紀錄）`))),
      h('p', { class: 'small muted' }, '法規每天自動和全國法規資料庫比對，有修法才會更新日期。'),
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
