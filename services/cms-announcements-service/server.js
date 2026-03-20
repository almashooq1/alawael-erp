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
app.use(express.json({ limit: '10mb' }));

/* ═══════════════════════════════════════════════════════════════ */

const contentPageSchema = new mongoose.Schema(
  {
    slug: { type: String, unique: true, required: true },
    titleAr: { type: String, required: true },
    titleEn: String,
    bodyAr: String,
    bodyEn: String,
    category: { type: String, enum: ['about', 'policies', 'faq', 'guide', 'help', 'terms', 'privacy', 'custom'], default: 'custom' },
    section: { type: String, enum: ['public', 'parent-portal', 'staff-portal', 'student-portal', 'admin'], default: 'public' },
    featuredImage: String,
    attachments: [{ name: String, url: String, type: String, size: Number }],
    seo: { metaTitle: String, metaDescription: String, keywords: [String] },
    sortOrder: { type: Number, default: 0 },
    isPublished: { type: Boolean, default: false },
    publishDate: Date,
    version: { type: Number, default: 1 },
    createdBy: { userId: String, name: String },
    updatedBy: { userId: String, name: String },
  },
  { timestamps: true },
);

const announcementSchema = new mongoose.Schema(
  {
    announcementNo: { type: String, unique: true },
    titleAr: { type: String, required: true },
    titleEn: String,
    bodyAr: { type: String, required: true },
    bodyEn: String,
    type: {
      type: String,
      enum: ['general', 'academic', 'administrative', 'event', 'emergency', 'maintenance', 'holiday', 'exam', 'fee', 'transport'],
      required: true,
    },
    priority: { type: String, enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' },
    audience: [
      { type: String, enum: ['all', 'students', 'parents', 'teachers', 'staff', 'admin', 'specific-class', 'specific-department'] },
    ],
    targetClasses: [String],
    targetDepartments: [String],
    attachments: [{ name: String, url: String, type: String }],
    channels: [{ type: String, enum: ['portal', 'email', 'sms', 'whatsapp', 'push-notification', 'display-board'] }],
    schedule: { publishAt: Date, expireAt: Date },
    pinned: { type: Boolean, default: false },
    readBy: [{ userId: String, readAt: Date }],
    requireAck: { type: Boolean, default: false },
    ackedBy: [{ userId: String, ackedAt: Date }],
    status: { type: String, enum: ['draft', 'scheduled', 'published', 'expired', 'archived'], default: 'draft' },
    createdBy: { userId: String, name: String },
  },
  { timestamps: true },
);

announcementSchema.pre('save', async function (next) {
  if (!this.announcementNo) {
    const count = await this.constructor.countDocuments();
    this.announcementNo = `ANN-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

const notificationTemplateSchema = new mongoose.Schema(
  {
    code: { type: String, unique: true, required: true },
    nameAr: String,
    nameEn: String,
    channel: { type: String, enum: ['email', 'sms', 'whatsapp', 'push', 'in-app'], required: true },
    subjectAr: String,
    subjectEn: String,
    bodyAr: String,
    bodyEn: String,
    variables: [{ name: String, description: String }],
    category: String,
    isActive: { type: Boolean, default: true },
    createdBy: { userId: String, name: String },
  },
  { timestamps: true },
);

const mediaAssetSchema = new mongoose.Schema(
  {
    assetNo: { type: String, unique: true },
    fileName: { type: String, required: true },
    originalName: String,
    mimeType: String,
    size: Number,
    url: { type: String, required: true },
    thumbnailUrl: String,
    folder: { type: String, default: '/' },
    tags: [String],
    altText: String,
    caption: String,
    usedIn: [{ type: String, refModel: String, refId: String }],
    createdBy: { userId: String, name: String },
  },
  { timestamps: true },
);

mediaAssetSchema.pre('save', async function (next) {
  if (!this.assetNo) {
    const count = await this.constructor.countDocuments();
    this.assetNo = `MDA-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

const ContentPage = mongoose.model('ContentPage', contentPageSchema);
const Announcement = mongoose.model('Announcement', announcementSchema);
const NotificationTemplate = mongoose.model('NotificationTemplate', notificationTemplateSchema);
const MediaAsset = mongoose.model('MediaAsset', mediaAssetSchema);

const MONGO = process.env.MONGODB_URI || 'mongodb://localhost:27017/alawael_cms';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const PORT = process.env.PORT || 3540;

const redis = new Redis(REDIS_URL, { maxRetriesPerRequest: null, retryStrategy: t => Math.min(t * 200, 5000) });
const notifyQueue = new Queue('notification-delivery', { connection: redis });

/* ═══════════════════════════════════════════════════════════════ */
app.get('/health', async (_req, res) => {
  const mongo = mongoose.connection.readyState === 1;
  const red = redis.status === 'ready';
  res
    .status(mongo && red ? 200 : 503)
    .json({ status: mongo && red ? 'ok' : 'degraded', service: 'cms-announcements-service', mongo, redis: red, uptime: process.uptime() });
});

// Content Pages
app.post('/api/pages', async (req, res) => {
  try {
    res.status(201).json(await ContentPage.create(req.body));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
app.get('/api/pages', async (req, res) => {
  const { section, category, published, search, page = 1, limit = 20 } = req.query;
  const q = {};
  if (section) q.section = section;
  if (category) q.category = category;
  if (published === 'true') q.isPublished = true;
  if (search) q.$or = [{ titleAr: new RegExp(search, 'i') }, { titleEn: new RegExp(search, 'i') }];
  const [data, total] = await Promise.all([
    ContentPage.find(q)
      .skip((page - 1) * limit)
      .limit(+limit)
      .sort({ sortOrder: 1, createdAt: -1 }),
    ContentPage.countDocuments(q),
  ]);
  res.json({ data, total, page: +page, pages: Math.ceil(total / limit) });
});
app.get('/api/pages/:slug', async (req, res) => {
  const p = await ContentPage.findOne({ slug: req.params.slug });
  if (!p) return res.status(404).json({ error: 'الصفحة غير موجودة' });
  res.json(p);
});
app.put('/api/pages/:id', async (req, res) => {
  req.body.version = (req.body.version || 0) + 1;
  res.json(await ContentPage.findByIdAndUpdate(req.params.id, req.body, { new: true }));
});

// Announcements
app.post('/api/announcements', async (req, res) => {
  try {
    const ann = await Announcement.create(req.body);
    if (ann.status === 'published' && ann.channels?.length) {
      await notifyQueue.add('deliver', { announcementId: ann._id.toString(), channels: ann.channels }, { attempts: 3 });
    }
    res.status(201).json(ann);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
app.get('/api/announcements', async (req, res) => {
  const { type, priority, status, audience, pinned, page = 1, limit = 20 } = req.query;
  const q = {};
  if (type) q.type = type;
  if (priority) q.priority = priority;
  if (status) q.status = status;
  if (audience) q.audience = audience;
  if (pinned === 'true') q.pinned = true;
  const [data, total] = await Promise.all([
    Announcement.find(q)
      .select('-readBy -ackedBy')
      .skip((page - 1) * limit)
      .limit(+limit)
      .sort({ pinned: -1, createdAt: -1 }),
    Announcement.countDocuments(q),
  ]);
  res.json({ data, total, page: +page, pages: Math.ceil(total / limit) });
});
app.get('/api/announcements/:id', async (req, res) => {
  const a = await Announcement.findById(req.params.id);
  if (!a) return res.status(404).json({ error: 'الإعلان غير موجود' });
  res.json({ ...a.toObject(), totalReads: a.readBy?.length || 0, totalAcks: a.ackedBy?.length || 0 });
});
app.put('/api/announcements/:id', async (req, res) => {
  res.json(await Announcement.findByIdAndUpdate(req.params.id, req.body, { new: true }));
});
app.post('/api/announcements/:id/read', async (req, res) => {
  const { userId } = req.body;
  await Announcement.findByIdAndUpdate(req.params.id, { $addToSet: { readBy: { userId, readAt: new Date() } } });
  res.json({ success: true });
});
app.post('/api/announcements/:id/ack', async (req, res) => {
  const { userId } = req.body;
  await Announcement.findByIdAndUpdate(req.params.id, { $addToSet: { ackedBy: { userId, ackedAt: new Date() } } });
  res.json({ success: true });
});

// Notification Templates
app.post('/api/notification-templates', async (req, res) => {
  try {
    res.status(201).json(await NotificationTemplate.create(req.body));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
app.get('/api/notification-templates', async (req, res) => {
  const { channel, category, active } = req.query;
  const q = {};
  if (channel) q.channel = channel;
  if (category) q.category = category;
  if (active !== undefined) q.isActive = active === 'true';
  res.json(await NotificationTemplate.find(q).sort({ code: 1 }));
});
app.put('/api/notification-templates/:id', async (req, res) => {
  res.json(await NotificationTemplate.findByIdAndUpdate(req.params.id, req.body, { new: true }));
});

// Media Assets
app.post('/api/media', async (req, res) => {
  try {
    res.status(201).json(await MediaAsset.create(req.body));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
app.get('/api/media', async (req, res) => {
  const { folder, mimeType, search, page = 1, limit = 30 } = req.query;
  const q = {};
  if (folder) q.folder = folder;
  if (mimeType) q.mimeType = new RegExp(mimeType, 'i');
  if (search) q.$or = [{ fileName: new RegExp(search, 'i') }, { tags: new RegExp(search, 'i') }];
  const [data, total] = await Promise.all([
    MediaAsset.find(q)
      .skip((page - 1) * limit)
      .limit(+limit)
      .sort({ createdAt: -1 }),
    MediaAsset.countDocuments(q),
  ]);
  res.json({ data, total, page: +page, pages: Math.ceil(total / limit) });
});
app.delete('/api/media/:id', async (req, res) => {
  await MediaAsset.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

// Dashboard
app.get('/api/cms/dashboard', async (_req, res) => {
  const cacheKey = 'cms:dashboard';
  const cached = await redis.get(cacheKey);
  if (cached) return res.json(JSON.parse(cached));
  const [totalPages, publishedPages, totalAnnouncements, activeAnnouncements, totalMedia, recentAnnouncements] = await Promise.all([
    ContentPage.countDocuments(),
    ContentPage.countDocuments({ isPublished: true }),
    Announcement.countDocuments(),
    Announcement.countDocuments({ status: 'published' }),
    MediaAsset.countDocuments(),
    Announcement.find({ status: 'published' }).select('titleAr type priority createdAt').limit(5).sort({ createdAt: -1 }),
  ]);
  const result = { totalPages, publishedPages, totalAnnouncements, activeAnnouncements, totalMedia, recentAnnouncements };
  await redis.set(cacheKey, JSON.stringify(result), 'EX', 300);
  res.json(result);
});

// Cron: expire old announcements daily at midnight
cron.schedule('0 0 * * *', async () => {
  const now = new Date();
  const { modifiedCount } = await Announcement.updateMany(
    { status: 'published', 'schedule.expireAt': { $lte: now } },
    { status: 'expired' },
  );
  if (modifiedCount) console.log(`⏰ Expired ${modifiedCount} announcements`);
});
// Cron: publish scheduled announcements every 5 min
cron.schedule('*/5 * * * *', async () => {
  const now = new Date();
  const toPublish = await Announcement.find({ status: 'scheduled', 'schedule.publishAt': { $lte: now } });
  for (const a of toPublish) {
    a.status = 'published';
    await a.save();
    if (a.channels?.length) await notifyQueue.add('deliver', { announcementId: a._id.toString(), channels: a.channels }, { attempts: 3 });
  }
  if (toPublish.length) console.log(`📢 Auto-published ${toPublish.length} announcements`);
});

mongoose
  .connect(MONGO)
  .then(() => {
    console.log('✅ MongoDB connected — cms-announcements');
    app.listen(PORT, () => console.log(`📰 CMS-Announcements Service running on port ${PORT}`));
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });
