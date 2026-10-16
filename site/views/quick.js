import { h, pageHead, lawLink } from '../lib/ui.js';
import { rule } from '../lib/data.js';
import { rocDate, money, todayTaipei, entryOn, nextEntry } from '../format.js';

function table(rows) {
  return h('div', { class: 'table-wrap' }, h('table', { class: 'table' }, h('tbody', {}, rows.map(([a, b, c]) => h('tr', {}, h('th', {}, a), h('td', {}, b), h('td', { class: 'small' }, c || ''))))));
}

export async function render(root) {
  const today = todayTaipei();
  const [wage, holidays, keys, marriage, cal] = await Promise.all([rule('minimum-wage'), rule('national-holidays'), rule('key-numbers'), rule('marriage-leave'), rule('holiday-calendar')]);
  const thisYear = cal.entries.find((e) => String(e.year) === today.slice(0, 4));
  const WEEK = '日一二三四五六';
  const w = entryOn(wage.entries, today);
  const nw = nextEntry(wage.entries, today);
  const hol = entryOn(holidays.entries, today);
  const mar = entryOn(marriage.entries, today);
  const items = entryOn(keys.entries, today).items;
  const groups = [...new Set(items.map((x) => x.group))];
  root.append(...[
    pageHead('速查表', `常用數字與法條，依 ${rocDate(today)} 有效的規定。`),
    h('section', { class: 'panel' }, h('h2', { class: 'section-title' }, '最低工資'),
      table([
        [`${rocDate(w.effective_from)} 起`, `月薪 ${money(w.monthly)} 元／時薪 ${money(w.hourly)} 元`, lawLink('N0030028', '5', '最低工資法第 5 條')],
        ...(nw ? [[`${rocDate(nw.effective_from)} 起`, `月薪 ${money(nw.monthly)} 元／時薪 ${money(nw.hourly)} 元`, nw.status === 'pending' ? '尚未正式核定' : '已公告']] : []),
      ])),
    ...groups.map((g) => h('section', { class: 'panel' }, h('h2', { class: 'section-title' }, g),
      table(items.filter((x) => x.group === g).map((x) => [x.label, x.value, lawLink(...x.basis)])))),
    h('section', { class: 'panel' }, h('h2', { class: 'section-title' }, `國定假日（${hol.count} 日）`),
      h('div', { class: 'chips' }, hol.days.map((d) => h('span', { class: 'chip' }, `${d.name}　${d.date}`))),
      h('p', { class: 'small muted' }, hol.days.length ? '遇到例假或休息日要補假。原住民族歲時祭儀另依原住民族委員會公告。' : ''),
      lawLink('D0020095', '4', '紀念日及節日實施條例')),
    thisYear ? h('section', { class: 'panel' }, h('h2', { class: 'section-title' }, `${Number(today.slice(0, 4)) - 1911} 年週一到週五的國定假日與補假`),
      table(thisYear.days.map((d) => [rocDate(d.date), `星期${WEEK[new Date(Date.parse(d.date)).getUTCDay()]}`, d.name])),
      h('p', { class: 'small muted' }, '依人事行政總處辦公日曆表；勞工的補假日期可由勞雇雙方協商。')) : null,
    h('section', { class: 'panel' }, h('h2', { class: 'section-title' }, '其他假別'),
      table([['婚假', `${mar.days} 日，工資照給（${rocDate(mar.effective_from)} 起）`, lawLink('N0030006', '2', '勞工請假規則第 2 條')]])),
  ].filter(Boolean));
}
