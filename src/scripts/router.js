import { withViewTransition } from "./components/view-transition.js";

export class Router {
  constructor() {
    this.routes = new Map();
    this.activeView = null;

    window.addEventListener("load", () => this.navigate(location.hash || "#/"));
    // Pantau perubahan hash URL
    window.addEventListener("hashchange", () => this.navigate(location.hash));
  }

  /**
   * Mendaftarkan rute baru ke sistem router
   * @param {string} path - Jalur hash (misal: "#/login")
   * @param {Function} factory - Fungsi pembuat tampilan (View)
   */
  register(path, factory) {
    if (typeof factory !== "function") {
      console.error(`Factory untuk route ${path} bukan fungsi.`);
      return;
    }
    this.routes.set(path, factory);
  }

  /**
   * Menavigasi ke rute tertentu dan merender view terkait
   * @param {string} hash - Hash URL tujuan (misal "#/stories")
   */
  async navigate(hash) {
    const [path, param] = extractHash(hash);

    // Ambil factory berdasarkan route
    const factory = this.routes.get(path) || this.routes.get("*");
    if (!factory) {
      console.warn(`Route tidak ditemukan: ${path}`);
      return;
    }

    // Bersihkan tampilan sebelumnya (jika ada)
    if (this.activeView?.destroy && typeof this.activeView.destroy === "function") {
      try {
        this.activeView.destroy();
      } catch (err) {
        console.warn("Error saat destroy view:", err);
      }
    }

    // Transisi antar halaman dengan animasi
    await withViewTransition(async () => {
      try {
        this.activeView = factory(param);

        if (this.activeView?.render && typeof this.activeView.render === "function") {
          this.activeView.render();
        } else {
          console.error("View tidak memiliki metode render().");
        }

        // Fokus ke elemen utama agar aksesibilitas terjaga
        const main = document.getElementById("main");
        if (main) main.focus();
      } catch (err) {
        console.error("Gagal menavigasi ke route:", err);
      }
    });
  }
}

/**
 * Mengekstrak jalur dan parameter dari hash URL
 * @param {string} hash - Contoh: "#/detail/123"
 * @returns {[string, string|null]} - Misal: ["#/detail", "123"]
 */
function extractHash(hash) {
  const h = hash?.trim() || "#/stories";
  const parts = h.replace(/^#\//, "").split("/");

  if (parts[0] === "detail" && parts[1]) {
    return ["#/detail", parts[1]];
  }

  return [`#/${parts[0] || "stories"}`, null];
}
