/* LifeOS service worker — offline-first app shell.
   Strategy: stale-while-revalidate for same-origin GETs, so the app opens
   instantly (and offline) after the first visit while updates land in the
   background. API calls (Anthropic/Gemini) are cross-origin and untouched. */

const CACHE = "lifeos-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== location.origin) return;
  // never cache dev/HMR endpoints
  if (url.pathname.startsWith("/_next/webpack-hmr")) return;

  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(request);
      const network = fetch(request)
        .then((res) => {
          if (res.ok && res.type === "basic") cache.put(request, res.clone());
          return res;
        })
        .catch(async () => {
          // offline: fall back to the cached shell for navigations
          if (request.mode === "navigate") {
            return (await cache.match("/")) ?? Response.error();
          }
          return Response.error();
        });
      return cached ?? network;
    }),
  );
});
