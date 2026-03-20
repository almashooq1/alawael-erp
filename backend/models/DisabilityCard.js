/**
 * Disability Card & Classification Model
 * نموذج بطاقة ذوي الإعاقة والتصنيف
 *
 * Features:
 * - ربط مع نظام بطاقة الإعاقة الوطنية (وزارة الموارد البشرية)
 * - تصنيف نوع ودرجة الإعاقة وفق المعايير السعودية
 * - تجديد البطاقات تلقائياً
 * - إدارة الإعفاءات والتسهيلات المرتبطة بالبطاقة
 * - ربط مع خدمات الضمان الاجتماعي ومنصة أبشر
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

// ─── Saudi Disability Classification Standards ────────────────────────────────

const DISABILITY_TYPES = [
  'physical', // إعاقة جسدية
  'visual', // إعاقة بصرية
  'hearing', // إعاقة سمعية
  'intellectual', // إعاقة ذهنية
  'mental_health', // إعاقة نفسية
  'autism_spectrum', // اضطراب طيف التوحد
  'multiple', // إعاقة متعددة
  'neurological', // إعاقة عصبية
  'speech_language', // إعاقة نطقية/لغوية
  'learning', // صعوبات تعلم
];

const DISABILITY_DEGREES = [
  'mild', // خفيفة
  'moderate', // متوسطة
  'severe', // شديدة
  'profound', // شديدة جداً
];

const CARD_STATUSES = [
  'pending_review', // قيد المراجعة
  'active', // فعّالة
  'expired', // منتهية
  'suspended', // موقوفة
  'revoked', // ملغاة
  'renewal_pending', // قيد التجديد
  'rejected', // مرفوضة
];

// ─── Sub-Schemas ──────────────────────────────────────────────────────────────

/**
 * Saudi National Classification (تصنيف حسب المعايير السعودية)
 */
const saudiClassificationSchema = new Schema(
  {
    disability_type: {
      type: String,
      enum: DISABILITY_TYPES,
      required: true,
    },
    disability_type_ar: { type: String },
    disability_degree: {
      type: String,
      enum: DISABILITY_DEGREES,
      required: true,
    },
    disability_degree_ar: { type: String },
    icf_code: { type: String }, // ICF classification code
    icd10_code: { type: String }, // ICD-10 diagnosis code
    onset_type: {
      type: String,
      enum: ['congenital', 'acquired'], // خلقية / مكتسبة
    },
    onset_date: { type: Date },
    primary_diagnosis: { type: String, required: true },
    primary_diagnosis_ar: { type: String },
    secondary_diagnoses: [{ type: String }],
    functional_limitation_percentage: {
      type: Number,
      min: 0,
      max: 100,
    },
    needs_assistive_devices: { type: Boolean, default: false },
    assistive_devices: [{ type: String }],
    needs_personal_assistant: { type: Boolean, default: false },
    mobility_status: {
      type: String,
      enum: [
        'independent',
        'uses_wheelchair',
        'uses_walker',
        'uses_crutches',
        'bedridden',
        'other',
      ],
    },
    classification_date: { type: Date, default: Date.now },
    classified_by: { type: Schema.Types.ObjectId, ref: 'User' },
    classification_center: { type: String },
    medical_report_reference: { type: String },
  },
  { _id: false }
);

/**
 * MOHR Integration Data (بيانات ربط وزارة الموارد البشرية)
 */
const mohrIntegrationSchema = new Schema(
  {
    national_card_number: { type: String, unique: true, sparse: true },
    mohr_registration_id: { type: String },
    mohr_status: {
      type: String,
      enum: ['registered', 'verified', 'pending_verification', 'rejected', 'not_registered'],
      default: 'not_registered',
    },
    mohr_registration_date: { type: Date },
    mohr_last_sync: { type: Date },
    mohr_verification_code: { type: String },
    mohr_card_serial: { type: String },
    mohr_disability_code: { type: String },
    mohr_response_data: { type: Schema.Types.Mixed },
  },
  { _id: false }
);

/**
 * Absher Integration (ربط منصة أبشر)
 */
const absherIntegrationSchema = new Schema(
  {
    absher_id: { type: String },
    absher_verified: { type: Boolean, default: false },
    absher_verification_date: { type: Date },
    absher_last_sync: { type: Date },
    absher_services_linked: [
      {
        service_name: String,
        service_name_ar: String,
        service_code: String,
        linked_date: Date,
        status: { type: String, enum: ['active', 'inactive', 'expired'] },
      },
    ],
    absher_response_data: { type: Schema.Types.Mixed },
  },
  { _id: false }
);

/**
 * Social Security Integration (ربط الضمان الاجتماعي)
 */
const socialSecuritySchema = new Schema(
  {
    social_security_number: { type: String },
    ss_registration_status: {
      type: String,
      enum: ['registered', 'pending', 'not_registered', 'suspended'],
      default: 'not_registered',
    },
    ss_monthly_benefit: { type: Number, default: 0 },
    ss_benefit_currency: { type: String, default: 'SAR' },
    ss_benefit_start_date: { type: Date },
    ss_benefit_end_date: { type: Date },
    ss_last_payment_date: { type: Date },
    ss_total_received: { type: Number, default: 0 },
    ss_category: {
      type: String,
      enum: ['category_a', 'category_b', 'category_c', 'special'],
    },
    ss_last_sync: { type: Date },
    ss_response_data: { type: Schema.Types.Mixed },
  },
  { _id: false }
);

/**
 * Exemptions & Facilitations (الإعفاءات والتسهيلات)
 */
const exemptionSchema = new Schema(
  {
    exemption_type: {
      type: String,
      enum: [
        'transportation', // إعفاء مواصلات
        'parking', // تصريح مواقف
        'customs_duty', // إعفاء جمركي
        'vehicle_purchase', // إعفاء شراء مركبة
        'education', // إعفاء تعليمي
        'healthcare', // إعفاء صحي
        'housing', // إعفاء سكني
        'tax', // إعفاء ضريبي
        'employment', // تسهيلات وظيفية
        'social_services', // خدمات اجتماعية
        'utility_discount', // تخفيض فواتير
        'visa_processing', // تسهيل تأشيرات
        'domestic_worker', // استقدام عمالة منزلية
        'priority_service', // أولوية خدمة
        'medical_equipment', // أجهزة طبية
        'rehabilitation', // خدمات تأهيلية
        'other', // أخرى
      ],
      required: true,
    },
    exemption_type_ar: { type: String },
    description: { type: String },
    description_ar: { type: String },
    status: {
      type: String,
      enum: ['active', 'expired', 'pending', 'revoked', 'suspended'],
      default: 'pending',
    },
    issuing_authority: { type: String },
    issuing_authority_ar: { type: String },
    reference_number: { type: String },
    issued_date: { type: Date },
    expiry_date: { type: Date },
    auto_renew: { type: Boolean, default: false },
    benefit_amount: { type: Number },
    benefit_currency: { type: String, default: 'SAR' },
    benefit_frequency: {
      type: String,
      enum: ['one_time', 'monthly', 'quarterly', 'annually'],
    },
    conditions: [{ type: String }],
    documents: [
      {
        name: String,
        url: String,
        uploaded_at: { type: Date, default: Date.now },
      },
    ],
    notes: { type: String },
  },
  { _id: true }
);

/**
 * Card Renewal History (سجل تجديد البطاقات)
 */
const renewalHistorySchema = new Schema(
  {
    renewal_type: {
      type: String,
      enum: ['automatic', 'manual', 'medical_reassessment'],
      required: true,
    },
    previous_expiry: { type: Date },
    new_expiry: { type: Date },
    renewed_at: { type: Date, default: Date.now },
    renewed_by: { type: Schema.Types.ObjectId, ref: 'User' },
    renewal_reason: { type: String },
    medical_report_attached: { type: Boolean, default: false },
    classification_changed: { type: Boolean, default: false },
    previous_classification: {
      disability_type: String,
      disability_degree: String,
    },
    new_classification: {
      disability_type: String,
      disability_degree: String,
    },
    approval_status: {
      type: String,
      enum: ['approved', 'pending', 'rejected'],
      default: 'pending',
    },
    approved_by: { type: Schema.Types.ObjectId, ref: 'User' },
    approved_at: { type: Date },
    notes: { type: String },
  },
  { _id: true }
);

/**
 * Audit Log Entry (سجل المراجعة)
 */
const auditEntrySchema = new Schema(
  {
    action: {
      type: String,
      enum: [
        'created',
        'updated',
        'renewed',
        'suspended',
        'revoked',
        'reactivated',
        'classification_changed',
        'exemption_added',
        'exemption_removed',
        'synced_mohr',
        'synced_absher',
        'synced_social_security',
        'auto_renewed',
        'document_uploaded',
      ],
      required: true,
    },
    performed_by: { type: Schema.Types.ObjectId, ref: 'User' },
    performed_at: { type: Date, default: Date.now },
    ip_address: { type: String },
    details: { type: String },
    details_ar: { type: String },
    previous_values: { type: Schema.Types.Mixed },
    new_values: { type: Schema.Types.Mixed },
  },
  { _id: true }
);

// ─── Main Schema ──────────────────────────────────────────────────────────────

const disabilityCardSchema = new Schema(
  {
    // ── Identity ────────────────────────────────────────────────────────────
    beneficiary: {
      type: Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
    },
    national_id: { type: String, required: true, index: true },
    full_name: { type: String, required: true },
    full_name_ar: { type: String, required: true },
    date_of_birth: { type: Date, required: true },
    gender: { type: String, enum: ['male', 'female'], required: true },
    nationality: { type: String, default: 'Saudi' },
    phone: { type: String },
    email: { type: String },
    address: {
      city: String,
      city_ar: String,
      district: String,
      district_ar: String,
      street: String,
      postal_code: String,
      region: String,
      region_ar: String,
    },
    guardian: {
      name: String,
      name_ar: String,
      national_id: String,
      phone: String,
      relationship: {
        type: String,
        enum: ['parent', 'spouse', 'sibling', 'child', 'relative', 'legal_guardian', 'other'],
      },
    },

    // ── Card Details ────────────────────────────────────────────────────────
    card_number: { type: String, unique: true, index: true },
    card_status: {
      type: String,
      enum: CARD_STATUSES,
      default: 'pending_review',
      index: true,
    },
    issue_date: { type: Date },
    expiry_date: { type: Date, index: true },
    card_validity_years: { type: Number, default: 5 },
    photo_url: { type: String },
    qr_code: { type: String },
    barcode: { type: String },

    // ── Classification ──────────────────────────────────────────────────────
    classification: saudiClassificationSchema,

    // ── Integrations ────────────────────────────────────────────────────────
    mohr_integration: mohrIntegrationSchema,
    absher_integration: absherIntegrationSchema,
    social_security: socialSecuritySchema,

    // ── Exemptions & Benefits ───────────────────────────────────────────────
    exemptions: [exemptionSchema],

    // ── Renewal ─────────────────────────────────────────────────────────────
    auto_renewal_enabled: { type: Boolean, default: true },
    next_renewal_date: { type: Date },
    renewal_reminder_sent: { type: Boolean, default: false },
    renewal_reminder_date: { type: Date },
    renewal_history: [renewalHistorySchema],

    // ── Documents ───────────────────────────────────────────────────────────
    documents: [
      {
        type: {
          type: String,
          enum: [
            'medical_report',
            'national_id_copy',
            'photo',
            'guardian_id_copy',
            'assessment_report',
            'mohr_certificate',
            'social_security_letter',
            'other',
          ],
        },
        name: String,
        url: String,
        uploaded_at: { type: Date, default: Date.now },
        uploaded_by: { type: Schema.Types.ObjectId, ref: 'User' },
        verified: { type: Boolean, default: false },
        verified_by: { type: Schema.Types.ObjectId, ref: 'User' },
        verified_at: { type: Date },
      },
    ],

    // ── Audit ───────────────────────────────────────────────────────────────
    audit_log: [auditEntrySchema],

    // ── Metadata ────────────────────────────────────────────────────────────
    organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
    branch: { type: Schema.Types.ObjectId, ref: 'Branch' },
    created_by: { type: Schema.Types.ObjectId, ref: 'User' },
    updated_by: { type: Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String },
    notes_ar: { type: String },
    tags: [{ type: String }],
  },
  {
    timestamps: true,
    collection: 'disability_cards',
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

if (typeof disabilityCardSchema.index === 'function') {
  disabilityCardSchema.index({ card_status: 1, expiry_date: 1 });
  disabilityCardSchema.index({
    'classification.disability_type': 1,
    'classification.disability_degree': 1,
  });
  disabilityCardSchema.index({ 'mohr_integration.national_card_number': 1 });
  disabilityCardSchema.index({ national_id: 1, card_status: 1 });
  disabilityCardSchema.index({ auto_renewal_enabled: 1, expiry_date: 1 });
  disabilityCardSchema.index({ organization: 1, card_status: 1 });
  disabilityCardSchema.index({ next_renewal_date: 1, renewal_reminder_sent: 1 });
}

// ─── Virtuals ─────────────────────────────────────────────────────────────────
// Guard: in test env with resetMocks the Schema mock may return a bare object
const _safeVirtual =
  typeof disabilityCardSchema.virtual === 'function'
    ? name => disabilityCardSchema.virtual(name)
    : () => ({ get: () => disabilityCardSchema, set: () => disabilityCardSchema });

_safeVirtual('is_expired').get(function () {
  return this.expiry_date ? new Date() > this.expiry_date : false;
});

_safeVirtual('is_active').get(function () {
  return this.card_status === 'active' && !this.is_expired;
});

_safeVirtual('days_until_expiry').get(function () {
  if (!this.expiry_date) return null;
  const diff = this.expiry_date.getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

_safeVirtual('active_exemptions').get(function () {
  if (!this.exemptions) return [];
  return this.exemptions.filter(
    e => e.status === 'active' && (!e.expiry_date || new Date() < e.expiry_date)
  );
});

_safeVirtual('total_monthly_benefits').get(function () {
  let total = 0;
  if (this.social_security?.ss_monthly_benefit) {
    total += this.social_security.ss_monthly_benefit;
  }
  if (this.exemptions) {
    this.exemptions
      .filter(e => e.status === 'active' && e.benefit_frequency === 'monthly')
      .forEach(e => {
        total += e.benefit_amount || 0;
      });
  }
  return total;
});

// ─── Pre-save Hooks ───────────────────────────────────────────────────────────

if (typeof disabilityCardSchema.pre === 'function') {
  disabilityCardSchema.pre('save', function (next) {
    // Auto-generate card number if not set
    if (!this.card_number && this.isNew) {
      const year = new Date().getFullYear();
      const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
      this.card_number = `DC-${year}-${this.national_id?.slice(-4) || '0000'}-${rand}`;
    }

    // Set next renewal date
    if (this.expiry_date && this.auto_renewal_enabled && !this.next_renewal_date) {
      const renewalDate = new Date(this.expiry_date);
      renewalDate.setMonth(renewalDate.getMonth() - 3); // 3 months before expiry
      this.next_renewal_date = renewalDate;
    }

    // Arabic translations for classification
    if (this.classification) {
      const typeMap = {
        physical: 'إعاقة جسدية',
        visual: 'إعاقة بصرية',
        hearing: 'إعاقة سمعية',
        intellectual: 'إعاقة ذهنية',
        mental_health: 'إعاقة نفسية',
        autism_spectrum: 'اضطراب طيف التوحد',
        multiple: 'إعاقة متعددة',
        neurological: 'إعاقة عصبية',
        speech_language: 'إعاقة نطقية/لغوية',
        learning: 'صعوبات تعلم',
      };
      const degreeMap = {
        mild: 'خفيفة',
        moderate: 'متوسطة',
        severe: 'شديدة',
        profound: 'شديدة جداً',
      };
      if (this.classification.disability_type) {
        this.classification.disability_type_ar =
          typeMap[this.classification.disability_type] || this.classification.disability_type;
      }
      if (this.classification.disability_degree) {
        this.classification.disability_degree_ar =
          degreeMap[this.classification.disability_degree] || this.classification.disability_degree;
      }
    }

    next();
  });
}

// ─── Instance Methods ─────────────────────────────────────────────────────────
// Guard: ensure methods/statics objects exist on the schema
disabilityCardSchema.methods = disabilityCardSchema.methods || {};
disabilityCardSchema.statics = disabilityCardSchema.statics || {};

/**
 * Initiate automatic renewal (تجديد تلقائي)
 */
disabilityCardSchema.methods.autoRenew = async function (userId) {
  if (this.card_status !== 'active' && this.card_status !== 'expired') {
    throw new Error('يمكن تجديد البطاقات الفعّالة أو المنتهية فقط');
  }

  const previousExpiry = this.expiry_date;
  const newExpiry = new Date();
  newExpiry.setFullYear(newExpiry.getFullYear() + (this.card_validity_years || 5));

  this.renewal_history.push({
    renewal_type: 'automatic',
    previous_expiry: previousExpiry,
    new_expiry: newExpiry,
    renewed_by: userId,
    approval_status: 'approved',
    approved_by: userId,
    approved_at: new Date(),
    renewal_reason: 'تجديد تلقائي',
  });

  this.expiry_date = newExpiry;
  this.card_status = 'active';
  this.renewal_reminder_sent = false;

  const renewDate = new Date(newExpiry);
  renewDate.setMonth(renewDate.getMonth() - 3);
  this.next_renewal_date = renewDate;

  this.audit_log.push({
    action: 'auto_renewed',
    performed_by: userId,
    details: `تجديد تلقائي من ${previousExpiry?.toISOString()} إلى ${newExpiry.toISOString()}`,
    details_ar: `تجديد تلقائي للبطاقة`,
    previous_values: { expiry_date: previousExpiry },
    new_values: { expiry_date: newExpiry },
  });

  return this.save();
};

/**
 * Add exemption (إضافة إعفاء)
 */
disabilityCardSchema.methods.addExemption = async function (exemptionData, userId) {
  this.exemptions.push(exemptionData);

  this.audit_log.push({
    action: 'exemption_added',
    performed_by: userId,
    details: `إضافة إعفاء: ${exemptionData.exemption_type}`,
    details_ar: `إضافة إعفاء جديد من نوع ${exemptionData.exemption_type_ar || exemptionData.exemption_type}`,
    new_values: exemptionData,
  });

  return this.save();
};

/**
 * Remove exemption (إزالة إعفاء)
 */
disabilityCardSchema.methods.removeExemption = async function (exemptionId, userId, reason) {
  const exemption = this.exemptions.id(exemptionId);
  if (!exemption) throw new Error('الإعفاء غير موجود');

  const previousValues = exemption.toObject();
  exemption.status = 'revoked';

  this.audit_log.push({
    action: 'exemption_removed',
    performed_by: userId,
    details: `إزالة إعفاء: ${exemption.exemption_type} - السبب: ${reason || 'غير محدد'}`,
    details_ar: `تم إلغاء الإعفاء`,
    previous_values: previousValues,
  });

  return this.save();
};

/**
 * Get card summary (ملخص البطاقة)
 */
disabilityCardSchema.methods.getSummary = function () {
  return {
    card_number: this.card_number,
    full_name: this.full_name,
    full_name_ar: this.full_name_ar,
    national_id: this.national_id,
    card_status: this.card_status,
    is_active: this.is_active,
    is_expired: this.is_expired,
    days_until_expiry: this.days_until_expiry,
    disability_type: this.classification?.disability_type,
    disability_type_ar: this.classification?.disability_type_ar,
    disability_degree: this.classification?.disability_degree,
    disability_degree_ar: this.classification?.disability_degree_ar,
    mohr_status: this.mohr_integration?.mohr_status,
    social_security_status: this.social_security?.ss_registration_status,
    absher_verified: this.absher_integration?.absher_verified,
    active_exemptions_count: this.active_exemptions?.length || 0,
    total_monthly_benefits: this.total_monthly_benefits,
    auto_renewal_enabled: this.auto_renewal_enabled,
    next_renewal_date: this.next_renewal_date,
  };
};

// ─── Static Methods ───────────────────────────────────────────────────────────

/**
 * Find cards due for renewal (بطاقات مستحقة التجديد)
 */
disabilityCardSchema.statics.findDueForRenewal = function (daysAhead = 90) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + daysAhead);

  return this.find({
    card_status: 'active',
    auto_renewal_enabled: true,
    expiry_date: { $lte: cutoff, $gte: new Date() },
  }).sort({ expiry_date: 1 });
};

/**
 * Find expired cards (بطاقات منتهية)
 */
disabilityCardSchema.statics.findExpired = function () {
  return this.find({
    card_status: 'active',
    expiry_date: { $lt: new Date() },
  });
};

/**
 * Process automatic renewals (معالجة التجديدات التلقائية)
 */
disabilityCardSchema.statics.processAutoRenewals = async function (systemUserId) {
  const expiredCards = await this.findExpired();
  const results = { renewed: 0, failed: 0, errors: [] };

  for (const card of expiredCards) {
    if (!card.auto_renewal_enabled) continue;
    try {
      await card.autoRenew(systemUserId);
      results.renewed++;
    } catch (err) {
      results.failed++;
      results.errors.push({ card_number: card.card_number, error: err.message });
    }
  }

  return results;
};

/**
 * Get statistics (إحصائيات)
 */
disabilityCardSchema.statics.getStatistics = async function (filters = {}) {
  const matchStage = {};
  if (filters.organization)
    matchStage.organization = new mongoose.Types.ObjectId(filters.organization);
  if (filters.branch) matchStage.branch = new mongoose.Types.ObjectId(filters.branch);

  const [stats] = await this.aggregate([
    { $match: matchStage },
    {
      $facet: {
        total: [{ $count: 'count' }],
        by_status: [{ $group: { _id: '$card_status', count: { $sum: 1 } } }],
        by_type: [{ $group: { _id: '$classification.disability_type', count: { $sum: 1 } } }],
        by_degree: [{ $group: { _id: '$classification.disability_degree', count: { $sum: 1 } } }],
        by_gender: [{ $group: { _id: '$gender', count: { $sum: 1 } } }],
        expired: [
          { $match: { card_status: 'active', expiry_date: { $lt: new Date() } } },
          { $count: 'count' },
        ],
        expiring_soon: [
          {
            $match: {
              card_status: 'active',
              expiry_date: {
                $gte: new Date(),
                $lte: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
              },
            },
          },
          { $count: 'count' },
        ],
        mohr_synced: [
          { $match: { 'mohr_integration.mohr_status': 'verified' } },
          { $count: 'count' },
        ],
        absher_linked: [
          { $match: { 'absher_integration.absher_verified': true } },
          { $count: 'count' },
        ],
        social_security_active: [
          { $match: { 'social_security.ss_registration_status': 'registered' } },
          { $count: 'count' },
        ],
        total_exemptions: [
          { $unwind: '$exemptions' },
          { $match: { 'exemptions.status': 'active' } },
          { $count: 'count' },
        ],
        exemptions_by_type: [
          { $unwind: '$exemptions' },
          { $match: { 'exemptions.status': 'active' } },
          { $group: { _id: '$exemptions.exemption_type', count: { $sum: 1 } } },
        ],
      },
    },
  ]);

  return {
    total: stats.total[0]?.count || 0,
    by_status: stats.by_status,
    by_type: stats.by_type,
    by_degree: stats.by_degree,
    by_gender: stats.by_gender,
    expired: stats.expired[0]?.count || 0,
    expiring_soon: stats.expiring_soon[0]?.count || 0,
    mohr_synced: stats.mohr_synced[0]?.count || 0,
    absher_linked: stats.absher_linked[0]?.count || 0,
    social_security_active: stats.social_security_active[0]?.count || 0,
    total_active_exemptions: stats.total_exemptions[0]?.count || 0,
    exemptions_by_type: stats.exemptions_by_type,
  };
};

/**
 * Search cards (بحث)
 */
disabilityCardSchema.statics.searchCards = function (query, options = {}) {
  const {
    page = 1,
    limit = 20,
    sort = '-createdAt',
    status,
    disability_type,
    disability_degree,
  } = options;

  const filter = {};

  if (query) {
    filter.$or = [
      { full_name: { $regex: query, $options: 'i' } },
      { full_name_ar: { $regex: query, $options: 'i' } },
      { national_id: { $regex: query, $options: 'i' } },
      { card_number: { $regex: query, $options: 'i' } },
    ];
  }

  if (status) filter.card_status = status;
  if (disability_type) filter['classification.disability_type'] = disability_type;
  if (disability_degree) filter['classification.disability_degree'] = disability_degree;

  return this.find(filter)
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('beneficiary', 'name national_id')
    .populate('created_by', 'name email')
    .lean();
};

// ─── JSON Transform ───────────────────────────────────────────────────────────

if (typeof disabilityCardSchema.set === 'function') {
  disabilityCardSchema.set('toJSON', { virtuals: true });
  disabilityCardSchema.set('toObject', { virtuals: true });
}

// ─── Export ───────────────────────────────────────────────────────────────────

const DisabilityCard = mongoose.model('DisabilityCard', disabilityCardSchema);
const exported = DisabilityCard || { modelName: 'DisabilityCard' };

// Attach statics & instance methods from schema when model mock is bare
if (exported && disabilityCardSchema.statics) {
  Object.keys(disabilityCardSchema.statics).forEach(k => {
    if (!exported[k]) exported[k] = disabilityCardSchema.statics[k];
  });
}
if (exported && !exported.schema) {
  exported.schema = disabilityCardSchema;
}

module.exports = exported;
module.exports.DISABILITY_TYPES = DISABILITY_TYPES;
module.exports.DISABILITY_DEGREES = DISABILITY_DEGREES;
module.exports.CARD_STATUSES = CARD_STATUSES;
