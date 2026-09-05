/* sw.js — 事業計画スタジオ の Service Worker
 *
 * 方針
 *  - 初回アクセスでアプリ一式をキャッシュし、以降はオフラインでも起動できるようにする。
 *  - ただし「キャッシュが残り続けて更新が届かない」事故を避けるため、
 *      ページ遷移（HTML）  … ネットワーク優先（つながらなければキャッシュ）
 *      JS / CSS / アイコン … キャッシュ即返し＋裏で更新（stale-while-revalidate）
 *      フォント / CDN      … キャッシュ優先
 *    としている。裏で新しい中身を取得したらページへ通知し、更新バーを出す。
 *  - VERSION はデプロイ時に GitHub Actions がコミットSHAへ置換する（tools/stamp-version.mjs）。
 *    手動デプロイのときは書き換えなくても上記の仕組みで更新は届く。
 */

const VERSION = 'dev';
const CACHE = 'madori-studio-' + VERSION;

/* 事前キャッシュするアプリ一式（tools/update-sw-precache.mjs で自動更新できる） */
/* precache:start */
const CORE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/favicon.svg',
  './icons/apple-touch-icon.png',
  './css/app.css',
  './css/app-extra.css',
  './css/pwa.css',
  './js/01-model.js',
  './js/02-geometry.js',
  './js/03-canvas.js',
  './js/04-interact.js',
  './js/05-geom-ops.js',
  './js/06-finance.js',
  './js/07-ui-parts.js',
  './js/08-inspector.js',
  './js/09-sheets.js',
  './js/10-floors-io.js',
  './js/11-state.js',
  './js/12-view-cost.js',
  './js/13-view-loan.js',
  './js/14-view-sim.js',
  './js/15-view-sched.js',
  './js/16-view-comp.js',
  './js/17-export.js',
  './js/18-cards.js',
  './js/19-view-tochi.js',
  './js/99-boot.js',
  './pwa.js',
  './icons/icon-512.png',
  './icons/maskable-192.png',
  './icons/maskable-512.png',
];
/* precache:end */

/* キャッシュ優先で扱う外部オリジン（Webフォントと、Excel出力で使う SheetJS） */
const CDN_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com', 'cdnjs.cloudflare.com'];

const NAV_TIMEOUT = 3500;

self.addEventListener('install', ev => {
  ev.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    /* 1件でも失敗すると addAll 全体が落ちるので個別に入れる */
    await Promise.all(CORE.map(async url => {
      try { await cache.add(new Request(url, { cache: 'reload' })); }
      catch (e) { /* 取得できないファイルがあってもインストールは続行 */ }
    }));
  })());
});

self.addEventListener('activate', ev => {
  ev.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k.startsWith('madori-studio-') && k !== CACHE) ? caches.delete(k) : null));
    if (self.registration.navigationPreload) {
      try { await self.registration.navigationPreload.enable(); } catch (e) {}
    }
    await self.clients.claim();
  })());
});

self.addEventListener('message', ev => {
  if (ev.data && ev.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', ev => {
  const req = ev.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;

  if (req.mode === 'navigate') { ev.respondWith(handleNavigate(ev)); return; }
  if (sameOrigin) { ev.respondWith(staleWhileRevalidate(req)); return; }
  if (CDN_HOSTS.includes(url.hostname)) { ev.respondWith(cacheFirst(req)); return; }
  /* それ以外の外部リクエストは素通し */
});

/* ページ遷移：ネットワーク優先。遅い・落ちているときはキャッシュのindex.htmlで起動する */
async function handleNavigate(ev) {
  const cache = await caches.open(CACHE);
  try {
    const preload = ev.preloadResponse ? await ev.preloadResponse : null;
    const res = preload || await withTimeout(fetch(ev.request), NAV_TIMEOUT);
    if (res && res.ok) { cache.put('./index.html', res.clone()); return res; }
    throw new Error('bad response');
  } catch (e) {
    return (await cache.match('./index.html')) || (await cache.match('./')) || Response.error();
  }
}

/* 静的アセット：キャッシュを即返しつつ裏で更新。中身が変わっていればページに知らせる */
async function staleWhileRevalidate(req) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(req, { ignoreSearch: false });
  const network = fetch(req).then(async res => {
    if (res && res.ok && res.type !== 'opaque') {
      const changed = cached && isChanged(cached, res);
      await cache.put(req, res.clone());
      if (changed) notifyUpdate();
    }
    return res;
  }).catch(() => null);
  return cached || (await network) || new Response('', { status: 504, statusText: 'offline' });
}

async function cacheFirst(req) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(req);
  if (cached) return cached;
  try {
    const res = await fetch(req);
    if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
    return res;
  } catch (e) {
    return cached || new Response('', { status: 504, statusText: 'offline' });
  }
}

function isChanged(a, b) {
  const ea = a.headers.get('etag'), eb = b.headers.get('etag');
  if (ea && eb) return ea !== eb;
  const la = a.headers.get('last-modified'), lb = b.headers.get('last-modified');
  if (la && lb) return la !== lb;
  const ca = a.headers.get('content-length'), cb = b.headers.get('content-length');
  if (ca && cb) return ca !== cb;
  return false;
}

let notified = false;
async function notifyUpdate() {
  if (notified) return;          /* 1回の起動につき1度だけ知らせる */
  notified = true;
  const cs = await self.clients.matchAll({ type: 'window' });
  cs.forEach(c => c.postMessage({ type: 'ASSETS_UPDATED' }));
}

function withTimeout(p, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    p.then(v => { clearTimeout(t); resolve(v); }, e => { clearTimeout(t); reject(e); });
  });
}
