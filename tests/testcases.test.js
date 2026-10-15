// 逐一比對 data/testcases/ 的驗證範例。expected 只列出要檢查的欄位。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { CALC_FUNCTIONS } from './calc-functions.js';

const dir = new URL('../data/testcases/', import.meta.url);
const load = (url) => JSON.parse(readFileSync(url));

function subset(actual, expected, path) {
  if (expected === null || typeof expected !== 'object') {
    if (typeof expected === 'number' && typeof actual === 'number') {
      assert.ok(Math.abs(actual - expected) < 1e-6, `${path}：算出 ${actual}，應為 ${expected}`);
    } else {
      assert.deepEqual(actual, expected, `${path}：算出 ${JSON.stringify(actual)}，應為 ${JSON.stringify(expected)}`);
    }
    return;
  }
  assert.ok(actual && typeof actual === 'object', `${path}：缺少結果`);
  for (const [k, v] of Object.entries(expected)) subset(actual[k], v, `${path}.${k}`);
}

for (const file of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
  const tc = load(new URL(file, dir));
  test(`驗證範例：${tc.title}`, () => {
    const fn = CALC_FUNCTIONS[tc.id];
    assert.ok(fn, `tests/calc-functions.js 沒有登記 ${tc.id}`);
    assert.ok(tc.cases.length >= 10, `${tc.id} 驗證範例少於 10 組`);
    const rule = tc.rule ? load(new URL(`../data/rules/${tc.rule}.json`, import.meta.url)) : null;
    for (const c of tc.cases) subset(fn(c.input, rule), c.expected, c.name);
  });
}
