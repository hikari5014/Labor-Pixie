import { h, pageHead, field, num, alertBox, resultRow, formula, lawLink, basis, disclaimer } from '../lib/ui.js';
import { rocDate, money, isDate, yearsMonths } from '../format.js';
import { oldPension } from '../calc/pension.js';

export async function render(root) {
  const from = field({ label: '舊制年資起算日（到職日）', type: 'date' });
  const to = field({ label: '舊制年資結束日', type: 'date', value: '2005-06-30', hint: '選新制的人是 2005/6/30；選擇繼續適用舊制的人填退休日' });
  const avg = field({ label: '退休時的月平均工資', unit: '元', min: 0 });
  const dis = field({ label: '因執行職務致身心障礙而被強制退休（加給 20%）', type: 'checkbox' });
  const out = h('div', { class: 'result', 'aria-live': 'polite' });

  function update() {
    out.replaceChildren();
    if (!isDate(from.input.value) || !isDate(to.input.value)) { out.append(alertBox('info', '請填年資起訖日')); return; }
    if (to.input.value < from.input.value) { out.append(alertBox('crit', '結束日早於起算日')); return; }
    const res = oldPension({ from: from.input.value, to: to.input.value, avgWage: num(avg.input) || 0, disabilityOnDuty: dis.input.checked });
    out.append(resultRow('舊制年資', `${yearsMonths(res.months)}${res.days ? ` ${res.days} 日` : ''}`), resultRow('計算用年資', `${res.years} 年`),
      resultRow('退休金基數', `${res.bases} 個`, true));
    if (res.capped) out.append(alertBox('info', '已達最高 45 個基數'));
    if (from.input.value < '1984-08-01') out.append(alertBox('warn', '年資起算日早於 73/8/1', '勞基法自 73/8/1 起施行（各行業適用日不同）。適用勞基法以前的年資，依當時的法令或公司規定另計，本工具沒有處理，請用勞動部的舊制退休金試算表核對。'));
    if (num(avg.input) > 0) out.append(resultRow('舊制退休金', `${money(res.amount)} 元`, true));
    out.append(alertBox('info', '要在退休之日起 30 日內給付', '無法一次發給時，要報經主管機關核定才能分期。'),
      formula([
        `年資 ${rocDate(from.input.value)}～${rocDate(to.input.value)}（兩天都算）。未滿半年以半年計，滿半年以一年計。`,
        '前 15 年每滿 1 年 2 個基數，超過 15 年的部分每滿 1 年 1 個基數，最高 45 個基數。',
        '1 個基數＝核准退休時的 1 個月平均工資。',
        '勞基法施行前的年資，依當時適用的法令或公司規定計算；這裡沒有處理。',
      ]));
  }

  [from, to, avg].forEach((f) => f.input.addEventListener('input', update));
  dis.input.addEventListener('change', update);
  root.append(
    pageHead('舊制退休金基數', '2005/7/1 以前的勞基法年資（或選擇繼續適用舊制者）的退休金。'),
    h('div', { class: 'calc' },
      h('section', { class: 'panel form-grid' }, from.el, to.el, avg.el, dis.el),
      h('section', { class: 'panel' }, h('h2', { class: 'section-title' }, '結果'), out)),
    alertBox('info', '新制（勞退）', '2005/7/1 起適用新制的年資，由雇主每月提繳至少 6% 到勞工的個人專戶，退休金從專戶領取，不用這個方式計算。'),
    basis(lawLink('N0030001', '55', '勞動基準法第 55 條'), lawLink('N0030001', '53', '第 53 條'), lawLink('N0030001', '54', '第 54 條'), lawLink('N0030020', '11', '勞退條例第 11 條')),
    disclaimer(),
  );
  update();
}
