/**
 * Unit Tests — zktecoService.js
 * ZKTeco biometric device service — all static methods
 */

/* ─── Mocks ─────────────────────────────────────────── */
const mockCreateSocket = jest.fn().mockResolvedValue(true);
const mockDisconnect = jest.fn().mockResolvedValue(true);
const mockGetInfo = jest.fn().mockResolvedValue({
  firmwareVersion: '6.60',
  platform: 'ZMM220',
  mac: 'AA:BB:CC:DD:EE:FF',
  serialNumber: 'ZK100',
  userCounts: 50,
  logCounts: 1000,
});
const mockGetAttendances = jest.fn().mockResolvedValue({ data: [] });
const mockGetUsers = jest.fn().mockResolvedValue({ data: [] });
const mockGetTime = jest.fn().mockResolvedValue(new Date());
const mockClearAttendanceLog = jest.fn().mockResolvedValue(true);

jest.mock('node-zklib', () => {
  return jest.fn().mockImplementation(() => ({
    createSocket: mockCreateSocket,
    disconnect: mockDisconnect,
    getInfo: mockGetInfo,
    getAttendances: mockGetAttendances,
    getUsers: mockGetUsers,
    getTime: mockGetTime,
    clearAttendanceLog: mockClearAttendanceLog,
  }));
});

jest.mock('node-cron', () => ({
  schedule: jest.fn((expr, fn) => ({
    stop: jest.fn(),
    _fn: fn,
  })),
}));

// Mock device model
const mockDeviceSave = jest.fn().mockResolvedValue(true);
const mockDeviceDoc = {
  _id: 'dev1',
  deviceName: 'Front Door',
  ipAddress: '192.168.1.100',
  port: 4370,
  connectionTimeout: 5000,
  isActive: true,
  status: 'offline',
  consecutiveFailures: 0,
  connectionErrors: 0,
  deviceInfo: {},
  userMappings: [],
  syncSettings: { autoSync: false, syncInterval: 15, clearLogsAfterSync: false },
  syncLogs: [],
  save: mockDeviceSave,
  addSyncLog: jest.fn().mockResolvedValue(true),
  updateUserMapping: jest.fn().mockResolvedValue(true),
};

jest.mock('../../models/zktecoDevice.model', () => {
  const model = {
    findById: jest.fn().mockImplementation(() => ({
      populate: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(null),
      then: function (resolve) {
        return resolve(JSON.parse(JSON.stringify(mockDeviceDoc)));
      },
    })),
    find: jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([]),
    }),
    findByIP: jest.fn().mockResolvedValue(null),
    findByIdAndDelete: jest.fn().mockResolvedValue(mockDeviceDoc),
    getActiveDevices: jest.fn().mockResolvedValue([]),
    getDevicesDueForSync: jest.fn().mockResolvedValue([]),
    aggregate: jest.fn().mockResolvedValue([]),
  };
  // Constructor for new ZKTecoDevice(...)
  const Ctor = jest.fn().mockImplementation(data => ({
    ...data,
    save: jest.fn().mockResolvedValue({ ...data, _id: 'new1' }),
  }));
  Object.assign(Ctor, model);
  return Ctor;
});

const mockAttendanceSave = jest.fn().mockResolvedValue(true);
jest.mock('../../models/advanced_attendance.model', () => {
  const model = {
    findOne: jest.fn().mockResolvedValue(null),
    countDocuments: jest.fn().mockResolvedValue(100),
  };
  const Ctor = jest.fn().mockImplementation(data => ({
    ...data,
    externalSources: data?.externalSources || [],
    save: mockAttendanceSave,
  }));
  Object.assign(Ctor, model);
  return Ctor;
});

jest.mock('../../models/workShift.model', () => ({
  getEmployeeShift: jest.fn().mockResolvedValue(null),
}));

jest.mock('../../models/employee.model', () => ({
  findById: jest.fn().mockReturnValue({
    select: jest.fn().mockResolvedValue({ department: 'HR' }),
  }),
}));

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

/* ─── SUT ───────────────────────────────────────────── */
const ZKTecoService = require('../../services/hr/zktecoService');
const ZKTecoDevice = require('../../models/zktecoDevice.model');
const SmartAttendance = require('../../models/advanced_attendance.model');

describe('ZKTecoService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset findById to return device doc directly (not with populate chain)
    ZKTecoDevice.findById.mockImplementation(id => {
      const doc = {
        ...JSON.parse(JSON.stringify(mockDeviceDoc)),
        _id: id || 'dev1',
        save: mockDeviceSave,
        addSyncLog: jest.fn().mockResolvedValue(true),
        updateUserMapping: jest.fn().mockResolvedValue(true),
      };
      // Build chain object, then self-reference
      const chain = {};
      chain.populate = jest.fn().mockReturnValue(chain);
      chain.select = jest.fn().mockReturnValue(chain);
      chain.lean = jest.fn().mockResolvedValue(doc);
      chain.then = (resolve, reject) => Promise.resolve(doc).then(resolve, reject);
      chain.catch = handler => Promise.resolve(doc).catch(handler);
      return chain;
    });
  });

  // ═══════════════════════════════════════════
  //  connectDevice
  // ═══════════════════════════════════════════
  describe('connectDevice', () => {
    it('connects and returns device info', async () => {
      const result = await ZKTecoService.connectDevice('dev1');
      expect(result.connected).toBe(true);
      expect(result.device.name).toBe('Front Door');
      expect(result.device.status).toBe('online');
      expect(mockCreateSocket).toHaveBeenCalled();
    });

    it('throws for non-existent device', async () => {
      ZKTecoDevice.findById.mockImplementation(() => ({
        then: resolve => resolve(null),
        catch: h => Promise.resolve(null).catch(h),
      }));
      await expect(ZKTecoService.connectDevice('bad')).rejects.toThrow('الجهاز غير موجود');
    });

    it('throws for inactive device', async () => {
      ZKTecoDevice.findById.mockImplementation(() => {
        const doc = {
          ...JSON.parse(JSON.stringify(mockDeviceDoc)),
          isActive: false,
          save: mockDeviceSave,
        };
        return { then: resolve => resolve(doc), catch: h => Promise.resolve(doc).catch(h) };
      });
      await expect(ZKTecoService.connectDevice('dev1')).rejects.toThrow('الجهاز معطل');
    });

    it('handles connection failure', async () => {
      mockCreateSocket.mockRejectedValueOnce(new Error('timeout'));
      await expect(ZKTecoService.connectDevice('dev1')).rejects.toThrow('فشل الاتصال بالجهاز');
    });
  });

  // ═══════════════════════════════════════════
  //  disconnectDevice
  // ═══════════════════════════════════════════
  describe('disconnectDevice', () => {
    it('disconnects and returns success', async () => {
      const result = await ZKTecoService.disconnectDevice('dev1');
      expect(result.disconnected).toBe(true);
    });
  });

  // ═══════════════════════════════════════════
  //  testConnection
  // ═══════════════════════════════════════════
  describe('testConnection', () => {
    it('tests connection successfully', async () => {
      const result = await ZKTecoService.testConnection('192.168.1.100', 4370);
      expect(result.success).toBe(true);
      expect(result.info).toBeDefined();
    });

    it('handles test failure', async () => {
      mockCreateSocket.mockRejectedValueOnce(new Error('no route'));
      const result = await ZKTecoService.testConnection('192.168.1.100');
      expect(result.success).toBe(false);
      expect(result.message).toContain('فشل الاتصال');
    });
  });

  // ═══════════════════════════════════════════
  //  addDevice
  // ═══════════════════════════════════════════
  describe('addDevice', () => {
    it('adds a new device', async () => {
      const data = { ipAddress: '192.168.1.200', port: 4370, deviceName: 'Back Door' };
      const result = await ZKTecoService.addDevice(data, 'user1');
      expect(result).toBeDefined();
    });

    it('throws for duplicate IP', async () => {
      ZKTecoDevice.findByIP.mockResolvedValueOnce({ _id: 'existing' });
      await expect(
        ZKTecoService.addDevice({ ipAddress: '192.168.1.100', port: 4370 }, 'user1')
      ).rejects.toThrow('يوجد جهاز مسجل');
    });
  });

  // ═══════════════════════════════════════════
  //  updateDevice
  // ═══════════════════════════════════════════
  describe('updateDevice', () => {
    it('updates device data', async () => {
      const result = await ZKTecoService.updateDevice('dev1', { deviceName: 'Updated' }, 'user1');
      expect(result).toBeDefined();
    });

    it('throws for non-existent device', async () => {
      ZKTecoDevice.findById.mockImplementation(() => ({
        then: resolve => resolve(null),
        catch: h => Promise.resolve(null).catch(h),
      }));
      await expect(ZKTecoService.updateDevice('bad', {}, 'u')).rejects.toThrow('الجهاز غير موجود');
    });
  });

  // ═══════════════════════════════════════════
  //  deleteDevice
  // ═══════════════════════════════════════════
  describe('deleteDevice', () => {
    it('deletes device', async () => {
      const result = await ZKTecoService.deleteDevice('dev1');
      expect(result.deleted).toBe(true);
    });

    it('throws when device not found for delete', async () => {
      ZKTecoDevice.findByIdAndDelete.mockResolvedValueOnce(null);
      await expect(ZKTecoService.deleteDevice('bad')).rejects.toThrow('الجهاز غير موجود');
    });
  });

  // ═══════════════════════════════════════════
  //  getAllDevices
  // ═══════════════════════════════════════════
  describe('getAllDevices', () => {
    it('returns devices with connection status', async () => {
      ZKTecoDevice.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([{ _id: 'dev1', deviceName: 'D1' }]),
      });
      const result = await ZKTecoService.getAllDevices();
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('isConnected');
    });
  });

  // ═══════════════════════════════════════════
  //  getDevice
  // ═══════════════════════════════════════════
  describe('getDevice', () => {
    it('returns device with connection status', async () => {
      const result = await ZKTecoService.getDevice('dev1');
      expect(result).toHaveProperty('isConnected');
    });

    it('throws for not found', async () => {
      ZKTecoDevice.findById.mockImplementation(() => ({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(null),
      }));
      await expect(ZKTecoService.getDevice('bad')).rejects.toThrow('الجهاز غير موجود');
    });
  });

  // ═══════════════════════════════════════════
  //  _determinePunchType
  // ═══════════════════════════════════════════
  describe('_determinePunchType', () => {
    it('returns check-in for inOutState=0', () => {
      expect(ZKTecoService._determinePunchType({ inOutState: 0 }, null)).toBe('check-in');
    });
    it('returns check-out for inOutState=1', () => {
      expect(ZKTecoService._determinePunchType({ inOutState: 1 }, null)).toBe('check-out');
    });
    it('returns check-in when no existing record', () => {
      expect(ZKTecoService._determinePunchType({}, null)).toBe('check-in');
    });
    it('returns check-out when check-in exists but no check-out', () => {
      expect(ZKTecoService._determinePunchType({}, { checkInTime: new Date() })).toBe('check-out');
    });
    it('returns check-out when both exist (update)', () => {
      expect(
        ZKTecoService._determinePunchType({}, { checkInTime: new Date(), checkOutTime: new Date() })
      ).toBe('check-out');
    });
  });

  // ═══════════════════════════════════════════
  //  syncAllDevices
  // ═══════════════════════════════════════════
  describe('syncAllDevices', () => {
    it('returns empty for no active devices', async () => {
      const results = await ZKTecoService.syncAllDevices('user1');
      expect(results).toEqual([]);
    });
  });

  // ═══════════════════════════════════════════
  //  getConnectionsStatus
  // ═══════════════════════════════════════════
  describe('getConnectionsStatus', () => {
    it('returns status array', () => {
      const statuses = ZKTecoService.getConnectionsStatus();
      expect(Array.isArray(statuses)).toBe(true);
    });
  });

  // ═══════════════════════════════════════════
  //  startAutoSync / stopAutoSync
  // ═══════════════════════════════════════════
  describe('auto sync', () => {
    it('starts auto sync', () => {
      const cron = require('node-cron');
      ZKTecoService.startAutoSync();
      expect(cron.schedule).toHaveBeenCalled();
    });

    it('stops auto sync', () => {
      ZKTecoService.stopAutoSync();
      // Should not throw
    });
  });

  // ═══════════════════════════════════════════
  //  toggleAutoSync
  // ═══════════════════════════════════════════
  describe('toggleAutoSync', () => {
    it('enables auto sync for device', async () => {
      const result = await ZKTecoService.toggleAutoSync('dev1', true, 10);
      expect(result.autoSync).toBe(true);
      expect(result.interval).toBe(10);
    });

    it('throws for non-existent device', async () => {
      ZKTecoDevice.findById.mockImplementation(() => ({
        then: resolve => resolve(null),
        catch: h => Promise.resolve(null).catch(h),
      }));
      await expect(ZKTecoService.toggleAutoSync('bad', true)).rejects.toThrow('الجهاز غير موجود');
    });
  });

  // ═══════════════════════════════════════════
  //  getStats
  // ═══════════════════════════════════════════
  describe('getStats', () => {
    it('returns aggregated stats', async () => {
      ZKTecoDevice.find.mockReturnValue({
        lean: jest
          .fn()
          .mockResolvedValue([
            {
              status: 'online',
              isActive: true,
              userMappings: [{ employeeId: '1' }],
              syncSettings: { autoSync: true },
            },
          ]),
      });
      SmartAttendance.countDocuments.mockResolvedValue(500);
      const stats = await ZKTecoService.getStats();
      expect(stats).toHaveProperty('totalDevices');
      expect(stats).toHaveProperty('online');
      expect(stats).toHaveProperty('totalBiometricLogs');
    });
  });

  // ═══════════════════════════════════════════
  //  getSyncHistory
  // ═══════════════════════════════════════════
  describe('getSyncHistory', () => {
    it('returns sync logs', async () => {
      ZKTecoDevice.findById.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue({
          deviceName: 'D1',
          syncLogs: [{ status: 'success' }],
        }),
      }));
      const result = await ZKTecoService.getSyncHistory('dev1');
      expect(result.deviceName).toBe('D1');
      expect(result.logs).toHaveLength(1);
    });

    it('throws for not found', async () => {
      ZKTecoDevice.findById.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(null),
      }));
      await expect(ZKTecoService.getSyncHistory('bad')).rejects.toThrow('الجهاز غير موجود');
    });
  });

  // ═══════════════════════════════════════════
  //  disconnectAll
  // ═══════════════════════════════════════════
  describe('disconnectAll', () => {
    it('disconnects all without errors', async () => {
      await expect(ZKTecoService.disconnectAll()).resolves.not.toThrow();
    });
  });

  // ═══════════════════════════════════════════
  //  processWithShiftAwareness
  // ═══════════════════════════════════════════
  describe('processWithShiftAwareness', () => {
    it('returns record when no employee', async () => {
      const record = await ZKTecoService.processWithShiftAwareness(null);
      expect(record).toBeNull();
    });

    it('returns unchanged when no shift found', async () => {
      const record = { employeeId: 'emp1', checkInTime: new Date() };
      const result = await ZKTecoService.processWithShiftAwareness(record);
      expect(result).toBe(record);
    });
  });
});
