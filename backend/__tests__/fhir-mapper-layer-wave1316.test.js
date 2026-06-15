'use strict';
/**
 * W1316 — FHIR mapper-layer drift guard.
 *
 * WHY (Item 10, GAPS_ASSESSMENT_2026-06-15): the FHIR layer (W1309→W1315) is a
 * registry of 7 pure mappers behind a barrel. The codebase doctrine is "every
 * registry pairs with a drift guard" (see canonical-beneficiary-ref-wave324,
 * domain-event-contracts-wave382, etc.). This guard locks the WHOLE layer at
 * once so a future mapper add/edit can't silently:
 *   - dispatch a canonical name that isn't actually registered canonically,
 *   - leave a mapper out of MAPPERS / RESOURCE_TYPES (orphan export),
 *   - change the FHIR resourceType a mapper emits,
 *   - emit a non-plain-object, or mutate its input (purity break),
 *   - reference an unfrozen dispatch table.
 *
 * Pure: requires the barrel + canonical registry only. No DB, no mongoose, no
 * Express. Runs in <1s.
 */

const fhir = require('../intelligence/fhir');
const { canonical } = require('../intelligence/canonical');

/**
 * Minimal canonical-valid fixtures, one per mapped entity. Each is the SMALLEST
 * input that (a) passes its canonical schema and (b) exercises the mapper's
 * mandatory path. Kept here (not shared with the per-mapper tests) so this guard
 * fails independently if a mapper's required-field contract drifts.
 * @type {Record<string, object>}
 */
const MINIMAL_FIXTURES = Object.freeze({
  Beneficiary: {
    beneficiaryId: '64a1111111111111111111aa',
    nationalId: '1234567890',
    firstName: 'Sara',
    lastName: 'Ali',
    status: 'active',
  },
  EpisodeOfCare: {
    beneficiaryId: '64a1111111111111111111aa',
    status: 'active',
    startDate: '2026-02-01',
  },
  Assessment: {
    beneficiaryId: '64a1111111111111111111aa',
    type: 'initial',
    status: 'approved',
    conductedAt: '2026-02-01T08:00:00.000Z',
  },
  Session: {
    beneficiaryId: '64a1111111111111111111aa',
    therapistId: '64c3333333333333333333cc',
    status: 'completed',
    scheduledStart: '2026-02-01T08:00:00.000Z',
  },
  PlanOfCare: {
    beneficiaryId: '64a1111111111111111111aa',
    episodeId: '64b2222222222222222222bb',
    status: 'active',
    startDate: '2026-02-01',
  },
  Measure: {
    code: 'CARS-2',
    name: 'CARS-2',
    category: 'diagnostic',
  },
  RiskProfile: {
    beneficiaryId: '64a1111111111111111111aa',
    overallScore: null,
    overallTier: null,
    overallTierAr: null,
    sources: {},
    topFactors: [],
    composite: { weightUsed: 0, sourceCount: 0, sourcesContributing: [] },
    computedAt: '2026-06-15T09:30:00.000Z',
    reason: 'RISK_NO_SOURCES_AVAILABLE',
    explanation: 'No risk sources were available.',
  },
  SeizureEvent: {
    beneficiaryId: '64a1111111111111111111aa',
    date: '2026-02-01',
    startTime: '2026-02-01T08:00:00.000Z',
    type: 'tonic_clonic',
    status: 'recorded',
  },
  BehaviorIncident: {
    beneficiaryId: '64a1111111111111111111aa',
    reportedBy: '64c3333333333333333333cc',
    occurredAt: '2026-02-01T08:00:00.000Z',
    antecedent: 'Transition to a new activity',
    behavior: 'Self-injurious head banging',
    severity: 'high',
  },
  AssistiveDevice: {
    assetTag: 'AD-0001',
    name: 'Pediatric manual wheelchair',
    category: 'wheelchair',
    availability: 'available',
  },
  SafeguardingConcern: {
    subjectKind: 'beneficiary',
    subjectBeneficiaryId: '64a1111111111111111111aa',
    reportedBy: '64c3333333333333333333cc',
    reportedAt: '2026-02-01T08:00:00.000Z',
    category: 'neglect',
    severity: 'high',
    description: 'Repeated unexplained absences and signs of poor nutrition',
    status: 'reported',
  },
  BeneficiaryDietPrescription: {
    beneficiaryId: '64a1111111111111111111aa',
    status: 'active',
  },
  SensoryDietProgram: {
    beneficiaryId: '64a1111111111111111111aa',
    status: 'active',
  },
  CommunicationAidProfile: {
    beneficiaryId: '64a1111111111111111111aa',
    vocabularyLevel: 'single_word',
    lifecycleStatus: 'active',
  },
  ProstheticOrthoticOrder: {
    beneficiaryId: '64a1111111111111111111aa',
    deviceCategory: 'afo',
    prescribedDate: '2026-02-01T09:00:00.000Z',
    stage: 'prescribed',
  },
  InstrumentalSwallowStudy: {
    beneficiaryId: '64a1111111111111111111aa',
    studyType: 'vfss',
    status: 'completed',
  },
  SpasticityInjection: {
    beneficiaryId: '64a1111111111111111111aa',
    agent: 'botulinum_toxin_a',
    procedureDate: '2026-02-01T09:00:00.000Z',
    status: 'completed',
  },
  GroupTherapySession: {
    groupId: '64a4444444444444444444bb',
    therapistId: '64a555555555555555555555',
    status: 'completed',
    scheduledStart: '2026-02-01T09:00:00.000Z',
    participants: [{ beneficiaryId: '64a1111111111111111111aa' }],
  },
  TeleRehabSession: {
    beneficiaryId: '64a1111111111111111111aa',
    therapistId: '64a555555555555555555555',
    status: 'completed',
    scheduledStart: '2026-02-01T09:00:00.000Z',
  },
  ARVRSession: {
    beneficiaryId: '64a1111111111111111111aa',
    therapistId: '64a555555555555555555555',
    status: 'completed',
    scheduledStart: '2026-02-01T09:00:00.000Z',
    scenarioId: 'balance-forest-01',
  },
  DttSession: {
    beneficiaryId: '64a1111111111111111111aa',
    status: 'completed',
    sessionDate: '2026-02-01T09:00:00.000Z',
    programArea: 'communication',
  },
  CreativeArtsTherapySession: {
    beneficiaryId: '64a1111111111111111111aa',
    status: 'completed',
    sessionDate: '2026-02-01T09:00:00.000Z',
    modality: 'music',
  },
  AdjunctTherapySession: {
    beneficiaryId: '64a1111111111111111111aa',
    status: 'completed',
    sessionDate: '2026-02-01T09:00:00.000Z',
    modality: 'hydrotherapy',
  },
  AdaptiveSportsProgram: {
    beneficiaryId: '64a1111111111111111111aa',
    sport: 'boccia',
    category: 'individual',
    physicalDemand: 'low',
    status: 'active',
  },
  TransitionPlan: {
    beneficiaryId: '64a1111111111111111111aa',
    transitionType: 'school_to_work',
    status: 'in_progress',
  },
  CaregiverSupportProgram: {
    beneficiaryId: '64a1111111111111111111aa',
    programType: 'caregiver_training',
    status: 'in_progress',
  },
  RespiteBooking: {
    beneficiaryId: '64a1111111111111111111aa',
    bookingType: 'day',
    status: 'requested',
    startAt: '2026-02-01T08:00:00.000Z',
    endAt: '2026-02-01T16:00:00.000Z',
    nightCount: 0,
    emergencyContactName: 'Abu Khalid',
    emergencyContactPhone: '+966500000000',
  },
  FacilityAsset: {
    assetTag: 'FA-0001',
    name: 'Passenger Elevator A',
    category: 'elevator',
    branchId: '64a2222222222222222222bb',
    criticality: 'life_safety',
    status: 'in_service',
  },
  StaffHealthRecord: {
    employeeId: '64a3333333333333333333cc',
    recordType: 'immunization',
    status: 'completed',
    eventDate: '2026-01-10T00:00:00.000Z',
  },
  BiomedicalWasteRecord: {
    branchId: '64a2222222222222222222bb',
    wasteCategory: 'sharps',
    quantityKg: 1.5,
    generationDate: '2026-02-01T08:00:00.000Z',
    status: 'generated',
  },
  Sponsorship: {
    donorId: '64a6666666666666666666ff',
    beneficiaryId: '64a1111111111111111111aa',
    sponsorshipType: 'full',
    startDate: '2026-01-01T00:00:00.000Z',
    status: 'active',
  },
  CbahiAttestation: {
    branchId: '64a2222222222222222222bb',
    standardKey: 'IPC.1',
    status: 'met',
  },
  SeatAllocation: {
    beneficiaryId: '64a1111111111111111111aa',
    branchId: '64a2222222222222222222bb',
    effectiveFrom: '2026-01-01T00:00:00.000Z',
    status: 'active',
  },
});

describe('W1316 FHIR mapper layer — barrel ↔ canonical registry sync', () => {
  it('every MAPPERS key is a registered canonical entity', () => {
    const canonicalNames = new Set(Object.keys(canonical));
    Object.keys(fhir.MAPPERS).forEach(name => {
      expect(canonicalNames.has(name)).toBe(true);
    });
  });

  it('every MAPPERS value is a function', () => {
    Object.values(fhir.MAPPERS).forEach(fn => {
      expect(typeof fn).toBe('function');
    });
  });

  it('every named mapper export appears exactly once in MAPPERS', () => {
    // Non-mapper function exports (layer utilities, not per-entity mappers).
    const NON_MAPPER_EXPORTS = new Set(['buildFhirBundle', 'buildFhirBundleFromEntities']);
    const exportedMappers = Object.entries(fhir)
      .filter(([k, v]) => typeof v === 'function' && k !== 'MAPPERS' && !NON_MAPPER_EXPORTS.has(k))
      .map(([, v]) => v);
    const dispatched = new Set(Object.values(fhir.MAPPERS));
    exportedMappers.forEach(fn => {
      expect(dispatched.has(fn)).toBe(true);
    });
    // and no MAPPERS entry is missing from the named exports
    expect(dispatched.size).toBe(exportedMappers.length);
  });

  it('MAPPERS and RESOURCE_TYPES have identical key sets', () => {
    expect(Object.keys(fhir.RESOURCE_TYPES).sort()).toEqual(Object.keys(fhir.MAPPERS).sort());
  });

  it('MAPPERS and RESOURCE_TYPES are frozen', () => {
    expect(Object.isFrozen(fhir.MAPPERS)).toBe(true);
    expect(Object.isFrozen(fhir.RESOURCE_TYPES)).toBe(true);
  });

  it('has a minimal fixture for every mapped entity', () => {
    Object.keys(fhir.MAPPERS).forEach(name => {
      expect(MINIMAL_FIXTURES[name]).toBeDefined();
    });
  });
});

describe('W1316 FHIR mapper layer — resourceType contract', () => {
  Object.keys(fhir.MAPPERS).forEach(name => {
    it(`${name} emits the declared resourceType (${fhir.RESOURCE_TYPES[name]})`, () => {
      const out = fhir.MAPPERS[name](MINIMAL_FIXTURES[name]);
      expect(out.resourceType).toBe(fhir.RESOURCE_TYPES[name]);
    });
  });
});

describe('W1316 FHIR mapper layer — output shape + purity', () => {
  Object.keys(fhir.MAPPERS).forEach(name => {
    it(`${name} returns a plain object`, () => {
      const out = fhir.MAPPERS[name](MINIMAL_FIXTURES[name]);
      expect(out && typeof out === 'object' && !Array.isArray(out)).toBe(true);
    });

    it(`${name} does not mutate its input`, () => {
      const before = JSON.stringify(MINIMAL_FIXTURES[name]);
      fhir.MAPPERS[name](MINIMAL_FIXTURES[name]);
      expect(JSON.stringify(MINIMAL_FIXTURES[name])).toBe(before);
    });
  });

  it('every minimal fixture validates against its canonical schema', () => {
    Object.entries(MINIMAL_FIXTURES).forEach(([name, fixture]) => {
      expect(canonical[name].safeParse(fixture).success).toBe(true);
    });
  });
});
