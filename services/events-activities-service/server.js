'use strict';
const express = require('express');
const mongoose = require('mongoose');
const Redis = require('ioredis');
const helmet = require('helmet');
const cors = require('cors');
const { Queue } = require('bullmq');
const cron = require('node-cron');

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '5mb' }));

/* ═══════════════════════════════════════════════════════════════ */

const eventSchema = new mongoose.Schema(
  {
    eventNo: { type: String, unique: true },
    titleAr: { type: String, required: true },
    titleEn: String,
    type: {
      type: String,
      enum: [
        'academic',
        'sports',
        'cultural',
        'religious',
        'celebration',
        'workshop',
        'seminar',
        'trip',
        'competition',
        'community',
        'parent-meeting',
        'graduation',
        'orientation',
        'other',
      ],
      required: true,
    },
    category: { type: String, enum: ['student', 'staff', 'parent', 'community', 'all'], default: 'all' },
    description: String,
    startDate: { type: Date, required: true },
    endDate: Date,
    startTime: String,
    endTime: String,
    allDay: { type: Boolean, default: false },
    recurrence: { type: String, enum: ['none', 'daily', 'weekly', 'monthly', 'yearly'], default: 'none' },
    location: { venue: String, address: String, room: String, capacity: Number, isExternal: Boolean },
    organizer: { userId: String, name: String, department: String, phone: String },
    coordinators: [{ userId: String, name: String, role: String }],
    budget: { estimated: Number, actual: Number, currency: { type: String, default: 'SAR' } },
    registration: {
      required: Boolean,
      maxParticipants: Number,
      currentRegistered: { type: Number, default: 0 },
      deadline: Date,
      fee: Number,
    },
    participants: [
      { userId: String, name: String, type: String, status: { type: String, enum: ['registered', 'attended', 'cancelled', 'no-show'] } },
    ],
    agenda: [{ time: String, activity: String, speaker: String, duration: Number }],
    resources: [{ item: String, quantity: Number, status: String }],
    approvals: [{ userId: String, name: String, action: String, date: Date, comment: String }],
    photos: [String],
    attachments: [String],
    feedback: { totalResponses: Number, averageRating: Number },
    status: {
      type: String,
      enum: ['draft', 'pending-approval', 'approved', 'published', 'in-progress', 'completed', 'cancelled', 'postponed'],
      default: 'draft',
    },
    visibility: { type: String, enum: ['public', 'internal', 'restricted'], default: 'public' },
    createdBy: { userId: String, name: String },
  },
  { timestamps: true },
);

eventSchema.pre('save', async function (next) {
  if (!this.eventNo) {
    const count = await this.constructor.countDocuments();
    this.eventNo = `EVT-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

const activitySchema = new mongoose.Schema(
  {
    activityNo: { type: String, unique: true },
    nameAr: { type: String, required: true },
    nameEn: String,
    type: {
      type: String,
      enum: ['club', 'sport', 'art', 'music', 'science', 'technology', 'language', 'leadership', 'volunteer', 'tutoring', 'other'],
      required: true,
    },
    description: String,
    schedule: { days: [String], startTime: String, endTime: String, room: String },
    semester: String,
    academicYear: String,
    supervisor: { userId: String, name: String },
    maxMembers: Number,
    members: [{ studentId: String, studentName: String, joinDate: Date, role: String, status: String }],
    achievements: [{ title: String, date: Date, description: String, awardLevel: String }],
    status: { type: String, enum: ['active', 'inactive', 'full', 'archived'], default: 'active' },
    createdBy: { userId: String, name: String },
  },
  { timestamps: true },
);

activitySchema.pre('save', async function (next) {
  if (!this.activityNo) {
    const count = await this.constructor.countDocuments();
    this.activityNo = `ACT-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

const calendarEntrySchema = new mongoose.Schema(
  {
    titleAr: { type: String, required: true },
    titleEn: String,
    type: {
      type: String,
      enum: ['holiday', 'exam-period', 'event', 'meeting', 'deadline', 'semester-start', 'semester-end', 'registration', 'custom'],
      required: true,
    },
    date: { type: Date, required: true },
    endDate: Date,
    allDay: { type: Boolean, default: true },
    academicYear: String,
    description: String,
    color: String,
    linkedEventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
    visibility: { type: String, enum: ['all', 'staff', 'students', 'parents'], default: 'all' },
    createdBy: { userId: String, name: String },
  },
  { timestamps: true },
);

calendarEntrySchema.index({ date: 1, type: 1 });

const Event = mongoose.model('Event', eventSchema);
const Activity = mongoose.model('Activity', activitySchema);
const CalendarEntry = mongoose.model('CalendarEntry', calendarEntrySchema);

const MONGO = process.env.MONGODB_URI || 'mongodb://localhost:27017/alawael_events';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const PORT = process.env.PORT || 3510;

const redis = new Redis(REDIS_URL, { maxRetriesPerRequest: null, retryStrategy: t => Math.min(t * 200, 5000) });
const eventsQueue = new Queue('events-tasks', { connection: redis });

/* ═══════════════════════════════════════════════════════════════ */
app.get('/health', async (_req, res) => {
  const mongo = mongoose.connection.readyState === 1;
  const red = redis.status === 'ready';
  res
    .status(mongo && red ? 200 : 503)
    .json({ status: mongo && red ? 'ok' : 'degraded', service: 'events-activities-service', mongo, redis: red, uptime: process.uptime() });
});

// Events
app.post('/api/events', async (req, res) => {
  try {
    res.status(201).json(await Event.create(req.body));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
app.get('/api/events', async (req, res) => {
  const { type, category, status, from, to, page = 1, limit = 20 } = req.query;
  const q = {};
  if (type) q.type = type;
  if (category) q.category = category;
  if (status) q.status = status;
  if (from || to) {
    q.startDate = {};
    if (from) q.startDate.$gte = new Date(from);
    if (to) q.startDate.$lte = new Date(to);
  }
  const [data, total] = await Promise.all([
    Event.find(q)
      .skip((page - 1) * limit)
      .limit(+limit)
      .sort({ startDate: -1 }),
    Event.countDocuments(q),
  ]);
  res.json({ data, total, page: +page, pages: Math.ceil(total / limit) });
});
app.get('/api/events/:id', async (req, res) => {
  const e = await Event.findById(req.params.id);
  if (!e) return res.status(404).json({ error: 'الفعالية غير موجودة' });
  res.json(e);
});
app.put('/api/events/:id', async (req, res) => {
  res.json(await Event.findByIdAndUpdate(req.params.id, req.body, { new: true }));
});
app.post('/api/events/:id/register', async (req, res) => {
  const evt = await Event.findById(req.params.id);
  if (!evt) return res.status(404).json({ error: 'الفعالية غير موجودة' });
  if (evt.registration?.maxParticipants && evt.registration.currentRegistered >= evt.registration.maxParticipants) {
    return res.status(400).json({ error: 'الفعالية ممتلئة' });
  }
  evt.participants.push({ ...req.body, status: 'registered' });
  evt.registration.currentRegistered = (evt.registration.currentRegistered || 0) + 1;
  await evt.save();
  res.json(evt);
});

// Activities (Clubs)
app.post('/api/activities', async (req, res) => {
  try {
    res.status(201).json(await Activity.create(req.body));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
app.get('/api/activities', async (req, res) => {
  const { type, status, search } = req.query;
  const q = {};
  if (type) q.type = type;
  if (status) q.status = status;
  if (search) q.$or = [{ nameAr: new RegExp(search, 'i') }, { nameEn: new RegExp(search, 'i') }];
  res.json(await Activity.find(q).sort({ nameAr: 1 }));
});
app.post('/api/activities/:id/join', async (req, res) => {
  const act = await Activity.findById(req.params.id);
  if (!act) return res.status(404).json({ error: 'النشاط غير موجود' });
  if (act.maxMembers && act.members.length >= act.maxMembers) return res.status(400).json({ error: 'النشاط ممتلئ' });
  act.members.push({ ...req.body, joinDate: new Date(), status: 'active' });
  await act.save();
  res.json(act);
});
app.put('/api/activities/:id', async (req, res) => {
  res.json(await Activity.findByIdAndUpdate(req.params.id, req.body, { new: true }));
});

// Calendar
app.post('/api/calendar', async (req, res) => {
  try {
    res.status(201).json(await CalendarEntry.create(req.body));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
app.get('/api/calendar', async (req, res) => {
  const { from, to, type, academicYear, visibility } = req.query;
  const q = {};
  if (type) q.type = type;
  if (academicYear) q.academicYear = academicYear;
  if (visibility) q.visibility = visibility;
  if (from || to) {
    q.date = {};
    if (from) q.date.$gte = new Date(from);
    if (to) q.date.$lte = new Date(to);
  }
  res.json(await CalendarEntry.find(q).sort({ date: 1 }));
});

// Dashboard
app.get('/api/events/dashboard', async (_req, res) => {
  const cacheKey = 'events:dashboard';
  const cached = await redis.get(cacheKey);
  if (cached) return res.json(JSON.parse(cached));
  const now = new Date();
  const [upcomingEvents, activeActivities, totalParticipants] = await Promise.all([
    Event.countDocuments({ startDate: { $gte: now }, status: { $in: ['approved', 'published'] } }),
    Activity.countDocuments({ status: 'active' }),
    Event.aggregate([{ $match: { status: 'completed' } }, { $group: { _id: null, total: { $sum: { $size: '$participants' } } } }]),
  ]);
  const result = { upcomingEvents, activeActivities, totalParticipants: totalParticipants[0]?.total || 0 };
  await redis.set(cacheKey, JSON.stringify(result), 'EX', 300);
  res.json(result);
});

mongoose
  .connect(MONGO)
  .then(() => {
    console.log('✅ MongoDB connected — events-activities');
    app.listen(PORT, () => console.log(`🎉 Events-Activities Service running on port ${PORT}`));
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });
