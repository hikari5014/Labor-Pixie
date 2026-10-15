// 表單範本：把 {{欄位}} 換成填入的值，沒填的留空白線。純函式，可以測試。
import { rocDate } from '../format.js';

const BLANK = '＿＿＿＿＿＿';

export function formatValue(field, value) {
  if (!value) return BLANK;
  if (field && field.type === 'date') return rocDate(value);
  if (field && field.type === 'month') {
    const [y, m] = value.split('-');
    return `${Number(y) - 1911} 年 ${Number(m)} 月`;
  }
  return value;
}

export function fillTemplate(text, values, fields = []) {
  return text.replace(/{{(\w+)}}/g, (_, name) => formatValue(fields.find((f) => f.id === name), values[name]));
}

/** 某個月的每一天：[{ day, weekday }]，weekday 0＝星期日 */
export function monthDays(yearMonth) {
  const [y, m] = yearMonth.split('-').map(Number);
  const n = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return Array.from({ length: n }, (_, i) => ({ day: i + 1, weekday: new Date(Date.UTC(y, m - 1, i + 1)).getUTCDay() }));
}
