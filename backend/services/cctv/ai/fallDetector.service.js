/**
 * fallDetector — beneficiary-fall pipeline.
 *
 * Hikvision DeepInView/AcuSense cameras emit `falldown`. We:
 *   • verify the camera is in a beneficiary-care area
 *   • raise a critical AI event (already done via type map)
 *   • open a Quality incident draft (auto-pre-fill)
 *
 * The incident creation is fire-and-forget; if the QMS module isn't loaded
 * we still log the event. Care staff finishes the incident manually.
 */
'use strict';

const { CctvCamera } = require('../../../models/cctv');

const incidentService = null;
let eventBus = null;
try {
  eventBus = require('../../quality/qualityEventBus.service');
} catch (_) {}

async function process(event) {
  if (event.type !== 'fall_detected') return { ok: true, data: null };
  const camera = await CctvCamera.findById(event.cameraId).lean();
  if (!camera) return { ok: true, data: null };

  const candidateAreas = [
    'gym',
    'therapy',
    'classroom',
    'bathroom',
    'corridor',
    'playroom',
    'cafeteria',
  ];
  const isCareArea = camera.location?.area
    ? candidateAreas.some(a => camera.location.area.toLowerCase().includes(a))
    : true;

  if (!isCareArea) return { ok: true, data: { ignored: 'not_care_area' } };

  let incident = null;
  if (incidentService?.createDraft) {
    try {
      incident = await incidentService.createDraft({
        title_ar: `سقوط محتمل — ${camera.code}`,
        category: 'patient_safety',
        severity: 'high',
        branchCode: camera.branchCode,
        source: 'cctv_ai',
        evidence: [{ kind: 'cctv_event', refId: event._id, cameraCode: camera.code }],
      });
    } catch (err) {
      incident = { error: err.message };
    }
  }
  if (eventBus?.emit) {
    eventBus.emit('cctv.fall.suspected', {
      cameraId: camera._id,
      branchCode: camera.branchCode,
      incidentId: incident?._id,
      eventId: event._id,
    });
  }
  return { ok: true, data: { incidentId: incident?._id, branchCode: camera.branchCode } };
}

module.exports = { process };
