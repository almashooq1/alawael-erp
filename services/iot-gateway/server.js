/*  ═══════════════════════════════════════════════════════════════
 *  Al-Awael ERP — IoT Gateway (بوابة إنترنت الأشياء)
 *  Port 3290 · Device Hub for Biometrics & Access Control
 *  Provides: ZKTeco attendance, Hikvision camera/access,
 *  biometric fingerprint, NFC/RFID, health wearables, MQTT hub
 *  ═══════════════════════════════════════════════════════════════ */

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const Redis = require('ioredis');
const axios = require('axios');
const WebSocket = require('ws');
const net = require('net');
const winston = require('winston');

const app = express();
app.use(express.json());

const log = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()],
});

/* ── Connections ─────────────────────────────────────────────── */
const redis = new Redis(process.env.REDIS_URL || 'redis://redis:6379/10');

mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://mongodb:27017/alawael', {
    maxPoolSize: 5,
  })
  .then(() => log.info('MongoDB connected'));

/* ── Schemas ─────────────────────────────────────────────────── */
const Device = mongoose.model(
  'IoTDevice',
  new mongoose.Schema({
    name: { type: String, required: true },
    type: { type: String, enum: ['zkteco', 'hikvision', 'biometric', 'nfc', 'wearable', 'sensor', 'generic'], required: true, index: true },
    model: String,
    serialNumber: { type: String, unique: true, sparse: true },
    ip: String,
    port: Number,
    protocol: { type: String, enum: ['http', 'tcp', 'mqtt', 'ws'], default: 'http' },
    credentials: Object, // encrypted in production
    location: String,
    organizationId: { type: String, index: true },
    status: { type: String, enum: ['online', 'offline', 'error', 'maintenance'], default: 'offline' },
    lastHeartbeat: Date,
    firmware: String,
    config: Object,
    createdAt: { type: Date, default: Date.now },
  }),
);

const DeviceEvent = mongoose.model(
  'DeviceEvent',
  new mongoose.Schema({
    deviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'IoTDevice', index: true },
    deviceType: { type: String, index: true },
    eventType: { type: String, index: true }, // attendance, access, temperature, alert
    personId: String, // employee/child ID
    personName: String,
    data: Object, // raw device data
    timestamp: { type: Date, default: Date.now, index: true },
    processed: { type: Boolean, default: false },
    organizationId: { type: String, index: true },
  }),
);

const AttendanceRecord = mongoose.model(
  'IoTAttendance',
  new mongoose.Schema({
    personId: { type: String, required: true, index: true },
    personType: { type: String, enum: ['employee', 'child', 'visitor'], index: true },
    deviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'IoTDevice' },
    direction: { type: String, enum: ['in', 'out'], required: true },
    method: { type: String, enum: ['fingerprint', 'face', 'card', 'nfc', 'pin', 'manual'] },
    timestamp: { type: Date, default: Date.now, index: true },
    confidence: Number, // biometric match confidence
    photo: String, // snapshot path if face/camera
    location: String,
    organizationId: { type: String, index: true },
  }),
);

/* ── ZKTeco Integration ──────────────────────────────────────── */
class ZKTecoDriver {
  constructor(device) {
    this.device = device;
    this.baseUrl = `http://${device.ip}:${device.port || 80}`;
  }

  async getAttendance(startDate, endDate) {
    try {
      const response = await axios.get(`${this.baseUrl}/iclock/attlog`, {
        params: { startDate, endDate },
        auth: this.device.credentials,
        timeout: 15000,
      });
      return this._parseAttendance(response.data);
    } catch (e) {
      log.error('ZKTeco attendance fetch error', { device: this.device.name, error: e.message });
      throw e;
    }
  }

  async getUsers() {
    const response = await axios.get(`${this.baseUrl}/iclock/users`, {
      auth: this.device.credentials,
      timeout: 15000,
    });
    return response.data;
  }

  async syncUser(user) {
    return axios.post(`${this.baseUrl}/iclock/users`, user, {
      auth: this.device.credentials,
      timeout: 10000,
    });
  }

  async reboot() {
    return axios.post(
      `${this.baseUrl}/iclock/reboot`,
      {},
      {
        auth: this.device.credentials,
        timeout: 5000,
      },
    );
  }

  _parseAttendance(raw) {
    if (!raw) return [];
    const lines = typeof raw === 'string' ? raw.split('\n') : [];
    return lines
      .filter(l => l.trim())
      .map(line => {
        const parts = line.split('\t');
        return {
          personId: parts[0]?.trim(),
          timestamp: new Date(parts[1]?.trim()),
          direction: parseInt(parts[2]?.trim()) === 0 ? 'in' : 'out',
          method: 'fingerprint',
        };
      });
  }
}

/* ── Hikvision Integration ───────────────────────────────────── */
class HikvisionDriver {
  constructor(device) {
    this.device = device;
    this.baseUrl = `http://${device.ip}:${device.port || 80}`;
  }

  async getEvents(startTime, endTime) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/ISAPI/AccessControl/AcsEvent?format=json`,
        {
          AcsEventCond: { searchID: '1', searchResultPosition: 0, maxResults: 100, major: 5, startTime, endTime },
        },
        {
          auth: this.device.credentials,
          timeout: 15000,
        },
      );
      return response.data?.AcsEvent?.InfoList || [];
    } catch (e) {
      log.error('Hikvision event fetch error', { device: this.device.name, error: e.message });
      throw e;
    }
  }

  async addPerson(person) {
    return axios.post(
      `${this.baseUrl}/ISAPI/AccessControl/UserInfo/Record?format=json`,
      {
        UserInfo: {
          employeeNo: person.id,
          name: person.name,
          userType: 'normal',
          Valid: { enable: true, beginTime: person.startDate, endTime: person.endDate },
        },
      },
      { auth: this.device.credentials, timeout: 10000 },
    );
  }

  async addFaceData(personId, imageBase64) {
    return axios.post(
      `${this.baseUrl}/ISAPI/Intelligent/FDLib/FDSetUp?format=json`,
      {
        faceLibType: 'blackFD',
        FDID: '1',
        FPID: personId,
      },
      { auth: this.device.credentials, timeout: 15000 },
    );
  }

  async getDeviceInfo() {
    const response = await axios.get(`${this.baseUrl}/ISAPI/System/deviceInfo`, {
      auth: this.device.credentials,
      timeout: 5000,
    });
    return response.data;
  }
}

/* ── Device driver factory ───────────────────────────────────── */
function getDriver(device) {
  switch (device.type) {
    case 'zkteco':
      return new ZKTecoDriver(device);
    case 'hikvision':
      return new HikvisionDriver(device);
    default:
      return null;
  }
}

/* ── Health ───────────────────────────────────────────────────── */
app.get('/health', async (_req, res) => {
  const online = await Device.countDocuments({ status: 'online' });
  const total = await Device.countDocuments();
  res.json({ status: 'ok', devices: { total, online } });
});

/* ── Device CRUD ─────────────────────────────────────────────── */
app.get('/api/iot/devices', async (req, res) => {
  const { org, type, status } = req.query;
  const filter = {};
  if (org) filter.organizationId = org;
  if (type) filter.type = type;
  if (status) filter.status = status;
  const devices = await Device.find(filter).select('-credentials').sort('name');
  res.json(devices);
});

app.post('/api/iot/devices', async (req, res) => {
  try {
    const device = await Device.create(req.body);
    log.info('Device registered', { name: device.name, type: device.type });
    res.status(201).json(device);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.patch('/api/iot/devices/:id', async (req, res) => {
  const device = await Device.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!device) return res.status(404).json({ error: 'Not found' });
  res.json(device);
});

app.delete('/api/iot/devices/:id', async (req, res) => {
  await Device.findByIdAndDelete(req.params.id);
  res.json({ deleted: true });
});

/* ── Device Heartbeat ────────────────────────────────────────── */
app.post('/api/iot/devices/:id/heartbeat', async (req, res) => {
  const device = await Device.findByIdAndUpdate(
    req.params.id,
    {
      status: 'online',
      lastHeartbeat: new Date(),
      firmware: req.body.firmware,
    },
    { new: true },
  );
  if (!device) return res.status(404).json({ error: 'Not found' });
  await redis.setex(`device:status:${req.params.id}`, 120, 'online');
  res.json({ ack: true });
});

/* ── Sync Attendance from Device ─────────────────────────────── */
app.post('/api/iot/devices/:id/sync-attendance', async (req, res) => {
  try {
    const device = await Device.findById(req.params.id);
    if (!device) return res.status(404).json({ error: 'Device not found' });

    const driver = getDriver(device);
    if (!driver) return res.status(400).json({ error: `No driver for type ${device.type}` });

    const { startDate, endDate } = req.body;
    let records = [];

    if (device.type === 'zkteco') {
      records = await driver.getAttendance(startDate, endDate);
    } else if (device.type === 'hikvision') {
      const events = await driver.getEvents(startDate, endDate);
      records = events.map(e => ({
        personId: e.employeeNoString,
        timestamp: new Date(e.time),
        direction: e.eventType === 'entry' ? 'in' : 'out',
        method: 'face',
      }));
    }

    // Save attendance records
    let saved = 0;
    for (const record of records) {
      const exists = await AttendanceRecord.findOne({
        personId: record.personId,
        deviceId: device._id,
        timestamp: record.timestamp,
      });
      if (!exists) {
        await AttendanceRecord.create({
          ...record,
          deviceId: device._id,
          personType: 'employee',
          organizationId: device.organizationId,
        });
        saved++;
      }
    }

    // Also create device events
    for (const record of records) {
      await DeviceEvent.create({
        deviceId: device._id,
        deviceType: device.type,
        eventType: 'attendance',
        personId: record.personId,
        data: record,
        organizationId: device.organizationId,
      });
    }

    log.info('Attendance synced', { device: device.name, fetched: records.length, saved });
    res.json({ fetched: records.length, saved });
  } catch (e) {
    log.error('Attendance sync error', { error: e.message });
    res.status(500).json({ error: e.message });
  }
});

/* ── Push Event (from device) ────────────────────────────────── */
app.post('/api/iot/events', async (req, res) => {
  try {
    const event = await DeviceEvent.create(req.body);

    // Publish to Redis for real-time subscribers
    await redis.publish(
      'iot:events',
      JSON.stringify({
        eventId: event._id,
        deviceType: event.deviceType,
        eventType: event.eventType,
        personId: event.personId,
        timestamp: event.timestamp,
      }),
    );

    // Auto-process attendance events
    if (event.eventType === 'attendance' && event.personId) {
      await AttendanceRecord.create({
        personId: event.personId,
        personType: event.data?.personType || 'employee',
        deviceId: event.deviceId,
        direction: event.data?.direction || 'in',
        method: event.data?.method || 'fingerprint',
        confidence: event.data?.confidence,
        organizationId: event.organizationId,
      });
    }

    res.status(201).json({ id: event._id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ── Query Attendance ────────────────────────────────────────── */
app.get('/api/iot/attendance', async (req, res) => {
  const { personId, personType, org, startDate, endDate, from = 0, size = 100 } = req.query;
  const filter = {};
  if (personId) filter.personId = personId;
  if (personType) filter.personType = personType;
  if (org) filter.organizationId = org;
  if (startDate || endDate) {
    filter.timestamp = {};
    if (startDate) filter.timestamp.$gte = new Date(startDate);
    if (endDate) filter.timestamp.$lte = new Date(endDate);
  }
  const records = await AttendanceRecord.find(filter)
    .sort('-timestamp')
    .skip(parseInt(from))
    .limit(Math.min(parseInt(size), 500))
    .populate('deviceId', 'name type location');
  const total = await AttendanceRecord.countDocuments(filter);
  res.json({ total, records });
});

/* ── Device Events ───────────────────────────────────────────── */
app.get('/api/iot/events', async (req, res) => {
  const { deviceId, eventType, org, from = 0, size = 50 } = req.query;
  const filter = {};
  if (deviceId) filter.deviceId = deviceId;
  if (eventType) filter.eventType = eventType;
  if (org) filter.organizationId = org;
  const events = await DeviceEvent.find(filter)
    .sort('-timestamp')
    .skip(parseInt(from))
    .limit(Math.min(parseInt(size), 200));
  const total = await DeviceEvent.countDocuments(filter);
  res.json({ total, events });
});

/* ── Device Health Check (ping all devices) ──────────────────── */
app.post('/api/iot/devices/health-check', async (req, res) => {
  const devices = await Device.find({ status: { $ne: 'maintenance' } });
  const results = {};

  await Promise.allSettled(
    devices.map(async device => {
      try {
        if (device.protocol === 'http') {
          await axios.get(`http://${device.ip}:${device.port || 80}`, { timeout: 5000 });
          device.status = 'online';
        } else if (device.protocol === 'tcp') {
          await new Promise((resolve, reject) => {
            const sock = new net.Socket();
            sock.setTimeout(5000);
            sock.connect(device.port, device.ip, () => {
              sock.destroy();
              resolve();
            });
            sock.on('error', e => {
              sock.destroy();
              reject(e);
            });
            sock.on('timeout', () => {
              sock.destroy();
              reject(new Error('timeout'));
            });
          });
          device.status = 'online';
        }
      } catch {
        device.status = 'offline';
      }
      device.lastHeartbeat = new Date();
      await device.save();
      results[device.name] = device.status;
    }),
  );

  res.json(results);
});

/* ── Stats ────────────────────────────────────────────────────── */
app.get('/api/iot/stats', async (_req, res) => {
  const [devicesByType, devicesByStatus, todayAttendance, eventsByType] = await Promise.all([
    Device.aggregate([{ $group: { _id: '$type', count: { $sum: 1 } } }]),
    Device.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    AttendanceRecord.countDocuments({
      timestamp: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
    }),
    DeviceEvent.aggregate([
      { $match: { timestamp: { $gte: new Date(Date.now() - 86400000) } } },
      { $group: { _id: '$eventType', count: { $sum: 1 } } },
    ]),
  ]);
  res.json({ devicesByType, devicesByStatus, todayAttendance, eventsByType });
});

/* ── WebSocket for real-time device events ───────────────────── */
const PORT = process.env.PORT || 3290;
const server = app.listen(PORT, () => log.info(`IoT Gateway running on port ${PORT}`));

const wss = new WebSocket.Server({ server, path: '/ws/iot' });

// Subscribe to Redis events and broadcast to WS clients
const redisSub = new Redis(process.env.REDIS_URL || 'redis://redis:6379/10');
redisSub.subscribe('iot:events');
redisSub.on('message', (_channel, message) => {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
});

wss.on('connection', ws => {
  log.info('WebSocket client connected');
  ws.on('close', () => log.info('WebSocket client disconnected'));
});
