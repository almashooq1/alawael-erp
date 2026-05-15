/**
 * crowdDensity.service — flag overcrowding in supervised rooms.
 *
 * Each room has a max-occupancy on the camera (location.room → branch
 * config). When density events exceed that count, raise a safety event.
 */
'use strict';

const { CctvCamera } = require('../../../models/cctv');
const eventService = require('../eventService');

function defaultPerRoom() {
  return parseInt(process.env.CCTV_DEFAULT_ROOM_MAX, 10) || 25;
}

async function process(event) {
  if (!['crowd_density', 'people_count'].includes(event.type)) return { ok: true, data: null };
  const count = Number(event.aiResult?.attributes?.count || event.payload?.count || 0);
  if (count === 0) return { ok: true, data: null };
  const camera = await CctvCamera.findById(event.cameraId).lean();
  if (!camera) return { ok: true, data: null };
  const cap = Number(camera.location?.maxOccupancy || defaultPerRoom());
  if (count <= cap) return { ok: true, data: { count, cap, ok: true } };
  return eventService.ingestFromAI({
    cameraId: event.cameraId,
    type: 'crowd_density',
    severity: count > cap * 1.5 ? 'high' : 'medium',
    startedAt: event.startedAt,
    aiResult: { label: 'overcrowding', confidence: 0.95, attributes: { count, cap } },
    payload: { exceededBy: count - cap, room: camera.location?.room },
  });
}

module.exports = {
  process,
  defaultPerRoom,
  get DEFAULT_PER_ROOM() {
    return defaultPerRoom();
  },
};
