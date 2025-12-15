const CACHE_NAME = "story-app-v3"; // Bump version biar cache lama terhapus
const API_CACHE = "story-api-cache-v1";
const IMAGE_CACHE = "story-image-cache-v1";

const APP_SHELL = [
  "./",
  "./index.html",
  "./styles/styles.css",
  "./scripts/main.js",
  "./scripts/router.js",
  "./scripts/api/model.js",
  "./scripts/api/db.js",
  "./scripts/components/auth.js",
  "./scripts/components/camera.js",
  "./scripts/components/dom.js",
  "./scripts/components/map.js",
  "./scripts/components/view-transition.js",
  "./scripts/controllers/authController.js",
  "./scripts/controllers/storyController.js",
  "./scripts/views/AppShellView.js",
  "./scripts/views/LoginView.js",
  "./scripts/views/RegisterView.js",
  "./scripts/views/StoriesView.js",
  "./scripts/views/AddStoryView.js",
  "./scripts/views/SavedView.js",
  "./scripts/views/NotFoundView.js",
  "./public/favicon.png",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js",
];

self.addEventListener("install", (event) => {
  console.log("[SW] Installing...");
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log("[SW] Activating...");
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (
            cacheName !== CACHE_NAME &&
            cacheName !== API_CACHE &&
            cacheName !== IMAGE_CACHE
          ) {
            console.log("[SW] Deleting old cache:", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // 1. STRATEGI KHUSUS GAMBAR (Stale-While-Revalidate)
  // Menangkap semua request gambar ke Dicoding API
  if (
    url.origin.includes("dicoding.dev") &&
    (request.destination === "image" ||
      url.pathname.match(/\.(jpg|jpeg|png|gif|webp)$/i))
  ) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then(async (cache) => {
        // Cek apakah ada di cache?
        const cachedResponse = await cache.match(request);

        // Fetch ke network untuk update cache (background)
        const networkFetch = fetch(request, { mode: "no-cors" }) // Force no-cors untuk gambar opaque
          .then((networkResponse) => {
            // Simpan ke cache (baik sukses maupun opaque/status 0)
            cache.put(request, networkResponse.clone());
            return networkResponse;
          })
          .catch((err) => {
            // Offline dan fetch gagal
            console.log("[SW] Image fetch failed (offline):", url.pathname);
            return null;
          });

        // Kembalikan cache jika ada, jika tidak tunggu network
        return cachedResponse || networkFetch;
      })
    );
    return;
  }

  if (
    url.origin.includes("dicoding.dev") &&
    (request.destination === "image" ||
      url.pathname.match(/\.(jpg|jpeg|png|gif|webp)$/i))
  ) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then(async (cache) => {
        const cachedResponse = await cache.match(request);
        // Fetch network dan cache bila berhasil atau opaque
        const networkFetch = fetch(request)
          .then((networkResponse) => {
            if (!networkResponse) return null;
            // cache only if ok or opaque
            if (networkResponse.ok || networkResponse.type === "opaque") {
              cache
                .put(request, networkResponse.clone())
                .catch((err) => console.warn("[SW] cache.put failed", err));
            }
            return networkResponse;
          })
          .catch((err) => {
            console.log(
              "[SW] Image fetch failed (offline):",
              url.pathname,
              err
            );
            return null;
          });

        // Kembalikan cached jika ada, kalau tidak tunggu networkFetch, kalau tidak ada fallback local
        return (
          cachedResponse ||
          networkFetch ||
          caches.match("/public/fallback-image.png")
        );
      })
    );
    return;
  }
  // 3. STRATEGI DEFAULT (Cache First untuk App Shell)
  event.respondWith(
    caches.match(request).then((response) => {
      return response || fetch(request);
    })
  );
});
// Push Notification Handler (Tetap sama)
self.addEventListener("push", (event) => {
  let notificationData = {
    title: "StoryBoard",
    body: "Ada update baru!",
    icon: "/public/favicon.png",
    badge: "/public/favicon.png",
  };

  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = { ...notificationData, ...data };
    } catch (e) {
      notificationData.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      vibrate: [200, 100, 200],
      data: { url: notificationData.url || "/" }, // Simpan URL
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url || "/"));
});
