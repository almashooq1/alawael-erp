'use strict';
/**
 * W1329 — ARVRSession → FHIR R4 Encounter mapper tests.
 *
 * Pure unit tests (no DB). Validates the projection of a canonical
 * ARVRSession onto a base FHIR R4 Encounter plus a canonical round-trip.
 */

const {
  arvrSessionToFhir,
  toFhirStatus,
  toFhirDateTime,
  buildPeriod,
  buildExtensions,
  STATUS_MAP,
  ORG_FHIR_BASE,
  ACT_ENCOUNTER_CLASS_SYSTEM,
  AVR_DEVICE_EXTENSION_URL,
  AVR_SCENARIO_EXTENSION_URL,
  AVR_SCENARIO_VERSION_EXTENSION_URL,
  AVR_IMMERSION_TYPE_EXTENSION_URL,
  AVR_CYBERSICKNESS_REPORTED_EXTENSION_URL,
  AVR_CYBERSICKNESS_SEVERITY_EXTENSION_URL,
  AVR_COMPLETION_PERCENT_EXTENSION_URL,
} = require('../intelligence/fhir/arvr-session-to-fhir.lib');
const { canonical } = require('../intelligence/canonical');

const FULL = Object.freeze({
  _id: '64a0000000000000000000ff',
  beneficiaryId: '64a1111111111111111111aa',
  episodeId: '64a7777777777777777777aa',
  therapistId: '64a555555555555555555555',
  status: 'completed',
  scheduledStart: '2026-03-10T09:00:00.000Z',
  scheduledEnd: '2026-03-10T09:30:00.000Z',
  actualStart: '2026-03-10T09:02:00.000Z',
  actualEnd: '2026-03-10T09:28:00.000Z',
  device: 'quest',
  scenarioId: 'balance-forest-01',
  scenarioVersion: '2.3.0',
  immersionType: 'vr',
  cybersicknessReported: true,
  cybersicknessSeverity: 'mild',
  completionPercent: 87.5,
});

const MINIMAL = Object.freeze({
  beneficiaryId: '64a1111111111111111111aa',
  therapistId: '64a555555555555555555555',
  status: 'scheduled',
  scheduledStart: '2026-02-01T09:00:00.000Z',
  scenarioId: 'reach-grid-02',
});

const NO_SICKNESS = Object.freeze({
  _id: '64a0000000000000000000cc',
  beneficiaryId: '64a1111111111111111111aa',
  therapistId: '64a555555555555555555555',
  status: 'completed',
  scheduledStart: '2026-02-15T09:00:00.000Z',
  device: 'hololens',
  scenarioId: 'kitchen-adl-03',
  immersionType: 'mr',
  cybersicknessReported: false,
  completionPercent: 0,
});

describe('W1329 arvrSessionToFhir — canonical round-trip', () => {
  it('FULL fixture satisfies the canonical schema', () => {
    expect(canonical.ARVRSession.safeParse(FULL).success).toBe(true);
  });

  it('MINIMAL fixture satisfies the canonical schema', () => {
    expect(canonical.ARVRSession.safeParse(MINIMAL).success).toBe(true);
  });

  it('NO_SICKNESS fixture satisfies the canonical schema', () => {
    expect(canonical.ARVRSession.safeParse(NO_SICKNESS).success).toBe(true);
  });
});

describe('W1329 arvrSessionToFhir — resource shape', () => {
  it('emits a FHIR R4 Encounter', () => {
    expect(arvrSessionToFhir(FULL).resourceType).toBe('Encounter');
  });

  it('sets id from _id when includeId (default)', () => {
    expect(arvrSessionToFhir(FULL).id).toBe('64a0000000000000000000ff');
  });

  it('omits id when includeId is false', () => {
    expect(arvrSessionToFhir(FULL, { includeId: false }).id).toBeUndefined();
  });

  it('omits id when _id is absent', () => {
    expect(arvrSessionToFhir(MINIMAL).id).toBeUndefined();
  });

  it('subject references the beneficiary as a Patient', () => {
    expect(arvrSessionToFhir(FULL).subject).toEqual({
      reference: 'Patient/64a1111111111111111111aa',
    });
  });

  it('class is virtual (HL7 v3-ActCode VR) for immersive contact', () => {
    expect(arvrSessionToFhir(FULL).class).toEqual({
      system: ACT_ENCOUNTER_CLASS_SYSTEM,
      code: 'VR',
      display: 'virtual',
    });
  });

  it('therapist is the participant', () => {
    expect(arvrSessionToFhir(FULL).participant).toEqual([
      { individual: { reference: 'Practitioner/64a555555555555555555555' } },
    ]);
  });

  it('period prefers actual times over scheduled', () => {
    expect(arvrSessionToFhir(FULL).period).toEqual({
      start: '2026-03-10T09:02:00.000Z',
      end: '2026-03-10T09:28:00.000Z',
    });
  });

  it('episodeOfCare links the journey natively', () => {
    expect(arvrSessionToFhir(FULL).episodeOfCare).toEqual([
      { reference: 'EpisodeOfCare/64a7777777777777777777aa' },
    ]);
  });

  it('omits episodeOfCare when absent', () => {
    expect(arvrSessionToFhir(MINIMAL).episodeOfCare).toBeUndefined();
  });

  it('output is a plain object', () => {
    expect(Object.getPrototypeOf(arvrSessionToFhir(FULL))).toBe(Object.prototype);
  });

  it('does not mutate the input', () => {
    const input = JSON.parse(JSON.stringify(FULL));
    arvrSessionToFhir(input);
    expect(input).toEqual(FULL);
  });
});

describe('W1329 status mapping', () => {
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

describe('W1329 extensions', () => {
  it('carries device + scenario + scenario version', () => {
    const ext = buildExtensions(FULL);
    expect(ext.find(e => e.url === AVR_DEVICE_EXTENSION_URL)).toEqual({
      url: AVR_DEVICE_EXTENSION_URL,
      valueCode: 'quest',
    });
    expect(ext.find(e => e.url === AVR_SCENARIO_EXTENSION_URL)).toEqual({
      url: AVR_SCENARIO_EXTENSION_URL,
      valueString: 'balance-forest-01',
    });
    expect(ext.find(e => e.url === AVR_SCENARIO_VERSION_EXTENSION_URL).valueString).toBe('2.3.0');
  });

  it('carries immersion type + cybersickness reported + severity', () => {
    const ext = buildExtensions(FULL);
    expect(ext.find(e => e.url === AVR_IMMERSION_TYPE_EXTENSION_URL).valueCode).toBe('vr');
    expect(ext.find(e => e.url === AVR_CYBERSICKNESS_REPORTED_EXTENSION_URL)).toEqual({
      url: AVR_CYBERSICKNESS_REPORTED_EXTENSION_URL,
      valueBoolean: true,
    });
    expect(ext.find(e => e.url === AVR_CYBERSICKNESS_SEVERITY_EXTENSION_URL).valueCode).toBe(
      'mild'
    );
  });

  it('carries completion percent as a decimal', () => {
    const ext = buildExtensions(FULL);
    expect(ext.find(e => e.url === AVR_COMPLETION_PERCENT_EXTENSION_URL)).toEqual({
      url: AVR_COMPLETION_PERCENT_EXTENSION_URL,
      valueDecimal: 87.5,
    });
  });

  it('cybersicknessReported=false and completionPercent=0 still emit', () => {
    const ext = buildExtensions(NO_SICKNESS);
    expect(ext.find(e => e.url === AVR_CYBERSICKNESS_REPORTED_EXTENSION_URL)).toEqual({
      url: AVR_CYBERSICKNESS_REPORTED_EXTENSION_URL,
      valueBoolean: false,
    });
    expect(ext.find(e => e.url === AVR_COMPLETION_PERCENT_EXTENSION_URL)).toEqual({
      url: AVR_COMPLETION_PERCENT_EXTENSION_URL,
      valueDecimal: 0,
    });
  });

  it('NO_SICKNESS omits the severity extension', () => {
    const ext = buildExtensions(NO_SICKNESS);
    expect(ext.find(e => e.url === AVR_CYBERSICKNESS_SEVERITY_EXTENSION_URL)).toBeUndefined();
  });

  it('MINIMAL carries only the scenario extension', () => {
    const resource = arvrSessionToFhir(MINIMAL);
    expect(resource.extension).toEqual([
      { url: AVR_SCENARIO_EXTENSION_URL, valueString: 'reach-grid-02' },
    ]);
  });
});

describe('W1329 helpers + guards', () => {
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
    expect(() => arvrSessionToFhir()).toThrow(TypeError);
    expect(() => arvrSessionToFhir(null)).toThrow(/session object is required/);
  });

  it('throws when beneficiaryId is missing', () => {
    expect(() => arvrSessionToFhir({ therapistId: 't' })).toThrow(/beneficiaryId is required/);
  });
});
