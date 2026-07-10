/* Immo Locatif — service worker. Cache l'app shell (offline). Les données live
   (news RSS, DVF, GitHub) ne sont PAS mises en cache : toujours du réseau. */
const CACHE = 'immo-locatif-v1.1';
const SHELL = [
  'index.html', 'styles.css', 'app.js', 'data.js', 'update-check.js',
  'manifest.webmanifest', 'img/icon-192.png', 'img/icon-512.png',
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // Données externes (news, DVF, proxy, github) : réseau uniquement.
  if (/news\.google|data\.gouv|cloud\.ovh|allorigins|api\.github|leboncoin|idealista|avito|google\.com\/search/.test(url.href)) return;
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
