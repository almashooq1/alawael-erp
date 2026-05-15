/**
 * anpr.service — match ANPR plate events against the CctvAnpr registry.
 *
 * If the plate is on the registry and allowed → log + optionally open gate.
 * If the plate is on the denylist → raise high severity AI event.
 * If unknown → log info-level (visitor).
 */
'use strict';

const { CctvAnpr } = require('../../../models/cctv');
const eventService = require('../eventService');

function isInSchedule(rec, when = new Date()) {
  if (!rec.schedule) return true;
  if (Array.isArray(rec.schedule.daysOfWeek) && rec.schedule.daysOfWeek.length > 0) {
    const dow = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][when.getDay()];
    if (!rec.schedule.daysOfWeek.includes(dow)) return false;
  }
  if (rec.schedule.hoursLocal?.from && rec.schedule.hoursLocal?.to) {
    const hhmm = when.toTimeString().slice(0, 5);
    if (hhmm < rec.schedule.hoursLocal.from || hhmm > rec.schedule.hoursLocal.to) return false;
  }
  return true;
}

async function process(event) {
  if (event.type !== 'anpr_plate') return { ok: true, data: null };
  const plate = (event.aiResult?.plate || event.payload?.licensePlate || '').toUpperCase().trim();
  if (!plate) return { ok: true, data: { reason: 'no_plate' } };

  const rec = await CctvAnpr.findOne({ plate, status: 'active' });
  const branchCode = event.branchCode;

  if (!rec) {
    return eventService.ingestFromAI({
      cameraId: event.cameraId,
      type: 'anpr_plate',
      severity: 'info',
      startedAt: event.startedAt,
      aiResult: { plate, label: 'unknown_visitor', confidence: event.aiResult?.confidence || 0.9 },
      payload: { plateMatch: 'unknown' },
    });
  }
  if (rec.ownerKind === 'denylist') {
    return eventService.ingestFromAI({
      cameraId: event.cameraId,
      type: 'anpr_plate',
      severity: 'critical',
      startedAt: event.startedAt,
      aiResult: { plate, label: 'denylist_hit', confidence: 1 },
      payload: { plateMatch: 'denylist', ownerKind: rec.ownerKind, anprId: rec._id },
    });
  }
  const branchOk =
    !Array.isArray(rec.allowedBranches) ||
    rec.allowedBranches.length === 0 ||
    rec.allowedBranches.includes(branchCode);
  const scheduleOk = isInSchedule(rec, event.startedAt);
  const allowed = branchOk && scheduleOk;
  return eventService.ingestFromAI({
    cameraId: event.cameraId,
    type: 'anpr_plate',
    severity: allowed ? 'info' : 'medium',
    startedAt: event.startedAt,
    aiResult: { plate, label: allowed ? 'allowed' : 'out_of_schedule', confidence: 1 },
    payload: {
      plateMatch: allowed ? 'allowed' : 'denied',
      ownerKind: rec.ownerKind,
      autoOpenGate: allowed && rec.autoOpenGate,
      anprId: rec._id,
    },
  });
}

module.exports = { process, isInSchedule };
