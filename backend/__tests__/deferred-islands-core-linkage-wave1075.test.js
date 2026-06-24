'use strict';

/**
 * deferred-islands-core-linkage-wave1075.test.js — W1075.
 *
 * RUNTIME end-to-end linkage of the eight remaining per-beneficiary lifecycle
 * "islands" onto the unified-core timeline:
 *   ICFAssessment · TreatmentAuthorization · ClinicalPathwayPlan · MdtMeeting ·
 *   InstrumentalSwallowStudy · EmergencyPlan · TherapistConsultation · CdssAlert.
 *
 * Each model's native post-save producer hook publishes to the REAL integration
 * bus; the REAL dddCrossModuleSubscribers persist a CareTimeline row. This is the
 * contract that turns these eight from islands into nodes on the beneficiary's
 * unified clinical timeline. (MDTCoordination.js stays deferred — it is a parallel
 * duplicate of MdtMeeting and would double-emit.)
 */

jest.unmock('mongoose');
jest.setTimeout(120000);

const { waitForRows, waitForCount } = require('./helpers/waitForTimelineRows');

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let CareTimeline;
let ICF, TreatmentAuthorization, Pathway, Mdt, Swallow, Emergency, Consult, Cdss;

function oid() {
  return new mongoose.Types.ObjectId();
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1075-core-linkage' } });
  await mongoose.connect(mongod.getUri());
  require('../models/Beneficiary');
  ({ CareTimeline } = require('../domains/timeline/models/CareTimeline'));
  ICF = require('../models/icf/ICFAssessment.model');
  ({ TreatmentAuthorization } = require('../models/treatmentAuthorization.model'));
  Pathway = require('../models/ClinicalPathwayPlan');
  Mdt = require('../models/care/MdtMeeting.model');
  Swallow = require('../models/InstrumentalSwallowStudy');
  Emergency = require('../models/EmergencyPlan');
  Consult = require('../models/TherapistConsultation');
  Cdss = require('../models/CdssAlert');
  const { integrationBus } = require('../integration/systemIntegrationBus');
  const { initializeDDDSubscribers } = require('../integration/dddCrossModuleSubscribers');
  initializeDDDSubscribers(integrationBus);
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

afterEach(async () => {
  await CareTimeline.deleteMany({});
});

describe('W1075 — ICF approval reaches the timeline', () => {
  it('draft → approved → icf_assessment (info)', async () => {
    const beneficiaryId = oid();
    const doc = await ICF.create({
      beneficiaryId,
      assessorId: oid(),
      assessmentDate: new Date('2026-06-01'),
      assessmentType: 'initial',
      title: 'ICF baseline profile',
      icfVersion: 'ICF-2001',
    });
    const r = await ICF.findById(doc._id);
    r.status = 'approved';
    await r.save();
    const rowRows = await waitForRows({ beneficiaryId, eventType: 'icf_assessment' }, 1);
    const row = rowRows[0];
    expect(row).not.toBeNull();
    expect(row.category).toBe('clinical');
    expect(row.metadata.icfVersion).toBe('ICF-2001');
  });
});

describe('W1075 — treatment authorization decision reaches the timeline', () => {
  it('draft → approved → treatment_authorization (success)', async () => {
    const beneficiaryId = oid();
    const doc = await TreatmentAuthorization.create({
      authorizationNumber: `AUTH-W1075-${Date.now()}`,
      beneficiary: beneficiaryId,
      beneficiaryName: 'محمد',
      nationalId: '1234567890',
      insurance: { provider: 'Bupa', policyNumber: 'POL-1' },
      requestType: 'initial',
      clinicalInfo: { medicalJustification: 'إعادة تأهيل النطق' },
      requestingProvider: { name: 'د. أحمد' },
      createdBy: oid(),
    });
    const r = await TreatmentAuthorization.findById(doc._id);
    r.status = 'approved';
    await r.save();
    const rowRows = await waitForRows({ beneficiaryId, eventType: 'treatment_authorization' }, 1);
    const row = rowRows[0];
    expect(row).not.toBeNull();
    expect(row.severity).toBe('success');
    expect(row.metadata.decision).toBe('approved');
  });

  it('draft → denied → treatment_authorization (warning)', async () => {
    const beneficiaryId = oid();
    const doc = await TreatmentAuthorization.create({
      authorizationNumber: `AUTH-W1075D-${Date.now()}`,
      beneficiary: beneficiaryId,
      beneficiaryName: 'سارة',
      nationalId: '2234567890',
      insurance: { provider: 'Tawuniya', policyNumber: 'POL-2' },
      requestType: 'initial',
      clinicalInfo: { medicalJustification: 'علاج وظيفي' },
      requestingProvider: { name: 'د. منى' },
      createdBy: oid(),
    });
    const r = await TreatmentAuthorization.findById(doc._id);
    r.status = 'denied';
    await r.save();
    const rowRows = await waitForRows({ beneficiaryId, eventType: 'treatment_authorization' }, 1);
    const row = rowRows[0];
    expect(row).not.toBeNull();
    expect(row.severity).toBe('warning');
  });
});

describe('W1075 — clinical pathway completion reaches the timeline', () => {
  it('ACTIVE → COMPLETED → clinical_pathway_completed (success)', async () => {
    const beneficiaryId = oid();
    const doc = await Pathway.create({
      beneficiaryId,
      branchId: oid(),
      pathwayType: 'GENERIC_REHAB',
      status: 'ACTIVE',
      startDate: new Date('2026-05-01'),
      stages: [{ code: 'S1', title: 'Intake', order: 1 }],
    });
    const r = await Pathway.findById(doc._id);
    r.status = 'COMPLETED';
    await r.save();
    const rowRows = await waitForRows(
      { beneficiaryId, eventType: 'clinical_pathway_completed' },
      1
    );
    const row = rowRows[0];
    expect(row).not.toBeNull();
    expect(row.severity).toBe('success');
    expect(row.metadata.pathwayType).toBe('GENERIC_REHAB');
  });
});

describe('W1075 — MDT meeting completion reaches the timeline', () => {
  it('scheduled → completed → mdt_meeting (info)', async () => {
    const beneficiaryId = oid();
    const doc = await Mdt.create({
      meetingNumber: `MDT-W1075-${Date.now()}`,
      beneficiaryId,
      purpose: 'care_plan_review',
      scheduledFor: new Date('2026-06-02'),
    });
    const r = await Mdt.findById(doc._id);
    r.status = 'completed';
    await r.save();
    const rowRows = await waitForRows({ beneficiaryId, eventType: 'mdt_meeting' }, 1);
    const row = rowRows[0];
    expect(row).not.toBeNull();
    expect(row.metadata.purpose).toBe('care_plan_review');
  });
});

describe('W1075 — instrumental swallow study completion reaches the timeline', () => {
  it('ordered → completed with aspiration → swallow_study_completed (warning)', async () => {
    const beneficiaryId = oid();
    const doc = await Swallow.create({
      beneficiaryId,
      studyType: 'vfss',
      penetrationAspirationScale: 7,
      aspirationDetected: true,
    });
    const r = await Swallow.findById(doc._id);
    r.status = 'completed';
    await r.save();
    // This branch's W1054 wiring: instrumental-swallow-study.swallow_study.completed
    // → eventType 'swallow_study_completed'.
    const rowRows = await waitForRows({ beneficiaryId, eventType: 'swallow_study_completed' }, 1);
    const row = rowRows[0];
    expect(row).not.toBeNull();
    expect(row.severity).toBe('warning');
    expect(row.metadata.studyType).toBe('vfss');
  });
});

describe('W1075 — emergency plan activation reaches the timeline', () => {
  it('create active plan → emergency_plan_activated (warning)', async () => {
    const beneficiaryId = oid();
    await Emergency.create({
      beneficiaryId,
      branchId: oid(),
      knownConditions: [{ type: 'seizure' }],
    });
    const rowRows = await waitForRows({ beneficiaryId, eventType: 'emergency_plan_activated' }, 1);
    const row = rowRows[0];
    expect(row).not.toBeNull();
    expect(row.severity).toBe('warning');
    expect(row.metadata.conditionTypes).toContain('seizure');
  });
});

describe('W1075 — therapist consultation answered reaches the timeline', () => {
  it('open → answered → consultation (info)', async () => {
    const beneficiaryId = oid();
    const doc = await Consult.create({
      requester: oid(),
      beneficiary: beneficiaryId,
      topic: 'Feeding posture',
      question: 'Best positioning for safe oral intake?',
    });
    const r = await Consult.findById(doc._id);
    r.status = 'answered';
    await r.save();
    const rowRows = await waitForRows({ beneficiaryId, eventType: 'consultation' }, 1);
    const row = rowRows[0];
    expect(row).not.toBeNull();
    expect(row.metadata.topic).toBe('Feeding posture');
  });
});

describe('W1075 — CDSS alert resolution reaches the timeline', () => {
  it('active → resolved → cdss_alert_resolved (info)', async () => {
    const beneficiaryId = oid();
    const doc = await Cdss.create({
      branchId: oid(),
      beneficiaryId,
      ruleId: oid(),
      alertType: 'drug_interaction',
      severity: 'warning',
      message: 'Possible interaction',
      messageAr: 'تداخل دوائي محتمل',
    });
    const r = await Cdss.findById(doc._id);
    r.status = 'resolved';
    r.resolvedAt = new Date();
    await r.save();
    const rowRows = await waitForRows({ beneficiaryId, eventType: 'cdss_alert_resolved' }, 1);
    const row = rowRows[0];
    expect(row).not.toBeNull();
    expect(row.metadata.alertType).toBe('drug_interaction');
  });
});
