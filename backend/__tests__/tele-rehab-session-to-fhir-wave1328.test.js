'use strict';
/**
 * W1328 — TeleRehabSession → FHIR R4 Encounter mapper tests.
 *
 * Pure unit tests (no DB). Validates the projection of a canonical
 * TeleRehabSession onto a base FHIR R4 Encounter plus a canonical round-trip.
 */

const {
  teleRehabSessionToFhir,
  toFhirStatus,
  toFhirDateTime,
  buildPeriod,
  buildExtensions,
  STATUS_MAP,
  ORG_FHIR_BASE,
  ACT_ENCOUNTER_CLASS_SYSTEM,
  TRS_PLATFORM_EXTENSION_URL,
  TRS_SESSION_URL_EXTENSION_URL,
  TRS_CONSENT_EXTENSION_URL,
  TRS_CONNECTION_QUALITY_EXTENSION_URL,
  TRS_RECORDING_ALLOWED_EXTENSION_URL,
  TRS_RECORDING_URL_EXTENSION_URL,
} = require('../intelligence/fhir/tele-rehab-session-to-fhir.lib');
const { canonical } = require('../intelligence/canonical');

const FULL = Object.freeze({
  _id: '64a0000000000000000000ff',
  beneficiaryId: '64a1111111111111111111aa',
  episodeId: '64a7777777777777777777aa',
  therapistId: '64a555555555555555555555',
  status: 'completed',
  scheduledStart: '2026-03-10T09:00:00.000Z',
  scheduledEnd: '2026-03-10T10:00:00.000Z',
  actualStart: '2026-03-10T09:03:00.000Z',
  actualEnd: '2026-03-10T09:58:00.000Z',
  platform: 'zoom',
  sessionUrl: 'https://zoom.us/j/123456789',
  consentState: 'granted',
  connectionQuality: 'good',
  recordingAllowed: true,
  recordingUrl: 'https://storage.alawael.sa/rec/abc',
});

const MINIMAL = Object.freeze({
  beneficiaryId: '64a1111111111111111111aa',
  therapistId: '64a555555555555555555555',
  status: 'scheduled',
  scheduledStart: '2026-02-01T09:00:00.000Z',
});

const NO_RECORDING = Object.freeze({
  _id: '64a0000000000000000000cc',
  beneficiaryId: '64a1111111111111111111aa',
  therapistId: '64a555555555555555555555',
  status: 'completed',
  scheduledStart: '2026-02-15T09:00:00.000Z',
  platform: 'teams',
  connectionQuality: 'poor',
  recordingAllowed: false,
});

describe('W1328 teleRehabSessionToFhir — canonical round-trip', () => {
  it('FULL fixture satisfies the canonical schema', () => {
    expect(canonical.TeleRehabSession.safeParse(FULL).success).toBe(true);
  });

  it('MINIMAL fixture satisfies the canonical schema', () => {
    expect(canonical.TeleRehabSession.safeParse(MINIMAL).success).toBe(true);
  });

  it('NO_RECORDING fixture satisfies the canonical schema', () => {
    expect(canonical.TeleRehabSession.safeParse(NO_RECORDING).success).toBe(true);
  });
});

describe('W1328 teleRehabSessionToFhir — resource shape', () => {
  it('emits a FHIR R4 Encounter', () => {
    expect(teleRehabSessionToFhir(FULL).resourceType).toBe('Encounter');
  });

  it('sets id from _id when includeId (default)', () => {
    expect(teleRehabSessionToFhir(FULL).id).toBe('64a0000000000000000000ff');
  });

  it('omits id when includeId is false', () => {
    expect(teleRehabSessionToFhir(FULL, { includeId: false }).id).toBeUndefined();
  });

  it('omits id when _id is absent', () => {
    expect(teleRehabSessionToFhir(MINIMAL).id).toBeUndefined();
  });

  it('subject references the beneficiary as a Patient', () => {
    expect(teleRehabSessionToFhir(FULL).subject).toEqual({
      reference: 'Patient/64a1111111111111111111aa',
    });
  });

  it('class is virtual (HL7 v3-ActCode VR)', () => {
    expect(teleRehabSessionToFhir(FULL).class).toEqual({
      system: ACT_ENCOUNTER_CLASS_SYSTEM,
      code: 'VR',
      display: 'virtual',
    });
  });

  it('therapist is the participant', () => {
    expect(teleRehabSessionToFhir(FULL).participant).toEqual([
      { individual: { reference: 'Practitioner/64a555555555555555555555' } },
    ]);
  });

  it('period prefers actual times over scheduled', () => {
    expect(teleRehabSessionToFhir(FULL).period).toEqual({
      start: '2026-03-10T09:03:00.000Z',
      end: '2026-03-10T09:58:00.000Z',
    });
  });

  it('episodeOfCare links the journey natively', () => {
    expect(teleRehabSessionToFhir(FULL).episodeOfCare).toEqual([
      { reference: 'EpisodeOfCare/64a7777777777777777777aa' },
    ]);
  });

  it('omits episodeOfCare when absent', () => {
    expect(teleRehabSessionToFhir(MINIMAL).episodeOfCare).toBeUndefined();
  });

  it('output is a plain object', () => {
    expect(Object.getPrototypeOf(teleRehabSessionToFhir(FULL))).toBe(Object.prototype);
  });

  it('does not mutate the input', () => {
    const input = JSON.parse(JSON.stringify(FULL));
    teleRehabSessionToFhir(input);
    expect(input).toEqual(FULL);
  });
});

describe('W1328 status mapping', () => {
  it('STATUS_MAP is frozen', () => {
    expect(Object.isFrozen(STATUS_MAP)).toBe(true);
  });

  it('scheduled → planned, in_progress → in-progress, completed → finished', () => {
    expect(toFhirStatus('scheduled')).toBe('planned');
    expect(toFhirStatus('in_progress')).toBe('in-progress');
    expect(toFhirStatus('completed')).toBe('finished');
  });

  it('cancelled / no_show / rescheduled → cancelled', () => {
    expect(toFhirStatus('cancelled')).toBe('cancelled');
    expect(toFhirStatus('no_show')).toBe('cancelled');
    expect(toFhirStatus('rescheduled')).toBe('cancelled');
  });

  it('absent → unknown; unmapped → entered-in-error', () => {
    expect(toFhirStatus(undefined)).toBe('unknown');
    expect(toFhirStatus('weird')).toBe('entered-in-error');
  });
});

describe('W1328 extensions', () => {
  it('carries platform + session URL', () => {
    const ext = buildExtensions(FULL);
    expect(ext.find(e => e.url === TRS_PLATFORM_EXTENSION_URL)).toEqual({
      url: TRS_PLATFORM_EXTENSION_URL,
      valueCode: 'zoom',
    });
    expect(ext.find(e => e.url === TRS_SESSION_URL_EXTENSION_URL)).toEqual({
      url: TRS_SESSION_URL_EXTENSION_URL,
      valueUrl: 'https://zoom.us/j/123456789',
    });
  });

  it('carries consent + connection quality', () => {
    const ext = buildExtensions(FULL);
    expect(ext.find(e => e.url === TRS_CONSENT_EXTENSION_URL).valueCode).toBe('granted');
    expect(ext.find(e => e.url === TRS_CONNECTION_QUALITY_EXTENSION_URL).valueCode).toBe('good');
  });

  it('carries recording allowed + url', () => {
    const ext = buildExtensions(FULL);
    expect(ext.find(e => e.url === TRS_RECORDING_ALLOWED_EXTENSION_URL)).toEqual({
      url: TRS_RECORDING_ALLOWED_EXTENSION_URL,
      valueBoolean: true,
    });
    expect(ext.find(e => e.url === TRS_RECORDING_URL_EXTENSION_URL)).toEqual({
      url: TRS_RECORDING_URL_EXTENSION_URL,
      valueUrl: 'https://storage.alawael.sa/rec/abc',
    });
  });

  it('recordingAllowed=false still emits the boolean extension', () => {
    const ext = buildExtensions(NO_RECORDING);
    expect(ext.find(e => e.url === TRS_RECORDING_ALLOWED_EXTENSION_URL)).toEqual({
      url: TRS_RECORDING_ALLOWED_EXTENSION_URL,
      valueBoolean: false,
    });
  });

  it('NO_RECORDING omits the recording url extension', () => {
    const ext = buildExtensions(NO_RECORDING);
    expect(ext.find(e => e.url === TRS_RECORDING_URL_EXTENSION_URL)).toBeUndefined();
  });

  it('MINIMAL produces no extensions', () => {
    expect(teleRehabSessionToFhir(MINIMAL).extension).toBeUndefined();
  });
});

describe('W1328 helpers + guards', () => {
  it('ORG_FHIR_BASE is the org base URL', () => {
    expect(ORG_FHIR_BASE).toBe('https://alawael.sa/fhir');
  });

  it('toFhirDateTime returns full ISO; undefined for invalid', () => {
    expect(toFhirDateTime('2026-03-10T09:00:00.000Z')).toBe('2026-03-10T09:00:00.000Z');
    expect(toFhirDateTime(undefined)).toBeUndefined();
    expect(toFhirDateTime('not-a-date')).toBeUndefined();
  });

  it('buildPeriod returns undefined when no times', () => {
    expect(buildPeriod({})).toBeUndefined();
  });

  it('throws when session is missing', () => {
    expect(() => teleRehabSessionToFhir()).toThrow(TypeError);
    expect(() => teleRehabSessionToFhir(null)).toThrow(/session object is required/);
  });

  it('throws when beneficiaryId is missing', () => {
    expect(() => teleRehabSessionToFhir({ therapistId: 't' })).toThrow(/beneficiaryId is required/);
  });
});
