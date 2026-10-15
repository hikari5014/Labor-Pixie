import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { rocDate, money, daysBetween, todayTaipei, entryOn, nextEntry } from '../site/format.js';

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

test('三處版本號一致', () => {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url))).version;
  const app = readFileSync(new URL('../site/app.js', import.meta.url), 'utf8').match(/APP_VERSION = '([^']+)'/)[1];
  const sw = readFileSync(new URL('../site/sw.js', import.meta.url), 'utf8').match(/VERSION = '([^']+)'/)[1];
  assert.equal(app, pkg);
  assert.equal(sw, pkg);
});
