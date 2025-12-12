import { el, $ } from "../components/dom.js";
import { createMap, destroyMap, addMarker } from "../components/map.js";

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
      el("h1", { class: "section-title" }, "📖 Stories Terbaru"),
      el("div", { id: "status", class: "status modern-status", "aria-live": "polite" }),
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

  renderError(message = "Terjadi kesalahan.") {
    const status = $("#status");
    if (status) {
      status.textContent = message;
      status.style.color = "#ef4444";
      status.style.fontWeight = "600";
    }

    $("#list")?.innerHTML && ( $("#list").innerHTML = "" );
    destroyMap();
  }

  renderSuccess(message) {
    const status = $("#status");
    if (!status) return;
    status.textContent = message;
    status.style.color = "#16a34a";
    status.style.fontWeight = "600";
  }

  renderStories(items = []) {
    const list = $("#list");
    if (!list) return;

    list.innerHTML = "";
    destroyMap();

    this._map = createMap("map", { center: [-2.5, 118], zoom: 4 });

    if (!items.length) {
      $("#status").textContent = "Belum ada story.";
      return;
    }

    items.forEach(story => {
      const card = el("article", { class: "card modern-card", tabindex: "0" }, [
        el("div", { class: "img-wrap" }, [
          el("img", {
            src: story.photoUrl || "https://via.placeholder.com/400x220?text=No+Image",
            alt: `Foto story oleh ${story.name || "Pengguna"}`,
            loading: "lazy",
          }),
        ]),
        el("div", { class: "content" }, [
          el("h3", { class: "story-title" }, story.name || "Pengguna"),
          el("p", { class: "story-desc" }, story.description || "Tanpa deskripsi"),
          el("p", { class: "meta" }, [
            "ID: ", el("code", {}, story.id || "-"), " • ",
            new Date(story.createdAt).toLocaleString("id-ID"),
          ]),
          el("a", { class: "button view-btn", href: `#/detail/${story.id}` }, "Lihat detail"),
        ]),
      ]);

      list.appendChild(card);

      if (typeof story.lat === "number" && typeof story.lon === "number") {
        addMarker(this._map, story.lat, story.lon, `<b>${story.name || "Pengguna"}</b><br/>${story.description || ""}`);
      }
    });

    $("#status").textContent = "";
  }

  destroy() {
    destroyMap();
    $("#list")?.innerHTML && ( $("#list").innerHTML = "" );
  }
}
