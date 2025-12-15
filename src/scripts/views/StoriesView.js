import { el, $ } from "../components/dom.js";
import { createMap, destroyMap, addMarker } from "../components/map.js";
import { storyDB } from "../api/db.js";

export class StoriesView {
  constructor(presenter) {
    this.presenter = presenter;
    this._map = null;
  }

  render() {
    const main = $("#main");
    if (!main) return console.error("[StoriesView] #main tidak ditemukan!");

    main.innerHTML = "";

    const section = el("section", { class: "stories-section" }, [
      el("h2", { class: "section-title" }, "📖 Stories Terbaru"),
      el("div", {
        id: "status",
        class: "status modern-status",
        "aria-live": "polite",
      }),
      el("div", { id: "list", class: "grid modern-grid" }),
      el("div", { class: "map-wrap modern-map" }, [el("div", { id: "map" })]),
    ]);

    main.appendChild(section);

    if (this.presenter?.fetchStories) this.presenter.fetchStories();
  }

  showLoading(text = "Sedang memuat...") {
    const status = $("#status");
    if (!status) return;
    status.textContent = text;
    status.style.color = "#555";
    status.style.fontStyle = "italic";
  }

  hideLoading() {
    const status = $("#status");
    if (status) {
      status.textContent = "";
    }
  }

  renderError(message = "Terjadi kesalahan.") {
    const status = $("#status");
    if (status) {
      status.textContent = message;
      status.style.color = "#ef4444";
      status.style.fontWeight = "600";
    }

    const list = $("#list");
    if (list) list.innerHTML = "";
    destroyMap();
  }

  renderSuccess(message) {
    const status = $("#status");
    if (!status) return;
    status.textContent = message;
    status.style.color = "#16a34a";
    status.style.fontWeight = "600";
  }

  async renderStories(items = []) {
    const list = $("#list");
    if (!list) return;

    list.innerHTML = "";
    destroyMap();

    this._map = createMap("map", { center: [-2.5, 118], zoom: 4 });

    if (!items.length) {
      $("#status").textContent = "Belum ada story.";
      return;
    }

    // ✅ Loop dengan async untuk cek favorite
    for (const story of items) {
      // Cek apakah sudah di-favorite
      let isFav = false;
      try {
        isFav = await storyDB.isFavorite(story.id);
      } catch (err) {
        console.warn("[StoriesView] Error checking favorite:", err);
      }
      let src =
        story.photoUrl || "https://via.placeholder.com/400x220?text=No+Image";
      let objectUrl = null;
      if (story.photoBlob) {
        objectUrl = URL.createObjectURL(story.photoBlob);
        src = objectUrl;
      }
      const img = el("img", { src, alt: `Foto story ...`, loading: "lazy" });
      const card = el("article", { class: "card modern-card", tabindex: "0" }, [
        el("div", { class: "img-wrap" }, [img]),
        el("div", { class: "content" }, [
          el("h2", { class: "story-title" }, story.name || "Pengguna"),
          el(
            "p",
            { class: "story-desc" },
            story.description || "Tanpa deskripsi"
          ),
          el("p", { class: "meta" }, [
            "ID: ",
            el("code", {}, story.id || "-"),
            " • ",
            new Date(story.createdAt).toLocaleString("id-ID"),
          ]),
          el("div", { class: "kv", style: "gap:0.5rem" }, [
            el(
              "a",
              {
                class: "button view-btn",
                href: `#/detail/${story.id}`,
                "aria-label": `Lihat detail ${story.name}`,
              },
              "Lihat detail"
            ),
            el(
              "button",
              {
                class: isFav ? "button success" : "button primary",
                "data-id": story.id,
                "data-story": JSON.stringify(story),
                "aria-label": isFav ? `Sudah disimpan` : `Simpan ${story.name}`,
                disabled: isFav,
              },
              isFav ? "✓ Tersimpan" : "⭐ Simpan"
            ),
          ]),
        ]),
      ]);

      list.appendChild(card);
      if (objectUrl) {
        // simpan reference to revoke later when removing the element
        img.dataset.objectUrl = objectUrl;
      }
      if (typeof story.lat === "number" && typeof story.lon === "number") {
        addMarker(
          this._map,
          story.lat,
          story.lon,
          `<b>${story.name || "Pengguna"}</b><br/>${story.description || ""}`
        );
      }
    }

    // ✅ Attach event listeners untuk tombol save
    list.querySelectorAll("button[data-id]").forEach((btn) => {
      btn.addEventListener("click", () => this.handleSave(btn));
    });

    // Clear status setelah render
    const status = $("#status");
    if (status) status.textContent = "";
  }

  async handleSave(button) {
    const storyId = button.dataset.id;

    // Cek jika sudah disabled (sudah tersimpan)
    if (button.disabled) return;

    try {
      const story = JSON.parse(button.dataset.story);
      await storyDB.addFavorite(story);
      console.log("[StoriesView] Story saved:", storyId);

      // Update button
      button.textContent = "✓ Tersimpan";
      button.className = "button success";
      button.disabled = true;

      // Show success message
      const status = $("#status");
      if (status) {
        status.textContent = "Story berhasil disimpan!";
        status.style.color = "#16a34a";
        status.style.fontWeight = "600";
        setTimeout(() => {
          status.textContent = "";
        }, 2000);
      }
    } catch (error) {
      console.error("[StoriesView] Error saving story:", error);
      const status = $("#status");
      if (status) {
        status.textContent = "Gagal menyimpan story.";
        status.style.color = "#ef4444";
      }
    }
  }

  destroy() {
    document.querySelectorAll("img[data-object-url]").forEach((img) => {
      const u = img.dataset.objectUrl;
      if (u) URL.revokeObjectURL(u);
    });
    destroyMap();
    const list = $("#list");
    if (list) list.innerHTML = "";
  }
}
