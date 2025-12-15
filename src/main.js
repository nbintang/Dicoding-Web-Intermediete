// ===== Import Views =====
import { AppShellView } from "./views/AppShellView.js";
import { LoginView } from "./views/LoginView.js";
import { RegisterView } from "./views/RegisterView.js";
import { StoriesView } from "./views/StoriesView.js";
import { AddStoryView } from "./views/AddStoryView.js";
import { SavedView } from "./views/SavedView.js";
import { NotFoundView } from "./views/NotFoundView.js";
import { Router } from "./router.js";
import { StoryModel } from "./api/model.js";
import { Auth } from "./components/auth.js";
import { AuthController } from "./controllers/authController.js";
import { StoryController } from "./controllers/storyController.js";
import { storyDB } from "./api/db.js";

// ===== Offline Detection UI =====
function showOfflineIndicator() {
  let indicator = document.getElementById("offline-indicator");
  if (!indicator) {
    indicator = document.createElement("div");
    indicator.id = "offline-indicator";
    indicator.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: #f59e0b;
      color: white;
      text-align: center;
      padding: 8px;
      font-size: 14px;
      z-index: 9999;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    `;
    indicator.textContent = "📡 Mode Offline - Data mungkin tidak terbaru";
    document.body.prepend(indicator);
  }
}

function hideOfflineIndicator() {
  const indicator = document.getElementById("offline-indicator");
  if (indicator) {
    indicator.remove();
  }
}

// Monitor online/offline status
window.addEventListener("online", () => {
  console.log("[App] ✅ Online");
  hideOfflineIndicator();
  // Refresh data when back online
  if (location.hash === "#/stories") {
    location.reload();
  }
});

window.addEventListener("offline", () => {
  console.log("[App] ❌ Offline");
  showOfflineIndicator();
});

// Check initial state
if (!navigator.onLine) {
  showOfflineIndicator();
}

// ===== Initialize App =====
// Inisialisasi IndexedDB
storyDB.init().catch(err => console.warn("[App] IndexedDB init failed:", err));

const appShell = new AppShellView();
appShell.init();

const model = new StoryModel(() => Auth.get());
const router = new Router();

// ===== Routes =====
router.register("#/login", () => {
  let view;
  const controller = new AuthController(model, {
    showLoading: msg => view?.showLoading(msg),
    renderError: err => view?.renderError(err),
    renderSuccess: msg => view?.renderSuccess(msg),
    onLoggedIn: () => location.hash = "#/stories"
  }, Auth);
  view = new LoginView(controller);

  appShell.renderNav("#/login");
  return view;
});

router.register("#/register", () => {
  let view;
  const controller = new AuthController(model, {
    showLoading: msg => view?.showLoading(msg),
    renderError: err => view?.renderError(err),
    renderSuccess: msg => view?.renderSuccess(msg),
    onRegistered: () => location.hash = "#/login"
  }, Auth);
  view = new RegisterView(controller);

  appShell.renderNav("#/register");
  return view;
});

router.register("#/logout", () => {
  const controller = new AuthController(model, {
    showLoading: () => { },
    renderError: () => { },
    renderSuccess: () => { },
    onLoggedOut: () => location.hash = "#/login"
  }, Auth);

  controller.handleLogout();
  appShell.renderNav("#/login");
  return new LoginView({});
});

router.register("#/stories", () => {
  let view;
  const controller = new StoryController(model, {
    showLoading: msg => view?.showLoading(msg),
    renderError: err => view?.renderError(err),
    renderStories: items => view?.renderStories(items),
  });
  view = new StoriesView(controller);

  appShell.renderNav("#/stories");
  
  // Try to fetch stories with offline fallback
  controller.fetchStories().catch(async (error) => {
    console.warn("[App] Failed to fetch stories, trying IndexedDB...");
    
    // Fallback ke IndexedDB jika API gagal
    try {
      const cachedStories = await storyDB.getAllStories();
      if (cachedStories && cachedStories.length > 0) {
        console.log("[App] ✅ Loaded", cachedStories.length, "stories from IndexedDB");
        view?.renderStories(cachedStories);
        
        // Show notification
        const main = document.querySelector("#main");
        if (main) {
          const notice = document.createElement("div");
          notice.className = "offline-notice";
          notice.style.cssText = `
            background: #fef3c7;
            border: 1px solid #f59e0b;
            padding: 12px;
            margin-bottom: 16px;
            border-radius: 8px;
            text-align: center;
          `;
          notice.innerHTML = `
            <strong>📱 Mode Offline</strong><br>
            <small>Menampilkan ${cachedStories.length} story dari cache</small>
          `;
          main.prepend(notice);
        }
      } else {
        view?.renderError("Tidak ada data tersimpan. Coba sambungkan internet.");
      }
    } catch (dbError) {
      console.error("[App] IndexedDB error:", dbError);
      view?.renderError("Gagal memuat data offline.");
    }
  });
  
  return view;
});

router.register("#/detail", id => {
  let view;
  const controller = new StoryController(model, {
    showLoading: msg => view?.showLoading(msg),
    renderError: err => view?.renderError(err),
    renderDetail: story => {
      const main = document.querySelector("#main");
      if (!main) return;
      main.innerHTML = `
        <section class="card">
          <img src="${story.photoUrl}" alt="Foto story oleh ${story.name}" />
          <div class="content">
            <h2>Detail Story</h2>
            <p><strong>Nama:</strong> ${story.name}</p>
            <p>${story.description || ""}</p>
            <p class="meta">Dibuat: ${new Date(story.createdAt).toLocaleString("id-ID")}</p>
            <a class="button" href="#/stories">Kembali</a>
          </div>
        </section>
      `;
    }
  });
  view = new StoriesView(controller);

  appShell.renderNav("#/stories");
  
  // Try fetch with IndexedDB fallback
  controller.fetchStoryDetail(id).catch(async () => {
    console.warn("[App] Failed to fetch detail, trying IndexedDB...");
    try {
      const story = await storyDB.getStoryById(id);
      if (story) {
        console.log("[App] ✅ Loaded story from IndexedDB");
        const main = document.querySelector("#main");
        if (!main) return;
        main.innerHTML = `
          <div class="offline-notice" style="background: #fef3c7; border: 1px solid #f59e0b; padding: 12px; margin-bottom: 16px; border-radius: 8px; text-align: center;">
            <strong>📱 Mode Offline</strong>
          </div>
          <section class="card">
            <img src="${story.photoUrl}" alt="Foto story oleh ${story.name}" />
            <div class="content">
              <h2>Detail Story</h2>
              <p><strong>Nama:</strong> ${story.name}</p>
              <p>${story.description || ""}</p>
              <p class="meta">Dibuat: ${new Date(story.createdAt).toLocaleString("id-ID")}</p>
              <a class="button" href="#/stories">Kembali</a>
            </div>
          </section>
        `;
      }
    } catch (dbError) {
      console.error("[App] IndexedDB error:", dbError);
    }
  });
  
  return view;
});

router.register("#/add", () => {
  let view;
  const controller = new StoryController(model, {
    showLoading: msg => view?.showLoading(msg),
    renderError: err => view?.renderError(err),
    renderSuccess: msg => view?.renderSuccess(msg),
    onStoryAdded: () => location.hash = "#/stories"
  });
  view = new AddStoryView(controller);

  appShell.renderNav("#/add");
  return view;
});

router.register("#/saved", () => {
  const view = new SavedView();
  appShell.renderNav("#/saved");
  return view;
});

router.register("*", () => new NotFoundView());

router.navigate(location.hash || "#/stories");

// ===== Push Notification Setup =====
const VAPID_PUBLIC_KEY = "BCCs2eonMI-6H2ctvFaWg-UYdDv387Vno_bzUzALpB442r2lCnsHmtrx8biyPi_E-1fSGABK_Qs_GlvPoJJqxbk";

// Helper: Convert VAPID key untuk subscription
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, "+")
    .replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Subscribe Push Notification ke Server
async function subscribePushNotification(registration) {
  try {
    // ✅ CEK ONLINE DULU!
    if (!navigator.onLine) {
      console.log("[Push] Offline, skipping subscription");
      return;
    }

    const token = Auth.get();
    if (!token) {
      console.log("[Push] User not logged in, skipping subscription");
      return;
    }

    // Subscribe ke push notification
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });

    // Kirim subscription ke server
    const response = await fetch("https://story-api.dicoding.dev/v1/notifications/subscribe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        endpoint: subscription.endpoint,
        keys: {
          p256dh: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey("p256dh")))),
          auth: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey("auth"))))
        }
      })
    });

    const result = await response.json();
    if (result.error) {
      console.error("[Push] Failed to subscribe:", result.message);
    } else {
      console.log("[Push] ✅ Successfully subscribed to push notifications");
    }
  } catch (error) {
    console.warn("[Push] Error subscribing (might be offline):", error.message);
  }
}

// ===== Service Worker Registration =====
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js")
      .then(reg => {
        console.log("[App] ✅ Service Worker registered:", reg.scope);
        
        // Force update on new version
        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          console.log("[App] New Service Worker found, installing...");
          
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              console.log("[App] New Service Worker installed, reload to activate");
              // Optional: Show update notification
              if (confirm("Ada update baru! Reload untuk mengaktifkan?")) {
                window.location.reload();
              }
            }
          });
        });
        
        // Subscribe push notification setelah user login
        window.addEventListener("hashchange", async () => {
          if (location.hash === "#/stories" && Auth.get()) {
            // Request notification permission
            if ("Notification" in window && Notification.permission === "default") {
              const permission = await Notification.requestPermission();
              console.log("[App] Notification permission:", permission);
            }
            
            // Subscribe jika permission granted
            if (Notification.permission === "granted") {
              await subscribePushNotification(reg);
            }
          }
        });
      })
      .catch(err => console.warn("[App] ❌ Service Worker registration failed:", err));
  });
}