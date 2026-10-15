import { h, pageHead, field, num, alertBox, resultRow, formula, lawLink, basis, disclaimer } from '../lib/ui.js';
import { rule } from '../lib/data.js';
import { money, todayTaipei, isDate } from '../format.js';
import { compLeave } from '../calc/comp-leave.js';

const TYPES = [['weekday', '平日延長工時'], ['rest', '休息日出勤']];

export async function render(root, params, ctx) {
  const r = await rule('overtime-rates');
  const wage = field({ label: '月薪（含每月固定津貼）', unit: '元', min: 0 });
  const date = field({ label: '計算日', type: 'date', value: todayTaipei() });
  const rows = h('div', { class: 'rows' });
  const out = h('div', { class: 'result', 'aria-live': 'polite' });

  function addRow() {
    const t = field({ label: '加班日別', type: 'select', value: 'weekday', options: TYPES });
    const hr = field({ label: '加班時數', unit: '小時', min: 0, step: 0.5, value: '2' });
    const used = field({ label: '已補休時數', unit: '小時', min: 0, step: 0.5, value: '0' });
    [t, hr, used].forEach((f) => f.input.addEventListener('input', update));
    const row = h('div', { class: 'row-item' }, t.el, hr.el, used.el, h('button', { type: 'button', class: 'btn', onclick: () => { row.remove(); update(); } }, '刪除這一筆'));
    row.read = () => ({ type: t.input.value, hours: num(hr.input) || 0, used: num(used.input) || 0 });
    rows.append(row);
    update();
  }

  function update() {
    out.replaceChildren();
    const w = num(wage.input);
    if (!(w > 0) || !isDate(date.input.value)) { out.append(alertBox('info', '請填月薪')); return; }
    const res = compLeave({ date: date.input.value, monthlyWage: w, days: [...rows.children].map((x) => x.read()) }, r);
    out.append(resultRow('可補休時數合計', `${res.compHours} 小時`), resultRow('還沒補休的時數', `${res.unusedHours} 小時`),
      resultRow('到期或離職沒休完要折發', `${money(res.payout)} 元`, true),
      formula([
        '補休時數依加班的時數 1:1 計算（加班 3 小時就補休 3 小時）。',
        '補休期限由勞雇雙方協商；期限到了或離職時還沒休完，要依加班當天的加班費標準發給工資，沒有發給就算違反加班費規定。',
        '只補休一部分時，這裡把已補休的算成較早的時數、沒休的算成較晚（倍率較高）的時數。',
        '金額無條件進位到元。',
      ]),
      h('section', { class: 'panel practice' }, h('b', {}, h('span', { class: 'pill pill--warn' }, '實務見解，非法定結論')),
        h('p', { class: 'small' }, '法令沒有規定部分補休時哪幾個小時算已經補休；這裡採對勞工較有利的算法，個案請依雙方約定或主管機關意見。')));
  }

  [wage, date].forEach((f) => f.input.addEventListener('input', update));
  root.append(
    pageHead('加班補休換算與到期折發', '加班可以換補休，但要勞工自己選、雇主同意；到期沒休完要折發工資。'),
    h('div', { class: 'calc' },
      h('section', { class: 'panel form-grid' }, wage.el, date.el, h('h2', { class: 'section-title' }, '加班紀錄'), rows,
        h('button', { type: 'button', class: 'btn', onclick: addRow }, '＋ 新增一筆')),
      h('section', { class: 'panel' }, h('h2', { class: 'section-title' }, '結果'), out)),
    ctx.role() === 'employer'
      ? alertBox('info', '雇主要注意', '補休要依勞工意願選擇，不能強制以補休代替加班費；約定補休期限並留下紀錄。')
      : alertBox('info', '勞工可以留意', '你可以選擇領加班費或換補休；補休到期沒休完，可以請求折發工資。'),
    basis(lawLink('N0030001', '32-1', '勞動基準法第 32-1 條'), lawLink('N0030001', '24', '第 24 條')),
    disclaimer(),
  );
  addRow();
}
