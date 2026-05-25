'use strict';

/**
 * modelEventBridge.js — W394 (2026-05-25).
 *
 * Closes the W392 baseline of 17 orphan LIVE-registry subscribers by hooking
 * Mongoose post-save listeners on each relevant model + publishing the
 * canonical contract event to integrationBus. Subscribers in
 * crossModuleSubscribers.js then receive the events for the first time.
 *
 * Why post-save hooks (not service.emit):
 *   - W379-W386 wired DDD services via BaseService.emit + W387 bridge.
 *     Works because those services are domain singletons we own.
 *   - LIVE registry events (HR/finance/medical/etc) span many services we
 *     haven't wired individually. Each create flow has different shape +
 *     different lifecycle method names.
 *   - Mongoose post-save is the LOWEST COMMON DENOMINATOR — fires
 *     uniformly regardless of which service does the create.
 *   - Fire-and-forget (.catch swallowed) so save latency is unaffected.
 *
 * Trade-offs:
 *   - Fires on EVERY save, including updates. We capture `isNew` via a
 *     pre-save hook to distinguish creates from updates where contracts
 *     require it (e.g., hr.employee.hired is create-only).
 *   - Models with optional fields → payload values may be undefined.
 *     Subscribers must tolerate missing fields gracefully.
 *
 * Field-mapping is best-effort based on common Mongoose schema conventions.
 * Each mapping has fallback chains (`entity.foo || entity.fooId || ...`).
 * Drift in field names will surface in production via subscriber-side
 * undefined-handling; ratchet-down via W392 catches contract-shape changes.
 *
 * Pattern matches W387 serviceEventBridge: idempotent via Symbol flag, wired
 * once at startup, fire-and-forget publish.
 */

const logger = require('../utils/logger');

const HOOK_FLAG = Symbol.for('w394.modelEventBridge.attached');

// W404: pre-require model files whose schemas are NOT auto-loaded by the
// startup sequence (pharmacy routes mount late; PayrollPeriod is loaded
// only via hikvisionBootstrap; RiskSnapshot via riskSweeperBootstrap). The
// require() side effect registers the schema with mongoose so the
// bridge's `mongoose.model('X')` lookup succeeds.
function _preloadOptionalModels() {
  const optional = [
    '../models/pharmacy.model', // registers Prescription + Dispensing + Medication
    '../models/RiskSnapshot',
    '../models/PayrollPeriod',
  ];
  for (const p of optional) {
    try {
      require(p);
    } catch (err) {
      logger.debug?.(`[ModelEventBridge] optional preload skipped: ${p} (${err.message})`);
    }
  }
}

// Helper: capture isNew flag pre-save (Mongoose loses it post-save).
// Attached once per schema in attachCreateOnlyHook below.
function _attachIsNewCapture(Schema) {
  if (Schema[HOOK_FLAG]) return;
  Schema.pre('save', function (next) {
    this.$__wasNew = this.isNew;
    next();
  });
  Schema[HOOK_FLAG] = true;
}

// Mappings: each entry describes how to forward a model save to a canonical
// LIVE contract event. trigger='create-only' = only on first save (isNew at
// pre-save time); trigger='any-save' = on every save.
const MAPPINGS = [
  // ─── HR ─────────────────────────────────────────────────────────────────
  {
    modelName: 'Employee',
    domain: 'hr',
    eventType: 'employee.hired',
    trigger: 'create-only',
    payload: doc => ({
      employeeId: String(doc._id),
      name:
        doc.fullName ||
        doc.name ||
        `${doc.firstName || ''} ${doc.lastName || ''}`.trim() ||
        'Unknown',
      department: doc.department || doc.departmentName || doc.departmentId || '',
      position: doc.position || doc.jobTitle || doc.title || '',
      startDate: doc.startDate || doc.hireDate || doc.joinDate || doc.createdAt,
      contractType: doc.contractType || doc.employmentType || 'full-time',
    }),
  },
  {
    modelName: 'Employee',
    domain: 'hr',
    eventType: 'employee.terminated',
    // Triggers on update where status flips to 'terminated' or similar
    trigger: 'status-flip',
    flipField: 'status',
    flipTo: ['terminated', 'inactive', 'separated'],
    payload: doc => ({
      employeeId: String(doc._id),
      reason: doc.terminationReason || doc.statusReason || 'unspecified',
      effectiveDate: doc.terminationDate || doc.lastDay || new Date(),
      settlementAmount: doc.settlementAmount || 0,
    }),
  },
  {
    modelName: 'LeaveRequest',
    domain: 'hr',
    eventType: 'leave.requested',
    trigger: 'create-only',
    payload: doc => ({
      employeeId: String(doc.employeeId || doc.employee),
      leaveType: doc.type || doc.leaveType || 'unspecified',
      startDate: doc.startDate || doc.fromDate,
      endDate: doc.endDate || doc.toDate,
      days: doc.days || doc.numberOfDays || 0,
    }),
  },
  {
    modelName: 'LeaveRequest',
    domain: 'hr',
    eventType: 'leave.approved',
    trigger: 'status-flip',
    flipField: 'status',
    flipTo: ['approved'],
    payload: doc => ({
      employeeId: String(doc.employeeId || doc.employee),
      leaveType: doc.type || doc.leaveType || 'unspecified',
      startDate: doc.startDate || doc.fromDate,
      endDate: doc.endDate || doc.toDate,
      approvedBy: doc.approvedBy || doc.reviewedBy || 'system',
    }),
  },
  // ─── FINANCE ────────────────────────────────────────────────────────────
  {
    modelName: 'Invoice',
    domain: 'finance',
    eventType: 'invoice.created',
    trigger: 'create-only',
    payload: doc => ({
      invoiceId: String(doc._id),
      beneficiaryId: String(doc.beneficiaryId || doc.beneficiary || ''),
      amount: doc.amount || doc.totalAmount || 0,
      currency: doc.currency || 'SAR',
      dueDate: doc.dueDate || doc.paymentDueDate,
      items: doc.items || doc.lineItems || [],
    }),
  },
  {
    modelName: 'Payment',
    domain: 'finance',
    eventType: 'payment.received',
    trigger: 'create-only',
    payload: doc => ({
      paymentId: String(doc._id),
      invoiceId: String(doc.invoiceId || doc.invoice || ''),
      amount: doc.amount || 0,
      method: doc.method || doc.paymentMethod || 'unknown',
      receivedAt: doc.receivedAt || doc.paymentDate || doc.createdAt,
    }),
  },
  // ─── MEDICAL ────────────────────────────────────────────────────────────
  {
    modelName: 'MedicalRecord',
    domain: 'medical',
    eventType: 'record.created',
    trigger: 'create-only',
    payload: doc => ({
      recordId: String(doc._id),
      beneficiaryId: String(doc.beneficiaryId || doc.beneficiary || ''),
      recordType: doc.type || doc.recordType || 'general',
      createdBy: String(doc.createdBy || doc.recordedBy || 'system'),
    }),
  },
  {
    modelName: 'ClinicalSession',
    domain: 'medical',
    eventType: 'therapy.session_completed',
    trigger: 'status-flip',
    flipField: 'status',
    flipTo: ['completed'],
    payload: doc => ({
      sessionId: String(doc._id),
      beneficiaryId: String(doc.beneficiaryId),
      therapistId: String(doc.therapistId || ''),
      sessionType: doc.type || doc.sessionType || 'therapy',
      duration: doc.duration || 0,
      outcome: doc.outcome || doc.notes || '',
    }),
  },
  // ─── BENEFICIARY (LIVE registry domain='beneficiary' not 'core') ───────
  {
    modelName: 'Beneficiary',
    domain: 'beneficiary',
    eventType: 'beneficiary.registered',
    trigger: 'create-only',
    payload: doc => ({
      beneficiaryId: String(doc._id),
      name:
        doc.fullNameArabic ||
        doc.fullName ||
        `${doc.personalInfo?.firstName || doc.firstName || ''} ${doc.personalInfo?.lastName || doc.lastName || ''}`.trim() ||
        'Unknown',
      type: doc.disability?.primaryDiagnosis || doc.beneficiaryType || 'rehabilitation',
      registeredBy: String(doc.createdBy || 'system'),
    }),
  },
  {
    modelName: 'Beneficiary',
    domain: 'beneficiary',
    eventType: 'beneficiary.status_changed',
    trigger: 'status-flip-any',
    flipField: 'status',
    // Any status change triggers (no specific target)
    payload: doc => ({
      beneficiaryId: String(doc._id),
      oldStatus: doc.$__previousStatus || 'unknown',
      newStatus: doc.status,
      reason: doc.statusReason || 'unspecified',
    }),
  },
  {
    modelName: 'ClinicalAssessment',
    domain: 'beneficiary',
    eventType: 'assessment.completed',
    trigger: 'status-flip',
    flipField: 'status',
    flipTo: ['completed', 'finalized'],
    payload: doc => ({
      beneficiaryId: String(doc.beneficiary || doc.beneficiaryId),
      assessmentId: String(doc._id),
      assessmentType: doc.tool || doc.type || 'unknown',
      overallScore: doc.score || doc.totalScore || 0,
      assessor: String(doc.assessorId || doc.createdBy || 'system'),
    }),
  },
  // ─── ATTENDANCE ─────────────────────────────────────────────────────────
  {
    modelName: 'AttendanceRecord',
    domain: 'attendance',
    eventType: 'employee.checked_in',
    trigger: 'create-only',
    payload: doc => ({
      employeeId: String(doc.employeeId || doc.employee || ''),
      checkedInAt: doc.checkInTime || doc.checkedInAt || doc.createdAt,
      location: doc.location || doc.checkInLocation || '',
      method: doc.method || doc.checkInMethod || 'manual',
    }),
  },
  {
    modelName: 'AttendanceRecord',
    domain: 'attendance',
    eventType: 'employee.checked_out',
    trigger: 'status-flip',
    flipField: 'status',
    flipTo: ['checked_out', 'completed'],
    payload: doc => ({
      employeeId: String(doc.employeeId || doc.employee || ''),
      checkedOutAt: doc.checkOutTime || doc.checkedOutAt || new Date(),
      totalHours: doc.totalHours || doc.workedHours || 0,
    }),
  },
  // ─── W396 additions ─────────────────────────────────────────────────────
  {
    modelName: 'Expense',
    domain: 'finance',
    eventType: 'expense.approved',
    trigger: 'status-flip',
    flipField: 'status',
    flipTo: ['approved'],
    payload: doc => ({
      expenseId: String(doc._id),
      amount: doc.amount || doc.totalAmount || 0,
      category: doc.category || doc.expenseCategory || 'other',
      approvedBy: String(doc.approvedBy || doc.reviewedBy || 'system'),
      department: doc.department || doc.departmentId || '',
    }),
  },
  {
    modelName: 'Notification',
    domain: 'notification',
    eventType: 'notification.delivery_failed',
    trigger: 'status-flip',
    flipField: 'status',
    flipTo: ['failed', 'delivery_failed', 'bounced'],
    payload: doc => ({
      notificationId: String(doc._id),
      recipientId: String(doc.recipientId || doc.userId || doc.to || ''),
      channel: doc.channel || doc.deliveryChannel || 'unknown',
      error: doc.error || doc.failureReason || 'unknown error',
      retryCount: doc.retryCount || doc.attempts || 0,
    }),
  },
  {
    modelName: 'Employee',
    domain: 'hr',
    eventType: 'salary.changed',
    trigger: 'status-flip-any',
    flipField: 'baseSalary',
    payload: doc => ({
      employeeId: String(doc._id),
      oldSalary: doc.$__previous_baseSalary || 0,
      newSalary: doc.baseSalary || doc.salary || 0,
      effectiveDate: doc.salaryEffectiveDate || new Date(),
      reason: doc.salaryChangeReason || 'unspecified',
    }),
  },
  {
    modelName: 'Employee',
    domain: 'hr',
    eventType: 'department.transferred',
    trigger: 'status-flip-any',
    flipField: 'department',
    payload: doc => ({
      employeeId: String(doc._id),
      fromDepartment: doc.$__previous_department || 'unknown',
      toDepartment: doc.department || doc.departmentId || 'unknown',
      effectiveDate: doc.transferDate || new Date(),
    }),
  },
  // ─── W404 additions: closes final 3 W382 / 1 W392 baseline entries ────
  {
    modelName: 'Prescription',
    domain: 'medical',
    eventType: 'prescription.issued',
    trigger: 'create-only',
    payload: doc => ({
      prescriptionId: String(doc._id),
      beneficiaryId: String(doc.beneficiary || doc.beneficiaryId || ''),
      doctorId: String(doc.prescriber || doc.prescriberId || doc.createdBy || ''),
      medications: Array.isArray(doc.items)
        ? doc.items.map(it => ({
            medicationId: String(it.medication || ''),
            name: it.medicationName || '',
            dose: it.dose || '',
            frequency: it.frequency || '',
            duration: it.duration || '',
          }))
        : [],
    }),
  },
  {
    modelName: 'RiskSnapshot',
    domain: 'medical',
    eventType: 'risk.alert_raised',
    trigger: 'create-only',
    // Only emit when this snapshot represents a clinically actionable risk
    // signal: a tier escalation OR the first-ever snapshot landing in
    // high/critical. Routine recompute of moderate/low tiers is noise.
    predicate: doc => {
      const tier = doc.overallTier;
      if (doc.tierDelta === 'escalated') return true;
      if (doc.tierDelta === 'first' && (tier === 'high' || tier === 'critical')) return true;
      return false;
    },
    payload: doc => ({
      beneficiaryId: String(doc.beneficiaryId || ''),
      riskLevel: String(doc.overallTier || 'unknown'),
      riskType: String(doc.reason || 'risk_profile'),
      details: String(doc.explanation || ''),
      raisedBy: 'risk_profile_sweeper',
    }),
  },
  {
    modelName: 'PayrollPeriod',
    domain: 'finance',
    eventType: 'payroll.processed',
    trigger: 'status-flip',
    flipField: 'status',
    flipTo: ['closed'],
    payload: doc => ({
      payrollId: String(doc._id),
      period: String(doc.periodCode || ''),
      totalAmount: 0, // periods aggregate via HRPayroll children; subscriber re-aggregates
      employeeCount: Number(doc.casesCounted || 0),
      processedAt: doc.closedAt || new Date(),
    }),
  },
];

/**
 * Wire model post-save hooks for the W394 LIVE-registry producer wires.
 *
 * @param {Object} integrationBus - The systemIntegrationBus singleton
 * @returns {{wiredCount: number, skippedMappings: string[]}}
 */
function wireModelEventBridge(integrationBus) {
  if (!integrationBus || typeof integrationBus.publish !== 'function') {
    logger.warn('[ModelEventBridge] integrationBus unavailable — skipping');
    return { wiredCount: 0, skippedMappings: ['ALL'] };
  }

  // W404: ensure schemas for late-loaded models are registered before lookup.
  _preloadOptionalModels();

  const mongoose = require('mongoose');
  const skipped = [];
  let wired = 0;

  // Track which (modelName, eventType) pairs we've already wired to avoid
  // double-attach if startup runs twice (test env).
  const ATTACHED_PAIRS = Symbol.for('w394.modelEventBridge.attachedPairs');
  let attachedSet = mongoose[ATTACHED_PAIRS];
  if (!attachedSet) {
    attachedSet = new Set();
    mongoose[ATTACHED_PAIRS] = attachedSet;
  }

  for (const mapping of MAPPINGS) {
    const { modelName, domain, eventType, trigger, flipField, flipTo, payload, predicate } =
      mapping;
    const pairKey = `${modelName}|${eventType}`;
    if (attachedSet.has(pairKey)) continue;

    let Model;
    try {
      Model = mongoose.model(modelName);
    } catch {
      skipped.push(`${modelName}.${eventType} (model not registered)`);
      continue;
    }

    const Schema = Model.schema;
    _attachIsNewCapture(Schema);

    // status-flip needs to capture the original status pre-save
    if (trigger === 'status-flip' || trigger === 'status-flip-any') {
      const fieldName = flipField || 'status';
      Schema.post('init', function () {
        this[`$__previous_${fieldName}`] = this[fieldName];
      });
    }

    Schema.post('save', function (doc) {
      try {
        // Distinguish create-only from updates via $__wasNew (set in pre-save)
        if (trigger === 'create-only' && !this.$__wasNew) return;

        if (trigger === 'status-flip') {
          const previous = this[`$__previous_${flipField || 'status'}`];
          const current = doc[flipField || 'status'];
          if (current === previous) return; // no change
          if (Array.isArray(flipTo) && !flipTo.includes(current)) return; // not the target value
        }

        if (trigger === 'status-flip-any') {
          const previous = this[`$__previous_${flipField || 'status'}`];
          const current = doc[flipField || 'status'];
          if (current === previous) return; // no change
          doc.$__previousStatus = previous;
        }

        // W404: optional predicate gates the emit. Returning false skips
        // (e.g. RiskSnapshot only emits on tier escalation, not every save).
        if (typeof predicate === 'function' && !predicate(doc)) return;

        const eventPayload = payload(doc);
        Promise.resolve()
          .then(() => integrationBus.publish(domain, eventType, eventPayload))
          .catch(err => {
            logger.error(
              `[ModelEventBridge] forward failed for ${domain}.${eventType}: ${err.message}`
            );
          });
      } catch (err) {
        logger.error(`[ModelEventBridge] hook error in ${modelName}.${eventType}: ${err.message}`);
      }
    });

    attachedSet.add(pairKey);
    wired++;
  }

  logger.info(
    `[ModelEventBridge] wired ${wired} model post-save → integrationBus mappings` +
      (skipped.length ? ` (skipped: ${skipped.length})` : '')
  );

  return { wiredCount: wired, skippedMappings: skipped };
}

module.exports = { wireModelEventBridge, MAPPINGS };
