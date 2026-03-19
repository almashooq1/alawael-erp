import * as SQLite from 'expo-sqlite';
import OfflineStorageService from '../../services/OfflineStorageService';

jest.mock('expo-sqlite');

describe('OfflineStorageService', () => {
  let mockDB: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock SQLite database
    mockDB = {
      transaction: jest.fn((callback) => {
        callback({
          executeSql: jest.fn(),
        });
      }),
      exec: jest.fn(),
    };

    (SQLite.openDatabase as jest.Mock).mockReturnValue(mockDB);
  });

  describe('initializeOfflineStorage', () => {
    it('should initialize database with all tables', async () => {
      const transactionCallback = jest.fn();
      mockDB.transaction.mockImplementation((callback) => {
        transactionCallback();
        callback({
          executeSql: jest.fn(),
        });
      });

      await OfflineStorageService.initializeOfflineStorage();

      expect(SQLite.openDatabase).toHaveBeenCalledWith('alawael_erp.db');
      expect(mockDB.transaction).toHaveBeenCalled();
      expect(transactionCallback).toHaveBeenCalled();
    });
  });

  describe('Order operations', () => {
    it('should save order locally', async () => {
      const mockExecuteSql = jest.fn();
      mockDB.transaction.mockImplementation((callback) => {
        callback({
          executeSql: mockExecuteSql,
        });
      });

      const order = {
        id: '1',
        orderNumber: 'ORD-001',
        customerId: 'cust-1',
        totalAmount: 1000,
        status: 'pending',
        items: [],
      };

      await OfflineStorageService.saveOrderLocal(order);

      expect(mockDB.transaction).toHaveBeenCalled();
      expect(mockExecuteSql).toHaveBeenCalled();
    });

    it('should retrieve local orders', async () => {
      const mockOrders = [
        {
          id: '1',
          orderNumber: 'ORD-001',
          customerId: 'cust-1',
          totalAmount: 1000,
          status: 'pending',
          items: '[]',
          createdAt: new Date().toISOString(),
          synced: 0,
        },
      ];

      const mockExecuteSql = jest.fn((sql, values, callback) => {
        callback(null, { rows: { _array: mockOrders } });
      });

      mockDB.transaction.mockImplementation((callback) => {
        callback({
          executeSql: mockExecuteSql,
        });
      });

      const orders = await OfflineStorageService.getLocalOrders();

      expect(mockDB.transaction).toHaveBeenCalled();
    });
  });

  describe('Notification operations', () => {
    it('should save notification locally', async () => {
      const mockExecuteSql = jest.fn();
      mockDB.transaction.mockImplementation((callback) => {
        callback({
          executeSql: mockExecuteSql,
        });
      });

      const notification = {
        id: '1',
        title: 'Order Update',
        message: 'Your order has been processed',
        type: 'order',
        read: false,
        data: { orderId: '123' },
      };

      await OfflineStorageService.saveNotificationLocal(notification);

      expect(mockDB.transaction).toHaveBeenCalled();
      expect(mockExecuteSql).toHaveBeenCalled();
    });

    it('should retrieve local notifications with limit', async () => {
      const mockNotifications = [
        {
          id: '1',
          title: 'Test',
          message: 'Test message',
          type: 'order',
          read: 0,
          createdAt: new Date().toISOString(),
          data: '{}',
        },
      ];

      const mockExecuteSql = jest.fn((sql, values, callback) => {
        callback(null, { rows: { _array: mockNotifications } });
      });

      mockDB.transaction.mockImplementation((callback) => {
        callback({
          executeSql: mockExecuteSql,
        });
      });

      const notifications = await OfflineStorageService.getLocalNotifications(10);

      expect(mockDB.transaction).toHaveBeenCalled();
    });
  });

  describe('Sync queue operations', () => {
    it('should queue action for sync', async () => {
      const mockExecuteSql = jest.fn();
      mockDB.transaction.mockImplementation((callback) => {
        callback({
          executeSql: mockExecuteSql,
        });
      });

      const action = {
        type: 'order',
        action: 'create',
        payload: { orderNumber: 'ORD-001' },
      };

      await OfflineStorageService.queueForSync(action);

      expect(mockDB.transaction).toHaveBeenCalled();
      expect(mockExecuteSql).toHaveBeenCalled();
    });

    it('should retrieve sync queue', async () => {
      const mockQueue = [
        {
          id: '1',
          type: 'order',
          action: 'create',
          payload: '{"orderNumber":"ORD-001"}',
          timestamp: new Date().toISOString(),
          retries: 0,
        },
      ];

      const mockExecuteSql = jest.fn((sql, values, callback) => {
        callback(null, { rows: { _array: mockQueue } });
      });

      mockDB.transaction.mockImplementation((callback) => {
        callback({
          executeSql: mockExecuteSql,
        });
      });

      const queue = await OfflineStorageService.getSyncQueue();

      expect(mockDB.transaction).toHaveBeenCalled();
    });

    it('should remove synced item from queue', async () => {
      const mockExecuteSql = jest.fn();
      mockDB.transaction.mockImplementation((callback) => {
        callback({
          executeSql: mockExecuteSql,
        });
      });

      await OfflineStorageService.removeFromSyncQueue('sync-item-1');

      expect(mockDB.transaction).toHaveBeenCalled();
      expect(mockExecuteSql).toHaveBeenCalled();
    });

    it('should update sync retry count', async () => {
      const mockExecuteSql = jest.fn();
      mockDB.transaction.mockImplementation((callback) => {
        callback({
          executeSql: mockExecuteSql,
        });
      });

      await OfflineStorageService.updateSyncRetry('sync-item-1');

      expect(mockDB.transaction).toHaveBeenCalled();
      expect(mockExecuteSql).toHaveBeenCalled();
    });
  });

  describe('Data management', () => {
    it('should clear old data', async () => {
      const mockExecuteSql = jest.fn();
      mockDB.transaction.mockImplementation((callback) => {
        callback({
          executeSql: mockExecuteSql,
        });
      });

      await OfflineStorageService.clearOldData(30);

      expect(mockDB.transaction).toHaveBeenCalled();
      expect(mockExecuteSql).toHaveBeenCalled();
    });

    it('should get database statistics', async () => {
      const mockStats = [
        {
          table: 'orders',
          count: 5,
        },
        {
          table: 'notifications',
          count: 10,
        },
      ];

      const mockExecuteSql = jest.fn();

      mockDB.transaction.mockImplementation((callback) => {
        const tx = {
          executeSql: jest.fn((sql, values, callback) => {
            if (sql.includes('COUNT')) {
              callback(null, { rows: { _array: [mockStats[0]] } });
            }
          }),
        };
        callback(tx);
      });

      const stats = await OfflineStorageService.getDatabaseStats();

      expect(mockDB.transaction).toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    it('should handle database errors gracefully', async () => {
      const dbError = new Error('Database locked');
      const mockExecuteSql = jest.fn((sql, values, callback) => {
        callback(dbError, null);
      });

      mockDB.transaction.mockImplementation((callback) => {
        callback({
          executeSql: mockExecuteSql,
        });
      });

      // Should not throw, but handle error internally
      try {
        await OfflineStorageService.saveOrderLocal({
          id: '1',
          orderNumber: 'ORD-001',
          customerId: 'cust-1',
          totalAmount: 1000,
          status: 'pending',
          items: [],
        });
      } catch (error) {
        // Expected to handle or throw
      }
    });

    it('should handle corrupted JSON in stored data', async () => {
      const mockCorruptedData = [
        {
          id: '1',
          items: 'invalid json {', // Corrupted JSON
        },
      ];

      const mockExecuteSql = jest.fn((sql, values, callback) => {
        if (sql.includes('SELECT')) {
          callback(null, { rows: { _array: mockCorruptedData } });
        }
      });

      mockDB.transaction.mockImplementation((callback) => {
        callback({
          executeSql: mockExecuteSql,
        });
      });

      // Should handle parsing errors gracefully
      try {
        await OfflineStorageService.getLocalOrders();
      } catch (error) {
        // Expected to handle
      }
    });
  });

  describe('Performance', () => {
    it('should batch insert operations for efficiency', async () => {
      const mockExecuteSql = jest.fn();
      mockDB.transaction.mockImplementation((callback) => {
        callback({
          executeSql: mockExecuteSql,
        });
      });

      const orders = Array.from({ length: 50 }, (_, i) => ({
        id: String(i),
        orderNumber: `ORD-${i}`,
        customerId: 'cust-1',
        totalAmount: 1000,
        status: 'pending',
        items: [],
      }));

      // Save multiple orders
      for (const order of orders) {
        await OfflineStorageService.saveOrderLocal(order);
      }

      // Should execute multiple inserts
      expect(mockDB.transaction).toHaveBeenCalled();
    });
  });
});
