'use strict';

/**
 * crisisOrchestrator.service.js — W458.
 *
 * Thin orchestration over the specialized W356 SeizureEvent + W357
 * SafeguardingConcern entities (which keep their own workflows). Creates
 * a CrisisIncident shadow whenever a crisis is reported, invokes the
 * beneficiary's EmergencyPlan, walks the escalation chain.
 *
 * Per Phase A Dimension F (Crisis Readiness). Per CLAUDE.md atomic-commit
 * pattern + ADR-019 MFA tier enforcement (tier 2 for reporting crises,
 * tier 2 for closing with post-incident review).
 *
 * Public API:
 *   - reportCrisis({ beneficiaryId, branchId, crisisType, severity,
 *                   description, occurredAt?, reportedBy,
 *                   seizureEventId?, safeguardingConcernId? })
 *     → returns the created CrisisIncident + invoked EmergencyPlan ref.
 *
 *   - escalate({ crisisId, actionType, performedBy, outcome?, notes? })
 *     → appends an escalationAction to the CrisisIncident.
 *
 *   - closeWithReview({ crisisId, reviewerId, capaItemId? })
 *     → marks status='closed', sets resolvedAt + closedAt, links the
 *       CapaItem if provided. Tier 2 MFA enforcement at route layer.
 *
 *   - linkSpecializedRecord({ crisisId, type, recordId })
 *     → links to an existing SeizureEvent or SafeguardingConcern after
 *       the fact.
 *
 *   - getActive({ branchId, severity? })
 *     → lists active incidents for supervisor cockpit dashboard.
 */

const mongoose = require('mongoose');

function _CrisisIncident() {
  try {
    return mongoose.model('CrisisIncident');
  } catch {
    require('../models/CrisisIncident');
    return mongoose.model('CrisisIncident');
  }
}

function _EmergencyPlan() {
  try {
    return mongoose.model('EmergencyPlan');
  } catch {
    require('../models/EmergencyPlan');
    return mongoose.model('EmergencyPlan');
  }
}

const ALLOWED_TYPES = [
  'medical_seizure',
  'medical_other',
  'behavioral',
  'safeguarding',
  'family',
  'environmental',
  'system',
];
const ALLOWED_SEVERITIES = ['critical', 'urgent', 'concerning', 'minor'];
const ALLOWED_ACTION_TYPES = [
  'caregiver_notified',
  'physician_called',
  'emergency_services_called',
  'safeguarding_lead_notified',
  'case_manager_notified',
  'branch_manager_notified',
  'rescue_protocol_initiated',
  'hospital_transport_initiated',
  'authority_reported',
  'family_notified',
  'other',
];

async function reportCrisis(input) {
  const {
    beneficiaryId,
    branchId,
    crisisType,
    severity,
    description,
    occurredAt,
    reportedBy,
    seizureEventId,
    safeguardingConcernId,
    correlationId,
  } = input || {};

  if (!beneficiaryId) throw new Error('reportCrisis: beneficiaryId required');
  if (!branchId) throw new Error('reportCrisis: branchId required');
  if (!reportedBy) throw new Error('reportCrisis: reportedBy required');
  if (!ALLOWED_TYPES.includes(crisisType)) {
    throw new Error(`reportCrisis: invalid crisisType "${crisisType}"`);
  }
  if (!ALLOWED_SEVERITIES.includes(severity)) {
    throw new Error(`reportCrisis: invalid severity "${severity}"`);
  }

  // Try to lookup the EmergencyPlan (graceful if missing)
  const Plan = _EmergencyPlan();
  const plan = await Plan.findOne({ beneficiaryId, status: 'active' }).lean();

  const Incident = _CrisisIncident();
  const incident = await Incident.create({
    beneficiaryId,
    branchId,
    crisisType,
    severity,
    description: description || null,
    occurredAt: occurredAt || new Date(),
    reportedBy,
    seizureEventId: seizureEventId || null,
    safeguardingConcernId: safeguardingConcernId || null,
    emergencyPlanId: plan ? plan._id : null,
    correlationId: correlationId || null,
    status: 'active',
  });

  return {
    incident,
    emergencyPlanInvoked: plan
      ? { _id: plan._id, escalationStepCount: plan.escalationChain?.length || 0 }
      : null,
  };
}

async function escalate(input) {
  const { crisisId, actionType, performedBy, outcome, notes } = input || {};
  if (!crisisId) throw new Error('escalate: crisisId required');
  if (!ALLOWED_ACTION_TYPES.includes(actionType)) {
    throw new Error(`escalate: invalid actionType "${actionType}"`);
  }

  const Incident = _CrisisIncident();
  const incident = await Incident.findById(crisisId);
  if (!incident) throw new Error('escalate: crisis not found');

  incident.escalationActions.push({
    actionType,
    performedBy: performedBy || null,
    performedAt: new Date(),
    outcome: outcome || 'pending',
    notes: notes || null,
  });
  if (incident.status === 'active') {
    incident.status = 'escalated';
  }
  await incident.save();
  return incident;
}

async function closeWithReview(input) {
  const { crisisId, reviewerId, capaItemId } = input || {};
  if (!crisisId) throw new Error('closeWithReview: crisisId required');
  if (!reviewerId) throw new Error('closeWithReview: reviewerId required');

  const Incident = _CrisisIncident();
  const incident = await Incident.findById(crisisId);
  if (!incident) throw new Error('closeWithReview: crisis not found');

  const requiresRcaThreshold = ['critical', 'urgent'];
  if (requiresRcaThreshold.includes(incident.severity)) {
    incident.rcaTriggered = true;
  }

  incident.status = 'closed';
  // pre-save hook will fill resolvedAt + closedAt
  if (capaItemId) {
    incident.postIncidentReviewId = capaItemId;
  }
  await incident.save();
  return incident;
}

async function linkSpecializedRecord(input) {
  const { crisisId, type, recordId } = input || {};
  if (!crisisId) throw new Error('linkSpecializedRecord: crisisId required');
  if (!['seizure', 'safeguarding'].includes(type)) {
    throw new Error(`linkSpecializedRecord: invalid type "${type}"`);
  }
  if (!recordId) throw new Error('linkSpecializedRecord: recordId required');

  const Incident = _CrisisIncident();
  const update =
    type === 'seizure' ? { seizureEventId: recordId } : { safeguardingConcernId: recordId };
  const incident = await Incident.findByIdAndUpdate(crisisId, update, { returnDocument: 'after' });
  if (!incident) throw new Error('linkSpecializedRecord: crisis not found');
  return incident;
}

async function getActive(input) {
  const { branchId, severity } = input || {};
  if (!branchId) throw new Error('getActive: branchId required');

  const Incident = _CrisisIncident();
  const query = { branchId, status: { $in: ['active', 'escalated', 'under_review'] } };
  if (severity) query.severity = severity;

  return Incident.find(query).sort({ severity: 1, occurredAt: -1 }).limit(500).lean();
}

module.exports = {
  reportCrisis,
  escalate,
  closeWithReview,
  linkSpecializedRecord,
  getActive,
  // Constants exposed for tests + route validators
  ALLOWED_TYPES,
  ALLOWED_SEVERITIES,
  ALLOWED_ACTION_TYPES,
};
