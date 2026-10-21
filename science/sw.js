// Science Explorer service worker: precaches the whole app so it works offline.
var CACHE = 'science-explorer-e801467a3a9a';
var FILES = [
"./",
"app.css",
"app.js",
"data.js",
"index.html",
"manifest.webmanifest",
"icons/apple-touch-icon.png",
"icons/icon-192.png",
"icons/icon-512.png",
"icons/maskable-512.png"
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return c.addAll(FILES.map(function (f) { return new Request(f, { cache: 'reload' }); }));
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf('science-explorer-') === 0 && k !== CACHE; })
      .map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(caches.open(CACHE).then(function (c) {
    return c.match(req, { ignoreSearch: true }).then(function (hit) {
      if (hit) return hit;
      if (req.mode === 'navigate') return c.match('./').then(function (r) { return r || fetch(req); });
      return fetch(req);
    });
  }));
});
