'use strict';

/**
 * complianceCalendar.service.js — Phase 13 Commit 3 (4.0.57).
 *
 * Aggregator over stored calendar events + adapters that compute
 * events from upstream modules (EvidenceItem validity,
 * ManagementReview cycles, HR credential expiries, …).
 *
 * Design:
 *
 *   • Stored events live in the `ComplianceCalendarEvent` model —
 *     manual regulatory deadlines + resolution snapshots.
 *
 *   • Computed events are generated at query time by registered
 *     adapters. Each adapter is a function:
 *
 *       async (window, ctx) =>
 *         [{ id, title, type, dueDate, severity, source, branchId, ... }]
 *
 *     returning a read-only event shape identical to the stored
 *     model's `toJSON` (minus DB-only fields like `_id` / `code`).
 *
 *   • The service dedupes by `(source.adapter, source.docId)` so
 *     if an operator acts on a computed event (promoting it to
 *     stored + resolved), the stored version wins.
 *
 *   • Invariants around status (resolve / cancel / snooze /
 *     re-open) live in the service so model stays dumb.
 *
 * DI:
 *
 *   createComplianceCalendarService({
 *     model,                  // ComplianceCalendarEvent (required)
 *     adapters: {             // all optional; missing → skipped
 *       evidence_vault,       // () => EvidenceItem service
 *       management_review,    // () => ManagementReview service
 *       hr_credentials,       // () => { findExpiring(window) }
 *       documents_expiry,     // () => { findExpiring(window) }
 *       capa,                 // () => { findOpenWithDueDate(window) }
 *       ...
 *     },
 *     dispatcher,
 *     logger,
 *     now,
 *   })
 */

const {
  CALENDAR_EVENT_TYPES,
  CALENDAR_EVENT_STATUSES,
  TERMINAL_STATUSES,
  DEFAULT_URGENCY_BANDS,
  DEFAULT_ALERT_WINDOWS,
  SOURCE_ADAPTERS,
  statusFor,
  windowsCrossed,
  defaultSeverityFor,
} = require('../../config/compliance-calendar.registry');

// ── built-in adapters ──────────────────────────────────────────────
// Each built-in knows how to turn records from one BC into
// read-only calendar events. They're defensive: if the target
// service is missing or a record is malformed, the adapter yields
// nothing rather than blowing up the whole calendar fetch.

function _safe(fn) {
  return async (...args) => {
    try {
      const out = await fn(...args);
      return Array.isArray(out) ? out : [];
    } catch {
      return [];
    }
  };
}

function _adapterFromEvidenceVault(vault) {
  return _safe(async ({ withinDays = 90 } = {}) => {
    if (!vault || typeof vault.findExpiring !== 'function') return [];
    const rows = await vault.findExpiring(withinDays);
    return rows.map(r => ({
      _sourceKey: `evidence_vault:${r._id}`,
      title: `Evidence expiring: ${r.title}`,
      description: `${r.type} · code ${r.code}`,
      type: 'evidence_expiry',
      severity: defaultSeverityFor('evidence_expiry'),
      dueDate: r.validUntil,
      regulationRefs: (r.regulationRefs || []).map(x => ({
        standard: x.standard,
        clause: x.clause,
      })),
      branchId: r.branchId || null,
      tenantId: r.tenantId || null,
      source: {
        adapter: 'evidence_vault',
        collection: 'evidenceitems',
        docId: r._id,
      },
      computed: true,
    }));
  });
}

function _adapterFromManagementReview(mrService) {
  return _safe(async ({ withinDays = 180 } = {}) => {
    if (!mrService || typeof mrService.list !== 'function') return [];
    const horizon = new Date(Date.now() + withinDays * 86400000);
    const rows = await mrService.list({ status: 'scheduled', toDate: horizon });
    return rows.map(r => ({
      _sourceKey: `management_review:${r._id}`,
      title: `Management Review — ${r.title}`,
      description: `Review ${r.reviewNumber} · type ${r.type}`,
      type: 'management_review',
      severity: defaultSeverityFor('management_review'),
      dueDate: r.scheduledFor,
      regulationRefs: [{ standard: 'iso_9001', clause: '9.3' }],
      branchId: r.branchId || null,
      tenantId: r.tenantId || null,
      source: {
        adapter: 'management_review',
        collection: 'managementreviews',
        docId: r._id,
      },
      computed: true,
    }));
  });
}

function _adapterFromHrCredentials(hr) {
  return _safe(async ({ withinDays = 90 } = {}) => {
    if (!hr || typeof hr.findExpiring !== 'function') return [];
    const rows = await hr.findExpiring(withinDays);
    return rows.map(r => ({
      _sourceKey: `hr_credentials:${r._id || r.id}`,
      title: `Credential expiring: ${r.employeeName || 'Employee'} · ${r.credentialType || 'license'}`,
      description: r.credentialNumber || null,
      type: 'credential_expiry',
      severity: defaultSeverityFor('credential_expiry'),
      dueDate: r.expiresOn || r.expiry_date,
      branchId: r.branchId || r.branch_id || null,
      source: {
        adapter: 'hr_credentials',
        collection: r.collection || null,
        docId: r._id || r.id || null,
      },
      computed: true,
    }));
  });
}

function _adapterFromDocumentsExpiry(docs) {
  return _safe(async ({ withinDays = 90 } = {}) => {
    if (!docs || typeof docs.findExpiring !== 'function') return [];
    const rows = await docs.findExpiring(withinDays);
    return rows.map(r => ({
      _sourceKey: `documents_expiry:${r._id || r.id}`,
      title: `Document expiring: ${r.title || r.name}`,
      description: r.category || null,
      type: 'document_expiry',
      severity: defaultSeverityFor('document_expiry'),
      dueDate: r.expiresOn || r.expiry_date,
      branchId: r.branchId || r.branch_id || null,
      source: {
        adapter: 'documents_expiry',
        collection: r.collection || 'documents',
        docId: r._id || r.id || null,
      },
      computed: true,
    }));
  });
}

// ── service class ──────────────────────────────────────────────────

class ComplianceCalendarService {
  constructor({
    model,
    adapters = {},
    dispatcher = null,
    logger = console,
    now = () => new Date(),
  } = {}) {
    if (!model) throw new Error('ComplianceCalendarService: model is required');
    this.model = model;
    this.dispatcher = dispatcher;
    this.logger = logger;
    this.now = now;

    // Wrap built-in adapter helpers with whatever services the
    // caller injected. Callers can pass raw instances or
    // pre-built adapter functions.
    this.adapters = {};
    for (const [key, val] of Object.entries(adapters)) {
      if (typeof val === 'function') {
        this.adapters[key] = _safe(val);
      } else if (val && typeof val === 'object') {
        this.adapters[key] = this._buildAdapter(key, val);
      }
    }
  }

  _buildAdapter(key, serviceOrSource) {
    switch (key) {
      case 'evidence_vault':
        return _adapterFromEvidenceVault(serviceOrSource);
      case 'management_review':
        return _adapterFromManagementReview(serviceOrSource);
      case 'hr_credentials':
        return _adapterFromHrCredentials(serviceOrSource);
      case 'documents_expiry':
        return _adapterFromDocumentsExpiry(serviceOrSource);
      default:
        // unknown adapter id with a plain-object service: ignore
        return _safe(async () => []);
    }
  }

  async _emit(eventName, payload) {
    if (!this.dispatcher || typeof this.dispatcher.emit !== 'function') return;
    try {
      await this.dispatcher.emit(eventName, payload);
    } catch (err) {
      this.logger.warn(`[Calendar] dispatch ${eventName} failed: ${err.message}`);
    }
  }

  // ── stored-event CRUD ──────────────────────────────────────────

  async createEvent(data, userId) {
    if (!data || !data.title) throw new Error('title is required');
    if (!data.type || !CALENDAR_EVENT_TYPES.includes(data.type)) {
      throw new Error('valid type is required');
    }
    if (!data.dueDate) throw new Error('dueDate is required');
    if (!userId) throw new Error('userId is required');

    const dueDate = new Date(data.dueDate);
    const severity = data.severity || defaultSeverityFor(data.type);
    const status = statusFor(dueDate, this.now());

    const doc = await this.model.create({
      title: data.title,
      description: data.description || null,
      type: data.type,
      severity,
      dueDate,
      windowStart: data.windowStart ? new Date(data.windowStart) : null,
      windowEnd: data.windowEnd ? new Date(data.windowEnd) : null,
      status,
      regulationRefs: data.regulationRefs || [],
      source: data.source || { adapter: 'manual' },
      ownerUserId: data.ownerUserId || null,
      ownerRole: data.ownerRole || null,
      branchId: data.branchId || null,
      tenantId: data.tenantId || null,
      tags: data.tags || [],
      createdBy: userId,
    });

    await this._emit('compliance.calendar.event_created', {
      eventId: String(doc._id),
      code: doc.code,
      type: doc.type,
      severity: doc.severity,
      dueDate: doc.dueDate,
      branchId: doc.branchId ? String(doc.branchId) : null,
      by: String(userId),
    });
    return doc;
  }

  async resolve(eventId, { evidenceId, notes } = {}, userId) {
    const doc = await this._load(eventId);
    if (doc.status === 'resolved') return doc;
    if (TERMINAL_STATUSES.includes(doc.status)) {
      throw Object.assign(new Error('event already terminal'), {
        code: 'ILLEGAL_TRANSITION',
      });
    }
    doc.status = 'resolved';
    doc.resolution = {
      resolvedBy: userId,
      resolvedAt: this.now(),
      evidenceId: evidenceId || null,
      notes: notes || null,
    };
    await doc.save();

    await this._emit('compliance.calendar.event_resolved', {
      eventId: String(doc._id),
      by: String(userId),
    });
    return doc;
  }

  async cancel(eventId, reason, userId) {
    if (!reason || !String(reason).trim()) {
      throw new Error('cancellation reason is required');
    }
    const doc = await this._load(eventId);
    if (doc.status === 'cancelled') return doc;
    if (TERMINAL_STATUSES.includes(doc.status)) {
      throw Object.assign(new Error('event already terminal'), {
        code: 'ILLEGAL_TRANSITION',
      });
    }
    doc.status = 'cancelled';
    doc.cancelledReason = String(reason).trim();
    doc.cancelledBy = userId;
    doc.cancelledAt = this.now();
    await doc.save();

    await this._emit('compliance.calendar.event_cancelled', {
      eventId: String(doc._id),
      by: String(userId),
    });
    return doc;
  }

  async snooze(eventId, newDueDate, reason, userId) {
    const doc = await this._load(eventId);
    if (TERMINAL_STATUSES.includes(doc.status)) {
      throw Object.assign(new Error('event already terminal'), {
        code: 'ILLEGAL_TRANSITION',
      });
    }
    if (!newDueDate) throw new Error('newDueDate is required');
    doc.snoozedUntil = doc.dueDate;
    doc.snoozeReason = reason || null;
    doc.dueDate = new Date(newDueDate);
    doc.status = statusFor(doc.dueDate, this.now());
    await doc.save();

    await this._emit('compliance.calendar.event_snoozed', {
      eventId: String(doc._id),
      newDueDate: doc.dueDate,
      by: String(userId),
    });
    return doc;
  }

  async recordAlertFired(eventId, window, channel = null) {
    const doc = await this._load(eventId);
    const already = doc.alertsFired.some(a => a.window === window);
    if (already) return doc;
    doc.alertsFired.push({ window, firedAt: this.now(), channel });
    await doc.save();
    return doc;
  }

  async findById(eventId) {
    return this.model.findOne({ _id: eventId, deleted_at: null });
  }

  // ── aggregate view (stored + computed) ─────────────────────────

  /**
   * The unified calendar view. Returns stored events + adapter
   * events, de-duplicated and sorted by dueDate.
   *
   * Accepts { branchId, withinDays, type, severity, status, source,
   *          includeResolved, limit }.
   */
  async list({
    branchId,
    withinDays = 90,
    type,
    severity,
    status,
    source,
    includeResolved = false,
    limit = 200,
  } = {}) {
    const now = this.now();
    const horizon = new Date(now.getTime() + withinDays * 86400000);

    // ── stored events ──────────────────────────────────────────
    const storedFilter = {
      deleted_at: null,
      dueDate: { $lte: horizon },
    };
    if (branchId) storedFilter.branchId = branchId;
    if (type) storedFilter.type = type;
    if (severity) storedFilter.severity = severity;
    if (!includeResolved) {
      storedFilter.status = {
        $in: CALENDAR_EVENT_STATUSES.filter(s => !TERMINAL_STATUSES.includes(s)),
      };
    }
    if (status) {
      // override the non-terminal filter if caller asked for a specific status
      storedFilter.status = status;
    }
    if (source) storedFilter['source.adapter'] = source;

    const stored = await this.model
      .find(storedFilter)
      .sort({ dueDate: 1 })
      .limit(Math.min(Number(limit) || 200, 500))
      .lean();

    // Recompute effective status on read so a row that drifted
    // from upcoming → due_soon since last save shows correctly.
    for (const s of stored) {
      if (!TERMINAL_STATUSES.includes(s.status) && s.status !== 'snoozed') {
        s.status = statusFor(s.dueDate, now);
      }
    }

    // ── computed events via adapters ───────────────────────────
    const adapterIds = source
      ? [source].filter(id => this.adapters[id])
      : Object.keys(this.adapters);

    const computedArrays = await Promise.all(
      adapterIds.map(id => this.adapters[id]({ withinDays }))
    );
    let computed = computedArrays.flat();

    // Dedupe computed against stored by source key.
    const storedSourceKeys = new Set(
      stored
        .filter(s => s.source && s.source.adapter !== 'manual' && s.source.docId)
        .map(s => `${s.source.adapter}:${s.source.docId}`)
    );
    computed = computed
      .filter(c => !storedSourceKeys.has(c._sourceKey))
      .map(c => {
        // Compute the status on the fly for computed rows.
        const st = statusFor(c.dueDate, now);
        return { ...c, status: st };
      });

    // Optional filters on computed
    if (branchId) {
      computed = computed.filter(c => !c.branchId || String(c.branchId) === String(branchId));
    }
    if (type) computed = computed.filter(c => c.type === type);
    if (severity) computed = computed.filter(c => c.severity === severity);
    if (status) computed = computed.filter(c => c.status === status);

    // ── merge + sort ───────────────────────────────────────────
    const merged = [...stored, ...computed].sort((a, b) => {
      const ta = new Date(a.dueDate).getTime();
      const tb = new Date(b.dueDate).getTime();
      return ta - tb;
    });

    return merged.slice(0, Math.min(Number(limit) || 200, 500));
  }

  /**
   * Counts by status + severity for dashboards.
   */
  async getStats({ branchId, withinDays = 90 } = {}) {
    const rows = await this.list({
      branchId,
      withinDays,
      includeResolved: false,
      limit: 500,
    });
    const byStatus = { upcoming: 0, due_soon: 0, urgent: 0, overdue: 0, snoozed: 0 };
    const bySeverity = { info: 0, warning: 0, critical: 0 };
    const byType = {};
    for (const r of rows) {
      if (byStatus[r.status] != null) byStatus[r.status]++;
      if (bySeverity[r.severity] != null) bySeverity[r.severity]++;
      byType[r.type] = (byType[r.type] || 0) + 1;
    }
    return { total: rows.length, byStatus, bySeverity, byType };
  }

  /**
   * Which alert-escalation windows have been crossed but not yet
   * fired for a given stored event. Used by the sweeper (C11).
   */
  pendingAlertsFor(event, windows = DEFAULT_ALERT_WINDOWS, now = this.now()) {
    if (!event || !event.dueDate) return [];
    if (TERMINAL_STATUSES.includes(event.status)) return [];
    const daysUntilDue = (new Date(event.dueDate).getTime() - now.getTime()) / 86400000;
    const crossed = windowsCrossed(daysUntilDue, windows);
    const fired = new Set((event.alertsFired || []).map(a => a.window));
    return crossed.filter(w => !fired.has(w));
  }

  async _load(eventId) {
    const doc = await this.model.findOne({ _id: eventId, deleted_at: null });
    if (!doc) {
      const err = new Error('ComplianceCalendarEvent not found');
      err.code = 'NOT_FOUND';
      throw err;
    }
    return doc;
  }
}

// ── factory + lazy singleton ───────────────────────────────────────

function createComplianceCalendarService(deps) {
  return new ComplianceCalendarService(deps);
}

let _defaultInstance = null;
function getDefault() {
  if (!_defaultInstance) {
    const model = require('../../models/quality/ComplianceCalendarEvent.model');
    _defaultInstance = new ComplianceCalendarService({
      model,
      // Adapters can be bound at server boot in C11; default
      // singleton ships with no adapters so tests + early boot
      // don't require the full module graph.
      adapters: {},
    });
  }
  return _defaultInstance;
}

function _replaceDefault(instance) {
  _defaultInstance = instance;
}

module.exports = {
  ComplianceCalendarService,
  createComplianceCalendarService,
  getDefault,
  _replaceDefault,
  SOURCE_ADAPTERS,
};
