// offlineStorage.js - IndexedDB wrapper for offline data storage

const DB_NAME = 'sentencease_offline_db';
const DB_VERSION = 1;
const STORES = {
  WORDS: 'words',
  REVIEWS: 'pending_reviews',
  PROGRESS: 'learning_progress'
};

class OfflineStorage {
  constructor() {
    this.db = null;
    this.initDb();
  }

  // Initialize the database
  initDb() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        resolve(this.db);
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create stores if they don't exist
        if (!db.objectStoreNames.contains(STORES.WORDS)) {
          db.createObjectStore(STORES.WORDS, { keyPath: 'contextualMeaningId' });
        }
        
        if (!db.objectStoreNames.contains(STORES.REVIEWS)) {
          db.createObjectStore(STORES.REVIEWS, { 
            keyPath: 'id', 
            autoIncrement: true 
          });
        }
        
        if (!db.objectStoreNames.contains(STORES.PROGRESS)) {
          db.createObjectStore(STORES.PROGRESS, { 
            keyPath: 'id',
            autoIncrement: true
          });
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve(this.db);
      };

      request.onerror = (event) => {
        console.error('IndexedDB error:', event.target.error);
        reject(event.target.error);
      };
    });
  }

  // Get a transaction and object store
  getStore(storeName, mode = 'readonly') {
    return new Promise((resolve, reject) => {
      this.initDb()
        .then(db => {
          const transaction = db.transaction(storeName, mode);
          const store = transaction.objectStore(storeName);
          resolve(store);
        })
        .catch(error => reject(error));
    });
  }

  // Cache words for offline learning
  async cacheWords(words) {
    try {
      const store = await this.getStore(STORES.WORDS, 'readwrite');
      words.forEach(word => {
        store.put(word);
      });
      return true;
    } catch (error) {
      console.error('Error caching words:', error);
      return false;
    }
  }

  // Get cached words
  async getCachedWords() {
    try {
      const store = await this.getStore(STORES.WORDS);
      return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Error getting cached words:', error);
      return [];
    }
  }

  // Cache a single word
  async cacheWord(word) {
    try {
      const store = await this.getStore(STORES.WORDS, 'readwrite');
      store.put(word);
      return true;
    } catch (error) {
      console.error('Error caching word:', error);
      return false;
    }
  }

  // Get a cached word by ID
  async getCachedWord(meaningId) {
    try {
      const store = await this.getStore(STORES.WORDS);
      return new Promise((resolve, reject) => {
        const request = store.get(meaningId);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Error getting cached word:', error);
      return null;
    }
  }

  // Store a pending review for offline use
  async storePendingReview(reviewData) {
    try {
      const store = await this.getStore(STORES.REVIEWS, 'readwrite');
      const timestamp = new Date().toISOString();
      store.add({
        ...reviewData,
        timestamp,
        synced: false
      });
      return true;
    } catch (error) {
      console.error('Error storing pending review:', error);
      return false;
    }
  }

  // Get all pending reviews that need to be synced
  async getPendingReviews() {
    try {
      const store = await this.getStore(STORES.REVIEWS);
      return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => {
          const pendingReviews = request.result.filter(review => !review.synced);
          resolve(pendingReviews);
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Error getting pending reviews:', error);
      return [];
    }
  }

  // Mark reviews as synced
  async markReviewsAsSynced(reviewIds) {
    try {
      const store = await this.getStore(STORES.REVIEWS, 'readwrite');
      
      reviewIds.forEach(id => {
        const request = store.get(id);
        
        request.onsuccess = () => {
          const review = request.result;
          if (review) {
            review.synced = true;
            store.put(review);
          }
        };
      });
      
      return true;
    } catch (error) {
      console.error('Error marking reviews as synced:', error);
      return false;
    }
  }

  // Store learning progress
  async storeProgress(progress) {
    try {
      const store = await this.getStore(STORES.PROGRESS, 'readwrite');
      // Always use ID 1 for the single progress record
      progress.id = 1;
      store.put(progress);
      return true;
    } catch (error) {
      console.error('Error storing progress:', error);
      return false;
    }
  }

  // Get stored learning progress
  async getProgress() {
    try {
      const store = await this.getStore(STORES.PROGRESS);
      return new Promise((resolve, reject) => {
        const request = store.get(1);
        request.onsuccess = () => resolve(request.result || { completed: 0, total: 0 });
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Error getting progress:', error);
      return { completed: 0, total: 0 };
    }
  }

  // Clear all data
  async clearAllData() {
    try {
      const stores = [STORES.WORDS, STORES.REVIEWS, STORES.PROGRESS];
      
      for (const storeName of stores) {
        const store = await this.getStore(storeName, 'readwrite');
        store.clear();
      }
      
      return true;
    } catch (error) {
      console.error('Error clearing all data:', error);
      return false;
    }
  }
}

// Export a singleton instance
const offlineStorage = new OfflineStorage();
export default offlineStorage; 