const CACHE_NAME = "story-cache-v2";
const API_CACHE = "story-api-cache-v1";

// App Shell - semua assets yang dibutuhkan untuk offline
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
  "/scripts/views/NotFoundView.js",
  "/public/favicon.png",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js",
];

// Install - cache app shell
self.addEventListener("install", (event) => {
  console.log("[SW] Installing service worker...");
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[SW] Caching app shell");
      return cache.addAll(APP_SHELL).catch((err) => {
        console.error("[SW] Failed to cache some resources:", err);
        // Don't fail completely if some resources fail
        return Promise.resolve();
      });
    }).then(() => {
      console.log("[SW] App shell cached successfully");
      return self.skipWaiting();
    })
  );
});

// Activate - cleanup old caches
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating service worker...");
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== API_CACHE) {
            console.log("[SW] Deleting old cache:", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log("[SW] Service worker activated");
      return self.clients.claim();
    })
  );
});

// Fetch - strategy: Cache-First untuk static, Network-First untuk API
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API requests - Network First dengan fallback ke cache
  if (url.origin.includes("dicoding.dev")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone response untuk cache
          const responseClone = response.clone();
          caches.open(API_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // Fallback ke cache jika offline
          return caches.match(request).then((cached) => {
            if (cached) {
              console.log("[SW] Serving from API cache:", request.url);
              return cached;
            }
            // Return offline page atau error response
            return new Response(
              JSON.stringify({ error: "Offline, no cached data" }),
              {
                status: 503,
                headers: { "Content-Type": "application/json" }
              }
            );
          });
        })
    );
    return;
  }

  // Static assets - Cache First dengan fallback ke network
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        return cached;
      }

      return fetch(request).then((response) => {
        // Cache successful responses
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      }).catch((err) => {
        console.error("[SW] Fetch failed:", request.url, err);
        // Jika request gagal dan tidak ada di cache, return error
        return new Response("Offline", { status: 503 });
      });
    })
  );
});

// Push Notification Handler
self.addEventListener("push", (event) => {
  console.log("[SW] Push notification received");

  let notificationData = {
    title: "StoryBoard",
    body: "Ada update baru!",
    icon: "/public/favicon.png",
    badge: "/public/favicon.png",
  };

  // Parse data jika ada
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
    })
  );
});

// Notification Click Handler
self.addEventListener("notificationclick", (event) => {
  console.log("[SW] Notification clicked");
  event.notification.close();

  event.waitUntil(
    clients.openWindow("/")
  );
});
