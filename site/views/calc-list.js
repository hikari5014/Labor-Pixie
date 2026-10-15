import { h, pageHead } from '../lib/ui.js';
import { CALCULATORS } from '../calc/registry.js';

export function render(root) {
  root.append(
    pageHead('算金額與檢查', '輸入一改，結果馬上更新；每個結果都能展開看怎麼算、依據哪一條。'),
    h('div', { class: 'list' }, CALCULATORS.map((c) => h('a', { class: 'list-item', href: `#/calc/${c.id}` },
      h('b', {}, c.title), h('span', { class: 'muted small' }, c.summary)))),
  );
}
