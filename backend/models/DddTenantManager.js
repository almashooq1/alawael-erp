'use strict';
/**
 * DddTenantManager Model
 * Auto-extracted from services/dddTenantManager.js
 */
const mongoose = require('mongoose');

const branchSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true },
    nameAr: { type: String },
    type: {
      type: String,
      enum: ['headquarters', 'regional', 'center', 'satellite', 'mobile-unit'],
      default: 'center',
    },
    parentBranchId: { type: mongoose.Schema.Types.ObjectId, ref: 'DDDBranch', default: null },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended', 'pending'],
      default: 'active',
      index: true,
    },

    /* Contact / Location */
    address: {
      street: String,
      city: String,
      region: String,
      postalCode: String,
      country: { type: String, default: 'SA' },
      coordinates: { lat: Number, lng: Number },
    },
    contactInfo: {
      phone: String,
      email: String,
      fax: String,
      website: String,
    },

    /* Operational settings */
    settings: {
      timezone: { type: String, default: 'Asia/Riyadh' },
      locale: { type: String, default: 'ar-SA' },
      currency: { type: String, default: 'SAR' },
      workingDays: { type: [String], default: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu'] },
      workingHours: {
        start: { type: String, default: '08:00' },
        end: { type: String, default: '16:00' },
      },
      maxCapacity: { type: Number, default: 100 },
      enabledModules: {
        type: [String],
        default: [
          'core',
          'episodes',
          'assessments',
          'sessions',
          'care-plans',
          'goals',
          'behavior',
          'family',
          'quality',
          'reports',
        ],
      },
    },

    /* Licensing */
    license: {
      type: {
        type: String,
        enum: ['basic', 'standard', 'professional', 'enterprise'],
        default: 'standard',
      },
      maxBeneficiaries: { type: Number, default: 500 },
      maxStaff: { type: Number, default: 50 },
      expiresAt: Date,
    },

    /* Metadata */
    managerId: { type: mongoose.Schema.Types.ObjectId },
    tags: [String],
    metadata: mongoose.Schema.Types.Mixed,
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

branchSchema.index({ code: 1 }, { unique: true });
branchSchema.index({ parentBranchId: 1, status: 1 });
branchSchema.index({ 'address.region': 1, status: 1 });

const DDDBranch = mongoose.models.DDDBranch || mongoose.model('DDDBranch', branchSchema);

/* ═══════════════════════════════════════════════════════════════════════
   2. Tenant Context Model (tracks active tenant scopes)
   ═══════════════════════════════════════════════════════════════════════ */
const tenantAccessSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'DDDBranch', required: true },
    role: {
      type: String,
      enum: ['admin', 'manager', 'clinician', 'viewer', 'auditor'],
      default: 'viewer',
    },
    accessLevel: {
      type: String,
      enum: ['full', 'read-only', 'department-only', 'own-records'],
      default: 'read-only',
    },
    departments: [String],
    grantedBy: { type: mongoose.Schema.Types.ObjectId },
    grantedAt: { type: Date, default: Date.now },
    expiresAt: Date,
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

tenantAccessSchema.index({ userId: 1, branchId: 1 }, { unique: true });

const DDDTenantAccess =
  mongoose.models.DDDTenantAccess || mongoose.model('DDDTenantAccess', tenantAccessSchema);

/* ═══════════════════════════════════════════════════════════════════════
   3. DDD Models that support branch scoping
   ═══════════════════════════════════════════════════════════════════════ */
const TENANT_SCOPED_MODELS = [
  'Beneficiary',
  'EpisodeOfCare',
  'ClinicalAssessment',
  'ClinicalSession',
  'UnifiedCarePlan',
  'TherapeuticGoal',
  'BehaviorRecord',
  'BehaviorPlan',
  'FamilyMember',
  'FamilyCommunication',
  'TeleSession',
  'ARVRSession',
  'TherapyGroup',
  'GroupSession',
  'WorkflowTask',
  'QualityAudit',
  'Program',
  'ProgramEnrollment',
  'ResearchStudy',
  'TrainingProgram',
  'TraineeRecord',
];

/* ═══════════════════════════════════════════════════════════════════════
   4. Branch CRUD Operations
   ═══════════════════════════════════════════════════════════════════════ */
async function createBranch(data) {
  if (data.parentBranchId) {
    const parent = await DDDBranch.findById(data.parentBranchId);
    if (!parent) throw new Error('Parent branch not found');
  }
  return DDDBranch.create(data);
}

async function updateBranch(branchId, updates) {
  return DDDBranch.findByIdAndUpdate(branchId, { $set: updates }, { new: true }).lean();
}

async function getBranch(branchId) {
  return DDDBranch.findOne({ _id: branchId, isDeleted: { $ne: true } }).lean();
}

async function listBranches(filter = {}) {
  const query = { isDeleted: { $ne: true } };
  if (filter.status) query.status = filter.status;
  if (filter.type) query.type = filter.type;
  if (filter.region) query['address.region'] = filter.region;
  if (filter.parentBranchId) query.parentBranchId = filter.parentBranchId;
  return DDDBranch.find(query).sort({ code: 1 }).lean();
}

async function getBranchHierarchy(rootBranchId) {
  const root = await DDDBranch.findById(rootBranchId).lean();
  if (!root) return null;

  const children = await DDDBranch.find({
    parentBranchId: rootBranchId,
    isDeleted: { $ne: true },
  }).lean();

  const childHierarchies = await Promise.all(children.map(child => getBranchHierarchy(child._id)));

  return { ...root, children: childHierarchies.filter(Boolean) };
}

/* ═══════════════════════════════════════════════════════════════════════
   5. Tenant Access Management
   ═══════════════════════════════════════════════════════════════════════ */
async function grantAccess(userId, branchId, role, options = {}) {
  return DDDTenantAccess.findOneAndUpdate(
    { userId, branchId },
    {
      $set: {
        role,
        accessLevel: options.accessLevel || 'read-only',
        departments: options.departments || [],
        grantedBy: options.grantedBy,
        expiresAt: options.expiresAt,
        isActive: true,
      },
    },
    { upsert: true, new: true }
  ).lean();
}

async function revokeAccess(userId, branchId) {
  return DDDTenantAccess.findOneAndUpdate(
    { userId, branchId },
    { $set: { isActive: false } },
    { new: true }
  ).lean();
}

async function getUserBranches(userId) {
  const access = await DDDTenantAccess.find({
    userId,
    isActive: true,
    isDeleted: { $ne: true },
  }).lean();

  const branchIds = access.map(a => a.branchId);
  const branches = await DDDBranch.find({
    _id: { $in: branchIds },
    isDeleted: { $ne: true },
  }).lean();

  return access.map(a => ({
    ...a,
    branch: branches.find(b => String(b._id) === String(a.branchId)),
  }));
}

async function checkBranchAccess(userId, branchId) {
  const access = await DDDTenantAccess.findOne({
    userId,
    branchId,
    isActive: true,
    isDeleted: { $ne: true },
  }).lean();
  return access;
}

/* ═══════════════════════════════════════════════════════════════════════
   6. Tenant Scope Middleware
   ═══════════════════════════════════════════════════════════════════════ */

/**
 * Express middleware that extracts branchId from header/query/user
 * and attaches it to req.tenantScope for downstream use.
 */

module.exports = {
  DDDBranch,
  DDDTenantAccess,
};
