const CACHE_NAME = "story-app-v3"; // Bump version biar cache lama terhapus
const API_CACHE = "story-api-cache-v1";
const IMAGE_CACHE = "story-image-cache-v1";

const APP_SHELL = [
  "./",
  "./index.html",
  "./styles/styles.css",
  "./main.js",
  "./router.js",
  "./api/model.js",
  "./api/db.js",
  "./components/auth.js",
  "./components/camera.js",
  "./components/dom.js",
  "./components/map.js",
  "./components/view-transition.js",
  "./controllers/authController.js",
  "./controllers/storyController.js",
  "./views/AppShellView.js",
  "./views/LoginView.js",
  "./views/RegisterView.js",
  "./views/StoriesView.js",
  "./views/AddStoryView.js",
  "./views/SavedView.js",
  "./views/NotFoundView.js",
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

  /* ===============================
   * 1️⃣ SPA NAVIGATION (WAJIB)
   * =============================== */
  if (request.mode === "navigate") {
    event.respondWith(
      caches.match("/index.html").then((cached) => {
        return cached || fetch(request);
      })
    );
    return;
  }

  /* ===============================
   * 2️⃣ IMAGE DICODING API
   * =============================== */
  if (
    url.origin.includes("dicoding.dev") &&
    (request.destination === "image" ||
      url.pathname.match(/\.(jpg|jpeg|png|gif|webp)$/i))
  ) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then(async (cache) => {
        const cached = await cache.match(request);

        const networkFetch = fetch(request, { mode: "no-cors" })
          .then((res) => {
            cache.put(request, res.clone());
            return res;
          })
          .catch(() => cached);

        return cached || networkFetch;
      })
    );
    return;
  }

  /* ===============================
   * 3️⃣ APP SHELL & ASSET
   * =============================== */
  event.respondWith(
    caches.match(request).then((cached) => {
      return cached || fetch(request);
    })
  );
});

// Push Notification Handler (Tetap sama)
self.addEventListener("push", (event) => {
  let notificationData = {
    title: "StoryBoard",
    body: "Ada update baru!",
    icon: "/favicon.png",
    badge: "/favicon.png",
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
