// Minimal offline support: caches the app shell and the service-category
// catalog so the app stays browsable (categories visible, navigation works)
// on poor/no connectivity — the "rural low-bandwidth accessibility"
// requirement. This intentionally does NOT cache bookings, payments, or any
// authenticated data; those always require a live connection by design.
const CACHE_NAME = "sahakarsetu-v1";
const APP_SHELL = ["/", "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Cache-first for the read-only service catalog (safe to serve stale for
  // a short offline window); network-first for everything else so
  // authenticated/dynamic data is never served stale.
  if (url.pathname === "/api/v1/services" && event.request.method === "GET") {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        try {
          const fresh = await fetch(event.request);
          cache.put(event.request, fresh.clone());
          return fresh;
        } catch (e) {
          const cached = await cache.match(event.request);
          return cached || new Response(JSON.stringify({ success: false, error: { message: "Offline and no cached data available" } }), { headers: { "Content-Type": "application/json" } });
        }
      })
    );
    return;
  }

  if (event.request.method === "GET" && url.origin === self.location.origin && !url.pathname.startsWith("/api")) {
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request).catch(() => caches.match("/")))
    );
  }
});
