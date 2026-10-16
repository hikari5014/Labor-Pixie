// 休假月曆：每一天的種類與統計
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { yearCalendar, yearRange } from '../site/lib/holiday-calendar.js';

const rule = JSON.parse(readFileSync(new URL('../data/rules/holiday-calendar.json', import.meta.url)));

test('115 年：國定假日與補假 22 天、其中 6 天落在週末', () => {
  const y = yearCalendar(2026, rule);
  assert.equal(y.published, true);
  assert.equal(y.counts.holiday, 22);
  assert.equal(y.counts.holidayOnLeaveDay, 6);
  const all = y.months.flatMap((m) => m.days);
  assert.equal(all.length, 365);
  assert.equal(y.counts.holiday + y.counts.regular + y.counts.rest + y.counts.work + y.counts.workday, 365);
});

test('預設星期日例假、星期六休息日；國定假日優先顯示', () => {
  const days = yearCalendar(2026, rule).months[0].days;
  assert.equal(days[0].kind, 'holiday'); // 1/1 開國紀念日
  assert.equal(days[2].kind, 'rest'); // 1/3 星期六
  assert.equal(days[3].kind, 'regular'); // 1/4 星期日
  assert.equal(days[4].kind, 'work');
});

test('可以改公司的例假日、休息日', () => {
  const days = yearCalendar(2026, rule, { regular: 1, rest: 2 }).months[0].days;
  assert.equal(days[3].kind, 'work'); // 1/4 星期日變工作日
  assert.equal(days[4].kind, 'regular'); // 1/5 星期一
  assert.equal(days[5].kind, 'rest'); // 1/6 星期二
});

test('落在週末的國定假日標記要補假', () => {
  const feb28 = yearCalendar(2026, rule).months[1].days[27];
  assert.equal(feb28.name, '和平紀念日');
  assert.equal(feb28.onLeaveDay, true);
  assert.equal(feb28.base, 'rest');
});

test('還沒公布的年度只顯示例假、休息日', () => {
  const y = yearCalendar(2030, rule);
  assert.equal(y.published, false);
  assert.equal(y.counts.holiday, 0);
  assert.equal(y.months[1].days.length, 28);
  assert.equal(yearCalendar(2028, rule).months[1].days.length, 29);
});

test('可以翻到的年度包含今年與明年', () => {
  assert.deepEqual(yearRange(rule, 2026), { min: 2026, max: 2027 });
  assert.deepEqual(yearRange(rule, 2027), { min: 2026, max: 2028 });
});
