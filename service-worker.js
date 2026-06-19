// service-worker.js
// Minimal offline app-shell caching. Firestore/Auth calls go to the network
// as usual (not cached) — this only ensures the static shell loads offline.

const CACHE_NAME = "lifefeed-shell-v2";
// Paths are relative to the service worker's own scope so this works
// whether the app is hosted at the domain root or under a subpath
// (e.g. GitHub Pages: https://user.github.io/lifefeed/).
const SHELL_ASSETS = [
  "./index.html",
  "./reset.css",
  "./variables.css",
  "./layout.css",
  "./components.css",
  "./animations.css",
  "./firebase-config.js",
  "./auth.js",
  "./app.js",
  "./feed.js",
  "./log.js",
  "./dashboard.js",
  "./streak.js",
  "./support.js",
  "./ui.js",
  "./categories.js",
  "./manifest.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Never intercept Firebase/Google API calls — always go to network.
  if (request.url.includes("firestore.googleapis.com") || request.url.includes("googleapis.com")) {
    return;
  }
  // Only handle GET requests; let everything else pass through untouched.
  if (request.method !== "GET") return;

  // Network-first: always try to fetch the latest version first so deployed
  // updates show up immediately. Fall back to the cache only when offline.
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok && request.url.startsWith(self.location.origin)) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || caches.match("./index.html")))
  );
});
