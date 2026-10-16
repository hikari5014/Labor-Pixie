import { h } from './lib/ui.js';
import { clearCache } from './lib/data.js';
import { ROUTES } from './routes.js';

export const APP_VERSION = '1.9.0';

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
  b.replaceChildren(text);
  if (action) b.append(h('button', { type: 'button', class: 'btn', onclick: action.onClick }, action.label));
  b.hidden = false;
}

// ---- 離線快取與更新 ----
let registration = null;

async function setupServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  registration = await navigator.serviceWorker.register('sw.js');
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!reloading) { reloading = true; location.reload(); }
  });
  const offerReload = () => showBanner('update', '有新版本可以使用。', {
    label: '重新載入',
    onClick: () => registration.waiting && registration.waiting.postMessage('SKIP_WAITING'),
  });
  if (registration.waiting && navigator.serviceWorker.controller) offerReload();
  registration.addEventListener('updatefound', () => {
    const w = registration.installing;
    w.addEventListener('statechange', () => {
      if (w.state === 'installed' && navigator.serviceWorker.controller) offerReload();
    });
  });
}

function updateButton() {
  const msg = h('p', { class: 'small', role: 'status' });
  const btn = h('button', {
    type: 'button',
    class: 'btn btn--primary btn--block',
    onclick: async () => {
      if (!navigator.onLine) { msg.textContent = '目前沒有網路，請稍後再試。'; return; }
      msg.textContent = '檢查中…';
      if (registration) await registration.update();
      clearCache();
      msg.textContent = registration && (registration.installing || registration.waiting)
        ? '找到新版本，下載完成後會提示重新載入。' : '已是最新版本。';
    },
  }, '檢查更新');
  return h('div', {}, btn, msg);
}

// ---- 換頁 ----
const ctx = {
  version: APP_VERSION,
  role: () => (store('role') === 'worker' ? 'worker' : 'employer'),
  setRole: (r) => store('role', r),
  rerender: () => route(),
  updateButton,
};

async function route() {
  const path = location.hash.replace(/^#/, '') || '/';
  const parts = path.split('/').filter(Boolean);
  const view = $('view');
  let match = ROUTES.find((r) => r.path === `/${parts.join('/')}`);
  let params = {};
  if (!match) {
    match = ROUTES.find((r) => r.prefix && path.startsWith(r.prefix));
    if (match) params = { rest: path.slice(match.prefix.length) };
  }
  view.replaceChildren();
  window.scrollTo(0, 0);
  if (!match) {
    view.append(h('p', {}, '找不到這一頁。'), h('a', { href: '#/' }, '回首頁'));
    return;
  }
  document.title = match.title ? `${match.title}｜勞資小精靈` : '勞資小精靈';
  try {
    const mod = await match.load();
    await mod.render(view, params, ctx);
  } catch (e) {
    view.replaceChildren(h('p', {}, '這一頁讀取失敗。沒有網路時，請先連網打開一次再離線使用。'), h('a', { href: '#/' }, '回首頁'));
  }
}

function announceUpdate() {
  const seen = store('seenVersion');
  if (seen && seen !== APP_VERSION) {
    showBanner('update', `已更新到 v${APP_VERSION}。`, { label: '看本版紀錄', onClick: () => { location.hash = '#/changelog'; $('banner').hidden = true; } });
  }
  store('seenVersion', APP_VERSION);
}

function init() {
  window.addEventListener('hashchange', route);
  if (!navigator.onLine) showBanner('offline', '離線中・使用手機裡存的資料');
  window.addEventListener('offline', () => showBanner('offline', '離線中・使用手機裡存的資料'));
  window.addEventListener('online', () => { $('banner').hidden = true; });
  announceUpdate();
  setupServiceWorker().catch(() => {});
  route();
}

init();
