/**
 * OfflineStorageService.test.ts — behavior tests against the
 * expo-sqlite v11 API (openDatabase + execAsync([{sql, args}], readOnly)).
 *
 * The previous copy of this file mocked the v13+ async API and
 * didn't match the service's current wire shape. Rewrote to mock
 * the v11 surface actually in use, and to focus on JSON
 * serialization / parsing behavior where real bugs hide — not on
 * asserting that execAsync was called (tautological with mocks).
 */

import * as SQLite from 'expo-sqlite';
import {
  initializeOfflineStorage,
  saveOrderLocal,
  getLocalOrders,
  saveNotificationLocal,
  getLocalNotifications,
  queueForSync,
  getSyncQueue,
  removefromSyncQueue,
  updateSyncRetry,
  getDatabaseStats,
} from '../OfflineStorageService';

jest.mock('expo-sqlite');

type ExecCall = { sql: string; args: any[] };

describe('OfflineStorageService (v11 execAsync)', () => {
  let calls: ExecCall[] = [];
  let rowsForNextRead: any[] = [];

  beforeEach(async () => {
    calls = [];
    rowsForNextRead = [];

    const mockDb = {
      execAsync: jest.fn(async (queries: ExecCall[], _readOnly: boolean) => {
        for (const q of queries) calls.push(q);
        // Return a single ResultSet shape the service reads from.
        return [{ rows: rowsForNextRead, insertId: 1, rowsAffected: 1 }];
      }),
    };

    (SQLite.openDatabase as jest.Mock).mockReturnValue(mockDb);
    await initializeOfflineStorage();
    // Discard the CREATE TABLE queries from the setup.
    calls.length = 0;
  });

  describe('initialize', () => {
    it('opens the db with the right filename', () => {
      expect(SQLite.openDatabase).toHaveBeenCalledWith('alawael_erp.db');
    });
  });

  describe('saveOrderLocal', () => {
    it('serializes items to JSON and parameterizes the row', async () => {
      await saveOrderLocal({
        id: 'o1',
        orderNumber: 'ORD-001',
        customerId: 'c1',
        totalAmount: 99.5,
        status: 'pending',
        items: [{ sku: 'x' }],
        createdAt: '2026-04-21',
        updatedAt: '2026-04-21',
      });

      expect(calls).toHaveLength(1);
      expect(calls[0].sql).toMatch(/INSERT OR REPLACE INTO orders/);
      // items must be stringified JSON, not the array itself
      expect(calls[0].args).toContain('[{"sku":"x"}]');
      expect(calls[0].args).toContain('ORD-001');
    });
  });

  describe('getLocalOrders', () => {
    it('parses the items JSON on read', async () => {
      rowsForNextRead = [
        {
          id: 'o1',
          orderNumber: 'ORD-001',
          items: '[{"sku":"x"}]',
        },
      ];
      const orders = await getLocalOrders();
      expect(orders).toHaveLength(1);
      expect(orders[0].items).toEqual([{ sku: 'x' }]);
    });
  });

  describe('saveNotificationLocal', () => {
    it('coerces boolean read to 0/1 and stringifies data', async () => {
      await saveNotificationLocal({
        id: 'n1',
        title: 't',
        message: 'm',
        type: 'order',
        read: true,
        createdAt: '2026-04-21',
        data: { ref: 'orderId:1' },
      });
      expect(calls[0].args).toContain(1); // read coerced
      expect(calls[0].args).toContain('{"ref":"orderId:1"}');
    });
  });

  describe('getLocalNotifications', () => {
    it('coerces read back to boolean and parses data', async () => {
      rowsForNextRead = [
        {
          id: 'n1',
          title: 't',
          read: 1,
          data: '{"ref":"orderId:1"}',
          createdAt: '2026-04-21',
        },
      ];
      const out = await getLocalNotifications(10);
      expect(out[0].read).toBe(true);
      expect(out[0].data).toEqual({ ref: 'orderId:1' });
    });

    it('applies the limit to the prepared SQL', async () => {
      await getLocalNotifications(5);
      expect(calls[0].sql).toMatch(/LIMIT \?/);
      expect(calls[0].args).toContain(5);
    });
  });

  describe('sync queue', () => {
    it('queueForSync stringifies payload and stamps an id+timestamp', async () => {
      await queueForSync('order', 'create', { orderNumber: 'ORD-001' });
      expect(calls[0].sql).toMatch(/INSERT INTO sync_queue/);
      expect(calls[0].args).toContain('{"orderNumber":"ORD-001"}');
      // id uses `${type}-${action}-${timestamp}`
      const id = calls[0].args.find(a => typeof a === 'string' && /^order-create-\d+$/.test(a));
      expect(id).toBeDefined();
    });

    it('getSyncQueue returns rows as-is', async () => {
      rowsForNextRead = [{ id: 'q1', type: 'order', retries: 0 }];
      const out = await getSyncQueue();
      expect(out).toEqual(rowsForNextRead);
    });

    it('removefromSyncQueue deletes by id', async () => {
      await removefromSyncQueue('q1');
      expect(calls[0].sql).toMatch(/DELETE FROM sync_queue/);
      expect(calls[0].args).toEqual(['q1']);
    });

    it('updateSyncRetry updates retries by id', async () => {
      await updateSyncRetry('q1', 3);
      expect(calls[0].sql).toMatch(/UPDATE sync_queue SET retries/);
      expect(calls[0].args).toEqual([3, 'q1']);
    });
  });

  describe('getDatabaseStats', () => {
    it('returns zero counts when COUNT rows are empty', async () => {
      rowsForNextRead = [{ count: 0 }];
      const s = await getDatabaseStats();
      expect(s).toEqual({ orders: 0, notifications: 0, syncQueue: 0 });
    });
  });
});
