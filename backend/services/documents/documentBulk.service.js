'use strict';

/**
 * Document Bulk Operations Service — خدمة العمليات المجمعة
 * ═══════════════════════════════════════════════════════════════
 * نظام شامل لتنفيذ العمليات المجمعة على المستندات:
 * تحميل، حذف، نقل، تصنيف، مشاركة، أرشفة، وتصدير
 */

const mongoose = require('mongoose');
const logger = require('../../utils/logger');

// ─────────────────────────────────────────────
// مخطط المهمة المجمعة
// ─────────────────────────────────────────────

const BulkJobSchema = new mongoose.Schema(
  {
    jobId: { type: String, unique: true, required: true },
    jobType: {
      type: String,
      enum: [
        'bulk_delete',
        'bulk_archive',
        'bulk_restore',
        'bulk_classify',
        'bulk_tag',
        'bulk_move',
        'bulk_share',
        'bulk_unshare',
        'bulk_download',
        'bulk_export',
        'bulk_update_status',
        'bulk_assign_workflow',
        'bulk_update_metadata',
      ],
      required: true,
    },

    // المستندات المستهدفة
    documentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Document' }],
    totalDocuments: { type: Number, default: 0 },

    // التقدم
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
      default: 'pending',
    },
    processedCount: { type: Number, default: 0 },
    successCount: { type: Number, default: 0 },
    failedCount: { type: Number, default: 0 },
    progress: { type: Number, default: 0 }, // 0-100

    // النتائج
    results: [
      {
        documentId: mongoose.Schema.Types.ObjectId,
        status: { type: String, enum: ['success', 'failed', 'skipped'] },
        message: String,
      },
    ],

    // المعلمات
    params: mongoose.Schema.Types.Mixed,

    // الأخطاء
    errors: [{ documentId: mongoose.Schema.Types.ObjectId, error: String }],

    // المستخدم
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdByName: String,

    startedAt: Date,
    completedAt: Date,
  },
  {
    timestamps: true,
    collection: 'document_bulk_jobs',
  }
);

BulkJobSchema.index({ createdBy: 1, createdAt: -1 });
BulkJobSchema.index({ status: 1 });
BulkJobSchema.index({ jobId: 1 });

const BulkJob = mongoose.models.DocumentBulkJob || mongoose.model('DocumentBulkJob', BulkJobSchema);

// ─────────────────────────────────────────────
// خدمة العمليات المجمعة
// ─────────────────────────────────────────────

class DocumentBulkService {
  /**
   * حذف مجمع
   */
  async bulkDelete(documentIds, userId, options = {}) {
    return this._executeBulkOperation('bulk_delete', documentIds, userId, options, async docId => {
      const Document = mongoose.model('Document');
      if (options.softDelete !== false) {
        await Document.findByIdAndUpdate(docId, {
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: userId,
        });
      } else {
        await Document.findByIdAndDelete(docId);
      }
      return { status: 'success', message: 'تم الحذف' };
    });
  }

  /**
   * أرشفة مجمعة
   */
  async bulkArchive(documentIds, userId, options = {}) {
    return this._executeBulkOperation('bulk_archive', documentIds, userId, options, async docId => {
      const Document = mongoose.model('Document');
      await Document.findByIdAndUpdate(docId, {
        status: 'archived',
        archivedAt: new Date(),
        archivedBy: userId,
      });
      return { status: 'success', message: 'تم الأرشفة' };
    });
  }

  /**
   * استعادة مجمعة
   */
  async bulkRestore(documentIds, userId, options = {}) {
    return this._executeBulkOperation('bulk_restore', documentIds, userId, options, async docId => {
      const Document = mongoose.model('Document');
      await Document.findByIdAndUpdate(docId, {
        status: 'active',
        isDeleted: false,
        $unset: { deletedAt: 1, deletedBy: 1, archivedAt: 1, archivedBy: 1 },
      });
      return { status: 'success', message: 'تم الاستعادة' };
    });
  }

  /**
   * تصنيف مجمع
   */
  async bulkClassify(documentIds, userId, options = {}) {
    const { category, confidence } = options;
    if (!category) throw new Error('الفئة مطلوبة');

    return this._executeBulkOperation(
      'bulk_classify',
      documentIds,
      userId,
      options,
      async docId => {
        const Document = mongoose.model('Document');
        await Document.findByIdAndUpdate(docId, {
          'smartClassification.category': category,
          'smartClassification.confidence': confidence || 1.0,
          'smartClassification.classifiedAt': new Date(),
          'smartClassification.classifiedBy': 'bulk',
        });
        return { status: 'success', message: `تم التصنيف: ${category}` };
      }
    );
  }

  /**
   * إضافة وسوم مجمعة
   */
  async bulkTag(documentIds, userId, options = {}) {
    const { tags, mode } = options; // mode: 'add' | 'replace' | 'remove'
    if (!tags || tags.length === 0) throw new Error('الوسوم مطلوبة');

    return this._executeBulkOperation('bulk_tag', documentIds, userId, options, async docId => {
      const Document = mongoose.model('Document');
      let update;

      switch (mode) {
        case 'replace':
          update = { tags };
          break;
        case 'remove':
          update = { $pullAll: { tags } };
          break;
        case 'add':
        default:
          update = { $addToSet: { tags: { $each: tags } } };
          break;
      }

      await Document.findByIdAndUpdate(docId, update);
      return { status: 'success', message: `تم تحديث الوسوم` };
    });
  }

  /**
   * نقل مجمع
   */
  async bulkMove(documentIds, userId, options = {}) {
    const { targetFolder, targetCategory } = options;

    return this._executeBulkOperation('bulk_move', documentIds, userId, options, async docId => {
      const Document = mongoose.model('Document');
      const update = {};
      if (targetFolder) update.folder = targetFolder;
      if (targetCategory) update.category = targetCategory;

      await Document.findByIdAndUpdate(docId, update);
      return { status: 'success', message: 'تم النقل' };
    });
  }

  /**
   * مشاركة مجمعة
   */
  async bulkShare(documentIds, userId, options = {}) {
    const { shareWith, permission } = options;
    if (!shareWith || shareWith.length === 0)
      throw new Error('المستخدمون المطلوب المشاركة معهم ناقصون');

    return this._executeBulkOperation('bulk_share', documentIds, userId, options, async docId => {
      const Document = mongoose.model('Document');
      const shareEntries = shareWith.map(uid => ({
        userId: uid,
        permission: permission || 'view',
        sharedAt: new Date(),
        sharedBy: userId,
      }));

      await Document.findByIdAndUpdate(docId, {
        $addToSet: { sharedWith: { $each: shareEntries } },
      });
      return { status: 'success', message: 'تم المشاركة' };
    });
  }

  /**
   * تحديث حالة مجمع (سير العمل)
   */
  async bulkUpdateStatus(documentIds, userId, options = {}) {
    const { status } = options;
    if (!status) throw new Error('الحالة مطلوبة');

    return this._executeBulkOperation(
      'bulk_update_status',
      documentIds,
      userId,
      options,
      async docId => {
        const Document = mongoose.model('Document');
        await Document.findByIdAndUpdate(docId, {
          'workflowStatus.currentState': status,
          lastModified: new Date(),
        });
        return { status: 'success', message: `تم تحديث الحالة: ${status}` };
      }
    );
  }

  /**
   * تحديث بيانات وصفية مجمع
   */
  async bulkUpdateMetadata(documentIds, userId, options = {}) {
    const { metadata } = options;
    if (!metadata) throw new Error('البيانات الوصفية مطلوبة');

    return this._executeBulkOperation(
      'bulk_update_metadata',
      documentIds,
      userId,
      options,
      async docId => {
        const Document = mongoose.model('Document');
        const update = {};
        for (const [key, value] of Object.entries(metadata)) {
          update[`metadata.${key}`] = value;
        }
        await Document.findByIdAndUpdate(docId, { $set: update });
        return { status: 'success', message: 'تم تحديث البيانات الوصفية' };
      }
    );
  }

  // ═══════════════════════════════════════════════════════════
  //  إدارة المهام المجمعة
  // ═══════════════════════════════════════════════════════════

  /**
   * جلب المهام المجمعة للمستخدم
   */
  async getUserJobs(userId, options = {}) {
    try {
      const query = { createdBy: userId };
      if (options.status) query.status = options.status;

      const jobs = await BulkJob.find(query)
        .sort({ createdAt: -1 })
        .limit(options.limit || 20)
        .lean();

      return {
        success: true,
        jobs: jobs.map(j => this._formatJob(j)),
      };
    } catch (err) {
      logger.error(`[Bulk] خطأ: ${err.message}`);
      throw err;
    }
  }

  /**
   * جلب حالة مهمة
   */
  async getJobStatus(jobId) {
    try {
      const job = await BulkJob.findOne({ jobId }).lean();
      if (!job) return null;
      return this._formatJob(job, true);
    } catch (err) {
      logger.error(`[Bulk] خطأ: ${err.message}`);
      throw err;
    }
  }

  /**
   * إلغاء مهمة
   */
  async cancelJob(jobId, userId) {
    try {
      const job = await BulkJob.findOne({ jobId, createdBy: userId });
      if (!job) throw new Error('المهمة غير موجودة');
      if (job.status === 'completed') throw new Error('المهمة مكتملة بالفعل');

      job.status = 'cancelled';
      await job.save();

      return { success: true, message: 'تم إلغاء المهمة' };
    } catch (err) {
      logger.error(`[Bulk] خطأ: ${err.message}`);
      throw err;
    }
  }

  /**
   * إحصائيات العمليات المجمعة
   */
  async getBulkStats(userId) {
    try {
      const [total, byType, byStatus, recentJobs] = await Promise.all([
        BulkJob.countDocuments(userId ? { createdBy: userId } : {}),
        BulkJob.aggregate([
          ...(userId ? [{ $match: { createdBy: new mongoose.Types.ObjectId(userId) } }] : []),
          {
            $group: { _id: '$jobType', count: { $sum: 1 }, totalDocs: { $sum: '$totalDocuments' } },
          },
          { $sort: { count: -1 } },
        ]),
        BulkJob.aggregate([
          ...(userId ? [{ $match: { createdBy: new mongoose.Types.ObjectId(userId) } }] : []),
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),
        BulkJob.find(userId ? { createdBy: userId } : {})
          .sort({ createdAt: -1 })
          .limit(5)
          .select('jobId jobType status totalDocuments successCount failedCount createdAt')
          .lean(),
      ]);

      return {
        success: true,
        stats: {
          total,
          byType: byType.map(t => ({
            type: t._id,
            label: this._getJobTypeLabel(t._id),
            count: t.count,
            totalDocuments: t.totalDocs,
          })),
          byStatus,
          recentJobs: recentJobs.map(j => this._formatJob(j)),
        },
      };
    } catch (err) {
      logger.error(`[Bulk] خطأ: ${err.message}`);
      throw err;
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  المحرك الداخلي
  // ═══════════════════════════════════════════════════════════

  async _executeBulkOperation(jobType, documentIds, userId, options, operationFn) {
    const jobId = `bulk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // إنشاء سجل المهمة
    const job = new BulkJob({
      jobId,
      jobType,
      documentIds,
      totalDocuments: documentIds.length,
      status: 'processing',
      params: options,
      createdBy: userId,
      createdByName: options.userName || '',
      startedAt: new Date(),
    });
    await job.save();

    logger.info(`[Bulk] بدء ${jobType}: ${documentIds.length} مستند (${jobId})`);

    const results = [];
    const errors = [];
    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < documentIds.length; i++) {
      const docId = documentIds[i];

      try {
        // التحقق من الإلغاء
        if (i > 0 && i % 10 === 0) {
          const currentJob = await BulkJob.findOne({ jobId }).select('status').lean();
          if (currentJob?.status === 'cancelled') {
            logger.info(`[Bulk] تم إلغاء المهمة: ${jobId}`);
            break;
          }
        }

        const result = await operationFn(docId);
        results.push({ documentId: docId, ...result });
        successCount++;
      } catch (err) {
        results.push({ documentId: docId, status: 'failed', message: err.message });
        errors.push({ documentId: docId, error: err.message });
        failedCount++;
      }

      // تحديث التقدم كل 5 مستندات
      if (i > 0 && i % 5 === 0) {
        await BulkJob.findOneAndUpdate(
          { jobId },
          {
            processedCount: i + 1,
            progress: Math.round(((i + 1) / documentIds.length) * 100),
          }
        );
      }
    }

    // تحديث المهمة النهائي
    await BulkJob.findOneAndUpdate(
      { jobId },
      {
        status: failedCount === documentIds.length ? 'failed' : 'completed',
        processedCount: successCount + failedCount,
        successCount,
        failedCount,
        progress: 100,
        results,
        errors,
        completedAt: new Date(),
      }
    );

    logger.info(
      `[Bulk] اكتمال ${jobType}: نجاح ${successCount}/${documentIds.length}, فشل ${failedCount}`
    );

    return {
      success: true,
      jobId,
      jobType,
      totalDocuments: documentIds.length,
      successCount,
      failedCount,
      results,
    };
  }

  _getJobTypeLabel(type) {
    const labels = {
      bulk_delete: 'حذف مجمع',
      bulk_archive: 'أرشفة مجمعة',
      bulk_restore: 'استعادة مجمعة',
      bulk_classify: 'تصنيف مجمع',
      bulk_tag: 'وسوم مجمعة',
      bulk_move: 'نقل مجمع',
      bulk_share: 'مشاركة مجمعة',
      bulk_unshare: 'إلغاء مشاركة مجمعة',
      bulk_download: 'تحميل مجمع',
      bulk_export: 'تصدير مجمع',
      bulk_update_status: 'تحديث حالة مجمع',
      bulk_assign_workflow: 'تعيين سير عمل مجمع',
      bulk_update_metadata: 'تحديث بيانات وصفية',
    };
    return labels[type] || type;
  }

  _formatJob(job, full = false) {
    const result = {
      jobId: job.jobId,
      jobType: job.jobType,
      jobTypeLabel: this._getJobTypeLabel(job.jobType),
      status: job.status,
      totalDocuments: job.totalDocuments,
      processedCount: job.processedCount,
      successCount: job.successCount,
      failedCount: job.failedCount,
      progress: job.progress,
      createdBy: job.createdBy,
      createdByName: job.createdByName,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      createdAt: job.createdAt,
    };

    if (full) {
      result.results = job.results;
      result.errors = job.errors;
      result.params = job.params;
    }

    return result;
  }
}

module.exports = new DocumentBulkService();
module.exports.BulkJob = BulkJob;
