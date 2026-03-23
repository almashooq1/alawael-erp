/* eslint-disable no-unused-vars */
/**
 * ZKTeco Service - خدمة التواصل مع أجهزة ZKTeco
 * ═══════════════════════════════════════════════════════════════════
 * الاتصال بأجهزة البصمة وجلب سجلات الحضور ومزامنتها
 * محسّن: shift-awareness, multi-punch tracking, duplicate detection,
 *         connection health, punch log history
 */

const ZKLib = require('node-zklib');
const cron = require('node-cron');
const ZKTecoDevice = require('../../models/zktecoDevice.model');
const SmartAttendance = require('../../models/advanced_attendance.model');
const WorkShift = require('../../models/workShift.model');
const Employee = require('../../models/employee.model');
const logger = require('../../utils/logger');

// ─── مخزن الاتصالات النشطة ──────────────────────────────────────────────────
const activeConnections = new Map();

// ─── مخزن حالة الاتصالات (health monitoring) ─────────────────────────────────
const connectionHealth = new Map(); // deviceId -> { lastPing, failures, uptime }

// ─── مهام المزامنة التلقائية (Cron Jobs) ────────────────────────────────────
let autoSyncJob = null;

class ZKTecoService {
  // ═══════════════════════════════════════════════
  //  إدارة الاتصال (Connection Management)
  // ═══════════════════════════════════════════════

  /**
   * الاتصال بجهاز ZKTeco
   * @param {string} deviceId - معرف الجهاز في قاعدة البيانات
   * @returns {Object} معلومات الاتصال
   */
  static async connectDevice(deviceId) {
    const device = await ZKTecoDevice.findById(deviceId);
    if (!device) throw new Error('الجهاز غير موجود');
    if (!device.isActive) throw new Error('الجهاز معطل');

    // إغلاق اتصال قديم إن وجد
    if (activeConnections.has(deviceId)) {
      await this.disconnectDevice(deviceId);
    }

    const zkInstance = new ZKLib(device.ipAddress, device.port, device.connectionTimeout, 4000);

    try {
      await zkInstance.createSocket();

      // جلب معلومات الجهاز
      const info = await this._getDeviceInfo(zkInstance);

      // تحديث حالة الجهاز
      device.status = 'online';
      device.lastConnected = new Date();
      device.consecutiveFailures = 0;
      device.deviceInfo = {
        ...device.deviceInfo,
        ...info,
      };
      await device.save();

      // تخزين الاتصال
      activeConnections.set(deviceId, zkInstance);

      logger.info(
        `ZKTeco: Connected to device ${device.deviceName} (${device.ipAddress}:${device.port})`
      );

      return {
        connected: true,
        device: {
          id: device._id,
          name: device.deviceName,
          ip: device.ipAddress,
          port: device.port,
          status: 'online',
          info,
        },
      };
    } catch (error) {
      device.status = 'error';
      device.connectionErrors += 1;
      device.consecutiveFailures += 1;
      device.lastDisconnected = new Date();
      await device.save();

      logger.error(
        `ZKTeco: Connection failed to ${device.deviceName} (${device.ipAddress}): ${error.message}`
      );
      throw new Error(`فشل الاتصال بالجهاز: ${error.message}`);
    }
  }

  /**
   * قطع الاتصال عن جهاز
   */
  static async disconnectDevice(deviceId) {
    const zkInstance = activeConnections.get(deviceId);
    if (zkInstance) {
      try {
        await zkInstance.disconnect();
      } catch {
        // ignore disconnect errors
      }
      activeConnections.delete(deviceId);
    }

    const device = await ZKTecoDevice.findById(deviceId);
    if (device) {
      device.status = 'offline';
      device.lastDisconnected = new Date();
      await device.save();
    }

    logger.info(`ZKTeco: Disconnected from device ${deviceId}`);
    return { disconnected: true };
  }

  /**
   * اختبار الاتصال بجهاز (بدون الاحتفاظ بالاتصال)
   */
  static async testConnection(ipAddress, port = 4370) {
    const zkInstance = new ZKLib(ipAddress, port, 5000, 4000);
    try {
      await zkInstance.createSocket();
      const info = await this._getDeviceInfo(zkInstance);
      await zkInstance.disconnect();

      return {
        success: true,
        message: 'تم الاتصال بنجاح',
        info,
      };
    } catch (error) {
      try {
        await zkInstance.disconnect();
      } catch {
        /* ignore */
      }
      return {
        success: false,
        message: `فشل الاتصال: ${error.message}`,
      };
    }
  }

  /**
   * جلب معلومات الجهاز الداخلية
   */
  static async _getDeviceInfo(zkInstance) {
    const info = {};
    try {
      const deviceInfo = await zkInstance.getInfo();
      if (deviceInfo) {
        info.firmwareVersion = deviceInfo.firmwareVersion || '';
        info.platformVersion = deviceInfo.platform || '';
        info.macAddress = deviceInfo.mac || '';
        info.deviceType = deviceInfo.serialNumber || '';
        info.userCapacity = deviceInfo.userCounts || 0;
        info.logCapacity = deviceInfo.logCounts || 0;
      }
    } catch (e) {
      logger.warn(`ZKTeco: Could not get device info: ${e.message}`);
    }
    return info;
  }

  // ═══════════════════════════════════════════════
  //  إدارة الأجهزة (Device CRUD)
  // ═══════════════════════════════════════════════

  /**
   * إضافة جهاز جديد
   */
  static async addDevice(data, userId) {
    // التحقق من عدم وجود جهاز بنفس IP والمنفذ
    const existing = await ZKTecoDevice.findByIP(data.ipAddress, data.port || 4370);
    if (existing) {
      throw new Error('يوجد جهاز مسجل بنفس عنوان IP والمنفذ');
    }

    const device = new ZKTecoDevice({
      ...data,
      createdBy: userId,
      status: 'offline',
    });

    await device.save();
    logger.info(`ZKTeco: New device added: ${device.deviceName} (${device.ipAddress})`);
    return device;
  }

  /**
   * تحديث بيانات جهاز
   */
  static async updateDevice(deviceId, data, userId) {
    const device = await ZKTecoDevice.findById(deviceId);
    if (!device) throw new Error('الجهاز غير موجود');

    // إذا تغير IP أو المنفذ، نقطع الاتصال الحالي
    if (data.ipAddress !== device.ipAddress || data.port !== device.port) {
      await this.disconnectDevice(deviceId);
    }

    Object.assign(device, data, { updatedBy: userId });
    await device.save();
    return device;
  }

  /**
   * حذف جهاز
   */
  static async deleteDevice(deviceId) {
    await this.disconnectDevice(deviceId);
    const device = await ZKTecoDevice.findByIdAndDelete(deviceId);
    if (!device) throw new Error('الجهاز غير موجود');
    logger.info(`ZKTeco: Device deleted: ${device.deviceName}`);
    return { deleted: true };
  }

  /**
   * الحصول على جميع الأجهزة
   */
  static async getAllDevices() {
    const devices = await ZKTecoDevice.find()
      .sort({ deviceName: 1 })
      .populate('location.branch', 'name')
      .lean();

    // إضافة حالة الاتصال الفعلية
    return devices.map(d => ({
      ...d,
      isConnected: activeConnections.has(d._id.toString()),
    }));
  }

  /**
   * الحصول على جهاز بالمعرف
   */
  static async getDevice(deviceId) {
    const device = await ZKTecoDevice.findById(deviceId)
      .populate('location.branch', 'name')
      .populate('syncLogs.triggeredBy', 'name')
      .lean();

    if (!device) throw new Error('الجهاز غير موجود');

    return {
      ...device,
      isConnected: activeConnections.has(device._id.toString()),
    };
  }

  // ═══════════════════════════════════════════════
  //  مزامنة سجلات الحضور (Attendance Sync)
  // ═══════════════════════════════════════════════

  /**
   * مزامنة سجلات الحضور من جهاز محدد
   * @param {string} deviceId - معرف الجهاز
   * @param {string} syncType - نوع المزامنة ('manual'|'auto'|'scheduled')
   * @param {string} userId - معرف المستخدم الذي بدأ المزامنة
   */
  static async syncAttendanceLogs(deviceId, syncType = 'manual', userId = null) {
    const device = await ZKTecoDevice.findById(deviceId);
    if (!device) throw new Error('الجهاز غير موجود');

    const startTime = Date.now();
    const syncLog = {
      syncType,
      startedAt: new Date(),
      triggeredBy: userId,
      recordsFetched: 0,
      recordsSynced: 0,
      recordsSkipped: 0,
      recordsFailed: 0,
    };

    let zkInstance = activeConnections.get(deviceId);
    const wasConnected = !!zkInstance;

    try {
      // الاتصال إن لم يكن متصلاً
      if (!zkInstance) {
        zkInstance = new ZKLib(device.ipAddress, device.port, device.connectionTimeout, 4000);
        await zkInstance.createSocket();
      }

      // جلب سجلات الحضور من الجهاز
      const logs = await zkInstance.getAttendances();
      const attendanceLogs = logs?.data || [];
      syncLog.recordsFetched = attendanceLogs.length;

      logger.info(`ZKTeco: Fetched ${attendanceLogs.length} logs from ${device.deviceName}`);

      // بناء خريطة المستخدمين
      const userMap = new Map();
      for (const mapping of device.userMappings) {
        if (mapping.employeeId) {
          userMap.set(mapping.zktecoUserId, mapping);
        }
      }

      // معالجة كل سجل
      for (const log of attendanceLogs) {
        try {
          const result = await this._processAttendanceLog(log, device, userMap);
          if (result === 'synced') syncLog.recordsSynced++;
          else if (result === 'skipped') syncLog.recordsSkipped++;
        } catch (err) {
          syncLog.recordsFailed++;
          logger.warn(`ZKTeco: Failed to process log: ${err.message}`);
        }
      }

      // مسح السجلات من الجهاز بعد المزامنة (إذا مفعل)
      if (device.syncSettings.clearLogsAfterSync && syncLog.recordsSynced > 0) {
        try {
          await zkInstance.clearAttendanceLog();
          logger.info(`ZKTeco: Cleared logs on device ${device.deviceName}`);
        } catch (e) {
          logger.warn(`ZKTeco: Failed to clear logs: ${e.message}`);
        }
      }

      syncLog.status = syncLog.recordsFailed > 0 ? 'partial' : 'success';
    } catch (error) {
      syncLog.status = 'failed';
      syncLog.errorMessage = error.message;
      logger.error(`ZKTeco: Sync failed for ${device.deviceName}: ${error.message}`);
    } finally {
      // قطع الاتصال إذا لم يكن متصلاً مسبقاً
      if (!wasConnected && zkInstance) {
        try {
          await zkInstance.disconnect();
        } catch {
          /* ignore */
        }
      }

      syncLog.completedAt = new Date();
      syncLog.duration = Date.now() - startTime;
      await device.addSyncLog(syncLog);
    }

    return syncLog;
  }

  /**
   * معالجة سجل حضور واحد من الجهاز
   */
  static async _processAttendanceLog(log, device, userMap) {
    const zktecoUserId = log.deviceUserId || log.uid;
    const timestamp = new Date(log.recordTime || log.timestamp);

    if (!zktecoUserId || !timestamp || isNaN(timestamp.getTime())) {
      return 'skipped';
    }

    // البحث عن ربط المستخدم
    const mapping = userMap.get(zktecoUserId);
    if (!mapping || !mapping.employeeId) {
      return 'skipped'; // مستخدم غير مربوط بموظف
    }

    const date = new Date(timestamp);
    date.setHours(0, 0, 0, 0);

    // البحث عن سجل حضور موجود لنفس اليوم
    let attendance = await SmartAttendance.findOne({
      employeeId: mapping.employeeId,
      date,
    });

    // تحديد نوع السجل (دخول/خروج) بناءً على الحالة
    const punchType = this._determinePunchType(log, attendance);

    if (punchType === 'check-in') {
      if (attendance && attendance.checkInTime) {
        // الدخول مسجل بالفعل - التحقق من أن البصمة أبكر
        if (timestamp < attendance.checkInTime) {
          attendance.checkInTime = timestamp;
          attendance.checkInMethod = 'biometric';
          attendance.checkInDevice = {
            deviceId: device._id.toString(),
            deviceType: 'biometric_terminal',
            ipAddress: device.ipAddress,
            deviceName: device.deviceName,
          };
        } else {
          return 'skipped';
        }
      } else if (attendance) {
        // لديه سجل يوم بدون دخول
        attendance.checkInTime = timestamp;
        attendance.checkInMethod = 'biometric';
        attendance.checkInDevice = {
          deviceId: device._id.toString(),
          deviceType: 'biometric_terminal',
          ipAddress: device.ipAddress,
          deviceName: device.deviceName,
        };
      } else {
        // إنشاء سجل جديد
        attendance = new SmartAttendance({
          employeeId: mapping.employeeId,
          date,
          checkInTime: timestamp,
          checkInMethod: 'biometric',
          checkInDevice: {
            deviceId: device._id.toString(),
            deviceType: 'biometric_terminal',
            ipAddress: device.ipAddress,
            deviceName: device.deviceName,
          },
          attendanceStatus: 'present',
          externalSources: [
            {
              source: 'biometric_system',
              externalId: `zkteco_${device._id}_${zktecoUserId}_${timestamp.getTime()}`,
              syncStatus: 'synced',
              rawData: log,
            },
          ],
        });
      }
    } else {
      // check-out
      if (!attendance) {
        // لا يوجد سجل دخول - إنشاء سجل مع خروج فقط
        attendance = new SmartAttendance({
          employeeId: mapping.employeeId,
          date,
          checkInTime: timestamp, // مؤقت
          checkOutTime: timestamp,
          checkOutMethod: 'biometric',
          checkOutDevice: {
            deviceId: device._id.toString(),
            deviceType: 'biometric_terminal',
            ipAddress: device.ipAddress,
            deviceName: device.deviceName,
          },
          attendanceStatus: 'present',
          externalSources: [
            {
              source: 'biometric_system',
              externalId: `zkteco_${device._id}_${zktecoUserId}_${timestamp.getTime()}`,
              syncStatus: 'synced',
              rawData: log,
            },
          ],
        });
      } else {
        // تحديث الخروج (نأخذ آخر بصمة كخروج)
        if (!attendance.checkOutTime || timestamp > attendance.checkOutTime) {
          attendance.checkOutTime = timestamp;
          attendance.checkOutMethod = 'biometric';
          attendance.checkOutDevice = {
            deviceId: device._id.toString(),
            deviceType: 'biometric_terminal',
            ipAddress: device.ipAddress,
            deviceName: device.deviceName,
          };
        } else {
          return 'skipped';
        }
      }
    }

    // إضافة المصدر الخارجي إن لم يكن موجوداً
    const externalId = `zkteco_${device._id}_${zktecoUserId}_${timestamp.getTime()}`;
    const hasSource = attendance.externalSources?.some(s => s.externalId === externalId);
    if (!hasSource) {
      if (!attendance.externalSources) attendance.externalSources = [];
      attendance.externalSources.push({
        source: 'biometric_system',
        externalId,
        syncStatus: 'synced',
        rawData: log,
      });
    }

    // تطبيق حسابات الوردية (التأخير/الخروج المبكر)
    await this.processWithShiftAwareness(attendance);

    await attendance.save();
    return 'synced';
  }

  /**
   * تحديد نوع البصمة (دخول أو خروج)
   * بناءً على حالة الجهاز أو الوقت
   */
  static _determinePunchType(log, existingRecord) {
    // إذا كان الجهاز يرسل نوع البصمة
    if (log.inOutState !== undefined) {
      return log.inOutState === 0 ? 'check-in' : 'check-out';
    }

    // التحديد بناءً على السجل الموجود
    if (!existingRecord || !existingRecord.checkInTime) {
      return 'check-in';
    }
    if (!existingRecord.checkOutTime) {
      return 'check-out';
    }

    // إذا مسجل دخول وخروج، البصمة التالية هي خروج جديد (تحديث)
    return 'check-out';
  }

  // ═══════════════════════════════════════════════
  //  مزامنة جميع الأجهزة
  // ═══════════════════════════════════════════════

  /**
   * مزامنة جميع الأجهزة النشطة
   */
  static async syncAllDevices(userId = null) {
    const devices = await ZKTecoDevice.getActiveDevices();
    const results = [];

    for (const device of devices) {
      try {
        const result = await this.syncAttendanceLogs(device._id.toString(), 'manual', userId);
        results.push({
          deviceId: device._id,
          deviceName: device.deviceName,
          ...result,
        });
      } catch (error) {
        results.push({
          deviceId: device._id,
          deviceName: device.deviceName,
          status: 'failed',
          errorMessage: error.message,
        });
      }
    }

    return results;
  }

  // ═══════════════════════════════════════════════
  //  إدارة مستخدمي الأجهزة (Device Users)
  // ═══════════════════════════════════════════════

  /**
   * جلب مستخدمي الجهاز
   */
  static async getDeviceUsers(deviceId) {
    let zkInstance = activeConnections.get(deviceId);
    const device = await ZKTecoDevice.findById(deviceId);
    if (!device) throw new Error('الجهاز غير موجود');

    const wasConnected = !!zkInstance;

    try {
      if (!zkInstance) {
        zkInstance = new ZKLib(device.ipAddress, device.port, device.connectionTimeout, 4000);
        await zkInstance.createSocket();
      }

      const result = await zkInstance.getUsers();
      const users = result?.data || [];

      return users.map(u => {
        const mapping = device.userMappings.find(m => m.zktecoUserId === u.uid);
        return {
          zktecoUserId: u.uid,
          name: u.name,
          role: u.role,
          cardno: u.cardno,
          password: u.password ? '****' : '',
          employeeId: mapping?.employeeId || null,
          employeeName: mapping?.employeeName || null,
          isMapped: !!mapping?.employeeId,
        };
      });
    } finally {
      if (!wasConnected && zkInstance) {
        try {
          await zkInstance.disconnect();
        } catch {
          /* ignore */
        }
      }
    }
  }

  /**
   * ربط مستخدم الجهاز بموظف
   */
  static async mapDeviceUser(deviceId, zktecoUserId, employeeData) {
    const device = await ZKTecoDevice.findById(deviceId);
    if (!device) throw new Error('الجهاز غير موجود');

    await device.updateUserMapping(zktecoUserId, {
      employeeId: employeeData.employeeId,
      employeeName: employeeData.employeeName,
      employeeNumber: employeeData.employeeNumber,
    });

    logger.info(
      `ZKTeco: Mapped device user ${zktecoUserId} to employee ${employeeData.employeeName}`
    );
    return { success: true };
  }

  /**
   * إلغاء ربط مستخدم
   */
  static async unmapDeviceUser(deviceId, zktecoUserId) {
    const device = await ZKTecoDevice.findById(deviceId);
    if (!device) throw new Error('الجهاز غير موجود');

    const mapping = device.userMappings.find(m => m.zktecoUserId === zktecoUserId);
    if (mapping) {
      mapping.employeeId = null;
      mapping.employeeName = null;
      mapping.employeeNumber = null;
      await device.save();
    }

    return { success: true };
  }

  // ═══════════════════════════════════════════════
  //  البصمات والحضور الفوري (Real-time)
  // ═══════════════════════════════════════════════

  /**
   * جلب سجلات الحضور الخام من الجهاز (بدون مزامنة)
   */
  static async getRawAttendanceLogs(deviceId, options = {}) {
    let zkInstance = activeConnections.get(deviceId);
    const device = await ZKTecoDevice.findById(deviceId);
    if (!device) throw new Error('الجهاز غير موجود');

    const wasConnected = !!zkInstance;

    try {
      if (!zkInstance) {
        zkInstance = new ZKLib(device.ipAddress, device.port, device.connectionTimeout, 4000);
        await zkInstance.createSocket();
      }

      const result = await zkInstance.getAttendances();
      const logs = result?.data || [];

      // تصفية حسب التاريخ إن وجد
      let filtered = logs;
      if (options.fromDate) {
        const from = new Date(options.fromDate);
        filtered = filtered.filter(l => new Date(l.recordTime) >= from);
      }
      if (options.toDate) {
        const to = new Date(options.toDate);
        filtered = filtered.filter(l => new Date(l.recordTime) <= to);
      }

      return {
        total: logs.length,
        filtered: filtered.length,
        logs: filtered.map(l => ({
          userId: l.deviceUserId || l.uid,
          timestamp: l.recordTime || l.timestamp,
          type: l.inOutState === 0 ? 'check-in' : l.inOutState === 1 ? 'check-out' : 'unknown',
          state: l.inOutState,
        })),
      };
    } finally {
      if (!wasConnected && zkInstance) {
        try {
          await zkInstance.disconnect();
        } catch {
          /* ignore */
        }
      }
    }
  }

  /**
   * جلب الوقت من الجهاز
   */
  static async getDeviceTime(deviceId) {
    let zkInstance = activeConnections.get(deviceId);
    const device = await ZKTecoDevice.findById(deviceId);
    if (!device) throw new Error('الجهاز غير موجود');

    const wasConnected = !!zkInstance;

    try {
      if (!zkInstance) {
        zkInstance = new ZKLib(device.ipAddress, device.port, device.connectionTimeout, 4000);
        await zkInstance.createSocket();
      }

      const time = await zkInstance.getTime();
      return {
        deviceTime: time,
        serverTime: new Date(),
        difference: Math.abs(new Date(time).getTime() - Date.now()),
      };
    } finally {
      if (!wasConnected && zkInstance) {
        try {
          await zkInstance.disconnect();
        } catch {
          /* ignore */
        }
      }
    }
  }

  // ═══════════════════════════════════════════════
  //  المزامنة التلقائية (Auto Sync)
  // ═══════════════════════════════════════════════

  /**
   * بدء المزامنة التلقائية
   * تعمل كل دقيقة وتتحقق من الأجهزة المستحقة للمزامنة
   */
  static startAutoSync() {
    if (autoSyncJob) {
      logger.info('ZKTeco: Auto-sync already running');
      return;
    }

    autoSyncJob = cron.schedule('* * * * *', async () => {
      try {
        const devices = await ZKTecoDevice.getDevicesDueForSync();
        if (devices.length === 0) return;

        logger.info(`ZKTeco: Auto-sync triggered for ${devices.length} device(s)`);

        for (const device of devices) {
          try {
            await this.syncAttendanceLogs(device._id.toString(), 'auto');
          } catch (err) {
            logger.error(`ZKTeco: Auto-sync failed for ${device.deviceName}: ${err.message}`);
          }
        }
      } catch (err) {
        logger.error(`ZKTeco: Auto-sync error: ${err.message}`);
      }
    });

    logger.info('ZKTeco: Auto-sync scheduler started');
  }

  /**
   * إيقاف المزامنة التلقائية
   */
  static stopAutoSync() {
    if (autoSyncJob) {
      autoSyncJob.stop();
      autoSyncJob = null;
      logger.info('ZKTeco: Auto-sync scheduler stopped');
    }
  }

  /**
   * تفعيل/تعطيل المزامنة التلقائية لجهاز
   */
  static async toggleAutoSync(deviceId, enabled, interval = 15) {
    const device = await ZKTecoDevice.findById(deviceId);
    if (!device) throw new Error('الجهاز غير موجود');

    device.syncSettings.autoSync = enabled;
    device.syncSettings.syncInterval = interval;

    if (enabled) {
      const nextSync = new Date();
      nextSync.setMinutes(nextSync.getMinutes() + interval);
      device.syncSettings.nextSync = nextSync;
    } else {
      device.syncSettings.nextSync = null;
    }

    await device.save();

    // التأكد من تشغيل المزامنة التلقائية
    if (enabled && !autoSyncJob) {
      this.startAutoSync();
    }

    return {
      autoSync: device.syncSettings.autoSync,
      interval: device.syncSettings.syncInterval,
      nextSync: device.syncSettings.nextSync,
    };
  }

  // ═══════════════════════════════════════════════
  //  الإحصائيات والتقارير
  // ═══════════════════════════════════════════════

  /**
   * إحصائيات عامة عن أجهزة ZKTeco
   */
  static async getStats() {
    const [devices, totalLogs] = await Promise.all([
      ZKTecoDevice.find().lean(),
      SmartAttendance.countDocuments({ checkInMethod: 'biometric' }),
    ]);

    const online = devices.filter(d => d.status === 'online').length;
    const offline = devices.filter(d => d.status === 'offline').length;
    const error = devices.filter(d => d.status === 'error').length;
    const totalMappedUsers = devices.reduce(
      (sum, d) => sum + (d.userMappings?.filter(m => m.employeeId)?.length || 0),
      0
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayBiometric = await SmartAttendance.countDocuments({
      checkInMethod: 'biometric',
      date: today,
    });

    return {
      totalDevices: devices.length,
      online,
      offline,
      error,
      activeDevices: devices.filter(d => d.isActive).length,
      totalMappedUsers,
      totalBiometricLogs: totalLogs,
      todayBiometricCheckIns: todayBiometric,
      autoSyncEnabled: devices.filter(d => d.syncSettings?.autoSync).length,
    };
  }

  /**
   * سجلات المزامنة لجهاز محدد
   */
  static async getSyncHistory(deviceId, limit = 20) {
    const device = await ZKTecoDevice.findById(deviceId).select('syncLogs deviceName').lean();

    if (!device) throw new Error('الجهاز غير موجود');

    return {
      deviceName: device.deviceName,
      logs: (device.syncLogs || []).slice(0, limit),
    };
  }

  // ═══════════════════════════════════════════════
  //  تنظيف الاتصالات عند الإغلاق
  // ═══════════════════════════════════════════════

  /**
   * قطع جميع الاتصالات النشطة
   */
  static async disconnectAll() {
    for (const [deviceId, zkInstance] of activeConnections) {
      try {
        await zkInstance.disconnect();
      } catch {
        // ignore
      }
    }
    activeConnections.clear();
    connectionHealth.clear();
    this.stopAutoSync();
    logger.info('ZKTeco: All connections closed');
  }

  // ═══════════════════════════════════════════════
  //  مراقبة صحة الاتصالات (Connection Health)
  // ═══════════════════════════════════════════════

  /**
   * فحص صحة جميع الاتصالات النشطة
   * يمكن تشغيلها دورياً لاكتشاف الأجهزة المنقطعة
   */
  static async healthCheck() {
    const results = [];

    for (const [deviceId, zkInstance] of activeConnections) {
      try {
        await zkInstance.getTime();
        const health = connectionHealth.get(deviceId) || {};
        health.lastPing = new Date();
        health.failures = 0;
        connectionHealth.set(deviceId, health);
        results.push({ deviceId, status: 'healthy' });
      } catch (err) {
        const health = connectionHealth.get(deviceId) || { failures: 0 };
        health.failures = (health.failures || 0) + 1;
        health.lastFailure = new Date();
        connectionHealth.set(deviceId, health);

        logger.warn(`ZKTeco: Health check failed for ${deviceId}: ${err.message}`);

        // إعادة الاتصال إذا فشل أكثر من 3 مرات
        if (health.failures >= 3) {
          try {
            activeConnections.delete(deviceId);
            await this.connectDevice(deviceId);
            health.failures = 0;
            connectionHealth.set(deviceId, health);
            logger.info(`ZKTeco: Auto-reconnected device ${deviceId}`);
            results.push({ deviceId, status: 'reconnected' });
          } catch {
            results.push({ deviceId, status: 'failed', failures: health.failures });
          }
        } else {
          results.push({ deviceId, status: 'degraded', failures: health.failures });
        }
      }
    }

    return results;
  }

  /**
   * حالة جميع الاتصالات
   */
  static getConnectionsStatus() {
    const status = [];
    for (const [deviceId] of activeConnections) {
      const health = connectionHealth.get(deviceId) || {};
      status.push({
        deviceId,
        connected: true,
        lastPing: health.lastPing,
        failures: health.failures || 0,
      });
    }
    return status;
  }

  // ═══════════════════════════════════════════════
  //  معالجة متقدمة: Shift-Aware + Multi-Punch
  // ═══════════════════════════════════════════════

  /**
   * مزامنة محسّنة مع دعم الورديات
   * تحسب التأخير والخروج المبكر والساعات الإضافية تلقائياً
   */
  static async processWithShiftAwareness(attendanceRecord) {
    if (!attendanceRecord || !attendanceRecord.employeeId) return attendanceRecord;

    try {
      const employee = await Employee.findById(attendanceRecord.employeeId).select('department');
      if (!employee) return attendanceRecord;

      const shift = await WorkShift.getEmployeeShift(
        attendanceRecord.employeeId,
        employee.department
      );
      if (!shift) return attendanceRecord;

      // حساب التأخير عند الحضور
      if (attendanceRecord.checkInTime) {
        const latenessInfo = shift.calculateLateness(attendanceRecord.checkInTime);
        attendanceRecord.lateness = {
          minutes: latenessInfo.lateMinutes,
          isLate: latenessInfo.isLate,
        };

        if (latenessInfo.isLate) {
          attendanceRecord.attendanceStatus = latenessInfo.isAbsent ? 'absent' : 'late_arrival';
        }
      }

      // حساب الخروج المبكر والإضافي عند الانصراف
      if (attendanceRecord.checkOutTime) {
        const earlyInfo = shift.calculateEarlyLeave(attendanceRecord.checkOutTime);
        if (earlyInfo.isEarlyLeave) {
          attendanceRecord.earlyLeave = {
            minutes: earlyInfo.earlyMinutes,
            isEarlyLeave: true,
          };
          if (attendanceRecord.attendanceStatus === 'present') {
            attendanceRecord.attendanceStatus = 'early_departure';
          }
        }
      }
    } catch (err) {
      logger.warn(`ZKTeco: Shift processing failed: ${err.message}`);
    }

    return attendanceRecord;
  }

  /**
   * إحصائيات مفصلة لأجهزة ZKTeco مع معلومات الصحة
   */
  static async getDetailedStats() {
    const basicStats = await this.getStats();

    // إضافة معلومات الصحة
    const healthStatus = this.getConnectionsStatus();

    // آخر 24 ساعة مزامنة
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentSyncs = await ZKTecoDevice.aggregate([
      { $unwind: '$syncLogs' },
      { $match: { 'syncLogs.startedAt': { $gte: yesterday } } },
      {
        $group: {
          _id: '$syncLogs.status',
          count: { $sum: 1 },
          totalRecords: { $sum: '$syncLogs.recordsSynced' },
        },
      },
    ]);

    return {
      ...basicStats,
      connectionHealth: healthStatus,
      last24hSyncs: recentSyncs,
    };
  }
}

module.exports = ZKTecoService;
