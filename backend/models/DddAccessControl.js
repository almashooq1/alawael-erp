'use strict';
/**
 * DddAccessControl Model
 * Auto-extracted from services/dddAccessControl.js
 */
const mongoose = require('mongoose');

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

module.exports = {
  DDDAccessPolicy,
  DDDPermissionMatrix,
  DDDAccessLog,
};
