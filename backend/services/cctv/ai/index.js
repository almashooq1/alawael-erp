/**
 * AI orchestrator — fan-out a CctvEvent through every applicable detector.
 *
 * Each detector decides for itself whether it cares about the event.
 * Detectors may raise NEW events (which themselves are NOT re-processed
 * to avoid loops — we tag synthetic ones with source='ai_analytic' and
 * skip them when the dispatcher sees a source other than 'hikvision_push').
 */
'use strict';

const faceRecognition = require('./faceRecognition.service');
const intrusion = require('./intrusionDetector.service');
const loitering = require('./loiteringDetector.service');
const fall = require('./fallDetector.service');
const anpr = require('./anpr.service');
const crowd = require('./crowdDensity.service');
const ppe = require('./ppeDetector.service');
const behavior = require('./behaviorAnalytics.service');
const alertService = require('../alertService');

const DETECTORS = [
  { name: 'face', svc: faceRecognition, types: ['face_detected', 'face_match'] },
  {
    name: 'intrusion',
    svc: intrusion,
    types: ['line_crossing', 'intrusion', 'region_entry', 'region_exit'],
  },
  { name: 'loitering', svc: loitering, types: ['face_detected', 'face_unknown'] },
  { name: 'fall', svc: fall, types: ['fall_detected'] },
  { name: 'anpr', svc: anpr, types: ['anpr_plate'] },
  { name: 'crowd', svc: crowd, types: ['crowd_density', 'people_count'] },
  { name: 'ppe', svc: ppe, types: ['ppe_violation'] },
  { name: 'behavior', svc: behavior, types: ['fight_detected', 'fall_detected'] },
];

async function dispatch(event) {
  if (!event) return { ok: false, code: 'NO_EVENT' };
  const isSynthetic = event.source === 'ai_analytic';
  const results = {};
  for (const d of DETECTORS) {
    if (!d.types.includes(event.type)) continue;
    if (isSynthetic && d.name !== 'behavior') continue;
    try {
      results[d.name] = await d.svc.process(event);
    } catch (err) {
      results[d.name] = { ok: false, error: err.message };
    }
  }
  try {
    results.alertEvaluation = await alertService.evaluate(event);
  } catch (err) {
    results.alertEvaluation = { ok: false, error: err.message };
  }
  return { ok: true, data: results };
}

module.exports = {
  dispatch,
  DETECTORS,
  faceRecognition,
  intrusion,
  loitering,
  fall,
  anpr,
  crowd,
  ppe,
  behavior,
};
