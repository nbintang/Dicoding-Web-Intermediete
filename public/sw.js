const CACHE_NAME = "litera-cache-v1";
const STATIC_CACHE = "static-cache-v1";
const DYNAMIC_CACHE = "dynamic-cache-v1";
const STATIC_ASSETS = [
  // Akan diisi otomatis oleh script copy-sw-assets-to-swjs.js
  // Atau kamu bisa mendefinisikan aset statis manual di sini, misal:
  // '/',
  // '/index.html',
  // '/src/styles/styles.css',
  // '/src/main.js',
  // '/src/router.js',
  // '/manifest.webmanifest',
  // '/favicon.png'
];

// Install event - cache static assets
self.addEventListener("install", (event) => {
  console.log('Installing SW version:', CACHE_NAME);
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('Caching static assets...');
      return cache.addAll(STATIC_ASSETS)
        .then(() => console.log('Static assets cached successfully'))
        .catch(error => {
          console.error('Failed to cache static assets:', error);
          // Optional: Retry caching individually to identify problematic assets
          /*
          STATIC_ASSETS.forEach(async (asset) => {
            try {
              await fetch(asset);
              console.log('Asset OK:', asset);
            } catch (e) {
              console.error('Asset failed:', asset, e);
            }
          });
          */
          throw error;
        });
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  console.log('Activating SW version:', CACHE_NAME);
  event.waitUntil(
    Promise.all([
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      clients.claim()
    ])
  );
});

// Fetch event - handle requests
self.addEventListener("fetch", (event) => {
  // Handle API requests
  if (event.request.url.includes("story-api.dicoding.dev")) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const responseToCache = response.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return response;
        })
        .catch(() => {
          return caches.match(event.request).then((response) => {
            if (response) {
              return response;
            }
            return new Response(
              JSON.stringify({
                error: "You are offline. Showing cached data if available.",
                listStory: [],
              }),
              {
                headers: { "Content-Type": "application/json" },
              }
            );
          });
        })
    );
    return;
  }

  // Handle other requests (static assets, HTML, etc.)
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        return response;
      }
      return fetch(event.request)
        .then((networkResponse) => {
          if (
            !networkResponse ||
            networkResponse.status !== 200 ||
            networkResponse.type !== "basic"
          ) {
            return networkResponse;
          }
          const responseToCache = networkResponse.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return networkResponse;
        })
        .catch(() => {
          if (event.request.mode === "navigate") {
            return caches.match("/");
          }
          return new Response("Offline content not available");
        });
    })
  );
});

self.addEventListener('push', function(event) {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { body: event.data.text() };
    }
  }
  const title = data.title || 'Push Notification';
  const options = {
    body: data.body || 'You have a new message.',
    icon: '/assets/img/home1.png', // Pastikan path icon benar
    badge: '/assets/img/home1.png'  // Pastikan path badge benar
  };
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});