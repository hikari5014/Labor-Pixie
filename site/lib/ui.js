// 畫面共用小元件。文字一律用 textContent 放入，不用 innerHTML，避免被塞程式。
import { LAW_IDS, articleKey } from './laws.js';

/** 建立元素：h('div', { class: 'panel' }, '文字', 子元素…) */
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'class') el.className = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : String(c));
  }
  return el;
}

/** 頁首：標題＋說明 */
export function pageHead(title, sub) {
  return h('div', { class: 'page-head' },
    h('a', { class: 'back', href: '#/' }, '返回首頁'),
    h('h1', { class: 'page-head__title' }, title),
    sub && h('p', { class: 'page-head__sub' }, sub));
}

let fieldSeq = 0;
/** 表單欄位。type: number | date | select | checkbox；回傳 { el, input } */
export function field({ label, type = 'number', value = '', hint, options, unit, min, step }) {
  const id = `f${(fieldSeq += 1)}`;
  let input;
  if (type === 'select') {
    input = h('select', { id, class: 'input' }, options.map(([v, t]) => h('option', { value: v }, t)));
    input.value = value;
  } else if (type === 'checkbox') {
    input = h('input', { id, type: 'checkbox' });
    input.checked = Boolean(value);
    return { el: h('label', { class: 'checkline', for: id }, input, label), input };
  } else {
    input = h('input', { id, class: 'input', type, value, min, step, inputmode: type === 'number' ? 'decimal' : null });
  }
  const box = unit ? h('div', { class: 'input-unit' }, input, h('span', {}, unit)) : input;
  return { el: h('div', { class: 'field' }, h('label', { class: 'field__label', for: id }, label), box, hint && h('div', { class: 'field__hint' }, hint)), input };
}

/** 讀數字欄位；空白或不是數字回傳 NaN */
export function num(input) {
  return input.value.trim() === '' ? NaN : Number(input.value);
}

/** 提示框：level = info | good | warn | crit；文字一定要寫，不只靠顏色 */
export function alertBox(level, title, text) {
  const mark = { info: 'ℹ︎', good: '✓', warn: '！', crit: '✕' }[level] || '';
  return h('div', { class: `alert alert--${level}`, role: level === 'crit' ? 'alert' : null },
    h('b', {}, `${mark} ${title}`), text && h('div', {}, text));
}

/** 結果的一列：名稱＋數值 */
export function resultRow(label, value, strong = false) {
  return h('div', { class: `result-row${strong ? ' result-row--main' : ''}` }, h('span', {}, label), h('b', {}, value));
}

/** 「怎麼算的」展開區：lines 是字串陣列 */
export function formula(lines) {
  return h('details', { class: 'formula' }, h('summary', {}, '怎麼算的？'),
    h('ol', {}, lines.map((l) => h('li', {}, l))));
}

/** 法條出處連結：有收錄的法規連到 APP 內的條文（離線也能看），其餘連到全國法規資料庫 */
export function lawLink(pcode, articleNo, label) {
  const key = articleKey(articleNo);
  if (LAW_IDS[pcode]) return h('a', { href: `#/laws/${LAW_IDS[pcode]}/${key}` }, label);
  return h('a', { href: `https://law.moj.gov.tw/LawClass/LawSingle.aspx?pcode=${pcode}&flno=${key}`, target: '_blank', rel: 'noopener' }, label);
}

/** 依據區塊 */
export function basis(...links) {
  return h('p', { class: 'small basis' }, '依據：', ...links.flatMap((l, i) => (i ? ['、', l] : [l])));
}

export function disclaimer() {
  return h('div', {},
    h('p', { class: 'small muted' }, '試算結果僅供參考，不取代律師或勞動主管機關的意見；個案請以實際契約、紀錄與主管機關認定為準。'),
    h('div', { class: 'actions disclaimer-actions' }, h('button', { type: 'button', class: 'btn', onclick: () => window.print() }, '列印這一頁')));
}

/** 把文字中的關鍵字包成 <mark>（不用 innerHTML） */
export function highlight(text, word) {
  if (!word) return [text];
  const parts = [];
  let i = 0;
  for (;;) {
    const j = text.indexOf(word, i);
    if (j < 0) { parts.push(text.slice(i)); break; }
    parts.push(text.slice(i, j), h('mark', {}, word));
    i = j + word.length;
  }
  return parts;
}
