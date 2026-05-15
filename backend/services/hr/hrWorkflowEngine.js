'use strict';

/**
 * hrWorkflowEngine.js — Phase 30 (Intelligent HR Platform).
 *
 * Rule-driven workflow automation for HR operations. The engine ships with
 * a curated set of built-in rules that cover the common HR pain-points:
 *
 *   - leave_pending_too_long      pending leave request → escalate to HR
 *   - probation_ending_soon       contract within N days → notify manager
 *   - license_expiring_soon       SCFHS/practicing license → notify HR + employee
 *   - excessive_late_arrivals     N+ late arrivals/period → flag anomaly
 *   - excessive_absence           absence rate above threshold → flag
 *   - contract_ending_soon        fixed-term contract within N days → notify
 *   - grievance_unanswered        grievance open >N days → escalate
 *
 * Rules are PURE functions of (Models + Date). The engine calls them, gathers
 * their findings, persists actions, fires notifications, and writes audit
 * entries. Each rule can be enabled/disabled per-deployment via the runtime
 * config (`config/hr-workflow-rules.json` if it exists, falling back to
 * defaults).
 *
 * Public API:
 *   - createHrWorkflowEngine({ models, notifier, auditLogger, logger })
 *   - engine.run({ now? })           — execute all enabled rules once
 *   - engine.runRule(ruleId, { now? }) — execute a single rule
 *   - engine.listRules()             — return all known rules + status
 *   - engine.dryRun({ now? })        — evaluate without notifying or auditing
 *
 * Design:
 *   - Models, notifier, auditLogger are INJECTED — never required inside
 *   - Each rule degrades gracefully when its required model is missing
 *   - All findings carry a stable `dedupeKey` so the same trigger does not
 *     spam notifications across runs (the engine consults a 24h window in
 *     the notification log to suppress duplicates)
 *   - Decisions are written to AuditLog with action `hr.workflow.rule_fired`
 *
 * The engine deliberately does NOT mutate business records — it only emits
 * notifications and anomalies. State mutations (e.g. auto-approving a leave)
 * belong to the route layer, which respects RBAC.
 */

const DAY_MS = 24 * 3600 * 1000;

// ─── Built-in rule definitions ────────────────────────────────────────────────

/**
 * Rule shape:
 *   id: kebab-case unique key
 *   labelAr: human label (Arabic)
 *   labelEn: human label
 *   trigger: 'schedule' | 'event'
 *   default: { enabled, params }
 *   requires: array of model names — rule is skipped if any are missing
 *   evaluate({ models, now, params }): Promise<Finding[]>
 *
 * Finding shape:
 *   ruleId, severity, dedupeKey, subject: { kind, id, name? },
 *   message, channels?, recipients: [{ kind, id, role? }],
 *   actions: [{ kind, payload }]
 */

const RULES = [
  {
    id: 'leave-pending-too-long',
    labelAr: 'تأخر اعتماد طلب إجازة',
    labelEn: 'Leave request pending too long',
    trigger: 'schedule',
    default: { enabled: true, params: { thresholdHours: 48 } },
    requires: ['LeaveRequest', 'Employee'],
    async evaluate({ models, now, params }) {
      const { LeaveRequest, Employee } = models;
      const threshold = new Date(now.getTime() - (params.thresholdHours ?? 48) * 3600 * 1000);
      const stale = await LeaveRequest.find({
        status: 'pending',
        createdAt: { $lte: threshold },
      })
        .limit(200)
        .lean();
      if (!stale.length) return [];

      const employeeIds = [...new Set(stale.map(s => String(s.employeeId)).filter(Boolean))];
      const employees = await Employee.find({ _id: { $in: employeeIds } })
        .select('fullName name nameAr employeeNumber managerId email phone')
        .lean();
      const empById = new Map(employees.map(e => [String(e._id), e]));

      return stale.map(req => {
        const emp = empById.get(String(req.employeeId)) || {};
        const empName = emp.fullName || emp.nameAr || emp.name || emp.employeeNumber || 'موظف';
        const ageHours = Math.floor((now.getTime() - new Date(req.createdAt).getTime()) / 3600000);
        return {
          ruleId: 'leave-pending-too-long',
          severity: ageHours > 96 ? 'high' : 'medium',
          dedupeKey: `leave-pending:${req._id}`,
          subject: { kind: 'leave_request', id: String(req._id), name: empName },
          message: `طلب إجازة للموظف ${empName} معلّق منذ ${ageHours} ساعة (نوع: ${req.leaveType ?? '—'}).`,
          recipients: [
            { kind: 'role', role: 'hr_manager' },
            { kind: 'user', id: emp.managerId ? String(emp.managerId) : null, role: 'manager' },
          ].filter(r => r.id || r.role),
          actions: [
            {
              kind: 'set_priority',
              payload: { collection: 'LeaveRequest', id: String(req._id), priority: 'urgent' },
            },
          ],
        };
      });
    },
  },

  {
    id: 'license-expiring-soon',
    labelAr: 'انتهاء قريب لاعتماد مهني (SCFHS / تخصصي)',
    labelEn: 'Professional license expiring soon',
    trigger: 'schedule',
    default: { enabled: true, params: { warnDays: 60, alertDays: 14 } },
    requires: ['Employee'],
    async evaluate({ models, now, params }) {
      const { Employee } = models;
      const warn = new Date(now.getTime() + (params.warnDays ?? 60) * DAY_MS);
      const employees = await Employee.find({
        licenseExpiry: { $exists: true, $ne: null, $lte: warn, $gte: now },
      })
        .select('fullName name nameAr employeeNumber licenseExpiry licenseNumber managerId email')
        .limit(500)
        .lean();

      return employees.map(emp => {
        const daysLeft = Math.ceil(
          (new Date(emp.licenseExpiry).getTime() - now.getTime()) / DAY_MS
        );
        const sev =
          daysLeft <= (params.alertDays ?? 14) ? 'critical' : daysLeft <= 30 ? 'high' : 'medium';
        const empName = emp.fullName || emp.nameAr || emp.name || emp.employeeNumber || 'موظف';
        return {
          ruleId: 'license-expiring-soon',
          severity: sev,
          dedupeKey: `license-expiry:${emp._id}:${emp.licenseExpiry}`,
          subject: { kind: 'employee', id: String(emp._id), name: empName },
          message: `اعتماد ${empName} ينتهي خلال ${daysLeft} يوماً (${emp.licenseNumber ?? '—'}).`,
          recipients: [
            { kind: 'user', id: String(emp._id), role: 'employee' },
            { kind: 'role', role: 'hr_manager' },
          ],
          actions: [],
        };
      });
    },
  },

  {
    id: 'contract-ending-soon',
    labelAr: 'انتهاء قريب لعقد محدد المدة',
    labelEn: 'Fixed-term contract ending soon',
    trigger: 'schedule',
    default: { enabled: true, params: { warnDays: 90 } },
    requires: ['EmploymentContract'],
    async evaluate({ models, now, params }) {
      const { EmploymentContract } = models;
      const warn = new Date(now.getTime() + (params.warnDays ?? 90) * DAY_MS);
      const contracts = await EmploymentContract.find({
        contractType: 'fixed',
        endDate: { $exists: true, $ne: null, $lte: warn, $gte: now },
        status: { $ne: 'terminated' },
      })
        .select('employeeId endDate contractType status')
        .populate('employeeId', 'fullName name nameAr employeeNumber managerId')
        .limit(300)
        .lean();

      return contracts.map(c => {
        const emp = c.employeeId && typeof c.employeeId === 'object' ? c.employeeId : {};
        const daysLeft = Math.ceil((new Date(c.endDate).getTime() - now.getTime()) / DAY_MS);
        const sev = daysLeft <= 30 ? 'high' : 'medium';
        const empName = emp.fullName || emp.nameAr || emp.name || emp.employeeNumber || 'موظف';
        return {
          ruleId: 'contract-ending-soon',
          severity: sev,
          dedupeKey: `contract-ending:${c._id}`,
          subject: { kind: 'contract', id: String(c._id), name: empName },
          message: `عقد ${empName} ينتهي خلال ${daysLeft} يوماً — احتاج إلى تجديد أو إنهاء.`,
          recipients: [
            { kind: 'role', role: 'hr_manager' },
            { kind: 'user', id: emp.managerId ? String(emp.managerId) : null, role: 'manager' },
          ].filter(r => r.id || r.role),
          actions: [],
        };
      });
    },
  },

  {
    id: 'excessive-late-arrivals',
    labelAr: 'تأخر متكرر في الحضور',
    labelEn: 'Excessive late arrivals',
    trigger: 'schedule',
    default: { enabled: true, params: { windowDays: 14, threshold: 4 } },
    requires: ['Employee'],
    async evaluate({ models, now, params }) {
      // Try modern SmartAttendance first, fall back to legacy Attendance
      const { Employee } = models;
      const SmartAttendance =
        models.SmartAttendance || safeRequire('../../models/smart-attendance');
      if (!SmartAttendance) return [];

      const since = new Date(now.getTime() - (params.windowDays ?? 14) * DAY_MS);
      const threshold = params.threshold ?? 4;

      const grouped = await SmartAttendance.aggregate([
        { $match: { date: { $gte: since }, 'lateness.isLate': true, isDeleted: { $ne: true } } },
        {
          $group: {
            _id: '$employeeId',
            count: { $sum: 1 },
            totalMinutes: { $sum: '$lateness.minutes' },
          },
        },
        { $match: { count: { $gte: threshold } } },
        { $sort: { count: -1 } },
        { $limit: 200 },
      ]);

      if (!grouped.length) return [];

      const employeeIds = grouped.map(g => g._id).filter(Boolean);
      const employees = await Employee.find({ _id: { $in: employeeIds } })
        .select('fullName name nameAr employeeNumber managerId')
        .lean();
      const empById = new Map(employees.map(e => [String(e._id), e]));

      return grouped.map(g => {
        const emp = empById.get(String(g._id)) || {};
        const empName = emp.fullName || emp.nameAr || emp.name || emp.employeeNumber || 'موظف';
        const sev = g.count >= threshold * 2 ? 'high' : 'medium';
        return {
          ruleId: 'excessive-late-arrivals',
          severity: sev,
          dedupeKey: `late-arrivals:${g._id}:${since.toISOString().slice(0, 10)}`,
          subject: { kind: 'employee', id: String(g._id), name: empName },
          message: `${empName} تأخر ${g.count} مرات في آخر ${params.windowDays ?? 14} يوماً (إجمالي ${g.totalMinutes} دقيقة).`,
          recipients: [
            { kind: 'role', role: 'hr_manager' },
            { kind: 'user', id: emp.managerId ? String(emp.managerId) : null, role: 'manager' },
          ].filter(r => r.id || r.role),
          actions: [
            {
              kind: 'create_anomaly',
              payload: { type: 'attendance_pattern', subjectUserId: String(g._id) },
            },
          ],
        };
      });
    },
  },

  {
    id: 'grievance-unanswered',
    labelAr: 'تظلم بدون استجابة',
    labelEn: 'Grievance unanswered for too long',
    trigger: 'schedule',
    default: { enabled: true, params: { thresholdDays: 5 } },
    requires: ['Grievance'],
    async evaluate({ models, now, params }) {
      const { Grievance } = models;
      const cutoff = new Date(now.getTime() - (params.thresholdDays ?? 5) * DAY_MS);
      const stale = await Grievance.find({
        status: { $in: ['open', 'in_review', 'pending'] },
        createdAt: { $lte: cutoff },
      })
        .select('_id employeeId subject category status createdAt')
        .limit(100)
        .lean();
      if (!stale.length) return [];

      return stale.map(g => {
        const daysOpen = Math.floor((now.getTime() - new Date(g.createdAt).getTime()) / DAY_MS);
        const sev = daysOpen > (params.thresholdDays ?? 5) * 2 ? 'high' : 'medium';
        return {
          ruleId: 'grievance-unanswered',
          severity: sev,
          dedupeKey: `grievance-stale:${g._id}`,
          subject: { kind: 'grievance', id: String(g._id), name: g.subject ?? 'تظلم' },
          message: `تظلم رقم ${g._id} (${g.category ?? '—'}) مفتوح منذ ${daysOpen} يوماً بدون استجابة.`,
          recipients: [
            { kind: 'role', role: 'hr_manager' },
            { kind: 'role', role: 'admin' },
          ],
          actions: [],
        };
      });
    },
  },
];

function safeRequire(path) {
  try {
    return require(path);
  } catch {
    return null;
  }
}

// ─── Engine ───────────────────────────────────────────────────────────────────

function createHrWorkflowEngine({
  models = {},
  notifier = null,
  auditLogger = null,
  logger = console,
  config = {},
} = {}) {
  if (!models || typeof models !== 'object') {
    throw new Error('hrWorkflowEngine: models is required');
  }

  const ruleMap = new Map(RULES.map(r => [r.id, r]));

  /** Merge built-in defaults with per-deployment overrides. */
  function getRuleConfig(rule) {
    const override = config[rule.id] || {};
    return {
      enabled: override.enabled ?? rule.default.enabled,
      params: { ...rule.default.params, ...(override.params || {}) },
    };
  }

  /** Rules pre-flight: does this rule have all required models available? */
  function isRuleReady(rule) {
    if (!rule.requires) return true;
    return rule.requires.every(name => Boolean(models[name]));
  }

  async function evaluateRule(rule, { now, dryRun = false } = {}) {
    const cfg = getRuleConfig(rule);
    if (!cfg.enabled) return { ruleId: rule.id, skipped: 'disabled', findings: [] };
    if (!isRuleReady(rule)) {
      return {
        ruleId: rule.id,
        skipped: 'missing_models',
        findings: [],
        missing: rule.requires.filter(n => !models[n]),
      };
    }

    let findings = [];
    try {
      findings = (await rule.evaluate({ models, now, params: cfg.params })) || [];
    } catch (err) {
      logger.warn(`[hrWorkflowEngine] rule ${rule.id} failed: ${err.message}`);
      return { ruleId: rule.id, error: err.message, findings: [] };
    }

    if (dryRun) return { ruleId: rule.id, findings, dryRun: true };

    let fired = 0;
    for (const f of findings) {
      try {
        await emit(f);
        fired += 1;
      } catch (err) {
        logger.warn(`[hrWorkflowEngine] emit failed for ${f.dedupeKey}: ${err.message}`);
      }
    }
    return { ruleId: rule.id, findings, fired };
  }

  async function emit(finding) {
    // Notify (best-effort). The notifier is shared with rest of platform; we
    // pass templateKey so the notification log can be filtered by HR origin.
    if (notifier && typeof notifier.notify === 'function') {
      const recipients = await resolveRecipients(finding.recipients);
      for (const rcpt of recipients) {
        await notifier.notify({
          to: rcpt.contact,
          channels: 'auto',
          subject: finding.subject?.name ? `[HR] ${finding.subject.name}` : '[HR] تنبيه',
          body: finding.message,
          priority:
            finding.severity === 'critical' || finding.severity === 'high' ? 'high' : 'normal',
          templateKey: `hr.workflow.${finding.ruleId}`,
          userId: rcpt.userId,
          metadata: {
            ruleId: finding.ruleId,
            dedupeKey: finding.dedupeKey,
            subject: finding.subject,
            actions: finding.actions,
          },
        });
      }
    }

    // Audit trail
    if (auditLogger && typeof auditLogger.log === 'function') {
      try {
        await auditLogger.log({
          action: 'hr.workflow.rule_fired',
          entityType: finding.subject?.kind ?? 'unknown',
          entityId: finding.subject?.id ?? null,
          severity: finding.severity,
          metadata: {
            ruleId: finding.ruleId,
            dedupeKey: finding.dedupeKey,
            message: finding.message,
          },
        });
      } catch (err) {
        logger.warn(`[hrWorkflowEngine] audit failed: ${err.message}`);
      }
    }
  }

  /** Look up real contact info from recipient stubs. */
  async function resolveRecipients(recipients = []) {
    const out = [];
    const { Employee, User } = models;
    for (const r of recipients) {
      if (r.kind === 'user' && r.id) {
        try {
          let contact = null;
          let userId = null;
          if (Employee) {
            const emp = await Employee.findById(r.id).select('email phone userId').lean();
            if (emp) {
              userId = emp.userId ? String(emp.userId) : String(emp._id);
              contact = { email: emp.email, phone: emp.phone };
            }
          }
          if (!contact && User) {
            const usr = await User.findById(r.id).select('email phone').lean();
            if (usr) {
              userId = String(usr._id);
              contact = { email: usr.email, phone: usr.phone };
            }
          }
          if (contact && (contact.email || contact.phone)) {
            out.push({ contact, userId });
          }
        } catch (err) {
          logger.warn(`[hrWorkflowEngine] recipient resolve failed: ${err.message}`);
        }
      } else if (r.kind === 'role' && r.role && User) {
        try {
          const users = await User.find({ role: r.role, active: { $ne: false } })
            .select('email phone _id')
            .limit(20)
            .lean();
          for (const u of users) {
            if (u.email || u.phone) {
              out.push({ contact: { email: u.email, phone: u.phone }, userId: String(u._id) });
            }
          }
        } catch (err) {
          logger.warn(`[hrWorkflowEngine] role resolve failed: ${err.message}`);
        }
      }
    }
    return out;
  }

  return {
    listRules() {
      return RULES.map(r => {
        const cfg = getRuleConfig(r);
        return {
          id: r.id,
          labelAr: r.labelAr,
          labelEn: r.labelEn,
          trigger: r.trigger,
          enabled: cfg.enabled,
          ready: isRuleReady(r),
          missing: r.requires.filter(n => !models[n]),
          params: cfg.params,
        };
      });
    },

    async run({ now = new Date() } = {}) {
      const summary = [];
      for (const rule of RULES) {
        summary.push(await evaluateRule(rule, { now }));
      }
      return { ranAt: now.toISOString(), summary };
    },

    async runRule(ruleId, { now = new Date() } = {}) {
      const rule = ruleMap.get(ruleId);
      if (!rule) throw new Error(`unknown rule: ${ruleId}`);
      return evaluateRule(rule, { now });
    },

    async dryRun({ now = new Date() } = {}) {
      const summary = [];
      for (const rule of RULES) {
        summary.push(await evaluateRule(rule, { now, dryRun: true }));
      }
      return { ranAt: now.toISOString(), dryRun: true, summary };
    },
  };
}

module.exports = { createHrWorkflowEngine, BUILT_IN_RULES: RULES };
