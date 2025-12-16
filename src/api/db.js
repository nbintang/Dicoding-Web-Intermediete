// IndexedDB Helper untuk Story Management
// Menyediakan CRUD operations untuk offline storage

import { fetchImageAsBlob } from "../helper/fetchImageAsBlob";

const DB_NAME = "StoryDB";
const DB_VERSION = 4; // ✅ Bump version untuk migration
const STORE_NAME = "stories";
const FAVORITE_STORE = "favorites"; // ✅ Store baru untuk favorites

export class StoryDB {
  constructor() {
    this.db = null;
  }

  /**
   * Initialize database connection
   */
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error("[StoryDB] Error opening database:", request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.info("[StoryDB] Database opened successfully");
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create stories store if it doesn't exist
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const objectStore = db.createObjectStore(STORE_NAME, {
            keyPath: "id",
          });
          objectStore.createIndex("createdAt", "createdAt", { unique: false });
          objectStore.createIndex("name", "name", { unique: false });
          console.info("[StoryDB] Stories store created");
        }

        // ✅ Create favorites store if it doesn't exist
        if (!db.objectStoreNames.contains(FAVORITE_STORE)) {
          const favoriteStore = db.createObjectStore(FAVORITE_STORE, {
            keyPath: "id",
          });
          favoriteStore.createIndex("savedAt", "savedAt", { unique: false });
          console.info("[StoryDB] Favorites store created");
        }
      };
    });
  }

  /**
   * Ensure database is initialized
   */
  async ensureDB() {
    if (!this.db) {
      await this.init();
    }
    return this.db;
  }

  /**
   * Add or update a story
   */
  async putStory(story) {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(story);

      request.onsuccess = () => {
        console.info("[StoryDB] Story saved:", story.id);
        resolve(story.id);
      };

      request.onerror = () => {
        console.error("[StoryDB] Error saving story:", request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Add multiple stories at once
   */
async putStories(stories) {
  const db = await this.ensureDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    let successCount = 0;
    let errorCount = 0;

    // helper kecil untuk setiap story
    const processOne = async (story) => {
      try {
        // coba ambil blob tapi jangan blokir semuanya: jika gagal, tetap simpan story tanpa blob
        const blob = await fetchImageAsBlob(story.photoUrl).catch(()=>null);
        const toSave = { ...story, photoBlob: blob || null };
        const req = store.put(toSave);
        req.onsuccess = () => successCount++;
        req.onerror = () => errorCount++;
      } catch (e) {
        errorCount++;
      }
    };

    // jalankan seri atau paralel (gunakan Promise.allSettled)
    (async () => {
      const promises = stories.map(s => processOne(s));
      await Promise.allSettled(promises);
      // transaction.oncomplete akan dipicu lalu resolve di bawah
    })();

    transaction.oncomplete = () => {
      console.info(`[StoryDB] Saved ${successCount} stories, ${errorCount} errors`);
      resolve({ successCount, errorCount });
    };
    transaction.onerror = () => {
      console.error('[StoryDB] Transaction error:', transaction.error);
      reject(transaction.error);
    };
  });
}


  /**
   * Get all stories
   */
  async getAllStories() {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        console.info("[StoryDB] Retrieved", request.result.length, "stories");
        resolve(request.result);
      };

      request.onerror = () => {
        console.error("[StoryDB] Error getting stories:", request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get a single story by ID
   */
  async getStory(id) {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => {
        if (request.result) {
          console.info("[StoryDB] Retrieved story:", id);
        } else {
          console.warn("[StoryDB] Story not found:", id);
        }
        resolve(request.result);
      };

      request.onerror = () => {
        console.error("[StoryDB] Error getting story:", request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Delete a story
   */
  async deleteStory(id) {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => {
        console.info("[StoryDB] Story deleted:", id);
        resolve();
      };

      request.onerror = () => {
        console.error("[StoryDB] Error deleting story:", request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Clear all stories
   */
  async clearAll() {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => {
        console.info("[StoryDB] All stories cleared");
        resolve();
      };

      request.onerror = () => {
        console.error("[StoryDB] Error clearing stories:", request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Count total stories
   */
  async count() {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.count();

      request.onsuccess = () => {
        console.info("[StoryDB] Total stories:", request.result);
        resolve(request.result);
      };

      request.onerror = () => {
        console.error("[StoryDB] Error counting stories:", request.error);
        reject(request.error);
      };
    });
  }

  // ===== FAVORITE METHODS =====

  /**
   * Add story to favorites
   */

async addFavorite(story) {
  const db = await this.ensureDB();
  return new Promise(async (resolve, reject) => {
    try {
      let photoBlob = null;
      try {
        photoBlob = await fetchImageAsBlob(story.photoUrl);
      } catch (e) {
        console.warn('[StoryDB] Gagal ambil gambar untuk disimpan:', e);
        photoBlob = null;
      }

      const transaction = db.transaction([FAVORITE_STORE], 'readwrite');
      const store = transaction.objectStore(FAVORITE_STORE);
      const favoriteStory = {
        ...story,
        savedAt: new Date().toISOString(),
        photoBlob // Blob atau null
      };
      const request = store.put(favoriteStory);

      request.onsuccess = () => {
        console.info('[StoryDB] Story added to favorites:', story.id);
        resolve(story.id);
      };
      request.onerror = () => {
        console.error('[StoryDB] Error adding favorite:', request.error);
        reject(request.error);
      };
    } catch (err) {
      reject(err);
    }
  });
}
  /**
   * Get all favorite stories
   */
  async getAllFavorites() {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([FAVORITE_STORE], "readonly");
      const store = transaction.objectStore(FAVORITE_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        console.info("[StoryDB] Retrieved", request.result.length, "favorites");
        resolve(request.result);
      };

      request.onerror = () => {
        console.error("[StoryDB] Error getting favorites:", request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Check if story is favorited
   */
  async isFavorite(id) {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([FAVORITE_STORE], "readonly");
      const store = transaction.objectStore(FAVORITE_STORE);
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(!!request.result);
      };

      request.onerror = () => {
        console.error("[StoryDB] Error checking favorite:", request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Remove story from favorites
   */
  async removeFavorite(id) {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([FAVORITE_STORE], "readwrite");
      const store = transaction.objectStore(FAVORITE_STORE);
      const request = store.delete(id);

      request.onsuccess = () => {
        console.info("[StoryDB] Story removed from favorites:", id);
        resolve();
      };

      request.onerror = () => {
        console.error("[StoryDB] Error removing favorite:", request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Count favorite stories
   */
  async countFavorites() {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([FAVORITE_STORE], "readonly");
      const store = transaction.objectStore(FAVORITE_STORE);
      const request = store.count();

      request.onsuccess = () => {
        console.info("[StoryDB] Total favorites:", request.result);
        resolve(request.result);
      };

      request.onerror = () => {
        console.error("[StoryDB] Error counting favorites:", request.error);
        reject(request.error);
      };
    });
  }
}

// Export singleton instance
export const storyDB = new StoryDB();
