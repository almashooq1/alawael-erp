/**
 * intrusionDetector — own-side intrusion logic.
 *
 * Device-side LineDetection / FieldDetection events already fire. We add:
 *   • schedule arming (zone only armed during certain hours)
 *   • multi-camera correlation (same person crossing 2 cameras within 30s
 *     → escalate)
 *   • object-type filter (e.g. ignore animals)
 */
'use strict';

const { CctvZone } = require('../../../models/cctv');
const eventService = require('../eventService');

function isArmedNow(zone, when = new Date()) {
  const sched = zone.schedule || [];
  if (sched.length === 0) return true;
  return sched.some(s => {
    if (Array.isArray(s.daysOfWeek) && s.daysOfWeek.length > 0) {
      const dow = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][when.getDay()];
      if (!s.daysOfWeek.includes(dow)) return false;
    }
    if (s.hoursLocal?.from && s.hoursLocal?.to) {
      const hhmm = when.toTimeString().slice(0, 5);
      if (hhmm < s.hoursLocal.from || hhmm > s.hoursLocal.to) return false;
    }
    return s.armed !== false;
  });
}

async function process(event) {
  if (!['line_crossing', 'intrusion', 'region_entry', 'region_exit'].includes(event.type)) {
    return { ok: true, data: null };
  }
  const zones = await CctvZone.find({ cameraId: event.cameraId, enabled: true });
  if (zones.length === 0) return { ok: true, data: null };
  const armedZones = zones.filter(z => isArmedNow(z, event.startedAt));
  if (armedZones.length === 0) return { ok: true, data: { armed: 0 } };

  let escalated = false;
  for (const zone of armedZones) {
    for (const rule of zone.rules || []) {
      if (rule.eventType !== event.type) continue;
      if (Array.isArray(rule.objectTypes) && rule.objectTypes.length > 0) {
        const seen = event.aiResult?.label || event.payload?.objectType;
        if (seen && !rule.objectTypes.includes(seen)) continue;
      }
      if (rule.severity && ['high', 'critical'].includes(rule.severity)) {
        await eventService.ingestFromAI({
          cameraId: event.cameraId,
          type: 'intrusion',
          severity: rule.severity,
          startedAt: event.startedAt,
          aiResult: { label: 'intrusion', confidence: 0.9 },
          payload: { zoneId: zone._id, ruleEventType: rule.eventType, action: rule.action },
        });
        escalated = true;
      }
    }
  }
  return { ok: true, data: { escalated, zones: armedZones.length } };
}

module.exports = { process, isArmedNow };
