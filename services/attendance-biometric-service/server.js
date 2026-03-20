'use strict';
const express = require('express');
const mongoose = require('mongoose');
const Redis = require('ioredis');
const { Queue, Worker } = require('bullmq');
const cron = require('node-cron');
const axios = require('axios');
const helmet = require('helmet');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3320;
app.use(helmet());
app.use(cors());
app.use(express.json());

mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://mongodb:27017/alawael_attendance', { maxPoolSize: 15 })
  .then(() => console.log('✅ Attendance DB connected'));
const redis = new Redis(process.env.REDIS_URL || 'redis://redis:6379/9');
const alertQueue = new Queue('attendance-alerts', { connection: redis });

/* ─── Schemas ─── */
const attendanceSchema = new mongoose.Schema(
  {
    personId: { type: String, index: true },
    personType: { type: String, enum: ['employee', 'student', 'beneficiary', 'visitor'] },
    personName: { ar: String, en: String },
    date: { type: Date, index: true },
    checkIn: { time: Date, method: String, deviceId: String, confidence: Number, photo: String },
    checkOut: { time: Date, method: String, deviceId: String, confidence: Number, photo: String },
    status: { type: String, enum: ['present', 'absent', 'late', 'early-leave', 'half-day', 'excused', 'holiday'], default: 'present' },
    workHours: Number,
    overtimeHours: Number,
    lateMinutes: Number,
    earlyLeaveMinutes: Number,
    location: { lat: Number, lng: Number },
    branch: String,
    department: String,
    notes: String,
  },
  { timestamps: true },
);
attendanceSchema.index({ personId: 1, date: 1 }, { unique: true });
const Attendance = mongoose.model('Attendance', attendanceSchema);

const deviceSchema = new mongoose.Schema(
  {
    name: String,
    serialNumber: { type: String, unique: true },
    type: { type: String, enum: ['zkteco', 'hikvision', 'suprema', 'nfc-reader', 'qr-scanner'] },
    model: String,
    ip: String,
    port: Number,
    location: { building: String, floor: String, room: String },
    branch: String,
    credentials: { username: String, password: String },
    capabilities: [{ type: String, enum: ['fingerprint', 'face', 'card', 'qr', 'iris'] }],
    lastSync: Date,
    lastHeartbeat: Date,
    status: { type: String, enum: ['online', 'offline', 'error', 'maintenance'], default: 'offline' },
    firmware: String,
    enrolledUsers: { type: Number, default: 0 },
  },
  { timestamps: true },
);
const Device = mongoose.model('Device', deviceSchema);

const shiftSchema = new mongoose.Schema(
  {
    name: { ar: String, en: String },
    code: { type: String, unique: true },
    startTime: String, // HH:mm
    endTime: String,
    graceMinutes: { type: Number, default: 15 },
    earlyLeaveMinutes: { type: Number, default: 15 },
    workDays: [Number], // 0=Sun, 6=Sat
    breakDuration: Number, // minutes
    isDefault: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);
const Shift = mongoose.model('Shift', shiftSchema);

const attendanceRuleSchema = new mongoose.Schema(
  {
    name: String,
    type: { type: String, enum: ['auto-absent', 'late-alert', 'early-leave-alert', 'overtime-approval', 'consecutive-absence'] },
    conditions: {
      threshold: Number, // minutes or days
      personType: String,
      department: String,
    },
    actions: [
      {
        type: { type: String, enum: ['notify-parent', 'notify-manager', 'notify-hr', 'auto-deduct', 'flag-review'] },
        target: String,
      },
    ],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);
const AttendanceRule = mongoose.model('AttendanceRule', attendanceRuleSchema);

const attendanceEventSchema = new mongoose.Schema(
  {
    deviceId: String,
    personId: String,
    eventType: { type: String, enum: ['check-in', 'check-out', 'break-start', 'break-end'] },
    method: String,
    confidence: Number,
    rawData: mongoose.Schema.Types.Mixed,
    processed: { type: Boolean, default: false },
    photo: String,
    timestamp: Date,
  },
  { timestamps: true },
);
attendanceEventSchema.index({ timestamp: -1, processed: 1 });
const AttendanceEvent = mongoose.model('AttendanceEvent', attendanceEventSchema);

/* ─── Event Processing ─── */
async function processAttendanceEvent(event) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let attendance = await Attendance.findOne({ personId: event.personId, date: today });

  if (!attendance) {
    attendance = new Attendance({
      personId: event.personId,
      personType: 'employee',
      date: today,
      branch: '',
      status: 'present',
    });
  }

  if (event.eventType === 'check-in' && !attendance.checkIn?.time) {
    attendance.checkIn = {
      time: event.timestamp,
      method: event.method,
      deviceId: event.deviceId,
      confidence: event.confidence,
      photo: event.photo,
    };
    // Check if late
    const defaultShift = await Shift.findOne({ isDefault: true });
    if (defaultShift) {
      const [h, m] = defaultShift.startTime.split(':').map(Number);
      const shiftStart = new Date(today);
      shiftStart.setHours(h, m, 0, 0);
      const grace = new Date(shiftStart.getTime() + defaultShift.graceMinutes * 60000);
      if (event.timestamp > grace) {
        attendance.status = 'late';
        attendance.lateMinutes = Math.round((event.timestamp - shiftStart) / 60000);
        // Trigger late alert
        await alertQueue.add('late-alert', { personId: event.personId, lateMinutes: attendance.lateMinutes });
      }
    }
  } else if (event.eventType === 'check-out') {
    attendance.checkOut = { time: event.timestamp, method: event.method, deviceId: event.deviceId, confidence: event.confidence };
    if (attendance.checkIn?.time) {
      const hours = (event.timestamp - attendance.checkIn.time) / 3600000;
      attendance.workHours = Math.round(hours * 100) / 100;
    }
  }

  await attendance.save();
  await redis.publish('attendance:event', JSON.stringify({ personId: event.personId, type: event.eventType, time: event.timestamp }));
  return attendance;
}

/* ─── Device Sync ─── */
async function syncZKTecoDevice(device) {
  try {
    const url = `http://${device.ip}:${device.port || 80}`;
    const resp = await axios.get(`${url}/iclock/cdata?cmd=attlog`, {
      auth: { username: device.credentials?.username || 'admin', password: device.credentials?.password || '' },
      timeout: 10000,
    });
    const lines = resp.data.split('\n').filter(l => l.trim());
    let processed = 0;
    for (const line of lines) {
      const parts = line.split('\t');
      if (parts.length < 3) continue;
      const event = await AttendanceEvent.create({
        deviceId: device.serialNumber,
        personId: parts[0],
        eventType: 'check-in',
        method: 'fingerprint',
        timestamp: new Date(parts[1]),
        rawData: { raw: line },
      });
      await processAttendanceEvent(event);
      processed++;
    }
    device.lastSync = new Date();
    device.status = 'online';
    await device.save();
    return { success: true, processed };
  } catch (e) {
    device.status = 'error';
    await device.save();
    return { success: false, error: e.message };
  }
}

/* ─── Alert Worker ─── */
new Worker(
  'attendance-alerts',
  async job => {
    console.log(`Processing alert: ${job.name}`, job.data);
    // Would integrate with communication-hub to send notifications
  },
  { connection: redis },
);

/* ─── Routes ─── */
// Record event (from devices / manual)
app.post('/api/attendance/event', async (req, res) => {
  try {
    const event = await AttendanceEvent.create({ ...req.body, timestamp: req.body.timestamp || new Date() });
    const attendance = await processAttendanceEvent(event);
    event.processed = true;
    await event.save();
    res.status(201).json({ event, attendance });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Bulk event ingestion (from device sync)
app.post('/api/attendance/events/bulk', async (req, res) => {
  const results = { success: 0, failed: 0 };
  for (const ev of req.body.events) {
    try {
      const event = await AttendanceEvent.create({ ...ev, timestamp: ev.timestamp || new Date() });
      await processAttendanceEvent(event);
      event.processed = true;
      await event.save();
      results.success++;
    } catch {
      results.failed++;
    }
  }
  res.json(results);
});

// Get attendance records
app.get('/api/attendance', async (req, res) => {
  const { personId, personType, date, startDate, endDate, status, branch, page = 1, limit = 50 } = req.query;
  const filter = {};
  if (personId) filter.personId = personId;
  if (personType) filter.personType = personType;
  if (status) filter.status = status;
  if (branch) filter.branch = branch;
  if (date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    filter.date = d;
  } else if (startDate && endDate) filter.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
  const [records, total] = await Promise.all([
    Attendance.find(filter)
      .skip((page - 1) * limit)
      .limit(+limit)
      .sort({ date: -1 }),
    Attendance.countDocuments(filter),
  ]);
  res.json({ records, total, page: +page, pages: Math.ceil(total / limit) });
});

// Daily summary
app.get('/api/attendance/summary/:date', async (req, res) => {
  const d = new Date(req.params.date);
  d.setHours(0, 0, 0, 0);
  const [present, late, absent, earlyLeave, total] = await Promise.all([
    Attendance.countDocuments({ date: d, status: 'present' }),
    Attendance.countDocuments({ date: d, status: 'late' }),
    Attendance.countDocuments({ date: d, status: 'absent' }),
    Attendance.countDocuments({ date: d, status: 'early-leave' }),
    Attendance.countDocuments({ date: d }),
  ]);
  res.json({
    date: d,
    present,
    late,
    absent,
    earlyLeave,
    total,
    attendanceRate: total > 0 ? (((present + late) / total) * 100).toFixed(1) : 0,
  });
});

// Manual check-in/out
app.post('/api/attendance/manual', async (req, res) => {
  try {
    const { personId, personType, personName, type, notes } = req.body;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let attendance = await Attendance.findOne({ personId, date: today });
    if (!attendance) attendance = new Attendance({ personId, personType, personName, date: today, status: 'present' });
    if (type === 'check-in') attendance.checkIn = { time: new Date(), method: 'manual' };
    else attendance.checkOut = { time: new Date(), method: 'manual' };
    attendance.notes = notes;
    await attendance.save();
    res.json(attendance);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

/* ─── Device Management ─── */
app.get('/api/devices', async (_, res) => res.json(await Device.find()));
app.post('/api/devices', async (req, res) => {
  try {
    res.status(201).json(await Device.create(req.body));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
app.put('/api/devices/:id', async (req, res) => res.json(await Device.findByIdAndUpdate(req.params.id, req.body, { new: true })));

app.post('/api/devices/:id/sync', async (req, res) => {
  const device = await Device.findById(req.params.id);
  if (!device) return res.status(404).json({ error: 'Not found' });
  const result = device.type === 'zkteco' ? await syncZKTecoDevice(device) : { success: false, error: 'Unsupported device' };
  res.json(result);
});

app.post('/api/devices/sync-all', async (_, res) => {
  const devices = await Device.find({ status: { $ne: 'maintenance' } });
  const results = [];
  for (const d of devices) {
    const r = d.type === 'zkteco' ? await syncZKTecoDevice(d) : { device: d.name, skipped: true };
    results.push({ device: d.name, ...r });
  }
  res.json({ synced: results.length, results });
});

// Device health check
app.get('/api/devices/health', async (_, res) => {
  const devices = await Device.find();
  const results = [];
  for (const d of devices) {
    try {
      await axios.get(`http://${d.ip}:${d.port || 80}/`, { timeout: 3000 });
      d.lastHeartbeat = new Date();
      d.status = 'online';
      await d.save();
      results.push({ name: d.name, status: 'online' });
    } catch {
      d.status = 'offline';
      await d.save();
      results.push({ name: d.name, status: 'offline' });
    }
  }
  res.json(results);
});

/* ─── Shift Management ─── */
app.get('/api/shifts', async (_, res) => res.json(await Shift.find({ isActive: true })));
app.post('/api/shifts', async (req, res) => {
  try {
    res.status(201).json(await Shift.create(req.body));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

/* ─── Rules ─── */
app.get('/api/attendance/rules', async (_, res) => res.json(await AttendanceRule.find()));
app.post('/api/attendance/rules', async (req, res) => {
  try {
    res.status(201).json(await AttendanceRule.create(req.body));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

/* ─── Stats ─── */
app.get('/api/attendance/stats', async (_, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [todayPresent, todayLate, todayAbsent, totalDevices, onlineDevices] = await Promise.all([
    Attendance.countDocuments({ date: today, status: 'present' }),
    Attendance.countDocuments({ date: today, status: 'late' }),
    Attendance.countDocuments({ date: today, status: 'absent' }),
    Device.countDocuments(),
    Device.countDocuments({ status: 'online' }),
  ]);
  res.json({ todayPresent, todayLate, todayAbsent, totalDevices, onlineDevices });
});

// Auto-mark absent (2:00 PM daily)
cron.schedule('0 14 * * *', async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // Find all employees who don't have attendance today
  console.log('⏰ Auto-marking absences...');
});

// Device sync every 15 minutes
cron.schedule('*/15 * * * *', async () => {
  const devices = await Device.find({ status: { $ne: 'maintenance' }, type: 'zkteco' });
  for (const d of devices) await syncZKTecoDevice(d);
});

app.get('/health', (_, res) => res.json({ status: 'healthy', service: 'attendance-biometric-service', uptime: process.uptime() }));
app.listen(PORT, () => console.log(`📋 Attendance Biometric Service running on port ${PORT}`));
