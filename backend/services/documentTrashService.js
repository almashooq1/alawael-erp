/**
 * Document Trash (Recycle Bin) Service — خدمة سلة المحذوفات
 *
 * Features:
 * - Soft delete with recycle bin
 * - Auto-purge after retention period
 * - Bulk restore
 * - Permanent delete with confirmation
 * - Storage recovery reports
 */

const EventEmitter = require('events');

class DocumentTrashService extends EventEmitter {
  constructor() {
    super();
    this.trashedDocuments = new Map(); // docId -> trash info
    this.purgeAfterDays = 30; // Auto-purge after 30 days
  }

  /**
   * Move document to trash — نقل مستند إلى سلة المحذوفات
   */
  async moveToTrash(documentId, data) {
    if (this.trashedDocuments.has(documentId)) {
      return { success: false, message: 'المستند موجود بالفعل في سلة المحذوفات' };
    }

    const trashEntry = {
      documentId,
      documentTitle: data.documentTitle || '',
      documentCategory: data.documentCategory || '',
      fileSize: data.fileSize || 0,
      filePath: data.filePath || '',
      mimeType: data.mimeType || '',
      originalFolder: data.folder || '',
      deletedBy: data.deletedBy,
      deletedByName: data.deletedByName || '',
      deletedAt: new Date(),
      expiresAt: new Date(Date.now() + this.purgeAfterDays * 24 * 60 * 60 * 1000),
      reason: data.reason || '',
      metadata: data.metadata || {},
      canRestore: true,
    };

    this.trashedDocuments.set(documentId, trashEntry);
    this.emit('documentTrashed', trashEntry);

    return {
      success: true,
      data: trashEntry,
      message: `تم نقل "${trashEntry.documentTitle}" إلى سلة المحذوفات. سيتم الحذف نهائياً بعد ${this.purgeAfterDays} يوم`,
    };
  }

  /**
   * Restore document from trash — استعادة مستند من سلة المحذوفات
   */
  async restore(documentId, restoredBy) {
    const entry = this.trashedDocuments.get(documentId);
    if (!entry) {
      return { success: false, message: 'المستند غير موجود في سلة المحذوفات' };
    }

    if (!entry.canRestore) {
      return { success: false, message: 'لا يمكن استعادة هذا المستند' };
    }

    this.trashedDocuments.delete(documentId);
    this.emit('documentRestored', {
      documentId,
      restoredBy,
      restoredAt: new Date(),
      originalEntry: entry,
    });

    return {
      success: true,
      data: { documentId, originalFolder: entry.originalFolder },
      message: `تمت استعادة "${entry.documentTitle}" بنجاح`,
    };
  }

  /**
   * Bulk restore — استعادة متعددة
   */
  async bulkRestore(documentIds, restoredBy) {
    const results = { restored: [], failed: [] };

    for (const docId of documentIds) {
      const result = await this.restore(docId, restoredBy);
      if (result.success) {
        results.restored.push(docId);
      } else {
        results.failed.push({ documentId: docId, reason: result.message });
      }
    }

    return {
      success: true,
      data: results,
      message: `تمت استعادة ${results.restored.length} مستند(ات)، فشل ${results.failed.length}`,
    };
  }

  /**
   * Permanently delete — حذف نهائي
   */
  async permanentDelete(documentId, deletedBy, confirmation) {
    if (confirmation !== 'CONFIRM_DELETE') {
      return { success: false, message: 'يجب تأكيد الحذف النهائي بإرسال CONFIRM_DELETE' };
    }

    const entry = this.trashedDocuments.get(documentId);
    if (!entry) {
      return { success: false, message: 'المستند غير موجود في سلة المحذوفات' };
    }

    const fileSize = entry.fileSize;
    this.trashedDocuments.delete(documentId);

    this.emit('documentPermanentlyDeleted', {
      documentId,
      documentTitle: entry.documentTitle,
      deletedBy,
      deletedAt: new Date(),
      freedSpace: fileSize,
    });

    return {
      success: true,
      message: `تم حذف "${entry.documentTitle}" نهائياً`,
      freedSpace: fileSize,
    };
  }

  /**
   * Bulk permanent delete — حذف نهائي متعدد
   */
  async bulkPermanentDelete(documentIds, deletedBy, confirmation) {
    if (confirmation !== 'CONFIRM_DELETE_ALL') {
      return { success: false, message: 'يجب تأكيد الحذف النهائي' };
    }

    let freedSpace = 0;
    const deleted = [];

    for (const docId of documentIds) {
      const entry = this.trashedDocuments.get(docId);
      if (entry) {
        freedSpace += entry.fileSize;
        this.trashedDocuments.delete(docId);
        deleted.push(docId);
      }
    }

    this.emit('bulkPermanentDelete', { deleted, freedSpace, deletedBy });

    return {
      success: true,
      message: `تم حذف ${deleted.length} مستند(ات) نهائياً`,
      freedSpace,
    };
  }

  /**
   * Empty trash — إفراغ سلة المحذوفات
   */
  async emptyTrash(userId, confirmation) {
    if (confirmation !== 'CONFIRM_EMPTY_TRASH') {
      return { success: false, message: 'يجب تأكيد إفراغ سلة المحذوفات' };
    }

    let userDocs;
    if (userId) {
      userDocs = Array.from(this.trashedDocuments.entries()).filter(
        ([, e]) => e.deletedBy === userId
      );
    } else {
      userDocs = Array.from(this.trashedDocuments.entries());
    }

    let freedSpace = 0;
    const count = userDocs.length;

    for (const [docId, entry] of userDocs) {
      freedSpace += entry.fileSize;
      this.trashedDocuments.delete(docId);
    }

    this.emit('trashEmptied', { userId, count, freedSpace });

    return {
      success: true,
      message: `تم إفراغ سلة المحذوفات (${count} مستند)`,
      freedSpace,
      deletedCount: count,
    };
  }

  /**
   * Get trash contents — محتويات سلة المحذوفات
   */
  async getTrash(userId, filters = {}) {
    let entries = Array.from(this.trashedDocuments.values());

    // Filter by user
    if (userId) {
      entries = entries.filter(e => e.deletedBy === userId);
    }

    // Filter by category
    if (filters.category) {
      entries = entries.filter(e => e.documentCategory === filters.category);
    }

    // Search
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      entries = entries.filter(
        e =>
          e.documentTitle.toLowerCase().includes(searchLower) ||
          e.deletedByName.toLowerCase().includes(searchLower)
      );
    }

    // Sort
    entries.sort((a, b) => new Date(b.deletedAt) - new Date(a.deletedAt));

    // Pagination
    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 20;
    const start = (page - 1) * limit;

    // Calculate remaining days for each entry
    const now = new Date();
    entries.forEach(e => {
      e.daysRemaining = Math.max(
        0,
        Math.ceil((new Date(e.expiresAt) - now) / (1000 * 60 * 60 * 24))
      );
    });

    return {
      success: true,
      data: entries.slice(start, start + limit),
      total: entries.length,
      page,
      pages: Math.ceil(entries.length / limit),
      totalSize: entries.reduce((sum, e) => sum + e.fileSize, 0),
    };
  }

  /**
   * Auto-purge expired items — الحذف التلقائي للعناصر المنتهية
   */
  async autoPurge() {
    const now = new Date();
    const purged = [];

    for (const [docId, entry] of this.trashedDocuments) {
      if (new Date(entry.expiresAt) <= now) {
        purged.push({
          documentId: docId,
          documentTitle: entry.documentTitle,
          fileSize: entry.fileSize,
        });
        this.trashedDocuments.delete(docId);
      }
    }

    const freedSpace = purged.reduce((sum, p) => sum + p.fileSize, 0);

    this.emit('autoPurgeCompleted', { purged, freedSpace });

    return {
      success: true,
      data: purged,
      message: `تم الحذف التلقائي لـ ${purged.length} مستند(ات)`,
      freedSpace,
    };
  }

  /**
   * Get trash statistics — إحصائيات سلة المحذوفات
   */
  async getStatistics(userId) {
    let entries = Array.from(this.trashedDocuments.values());
    if (userId) {
      entries = entries.filter(e => e.deletedBy === userId);
    }

    const now = new Date();
    const expiringToday = entries.filter(e => {
      const daysRemaining = Math.ceil((new Date(e.expiresAt) - now) / (1000 * 60 * 60 * 24));
      return daysRemaining <= 1;
    });

    const byCategory = {};
    entries.forEach(e => {
      byCategory[e.documentCategory || 'أخرى'] =
        (byCategory[e.documentCategory || 'أخرى'] || 0) + 1;
    });

    return {
      success: true,
      data: {
        totalItems: entries.length,
        totalSize: entries.reduce((sum, e) => sum + e.fileSize, 0),
        expiringToday: expiringToday.length,
        byCategory,
        oldestItem:
          entries.length > 0
            ? entries.sort((a, b) => new Date(a.deletedAt) - new Date(b.deletedAt))[0]
            : null,
        purgeAfterDays: this.purgeAfterDays,
      },
    };
  }
}

module.exports = new DocumentTrashService();
