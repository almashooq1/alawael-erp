/**
 * DDD File Attachments — إدارة المرفقات للدومينات العلاجية
 *
 * Links uploaded files to any DDD domain document.
 * Supports all 20 DDD domains with a single polymorphic attachment model.
 *
 * Features:
 *  - Polymorphic model (attach to any domain document)
 *  - Multer integration for secure uploads
 *  - Metadata tracking (uploader, size, MIME, tags)
 *  - Soft delete with audit trail
 *  - CRUD API router
 *  - File categories per domain
 *
 * @module domains/_base/ddd-attachments
 */

'use strict';

const mongoose = require('mongoose');
const express = require('express');
const path = require('path');
const fs = require('fs');

// ── Attachment Schema ───────────────────────────────────────────────────

const attachmentSchema = new mongoose.Schema(
  {
    // Polymorphic reference
    domain: { type: String, required: true, index: true },
    modelName: { type: String, required: true },
    documentId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },

    // File info
    originalName: { type: String, required: true },
    storagePath: { type: String, required: true },
    mimeType: { type: String },
    size: { type: Number },
    extension: { type: String },

    // Metadata
    category: {
      type: String,
      enum: [
        'clinical-report',
        'assessment-form',
        'consent-form',
        'prescription',
        'lab-result',
        'medical-image',
        'therapy-material',
        'progress-note',
        'family-document',
        'administrative',
        'training-material',
        'research-paper',
        'photo',
        'video',
        'audio',
        'other',
      ],
      default: 'other',
    },
    description: { type: String, maxlength: 1000 },
    descriptionAr: { type: String, maxlength: 1000 },
    tags: [{ type: String, trim: true }],

    // Tracking
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: Date,
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    collection: 'ddd_attachments',
  }
);

// Compound indexes for efficient queries
attachmentSchema.index({ domain: 1, documentId: 1, isDeleted: 1 });
attachmentSchema.index({ modelName: 1, documentId: 1 });
attachmentSchema.index({ uploadedBy: 1, createdAt: -1 });

const DDDAttachment =
  mongoose.models.DDDAttachment || mongoose.model('DDDAttachment', attachmentSchema);

// ── Domain validation map ───────────────────────────────────────────────

const DOMAIN_MODELS = {
  core: ['Beneficiary'],
  episodes: ['EpisodeOfCare'],
  timeline: ['CareTimeline'],
  assessments: ['ClinicalAssessment'],
  'care-plans': ['UnifiedCarePlan'],
  sessions: ['ClinicalSession'],
  goals: ['TherapeuticGoal', 'Measure'],
  workflow: ['WorkflowTask'],
  programs: ['Program'],
  'ai-recommendations': ['Recommendation'],
  quality: ['QualityAudit', 'CorrectiveAction'],
  family: ['FamilyMember', 'FamilyCommunication'],
  reports: ['ReportTemplate', 'GeneratedReport'],
  'group-therapy': ['TherapyGroup'],
  'tele-rehab': ['TeleSession'],
  'ar-vr': ['ARVRSession'],
  behavior: ['BehaviorRecord', 'BehaviorPlan'],
  research: ['ResearchStudy'],
  'field-training': ['TrainingProgram', 'TraineeRecord'],
  dashboards: ['DashboardConfig'],
};

// ── Core CRUD functions ─────────────────────────────────────────────────

/**
 * Create an attachment record after file upload.
 */
async function createAttachment(data) {
  const {
    domain,
    modelName,
    documentId,
    file,
    category,
    description,
    descriptionAr,
    tags,
    uploadedBy,
  } = data;

  // Validate domain/model
  const validModels = DOMAIN_MODELS[domain];
  if (!validModels) throw new Error(`Invalid domain: ${domain}`);
  if (!validModels.includes(modelName))
    throw new Error(`Model ${modelName} not in domain ${domain}`);

  // Verify document exists
  const Model = mongoose.models[modelName];
  if (Model) {
    const exists = await Model.exists({ _id: documentId });
    if (!exists) throw new Error(`Document ${documentId} not found in ${modelName}`);
  }

  return DDDAttachment.create({
    domain,
    modelName,
    documentId,
    originalName: file.originalname || file.originalName,
    storagePath: file.path || file.storagePath,
    mimeType: file.mimetype || file.mimeType,
    size: file.size,
    extension: path.extname(file.originalname || file.originalName || '').toLowerCase(),
    category: category || 'other',
    description,
    descriptionAr,
    tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim())) : [],
    uploadedBy,
  });
}

/**
 * List attachments for a specific document.
 */
async function listAttachments(domain, documentId, options = {}) {
  const { category, page = 1, limit = 50, sort = '-createdAt' } = options;
  const filter = { domain, documentId, isDeleted: { $ne: true } };
  if (category) filter.category = category;

  const [docs, total] = await Promise.all([
    DDDAttachment.find(filter)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('uploadedBy', 'name email')
      .lean(),
    DDDAttachment.countDocuments(filter),
  ]);

  return { attachments: docs, total, page, limit };
}

/**
 * Get single attachment by ID.
 */
async function getAttachment(attachmentId) {
  return DDDAttachment.findOne({ _id: attachmentId, isDeleted: { $ne: true } })
    .populate('uploadedBy', 'name email')
    .lean();
}

/**
 * Soft delete an attachment.
 */
async function deleteAttachment(attachmentId, deletedBy) {
  return DDDAttachment.findOneAndUpdate(
    { _id: attachmentId, isDeleted: { $ne: true } },
    { isDeleted: true, deletedAt: new Date(), deletedBy },
    { new: true }
  );
}

/**
 * Count attachments per domain (for stats).
 */
async function attachmentStats() {
  return DDDAttachment.aggregate([
    { $match: { isDeleted: { $ne: true } } },
    {
      $group: {
        _id: '$domain',
        count: { $sum: 1 },
        totalSize: { $sum: '$size' },
      },
    },
    { $sort: { count: -1 } },
  ]);
}

// ── Express Router ──────────────────────────────────────────────────────

function createAttachmentsRouter() {
  const router = express.Router();

  // Load multer middleware
  let upload;
  try {
    const uploadMiddleware = require('../../middleware/uploadMiddleware');
    upload = uploadMiddleware.upload;
  } catch {
    try {
      const uploadSimple = require('../../middleware/upload');
      upload = uploadSimple.upload;
    } catch {
      // No upload middleware available
    }
  }

  /**
   * POST /api/v1/platform/attachments/:domain/:documentId
   * Upload a file and attach it to a domain document.
   * Body: multipart/form-data with 'file' field
   * Query: modelName, category, description, tags
   */
  router.post(
    '/attachments/:domain/:documentId',
    (req, res, next) => {
      if (!upload) {
        return res.status(501).json({ success: false, message: 'File upload not configured' });
      }
      upload.single('file')(req, res, next);
    },
    async (req, res) => {
      try {
        const { domain, documentId } = req.params;
        const { modelName, category, description, descriptionAr, tags } = req.body;

        if (!req.file) {
          return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        // Resolve modelName from domain if not provided
        const resolvedModelName = modelName || (DOMAIN_MODELS[domain] && DOMAIN_MODELS[domain][0]);
        if (!resolvedModelName) {
          return res
            .status(400)
            .json({ success: false, message: 'modelName required for this domain' });
        }

        const attachment = await createAttachment({
          domain,
          modelName: resolvedModelName,
          documentId,
          file: req.file,
          category,
          description,
          descriptionAr,
          tags,
          uploadedBy: req.user?._id || req.user?.id,
        });

        res.status(201).json({ success: true, attachment });
      } catch (err) {
        res.status(400).json({ success: false, message: err.message });
      }
    }
  );

  /**
   * GET /api/v1/platform/attachments/:domain/:documentId
   * List all attachments for a document.
   */
  router.get('/attachments/:domain/:documentId', async (req, res) => {
    try {
      const { domain, documentId } = req.params;
      const { category, page, limit } = req.query;
      const data = await listAttachments(domain, documentId, {
        category,
        page: parseInt(page, 10) || 1,
        limit: parseInt(limit, 10) || 50,
      });
      res.json({ success: true, ...data });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * GET /api/v1/platform/attachments/item/:attachmentId
   * Get single attachment details.
   */
  router.get('/attachments/item/:attachmentId', async (req, res) => {
    try {
      const att = await getAttachment(req.params.attachmentId);
      if (!att) return res.status(404).json({ success: false, message: 'Attachment not found' });
      res.json({ success: true, attachment: att });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * DELETE /api/v1/platform/attachments/item/:attachmentId
   * Soft delete an attachment.
   */
  router.delete('/attachments/item/:attachmentId', async (req, res) => {
    try {
      const deleted = await deleteAttachment(req.params.attachmentId, req.user?._id);
      if (!deleted)
        return res.status(404).json({ success: false, message: 'Attachment not found' });
      res.json({ success: true, message: 'Attachment deleted' });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * GET /api/v1/platform/attachments/stats
   * Attachment statistics per domain.
   */
  router.get('/attachments/stats', async (_req, res) => {
    try {
      const stats = await attachmentStats();
      res.json({ success: true, stats });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * GET /api/v1/platform/attachments/download/:attachmentId
   * Download an attachment file.
   */
  router.get('/attachments/download/:attachmentId', async (req, res) => {
    try {
      const att = await getAttachment(req.params.attachmentId);
      if (!att) return res.status(404).json({ success: false, message: 'Attachment not found' });

      if (!fs.existsSync(att.storagePath)) {
        return res.status(404).json({ success: false, message: 'File not found on disk' });
      }

      res.download(att.storagePath, att.originalName);
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  return router;
}

module.exports = {
  DDDAttachment,
  DOMAIN_MODELS,
  createAttachment,
  listAttachments,
  getAttachment,
  deleteAttachment,
  attachmentStats,
  createAttachmentsRouter,
};
