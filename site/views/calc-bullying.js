import { h, pageHead, field, alertBox, resultRow, lawLink, basis, disclaimer } from '../lib/ui.js';
import { rocDate, isDate, todayTaipei } from '../format.js';
import { authorityDeadline, internalTimeline } from '../calc/bullying.js';

export async function render(root) {
  const received = field({ label: '公司收到申訴的日期', type: 'date', value: todayTaipei() });
  const ended = field({ label: '霸凌行為終了日', type: 'date' });
  const left = field({ label: '離職日（還在職就空白）', type: 'date' });
  const outA = h('div', { class: 'result', 'aria-live': 'polite' });
  const outB = h('div', { class: 'result', 'aria-live': 'polite' });

  function update() {
    outA.replaceChildren(); outB.replaceChildren();
    if (isDate(received.input.value)) {
      const t = internalTimeline(received.input.value);
      outA.append(resultRow('完成受理審查', rocDate(t.accept)), resultRow('成立調查小組', rocDate(t.team)),
        resultRow('完成調查報告（必要時可延 1 個月）', `${rocDate(t.report)}（延長至 ${rocDate(t.reportExtended)}）`),
        resultRow('作成決定', rocDate(t.decision)),
        h('p', { class: 'small muted' }, '之後：決定後 10 個工作日內書面通知；申訴人可在收到通知翌日起 30 日內申復一次。工作日只跳過週六日，遇國定假日請自行順延。'),
        h('section', { class: 'panel practice' }, h('b', {}, h('span', { class: 'pill pill--warn' }, '實務見解，非法定結論')),
          h('p', { class: 'small' }, '以上時程以企業依《職場霸凌防治措施準則》訂定的常見規範為範例，各公司的規範可能不同，請以公司公開揭示的規範為準。')));
    }
    if (isDate(ended.input.value)) {
      const d = authorityDeadline({ endedOn: ended.input.value, leftOn: isDate(left.input.value) ? left.input.value : null });
      outB.append(resultRow('行為終了起 3 年', rocDate(d.threeYears)));
      if (d.afterLeaving) outB.append(resultRow('離職後 1 年', rocDate(d.afterLeaving)));
      outB.append(resultRow('最晚申訴日', rocDate(d.deadline), true));
    } else outB.append(alertBox('info', '請填行為終了日'));
  }

  [received, ended, left].forEach((f) => f.input.addEventListener('input', update));
  root.append(
    pageHead('職場霸凌申訴期限', '公司內部處理的時程，以及被申訴人是最高負責人時向主管機關申訴的期限。'),
    h('div', { class: 'calc' },
      h('section', { class: 'panel form-grid' }, h('h2', { class: 'section-title' }, '① 公司內部處理'), received.el),
      h('section', { class: 'panel' }, h('h2', { class: 'section-title' }, '時程（範例）'), outA)),
    h('div', { class: 'calc' },
      h('section', { class: 'panel form-grid' }, h('h2', { class: 'section-title' }, '② 向地方主管機關申訴'), ended.el, left.el,
        h('p', { class: 'small muted' }, '被申訴人是最高負責人時，可以直接向地方主管機關申訴。')),
      h('section', { class: 'panel' }, h('h2', { class: 'section-title' }, '期限'), outB)),
    basis(lawLink('N0060001', '22-3', '職業安全衛生法第 22-3 條'), lawLink('N0060001', '22-2', '第 22-2 條')),
    disclaimer(),
  );
  update();
}
