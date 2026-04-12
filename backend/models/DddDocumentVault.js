'use strict';
/**
 * DddDocumentVault — Mongoose Models & Constants
 * Auto-extracted from services/dddDocumentVault.js
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

/* ═══════════════════ Constants ═══════════════════ */

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

/* ═══════════════════ Schemas ═══════════════════ */

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


/* ═══════════════════ Models ═══════════════════ */

const DDDFolder = mongoose.models.DDDFolder || mongoose.model('DDDFolder', folderSchema);

/* ── Document Tag ──────────────────────────────────────────────────────── */

/* ═══════════════════ Exports ═══════════════════ */
module.exports = {
  DOCUMENT_TYPES,
  DOCUMENT_STATUSES,
  STORAGE_TYPES,
  MIME_CATEGORIES,
  ACCESS_LEVELS,
  CLASSIFICATION_LEVELS,
  BUILTIN_TAGS,
  DDDVaultDocument,
  DDDFolder,
  DDDDocumentTag,
  DDDDocumentAccess,
};
