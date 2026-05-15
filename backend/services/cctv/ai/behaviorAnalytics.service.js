/**
 * behaviorAnalytics — escalations across multiple sub-detectors.
 *
 * Catches patterns like:
 *   • multiple "fight" + "audio_alarm" close in time → escalate to critical
 *   • fall + nobody-approaches in 60s → urgent (no caregiver response)
 *
 * The signal sources are existing AI events; this layer correlates them.
 */
'use strict';

const { CctvEvent } = require('../../../models/cctv');
const eventService = require('../eventService');

async function process(event) {
  if (event.type === 'fight_detected') {
    const audio = await CctvEvent.countDocuments({
      cameraId: event.cameraId,
      type: 'audio_alarm',
      startedAt: { $gte: new Date(new Date(event.startedAt).getTime() - 30_000) },
    });
    if (audio > 0) {
      return eventService.ingestFromAI({
        cameraId: event.cameraId,
        type: 'fight_detected',
        severity: 'critical',
        startedAt: event.startedAt,
        aiResult: { label: 'fight_with_audio', confidence: 0.92 },
        payload: { correlatedAudio: audio, originalEventId: event.eventId },
      });
    }
  }

  if (event.type === 'fall_detected') {
    setTimeout(async () => {
      try {
        const responses = await CctvEvent.countDocuments({
          cameraId: event.cameraId,
          type: 'motion',
          startedAt: { $gte: event.startedAt, $lte: new Date(Date.now() + 60_000) },
        });
        if (responses < 2) {
          await eventService.ingestFromAI({
            cameraId: event.cameraId,
            type: 'fall_detected',
            severity: 'critical',
            startedAt: new Date(),
            aiResult: { label: 'fall_no_response', confidence: 0.95 },
            payload: { originalEventId: event.eventId, motionCount: responses },
          });
        }
      } catch (_) {}
    }, 60_000).unref?.();
  }
  return { ok: true, data: null };
}

module.exports = { process };
