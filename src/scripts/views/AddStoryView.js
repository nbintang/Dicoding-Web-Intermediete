import { el, $ } from "../components/dom.js";
import { createMap, destroyMap, addMarker } from "../components/map.js";
import { CameraController } from "../components/camera.js";

export class AddStoryView {
  constructor(controller) {
    this.controller = controller;
    this._cam = null;
    this._map = null;
    this._marker = null;
    this._picked = null;
  }

  render() {
    const main = $("#main");
    main.innerHTML = "";

    main.append(
      el("section", {}, [
        el("h2", {}, "Tambah Story"),
        el("p", { class: "helper" }, "Ambil foto atau unggah file. Klik peta untuk memilih lokasi."),

        el("form", { id: "addForm", class: "form" }, [
          el("div", {}, [
            el("label", { for: "desc" }, "Deskripsi"),
            el("textarea", {
              id: "desc",
              required: true,
              maxlength: 300,
              "aria-describedby": "descHelp",
              placeholder: "Tulis deskripsi singkat...",
            }),
            el("p", { id: "descHelp", class: "helper" }, "Maksimal 300 karakter."),
          ]),

          el("fieldset", { style: "border:none; padding:0" }, [
            el("legend", {}, "Gambar"),
            el("div", { class: "kv" }, [
              el("label", { for: "fileInput" }, "Pilih file atau ambil gambar:"),
              el("button", { type: "button", id: "openCam", class: "button", "aria-label": "Buka kamera" }, "Buka Kamera"),
              el("button", { type: "button", id: "capture", class: "button primary", "aria-label": "Ambil foto" }, "Jepret"),
              el("button", { type: "button", id: "closeCam", class: "button danger", hidden: true, "aria-label": "Tutup kamera" }, "Tutup Kamera"),
              el("input", { type: "file", id: "fileInput", accept: "image/*" }),
            ]),
            el("div", { class: "kv" }, [
              el("video", { id: "video", playsinline: true, style: "max-width:260px; border-radius:.5rem", "aria-label": "Tampilan kamera" }),
              el("canvas", { id: "canvas", style: "max-width:260px; border-radius:.5rem", "aria-label": "Hasil tangkapan" }),
            ]),
          ]),

          el("fieldset", { style: "border:none; padding:0" }, [
            el("legend", {}, "Lokasi"),
            el("div", { class: "map-wrap" }, [el("div", { id: "map", "aria-label": "Peta pilih lokasi" })]),
            el("p", { class: "helper" }, ["Klik peta untuk memilih lokasi. Posisi: ", el("span", { id: "picked" }, "belum dipilih")]),
          ]),

          el("div", { class: "kv" }, [
            el("button", { type: "submit", class: "button primary" }, "Kirim Story"),
            el("a", { href: "#/stories", class: "button" }, "Batal"),
          ]),

          el("div", { id: "status", "aria-live": "polite" }),
        ]),
      ])
    );

    // Kamera
    this._cam = new CameraController($("#video"), $("#canvas"), $("#capture"));
    $("#openCam").addEventListener("click", async () => {
      await this._cam.start();
      $("#closeCam").hidden = false;
    });
    $("#closeCam").addEventListener("click", () => {
      this._cam.stop();
      $("#closeCam").hidden = true;
    });

    // Peta
    this._map = createMap("map", {
      center: [-2.5, 118],
      zoom: 4,
      onClick: (latlng) => {
        this._picked = latlng;
        $("#picked").textContent = `${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}`;
        if (this._marker) this._map.removeLayer(this._marker);
        this._marker = addMarker(this._map, latlng.lat, latlng.lng, "Lokasi dipilih");
      },
    });

    // Submit
    $("#addForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const desc = $("#desc").value.trim();

      // =======================
      // FIX RESMI REVIEWER
      // =======================
      let camBlob = this._cam?.getBlob ? this._cam.getBlob() : null;

      let file =
        camBlob instanceof Blob && camBlob.size > 0
          ? new File([camBlob], "capture.jpg", { type: "image/jpeg" })
          : $("#fileInput").files[0];

      const lat = this._picked?.lat;
      const lon = this._picked?.lng;

      if (!desc || !file || lat == null || lon == null) {
        this.renderError("Lengkapi semua field (foto, deskripsi, lokasi).");
        return;
      }

      this.showLoading("Mengunggah cerita...");

      try {
        await this.controller.addStory({ description: desc, file, lat, lon });

        // Trigger notification jika permission granted
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("Story Berhasil Ditambahkan! 🎉", {
            body: desc.substring(0, 100),
            icon: "/public/favicon.png",
            badge: "/public/favicon.png",
            vibrate: [200, 100, 200],
          });
        }
      } catch {
        this.renderError("Gagal menambah cerita.");
      }
    });
  }

  showLoading(text) {
    const s = $("#status");
    s.textContent = text;
    s.style.color = "gray";
  }

  renderError(text) {
    const s = $("#status");
    s.textContent = text;
    s.style.color = "red";
  }

  renderSuccess(text) {
    const s = $("#status");
    s.textContent = text;
    s.style.color = "green";
  }

  onStoryAdded() {
    location.hash = "#/stories";
  }

  destroy() {
    destroyMap();
    this._cam?.stop();
  }
}
