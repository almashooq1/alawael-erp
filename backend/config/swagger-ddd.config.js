/**
 * DDD Swagger/OpenAPI Configuration — توثيق API الدومينات العلاجية
 *
 * Generates OpenAPI 3.0 tags, schemas, and path annotations for
 * all 20 DDD rehabilitation domains.
 *
 * @module config/swagger-ddd
 */

'use strict';

// ═══════════════════════════════════════════════════════════════════════════
//  DDD Tags (one per domain)
// ═══════════════════════════════════════════════════════════════════════════

const DDD_TAGS = [
  {
    name: 'Platform',
    description: 'منصة التأهيل الموحدة — Platform health, version, stats',
  },
  {
    name: 'Beneficiary (Core)',
    description: 'إدارة المستفيدين — Beneficiary CRUD, search, 360° profile',
  },
  {
    name: 'Episodes of Care',
    description: 'حلقات الرعاية — 12-phase episode lifecycle, transitions',
  },
  {
    name: 'Timeline',
    description: 'الخط الزمني — Care timeline events, beneficiary/episode views',
  },
  {
    name: 'Assessments',
    description: 'التقييمات السريرية — Clinical assessments, completion, dashboard',
  },
  {
    name: 'Care Plans',
    description: 'خطط الرعاية الموحدة — Unified care plans, goals, activation',
  },
  {
    name: 'Sessions',
    description: 'الجلسات السريرية — Clinical sessions, therapist/beneficiary views',
  },
  {
    name: 'Goals & Measures',
    description: 'الأهداف والمقاييس — Therapeutic goals, standard measures, scoring',
  },
  {
    name: 'Workflow',
    description: 'سير العمل — Task management, state machine, overdue tracking',
  },
  {
    name: 'Programs',
    description: 'البرامج — Program management, enrollment, recommendations',
  },
  {
    name: 'AI Recommendations',
    description: 'التوصيات الذكية — Risk scoring, AI-generated recommendations',
  },
  {
    name: 'Quality',
    description: 'الجودة والامتثال — Quality audits, corrective actions, compliance',
  },
  {
    name: 'Family',
    description: 'التواصل الأسري — Family members, communication, portal',
  },
  {
    name: 'Reports',
    description: 'التقارير — Report templates, generation, download',
  },
  {
    name: 'Group Therapy',
    description: 'العلاج الجماعي — Groups, members, group sessions',
  },
  {
    name: 'Tele-Rehabilitation',
    description: 'التأهيل عن بُعد — Tele-sessions, quality, satisfaction',
  },
  {
    name: 'AR/VR Rehabilitation',
    description: 'تأهيل الواقع المعزز/الافتراضي — AR/VR sessions, safety, progress',
  },
  {
    name: 'Behavior Management',
    description: 'إدارة السلوك — Behavior records, plans, analytics',
  },
  {
    name: 'Research',
    description: 'البحث السريري — Research studies, participants, consent',
  },
  {
    name: 'Field Training',
    description: 'التدريب الميداني — Programs, trainees, evaluations, competencies',
  },
  {
    name: 'Dashboards',
    description: 'لوحات القيادة — KPIs, decision alerts, executive dashboard',
  },
];

// ═══════════════════════════════════════════════════════════════════════════
//  DDD Schemas (reusable OpenAPI components)
// ═══════════════════════════════════════════════════════════════════════════

const DDD_SCHEMAS = {
  Beneficiary: {
    type: 'object',
    required: ['firstName', 'lastName'],
    properties: {
      _id: { type: 'string', format: 'ObjectId' },
      mrn: { type: 'string', description: 'Medical Record Number' },
      nationalId: { type: 'string' },
      firstName: { type: 'string' },
      lastName: { type: 'string' },
      dateOfBirth: { type: 'string', format: 'date' },
      gender: { type: 'string', enum: ['male', 'female'] },
      disabilityType: { type: 'string' },
      disabilityLevel: { type: 'string', enum: ['mild', 'moderate', 'severe', 'profound'] },
      status: { type: 'string', enum: ['active', 'inactive', 'discharged'], default: 'active' },
      guardianInfo: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          phone: { type: 'string' },
          relation: { type: 'string' },
        },
      },
    },
  },

  EpisodeOfCare: {
    type: 'object',
    required: ['beneficiary'],
    properties: {
      _id: { type: 'string', format: 'ObjectId' },
      beneficiary: { type: 'string', format: 'ObjectId' },
      phase: {
        type: 'string',
        enum: [
          'referral',
          'screening',
          'intake',
          'assessment',
          'planning',
          'active-treatment',
          'review',
          'transition',
          'discharge-planning',
          'discharge',
          'follow-up',
          'closed',
        ],
        default: 'referral',
      },
      status: { type: 'string', enum: ['active', 'completed', 'cancelled'] },
      startDate: { type: 'string', format: 'date-time' },
      endDate: { type: 'string', format: 'date-time' },
    },
  },

  ClinicalSession: {
    type: 'object',
    properties: {
      _id: { type: 'string', format: 'ObjectId' },
      beneficiary: { type: 'string', format: 'ObjectId' },
      episode: { type: 'string', format: 'ObjectId' },
      therapist: { type: 'string', format: 'ObjectId' },
      sessionType: {
        type: 'string',
        enum: ['individual', 'group', 'family', 'tele-rehab', 'ar-vr', 'assessment', 'follow-up'],
      },
      status: {
        type: 'string',
        enum: ['scheduled', 'in-progress', 'completed', 'cancelled', 'no-show'],
      },
      scheduledDate: { type: 'string', format: 'date-time' },
      duration: { type: 'number', description: 'Duration in minutes' },
    },
  },

  TherapeuticGoal: {
    type: 'object',
    properties: {
      _id: { type: 'string', format: 'ObjectId' },
      beneficiary: { type: 'string', format: 'ObjectId' },
      episode: { type: 'string', format: 'ObjectId' },
      title: { type: 'string' },
      goalType: { type: 'string' },
      status: { type: 'string', enum: ['pending', 'in-progress', 'achieved', 'discontinued'] },
      targetDate: { type: 'string', format: 'date' },
      progress: { type: 'number', minimum: 0, maximum: 100 },
    },
  },

  WorkflowTask: {
    type: 'object',
    properties: {
      _id: { type: 'string', format: 'ObjectId' },
      title: { type: 'string' },
      taskType: { type: 'string' },
      status: { type: 'string', enum: ['pending', 'in-progress', 'completed', 'cancelled'] },
      priority: { type: 'string', enum: ['low', 'normal', 'high', 'urgent'] },
      assignee: { type: 'string', format: 'ObjectId' },
      dueDate: { type: 'string', format: 'date-time' },
    },
  },

  Recommendation: {
    type: 'object',
    properties: {
      _id: { type: 'string', format: 'ObjectId' },
      beneficiary: { type: 'string', format: 'ObjectId' },
      ruleId: { type: 'string' },
      type: { type: 'string' },
      title: { type: 'string' },
      priority: { type: 'string', enum: ['low', 'normal', 'high', 'urgent'] },
      confidence: { type: 'number', minimum: 0, maximum: 1 },
      status: { type: 'string', enum: ['pending', 'accepted', 'rejected', 'implemented'] },
    },
  },

  QualityAudit: {
    type: 'object',
    properties: {
      _id: { type: 'string', format: 'ObjectId' },
      auditType: { type: 'string' },
      auditor: { type: 'string', format: 'ObjectId' },
      score: { type: 'number', minimum: 0, maximum: 100 },
      status: { type: 'string', enum: ['planned', 'in-progress', 'completed'] },
      findings: { type: 'array', items: { type: 'object' } },
    },
  },

  KPISnapshot: {
    type: 'object',
    properties: {
      _id: { type: 'string', format: 'ObjectId' },
      kpiId: { type: 'string' },
      value: { type: 'number' },
      period: { type: 'string', enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'] },
      periodStart: { type: 'string', format: 'date-time' },
      periodEnd: { type: 'string', format: 'date-time' },
    },
  },

  DecisionAlert: {
    type: 'object',
    properties: {
      _id: { type: 'string', format: 'ObjectId' },
      title: { type: 'string' },
      level: { type: 'string', enum: ['info', 'warning', 'critical'] },
      rule: { type: 'string' },
      domain: { type: 'string' },
      kpiValue: { type: 'number' },
      threshold: { type: 'number' },
      acknowledged: { type: 'boolean', default: false },
    },
  },

  PaginatedResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      data: { type: 'array', items: { type: 'object' } },
      meta: {
        type: 'object',
        properties: {
          page: { type: 'number' },
          limit: { type: 'number' },
          total: { type: 'number' },
          totalPages: { type: 'number' },
        },
      },
    },
  },

  ErrorResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: false },
      message: { type: 'string' },
      message_en: { type: 'string' },
      errors: { type: 'array', items: { type: 'object' } },
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════════
//  Merge with existing Swagger config
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Inject DDD tags and schemas into an existing swagger spec object
 * @param {object} swaggerSpec - swagger-jsdoc generated spec
 * @returns {object} Enriched spec
 */
function enrichSwaggerWithDDD(swaggerSpec) {
  if (!swaggerSpec) return swaggerSpec;

  // Merge tags
  if (!swaggerSpec.tags) swaggerSpec.tags = [];
  const existingNames = new Set(swaggerSpec.tags.map(t => t.name));
  for (const tag of DDD_TAGS) {
    if (!existingNames.has(tag.name)) {
      swaggerSpec.tags.push(tag);
    }
  }

  // Merge schemas
  if (!swaggerSpec.components) swaggerSpec.components = {};
  if (!swaggerSpec.components.schemas) swaggerSpec.components.schemas = {};
  for (const [name, schema] of Object.entries(DDD_SCHEMAS)) {
    if (!swaggerSpec.components.schemas[name]) {
      swaggerSpec.components.schemas[name] = schema;
    }
  }

  return swaggerSpec;
}

/**
 * Get DDD-specific swagger options to merge with the main swagger config
 */
function getDDDSwaggerPaths() {
  return {
    // Platform
    '/api/v1/platform/health': {
      get: {
        tags: ['Platform'],
        summary: 'Platform health check',
        description: 'فحص صحة المنصة — Full health including DB, domains, models, memory',
        responses: {
          200: { description: 'Platform health status' },
        },
      },
    },
    '/api/v1/platform/domains': {
      get: {
        tags: ['Platform'],
        summary: 'List all domains',
        description: 'قائمة جميع الدومينات — All 20 DDD domains with endpoints',
        responses: {
          200: { description: 'Domain list' },
        },
      },
    },
    '/api/v1/platform/stats': {
      get: {
        tags: ['Platform'],
        summary: 'Platform statistics',
        description: 'إحصائيات المنصة — Document counts per collection',
        responses: {
          200: { description: 'Platform stats' },
        },
      },
    },
    '/api/v1/platform/version': {
      get: {
        tags: ['Platform'],
        summary: 'Platform version info',
        description: 'معلومات الإصدار — Version, features, build date',
        responses: {
          200: { description: 'Version info' },
        },
      },
    },
  };
}

module.exports = {
  DDD_TAGS,
  DDD_SCHEMAS,
  enrichSwaggerWithDDD,
  getDDDSwaggerPaths,
};
