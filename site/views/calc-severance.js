import { h, pageHead, field, num, alertBox, resultRow, formula, lawLink, basis, disclaimer } from '../lib/ui.js';
import { rocDate, money, todayTaipei, isDate, yearsMonths } from '../format.js';
import { severance, NEW_SYSTEM_START } from '../calc/severance.js';

function part(label, p, unit) {
  return resultRow(`${label}（${rocDate(p.from)}～${rocDate(p.to)}，${yearsMonths(p.months)}${p.days ? ` ${p.days} 日` : ''}）`, `${p.base.toFixed(4)} ${unit}`);
}

export async function render(root, params, ctx) {
  const hire = field({ label: '到職日', type: 'date' });
  const end = field({ label: '最後工作日（契約終止日）', type: 'date', value: todayTaipei() });
  const avg = field({ label: '月平均工資', unit: '元', min: 0, hint: '不知道的話先用「平均工資」試算器算' });
  const keepOld = field({ label: '2005/7/1 前到職，且當時選擇「繼續適用舊制」', type: 'checkbox' });
  const birth = field({ label: '出生日期（選填）', type: 'date', hint: '有舊制年資時，用來判斷是否已符合退休條件' });
  const out = h('div', { class: 'result', 'aria-live': 'polite' });

  function update() {
    out.replaceChildren();
    const input = { hireDate: hire.input.value, endDate: end.input.value, avgWage: num(avg.input), keepOld: keepOld.input.checked, birthDate: isDate(birth.input.value) ? birth.input.value : undefined };
    if (!isDate(input.hireDate) || !isDate(input.endDate)) { out.append(alertBox('info', '請填到職日與最後工作日')); return; }
    if (input.endDate < input.hireDate) { out.append(alertBox('crit', '最後工作日早於到職日')); return; }
    if (input.keepOld && input.hireDate >= NEW_SYSTEM_START) { out.append(alertBox('warn', '2005/7/1 以後到職的人只能適用新制', '請取消勾選。')); return; }
    if (!(input.avgWage > 0)) { out.append(alertBox('info', '請填月平均工資')); return; }
    const res = severance(input);
    if (res.oldPart) out.append(part('舊制年資', res.oldPart, '個月'));
    if (res.newPart) out.append(part('新制年資', res.newPart, '個月'));
    out.append(resultRow('資遣費基數合計', `${res.base.toFixed(4)} 個月`), resultRow('資遣費', `${money(res.amount)} 元`, true));
    if (res.newPart && res.newPart.capped) out.append(alertBox('info', '新制已到上限', '新制資遣費最多 6 個月平均工資。'));
    if (res.retirementEligible) {
      out.append(alertBox('warn', '已符合自請退休條件：舊制年資應改給退休金', '工作 25 年以上、或 15 年以上滿 55 歲、或 10 年以上滿 60 歲時，舊制年資的部分要依勞基法第 55 條計給退休金（通常比資遣費多），請改用「舊制退休金基數」試算；新制年資的資遣費照上面計算。'),
        h('p', { class: 'small' }, h('a', { href: '#/calc/old-pension' }, '改算舊制退休金 →')));
    }
    out.append(
      alertBox('info', '要在契約終止後 30 日內付清', '另外還有預告期間（或預告工資）與未休特休折發，要一起結算。'),
      h('p', { class: 'small' }, h('a', { href: '#/calc/notice-period' }, '接著算預告期間 →')),
      formula([
        '年資從到職日算到最後工作日（兩天都算）。',
        '新制（2005/7/1 起的年資）：每滿 1 年給 0.5 個月；未滿 1 年的部分，日數 ÷ 30 換成月、月 ÷ 12 換成年，再按比例；最多 6 個月。',
        '舊制（2005/6/30 以前的年資，或選擇繼續適用舊制者的全部年資）：每滿 1 年給 1 個月；剩餘月數按比例；未滿 1 個月以 1 個月計。',
        `資遣費＝月平均工資 ${money(input.avgWage)} × 基數 ${res.base.toFixed(4)}，無條件進位到元。`,
      ]),
    );
  }

  [hire, end, avg, birth].forEach((f) => f.input.addEventListener('input', update));
  keepOld.input.addEventListener('change', update);
  root.append(
    pageHead('資遣費（新舊制）', '雇主依法資遣（例：歇業、虧損、業務緊縮、確不能勝任）時要給的錢。'),
    h('div', { class: 'calc' },
      h('section', { class: 'panel form-grid' }, hire.el, end.el, avg.el, keepOld.el, birth.el),
      h('section', { class: 'panel' }, h('h2', { class: 'section-title' }, '結果'), out)),
    ctx.role() === 'employer'
      ? alertBox('info', '雇主要注意', '資遣要符合法定事由，並在離職 10 日前向主管機關通報；「確不能勝任」要先有輔導、調職或訓練與考核紀錄。懲戒解僱（第 12 條）、自請離職、定期契約期滿不用資遣費。')
      : alertBox('info', '勞工可以留意', '被資遣時可以要求資遣費、預告工資與非自願離職證明；試用期間被資遣也有資遣費（按比例）。'),
    basis(lawLink('N0030001', '17', '勞動基準法第 17 條'), lawLink('N0030020', '12', '勞工退休金條例第 12 條'), lawLink('N0030020', '11', '第 11 條'), lawLink('N0030001', '53', '勞動基準法第 53 條')),
    disclaimer(),
  );
  update();
}
