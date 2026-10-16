import { h, pageHead, field, num, alertBox, resultRow, formula, lawLink, basis, disclaimer } from '../lib/ui.js';
import { allRules } from '../lib/data.js';
import { money, todayTaipei, ruleOn } from '../format.js';
import { disabilityCompensation } from '../calc/injury-disability.js';

export async function render(root, params, ctx) {
  const rules = await allRules();
  const r = ruleOn(rules, 'injury-compensation', todayTaipei());
  const grade = field({ label: '失能等級（醫院診斷、勞保局核定）', type: 'select', value: '10',
    options: r.disability_days.map((d, i) => [String(i + 1), `第 ${i + 1} 等級（${money(d)} 日）`]) });
  const wage = field({ label: '月平均工資', unit: '元', min: 0, hint: '事故前 6 個月工資總額 ÷ 日數 × 30，可用「平均工資」試算器算' });
  const insured = field({ label: '公司已依法投保並繳保費，勞保局核定為職業災害', type: 'checkbox' });
  const salary = field({ label: '平均月投保薪資', unit: '元', min: 0 });
  insured.input.checked = true;
  const out = h('div', { class: 'result', 'aria-live': 'polite' });

  function update() {
    out.replaceChildren();
    salary.el.hidden = !insured.input.checked;
    const w = num(wage.input);
    if (!(w > 0)) { out.append(alertBox('info', '請填月平均工資')); return; }
    if (insured.input.checked && !(num(salary.input) > 0)) { out.append(alertBox('info', '請填平均月投保薪資')); return; }
    const res = disabilityCompensation({ date: todayTaipei(), grade: Number(grade.input.value), averageWage: w, insuredSalary: num(salary.input) || 0, insured: insured.input.checked }, rules);
    out.append(
      resultRow('給付日數', `${money(res.days)} 日`),
      resultRow('雇主要付的失能補償', `${money(res.employer)} 元`, true),
    );
    if (insured.input.checked) {
      out.append(
        res.employer > 0
          ? alertBox('warn', '投保薪資低於平均工資', `雇主要就差額補足。沒有投保時，雇主要付全額 ${money(res.employerFull)} 元。`)
          : alertBox('good', '保險給付已涵蓋', '投保薪資不低於平均工資，雇主不用另外補償。'),
        h('h3', { class: 'section-title' }, '職災保險失能給付（推估）'),
        resultRow(`失能一次金（${money(res.days)} 日）`, `${money(res.insLump)} 元`),
        h('p', { class: 'small muted' }, `符合失能年金條件的，可改領年金：完全失能每月 ${money(res.annuity.complete)} 元、嚴重失能 ${money(res.annuity.severe)} 元、部分失能 ${money(res.annuity.partial)} 元（需經個別化專業評估）。`),
      );
    } else {
      out.append(alertBox('crit', '公司沒有依法投保', '雇主要以全額平均工資計算補償。勞保局仍會先發保險給付給勞工，再以行政處分向公司追繳；公司繳納後可以抵充勞基法的補償，另有罰鍰。'));
    }
    out.append(
      h('section', { class: 'panel practice' }, h('b', {}, h('span', { class: 'pill pill--warn' }, '實務見解，非法定結論')),
        h('p', { class: 'small' }, `也有資料直接用勞保普通失能的日數（本等級 ${money(res.baseDays)} 日）計算雇主補償，金額是 ${money(res.employerBaseDays)} 元，約為上面的三分之二。本工具依勞基法第 59 條第 3 款「依勞工保險條例有關之規定」，採職業傷害增給 50% 的日數；有爭議時以法院或主管機關認定為準。`)),
      formula([
        `雇主：平均工資 ÷ ${r.employer_daily_divisor} × 失能等級日數，無條件進位。`,
        `職災失能日數：第 1 等級 ${money(r.disability_days[0])} 日～第 15 等級 ${r.disability_days[14]} 日，等於勞保普通失能日數增給 50%（勞工保險條例第 54 條）。`,
        '公司已依法投保並經核定為職災時，雇主只就「平均工資－平均投保薪資」的差額，依同樣日數補足。',
        `保險失能一次金：平均月投保薪資 ÷ ${r.insured_daily_divisor} × 等級日數；實際金額以勞保局核定為準。`,
        '符合兩項以上失能項目時，可能升等級核定；身體原本已有失能的，按加重的部分計算。',
      ]),
    );
  }

  [wage, salary].forEach((f) => f.input.addEventListener('input', update));
  [grade, insured].forEach((f) => f.input.addEventListener('change', update));
  root.append(
    pageHead('職災失能補償', '職災治療終止後留下失能時，雇主要補多少、保險給付多少。'),
    h('div', { class: 'calc' },
      h('section', { class: 'panel form-grid' }, grade.el, wage.el, insured.el, salary.el),
      h('section', { class: 'panel' }, h('h2', { class: 'section-title' }, '結果'), out)),
    ctx.role() === 'employer'
      ? alertBox('info', '雇主要注意', '投保薪資照實際薪資申報，差額才不會落在公司身上。勞工還沒領到保險給付前，雇主原則上要先全額補償，保險給付發下來後再抵充。')
      : alertBox('info', '勞工可以留意', '失能等級由醫院診斷、勞保局核定；雇主補償和保險給付可以都請領。雇主有過失時，還可以另外請求損害賠償。'),
    basis(lawLink('N0030001', '59', '勞動基準法第 59 條'), lawLink('N0030002', '34-1', '施行細則第 34-1 條'), lawLink('N0050031', '43', '職災保險法第 43 條'), lawLink('N0050031', '90', '第 90 條'), lawLink('N0050031', '36', '第 36 條')),
    disclaimer(),
  );
  update();
}
