import { rocDate, money, daysBetween, todayTaipei, entryOn, nextEntry } from './format.js';

export const APP_VERSION = '0.1.0';
const STALE_DAYS = 30; // 法規資料超過幾天沒更新就提醒

const intro = {
  employer: '查清楚怎麼做才合規，算清楚該付多少。',
  worker: '查清楚自己的權益，知道該留哪些證據。',
};
const checkLabel = { employer: '檢查公司', worker: '準備證據' };

const $ = (id) => document.getElementById(id);

function store(key, value) {
  try {
    if (value === undefined) return localStorage.getItem(key);
    localStorage.setItem(key, value);
  } catch (e) { /* 無痕模式等情況存不了，不影響使用 */ }
  return null;
}

function showBanner(kind, text, action) {
  const b = $('banner');
  b.className = `banner banner--${kind}`;
  b.textContent = text;
  if (action) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn';
    btn.textContent = action.label;
    btn.addEventListener('click', action.onClick);
    b.appendChild(btn);
  }
  b.hidden = false;
}

function setRole(role) {
  document.querySelectorAll('.seg__btn').forEach((btn) => {
    btn.setAttribute('aria-pressed', String(btn.dataset.role === role));
  });
  $('intro').textContent = intro[role];
  $('tile-check').textContent = checkLabel[role];
  store('role', role);
}

async function getJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path} ${res.status}`);
  return res.json();
}

async function loadData() {
  const today = todayTaipei();
  try {
    const meta = await getJSON('data/meta.json');
    $('data-version').textContent = rocDate(meta.data_version);
    if (daysBetween(meta.data_version, today) > STALE_DAYS) {
      showBanner('update', `法規資料已超過 ${STALE_DAYS} 天沒有更新，內容可能過時。`);
    }
    const wage = await getJSON('data/rules/minimum-wage.json');
    const now = entryOn(wage.entries, today);
    $('wage').textContent = now
      ? `月薪 ${money(now.monthly)} 元／時薪 ${money(now.hourly)} 元（${rocDate(now.effective_from)} 起）`
      : '查無資料';
    const next = nextEntry(wage.entries, today);
    if (next) {
      const status = next.status === 'pending' ? '尚未正式核定' : '已公告';
      $('wage-next').textContent = `${rocDate(next.effective_from)} 起：月薪 ${money(next.monthly)} 元／時薪 ${money(next.hourly)} 元（${status}）`;
      $('wage-next').hidden = false;
    }
  } catch (e) {
    $('data-version').textContent = '讀取失敗';
    $('wage').textContent = '讀取失敗，請連網後重新整理。';
  }
}

async function setupServiceWorker() {
  if (!('serviceWorker' in navigator)) return null;
  const reg = await navigator.serviceWorker.register('sw.js');
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!reloading) { reloading = true; location.reload(); }
  });
  const offerReload = () => showBanner('update', '有新版本可以使用。', {
    label: '重新載入',
    onClick: () => reg.waiting && reg.waiting.postMessage('SKIP_WAITING'),
  });
  if (reg.waiting && navigator.serviceWorker.controller) offerReload();
  reg.addEventListener('updatefound', () => {
    const w = reg.installing;
    w.addEventListener('statechange', () => {
      if (w.state === 'installed' && navigator.serviceWorker.controller) offerReload();
    });
  });
  return reg;
}

async function checkUpdate(regPromise) {
  const msg = $('update-msg');
  if (!navigator.onLine) { msg.textContent = '目前沒有網路，請稍後再試。'; return; }
  msg.textContent = '檢查中…';
  const reg = await regPromise;
  if (reg) await reg.update();
  await loadData();
  msg.textContent = reg && (reg.installing || reg.waiting) ? '找到新版本，下載完成後會提示重新載入。' : '已是最新版本。';
}

function init() {
  $('app-version').textContent = `v${APP_VERSION}`;
  document.querySelectorAll('.seg__btn').forEach((btn) => btn.addEventListener('click', () => setRole(btn.dataset.role)));
  setRole(store('role') === 'worker' ? 'worker' : 'employer');
  if (!navigator.onLine) showBanner('offline', '離線中・使用手機裡存的資料');
  window.addEventListener('offline', () => showBanner('offline', '離線中・使用手機裡存的資料'));
  window.addEventListener('online', () => { $('banner').hidden = true; });
  const regPromise = setupServiceWorker().catch(() => null);
  $('check-update').addEventListener('click', () => checkUpdate(regPromise));
  loadData();
}

init();
