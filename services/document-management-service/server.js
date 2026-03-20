/**
 * Document Management Service — Al-Awael ERP
 * Port: 3340
 *
 * Enterprise DMS: file versioning, folder hierarchy, tagging,
 * OCR integration, e-signatures, watermarking, document templates,
 * approval workflows, retention policies, audit trail, archive.
 */

'use strict';

const express = require('express');
const mongoose = require('mongoose');
const Redis = require('ioredis');
const { Queue, Worker } = require('bullmq');
const multer = require('multer');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const helmet = require('helmet');
const cors = require('cors');

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '5mb' }));

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } }); // 50 MB

const redis = new Redis(process.env.REDIS_URL || 'redis://redis:6379/0', {
  maxRetriesPerRequest: null,
  retryStrategy: t => Math.min(t * 200, 5000),
});
const pub = redis.duplicate();

const docQueue = new Queue('document-processing', { connection: redis });

/* ───────── Mongoose schemas ───────── */

// Folder
const folderSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    nameAr: String,
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Folder', default: null },
    path: { type: String, index: true }, // /root/subfolder/
    ownerId: String,
    department: String,
    permissions: [
      {
        principalId: String, // userId / roleId
        principalType: { type: String, enum: ['user', 'role', 'department'] },
        access: { type: String, enum: ['view', 'edit', 'manage', 'full'] },
      },
    ],
    isSystem: { type: Boolean, default: false },
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true },
);

const Folder = mongoose.model('Folder', folderSchema);

// Document
const documentSchema = new mongoose.Schema(
  {
    documentId: { type: String, unique: true, default: () => uuidv4() },
    title: { type: String, required: true },
    titleAr: String,
    description: String,
    folderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Folder' },
    category: {
      type: String,
      enum: [
        'contract',
        'policy',
        'report',
        'form',
        'letter',
        'certificate',
        'invoice',
        'receipt',
        'medical',
        'academic',
        'hr',
        'legal',
        'template',
        'other',
      ],
      default: 'other',
    },
    tags: [String],
    status: { type: String, enum: ['draft', 'pending-review', 'approved', 'published', 'archived', 'deleted'], default: 'draft' },
    // Current version
    currentVersion: { type: Number, default: 1 },
    filename: String,
    mimeType: String,
    fileSize: Number,
    storageKey: String, // MinIO/S3 key
    checksum: String, // SHA-256
    // Metadata
    ownerId: { type: String, required: true },
    department: String,
    confidentiality: { type: String, enum: ['public', 'internal', 'confidential', 'restricted'], default: 'internal' },
    // Retention
    retentionPolicy: String,
    retentionExpiry: Date,
    // OCR
    ocrText: String,
    ocrStatus: { type: String, enum: ['none', 'pending', 'completed', 'failed'], default: 'none' },
    // E-Signature
    signatures: [
      {
        signerId: String,
        signerName: String,
        signedAt: Date,
        certificate: String,
        position: { page: Number, x: Number, y: Number },
        status: { type: String, enum: ['pending', 'signed', 'rejected', 'expired'], default: 'pending' },
      },
    ],
    requiresSignature: { type: Boolean, default: false },
    // Watermark
    watermark: {
      enabled: { type: Boolean, default: false },
      text: String,
      type: { type: String, enum: ['text', 'image'], default: 'text' },
    },
    // Approvals
    approvalStatus: { type: String, enum: ['none', 'pending', 'approved', 'rejected'], default: 'none' },
    approvals: [
      {
        approverId: String,
        approverName: String,
        action: { type: String, enum: ['approved', 'rejected', 'commented'] },
        comment: String,
        actionAt: Date,
      },
    ],
    // Access
    permissions: [
      {
        principalId: String,
        principalType: { type: String, enum: ['user', 'role', 'department'] },
        access: { type: String, enum: ['view', 'edit', 'manage', 'full'] },
      },
    ],
    accessCount: { type: Number, default: 0 },
    lastAccessAt: Date,
    lastAccessBy: String,
    isTemplate: { type: Boolean, default: false },
  },
  { timestamps: true },
);

documentSchema.index({ title: 'text', titleAr: 'text', description: 'text', ocrText: 'text', tags: 'text' });

const Document = mongoose.model('Document', documentSchema);

// Version History
const versionSchema = new mongoose.Schema(
  {
    documentId: { type: String, required: true, index: true },
    version: { type: Number, required: true },
    filename: String,
    mimeType: String,
    fileSize: Number,
    storageKey: String,
    checksum: String,
    changeLog: String,
    uploadedBy: String,
  },
  { timestamps: true },
);

const Version = mongoose.model('DocumentVersion', versionSchema);

// Audit Trail
const auditSchema = new mongoose.Schema(
  {
    documentId: { type: String, required: true, index: true },
    action: {
      type: String,
      enum: [
        'created',
        'viewed',
        'downloaded',
        'edited',
        'version-uploaded',
        'signed',
        'approved',
        'rejected',
        'shared',
        'archived',
        'deleted',
        'restored',
        'moved',
        'permission-changed',
      ],
      required: true,
    },
    userId: String,
    userName: String,
    details: mongoose.Schema.Types.Mixed,
    ipAddress: String,
  },
  { timestamps: true },
);

const Audit = mongoose.model('DocumentAudit', auditSchema);

// Template
const templateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    nameAr: String,
    category: String,
    content: String, // HTML/Markdown template with {{variables}}
    variables: [{ name: String, label: String, labelAr: String, type: String, required: Boolean }],
    storageKey: String, // for file-based templates
    isActive: { type: Boolean, default: true },
    createdBy: String,
  },
  { timestamps: true },
);

const Template = mongoose.model('DocumentTemplate', templateSchema);

/* ───────── BullMQ worker ───────── */

new Worker(
  'document-processing',
  async job => {
    if (job.name === 'ocr') {
      const doc = await Document.findOne({ documentId: job.data.documentId });
      if (!doc) return;
      // In production: call OCR service (Tesseract / Azure AI / Google Vision)
      doc.ocrStatus = 'completed';
      doc.ocrText = `[OCR placeholder for ${doc.filename}]`;
      await doc.save();
      console.log(`[DMS] OCR completed for ${doc.documentId}`);
    }
    if (job.name === 'watermark') {
      console.log(`[DMS] Watermark applied to ${job.data.documentId}`);
    }
    if (job.name === 'retention-check') {
      const expired = await Document.find({
        retentionExpiry: { $lt: new Date() },
        status: { $ne: 'archived' },
      });
      for (const doc of expired) {
        doc.status = 'archived';
        await doc.save();
        await Audit.create({ documentId: doc.documentId, action: 'archived', userId: 'system', details: { reason: 'retention-expired' } });
      }
      console.log(`[DMS] Archived ${expired.length} expired documents`);
    }
  },
  { connection: redis },
);

/* ───────── Routes ───────── */
const r = express.Router();

// ── Folders ──
r.get('/folders', async (req, res) => {
  try {
    const { parentId, department } = req.query;
    const q = {};
    if (parentId) q.parentId = parentId === 'root' ? null : parentId;
    else q.parentId = null;
    if (department) q.department = department;
    const folders = await Folder.find(q).sort({ name: 1 });
    res.json({ success: true, data: folders });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

r.post('/folders', async (req, res) => {
  try {
    const parent = req.body.parentId ? await Folder.findById(req.body.parentId) : null;
    const path = parent ? `${parent.path}${parent.name}/` : '/';
    const folder = await Folder.create({ ...req.body, path });
    res.status(201).json({ success: true, data: folder });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

r.put('/folders/:id', async (req, res) => {
  try {
    const f = await Folder.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: f });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

// ── Documents ──
r.get('/documents', async (req, res) => {
  try {
    const { folderId, category, status, ownerId, search, page = 1, limit = 50 } = req.query;
    const q = { status: { $ne: 'deleted' } };
    if (folderId) q.folderId = folderId;
    if (category) q.category = category;
    if (status) q.status = status;
    if (ownerId) q.ownerId = ownerId;
    if (search) q.$text = { $search: search };
    const total = await Document.countDocuments(q);
    const docs = await Document.find(q)
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    res.json({ success: true, data: docs, pagination: { total, page: Number(page), pages: Math.ceil(total / limit) } });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

r.get('/documents/:id', async (req, res) => {
  try {
    const doc = await Document.findOne({ $or: [{ _id: req.params.id }, { documentId: req.params.id }] });
    if (!doc) return res.status(404).json({ success: false, error: 'Not found' });
    // Track access
    doc.accessCount += 1;
    doc.lastAccessAt = new Date();
    doc.lastAccessBy = req.headers['x-user-id'];
    await doc.save();
    await Audit.create({ documentId: doc.documentId, action: 'viewed', userId: req.headers['x-user-id'] });
    const versions = await Version.find({ documentId: doc.documentId }).sort({ version: -1 });
    res.json({ success: true, data: { document: doc, versions } });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

r.post('/documents', async (req, res) => {
  try {
    const doc = await Document.create(req.body);
    await Audit.create({ documentId: doc.documentId, action: 'created', userId: doc.ownerId });
    // Trigger OCR if applicable
    if (['application/pdf', 'image/jpeg', 'image/png', 'image/tiff'].includes(doc.mimeType)) {
      doc.ocrStatus = 'pending';
      await doc.save();
      await docQueue.add('ocr', { documentId: doc.documentId });
    }
    res.status(201).json({ success: true, data: doc });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

r.put('/documents/:id', async (req, res) => {
  try {
    const doc = await Document.findOneAndUpdate({ $or: [{ _id: req.params.id }, { documentId: req.params.id }] }, req.body, {
      new: true,
      runValidators: true,
    });
    await Audit.create({ documentId: doc.documentId, action: 'edited', userId: req.headers['x-user-id'], details: Object.keys(req.body) });
    res.json({ success: true, data: doc });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

// Upload new version
r.post('/documents/:id/versions', upload.single('file'), async (req, res) => {
  try {
    const doc = await Document.findOne({ $or: [{ _id: req.params.id }, { documentId: req.params.id }] });
    if (!doc) return res.status(404).json({ success: false, error: 'Not found' });

    const newVersion = doc.currentVersion + 1;
    const checksum = req.file ? crypto.createHash('sha256').update(req.file.buffer).digest('hex') : null;
    const storageKey = `docs/${doc.documentId}/v${newVersion}/${req.file?.originalname || 'file'}`;

    // Store in MinIO/S3 — simplified; in production use minio client
    await Version.create({
      documentId: doc.documentId,
      version: newVersion,
      filename: req.file?.originalname || doc.filename,
      mimeType: req.file?.mimetype || doc.mimeType,
      fileSize: req.file?.size || 0,
      storageKey,
      checksum,
      changeLog: req.body.changeLog,
      uploadedBy: req.headers['x-user-id'],
    });

    doc.currentVersion = newVersion;
    doc.filename = req.file?.originalname || doc.filename;
    doc.mimeType = req.file?.mimetype || doc.mimeType;
    doc.fileSize = req.file?.size || doc.fileSize;
    doc.storageKey = storageKey;
    doc.checksum = checksum;
    await doc.save();

    await Audit.create({
      documentId: doc.documentId,
      action: 'version-uploaded',
      userId: req.headers['x-user-id'],
      details: { version: newVersion },
    });

    res.status(201).json({ success: true, data: { document: doc, version: newVersion } });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

// E-Signature
r.post('/documents/:id/sign', async (req, res) => {
  try {
    const { signerId, signerName, position } = req.body;
    const doc = await Document.findOne({ $or: [{ _id: req.params.id }, { documentId: req.params.id }] });
    if (!doc) return res.status(404).json({ success: false, error: 'Not found' });

    const sig = doc.signatures.find(s => s.signerId === signerId && s.status === 'pending');
    if (sig) {
      sig.status = 'signed';
      sig.signedAt = new Date();
      sig.certificate = `SIG-${uuidv4().slice(0, 8).toUpperCase()}`;
    } else {
      doc.signatures.push({
        signerId,
        signerName,
        signedAt: new Date(),
        certificate: `SIG-${uuidv4().slice(0, 8).toUpperCase()}`,
        position,
        status: 'signed',
      });
    }
    await doc.save();
    await Audit.create({ documentId: doc.documentId, action: 'signed', userId: signerId, details: { signerName } });

    await pub.publish('dms:document-signed', JSON.stringify({ documentId: doc.documentId, signerId }));
    res.json({ success: true, data: doc });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

// Request signatures
r.post('/documents/:id/request-signatures', async (req, res) => {
  try {
    const { signers } = req.body; // [{ signerId, signerName, position }]
    const doc = await Document.findOne({ $or: [{ _id: req.params.id }, { documentId: req.params.id }] });
    if (!doc) return res.status(404).json({ success: false, error: 'Not found' });

    doc.requiresSignature = true;
    for (const s of signers) {
      doc.signatures.push({ signerId: s.signerId, signerName: s.signerName, position: s.position, status: 'pending' });
    }
    await doc.save();

    for (const s of signers) {
      await pub.publish('dms:signature-requested', JSON.stringify({ documentId: doc.documentId, signerId: s.signerId, title: doc.title }));
    }
    res.json({ success: true, data: doc });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

// Approve / Reject document
r.post('/documents/:id/approve', async (req, res) => {
  try {
    const { approverId, approverName, action, comment } = req.body;
    const doc = await Document.findOne({ $or: [{ _id: req.params.id }, { documentId: req.params.id }] });
    if (!doc) return res.status(404).json({ success: false, error: 'Not found' });

    doc.approvals.push({ approverId, approverName, action, comment, actionAt: new Date() });
    doc.approvalStatus = action;
    if (action === 'approved') doc.status = 'approved';
    await doc.save();

    await Audit.create({ documentId: doc.documentId, action, userId: approverId, details: { comment } });
    res.json({ success: true, data: doc });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

// Watermark
r.post('/documents/:id/watermark', async (req, res) => {
  try {
    const { text, type } = req.body;
    const doc = await Document.findOneAndUpdate(
      { $or: [{ _id: req.params.id }, { documentId: req.params.id }] },
      { watermark: { enabled: true, text, type: type || 'text' } },
      { new: true },
    );
    await docQueue.add('watermark', { documentId: doc.documentId });
    res.json({ success: true, data: doc });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

// Share (update permissions)
r.post('/documents/:id/share', async (req, res) => {
  try {
    const { permissions } = req.body;
    const doc = await Document.findOneAndUpdate(
      { $or: [{ _id: req.params.id }, { documentId: req.params.id }] },
      { $push: { permissions: { $each: permissions } } },
      { new: true },
    );
    await Audit.create({
      documentId: doc.documentId,
      action: 'shared',
      userId: req.headers['x-user-id'],
      details: { sharedWith: permissions.map(p => p.principalId) },
    });
    res.json({ success: true, data: doc });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

// Archive
r.post('/documents/:id/archive', async (req, res) => {
  try {
    const doc = await Document.findOneAndUpdate(
      { $or: [{ _id: req.params.id }, { documentId: req.params.id }] },
      { status: 'archived' },
      { new: true },
    );
    await Audit.create({ documentId: doc.documentId, action: 'archived', userId: req.headers['x-user-id'] });
    res.json({ success: true, data: doc });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

// Audit trail
r.get('/documents/:id/audit', async (req, res) => {
  try {
    const doc = await Document.findOne({ $or: [{ _id: req.params.id }, { documentId: req.params.id }] });
    if (!doc) return res.status(404).json({ success: false, error: 'Not found' });
    const trail = await Audit.find({ documentId: doc.documentId }).sort({ createdAt: -1 });
    res.json({ success: true, data: trail });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── Templates ──
r.get('/templates', async (req, res) => {
  try {
    const { category } = req.query;
    const q = { isActive: true };
    if (category) q.category = category;
    const templates = await Template.find(q).sort({ name: 1 });
    res.json({ success: true, data: templates });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

r.post('/templates', async (req, res) => {
  try {
    const t = await Template.create(req.body);
    res.status(201).json({ success: true, data: t });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

r.post('/templates/:id/generate', async (req, res) => {
  try {
    const template = await Template.findById(req.params.id);
    if (!template) return res.status(404).json({ success: false, error: 'Template not found' });
    const { variables, title } = req.body;
    let content = template.content;
    for (const [key, value] of Object.entries(variables || {})) {
      content = content.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    }
    const doc = await Document.create({
      title: title || `${template.name} - ${new Date().toLocaleDateString('ar-SA')}`,
      category: template.category,
      ownerId: req.headers['x-user-id'] || 'system',
      status: 'draft',
    });
    res.status(201).json({ success: true, data: { document: doc, generatedContent: content } });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

// ── Stats ──
r.get('/stats', async (_req, res) => {
  try {
    const [totalDocs, byCategory, byStatus, pendingSignatures, recentActivity] = await Promise.all([
      Document.countDocuments({ status: { $ne: 'deleted' } }),
      Document.aggregate([{ $match: { status: { $ne: 'deleted' } } }, { $group: { _id: '$category', count: { $sum: 1 } } }]),
      Document.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Document.countDocuments({ 'signatures.status': 'pending' }),
      Audit.find().sort({ createdAt: -1 }).limit(20),
    ]);

    res.json({
      success: true,
      data: {
        totalDocuments: totalDocs,
        byCategory: byCategory.reduce((o, c) => {
          o[c._id] = c.count;
          return o;
        }, {}),
        byStatus: byStatus.reduce((o, s) => {
          o[s._id] = s.count;
          return o;
        }, {}),
        pendingSignatures,
        recentActivity,
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
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
const PORT = process.env.PORT || 3340;
const MONGO = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://mongodb:27017/alawael_dms';

mongoose
  .connect(MONGO)
  .then(() => {
    console.log('[DMS] MongoDB connected');
    app.listen(PORT, '0.0.0.0', () => console.log(`[DMS] listening on ${PORT}`));
  })
  .catch(err => {
    console.error('[DMS] Mongo error', err);
    process.exit(1);
  });
