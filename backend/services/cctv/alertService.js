/**
 * alertService — promotes raw events into actionable alerts.
 *
 * Rule engine: aggregate events by (cameraId + type) inside a sliding
 * window. When the count crosses a per-type threshold (or a single critical
 * event fires), upsert a CctvAlert and emit a notification.
 *
 * Rule shapes are intentionally simple — anything more elaborate belongs in
 * the AI analytics layer.
 */
'use strict';

const crypto = require('crypto');
const { CctvAlert, CctvEvent } = require('../../models/cctv');

let eventBus = null;
try {
  eventBus = require('../quality/qualityEventBus.service');
} catch (_) {}
let unifiedNotifier = null;
try {
  unifiedNotifier = require('../unifiedNotifier');
} catch (_) {}

const DEFAULT_RULES = [
  {
    id: 'motion_burst',
    matchType: 'motion',
    windowMs: 60_000,
    threshold: 8,
    severity: 'medium',
    category: 'system',
    title_ar: 'حركة متكررة',
  },
  {
    id: 'intrusion_any',
    matchType: 'intrusion',
    windowMs: 60_000,
    threshold: 1,
    severity: 'high',
    category: 'intrusion',
    title_ar: 'تسلل إلى منطقة محظورة',
  },
  {
    id: 'fall_any',
    matchType: 'fall_detected',
    windowMs: 60_000,
    threshold: 1,
    severity: 'critical',
    category: 'fall',
    title_ar: 'سقوط محتمل لمستفيد',
  },
  {
    id: 'fight_any',
    matchType: 'fight_detected',
    windowMs: 60_000,
    threshold: 1,
    severity: 'critical',
    category: 'fight',
    title_ar: 'مشاجرة محتملة',
  },
  {
    id: 'fire_smoke_any',
    matchType: 'fire_smoke',
    windowMs: 60_000,
    threshold: 1,
    severity: 'critical',
    category: 'fire',
    title_ar: 'إنذار حريق/دخان',
  },
  {
    id: 'tampering_any',
    matchType: 'tampering',
    windowMs: 120_000,
    threshold: 2,
    severity: 'high',
    category: 'tampering',
    title_ar: 'تلاعب محتمل بالكاميرا',
  },
  {
    id: 'face_unknown',
    matchType: 'face_unknown',
    windowMs: 60_000,
    threshold: 3,
    severity: 'medium',
    category: 'access_control',
    title_ar: 'وجه غير معروف يتكرر',
  },
  {
    id: 'video_loss_any',
    matchType: 'video_loss',
    windowMs: 60_000,
    threshold: 1,
    severity: 'high',
    category: 'system',
    title_ar: 'فقد إشارة فيديو',
  },
  {
    id: 'disk_failure_any',
    matchType: 'disk_failure',
    windowMs: 60_000,
    threshold: 1,
    severity: 'critical',
    category: 'system',
    title_ar: 'عطل في قرص NVR',
  },
  {
    id: 'ppe_violation',
    matchType: 'ppe_violation',
    windowMs: 5 * 60_000,
    threshold: 2,
    severity: 'medium',
    category: 'safety',
    title_ar: 'مخالفة لباس السلامة',
  },
];

function alertCode(branchCode, cameraCode, ruleId) {
  return `ALR-${branchCode}-${ruleId}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

async function evaluate(event, opts = {}) {
  const rules = opts.rules || DEFAULT_RULES;
  const matching = rules.filter(r => r.matchType === event.type);
  if (matching.length === 0) return { ok: true, data: { promoted: 0 } };

  const created = [];
  for (const rule of matching) {
    const windowStart = new Date(new Date(event.startedAt).getTime() - rule.windowMs);
    const count = await CctvEvent.countDocuments({
      cameraId: event.cameraId,
      type: event.type,
      startedAt: { $gte: windowStart },
    });
    if (count < rule.threshold) continue;

    const existing = await CctvAlert.findOne({
      cameraId: event.cameraId,
      ruleId: rule.id,
      status: { $in: ['open', 'acknowledged', 'investigating'] },
    });

    if (existing) {
      existing.eventCount += 1;
      existing.eventIds.push(event._id);
      existing.lastEventAt = event.startedAt;
      await existing.save();
      continue;
    }

    const alert = await CctvAlert.create({
      code: alertCode(event.branchCode, event.cameraCode, rule.id),
      branchCode: event.branchCode,
      cameraId: event.cameraId,
      cameraCode: event.cameraCode,
      ruleId: rule.id,
      title_ar: rule.title_ar,
      severity: rule.severity,
      category: rule.category,
      eventIds: [event._id],
      eventCount: count,
      firstEventAt: event.startedAt,
      lastEventAt: event.startedAt,
    });
    created.push(alert);

    if (eventBus?.emit) {
      eventBus.emit('cctv.alert.opened', {
        alertId: alert._id,
        code: alert.code,
        branchCode: alert.branchCode,
        severity: alert.severity,
        category: alert.category,
        ruleId: rule.id,
      });
    }
    if (unifiedNotifier?.notify && rule.severity !== 'low') {
      unifiedNotifier
        .notify({
          channel: 'cctv',
          subject: `[CCTV/${rule.severity}] ${alert.title_ar} — ${event.cameraCode}`,
          severity: rule.severity,
          payload: { alertId: alert._id, eventId: event.eventId, branchCode: alert.branchCode },
        })
        .catch(() => {});
    }
  }
  return { ok: true, data: { promoted: created.length, alerts: created } };
}

async function listOpen(branchCode, opts = {}) {
  const q = { status: { $in: ['open', 'acknowledged', 'investigating'] } };
  if (branchCode) q.branchCode = String(branchCode).toUpperCase();
  if (opts.severity) q.severity = opts.severity;
  if (opts.category) q.category = opts.category;
  return CctvAlert.find(q)
    .sort({ severity: -1, firstEventAt: -1 })
    .limit(opts.limit || 200)
    .lean();
}

async function acknowledge(alertId, userId) {
  return CctvAlert.findByIdAndUpdate(
    alertId,
    { status: 'acknowledged', acknowledgedBy: userId, acknowledgedAt: new Date() },
    { new: true }
  );
}

async function resolve(alertId, { userId, resolution, status = 'resolved' }) {
  return CctvAlert.findByIdAndUpdate(
    alertId,
    { status, resolvedBy: userId, resolvedAt: new Date(), resolution },
    { new: true }
  );
}

async function escalate(alertId, userId, incidentId) {
  return CctvAlert.findByIdAndUpdate(
    alertId,
    {
      status: 'escalated',
      relatedIncidentId: incidentId,
      resolvedBy: userId,
      resolvedAt: new Date(),
    },
    { new: true }
  );
}

module.exports = { evaluate, listOpen, acknowledge, resolve, escalate, DEFAULT_RULES };
