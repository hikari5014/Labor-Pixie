// 資料健康狀態的判斷
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assess, RUN_STALE_DAYS } from '../site/lib/health.js';

const summary = {
  laws: [{ id: 'labor-standards-act', name: '勞動基準法', modified_on: '2024-07-31' }],
  rules: [{ id: 'minimum-wage', title: '最低工資', checked_on: '2026-10-15', effective_from: '2026-01-01', pending: ['2027-01-01'] }],
  calendar: { years: [2026, 2027], checked_on: '2026-10-16' },
};
const ok = { checked_at: '2026-10-16T03:02:00+08:00', checks: { laws: { ok: true, message: '法規沒有變動', last_success: '2026-10-16T03:02:00+08:00' }, calendar: { ok: true, message: '', last_success: '2026-10-16T03:02:00+08:00' } }, problems: [], summary };
const at = (iso) => Date.parse(iso);

test('全部正常', () => {
  const r = assess(ok, at('2026-10-16T12:00:00+08:00'));
  assert.equal(r.level, 'ok');
  assert.equal(r.items.length, 4);
});

test(`自動檢查超過 ${RUN_STALE_DAYS} 天沒跑就要處理`, () => {
  assert.equal(assess(ok, at('2026-10-19T12:00:00+08:00')).level, 'ok');
  const r = assess(ok, at('2026-10-20T12:00:00+08:00'));
  assert.equal(r.level, 'crit');
  assert.match(r.items[0].text, /4 天/);
});

test('法條更新失敗：要處理，並說明上次成功時間', () => {
  const bad = { ...ok, checks: { ...ok.checks, laws: { ok: false, message: '抓取失敗：HTTP 503', last_success: '2026-10-12T03:01:00+08:00' } } };
  const item = assess(bad, at('2026-10-16T12:00:00+08:00')).items.find((i) => i.area === 'laws');
  assert.equal(item.level, 'crit');
  assert.match(item.text, /HTTP 503/);
  assert.match(item.action, /115\.10\.12/);
});

test('規則表問題：注意，並換成中文名稱', () => {
  const r = assess({ ...ok, problems: ['minimum-wage：2027-01-01 生效的那一筆還是「尚未核定」，請確認是否已正式公告。'] }, at('2027-01-02T12:00:00+08:00'));
  const item = r.items.find((i) => i.area === 'rules');
  assert.equal(item.level, 'warn');
  assert.match(item.text, /^最低工資：/);
});

test('行事曆更新失敗或缺年度', () => {
  const failed = { ...ok, checks: { ...ok.checks, calendar: { ok: false, message: '117 年應有 365 天，檔案有 364 天' } } };
  assert.equal(assess(failed, at('2026-10-16T12:00:00+08:00')).items.find((i) => i.area === 'calendar').level, 'crit');
  const missing = { ...ok, problems: ['holiday-calendar：缺少 2028 年的國定假日與補假（人事行政總處辦公日曆表）。'] };
  const item = assess(missing, at('2027-10-02T12:00:00+08:00')).items.find((i) => i.area === 'calendar');
  assert.equal(item.level, 'warn');
  assert.match(item.text, /^休假行事曆：/);
});

test('沒有狀態檔', () => {
  assert.equal(assess(null).level, 'warn');
});
