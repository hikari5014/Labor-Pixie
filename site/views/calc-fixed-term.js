import { h, pageHead, field, alertBox, resultRow, formula, lawLink, basis, disclaimer } from '../lib/ui.js';
import { allRules } from '../lib/data.js';
import { isDate, entryOn, todayTaipei } from '../format.js';
import { fixedTermCheck } from '../calc/contracts.js';

export async function render(root, params, ctx) {
  const rules = await allRules();
  const r = rules['fixed-term-contracts'];
  const kinds = entryOn(r.entries, todayTaipei()).kinds;
  const kind = field({ label: '工作性質', type: 'select', value: 'short', options: [...kinds.map((k) => [k.id, `${k.name}工作`]), ['continuous', '繼續性工作（長期需要的職位）']] });
  const aStart = field({ label: '第一份契約開始', type: 'date' });
  const aEnd = field({ label: '第一份契約結束', type: 'date' });
  const bStart = field({ label: '第二份契約開始（選填）', type: 'date' });
  const bEnd = field({ label: '第二份契約結束（選填）', type: 'date' });
  const continued = field({ label: '第一份期滿後勞工繼續上班，公司沒有馬上反對', type: 'checkbox' });
  const out = h('div', { class: 'result', 'aria-live': 'polite' });

  function update() {
    out.replaceChildren();
    if (kind.input.value === 'continuous') {
      out.append(alertBox('crit', '繼續性工作應為不定期契約', '長期需要的職位不能用定期契約；就算簽了，也會被認定為不定期契約，「期滿」不能當作終止理由。65 歲以上的勞工例外，可以用定期契約僱用。'));
      return;
    }
    if (!isDate(aStart.input.value) || !isDate(aEnd.input.value)) { out.append(alertBox('info', '請填第一份契約的起訖日')); return; }
    if (aEnd.input.value < aStart.input.value) { out.append(alertBox('crit', '結束日早於開始日')); return; }
    const hasB = isDate(bStart.input.value) && isDate(bEnd.input.value);
    if (hasB && bStart.input.value <= aEnd.input.value) { out.append(alertBox('crit', '第二份契約要在第一份結束之後')); return; }
    const res = fixedTermCheck({ kind: kind.input.value, a: { start: aStart.input.value, end: aEnd.input.value }, b: hasB ? { start: bStart.input.value, end: bEnd.input.value } : undefined, continued: continued.input.checked }, rules);
    const k = kinds.find((x) => x.id === kind.input.value);
    out.append(resultRow('第一份契約', `${res.daysA} 日`));
    if (hasB) out.append(resultRow('第二份契約', `${res.daysB} 日`), resultRow('前後合計', `${res.totalDays} 日`), resultRow('中間間斷', `${res.gapDays} 日`));
    out.append(res.converted
      ? alertBox('crit', '視為不定期契約', res.reasons.includes('continued') ? '期滿後繼續工作而雇主沒有立刻反對。' : '前後契約合計超過 90 日、中間間斷沒有超過 30 日。之後不能用「期滿」結束，要終止就要符合資遣或其他法定事由。')
      : alertBox('good', '仍是定期契約', k.conversion_applies ? '沒有達到「視為不定期」的條件。' : `${k.name}工作不適用「前後合計超過 90 日視為不定期」的規定。`));
    if (hasB) {
      out.append(res.seniorityMerged
        ? alertBox('warn', '年資要合併計算', '前後契約間隔未滿 3 個月，特休、資遣費等年資要合起來算。')
        : alertBox('good', '年資不合併', '前後契約間隔 3 個月以上。'));
    }
    if (res.overLimit) out.append(alertBox('crit', `${k.name}工作超過 ${k.max_months} 個月`, '超過法定期間，可能被認定不是真正的定期工作。'));
    if (res.needsReport) out.append(alertBox('warn', '特定性工作超過 1 年', '要報請主管機關核備。'));
    out.append(formula([
      '臨時性、短期性工作在 6 個月以內；季節性 9 個月以內；特定性超過 1 年要報主管機關核備。',
      '定期契約屆滿後，勞工繼續工作而雇主不即表示反對，視為不定期契約。',
      '另訂新約時，前後契約工作期間超過 90 日、間斷期間未超過 30 日，視為不定期契約（特定性、季節性不適用）。',
      '前後契約間隔未滿 3 個月，年資合併計算（這和是否變成不定期是兩件事）。',
    ]));
  }

  [kind, aStart, aEnd, bStart, bEnd].forEach((f) => f.input.addEventListener('input', update));
  continued.input.addEventListener('change', update);
  root.append(
    pageHead('定期契約檢查', '「一年一簽」年資不會歸零；切段簽約也可能被視為不定期契約。'),
    h('div', { class: 'calc' },
      h('section', { class: 'panel form-grid' }, kind.el, aStart.el, aEnd.el, bStart.el, bEnd.el, continued.el),
      h('section', { class: 'panel' }, h('h2', { class: 'section-title' }, '結果'), out)),
    ctx.role() === 'employer'
      ? alertBox('info', '雇主要注意', '持續性的職位直接用不定期契約；定期契約只用在臨時、短期、季節、特定四種工作，並寫明是哪一種。')
      : alertBox('info', '勞工可以留意', '如果做的是長期性的工作，即使簽定期契約，期滿被結束時仍可主張資遣費。'),
    basis(lawLink('N0030001', '9', '勞動基準法第 9 條'), lawLink('N0030001', '10', '第 10 條'), lawLink('N0030002', '6', '施行細則第 6 條'), lawLink('N0090055', '28', '中高齡就業法第 28 條')),
    disclaimer(),
  );
  update();
}
