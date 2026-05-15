/**
 * ppeDetector — PPE violation pipeline (helmet/mask/gloves in clinical areas).
 *
 * Hikvision DS-2CD7A26 + DeepInView cameras fire `ppedetection`. We map the
 * missing-PPE field to a severity. Camera location decides which PPE matters
 * (mask in therapy rooms, helmet in maintenance).
 */
'use strict';

const eventService = require('../eventService');
const { CctvCamera } = require('../../../models/cctv');

const AREA_TO_PPE = {
  therapy: ['mask'],
  clinic: ['mask', 'gloves'],
  bathroom: ['gloves'],
  maintenance: ['helmet'],
  kitchen: ['hairnet', 'gloves'],
  general: [],
};

async function process(event) {
  if (event.type !== 'ppe_violation') return { ok: true, data: null };
  const missing = event.aiResult?.attributes?.missing || event.payload?.missingPPE || [];
  if (!Array.isArray(missing) || missing.length === 0) return { ok: true, data: null };
  const camera = await CctvCamera.findById(event.cameraId).lean();
  const area = camera?.location?.area?.toLowerCase() || 'general';
  const required = AREA_TO_PPE[area] || [];
  const relevantMissing =
    required.length === 0 ? missing : missing.filter(m => required.includes(m));
  if (relevantMissing.length === 0) return { ok: true, data: { ignored: 'not_required_here' } };

  return eventService.ingestFromAI({
    cameraId: event.cameraId,
    type: 'ppe_violation',
    severity: relevantMissing.includes('mask') ? 'medium' : 'low',
    startedAt: event.startedAt,
    aiResult: {
      label: 'ppe_violation',
      confidence: 0.9,
      attributes: { missing: relevantMissing, area },
    },
    payload: { area, requiredPPE: required, missingPPE: relevantMissing },
  });
}

module.exports = { process, AREA_TO_PPE };
