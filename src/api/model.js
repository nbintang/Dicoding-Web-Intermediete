

import { storyDB } from "./db.js";
const BASE_URL = "https://story-api.dicoding.dev/v1";

export class StoryModel {
  constructor(tokenProvider) {
    this.tokenProvider = tokenProvider;
    // Initialize IndexedDB
    storyDB.init().catch(err => {
      console.warn('[StoryModel] IndexedDB init failed:', err);
    });
  }

  // Register user
  async register({ name, email, password }) {
    const res = await fetch(`${BASE_URL}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[StoryModel] REGISTER_FAILED:", err);
      throw new Error("REGISTER_FAILED");
    }

    return res.json();
  }

  // Login user
  async login({ email, password }) {
    const res = await fetch(`${BASE_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[StoryModel] LOGIN_FAILED:", err);
      throw new Error("LOGIN_FAILED");
    }

    const data = await res.json();
    return data?.loginResult?.token;
  }

  // Ambil semua stories - dengan IndexedDB fallback
  async getStories({ page = 1, size = 20, withLocation = true } = {}) {
    const token = this.tokenProvider();
    if (!token) throw new Error("UNAUTHORIZED");

    const url = new URL(`${BASE_URL}/stories`);
    url.searchParams.set("page", page);
    url.searchParams.set("size", size);
    url.searchParams.set("location", withLocation ? "1" : "0");

    try {
      // Try network first
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const err = await res.text();
        console.error("[StoryModel] GET_STORIES_FAILED:", err);
        throw new Error("GET_STORIES_FAILED");
      }

      const data = await res.json();

      // Save to IndexedDB untuk offline access
      if (data.listStory && data.listStory.length > 0) {
        await storyDB.putStories(data.listStory).catch(err => {
          console.warn('[StoryModel] Failed to cache stories:', err);
        });
      }

      return data;
    } catch (error) {
      console.warn('[StoryModel] Network failed, trying IndexedDB:', error);

      // Fallback ke IndexedDB jika offline
      try {
        const cachedStories = await storyDB.getAllStories();
        if (cachedStories.length > 0) {
          console.info('[StoryModel] Serving from IndexedDB cache');
          return {
            error: false,
            message: "Stories loaded from cache (offline)",
            listStory: cachedStories
          };
        }
      } catch (dbError) {
        console.error('[StoryModel] IndexedDB also failed:', dbError);
      }

      throw error;
    }
  }

  // Detail story - dengan IndexedDB fallback
  async getDetail(id) {
    const token = this.tokenProvider();
    if (!token) throw new Error("UNAUTHORIZED");

    try {
      const res = await fetch(`${BASE_URL}/stories/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const err = await res.text();
        console.error("[StoryModel] DETAIL_FAILED:", err);
        throw new Error("DETAIL_FAILED");
      }

      return res.json();
    } catch (error) {
      console.warn('[StoryModel] Network failed for detail, trying IndexedDB:', error);

      // Fallback ke IndexedDB
      try {
        const cachedStory = await storyDB.getStory(id);
        if (cachedStory) {
          console.info('[StoryModel] Serving detail from IndexedDB');
          return {
            error: false,
            message: "Story loaded from cache (offline)",
            story: cachedStory
          };
        }
      } catch (dbError) {
        console.error('[StoryModel] IndexedDB fetch failed:', dbError);
      }

      throw error;
    }
  }

  // Tambah story baru - save to IndexedDB first
  async addStory({ description, file, lat, lon }) {
    const token = this.tokenProvider();
    if (!token) throw new Error("UNAUTHORIZED");

    const formData = new FormData();
    formData.append("description", description);
    if (file) formData.append("photo", file);
    if (lat != null) formData.append("lat", lat);
    if (lon != null) formData.append("lon", lon);

    const res = await fetch(`${BASE_URL}/stories`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const text = await res.text();
    let json = {};

    try {
      json = text ? JSON.parse(text) : {};
    } catch (_) {
      json = {};
    }

    if (!res.ok) {
      console.error("[StoryModel] ADD_STORY_FAILED:", text);
      throw new Error(json?.message || text || "Gagal menambah cerita.");
    }

    console.info("[StoryModel] ADD_STORY_SUCCESS:", json);

    // Optionally save to IndexedDB (will be synced when fetching stories again)
    // We don't have the full story object here, so we'll let next getStories() sync it

    return json;
  }
}

