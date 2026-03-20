/*  ═══════════════════════════════════════════════════════════════
 *  Al-Awael ERP — File Processor (خدمة معالجة الملفات)
 *  Port 3270 · Image Thumbnails, Document Conv, Media Processing
 *  Provides: image resize/crop/watermark, thumbnail generation,
 *  file compression, metadata extraction, virus scan hook
 *  ═══════════════════════════════════════════════════════════════ */

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const { Queue, Worker } = require('bullmq');
const Redis = require('ioredis');
const sharp = require('sharp');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const mime = require('mime-types');
const archiver = require('archiver');
const { v4: uuidv4 } = require('uuid');
const winston = require('winston');

const app = express();
app.use(express.json());

const log = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()],
});

/* ── Connections ─────────────────────────────────────────────── */
const redisOpts = { host: process.env.REDIS_HOST || 'redis', port: 6379, maxRetriesPerRequest: null };
const redis = new Redis(process.env.REDIS_URL || 'redis://redis:6379/8');

mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://mongodb:27017/alawael', {
    maxPoolSize: 5,
  })
  .then(() => log.info('MongoDB connected'));

/* ── Storage paths ───────────────────────────────────────────── */
const UPLOAD_DIR = process.env.UPLOAD_DIR || '/app/uploads';
const THUMB_DIR = process.env.THUMB_DIR || '/app/uploads/thumbnails';
const PROCESSED_DIR = process.env.PROCESSED_DIR || '/app/uploads/processed';

(async () => {
  for (const dir of [UPLOAD_DIR, THUMB_DIR, PROCESSED_DIR]) {
    await fs.mkdir(dir, { recursive: true }).catch(() => {});
  }
})();

/* ── Schemas ─────────────────────────────────────────────────── */
const ProcessedFile = mongoose.model(
  'ProcessedFile',
  new mongoose.Schema({
    originalName: String,
    storedName: String,
    mimeType: String,
    size: Number,
    hash: String, // SHA256 for dedup
    width: Number,
    height: Number,
    thumbnails: [
      {
        size: String, // e.g. '150x150', '300x300'
        path: String,
        width: Number,
        height: Number,
      },
    ],
    metadata: Object,
    processingStatus: { type: String, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending' },
    processingError: String,
    organizationId: String,
    uploadedBy: String,
    tags: [String],
    createdAt: { type: Date, default: Date.now },
  }),
);

/* ── Multer Upload ───────────────────────────────────────────── */
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '52428800'); // 50MB
const ALLOWED_MIMES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'text/plain',
];

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIMES.includes(file.mimetype)) return cb(null, true);
    cb(new Error(`File type ${file.mimetype} not allowed`));
  },
});

/* ── BullMQ for async processing ─────────────────────────────── */
const processQueue = new Queue('file-processing', { connection: redisOpts });

const THUMBNAIL_SIZES = [
  { name: '80x80', width: 80, height: 80 },
  { name: '150x150', width: 150, height: 150 },
  { name: '300x300', width: 300, height: 300 },
  { name: '600x400', width: 600, height: 400 },
];

const worker = new Worker(
  'file-processing',
  async job => {
    const { fileId } = job.data;
    const file = await ProcessedFile.findById(fileId);
    if (!file) return;

    file.processingStatus = 'processing';
    await file.save();

    try {
      const filePath = path.join(UPLOAD_DIR, file.storedName);

      if (file.mimeType.startsWith('image/') && file.mimeType !== 'image/svg+xml') {
        // Extract metadata
        const metadata = await sharp(filePath).metadata();
        file.width = metadata.width;
        file.height = metadata.height;
        file.metadata = {
          format: metadata.format,
          space: metadata.space,
          channels: metadata.channels,
          hasAlpha: metadata.hasAlpha,
          density: metadata.density,
        };

        // Generate thumbnails
        const thumbnails = [];
        for (const size of THUMBNAIL_SIZES) {
          const thumbName = `${path.parse(file.storedName).name}_${size.name}.webp`;
          const thumbPath = path.join(THUMB_DIR, thumbName);
          const result = await sharp(filePath)
            .resize(size.width, size.height, { fit: 'cover', position: 'center' })
            .webp({ quality: 80 })
            .toFile(thumbPath);
          thumbnails.push({
            size: size.name,
            path: `thumbnails/${thumbName}`,
            width: result.width,
            height: result.height,
          });
        }
        file.thumbnails = thumbnails;

        // Optimize original (convert to webp if large)
        if (file.size > 500000 && ['image/jpeg', 'image/png'].includes(file.mimeType)) {
          const optimizedName = `${path.parse(file.storedName).name}_optimized.webp`;
          const optimizedPath = path.join(PROCESSED_DIR, optimizedName);
          await sharp(filePath).webp({ quality: 85 }).toFile(optimizedPath);
          file.metadata.optimizedPath = `processed/${optimizedName}`;
        }

        // Add watermark if configured
        if (process.env.WATERMARK_TEXT) {
          const watermarkedName = `${path.parse(file.storedName).name}_wm.webp`;
          const watermarkedPath = path.join(PROCESSED_DIR, watermarkedName);
          const svgText = `<svg width="${metadata.width}" height="${metadata.height}">
          <text x="50%" y="95%" text-anchor="middle" font-size="24" fill="rgba(255,255,255,0.4)"
            font-family="Arial">${process.env.WATERMARK_TEXT}</text></svg>`;
          await sharp(filePath)
            .composite([{ input: Buffer.from(svgText), gravity: 'southeast' }])
            .webp({ quality: 85 })
            .toFile(watermarkedPath);
          file.metadata.watermarkedPath = `processed/${watermarkedName}`;
        }
      } else {
        // Non-image: just extract basic metadata
        const stats = await fs.stat(filePath);
        file.metadata = { size: stats.size, mtime: stats.mtime };
      }

      file.processingStatus = 'completed';
      await file.save();
      log.info('File processed', { fileId, name: file.originalName });
    } catch (err) {
      file.processingStatus = 'failed';
      file.processingError = err.message;
      await file.save();
      log.error('File processing error', { fileId, error: err.message });
      throw err;
    }
  },
  { connection: redisOpts, concurrency: 3 },
);

/* ── Health ───────────────────────────────────────────────────── */
app.get('/health', async (_req, res) => {
  const waiting = await processQueue.getWaitingCount();
  res.json({ status: 'ok', queue: { waiting } });
});

/* ── Upload Single File ──────────────────────────────────────── */
app.post('/api/files/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    // Calculate hash for dedup
    const fileBuffer = await fs.readFile(req.file.path);
    const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    // Check for duplicate
    const existing = await ProcessedFile.findOne({ hash, organizationId: req.body.organizationId });
    if (existing) {
      await fs.unlink(req.file.path);
      return res.json({ id: existing._id, duplicate: true, message: 'File already exists' });
    }

    const doc = await ProcessedFile.create({
      originalName: req.file.originalname,
      storedName: req.file.filename,
      mimeType: req.file.mimetype,
      size: req.file.size,
      hash,
      organizationId: req.body.organizationId,
      uploadedBy: req.body.uploadedBy,
      tags: req.body.tags ? JSON.parse(req.body.tags) : [],
    });

    // Queue async processing
    await processQueue.add(
      'process',
      { fileId: doc._id.toString() },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 3000 },
      },
    );

    res.status(201).json({ id: doc._id, status: 'processing' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ── Upload Multiple Files ───────────────────────────────────── */
app.post('/api/files/upload-multi', upload.array('files', 20), async (req, res) => {
  try {
    const results = [];
    for (const file of req.files) {
      const fileBuffer = await fs.readFile(file.path);
      const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

      const doc = await ProcessedFile.create({
        originalName: file.originalname,
        storedName: file.filename,
        mimeType: file.mimetype,
        size: file.size,
        hash,
        organizationId: req.body.organizationId,
        uploadedBy: req.body.uploadedBy,
      });

      await processQueue.add(
        'process',
        { fileId: doc._id.toString() },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 3000 },
        },
      );
      results.push({ id: doc._id, name: file.originalname, status: 'processing' });
    }
    res.status(201).json(results);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ── Get File Info ───────────────────────────────────────────── */
app.get('/api/files/:id', async (req, res) => {
  const file = await ProcessedFile.findById(req.params.id);
  if (!file) return res.status(404).json({ error: 'Not found' });
  res.json(file);
});

/* ── Download Original ───────────────────────────────────────── */
app.get('/api/files/:id/download', async (req, res) => {
  const file = await ProcessedFile.findById(req.params.id);
  if (!file) return res.status(404).json({ error: 'Not found' });
  const filePath = path.join(UPLOAD_DIR, file.storedName);
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.originalName)}"`);
  res.setHeader('Content-Type', file.mimeType);
  res.sendFile(filePath);
});

/* ── Get Thumbnail ───────────────────────────────────────────── */
app.get('/api/files/:id/thumbnail/:size', async (req, res) => {
  const file = await ProcessedFile.findById(req.params.id);
  if (!file) return res.status(404).json({ error: 'Not found' });
  const thumb = file.thumbnails.find(t => t.size === req.params.size);
  if (!thumb) return res.status(404).json({ error: `Thumbnail ${req.params.size} not found` });
  res.setHeader('Content-Type', 'image/webp');
  res.setHeader('Cache-Control', 'public, max-age=31536000');
  res.sendFile(path.join(UPLOAD_DIR, thumb.path));
});

/* ── On-the-fly Resize ───────────────────────────────────────── */
app.get('/api/files/:id/resize', async (req, res) => {
  try {
    const file = await ProcessedFile.findById(req.params.id);
    if (!file || !file.mimeType.startsWith('image/')) {
      return res.status(404).json({ error: 'Image not found' });
    }
    const { w = 300, h, fit = 'cover', format = 'webp', q = 80 } = req.query;
    const cacheKey = `resize:${req.params.id}:${w}x${h || 'auto'}:${fit}:${format}:${q}`;
    const cached = await redis.getBuffer(cacheKey);
    if (cached) {
      res.setHeader('Content-Type', `image/${format}`);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.send(cached);
    }

    const filePath = path.join(UPLOAD_DIR, file.storedName);
    let transform = sharp(filePath).resize(parseInt(w), h ? parseInt(h) : null, { fit });
    if (format === 'webp') transform = transform.webp({ quality: parseInt(q) });
    else if (format === 'jpeg') transform = transform.jpeg({ quality: parseInt(q) });
    else if (format === 'png') transform = transform.png();

    const buffer = await transform.toBuffer();
    await redis.setex(cacheKey, 86400, buffer);
    res.setHeader('Content-Type', `image/${format}`);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(buffer);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ── List Files ──────────────────────────────────────────────── */
app.get('/api/files', async (req, res) => {
  const { org, type, status, tag, from = 0, size = 50 } = req.query;
  const filter = {};
  if (org) filter.organizationId = org;
  if (type) filter.mimeType = { $regex: type };
  if (status) filter.processingStatus = status;
  if (tag) filter.tags = tag;
  const files = await ProcessedFile.find(filter)
    .select('-metadata')
    .sort('-createdAt')
    .skip(parseInt(from))
    .limit(Math.min(parseInt(size), 200));
  const total = await ProcessedFile.countDocuments(filter);
  res.json({ total, files });
});

/* ── Delete File ─────────────────────────────────────────────── */
app.delete('/api/files/:id', async (req, res) => {
  const file = await ProcessedFile.findById(req.params.id);
  if (!file) return res.status(404).json({ error: 'Not found' });

  // Remove physical files
  const toDelete = [path.join(UPLOAD_DIR, file.storedName)];
  for (const t of file.thumbnails) toDelete.push(path.join(UPLOAD_DIR, t.path));
  if (file.metadata?.optimizedPath) toDelete.push(path.join(UPLOAD_DIR, file.metadata.optimizedPath));
  if (file.metadata?.watermarkedPath) toDelete.push(path.join(UPLOAD_DIR, file.metadata.watermarkedPath));

  for (const p of toDelete) {
    await fs.unlink(p).catch(() => {});
  }
  await file.deleteOne();
  res.json({ deleted: true });
});

/* ── Stats ────────────────────────────────────────────────────── */
app.get('/api/files/stats/summary', async (_req, res) => {
  const [total, pending, processing, sizeAgg] = await Promise.all([
    ProcessedFile.countDocuments(),
    ProcessedFile.countDocuments({ processingStatus: 'pending' }),
    ProcessedFile.countDocuments({ processingStatus: 'processing' }),
    ProcessedFile.aggregate([{ $group: { _id: null, totalSize: { $sum: '$size' }, avgSize: { $avg: '$size' } } }]),
  ]);
  const byType = await ProcessedFile.aggregate([
    { $group: { _id: '$mimeType', count: { $sum: 1 }, totalSize: { $sum: '$size' } } },
    { $sort: { count: -1 } },
  ]);
  res.json({
    total,
    pending,
    processing,
    totalSizeBytes: sizeAgg[0]?.totalSize || 0,
    avgSizeBytes: sizeAgg[0]?.avgSize || 0,
    byType,
  });
});

/* ── Start ────────────────────────────────────────────────────── */
const PORT = process.env.PORT || 3270;
app.listen(PORT, () => log.info(`File Processor running on port ${PORT}`));
