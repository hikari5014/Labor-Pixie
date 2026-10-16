// 和主管機關公布的數字逐筆比對（不是自己算的預期值）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { employmentCost } from '../site/calc/employment-cost.js';

const load = (u) => JSON.parse(readFileSync(new URL(u, import.meta.url)));
const dir = new URL('../data/rules/', import.meta.url);
const RULES = Object.fromEntries(readdirSync(dir).map((f) => [f.slice(0, -5), load(new URL(f, dir))]));

test('健保費：58 個級距的本人與投保單位負擔，與健保署 115 年負擔金額表完全一致', () => {
  const nhi = load('./fixtures/nhi-2026.json');
  for (const [grade, self, employer] of nhi.rows) {
    const r = employmentCost({ salary: grade, date: '2026-10-16' }, RULES);
    assert.equal(r.grades.health, grade);
    assert.equal(r.employee.health, self, `${grade} 本人負擔`);
    assert.equal(r.employer.health, employer, `${grade} 投保單位負擔`);
  }
});

test('勞保、就保、職災保費：與勞保局保險費試算（115 年、29,500 元、職災 0.21%）一致', () => {
  const r = employmentCost({ salary: 29500, occupationalRate: 0.0021, date: '2026-10-16' }, RULES);
  assert.deepEqual([r.employer.labor, r.employer.occupational, r.employer.employment], [2375, 62, 207]);
  assert.deepEqual([r.employee.labor, r.employee.employment], [679, 59]);
});
