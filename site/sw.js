// 離線快取：網站外殼先用快取；data/ 先上網拿最新，沒網路才用快取。
// 安裝時把網站檔案（SHELL）和 data/meta.json 列出的所有資料檔一起存下來，離線也能用每個功能。
const VERSION = '0.2.0';
const CACHE = `labor-pixie-${VERSION}`;
const SHELL = [
  './',
  'index.html',
  'style.css',
  'app.js',
  'routes.js',
  'format.js',
  'changelog.json',
  'manifest.webmanifest',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'lib/ui.js',
  'lib/data.js',
  'calc/registry.js',
  'calc/annual-leave.js',
  'calc/minimum-wage.js',
  'views/home.js',
  'views/changelog.js',
  'views/calc-list.js',
  'views/calc-annual-leave.js',
  'views/calc-minimum-wage.js',
];

async function precache() {
  const cache = await caches.open(CACHE);
  await cache.addAll(SHELL);
  const res = await fetch('data/meta.json', { cache: 'no-cache' });
  const meta = await res.clone().json();
  await cache.put('data/meta.json', res);
  await cache.addAll(meta.files.map((f) => `data/${f}`));
}

self.addEventListener('install', (event) => {
  event.waitUntil(precache());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(request);
    if (res.ok) cache.put(request, res.clone());
    return res;
  } catch (e) {
    const hit = await cache.match(request);
    if (hit) return hit;
    throw e;
  }
}

async function cacheFirst(request) {
  const hit = await caches.match(request, { ignoreSearch: true });
  return hit || fetch(request);
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  const fresh = url.pathname.includes('/data/') || url.pathname.endsWith('/changelog.json');
  event.respondWith(fresh ? networkFirst(event.request) : cacheFirst(event.request));
});
