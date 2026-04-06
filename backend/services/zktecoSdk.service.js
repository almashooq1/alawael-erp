/**
 * ZktecoSdk Service — خدمة الاتصال بأجهزة ZKTeco البيومترية
 * النظام 37: الحضور البيومتري ZKTeco
 */
'use strict';

const net = require('net');
const logger = require('../utils/logger');
const ZktecoDevice = require('../models/ZktecoDevice');
const AttendanceLog = require('../models/AttendanceLog');

// ─── أوامر ZKTeco ────────────────────────────────────────────────────────────

const CMD_CONNECT = 0x03e8;
const CMD_DISCONNECT = 0x02bc;
const CMD_ATTLOG = 0x000d;
const CMD_SET_USER = 0x005c;
const CMD_DELETE_USER = 0x0072;
const CMD_ACK_OK = 0x07d0;

/**
 * بناء حزمة أمر ZKTeco
 */
function buildCommand(commandCode, data = Buffer.alloc(0), sessionId = 0) {
  const replyId = Math.floor(Math.random() * 0xffff);
  const header = Buffer.alloc(8);
  header.writeUInt16LE(commandCode, 0);
  header.writeUInt16LE(0, 2);
  header.writeUInt16LE(sessionId, 4);
  header.writeUInt16LE(replyId, 6);
  return Buffer.concat([header, data]);
}

/**
 * التحقق من نجاح الاستجابة
 */
function isSuccessResponse(response) {
  if (!response || response.length < 2) return false;
  const code = response.readUInt16LE(0);
  return code === CMD_ACK_OK;
}

// ─── الاتصال بالجهاز ─────────────────────────────────────────────────────────

/**
 * اختبار الاتصال بجهاز ZKTeco عبر TCP
 */
async function pingDevice(device) {
  return new Promise(resolve => {
    const socket = new net.Socket();
    const timeout = setTimeout(() => {
      socket.destroy();
      resolve(false);
    }, 5000);

    socket.connect(device.port || 4370, device.ipAddress, () => {
      clearTimeout(timeout);
      socket.destroy();
      resolve(true);
    });

    socket.on('error', () => {
      clearTimeout(timeout);
      resolve(false);
    });
  });
}

/**
 * الاتصال بجهاز ZKTeco وتحديث حالته
 */
async function connect(device) {
  try {
    const online = await pingDevice(device);

    await ZktecoDevice.findByIdAndUpdate(device._id, {
      status: online ? 'online' : 'offline',
      lastPingAt: new Date(),
    });

    if (!online) {
      logger.warn(`[ZKTeco] Device offline: ${device.serialNumber}`);
    }

    return online;
  } catch (err) {
    await ZktecoDevice.findByIdAndUpdate(device._id, { status: 'error' });
    logger.error(`[ZKTeco] Connect error: ${err.message}`);
    return false;
  }
}

/**
 * إرسال أمر وقراءة الاستجابة
 */
async function sendCommand(device, command) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    let response = Buffer.alloc(0);
    const timeout = setTimeout(() => {
      socket.destroy();
      reject(new Error('ZKTeco command timeout'));
    }, 10000);

    socket.connect(device.port || 4370, device.ipAddress, () => {
      socket.write(command);
    });

    socket.on('data', chunk => {
      response = Buffer.concat([response, chunk]);
    });

    socket.on('end', () => {
      clearTimeout(timeout);
      resolve(response);
    });

    socket.on('error', err => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

// ─── معالجة سجلات الحضور ────────────────────────────────────────────────────

/**
 * تحليل استجابة سجلات الحضور
 */
function parseAttendanceLogs(response) {
  const logs = [];
  let offset = 8; // تخطي الـ header
  const logSize = 40;

  while (offset + logSize <= response.length) {
    try {
      const userId = response.readUInt16LE(offset);
      const verify = response.readUInt8(offset + 2);
      const timePunch = response.readUInt32LE(offset + 3);
      const inout = response.readUInt8(offset + 7);

      logs.push({
        userId,
        verifyType: verify,
        timestamp: timePunch,
        inout,
      });
    } catch {
      // تجاهل السجلات التالفة
    }
    offset += logSize;
  }

  return logs;
}

/**
 * تحويل نوع التحقق من رقم إلى نص
 */
function mapVerificationMethod(verifyType) {
  switch (verifyType) {
    case 1:
      return 'fingerprint';
    case 4:
      return 'card';
    case 15:
      return 'face';
    default:
      return 'fingerprint';
  }
}

/**
 * تحديد نوع البصمة (دخول/خروج) بناءً على آخر تسجيل
 */
async function determinePunchType(employeeId, punchTime) {
  const dateStr = punchTime.toISOString().split('T')[0];
  const dayStart = new Date(dateStr + 'T00:00:00.000Z');
  const dayEnd = new Date(dateStr + 'T23:59:59.999Z');

  const last = await AttendanceLog.findOne({
    employeeId,
    punchTime: { $gte: dayStart, $lte: dayEnd },
  }).sort({ punchTime: -1 });

  if (!last) return 'checkin';
  if (last.punchType === 'checkin') return 'checkout';
  return 'checkin';
}

/**
 * معالجة سجل حضور واحد من ZKTeco
 */
async function processAttendanceRecord(device, record) {
  const Employee = require('../models/Employee');

  const employee = await Employee.findOne({
    branchId: device.branchId,
    zktecoUserId: record.userId,
  });

  if (!employee) {
    logger.warn(
      `[ZKTeco] Employee not found for userId=${record.userId} device=${device.serialNumber}`
    );
    return null;
  }

  const punchTime = new Date(record.timestamp * 1000);

  // تجنب التكرار
  const exists = await AttendanceLog.exists({
    employeeId: employee._id,
    deviceId: device._id,
    punchTime,
  });

  if (exists) return null;

  const punchType = await determinePunchType(employee._id, punchTime);
  const verificationMethod = mapVerificationMethod(record.verifyType || 1);

  const log = await AttendanceLog.create({
    branchId: device.branchId,
    employeeId: employee._id,
    deviceId: device._id,
    deviceUserId: record.userId,
    punchTime,
    punchType,
    verificationMethod,
    isSynced: true,
    rawData: JSON.stringify(record),
  });

  return log;
}

/**
 * سحب سجلات الحضور من الجهاز (Pull Protocol)
 */
async function pullAttendanceLogs(device, sinceDate = null) {
  const online = await connect(device);
  if (!online) return [];

  try {
    const since = sinceDate || device.lastSyncAt || new Date(Date.now() - 24 * 60 * 60 * 1000);
    const sinceTimestamp = Math.floor(since.getTime() / 1000);

    const data = Buffer.alloc(4);
    data.writeUInt32LE(sinceTimestamp, 0);
    const command = buildCommand(CMD_ATTLOG, data);

    const response = await sendCommand(device, command);
    const rawLogs = parseAttendanceLogs(response);

    const processed = [];
    for (const record of rawLogs) {
      const log = await processAttendanceRecord(device, record);
      if (log) processed.push(log);
    }

    await ZktecoDevice.findByIdAndUpdate(device._id, { lastSyncAt: new Date() });

    logger.info(`[ZKTeco] Pulled ${processed.length} logs from ${device.serialNumber}`);
    return processed;
  } catch (err) {
    logger.error(`[ZKTeco] Pull failed for ${device.serialNumber}:`, err.message);
    return [];
  }
}

/**
 * استقبال بيانات Push من الجهاز
 */
async function handlePushData(data) {
  const device = await ZktecoDevice.findOne({ serialNumber: data.serialNumber });

  if (!device) {
    logger.warn(`[ZKTeco] Unknown device push: ${data.serialNumber}`);
    return;
  }

  for (const record of data.records || []) {
    await processAttendanceRecord(device, record);
  }

  await ZktecoDevice.findByIdAndUpdate(device._id, { lastSyncAt: new Date() });
}

/**
 * تسجيل موظف في الجهاز
 */
async function enrollEmployee(device, employee) {
  const online = await connect(device);
  if (!online) return false;

  try {
    const userId = employee.zktecoUserId || employee._id.toString().slice(-4);
    const nameBuffer = Buffer.alloc(24, 0);
    Buffer.from(employee.name || '').copy(nameBuffer);

    const passwordBuffer = Buffer.alloc(8, 0);
    const cardBuffer = Buffer.alloc(10, 0);
    if (employee.cardNumber) Buffer.from(employee.cardNumber).copy(cardBuffer);

    const privilegeBuffer = Buffer.alloc(1, 0);
    const idBuffer = Buffer.alloc(2);
    idBuffer.writeUInt16LE(parseInt(userId) || 1, 0);

    const userData = Buffer.concat([
      idBuffer,
      nameBuffer,
      passwordBuffer,
      cardBuffer,
      privilegeBuffer,
    ]);
    const command = buildCommand(CMD_SET_USER, userData);

    const response = await sendCommand(device, command);
    const success = isSuccessResponse(response);

    if (success) {
      await ZktecoDevice.findByIdAndUpdate(device._id, { $inc: { enrolledCount: 1 } });
      logger.info(`[ZKTeco] Enrolled employee ${employee._id} on ${device.serialNumber}`);
    }

    return success;
  } catch (err) {
    logger.error(`[ZKTeco] Enroll failed:`, err.message);
    return false;
  }
}

/**
 * حذف موظف من الجهاز
 */
async function removeEmployee(device, employee) {
  const online = await connect(device);
  if (!online) return false;

  try {
    const userId = employee.zktecoUserId || 1;
    const data = Buffer.alloc(2);
    data.writeUInt16LE(parseInt(userId), 0);

    const command = buildCommand(CMD_DELETE_USER, data);
    const response = await sendCommand(device, command);
    const success = isSuccessResponse(response);

    if (success) {
      await ZktecoDevice.findByIdAndUpdate(device._id, { $inc: { enrolledCount: -1 } });
    }

    return success;
  } catch (err) {
    logger.error(`[ZKTeco] Remove employee failed:`, err.message);
    return false;
  }
}

/**
 * فحص صحة جميع الأجهزة
 */
async function healthCheck() {
  const devices = await ZktecoDevice.find({ isActive: true });
  const results = [];

  for (const device of devices) {
    const online = await connect(device);
    results.push({
      device: device.name,
      serial: device.serialNumber,
      online,
      lastSync: device.lastSyncAt,
    });
  }

  return results;
}

module.exports = {
  connect,
  pullAttendanceLogs,
  handlePushData,
  enrollEmployee,
  removeEmployee,
  healthCheck,
  processAttendanceRecord,
};
