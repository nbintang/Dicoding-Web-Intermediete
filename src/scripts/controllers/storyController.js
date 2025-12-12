import { getToken } from "../components/auth.js";

export class StoryController {
  constructor(model, view) {
    this.model = model;
    this.view = view;
  }

  async fetchStories() {
    this.view?.showLoading?.("Sedang mengambil daftar cerita...");

    try {
      const response = await this.model.getStories({
        page: 1,
        size: 20,
        withLocation: true,
      });

      const stories = response?.listStory || [];

      if (!stories.length) {
        this.view?.renderError?.("Belum ada cerita yang tersedia.");
        return;
      }

      this.view?.renderStories?.(stories);
    } catch (err) {
      console.error("[StoryController] Gagal memuat stories:", err);
      this.view?.renderError?.("Gagal memuat daftar cerita.");
    } finally {
      this.view?.hideLoading?.();
    }
  }

  async fetchStoryDetail(storyId) {
    if (!storyId) {
      this.view?.renderError?.("ID cerita tidak ditemukan.");
      return;
    }

    this.view?.showLoading?.("Sedang memuat detail cerita...");

    try {
      const result = await this.model.getDetail(storyId);
      const story = result?.story;

      if (!story) throw new Error("Detail tidak ditemukan.");

      this.view?.renderDetail?.(story);
    } catch (err) {
      console.error("[StoryController] Gagal memuat detail:", err);
      this.view?.renderError?.("Gagal memuat detail cerita.");
    } finally {
      this.view?.hideLoading?.();
    }
  }

  async addStory({ description, file, lat, lon } = {}) {
    if (!description || !file) {
      this.view?.renderError?.("Deskripsi dan gambar wajib diisi.");
      return;
    }

    if (!(file instanceof File) && !(file instanceof Blob)) {
      this.view?.renderError?.("File tidak valid atau rusak.");
      return;
    }

    this.view?.showLoading?.("Mengunggah cerita...");

    try {
      const token = getToken();
      if (!token) throw new Error("Token tidak ditemukan. Silakan login ulang.");

      const formData = new FormData();
      formData.append("description", description);
      formData.append("photo", file);

      if (lat != null && lon != null) {
        formData.append("lat", lat);
        formData.append("lon", lon);
      }

      const response = await fetch("https://story-api.dicoding.dev/v1/stories", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const text = await response.text();

      let json = {};
      try {
        json = text ? JSON.parse(text) : {};
      } catch (_) {
        json = {};
      }

      if (!response.ok) {
        throw new Error(json?.message || text || "Gagal menambah cerita.");
      }

      console.info("[StoryController] Upload sukses:", json);
      this.view?.renderSuccess?.("Cerita berhasil ditambahkan!");

      if (typeof this.view?.onStoryAdded === "function") {
        setTimeout(() => this.view.onStoryAdded(), 1000);
      }
    } catch (err) {
      console.error("[StoryController] Upload gagal:", err);
      this.view?.renderError?.(err.message || "Gagal menambah cerita.");
    } finally {
      this.view?.hideLoading?.();
    }
  }
}
