'use strict';

/**
 * cctv-event-service.test.js — Phase 27.
 *
 * Type normalisation + event id stability + severity defaults.
 * Pure: no DB needed (we test helpers only).
 */

jest.unmock('mongoose');
jest.resetModules();
process.env.NODE_ENV = 'test';

const eventService = require('../services/cctv/eventService');

describe('eventService.normaliseType', () => {
  test('maps Hikvision codes to internal types', () => {
    expect(eventService.normaliseType('VMD')).toBe('motion');
    expect(eventService.normaliseType('linedetection')).toBe('line_crossing');
    expect(eventService.normaliseType('fielddetection')).toBe('intrusion');
    expect(eventService.normaliseType('falldown')).toBe('fall_detected');
    expect(eventService.normaliseType('fireSmoke')).toBe('fire_smoke');
    expect(eventService.normaliseType('ANPR')).toBe('anpr_plate');
  });

  test('passes through internal types', () => {
    expect(eventService.normaliseType('intrusion')).toBe('intrusion');
    expect(eventService.normaliseType('fall_detected')).toBe('fall_detected');
  });

  test('falls back to unknown when missing', () => {
    expect(eventService.normaliseType(null)).toBe('unknown');
    expect(eventService.normaliseType('')).toBe('unknown');
  });
});

describe('eventService.makeEventId', () => {
  test('same camera+type+second-bucket yields the same id', () => {
    const a = eventService.makeEventId({
      cameraCode: 'CAM-01',
      type: 'motion',
      startedAt: '2026-05-15T10:00:00Z',
    });
    const b = eventService.makeEventId({
      cameraCode: 'CAM-01',
      type: 'motion',
      startedAt: '2026-05-15T10:00:00Z',
    });
    expect(a).toBe(b);
  });
  test('different cameras yield different ids', () => {
    const a = eventService.makeEventId({
      cameraCode: 'CAM-01',
      type: 'motion',
      startedAt: '2026-05-15T10:00:00Z',
    });
    const b = eventService.makeEventId({
      cameraCode: 'CAM-02',
      type: 'motion',
      startedAt: '2026-05-15T10:00:00Z',
    });
    expect(a).not.toBe(b);
  });
});

describe('eventService.SEVERITY_DEFAULTS', () => {
  test('critical types default to critical', () => {
    expect(eventService.SEVERITY_DEFAULTS.fall_detected).toBe('critical');
    expect(eventService.SEVERITY_DEFAULTS.fight_detected).toBe('critical');
    expect(eventService.SEVERITY_DEFAULTS.fire_smoke).toBe('critical');
    expect(eventService.SEVERITY_DEFAULTS.disk_failure).toBe('critical');
  });
  test('info-level types are low or info', () => {
    expect(['info', 'low']).toContain(eventService.SEVERITY_DEFAULTS.motion);
    expect(['info', 'low']).toContain(eventService.SEVERITY_DEFAULTS.face_detected);
    expect(['info', 'low']).toContain(eventService.SEVERITY_DEFAULTS.anpr_plate);
  });
});
