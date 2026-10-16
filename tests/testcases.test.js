// 逐一比對 data/testcases/ 的驗證範例。expected 只列出要檢查的欄位。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { CALC_FUNCTIONS } from './calc-functions.js';

const dir = new URL('../data/testcases/', import.meta.url);
const load = (url) => JSON.parse(readFileSync(url));
const rulesDir = new URL('../data/rules/', import.meta.url);
// 試算器一律收到「所有規則表」{ id: 規則表 }，自己取需要的
const RULES = Object.fromEntries(readdirSync(rulesDir).filter((f) => f.endsWith('.json')).map((f) => [f.slice(0, -5), load(new URL(f, rulesDir))]));

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
    for (const c of tc.cases) subset(fn(c.input, RULES), c.expected, c.name);
  });
}

test('試用期時程與預告期間的「滿 3 個月」一致', async () => {
  const { probationPlan } = await import('../site/calc/contracts.js');
  const { noticePeriod } = await import('../site/calc/severance.js');
  for (const hireDate of ['2026-01-01', '2026-01-31', '2025-11-30', '2024-02-29', '2026-07-16']) {
    const p = probationPlan({ hireDate, probationDays: 80 }, RULES);
    assert.equal(noticePeriod({ hireDate, endDate: p.lastNoNotice }, RULES).days, 0, `${hireDate} 最後不用預告日`);
    assert.equal(noticePeriod({ hireDate, endDate: p.completesThreeMonths }, RULES).days, 10, `${hireDate} 滿 3 個月`);
  }
});
