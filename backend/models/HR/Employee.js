'use strict';

/**
 * Employee Model — نموذج الموظفين
 * وفق نظام العمل السعودي ونظام التأمينات الاجتماعية (GOSI)
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;
const {
  nationalAddressSubschema,
  attachNationalAddressGuard,
} = require('../_shared/nationalAddress.subschema');

const employeeSchema = new Schema(
  {
    employee_number: { type: String, unique: true }, // EMP-YYYY-XXXX (auto)
    user_id: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    branch_id: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },

    // البيانات الشخصية
    name_ar: { type: String, required: true },
    name_en: String,
    name: { type: String, required: false },  // alias for backward compatibility
    full_name_ar: String,
    full_name_en: String,
    national_id: { type: String, unique: true, required: true, minlength: 10, maxlength: 10 },
    national_id_expiry: Date,
    nationality: { type: String, default: 'SA' },
    date_of_birth: { type: Date, required: true },
    gender: { type: String, enum: ['male', 'female'], required: true },
    marital_status: {
      type: String,
      enum: ['single', 'married', 'divorced', 'widowed'],
      default: 'single',
    },

    // التواصل
    phone: { type: String, required: true },
    phone2: String,
    email: { type: String, unique: true, required: true, lowercase: true },
    personal_email: String,
    address: String,
    city: String,
    postal_code: String,
    // العنوان الوطني السعودي — strict-verified via وَصِل when provided.
    nationalAddress: nationalAddressSubschema,
    emergency_contact: {
      name: String,
      phone: String,
      relation: String,
    },

    // البيانات الوظيفية
    job_title_ar: { type: String, required: true },
    job_title_en: String,
    position: { type: String, required: false },  // alias for backward compatibility
    department: {
      type: String,
      enum: ['administration', 'clinical', 'support', 'finance', 'hr', 'transport', 'it'],
      required: true,
    },
    specialization: {
      type: String,
      enum: [
        'pt',
        'ot',
        'speech',
        'aba',
        'psychology',
        'special_education',
        'vocational',
        'nursing',
        'medical',
        'admin',
        'accounting',
        'hr',
        'driver',
        'it',
        'other',
      ],
      required: true,
    },

    // الهيكل التنظيمي — مدير مباشر
    manager_id: { type: Schema.Types.ObjectId, ref: 'Employee', default: null },
    manager_name: String,

    // الهيئة السعودية للتخصصات الصحية
    scfhs_number: String,
    scfhs_classification: String,
    scfhs_expiry: Date,

    // بيانات التوظيف
    hire_date: { type: Date, required: true },
    probation_end_date: Date, // hire_date + 90 days
    contract_type: {
      type: String,
      enum: ['fixed', 'indefinite', 'flexible', 'part_time'],
      required: true,
    },

    // المالية
    basic_salary: { type: Number, required: true, min: 0 },
    housing_allowance: { type: Number, default: 0 },
    transport_allowance: { type: Number, default: 0 },
    other_allowances: [{ name: String, amount: Number }],

    // البنك
    bank_name: String,
    iban: { type: String, match: /^SA\d{22}$/ },
    bank_account_number: String,

    // التأمينات الاجتماعية
    gosi_number: String,
    gosi_registered: { type: Boolean, default: false },
    gosi_registration_date: Date,

    // غير السعوديين
    iqama_number: { type: String, minlength: 10, maxlength: 10 },
    iqama_expiry: Date,
    passport_number: String,
    passport_expiry: Date,
    visa_type: String,
    visa_expiry: Date,

    // ── Compliance verification (cached from GOSI/SCFHS) ─────────────
    gosi_verification: {
      verified: { type: Boolean, default: false },
      lastVerifiedAt: Date,
      mode: { type: String, enum: ['mock', 'live'] },
      status: { type: String, enum: ['active', 'inactive', 'not_found', 'unknown'] },
      employerName: String,
      monthlyWage: Number,
      registrationDate: Date,
      message: String,
    },
    scfhs_verification: {
      verified: { type: Boolean, default: false },
      lastVerifiedAt: Date,
      mode: { type: String, enum: ['mock', 'live'] },
      status: { type: String, enum: ['active', 'expired', 'suspended', 'not_found', 'unknown'] },
      classification: String,
      specialty: String,
      licenseNumber: String,
      expiryDate: Date,
      message: String,
    },
    qiwa_verification: {
      verified: { type: Boolean, default: false },
      lastVerifiedAt: Date,
      mode: { type: String, enum: ['mock', 'live'] },
      status: {
        type: String,
        enum: ['compliant', 'wps_violation', 'no_contract', 'unknown'],
      },
      contractType: String,
      contractStartDate: Date,
      contractEndDate: Date,
      wpsCompliant: Boolean,
      message: String,
    },
    muqeem_verification: {
      verified: { type: Boolean, default: false },
      lastVerifiedAt: Date,
      mode: { type: String, enum: ['mock', 'live'] },
      status: {
        type: String,
        enum: ['active', 'expired', 'cancelled', 'not_found', 'unknown'],
      },
      sponsor: String,
      profession: String,
      nationality: String,
      expiryDate: Date,
      remainingDays: Number,
      message: String,
    },

    // التعليم والخبرة
    is_saudi: { type: Boolean, default: true },
    education_level: {
      type: String,
      enum: ['high_school', 'diploma', 'bachelor', 'master', 'doctorate', 'other'],
    },
    university: String,
    graduation_year: Number,
    years_of_experience: { type: Number, default: 0 },
    max_caseload: { type: Number, default: 15 },

    // الحالة
    status: {
      type: String,
      enum: ['active', 'on_leave', 'suspended', 'terminated', 'resigned'],
      default: 'active',
    },
    termination_date: Date,
    termination_reason: String,
    termination_type: {
      type: String,
      enum: ['resignation', 'termination', 'end_of_contract', 'retirement'],
    },

    photo_path: String,
    notes: String,

    // مراجع المستندات الموحدة (عقود، شهادات، هوية، إقامة...)
    documentIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Document',
      },
    ],

    // ── Backward compatibility fields (legacy employeeAffairs.service) ───
    salary: {
      base: { type: Number, default: 0 },
      allowances: [{ name: String, amount: Number, type: { type: String, enum: ['monthly', 'yearly', 'one_time'] } }],
      deductions: [{ name: String, amount: Number, type: { type: String, enum: ['monthly', 'yearly', 'one_time'] } }],
    },
    contract: {
      startDate: Date,
      endDate: Date,
      contractType: { type: String, enum: ['fixed', 'indefinite', 'flexible', 'part_time'] },
      renewalDate: Date,
    },
    leave: {
      annualLeaveDays: { type: Number, default: 30 },
      sickLeaveDays: { type: Number, default: 10 },
      usedAnnualLeave: { type: Number, default: 0 },
      usedSickLeave: { type: Number, default: 0 },
    },
    attendance: {
      totalDaysWorked: { type: Number, default: 0 },
      totalAbsences: { type: Number, default: 0 },
      lateArrivals: { type: Number, default: 0 },
      earlyDepartures: { type: Number, default: 0 },
      lastAttendanceUpdate: Date,
    },
    performance: {
      currentRating: { type: Number, default: 0 },
      ratingHistory: [{ rating: Number, reviewer: String, date: Date, comments: String }],
      goals: [{ title: String, description: String, deadline: Date, status: { type: String, enum: ['pending', 'in_progress', 'completed', 'cancelled'], default: 'pending' } }],
    },
    careerDevelopment: {
      promotions: [{ fromPosition: String, toPosition: String, date: Date, salary: Number, reason: String }],
      certifications: [{ name: String, issuer: String, issueDate: Date, expiryDate: Date, documentUrl: String }],
      trainings: [{ name: String, provider: String, startDate: Date, endDate: Date, status: { type: String, enum: ['planned', 'in_progress', 'completed', 'cancelled'], default: 'planned' } }],
    },
    skills: [{ name: String, level: { type: String, enum: ['beginner', 'intermediate', 'advanced', 'expert'] }, acquiredAt: Date }],
    documents: [{ type: String, url: String, uploadDate: Date, expiryDate: Date, notes: String }],
    gosi: {
      status: { type: String, enum: ['active', 'inactive', 'not_found', 'unknown'], default: 'unknown' },
      subscriptionNumber: String,
      wage: { type: Number, default: 0 },
      totalContributionMonths: { type: Number, default: 0 },
    },
    qiwa: {
      contractStatus: { type: String, enum: ['active', 'inactive', 'not_found', 'unknown'], default: 'unknown' },
      contractId: String,
      wageProtectionStatus: { type: String, enum: ['compliant', 'non_compliant', 'unknown'], default: 'unknown' },
    },
    mol: {
      workPermitNumber: String,
      workPermitExpiry: Date,
      occupationNameAr: String,
    },
    sponsorship: {
      visaExpiry: Date,
      passportExpiry: Date,
    },
    insurance: {
      insuranceExpiry: Date,
      provider: String,
      policyNumber: String,
    },
    medicalCheckup: {
      lastCheckupDate: Date,
      nextCheckupDate: Date,
    },

    // Soft delete
    deleted_at: { type: Date, default: null },
  },
  { timestamps: true, collection: 'employees' }
);

// Indexes
employeeSchema.index({ branch_id: 1, department: 1 });
employeeSchema.index({ status: 1 });
employeeSchema.index({ specialization: 1 });
employeeSchema.index({ is_saudi: 1 });
employeeSchema.index({ hire_date: 1 });
// REMOVED DUPLICATE: employeeSchema.index({ national_id: 1 }); — field already has index:true
employeeSchema.index({ deleted_at: 1 });

// Auto-generate employee_number before save.
// W933 — pure async hook (the mixed `async function (next){…next()}` style breaks
// under Mongoose 9 → "next is not a function" on every save).
employeeSchema.pre('save', async function () {
  if (!this.employee_number) {
    const year = new Date().getFullYear();
    const last = await this.constructor.findOne(
      { employee_number: { $regex: `^EMP-${year}-` } },
      { employee_number: 1 },
      { sort: { employee_number: -1 } }
    );
    const seq = last ? parseInt(last.employee_number.slice(-4)) + 1 : 1;
    this.employee_number = `EMP-${year}-${String(seq).padStart(4, '0')}`;
  }
  if (!this.probation_end_date && this.hire_date) {
    const d = new Date(this.hire_date);
    d.setDate(d.getDate() + 90);
    this.probation_end_date = d;
  }
});

// Virtuals
employeeSchema.virtual('total_salary').get(function () {
  const other = (this.other_allowances || []).reduce((s, a) => s + (a.amount || 0), 0);
  return this.basic_salary + this.housing_allowance + this.transport_allowance + other;
});

employeeSchema.virtual('service_years').get(function () {
  const end = this.termination_date || new Date();
  return (end - this.hire_date) / (1000 * 60 * 60 * 24 * 365.25);
});

employeeSchema.virtual('is_on_probation').get(function () {
  return this.probation_end_date && new Date() < this.probation_end_date;
});

employeeSchema.virtual('is_clinical').get(function () {
  return [
    'pt',
    'ot',
    'speech',
    'aba',
    'psychology',
    'special_education',
    'vocational',
    'nursing',
    'medical',
  ].includes(this.specialization);
});

employeeSchema.virtual('avatar').get(function () {
  return this.photo_path || null;
});

employeeSchema.virtual('jobTitle').get(function () {
  return this.job_title_ar || this.job_title_en || '';
});

employeeSchema.set('toJSON', { virtuals: true });
employeeSchema.set('toObject', { virtuals: true });

// ── Post-process lean() results so legacy callers see expected shape ────────
employeeSchema.post('find', function (docs) {
  if (!Array.isArray(docs)) return;
  for (const doc of docs) {
    if (doc && doc._doc) continue; // skip hydrated docs
    doc.employeeId = doc.employee_number || doc.employeeId;
    doc.employeeNumber = doc.employee_number || doc.employeeNumber;
    doc.firstName = doc.name_ar || doc.firstName || '';
    doc.lastName = doc.name_en || doc.lastName || '';
    doc.fullName = `${doc.firstName} ${doc.lastName}`.trim() || doc.name || '';
    doc.nameAr = doc.name_ar || doc.nameAr || '';
    doc.position = doc.job_title_ar || doc.position || '';
    doc.jobTitle = doc.job_title_ar || doc.jobTitle || '';
    doc.avatar = doc.photo_path || doc.avatar || null;
    doc.managerId = doc.manager_id || doc.managerId || null;
    if (!doc.salary) doc.salary = { base: doc.basic_salary || 0 };
    else if (doc.salary.base === undefined && doc.basic_salary !== undefined) doc.salary.base = doc.basic_salary;
    if (!doc.contract) {
      doc.contract = {
        startDate: doc.hire_date,
        endDate: doc.probation_end_date,
        contractType: doc.contract_type,
      };
    }
  }
});

employeeSchema.post('findOne', function (doc) {
  if (!doc || doc._doc) return; // skip hydrated docs
  doc.employeeId = doc.employee_number || doc.employeeId;
  doc.employeeNumber = doc.employee_number || doc.employeeNumber;
  doc.firstName = doc.name_ar || doc.firstName || '';
  doc.lastName = doc.name_en || doc.lastName || '';
  doc.fullName = `${doc.firstName} ${doc.lastName}`.trim() || doc.name || '';
  doc.nameAr = doc.name_ar || doc.nameAr || '';
  doc.position = doc.job_title_ar || doc.position || '';
  doc.jobTitle = doc.job_title_ar || doc.jobTitle || '';
  doc.avatar = doc.photo_path || doc.avatar || null;
  doc.managerId = doc.manager_id || doc.managerId || null;
  if (!doc.salary) doc.salary = { base: doc.basic_salary || 0 };
  else if (doc.salary.base === undefined && doc.basic_salary !== undefined) doc.salary.base = doc.basic_salary;
  if (!doc.contract) {
    doc.contract = {
      startDate: doc.hire_date,
      endDate: doc.probation_end_date,
      contractType: doc.contract_type,
    };
  }
});

// Static: find active employees
employeeSchema.statics.findActive = function (branchId) {
  const q = { status: 'active', deleted_at: null };
  if (branchId) q.branch_id = branchId;
  return this.find(q);
};

// Static: find clinical staff
employeeSchema.statics.findClinical = function (branchId) {
  const q = {
    status: 'active',
    deleted_at: null,
    specialization: {
      $in: [
        'pt',
        'ot',
        'speech',
        'aba',
        'psychology',
        'special_education',
        'vocational',
        'nursing',
        'medical',
      ],
    },
  };
  if (branchId) q.branch_id = branchId;
  return this.find(q);
};

// Static: find expiring documents (SCFHS, Iqama, Passport) within days
employeeSchema.statics.findExpiringDocuments = function (days = 90) {
  const threshold = new Date();
  threshold.setDate(threshold.getDate() + days);
  return this.find({
    status: 'active',
    deleted_at: null,
    $or: [
      { scfhs_expiry: { $lte: threshold, $gte: new Date() } },
      { iqama_expiry: { $lte: threshold, $gte: new Date() } },
      { passport_expiry: { $lte: threshold, $gte: new Date() } },
      { national_id_expiry: { $lte: threshold, $gte: new Date() } },
    ],
  });
};

// ── Backward-compatibility virtuals & methods (legacy employeeAffairs.service) ─

employeeSchema.virtual('employeeId').get(function () {
  return this.employee_number;
});

employeeSchema.virtual('employeeNumber').get(function () {
  return this.employee_number;
});

employeeSchema.virtual('firstName').get(function () {
  return this.name_ar || this.name || '';
});

employeeSchema.virtual('lastName').get(function () {
  return this.name_en || '';
});

employeeSchema.virtual('fullName').get(function () {
  return `${this.name_ar || ''} ${this.name_en || ''}`.trim() || this.name || '';
});

employeeSchema.virtual('nameAr').get(function () {
  return this.name_ar;
});

employeeSchema.virtual('nameEn').get(function () {
  return this.name_en;
});

employeeSchema.virtual('isActive').get(function () {
  return this.status === 'active';
});

employeeSchema.virtual('branchId').get(function () {
  return this.branch_id;
});

employeeSchema.virtual('managerId').get(function () {
  return this.manager_id;
});

employeeSchema.method('addPerformanceRating', function (rating, reviewer, comments) {
  if (!this.performance) this.performance = {};
  if (!this.performance.ratingHistory) this.performance.ratingHistory = [];
  this.performance.ratingHistory.push({ rating, reviewer, date: new Date(), comments });
  const sum = this.performance.ratingHistory.reduce((s, r) => s + (r.rating || 0), 0);
  this.performance.currentRating =
    this.performance.ratingHistory.length > 0
      ? Math.round((sum / this.performance.ratingHistory.length) * 10) / 10
      : 0;
  return this;
});

// Auto-issue a UniversalCode (`RH-EMP-XXXXXX`) for every employee —
// powers staff ID badges, time-clock check-in, building-access logs.
try {
  const universalCodePlugin = require('../../services/universalCode/plugin');
  employeeSchema.plugin(universalCodePlugin, {
    entityType: 'EMP',
    labelFrom: doc => doc.full_name_ar || doc.full_name_en || doc.employee_id || null,
  });
} catch (_e) {
  /* loaded before services exist — skip silently */
}

attachNationalAddressGuard(employeeSchema);

module.exports = mongoose.models.Employee || mongoose.model('Employee', employeeSchema);
