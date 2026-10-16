import { h, pageHead, field, num, alertBox, resultRow, formula, lawLink, basis, disclaimer } from '../lib/ui.js';
import { allRules } from '../lib/data.js';
import { money } from '../format.js';
import { pensionProjection } from '../calc/pension-new.js';

const pct = (x) => `${Math.round(x * 10000) / 100}%`;

export async function render(root) {
  const rules = await allRules();
  const salary = field({ label: '目前月薪', unit: '元', min: 0 });
  const years = field({ label: '距離退休還有幾年', unit: '年', min: 0, step: 0.5, value: '25' });
  const balance = field({ label: '專戶目前累積（選填）', unit: '元', min: 0, hint: '可在勞保局 e 化服務系統或 APP 查詢' });
  const vol = field({ label: '自願提繳比例（選填）', unit: '%', min: 0, step: 1, value: '0', hint: '0～6%，可從當年度綜合所得總額中扣除' });
  const er = field({ label: '雇主提繳比例', unit: '%', min: 6, step: 0.5, value: '6' });
  const ret = field({ label: '假設年收益率', unit: '%', min: 0, step: 0.1, value: '3', hint: '只是假設；實際收益每年不同，有保證收益下限' });
  const growth = field({ label: '假設薪資每年成長（選填）', unit: '%', min: 0, step: 0.5, value: '0' });
  const out = h('div', { class: 'result', 'aria-live': 'polite' });

  function update() {
    out.replaceChildren();
    const s = num(salary.input);
    if (!(s > 0) || !(num(years.input) > 0)) { out.append(alertBox('info', '請填月薪與距離退休的年數')); return; }
    const res = pensionProjection({ salary: s, years: num(years.input), balance: num(balance.input) || 0, voluntaryRate: (num(vol.input) || 0) / 100,
      employerRate: (num(er.input) || 0) / 100, annualReturn: (num(ret.input) || 0) / 100, salaryGrowth: (num(growth.input) || 0) / 100 }, rules);
    out.append(
      resultRow(`目前每月提繳（${money(res.firstGrade)} × ${pct(res.employerRate + res.voluntaryRate)}）`, `${money(res.firstMonthly)} 元`),
      resultRow('期間提繳合計', `${money(res.contributed)} 元`),
      resultRow('推估收益', `${money(res.earnings)} 元`),
      resultRow('退休時專戶推估', `${money(res.balance)} 元`, true),
      alertBox('info', '這是推估，不是保證', '實際金額依每年的勞動基金收益、薪資變化與提繳情形而定；領取時可選一次請領或月退休金（年滿 60 歲、年資滿 15 年以上可請領月退）。'),
      formula([
        '每月提繳＝月提繳工資分級表的級距 ×（雇主提繳率＋自願提繳率）；雇主至少 6%，自願最多 6%。',
        '每月複利：專戶 ×（1＋年收益率 ÷ 12）＋當月提繳；薪資每年調整一次。',
        '專戶的錢屬於勞工個人，換工作也不會歸零。',
      ]),
    );
  }

  [salary, years, balance, vol, er, ret, growth].forEach((f) => f.input.addEventListener('input', update));
  root.append(
    pageHead('勞退新制專戶推估', '2005/7/1 起適用新制的勞工，雇主每月提繳到個人專戶；推估退休時大約累積多少。'),
    h('div', { class: 'calc' },
      h('section', { class: 'panel form-grid' }, salary.el, years.el, balance.el, vol.el, er.el, ret.el, growth.el),
      h('section', { class: 'panel' }, h('h2', { class: 'section-title' }, '結果'), out)),
    basis(lawLink('N0030020', '14', '勞工退休金條例第 14 條'), lawLink('N0030020', '24', '第 24 條'), h('a', { href: 'https://www.bli.gov.tw/0013083.html', target: '_blank', rel: 'noopener' }, '勞工退休金月提繳分級表')),
    disclaimer(),
  );
  update();
}
