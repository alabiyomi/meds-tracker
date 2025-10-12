// sw.js
const CACHE = 'meds-cache-v1';
const BASE = self.registration.scope;

const precache = [
  'index.html',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png'
].map(p => new URL(p, BASE).toString());

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(precache)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  // Keep HTML fresh, fallback to cache when offline
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(r => {
        const copy = r.clone();
        caches.open(CACHE).then(c => c.put(new URL('index.html', BASE), copy)).catch(()=>{});
        return r;
      }).catch(() => caches.match(new URL('index.html', BASE)))
    );
    return;
  }

  // Cache-first for assets; runtime-cache CDN (e.g., Chart.js) after first load
  e.respondWith(
    caches.match(req).then(hit => {
      if (hit) return hit;
      return fetch(req).then(r => {
        if (r && r.status === 200 && r.type !== 'opaque') {
          const copy = r.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(()=>{});
        }
        return r;
      }).catch(() => hit);
    })
  );
});
