import { getToken } from "../components/auth.js";
import { storyDB } from "../api/db.js";

export class StoryController {
  constructor(model, view) {
    this.model = model;
    this.view = view;
  }

  async fetchStories() {
    this.view?.showLoading?.("Sedang mengambil daftar cerita...");

    try {
      // Coba fetch dari API
      const response = await this.model.getStories({
        page: 1,
        size: 20,
        withLocation: true,
      });

      const stories = response?.listStory || [];

      if (stories.length > 0) {
        // Simpan ke IndexedDB untuk offline
        await storyDB.putStories(stories);
        this.view?.renderStories?.(stories);
      } else {
        this.view?.renderError?.("Belum ada cerita yang tersedia.");
      }
    } catch (err) {
      console.warn("[StoryController] Gagal fetch dari API, coba dari cache:", err);
      
      // Fallback ke IndexedDB jika offline
      try {
        const cachedStories = await storyDB.getAllStories();
        
        if (cachedStories && cachedStories.length > 0) {
          console.info("[StoryController] Menampilkan data dari cache");
          this.view?.renderStories?.(cachedStories);
          
          // Tampilkan info bahwa ini data offline
          const main = document.querySelector("#main");
          if (main) {
            const offlineNotice = document.createElement("div");
            offlineNotice.className = "offline-notice";
            offlineNotice.innerHTML = "📡 Mode Offline - Menampilkan data tersimpan";
            offlineNotice.style.cssText = "background:#fef3c7;padding:1rem;margin:1rem;border-radius:0.5rem;text-align:center;color:#92400e;font-weight:500;";
            main.insertBefore(offlineNotice, main.firstChild);
          }
        } else {
          this.view?.renderError?.("Tidak ada data tersimpan. Hubungkan ke internet untuk memuat cerita.");
        }
      } catch (dbErr) {
        console.error("[StoryController] Error mengakses IndexedDB:", dbErr);
        this.view?.renderError?.("Gagal memuat data. Periksa koneksi internet Anda.");
      }
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
      // Coba fetch dari API
      const result = await this.model.getDetail(storyId);
      const story = result?.story;

      if (!story) throw new Error("Detail tidak ditemukan.");

      // Simpan ke IndexedDB
      await storyDB.putStory(story);
      this.view?.renderDetail?.(story);
    } catch (err) {
      console.warn("[StoryController] Gagal fetch detail dari API, coba dari cache:", err);
      
      // Fallback ke IndexedDB
      try {
        const cachedStory = await storyDB.getStory(storyId);
        
        if (cachedStory) {
          console.info("[StoryController] Menampilkan detail dari cache");
          this.view?.renderDetail?.(cachedStory);
          
          // Tampilkan info offline di detail
          const main = document.querySelector("#main");
          if (main) {
            const offlineNotice = document.createElement("div");
            offlineNotice.className = "offline-notice";
            offlineNotice.innerHTML = "📡 Mode Offline";
            offlineNotice.style.cssText = "background:#fef3c7;padding:0.75rem;margin-bottom:1rem;border-radius:0.5rem;text-align:center;color:#92400e;font-weight:500;";
            const cardContent = main.querySelector(".card .content");
            if (cardContent) {
              cardContent.insertBefore(offlineNotice, cardContent.firstChild);
            }
          }
        } else {
          this.view?.renderError?.("Detail cerita tidak tersedia offline.");
        }
      } catch (dbErr) {
        console.error("[StoryController] Error mengakses IndexedDB:", dbErr);
        this.view?.renderError?.("Gagal memuat detail cerita.");
      }
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

    // Cek koneksi internet
    if (!navigator.onLine) {
      this.view?.renderError?.("Tidak dapat menambah cerita saat offline. Hubungkan ke internet terlebih dahulu.");
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