// Service worker — caches the app shell for offline study.
//
// IMPORTANT: bump CACHE_VERSION whenever you change any file in the APP_SHELL list.
// The bumped value is the only signal browsers use to swap in the new cache.
//
// iOS-Safari notes:
//   - Service workers run from iOS 11.3+, but storage is purged after ~7 days
//     of app inactivity. Re-opening the app re-populates the cache automatically.
//   - This file uses classic-script syntax (no ES modules) because module-type
//     service workers are still partially supported on iOS.

const CACHE_VERSION = "1.0.0";
const CACHE_NAME = "epso-ad5-" + CACHE_VERSION;

const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./manifest.webmanifest",
  "./questions.js",
  "./digcomp3.js",
  "./src/app.js",
  "./src/router.js",
  "./src/state.js",
  "./src/actions.js",
  "./src/decks.js",
  "./src/spaced-rep.js",
  "./src/data.js",
  "./src/constants.js",
  "./src/helpers.js",
  "./src/html.js",
  "./src/modals.js",
  "./src/effects.js",
  "./src/keyboard.js",
  "./src/ui/home.js",
  "./src/ui/competence.js",
  "./src/ui/question.js",
  "./src/ui/results.js",
  "./src/ui/settings.js",
  "./src/ui/digcomp3.js"
];

// Install: pre-cache the entire app shell.
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

// Activate: drop any caches that don't match the current version.
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k.startsWith("epso-ad5-") && k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Fetch: cache-first for static assets, network-first for navigations.
// We only intervene on same-origin GETs — third-party requests pass through untouched.
self.addEventListener("fetch", event => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }

  event.respondWith(cacheFirst(request));
});

function cacheFirst(request) {
  return caches.match(request).then(cached => {
    if (cached) return cached;
    return fetch(request).then(response => {
      if (response && response.ok && response.type === "basic") {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
      }
      return response;
    }).catch(() => cached);
  });
}

function networkFirst(request) {
  return fetch(request).then(response => {
    if (response && response.ok) {
      const copy = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
    }
    return response;
  }).catch(() =>
    caches.match(request).then(cached => cached || caches.match("./index.html") || caches.match("./"))
  );
}
