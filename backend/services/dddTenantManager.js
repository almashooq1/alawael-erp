'use strict';

/**
 * DDD Tenant Manager
 * ═══════════════════════════════════════════════════════════════════════
 * Multi-branch tenant isolation, branch hierarchy, tenant-scoped query
 * middleware, and branch-level configuration for the DDD platform.
 *
 * Features:
 *  - Branch (tenant) CRUD with hierarchy (parent/child)
 *  - Tenant-scoped query middleware (auto-inject branchId)
 *  - Cross-branch access control
 *  - Branch-level settings & metadata
 *  - Branch statistics & health dashboard
 *  - Tenant isolation verification
 *
 * @module dddTenantManager
 */

const mongoose = require('mongoose');
const { Router } = require('express');

const model = name => {
  try {
    return mongoose.model(name);
  } catch {
    return null;
  }
};

/* ═══════════════════════════════════════════════════════════════════════
   1. Branch (Tenant) Model
   ═══════════════════════════════════════════════════════════════════════ */
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
function tenantScopeMiddleware(options = {}) {
  const { headerName = 'x-branch-id', required = false } = options;

  return async (req, _res, next) => {
    try {
      const branchId =
        req.headers[headerName] ||
        req.query.branchId ||
        req.user?.branchId ||
        req.user?.defaultBranchId;

      if (!branchId) {
        req.tenantScope = { branchId: null, isolated: false };
        if (required) {
          return _res
            .status(400)
            .json({ success: false, error: 'Branch ID required (x-branch-id header)' });
        }
        return next();
      }

      if (!mongoose.isValidObjectId(branchId)) {
        return _res.status(400).json({ success: false, error: 'Invalid branch ID format' });
      }

      const branch = await DDDBranch.findOne({
        _id: branchId,
        isDeleted: { $ne: true },
        status: 'active',
      }).lean();

      if (!branch) {
        return _res.status(404).json({ success: false, error: 'Branch not found or inactive' });
      }

      /* Check user access if authenticated */
      let access = null;
      if (req.user?._id) {
        access = await checkBranchAccess(req.user._id, branchId);
      }

      req.tenantScope = {
        branchId: branch._id,
        branchCode: branch.code,
        branchName: branch.name,
        isolated: true,
        access,
        settings: branch.settings,
      };

      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Builds a MongoDB query filter scoped to the tenant.
 * Used by DDD services to auto-filter by branch.
 */
function buildTenantQuery(req, baseQuery = {}) {
  if (req.tenantScope?.isolated && req.tenantScope.branchId) {
    return { ...baseQuery, branchId: req.tenantScope.branchId };
  }
  return baseQuery;
}

/* ═══════════════════════════════════════════════════════════════════════
   7. Branch Statistics
   ═══════════════════════════════════════════════════════════════════════ */
async function getBranchStats(branchId) {
  const stats = {};
  const query = { branchId, isDeleted: { $ne: true } };

  for (const modelName of TENANT_SCOPED_MODELS) {
    const Model = model(modelName);
    if (!Model) continue;
    try {
      stats[modelName] = await Model.countDocuments(query);
    } catch {
      stats[modelName] = 0;
    }
  }

  const staffCount = await DDDTenantAccess.countDocuments({
    branchId,
    isActive: true,
    isDeleted: { $ne: true },
  });

  return { branchId, stats, staffCount, modelsCovered: Object.keys(stats).length };
}

async function getTenantDashboard() {
  const branches = await DDDBranch.find({ isDeleted: { $ne: true } }).lean();
  const byStatus = {};
  const byType = {};

  for (const b of branches) {
    byStatus[b.status] = (byStatus[b.status] || 0) + 1;
    byType[b.type] = (byType[b.type] || 0) + 1;
  }

  const totalAccess = await DDDTenantAccess.countDocuments({
    isActive: true,
    isDeleted: { $ne: true },
  });

  return {
    totalBranches: branches.length,
    byStatus,
    byType,
    totalActiveAccess: totalAccess,
    tenantScopedModels: TENANT_SCOPED_MODELS.length,
  };
}

/* ═══════════════════════════════════════════════════════════════════════
   8. Express Router
   ═══════════════════════════════════════════════════════════════════════ */
function createTenantRouter() {
  const router = Router();

  /* Branch CRUD */
  router.post('/tenants/branches', async (req, res) => {
    try {
      const branch = await createBranch(req.body);
      res.status(201).json({ success: true, branch });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  router.get('/tenants/branches', async (req, res) => {
    try {
      const branches = await listBranches(req.query);
      res.json({ success: true, count: branches.length, branches });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.get('/tenants/branches/:id', async (req, res) => {
    try {
      const branch = await getBranch(req.params.id);
      if (!branch) return res.status(404).json({ success: false, error: 'Branch not found' });
      res.json({ success: true, branch });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.put('/tenants/branches/:id', async (req, res) => {
    try {
      const branch = await updateBranch(req.params.id, req.body);
      res.json({ success: true, branch });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  /* Hierarchy */
  router.get('/tenants/branches/:id/hierarchy', async (req, res) => {
    try {
      const tree = await getBranchHierarchy(req.params.id);
      res.json({ success: true, hierarchy: tree });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /* Branch stats */
  router.get('/tenants/branches/:id/stats', async (req, res) => {
    try {
      const stats = await getBranchStats(req.params.id);
      res.json({ success: true, ...stats });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /* Access Management */
  router.post('/tenants/access', async (req, res) => {
    try {
      const { userId, branchId, role, ...opts } = req.body;
      const access = await grantAccess(userId, branchId, role, opts);
      res.status(201).json({ success: true, access });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  router.delete('/tenants/access', async (req, res) => {
    try {
      const { userId, branchId } = req.body;
      const access = await revokeAccess(userId, branchId);
      res.json({ success: true, access });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  router.get('/tenants/user/:userId/branches', async (req, res) => {
    try {
      const branches = await getUserBranches(req.params.userId);
      res.json({ success: true, count: branches.length, branches });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /* Dashboard */
  router.get('/tenants/dashboard', async (_req, res) => {
    try {
      const dashboard = await getTenantDashboard();
      res.json({ success: true, ...dashboard });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /* Scoped models list */
  router.get('/tenants/scoped-models', (_req, res) => {
    res.json({ success: true, models: TENANT_SCOPED_MODELS, count: TENANT_SCOPED_MODELS.length });
  });

  return router;
}

/* ═══════════════════════════════════════════════════════════════════════
   Exports
   ═══════════════════════════════════════════════════════════════════════ */
module.exports = {
  DDDBranch,
  DDDTenantAccess,
  TENANT_SCOPED_MODELS,
  createBranch,
  updateBranch,
  getBranch,
  listBranches,
  getBranchHierarchy,
  grantAccess,
  revokeAccess,
  getUserBranches,
  checkBranchAccess,
  tenantScopeMiddleware,
  buildTenantQuery,
  getBranchStats,
  getTenantDashboard,
  createTenantRouter,
};
