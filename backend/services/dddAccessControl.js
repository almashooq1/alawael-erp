'use strict';

/**
 * DDD Access Control (ABAC)
 * ═══════════════════════════════════════════════════════════════════════
 * Attribute-Based Access Control engine with policy definitions,
 * permission matrix, dynamic evaluation, and compliance reporting.
 *
 * Features:
 *  - ABAC policy engine (subject + resource + action + environment)
 *  - Permission matrix management
 *  - Dynamic policy evaluation
 *  - Role-to-permission mapping
 *  - Domain-scoped access rules
 *  - Access decision logging
 *  - Policy simulation / dry-run
 *  - Access control dashboard
 *
 * @module dddAccessControl
 */

const mongoose = require('mongoose');
const { Router } = require('express');

/* ═══════════════════════════════════════════════════════════════════════
   1. Models
   ═══════════════════════════════════════════════════════════════════════ */

/* ── Access Policy ── */
const accessPolicySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    nameAr: String,
    description: String,
    descriptionAr: String,

    /* Policy rule */
    effect: { type: String, enum: ['allow', 'deny'], default: 'allow' },
    priority: { type: Number, default: 50 },

    /* Subject conditions (who) */
    subject: {
      roles: [String],
      departments: [String],
      specializations: [String],
      attributes: mongoose.Schema.Types.Mixed,
    },

    /* Resource conditions (what) */
    resource: {
      domains: [String],
      models: [String],
      fields: [String],
      classifications: [String],
    },

    /* Action conditions (how) */
    actions: [
      {
        type: String,
        enum: [
          'create',
          'read',
          'update',
          'delete',
          'export',
          'approve',
          'assign',
          'transfer',
          'archive',
          'execute',
        ],
      },
    ],

    /* Environment conditions (when/where) */
    environment: {
      timeRestrictions: {
        allowedHours: { start: Number, end: Number },
        allowedDays: [Number],
      },
      ipRestrictions: [String],
      branchRestrictions: [{ type: mongoose.Schema.Types.ObjectId }],
      requireMFA: { type: Boolean, default: false },
    },

    enabled: { type: Boolean, default: true },
    domain: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId },
    metadata: mongoose.Schema.Types.Mixed,
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

accessPolicySchema.index({ enabled: 1, priority: -1 });
accessPolicySchema.index({ 'subject.roles': 1 });
accessPolicySchema.index({ 'resource.domains': 1 });

const DDDAccessPolicy =
  mongoose.models.DDDAccessPolicy || mongoose.model('DDDAccessPolicy', accessPolicySchema);

/* ── Permission Matrix ── */
const permissionMatrixSchema = new mongoose.Schema(
  {
    role: { type: String, required: true },
    domain: { type: String, required: true },
    permissions: {
      create: { type: Boolean, default: false },
      read: { type: Boolean, default: false },
      update: { type: Boolean, default: false },
      delete: { type: Boolean, default: false },
      export: { type: Boolean, default: false },
      approve: { type: Boolean, default: false },
      assign: { type: Boolean, default: false },
      transfer: { type: Boolean, default: false },
      archive: { type: Boolean, default: false },
      execute: { type: Boolean, default: false },
    },
    fieldRestrictions: [
      {
        field: String,
        action: { type: String, enum: ['read', 'update'] },
        allowed: { type: Boolean, default: true },
      },
    ],
    enabled: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

permissionMatrixSchema.index({ role: 1, domain: 1 }, { unique: true });

const DDDPermissionMatrix =
  mongoose.models.DDDPermissionMatrix ||
  mongoose.model('DDDPermissionMatrix', permissionMatrixSchema);

/* ── Access Decision Log ── */
const accessLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, index: true },
    role: String,
    action: String,
    domain: String,
    resource: String,
    decision: { type: String, enum: ['allow', 'deny'], required: true },
    policyName: String,
    reason: String,
    ip: String,
    dryRun: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

accessLogSchema.index({ decision: 1, createdAt: -1 });
accessLogSchema.index({ userId: 1, createdAt: -1 });

const DDDAccessLog =
  mongoose.models.DDDAccessLog || mongoose.model('DDDAccessLog', accessLogSchema);

/* ═══════════════════════════════════════════════════════════════════════
   2. ABAC Attributes & Constants
   ═══════════════════════════════════════════════════════════════════════ */
const ABAC_ATTRIBUTES = {
  subject: ['role', 'department', 'specialization', 'seniority', 'branchId', 'mfaVerified'],
  resource: ['domain', 'model', 'classification', 'owner', 'branchId'],
  action: [
    'create',
    'read',
    'update',
    'delete',
    'export',
    'approve',
    'assign',
    'transfer',
    'archive',
    'execute',
  ],
  environment: ['time', 'dayOfWeek', 'ip', 'deviceType', 'location'],
};

const ROLES = [
  'superadmin',
  'admin',
  'branch-manager',
  'clinical-director',
  'specialist',
  'therapist',
  'assistant',
  'researcher',
  'trainer',
  'quality-officer',
  'receptionist',
  'data-entry',
  'family-member',
  'external-auditor',
  'api-consumer',
];

const DOMAINS = [
  'core',
  'episodes',
  'assessments',
  'care-plans',
  'sessions',
  'goals',
  'workflow',
  'programs',
  'quality',
  'family',
  'reports',
  'group-therapy',
  'tele-rehab',
  'ar-vr',
  'behavior',
  'research',
  'field-training',
  'dashboards',
  'admin',
  'security',
];

/* ═══════════════════════════════════════════════════════════════════════
   3. Builtin ABAC Policies
   ═══════════════════════════════════════════════════════════════════════ */
const BUILTIN_ABAC_POLICIES = [
  {
    name: 'superadmin-full-access',
    nameAr: 'صلاحيات كاملة للمدير العام',
    effect: 'allow',
    priority: 100,
    subject: { roles: ['superadmin'] },
    resource: { domains: ['*'] },
    actions: [
      'create',
      'read',
      'update',
      'delete',
      'export',
      'approve',
      'assign',
      'transfer',
      'archive',
      'execute',
    ],
  },
  {
    name: 'specialist-clinical-rw',
    nameAr: 'قراءة وكتابة سريرية للأخصائي',
    effect: 'allow',
    priority: 80,
    subject: { roles: ['specialist', 'therapist'] },
    resource: { domains: ['sessions', 'assessments', 'care-plans', 'goals'] },
    actions: ['create', 'read', 'update'],
  },
  {
    name: 'family-read-only',
    nameAr: 'قراءة فقط لأفراد الأسرة',
    effect: 'allow',
    priority: 30,
    subject: { roles: ['family-member'] },
    resource: { domains: ['sessions', 'care-plans', 'goals'] },
    actions: ['read'],
  },
  {
    name: 'researcher-anonymized',
    nameAr: 'بيانات مجهولة للباحث',
    effect: 'allow',
    priority: 50,
    subject: { roles: ['researcher'] },
    resource: { domains: ['research', 'assessments'], classifications: ['internal'] },
    actions: ['read', 'export'],
  },
  {
    name: 'quality-auditor',
    nameAr: 'صلاحيات مراجع الجودة',
    effect: 'allow',
    priority: 60,
    subject: { roles: ['quality-officer', 'external-auditor'] },
    resource: { domains: ['quality'] },
    actions: ['read', 'create', 'approve'],
  },
  {
    name: 'admin-user-mgmt',
    nameAr: 'إدارة المستخدمين للمدير',
    effect: 'allow',
    priority: 90,
    subject: { roles: ['admin', 'branch-manager'] },
    resource: { domains: ['admin', 'core'] },
    actions: ['create', 'read', 'update', 'assign'],
  },
  {
    name: 'block-delete-clinical',
    nameAr: 'منع حذف البيانات السريرية',
    effect: 'deny',
    priority: 95,
    subject: { roles: ['specialist', 'therapist', 'assistant'] },
    resource: { domains: ['sessions', 'assessments', 'care-plans'] },
    actions: ['delete'],
  },
  {
    name: 'receptionist-registration',
    nameAr: 'تسجيل المستفيدين للاستقبال',
    effect: 'allow',
    priority: 40,
    subject: { roles: ['receptionist', 'data-entry'] },
    resource: { domains: ['core', 'episodes'] },
    actions: ['create', 'read', 'update'],
  },
  {
    name: 'trainer-field-training',
    nameAr: 'صلاحيات المدرب الميداني',
    effect: 'allow',
    priority: 50,
    subject: { roles: ['trainer'] },
    resource: { domains: ['field-training'] },
    actions: ['create', 'read', 'update', 'approve'],
  },
  {
    name: 'deny-export-restricted',
    nameAr: 'منع تصدير البيانات المقيدة',
    effect: 'deny',
    priority: 99,
    subject: { roles: ['*'] },
    resource: { classifications: ['restricted'] },
    actions: ['export'],
  },
  {
    name: 'branch-manager-reports',
    nameAr: 'تقارير مدير الفرع',
    effect: 'allow',
    priority: 70,
    subject: { roles: ['branch-manager', 'clinical-director'] },
    resource: { domains: ['reports', 'dashboards'] },
    actions: ['read', 'create', 'export'],
  },
  {
    name: 'api-consumer-read',
    nameAr: 'قراءة فقط لمستهلك API',
    effect: 'allow',
    priority: 20,
    subject: { roles: ['api-consumer'] },
    resource: { domains: ['core', 'sessions'] },
    actions: ['read'],
  },
];

/* ═══════════════════════════════════════════════════════════════════════
   4. Policy Evaluation Engine
   ═══════════════════════════════════════════════════════════════════════ */
function matchesSubject(policy, subject) {
  if (!policy.subject) return true;
  if (policy.subject.roles?.length) {
    if (policy.subject.roles.includes('*')) return true;
    if (!policy.subject.roles.includes(subject.role)) return false;
  }
  if (
    policy.subject.departments?.length &&
    !policy.subject.departments.includes(subject.department)
  )
    return false;
  if (
    policy.subject.specializations?.length &&
    !policy.subject.specializations.includes(subject.specialization)
  )
    return false;
  return true;
}

function matchesResource(policy, resource) {
  if (!policy.resource) return true;
  if (policy.resource.domains?.length) {
    if (
      !policy.resource.domains.includes('*') &&
      !policy.resource.domains.includes(resource.domain)
    )
      return false;
  }
  if (policy.resource.models?.length && !policy.resource.models.includes(resource.model))
    return false;
  if (
    policy.resource.classifications?.length &&
    !policy.resource.classifications.includes(resource.classification)
  )
    return false;
  return true;
}

function matchesAction(policy, action) {
  if (!policy.actions?.length) return true;
  return policy.actions.includes(action);
}

function matchesEnvironment(policy, env) {
  if (!policy.environment) return true;
  const timeRestrict = policy.environment.timeRestrictions;
  if (timeRestrict?.allowedHours) {
    const hour = env.hour ?? new Date().getHours();
    if (hour < timeRestrict.allowedHours.start || hour > timeRestrict.allowedHours.end)
      return false;
  }
  if (timeRestrict?.allowedDays?.length) {
    const day = env.dayOfWeek ?? new Date().getDay();
    if (!timeRestrict.allowedDays.includes(day)) return false;
  }
  if (policy.environment.requireMFA && !env.mfaVerified) return false;
  return true;
}

/**
 * Evaluate access: returns { allowed, policy, reason }
 */
function evaluateAccess(request, policies) {
  const { subject, resource, action, environment = {} } = request;

  const sorted = [...policies]
    .filter(p => p.enabled !== false)
    .sort((a, b) => (b.priority || 0) - (a.priority || 0));

  for (const policy of sorted) {
    if (
      matchesSubject(policy, subject) &&
      matchesResource(policy, resource) &&
      matchesAction(policy, action) &&
      matchesEnvironment(policy, environment)
    ) {
      return {
        allowed: policy.effect === 'allow',
        policy: policy.name,
        effect: policy.effect,
        reason: `Policy "${policy.name}" (priority: ${policy.priority}) — ${policy.effect}`,
      };
    }
  }

  return { allowed: false, policy: null, reason: 'No matching policy found — default deny' };
}

async function evaluateAccessWithDB(request) {
  const dbPolicies = await DDDAccessPolicy.find({ enabled: true, isDeleted: { $ne: true } }).lean();
  const allPolicies = [...BUILTIN_ABAC_POLICIES, ...dbPolicies];
  const result = evaluateAccess(request, allPolicies);

  /* Log decision */
  await DDDAccessLog.create({
    userId: request.subject?.userId,
    role: request.subject?.role,
    action: request.action,
    domain: request.resource?.domain,
    resource: request.resource?.model,
    decision: result.allowed ? 'allow' : 'deny',
    policyName: result.policy,
    reason: result.reason,
    ip: request.environment?.ip,
    dryRun: request.dryRun || false,
  }).catch(() => {});

  return result;
}

/* ═══════════════════════════════════════════════════════════════════════
   5. ABAC Middleware
   ═══════════════════════════════════════════════════════════════════════ */
function abacMiddleware(resourceDomain, action) {
  return async (req, res, next) => {
    const subject = {
      userId: req.user?._id,
      role: req.user?.role || req.user?.roleName || 'guest',
      department: req.user?.department,
      specialization: req.user?.specialization,
    };
    const resource = { domain: resourceDomain, classification: 'internal' };
    const environment = { ip: req.ip, mfaVerified: req.user?.mfaVerified };

    const result = await evaluateAccessWithDB({ subject, resource, action, environment });

    if (!result.allowed) {
      return res.status(403).json({
        success: false,
        error: 'Access denied by policy',
        policy: result.policy,
        reason: result.reason,
      });
    }

    req.accessDecision = result;
    next();
  };
}

/* ═══════════════════════════════════════════════════════════════════════
   6. Access Control Dashboard
   ═══════════════════════════════════════════════════════════════════════ */
async function getAccessControlDashboard() {
  const oneDayAgo = new Date(Date.now() - 86400000);

  const [
    totalPolicies,
    totalMatrix,
    totalLogs,
    deniedLast24h,
    byDecision,
    byDomain,
    recentDenials,
  ] = await Promise.all([
    DDDAccessPolicy.countDocuments({ isDeleted: { $ne: true } }),
    DDDPermissionMatrix.countDocuments({ isDeleted: { $ne: true } }),
    DDDAccessLog.countDocuments({ isDeleted: { $ne: true } }),
    DDDAccessLog.countDocuments({ decision: 'deny', createdAt: { $gte: oneDayAgo } }),
    DDDAccessLog.aggregate([
      { $match: { isDeleted: { $ne: true }, createdAt: { $gte: oneDayAgo } } },
      { $group: { _id: '$decision', count: { $sum: 1 } } },
    ]),
    DDDAccessLog.aggregate([
      { $match: { isDeleted: { $ne: true }, createdAt: { $gte: oneDayAgo } } },
      {
        $group: {
          _id: '$domain',
          total: { $sum: 1 },
          denied: { $sum: { $cond: [{ $eq: ['$decision', 'deny'] }, 1, 0] } },
        },
      },
      { $sort: { total: -1 } },
    ]),
    DDDAccessLog.find({ decision: 'deny', isDeleted: { $ne: true } })
      .sort({ createdAt: -1 })
      .limit(15)
      .lean(),
  ]);

  return {
    totalPolicies: totalPolicies + BUILTIN_ABAC_POLICIES.length,
    builtinPolicies: BUILTIN_ABAC_POLICIES.length,
    customPolicies: totalPolicies,
    matrixEntries: totalMatrix,
    totalDecisions: totalLogs,
    deniedLast24h,
    byDecision: byDecision.reduce((m, r) => ({ ...m, [r._id]: r.count }), {}),
    byDomain,
    recentDenials,
    roles: ROLES,
    domains: DOMAINS,
    attributes: ABAC_ATTRIBUTES,
  };
}

/* ═══════════════════════════════════════════════════════════════════════
   7. Router
   ═══════════════════════════════════════════════════════════════════════ */
function createAccessControlRouter() {
  const router = Router();

  router.get('/access-control/dashboard', async (_req, res) => {
    try {
      res.json({ success: true, ...(await getAccessControlDashboard()) });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.get('/access-control/policies', async (req, res) => {
    try {
      const dbPolicies = await DDDAccessPolicy.find({ isDeleted: { $ne: true } })
        .sort({ priority: -1 })
        .lean();
      res.json({ success: true, builtin: BUILTIN_ABAC_POLICIES, custom: dbPolicies });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.post('/access-control/policies', async (req, res) => {
    try {
      const policy = await DDDAccessPolicy.create({ ...req.body, createdBy: req.user?._id });
      res.status(201).json({ success: true, policy });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  router.put('/access-control/policies/:id', async (req, res) => {
    try {
      const policy = await DDDAccessPolicy.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
      }).lean();
      res.json({ success: true, policy });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  router.get('/access-control/matrix', async (req, res) => {
    try {
      const query = { isDeleted: { $ne: true } };
      if (req.query.role) query.role = req.query.role;
      if (req.query.domain) query.domain = req.query.domain;
      const matrix = await DDDPermissionMatrix.find(query).sort({ role: 1, domain: 1 }).lean();
      res.json({ success: true, count: matrix.length, matrix });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.post('/access-control/matrix', async (req, res) => {
    try {
      const entry = await DDDPermissionMatrix.findOneAndUpdate(
        { role: req.body.role, domain: req.body.domain },
        req.body,
        { upsert: true, new: true }
      );
      res.json({ success: true, entry });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  router.post('/access-control/evaluate', async (req, res) => {
    try {
      const result = await evaluateAccessWithDB({ ...req.body, dryRun: req.body.dryRun });
      res.json({ success: true, ...result });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.get('/access-control/logs', async (req, res) => {
    try {
      const query = { isDeleted: { $ne: true } };
      if (req.query.decision) query.decision = req.query.decision;
      if (req.query.domain) query.domain = req.query.domain;
      const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
      const logs = await DDDAccessLog.find(query).sort({ createdAt: -1 }).limit(limit).lean();
      res.json({ success: true, count: logs.length, logs });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.get('/access-control/roles', (_req, res) => {
    res.json({ success: true, roles: ROLES, domains: DOMAINS });
  });

  router.get('/access-control/attributes', (_req, res) => {
    res.json({ success: true, attributes: ABAC_ATTRIBUTES });
  });

  return router;
}

/* ═══════════════════════════════════════════════════════════════════════
   Exports
   ═══════════════════════════════════════════════════════════════════════ */
module.exports = {
  DDDAccessPolicy,
  DDDPermissionMatrix,
  DDDAccessLog,
  ABAC_ATTRIBUTES,
  ROLES,
  DOMAINS,
  BUILTIN_ABAC_POLICIES,
  matchesSubject,
  matchesResource,
  matchesAction,
  matchesEnvironment,
  evaluateAccess,
  evaluateAccessWithDB,
  abacMiddleware,
  getAccessControlDashboard,
  createAccessControlRouter,
};
