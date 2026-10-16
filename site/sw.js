// 離線快取：網站外殼先用快取；data/ 先上網拿最新，沒網路才用快取。
// 安裝時把網站檔案（SHELL）和 data/meta.json 列出的所有資料檔一起存下來，離線也能用每個功能。
const VERSION = '1.7.0';
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
  'calc/package-pay.js',
  'views/home.js',
  'views/changelog.js',
  'views/calc-list.js',
  'views/calc-annual-leave.js',
  'views/calc-minimum-wage.js',
  'views/calc-package-pay.js',
  'calc/severance.js',
  'views/calc-average-wage.js',
  'views/calc-severance.js',
  'views/calc-notice-period.js',
  'calc/overtime.js',
  'views/calc-overtime.js',
  'lib/laws.js',
  'views/laws.js',
  'views/law.js',
  'calc/contracts.js',
  'views/separation.js',
  'views/calc-fixed-term.js',
  'views/calc-probation.js',
  'calc/sick-leave.js',
  'views/calc-sick-leave.js',
  'views/checklist.js',
  'views/topics.js',
  'views/topic.js',
  'views/about.js',
  'lib/search.js',
  'lib/content.js',
  'views/cases.js',
  'views/case.js',
  'views/search.js',
  'views/quick.js',
  'calc/comp-leave.js',
  'calc/hourly-holiday.js',
  'calc/pension.js',
  'calc/bullying.js',
  'views/calc-comp-leave.js',
  'views/calc-hourly-holiday.js',
  'views/calc-old-pension.js',
  'views/calc-bullying.js',
  'lib/template.js',
  'views/forms.js',
  'views/form.js',
  'calc/employment-cost.js',
  'views/calc-employment-cost.js',
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
