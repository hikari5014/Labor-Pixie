import { h, pageHead, field, num, alertBox, resultRow, formula, basis, disclaimer } from '../lib/ui.js';
import { allRules } from '../lib/data.js';
import { money, todayTaipei, ruleOn, rocDate } from '../format.js';
import { employmentCost } from '../calc/employment-cost.js';

const pct = (x) => `${Math.round(x * 10000) / 100}%`;

export async function render(root, params, ctx) {
  const rules = await allRules();
  const r = ruleOn(rules, 'social-insurance', todayTaipei());
  const salary = field({ label: '每月薪資總額', unit: '元', min: 0, hint: '本薪＋每月固定的津貼、獎金（經常性給與）' });
  const occ = field({ label: '職災保險費率（選填）', unit: '%', min: 0, step: 0.01, hint: `依勞保局行業別費率表；沒填以各行業平均 ${pct(r.occupational_insurance.average_rate)} 示範` });
  const pension = field({ label: '雇主勞退提繳率（選填）', unit: '%', min: 6, step: 0.5, hint: '至少 6%' });
  const deps = field({ label: '員工健保眷屬人數（選填）', unit: '人', min: 0, value: '0', hint: '只影響員工自付；超過 3 人以 3 人計' });
  const vol = field({ label: '員工自願提繳勞退（選填）', unit: '%', min: 0, step: 1, value: '0', hint: '0～6%' });
  const outEr = h('div', { class: 'result', 'aria-live': 'polite' });
  const outEe = h('div', { class: 'result', 'aria-live': 'polite' });

  function update() {
    outEr.replaceChildren(); outEe.replaceChildren();
    const s = num(salary.input);
    if (!(s > 0)) { outEr.append(alertBox('info', '請填每月薪資總額')); return; }
    const res = employmentCost({ salary: s, occupationalRate: (num(occ.input) || 0) / 100, pensionRate: (num(pension.input) || 0) / 100,
      dependents: num(deps.input) || 0, voluntaryRate: (num(vol.input) || 0) / 100 }, rules);
    const e = res.employer;
    outEr.append(
      resultRow(`勞保（級距 ${money(res.grades.labor)}）`, `${money(e.labor)} 元`),
      resultRow('就業保險', `${money(e.employment)} 元`),
      resultRow(`職災保險（級距 ${money(res.grades.occupational)}，費率 ${pct(res.occRate)}）`, `${money(e.occupational)} 元`),
      resultRow(`健保（級距 ${money(res.grades.health)}，含平均眷口）`, `${money(e.health)} 元`),
      resultRow(`勞退（提繳工資 ${money(res.grades.pension)} × ${pct(res.pensionRate)}）`, `${money(e.pension)} 元`),
      resultRow('積欠工資墊償基金', `${money(e.arrears)} 元`),
      resultRow('雇主每月另外負擔', `${money(res.employerTotal)} 元`, true),
      resultRow('每月用人總成本', `${money(res.totalCost)} 元`, true),
      resultRow('約為薪資的', `${pct(res.ratio)}`),
      formula([
        `勞保 ${pct(r.labor_insurance.rate)}、就保 ${pct(r.employment_insurance.rate)}：雇主 ${pct(r.labor_insurance.employer_share)}、員工 ${pct(r.labor_insurance.employee_share)}。`,
        `健保 ${pct(r.health_insurance.rate)}：雇主 ${pct(r.health_insurance.employer_share)} × (1＋平均眷口 ${r.health_insurance.average_dependents})；員工 ${pct(r.health_insurance.employee_share)} × (1＋眷屬人數)。`,
        '職災保險全由雇主負擔；勞退雇主至少提繳 6%；墊償基金依勞保投保薪資計。',
        '投保級距：找不低於薪資的最低一級，超過最高級以最高級計；每一項分別四捨五入到元（和勞保局、健保署的算法相同）。',
        `級距與費率：${rocDate(r.effective_from)} 起適用。`,
      ]),
    );
    const w = res.employee;
    outEe.append(
      resultRow('勞保', `${money(w.labor)} 元`), resultRow('就業保險', `${money(w.employment)} 元`),
      resultRow('健保', `${money(w.health)} 元`), resultRow('勞退自願提繳', `${money(w.pension)} 元`),
      resultRow('員工每月自付合計', `${money(res.employeeTotal)} 元`, true),
      resultRow('扣完保費後（未扣所得稅）', `${money(res.takeHome)} 元`),
    );
  }

  [salary, occ, pension, deps, vol].forEach((f) => f.input.addEventListener('input', update));
  root.append(
    pageHead('用人總成本', '月薪之外，公司每月還要負擔勞保、就保、職災保險、健保、勞退與墊償基金；同時算出員工自付的保費。'),
    h('div', { class: 'calc' },
      h('section', { class: 'panel form-grid' }, salary.el, occ.el, pension.el, deps.el, vol.el),
      h('section', { class: 'panel' }, h('h2', { class: 'section-title' }, '雇主負擔'), outEr)),
    h('section', { class: 'panel' }, h('h2', { class: 'section-title' }, '員工自付'), outEe),
    ctx.role() === 'employer'
      ? alertBox('info', '雇主要注意', '投保薪資要依實際薪資總額申報（含固定津貼與經常性獎金），以多報少會被處罰，也會影響員工的給付。')
      : alertBox('info', '勞工可以留意', '可以用勞保局 e 化服務或 APP 查自己的投保薪資；投保薪資比實際薪資低，會影響失業、職災、老年給付。'),
    basis(
      h('a', { href: 'https://www.bli.gov.tw/0005475.html', target: '_blank', rel: 'noopener' }, '勞保局投保薪資分級表'), '、',
      h('a', { href: 'https://www.nhi.gov.tw/ch/cp-19418-9eefb-2576-1.html', target: '_blank', rel: 'noopener' }, '健保署保險費負擔金額表'), '、',
      h('a', { href: 'https://www.bli.gov.tw/0013083.html', target: '_blank', rel: 'noopener' }, '勞工退休金月提繳分級表')),
    disclaimer(),
  );
  update();
}
