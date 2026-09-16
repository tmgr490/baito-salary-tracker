/* 給与ノート — Service Worker

   目的はオフラインで開けるようにすることと、iOS Safari の
   「7日間アクセスがないと保存データを削除する」制限を、
   ホーム画面に追加したWebアプリとして回避できるようにすること。

   重要: HTML は必ずネットワーク優先にする。
   ここをキャッシュ優先にすると、更新をデプロイしても利用者には
   古い画面が出続け、直したことが伝わらなくなる。
*/

const VERSION = 'v2';
const SHELL_CACHE = `kyuyo-note-shell-${VERSION}`;
const DATA_CACHE  = `kyuyo-note-data-${VERSION}`;

/* オフラインでも開けるように最低限を先読みしておく */
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

const HOLIDAY_API = 'holidays-jp.github.io';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      /* 1つでも失敗すると addAll 全体が落ちるので個別に入れる */
      .then((cache) => Promise.allSettled(SHELL.map((url) => cache.add(url))))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter((k) => k.startsWith('kyuyo-note-') && k !== SHELL_CACHE && k !== DATA_CACHE)
          .map((k) => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

/* ページ側の「更新する」ボタンから呼ばれる */
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

/* ネットワーク優先。取れたらキャッシュを更新し、落ちたらキャッシュで代替する。 */
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.ok) cache.put(request, fresh.clone());
    return fresh;
  } catch (e) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw e;
  }
}

/* キャッシュを即返しつつ、裏で取り直して次回に備える */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((res) => { if (res && res.ok) cache.put(request, res.clone()); return res; })
    .catch(() => null);
  return cached || network || fetch(request);
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  /* 画面そのもの。ここは必ずネットワーク優先にする（上のコメント参照） */
  if (request.mode === 'navigate') {
    event.respondWith(
      networkFirst(request, SHELL_CACHE)
        .catch(() => caches.match('./index.html', { ignoreSearch: true }))
    );
    return;
  }

  /* 祝日データ。更新されることがあるのでネットワーク優先、
     オフラインなら前回の内容を使う */
  if (url.hostname === HOLIDAY_API) {
    event.respondWith(networkFirst(request, DATA_CACHE).catch(() => Response.error()));
    return;
  }

  /* 同一オリジンのアイコン・manifest など */
  if (url.origin === self.location.origin) {
    event.respondWith(staleWhileRevalidate(request, SHELL_CACHE));
  }
});
