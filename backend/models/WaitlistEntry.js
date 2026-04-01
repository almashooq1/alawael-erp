/**
 * WaitlistEntry.js — نموذج قائمة الانتظار
 * Waitlist Entry Model for Disability Rehabilitation Centers
 *
 * يُدير طلبات الالتحاق بالمركز من خلال سير عمل مُحكم:
 * pending → contacted → assessment_scheduled → approved → enrolled
 *
 * @module models/WaitlistEntry
 */

'use strict';

const mongoose = require('mongoose');
const {
  DISABILITY_TYPES,
  DISABILITY_SEVERITIES,
  WAITLIST_STATUSES,
  PRIORITY_LEVELS,
  PRIORITY_LEVEL_SCORES,
  DISABILITY_SEVERITY_LABELS,
} = require('../constants/beneficiary.constants');

// ─── مخطط جدول الانتظار ────────────────────────────────────────────────────────
const waitlistEntrySchema = new mongoose.Schema(
  {
    // الفرع المعني
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: [true, 'الفرع مطلوب'],
      index: true,
    },

    // ربط بمستفيد موجود (اختياري — قد لا يكون مسجلاً بعد)
    beneficiary: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      default: null,
    },

    // ─── بيانات المتقدم ──────────────────────────────────────────────────────
    applicantName: {
      type: String,
      required: [true, 'اسم المتقدم مطلوب'],
      trim: true,
      maxlength: [200, 'اسم المتقدم يجب ألا يتجاوز 200 حرف'],
    },

    applicantPhone: {
      type: String,
      required: [true, 'رقم جوال المتقدم مطلوب'],
      trim: true,
      validate: {
        validator: v => /^(05|\+9665)\d{8}$/.test(v),
        message: 'رقم الجوال غير صحيح',
      },
    },

    applicantEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
      validate: {
        validator: v => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
        message: 'البريد الإلكتروني غير صحيح',
      },
    },

    applicantNationalId: {
      type: String,
      trim: true,
      default: null,
      validate: {
        validator: v => !v || /^[12]\d{9}$/.test(v),
        message: 'رقم الهوية يجب أن يبدأ بـ 1 (سعودي) أو 2 (مقيم) ويتكون من 10 أرقام',
      },
    },

    // ─── بيانات الإعاقة ──────────────────────────────────────────────────────
    disabilityType: {
      type: String,
      required: [true, 'نوع الإعاقة مطلوب'],
      enum: {
        values: Object.values(DISABILITY_TYPES),
        message: 'نوع الإعاقة غير صحيح',
      },
      index: true,
    },

    disabilitySeverity: {
      type: String,
      required: [true, 'شدة الإعاقة مطلوبة'],
      enum: {
        values: Object.values(DISABILITY_SEVERITIES),
        message: 'شدة الإعاقة غير صحيحة',
      },
    },

    // الجنس
    gender: {
      type: String,
      enum: ['male', 'female'],
      default: null,
    },

    // عمر المتقدم (بالسنوات)
    age: {
      type: Number,
      min: [0, 'العمر يجب أن يكون موجباً'],
      max: [120, 'العمر غير صحيح'],
      default: null,
    },

    // ─── الخدمات المطلوبة ────────────────────────────────────────────────────
    // مثال: ["physical_therapy","occupational_therapy","speech_therapy"]
    requestedServices: {
      type: [String],
      default: [],
    },

    // الجدول المفضل
    preferredSchedule: {
      days: {
        type: [String],
        enum: ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'],
        default: [],
      },
      period: {
        type: String,
        enum: ['morning', 'afternoon', 'evening'],
        default: 'morning',
      },
    },

    // ─── الأولوية ────────────────────────────────────────────────────────────
    priorityLevel: {
      type: String,
      enum: {
        values: Object.values(PRIORITY_LEVELS),
        message: 'مستوى الأولوية غير صحيح',
      },
      default: PRIORITY_LEVELS.NORMAL,
      index: true,
    },

    priorityReason: {
      type: String,
      trim: true,
      maxlength: [300, 'سبب الأولوية يجب ألا يتجاوز 300 حرف'],
      default: null,
    },

    // المسافة بالكيلومترات (تُستخدم في حساب نقاط الأولوية)
    distanceKm: {
      type: Number,
      min: 0,
      default: null,
    },

    // ─── مصدر الإحالة ────────────────────────────────────────────────────────
    referralSource: {
      type: String,
      trim: true,
      maxlength: [200, 'مصدر الإحالة يجب ألا يتجاوز 200 حرف'],
      default: null,
    },

    // ─── حالة الطلب وسير العمل ───────────────────────────────────────────────
    status: {
      type: String,
      enum: {
        values: Object.values(WAITLIST_STATUSES),
        message: 'حالة الطلب غير صحيحة',
      },
      default: WAITLIST_STATUSES.PENDING,
      index: true,
    },

    rejectionReason: {
      type: String,
      trim: true,
      maxlength: [500, 'سبب الرفض يجب ألا يتجاوز 500 حرف'],
      default: null,
    },

    // تسلسل تواريخ سير العمل
    contactedAt: { type: Date, default: null },
    assessmentScheduledAt: { type: Date, default: null },
    assessmentDate: { type: Date, default: null },
    approvedAt: { type: Date, default: null },
    enrolledAt: { type: Date, default: null },

    // ─── التتبع ──────────────────────────────────────────────────────────────
    notes: {
      type: String,
      trim: true,
      maxlength: [2000, 'الملاحظات يجب ألا تتجاوز 2000 حرف'],
      default: null,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    // موظف الاستقبال المسؤول
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    // سجل التاريخ الزمني للطلب
    statusHistory: [
      {
        status: String,
        changedAt: { type: Date, default: Date.now },
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        note: String,
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── فهارس مركّبة ──────────────────────────────────────────────────────────────
waitlistEntrySchema.index({ branch: 1, status: 1 });
waitlistEntrySchema.index({ branch: 1, priorityLevel: 1, createdAt: 1 });
waitlistEntrySchema.index({ applicantPhone: 1 });
waitlistEntrySchema.index({ applicantNationalId: 1 });

// ─── حقول افتراضية محسوبة ─────────────────────────────────────────────────────
/**
 * عدد أيام الانتظار منذ تسجيل الطلب
 */
waitlistEntrySchema.virtual('waitingDays').get(function () {
  if (!this.createdAt) return 0;
  const diffMs = Date.now() - this.createdAt.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
});

/**
 * نقاط الأولوية المحسوبة
 * الأوزان: شدة الإعاقة (40%) + مستوى الأولوية (30%) + أيام الانتظار (20%) + المسافة (10%)
 *
 * الحساب:
 *   - severe/profound: 30-40 نقطة
 *   - urgent/high priority: 20-30 نقطة
 *   - أيام الانتظار: حد أقصى 30 نقطة
 *   - مسافة أقل = نقاط أعلى: حد أقصى 10 نقاط
 */
waitlistEntrySchema.virtual('priorityScore').get(function () {
  let score = 0;

  // شدة الإعاقة
  const severityScore = DISABILITY_SEVERITY_LABELS[this.disabilitySeverity]?.score || 0;
  score += severityScore;

  // مستوى الأولوية
  const priorityScore = PRIORITY_LEVEL_SCORES[this.priorityLevel] || 0;
  score += priorityScore;

  // أيام الانتظار (حد أقصى 30)
  score += Math.min(this.waitingDays, 30);

  // المسافة (أقل مسافة = نقاط أكثر، حد أقصى 10)
  if (this.distanceKm !== null && this.distanceKm > 0) {
    score += Math.max(0, 10 - Math.floor(this.distanceKm / 10));
  }

  return score;
});

// ─── Middleware: تسجيل تاريخ تغيير الحالة ─────────────────────────────────────
waitlistEntrySchema.pre('save', function (next) {
  if (this.isModified('status') && !this.isNew) {
    this.statusHistory.push({
      status: this.status,
      changedAt: new Date(),
    });
  }
  next();
});

// ─── Methods ───────────────────────────────────────────────────────────────────

/**
 * تسجيل أن الموظف تواصل مع المتقدم
 * @param {string} [note] ملاحظة
 */
waitlistEntrySchema.methods.markContacted = function (note) {
  this.status = WAITLIST_STATUSES.CONTACTED;
  this.contactedAt = new Date();
  if (note) this.notes = note;
  return this.save();
};

/**
 * جدولة تقييم
 * @param {Date} assessmentDate تاريخ التقييم
 * @param {string} [note] ملاحظة
 */
waitlistEntrySchema.methods.scheduleAssessment = function (assessmentDate, note) {
  this.status = WAITLIST_STATUSES.ASSESSMENT_SCHEDULED;
  this.assessmentScheduledAt = new Date();
  this.assessmentDate = assessmentDate;
  if (note) this.notes = note;
  return this.save();
};

/**
 * الموافقة على الطلب
 * @param {string} [note] ملاحظة
 */
waitlistEntrySchema.methods.approve = function (note) {
  this.status = WAITLIST_STATUSES.APPROVED;
  this.approvedAt = new Date();
  if (note) this.notes = note;
  return this.save();
};

/**
 * تسجيل المتقدم كمستفيد فعلي
 * @param {mongoose.Types.ObjectId} beneficiaryId
 */
waitlistEntrySchema.methods.enroll = function (beneficiaryId) {
  this.status = WAITLIST_STATUSES.ENROLLED;
  this.enrolledAt = new Date();
  this.beneficiary = beneficiaryId;
  return this.save();
};

/**
 * رفض الطلب
 * @param {string} reason سبب الرفض
 */
waitlistEntrySchema.methods.reject = function (reason) {
  this.status = WAITLIST_STATUSES.REJECTED;
  this.rejectionReason = reason;
  return this.save();
};

/**
 * إلغاء الطلب من قِبل المتقدم
 * @param {string} [reason] سبب الإلغاء
 */
waitlistEntrySchema.methods.cancel = function (reason) {
  this.status = WAITLIST_STATUSES.CANCELLED;
  this.rejectionReason = reason || 'إلغاء من قِبل المتقدم';
  return this.save();
};

// ─── Statics ───────────────────────────────────────────────────────────────────

/**
 * الحصول على قائمة الانتظار الذكية مرتبةً حسب نقاط الأولوية
 * @param {string|ObjectId} branchId
 * @param {object} [options]
 * @param {number} [options.limit=50]
 * @param {string[]} [options.statuses] حالات التصفية (افتراضي: الحالات النشطة)
 * @returns {Promise<WaitlistEntry[]>}
 */
waitlistEntrySchema.statics.getSmartWaitlist = async function (branchId, options = {}) {
  const {
    limit = 50,
    statuses = [
      WAITLIST_STATUSES.PENDING,
      WAITLIST_STATUSES.CONTACTED,
      WAITLIST_STATUSES.ASSESSMENT_SCHEDULED,
      WAITLIST_STATUSES.APPROVED,
    ],
  } = options;

  const entries = await this.find({
    branch: branchId,
    status: { $in: statuses },
  })
    .populate('beneficiary', 'fileNumber fullName')
    .sort({ createdAt: 1 }) // أقدم طلب أولاً
    .limit(limit * 3); // جلب أكثر ثم ترتيب بالكود

  // ترتيب حسب نقاط الأولوية (تنازلياً)
  return entries.sort((a, b) => b.priorityScore - a.priorityScore).slice(0, limit);
};

/**
 * إحصائيات قائمة الانتظار لفرع معين
 * @param {string|ObjectId} branchId
 * @returns {Promise<object>}
 */
waitlistEntrySchema.statics.getStats = async function (branchId) {
  const filter = branchId ? { branch: branchId } : {};

  const [statusCounts, priorityCounts, disabilityTypeCounts, avgWaitTime] = await Promise.all([
    this.aggregate([{ $match: filter }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    this.aggregate([
      { $match: { ...filter, status: WAITLIST_STATUSES.PENDING } },
      { $group: { _id: '$priorityLevel', count: { $sum: 1 } } },
    ]),
    this.aggregate([
      {
        $match: {
          ...filter,
          status: { $in: [WAITLIST_STATUSES.PENDING, WAITLIST_STATUSES.CONTACTED] },
        },
      },
      { $group: { _id: '$disabilityType', count: { $sum: 1 } } },
    ]),
    this.aggregate([
      {
        $match: {
          ...filter,
          status: WAITLIST_STATUSES.ENROLLED,
          enrolledAt: { $exists: true },
        },
      },
      {
        $project: {
          waitDays: {
            $divide: [{ $subtract: ['$enrolledAt', '$createdAt'] }, 1000 * 60 * 60 * 24],
          },
        },
      },
      { $group: { _id: null, avg: { $avg: '$waitDays' } } },
    ]),
  ]);

  const byStatus = {};
  statusCounts.forEach(({ _id, count }) => {
    if (_id) byStatus[_id] = count;
  });

  const byPriority = {};
  priorityCounts.forEach(({ _id, count }) => {
    if (_id) byPriority[_id] = count;
  });

  const byDisabilityType = {};
  disabilityTypeCounts.forEach(({ _id, count }) => {
    if (_id) byDisabilityType[_id] = count;
  });

  return {
    byStatus,
    byPriority,
    byDisabilityType,
    avgWaitDaysToEnroll: avgWaitTime[0]?.avg ? Math.round(avgWaitTime[0].avg) : null,
    total: Object.values(byStatus).reduce((sum, c) => sum + c, 0),
    pending: byStatus[WAITLIST_STATUSES.PENDING] || 0,
    urgent: byPriority[PRIORITY_LEVELS.URGENT] || 0,
  };
};

// ─── Model ─────────────────────────────────────────────────────────────────────
const WaitlistEntry =
  mongoose.models.WaitlistEntry || mongoose.model('WaitlistEntry', waitlistEntrySchema);

module.exports = WaitlistEntry;
