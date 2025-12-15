const CACHE_NAME = "story-app-v5";
const API_CACHE = "story-api-cache-v3";
const IMAGE_CACHE = "story-image-cache-v3";

const APP_SHELL = [
  "/",
  "/index.html",
  "/styles/styles.css",
  "/main.js",
  "/router.js",
  "/api/model.js",
  "/api/db.js",
  "/components/auth.js",
  "/components/camera.js",
  "/components/dom.js",
  "/components/map.js",
  "/components/view-transition.js",
  "/controllers/authController.js",
  "/controllers/storyController.js",
  "/views/AppShellView.js",
  "/views/LoginView.js",
  "/views/RegisterView.js",
  "/views/StoriesView.js",
  "/views/AddStoryView.js",
  "/views/SavedView.js",
  "/views/NotFoundView.js",
  "/favicon.png",
  "/manifest.webmanifest",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js",
];

// ===== INSTALL EVENT =====
self.addEventListener("install", (event) => {
  console.log("[SW] Installing v5...");
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL).catch((err) => {
        console.error("[SW] Failed to cache:", err);
      });
    })
  );
  self.skipWaiting();
});

// ===== ACTIVATE EVENT =====
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating v5...");
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
  return self.clients.claim();
});

// ===== FETCH EVENT =====
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Ignore non-http requests
  if (!url.protocol.startsWith("http")) {
    return;
  }

  /* =============================== 
   * 1️⃣ SPA NAVIGATION
   * =============================== */
  if (request.mode === "navigate") {
    event.respondWith(
      caches.match("/index.html")
        .then(cached => cached || fetch(request))
        .catch(() => caches.match("/index.html"))
    );
    return;
  }

  /* =============================== 
   * 2️⃣ API DICODING - NETWORK FIRST WITH CACHE FALLBACK
   * =============================== */
  if (url.origin.includes("story-api.dicoding.dev")) {
    event.respondWith(
      caches.open(API_CACHE).then(async (cache) => {
        try {
          // Try network first
          console.log("[SW] Fetching from network:", url.pathname);
          const networkResponse = await fetch(request.clone());
          
          // Cache successful responses (clone untuk disimpan)
          if (networkResponse && networkResponse.status === 200) {
            console.log("[SW] Caching API response:", url.pathname);
            cache.put(request, networkResponse.clone());
          }
          
          return networkResponse;
        } catch (err) {
          // Network failed, try cache
          console.log("[SW] Network failed, trying cache:", url.pathname);
          const cached = await cache.match(request);
          
          if (cached) {
            console.log("[SW] ✅ Serving from cache (offline):", url.pathname);
            return cached;
          }
          
          // No cache available, return offline response
          console.log("[SW] ❌ No cache available for:", url.pathname);
          return new Response(
            JSON.stringify({
              error: true,
              message: "Tidak ada koneksi internet dan data belum tersimpan di cache.",
              offline: true
            }),
            {
              status: 503,
              statusText: "Service Unavailable",
              headers: { 
                "Content-Type": "application/json",
                "X-Offline": "true"
              }
            }
          );
        }
      })
    );
    return;
  }

  /* =============================== 
   * 3️⃣ IMAGES - CACHE FIRST
   * =============================== */
  if (
    (url.origin.includes("dicoding.dev") || url.origin === location.origin) &&
    (request.destination === "image" ||
      url.pathname.match(/\.(jpg|jpeg|png|gif|webp|svg|ico)$/i))
  ) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then(async (cache) => {
        // Try cache first
        const cached = await cache.match(request);
        if (cached) {
          console.log("[SW] Image from cache:", url.pathname);
          return cached;
        }

        // Fallback to network
        try {
          const networkResponse = await fetch(request, { mode: "no-cors" });
          if (networkResponse && networkResponse.status === 200) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        } catch (err) {
          console.log("[SW] Image not available:", url.pathname);
          // Return transparent pixel as fallback
          return new Response(
            new Blob([new Uint8Array([
              0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00,
              0x80, 0x00, 0x00, 0xFF, 0xFF, 0xFF, 0x00, 0x00, 0x00, 0x21,
              0xF9, 0x04, 0x01, 0x00, 0x00, 0x00, 0x00, 0x2C, 0x00, 0x00,
              0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44,
              0x01, 0x00, 0x3B
            ])]),
            { 
              status: 200,
              headers: { "Content-Type": "image/gif" }
            }
          );
        }
      })
    );
    return;
  }

  /* =============================== 
   * 4️⃣ APP SHELL & ASSETS - CACHE FIRST
   * =============================== */
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        return cached;
      }
      
      return fetch(request)
        .then((response) => {
          // Cache new static assets
          if (response && response.status === 200 && 
              (request.destination === "script" || 
               request.destination === "style" ||
               request.destination === "document")) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          console.log("[SW] Asset not available:", url.pathname);
          return new Response("Offline", { status: 503 });
        });
    })
  );
});

// ===== PUSH NOTIFICATION =====
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
      data: { url: notificationData.url || "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url || "/")
  );
});