/* sw.js */
const CACHE = "meds-v3";

/* Adjust these if your repo is at a subpath on GitHub Pages */
const APP_SHELL = [
  "./",
  "./index.html",          // GH Pages often serves index.html – harmless if missing
  "./manifest.webmanifest",
  "./icon-256.png",
  "./icon-512.png"         // if your file is icon-512.png.png change this line
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

/* Network-first for navigations; cache-first for static shell files */
self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Always try network for navigations so updates deploy quickly
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() => caches.match("./"))
    );
    return;
  }

  // Cache-first for same-origin shell assets
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    if (APP_SHELL.some((p) => url.pathname.endsWith(p.replace("./","/")))) {
      event.respondWith(
        caches.match(req).then((cached) => cached || fetch(req).then((res) => {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(req, clone));
          return res;
        }))
      );
      return;
    }
  }

  // Default: try network, then cache
  event.respondWith(
    fetch(req).then((res) => {
      // opportunistic cache
      const clone = res.clone();
      caches.open(CACHE).then((c) => c.put(req, clone));
      return res;
    }).catch(() => caches.match(req))
  );
});
