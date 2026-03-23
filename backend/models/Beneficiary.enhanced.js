/* eslint-disable no-unused-vars */
/**
 * نموذج المستفيد المحسن - Enhanced Beneficiary Model
 * نظام الألوائل للتأهيل وإعادة التأهيل
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * المخطط الرئيسي للمستفيد
 */
const beneficiarySchema = new Schema(
  {
    // رقم المستفيد الفريد
    beneficiaryNumber: {
      type: String,
      unique: true,
      required: true,
      uppercase: true,
      trim: true,
    },

    // === البيانات الشخصية ===
    personalInfo: {
      firstNameAr: {
        type: String,
        required: [true, 'الاسم الأول مطلوب'],
        trim: true,
        maxlength: [100, 'الاسم الأول لا يمكن أن يتجاوز 100 حرف'],
      },
      firstNameEn: {
        type: String,
        trim: true,
        maxlength: [100, 'First name cannot exceed 100 characters'],
      },
      lastNameAr: {
        type: String,
        required: [true, 'اسم العائلة مطلوب'],
        trim: true,
        maxlength: [100, 'اسم العائلة لا يمكن أن يتجاوز 100 حرف'],
      },
      lastNameEn: {
        type: String,
        trim: true,
        maxlength: [100, 'Last name cannot exceed 100 characters'],
      },
      nationalId: {
        type: String,
        unique: true,
        sparse: true,
        validate: {
          validator: function (v) {
            return !v || /^\d{10}$/.test(v);
          },
          message: 'رقم الهوية يجب أن يتكون من 10 أرقام',
        },
      },
      dateOfBirth: {
        type: Date,
        required: [true, 'تاريخ الميلاد مطلوب'],
      },
      placeOfBirth: {
        type: String,
        trim: true,
      },
      gender: {
        type: String,
        enum: ['male', 'female'],
        required: true,
      },
      nationality: {
        type: String,
        default: 'سعودي',
      },
      maritalStatus: {
        type: String,
        enum: ['single', 'married', 'divorced', 'widowed'],
        default: 'single',
      },
      photo: {
        type: String,
        default: null,
      },
    },

    // === معلومات الإعاقة ===
    disabilityInfo: {
      type: {
        type: Schema.Types.ObjectId,
        ref: 'DisabilityType',
        required: [true, 'نوع الإعاقة مطلوب'],
      },
      degree: {
        type: String,
        enum: ['mild', 'moderate', 'severe', 'profound'],
        required: true,
        default: 'moderate',
      },
      percentage: {
        type: Number,
        min: 0,
        max: 100,
      },
      diagnosisDate: {
        type: Date,
      },
      diagnosisSource: {
        type: String,
        enum: ['medical_center', 'hospital', 'specialist', 'other'],
      },
      medicalReportNumber: {
        type: String,
        trim: true,
      },
      medicalReportDate: {
        type: Date,
      },
      medicalReportFile: {
        type: String,
      },
      secondaryDisabilities: [
        {
          type: {
            type: Schema.Types.ObjectId,
            ref: 'DisabilityType',
          },
          degree: {
            type: String,
            enum: ['mild', 'moderate', 'severe', 'profound'],
          },
        },
      ],
      medicalConditions: [
        {
          name: String,
          diagnosed: Boolean,
          medications: [String],
          notes: String,
        },
      ],
      allergies: [
        {
          name: String,
          severity: {
            type: String,
            enum: ['mild', 'moderate', 'severe'],
          },
          reaction: String,
        },
      ],
    },

    // === معلومات التواصل ===
    contactInfo: {
      phone: {
        type: String,
        validate: {
          validator: function (v) {
            return !v || /^05\d{8}$/.test(v);
          },
          message: 'رقم الجوال يجب أن يبدأ بـ 05 ويتكون من 10 أرقام',
        },
      },
      alternativePhone: {
        type: String,
      },
      email: {
        type: String,
        lowercase: true,
        trim: true,
        validate: {
          validator: function (v) {
            return !v || /^\S+@\S+\.\S+$/.test(v);
          },
          message: 'البريد الإلكتروني غير صالح',
        },
      },
      address: {
        street: String,
        city: {
          type: String,
          required: false,
        },
        region: {
          type: String,
          required: false,
        },
        postalCode: String,
        country: {
          type: String,
          default: 'السعودية',
        },
        coordinates: {
          lat: Number,
          lng: Number,
        },
      },
    },

    // === معلومات الولي/الوصي ===
    guardianInfo: {
      fullName: {
        type: String,
        required: [true, 'اسم ولي الأمر مطلوب'],
        trim: true,
      },
      nationalId: {
        type: String,
        validate: {
          validator: function (v) {
            return !v || /^\d{10}$/.test(v);
          },
          message: 'رقم الهوية يجب أن يتكون من 10 أرقام',
        },
      },
      relation: {
        type: String,
        enum: [
          'father',
          'mother',
          'brother',
          'sister',
          'uncle',
          'aunt',
          'grandfather',
          'grandmother',
          'guardian',
          'other',
        ],
        required: true,
      },
      phone: {
        type: String,
        required: [true, 'رقم جوال ولي الأمر مطلوب'],
        validate: {
          validator: function (v) {
            return /^05\d{8}$/.test(v);
          },
          message: 'رقم الجوال يجب أن يبدأ بـ 05 ويتكون من 10 أرقام',
        },
      },
      alternativePhone: String,
      email: {
        type: String,
        lowercase: true,
        trim: true,
      },
      occupation: String,
      workPhone: String,
      educationLevel: {
        type: String,
        enum: [
          'none',
          'primary',
          'intermediate',
          'secondary',
          'diploma',
          'bachelor',
          'master',
          'phd',
        ],
      },
      isPrimaryContact: {
        type: Boolean,
        default: true,
      },
    },

    // === معلومات التسجيل ===
    registrationInfo: {
      registrationDate: {
        type: Date,
        default: Date.now,
      },
      registrationSource: {
        type: String,
        enum: ['self', 'referral', 'hospital', 'social_affairs', 'other'],
        default: 'self',
      },
      referralSource: {
        name: String,
        contact: String,
        notes: String,
      },
      branch: {
        type: Schema.Types.ObjectId,
        ref: 'Branch',
        required: [true, 'الفرع مطلوب'],
      },
      registrationFee: {
        amount: {
          type: Number,
          default: 0,
        },
        paid: {
          type: Boolean,
          default: false,
        },
        paidDate: Date,
        paymentMethod: {
          type: String,
          enum: ['cash', 'card', 'transfer', 'check'],
        },
        receiptNumber: String,
      },
    },

    // === حالة القبول والتسجيل ===
    enrollmentStatus: {
      type: String,
      enum: [
        'pending_assessment',
        'assessment_scheduled',
        'assessment_completed',
        'enrolled',
        'on_leave',
        'graduated',
        'transferred',
        'withdrawn',
        'suspended',
      ],
      default: 'pending_assessment',
    },

    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active',
    },

    statusHistory: [
      {
        fromStatus: String,
        toStatus: String,
        reason: String,
        changedBy: {
          type: Schema.Types.ObjectId,
          ref: 'User',
        },
        changedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // === الخطة التأهيلية الحالية ===
    currentPlan: {
      type: Schema.Types.ObjectId,
      ref: 'RehabilitationPlan',
    },

    primaryTherapist: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },

    // === الخدمات المقدمة ===
    services: [
      {
        service: {
          type: Schema.Types.ObjectId,
          ref: 'Service',
        },
        frequency: {
          sessionsPerWeek: Number,
          sessionDuration: Number, // بالدقائق
        },
        startDate: Date,
        endDate: Date,
        status: {
          type: String,
          enum: ['active', 'paused', 'completed', 'cancelled'],
        },
        notes: String,
      },
    ],

    // === جدول الحصص ===
    schedule: [
      {
        day: {
          type: String,
          enum: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
        },
        sessions: [
          {
            service: {
              type: Schema.Types.ObjectId,
              ref: 'Service',
            },
            therapist: {
              type: Schema.Types.ObjectId,
              ref: 'User',
            },
            room: {
              type: Schema.Types.ObjectId,
              ref: 'TherapyRoom',
            },
            startTime: String,
            endTime: String,
            notes: String,
          },
        ],
      },
    ],

    // === ملاحظات التقييم ===
    assessmentNotes: [
      {
        assessmentType: {
          type: String,
          enum: ['initial', 'periodic', 'final', 'special'],
        },
        assessmentDate: {
          type: Date,
          default: Date.now,
        },
        assessor: {
          type: Schema.Types.ObjectId,
          ref: 'User',
        },
        findings: String,
        recommendations: String,
        attachments: [String],
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // === الأهداف التأهيلية ===
    goals: [
      {
        title: {
          type: String,
          required: true,
        },
        description: String,
        category: {
          type: String,
          enum: [
            'physical',
            'cognitive',
            'communication',
            'social',
            'behavioral',
            'academic',
            'vocational',
            'daily_living',
            'other',
          ],
        },
        targetDate: Date,
        priority: {
          type: String,
          enum: ['low', 'medium', 'high', 'urgent'],
          default: 'medium',
        },
        status: {
          type: String,
          enum: ['not_started', 'in_progress', 'achieved', 'partially_achieved', 'discontinued'],
          default: 'not_started',
        },
        progress: {
          type: Number,
          min: 0,
          max: 100,
          default: 0,
        },
        milestones: [
          {
            title: String,
            targetDate: Date,
            achieved: Boolean,
            achievedDate: Date,
            notes: String,
          },
        ],
        createdBy: {
          type: Schema.Types.ObjectId,
          ref: 'User',
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // === السجلات الطبية ===
    medicalRecords: [
      {
        recordType: {
          type: String,
          enum: ['report', 'prescription', 'lab_result', 'imaging', 'referral', 'other'],
        },
        title: String,
        date: Date,
        provider: String,
        summary: String,
        fileUrl: String,
        uploadedBy: {
          type: Schema.Types.ObjectId,
          ref: 'User',
        },
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // === الحضور ===
    attendanceSummary: {
      totalSessions: {
        type: Number,
        default: 0,
      },
      attended: {
        type: Number,
        default: 0,
      },
      absent: {
        type: Number,
        default: 0,
      },
      late: {
        type: Number,
        default: 0,
      },
      cancelled: {
        type: Number,
        default: 0,
      },
      attendanceRate: {
        type: Number,
        default: 0,
      },
    },

    // === النقل ===
    transportation: {
      required: {
        type: Boolean,
        default: false,
      },
      pickupLocation: {
        address: String,
        coordinates: {
          lat: Number,
          lng: Number,
        },
      },
      dropoffLocation: {
        address: String,
        coordinates: {
          lat: Number,
          lng: Number,
        },
      },
      assignedVehicle: {
        type: Schema.Types.ObjectId,
        ref: 'Vehicle',
      },
      notes: String,
    },

    // === الوثائق والمرفقات ===
    documents: [
      {
        name: {
          type: String,
          required: true,
        },
        type: {
          type: String,
          enum: ['id', 'medical_report', 'assessment', 'plan', 'consent', 'certificate', 'other'],
        },
        fileUrl: {
          type: String,
          required: true,
        },
        uploadedBy: {
          type: Schema.Types.ObjectId,
          ref: 'User',
        },
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
        expiryDate: Date,
        verified: {
          type: Boolean,
          default: false,
        },
        verifiedBy: {
          type: Schema.Types.ObjectId,
          ref: 'User',
        },
        verifiedAt: Date,
      },
    ],

    // === الملاحظات العامة ===
    notes: [
      {
        content: {
          type: String,
          required: true,
        },
        category: {
          type: String,
          enum: ['general', 'medical', 'behavioral', 'progress', 'incident', 'family', 'other'],
          default: 'general',
        },
        isPrivate: {
          type: Boolean,
          default: false,
        },
        createdBy: {
          type: Schema.Types.ObjectId,
          ref: 'User',
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // === التواريخ ===
    createdAt: {
      type: Date,
      default: Date.now,
    },

    updatedAt: {
      type: Date,
      default: Date.now,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },

    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ========== الـ Virtuals ==========

// الاسم الكامل بالعربية
beneficiarySchema.virtual('fullNameAr').get(function () {
  return `${this.personalInfo.firstNameAr} ${this.personalInfo.lastNameAr}`;
});

// الاسم الكامل بالإنجليزية
beneficiarySchema.virtual('fullNameEn').get(function () {
  if (this.personalInfo.firstNameEn && this.personalInfo.lastNameEn) {
    return `${this.personalInfo.firstNameEn} ${this.personalInfo.lastNameEn}`;
  }
  return null;
});

// العمر
beneficiarySchema.virtual('age').get(function () {
  if (!this.personalInfo.dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(this.personalInfo.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
});

// العمر بالأيام والشهر والسنة
beneficiarySchema.virtual('ageDetailed').get(function () {
  if (!this.personalInfo.dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(this.personalInfo.dateOfBirth);

  let years = today.getFullYear() - birthDate.getFullYear();
  let months = today.getMonth() - birthDate.getMonth();
  let days = today.getDate() - birthDate.getDate();

  if (days < 0) {
    months--;
    const lastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
    days += lastMonth.getDate();
  }

  if (months < 0) {
    years--;
    months += 12;
  }

  return { years, months, days };
});

// ========== الـ Methods ==========

// حساب معدل الحضور
beneficiarySchema.methods.calculateAttendanceRate = function () {
  if (this.attendanceSummary.totalSessions === 0) return 0;
  this.attendanceSummary.attendanceRate = (
    (this.attendanceSummary.attended / this.attendanceSummary.totalSessions) *
    100
  ).toFixed(2);
  return this.attendanceSummary.attendanceRate;
};

// تحديث حالة المستفيد
beneficiarySchema.methods.updateStatus = function (newStatus, reason, changedBy) {
  this.statusHistory.push({
    fromStatus: this.enrollmentStatus,
    toStatus: newStatus,
    reason: reason,
    changedBy: changedBy,
    changedAt: new Date(),
  });
  this.enrollmentStatus = newStatus;
  return this.save();
};

// إضافة هدف جديد
beneficiarySchema.methods.addGoal = function (goalData) {
  this.goals.push(goalData);
  return this.save();
};

// تحديث تقدم الهدف
beneficiarySchema.methods.updateGoalProgress = function (goalId, progress, status) {
  const goal = this.goals.id(goalId);
  if (goal) {
    goal.progress = progress;
    if (status) goal.status = status;
    return this.save();
  }
  return Promise.reject(new Error('الهدف غير موجود'));
};

// إضافة ملاحظة
beneficiarySchema.methods.addNote = function (content, category, createdBy, isPrivate = false) {
  this.notes.push({
    content,
    category,
    isPrivate,
    createdBy,
    createdAt: new Date(),
  });
  return this.save();
};

// ========== الـ Statics ==========

// البحث بالاسم أو رقم الهوية
beneficiarySchema.statics.search = function (query) {
  const searchRegex = new RegExp(query, 'i');
  return this.find({
    $or: [
      { beneficiaryNumber: searchRegex },
      { 'personalInfo.firstNameAr': searchRegex },
      { 'personalInfo.lastNameAr': searchRegex },
      { 'personalInfo.nationalId': query },
      { 'guardianInfo.nationalId': query },
    ],
  });
};

// المستفيدين النشطين حسب الفرع
beneficiarySchema.statics.getActiveByBranch = function (branchId) {
  return this.find({
    'registrationInfo.branch': branchId,
    status: 'active',
    enrollmentStatus: { $in: ['enrolled', 'assessment_scheduled'] },
  });
};

// ========== الـ Middleware ==========

// توليد رقم المستفيد تلقائياً قبل الحفظ
beneficiarySchema.pre('save', async function (next) {
  if (this.isNew && !this.beneficiaryNumber) {
    const year = new Date().getFullYear();
    const count = await this.constructor.countDocuments({
      beneficiaryNumber: new RegExp(`BEN${year}`),
    });
    this.beneficiaryNumber = `BEN${year}${String(count + 1).padStart(6, '0')}`;
  }

  this.updatedAt = new Date();
  next();
});

// ========== الفهارس ==========

beneficiarySchema.index({ 'personalInfo.nationalId': 1 });
beneficiarySchema.index({ 'personalInfo.firstNameAr': 1, 'personalInfo.lastNameAr': 1 });
beneficiarySchema.index({ 'registrationInfo.branch': 1 });
beneficiarySchema.index({ enrollmentStatus: 1 });
beneficiarySchema.index({ status: 1 });
beneficiarySchema.index({ 'guardianInfo.phone': 1 });
beneficiarySchema.index({ createdAt: -1 });
beneficiarySchema.index({ 'disabilityInfo.type': 1 });

// فهرس نصي للبحث
beneficiarySchema.index(
  {
    'personalInfo.firstNameAr': 'text',
    'personalInfo.lastNameAr': 'text',
    'personalInfo.firstNameEn': 'text',
    'personalInfo.lastNameEn': 'text',
    beneficiaryNumber: 'text',
    'personalInfo.nationalId': 'text',
  },
  {
    weights: {
      beneficiaryNumber: 10,
      'personalInfo.nationalId': 10,
      'personalInfo.firstNameAr': 5,
      'personalInfo.lastNameAr': 5,
      'personalInfo.firstNameEn': 3,
      'personalInfo.lastNameEn': 3,
    },
    name: 'beneficiary_text_index',
  }
);

const Beneficiary = mongoose.models.Beneficiary || mongoose.model('Beneficiary', beneficiarySchema);

module.exports = Beneficiary;
