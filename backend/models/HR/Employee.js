'use strict';

/**
 * Employee Model — نموذج الموظفين
 * وفق نظام العمل السعودي ونظام التأمينات الاجتماعية (GOSI)
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

const employeeSchema = new Schema(
  {
    employee_number: { type: String, unique: true }, // EMP-YYYY-XXXX (auto)
    user_id: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    branch_id: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },

    // البيانات الشخصية
    name_ar: { type: String, required: true },
    name_en: String,
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
    emergency_contact: {
      name: String,
      phone: String,
      relation: String,
    },

    // البيانات الوظيفية
    job_title_ar: { type: String, required: true },
    job_title_en: String,
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

// Auto-generate employee_number before save
employeeSchema.pre('save', async function (next) {
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
  next();
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

employeeSchema.set('toJSON', { virtuals: true });
employeeSchema.set('toObject', { virtuals: true });

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

module.exports = mongoose.models.Employee || mongoose.model('Employee', employeeSchema);
