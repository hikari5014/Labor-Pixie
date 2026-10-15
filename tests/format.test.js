import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { rocDate, money, daysBetween, todayTaipei, entryOn, nextEntry, addMonths, completedMonths, ceilMoney, isDate } from '../site/format.js';

const wage = JSON.parse(readFileSync(new URL('../data/rules/minimum-wage.json', import.meta.url)));

test('民國年日期', () => {
  assert.equal(rocDate('2026-10-15'), '115.10.15');
  assert.equal(rocDate('2027-01-01'), '116.01.01');
});

test('千分位', () => {
  assert.equal(money(29500), '29,500');
});

test('相差天數與台灣日期', () => {
  assert.equal(daysBetween('2026-09-15', '2026-10-15'), 30);
  assert.equal(todayTaipei(new Date('2026-10-15T17:00:00Z')), '2026-10-16');
});

test('依日期選最低工資，待核定的不算', () => {
  assert.equal(entryOn(wage.entries, '2026-10-15').monthly, 29500);
  assert.equal(entryOn(wage.entries, '2025-06-01').monthly, 28590);
  assert.equal(entryOn(wage.entries, '2027-02-01').monthly, 29500);
  assert.equal(nextEntry(wage.entries, '2026-10-15').status, 'pending');
});

test('加月數：月底取最後一天', () => {
  assert.equal(addMonths('2026-01-31', 1), '2026-02-28');
  assert.equal(addMonths('2024-01-31', 1), '2024-02-29');
  assert.equal(addMonths('2026-03-15', -6), '2025-09-15');
  assert.equal(addMonths('2026-12-01', 1), '2027-01-01');
});

test('滿幾個月', () => {
  assert.equal(completedMonths('2026-01-15', '2026-07-14'), 5);
  assert.equal(completedMonths('2026-01-15', '2026-07-15'), 6);
  assert.equal(completedMonths('2025-08-31', '2026-02-28'), 6);
  assert.equal(completedMonths('2026-05-01', '2026-04-01'), 0);
});

test('金額進位與日期檢查', () => {
  assert.equal(ceilMoney(3600.0000001), 3600);
  assert.equal(ceilMoney(2583.34), 2584);
  assert.ok(isDate('2026-02-28'));
  assert.ok(!isDate('2026-02-30'));
  assert.ok(!isDate(''));
});
