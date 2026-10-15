import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fillTemplate, monthDays, formatValue } from '../site/lib/template.js';

test('範本填值：沒填的留空白線，日期轉民國年', () => {
  const fields = [{ id: 'name', type: 'text' }, { id: 'd', type: 'date' }, { id: 'm', type: 'month' }];
  assert.equal(fillTemplate('{{name}} 於 {{d}}', { name: '王小明', d: '2026-10-16' }, fields), '王小明 於 115.10.16');
  assert.equal(fillTemplate('{{name}}', {}, fields), '＿＿＿＿＿＿');
  assert.equal(formatValue(fields[2], '2026-10'), '115 年 10 月');
});

test('月份日期表', () => {
  const days = monthDays('2026-02');
  assert.equal(days.length, 28);
  assert.equal(days[0].weekday, 0); // 2026/2/1 是星期日
  assert.equal(monthDays('2024-02').length, 29);
});
