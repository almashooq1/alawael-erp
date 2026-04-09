/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * DDD Staff Manager — Phase 20 · Human Resources & Staff Management
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Staff profiles, departments, positions, qualifications, certifications,
 * and organisational hierarchy for the rehabilitation centre.
 *
 * Aggregates
 *   DDDStaffProfile      — employee / therapist profile
 *   DDDDepartment        — organisational department
 *   DDDPosition          — job position / role definition
 *   DDDQualification     — professional qualifications & certifications
 *
 * Canonical links
 *   userId       → User
 *   departmentId → DDDDepartment
 *   positionId   → DDDPosition
 * ═══════════════════════════════════════════════════════════════════════════════
 */

'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;
const { Router } = require('express');

class BaseDomainModule {
  constructor(name, opts = {}) {
    this.name = name;
    this.opts = opts;
  }
  log(msg) {
    console.log(`[${this.name}] ${msg}`);
  }
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  CONSTANTS                                                                 */
/* ═══════════════════════════════════════════════════════════════════════════ */

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

const DDDPosition = mongoose.models.DDDPosition || mongoose.model('DDDPosition', positionSchema);

/* ── Qualification ─────────────────────────────────────────────────────── */
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

class StaffManager extends BaseDomainModule {
  constructor() {
    super('StaffManager', {
      description: 'Staff profiles, departments, positions & qualifications',
      version: '1.0.0',
    });
  }

  async initialize() {
    await this._seedDepartments();
    this.log('Staff Manager initialised ✓');
    return true;
  }

  async _seedDepartments() {
    for (const d of BUILTIN_DEPARTMENTS) {
      const exists = await DDDDepartment.findOne({ code: d.code }).lean();
      if (!exists) await DDDDepartment.create({ ...d, isActive: true });
    }
  }

  /* ── Staff Profiles ── */
  async listStaff(filters = {}) {
    const q = {};
    if (filters.staffType) q.staffType = filters.staffType;
    if (filters.status) q.status = filters.status;
    if (filters.departmentId) q.departmentId = filters.departmentId;
    if (filters.employmentType) q.employmentType = filters.employmentType;
    return DDDStaffProfile.find(q).sort({ lastName: 1 }).lean();
  }
  async getStaff(id) {
    return DDDStaffProfile.findById(id).lean();
  }
  async getStaffByCode(code) {
    return DDDStaffProfile.findOne({ staffCode: code }).lean();
  }

  async createStaff(data) {
    if (!data.staffCode) data.staffCode = `STF-${Date.now()}`;
    return DDDStaffProfile.create(data);
  }
  async updateStaff(id, data) {
    return DDDStaffProfile.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }
  async deactivateStaff(id, reason) {
    return DDDStaffProfile.findByIdAndUpdate(
      id,
      { status: 'terminated', endDate: new Date() },
      { new: true }
    );
  }

  /* ── Departments ── */
  async listDepartments(filters = {}) {
    const q = {};
    if (filters.type) q.type = filters.type;
    if (filters.isActive !== undefined) q.isActive = filters.isActive;
    return DDDDepartment.find(q).sort({ name: 1 }).lean();
  }
  async getDepartment(id) {
    return DDDDepartment.findById(id).lean();
  }
  async createDepartment(data) {
    return DDDDepartment.create(data);
  }
  async updateDepartment(id, data) {
    return DDDDepartment.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  /* ── Positions ── */
  async listPositions(filters = {}) {
    const q = {};
    if (filters.departmentId) q.departmentId = filters.departmentId;
    if (filters.level) q.level = filters.level;
    if (filters.isActive !== undefined) q.isActive = filters.isActive;
    return DDDPosition.find(q).sort({ level: 1 }).lean();
  }
  async getPosition(id) {
    return DDDPosition.findById(id).lean();
  }
  async createPosition(data) {
    return DDDPosition.create(data);
  }
  async updatePosition(id, data) {
    return DDDPosition.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  /* ── Qualifications ── */
  async listQualifications(staffId) {
    return DDDQualification.find({ staffId }).sort({ issueDate: -1 }).lean();
  }
  async addQualification(data) {
    return DDDQualification.create(data);
  }
  async updateQualification(id, data) {
    return DDDQualification.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }
  async getExpiringQualifications(daysAhead = 30) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);
    return DDDQualification.find({
      expiryDate: { $lte: futureDate, $gte: new Date() },
      verificationStatus: { $ne: 'revoked' },
    })
      .sort({ expiryDate: 1 })
      .lean();
  }

  /* ── Analytics ── */
  async getStaffAnalytics() {
    const [staff, departments, positions, qualifications] = await Promise.all([
      DDDStaffProfile.countDocuments(),
      DDDDepartment.countDocuments(),
      DDDPosition.countDocuments(),
      DDDQualification.countDocuments(),
    ]);
    const activeStaff = await DDDStaffProfile.countDocuments({ status: 'active' });
    const onLeave = await DDDStaffProfile.countDocuments({ status: 'on_leave' });
    return { staff, activeStaff, onLeave, departments, positions, qualifications };
  }

  async healthCheck() {
    const [staff, departments, positions, qualifications] = await Promise.all([
      DDDStaffProfile.countDocuments(),
      DDDDepartment.countDocuments(),
      DDDPosition.countDocuments(),
      DDDQualification.countDocuments(),
    ]);
    return { status: 'healthy', staff, departments, positions, qualifications };
  }
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  ROUTER                                                                    */
/* ═══════════════════════════════════════════════════════════════════════════ */

function createStaffManagerRouter() {
  const router = Router();
  const svc = new StaffManager();

  /* Staff */
  router.get('/staff', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listStaff(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/staff/:id', async (req, res) => {
    try {
      const d = await svc.getStaff(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/staff', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createStaff(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.put('/staff/:id', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateStaff(req.params.id, req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/staff/:id/deactivate', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.deactivateStaff(req.params.id, req.body.reason) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Departments */
  router.get('/departments', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listDepartments(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/departments/:id', async (req, res) => {
    try {
      const d = await svc.getDepartment(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/departments', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createDepartment(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.put('/departments/:id', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateDepartment(req.params.id, req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Positions */
  router.get('/positions', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listPositions(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/positions/:id', async (req, res) => {
    try {
      const d = await svc.getPosition(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/positions', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createPosition(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.put('/positions/:id', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updatePosition(req.params.id, req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Qualifications */
  router.get('/staff/:staffId/qualifications', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listQualifications(req.params.staffId) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/qualifications', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.addQualification(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.put('/qualifications/:id', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateQualification(req.params.id, req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/qualifications/expiring', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.getExpiringQualifications(req.query.daysAhead) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Analytics & Health */
  router.get('/staff/analytics/summary', async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getStaffAnalytics() });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/staff/health', async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.healthCheck() });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  return router;
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  EXPORTS                                                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */

module.exports = {
  StaffManager,
  DDDStaffProfile,
  DDDDepartment,
  DDDPosition,
  DDDQualification,
  STAFF_TYPES,
  STAFF_STATUSES,
  DEPARTMENT_TYPES,
  POSITION_LEVELS,
  QUALIFICATION_TYPES,
  EMPLOYMENT_TYPES,
  BUILTIN_DEPARTMENTS,
  createStaffManagerRouter,
};
