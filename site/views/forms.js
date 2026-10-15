import { h, pageHead } from '../lib/ui.js';
import { getJSON, meta } from '../lib/data.js';

export async function render(root) {
  const m = await meta();
  const forms = await Promise.all(m.files.filter((f) => f.startsWith('forms/')).map((f) => getJSON(`data/${f}`)));
  root.append(
    pageHead('表單範本', '填入公司與員工資料，預覽後直接列印。填的內容不會存檔，也不會上傳。'),
    h('div', { class: 'list' }, forms.map((f) => h('a', { class: 'list-item', href: `#/forms/${f.id}` }, h('b', {}, f.title), h('span', { class: 'muted small' }, f.purpose)))),
    h('p', { class: 'small muted' }, '範本是參考格式，請依公司實際情況調整；重要文件建議請律師或勞動主管機關確認。'),
  );
}
