'use strict';

/**
 * Document Versioning & Comparison Service — خدمة إدارة الإصدارات والمقارنة
 * ═══════════════════════════════════════════════════════════════════════════
 * نظام متكامل لإدارة إصدارات المستندات، المقارنة بين الإصدارات،
 * استعادة الإصدارات السابقة، وتتبع التغييرات
 */

const mongoose = require('mongoose');
const crypto = require('crypto');
const logger = require('../../utils/logger');

// ─────────────────────────────────────────────
// مخطط إصدار المستند
// ─────────────────────────────────────────────

const DocumentVersionSchema = new mongoose.Schema(
  {
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
      index: true,
    },

    // رقم الإصدار
    versionNumber: { type: Number, required: true },
    versionLabel: String, // مثال: "v1.0", "مسودة أولية"

    // نوع التغيير
    changeType: {
      type: String,
      enum: ['major', 'minor', 'patch', 'draft'],
      default: 'minor',
    },

    // وصف التغيير
    changeDescription: { type: String, default: '' },
    changeSummary: String,

    // بيانات الملف في هذا الإصدار
    fileData: {
      fileName: String,
      originalFileName: String,
      filePath: String,
      fileSize: Number,
      fileType: String,
      mimeType: String,
      checksum: String, // SHA-256
    },

    // محتوى النص المستخرج
    extractedText: String,

    // بيانات المستند في هذا الإصدار (snapshot)
    snapshot: {
      title: String,
      description: String,
      category: String,
      tags: [String],
      metadata: mongoose.Schema.Types.Mixed,
    },

    // التغييرات مقارنة بالإصدار السابق
    diff: {
      addedFields: [String],
      removedFields: [String],
      modifiedFields: [
        {
          field: String,
          oldValue: mongoose.Schema.Types.Mixed,
          newValue: mongoose.Schema.Types.Mixed,
        },
      ],
      textChanges: {
        added: { type: Number, default: 0 },
        removed: { type: Number, default: 0 },
        modified: { type: Number, default: 0 },
      },
      sizeChange: { type: Number, default: 0 }, // بالبايت
    },

    // من أنشأ هذا الإصدار
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    createdByName: String,

    // الحالة
    status: {
      type: String,
      enum: ['active', 'archived', 'deleted'],
      default: 'active',
    },
    isCurrentVersion: { type: Boolean, default: false },
    isMajorVersion: { type: Boolean, default: false },

    // بيانات إضافية
    metadata: mongoose.Schema.Types.Mixed,
  },
  {
    timestamps: true,
    collection: 'document_versions',
  }
);

DocumentVersionSchema.index({ documentId: 1, versionNumber: -1 });
DocumentVersionSchema.index({ documentId: 1, isCurrentVersion: 1 });
DocumentVersionSchema.index({ createdBy: 1, createdAt: -1 });

const DocumentVersion =
  mongoose.models.DocumentVersion || mongoose.model('DocumentVersion', DocumentVersionSchema);

// ─────────────────────────────────────────────
// خدمة إدارة الإصدارات
// ─────────────────────────────────────────────

class DocumentVersioningService {
  /**
   * إنشاء إصدار جديد
   */
  async createVersion(documentId, userId, options = {}) {
    try {
      const Document = mongoose.model('Document');
      const doc = await Document.findById(documentId).lean();
      if (!doc) throw new Error('المستند غير موجود');

      // جلب آخر إصدار
      const lastVersion = await DocumentVersion.findOne({ documentId })
        .sort({ versionNumber: -1 })
        .lean();

      const versionNumber = lastVersion ? lastVersion.versionNumber + 1 : 1;
      const changeType = options.changeType || 'minor';

      // حساب checksum
      const content = `${doc.title}:${doc.description}:${doc.fileSize}:${doc.extractedText || ''}`;
      const checksum = crypto.createHash('sha256').update(content).digest('hex');

      // حساب الفرق
      const diff = lastVersion ? this._calculateDiff(lastVersion, doc) : null;

      // إلغاء تفعيل الإصدار الحالي
      await DocumentVersion.updateMany(
        { documentId, isCurrentVersion: true },
        { isCurrentVersion: false }
      );

      const version = new DocumentVersion({
        documentId,
        versionNumber,
        versionLabel: options.versionLabel || `v${versionNumber}.0`,
        changeType,
        changeDescription: options.changeDescription || '',
        changeSummary: options.changeSummary || '',
        fileData: {
          fileName: doc.fileName,
          originalFileName: doc.originalFileName,
          filePath: doc.filePath,
          fileSize: doc.fileSize,
          fileType: doc.fileType,
          mimeType: doc.mimeType,
          checksum,
        },
        extractedText: doc.extractedText || '',
        snapshot: {
          title: doc.title,
          description: doc.description,
          category: doc.category,
          tags: doc.tags || [],
          metadata: doc.metadata || {},
        },
        diff: diff || {},
        createdBy: userId,
        createdByName: options.createdByName || '',
        isCurrentVersion: true,
        isMajorVersion: changeType === 'major',
      });

      await version.save();

      // تحديث عداد الإصدار في المستند
      try {
        await Document.findByIdAndUpdate(documentId, {
          version: versionNumber,
          lastModified: new Date(),
        });
      } catch (e) {
        logger.warn(`[Version] فشل تحديث المستند: ${e.message}`);
      }

      logger.info(`[Version] إصدار جديد: v${versionNumber} لمستند: ${documentId}`);

      return {
        success: true,
        version: this._formatVersion(version),
      };
    } catch (err) {
      logger.error(`[Version] خطأ في إنشاء الإصدار: ${err.message}`);
      throw err;
    }
  }

  /**
   * جلب جميع إصدارات المستند
   */
  async getVersionHistory(documentId, options = {}) {
    try {
      const query = { documentId, status: { $ne: 'deleted' } };
      if (options.changeType) query.changeType = options.changeType;

      const versions = await DocumentVersion.find(query)
        .populate('createdBy', 'name email')
        .sort({ versionNumber: -1 })
        .lean();

      return {
        success: true,
        documentId,
        versions: versions.map(v => this._formatVersion(v)),
        total: versions.length,
        currentVersion: versions.find(v => v.isCurrentVersion)?.versionNumber || 0,
      };
    } catch (err) {
      logger.error(`[Version] خطأ في جلب السجل: ${err.message}`);
      throw err;
    }
  }

  /**
   * جلب إصدار محدد
   */
  async getVersion(documentId, versionNumber) {
    try {
      const version = await DocumentVersion.findOne({ documentId, versionNumber })
        .populate('createdBy', 'name email')
        .lean();

      if (!version) return null;
      return this._formatVersion(version);
    } catch (err) {
      logger.error(`[Version] خطأ: ${err.message}`);
      throw err;
    }
  }

  /**
   * مقارنة إصدارين
   */
  async compareVersions(documentId, versionA, versionB) {
    try {
      const [verA, verB] = await Promise.all([
        DocumentVersion.findOne({ documentId, versionNumber: versionA }).lean(),
        DocumentVersion.findOne({ documentId, versionNumber: versionB }).lean(),
      ]);

      if (!verA || !verB) throw new Error('أحد الإصدارات غير موجود');

      const comparison = {
        versionA: {
          number: verA.versionNumber,
          label: verA.versionLabel,
          createdAt: verA.createdAt,
        },
        versionB: {
          number: verB.versionNumber,
          label: verB.versionLabel,
          createdAt: verB.createdAt,
        },
        changes: [],
        stats: { totalChanges: 0, addedLines: 0, removedLines: 0 },
      };

      // مقارنة العنوان
      if (verA.snapshot?.title !== verB.snapshot?.title) {
        comparison.changes.push({
          field: 'title',
          fieldLabel: 'العنوان',
          type: 'modified',
          oldValue: verA.snapshot?.title,
          newValue: verB.snapshot?.title,
        });
      }

      // مقارنة الوصف
      if (verA.snapshot?.description !== verB.snapshot?.description) {
        comparison.changes.push({
          field: 'description',
          fieldLabel: 'الوصف',
          type: 'modified',
          oldValue: verA.snapshot?.description,
          newValue: verB.snapshot?.description,
        });
      }

      // مقارنة الفئة
      if (verA.snapshot?.category !== verB.snapshot?.category) {
        comparison.changes.push({
          field: 'category',
          fieldLabel: 'الفئة',
          type: 'modified',
          oldValue: verA.snapshot?.category,
          newValue: verB.snapshot?.category,
        });
      }

      // مقارنة الوسوم
      const tagsA = new Set(verA.snapshot?.tags || []);
      const tagsB = new Set(verB.snapshot?.tags || []);
      const addedTags = [...tagsB].filter(t => !tagsA.has(t));
      const removedTags = [...tagsA].filter(t => !tagsB.has(t));

      if (addedTags.length > 0 || removedTags.length > 0) {
        comparison.changes.push({
          field: 'tags',
          fieldLabel: 'الوسوم',
          type: 'modified',
          addedTags,
          removedTags,
        });
      }

      // مقارنة حجم الملف
      if (verA.fileData?.fileSize !== verB.fileData?.fileSize) {
        comparison.changes.push({
          field: 'fileSize',
          fieldLabel: 'حجم الملف',
          type: 'modified',
          oldValue: verA.fileData?.fileSize,
          newValue: verB.fileData?.fileSize,
          sizeChange: (verB.fileData?.fileSize || 0) - (verA.fileData?.fileSize || 0),
        });
      }

      // مقارنة المحتوى النصي
      if (verA.extractedText || verB.extractedText) {
        const textDiff = this._compareTexts(verA.extractedText || '', verB.extractedText || '');
        if (textDiff.hasChanges) {
          comparison.changes.push({
            field: 'content',
            fieldLabel: 'المحتوى',
            type: 'modified',
            ...textDiff,
          });
          comparison.stats.addedLines = textDiff.addedLines;
          comparison.stats.removedLines = textDiff.removedLines;
        }
      }

      // مقارنة checksum
      comparison.filesIdentical = verA.fileData?.checksum === verB.fileData?.checksum;
      comparison.stats.totalChanges = comparison.changes.length;

      return { success: true, comparison };
    } catch (err) {
      logger.error(`[Version] خطأ في المقارنة: ${err.message}`);
      throw err;
    }
  }

  /**
   * استعادة إصدار سابق
   */
  async restoreVersion(documentId, versionNumber, userId, options = {}) {
    try {
      const version = await DocumentVersion.findOne({ documentId, versionNumber }).lean();
      if (!version) throw new Error('الإصدار غير موجود');

      const Document = mongoose.model('Document');

      // إنشاء إصدار جديد من الحالة الحالية أولاً (backup)
      await this.createVersion(documentId, userId, {
        changeDescription: `نسحة احتياطية قبل استعادة الإصدار v${versionNumber}`,
        changeType: 'patch',
        createdByName: options.userName || '',
      });

      // استعادة البيانات
      const updateData = {};
      if (version.snapshot?.title) updateData.title = version.snapshot.title;
      if (version.snapshot?.description) updateData.description = version.snapshot.description;
      if (version.snapshot?.category) updateData.category = version.snapshot.category;
      if (version.snapshot?.tags) updateData.tags = version.snapshot.tags;

      await Document.findByIdAndUpdate(documentId, updateData);

      // إنشاء إصدار جديد بعد الاستعادة
      const restoredVersion = await this.createVersion(documentId, userId, {
        changeDescription: `تم استعادة الإصدار v${versionNumber}`,
        changeType: 'major',
        createdByName: options.userName || '',
      });

      logger.info(`[Version] استعادة الإصدار v${versionNumber} لمستند: ${documentId}`);

      return {
        success: true,
        restoredFrom: versionNumber,
        newVersion: restoredVersion.version,
      };
    } catch (err) {
      logger.error(`[Version] خطأ في الاستعادة: ${err.message}`);
      throw err;
    }
  }

  /**
   * حذف إصدار (soft delete)
   */
  async deleteVersion(documentId, versionNumber) {
    try {
      const version = await DocumentVersion.findOne({ documentId, versionNumber });
      if (!version) throw new Error('الإصدار غير موجود');
      if (version.isCurrentVersion) throw new Error('لا يمكن حذف الإصدار الحالي');

      version.status = 'deleted';
      await version.save();

      return { success: true, message: `تم حذف الإصدار v${versionNumber}` };
    } catch (err) {
      logger.error(`[Version] خطأ في الحذف: ${err.message}`);
      throw err;
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  أدوات المقارنة
  // ═══════════════════════════════════════════════════════════

  _calculateDiff(previousVersion, currentDoc) {
    const diff = {
      addedFields: [],
      removedFields: [],
      modifiedFields: [],
      textChanges: { added: 0, removed: 0, modified: 0 },
      sizeChange: 0,
    };

    const prev = previousVersion.snapshot || {};
    const curr = currentDoc;

    // مقارنة الحقول
    const fieldsToCompare = ['title', 'description', 'category'];
    for (const field of fieldsToCompare) {
      if (prev[field] !== curr[field]) {
        diff.modifiedFields.push({
          field,
          oldValue: prev[field],
          newValue: curr[field],
        });
      }
    }

    // حجم الملف
    if (previousVersion.fileData?.fileSize !== curr.fileSize) {
      diff.sizeChange = (curr.fileSize || 0) - (previousVersion.fileData?.fileSize || 0);
    }

    // الوسوم
    const oldTags = new Set(prev.tags || []);
    const newTags = new Set(curr.tags || []);
    const addedTags = [...newTags].filter(t => !oldTags.has(t));
    const removedTags = [...oldTags].filter(t => !newTags.has(t));
    if (addedTags.length > 0) diff.addedFields.push(...addedTags.map(t => `tag:${t}`));
    if (removedTags.length > 0) diff.removedFields.push(...removedTags.map(t => `tag:${t}`));

    return diff;
  }

  _compareTexts(textA, textB) {
    const linesA = textA.split('\n').filter(l => l.trim());
    const linesB = textB.split('\n').filter(l => l.trim());

    const setA = new Set(linesA);
    const setB = new Set(linesB);

    const added = linesB.filter(l => !setA.has(l));
    const removed = linesA.filter(l => !setB.has(l));

    return {
      hasChanges: added.length > 0 || removed.length > 0,
      addedLines: added.length,
      removedLines: removed.length,
      addedSample: added.slice(0, 5),
      removedSample: removed.slice(0, 5),
      similarity:
        linesA.length > 0 || linesB.length > 0
          ? Math.round(
              ((linesA.length + linesB.length - added.length - removed.length) /
                Math.max(linesA.length + linesB.length, 1)) *
                100
            )
          : 100,
    };
  }

  _formatVersion(version) {
    const changeTypeLabels = {
      major: { label: 'رئيسي', labelEn: 'Major', color: '#EF4444', icon: '🔴' },
      minor: { label: 'ثانوي', labelEn: 'Minor', color: '#F59E0B', icon: '🟡' },
      patch: { label: 'تصحيحي', labelEn: 'Patch', color: '#10B981', icon: '🟢' },
      draft: { label: 'مسودة', labelEn: 'Draft', color: '#6B7280', icon: '⚪' },
    };

    return {
      id: version._id,
      documentId: version.documentId,
      versionNumber: version.versionNumber,
      versionLabel: version.versionLabel,
      changeType: {
        key: version.changeType,
        ...(changeTypeLabels[version.changeType] || changeTypeLabels.minor),
      },
      changeDescription: version.changeDescription,
      changeSummary: version.changeSummary,
      fileData: version.fileData,
      snapshot: version.snapshot,
      diff: version.diff,
      createdBy: version.createdBy,
      createdByName: version.createdByName,
      isCurrentVersion: version.isCurrentVersion,
      isMajorVersion: version.isMajorVersion,
      status: version.status,
      createdAt: version.createdAt,
    };
  }
}

module.exports = new DocumentVersioningService();
module.exports.DocumentVersion = DocumentVersion;
