// Lamnian service worker: app shell works offline. Weather, posts and sign-in always use the network first.
const V = 'lamnian-v2';
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png', '/icons/favicon-32.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(V).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== V).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.origin !== location.origin) return;                       // never touch Firebase/Google/Open-Meteo
  if (u.pathname.startsWith('/api/') || u.pathname.startsWith('/admin')) return;

  if (r.mode === 'navigate') {                                    // pages: network first, saved copy offline
    e.respondWith(
      fetch(r)
        .then((res) => {
          if (res.ok) { const cp = res.clone(); caches.open(V).then((c) => c.put('/index.html', cp)); }
          return res;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }
  e.respondWith(                                                   // small assets: saved copy, refreshed in background
    caches.match(r).then((hit) => {
      const net = fetch(r).then((res) => {
        if (res.ok) { const cp = res.clone(); caches.open(V).then((c) => c.put(r, cp)); }
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
