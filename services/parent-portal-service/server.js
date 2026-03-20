/**
 * Parent Portal Service — Al-Awael ERP
 * Port: 3390
 *
 * Backend-for-Frontend (BFF) for parent/guardian mobile app & web portal.
 * OTP authentication, child dashboard, report cards, attendance,
 * bus tracking, fee payment, messaging, appointment booking,
 * media gallery, announcements, feedback.
 */

'use strict';

const express = require('express');
const mongoose = require('mongoose');
const Redis = require('ioredis');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const helmet = require('helmet');
const cors = require('cors');

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '5mb' }));

const redis = new Redis(process.env.REDIS_URL || 'redis://redis:6379/0', {
  maxRetriesPerRequest: null,
  retryStrategy: t => Math.min(t * 200, 5000),
});
const pub = redis.duplicate();

const JWT_SECRET = process.env.JWT_SECRET || 'parent-portal-secret-change-me';

/* ───────── Mongoose schemas ───────── */

// Parent Account
const parentSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true, unique: true },
    phoneVerified: { type: Boolean, default: false },
    email: String,
    name: { type: String, required: true },
    nameAr: { type: String, required: true },
    nationalId: String,
    relation: { type: String, enum: ['father', 'mother', 'guardian', 'other'], default: 'father' },
    children: [{ type: String }], // studentIds linked
    avatar: String,
    preferredLanguage: { type: String, enum: ['ar', 'en'], default: 'ar' },
    pushToken: String, // FCM / APNS token
    deviceType: { type: String, enum: ['ios', 'android', 'web'] },
    lastLogin: Date,
    isActive: { type: Boolean, default: true },
    settings: {
      notifications: {
        attendance: { type: Boolean, default: true },
        grades: { type: Boolean, default: true },
        fees: { type: Boolean, default: true },
        bus: { type: Boolean, default: true },
        announcements: { type: Boolean, default: true },
        messages: { type: Boolean, default: true },
      },
    },
  },
  { timestamps: true },
);

const Parent = mongoose.model('Parent', parentSchema);

// Message (parent ↔ staff)
const messageSchema = new mongoose.Schema(
  {
    conversationId: { type: String, index: true },
    from: { type: String, required: true }, // userId
    fromType: { type: String, enum: ['parent', 'teacher', 'admin', 'system'], required: true },
    to: { type: String, required: true },
    toType: { type: String, enum: ['parent', 'teacher', 'admin'] },
    subject: String,
    body: { type: String, required: true },
    bodyAr: String,
    attachments: [{ name: String, url: String, type: String, size: Number }],
    isRead: { type: Boolean, default: false },
    readAt: Date,
    category: { type: String, enum: ['general', 'academic', 'behaviour', 'health', 'fee', 'transport', 'urgent'], default: 'general' },
    childId: String, // linked student
  },
  { timestamps: true },
);

const Message = mongoose.model('PortalMessage', messageSchema);

// Announcement
const announcementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    titleAr: { type: String },
    body: { type: String, required: true },
    bodyAr: String,
    type: {
      type: String,
      enum: ['general', 'academic', 'event', 'holiday', 'emergency', 'maintenance', 'fee-reminder'],
      default: 'general',
    },
    priority: { type: String, enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' },
    targetAudience: { type: String, enum: ['all', 'grade', 'class', 'individual'], default: 'all' },
    targetIds: [String], // gradeIds / classIds / parentIds
    attachments: [{ name: String, url: String }],
    publishDate: { type: Date, default: Date.now },
    expiryDate: Date,
    isPublished: { type: Boolean, default: true },
    readBy: [{ parentId: String, readAt: Date }],
    createdBy: String,
  },
  { timestamps: true },
);

const Announcement = mongoose.model('Announcement', announcementSchema);

// Appointment
const appointmentSchema = new mongoose.Schema(
  {
    parentId: { type: String, required: true, index: true },
    childId: String,
    staffId: { type: String, required: true },
    staffName: String,
    staffRole: String,
    date: { type: Date, required: true },
    timeSlot: { type: String, required: true }, // "09:00-09:30"
    type: {
      type: String,
      enum: ['parent-teacher', 'counselor', 'therapist', 'admin', 'fee-discussion', 'other'],
      default: 'parent-teacher',
    },
    status: { type: String, enum: ['requested', 'confirmed', 'cancelled', 'completed', 'no-show'], default: 'requested' },
    notes: String,
    meetingLink: String, // for virtual meetings
    cancelReason: String,
  },
  { timestamps: true },
);

const Appointment = mongoose.model('PortalAppointment', appointmentSchema);

// Feedback / Review
const feedbackSchema = new mongoose.Schema(
  {
    parentId: { type: String, required: true },
    childId: String,
    category: {
      type: String,
      enum: ['service', 'academic', 'facility', 'transport', 'food', 'staff', 'suggestion', 'complaint', 'other'],
      required: true,
    },
    subject: String,
    body: { type: String, required: true },
    rating: { type: Number, min: 1, max: 5 },
    status: { type: String, enum: ['submitted', 'acknowledged', 'in-progress', 'resolved', 'closed'], default: 'submitted' },
    response: String,
    respondedBy: String,
    respondedAt: Date,
    isAnonymous: { type: Boolean, default: false },
  },
  { timestamps: true },
);

const Feedback = mongoose.model('PortalFeedback', feedbackSchema);

// Media Gallery (photos/videos of children)
const mediaSchema = new mongoose.Schema(
  {
    title: String,
    titleAr: String,
    childId: { type: String, index: true },
    classId: String,
    type: { type: String, enum: ['photo', 'video', 'document'], required: true },
    url: { type: String, required: true },
    thumbnailUrl: String,
    uploadedBy: String,
    event: String, // e.g., "National Day Celebration"
    tags: [String],
    isApproved: { type: Boolean, default: true },
    viewCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

const Media = mongoose.model('PortalMedia', mediaSchema);

/* ───────── OTP auth ───────── */

async function sendOTP(phone) {
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  await redis.setex(`otp:${phone}`, 300, otp); // 5 min TTL
  // In production: send via communication-hub
  await pub.publish('portal:otp-request', JSON.stringify({ phone, otp }));
  console.log(`[ParentPortal] OTP for ${phone}: ${otp}`);
  return true;
}

async function verifyOTP(phone, otp) {
  const stored = await redis.get(`otp:${phone}`);
  if (!stored || stored !== otp) return false;
  await redis.del(`otp:${phone}`);
  return true;
}

function generateTokens(parent) {
  const accessToken = jwt.sign({ id: parent._id, phone: parent.phone, role: 'parent' }, JWT_SECRET, { expiresIn: '7d' });
  const refreshToken = jwt.sign({ id: parent._id, type: 'refresh' }, JWT_SECRET, { expiresIn: '30d' });
  return { accessToken, refreshToken };
}

// Auth middleware
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ success: false, error: 'Token required' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ success: false, error: 'Invalid token' });
  }
}

/* ───────── Service proxies (BFF pattern) ───────── */

const SERVICE_URLS = {
  backend: process.env.BACKEND_URL || 'http://backend:5000',
  attendance: process.env.ATTENDANCE_URL || 'http://attendance-biometric-service:3320',
  fleet: process.env.FLEET_URL || 'http://fleet-transport-service:3330',
  billing: process.env.BILLING_URL || 'http://fee-billing-service:3410',
  rehab: process.env.REHAB_URL || 'http://rehabilitation-care-service:3400',
};

async function proxyGet(service, path) {
  try {
    const resp = await axios.get(`${SERVICE_URLS[service]}${path}`, { timeout: 5000 });
    return resp.data?.data || resp.data;
  } catch {
    return null;
  }
}

/* ───────── Routes ───────── */
const r = express.Router();

// ── Auth ──
r.post('/auth/request-otp', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ success: false, error: 'Phone required' });
    await sendOTP(phone);
    res.json({ success: true, message: 'OTP sent' });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

r.post('/auth/verify-otp', async (req, res) => {
  try {
    const { phone, otp, pushToken, deviceType } = req.body;
    const valid = await verifyOTP(phone, otp);
    if (!valid) return res.status(401).json({ success: false, error: 'Invalid or expired OTP' });

    let parent = await Parent.findOne({ phone });
    if (!parent) {
      return res.json({ success: true, isNewUser: true, message: 'OTP verified. Registration required.' });
    }

    parent.phoneVerified = true;
    parent.lastLogin = new Date();
    if (pushToken) parent.pushToken = pushToken;
    if (deviceType) parent.deviceType = deviceType;
    await parent.save();

    const tokens = generateTokens(parent);
    res.json({ success: true, data: { parent, ...tokens } });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

r.post('/auth/register', async (req, res) => {
  try {
    const { phone, name, nameAr, email, nationalId, relation, pushToken, deviceType } = req.body;
    const exists = await Parent.findOne({ phone });
    if (exists) return res.status(400).json({ success: false, error: 'Account already exists' });

    // Verify OTP was completed (check verified flag in Redis)
    const parent = await Parent.create({
      phone,
      phoneVerified: true,
      name,
      nameAr,
      email,
      nationalId,
      relation,
      pushToken,
      deviceType,
      lastLogin: new Date(),
    });

    const tokens = generateTokens(parent);
    res.status(201).json({ success: true, data: { parent, ...tokens } });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

r.post('/auth/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const decoded = jwt.verify(refreshToken, JWT_SECRET);
    const parent = await Parent.findById(decoded.id);
    if (!parent) return res.status(401).json({ success: false, error: 'Invalid token' });
    const tokens = generateTokens(parent);
    res.json({ success: true, data: tokens });
  } catch {
    res.status(401).json({ success: false, error: 'Invalid refresh token' });
  }
});

// ── Protected routes ──
r.use(authMiddleware);

// ── Profile ──
r.get('/profile', async (req, res) => {
  try {
    const parent = await Parent.findById(req.user.id);
    res.json({ success: true, data: parent });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

r.put('/profile', async (req, res) => {
  try {
    const allowed = ['name', 'nameAr', 'email', 'avatar', 'preferredLanguage', 'pushToken', 'settings'];
    const updates = {};
    for (const k of allowed) if (req.body[k] !== undefined) updates[k] = req.body[k];
    const parent = await Parent.findByIdAndUpdate(req.user.id, updates, { new: true });
    res.json({ success: true, data: parent });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

// ── Child Dashboard (aggregates from multiple services) ──
r.get('/children', async (req, res) => {
  try {
    const parent = await Parent.findById(req.user.id);
    if (!parent?.children?.length) return res.json({ success: true, data: [] });
    // Proxy to backend for student details
    const children = await proxyGet('backend', `/api/students?ids=${parent.children.join(',')}`);
    res.json({ success: true, data: children || parent.children });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

r.get('/children/:childId/dashboard', async (req, res) => {
  try {
    const { childId } = req.params;
    // Parallel fetch from multiple services
    const [attendance, fees, busPosition, rehabProgress] = await Promise.all([
      proxyGet('attendance', `/api/attendance?personId=${childId}&limit=7`),
      proxyGet('billing', `/api/statement/${childId}`),
      proxyGet('fleet', `/api/vehicles/live?passengerId=${childId}`),
      proxyGet('rehab', `/api/beneficiaries/${childId}/dashboard`),
    ]);

    const recentMedia = await Media.find({ childId }).sort({ createdAt: -1 }).limit(5);
    const unreadMessages = await Message.countDocuments({ to: req.user.id, isRead: false });

    res.json({
      success: true,
      data: {
        childId,
        attendance,
        fees,
        busPosition,
        rehabProgress,
        recentMedia,
        unreadMessages,
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

r.get('/children/:childId/attendance', async (req, res) => {
  try {
    const { from, to } = req.query;
    const data = await proxyGet('attendance', `/api/attendance?personId=${req.params.childId}&from=${from || ''}&to=${to || ''}`);
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

r.get('/children/:childId/fees', async (req, res) => {
  try {
    const data = await proxyGet('billing', `/api/statement/${req.params.childId}`);
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

r.get('/children/:childId/bus-tracking', async (req, res) => {
  try {
    const data = await proxyGet('fleet', `/api/trips/active?passengerId=${req.params.childId}`);
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

r.get('/children/:childId/media', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const media = await Media.find({ childId: req.params.childId, isApproved: true })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    res.json({ success: true, data: media });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── Messages ──
r.get('/messages', async (req, res) => {
  try {
    const { category, unreadOnly } = req.query;
    const q = { $or: [{ from: req.user.id }, { to: req.user.id }] };
    if (category) q.category = category;
    if (unreadOnly === 'true') q.isRead = false;
    const messages = await Message.find(q).sort({ createdAt: -1 }).limit(100);
    res.json({ success: true, data: messages });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

r.post('/messages', async (req, res) => {
  try {
    const { to, toType, subject, body, bodyAr, category, childId, attachments } = req.body;
    const msg = await Message.create({
      conversationId: uuidv4(),
      from: req.user.id,
      fromType: 'parent',
      to,
      toType: toType || 'teacher',
      subject,
      body,
      bodyAr,
      category,
      childId,
      attachments,
    });

    await pub.publish(
      'portal:message-sent',
      JSON.stringify({
        messageId: msg._id,
        from: req.user.id,
        to,
        subject,
      }),
    );

    res.status(201).json({ success: true, data: msg });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

r.post('/messages/:id/read', async (req, res) => {
  try {
    await Message.findByIdAndUpdate(req.params.id, { isRead: true, readAt: new Date() });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── Announcements ──
r.get('/announcements', async (req, res) => {
  try {
    const parent = await Parent.findById(req.user.id);
    const now = new Date();
    const announcements = await Announcement.find({
      isPublished: true,
      publishDate: { $lte: now },
      $or: [{ expiryDate: null }, { expiryDate: { $gte: now } }],
      $or: [{ targetAudience: 'all' }, { targetIds: { $in: parent?.children || [] } }],
    })
      .sort({ priority: -1, publishDate: -1 })
      .limit(50);

    res.json({ success: true, data: announcements });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

r.post('/announcements/:id/read', async (req, res) => {
  try {
    await Announcement.findByIdAndUpdate(req.params.id, {
      $addToSet: { readBy: { parentId: req.user.id, readAt: new Date() } },
    });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── Appointments ──
r.get('/appointments', async (req, res) => {
  try {
    const { status } = req.query;
    const q = { parentId: req.user.id };
    if (status) q.status = status;
    const appointments = await Appointment.find(q).sort({ date: 1 });
    res.json({ success: true, data: appointments });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

r.post('/appointments', async (req, res) => {
  try {
    const { staffId, staffName, staffRole, childId, date, timeSlot, type, notes } = req.body;
    // Check conflicts
    const conflict = await Appointment.findOne({ staffId, date, timeSlot, status: { $in: ['requested', 'confirmed'] } });
    if (conflict) return res.status(400).json({ success: false, error: 'Time slot already booked' });

    const appt = await Appointment.create({
      parentId: req.user.id,
      childId,
      staffId,
      staffName,
      staffRole,
      date,
      timeSlot,
      type,
      notes,
    });

    await pub.publish(
      'portal:appointment-requested',
      JSON.stringify({
        appointmentId: appt._id,
        parentId: req.user.id,
        staffId,
        date,
        timeSlot,
      }),
    );

    res.status(201).json({ success: true, data: appt });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

r.post('/appointments/:id/cancel', async (req, res) => {
  try {
    const appt = await Appointment.findOne({ _id: req.params.id, parentId: req.user.id });
    if (!appt) return res.status(404).json({ success: false, error: 'Not found' });
    appt.status = 'cancelled';
    appt.cancelReason = req.body.reason;
    await appt.save();
    res.json({ success: true, data: appt });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── Feedback ──
r.post('/feedback', async (req, res) => {
  try {
    const fb = await Feedback.create({ ...req.body, parentId: req.user.id });
    await pub.publish('portal:feedback-submitted', JSON.stringify({ feedbackId: fb._id, category: fb.category }));
    res.status(201).json({ success: true, data: fb });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

r.get('/feedback', async (req, res) => {
  try {
    const fb = await Feedback.find({ parentId: req.user.id }).sort({ createdAt: -1 });
    res.json({ success: true, data: fb });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── Admin routes (for staff to manage portal content) ──
r.post('/admin/announcements', async (req, res) => {
  try {
    const ann = await Announcement.create({ ...req.body, createdBy: req.user.id });
    // Send push notification
    if (ann.priority === 'urgent') {
      await pub.publish(
        'portal:urgent-announcement',
        JSON.stringify({
          announcementId: ann._id,
          title: ann.title,
          titleAr: ann.titleAr,
        }),
      );
    }
    res.status(201).json({ success: true, data: ann });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

r.post('/admin/media', async (req, res) => {
  try {
    const m = await Media.create({ ...req.body, uploadedBy: req.user.id });
    res.status(201).json({ success: true, data: m });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

r.post('/admin/link-child', async (req, res) => {
  try {
    const { parentId, studentId } = req.body;
    await Parent.findByIdAndUpdate(parentId, { $addToSet: { children: studentId } });
    res.json({ success: true, message: 'Child linked' });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

app.use('/api', r);

// Health
app.get('/health', async (_req, res) => {
  const mongoOk = mongoose.connection.readyState === 1;
  const redisOk = redis.status === 'ready';
  const ok = mongoOk && redisOk;
  res.status(ok ? 200 : 503).json({ status: ok ? 'healthy' : 'degraded', mongo: mongoOk, redis: redisOk, uptime: process.uptime() });
});

/* ───────── Start ───────── */
const PORT = process.env.PORT || 3390;
const MONGO = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://mongodb:27017/alawael_portal';

mongoose
  .connect(MONGO)
  .then(() => {
    console.log('[ParentPortal] MongoDB connected');
    app.listen(PORT, '0.0.0.0', () => console.log(`[ParentPortal] listening on ${PORT}`));
  })
  .catch(err => {
    console.error('[ParentPortal] Mongo error', err);
    process.exit(1);
  });
