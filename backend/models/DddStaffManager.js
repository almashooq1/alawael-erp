'use strict';
/**
 * DddStaffManager — Mongoose Models & Constants
 * Auto-extracted from services/dddStaffManager.js
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

/* ═══════════════════ Constants ═══════════════════ */

const STAFF_TYPES = [
  'therapist',
  'physician',
  'nurse',
  'psychologist',
  'social_worker',
  'speech_therapist',
  'occupational_therapist',
  'physical_therapist',
  'administrator',
  'technician',
  'support_staff',
  'intern',
  'volunteer',
  'consultant',
];

const STAFF_STATUSES = [
  'active',
  'on_leave',
  'suspended',
  'terminated',
  'resigned',
  'retired',
  'probation',
  'training',
  'sabbatical',
  'contract_ended',
];

const DEPARTMENT_TYPES = [
  'clinical',
  'administrative',
  'support',
  'research',
  'training',
  'quality',
  'finance',
  'hr',
  'it',
  'facilities',
  'pharmacy',
  'laboratory',
];

const POSITION_LEVELS = [
  'intern',
  'junior',
  'mid',
  'senior',
  'lead',
  'supervisor',
  'manager',
  'director',
  'head_of_department',
  'vp',
  'c_level',
];

const QUALIFICATION_TYPES = [
  'degree',
  'diploma',
  'certificate',
  'license',
  'board_certification',
  'specialization',
  'fellowship',
  'training_completion',
  'cpr_certified',
  'first_aid',
  'professional_membership',
  'research_credential',
];

const EMPLOYMENT_TYPES = [
  'full_time',
  'part_time',
  'contract',
  'temporary',
  'freelance',
  'internship',
  'volunteer',
  'per_diem',
  'locum',
  'consultant',
];

/* ── Built-in departments ───────────────────────────────────────────────── */
const BUILTIN_DEPARTMENTS = [
  { code: 'DEP-REHAB', name: 'Rehabilitation Services', nameAr: 'خدمات التأهيل', type: 'clinical' },
  { code: 'DEP-PT', name: 'Physical Therapy', nameAr: 'العلاج الطبيعي', type: 'clinical' },
  { code: 'DEP-OT', name: 'Occupational Therapy', nameAr: 'العلاج الوظيفي', type: 'clinical' },
  {
    code: 'DEP-SLP',
    name: 'Speech & Language Pathology',
    nameAr: 'أمراض النطق واللغة',
    type: 'clinical',
  },
  { code: 'DEP-PSY', name: 'Psychology', nameAr: 'علم النفس', type: 'clinical' },
  { code: 'DEP-SW', name: 'Social Work', nameAr: 'الخدمة الاجتماعية', type: 'clinical' },
  { code: 'DEP-ADMIN', name: 'Administration', nameAr: 'الإدارة', type: 'administrative' },
  { code: 'DEP-QA', name: 'Quality Assurance', nameAr: 'ضمان الجودة', type: 'quality' },
  { code: 'DEP-FIN', name: 'Finance', nameAr: 'المالية', type: 'finance' },
  { code: 'DEP-IT', name: 'Information Technology', nameAr: 'تقنية المعلومات', type: 'it' },
];

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  SCHEMAS                                                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */

/* ── Staff Profile ─────────────────────────────────────────────────────── */

/* ═══════════════════ Schemas ═══════════════════ */

const staffProfileSchema = new Schema(
  {
    staffCode: { type: String, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    firstName: { type: String, required: true },
    firstNameAr: { type: String },
    lastName: { type: String, required: true },
    lastNameAr: { type: String },
    email: { type: String, required: true },
    phone: { type: String },
    staffType: { type: String, enum: STAFF_TYPES, required: true },
    status: { type: String, enum: STAFF_STATUSES, default: 'active' },
    departmentId: { type: Schema.Types.ObjectId, ref: 'DDDDepartment' },
    positionId: { type: Schema.Types.ObjectId, ref: 'DDDPosition' },
    employmentType: { type: String, enum: EMPLOYMENT_TYPES, default: 'full_time' },
    hireDate: { type: Date, required: true },
    endDate: { type: Date },
    supervisorId: { type: Schema.Types.ObjectId, ref: 'DDDStaffProfile' },
    specializations: [{ type: String }],
    languages: [{ language: String, proficiency: String }],
    emergencyContact: { name: String, phone: String, relationship: String },
    nationalId: { type: String },
    licenseNumber: { type: String },
    licenseExpiry: { type: Date },
    profilePhoto: { type: String },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

staffProfileSchema.index({ staffType: 1, status: 1 });
staffProfileSchema.index({ departmentId: 1, status: 1 });

const DDDStaffProfile =
  mongoose.models.DDDStaffProfile || mongoose.model('DDDStaffProfile', staffProfileSchema);

/* ── Department ────────────────────────────────────────────────────────── */
const departmentSchema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    nameAr: { type: String },
    type: { type: String, enum: DEPARTMENT_TYPES, required: true },
    parentDeptId: { type: Schema.Types.ObjectId, ref: 'DDDDepartment' },
    headOfDeptId: { type: Schema.Types.ObjectId, ref: 'DDDStaffProfile' },
    description: { type: String },
    isActive: { type: Boolean, default: true },
    budget: { type: Number },
    location: { type: String },
    costCenter: { type: String },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

departmentSchema.index({ type: 1, isActive: 1 });

const DDDDepartment =
  mongoose.models.DDDDepartment || mongoose.model('DDDDepartment', departmentSchema);

/* ── Position ──────────────────────────────────────────────────────────── */
const positionSchema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    titleAr: { type: String },
    level: { type: String, enum: POSITION_LEVELS, required: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'DDDDepartment' },
    description: { type: String },
    responsibilities: [{ type: String }],
    requiredQualifications: [{ type: String }],
    minExperienceYears: { type: Number, default: 0 },
    salaryRangeMin: { type: Number },
    salaryRangeMax: { type: Number },
    maxHeadcount: { type: Number, default: 1 },
    isActive: { type: Boolean, default: true },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

positionSchema.index({ departmentId: 1, level: 1 });

const qualificationSchema = new Schema(
  {
    staffId: { type: Schema.Types.ObjectId, ref: 'DDDStaffProfile', required: true },
    type: { type: String, enum: QUALIFICATION_TYPES, required: true },
    name: { type: String, required: true },
    nameAr: { type: String },
    issuingBody: { type: String, required: true },
    issueDate: { type: Date, required: true },
    expiryDate: { type: Date },
    credentialId: { type: String },
    documentUrl: { type: String },
    verificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'expired', 'revoked'],
      default: 'pending',
    },
    autoRenew: { type: Boolean, default: false },
    notes: { type: String },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

qualificationSchema.index({ staffId: 1, type: 1 });
qualificationSchema.index({ expiryDate: 1 });

const DDDQualification =
  mongoose.models.DDDQualification || mongoose.model('DDDQualification', qualificationSchema);

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  DOMAIN MODULE                                                             */
/* ═══════════════════════════════════════════════════════════════════════════ */


/* ═══════════════════ Models ═══════════════════ */

const DDDPosition = mongoose.models.DDDPosition || mongoose.model('DDDPosition', positionSchema);

/* ── Qualification ─────────────────────────────────────────────────────── */

/* ═══════════════════ Exports ═══════════════════ */
module.exports = {
  STAFF_TYPES,
  STAFF_STATUSES,
  DEPARTMENT_TYPES,
  POSITION_LEVELS,
  QUALIFICATION_TYPES,
  EMPLOYMENT_TYPES,
  BUILTIN_DEPARTMENTS,
  DDDStaffProfile,
  DDDDepartment,
  DDDPosition,
  DDDQualification,
};
