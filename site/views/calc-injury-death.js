import { h, pageHead, field, num, alertBox, resultRow, formula, lawLink, basis, disclaimer } from '../lib/ui.js';
import { allRules } from '../lib/data.js';
import { money, todayTaipei } from '../format.js';
import { deathCompensation } from '../calc/injury-death.js';

export async function render(root, params, ctx) {
  const rules = await allRules();
  const wage = field({ label: '月平均工資', unit: '元', min: 0, hint: '事故前 6 個月工資總額 ÷ 日數 × 30，可用「平均工資」試算器算' });
  const insured = field({ label: '公司已依法投保並繳保費，勞保局核定為職業災害', type: 'checkbox' });
  const salary = field({ label: '平均月投保薪資', unit: '元', min: 0 });
  const survivors = field({ label: '有遺屬（配偶、子女、父母、祖父母、孫子女或兄弟姊妹）', type: 'checkbox' });
  insured.input.checked = true;
  survivors.input.checked = true;
  const out = h('div', { class: 'result', 'aria-live': 'polite' });

  function update() {
    out.replaceChildren();
    salary.el.hidden = !insured.input.checked;
    const w = num(wage.input);
    if (!(w > 0)) { out.append(alertBox('info', '請填月平均工資')); return; }
    if (insured.input.checked && !(num(salary.input) > 0)) { out.append(alertBox('info', '請填平均月投保薪資')); return; }
    const res = deathCompensation({ date: todayTaipei(), averageWage: w, insuredSalary: num(salary.input) || 0, insured: insured.input.checked, hasSurvivors: survivors.input.checked }, rules);
    out.append(h('h3', { class: 'section-title' }, '雇主要付'),
      resultRow(`喪葬費（${res.months.funeral} 個月）`, `${money(res.funeral)} 元`));
    if (survivors.input.checked) out.append(resultRow(`死亡補償（${res.months.death} 個月）`, `${money(res.death)} 元`));
    out.append(resultRow('雇主合計', `${money(res.employerTotal)} 元`, true));
    if (insured.input.checked) {
      out.append(
        res.employerTotal > 0
          ? alertBox('warn', '投保薪資低於平均工資', `雇主要就每月差額 ${money(res.basis.toFixed(2))} 元補足。沒有投保時，雇主要付全額 ${money(res.fullWithoutInsurance)} 元。`)
          : alertBox('good', '保險給付已涵蓋', '投保薪資不低於平均工資，雇主不用另外補償。'),
        h('h3', { class: 'section-title' }, '職災保險給付（推估）'),
        resultRow(`喪葬津貼（${res.months.insFuneral} 個月）`, `${money(res.insFuneral)} 元`));
      if (survivors.input.checked) out.append(
        resultRow(`遺屬一次金（${res.months.insLump} 個月）`, `${money(res.insSurvivorLump)} 元`),
        resultRow('或遺屬年金（每月，符合條件時）', `${money(res.insSurvivorAnnuity)} 元`));
    } else {
      out.append(alertBox('crit', '公司沒有依法投保', '雇主要以全額平均工資計算補償。勞保局仍會先發保險給付給遺屬，再以行政處分向公司追繳；公司繳納後可以抵充勞基法的補償，另有罰鍰。'));
    }
    out.append(formula([
      '雇主：喪葬費 5 個月平均工資，加上一次給遺屬 40 個月平均工資的死亡補償。',
      '公司已依法投保、並經保險人核定為職災時，雇主只要就「平均工資－平均投保薪資」的差額，依同樣月數補足。',
      '職災保險：喪葬津貼 5 個月平均月投保薪資（沒有遺屬時 10 個月）；遺屬一次金 40 個月，或符合條件的遺屬可領年金（每月 50%，同順序多 1 人加 10%，最多加 20%）。實際以勞保局核定為準。',
      '遺屬受領順位：配偶及子女、父母、祖父母、孫子女、兄弟姊妹。',
      '雇主付的補償可以抵充同一事故的損害賠償；雇主有過失時，遺屬還可以另外請求賠償。',
    ]));
  }

  [wage, salary].forEach((f) => f.input.addEventListener('input', update));
  [insured, survivors].forEach((f) => f.input.addEventListener('change', update));
  root.append(
    pageHead('職災死亡補償', '員工因職災過世時，雇主要付多少、保險給付多少。'),
    h('div', { class: 'calc' },
      h('section', { class: 'panel form-grid' }, wage.el, insured.el, salary.el, survivors.el),
      h('section', { class: 'panel' }, h('h2', { class: 'section-title' }, '結果'), out)),
    ctx.role() === 'employer'
      ? alertBox('info', '雇主要注意', '投保薪資照實際薪資申報，差額才不會落在公司身上；發生職災死亡要在 8 小時內通報勞動檢查機構。')
      : alertBox('info', '遺屬可以留意', '雇主補償與保險給付是兩件事，都可以請領；請保留死亡證明、事故經過與薪資資料。'),
    basis(lawLink('N0030001', '59', '勞動基準法第 59 條'), lawLink('N0030001', '60', '第 60 條'), lawLink('N0050031', '51', '職災保險法第 51 條'), lawLink('N0050031', '90', '第 90 條'), lawLink('N0050031', '36', '第 36 條'), lawLink('N0060001', '37', '職業安全衛生法第 37 條')),
    disclaimer(),
  );
  update();
}
