/**
 * Offline Storage Service — SQLite-backed local persistence.
 *
 * Uses the expo-sqlite v11 API (openDatabase + execAsync). The
 * original copy of this file was authored against the v13+ async
 * API (openDatabaseAsync / runAsync / getAllAsync / getFirstAsync)
 * which doesn't exist on the installed v11.8 — calls would throw
 * at runtime. Rewritten to the v11 API so offline boot actually
 * works on the current Expo SDK 49 stack.
 */

import * as SQLite from 'expo-sqlite';

const DB_NAME = 'alawael_erp.db';
let db: SQLite.SQLiteDatabase | null = null;

type Row = Record<string, any>;

/**
 * v11 `execAsync` takes an array of {sql, args} and a readOnly
 * flag. Wrap it so callers can pass a single SQL + params pair and
 * get back plain result rows (or throw on error).
 */
async function run(sql: string, args: any[] = [], readOnly = false): Promise<Row[]> {
  if (!db) throw new Error('OfflineStorage: db not initialized');
  const results = await db.execAsync([{ sql, args }], readOnly);
  const first = results[0];
  if ((first as any).error) throw (first as any).error;
  return ((first as any).rows as Row[]) || [];
}

export async function initializeOfflineStorage() {
  try {
    db = SQLite.openDatabase(DB_NAME);
    await createTables();
    console.log('Offline storage initialized');
  } catch (error) {
    console.error('Failed to initialize offline storage:', error);
  }
}

async function createTables() {
  const queries = [
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
    `CREATE TABLE IF NOT EXISTS metrics (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE,
      value REAL,
      trend REAL,
      status TEXT,
      lastUpdated TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      title TEXT,
      message TEXT,
      type TEXT,
      read INTEGER DEFAULT 0,
      createdAt TEXT,
      data TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS sync_queue (
      id TEXT PRIMARY KEY,
      type TEXT,
      action TEXT,
      payload TEXT,
      timestamp TEXT,
      retries INTEGER DEFAULT 0
    )`,
    `CREATE TABLE IF NOT EXISTS user_data (
      key TEXT PRIMARY KEY,
      value TEXT,
      lastUpdated TEXT
    )`,
  ];

  for (const query of queries) {
    try {
      await run(query);
    } catch (error) {
      console.error('Error creating table:', error);
    }
  }
}

export async function saveOrderLocal(order: any) {
  if (!db) return;
  try {
    await run(
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

export async function getLocalOrders() {
  if (!db) return [];
  try {
    const rows = await run('SELECT * FROM orders', [], true);
    return rows.map((order: any) => ({
      ...order,
      items: JSON.parse(order.items),
    }));
  } catch (error) {
    console.error('Error fetching local orders:', error);
    return [];
  }
}

export async function saveNotificationLocal(notification: any) {
  if (!db) return;
  try {
    await run(
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

export async function getLocalNotifications(limit: number = 50) {
  if (!db) return [];
  try {
    const rows = await run(
      `SELECT * FROM notifications ORDER BY createdAt DESC LIMIT ?`,
      [limit],
      true
    );
    return rows.map((n: any) => ({
      ...n,
      read: !!n.read,
      data: n.data ? JSON.parse(n.data) : undefined,
    }));
  } catch (error) {
    console.error('Error fetching local notifications:', error);
    return [];
  }
}

export async function queueForSync(type: string, action: string, payload: any) {
  if (!db) return;
  try {
    const id = `${type}-${action}-${Date.now()}`;
    await run(
      `INSERT INTO sync_queue (id, type, action, payload, timestamp, retries)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, type, action, JSON.stringify(payload), new Date().toISOString(), 0]
    );
  } catch (error) {
    console.error('Error queueing for sync:', error);
  }
}

export async function getSyncQueue() {
  if (!db) return [];
  try {
    return await run('SELECT * FROM sync_queue ORDER BY timestamp ASC', [], true);
  } catch (error) {
    console.error('Error fetching sync queue:', error);
    return [];
  }
}

export async function removefromSyncQueue(id: string) {
  if (!db) return;
  try {
    await run('DELETE FROM sync_queue WHERE id = ?', [id]);
  } catch (error) {
    console.error('Error removing from sync queue:', error);
  }
}

export async function updateSyncRetry(id: string, retries: number) {
  if (!db) return;
  try {
    await run('UPDATE sync_queue SET retries = ? WHERE id = ?', [retries, id]);
  } catch (error) {
    console.error('Error updating sync retry:', error);
  }
}

export async function clearOldData(daysOld: number = 30) {
  if (!db) return;
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    const cutoffIso = cutoffDate.toISOString();
    await run('DELETE FROM notifications WHERE createdAt < ?', [cutoffIso]);
    await run('DELETE FROM sync_queue WHERE timestamp < ? AND retries > 5', [cutoffIso]);
  } catch (error) {
    console.error('Error clearing old data:', error);
  }
}

export async function getDatabaseStats() {
  if (!db) return null;
  try {
    const ordersRows = await run('SELECT COUNT(*) as count FROM orders', [], true);
    const notificationsRows = await run(
      'SELECT COUNT(*) as count FROM notifications',
      [],
      true
    );
    const syncQueueRows = await run(
      'SELECT COUNT(*) as count FROM sync_queue',
      [],
      true
    );
    return {
      orders: ordersRows[0]?.count || 0,
      notifications: notificationsRows[0]?.count || 0,
      syncQueue: syncQueueRows[0]?.count || 0,
    };
  } catch (error) {
    console.error('Error getting database stats:', error);
    return null;
  }
}
