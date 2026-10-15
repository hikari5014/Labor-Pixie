import { h, pageHead, field, num, alertBox, resultRow, formula, lawLink, basis, disclaimer } from '../lib/ui.js';
import { rocDate, isDate } from '../format.js';
import { probationPlan } from '../calc/contracts.js';

export async function render(root, params, ctx) {
  const hire = field({ label: '到職日', type: 'date' });
  const days = field({ label: '試用期天數', unit: '日', min: 1, value: '90', hint: '常見 45、80、90 日，或依職等 3～6 個月' });
  const out = h('div', { class: 'result', 'aria-live': 'polite' });

  function update() {
    out.replaceChildren();
    const d = num(days.input);
    if (!isDate(hire.input.value) || !(d >= 1)) { out.append(alertBox('info', '請填到職日與試用期天數')); return; }
    const p = probationPlan({ hireDate: hire.input.value, probationDays: Math.round(d) });
    out.append(resultRow('試用期最後一天', rocDate(p.end), true));
    if (p.check1) out.append(resultRow('第一次內部確認（期滿前 20 日）', rocDate(p.check1)));
    if (p.check2) out.append(resultRow('最後決定（期滿前 10 日）', rocDate(p.check2)));
    out.append(resultRow('最後工作日在這天以前終止，不用預告', rocDate(p.lastNoNotice)), resultRow('最後工作日是這天或之後，已滿 3 個月，要預告 10 日', rocDate(p.completesThreeMonths)));
    out.append(p.endsAfterThreeMonths
      ? alertBox('warn', '試用期跨過 3 個月', `試用期滿才終止時已滿 3 個月，最晚要在 ${rocDate(p.noticeBy)} 預告（或給 10 日預告工資）。`)
      : alertBox('good', '試用期在 3 個月內結束', '試用期滿就終止時不用預告；但仍要有不能勝任的考核紀錄，並給按比例的資遣費。'));
    out.append(formula([
      '年資算到最後工作日（兩天都算）。例：1/1 到職、做到 3/31 就已滿 3 個月。',
      '年資滿 3 個月後終止契約，要預告 10 日或給 10 日預告工資。',
      '內部確認時點是建議：提早請主管判斷，留下具體考核紀錄，不要等到最後一天。',
    ]));
  }

  [hire, days].forEach((f) => f.input.addEventListener('input', update));
  root.append(
    pageHead('試用期時程', '試用期可以約定，但除了終止權以外一切照勞基法：要加勞健保、不能低於最低工資，不適任要有考核紀錄。'),
    h('div', { class: 'calc' },
      h('section', { class: 'panel form-grid' }, hire.el, days.el),
      h('section', { class: 'panel' }, h('h2', { class: 'section-title' }, '時程'), out)),
    ctx.role() === 'employer'
      ? alertBox('info', '雇主要注意', '試用不通過也要符合「確不能勝任」等資遣事由，並給資遣費（按比例）；沒有實際考核就說「不適合」，可能被認定為非法資遣。不要要求勞工自請離職。')
      : alertBox('info', '勞工可以留意', '試用期間也要加勞健保、不能低於最低工資；被通知不通過時，可以要求看考核紀錄、資遣費與非自願離職證明。'),
    basis(lawLink('N0030001', '16', '勞動基準法第 16 條'), lawLink('N0030001', '11', '第 11 條'), h('a', { href: 'https://www.mol.gov.tw/1607/28162/28296/81778/81781/82213/', target: '_blank', rel: 'noopener' }, '勞動部〈試用期間終止契約〉')),
    disclaimer(),
  );
  update();
}
