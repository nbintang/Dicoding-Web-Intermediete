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
import {
  subscribePushNotification,
  unsubscribePushNotification,
} from "./helper/notification.js";

// Inisialisasi IndexedDB
storyDB
  .init()
  .catch((err) => console.warn("[App] IndexedDB init failed:", err));

const appShell = new AppShellView();
appShell.init();

const model = new StoryModel(() => Auth.get());
const router = new Router();

router.register("#/login", () => {
  let view;
  const controller = new AuthController(
    model,
    {
      showLoading: (msg) => view?.showLoading(msg),
      renderError: (err) => view?.renderError(err),
      renderSuccess: (msg) => view?.renderSuccess(msg),
      onLoggedIn: () => (location.hash = "#/stories"),
    },
    Auth
  );
  view = new LoginView(controller);

  appShell.renderNav("#/login");
  return view;
});

router.register("#/register", () => {
  let view;
  const controller = new AuthController(
    model,
    {
      showLoading: (msg) => view?.showLoading(msg),
      renderError: (err) => view?.renderError(err),
      renderSuccess: (msg) => view?.renderSuccess(msg),
      onRegistered: () => (location.hash = "#/login"),
    },
    Auth
  );
  view = new RegisterView(controller);

  appShell.renderNav("#/register");
  return view;
});

router.register("#/logout", async () => {
  const controller = new AuthController(
    model,
    {
      showLoading: () => {},
      renderError: () => {},
      renderSuccess: () => {},
      onLoggedOut: () => (location.hash = "#/login"),
    },
    Auth
  );

  if (window.swRegistration) {
    try {
      await unsubscribePushNotification(window.swRegistration);
    } catch (err) {
      console.warn("[App] Unsubscribe on logout failed:", err);
    }
  }

  controller.handleLogout();
  appShell.renderNav("#/login");
  return new LoginView({});
});

router.register("#/stories", () => {
  let view;
  const controller = new StoryController(model, {
    showLoading: (msg) => view?.showLoading(msg),
    renderError: (err) => view?.renderError(err),
    renderStories: (items) => view?.renderStories(items),
  });
  view = new StoriesView(controller);

  appShell.renderNav("#/stories");
  controller.fetchStories();
  return view;
});

router.register("#/detail", (id) => {
  let view;
  const controller = new StoryController(model, {
    showLoading: (msg) => view?.showLoading(msg),
    renderError: (err) => view?.renderError(err),
    renderDetail: (story) => {
      const main = document.querySelector("#main");
      if (!main) return;
      main.innerHTML = `
        <section class="card">
          <img src="${story.photoUrl}" alt="Foto story oleh ${story.name}" />
          <div class="content">
            <h2>Detail Story</h2>
            <p><strong>Nama:</strong> ${story.name}</p>
            <p>${story.description || ""}</p>
            <p class="meta">Dibuat: ${new Date(story.createdAt).toLocaleString(
              "id-ID"
            )}</p>
            <a class="button" href="#/stories">Kembali</a>
          </div>
        </section>
      `;
    },
  });
  view = new StoriesView(controller);

  appShell.renderNav("#/stories");
  controller.fetchStoryDetail(id);
  return view;
});

router.register("#/add", () => {
  let view;
  const controller = new StoryController(model, {
    showLoading: (msg) => view?.showLoading(msg),
    renderError: (err) => view?.renderError(err),
    renderSuccess: (msg) => view?.renderSuccess(msg),
    onStoryAdded: () => (location.hash = "#/stories"),
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

// Register Service Worker
if ("serviceWorker" in navigator) {
  const swPath = import.meta.env.DEV ? "/public/sw.js" : "/sw.js";

  navigator.serviceWorker
    .register(swPath)
    .then((reg) => {
      console.log("[App] Service Worker registered:", reg.scope);

      // Subscribe push notification setelah user login
      window.addEventListener("hashchange", async () => {
        if (location.hash === "#/stories" && Auth.get()) {
          // Request notification permission
          if (
            "Notification" in window &&
            Notification.permission === "default"
          ) {
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
    .catch((err) =>
      console.warn("[App] Service Worker registration failed:", err)
    );
}
