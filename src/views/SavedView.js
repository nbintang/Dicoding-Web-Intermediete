import { el, $ } from "../components/dom.js";
import { storyDB } from "../api/db.js";

export class SavedView {
  constructor() {
    this.favorites = [];
  }

  async render() {
    const main = $("#main");
    if (!main) return console.error("[SavedView] #main tidak ditemukan!");

    main.innerHTML = "";

    const section = el("section", { class: "saved-section" }, [
      el("h2", { class: "section-title" }, "⭐ Story Tersimpan"),
      el("p", { class: "helper" }, "Daftar story yang telah kamu simpan"),
      el("div", { id: "status", class: "status", "aria-live": "polite" }),
      el("div", { id: "saved-list", class: "grid modern-grid" }),
    ]);

    main.appendChild(section);

    await this.loadFavorites();
  }

  async loadFavorites() {
    const status = $("#status");
    const list = $("#saved-list");

    if (!status || !list) return;

    status.textContent = "Memuat data tersimpan...";
    status.style.color = "#555";

    try {
      this.favorites = await storyDB.getAllFavorites();

      if (this.favorites.length === 0) {
        status.textContent = "Belum ada story yang disimpan.";
        status.style.color = "#999";
        list.innerHTML = "";
        return;
      }

      status.textContent = "";
      this.renderFavorites();
    } catch (error) {
      console.error("[SavedView] Error loading favorites:", error);
      status.textContent = "Gagal memuat data tersimpan.";
      status.style.color = "#ef4444";
    }
  }

  renderFavorites() {
    const list = $("#saved-list");
    if (!list) return;

    list.innerHTML = "";

    this.favorites.forEach((story) => {
      let src =
        story.photoUrl || "https://via.placeholder.com/400x220?text=No+Image";
      let objectUrl = null;
      if (story.photoBlob) {
        objectUrl = URL.createObjectURL(story.photoBlob);
        src = objectUrl;
      }
      const img = el("img", { src, alt: `Foto story ...`, loading: "lazy" });
      const card = el("article", { class: "card modern-card", tabindex: "0" }, [
        el("div", { class: "img-wrap" }, [
            img
        ]),
        el("div", { class: "content" }, [
          el("h2", { class: "story-title" }, story.name || "Pengguna"),
          el(
            "p",
            { class: "story-desc" },
            story.description || "Tanpa deskripsi"
          ),
          el("p", { class: "meta" }, [
            "Disimpan: ",
            new Date(story.savedAt).toLocaleString("id-ID"),
          ]),
          el("div", { class: "kv", style: "gap:0.5rem" }, [
            el(
              "a",
              {
                class: "button view-btn",
                href: `#/detail/${story.id}`,
                "aria-label": `Lihat detail ${story.name}`,
              },
              "Lihat Detail"
            ),
            el(
              "button",
              {
                class: "button danger",
                "data-id": story.id,
                "aria-label": `Hapus ${story.name} dari tersimpan`,
              },
              "🗑️ Hapus"
            ),
          ]),
        ]),
      ]);

      list.appendChild(card);
        if (objectUrl) {
            // simpan reference to revoke later when removing the element
            img.dataset.objectUrl = objectUrl;
        }
    });

    // Attach event listeners untuk tombol hapus
    list.querySelectorAll("button.danger").forEach((btn) => {
      btn.addEventListener("click", () => this.handleRemove(btn.dataset.id));
    });
  }

  async handleRemove(storyId) {
    if (!confirm("Hapus story ini dari tersimpan?")) return;

    try {
      await storyDB.removeFavorite(storyId);
      console.log("[SavedView] Story removed:", storyId);

      // Reload favorites
      await this.loadFavorites();

      // Show success message
      const status = $("#status");
      if (status) {
        status.textContent = "Story berhasil dihapus!";
        status.style.color = "#16a34a";
        setTimeout(() => {
          status.textContent = "";
        }, 2000);
      }
    } catch (error) {
      console.error("[SavedView] Error removing favorite:", error);
      const status = $("#status");
      if (status) {
        status.textContent = "Gagal menghapus story.";
        status.style.color = "#ef4444";
      }
    }
  }

  destroy() {
    // Cleanup jika perlu
  }
}
