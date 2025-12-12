// IndexedDB Helper untuk Story Management
// Menyediakan CRUD operations untuk offline storage

const DB_NAME = 'StoryDB';
const DB_VERSION = 3;
const STORE_NAME = 'stories';

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
        console.error('[StoryDB] Error opening database:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.info('[StoryDB] Database opened successfully');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const objectStore = db.createObjectStore(STORE_NAME, { 
            keyPath: 'id' 
          });
          
          // Create indexes for efficient querying
          objectStore.createIndex('createdAt', 'createdAt', { unique: false });
          objectStore.createIndex('name', 'name', { unique: false });
          
          console.info('[StoryDB] Object store created');
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
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(story);

      request.onsuccess = () => {
        console.info('[StoryDB] Story saved:', story.id);
        resolve(story.id);
      };

      request.onerror = () => {
        console.error('[StoryDB] Error saving story:', request.error);
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

      stories.forEach(story => {
        const request = store.put(story);
        request.onsuccess = () => successCount++;
        request.onerror = () => errorCount++;
      });

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
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        console.info('[StoryDB] Retrieved', request.result.length, 'stories');
        resolve(request.result);
      };

      request.onerror = () => {
        console.error('[StoryDB] Error getting stories:', request.error);
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
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => {
        if (request.result) {
          console.info('[StoryDB] Retrieved story:', id);
        } else {
          console.warn('[StoryDB] Story not found:', id);
        }
        resolve(request.result);
      };

      request.onerror = () => {
        console.error('[StoryDB] Error getting story:', request.error);
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
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => {
        console.info('[StoryDB] Story deleted:', id);
        resolve();
      };

      request.onerror = () => {
        console.error('[StoryDB] Error deleting story:', request.error);
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
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => {
        console.info('[StoryDB] All stories cleared');
        resolve();
      };

      request.onerror = () => {
        console.error('[StoryDB] Error clearing stories:', request.error);
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
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.count();

      request.onsuccess = () => {
        console.info('[StoryDB] Total stories:', request.result);
        resolve(request.result);
      };

      request.onerror = () => {
        console.error('[StoryDB] Error counting stories:', request.error);
        reject(request.error);
      };
    });
  }
}

// Export singleton instance
export const storyDB = new StoryDB();
