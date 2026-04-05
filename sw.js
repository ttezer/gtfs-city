/* ═══════════════════════════════════════════════════════════
   Transit 3D — Service Worker
   Offline tile cache: harita tile'larını tarayıcıda saklar.
   İnternet kesilince önceden ziyaret edilen bölgeler çalışır.
   ═══════════════════════════════════════════════════════════ */

const CACHE_NAME   = 'transit3d-tiles-v2';
const STATIC_CACHE = 'transit3d-static-v2';

// Uygulama kabuğu — her zaman cache'le
const STATIC_ASSETS = [
  './',
  './index.html',
  './style.css',
  './src/runtime/script.js',
];

// Tile host'ları — cache-first strateji
const TILE_HOSTS = [
  'basemaps.cartocdn.com',
  'tile.openstreetmap.org',
  'a.tile.openstreetmap.org',
  'b.tile.openstreetmap.org',
  'c.tile.openstreetmap.org',
];

// GLB modelleri — network-first, yoksa cache
const MODEL_EXT = ['.glb', '.gltf'];

// ── INSTALL ───────────────────────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(STATIC_CACHE)
      .then(c => c.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ── ACTIVATE ──────────────────────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys
        .filter(k => k !== CACHE_NAME && k !== STATIC_CACHE)
        .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── FETCH ─────────────────────────────────────────────────
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Tile isteği → stale-while-revalidate
  if (TILE_HOSTS.some(h => url.hostname.includes(h))) {
    e.respondWith(tileStrategy(e.request));
    return;
  }

  // GLB model → network-first (model güncel kalmalı)
  if (MODEL_EXT.some(ext => url.pathname.endsWith(ext))) {
    e.respondWith(networkFirst(e.request));
    return;
  }

  // Uygulama kabuğu → cache-first
  if (url.origin === self.location.origin) {
    e.respondWith(cacheFirst(e.request));
    return;
  }
});

// ── STRATEJİLER ───────────────────────────────────────────
async function tileStrategy(req) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(req);
  // Cache varsa hemen döndür, arka planda güncelle
  if (cached) {
    fetch(req).then(res => { if (res.ok) cache.put(req, res.clone()); }).catch(() => {});
    return cached;
  }
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch {
    return new Response('Tile offline', { status: 503 });
  }
}

async function cacheFirst(req) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(req);
  if (cached) return cached;
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch {
    return new Response('Offline', { status: 503 });
  }
}

async function networkFirst(req) {
  try {
    const res = await fetch(req);
    if (res.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(req, res.clone());
    }
    return res;
  } catch {
    const cache = await caches.open(CACHE_NAME);
    return await cache.match(req) || new Response('Offline', { status: 503 });
  }
}
