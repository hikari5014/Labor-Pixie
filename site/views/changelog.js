import { h, pageHead } from '../lib/ui.js';
import { rocDate } from '../format.js';

export async function render(root, params, ctx) {
  const res = await fetch('changelog.json');
  const log = await res.json();
  root.append(
    pageHead('本版紀錄', '每一個版本改了什麼。最上面是最新版。'),
    ...log.map((v) => h('details', { class: 'panel release', open: v.version === ctx.version ? true : null },
      h('summary', {},
        h('b', {}, `v${v.version}`), ` ${rocDate(v.date)}　${v.title}`,
        v.version === ctx.version && h('span', { class: 'pill pill--info' }, '目前版本')),
      h('h3', { class: 'release__head' }, '你會看到的變化'),
      h('ul', {}, v.changes.map((c) => h('li', {}, c))),
      v.technical && v.technical.length && h('details', { class: 'release__tech' },
        h('summary', {}, '技術變更'),
        h('ul', {}, v.technical.map((c) => h('li', {}, c)))))),
  );
}
