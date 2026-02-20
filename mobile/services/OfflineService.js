/**
 * Phase 34: Offline Mode Service
 * Implements local storage, sync queue, and offline capability
 * Supports full app functionality without internet connection
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { Database } from '@nozbe/watermelondb';
import SQLite from 'react-native-sqlite-storage';

class OfflineService {
  constructor() {
    this.db = null;
    this.syncQueue = [];
    this.isOnline = true;
    this.isSyncing = false;
    this.retryCount = 0;
    this.maxRetries = 5;
    this.retryDelay = 1000; // ms
  }

  /**
   * Initialize offline database
   * Creates SQLite database for local storage
   */
  async initializeDatabase() {
    try {
      // Initialize SQLite
      SQLite.openDatabase(
        {
          name: 'erp_offline.db',
          location: 'default',
        },
        (db) => {
          this.db = db;
          this.createTables();
          console.log('✅ Offline database initialized');
        },
        (error) => {
          console.error('❌ Database initialization failed:', error);
        }
      );

      // Monitor network status
      this.unsubscribNetInfo = NetInfo.addEventListener(
        (state) => {
          const wasOnline = this.isOnline;
          this.isOnline = state.isConnected;

          // Trigger sync when reconnecting
          if (!wasOnline && this.isOnline) {
            console.log('🔄 Back online - starting sync');
            this.syncData();
          }
        }
      );

      return true;
    } catch (error) {
      console.error('Failed to initialize database:', error);
      return false;
    }
  }

  /**
   * Create local SQLite tables
   * Mirrors backend schema for offline functionality
   */
  createTables() {
    const tables = [
      // Drivers table
      `CREATE TABLE IF NOT EXISTS drivers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        licenseNumber TEXT,
        status TEXT,
        performanceScore REAL,
        totalViolations INTEGER,
        data JSON,
        syncStatus TEXT DEFAULT 'pending',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME
      )`,

      // GPS Locations table
      `CREATE TABLE IF NOT EXISTS gpsLocations (
        id TEXT PRIMARY KEY,
        driverId TEXT,
        latitude REAL,
        longitude REAL,
        speed REAL,
        accuracy REAL,
        heading REAL,
        timestamp DATETIME,
        syncStatus TEXT DEFAULT 'pending',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        alertType TEXT,
        severity TEXT
      )`,

      // Notifications table
      `CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        userId TEXT,
        title TEXT,
        message TEXT,
        type TEXT,
        priority TEXT,
        isRead INTEGER DEFAULT 0,
        syncStatus TEXT DEFAULT 'pending',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        data JSON
      )`,

      // Offline sync queue
      `CREATE TABLE IF NOT EXISTS syncQueue (
        id TEXT PRIMARY KEY,
        endpoint TEXT NOT NULL,
        method TEXT DEFAULT 'POST',
        payload JSON,
        retryCount INTEGER DEFAULT 0,
        lastRetry DATETIME,
        status TEXT DEFAULT 'pending',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Local cache
      `CREATE TABLE IF NOT EXISTS cache (
        key TEXT PRIMARY KEY,
        value TEXT,
        expiresAt DATETIME,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
    ];

    tables.forEach((table) => {
      this.db.executeSql(
        table,
        [],
        () => console.log('✅ Table created'),
        (error) => console.log('⚠️ Table exists or error:', error)
      );
    });
  }

  /**
   * Store local data with offline support
   */
  async storeData(table, data) {
    try {
      const { id, ...rest } = data;
      const insertQuery = `
        INSERT OR REPLACE INTO ${table} 
        (id, data, syncStatus, createdAt, updatedAt) 
        VALUES (?, ?, ?, ?, ?)
      `;

      return new Promise((resolve, reject) => {
        this.db.executeSql(
          insertQuery,
          [
            id,
            JSON.stringify(rest),
            'pending',
            new Date().toISOString(),
            new Date().toISOString(),
          ],
          () => {
            console.log(`✅ Data stored locally: ${table}`);
            resolve(true);
          },
          (error) => reject(error)
        );
      });
    } catch (error) {
      console.error('❌ Failed to store data:', error);
      throw error;
    }
  }

  /**
   * Retrieve local data
   */
  async getData(table, id = null) {
    try {
      const query = id
        ? `SELECT * FROM ${table} WHERE id = ?`
        : `SELECT * FROM ${table} ORDER BY createdAt DESC`;

      return new Promise((resolve, reject) => {
        this.db.executeSql(
          query,
          id ? [id] : [],
          (result) => {
            const data = [];
            for (let i = 0; i < result.rows.length; i++) {
              data.push(result.rows.item(i));
            }
            resolve(data);
          },
          (error) => reject(error)
        );
      });
    } catch (error) {
      console.error('❌ Failed to retrieve data:', error);
      return [];
    }
  }

  /**
   * Add action to sync queue for later execution
   */
  async queueAction(endpoint, method = 'POST', payload = {}) {
    try {
      const queueItem = {
        id: `${Date.now()}-${Math.random()}`,
        endpoint,
        method,
        payload,
      };

      const insertQuery = `
        INSERT INTO syncQueue 
        (id, endpoint, method, payload, status, createdAt) 
        VALUES (?, ?, ?, ?, ?, ?)
      `;

      return new Promise((resolve, reject) => {
        this.db.executeSql(
          insertQuery,
          [
            queueItem.id,
            endpoint,
            method,
            JSON.stringify(payload),
            'pending',
            new Date().toISOString(),
          ],
          () => {
            console.log(`✅ Action queued: ${endpoint}`);
            this.syncQueue.push(queueItem);
            resolve(queueItem);
          },
          (error) => reject(error)
        );
      });
    } catch (error) {
      console.error('❌ Failed to queue action:', error);
      throw error;
    }
  }

  /**
   * Sync queued data with backend
   */
  async syncData() {
    if (this.isSyncing || !this.isOnline) {
      console.log('⏸️ Sync paused - already syncing or offline');
      return;
    }

    this.isSyncing = true;
    console.log('🔄 Starting sync...');

    try {
      const queue = await this.getQueuedActions();

      for (const item of queue) {
        try {
          await this.executeQueuedAction(item);
          await this.markSynced(item.id);
        } catch (error) {
          await this.incrementRetry(item.id);
        }
      }

      console.log('✅ Sync completed');
      this.retryCount = 0;
    } catch (error) {
      console.error('❌ Sync failed:', error);
      this.retryCount++;

      // Exponential backoff retry
      if (this.retryCount < this.maxRetries) {
        const delay = this.retryDelay * Math.pow(2, this.retryCount);
        setTimeout(() => this.syncData(), delay);
      }
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Get all queued actions
   */
  async getQueuedActions() {
    try {
      return new Promise((resolve, reject) => {
        this.db.executeSql(
          `SELECT * FROM syncQueue WHERE status = 'pending' ORDER BY createdAt ASC`,
          [],
          (result) => {
            const queue = [];
            for (let i = 0; i < result.rows.length; i++) {
              queue.push(result.rows.item(i));
            }
            resolve(queue);
          },
          (error) => reject(error)
        );
      });
    } catch (error) {
      console.error('❌ Failed to get queue:', error);
      return [];
    }
  }

  /**
   * Execute queued action against backend
   */
  async executeQueuedAction(item) {
    try {
      const axios = require('axios');
      const response = await axios({
        method: item.method,
        url: `${process.env.API_URL}${item.endpoint}`,
        data: item.payload,
        timeout: 10000,
      });

      if (response.status >= 200 && response.status < 300) {
        console.log(`✅ Action synced: ${item.endpoint}`);
        return response.data;
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error(`❌ Failed to sync action: ${item.endpoint}`, error);
      throw error;
    }
  }

  /**
   * Mark item as synced
   */
  async markSynced(id) {
    return new Promise((resolve, reject) => {
      this.db.executeSql(
        `UPDATE syncQueue SET status = 'synced', lastRetry = ? WHERE id = ?`,
        [new Date().toISOString(), id],
        () => resolve(true),
        (error) => reject(error)
      );
    });
  }

  /**
   * Increment retry count
   */
  async incrementRetry(id) {
    return new Promise((resolve, reject) => {
      this.db.executeSql(
        `UPDATE syncQueue SET retryCount = retryCount + 1, lastRetry = ? WHERE id = ?`,
        [new Date().toISOString(), id],
        () => resolve(true),
        (error) => reject(error)
      );
    });
  }

  /**
   * Cache API responses
   */
  async cacheResponse(key, value, ttlMinutes = 60) {
    try {
      const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

      return new Promise((resolve, reject) => {
        this.db.executeSql(
          `INSERT OR REPLACE INTO cache (key, value, expiresAt, createdAt) 
           VALUES (?, ?, ?, ?)`,
          [key, JSON.stringify(value), expiresAt.toISOString(), new Date().toISOString()],
          () => resolve(true),
          (error) => reject(error)
        );
      });
    } catch (error) {
      console.error('❌ Failed to cache response:', error);
      return false;
    }
  }

  /**
   * Get cached response
   */
  async getCachedResponse(key) {
    try {
      return new Promise((resolve, reject) => {
        this.db.executeSql(
          `SELECT value, expiresAt FROM cache 
           WHERE key = ? AND expiresAt > datetime('now')`,
          [key],
          (result) => {
            if (result.rows.length > 0) {
              const cached = result.rows.item(0);
              resolve(JSON.parse(cached.value));
            } else {
              resolve(null);
            }
          },
          (error) => reject(error)
        );
      });
    } catch (error) {
      console.error('❌ Failed to get cached response:', error);
      return null;
    }
  }

  /**
   * Clear old cache
   */
  async clearExpiredCache() {
    try {
      return new Promise((resolve, reject) => {
        this.db.executeSql(
          `DELETE FROM cache WHERE expiresAt < datetime('now')`,
          [],
          () => {
            console.log('✅ Expired cache cleared');
            resolve(true);
          },
          (error) => reject(error)
        );
      });
    } catch (error) {
      console.error('❌ Failed to clear cache:', error);
      return false;
    }
  }

  /**
   * Get offline statistics
   */
  async getOfflineStats() {
    try {
      const queue = await this.getQueuedActions();
      const drivers = await this.getData('drivers');
      const locations = await this.getData('gpsLocations');
      const notifications = await this.getData('notifications');

      return {
        queuedActions: queue.length,
        cachedDrivers: drivers.length,
        cachedLocations: locations.length,
        cachedNotifications: notifications.length,
        isOnline: this.isOnline,
        isSyncing: this.isSyncing,
        lastSync: await this.getLastSyncTime(),
      };
    } catch (error) {
      console.error('❌ Failed to get stats:', error);
      return null;
    }
  }

  /**
   * Get last sync timestamp
   */
  async getLastSyncTime() {
    try {
      return new Promise((resolve, reject) => {
        this.db.executeSql(
          `SELECT MAX(lastRetry) as lastSync FROM syncQueue WHERE status = 'synced'`,
          [],
          (result) => {
            if (result.rows.length > 0) {
              resolve(result.rows.item(0).lastSync);
            } else {
              resolve(null);
            }
          },
          (error) => reject(error)
        );
      });
    } catch (error) {
      return null;
    }
  }

  /**
   * Cleanup: Close database and listener
   */
  cleanup() {
    if (this.unsubscribNetInfo) {
      this.unsubscribNetInfo();
    }
    if (this.db) {
      this.db.close();
    }
    console.log('✅ OfflineService cleaned up');
  }
}

export default new OfflineService();
