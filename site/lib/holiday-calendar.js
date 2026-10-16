// 休假月曆的純計算（不碰畫面）：某一年每一天是國定假日、例假日、休息日還是工作日。資料來自 data/rules/holiday-calendar。

export const WEEKDAY_NAMES = '日一二三四五六';

/** 規則表裡有哪些年度（由小到大） */
export function calendarYears(rule) {
  return rule.entries.map((e) => Number(e.year)).sort((a, b) => a - b);
}

/** 月曆可以翻的年度範圍：有資料的年度，加上今年與明年（還沒公布的只顯示例假、休息日） */
export function yearRange(rule, todayYear) {
  const years = calendarYears(rule);
  const min = Math.min(years[0] || todayYear, todayYear);
  const max = Math.max(years[years.length - 1] || todayYear, todayYear + 1);
  return { min, max };
}

const pad = (n) => String(n).padStart(2, '0');

/**
 * 一整年的月曆。options：{ regular＝例假日的星期（0＝日…6＝六，預設 0）, rest＝休息日的星期（預設 6）}
 * 回傳 { year, published, entry, months: [{ month, firstWeekday, days: [{ date, day, weekday, kind, name, onLeaveDay }] }], holidays, counts }
 * kind：holiday（國定假日或補假）、workday（公務機關補行上班）、regular（例假日）、rest（休息日）、work（工作日）
 * onLeaveDay：國定假日剛好落在例假日或休息日（勞工應補假）
 */
export function yearCalendar(year, rule, { regular = 0, rest = 6 } = {}) {
  const entry = rule.entries.find((e) => Number(e.year) === year) || null;
  const named = new Map();
  if (entry) {
    for (const d of entry.days || []) named.set(d.date, { kind: 'holiday', name: d.name });
    for (const d of entry.weekend_holidays || []) named.set(d.date, { kind: 'holiday', name: d.name });
    for (const d of entry.workdays || []) named.set(d.date, { kind: 'workday', name: d.name });
  }
  const months = [];
  const holidays = [];
  const counts = { holiday: 0, holidayOnLeaveDay: 0, regular: 0, rest: 0, work: 0, workday: 0 };
  for (let m = 1; m <= 12; m += 1) {
    const total = new Date(Date.UTC(year, m, 0)).getUTCDate();
    const days = [];
    for (let d = 1; d <= total; d += 1) {
      const date = `${year}-${pad(m)}-${pad(d)}`;
      const weekday = new Date(Date.UTC(year, m - 1, d)).getUTCDay();
      const base = weekday === regular ? 'regular' : weekday === rest ? 'rest' : 'work';
      const hit = named.get(date);
      const kind = hit ? hit.kind : base;
      const item = { date, day: d, weekday, kind, name: hit ? hit.name : '', onLeaveDay: Boolean(hit && hit.kind === 'holiday' && base !== 'work'), base };
      counts[kind] += 1;
      if (item.onLeaveDay) counts.holidayOnLeaveDay += 1;
      if (hit) holidays.push(item);
      days.push(item);
    }
    months.push({ month: m, firstWeekday: new Date(Date.UTC(year, m - 1, 1)).getUTCDay(), days });
  }
  return { year, published: Boolean(entry), entry, months, holidays, counts };
}
