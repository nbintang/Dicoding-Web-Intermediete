const CACHE_NAME = "story-app-v3"; // Bump version biar cache lama terhapus
const API_CACHE = "story-api-cache-v1";
const IMAGE_CACHE = "story-image-cache-v1";

const APP_SHELL = [
  "/",
  "/index.html",
  "/styles/styles.css",
  "/scripts/main.js",
  "/scripts/router.js",
  "/scripts/api/model.js",
  "/scripts/api/db.js",
  "/scripts/components/auth.js",
  "/scripts/components/camera.js",
  "/scripts/components/dom.js",
  "/scripts/components/map.js",
  "/scripts/components/view-transition.js",
  "/scripts/controllers/authController.js",
  "/scripts/controllers/storyController.js",
  "/scripts/views/AppShellView.js",
  "/scripts/views/LoginView.js",
  "/scripts/views/RegisterView.js",
  "/scripts/views/StoriesView.js",
  "/scripts/views/AddStoryView.js",
  "/scripts/views/SavedView.js",
  "/scripts/views/NotFoundView.js",
  "/public/favicon.png",
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

  // Hanya handle GET
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  /* =========================================================
   * 1. IMAGE STRATEGY (Dicoding API Images)
   * Stale-While-Revalidate + Offline Safe
   * ========================================================= */
  if (
    url.origin.includes("dicoding.dev") &&
    (request.destination === "image" ||
      /\.(jpg|jpeg|png|gif|webp)$/i.test(url.pathname))
  ) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then(async (cache) => {
        const cached = await cache.match(request);

        const networkFetch = fetch(request, { mode: "no-cors" })
          .then((response) => {
            if (response) {
              cache.put(request, response.clone()).catch(() => {});
            }
            return response;
          })
          .catch(() => null);

        // 1️⃣ Pakai cache dulu
        if (cached) return cached;

        // 2️⃣ Kalau tidak ada cache, coba network
        const network = await networkFetch;
        if (network) return network;

        // 3️⃣ Fallback image lokal
        return caches.match("/public/fallback-image.png");
      })
    );
    return;
  }

  /* =========================================================
   * 2. NAVIGATION REQUEST (SPA + OFFLINE)
   * INI YANG PALING PENTING UNTUK NETLIFY
   * ========================================================= */
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Simpan halaman ke cache
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put("/index.html", copy);
          });
          return response;
        })
        .catch(async () => {
          // 🔥 OFFLINE FALLBACK
          const cache = await caches.open(CACHE_NAME);
          const cachedIndex = await cache.match("/index.html");
          return cachedIndex;
        })
    );
    return;
  }

  /* =========================================================
   * 3. APP SHELL & STATIC FILES (Cache First)
   * ========================================================= */
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request)
        .then((response) => {
          // Simpan file statis ke cache
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, copy);
            });
          }
          return response;
        })
        .catch(() => {
          // Jika offline & tidak ada cache → biarkan gagal (bukan navigation)
          return;
        });
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
