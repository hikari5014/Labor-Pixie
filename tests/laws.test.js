import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { searchArticles, articleKey } from '../site/lib/laws.js';

const lsa = JSON.parse(readFileSync(new URL('../data/laws/labor-standards-act.json', import.meta.url)));

test('條號轉網址用的代號', () => {
  assert.equal(articleKey('第 38 條'), '38');
  assert.equal(articleKey('第 9-1 條'), '9-1');
});

test('搜尋條文：特別休假找到第 38 條', () => {
  const hits = searchArticles([lsa], '特別休假');
  assert.ok(hits.some((x) => x.article.no === '第 38 條'));
});

test('搜尋條文：多個關鍵字要同時出現；空白不回傳', () => {
  const hits = searchArticles([lsa], '休息日 加給');
  assert.ok(hits.length > 0);
  assert.ok(hits.every((x) => x.article.text.includes('休息日') && x.article.text.includes('加給')));
  assert.deepEqual(searchArticles([lsa], '   '), []);
});
