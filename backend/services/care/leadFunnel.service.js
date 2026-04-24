'use strict';

/**
 * leadFunnel.service.js — Phase 17 Commit 1 (4.0.83).
 *
 * Owns the CRM acquisition funnel — Inquiry and Lead state
 * machines plus SLA orchestration and activity-log writes.
 *
 * Public surfaces:
 *
 *   Inquiry side:
 *     createInquiry(data)                  — new inquiry, activates inquiry SLA
 *     acknowledgeInquiry(id, actor)        — flips new→acknowledged + resolves SLA
 *     routeInquiry(id, { ownerUserId })    — assigns owner
 *     closeInquiry(id, { reason })         — closes with reason
 *     promoteInquiry(id, leadData)         — creates Lead, links back,
 *                                             activates lead SLAs
 *
 *   Lead side:
 *     createLead(data)                     — direct lead (no inquiry)
 *     logActivity(id, entry)               — append to activity[]
 *                                             (first call → resolves
 *                                              first-response SLA)
 *     transitionLead(id, toStatus, { patch, notes })
 *                                          — state-machine transition
 *                                            + SLA hooks per pause/terminal
 *     convertLead(id, { beneficiaryId })   — terminal transition to
 *                                            converted + resolves
 *                                            conversion SLA
 *     markLost(id, { lostReason, detail })
 *     cancelLead(id, { reason })
 *
 *   Reads:
 *     listInquiries / findInquiryById
 *     listLeads / findLeadById
 *     getFunnelStats({ branchId, windowDays })
 *
 * Every transition emits a bus event for the Phase-15 notification
 * router to subscribe to:
 *   - ops.crm.inquiry.received / acknowledged / routed / closed / promoted
 *   - ops.crm.lead.created / contacted / qualified / interested /
 *     assessment_scheduled / converted / lost / cancelled / transitioned
 *
 * Error codes:
 *   NOT_FOUND / ILLEGAL_TRANSITION / MISSING_FIELD / CONFLICT
 */

const registry = require('../../config/care/crm.registry');

class NotFoundError extends Error {
  constructor(msg) {
    super(msg);
    this.code = 'NOT_FOUND';
  }
}
class IllegalTransitionError extends Error {
  constructor(msg, extra = {}) {
    super(msg);
    this.code = 'ILLEGAL_TRANSITION';
    Object.assign(this, extra);
  }
}
class MissingFieldError extends Error {
  constructor(fields) {
    super(`Missing required fields: ${fields.join(', ')}`);
    this.code = 'MISSING_FIELD';
    this.fields = fields;
  }
}
class ConflictError extends Error {
  constructor(msg) {
    super(msg);
    this.code = 'CONFLICT';
  }
}

function createLeadFunnelService({
  inquiryModel,
  leadModel,
  slaEngine = null,
  dispatcher = null,
  logger = console,
  now = () => new Date(),
} = {}) {
  if (!inquiryModel) throw new Error('leadFunnel: inquiryModel required');
  if (!leadModel) throw new Error('leadFunnel: leadModel required');
  registry.validate();

  // ── helpers ────────────────────────────────────────────────────

  async function _emit(name, payload) {
    if (!dispatcher || typeof dispatcher.emit !== 'function') return;
    try {
      await dispatcher.emit(name, payload);
    } catch (err) {
      logger.warn(`[CRM] emit ${name} failed: ${err.message}`);
    }
  }

  function _missing(v) {
    if (v === null || v === undefined) return true;
    if (typeof v === 'string' && v.trim() === '') return true;
    return false;
  }

  function _pushHistory(doc, { from, to, event, actorId, notes }) {
    doc.statusHistory.push({
      from,
      to,
      event,
      actorId: actorId || null,
      at: now(),
      notes: notes || null,
    });
  }

  function _inquirySnapshot(d, extra = {}) {
    return {
      inquiryId: String(d._id),
      inquiryNumber: d.inquiryNumber,
      channel: d.channel,
      referralSource: d.referralSource,
      status: d.status,
      branchId: d.branchId ? String(d.branchId) : null,
      ...extra,
    };
  }

  function _leadSnapshot(d, extra = {}) {
    return {
      leadId: String(d._id),
      leadNumber: d.leadNumber,
      status: d.status,
      referralSource: d.referralSource,
      branchId: d.preferredBranchId ? String(d.preferredBranchId) : null,
      firstResponseSlaId: d.firstResponseSlaId ? String(d.firstResponseSlaId) : null,
      conversionSlaId: d.conversionSlaId ? String(d.conversionSlaId) : null,
      ...extra,
    };
  }

  // ── Inquiry ────────────────────────────────────────────────────

  async function createInquiry(data, { actorId = null } = {}) {
    const required = ['channel', 'contactName', 'subject'];
    const missing = required.filter(f => _missing(data[f]));
    if (missing.length) throw new MissingFieldError(missing);

    const doc = await inquiryModel.create({
      ...data,
      status: 'new',
      receivedAt: data.receivedAt || now(),
      statusHistory: [],
      createdBy: actorId,
    });

    // Activate the inquiry-acknowledgement SLA.
    if (slaEngine) {
      try {
        const sla = await slaEngine.activate({
          policyId: registry.slaPolicyForInquiry(),
          subjectType: 'Inquiry',
          subjectId: doc._id,
          subjectRef: doc.inquiryNumber,
          branchId: doc.branchId || null,
          startedAt: doc.receivedAt,
          metadata: { channel: doc.channel, referralSource: doc.referralSource },
        });
        doc.slaId = sla._id;
        await doc.save();
      } catch (err) {
        logger.warn(`[CRM] inquiry SLA activate failed: ${err.message}`);
      }
    }

    await _emit('ops.crm.inquiry.received', _inquirySnapshot(doc));
    return doc;
  }

  async function _transitionInquiry(
    id,
    toStatus,
    { actorId = null, notes = null, patch = {} } = {}
  ) {
    const doc = await inquiryModel.findById(id);
    if (!doc) throw new NotFoundError('Inquiry not found');
    const fromStatus = doc.status;
    if (!registry.canTransitionInquiry(fromStatus, toStatus)) {
      throw new IllegalTransitionError(`illegal inquiry transition ${fromStatus} → ${toStatus}`, {
        from: fromStatus,
        to: toStatus,
      });
    }
    const event = registry.eventForInquiryTransition(fromStatus, toStatus);

    // Apply patch first
    for (const [k, v] of Object.entries(patch || {})) doc[k] = v;

    const required = registry.inquiryRequiredFields(fromStatus, toStatus);
    const missing = required.filter(f => _missing(doc[f]));
    if (missing.length) throw new MissingFieldError(missing);

    _pushHistory(doc, { from: fromStatus, to: toStatus, event, actorId, notes });
    doc.status = toStatus;

    // SLA hook — acknowledged/routed/promoted/closed all resolve the
    // inquiry-ack SLA (whichever comes first wins).
    if (slaEngine && doc.slaId && toStatus !== fromStatus) {
      try {
        await slaEngine.observe({
          slaId: doc.slaId,
          eventType: registry.isInquiryTerminal(toStatus) ? 'resolved' : 'state_changed',
          state: toStatus,
          when: now(),
        });
      } catch (err) {
        logger.warn(`[CRM] inquiry SLA observe failed: ${err.message}`);
      }
    }

    await doc.save();
    await _emit(
      `ops.crm.inquiry.${event}`,
      _inquirySnapshot(doc, { from: fromStatus, to: toStatus, event })
    );
    return doc;
  }

  async function acknowledgeInquiry(id, { actorId = null } = {}) {
    const doc = await _transitionInquiry(id, 'acknowledged', { actorId });
    doc.acknowledgedAt = now();
    await doc.save();
    return doc;
  }

  async function routeInquiry(id, { ownerUserId, ownerNameSnapshot = null, actorId = null } = {}) {
    if (!ownerUserId) throw new MissingFieldError(['ownerUserId']);
    return _transitionInquiry(id, 'routed', {
      actorId,
      patch: { ownerUserId, ownerNameSnapshot },
    });
  }

  async function closeInquiry(id, { closureReason, actorId = null } = {}) {
    if (!closureReason) throw new MissingFieldError(['closureReason']);
    return _transitionInquiry(id, 'closed', {
      actorId,
      patch: { closureReason },
    });
  }

  async function markInquirySpam(id, { actorId = null } = {}) {
    return _transitionInquiry(id, 'spam', { actorId });
  }

  /**
   * Promote an inquiry into a Lead. Copies contact + subject snapshot
   * into the new lead, back-links the two, and activates lead SLAs.
   */
  async function promoteInquiry(id, leadOverrides = {}, { actorId = null } = {}) {
    const inq = await inquiryModel.findById(id);
    if (!inq) throw new NotFoundError('Inquiry not found');
    if (inq.status === 'promoted_to_lead' && inq.promotedLeadId) {
      throw new ConflictError('Inquiry already promoted');
    }
    const missing = registry
      .inquiryRequiredFields(inq.status, 'promoted_to_lead')
      .filter(f => _missing(inq[f]));
    if (missing.length) throw new MissingFieldError(missing);

    const leadData = {
      sourceInquiryId: inq._id,
      referralSource: inq.referralSource || 'other',
      campaignTag: inq.campaignTag,
      guardianName: inq.contactName,
      guardianPhone: inq.contactPhone || '',
      guardianEmail: inq.contactEmail,
      preferredContactMethod: inq.preferredContactMethod || 'phone',
      beneficiaryName: leadOverrides.beneficiaryName || inq.contactName,
      beneficiaryAgeYears: inq.beneficiaryAgeYears,
      condition: inq.condition,
      preferredBranchId: inq.branchId || null,
      ownerUserId: inq.ownerUserId || null,
      ownerNameSnapshot: inq.ownerNameSnapshot || null,
      ...leadOverrides,
    };
    const lead = await createLead(leadData, { actorId, fromInquiry: true });

    // Mark inquiry as promoted
    inq.promotedLeadId = lead._id;
    inq.promotedAt = now();
    _pushHistory(inq, {
      from: inq.status,
      to: 'promoted_to_lead',
      event: 'promoted',
      actorId,
      notes: `Promoted to ${lead.leadNumber}`,
    });
    inq.status = 'promoted_to_lead';

    // Resolve inquiry SLA if still open
    if (slaEngine && inq.slaId) {
      try {
        await slaEngine.observe({
          slaId: inq.slaId,
          eventType: 'resolved',
          when: now(),
        });
      } catch (err) {
        logger.warn(`[CRM] inquiry SLA resolve on promote failed: ${err.message}`);
      }
    }

    await inq.save();
    await _emit(
      'ops.crm.inquiry.promoted',
      _inquirySnapshot(inq, { promotedLeadId: String(lead._id) })
    );
    return { inquiry: inq, lead };
  }

  // ── Lead ──────────────────────────────────────────────────────

  async function createLead(data, { actorId = null, fromInquiry = false } = {}) {
    const required = ['guardianName', 'guardianPhone', 'beneficiaryName'];
    const missing = required.filter(f => _missing(data[f]));
    if (missing.length) throw new MissingFieldError(missing);

    const doc = await leadModel.create({
      ...data,
      status: 'new',
      statusHistory: [],
      activity: [],
      createdBy: actorId,
    });

    // Activate the first-response SLA clock (4h target).
    if (slaEngine) {
      try {
        const sla = await slaEngine.activate({
          policyId: registry.slaPolicyForLeadFirstResponse(),
          subjectType: 'CareLead',
          subjectId: doc._id,
          subjectRef: doc.leadNumber,
          branchId: doc.preferredBranchId || null,
          startedAt: doc.createdAt || now(),
          metadata: {
            referralSource: doc.referralSource,
            fromInquiry,
          },
        });
        doc.firstResponseSlaId = sla._id;
        await doc.save();
      } catch (err) {
        logger.warn(`[CRM] lead first-response SLA activate failed: ${err.message}`);
      }
    }

    await _emit('ops.crm.lead.created', _leadSnapshot(doc));
    return doc;
  }

  /**
   * Append an activity log entry. If this is the first "outbound"
   * entry (call / email / sms / whatsapp / meeting) AND
   * firstResponseAt is not yet set, mark it + resolve the
   * first-response SLA as met.
   */
  async function logActivity(id, entry, { actorId = null } = {}) {
    if (!entry || !entry.kind || !entry.summary) {
      throw new MissingFieldError(
        [!entry?.kind && 'kind', !entry?.summary && 'summary'].filter(Boolean)
      );
    }
    const lead = await leadModel.findById(id);
    if (!lead) throw new NotFoundError('Lead not found');

    const ts = entry.at ? new Date(entry.at) : now();
    lead.activity.push({
      kind: entry.kind,
      summary: entry.summary,
      detail: entry.detail || null,
      actorId: actorId || null,
      actorNameSnapshot: entry.actorNameSnapshot || null,
      at: ts,
      outcome: entry.outcome || null,
    });

    const isOutbound = ['call', 'email', 'sms', 'whatsapp', 'meeting'].includes(entry.kind);
    if (isOutbound && !lead.firstResponseAt) {
      lead.firstResponseAt = ts;
      if (slaEngine && lead.firstResponseSlaId) {
        try {
          await slaEngine.observe({
            slaId: lead.firstResponseSlaId,
            eventType: 'first_response',
            when: ts,
          });
        } catch (err) {
          logger.warn(`[CRM] lead first_response observe failed: ${err.message}`);
        }
      }
    }

    await lead.save();
    await _emit('ops.crm.lead.activity_logged', _leadSnapshot(lead, { kind: entry.kind }));
    return lead;
  }

  async function transitionLead(id, toStatus, { actorId = null, notes = null, patch = {} } = {}) {
    const lead = await leadModel.findById(id);
    if (!lead) throw new NotFoundError('Lead not found');
    const fromStatus = lead.status;
    if (!registry.canTransitionLead(fromStatus, toStatus)) {
      throw new IllegalTransitionError(`illegal lead transition ${fromStatus} → ${toStatus}`, {
        from: fromStatus,
        to: toStatus,
      });
    }
    const event = registry.eventForLeadTransition(fromStatus, toStatus);

    // Apply patch
    for (const [k, v] of Object.entries(patch || {})) lead[k] = v;

    const required = registry.leadRequiredFields(fromStatus, toStatus);
    const missing = required.filter(f => _missing(lead[f]));
    if (missing.length) throw new MissingFieldError(missing);

    _pushHistory(lead, { from: fromStatus, to: toStatus, event, actorId, notes });
    lead.status = toStatus;

    // ── Conversion SLA activation on first qualified entry ──
    if (slaEngine && toStatus === 'qualified' && !lead.conversionSlaId) {
      try {
        const sla = await slaEngine.activate({
          policyId: registry.slaPolicyForLeadConversion(),
          subjectType: 'CareLead',
          subjectId: lead._id,
          subjectRef: lead.leadNumber,
          branchId: lead.preferredBranchId || null,
          startedAt: now(),
          metadata: { leadNumber: lead.leadNumber },
        });
        lead.conversionSlaId = sla._id;
      } catch (err) {
        logger.warn(`[CRM] lead conversion SLA activate failed: ${err.message}`);
      }
    }

    // SLA hooks on both clocks as appropriate
    if (slaEngine) {
      const isResolution = toStatus === 'converted';
      const isCancel = ['lost', 'cancelled'].includes(toStatus);
      const isPause = registry.isLeadPaused(toStatus);

      // First-response clock: terminal only resolves when converted;
      // lost/cancelled marks as cancelled.
      if (lead.firstResponseSlaId) {
        try {
          if (isResolution) {
            await slaEngine.observe({
              slaId: lead.firstResponseSlaId,
              eventType: 'resolved',
              when: now(),
            });
          } else if (isCancel) {
            await slaEngine.observe({
              slaId: lead.firstResponseSlaId,
              eventType: 'cancelled',
              when: now(),
            });
          } else if (
            isPause ||
            fromStatus === 'awaiting_guardian_callback' ||
            fromStatus === 'awaiting_documents'
          ) {
            await slaEngine.observe({
              slaId: lead.firstResponseSlaId,
              eventType: 'state_changed',
              state: toStatus,
              when: now(),
            });
          }
        } catch (err) {
          logger.warn(`[CRM] lead FR SLA observe failed: ${err.message}`);
        }
      }
      // Conversion clock
      if (lead.conversionSlaId) {
        try {
          if (isResolution) {
            await slaEngine.observe({
              slaId: lead.conversionSlaId,
              eventType: 'resolved',
              when: now(),
            });
          } else if (isCancel) {
            await slaEngine.observe({
              slaId: lead.conversionSlaId,
              eventType: 'cancelled',
              when: now(),
            });
          } else if (
            isPause ||
            fromStatus === 'awaiting_guardian_callback' ||
            fromStatus === 'awaiting_documents'
          ) {
            await slaEngine.observe({
              slaId: lead.conversionSlaId,
              eventType: 'state_changed',
              state: toStatus,
              when: now(),
            });
          }
        } catch (err) {
          logger.warn(`[CRM] lead conv SLA observe failed: ${err.message}`);
        }
      }
    }

    // Mirror key timestamps
    if (toStatus === 'converted') {
      lead.convertedAt = now();
      lead.convertedBy = actorId || lead.convertedBy;
    }
    if (toStatus === 'cancelled') lead.cancelledAt = now();

    await lead.save();
    await _emit(
      `ops.crm.lead.${event}`,
      _leadSnapshot(lead, { from: fromStatus, to: toStatus, event })
    );
    await _emit(
      'ops.crm.lead.transitioned',
      _leadSnapshot(lead, { from: fromStatus, to: toStatus, event })
    );
    return lead;
  }

  async function convertLead(id, { beneficiaryId, actorId = null } = {}) {
    if (!beneficiaryId) throw new MissingFieldError(['beneficiaryId']);
    return transitionLead(id, 'converted', {
      actorId,
      patch: { beneficiaryId },
    });
  }

  async function markLost(id, { lostReason, lostDetail = null, actorId = null } = {}) {
    if (!lostReason) throw new MissingFieldError(['lostReason']);
    return transitionLead(id, 'lost', {
      actorId,
      patch: { lostReason, lostDetail },
    });
  }

  async function cancelLead(id, { notes = null, actorId = null } = {}) {
    return transitionLead(id, 'cancelled', { actorId, notes });
  }

  // ── Reads / analytics ─────────────────────────────────────────

  async function findInquiryById(id) {
    return inquiryModel.findById(id);
  }

  async function listInquiries({
    status = null,
    channel = null,
    branchId = null,
    ownerUserId = null,
    limit = 100,
    skip = 0,
  } = {}) {
    const filter = {};
    if (status) filter.status = status;
    if (channel) filter.channel = channel;
    if (branchId) filter.branchId = branchId;
    if (ownerUserId) filter.ownerUserId = ownerUserId;
    return inquiryModel.find(filter).sort({ receivedAt: -1 }).skip(skip).limit(limit);
  }

  async function findLeadById(id) {
    return leadModel.findById(id);
  }

  async function listLeads({
    status = null,
    branchId = null,
    ownerUserId = null,
    referralSource = null,
    limit = 100,
    skip = 0,
  } = {}) {
    const filter = { deleted_at: null };
    if (status) filter.status = status;
    if (branchId) filter.preferredBranchId = branchId;
    if (ownerUserId) filter.ownerUserId = ownerUserId;
    if (referralSource) filter.referralSource = referralSource;
    return leadModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit);
  }

  /**
   * Funnel conversion stats over a window.
   */
  async function getFunnelStats({ branchId = null, windowDays = 30 } = {}) {
    const since = new Date(Date.now() - windowDays * 86400000);
    const leadFilter = { createdAt: { $gte: since }, deleted_at: null };
    const inqFilter = { receivedAt: { $gte: since } };
    if (branchId) {
      leadFilter.preferredBranchId = branchId;
      inqFilter.branchId = branchId;
    }

    const [
      inquiriesReceived,
      inquiriesPromoted,
      leadsCreated,
      leadsContacted,
      leadsQualified,
      leadsConverted,
      leadsLost,
    ] = await Promise.all([
      inquiryModel.countDocuments(inqFilter),
      inquiryModel.countDocuments({ ...inqFilter, status: 'promoted_to_lead' }),
      leadModel.countDocuments(leadFilter),
      leadModel.countDocuments({
        ...leadFilter,
        status: {
          $in: [
            'contacted',
            'qualified',
            'interested',
            'awaiting_guardian_callback',
            'awaiting_documents',
            'assessment_scheduled',
            'converted',
          ],
        },
      }),
      leadModel.countDocuments({
        ...leadFilter,
        status: {
          $in: [
            'qualified',
            'interested',
            'awaiting_guardian_callback',
            'awaiting_documents',
            'assessment_scheduled',
            'converted',
          ],
        },
      }),
      leadModel.countDocuments({ ...leadFilter, status: 'converted' }),
      leadModel.countDocuments({ ...leadFilter, status: 'lost' }),
    ]);

    const pct = (a, b) => (b > 0 ? Math.round((a / b) * 10000) / 100 : null);

    return {
      windowDays,
      generatedAt: now(),
      inquiriesReceived,
      inquiriesPromoted,
      inquiryToLeadPct: pct(inquiriesPromoted, inquiriesReceived),
      leadsCreated,
      leadsContacted,
      contactRatePct: pct(leadsContacted, leadsCreated),
      leadsQualified,
      qualifyRatePct: pct(leadsQualified, leadsContacted),
      leadsConverted,
      conversionRatePct: pct(leadsConverted, leadsCreated),
      leadsLost,
      lossRatePct: pct(leadsLost, leadsCreated),
    };
  }

  return {
    // Inquiry
    createInquiry,
    acknowledgeInquiry,
    routeInquiry,
    closeInquiry,
    markInquirySpam,
    promoteInquiry,
    findInquiryById,
    listInquiries,
    // Lead
    createLead,
    logActivity,
    transitionLead,
    convertLead,
    markLost,
    cancelLead,
    findLeadById,
    listLeads,
    // Analytics
    getFunnelStats,
  };
}

module.exports = {
  createLeadFunnelService,
  NotFoundError,
  IllegalTransitionError,
  MissingFieldError,
  ConflictError,
};
