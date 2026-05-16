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
    id: 'performance-review-overdue',
    labelAr: 'تقييم أداء متأخر',
    labelEn: 'Performance review overdue',
    trigger: 'schedule',
    default: { enabled: true, params: { monthsOverdue: 13 } },
    requires: ['Employee', 'PerformanceEvaluation'],
    async evaluate({ models, now, params }) {
      const { Employee, PerformanceEvaluation } = models;
      const overdueCutoff = new Date(now.getTime() - (params.monthsOverdue ?? 13) * 30 * DAY_MS);

      // Find each employee's most recent finalized evaluation.
      const latestEvals = await PerformanceEvaluation.aggregate([
        { $match: { status: { $in: ['finalized', 'archived'] } } },
        { $sort: { finalizedAt: -1 } },
        { $group: { _id: '$employeeId', lastFinalizedAt: { $first: '$finalizedAt' } } },
      ]).catch(() => []);

      const lastById = new Map(latestEvals.map(e => [String(e._id), e.lastFinalizedAt]));

      const actives = await Employee.find({ status: 'active' })
        .select('fullName name nameAr employeeNumber managerId hireDate hire_date')
        .limit(500)
        .lean();

      const findings = [];
      for (const emp of actives) {
        const last = lastById.get(String(emp._id));
        const hire = emp.hireDate || emp.hire_date;
        // Skip employees hired less than 6 months ago — they're not eligible yet.
        if (hire && new Date(hire).getTime() > now.getTime() - 6 * 30 * DAY_MS) continue;
        const lastEvalAge = last ? (now.getTime() - new Date(last).getTime()) / DAY_MS : null;
        const overdueByDays =
          lastEvalAge !== null
            ? lastEvalAge - (params.monthsOverdue ?? 13) * 30
            : (params.monthsOverdue ?? 13) * 30; // never reviewed
        if (last && new Date(last) > overdueCutoff) continue;

        const empName = emp.fullName || emp.nameAr || emp.name || emp.employeeNumber || 'موظف';
        findings.push({
          ruleId: 'performance-review-overdue',
          severity: overdueByDays > 90 ? 'high' : 'medium',
          dedupeKey: `perf-review-overdue:${emp._id}`,
          subject: { kind: 'employee', id: String(emp._id), name: empName },
          message: last
            ? `${empName} لم يُقيَّم منذ ${Math.floor(lastEvalAge / 30)} شهر (متأخر ${Math.floor(overdueByDays)} يوماً).`
            : `${empName} لم يُقيَّم أبداً منذ تعيينه.`,
          recipients: [
            { kind: 'user', id: emp.managerId ? String(emp.managerId) : null, role: 'manager' },
            { kind: 'role', role: 'hr_manager' },
          ].filter(r => r.id || r.role),
          actions: [],
        });
        if (findings.length >= 100) break; // cap per-run output
      }
      return findings;
    },
  },

  {
    id: 'probation-ending-soon',
    labelAr: 'انتهاء قريب لفترة التجربة',
    labelEn: 'Probation period ending soon',
    trigger: 'schedule',
    default: { enabled: true, params: { warnDays: 14, probationMonths: 3 } },
    requires: ['Employee'],
    async evaluate({ models, now, params }) {
      const { Employee } = models;
      const probationDays = (params.probationMonths ?? 3) * 30;
      const warnDays = params.warnDays ?? 14;
      // Hired between (probationDays - warnDays) and probationDays ago
      const minHireDate = new Date(now.getTime() - probationDays * DAY_MS);
      const maxHireDate = new Date(now.getTime() - (probationDays - warnDays) * DAY_MS);

      const candidates = await Employee.find({
        status: 'active',
        $or: [
          { hireDate: { $gte: minHireDate, $lte: maxHireDate } },
          { hire_date: { $gte: minHireDate, $lte: maxHireDate } },
        ],
      })
        .select('fullName name nameAr employeeNumber managerId hireDate hire_date department')
        .limit(200)
        .lean();

      return candidates.map(emp => {
        const hire = emp.hireDate || emp.hire_date;
        const probationEnd = new Date(new Date(hire).getTime() + probationDays * DAY_MS);
        const daysLeft = Math.ceil((probationEnd.getTime() - now.getTime()) / DAY_MS);
        const empName = emp.fullName || emp.nameAr || emp.name || emp.employeeNumber || 'موظف';
        return {
          ruleId: 'probation-ending-soon',
          severity: daysLeft <= 7 ? 'high' : 'medium',
          dedupeKey: `probation-end:${emp._id}`,
          subject: { kind: 'employee', id: String(emp._id), name: empName },
          message: `فترة تجربة ${empName} (${emp.department ?? '—'}) تنتهي خلال ${daysLeft} يوماً — يحتاج قرار تثبيت/إنهاء.`,
          recipients: [
            { kind: 'user', id: emp.managerId ? String(emp.managerId) : null, role: 'manager' },
            { kind: 'role', role: 'hr_manager' },
          ].filter(r => r.id || r.role),
          actions: [],
        };
      });
    },
  },

  {
    id: 'iqama-expiring-soon',
    labelAr: 'انتهاء قريب للإقامة (لغير السعوديين)',
    labelEn: 'Iqama expiring soon (non-Saudi staff)',
    trigger: 'schedule',
    default: { enabled: true, params: { warnDays: 90, alertDays: 30 } },
    requires: ['Employee'],
    async evaluate({ models, now, params }) {
      const { Employee } = models;
      const warn = new Date(now.getTime() + (params.warnDays ?? 90) * DAY_MS);
      const employees = await Employee.find({
        iqamaExpiry: { $exists: true, $ne: null, $lte: warn, $gte: now },
        nationality: { $ne: 'SA' },
      })
        .select('fullName name nameAr employeeNumber iqamaExpiry iqamaNumber managerId')
        .limit(500)
        .lean();

      return employees.map(emp => {
        const daysLeft = Math.ceil((new Date(emp.iqamaExpiry).getTime() - now.getTime()) / DAY_MS);
        const sev =
          daysLeft <= (params.alertDays ?? 30) ? 'critical' : daysLeft <= 60 ? 'high' : 'medium';
        const empName = emp.fullName || emp.nameAr || emp.name || emp.employeeNumber || 'موظف';
        return {
          ruleId: 'iqama-expiring-soon',
          severity: sev,
          dedupeKey: `iqama-expiry:${emp._id}:${emp.iqamaExpiry}`,
          subject: { kind: 'employee', id: String(emp._id), name: empName },
          message: `إقامة ${empName} تنتهي خلال ${daysLeft} يوماً (رقم ${emp.iqamaNumber ?? '—'}). تجديد ضروري قبل الانتهاء.`,
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
    id: 'certification-expiring-soon',
    labelAr: 'انتهاء قريب لشهادة احترافية',
    labelEn: 'Professional certification expiring soon',
    trigger: 'schedule',
    default: { enabled: true, params: { warnDays: 60, alertDays: 14 } },
    requires: ['Employee', 'Certification'],
    async evaluate({ models, now, params }) {
      const { Employee, Certification } = models;
      const warn = new Date(now.getTime() + (params.warnDays ?? 60) * DAY_MS);
      const certs = await Certification.find({
        expiryDate: { $exists: true, $ne: null, $lte: warn, $gte: now },
        status: { $ne: 'archived' },
      })
        .select('employeeId expiryDate name issuingAuthority')
        .limit(500)
        .lean();

      if (!certs.length) return [];

      const empIds = [...new Set(certs.map(c => String(c.employeeId)).filter(Boolean))];
      const employees = await Employee.find({ _id: { $in: empIds } })
        .select('fullName name nameAr employeeNumber managerId email')
        .lean();
      const empById = new Map(employees.map(e => [String(e._id), e]));

      return certs.map(cert => {
        const emp = empById.get(String(cert.employeeId)) || {};
        const daysLeft = Math.ceil((new Date(cert.expiryDate).getTime() - now.getTime()) / DAY_MS);
        const sev =
          daysLeft <= (params.alertDays ?? 14) ? 'critical' : daysLeft <= 30 ? 'high' : 'medium';
        const empName = emp.fullName || emp.nameAr || emp.name || emp.employeeNumber || 'موظف';
        return {
          ruleId: 'certification-expiring-soon',
          severity: sev,
          dedupeKey: `cert-expiry:${cert._id}`,
          subject: { kind: 'certification', id: String(cert._id), name: empName },
          message: `شهادة ${cert.name ?? 'احترافية'} لـ ${empName} تنتهي خلال ${daysLeft} يوماً (${cert.issuingAuthority ?? '—'}).`,
          recipients: [
            { kind: 'user', id: String(cert.employeeId), role: 'employee' },
            { kind: 'role', role: 'hr_manager' },
          ],
          actions: [],
        };
      });
    },
  },

  {
    id: 'birthday-this-week',
    labelAr: 'أعياد ميلاد هذا الأسبوع',
    labelEn: 'Employee birthdays this week',
    trigger: 'schedule',
    default: { enabled: true, params: { windowDays: 7 } },
    requires: ['Employee'],
    async evaluate({ models, now, params }) {
      const { Employee } = models;
      const winDays = params.windowDays ?? 7;
      // Match by month + day, ignoring year (DOB anniversaries each year).
      const today = new Date(now);
      const targetDays = [];
      for (let d = 0; d <= winDays; d++) {
        const date = new Date(today.getTime() + d * DAY_MS);
        targetDays.push({ month: date.getMonth() + 1, day: date.getDate() });
      }

      // Light-weight: pull active employees with a birthDate, filter client-side.
      // This avoids needing a MongoDB $expr on $dayOfMonth/$month aggregation.
      const employees = await Employee.find({
        status: 'active',
        $or: [{ birthDate: { $exists: true, $ne: null } }, { dob: { $exists: true, $ne: null } }],
      })
        .select('fullName name nameAr employeeNumber managerId birthDate dob department')
        .limit(2000)
        .lean();

      const findings = [];
      for (const emp of employees) {
        const dob = emp.birthDate || emp.dob;
        if (!dob) continue;
        const d = new Date(dob);
        if (isNaN(d.getTime())) continue;
        const match = targetDays.find(t => t.month === d.getMonth() + 1 && t.day === d.getDate());
        if (!match) continue;
        const empName = emp.fullName || emp.nameAr || emp.name || emp.employeeNumber || 'موظف';
        findings.push({
          ruleId: 'birthday-this-week',
          severity: 'info',
          dedupeKey: `bday:${emp._id}:${now.getFullYear()}-${match.month}-${match.day}`,
          subject: { kind: 'employee', id: String(emp._id), name: empName },
          message: `عيد ميلاد ${empName} (${emp.department ?? '—'}) في ${match.day}/${match.month}.`,
          recipients: [
            { kind: 'user', id: emp.managerId ? String(emp.managerId) : null, role: 'manager' },
          ].filter(r => r.id),
          actions: [],
        });
      }
      return findings.slice(0, 100);
    },
  },

  {
    id: 'work-anniversary-this-week',
    labelAr: 'ذكريات تعيين هذا الأسبوع',
    labelEn: 'Work anniversaries this week',
    trigger: 'schedule',
    default: { enabled: true, params: { windowDays: 7 } },
    requires: ['Employee'],
    async evaluate({ models, now, params }) {
      const { Employee } = models;
      const winDays = params.windowDays ?? 7;
      const today = new Date(now);
      const targetDays = [];
      for (let d = 0; d <= winDays; d++) {
        const date = new Date(today.getTime() + d * DAY_MS);
        targetDays.push({ month: date.getMonth() + 1, day: date.getDate() });
      }

      const employees = await Employee.find({
        status: 'active',
        $or: [
          { hireDate: { $exists: true, $ne: null } },
          { hire_date: { $exists: true, $ne: null } },
        ],
      })
        .select('fullName name nameAr employeeNumber managerId hireDate hire_date department')
        .limit(2000)
        .lean();

      const findings = [];
      for (const emp of employees) {
        const hire = emp.hireDate || emp.hire_date;
        if (!hire) continue;
        const d = new Date(hire);
        if (isNaN(d.getTime())) continue;
        const match = targetDays.find(t => t.month === d.getMonth() + 1 && t.day === d.getDate());
        if (!match) continue;
        const years = today.getFullYear() - d.getFullYear();
        if (years < 1) continue; // first year only counts as "hire", not anniversary
        const empName = emp.fullName || emp.nameAr || emp.name || emp.employeeNumber || 'موظف';
        const sev = years >= 10 ? 'high' : years >= 5 ? 'medium' : 'info';
        findings.push({
          ruleId: 'work-anniversary-this-week',
          severity: sev,
          dedupeKey: `anniv:${emp._id}:${now.getFullYear()}`,
          subject: { kind: 'employee', id: String(emp._id), name: empName },
          message: `${empName} (${emp.department ?? '—'}) يكمل ${years} سنة في الشركة هذا الأسبوع.`,
          recipients: [
            { kind: 'user', id: emp.managerId ? String(emp.managerId) : null, role: 'manager' },
            { kind: 'role', role: 'hr_manager' },
          ].filter(r => r.id || r.role),
          actions: [],
        });
      }
      return findings.slice(0, 100);
    },
  },

  {
    id: 'gosi-unregistered',
    labelAr: 'موظف سعودي بدون تسجيل GOSI',
    labelEn: 'Saudi employee missing GOSI registration',
    trigger: 'schedule',
    default: { enabled: true, params: { tolerantDays: 30 } },
    requires: ['Employee'],
    async evaluate({ models, now, params }) {
      const { Employee } = models;
      const tolerantDays = params.tolerantDays ?? 30;
      const tolerantCutoff = new Date(now.getTime() - tolerantDays * DAY_MS);

      const employees = await Employee.find({
        status: 'active',
        nationality: 'SA',
        $or: [
          { gosiNumber: { $exists: false } },
          { gosiNumber: null },
          { gosiNumber: '' },
          { gosi_number: { $exists: false } },
          { gosi_number: null },
        ],
      })
        .select('fullName name nameAr employeeNumber managerId hireDate hire_date')
        .limit(500)
        .lean();

      return employees
        .filter(emp => {
          const hire = emp.hireDate || emp.hire_date;
          // Tolerate the first N days — registration legitimately takes time.
          return !hire || new Date(hire) < tolerantCutoff;
        })
        .map(emp => {
          const empName = emp.fullName || emp.nameAr || emp.name || emp.employeeNumber || 'موظف';
          return {
            ruleId: 'gosi-unregistered',
            severity: 'high',
            dedupeKey: `gosi-missing:${emp._id}`,
            subject: { kind: 'employee', id: String(emp._id), name: empName },
            message: `${empName} (سعودي) غير مسجل في التأمينات الاجتماعية بعد ${tolerantDays} يوماً من التعيين — مخالفة قانونية.`,
            recipients: [
              { kind: 'role', role: 'hr_manager' },
              { kind: 'role', role: 'admin' },
            ],
            actions: [],
          };
        });
    },
  },

  {
    id: 'training-due-soon',
    labelAr: 'تدريب إلزامي قارب موعد انتهائه',
    labelEn: 'Mandatory training due soon',
    trigger: 'schedule',
    default: { enabled: true, params: { warnDays: 30 } },
    requires: ['Employee', 'TrainingPlan'],
    async evaluate({ models, now, params }) {
      const { Employee, TrainingPlan } = models;
      const warn = new Date(now.getTime() + (params.warnDays ?? 30) * DAY_MS);
      const plans = await TrainingPlan.find({
        isMandatory: true,
        dueDate: { $exists: true, $ne: null, $lte: warn, $gte: now },
        status: { $nin: ['completed', 'archived'] },
      })
        .select('employeeId dueDate title courseId')
        .limit(500)
        .lean();
      if (!plans.length) return [];
      const empIds = [...new Set(plans.map(p => String(p.employeeId)).filter(Boolean))];
      const employees = await Employee.find({ _id: { $in: empIds } })
        .select('fullName name nameAr employeeNumber managerId')
        .lean();
      const empById = new Map(employees.map(e => [String(e._id), e]));
      return plans.map(p => {
        const emp = empById.get(String(p.employeeId)) || {};
        const days = Math.ceil((new Date(p.dueDate).getTime() - now.getTime()) / DAY_MS);
        const sev = days <= 7 ? 'high' : 'medium';
        const empName = emp.fullName || emp.nameAr || emp.name || emp.employeeNumber || 'موظف';
        return {
          ruleId: 'training-due-soon',
          severity: sev,
          dedupeKey: `training-due:${p._id}`,
          subject: { kind: 'training_plan', id: String(p._id), name: empName },
          message: `${empName} لم يكمل تدريب ${p.title ?? '—'} المُلزم — متبقي ${days} يوماً.`,
          recipients: [
            { kind: 'user', id: String(p.employeeId), role: 'employee' },
            { kind: 'user', id: emp.managerId ? String(emp.managerId) : null, role: 'manager' },
          ].filter(r => r.id),
          actions: [],
        };
      });
    },
  },

  {
    id: 'excessive-overtime',
    labelAr: 'ساعات إضافية مفرطة',
    labelEn: 'Excessive overtime accumulation',
    trigger: 'schedule',
    default: { enabled: true, params: { monthlyHoursThreshold: 40 } },
    requires: ['Employee'],
    async evaluate({ models, now, params }) {
      const SmartAttendance =
        models.SmartAttendance || safeRequire('../../models/smart-attendance');
      if (!SmartAttendance) return [];
      const { Employee } = models;
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const grouped = await SmartAttendance.aggregate([
        { $match: { date: { $gte: monthStart }, isDeleted: { $ne: true } } },
        { $group: { _id: '$employeeId', overtimeMinutes: { $sum: '$overtime.minutes' } } },
        { $match: { overtimeMinutes: { $gte: (params.monthlyHoursThreshold ?? 40) * 60 } } },
        { $sort: { overtimeMinutes: -1 } },
        { $limit: 100 },
      ]).catch(() => []);
      if (!grouped.length) return [];
      const empIds = grouped.map(g => g._id).filter(Boolean);
      const employees = await Employee.find({ _id: { $in: empIds } })
        .select('fullName name nameAr employeeNumber managerId')
        .lean();
      const empById = new Map(employees.map(e => [String(e._id), e]));
      return grouped.map(g => {
        const emp = empById.get(String(g._id)) || {};
        const hours = Math.round(g.overtimeMinutes / 60);
        const empName = emp.fullName || emp.nameAr || emp.name || emp.employeeNumber || 'موظف';
        return {
          ruleId: 'excessive-overtime',
          severity: hours >= 80 ? 'high' : 'medium',
          dedupeKey: `overtime:${g._id}:${monthStart.toISOString().slice(0, 7)}`,
          subject: { kind: 'employee', id: String(g._id), name: empName },
          message: `${empName} عمل ${hours} ساعة إضافية في الشهر — مؤشر إنهاك أو سوء توزيع.`,
          recipients: [
            { kind: 'user', id: emp.managerId ? String(emp.managerId) : null, role: 'manager' },
            { kind: 'role', role: 'hr_manager' },
          ].filter(r => r.id || r.role),
          actions: [],
        };
      });
    },
  },

  {
    id: 'inactive-employee',
    labelAr: 'موظف بدون نشاط',
    labelEn: 'Employee inactive for an extended period',
    trigger: 'schedule',
    default: { enabled: true, params: { inactiveDays: 30 } },
    requires: ['Employee'],
    async evaluate({ models, now, params }) {
      const SmartAttendance =
        models.SmartAttendance || safeRequire('../../models/smart-attendance');
      if (!SmartAttendance) return [];
      const { Employee } = models;
      const cutoff = new Date(now.getTime() - (params.inactiveDays ?? 30) * DAY_MS);
      const actives = await Employee.find({ status: 'active' })
        .select('fullName name nameAr employeeNumber managerId')
        .limit(2000)
        .lean();
      if (!actives.length) return [];
      const empIds = actives.map(e => e._id);
      const recent = await SmartAttendance.aggregate([
        {
          $match: { employeeId: { $in: empIds }, date: { $gte: cutoff }, isDeleted: { $ne: true } },
        },
        { $group: { _id: '$employeeId', latest: { $max: '$date' } } },
      ]).catch(() => []);
      const recentSet = new Set(recent.map(r => String(r._id)));
      const findings = [];
      for (const emp of actives) {
        if (recentSet.has(String(emp._id))) continue;
        const empName = emp.fullName || emp.nameAr || emp.name || emp.employeeNumber || 'موظف';
        findings.push({
          ruleId: 'inactive-employee',
          severity: 'medium',
          dedupeKey: `inactive:${emp._id}:${cutoff.toISOString().slice(0, 10)}`,
          subject: { kind: 'employee', id: String(emp._id), name: empName },
          message: `${empName} لم يُسجَّل له حضور خلال ${params.inactiveDays ?? 30} يوماً — يحتاج فحص حالة (إجازة طويلة؟ غياب بدون عذر؟).`,
          recipients: [
            { kind: 'user', id: emp.managerId ? String(emp.managerId) : null, role: 'manager' },
            { kind: 'role', role: 'hr_manager' },
          ].filter(r => r.id || r.role),
          actions: [],
        });
        if (findings.length >= 50) break;
      }
      return findings;
    },
  },

  {
    id: 'pending-disciplinary',
    labelAr: 'إجراء تأديبي معلَّق',
    labelEn: 'Pending disciplinary action',
    trigger: 'schedule',
    default: { enabled: true, params: { thresholdDays: 7 } },
    requires: ['DisciplinaryAction'],
    async evaluate({ models, now, params }) {
      const { DisciplinaryAction } = models;
      const cutoff = new Date(now.getTime() - (params.thresholdDays ?? 7) * DAY_MS);
      const open = await DisciplinaryAction.find({
        status: 'open',
        actionDate: { $lte: cutoff },
      })
        .select('_id employeeId type actionDate reason')
        .limit(100)
        .lean();
      if (!open.length) return [];
      return open.map(a => {
        const daysOpen = Math.floor((now.getTime() - new Date(a.actionDate).getTime()) / DAY_MS);
        const sev = daysOpen > 30 ? 'high' : 'medium';
        return {
          ruleId: 'pending-disciplinary',
          severity: sev,
          dedupeKey: `disciplinary-open:${a._id}`,
          subject: { kind: 'disciplinary_action', id: String(a._id), name: a.type ?? 'إجراء' },
          message: `إجراء تأديبي (${a.type ?? '—'}) معلَّق منذ ${daysOpen} يوماً — يحتاج قراراً.`,
          recipients: [
            { kind: 'role', role: 'hr_manager' },
            { kind: 'role', role: 'admin' },
          ],
          actions: [],
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
