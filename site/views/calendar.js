import { h, pageHead, field, alertBox, lawLink, basis, disclaimer } from '../lib/ui.js';
import { rule } from '../lib/data.js';
import { rocDate, todayTaipei } from '../format.js';
import { yearCalendar, yearRange, WEEKDAY_NAMES } from '../lib/holiday-calendar.js';

const KEY = 'calendar-leave-days';
const KIND_TEXT = { holiday: '國定假日・補假', workday: '補行上班', regular: '例假日', rest: '休息日', work: '工作日' };

function loadDays() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || '{}');
    if (Number.isInteger(v.regular) && Number.isInteger(v.rest) && v.regular !== v.rest) return v;
  } catch (e) { /* 讀不到就用預設 */ }
  return { regular: 0, rest: 6 };
}

function saveDays(v) {
  try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { /* 存不了就只在這次有效 */ }
}

function explain(item) {
  const date = `${rocDate(item.date)}（${WEEKDAY_NAMES[item.weekday]}）`;
  if (item.kind === 'holiday') {
    const isMakeUp = item.name.includes('補假');
    return [date, `${item.name}：${isMakeUp ? '政府公告的補假日，照給工資。民間公司的補假日期可以由勞雇雙方協商，以公司公告為準。' : '國定假日，工資照給；要上班須經勞工同意，工資加倍發給。'}`,
      item.onLeaveDay ? `這天剛好是公司的${item.base === 'regular' ? '例假日' : '休息日'}，依法應另外補假一天。` : ''];
  }
  if (item.kind === 'workday') return [date, `${item.name}：公務機關補行上班日；民間公司不一定要跟著補班，依公司規定與勞雇約定。`];
  if (item.kind === 'regular') return [date, '例假日：除了天災、事變或突發事件，不能叫勞工上班；真的出勤要加倍發給工資，並在事後補假。'];
  if (item.kind === 'rest') return [date, '休息日：上班要經勞工同意，並依休息日的加班費標準計算。'];
  return [date, '工作日'];
}

export async function render(root, params) {
  const cal = await rule('holiday-calendar');
  const thisYear = Number(todayTaipei().slice(0, 4));
  const range = yearRange(cal, thisYear);
  const asked = Number(params.rest);
  const year = Number.isInteger(asked) && asked >= range.min && asked <= range.max ? asked : thisYear;
  const days = loadDays();
  const options = [...WEEKDAY_NAMES].map((n, i) => [String(i), `星期${n}`]);
  const regular = field({ label: '公司的例假日', type: 'select', value: String(days.regular), options });
  const rest = field({ label: '公司的休息日', type: 'select', value: String(days.rest), options });
  const body = h('div', { class: 'yearcal-body' });
  const detail = h('div', { class: 'result yearcal-detail', 'aria-live': 'polite' }, h('p', { class: 'small muted' }, '點月曆上的日期，看這一天的規定。'));
  const go = (y) => { location.hash = `#/calendar/${y}`; };

  function draw() {
    const r = Number(regular.input.value);
    const s = Number(rest.input.value);
    body.replaceChildren();
    if (r === s) { body.append(alertBox('crit', '例假日和休息日不能是同一天')); return; }
    saveDays({ regular: r, rest: s });
    const data = yearCalendar(year, cal, { regular: r, rest: s });
    if (!data.published) {
      body.append(alertBox('info', `${year - 1911} 年的政府行事曆還沒公布`, '人事行政總處通常在每年年中公布隔年的辦公日曆表，公布後這裡會自動更新。目前只顯示例假日與休息日。'));
    }
    const months = h('div', { class: 'yearcal' }, data.months.map((m) => h('section', { class: 'yearcal__month' },
      h('h2', { class: 'yearcal__title' }, `${m.month} 月`),
      h('div', { class: 'yearcal__grid' },
        [...WEEKDAY_NAMES].map((n) => h('span', { class: 'yearcal__head' }, n)),
        Array.from({ length: m.firstWeekday }, () => h('span', {})),
        m.days.map((d) => h('button', {
          type: 'button',
          class: `yearcal__day is-${d.kind}${d.date === todayTaipei() ? ' is-today' : ''}`,
          title: d.name || KIND_TEXT[d.kind],
          'aria-label': `${m.month} 月 ${d.day} 日，${d.name || KIND_TEXT[d.kind]}`,
          onclick: () => detail.replaceChildren(...explain(d).filter(Boolean).map((t, i) => (i ? h('p', {}, t) : h('b', {}, t)))),
        }, String(d.day)))))));
    body.append(
      h('div', { class: 'yearcal-legend' },
        h('span', { class: 'yearcal-key is-holiday' }, '國定假日・補假'),
        h('span', { class: 'yearcal-key is-regular' }, '例假日'),
        h('span', { class: 'yearcal-key is-rest' }, '休息日'),
        data.counts.workday ? h('span', { class: 'yearcal-key is-workday' }, '補行上班（公務機關）') : null),
      months,
      h('p', { class: 'small muted yearcal-print-note' },
        `例假日：星期${WEEKDAY_NAMES[r]}；休息日：星期${WEEKDAY_NAMES[s]}。`,
        data.published ? `國定假日與補假依人事行政總處〈${year - 1911} 年辦公日曆表〉，查證日 ${rocDate(data.entry.checked_on)}。` : ''),
    );
    if (data.published) {
      body.append(h('section', { class: 'panel no-print' },
        h('h2', { class: 'section-title' }, `${year - 1911} 年的國定假日與補假（共 ${data.counts.holiday} 天）`),
        data.counts.holidayOnLeaveDay ? h('p', { class: 'small' }, `其中 ${data.counts.holidayOnLeaveDay} 天落在公司的例假日或休息日，依法要另外補假。`) : null,
        h('div', { class: 'table-wrap' }, h('table', { class: 'table' },
          h('thead', {}, h('tr', {}, h('th', {}, '日期'), h('th', {}, '星期'), h('th', {}, '名稱'), h('th', {}, '說明'))),
          h('tbody', {}, data.holidays.map((d) => h('tr', {},
            h('td', {}, rocDate(d.date)), h('td', {}, WEEKDAY_NAMES[d.weekday]), h('td', {}, d.name),
            h('td', {}, d.kind === 'workday' ? '公務機關補班，民間依公司規定' : d.onLeaveDay ? `落在${d.base === 'regular' ? '例假日' : '休息日'}，應補假` : ''))))))));
    }
  }

  regular.input.addEventListener('change', draw);
  rest.input.addEventListener('change', draw);
  root.append(h('div', { class: 'yearcal-page' },
    pageHead('休假月曆', '一年 12 個月的國定假日、補假、例假日與休息日。政府公布新年度行事曆後自動更新。'),
    h('div', { class: 'yearcal-bar no-print' },
      h('button', { type: 'button', class: 'btn', disabled: year <= range.min, onclick: () => go(year - 1) }, '前一年'),
      h('h2', { class: 'yearcal-bar__title' }, `${year - 1911} 年`, h('span', { class: 'yearcal-bar__ad' }, String(year))),
      h('button', { type: 'button', class: 'btn', disabled: year >= range.max, onclick: () => go(year + 1) }, '後一年')),
    h('h2', { class: 'yearcal-print-title' }, `${year - 1911} 年（${year}）休假年曆`),
    h('section', { class: 'panel form-grid yearcal-settings no-print' }, regular.el, rest.el,
      h('p', { class: 'small muted' }, '例假日、休息日依公司排班約定，可以不是週日、週六；設定只存在這台裝置。'),
      h('button', { type: 'button', class: 'btn btn--primary', onclick: () => window.print() }, '列印年曆')),
    body,
    h('section', { class: 'panel no-print' }, h('h2', { class: 'section-title' }, '這一天'), detail),
    alertBox('info', '補假與調整放假', '國定假日遇到例假日或休息日，勞工應另外補假；補假日期可以由勞雇雙方協商，不一定要跟政府公告同一天。原住民族歲時祭儀等只適用特定勞工的假日，月曆沒有列出。'),
    basis(lawLink('N0030001', '36', '勞動基準法第 36 條'), lawLink('N0030001', '37', '第 37 條'), lawLink('N0030001', '39', '第 39 條'), lawLink('N0030002', '23-1', '施行細則第 23-1 條'), lawLink('D0020095', '8', '紀念日及節日實施條例第 8 條')),
    disclaimer(),
  ));
  draw();
}
