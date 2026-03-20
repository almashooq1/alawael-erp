/* ─────────────────────────────────────────────────────────
   Al-Awael ERP — File Storage & CDN Service  (Port 3710)
   ───────────────────────────────────────────────────────── */
const express = require('express');
const mongoose = require('mongoose');
const Redis = require('ioredis');
const { Queue, Worker } = require('bullmq');
const helmet = require('helmet');
const cors = require('cors');
const multer = require('multer');
const mime = require('mime-types');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const cron = require('node-cron');
const dayjs = require('dayjs');

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '2mb' }));

const PORT = process.env.PORT || 3710;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/alawael_files';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const UPLOAD_DIR = process.env.UPLOAD_DIR || '/app/uploads';
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '52428800'); // 50MB

/* ── Redis ───────────────────────────────────────────── */
const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
  retryStrategy: t => Math.min(t * 200, 5000),
});
redis.on('error', e => console.error('Redis error', e.message));

/* ── BullMQ ──────────────────────────────────────────── */
const connection = { connection: redis };
const fileQueue = new Queue('file-actions', connection);

/* ── Ensure upload directories ───────────────────────── */
const DIRS = ['documents', 'images', 'videos', 'audio', 'archives', 'temp', 'thumbnails'];
for (const d of DIRS) {
  const dir = path.join(UPLOAD_DIR, d);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

/* ── Multer Config ───────────────────────────────────── */
const storage = multer.diskStorage({
  destination: (_req, file, cb) => {
    const mimeType = file.mimetype;
    let folder = 'documents';
    if (mimeType.startsWith('image/')) folder = 'images';
    else if (mimeType.startsWith('video/')) folder = 'videos';
    else if (mimeType.startsWith('audio/')) folder = 'audio';
    else if (['application/zip', 'application/x-rar', 'application/gzip'].includes(mimeType)) folder = 'archives';
    cb(null, path.join(UPLOAD_DIR, folder));
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    const blocked = ['.exe', '.bat', '.cmd', '.sh', '.ps1', '.msi', '.dll'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (blocked.includes(ext)) return cb(new Error('File type not allowed'));
    cb(null, true);
  },
});

/* ── Mongoose Schemas ────────────────────────────────── */

const fileSchema = new mongoose.Schema(
  {
    fileId: { type: String, unique: true },
    originalName: { type: String, required: true },
    storedName: String,
    mimeType: String,
    size: Number,
    category: { type: String, enum: ['documents', 'images', 'videos', 'audio', 'archives', 'other'], default: 'documents' },
    path: String,
    url: String,
    checksum: String,
    uploadedBy: { userId: String, name: String },
    folder: { type: String, default: '/' },
    tags: [String],
    isPublic: { type: Boolean, default: false },
    shared: [{ userId: String, name: String, permission: { type: String, enum: ['view', 'edit', 'admin'], default: 'view' } }],
    versions: [
      {
        versionId: String,
        storedName: String,
        size: Number,
        checksum: String,
        uploadedAt: { type: Date, default: Date.now },
        uploadedBy: { userId: String, name: String },
      },
    ],
    thumbnailPath: String,
    metadata: {
      width: Number,
      height: Number,
      duration: Number,
      pages: Number,
    },
    downloadCount: { type: Number, default: 0 },
    lastAccessedAt: Date,
    deletedAt: Date,
    isPermanentlyDeleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

fileSchema.pre('save', async function (next) {
  if (!this.fileId) {
    const count = await mongoose.model('File').countDocuments();
    this.fileId = `FIL-${String(count + 1).padStart(7, '0')}`;
  }
  next();
});
const File = mongoose.model('File', fileSchema);

const folderSchema = new mongoose.Schema(
  {
    folderId: { type: String, unique: true },
    name: { type: String, required: true },
    nameAr: String,
    parentPath: { type: String, default: '/' },
    fullPath: String,
    createdBy: { userId: String, name: String },
    shared: [{ userId: String, permission: String }],
    color: String,
    icon: String,
  },
  { timestamps: true },
);

folderSchema.pre('save', async function (next) {
  if (!this.folderId) {
    const count = await mongoose.model('Folder').countDocuments();
    this.folderId = `FLD-${String(count + 1).padStart(5, '0')}`;
  }
  if (!this.fullPath) this.fullPath = `${this.parentPath === '/' ? '' : this.parentPath}/${this.name}`;
  next();
});
const Folder = mongoose.model('Folder', folderSchema);

const quotaSchema = new mongoose.Schema(
  {
    userId: { type: String, unique: true },
    maxBytes: { type: Number, default: 1073741824 }, // 1GB
    usedBytes: { type: Number, default: 0 },
    fileCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);
const Quota = mongoose.model('Quota', quotaSchema);

const shareSchema = new mongoose.Schema(
  {
    shareId: { type: String, unique: true },
    fileId: { type: String, required: true },
    token: { type: String, unique: true },
    createdBy: { userId: String, name: String },
    expiresAt: Date,
    password: String,
    maxDownloads: Number,
    downloadCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

shareSchema.pre('save', async function (next) {
  if (!this.shareId) {
    const count = await mongoose.model('Share').countDocuments();
    this.shareId = `SHR-${String(count + 1).padStart(5, '0')}`;
  }
  if (!this.token) this.token = crypto.randomBytes(32).toString('hex');
  next();
});
const Share = mongoose.model('Share', shareSchema);

/* ── BullMQ Worker ───────────────────────────────────── */
new Worker(
  'file-actions',
  async job => {
    const { action, data } = job.data;
    if (action === 'update-quota') {
      const { userId, sizeChange } = data;
      await Quota.findOneAndUpdate({ userId }, { $inc: { usedBytes: sizeChange, fileCount: sizeChange > 0 ? 1 : -1 } }, { upsert: true });
    }
    if (action === 'cleanup-temp') {
      const tempDir = path.join(UPLOAD_DIR, 'temp');
      const files = fs.existsSync(tempDir) ? fs.readdirSync(tempDir) : [];
      let cleaned = 0;
      for (const f of files) {
        const fp = path.join(tempDir, f);
        const stat = fs.statSync(fp);
        if (Date.now() - stat.mtimeMs > 86400000) {
          // >24h
          fs.unlinkSync(fp);
          cleaned++;
        }
      }
      console.log(`[Cleanup] Removed ${cleaned} temp files`);
    }
  },
  connection,
);

/* ── Health ───────────────────────────────────────────── */
app.get('/health', async (_req, res) => {
  const mongoOk = mongoose.connection.readyState === 1;
  const redisOk = redis.status === 'ready';
  res.status(mongoOk && redisOk ? 200 : 503).json({
    status: mongoOk && redisOk ? 'healthy' : 'degraded',
    service: 'file-storage-service',
    timestamp: new Date().toISOString(),
    mongo: mongoOk ? 'connected' : 'disconnected',
    redis: redisOk ? 'connected' : 'disconnected',
  });
});

/* ══════════════ UPLOAD ENDPOINTS ══════════════ */

app.post('/api/files/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No file provided' });
    const { userId, userName, folder = '/', tags, isPublic } = req.body;

    const mimeType = req.file.mimetype;
    let category = 'documents';
    if (mimeType.startsWith('image/')) category = 'images';
    else if (mimeType.startsWith('video/')) category = 'videos';
    else if (mimeType.startsWith('audio/')) category = 'audio';
    else if (['application/zip', 'application/x-rar', 'application/gzip'].includes(mimeType)) category = 'archives';

    const checksum = crypto.createHash('sha256').update(fs.readFileSync(req.file.path)).digest('hex');

    const file = await new File({
      originalName: req.file.originalname,
      storedName: req.file.filename,
      mimeType,
      size: req.file.size,
      category,
      path: req.file.path,
      url: `/api/files/download/${req.file.filename}`,
      checksum,
      uploadedBy: { userId, name: userName },
      folder,
      tags: tags ? (Array.isArray(tags) ? tags : tags.split(',')) : [],
      isPublic: isPublic === 'true',
    }).save();

    if (userId) {
      await fileQueue.add('update-quota', { action: 'update-quota', data: { userId, sizeChange: req.file.size } });
    }

    res.status(201).json({ success: true, data: file });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/files/upload/bulk', upload.array('files', 20), async (req, res) => {
  try {
    if (!req.files?.length) return res.status(400).json({ success: false, error: 'No files provided' });
    const { userId, userName, folder = '/' } = req.body;
    const results = [];

    for (const f of req.files) {
      const mimeType = f.mimetype;
      let category = 'documents';
      if (mimeType.startsWith('image/')) category = 'images';
      else if (mimeType.startsWith('video/')) category = 'videos';

      const checksum = crypto.createHash('sha256').update(fs.readFileSync(f.path)).digest('hex');

      const file = await new File({
        originalName: f.originalname,
        storedName: f.filename,
        mimeType,
        size: f.size,
        category,
        path: f.path,
        url: `/api/files/download/${f.filename}`,
        checksum,
        uploadedBy: { userId, name: userName },
        folder,
      }).save();
      results.push(file);
    }

    res.status(201).json({ success: true, data: results, count: results.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ══════════════ FILE ENDPOINTS ══════════════ */

app.get('/api/files', async (req, res) => {
  try {
    const { folder, category, uploadedBy, search, page = 1, limit = 50 } = req.query;
    const filter = { deletedAt: null };
    if (folder) filter.folder = folder;
    if (category) filter.category = category;
    if (uploadedBy) filter['uploadedBy.userId'] = uploadedBy;
    if (search) filter.originalName = { $regex: search, $options: 'i' };
    const files = await File.find(filter)
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    const total = await File.countDocuments(filter);
    res.json({ success: true, data: files, pagination: { page: +page, limit: +limit, total } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/files/:id', async (req, res) => {
  try {
    const file = await File.findOne({ fileId: req.params.id });
    if (!file) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: file });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/files/download/:storedName', async (req, res) => {
  try {
    const file = await File.findOne({ storedName: req.params.storedName });
    if (!file) return res.status(404).json({ success: false, error: 'Not found' });
    await File.updateOne({ _id: file._id }, { $inc: { downloadCount: 1 }, lastAccessedAt: new Date() });
    const filePath = file.path;
    if (!fs.existsSync(filePath)) return res.status(404).json({ success: false, error: 'File missing from disk' });
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.originalName)}"`);
    res.setHeader('Content-Type', file.mimeType);
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/files/:id', async (req, res) => {
  try {
    const allowed = ['tags', 'folder', 'isPublic', 'shared'];
    const update = {};
    for (const k of allowed) if (req.body[k] !== undefined) update[k] = req.body[k];
    const file = await File.findOneAndUpdate({ fileId: req.params.id }, update, { new: true });
    if (!file) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: file });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Soft delete
app.delete('/api/files/:id', async (req, res) => {
  try {
    const file = await File.findOneAndUpdate({ fileId: req.params.id }, { deletedAt: new Date() }, { new: true });
    if (!file) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, message: 'File moved to trash' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Restore from trash
app.post('/api/files/:id/restore', async (req, res) => {
  try {
    const file = await File.findOneAndUpdate({ fileId: req.params.id }, { deletedAt: null }, { new: true });
    res.json({ success: true, data: file });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Permanent delete
app.delete('/api/files/:id/permanent', async (req, res) => {
  try {
    const file = await File.findOne({ fileId: req.params.id });
    if (!file) return res.status(404).json({ success: false, error: 'Not found' });
    if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
    await File.deleteOne({ _id: file._id });
    if (file.uploadedBy?.userId) {
      await fileQueue.add('update-quota', { action: 'update-quota', data: { userId: file.uploadedBy.userId, sizeChange: -file.size } });
    }
    res.json({ success: true, message: 'File permanently deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Upload new version
app.post('/api/files/:id/version', upload.single('file'), async (req, res) => {
  try {
    const file = await File.findOne({ fileId: req.params.id });
    if (!file) return res.status(404).json({ success: false, error: 'Not found' });
    const checksum = crypto.createHash('sha256').update(fs.readFileSync(req.file.path)).digest('hex');
    file.versions.push({
      versionId: `V${file.versions.length + 1}`,
      storedName: file.storedName,
      size: file.size,
      checksum: file.checksum,
      uploadedBy: file.uploadedBy,
    });
    file.storedName = req.file.filename;
    file.size = req.file.size;
    file.path = req.file.path;
    file.checksum = checksum;
    file.url = `/api/files/download/${req.file.filename}`;
    await file.save();
    res.json({ success: true, data: file });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ══════════════ FOLDER ENDPOINTS ══════════════ */

app.post('/api/folders', async (req, res) => {
  try {
    const folder = await new Folder(req.body).save();
    res.status(201).json({ success: true, data: folder });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/folders', async (req, res) => {
  try {
    const { parentPath = '/' } = req.query;
    const folders = await Folder.find({ parentPath }).sort({ name: 1 });
    res.json({ success: true, data: folders });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/folders/:id', async (req, res) => {
  try {
    const folder = await Folder.findOne({ folderId: req.params.id });
    if (!folder) return res.status(404).json({ success: false, error: 'Not found' });
    // Move files to root
    await File.updateMany({ folder: folder.fullPath }, { folder: '/' });
    await Folder.deleteOne({ _id: folder._id });
    res.json({ success: true, message: 'Folder deleted, files moved to root' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ══════════════ SHARE ENDPOINTS ══════════════ */

app.post('/api/files/:id/share', async (req, res) => {
  try {
    const { userId, userName, expiresIn, password, maxDownloads } = req.body;
    const expiresAt = expiresIn ? dayjs().add(expiresIn, 'hour').toDate() : dayjs().add(7, 'day').toDate();
    const share = await new Share({
      fileId: req.params.id,
      createdBy: { userId, name: userName },
      expiresAt,
      password: password || null,
      maxDownloads: maxDownloads || null,
    }).save();
    res
      .status(201)
      .json({ success: true, data: { shareId: share.shareId, token: share.token, url: `/api/files/shared/${share.token}`, expiresAt } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/files/shared/:token', async (req, res) => {
  try {
    const share = await Share.findOne({ token: req.params.token, isActive: true });
    if (!share) return res.status(404).json({ success: false, error: 'Share link not found' });
    if (share.expiresAt && new Date() > share.expiresAt) return res.status(410).json({ success: false, error: 'Share link expired' });
    if (share.maxDownloads && share.downloadCount >= share.maxDownloads)
      return res.status(410).json({ success: false, error: 'Download limit reached' });

    const file = await File.findOne({ fileId: share.fileId });
    if (!file) return res.status(404).json({ success: false, error: 'File not found' });

    await Share.updateOne({ _id: share._id }, { $inc: { downloadCount: 1 } });
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.originalName)}"`);
    res.setHeader('Content-Type', file.mimeType);
    fs.createReadStream(file.path).pipe(res);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ══════════════ QUOTA ══════════════ */

app.get('/api/files/quota/:userId', async (req, res) => {
  try {
    let quota = await Quota.findOne({ userId: req.params.userId });
    if (!quota) quota = { userId: req.params.userId, maxBytes: 1073741824, usedBytes: 0, fileCount: 0 };
    const usage = ((quota.usedBytes / quota.maxBytes) * 100).toFixed(1);
    res.json({ success: true, data: { ...(quota.toJSON?.() || quota), usagePercent: +usage } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ══════════════ TRASH ══════════════ */

app.get('/api/files/trash/list', async (req, res) => {
  try {
    const files = await File.find({ deletedAt: { $ne: null }, isPermanentlyDeleted: false }).sort({ deletedAt: -1 });
    res.json({ success: true, data: files });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/files/trash/empty', async (req, res) => {
  try {
    const trashed = await File.find({ deletedAt: { $ne: null } });
    for (const f of trashed) {
      if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
    }
    await File.deleteMany({ deletedAt: { $ne: null } });
    res.json({ success: true, message: `Permanently deleted ${trashed.length} files` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ══════════════ DASHBOARD ══════════════ */

app.get('/api/files/dashboard/overview', async (req, res) => {
  try {
    const cacheKey = 'file-storage:dashboard';
    const cached = await redis.get(cacheKey);
    if (cached) return res.json(JSON.parse(cached));

    const [totalFiles, totalSize, byCategory, recentUploads, trashCount] = await Promise.all([
      File.countDocuments({ deletedAt: null }),
      File.aggregate([{ $match: { deletedAt: null } }, { $group: { _id: null, total: { $sum: '$size' } } }]),
      File.aggregate([{ $match: { deletedAt: null } }, { $group: { _id: '$category', count: { $sum: 1 }, size: { $sum: '$size' } } }]),
      File.find({ deletedAt: null }).sort({ createdAt: -1 }).limit(10).lean(),
      File.countDocuments({ deletedAt: { $ne: null } }),
    ]);

    const totalFolders = await Folder.countDocuments();
    const totalShares = await Share.countDocuments({ isActive: true });

    const dashboard = {
      totalFiles,
      totalSize: totalSize[0]?.total || 0,
      totalFolders,
      activeShares: totalShares,
      trashCount,
      byCategory: byCategory.reduce((a, c) => ({ ...a, [c._id]: { count: c.count, size: c.size } }), {}),
      recentUploads,
      generatedAt: new Date().toISOString(),
    };
    await redis.setex(cacheKey, 30, JSON.stringify(dashboard));
    res.json(dashboard);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ── Serve uploaded files statically ─────────────────── */
app.use('/uploads', express.static(UPLOAD_DIR));

/* ── Cron Jobs ───────────────────────────────────────── */

// Clean temp files daily at 3AM
cron.schedule('0 3 * * *', async () => {
  await fileQueue.add('cleanup-temp', { action: 'cleanup-temp', data: {} });
});

// Auto-delete trash after 30 days (daily at 4AM)
cron.schedule('0 4 * * *', async () => {
  try {
    const cutoff = dayjs().subtract(30, 'day').toDate();
    const old = await File.find({ deletedAt: { $lt: cutoff } });
    for (const f of old) {
      if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
    }
    const result = await File.deleteMany({ deletedAt: { $lt: cutoff } });
    console.log(`[Cron] Permanently deleted ${result.deletedCount} trashed files (>30 days)`);
  } catch (e) {
    console.error('[Cron] trash cleanup failed', e.message);
  }
});

// Expire old share links daily at 5AM
cron.schedule('0 5 * * *', async () => {
  try {
    const result = await Share.updateMany({ expiresAt: { $lt: new Date() }, isActive: true }, { isActive: false });
    console.log(`[Cron] Deactivated ${result.modifiedCount} expired share links`);
  } catch (e) {
    console.error('[Cron] share cleanup failed', e.message);
  }
});

/* ── Seed Data ───────────────────────────────────────── */
async function seedDefaults() {
  const count = await Folder.countDocuments();
  if (count > 0) return;

  const defaultFolders = [
    { name: 'Students', nameAr: 'الطلاب', parentPath: '/', color: '#3b82f6' },
    { name: 'Staff', nameAr: 'الموظفين', parentPath: '/', color: '#10b981' },
    { name: 'Reports', nameAr: 'التقارير', parentPath: '/', color: '#f59e0b' },
    { name: 'Contracts', nameAr: 'العقود', parentPath: '/', color: '#8b5cf6' },
    { name: 'Media', nameAr: 'الوسائط', parentPath: '/', color: '#ef4444' },
    { name: 'Templates', nameAr: 'القوالب', parentPath: '/', color: '#6366f1' },
  ];
  for (const f of defaultFolders) await new Folder(f).save();
  console.log('[Seed] Default folders created');
}

/* ── Start ───────────────────────────────────────────── */
mongoose
  .connect(MONGODB_URI)
  .then(async () => {
    console.log('✅ MongoDB connected — alawael_files');
    await seedDefaults();
    app.listen(PORT, () => console.log(`🚀 File Storage Service running on port ${PORT}`));
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
