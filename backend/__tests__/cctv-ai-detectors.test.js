'use strict';

/**
 * cctv-ai-detectors.test.js — Phase 27.
 *
 * Tests the small, pure pieces of the AI layer:
 *   • faceRecognition.cosine
 *   • intrusionDetector.isArmedNow
 *   • anpr.isInSchedule
 *   • orchestrator DETECTORS shape
 */

jest.unmock('mongoose');
jest.resetModules();
process.env.NODE_ENV = 'test';

const face = require('../services/cctv/ai/faceRecognition.service');
const intrusion = require('../services/cctv/ai/intrusionDetector.service');
const anpr = require('../services/cctv/ai/anpr.service');
const ai = require('../services/cctv/ai');

describe('faceRecognition.cosine', () => {
  test('identical vectors → 1', () => {
    expect(face.cosine([1, 0, 0], [1, 0, 0])).toBeCloseTo(1, 5);
  });
  test('orthogonal vectors → 0', () => {
    expect(face.cosine([1, 0], [0, 1])).toBe(0);
  });
  test('mismatched lengths → 0', () => {
    expect(face.cosine([1, 0, 0], [1, 0])).toBe(0);
  });
  test('zero vector → 0', () => {
    expect(face.cosine([0, 0, 0], [1, 1, 1])).toBe(0);
  });
});

describe('intrusionDetector.isArmedNow', () => {
  test('no schedule → always armed', () => {
    expect(intrusion.isArmedNow({}, new Date('2026-05-15T10:00:00Z'))).toBe(true);
  });
  test('respects daysOfWeek', () => {
    const z = {
      schedule: [{ daysOfWeek: ['fri'], hoursLocal: { from: '00:00', to: '23:59' }, armed: true }],
    };
    expect(intrusion.isArmedNow(z, new Date('2026-05-15T10:00:00Z'))).toBe(true);
    expect(intrusion.isArmedNow(z, new Date('2026-05-16T10:00:00Z'))).toBe(false);
  });
  test('armed:false disables the zone', () => {
    const z = { schedule: [{ daysOfWeek: ['fri'], armed: false }] };
    expect(intrusion.isArmedNow(z, new Date('2026-05-15T10:00:00Z'))).toBe(false);
  });
});

describe('anpr.isInSchedule', () => {
  test('no schedule → always in', () => {
    expect(anpr.isInSchedule({}, new Date('2026-05-15T10:00:00Z'))).toBe(true);
  });
  test('respects daysOfWeek + hours', () => {
    const rec = {
      schedule: { daysOfWeek: ['fri'], hoursLocal: { from: '00:00', to: '23:59' } },
    };
    expect(anpr.isInSchedule(rec, new Date('2026-05-15T10:00:00Z'))).toBe(true);
    expect(anpr.isInSchedule(rec, new Date('2026-05-16T10:00:00Z'))).toBe(false);
  });
});

describe('AI orchestrator', () => {
  test('exports DETECTORS array with expected names', () => {
    const names = ai.DETECTORS.map(d => d.name);
    expect(names).toEqual(
      expect.arrayContaining([
        'face',
        'intrusion',
        'loitering',
        'fall',
        'anpr',
        'crowd',
        'ppe',
        'behavior',
      ])
    );
  });
  test('dispatch returns ok even for unrecognised types', async () => {
    const r = await ai.dispatch({ type: 'totally_unknown', _id: '1', cameraId: '1' });
    expect(r.ok).toBe(true);
  });
});
