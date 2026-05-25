'use strict';

/**
 * W366 drift guard — canonical schema registry covers the W356-W363
 * series (8 new schemas).
 *
 * Locks the catalog shape: the canonical registry must expose
 * SeizureEvent / SafeguardingConcern / CommunicationAidProfile /
 * AssistiveDevice / CbahiAttestation / TransitionPlan /
 * AdaptiveSportsProgram / RespiteBooking as registered entries with the
 * right mongooseModelName mapping. Each schema must parse a minimal
 * valid payload + reject an invalid one (canonical-shape contract).
 */

const canonicalMod = require('../intelligence/canonical');
const registry = canonicalMod.registry;
const canonical = canonicalMod.canonical;

const W356_W363_ENTRIES = [
  { name: 'SeizureEvent', modulePath: 'Clinical Safety Events' },
  { name: 'SafeguardingConcern', modulePath: 'Safeguarding' },
  { name: 'CommunicationAidProfile', modulePath: 'AAC' },
  { name: 'AssistiveDevice', modulePath: 'Assistive Devices' },
  { name: 'CbahiAttestation', modulePath: 'CBAHI Accreditation' },
  { name: 'TransitionPlan', modulePath: 'Life-Stage Transitions' },
  { name: 'AdaptiveSportsProgram', modulePath: 'Adaptive Sports' },
  { name: 'RespiteBooking', modulePath: 'Respite Care' },
  // W370 additions
  { name: 'BeneficiaryDietPrescription', modulePath: 'Clinical Diet Orders' },
  { name: 'FacilityAsset', modulePath: 'Facility Management' },
];

describe('W366 + W370 canonical registry — W356-W369 series registered', () => {
  it('registry total grew to ≥ 21 entries (11 pre-existing + 8 W356-W363 + 2 W368-W369)', () => {
    expect(registry.list().length).toBeGreaterThanOrEqual(21);
  });

  for (const { name, modulePath } of W356_W363_ENTRIES) {
    describe(`Entry: ${name}`, () => {
      it('is registered', () => {
        const e = registry.get(name);
        expect(e).toBeTruthy();
      });

      it(`modulePath === '${modulePath}'`, () => {
        expect(registry.get(name).modulePath).toBe(modulePath);
      });

      it(`mongooseModelName === '${name}' (1:1 with Mongoose model)`, () => {
        expect(registry.get(name).mongooseModelName).toBe(name);
      });

      it('schema is a Zod schema (has safeParse)', () => {
        expect(typeof registry.get(name).schema.safeParse).toBe('function');
        expect(typeof canonical[name].safeParse).toBe('function');
      });
    });
  }
});

describe('W366 — minimal-valid payload parses for each entity', () => {
  const OID = '507f1f77bcf86cd799439011';

  it('SeizureEvent', () => {
    const r = canonical.SeizureEvent.safeParse({
      beneficiaryId: OID,
      date: new Date(),
      startTime: new Date(),
      type: 'tonic_clonic',
      status: 'recorded',
    });
    expect(r.success).toBe(true);
  });

  it('SafeguardingConcern', () => {
    const r = canonical.SafeguardingConcern.safeParse({
      subjectKind: 'beneficiary',
      reportedBy: OID,
      reportedAt: new Date(),
      category: 'neglect',
      severity: 'medium',
      description: 'observed concern',
      status: 'reported',
    });
    expect(r.success).toBe(true);
  });

  it('CommunicationAidProfile', () => {
    const r = canonical.CommunicationAidProfile.safeParse({
      beneficiaryId: OID,
      vocabularyLevel: 'single_word',
      lifecycleStatus: 'draft',
    });
    expect(r.success).toBe(true);
  });

  it('AssistiveDevice', () => {
    const r = canonical.AssistiveDevice.safeParse({
      assetTag: 'WC-001',
      name: 'Standard wheelchair',
      category: 'wheelchair',
      availability: 'available',
    });
    expect(r.success).toBe(true);
  });

  it('CbahiAttestation', () => {
    const r = canonical.CbahiAttestation.safeParse({
      branchId: OID,
      standardKey: 'PSG_PATIENT_ID_TWO_IDENTIFIERS',
      status: 'draft',
    });
    expect(r.success).toBe(true);
  });

  it('TransitionPlan', () => {
    const r = canonical.TransitionPlan.safeParse({
      beneficiaryId: OID,
      transitionType: 'school_to_work',
      status: 'draft',
    });
    expect(r.success).toBe(true);
  });

  it('AdaptiveSportsProgram', () => {
    const r = canonical.AdaptiveSportsProgram.safeParse({
      beneficiaryId: OID,
      sport: 'boccia',
      category: 'individual',
      physicalDemand: 'low',
      status: 'draft',
    });
    expect(r.success).toBe(true);
  });

  it('RespiteBooking', () => {
    const r = canonical.RespiteBooking.safeParse({
      beneficiaryId: OID,
      bookingType: 'day',
      status: 'requested',
      startAt: new Date(),
      endAt: new Date(Date.now() + 3 * 60 * 60 * 1000),
      nightCount: 0,
      emergencyContactName: 'Parent',
      emergencyContactPhone: '+966500000000',
    });
    expect(r.success).toBe(true);
  });

  it('BeneficiaryDietPrescription (W370 addition)', () => {
    const r = canonical.BeneficiaryDietPrescription.safeParse({
      beneficiaryId: OID,
      foodIddsiLevel: 4,
      drinkIddsiLevel: 2,
      status: 'active',
      prescriberDiscipline: 'speech_language_pathologist',
      prescribedAt: new Date(),
      nextReviewDue: new Date(Date.now() + 90 * 86400000),
    });
    expect(r.success).toBe(true);
  });

  it('FacilityAsset (W370 addition)', () => {
    const r = canonical.FacilityAsset.safeParse({
      assetTag: 'ELEV-001',
      name: 'Main building elevator',
      category: 'elevator',
      branchId: OID,
      criticality: 'life_safety',
      status: 'in_service',
    });
    expect(r.success).toBe(true);
  });
});

describe('W366 — invalid payload rejected (contract teeth)', () => {
  it('SeizureEvent rejects unknown type', () => {
    const r = canonical.SeizureEvent.safeParse({
      beneficiaryId: '507f1f77bcf86cd799439011',
      date: new Date(),
      startTime: new Date(),
      type: 'INVALID_TYPE',
      status: 'recorded',
    });
    expect(r.success).toBe(false);
  });

  it('SafeguardingConcern rejects empty description', () => {
    const r = canonical.SafeguardingConcern.safeParse({
      subjectKind: 'beneficiary',
      reportedBy: '507f1f77bcf86cd799439011',
      reportedAt: new Date(),
      category: 'neglect',
      severity: 'medium',
      description: '',
      status: 'reported',
    });
    expect(r.success).toBe(false);
  });

  it('AssistiveDevice rejects missing assetTag', () => {
    const r = canonical.AssistiveDevice.safeParse({
      name: 'Standard wheelchair',
      category: 'wheelchair',
      availability: 'available',
    });
    expect(r.success).toBe(false);
  });

  it('CbahiAttestation rejects empty standardKey', () => {
    const r = canonical.CbahiAttestation.safeParse({
      branchId: '507f1f77bcf86cd799439011',
      standardKey: '',
      status: 'draft',
    });
    expect(r.success).toBe(false);
  });

  it('RespiteBooking rejects missing emergency contact phone', () => {
    const r = canonical.RespiteBooking.safeParse({
      beneficiaryId: '507f1f77bcf86cd799439011',
      bookingType: 'day',
      status: 'requested',
      startAt: new Date(),
      endAt: new Date(Date.now() + 3 * 60 * 60 * 1000),
      nightCount: 0,
      emergencyContactName: 'Parent',
      // emergencyContactPhone missing
    });
    expect(r.success).toBe(false);
  });
});
