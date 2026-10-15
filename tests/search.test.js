import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { searchAll } from '../site/lib/search.js';

const dir = (d) => new URL(`../data/${d}/`, import.meta.url);
const read = (d) => readdirSync(dir(d)).map((f) => JSON.parse(readFileSync(new URL(f, dir(d)))));
const topics = read('topics');
const cases = read('cases').flatMap((file) => file.cases.map((c) => ({ category: { id: file.id, title: file.title }, case: c })));
const laws = read('laws');

test('全站搜尋：「打卡」找到加班主題卡與司機早到案例', () => {
  const r = searchAll({ topics, cases, calcs: [], laws }, '打卡');
  assert.ok(r.topics.some((t) => t.id === 'overtime-records'));
  assert.ok(r.cases.some((x) => x.case.id === 'c20'));
});

test('全站搜尋：法條也找得到；空白不回傳', () => {
  const r = searchAll({ topics, cases, calcs: [], laws }, '特別休假');
  assert.ok(r.articles.length > 0);
  const empty = searchAll({ topics, cases, calcs: [], laws }, '  ');
  assert.equal(empty.cases.length + empty.topics.length + empty.articles.length, 0);
});

test('案例共 41 個，實務見解都有內容', () => {
  assert.equal(cases.length, 41);
  for (const { case: c } of cases) if (c.practice) assert.ok(c.practice.length > 0, c.id);
});
