// 網站結構檢查：版本號一致、本版紀錄、離線快取清單。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = (p) => readFileSync(join(root, p), 'utf8');
const version = JSON.parse(read('package.json')).version;

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

test('三處版本號一致', () => {
  assert.equal(read('site/app.js').match(/APP_VERSION = '([^']+)'/)[1], version);
  assert.equal(read('site/sw.js').match(/VERSION = '([^']+)'/)[1], version);
});

test('本版紀錄：最新一筆是目前版本，由新到舊，欄位齊全', () => {
  const log = JSON.parse(read('site/changelog.json'));
  assert.equal(log[0].version, version, 'changelog.json 第一筆要是目前版本');
  for (let i = 0; i < log.length; i += 1) {
    const v = log[i];
    assert.match(v.date, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(v.title && v.changes.length, `v${v.version} 缺標題或變化`);
    if (i) assert.ok(v.date <= log[i - 1].date, '要由新到舊排列');
  }
  assert.equal(new Set(log.map((v) => v.version)).size, log.length, '版本號不能重複');
});

test('離線快取清單包含網站所有檔案', () => {
  const shell = [...read('site/sw.js').matchAll(/^\s+'([^']+)',$/gm)].map((m) => m[1]);
  const files = walk(join(root, 'site'))
    .map((p) => relative(join(root, 'site'), p).split('\\').join('/'))
    .filter((p) => !p.startsWith('data/') && p !== 'sw.js' && !p.endsWith('.DS_Store'));
  for (const f of files) assert.ok(shell.includes(f), `sw.js 的 SHELL 漏了 ${f}`);
  for (const f of shell) assert.ok(f === './' || files.includes(f), `SHELL 列了不存在的 ${f}`);
});

test('路由對應的畫面檔都存在', () => {
  for (const m of read('site/routes.js').matchAll(/import\('\.\/([^']+)'\)/g)) {
    assert.ok(statSync(join(root, 'site', m[1])).isFile(), m[1]);
  }
});
