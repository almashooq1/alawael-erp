/**
 * DDD Validation Schemas — قواعد التحقق للدومينات العلاجية
 *
 * Joi schemas for all 20 DDD domains.
 * Validates request body for create/update operations.
 *
 * Usage in routes:
 *   const { dddValidate, schemas } = require('../../middleware/dddValidation.middleware');
 *   router.post('/', dddValidate(schemas.beneficiary.create), controller.create);
 *   router.put('/:id', dddValidate(schemas.beneficiary.update), controller.update);
 *
 * @module middleware/dddValidation
 */

'use strict';

const Joi = require('joi');

// ── Shared field patterns ───────────────────────────────────────────────
const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/);
const dateStr = Joi.date().iso();
const optStr = Joi.string().trim().allow('', null);
const reqStr = Joi.string().trim().min(1).max(500);
const reqStrLong = Joi.string().trim().min(1).max(5000);
const paginationQuery = {
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(200).default(20),
  sort: optStr,
  search: optStr,
};

// ═══════════════════════════════════════════════════════════════════════════
//  1. Core (Beneficiary)
// ═══════════════════════════════════════════════════════════════════════════

const beneficiary = {
  create: Joi.object({
    firstName: reqStr.required(),
    lastName: reqStr.required(),
    mrn: optStr,
    nationalId: optStr,
    dateOfBirth: dateStr,
    gender: Joi.string().valid('male', 'female'),
    disabilityType: optStr,
    disabilityLevel: Joi.string().valid('mild', 'moderate', 'severe', 'profound'),
    status: Joi.string().valid('active', 'inactive', 'discharged').default('active'),
    guardianInfo: Joi.object({
      name: optStr,
      phone: optStr,
      relation: optStr,
      email: Joi.string().email({ tlds: false }).allow('', null),
    }),
    insuranceInfo: Joi.object({
      provider: optStr,
      policyNumber: optStr,
      expiryDate: dateStr,
    }),
    address: Joi.object({
      city: optStr,
      district: optStr,
      street: optStr,
    }),
    contactPhone: optStr,
    emergencyContact: Joi.object({
      name: optStr,
      phone: optStr,
      relation: optStr,
    }),
  }),

  update: Joi.object({
    firstName: optStr,
    lastName: optStr,
    dateOfBirth: dateStr,
    gender: Joi.string().valid('male', 'female'),
    disabilityType: optStr,
    disabilityLevel: Joi.string().valid('mild', 'moderate', 'severe', 'profound'),
    status: Joi.string().valid('active', 'inactive', 'discharged'),
    guardianInfo: Joi.object().unknown(true),
    insuranceInfo: Joi.object().unknown(true),
    address: Joi.object().unknown(true),
    contactPhone: optStr,
    emergencyContact: Joi.object().unknown(true),
  }).min(1),
};

// ═══════════════════════════════════════════════════════════════════════════
//  2. Episodes of Care
// ═══════════════════════════════════════════════════════════════════════════

const PHASES = [
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
];

const episode = {
  create: Joi.object({
    beneficiary: objectId.required(),
    phase: Joi.string()
      .valid(...PHASES)
      .default('referral'),
    referralSource: optStr,
    referralDate: dateStr,
    primaryDiagnosis: optStr,
    notes: optStr,
    assignedTeam: Joi.array().items(objectId),
  }),

  transition: Joi.object({
    toPhase: Joi.string()
      .valid(...PHASES)
      .required(),
    reason: reqStr.required(),
    performedBy: objectId,
  }),
};

// ═══════════════════════════════════════════════════════════════════════════
//  3. Assessments
// ═══════════════════════════════════════════════════════════════════════════

const ASSESSMENT_TYPES = [
  'initial',
  'periodic',
  'discharge',
  'specialized',
  'functional',
  'cognitive',
  'behavioral',
  'developmental',
];

const assessment = {
  create: Joi.object({
    beneficiary: objectId.required(),
    episode: objectId,
    type: Joi.string()
      .valid(...ASSESSMENT_TYPES)
      .required(),
    assessor: objectId,
    scheduledDate: dateStr,
    domains: Joi.array().items(
      Joi.object({
        name: reqStr.required(),
        score: Joi.number().min(0).max(100),
        notes: optStr,
      })
    ),
    tools: Joi.array().items(reqStr),
    notes: optStr,
  }),
};

// ═══════════════════════════════════════════════════════════════════════════
//  4. Care Plans
// ═══════════════════════════════════════════════════════════════════════════

const carePlan = {
  create: Joi.object({
    beneficiary: objectId.required(),
    episode: objectId,
    title: reqStr.required(),
    status: Joi.string().valid('draft', 'active', 'completed', 'cancelled').default('draft'),
    startDate: dateStr,
    endDate: dateStr,
    goals: Joi.array().items(
      Joi.object({
        title: reqStr,
        targetDate: dateStr,
        priority: Joi.string().valid('low', 'normal', 'high'),
      })
    ),
    interventions: Joi.array().items(
      Joi.object({
        description: reqStr,
        frequency: optStr,
        responsible: objectId,
      })
    ),
  }),
};

// ═══════════════════════════════════════════════════════════════════════════
//  5. Sessions
// ═══════════════════════════════════════════════════════════════════════════

const SESSION_TYPES = [
  'individual',
  'group',
  'family',
  'tele-rehab',
  'ar-vr',
  'assessment',
  'follow-up',
];
const SESSION_STATUSES = ['scheduled', 'in-progress', 'completed', 'cancelled', 'no-show'];

const session = {
  create: Joi.object({
    beneficiary: objectId.required(),
    episode: objectId,
    therapist: objectId.required(),
    sessionType: Joi.string()
      .valid(...SESSION_TYPES)
      .required(),
    scheduledDate: dateStr.required(),
    duration: Joi.number().integer().min(5).max(480),
    location: optStr,
    notes: optStr,
    objectives: Joi.array().items(reqStr),
  }),

  update: Joi.object({
    status: Joi.string().valid(...SESSION_STATUSES),
    actualDuration: Joi.number().integer().min(0),
    notes: optStr,
    outcomes: optStr,
    progressNotes: optStr,
    attendance: Joi.string().valid('present', 'absent', 'late', 'cancelled'),
  }).min(1),
};

// ═══════════════════════════════════════════════════════════════════════════
//  6. Goals
// ═══════════════════════════════════════════════════════════════════════════

const goal = {
  create: Joi.object({
    beneficiary: objectId.required(),
    episode: objectId,
    carePlan: objectId,
    title: reqStr.required(),
    description: reqStrLong,
    goalType: optStr,
    targetDate: dateStr,
    priority: Joi.string().valid('low', 'normal', 'high'),
    baseline: Joi.number(),
    target: Joi.number(),
    unit: optStr,
  }),

  progress: Joi.object({
    value: Joi.number().required(),
    notes: optStr,
    recordedBy: objectId,
    recordedAt: dateStr,
  }),
};

// ═══════════════════════════════════════════════════════════════════════════
//  7. Workflow
// ═══════════════════════════════════════════════════════════════════════════

const workflow = {
  create: Joi.object({
    title: reqStr.required(),
    titleEn: optStr,
    beneficiary: objectId,
    episode: objectId,
    taskType: reqStr.required(),
    priority: Joi.string().valid('low', 'normal', 'high', 'urgent').default('normal'),
    assignee: objectId,
    dueDate: dateStr,
    description: reqStrLong,
  }),

  transition: Joi.object({
    toStatus: reqStr.required(),
    reason: optStr,
    performedBy: objectId,
  }),
};

// ═══════════════════════════════════════════════════════════════════════════
//  8. Quality
// ═══════════════════════════════════════════════════════════════════════════

const quality = {
  create: Joi.object({
    auditType: reqStr.required(),
    auditor: objectId.required(),
    scope: optStr,
    scheduledDate: dateStr,
    criteria: Joi.array().items(
      Joi.object({
        name: reqStr,
        weight: Joi.number().min(0).max(100),
      })
    ),
  }),

  finding: Joi.object({
    title: reqStr.required(),
    severity: Joi.string().valid('low', 'medium', 'high', 'critical').required(),
    description: reqStrLong,
    recommendation: optStr,
  }),

  correctiveAction: Joi.object({
    finding: reqStr.required(),
    assignee: objectId.required(),
    dueDate: dateStr.required(),
    description: reqStrLong,
    priority: Joi.string().valid('low', 'normal', 'high', 'urgent'),
  }),
};

// ═══════════════════════════════════════════════════════════════════════════
//  9. Family
// ═══════════════════════════════════════════════════════════════════════════

const family = {
  create: Joi.object({
    beneficiary: objectId.required(),
    name: reqStr.required(),
    relation: reqStr.required(),
    phone: optStr,
    email: Joi.string().email({ tlds: false }).allow('', null),
    isPrimary: Joi.boolean().default(false),
  }),

  communication: Joi.object({
    beneficiary: objectId.required(),
    familyMember: objectId.required(),
    type: Joi.string().valid('call', 'meeting', 'message', 'report', 'notification').required(),
    direction: Joi.string().valid('inbound', 'outbound').default('outbound'),
    subject: reqStr.required(),
    content: reqStrLong,
    channel: Joi.string().valid('phone', 'email', 'in-person', 'app', 'system'),
  }),
};

// ═══════════════════════════════════════════════════════════════════════════
//  10. Behavior
// ═══════════════════════════════════════════════════════════════════════════

const behavior = {
  record: Joi.object({
    beneficiary: objectId.required(),
    behaviorType: reqStr.required(),
    severity: Joi.string().valid('mild', 'moderate', 'severe').required(),
    description: reqStrLong,
    antecedent: optStr,
    consequence: optStr,
    setting: optStr,
    duration: Joi.number().min(0),
    recordedBy: objectId,
  }),

  plan: Joi.object({
    beneficiary: objectId.required(),
    title: reqStr.required(),
    targetBehaviors: Joi.array().items(reqStr).min(1),
    strategies: Joi.array().items(
      Joi.object({
        name: reqStr,
        description: optStr,
        type: Joi.string().valid('prevention', 'intervention', 'reinforcement'),
      })
    ),
    goals: Joi.array().items(optStr),
    reviewDate: dateStr,
  }),
};

// ═══════════════════════════════════════════════════════════════════════════
//  11. Group Therapy, Tele-Rehab, AR/VR
// ═══════════════════════════════════════════════════════════════════════════

const groupTherapy = {
  create: Joi.object({
    name: reqStr.required(),
    description: optStr,
    therapist: objectId.required(),
    maxMembers: Joi.number().integer().min(2).max(30).default(8),
    sessionFrequency: optStr,
    targetPopulation: optStr,
  }),

  addMember: Joi.object({
    beneficiary: objectId.required(),
    joinDate: dateStr,
  }),
};

const teleRehab = {
  create: Joi.object({
    beneficiary: objectId.required(),
    therapist: objectId.required(),
    scheduledDate: dateStr.required(),
    duration: Joi.number().integer().min(10).max(120),
    platform: Joi.string().valid('zoom', 'teams', 'internal', 'other'),
    notes: optStr,
  }),
};

const arVr = {
  create: Joi.object({
    beneficiary: objectId.required(),
    therapist: objectId,
    sessionType: optStr,
    environment: optStr,
    difficultyLevel: Joi.number().integer().min(1).max(10),
    duration: Joi.number().integer().min(5).max(60),
    safetyThresholds: Joi.object({
      heartRate: Joi.number(),
      motionSickness: Joi.number().min(0).max(10),
    }),
  }),
};

// ═══════════════════════════════════════════════════════════════════════════
//  12. Research & Field Training
// ═══════════════════════════════════════════════════════════════════════════

const research = {
  create: Joi.object({
    title: reqStr.required(),
    principalInvestigator: objectId.required(),
    status: Joi.string().valid('planning', 'active', 'completed', 'published').default('planning'),
    description: reqStrLong,
    methodology: optStr,
    startDate: dateStr,
    endDate: dateStr,
    ethicsApproval: optStr,
    targetSampleSize: Joi.number().integer().min(1),
  }),
};

const fieldTraining = {
  program: Joi.object({
    name: reqStr.required(),
    description: reqStrLong,
    duration: Joi.number().integer().min(1).description('Duration in weeks'),
    maxTrainees: Joi.number().integer().min(1).max(50),
    supervisor: objectId,
    competencies: Joi.array().items(
      Joi.object({
        name: reqStr.required(),
        description: optStr,
        requiredHours: Joi.number().min(0),
      })
    ),
  }),

  enroll: Joi.object({
    trainee: objectId.required(),
    startDate: dateStr,
  }),

  evaluate: Joi.object({
    score: Joi.number().min(0).max(100).required(),
    evaluator: objectId.required(),
    competencies: Joi.array().items(
      Joi.object({
        name: reqStr,
        score: Joi.number().min(0).max(100),
        notes: optStr,
      })
    ),
    notes: optStr,
  }),
};

// ═══════════════════════════════════════════════════════════════════════════
//  13. Dashboards
// ═══════════════════════════════════════════════════════════════════════════

const dashboards = {
  config: Joi.object({
    name: reqStr.required(),
    role: optStr,
    layout: Joi.array().items(
      Joi.object({
        widgetId: reqStr,
        position: Joi.object({
          x: Joi.number().integer(),
          y: Joi.number().integer(),
          w: Joi.number().integer(),
          h: Joi.number().integer(),
        }),
      })
    ),
    kpis: Joi.array().items(reqStr),
  }),

  kpi: Joi.object({
    kpiId: reqStr.required(),
    name: reqStr.required(),
    nameAr: optStr,
    domain: reqStr,
    unit: Joi.string().valid('count', 'percentage', 'score', 'days', 'ratio'),
    target: Joi.number(),
    warningThreshold: Joi.number(),
    criticalThreshold: Joi.number(),
    direction: Joi.string().valid('higher-is-better', 'lower-is-better'),
    calculationMethod: Joi.string().valid('count', 'average', 'sum', 'ratio', 'percentage'),
  }),

  snapshot: Joi.object({
    kpiId: reqStr.required(),
    value: Joi.number().required(),
    period: Joi.string().valid('daily', 'weekly', 'monthly', 'quarterly', 'yearly').required(),
    periodStart: dateStr.required(),
    periodEnd: dateStr.required(),
  }),
};

// ═══════════════════════════════════════════════════════════════════════════
//  Validation Middleware Factory
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Express middleware that validates req.body against a Joi schema
 *
 * @param {Joi.Schema} schema
 * @param {object} [options]
 * @param {string} [options.source='body'] - 'body' | 'query' | 'params'
 * @param {boolean} [options.stripUnknown=true]
 * @returns {Function}
 */
function dddValidate(schema, options = {}) {
  const { source = 'body', stripUnknown = true } = options;

  return (req, res, next) => {
    if (!schema) return next();

    const data = req[source];
    const { error, value } = schema.validate(data, {
      abortEarly: false,
      stripUnknown,
      allowUnknown: false,
    });

    if (error) {
      const errors = error.details.map(d => ({
        field: d.path.join('.'),
        message: d.message,
        type: d.type,
      }));

      return res.status(400).json({
        success: false,
        message: 'خطأ في التحقق من البيانات — Validation failed',
        message_en: 'Validation failed',
        errors,
      });
    }

    // Replace with validated/cleaned data
    req[source] = value;
    next();
  };
}

/**
 * Validate query parameters (pagination, filters)
 */
function dddValidateQuery(extraFields = {}) {
  const schema = Joi.object({
    ...paginationQuery,
    ...extraFields,
  }).unknown(true);

  return dddValidate(schema, { source: 'query' });
}

// ═══════════════════════════════════════════════════════════════════════════
//  Export all schemas + middleware
// ═══════════════════════════════════════════════════════════════════════════

const schemas = {
  beneficiary,
  episode,
  assessment,
  carePlan,
  session,
  goal,
  workflow,
  quality,
  family,
  behavior,
  groupTherapy,
  teleRehab,
  arVr,
  research,
  fieldTraining,
  dashboards,
};

module.exports = {
  schemas,
  dddValidate,
  dddValidateQuery,
  objectId,
  PHASES,
  SESSION_TYPES,
  SESSION_STATUSES,
  ASSESSMENT_TYPES,
};
