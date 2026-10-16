// 離線版要能在 Chrome 109 執行：不能用 Chrome 109 之後才有的 JS／CSS 功能，也不能引用外部網址。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const site = fileURLToPath(new URL('../site', import.meta.url));
const walk = (dir) => readdirSync(dir).flatMap((n) => {
  const p = join(dir, n);
  if (n === 'data') return [];
  return statSync(p).isDirectory() ? walk(p) : [p];
});
const files = walk(site);

const JS_BANNED = [
  [/\.at\(/, 'Array.prototype.at（Chrome 92 OK，但避免和字串 at 混淆，統一不用）'],
  [/\.findLast(Index)?\(/, 'findLast（Chrome 97）'],
  [/\.to(Sorted|Reversed|Spliced)\(/, 'toSorted 等（Chrome 110）'],
  [/\.with\(\d/, 'Array.prototype.with（Chrome 110）'],
  [/structuredClone\(/, 'structuredClone（Chrome 98，需確認）'],
  [/Object\.groupBy|Map\.groupBy/, 'groupBy（Chrome 117）'],
  [/Promise\.withResolvers/, 'Promise.withResolvers（Chrome 119）'],
  [/\?\?=|\|\|=|&&=/, '邏輯賦值（Chrome 85 OK，但統一不用）'],
];
const CSS_BANNED = [
  [/:has\(/, ':has()（Chrome 105 OK，但部分舊瀏覽器沒有）'],
  [/@container/, '@container（Chrome 105）'],
  [/color-mix\(/, 'color-mix（Chrome 111）'],
  [/subgrid/, 'subgrid（Chrome 117）'],
  [/^\s*&/m, 'CSS 巢狀（Chrome 112）'],
  [/@layer/, '@layer（Chrome 99，需確認）'],
  [/light-dark\(/, 'light-dark（Chrome 123）'],
  [/text-wrap:\s*(balance|pretty)/, 'text-wrap（Chrome 114）'],
];

test('網站程式不用 Chrome 109 不支援的功能', () => {
  for (const f of files) {
    const text = readFileSync(f, 'utf8');
    const banned = f.endsWith('.js') ? JS_BANNED : f.endsWith('.css') ? CSS_BANNED : [];
    for (const [re, why] of banned) assert.ok(!re.test(text), `${f}：${why}`);
  }
});

test('網站不引用外部的程式、樣式或字型', () => {
  for (const f of files.filter((x) => /\.(html|css|js)$/.test(x))) {
    const text = readFileSync(f, 'utf8');
    assert.ok(!/<script[^>]+src=["']https?:/i.test(text), `${f} 引用外部程式`);
    assert.ok(!/<link[^>]+href=["']https?:[^>]+stylesheet|stylesheet[^>]+href=["']https?:/i.test(text), `${f} 引用外部樣式`);
    assert.ok(!/@import\s+url\(["']?https?:|url\(["']?https?:/i.test(text), `${f} 引用外部字型或圖片`);
    assert.ok(!/\bimport\s.*from\s+["']https?:/.test(text), `${f} 從外部載入模組`);
  }
});
