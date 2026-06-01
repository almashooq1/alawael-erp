'use strict';

/**
 * measures/intelligence/measure-scored-event.js — W711
 *
 * WHY this exists (the connective-tissue gap, part 4):
 *   When an administration is scored, the rest of the platform (deterioration
 *   dashboard, care-team worklist, family-engagement summaries) should be able
 *   to react. The canonical mechanism is a domain event. This module builds the
 *   `measure.scored` event envelope in the platform's canonical shape.
 *
 *   DELIBERATE SCOPE LIMIT: this is a PURE *payload builder* only. It does NOT
 *   publish to the live event bus and is NOT registered in the live domain
 *   event-contract registry yet. The binding side (a real producer that emits
 *   on every score + subscribers that act) touches sensitive mutation/alert
 *   paths and is DEFERRED pending product sign-off. Wiring it later is a
 *   one-call change: `bus.publish('measures', event.eventType, event.data)`.
 *
 * Contract: PURE. No DB, no bus, no clock side effects (occurredAt is taken
 * from the caller-supplied scoredAt, defaulting to now only as a convenience).
 */

const EVENT_TYPE = 'measure.scored';
const DOMAIN = 'measures';
const VERSION = 1;

/**
 * Build the canonical `measure.scored` event envelope.
 *
 * @param {Object} input
 * @param {string} input.measureCode
 * @param {*} input.beneficiaryId
 * @param {*} [input.episodeId]
 * @param {*} [input.administrationId]
 * @param {number} input.derivedValue
 * @param {Object} [input.interpretation]   the scoring module's interpret() output
 * @param {*} [input.scoredAt]              ISO string / Date; defaults to now
 * @param {*} [input.scoredBy]              actor id (audit trail)
 * @returns {Object} canonical event envelope
 */
function buildMeasureScoredEvent(input = {}) {
  if (!input.measureCode) throw new Error('buildMeasureScoredEvent: measureCode required');
  if (input.beneficiaryId == null)
    throw new Error('buildMeasureScoredEvent: beneficiaryId required');
  if (!Number.isFinite(Number(input.derivedValue))) {
    throw new Error('buildMeasureScoredEvent: numeric derivedValue required');
  }

  const occurredAt =
    input.scoredAt != null ? new Date(input.scoredAt).toISOString() : new Date().toISOString();
  const interp = input.interpretation || null;

  return {
    domain: DOMAIN,
    eventType: EVENT_TYPE,
    version: VERSION,
    occurredAt,
    // Governance: this envelope carries information, it does NOT command a
    // mutation. Any consumer that changes a Plan/Episode must go through the
    // approval flow (see plan-recommendation.js).
    binding: 'informational',
    data: {
      measureCode: input.measureCode,
      beneficiaryId: input.beneficiaryId,
      episodeId: input.episodeId != null ? input.episodeId : null,
      administrationId: input.administrationId != null ? input.administrationId : null,
      derivedValue: Number(input.derivedValue),
      band: interp && interp.band ? interp.band : null,
      severity: interp && interp.severity ? interp.severity : null,
      label_ar: interp && interp.label_ar ? interp.label_ar : null,
      label_en: interp && interp.label_en ? interp.label_en : null,
      scoredAt: occurredAt,
      scoredBy: input.scoredBy != null ? input.scoredBy : null,
    },
  };
}

module.exports = {
  EVENT_TYPE,
  DOMAIN,
  VERSION,
  buildMeasureScoredEvent,
};
