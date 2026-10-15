import { h, pageHead, field, alertBox, lawLink, basis, disclaimer } from '../lib/ui.js';
import { rule } from '../lib/data.js';
import { todayTaipei, entryOn } from '../format.js';

const ITEMS = [
  ['certificate', '非自願離職證明', '勞工領失業給付要用'],
  ['notice', '預告（或預告工資）', '依年資 10／20／30 日'],
  ['severance', '資遣費', '新制每年 0.5 個月，最高 6 個月'],
  ['report', '資遣通報', '離職 10 日前通報主管機關'],
];
const MARK = {
  yes: ['info', '要'],
  no: ['none', '不用'],
  conditional: ['warn', '看情況'],
};

export async function render(root, params, ctx) {
  const r = await rule('separation-obligations');
  const entry = entryOn(r.entries, todayTaipei());
  const pick = field({ label: '離職的情況', type: 'select', value: entry.scenarios[0].id, options: entry.scenarios.map((s) => [s.id, s.title]) });
  const out = h('div', { class: 'result', 'aria-live': 'polite' });

  function update() {
    const s = entry.scenarios.find((x) => x.id === pick.input.value);
    out.replaceChildren(
      h('div', { class: 'obligations' }, ITEMS.map(([key, name, sub]) => {
        const [level, word] = MARK[s[key]];
        return h('div', { class: `obligation obligation--${level}` }, h('b', {}, `${word}：${name}`), h('span', { class: 'small muted' }, sub));
      })),
      h('ul', { class: 'notes' }, s.notes.map((n) => h('li', {}, n))),
      basis(...s.basis.map(([pcode, no, label]) => lawLink(pcode, no, label))),
    );
  }

  pick.input.addEventListener('input', update);
  root.append(
    pageHead('離職時的四件事', '非自願離職證明、預告、資遣費、資遣通報分屬三部法律，要分開判斷；開了證明不等於要付資遣費。'),
    h('section', { class: 'panel form-grid' }, pick.el, out),
    h('p', { class: 'small' }, '相關試算：', h('a', { href: '#/calc/severance' }, '資遣費'), '、', h('a', { href: '#/calc/notice-period' }, '預告期間'), '、', h('a', { href: '#/calc/annual-leave' }, '未休特休折發')),
    ctx.role() === 'employer'
      ? alertBox('info', '雇主要注意', '不要要求勞工簽「自願離職」來規避資遣費；勞工事後仍可主張，主管機關也會調查。')
      : alertBox('info', '勞工可以留意', '公司要你簽「自願離職」前，先確認離職原因；被資遣時可以要求開立非自願離職證明。'),
    disclaimer(),
  );
  update();
}
