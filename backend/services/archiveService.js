// backend/services/archiveService.js
// خدمة الأرشفة الإلكترونية للوثائق والإشعارات — MongoDB archive collection

const mongoose = require('mongoose');
const crypto = require('crypto');
const logger = require('../utils/logger');

// ── Archive Schema (dedicated collection) ───────────────────────
const archiveSchema = new mongoose.Schema(
  {
    documentType: {
      type: String,
      required: true,
      index: true,
    },
    documentId: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      index: true,
    },
    content: mongoose.Schema.Types.Mixed,
    meta: mongoose.Schema.Types.Mixed,
    status: {
      type: String,
      enum: ['archived', 'restored', 'deleted'],
      default: 'archived',
      index: true,
    },
    checksum: String,
    archivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    restoredAt: Date,
  },
  { timestamps: true }
);

archiveSchema.index({ documentType: 1, documentId: 1 });
archiveSchema.index({ createdAt: 1 });

const Archive = mongoose.models.Archive || mongoose.model('Archive', archiveSchema);

class ArchiveService {
  /**
   * Archive a document or notification.
   * Stores the content in a dedicated `archives` collection with checksum.
   */
  static async archiveDocument({ documentType, documentId, content, meta, archivedBy }) {
    try {
      const contentStr = typeof content === 'string' ? content : JSON.stringify(content || {});
      const checksum = crypto.createHash('sha256').update(contentStr).digest('hex');

      const record = await Archive.create({
        documentType,
        documentId,
        content,
        meta: meta || {},
        checksum,
        archivedBy: archivedBy || null,
        status: 'archived',
      });

      logger.info(`Archived ${documentType}/${documentId} → ${record._id}`);

      return {
        success: true,
        archive: {
          id: record._id,
          documentType,
          documentId,
          checksum,
          meta: record.meta,
          status: record.status,
          timestamp: record.createdAt.toISOString(),
        },
        message: 'تمت الأرشفة بنجاح',
      };
    } catch (error) {
      logger.error('ArchiveService.archiveDocument error:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Retrieve an archived document by documentType + documentId.
   */
  static async getArchive(documentType, documentId) {
    return Archive.findOne({ documentType, documentId, status: 'archived' }).lean();
  }

  /**
   * List archives with optional filters and pagination.
   */
  static async listArchives({ documentType, status, page = 1, limit = 20 } = {}) {
    const filter = {};
    if (documentType) filter.documentType = documentType;
    if (status) filter.status = status;

    const [records, total] = await Promise.all([
      Archive.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Archive.countDocuments(filter),
    ]);

    return { records, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /**
   * Restore a previously archived document (marks it as restored).
   */
  static async restoreDocument(archiveId) {
    const record = await Archive.findByIdAndUpdate(
      archiveId,
      { status: 'restored', restoredAt: new Date() },
      { new: true }
    );
    if (!record) return { success: false, message: 'السجل غير موجود' };

    logger.info(`Restored archive ${archiveId}`);
    return { success: true, archive: record, message: 'تمت استعادة الأرشيف بنجاح' };
  }
}

module.exports = ArchiveService;
