/**
 * BeneficiaryService.js — منطق الأعمال لوحدة إدارة المستفيدين
 * Business Logic Service for Beneficiary Management Module
 *
 * يُغلّف جميع عمليات الأعمال المعقدة بعيداً عن طبقة الـ Routes:
 *  - توليد رقم الملف التلقائي
 *  - فحص سعة الفرع
 *  - فحص التسجيل المكرر
 *  - قائمة الانتظار الذكية
 *  - تغيير حالة المستفيد
 *  - إتمام عملية النقل
 *  - السجل الزمني
 *  - الإحصائيات
 *
 * @module services/BeneficiaryService
 */

'use strict';

const Beneficiary = require('../models/Beneficiary');
const Guardian = require('../models/Guardian');
const BeneficiaryTransfer = require('../models/BeneficiaryTransfer');
const WaitlistEntry = require('../models/WaitlistEntry');
const {
  BENEFICIARY_STATUSES,
  DISABILITY_SEVERITY_LABELS,
  PRIORITY_LEVEL_SCORES,
} = require('../constants/beneficiary.constants');

// ─── استيراد اختياري للنماذج (قد تكون غير موجودة في بعض البيئات) ───────────────
let Branch;
try {
  Branch = require('../models/Branch');
} catch {
  Branch = null;
}

let ActivityLog;
try {
  ActivityLog = require('../models/ActivityLog');
} catch {
  ActivityLog = null;
}

// ─── BeneficiaryService ────────────────────────────────────────────────────────
class BeneficiaryService {
  // ═══════════════════════════════════════════════════════════════════════════
  // 1. توليد رقم الملف
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * توليد رقم ملف تلقائي ومتسلسل
   * الصيغة: BR-{BRANCH_CODE}-{YEAR}-{SEQUENCE:4}
   * المثال: BR-RYD-2026-0001
   *
   * @param {string} branchId  معرّف الفرع
   * @param {string} branchCode رمز الفرع (مثال: RYD)
   * @returns {Promise<string>}
   */
  async generateFileNumber(branchId, branchCode) {
    const year = new Date().getFullYear();
    let code = branchCode;

    // إذا لم يُمرَّر رمز الفرع، حاول جلبه
    if (!code && Branch) {
      const branch = await Branch.findById(branchId).select('code').lean();
      code = branch?.code || 'GEN';
    }
    if (!code) code = 'GEN';

    const prefix = `BR-${code.toUpperCase()}-${year}`;

    // البحث عن آخر رقم في نفس الفرع والسنة
    const lastBeneficiary = await Beneficiary.findOne({
      fileNumber: new RegExp(`^${prefix}-`),
    })
      .sort({ fileNumber: -1 })
      .select('fileNumber')
      .lean();

    let sequence = 1;
    if (lastBeneficiary?.fileNumber) {
      const parts = lastBeneficiary.fileNumber.split('-');
      const lastSeq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastSeq)) sequence = lastSeq + 1;
    }

    return `${prefix}-${String(sequence).padStart(4, '0')}`;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. فحص سعة الفرع
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * يتحقق أن الفرع لم يبلغ السعة القصوى
   * يرمي خطأ إذا امتلأ الفرع
   *
   * @param {string} branchId معرّف الفرع
   * @throws {Error} إذا تجاوزت السعة القصوى
   */
  async checkBranchCapacity(branchId) {
    if (!Branch) return; // إذا لم يكن نموذج الفرع موجوداً، تجاهل الفحص

    const branch = await Branch.findById(branchId).select('maxCapacity nameAr').lean();
    if (!branch || !branch.maxCapacity) return;

    const activeCount = await Beneficiary.countDocuments({
      branch: branchId,
      status: BENEFICIARY_STATUSES.ACTIVE,
    });

    if (activeCount >= branch.maxCapacity) {
      const err = new Error(
        `الفرع ${branch.nameAr || ''} وصل إلى السعة القصوى (${branch.maxCapacity} مستفيد). ` +
          'يرجى إضافة المستفيد إلى قائمة الانتظار.'
      );
      err.code = 'BRANCH_CAPACITY_EXCEEDED';
      err.statusCode = 422;
      err.data = { maxCapacity: branch.maxCapacity, current: activeCount };
      throw err;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. فحص التسجيل المكرر
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * يفحص إذا كان رقم الهوية مسجلاً مسبقاً
   *
   * @param {string} nationalId رقم الهوية
   * @param {string} branchId   معرّف الفرع
   * @param {string} [excludeId] معرّف مستفيد لاستثنائه (في التحديث)
   * @returns {Promise<{inBranch: boolean, elsewhere: object|null}>}
   */
  async checkDuplicateRegistration(nationalId, branchId, excludeId = null) {
    const baseFilter = { nationalId };
    if (excludeId) baseFilter._id = { $ne: excludeId };

    // فحص في نفس الفرع
    const inBranchQuery = {
      ...baseFilter,
      branch: branchId,
      status: { $nin: [BENEFICIARY_STATUSES.DISCHARGED, BENEFICIARY_STATUSES.TRANSFERRED] },
    };
    const existsInBranch = await Beneficiary.exists(inBranchQuery);

    if (existsInBranch) {
      const err = new Error('المستفيد مسجل مسبقاً في هذا الفرع برقم الهوية نفسه');
      err.code = 'DUPLICATE_REGISTRATION';
      err.statusCode = 422;
      throw err;
    }

    // فحص في فروع أخرى (تحذير فقط — لا نمنع)
    const existsElsewhere = await Beneficiary.findOne({
      ...baseFilter,
      branch: { $ne: branchId },
      status: BENEFICIARY_STATUSES.ACTIVE,
    })
      .populate('branch', 'nameAr code')
      .select('fileNumber branch')
      .lean();

    return { inBranch: false, elsewhere: existsElsewhere };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. تغيير حالة المستفيد
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * تغيير حالة مستفيد مع تسجيل الحدث
   *
   * @param {object} beneficiary كائن المستفيد (Mongoose document)
   * @param {string} newStatus   الحالة الجديدة
   * @param {string} [reason]    السبب
   * @param {string} [userId]    معرّف المستخدم المنفِّذ
   * @returns {Promise<object>} المستفيد بعد التحديث
   */
  async changeStatus(beneficiary, newStatus, reason, userId) {
    const oldStatus = beneficiary.status;
    const updateData = { status: newStatus };

    // تحديثات إضافية حسب الحالة الجديدة
    if (newStatus === BENEFICIARY_STATUSES.DISCHARGED) {
      updateData.dischargeDate = new Date();
      updateData.dischargeReason = reason;
    }

    if (newStatus === BENEFICIARY_STATUSES.ACTIVE && !beneficiary.enrollmentDate) {
      updateData.enrollmentDate = new Date();
    }

    Object.assign(beneficiary, updateData);
    if (userId) beneficiary.lastModifiedBy = userId;
    await beneficiary.save();

    // تسجيل في سجل النشاط إن توفّر
    await this._logActivity({
      action: 'status_change',
      model: 'Beneficiary',
      modelId: beneficiary._id,
      userId,
      details: {
        oldStatus,
        newStatus,
        reason,
      },
      description: `تغيير حالة المستفيد من "${oldStatus}" إلى "${newStatus}"`,
    });

    return beneficiary;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. إنشاء طلب النقل بين الفروع
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * بدء عملية نقل مستفيد بين الفروع
   *
   * @param {object} beneficiary  كائن المستفيد
   * @param {string} toBranchId   الفرع المستقبِل
   * @param {string|Date} transferDate تاريخ النقل
   * @param {string} reason       سبب النقل
   * @param {string} [requestedBy] المستخدم طالب النقل
   * @returns {Promise<object>} طلب النقل المُنشأ
   */
  async initiateTransfer(beneficiary, toBranchId, transferDate, reason, requestedBy) {
    // التحقق من سعة الفرع المستقبِل
    await this.checkBranchCapacity(toBranchId);

    // التحقق أن الفرع المستقبِل مختلف عن الحالي
    if (beneficiary.branch.toString() === toBranchId.toString()) {
      const err = new Error('لا يمكن نقل المستفيد لنفس الفرع الحالي');
      err.code = 'SAME_BRANCH_TRANSFER';
      err.statusCode = 422;
      throw err;
    }

    // إلغاء أي طلبات نقل معلّقة سابقة
    await BeneficiaryTransfer.updateMany(
      { beneficiary: beneficiary._id, status: 'pending' },
      { status: 'cancelled', notes: 'إلغاء تلقائي بسبب طلب نقل جديد' }
    );

    const transfer = await BeneficiaryTransfer.create({
      beneficiary: beneficiary._id,
      fromBranch: beneficiary.branch,
      toBranch: toBranchId,
      transferDate,
      reason,
      requestedBy,
      status: 'pending',
    });

    await this._logActivity({
      action: 'transfer_initiated',
      model: 'Beneficiary',
      modelId: beneficiary._id,
      userId: requestedBy,
      description: `طلب نقل المستفيد ${beneficiary.fileNumber || ''} إلى فرع آخر`,
    });

    return transfer;
  }

  /**
   * إتمام عملية النقل بعد الموافقة
   *
   * @param {object} transfer  كائن طلب النقل (Mongoose document)
   * @param {string} [approvedBy] المستخدم الموافق
   * @param {string} branchCode  رمز الفرع الجديد
   * @returns {Promise<object>} المستفيد بعد النقل
   */
  async completeTransfer(transfer, approvedBy, branchCode) {
    const beneficiary = await Beneficiary.findById(transfer.beneficiary);
    if (!beneficiary) throw new Error('المستفيد غير موجود');

    // توليد رقم ملف جديد في الفرع الجديد
    const newFileNumber = await this.generateFileNumber(transfer.toBranch, branchCode);

    // تحديث الفرع ورقم الملف
    beneficiary.branch = transfer.toBranch;
    beneficiary.fileNumber = newFileNumber;
    beneficiary.status = BENEFICIARY_STATUSES.ACTIVE;
    await beneficiary.save();

    // تحديث حالة النقل
    transfer.status = 'completed';
    transfer.approvedBy = approvedBy;
    transfer.completedAt = new Date();
    await transfer.save();

    await this._logActivity({
      action: 'transfer_completed',
      model: 'Beneficiary',
      modelId: beneficiary._id,
      userId: approvedBy,
      description: `تم نقل المستفيد بنجاح إلى الفرع الجديد. رقم الملف الجديد: ${newFileNumber}`,
    });

    return beneficiary;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. قائمة الانتظار الذكية
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * الحصول على قائمة الانتظار مرتبةً حسب الأولوية
   *
   * @param {string} branchId معرّف الفرع
   * @param {object} [options]
   * @param {number} [options.limit=50]
   * @returns {Promise<object[]>}
   */
  async getSmartWaitlist(branchId, options = {}) {
    return WaitlistEntry.getSmartWaitlist(branchId, options);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. السجل الزمني
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * بناء السجل الزمني الكامل للمستفيد
   *
   * @param {object} beneficiary كائن المستفيد مع populate
   * @returns {Promise<object[]>} قائمة الأحداث مرتبةً تنازلياً
   */
  async getTimeline(beneficiary) {
    const timeline = [];

    // 1. حدث التسجيل
    timeline.push({
      date: beneficiary.createdAt,
      type: 'registration',
      titleAr: 'تم تسجيل المستفيد',
      titleEn: 'Beneficiary Registered',
      description: `رقم الملف: ${beneficiary.fileNumber || 'غير محدد'}`,
      icon: 'user-plus',
      color: 'blue',
      meta: { fileNumber: beneficiary.fileNumber },
    });

    // 2. تغييرات الحالة
    if (beneficiary.enrollmentDate) {
      timeline.push({
        date: beneficiary.enrollmentDate,
        type: 'status_change',
        titleAr: 'تم تفعيل ملف المستفيد',
        titleEn: 'Beneficiary Activated',
        description: 'تغييرت الحالة إلى مسجل فعال',
        icon: 'check-circle',
        color: 'green',
      });
    }

    if (beneficiary.dischargeDate) {
      timeline.push({
        date: beneficiary.dischargeDate,
        type: 'discharge',
        titleAr: 'تم تخريج المستفيد',
        titleEn: 'Beneficiary Discharged',
        description: beneficiary.dischargeReason || 'تم الإخراج من البرنامج',
        icon: 'sign-out-alt',
        color: 'red',
      });
    }

    // 3. التقييمات
    const assessments =
      beneficiary.disabilityAssessments || (beneficiary.assessments ? beneficiary.assessments : []);
    for (const assessment of assessments) {
      timeline.push({
        date: assessment.assessmentDate || assessment.createdAt,
        type: 'assessment',
        titleAr: `تقييم ${assessment.assessmentType || ''}`,
        titleEn: `Assessment - ${assessment.assessmentType || ''}`,
        description: assessment.assessorName ? `بواسطة: ${assessment.assessorName}` : 'تقييم إعاقة',
        icon: 'chart-line',
        color: 'purple',
        meta: { assessmentId: assessment._id },
      });
    }

    // 4. النقل بين الفروع
    const transfers = await BeneficiaryTransfer.find({ beneficiary: beneficiary._id })
      .populate('fromBranch', 'nameAr code')
      .populate('toBranch', 'nameAr code')
      .lean();

    for (const transfer of transfers) {
      timeline.push({
        date: transfer.transferDate || transfer.createdAt,
        type: 'transfer',
        titleAr: `طلب نقل — ${transfer.status === 'completed' ? 'مكتمل' : 'معلّق'}`,
        titleEn: `Transfer Request`,
        description: `من ${transfer.fromBranch?.nameAr || '?'} إلى ${transfer.toBranch?.nameAr || '?'}`,
        icon: 'arrows-alt-h',
        color: 'orange',
        meta: { transferId: transfer._id, status: transfer.status },
      });
    }

    // 5. الجلسات (إن كانت متوفرة عبر populate)
    if (Array.isArray(beneficiary.sessions)) {
      for (const session of beneficiary.sessions.slice(0, 20)) {
        timeline.push({
          date: session.date || session.createdAt,
          type: 'session',
          titleAr: `جلسة ${session.programName || ''}`,
          titleEn: `Session`,
          description: `الحضور: ${session.attendanceStatus || ''}`,
          icon: 'clipboard-check',
          color: 'green',
          meta: { sessionId: session._id },
        });
      }
    }

    // 6. المستندات المُضافة
    if (Array.isArray(beneficiary.documents)) {
      for (const doc of beneficiary.documents.slice(0, 10)) {
        timeline.push({
          date: doc.createdAt || doc.uploadedAt,
          type: 'document',
          titleAr: `مستند مُضاف: ${doc.title || doc.documentType || ''}`,
          titleEn: `Document Added`,
          description: doc.documentType || '',
          icon: 'file-alt',
          color: 'gray',
          meta: { documentId: doc._id },
        });
      }
    }

    // ترتيب تنازلي حسب التاريخ
    return timeline.filter(e => e.date).sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 8. الإحصائيات
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * إحصائيات سريعة (للوحة التحكم)
   *
   * @param {string|null} [branchId] إذا null فيجمع كل الفروع
   * @returns {Promise<object>}
   */
  async getQuickStats(branchId = null) {
    const filter = branchId ? { branch: branchId } : {};
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [
      total,
      active,
      waiting,
      suspended,
      dischargedThisMonth,
      newThisMonth,
      byDisabilityType,
      bySeverity,
      insuranceExpiringSoon,
    ] = await Promise.all([
      Beneficiary.countDocuments(filter),
      Beneficiary.countDocuments({ ...filter, status: BENEFICIARY_STATUSES.ACTIVE }),
      Beneficiary.countDocuments({ ...filter, status: BENEFICIARY_STATUSES.WAITING }),
      Beneficiary.countDocuments({ ...filter, status: BENEFICIARY_STATUSES.SUSPENDED }),
      Beneficiary.countDocuments({
        ...filter,
        status: BENEFICIARY_STATUSES.DISCHARGED,
        dischargeDate: { $gte: startOfMonth },
      }),
      Beneficiary.countDocuments({ ...filter, createdAt: { $gte: startOfMonth } }),
      Beneficiary.aggregate([
        { $match: { ...filter, status: BENEFICIARY_STATUSES.ACTIVE } },
        { $group: { _id: '$disabilityType', count: { $sum: 1 } } },
      ]),
      Beneficiary.aggregate([
        { $match: { ...filter, status: BENEFICIARY_STATUSES.ACTIVE } },
        { $group: { _id: '$disabilitySeverity', count: { $sum: 1 } } },
      ]),
      Beneficiary.countDocuments({
        ...filter,
        status: BENEFICIARY_STATUSES.ACTIVE,
        insuranceExpiry: { $gte: now, $lte: thirtyDaysLater },
      }),
    ]);

    // تحويل نتائج aggregate إلى objects
    const disabilityTypeMap = {};
    byDisabilityType.forEach(({ _id, count }) => {
      if (_id) disabilityTypeMap[_id] = count;
    });

    const severityMap = {};
    bySeverity.forEach(({ _id, count }) => {
      if (_id) severityMap[_id] = count;
    });

    return {
      total,
      active,
      waiting,
      suspended,
      dischargedThisMonth,
      newThisMonth,
      byDisabilityType: disabilityTypeMap,
      bySeverity: severityMap,
      insuranceExpiringSoon,
    };
  }

  /**
   * إحصائيات مستفيد واحد
   *
   * @param {object} beneficiary كائن المستفيد
   * @returns {Promise<object>}
   */
  async getBeneficiaryStats(beneficiary) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // حساب أيام التسجيل
    const daysEnrolled = beneficiary.enrollmentDate
      ? Math.floor((now - new Date(beneficiary.enrollmentDate)) / (1000 * 60 * 60 * 24))
      : 0;

    // العمر التطوري (تقريبي)
    const developmentalAge = this._calculateDevelopmentalAge(beneficiary);

    return {
      daysEnrolled,
      developmentalAge,
      fileNumber: beneficiary.fileNumber,
      currentStatus: beneficiary.status,
      lastModified: beneficiary.updatedAt,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 9. دوال مساعدة خاصة
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * حساب العمر التطوري بناءً على مستوى الأداء الوظيفي
   * @private
   */
  _calculateDevelopmentalAge(beneficiary) {
    const levelMap = {
      independent: 1.0,
      minimal_support: 0.8,
      moderate_support: 0.6,
      extensive_support: 0.4,
      total_support: 0.2,
    };

    // محاولة جلب التقييم الأخير
    const latestAssessment =
      beneficiary.disabilityAssessments?.[0] || beneficiary.latestAssessment || null;

    if (!beneficiary.dateOfBirth || !latestAssessment) return null;

    const dob = new Date(beneficiary.dateOfBirth);
    const chronologicalMonths = Math.floor(
      (Date.now() - dob.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
    );

    const levels = [
      latestAssessment.communicationLevel,
      latestAssessment.mobilityLevel,
      latestAssessment.selfCareLevel,
      latestAssessment.cognitiveLevel,
      latestAssessment.socialLevel,
      latestAssessment.functionalLevel,
    ].filter(Boolean);

    if (!levels.length) return null;

    const avgRatio = levels.reduce((sum, l) => sum + (levelMap[l] || 0.5), 0) / levels.length;
    const developmentalMonths = Math.round(chronologicalMonths * avgRatio);
    const years = Math.floor(developmentalMonths / 12);
    const months = developmentalMonths % 12;

    return {
      chronologicalMonths,
      developmentalMonths,
      ratio: Math.round(avgRatio * 100),
      labelAr: `${years} سنة و ${months} شهر`,
    };
  }

  /**
   * تسجيل نشاط في سجل الأحداث
   * @private
   */
  async _logActivity(data) {
    if (!ActivityLog) return;
    try {
      await ActivityLog.create({
        action: data.action,
        model: data.model,
        modelId: data.modelId,
        performedBy: data.userId,
        description: data.description,
        details: data.details,
        timestamp: new Date(),
      });
    } catch {
      // لا نوقف التنفيذ إذا فشل التسجيل
    }
  }
}

// ─── تصدير instance واحد (Singleton) ──────────────────────────────────────────
const beneficiaryService = new BeneficiaryService();
module.exports = beneficiaryService;
module.exports.BeneficiaryService = BeneficiaryService;
