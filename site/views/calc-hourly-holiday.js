import { h, pageHead, field, num, alertBox, resultRow, formula, lawLink, basis, disclaimer } from '../lib/ui.js';
import { allRules } from '../lib/data.js';
import { money } from '../format.js';
import { hourlyHoliday } from '../calc/hourly-holiday.js';

export async function render(root) {
  const rules = await allRules();
  const wage = field({ label: '時薪', unit: '元', min: 0, value: '196' });
  const daily = field({ label: '約定每日工時', unit: '小時', min: 0, step: 0.5, value: '8' });
  const scheduled = field({ label: '國定假日當天，原本是約定要上班的日子', type: 'checkbox', value: true });
  const worked = field({ label: '當天實際上班時數（沒上班填 0）', unit: '小時', min: 0, step: 0.5, value: '0' });
  const out = h('div', { class: 'result', 'aria-live': 'polite' });

  function update() {
    out.replaceChildren();
    const input = { hourlyWage: num(wage.input), dailyHours: num(daily.input), scheduled: scheduled.input.checked, workedHours: num(worked.input) || 0 };
    if (!(input.hourlyWage > 0) || !(input.dailyHours > 0)) { out.append(alertBox('info', '請填時薪與每日工時')); return; }
    const res = hourlyHoliday(input, rules);
    out.append(resultRow('當天應給工資', `${money(res.pay)} 元`, true));
    const msg = {
      'paid-off': ['good', '放假，工資照給', '原約定上班日遇國定假日，應放假並照給約定工時的工資。'],
      double: ['info', '出勤工資加倍', '以日計：上不到約定工時也給整日的兩倍；超過約定工時的部分另計。'],
      none: ['good', '不用給', '當天原本不是約定上班日，沒有給假給薪的問題。'],
      'double-unscheduled': ['info', '給平日工資的兩倍', '原本不是約定上班日，雇主要求出勤時，依平日工資兩倍給付。'],
    }[res.basis];
    out.append(alertBox(...msg), formula([
      '國定假日要不要給薪，看當天是否原本約定要上班。',
      '原約定上班日：放假工資照給；出勤時再加給一倍（以日計）。',
      '不是約定上班日：要求出勤時，給平日工資的兩倍。',
      '金額無條件進位到元。',
    ]));
  }

  [wage, daily, worked].forEach((f) => f.input.addEventListener('input', update));
  scheduled.input.addEventListener('change', update);
  root.append(
    pageHead('時薪人員國定假日', '部分工時、時薪制的人遇到國定假日，工資怎麼給。'),
    h('div', { class: 'calc' },
      h('section', { class: 'panel form-grid' }, wage.el, daily.el, scheduled.el, worked.el),
      h('section', { class: 'panel' }, h('h2', { class: 'section-title' }, '結果'), out)),
    alertBox('warn', '國定假日遇到休息日或例假時，時薪人員要不要補假？', '官方資料沒有明確說明，請依實際排班向當地勞工局確認。'),
    basis(lawLink('N0030001', '37', '勞動基準法第 37 條'), lawLink('N0030001', '39', '第 39 條'), h('a', { href: 'https://www.mol.gov.tw/1607/1632/1640/15356/', target: '_blank', rel: 'noopener' }, '勞動部〈國定假日應依法給假給薪〉')),
    disclaimer(),
  );
  update();
}
