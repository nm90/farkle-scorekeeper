/* Bible Reader service worker — precache the app shell + scripture so the
   whole app works with no network at all after the first visit. */
var CACHE = "bible-reader-v1";
var ASSETS = ["./", "index.html", "kjv.json", "sw.js"];

self.addEventListener("install", function (ev) {
  ev.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (ev) {
  ev.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; })
        .map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (ev) {
  if (ev.request.method !== "GET") return;
  ev.respondWith(
    caches.match(ev.request, { ignoreSearch: true }).then(function (hit) {
      return hit || fetch(ev.request).then(function (res) {
        if (res.ok && new URL(ev.request.url).origin === location.origin) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(ev.request, copy); });
        }
        return res;
      });
    })
  );
});
