/**
 * Offline Storage Service
 * SQLite-based local data persistence
 */

import * as SQLite from 'expo-sqlite';

const DB_NAME = 'alawael_erp.db';
let db: SQLite.SQLiteDatabase | null = null;

/**
 * Initialize offline database
 */
export async function initializeOfflineStorage() {
  try {
    db = await SQLite.openDatabaseAsync(DB_NAME);

    // Create tables
    await createTables();

    console.log('Offline storage initialized');
  } catch (error) {
    console.error('Failed to initialize offline storage:', error);
  }
}

/**
 * Create database tables
 */
async function createTables() {
  if (!db) return;

  const queries = [
    // Orders table
    `CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      orderNumber TEXT UNIQUE,
      customerId TEXT,
      totalAmount REAL,
      status TEXT,
      items TEXT,
      createdAt TEXT,
      updatedAt TEXT,
      synced INTEGER DEFAULT 0
    )`,

    // Reports table
    `CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      name TEXT,
      type TEXT,
      format TEXT,
      status TEXT,
      fileUrl TEXT,
      createdAt TEXT,
      synced INTEGER DEFAULT 0
    )`,

    // Analytics metrics table
    `CREATE TABLE IF NOT EXISTS metrics (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE,
      value REAL,
      trend REAL,
      status TEXT,
      lastUpdated TEXT
    )`,

    // Notifications table
    `CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      title TEXT,
      message TEXT,
      type TEXT,
      read INTEGER DEFAULT 0,
      createdAt TEXT,
      data TEXT
    )`,

    // Sync queue table
    `CREATE TABLE IF NOT EXISTS sync_queue (
      id TEXT PRIMARY KEY,
      type TEXT,
      action TEXT,
      payload TEXT,
      timestamp TEXT,
      retries INTEGER DEFAULT 0
    )`,

    // User data table
    `CREATE TABLE IF NOT EXISTS user_data (
      key TEXT PRIMARY KEY,
      value TEXT,
      lastUpdated TEXT
    )`,
  ];

  for (const query of queries) {
    try {
      await db.execAsync(query);
    } catch (error) {
      console.error('Error creating table:', error);
    }
  }
}

/**
 * Save order locally
 */
export async function saveOrderLocal(order: any) {
  if (!db) return;

  try {
    await db.runAsync(
      `INSERT OR REPLACE INTO orders 
       (id, orderNumber, customerId, totalAmount, status, items, createdAt, updatedAt, synced)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        order.id,
        order.orderNumber,
        order.customerId,
        order.totalAmount,
        order.status,
        JSON.stringify(order.items),
        order.createdAt,
        order.updatedAt,
        order.synced || 0,
      ]
    );
  } catch (error) {
    console.error('Error saving order:', error);
  }
}

/**
 * Get all local orders
 */
export async function getLocalOrders() {
  if (!db) return [];

  try {
    const result = await db.getAllAsync<any>('SELECT * FROM orders');
    return result.map((order) => ({
      ...order,
      items: JSON.parse(order.items),
    }));
  } catch (error) {
    console.error('Error fetching local orders:', error);
    return [];
  }
}

/**
 * Save notification locally
 */
export async function saveNotificationLocal(notification: any) {
  if (!db) return;

  try {
    await db.runAsync(
      `INSERT INTO notifications 
       (id, title, message, type, read, createdAt, data)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        notification.id,
        notification.title,
        notification.message,
        notification.type,
        notification.read ? 1 : 0,
        notification.createdAt,
        notification.data ? JSON.stringify(notification.data) : null,
      ]
    );
  } catch (error) {
    console.error('Error saving notification:', error);
  }
}

/**
 * Get all local notifications
 */
export async function getLocalNotifications(limit: number = 50) {
  if (!db) return [];

  try {
    const result = await db.getAllAsync<any>(
      `SELECT * FROM notifications ORDER BY createdAt DESC LIMIT ?`,
      [limit]
    );
    return result.map((n) => ({
      ...n,
      read: !!n.read,
      data: n.data ? JSON.parse(n.data) : undefined,
    }));
  } catch (error) {
    console.error('Error fetching local notifications:', error);
    return [];
  }
}

/**
 * Queue action for sync
 */
export async function queueForSync(type: string, action: string, payload: any) {
  if (!db) return;

  try {
    const id = `${type}-${action}-${Date.now()}`;
    await db.runAsync(
      `INSERT INTO sync_queue (id, type, action, payload, timestamp, retries)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        id,
        type,
        action,
        JSON.stringify(payload),
        new Date().toISOString(),
        0,
      ]
    );
  } catch (error) {
    console.error('Error queueing for sync:', error);
  }
}

/**
 * Get sync queue
 */
export async function getSyncQueue() {
  if (!db) return [];

  try {
    return await db.getAllAsync<any>('SELECT * FROM sync_queue ORDER BY timestamp ASC');
  } catch (error) {
    console.error('Error fetching sync queue:', error);
    return [];
  }
}

/**
 * Remove from sync queue
 */
export async function removefromSyncQueue(id: string) {
  if (!db) return;

  try {
    await db.runAsync('DELETE FROM sync_queue WHERE id = ?', [id]);
  } catch (error) {
    console.error('Error removing from sync queue:', error);
  }
}

/**
 * Update sync retry count
 */
export async function updateSyncRetry(id: string, retries: number) {
  if (!db) return;

  try {
    await db.runAsync('UPDATE sync_queue SET retries = ? WHERE id = ?', [retries, id]);
  } catch (error) {
    console.error('Error updating sync retry:', error);
  }
}

/**
 * Clear old data
 */
export async function clearOldData(daysOld: number = 30) {
  if (!db) return;

  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    const cutoffIso = cutoffDate.toISOString();

    await db.runAsync('DELETE FROM notifications WHERE createdAt < ?', [cutoffIso]);
    await db.runAsync('DELETE FROM sync_queue WHERE timestamp < ? AND retries > 5', [cutoffIso]);
  } catch (error) {
    console.error('Error clearing old data:', error);
  }
}

/**
 * Get database stats
 */
export async function getDatabaseStats() {
  if (!db) return null;

  try {
    const orders = await db.getFirstAsync<any>('SELECT COUNT(*) as count FROM orders');
    const notifications = await db.getFirstAsync<any>(
      'SELECT COUNT(*) as count FROM notifications'
    );
    const syncQueue = await db.getFirstAsync<any>('SELECT COUNT(*) as count FROM sync_queue');

    return {
      orders: orders?.count || 0,
      notifications: notifications?.count || 0,
      syncQueue: syncQueue?.count || 0,
    };
  } catch (error) {
    console.error('Error getting database stats:', error);
    return null;
  }
}
