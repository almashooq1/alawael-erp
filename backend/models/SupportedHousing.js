/**
 * @module models/SupportedHousing
 * @description نموذج برامج الإسكان المدعوم/التأهيلي
 * يدير برامج الإسكان المستقل والمشترك والانتقالي
 */

const mongoose = require('mongoose');

// ─── مخطط تقييم جاهزية السكن ───
const housingReadinessSchema = new mongoose.Schema(
  {
    assessedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    assessmentDate: {
      type: Date,
      default: Date.now,
    },
    // معايير الجاهزية
    criteria: {
      personalHygiene: { type: Number, min: 1, max: 5, default: 1 },
      mealPreparation: { type: Number, min: 1, max: 5, default: 1 },
      housekeeping: { type: Number, min: 1, max: 5, default: 1 },
      financialManagement: { type: Number, min: 1, max: 5, default: 1 },
      medication: { type: Number, min: 1, max: 5, default: 1 },
      emergencyResponse: { type: Number, min: 1, max: 5, default: 1 },
      socialSkills: { type: Number, min: 1, max: 5, default: 1 },
      communityNavigation: { type: Number, min: 1, max: 5, default: 1 },
    },
    overallReadiness: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    readinessLevel: {
      type: String,
      enum: ['not_ready', 'preparing', 'nearly_ready', 'ready', 'transitioned'],
      default: 'not_ready',
    },
    recommendation: {
      type: String,
      enum: [
        'full_support',
        'shared_housing',
        'supervised_independent',
        'independent',
        'community_living',
      ],
      default: 'full_support',
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [3000, 'الملاحظات لا تتجاوز 3000 حرف'],
    },
  },
  { _id: true }
);

// ─── مخطط وحدة سكنية ───
const housingUnitSchema = new mongoose.Schema(
  {
    unitName: {
      type: String,
      required: [true, 'اسم الوحدة مطلوب'],
      trim: true,
    },
    unitType: {
      type: String,
      enum: ['apartment', 'shared_room', 'single_room', 'house', 'studio'],
      required: true,
    },
    address: {
      street: String,
      city: String,
      district: String,
      postalCode: String,
    },
    capacity: {
      type: Number,
      min: 1,
      max: 10,
      default: 1,
    },
    currentOccupants: {
      type: Number,
      min: 0,
      default: 0,
    },
    amenities: [String],
    accessibilityFeatures: [String],
    monthlyRent: {
      type: Number,
      min: 0,
      default: 0,
    },
    subsidyAmount: {
      type: Number,
      min: 0,
      default: 0,
    },
    status: {
      type: String,
      enum: ['available', 'occupied', 'maintenance', 'reserved'],
      default: 'available',
    },
    photos: [{ url: String, caption: String }],
  },
  { _id: true, timestamps: true }
);

// ─── المخطط الرئيسي لبرنامج الإسكان المدعوم ───
const supportedHousingSchema = new mongoose.Schema(
  {
    beneficiary: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'المستفيد مطلوب'],
      index: true,
    },
    plan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'IndependentLivingPlan',
    },
    caseManager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'مدير الحالة مطلوب'],
    },

    // ─── نوع البرنامج ───
    programType: {
      type: String,
      enum: [
        'full_support', // دعم كامل على مدار الساعة
        'shared_supported', // سكن مشترك مع دعم
        'semi_independent', // سكن شبه مستقل مع إشراف
        'supervised_independent', // مستقل مع زيارات متابعة
        'community_living', // عيش مجتمعي مستقل
      ],
      required: [true, 'نوع البرنامج مطلوب'],
    },
    programName: {
      type: String,
      required: [true, 'اسم البرنامج مطلوب'],
      trim: true,
      maxlength: [200, 'اسم البرنامج لا يتجاوز 200 حرف'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [5000, 'الوصف لا يتجاوز 5000 حرف'],
    },

    // ─── المواعيد ───
    enrollmentDate: {
      type: Date,
      required: [true, 'تاريخ الالتحاق مطلوب'],
    },
    expectedTransitionDate: Date,
    actualTransitionDate: Date,

    // ─── الوحدة السكنية ───
    housingUnit: housingUnitSchema,

    // ─── تقييمات الجاهزية ───
    readinessAssessments: [housingReadinessSchema],

    // ─── خدمات الدعم ───
    supportServices: [
      {
        serviceName: {
          type: String,
          required: true,
          trim: true,
        },
        serviceType: {
          type: String,
          enum: [
            'daily_living_support', // دعم الحياة اليومية
            'health_support', // دعم صحي
            'financial_support', // دعم مالي
            'social_support', // دعم اجتماعي
            'transportation', // مواصلات
            'vocational', // تأهيل مهني
            'counseling', // إرشاد
            'crisis_intervention', // تدخل في الأزمات
          ],
        },
        frequency: {
          type: String,
          enum: ['daily', 'weekly', 'biweekly', 'monthly', 'as_needed'],
        },
        provider: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        isActive: { type: Boolean, default: true },
        startDate: Date,
        endDate: Date,
        notes: String,
      },
    ],

    // ─── سجل الزيارات المنزلية ───
    homeVisits: [
      {
        visitDate: { type: Date, required: true },
        visitor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        purpose: String,
        findings: String,
        concerns: [String],
        recommendations: String,
        followUpRequired: { type: Boolean, default: false },
        followUpDate: Date,
        status: {
          type: String,
          enum: ['scheduled', 'completed', 'cancelled', 'rescheduled'],
          default: 'scheduled',
        },
      },
    ],

    // ─── الحالة والتقدم ───
    status: {
      type: String,
      enum: ['pending', 'active', 'on_hold', 'transitioning', 'completed', 'withdrawn'],
      default: 'pending',
    },
    transitionPhase: {
      type: String,
      enum: [
        'assessment',
        'preparation',
        'placement',
        'adjustment',
        'stabilization',
        'independence',
      ],
      default: 'assessment',
    },

    // ─── المالية ───
    financialPlan: {
      monthlyBudget: { type: Number, min: 0, default: 0 },
      subsidyAmount: { type: Number, min: 0, default: 0 },
      beneficiaryContribution: { type: Number, min: 0, default: 0 },
      additionalFunding: { type: Number, min: 0, default: 0 },
      fundingSource: String,
    },

    // ─── جهات الاتصال في حالات الطوارئ ───
    emergencyContacts: [
      {
        name: { type: String, required: true },
        relationship: String,
        phone: { type: String, required: true },
        alternatePhone: String,
        isPrimary: { type: Boolean, default: false },
      },
    ],

    // تقييم رضا المستفيد
    satisfactionSurveys: [
      {
        surveyDate: { type: Date, default: Date.now },
        overallRating: { type: Number, min: 1, max: 5 },
        safetyRating: { type: Number, min: 1, max: 5 },
        supportRating: { type: Number, min: 1, max: 5 },
        independenceRating: { type: Number, min: 1, max: 5 },
        comments: String,
      },
    ],

    notes: {
      type: String,
      trim: true,
      maxlength: [5000, 'الملاحظات لا تتجاوز 5000 حرف'],
    },

    attachments: [
      {
        filename: String,
        url: String,
        type: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ───
supportedHousingSchema.index({ beneficiary: 1, status: 1 });
supportedHousingSchema.index({ caseManager: 1 });
supportedHousingSchema.index({ programType: 1, status: 1 });
supportedHousingSchema.index({ 'housingUnit.status': 1 });

// ─── حساب الجاهزية قبل الحفظ ───
supportedHousingSchema.pre('save', function (next) {
  // حساب درجة الجاهزية في آخر تقييم
  if (this.readinessAssessments && this.readinessAssessments.length > 0) {
    const latest = this.readinessAssessments[this.readinessAssessments.length - 1];
    const c = latest.criteria;
    const values = [
      c.personalHygiene,
      c.mealPreparation,
      c.housekeeping,
      c.financialManagement,
      c.medication,
      c.emergencyResponse,
      c.socialSkills,
      c.communityNavigation,
    ];
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    latest.overallReadiness = Math.round(((avg - 1) / 4) * 100);

    if (latest.overallReadiness >= 85) latest.readinessLevel = 'ready';
    else if (latest.overallReadiness >= 65) latest.readinessLevel = 'nearly_ready';
    else if (latest.overallReadiness >= 40) latest.readinessLevel = 'preparing';
    else latest.readinessLevel = 'not_ready';
  }
  next();
});

// ─── Virtuals ───
supportedHousingSchema.virtual('daysInProgram').get(function () {
  if (this.enrollmentDate) {
    return Math.floor((Date.now() - this.enrollmentDate) / (24 * 60 * 60 * 1000));
  }
  return 0;
});

supportedHousingSchema.virtual('latestReadiness').get(function () {
  if (this.readinessAssessments && this.readinessAssessments.length > 0) {
    return this.readinessAssessments[this.readinessAssessments.length - 1];
  }
  return null;
});

supportedHousingSchema.virtual('activeServices').get(function () {
  return this.supportServices?.filter(s => s.isActive).length || 0;
});

module.exports = mongoose.models.SupportedHousing || mongoose.model('SupportedHousing', supportedHousingSchema);
