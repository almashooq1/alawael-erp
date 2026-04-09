/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * DDD Document Vault — Phase 22 · Document Management & Digital Records
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Secure document storage, versioning, folder hierarchy, access control,
 * tagging, and full-text search across all platform documents.
 *
 * Aggregates
 *   DDDVaultDocument    — stored document with metadata and versioning
 *   DDDFolder           — hierarchical folder structure
 *   DDDDocumentTag      — tagging / classification taxonomy
 *   DDDDocumentAccess   — per-document access control entry
 *
 * Canonical links
 *   uploadedBy  → User
 *   ownerId     → User / DDDDepartment / DDDStaffProfile
 * ═══════════════════════════════════════════════════════════════════════════════
 */

'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;
const { Router } = require('express');

class BaseDomainModule {
  constructor(name, opts = {}) {
    this.name = name;
    this.opts = opts;
  }
  log(msg) {
    console.log(`[${this.name}] ${msg}`);
  }
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  CONSTANTS                                                                 */
/* ═══════════════════════════════════════════════════════════════════════════ */

const DOCUMENT_TYPES = [
  'clinical_report',
  'assessment_form',
  'care_plan',
  'progress_note',
  'consent_form',
  'referral_letter',
  'prescription',
  'lab_result',
  'imaging_report',
  'discharge_summary',
  'policy_document',
  'template',
];

const DOCUMENT_STATUSES = [
  'draft',
  'pending_review',
  'approved',
  'published',
  'archived',
  'expired',
  'revoked',
  'superseded',
  'locked',
  'under_revision',
];

const STORAGE_TYPES = [
  'local',
  'cloud_s3',
  'cloud_azure',
  'cloud_gcs',
  'ftp',
  'network_share',
  'database_blob',
  'cdn',
  'encrypted_vault',
  'cold_storage',
  'tape_archive',
  'hybrid',
];

const MIME_CATEGORIES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats',
  'image/jpeg',
  'image/png',
  'image/dicom',
  'text/plain',
  'text/csv',
  'application/json',
  'application/xml',
  'audio/mpeg',
  'video/mp4',
];

const ACCESS_LEVELS = ['owner', 'editor', 'reviewer', 'viewer', 'commenter', 'downloader'];

const CLASSIFICATION_LEVELS = [
  'public',
  'internal',
  'confidential',
  'restricted',
  'top_secret',
  'patient_sensitive',
  'legal_privileged',
  'research_only',
];

/* ── Built-in tags ──────────────────────────────────────────────────────── */
const BUILTIN_TAGS = [
  { code: 'TAG-CLINICAL', name: 'Clinical', nameAr: 'سريري', color: '#2196F3' },
  { code: 'TAG-ADMIN', name: 'Administrative', nameAr: 'إداري', color: '#9C27B0' },
  { code: 'TAG-FINANCIAL', name: 'Financial', nameAr: 'مالي', color: '#4CAF50' },
  { code: 'TAG-LEGAL', name: 'Legal', nameAr: 'قانوني', color: '#F44336' },
  { code: 'TAG-HR', name: 'Human Resources', nameAr: 'موارد بشرية', color: '#FF9800' },
  { code: 'TAG-RESEARCH', name: 'Research', nameAr: 'بحثي', color: '#00BCD4' },
  { code: 'TAG-TRAINING', name: 'Training', nameAr: 'تدريبي', color: '#795548' },
  { code: 'TAG-POLICY', name: 'Policy', nameAr: 'سياسة', color: '#607D8B' },
  { code: 'TAG-TEMPLATE', name: 'Template', nameAr: 'قالب', color: '#E91E63' },
  { code: 'TAG-REPORT', name: 'Report', nameAr: 'تقرير', color: '#3F51B5' },
];

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  SCHEMAS                                                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */

/* ── Vault Document ────────────────────────────────────────────────────── */
const vaultDocumentSchema = new Schema(
  {
    documentCode: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    titleAr: { type: String },
    description: { type: String },
    type: { type: String, enum: DOCUMENT_TYPES, required: true },
    status: { type: String, enum: DOCUMENT_STATUSES, default: 'draft' },
    classification: { type: String, enum: CLASSIFICATION_LEVELS, default: 'internal' },
    mimeType: { type: String },
    fileSize: { type: Number, default: 0 },
    filePath: { type: String },
    storageType: { type: String, enum: STORAGE_TYPES, default: 'local' },
    checksum: { type: String },
    folderId: { type: Schema.Types.ObjectId, ref: 'DDDFolder' },
    tags: [{ type: Schema.Types.ObjectId, ref: 'DDDDocumentTag' }],
    version: { type: Number, default: 1 },
    versionHistory: [
      {
        version: Number,
        filePath: String,
        fileSize: Number,
        checksum: String,
        uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        uploadedAt: { type: Date, default: Date.now },
        changeNote: String,
      },
    ],
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    ownerId: { type: Schema.Types.ObjectId },
    ownerType: { type: String, enum: ['user', 'department', 'beneficiary', 'system'] },
    relatedEntityId: { type: Schema.Types.ObjectId },
    relatedEntityType: { type: String },
    retentionDate: { type: Date },
    expiresAt: { type: Date },
    isEncrypted: { type: Boolean, default: false },
    downloadCount: { type: Number, default: 0 },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

vaultDocumentSchema.index({ type: 1, status: 1 });
vaultDocumentSchema.index({ folderId: 1 });
vaultDocumentSchema.index({ classification: 1 });
vaultDocumentSchema.index({ '$**': 'text' });

const DDDVaultDocument =
  mongoose.models.DDDVaultDocument || mongoose.model('DDDVaultDocument', vaultDocumentSchema);

/* ── Folder ────────────────────────────────────────────────────────────── */
const folderSchema = new Schema(
  {
    folderCode: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    nameAr: { type: String },
    parentId: { type: Schema.Types.ObjectId, ref: 'DDDFolder', default: null },
    path: { type: String, default: '/' },
    depth: { type: Number, default: 0 },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User' },
    isSystem: { type: Boolean, default: false },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

folderSchema.index({ parentId: 1 });
folderSchema.index({ path: 1 });

const DDDFolder = mongoose.models.DDDFolder || mongoose.model('DDDFolder', folderSchema);

/* ── Document Tag ──────────────────────────────────────────────────────── */
const documentTagSchema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    nameAr: { type: String },
    color: { type: String, default: '#607D8B' },
    isActive: { type: Boolean, default: true },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

const DDDDocumentTag =
  mongoose.models.DDDDocumentTag || mongoose.model('DDDDocumentTag', documentTagSchema);

/* ── Document Access ───────────────────────────────────────────────────── */
const documentAccessSchema = new Schema(
  {
    documentId: { type: Schema.Types.ObjectId, ref: 'DDDVaultDocument', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    level: { type: String, enum: ACCESS_LEVELS, required: true },
    grantedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    expiresAt: { type: Date },
    isActive: { type: Boolean, default: true },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

documentAccessSchema.index({ documentId: 1, userId: 1 }, { unique: true });

const DDDDocumentAccess =
  mongoose.models.DDDDocumentAccess || mongoose.model('DDDDocumentAccess', documentAccessSchema);

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  DOMAIN MODULE                                                             */
/* ═══════════════════════════════════════════════════════════════════════════ */

class DocumentVault extends BaseDomainModule {
  constructor() {
    super('DocumentVault', {
      description: 'Secure document storage, versioning & access control',
      version: '1.0.0',
    });
  }

  async initialize() {
    await this._seedTags();
    this.log('Document Vault initialised ✓');
    return true;
  }

  async _seedTags() {
    for (const t of BUILTIN_TAGS) {
      const exists = await DDDDocumentTag.findOne({ code: t.code }).lean();
      if (!exists) await DDDDocumentTag.create(t);
    }
  }

  /* ── Documents ── */
  async listDocuments(filters = {}) {
    const q = {};
    if (filters.type) q.type = filters.type;
    if (filters.status) q.status = filters.status;
    if (filters.folderId) q.folderId = filters.folderId;
    if (filters.classification) q.classification = filters.classification;
    return DDDVaultDocument.find(q).sort({ updatedAt: -1 }).limit(100).lean();
  }
  async getDocument(id) {
    return DDDVaultDocument.findById(id).lean();
  }
  async uploadDocument(data) {
    if (!data.documentCode) data.documentCode = `DOC-${Date.now()}`;
    return DDDVaultDocument.create(data);
  }
  async updateDocument(id, data) {
    return DDDVaultDocument.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }
  async deleteDocument(id) {
    return DDDVaultDocument.findByIdAndDelete(id);
  }

  async searchDocuments(query) {
    return DDDVaultDocument.find({ $text: { $search: query } })
      .sort({ score: { $meta: 'textScore' } })
      .limit(50)
      .lean();
  }

  /* ── Folders ── */
  async listFolders(parentId = null) {
    return DDDFolder.find({ parentId }).sort({ name: 1 }).lean();
  }
  async createFolder(data) {
    if (!data.folderCode) data.folderCode = `FLD-${Date.now()}`;
    return DDDFolder.create(data);
  }
  async updateFolder(id, data) {
    return DDDFolder.findByIdAndUpdate(id, data, { new: true });
  }
  async deleteFolder(id) {
    return DDDFolder.findByIdAndDelete(id);
  }

  /* ── Tags ── */
  async listTags() {
    return DDDDocumentTag.find({ isActive: true }).sort({ name: 1 }).lean();
  }
  async createTag(data) {
    return DDDDocumentTag.create(data);
  }

  /* ── Access ── */
  async listAccess(documentId) {
    return DDDDocumentAccess.find({ documentId, isActive: true }).lean();
  }
  async grantAccess(data) {
    return DDDDocumentAccess.create(data);
  }
  async revokeAccess(id) {
    return DDDDocumentAccess.findByIdAndUpdate(id, { isActive: false }, { new: true });
  }

  /* ── Analytics ── */
  async getVaultAnalytics() {
    const [documents, folders, tags, access] = await Promise.all([
      DDDVaultDocument.countDocuments(),
      DDDFolder.countDocuments(),
      DDDDocumentTag.countDocuments(),
      DDDDocumentAccess.countDocuments(),
    ]);
    return { documents, folders, tags, accessEntries: access };
  }

  async healthCheck() {
    const [documents, folders, tags] = await Promise.all([
      DDDVaultDocument.countDocuments(),
      DDDFolder.countDocuments(),
      DDDDocumentTag.countDocuments(),
    ]);
    return { status: 'healthy', documents, folders, tags };
  }
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  ROUTER                                                                    */
/* ═══════════════════════════════════════════════════════════════════════════ */

function createDocumentVaultRouter() {
  const router = Router();
  const svc = new DocumentVault();

  /* Documents */
  router.get('/vault/documents', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listDocuments(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/vault/documents/search', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.searchDocuments(req.query.q || '') });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/vault/documents/:id', async (req, res) => {
    try {
      const d = await svc.getDocument(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/vault/documents', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.uploadDocument(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.put('/vault/documents/:id', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateDocument(req.params.id, req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.delete('/vault/documents/:id', async (req, res) => {
    try {
      await svc.deleteDocument(req.params.id);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Folders */
  router.get('/vault/folders', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listFolders(req.query.parentId || null) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/vault/folders', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createFolder(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Tags */
  router.get('/vault/tags', async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.listTags() });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Access */
  router.get('/vault/access/:documentId', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listAccess(req.params.documentId) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/vault/access', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.grantAccess(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Analytics & Health */
  router.get('/vault/analytics', async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getVaultAnalytics() });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/vault/health', async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.healthCheck() });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  return router;
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  EXPORTS                                                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */

module.exports = {
  DocumentVault,
  DDDVaultDocument,
  DDDFolder,
  DDDDocumentTag,
  DDDDocumentAccess,
  DOCUMENT_TYPES,
  DOCUMENT_STATUSES,
  STORAGE_TYPES,
  MIME_CATEGORIES,
  ACCESS_LEVELS,
  CLASSIFICATION_LEVELS,
  BUILTIN_TAGS,
  createDocumentVaultRouter,
};
