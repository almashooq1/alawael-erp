'use strict';
/**
 * W1310 — EpisodeOfCare → FHIR R4 mapper self-test.
 * Companion to beneficiary-to-fhir-wave1309. Pure unit test, no DB.
 */

const {
  episodeOfCareToFhir,
  toFhirStatus,
  toFhirDate,
  buildPeriod,
  buildExtensions,
  STATUS_MAP,
  EPISODE_NUMBER_SYSTEM,
  EPISODE_TYPE_EXTENSION_URL,
  EPISODE_PRIORITY_EXTENSION_URL,
  EPISODE_PHASE_EXTENSION_URL,
  EPISODE_STATUS_DETAIL_EXTENSION_URL,
} = require('../intelligence/fhir/episode-of-care-to-fhir.lib');
const { canonical } = require('../intelligence/canonical');

/** A fully-populated canonical EpisodeOfCare fixture. */
const FULL_EPISODE = {
  _id: '64b7f0c2e1a2b3c4d5e6f7a8',
  episodeNumber: 'EP-2026-000042',
  beneficiaryId: '64a1111111111111111111aa',
  type: 'intensive',
  status: 'active',
  priority: 'urgent',
  startDate: '2026-01-10',
  expectedEndDate: '2026-07-10',
  currentPhase: 'active_treatment',
  leadTherapistId: '64c2222222222222222222bb',
  createdAt: '2026-01-10T08:00:00.000Z',
  updatedAt: '2026-01-12T08:00:00.000Z',
};

describe('W1310 EpisodeOfCare → FHIR — core projection', () => {
  const r = episodeOfCareToFhir(FULL_EPISODE);

  it('sets resourceType EpisodeOfCare', () => {
    expect(r.resourceType).toBe('EpisodeOfCare');
  });

  it('carries the canonical _id as FHIR id', () => {
    expect(r.id).toBe('64b7f0c2e1a2b3c4d5e6f7a8');
  });

  it('omits id when includeId=false', () => {
    const noId = episodeOfCareToFhir(FULL_EPISODE, { includeId: false });
    expect(noId.id).toBeUndefined();
  });

  it('references the beneficiary as a Patient subject', () => {
    expect(r.patient).toEqual({
      reference: 'Patient/64a1111111111111111111aa',
    });
  });

  it('references the lead therapist as careManager Practitioner', () => {
    expect(r.careManager).toEqual({
      reference: 'Practitioner/64c2222222222222222222bb',
    });
  });

  it('maps episodeNumber to a namespaced identifier', () => {
    expect(r.identifier).toEqual([{ system: EPISODE_NUMBER_SYSTEM, value: 'EP-2026-000042' }]);
  });
});

describe('W1310 EpisodeOfCare → FHIR — status value-set mapping', () => {
  it.each([
    ['planned', 'planned'],
    ['active', 'active'],
    ['on_hold', 'onhold'],
    ['suspended', 'onhold'],
    ['completed', 'finished'],
    ['transferred', 'finished'],
    ['cancelled', 'cancelled'],
  ])('maps canonical %s → FHIR %s', (canonicalStatus, fhirStatus) => {
    expect(toFhirStatus(canonicalStatus)).toBe(fhirStatus);
  });

  it('defaults absent status to active (live record)', () => {
    expect(toFhirStatus(undefined)).toBe('active');
  });

  it('maps an unknown status to entered-in-error (no guessing)', () => {
    expect(toFhirStatus('not-a-real-status')).toBe('entered-in-error');
  });

  it('STATUS_MAP covers every canonical EpisodeStatus enum value', () => {
    const canonicalStatuses = [
      'planned',
      'active',
      'on_hold',
      'suspended',
      'completed',
      'cancelled',
      'transferred',
    ];
    canonicalStatuses.forEach(s => expect(STATUS_MAP[s]).toBeDefined());
  });
});

describe('W1310 EpisodeOfCare → FHIR — period', () => {
  it('prefers actualEndDate over expectedEndDate for period.end', () => {
    const ep = { ...FULL_EPISODE, actualEndDate: '2026-06-30' };
    expect(buildPeriod(ep)).toEqual({
      start: '2026-01-10',
      end: '2026-06-30',
    });
  });

  it('falls back to expectedEndDate when episode is still open', () => {
    expect(buildPeriod(FULL_EPISODE)).toEqual({
      start: '2026-01-10',
      end: '2026-07-10',
    });
  });

  it('returns undefined when no dates are present', () => {
    expect(buildPeriod({ beneficiaryId: 'x' })).toBeUndefined();
  });

  it('coerces Date instances to YYYY-MM-DD', () => {
    expect(toFhirDate(new Date('2026-01-10T23:30:00.000Z'))).toBe('2026-01-10');
  });

  it('returns undefined for an invalid date', () => {
    expect(toFhirDate('not-a-date')).toBeUndefined();
  });
});

describe('W1310 EpisodeOfCare → FHIR — namespaced extensions', () => {
  const ext = buildExtensions(FULL_EPISODE);

  it('carries episode type as an extension', () => {
    expect(ext).toContainEqual({
      url: EPISODE_TYPE_EXTENSION_URL,
      valueCode: 'intensive',
    });
  });

  it('carries priority as an extension', () => {
    expect(ext).toContainEqual({
      url: EPISODE_PRIORITY_EXTENSION_URL,
      valueCode: 'urgent',
    });
  });

  it('carries current phase as an extension', () => {
    expect(ext).toContainEqual({
      url: EPISODE_PHASE_EXTENSION_URL,
      valueCode: 'active_treatment',
    });
  });

  it('preserves the transfer nuance lost when transferred→finished', () => {
    const transferred = { ...FULL_EPISODE, status: 'transferred' };
    const r = episodeOfCareToFhir(transferred);
    expect(r.status).toBe('finished');
    expect(r.extension).toContainEqual({
      url: EPISODE_STATUS_DETAIL_EXTENSION_URL,
      valueCode: 'transferred',
    });
  });

  it('omits extension array entirely when nothing non-base is present', () => {
    const minimal = {
      beneficiaryId: '64a1111111111111111111aa',
      status: 'active',
      startDate: '2026-01-10',
    };
    const r = episodeOfCareToFhir(minimal);
    expect(r.extension).toBeUndefined();
  });
});

describe('W1310 EpisodeOfCare → FHIR — guards', () => {
  it('throws when episode is missing', () => {
    expect(() => episodeOfCareToFhir(undefined)).toThrow(TypeError);
  });

  it('throws when beneficiaryId is absent (no patient reference)', () => {
    expect(() => episodeOfCareToFhir({ status: 'active', startDate: '2026-01-10' })).toThrow(
      /beneficiaryId/
    );
  });
});

describe('W1310 EpisodeOfCare → FHIR — canonical contract conformance', () => {
  it('the fixture validates against the canonical EpisodeOfCare schema', () => {
    const result = canonical.EpisodeOfCare.safeParse(FULL_EPISODE);
    expect(result.success).toBe(true);
  });

  it('a minimal valid episode still maps to a conformant resource', () => {
    const minimal = {
      beneficiaryId: '64a1111111111111111111aa',
      status: 'planned',
      startDate: '2026-01-10',
    };
    expect(canonical.EpisodeOfCare.safeParse(minimal).success).toBe(true);
    const r = episodeOfCareToFhir(minimal);
    expect(r.resourceType).toBe('EpisodeOfCare');
    expect(r.status).toBe('planned');
    expect(r.patient.reference).toBe('Patient/64a1111111111111111111aa');
  });
});
