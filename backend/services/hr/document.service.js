/**
 * خدمة إدارة المستندات (Employee Document Service)
 * ─────────────────────────────────────────────────
 */
'use strict';

const EmployeeDocument = require('../../models/HR/EmployeeDocument');

class DocumentService {
  /** رفع/إنشاء مستند */
  static async create(data) {
    const doc = new EmployeeDocument(data);
    return doc.save();
  }

  /** جلب مستندات موظف */
  static async getByEmployee(employeeId, filters = {}) {
    const query = { employeeId };
    if (filters.category) query.category = filters.category;
    if (filters.status) query.status = filters.status;

    return EmployeeDocument.find(query).sort({ createdAt: -1 }).lean();
  }

  /** مستندات تنتهي صلاحيتها قريباً */
  static async getExpiringDocuments(daysAhead = 30) {
    const futureDate = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);
    return EmployeeDocument.find({
      expiryDate: { $lte: futureDate, $gte: new Date() },
      status: 'ساري',
    })
      .populate('employeeId', 'personalInfo name jobInfo')
      .sort({ expiryDate: 1 })
      .lean();
  }

  /** مستندات منتهية الصلاحية */
  static async getExpiredDocuments() {
    return EmployeeDocument.find({
      isExpired: true,
      status: { $ne: 'ملغى' },
    })
      .populate('employeeId', 'personalInfo name jobInfo')
      .sort({ expiryDate: 1 })
      .lean();
  }

  /** التحقق من مستند */
  static async verifyDocument(documentId, { verifiedBy, verificationNotes }) {
    return EmployeeDocument.findByIdAndUpdate(
      documentId,
      {
        $set: {
          'verification.isVerified': true,
          'verification.verifiedBy': verifiedBy,
          'verification.verifiedAt': new Date(),
          'verification.verificationNotes': verificationNotes,
        },
      },
      { new: true }
    );
  }

  /** إضافة إصدار جديد */
  static async addVersion(documentId, versionData) {
    const doc = await EmployeeDocument.findById(documentId);
    if (!doc) throw new Error('المستند غير موجود');

    const nextVersion = (doc.versions?.length || 0) + 1;
    doc.versions.push({
      version: nextVersion,
      ...versionData,
      uploadedAt: new Date(),
    });

    // تحديث الملف الرئيسي
    if (versionData.file) {
      doc.file = versionData.file;
    }

    return doc.save();
  }

  /** لوحة تحكم المستندات */
  static async dashboard() {
    const [total, expiringSoon, expired, unverified, byCategory] = await Promise.all([
      EmployeeDocument.countDocuments(),
      EmployeeDocument.countDocuments({
        expiryDate: { $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), $gte: new Date() },
        status: 'ساري',
      }),
      EmployeeDocument.countDocuments({ isExpired: true, status: { $ne: 'ملغى' } }),
      EmployeeDocument.countDocuments({ 'verification.isVerified': false }),
      EmployeeDocument.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    return {
      total,
      expiringSoon,
      expired,
      unverified,
      byCategory: byCategory.map(r => ({ category: r._id, count: r.count })),
      alerts: [
        expired > 0 ? { level: 'حرج', message: `${expired} مستند منتهي الصلاحية` } : null,
        expiringSoon > 0
          ? { level: 'تحذير', message: `${expiringSoon} مستند سينتهي خلال 30 يوم` }
          : null,
        unverified > 5 ? { level: 'معلومة', message: `${unverified} مستند بانتظار التحقق` } : null,
      ].filter(Boolean),
    };
  }
}

module.exports = DocumentService;
