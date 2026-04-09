/**
 * DDD Workflow Automations — محرك الأتمتة للدومينات العلاجية
 *
 * Rule-based automation engine that reacts to domain events and
 * triggers cross-domain side-effects automatically.
 *
 * Features:
 *  - Declarative automation rules (trigger → conditions → actions)
 *  - Supports all 20 DDD domains
 *  - Auto-creates timeline entries, tasks, alerts, notifications
 *  - Configurable per-organization
 *  - Execution log for audit trail
 *
 * @module integration/dddWorkflowAutomations
 */

'use strict';

const mongoose = require('mongoose');
const logger = require('../utils/logger');

// ═══════════════════════════════════════════════════════════════════════════════
//  Automation Rule Definitions
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Each rule: { id, name, nameAr, trigger: { domain, event },
 *              conditions?, actions: [{ type, params }], enabled }
 */
const AUTOMATION_RULES = [
  // ── Episode lifecycle ─────────────────────────────────────────────────
  {
    id: 'auto-timeline-episode-phase',
    name: 'Auto-create timeline on episode phase change',
    nameAr: 'إنشاء تلقائي لسجل الزمني عند تغيير مرحلة الحلقة',
    trigger: { domain: 'episodes', event: 'updated' },
    conditions: [{ field: 'changes', includes: 'phase' }],
    actions: [
      {
        type: 'create-record',
        model: 'CareTimeline',
        params: {
          beneficiary: '{{doc.beneficiary}}',
          episode: '{{doc._id}}',
          eventType: 'phase_transition',
          title: 'انتقال المرحلة: {{doc.phase}}',
          description: 'Phase transition to {{doc.phase}}',
          occurredAt: '{{now}}',
          source: 'automation',
        },
      },
    ],
    enabled: true,
  },

  // ── Assessment triggers ───────────────────────────────────────────────
  {
    id: 'auto-task-assessment-completed',
    name: 'Create review task when assessment completes',
    nameAr: 'إنشاء مهمة مراجعة عند اكتمال التقييم',
    trigger: { domain: 'assessments', event: 'updated' },
    conditions: [{ field: 'doc.status', equals: 'completed' }],
    actions: [
      {
        type: 'create-record',
        model: 'WorkflowTask',
        params: {
          title: 'مراجعة تقييم المستفيد',
          titleEn: 'Review beneficiary assessment',
          taskType: 'assessment-review',
          priority: 'high',
          beneficiary: '{{doc.beneficiary}}',
          episode: '{{doc.episode}}',
          status: 'pending',
          dueDate: '{{addDays(now, 3)}}',
        },
      },
    ],
    enabled: true,
  },

  // ── Care Plan activation ──────────────────────────────────────────────
  {
    id: 'auto-timeline-careplan-activated',
    name: 'Timeline entry on care plan activation',
    nameAr: 'إدخال زمني عند تفعيل خطة الرعاية',
    trigger: { domain: 'care-plans', event: 'updated' },
    conditions: [{ field: 'doc.status', equals: 'active' }],
    actions: [
      {
        type: 'create-record',
        model: 'CareTimeline',
        params: {
          beneficiary: '{{doc.beneficiary}}',
          episode: '{{doc.episode}}',
          eventType: 'care_plan_activated',
          title: 'تفعيل خطة الرعاية: {{doc.title}}',
          occurredAt: '{{now}}',
          source: 'automation',
        },
      },
    ],
    enabled: true,
  },

  // ── Session completion ────────────────────────────────────────────────
  {
    id: 'auto-timeline-session-completed',
    name: 'Timeline entry on session completion',
    nameAr: 'إدخال زمني عند اكتمال الجلسة',
    trigger: { domain: 'sessions', event: 'updated' },
    conditions: [{ field: 'doc.status', equals: 'completed' }],
    actions: [
      {
        type: 'create-record',
        model: 'CareTimeline',
        params: {
          beneficiary: '{{doc.beneficiary}}',
          episode: '{{doc.episode}}',
          eventType: 'session_completed',
          title: 'اكتمال جلسة {{doc.sessionType}}',
          occurredAt: '{{now}}',
          source: 'automation',
        },
      },
    ],
    enabled: true,
  },

  // ── Risk score alerts ─────────────────────────────────────────────────
  {
    id: 'auto-alert-high-risk',
    name: 'Auto-alert on high clinical risk score',
    nameAr: 'تنبيه تلقائي عند ارتفاع مستوى الخطر السريري',
    trigger: { domain: 'ai-recommendations', event: 'created' },
    conditions: [{ field: 'doc.riskLevel', in: ['high', 'critical'] }],
    actions: [
      {
        type: 'create-record',
        model: 'DecisionAlert',
        params: {
          title: 'تنبيه خطر سريري مرتفع',
          titleEn: 'High clinical risk alert',
          severity: '{{doc.riskLevel}}',
          domain: 'ai-recommendations',
          status: 'active',
          beneficiary: '{{doc.beneficiary}}',
          description: 'Risk score: {{doc.score}} — Level: {{doc.riskLevel}}',
        },
      },
    ],
    enabled: true,
  },

  // ── Quality audit non-compliance ──────────────────────────────────────
  {
    id: 'auto-task-quality-finding',
    name: 'Create corrective action task on critical quality finding',
    nameAr: 'إنشاء إجراء تصحيحي عند نتيجة جودة حرجة',
    trigger: { domain: 'quality', event: 'updated' },
    conditions: [{ field: 'doc.status', equals: 'non-compliant' }],
    actions: [
      {
        type: 'create-record',
        model: 'WorkflowTask',
        params: {
          title: 'إجراء تصحيحي — مراجعة جودة',
          titleEn: 'Corrective action — Quality audit',
          taskType: 'corrective-action',
          priority: 'urgent',
          status: 'pending',
          dueDate: '{{addDays(now, 7)}}',
        },
      },
    ],
    enabled: true,
  },

  // ── Behavior incident ─────────────────────────────────────────────────
  {
    id: 'auto-alert-severe-behavior',
    name: 'Alert on severe behavior incident',
    nameAr: 'تنبيه عند حادثة سلوكية شديدة',
    trigger: { domain: 'behavior', event: 'created' },
    conditions: [{ field: 'doc.severity', equals: 'severe' }],
    actions: [
      {
        type: 'create-record',
        model: 'DecisionAlert',
        params: {
          title: 'حادثة سلوكية شديدة',
          titleEn: 'Severe behavior incident',
          severity: 'high',
          domain: 'behavior',
          status: 'active',
          beneficiary: '{{doc.beneficiary}}',
        },
      },
      {
        type: 'create-record',
        model: 'CareTimeline',
        params: {
          beneficiary: '{{doc.beneficiary}}',
          eventType: 'behavior_incident',
          title: 'حادثة سلوكية: {{doc.behaviorType}} (شديدة)',
          occurredAt: '{{now}}',
          source: 'automation',
        },
      },
    ],
    enabled: true,
  },

  // ── Family communication ──────────────────────────────────────────────
  {
    id: 'auto-timeline-family-communication',
    name: 'Timeline on family communication',
    nameAr: 'إدخال زمني عند التواصل مع الأسرة',
    trigger: { domain: 'family', event: 'created' },
    conditions: [{ field: 'doc.type', in: ['meeting', 'call'] }],
    actions: [
      {
        type: 'create-record',
        model: 'CareTimeline',
        params: {
          beneficiary: '{{doc.beneficiary}}',
          eventType: 'family_communication',
          title: 'تواصل أسري: {{doc.subject}}',
          occurredAt: '{{now}}',
          source: 'automation',
        },
      },
    ],
    enabled: true,
  },

  // ── Goal achievement ──────────────────────────────────────────────────
  {
    id: 'auto-timeline-goal-achieved',
    name: 'Timeline on goal achievement',
    nameAr: 'إدخال زمني عند تحقيق الهدف',
    trigger: { domain: 'goals', event: 'updated' },
    conditions: [{ field: 'doc.status', equals: 'achieved' }],
    actions: [
      {
        type: 'create-record',
        model: 'CareTimeline',
        params: {
          beneficiary: '{{doc.beneficiary}}',
          eventType: 'goal_achieved',
          title: 'تحقيق هدف: {{doc.title}}',
          occurredAt: '{{now}}',
          source: 'automation',
        },
      },
    ],
    enabled: true,
  },

  // ── Discharge ─────────────────────────────────────────────────────────
  {
    id: 'auto-tasks-discharge',
    name: 'Create discharge checklist tasks',
    nameAr: 'إنشاء مهام قائمة التخريج',
    trigger: { domain: 'episodes', event: 'updated' },
    conditions: [{ field: 'doc.phase', equals: 'discharge-planning' }],
    actions: [
      {
        type: 'create-record',
        model: 'WorkflowTask',
        params: {
          title: 'إعداد تقرير التخريج',
          titleEn: 'Prepare discharge report',
          taskType: 'discharge-report',
          priority: 'high',
          beneficiary: '{{doc.beneficiary}}',
          episode: '{{doc._id}}',
          status: 'pending',
          dueDate: '{{addDays(now, 5)}}',
        },
      },
      {
        type: 'create-record',
        model: 'WorkflowTask',
        params: {
          title: 'تقييم نهائي قبل التخريج',
          titleEn: 'Final pre-discharge assessment',
          taskType: 'pre-discharge-assessment',
          priority: 'high',
          beneficiary: '{{doc.beneficiary}}',
          episode: '{{doc._id}}',
          status: 'pending',
          dueDate: '{{addDays(now, 3)}}',
        },
      },
    ],
    enabled: true,
  },

  // ── AR/VR safety ──────────────────────────────────────────────────────
  {
    id: 'auto-alert-arvr-safety',
    name: 'Alert on AR/VR safety threshold breach',
    nameAr: 'تنبيه عند تجاوز حد الأمان في جلسات AR/VR',
    trigger: { domain: 'ar-vr', event: 'updated' },
    conditions: [{ field: 'doc.safetyAlert', equals: true }],
    actions: [
      {
        type: 'create-record',
        model: 'DecisionAlert',
        params: {
          title: 'تنبيه أمان جلسة AR/VR',
          titleEn: 'AR/VR session safety alert',
          severity: 'high',
          domain: 'ar-vr',
          status: 'active',
          beneficiary: '{{doc.beneficiary}}',
        },
      },
    ],
    enabled: true,
  },

  // ── Program enrollment ────────────────────────────────────────────────
  {
    id: 'auto-timeline-program-enrolled',
    name: 'Timeline on program enrollment',
    nameAr: 'إدخال زمني عند التسجيل في برنامج',
    trigger: { domain: 'programs', event: 'created' },
    conditions: [],
    actions: [
      {
        type: 'create-record',
        model: 'CareTimeline',
        params: {
          beneficiary: '{{doc.beneficiary}}',
          eventType: 'program_enrolled',
          title: 'تسجيل في برنامج',
          occurredAt: '{{now}}',
          source: 'automation',
        },
      },
    ],
    enabled: true,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
//  Execution Log Model
// ═══════════════════════════════════════════════════════════════════════════════

const automationLogSchema = new mongoose.Schema(
  {
    ruleId: { type: String, required: true, index: true },
    ruleName: String,
    trigger: {
      domain: String,
      event: String,
    },
    documentId: { type: mongoose.Schema.Types.ObjectId },
    actionsExecuted: Number,
    actionsSucceeded: Number,
    actionsFailed: Number,
    results: [
      {
        actionType: String,
        model: String,
        success: Boolean,
        createdId: mongoose.Schema.Types.ObjectId,
        error: String,
      },
    ],
    executionTimeMs: Number,
    status: { type: String, enum: ['success', 'partial', 'failed'], default: 'success' },
  },
  { timestamps: true, collection: 'ddd_automation_logs' }
);

automationLogSchema.index({ createdAt: -1 });
automationLogSchema.index({ ruleId: 1, createdAt: -1 });

const AutomationLog =
  mongoose.models.AutomationLog || mongoose.model('AutomationLog', automationLogSchema);

// ═══════════════════════════════════════════════════════════════════════════════
//  Template Engine (simple {{var}} interpolation)
// ═══════════════════════════════════════════════════════════════════════════════

function resolveTemplate(template, context) {
  if (typeof template !== 'string') return template;

  return template.replace(/\{\{(.+?)\}\}/g, (_, expr) => {
    const trimmed = expr.trim();

    // Special functions
    if (trimmed === 'now') return new Date().toISOString();
    const addDaysMatch = trimmed.match(/^addDays\((.+?),\s*(\d+)\)$/);
    if (addDaysMatch) {
      const base = addDaysMatch[1].trim() === 'now' ? new Date() : new Date(addDaysMatch[1]);
      base.setDate(base.getDate() + parseInt(addDaysMatch[2], 10));
      return base.toISOString();
    }

    // Dot-path resolution
    const parts = trimmed.split('.');
    let value = context;
    for (const part of parts) {
      if (value == null) return '';
      value = value[part];
    }
    return value != null ? String(value) : '';
  });
}

function resolveParams(params, context) {
  const resolved = {};
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'string') {
      resolved[key] = resolveTemplate(value, context);
    } else if (typeof value === 'object' && value !== null) {
      resolved[key] = resolveParams(value, context);
    } else {
      resolved[key] = value;
    }
  }
  return resolved;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  Condition Evaluator
// ═══════════════════════════════════════════════════════════════════════════════

function evaluateConditions(conditions, context) {
  if (!conditions || conditions.length === 0) return true;

  for (const cond of conditions) {
    // { field: 'doc.status', equals: 'completed' }
    if (cond.equals !== undefined) {
      const val = getNestedValue(context, cond.field);
      if (val !== cond.equals) return false;
    }

    // { field: 'doc.riskLevel', in: ['high', 'critical'] }
    if (cond.in !== undefined) {
      const val = getNestedValue(context, cond.field);
      if (!cond.in.includes(val)) return false;
    }

    // { field: 'changes', includes: 'phase' }
    if (cond.includes !== undefined) {
      const val = getNestedValue(context, cond.field);
      if (Array.isArray(val)) {
        if (!val.includes(cond.includes)) return false;
      } else if (typeof val === 'string') {
        if (!val.includes(cond.includes)) return false;
      } else {
        return false;
      }
    }
  }

  return true;
}

function getNestedValue(obj, path) {
  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    if (current == null) return undefined;
    current = current[part];
  }
  return current;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  Action Executor
// ═══════════════════════════════════════════════════════════════════════════════

async function executeAction(action, context) {
  if (action.type === 'create-record') {
    const Model = mongoose.models[action.model];
    if (!Model) {
      return { success: false, error: `Model not found: ${action.model}` };
    }

    try {
      const data = resolveParams(action.params, context);
      const doc = await Model.create(data);
      return { success: true, createdId: doc._id };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  return { success: false, error: `Unknown action type: ${action.type}` };
}

// ═══════════════════════════════════════════════════════════════════════════════
//  Main Automation Engine
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Process a domain event through all matching automation rules.
 *
 * @param {string} domain     - e.g. 'sessions'
 * @param {string} event      - 'created' | 'updated' | 'deleted'
 * @param {object} doc        - The document that triggered the event
 * @param {object} [meta]     - Extra metadata (changes array, userId, etc.)
 * @returns {Promise<object>} - Execution summary
 */
async function processAutomation(domain, event, doc, meta = {}) {
  const start = Date.now();
  const summary = { rulesMatched: 0, actionsExecuted: 0, actionsSucceeded: 0, actionsFailed: 0 };

  // Find matching rules
  const matchingRules = AUTOMATION_RULES.filter(
    r => r.enabled && r.trigger.domain === domain && r.trigger.event === event
  );

  if (matchingRules.length === 0) return summary;

  const context = {
    doc: doc?.toObject ? doc.toObject() : doc,
    meta,
    changes: meta.changes || [],
    now: new Date().toISOString(),
  };

  for (const rule of matchingRules) {
    // Check conditions
    if (!evaluateConditions(rule.conditions, context)) continue;

    summary.rulesMatched++;
    const ruleResults = [];

    for (const action of rule.actions) {
      summary.actionsExecuted++;
      const result = await executeAction(action, context);
      ruleResults.push({
        actionType: action.type,
        model: action.model || '',
        ...result,
      });

      if (result.success) {
        summary.actionsSucceeded++;
      } else {
        summary.actionsFailed++;
      }
    }

    // Log execution
    try {
      await AutomationLog.create({
        ruleId: rule.id,
        ruleName: rule.name,
        trigger: { domain, event },
        documentId: doc._id,
        actionsExecuted: ruleResults.length,
        actionsSucceeded: ruleResults.filter(r => r.success).length,
        actionsFailed: ruleResults.filter(r => !r.success).length,
        results: ruleResults,
        executionTimeMs: Date.now() - start,
        status: ruleResults.every(r => r.success)
          ? 'success'
          : ruleResults.some(r => r.success)
            ? 'partial'
            : 'failed',
      });
    } catch (logErr) {
      logger.warn(`[DDD-Automation] Failed to log execution: ${logErr.message}`);
    }
  }

  if (summary.rulesMatched > 0) {
    logger.info(
      `[DDD-Automation] ${domain}.${event}: ${summary.rulesMatched} rules, ` +
        `${summary.actionsSucceeded}/${summary.actionsExecuted} actions OK`
    );
  }

  return summary;
}

/**
 * Wire automation engine into the integration bus.
 * Call once during app startup.
 *
 * @param {EventEmitter} integrationBus
 */
function initializeDDDAutomations(integrationBus) {
  if (!integrationBus) {
    logger.warn('[DDD-Automation] No integration bus provided — skipping');
    return;
  }

  const domains = [...new Set(AUTOMATION_RULES.map(r => r.trigger.domain))];

  for (const domain of domains) {
    for (const event of ['created', 'updated', 'deleted']) {
      const eventName = `ddd:${domain}:${event}`;
      integrationBus.on(eventName, payload => {
        processAutomation(domain, event, payload?.doc || payload, payload?.meta).catch(err =>
          logger.error(`[DDD-Automation] Error processing ${eventName}: ${err.message}`)
        );
      });
    }
  }

  logger.info(
    `[DDD-Automation] Initialized — ${AUTOMATION_RULES.filter(r => r.enabled).length} rules, ` +
      `${domains.length} domains`
  );
}

/**
 * Get automation logs with filtering.
 */
async function getAutomationLogs(options = {}) {
  const { ruleId, domain, status, limit = 50, page = 1, startDate, endDate } = options;
  const filter = {};

  if (ruleId) filter.ruleId = ruleId;
  if (domain) filter['trigger.domain'] = domain;
  if (status) filter.status = status;
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }

  const [docs, total] = await Promise.all([
    AutomationLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    AutomationLog.countDocuments(filter),
  ]);

  return { logs: docs, total, page, limit, pages: Math.ceil(total / limit) };
}

module.exports = {
  AUTOMATION_RULES,
  AutomationLog,
  processAutomation,
  initializeDDDAutomations,
  getAutomationLogs,
  evaluateConditions,
  resolveTemplate,
};
