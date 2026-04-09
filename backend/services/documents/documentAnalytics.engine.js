'use strict';

/**
 * Document Analytics Engine — محرك تحليلات المستندات
 * ═══════════════════════════════════════════════════════════════
 * تحليلات الاستخدام، الاتجاهات، التخزين، المستندات الأكثر شعبية،
 * تقارير الإنتاجية، ومؤشرات الأداء
 */

const mongoose = require('mongoose');
const logger = require('../../utils/logger');

class DocumentAnalyticsEngine {
  /**
   * لوحة المعلومات الرئيسية
   */
  async getDashboardAnalytics(options = {}) {
    try {
      const Document = mongoose.model('Document');
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

      const [
        totalDocs,
        activeDocs,
        archivedDocs,
        todayUploads,
        weekUploads,
        monthUploads,
        totalSize,
        byCategory,
        byFileType,
        byStatus,
        monthlyTrend,
      ] = await Promise.all([
        Document.countDocuments({ isDeleted: { $ne: true } }),
        Document.countDocuments({ isDeleted: { $ne: true }, status: { $ne: 'archived' } }),
        Document.countDocuments({ status: 'archived' }),
        Document.countDocuments({ createdAt: { $gte: today }, isDeleted: { $ne: true } }),
        Document.countDocuments({ createdAt: { $gte: thisWeek }, isDeleted: { $ne: true } }),
        Document.countDocuments({ createdAt: { $gte: thisMonth }, isDeleted: { $ne: true } }),
        Document.aggregate([
          { $match: { isDeleted: { $ne: true } } },
          { $group: { _id: null, total: { $sum: '$fileSize' } } },
        ]),
        Document.aggregate([
          { $match: { isDeleted: { $ne: true } } },
          { $group: { _id: '$category', count: { $sum: 1 }, totalSize: { $sum: '$fileSize' } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
        ]),
        Document.aggregate([
          { $match: { isDeleted: { $ne: true } } },
          { $group: { _id: '$fileType', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
        ]),
        Document.aggregate([
          { $match: { isDeleted: { $ne: true } } },
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),
        Document.aggregate([
          {
            $match: {
              createdAt: { $gte: new Date(now.getFullYear(), now.getMonth() - 11, 1) },
              isDeleted: { $ne: true },
            },
          },
          {
            $group: {
              _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
              count: { $sum: 1 },
              totalSize: { $sum: '$fileSize' },
            },
          },
          { $sort: { '_id.year': 1, '_id.month': 1 } },
        ]),
      ]);

      const monthNames = [
        'يناير',
        'فبراير',
        'مارس',
        'أبريل',
        'مايو',
        'يونيو',
        'يوليو',
        'أغسطس',
        'سبتمبر',
        'أكتوبر',
        'نوفمبر',
        'ديسمبر',
      ];

      return {
        success: true,
        analytics: {
          overview: {
            totalDocs,
            activeDocs,
            archivedDocs,
            todayUploads,
            weekUploads,
            monthUploads,
            totalSize: totalSize[0]?.total || 0,
            totalSizeFormatted: this._formatSize(totalSize[0]?.total || 0),
          },
          byCategory: byCategory.map(c => ({
            category: c._id || 'غير مصنف',
            count: c.count,
            totalSize: c.totalSize,
            totalSizeFormatted: this._formatSize(c.totalSize),
          })),
          byFileType: byFileType.map(f => ({
            fileType: f._id || 'غير معروف',
            count: f.count,
          })),
          byStatus: byStatus.map(s => ({
            status: s._id || 'غير محدد',
            count: s.count,
          })),
          monthlyTrend: monthlyTrend.map(m => ({
            month: monthNames[m._id.month - 1] || m._id.month,
            year: m._id.year,
            count: m.count,
            totalSize: m.totalSize,
          })),
        },
      };
    } catch (err) {
      logger.error(`[Analytics] خطأ: ${err.message}`);
      throw err;
    }
  }

  /**
   * تحليلات المستخدمين
   */
  async getUserAnalytics(options = {}) {
    try {
      const Document = mongoose.model('Document');
      const limit = options.limit || 10;

      const [topUploaders, topEditors, avgDocsPerUser] = await Promise.all([
        Document.aggregate([
          { $match: { isDeleted: { $ne: true } } },
          { $group: { _id: '$createdBy', count: { $sum: 1 }, totalSize: { $sum: '$fileSize' } } },
          { $sort: { count: -1 } },
          { $limit: limit },
          { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
          { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
          {
            $project: {
              count: 1,
              totalSize: 1,
              userName: { $ifNull: ['$user.name', 'غير معروف'] },
            },
          },
        ]),
        Document.aggregate([
          { $match: { isDeleted: { $ne: true }, lastModifiedBy: { $exists: true } } },
          { $group: { _id: '$lastModifiedBy', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: limit },
          { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
          { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
          { $project: { count: 1, userName: { $ifNull: ['$user.name', 'غير معروف'] } } },
        ]),
        Document.aggregate([
          { $match: { isDeleted: { $ne: true } } },
          { $group: { _id: '$createdBy', count: { $sum: 1 } } },
          { $group: { _id: null, avgDocs: { $avg: '$count' }, totalUsers: { $sum: 1 } } },
        ]),
      ]);

      return {
        success: true,
        analytics: {
          topUploaders: topUploaders.map(u => ({
            userId: u._id,
            userName: u.userName,
            documentsCount: u.count,
            totalSize: this._formatSize(u.totalSize),
          })),
          topEditors: topEditors.map(u => ({
            userId: u._id,
            userName: u.userName,
            editsCount: u.count,
          })),
          averageDocsPerUser: Math.round(avgDocsPerUser[0]?.avgDocs || 0),
          totalActiveUsers: avgDocsPerUser[0]?.totalUsers || 0,
        },
      };
    } catch (err) {
      logger.error(`[Analytics] خطأ: ${err.message}`);
      throw err;
    }
  }

  /**
   * تحليلات التخزين
   */
  async getStorageAnalytics() {
    try {
      const Document = mongoose.model('Document');

      const [totalByType, totalByCategory, largest, storageGrowth] = await Promise.all([
        Document.aggregate([
          { $match: { isDeleted: { $ne: true } } },
          { $group: { _id: '$fileType', totalSize: { $sum: '$fileSize' }, count: { $sum: 1 } } },
          { $sort: { totalSize: -1 } },
        ]),
        Document.aggregate([
          { $match: { isDeleted: { $ne: true } } },
          { $group: { _id: '$category', totalSize: { $sum: '$fileSize' }, count: { $sum: 1 } } },
          { $sort: { totalSize: -1 } },
        ]),
        Document.find({ isDeleted: { $ne: true } })
          .sort({ fileSize: -1 })
          .limit(10)
          .select('title fileSize fileType category createdAt')
          .lean(),
        Document.aggregate([
          { $match: { isDeleted: { $ne: true } } },
          {
            $group: {
              _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
              totalSize: { $sum: '$fileSize' },
              count: { $sum: 1 },
            },
          },
          { $sort: { '_id.year': 1, '_id.month': 1 } },
        ]),
      ]);

      // حساب النمو التراكمي
      let cumulative = 0;
      const cumulativeGrowth = storageGrowth.map(g => {
        cumulative += g.totalSize;
        return { ...g, cumulative };
      });

      return {
        success: true,
        analytics: {
          byFileType: totalByType.map(t => ({
            fileType: t._id || 'غير معروف',
            totalSize: t.totalSize,
            totalSizeFormatted: this._formatSize(t.totalSize),
            count: t.count,
          })),
          byCategory: totalByCategory.map(c => ({
            category: c._id || 'غير مصنف',
            totalSize: c.totalSize,
            totalSizeFormatted: this._formatSize(c.totalSize),
            count: c.count,
          })),
          largestDocuments: largest.map(d => ({
            id: d._id,
            title: d.title,
            fileSize: d.fileSize,
            fileSizeFormatted: this._formatSize(d.fileSize),
            fileType: d.fileType,
            category: d.category,
          })),
          storageGrowth: cumulativeGrowth.map(g => ({
            month: g._id.month,
            year: g._id.year,
            added: this._formatSize(g.totalSize),
            cumulative: this._formatSize(g.cumulative),
            addedRaw: g.totalSize,
            cumulativeRaw: g.cumulative,
            count: g.count,
          })),
        },
      };
    } catch (err) {
      logger.error(`[Analytics] خطأ: ${err.message}`);
      throw err;
    }
  }

  /**
   * تحليلات الإنتاجية
   */
  async getProductivityAnalytics(options = {}) {
    try {
      const Document = mongoose.model('Document');
      const days = options.days || 30;
      const since = new Date();
      since.setDate(since.getDate() - days);

      const [dailyActivity, peakHours, weekdayDist] = await Promise.all([
        Document.aggregate([
          { $match: { createdAt: { $gte: since }, isDeleted: { $ne: true } } },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ]),
        Document.aggregate([
          { $match: { createdAt: { $gte: since }, isDeleted: { $ne: true } } },
          { $group: { _id: { $hour: '$createdAt' }, count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),
        Document.aggregate([
          { $match: { createdAt: { $gte: since }, isDeleted: { $ne: true } } },
          { $group: { _id: { $dayOfWeek: '$createdAt' }, count: { $sum: 1 } } },
          { $sort: { _id: 1 } },
        ]),
      ]);

      const dayNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

      return {
        success: true,
        analytics: {
          period: `${days} يوم`,
          dailyActivity: dailyActivity.map(d => ({
            date: d._id,
            count: d.count,
          })),
          peakHours: peakHours.slice(0, 5).map(h => ({
            hour: `${h._id}:00`,
            count: h.count,
          })),
          weekdayDistribution: weekdayDist.map(w => ({
            day: dayNames[w._id - 1] || w._id,
            count: w.count,
          })),
          averageDocsPerDay:
            dailyActivity.length > 0
              ? Math.round(dailyActivity.reduce((s, d) => s + d.count, 0) / dailyActivity.length)
              : 0,
        },
      };
    } catch (err) {
      logger.error(`[Analytics] خطأ: ${err.message}`);
      throw err;
    }
  }

  /**
   * تحليلات سير العمل
   */
  async getWorkflowAnalytics() {
    try {
      const Document = mongoose.model('Document');

      const [statusDist, avgProcessingTime, bottlenecks] = await Promise.all([
        Document.aggregate([
          { $match: { 'workflowStatus.currentState': { $exists: true } } },
          { $group: { _id: '$workflowStatus.currentState', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),
        Document.aggregate([
          {
            $match: {
              'workflowStatus.currentState': { $in: ['approved', 'published'] },
              'workflowStatus.startedAt': { $exists: true },
            },
          },
          {
            $project: {
              processingTime: { $subtract: ['$updatedAt', '$workflowStatus.startedAt'] },
            },
          },
          {
            $group: {
              _id: null,
              avgTime: { $avg: '$processingTime' },
              minTime: { $min: '$processingTime' },
              maxTime: { $max: '$processingTime' },
            },
          },
        ]),
        Document.aggregate([
          {
            $match: {
              'workflowStatus.currentState': { $in: ['pending_review', 'department_review'] },
            },
          },
          { $group: { _id: '$workflowStatus.assignedTo', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 5 },
          { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
          { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
          { $project: { count: 1, userName: { $ifNull: ['$user.name', 'غير معروف'] } } },
        ]),
      ]);

      const statusLabels = {
        draft: 'مسودة',
        pending_review: 'بانتظار المراجعة',
        department_review: 'مراجعة القسم',
        approved: 'معتمد',
        published: 'منشور',
        archived: 'مؤرشف',
        rejected: 'مرفوض',
      };

      return {
        success: true,
        analytics: {
          statusDistribution: statusDist.map(s => ({
            status: s._id,
            label: statusLabels[s._id] || s._id,
            count: s.count,
          })),
          avgProcessingTime: avgProcessingTime[0]
            ? {
                average: Math.round((avgProcessingTime[0].avgTime || 0) / (1000 * 60 * 60)),
                min: Math.round((avgProcessingTime[0].minTime || 0) / (1000 * 60 * 60)),
                max: Math.round((avgProcessingTime[0].maxTime || 0) / (1000 * 60 * 60)),
                unit: 'ساعة',
              }
            : null,
          bottlenecks: bottlenecks.map(b => ({
            userId: b._id,
            userName: b.userName,
            pendingCount: b.count,
          })),
        },
      };
    } catch (err) {
      logger.error(`[Analytics] خطأ: ${err.message}`);
      throw err;
    }
  }

  /**
   * تقرير شامل
   */
  async getFullReport(options = {}) {
    try {
      const [dashboard, users, storage, productivity, workflow] = await Promise.all([
        this.getDashboardAnalytics(options),
        this.getUserAnalytics(options),
        this.getStorageAnalytics(),
        this.getProductivityAnalytics(options),
        this.getWorkflowAnalytics(),
      ]);

      return {
        success: true,
        report: {
          generatedAt: new Date(),
          dashboard: dashboard.analytics,
          users: users.analytics,
          storage: storage.analytics,
          productivity: productivity.analytics,
          workflow: workflow.analytics,
        },
      };
    } catch (err) {
      logger.error(`[Analytics] خطأ في التقرير: ${err.message}`);
      throw err;
    }
  }

  _formatSize(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  }
}

module.exports = new DocumentAnalyticsEngine();
