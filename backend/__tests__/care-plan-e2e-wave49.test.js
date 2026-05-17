/**
 * care-plan-e2e-wave49.test.js — Wave 49 (Production Integration).
 *
 * End-to-end integration test against REAL Mongoose (not the global mock).
 * Verifies the full happy path through actual CarePlanVersion documents:
 *
 *   createDraft → runValidation → submit_to_supervisor
 *               → begin_review → recordReviewScorecard
 *               → approve → save_to_record → setFamilyVersion
 *               → notify_family
 *
 * Also verifies:
 *   • Wave-18 invariants enforced on real save (not just validateSync)
 *   • signatureChain hash linking holds across multiple transitions
 *   • computeEvidenceHash is set on approve and locked
 *   • amendment workflow on approved version
 *   • new version creation supersedes parent
 *   • audit-trail aggregation across real timestamps
 *
 * Uses mongodb-memory-server (already wired by jest.globalSetup).
 */

'use strict';

jest.unmock('mongoose');
jest.resetModules();

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
let ownServer = null;

async function ensureConnection() {
  if (mongoose.connection.readyState === 1) return;
  let uri = null;
  try {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } catch (_) {
    /* file may not exist */
  }

  if (!uri) {
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      ownServer = await MongoMemoryServer.create();
      uri = ownServer.getUri();
    } catch (err) {
      throw new Error(
        `Wave 49 E2E requires mongodb-memory-server. Install it or run globalSetup first. ${err.message}`
      );
    }
  }
  await mongoose.connect(uri);
}

let CarePlanVersion;
let createCarePlanService;
let createCarePlanValidator;
let auditTrail;
let familyGen;
let reportGenerator;
let roleViews;

beforeAll(async () => {
  await ensureConnection();
  CarePlanVersion = require('../models/CarePlanVersion');
  ({ createCarePlanService } = require('../intelligence/care-plan.service'));
  ({ createCarePlanValidator } = require('../intelligence/care-plan-validator.service'));
  auditTrail = require('../intelligence/care-plan-audit-trail.service');
  familyGen = require('../intelligence/family-version-generator.service');
  reportGenerator = require('../intelligence/care-plan-report-generator.service');
  roleViews = require('../intelligence/care-plan-role-views.service');
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
  if (ownServer) {
    await ownServer.stop();
  }
});

afterEach(async () => {
  // Clean the collection between tests so version-number uniqueness
  // doesn't leak across tests.
  if (CarePlanVersion && mongoose.connection.readyState === 1) {
    await CarePlanVersion.deleteMany({});
  }
});

// ─── Helpers ────────────────────────────────────────────────────────

function makeService({ resolveEvidenceRef = null, computeSignatureHash } = {}) {
  const validator = createCarePlanValidator({ resolveEvidenceRef });
  return createCarePlanService({
    planVersionModel: CarePlanVersion,
    validator,
    auditLogger: null,
    notifier: null,
    sideEffectHandlers: {},
    logger: { warn: () => {}, info: () => {} },
    computeSignatureHash,
  });
}

const therapist = { userId: new mongoose.Types.ObjectId().toString(), role: 'therapist' };
const supervisor = {
  userId: new mongoose.Types.ObjectId().toString(),
  role: 'clinical_supervisor',
};
const branchManager = { userId: new mongoose.Types.ObjectId().toString(), role: 'branch_manager' };

function readyDraftInput() {
  const beneficiaryId = new mongoose.Types.ObjectId();
  const branchId = new mongoose.Types.ObjectId();
  const reviewDate = new Date(Date.now() + 30 * 86400000);

  return {
    planId: 'plan_e2e_' + Date.now(),
    planType: 'individual_therapy',
    beneficiaryId,
    branchId,
    authorId: therapist.userId,
    actor: therapist,
    reasonForPlan: 'initial',
    reviewSchedule: { nextReviewAt: reviewDate, cadenceWeeks: 12 },
    sessionsPerWeekCap: 5,
    goals: [
      {
        goalId: 'g1',
        domain: 'expressive_language',
        statement: 'يطلب 40 شيئًا باستخدام النطق خلال 12 أسبوعًا في جلسات NET',
        priorityScore: 0.85,
        targetValue: '40',
        targetUnit: 'mands',
        targetHorizonWeeks: 12,
        baselineLink: 'bl-1',
        assessmentLink: 'asm-1',
        measureLink: 'm-1',
        evidenceRefs: [
          { kind: 'assessment', refId: 'asm-1', capturedAt: new Date(Date.now() - 14 * 86400000) },
        ],
        confidence: 0.78,
      },
    ],
    programs: [
      { programId: 'p1', name: 'NET', frequencyPerWeek: 3, durationMin: 45, goalRefs: ['g1'] },
    ],
    measures: [{ measureId: 'm-1', instrument: 'VB-MAPP', cadenceWeeks: 10, goalRefs: ['g1'] }],
    tests: [],
    supportServices: [],
    familyRole: {
      expectedInvolvementMinutesPerWeek: 30,
      coachingPlan: 'تخصيص عشر دقائق يوميًا للعب والتشجيع',
      homeProgram: [{ activity: 'قراءة قصة قبل النوم', frequency: 'يومي', goalRef: 'g1' }],
    },
    safetyFlags: [],
  };
}

// ─── E2E happy path ─────────────────────────────────────────────────

describe('Wave 49 — End-to-end happy path against real Mongoose', () => {
  test('full lifecycle: draft → validation → submit → review → approve → save → notify', async () => {
    const service = makeService();

    // 1. createDraft
    const r1 = await service.createDraft(readyDraftInput());
    expect(r1.ok).toBe(true);
    const pvId = r1.planVersion._id;
    expect(r1.planVersion.status).toBe('draft');
    expect(r1.planVersion.versionNumber).toBe(1);

    // 2. runValidation — should auto-advance to ready_for_submission
    const r2 = await service.runValidation({ planVersionId: pvId, actor: therapist });
    expect(r2.ok).toBe(true);
    expect(r2.validation.readinessScore).toBeGreaterThanOrEqual(85);
    expect(r2.validation.hardFailures).toEqual([]);
    expect(r2.planVersion.status).toBe('ready_for_submission');

    // 3. submit_to_supervisor
    const r3 = await service.transition({
      planVersionId: pvId,
      transitionId: 'submit_to_supervisor',
      actor: therapist,
    });
    expect(r3.ok).toBe(true);
    expect(r3.planVersion.status).toBe('submitted_to_supervisor');
    expect(r3.planVersion.submittedAt).toBeTruthy();

    // 4. begin_review
    const r4 = await service.transition({
      planVersionId: pvId,
      transitionId: 'begin_review',
      actor: supervisor,
    });
    expect(r4.ok).toBe(true);
    expect(r4.planVersion.status).toBe('under_review');
    expect(String(r4.planVersion.reviewerId)).toBe(supervisor.userId);

    // 5. recordReviewScorecard (must pass 7.0 threshold)
    const r5 = await service.recordReviewScorecard({
      planVersionId: pvId,
      actor: supervisor,
      scorecard: {
        quality: 9,
        compliance: 9,
        clarity: 8,
        measurability: 9,
        safety: 9,
        familyReadiness: 8,
      },
    });
    expect(r5.ok).toBe(true);
    expect(r5.overall).toBeGreaterThanOrEqual(7);

    // 6. approve — should set evidenceHash + append signature
    const r6 = await service.transition({
      planVersionId: pvId,
      transitionId: 'approve',
      actor: supervisor,
    });
    expect(r6.ok).toBe(true);
    expect(r6.planVersion.status).toBe('approved');
    expect(r6.planVersion.evidenceHash).toMatch(/^[a-f0-9]{64}$/);
    expect(r6.planVersion.signatureChain.length).toBe(1);
    expect(r6.planVersion.signatureChain[0].action).toBe('approve');
    expect(r6.planVersion.signatureChain[0].hash).toMatch(/^[a-f0-9]{64}$/);

    // 7. save_to_record — appends second signature
    const r7 = await service.transition({
      planVersionId: pvId,
      transitionId: 'save_to_record',
      actor: supervisor,
    });
    expect(r7.ok).toBe(true);
    expect(r7.planVersion.status).toBe('saved_to_record');
    expect(r7.planVersion.signatureChain.length).toBe(2);
    expect(r7.planVersion.signatureChain[1].prevHash).toBe(r7.planVersion.signatureChain[0].hash);

    // 8. setFamilyVersion (generated from family-version-generator)
    const planBody = r7.planVersion.toObject();
    const familyResult = familyGen.generate(planBody, { beneficiaryFirstName: 'سعد' });
    expect(familyResult.ok).toBe(true);

    const r8 = await service.setFamilyVersion({
      planVersionId: pvId,
      actor: supervisor,
      body: familyResult.markdown,
      readabilityGrade: familyResult.readability.grade,
    });
    expect(r8.ok).toBe(true);
    expect(r8.planVersion.familyVersion.body).toContain('سعد');

    // 9. notify_family
    const r9 = await service.transition({
      planVersionId: pvId,
      transitionId: 'notify_family',
      actor: supervisor,
    });
    expect(r9.ok).toBe(true);
    expect(r9.planVersion.status).toBe('family_notification_sent');
    expect(r9.planVersion.signatureChain.length).toBe(3);
  });

  test('approve blocked when readinessScore < 85', async () => {
    const service = makeService();
    const input = readyDraftInput();
    // Break the plan: remove baseline → triggers hard failure
    input.goals[0].baselineLink = null;
    const created = await service.createDraft(input);
    await service.runValidation({ planVersionId: created.planVersion._id, actor: therapist });

    // Force the status to under_review (bypassing the readiness path)
    const doc = await CarePlanVersion.findById(created.planVersion._id);
    doc.status = 'submitted_to_supervisor';
    await doc.save();
    await service.transition({
      planVersionId: doc._id,
      transitionId: 'begin_review',
      actor: supervisor,
    });
    await service.recordReviewScorecard({
      planVersionId: doc._id,
      actor: supervisor,
      scorecard: {
        quality: 9,
        compliance: 9,
        clarity: 9,
        measurability: 9,
        safety: 9,
        familyReadiness: 9,
      },
    });
    const r = await service.transition({
      planVersionId: doc._id,
      transitionId: 'approve',
      actor: supervisor,
    });
    expect(r.ok).toBe(false);
    expect(['HARD_FAILURES_PRESENT', 'READINESS_TOO_LOW']).toContain(r.reason);
  });

  test('approve blocked when reviewer === author (self-approval invariant)', async () => {
    const service = makeService();
    const created = await service.createDraft(readyDraftInput());
    await service.runValidation({ planVersionId: created.planVersion._id, actor: therapist });

    await service.transition({
      planVersionId: created.planVersion._id,
      transitionId: 'submit_to_supervisor',
      actor: therapist,
    });

    // Therapist tries to begin_review themselves
    const r = await service.transition({
      planVersionId: created.planVersion._id,
      transitionId: 'begin_review',
      actor: { userId: therapist.userId, role: 'clinical_supervisor' }, // role swap, same userId
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('SELF_APPROVAL_FORBIDDEN');
  });

  test('createNewVersion supersedes the approved parent', async () => {
    const service = makeService();
    const created = await service.createDraft(readyDraftInput());
    await service.runValidation({ planVersionId: created.planVersion._id, actor: therapist });

    // Take it all the way to approved
    await service.transition({
      planVersionId: created.planVersion._id,
      transitionId: 'submit_to_supervisor',
      actor: therapist,
    });
    await service.transition({
      planVersionId: created.planVersion._id,
      transitionId: 'begin_review',
      actor: supervisor,
    });
    await service.recordReviewScorecard({
      planVersionId: created.planVersion._id,
      actor: supervisor,
      scorecard: {
        quality: 9,
        compliance: 9,
        clarity: 9,
        measurability: 9,
        safety: 9,
        familyReadiness: 9,
      },
    });
    await service.transition({
      planVersionId: created.planVersion._id,
      transitionId: 'approve',
      actor: supervisor,
    });

    // Now create v2
    const v2 = await service.createNewVersion({
      planId: created.planVersion.planId,
      basedOnVersionId: created.planVersion._id,
      author: therapist,
      reasonForRevision: 'تحديث الأهداف بعد ٤ أسابيع من التقدم',
      changes: { goals: [...created.planVersion.goals.toObject()] },
    });
    expect(v2.ok).toBe(true);
    expect(v2.planVersion.versionNumber).toBe(2);
    expect(v2.planVersion.status).toBe('draft');

    // Parent should be superseded
    const parent = await CarePlanVersion.findById(created.planVersion._id);
    expect(parent.status).toBe('superseded');
    expect(String(parent.supersededBy)).toBe(String(v2.planVersion._id));
  });

  test('amendment workflow: branch_manager can amend approved field; structural fields rejected', async () => {
    const service = makeService();
    const created = await service.createDraft(readyDraftInput());
    await service.runValidation({ planVersionId: created.planVersion._id, actor: therapist });

    // Approve
    await service.transition({
      planVersionId: created.planVersion._id,
      transitionId: 'submit_to_supervisor',
      actor: therapist,
    });
    await service.transition({
      planVersionId: created.planVersion._id,
      transitionId: 'begin_review',
      actor: supervisor,
    });
    await service.recordReviewScorecard({
      planVersionId: created.planVersion._id,
      actor: supervisor,
      scorecard: {
        quality: 9,
        compliance: 9,
        clarity: 9,
        measurability: 9,
        safety: 9,
        familyReadiness: 9,
      },
    });
    await service.transition({
      planVersionId: created.planVersion._id,
      transitionId: 'approve',
      actor: supervisor,
    });

    // 1. non-structural amendment by branch_manager → OK
    const amend = await service.applyAmendment({
      planVersionId: created.planVersion._id,
      actor: branchManager,
      field: 'specialty',
      before: null,
      after: 'SLP',
      reason: 'correcting analytics tagging only',
    });
    expect(amend.ok).toBe(true);
    expect(amend.amendmentId).toMatch(/^amd_/);

    // 2. structural amendment → forbidden
    const struct = await service.applyAmendment({
      planVersionId: created.planVersion._id,
      actor: branchManager,
      field: 'goals',
      before: [],
      after: [{ goalId: 'tampered' }],
      reason: 'attempt to bypass',
    });
    expect(struct.ok).toBe(false);
    expect(struct.reason).toBe('AMENDMENT_FORBIDDEN');

    // 3. non-bm role → forbidden
    const wrongActor = await service.applyAmendment({
      planVersionId: created.planVersion._id,
      actor: supervisor,
      field: 'specialty',
      before: 'SLP',
      after: 'OT',
      reason: 'supervisor attempting amendment',
    });
    expect(wrongActor.ok).toBe(false);
    expect(wrongActor.reason).toBe('AMENDMENT_FORBIDDEN');
  });

  test('audit trail aggregates events across the lifecycle + integrity check passes', async () => {
    const service = makeService({ computeSignatureHash: CarePlanVersion.computeSignatureHash });
    const created = await service.createDraft(readyDraftInput());
    const pvId = created.planVersion._id;
    await service.runValidation({ planVersionId: pvId, actor: therapist });
    await service.transition({
      planVersionId: pvId,
      transitionId: 'submit_to_supervisor',
      actor: therapist,
    });
    await service.transition({
      planVersionId: pvId,
      transitionId: 'begin_review',
      actor: supervisor,
    });
    await service.recordReviewScorecard({
      planVersionId: pvId,
      actor: supervisor,
      scorecard: {
        quality: 9,
        compliance: 9,
        clarity: 9,
        measurability: 9,
        safety: 9,
        familyReadiness: 9,
      },
    });
    await service.transition({ planVersionId: pvId, transitionId: 'approve', actor: supervisor });
    await service.transition({
      planVersionId: pvId,
      transitionId: 'save_to_record',
      actor: supervisor,
    });

    const record = await CarePlanVersion.findById(pvId);
    const trail = auditTrail.buildAuditTrail(record, {
      computeSignatureHash: CarePlanVersion.computeSignatureHash,
    });
    expect(trail.ok).toBe(true);
    expect(trail.integrity.signatureChainOk).toBe(true);
    expect(trail.events.length).toBeGreaterThan(5);
    expect(trail.counts.signatures).toBe(2); // approve + save
  });

  test('role-specific views render correctly from real document', async () => {
    const service = makeService();
    const created = await service.createDraft(readyDraftInput());
    await service.runValidation({ planVersionId: created.planVersion._id, actor: therapist });
    await service.transition({
      planVersionId: created.planVersion._id,
      transitionId: 'submit_to_supervisor',
      actor: therapist,
    });
    await service.transition({
      planVersionId: created.planVersion._id,
      transitionId: 'begin_review',
      actor: supervisor,
    });
    await service.recordReviewScorecard({
      planVersionId: created.planVersion._id,
      actor: supervisor,
      scorecard: {
        quality: 9,
        compliance: 9,
        clarity: 9,
        measurability: 9,
        safety: 9,
        familyReadiness: 9,
      },
    });

    const record = await CarePlanVersion.findById(created.planVersion._id);
    const sup = roleViews.renderSupervisorReview(record);
    expect(sup.viewProfile).toBe('supervisor_review');
    expect(sup.goals[0].hasBaseline).toBe(true);
    expect(sup.actionsAvailable).toEqual(
      expect.arrayContaining(['approve', 'reject', 'request_revision', 'escalate'])
    );

    const clin = roleViews.renderClinicianWorking(record);
    expect(clin.viewProfile).toBe('clinician_working');
    expect(clin.body.goals[0].confidence).toBe(0.78);
  });

  test('report generation renders against real plan body', async () => {
    const service = makeService();
    const created = await service.createDraft(readyDraftInput());
    await service.runValidation({ planVersionId: created.planVersion._id, actor: therapist });
    await service.transition({
      planVersionId: created.planVersion._id,
      transitionId: 'submit_to_supervisor',
      actor: therapist,
    });
    await service.transition({
      planVersionId: created.planVersion._id,
      transitionId: 'begin_review',
      actor: supervisor,
    });
    await service.recordReviewScorecard({
      planVersionId: created.planVersion._id,
      actor: supervisor,
      scorecard: {
        quality: 9,
        compliance: 9,
        clarity: 9,
        measurability: 9,
        safety: 9,
        familyReadiness: 9,
      },
    });
    await service.transition({
      planVersionId: created.planVersion._id,
      transitionId: 'approve',
      actor: supervisor,
    });

    const record = await CarePlanVersion.findById(created.planVersion._id);
    const planBody = record.toObject();

    const clinReport = reportGenerator.generateReport('clinician_draft', planBody);
    expect(clinReport.ok).toBe(true);
    expect(clinReport.markdown).toContain('g1');

    const supReport = reportGenerator.generateReport('supervisor_review', planBody);
    expect(supReport.ok).toBe(true);
    expect(supReport.markdown).toContain('بطاقة الدرجات');
    expect(supReport.markdown).toContain('✅ اعتماد');

    const finalReport = reportGenerator.generateReport('final_approved_plan', planBody);
    expect(finalReport.ok).toBe(true);
    expect(finalReport.markdown).toContain('سلسلة التوقيعات');
    expect(finalReport.markdown).toMatch(/[a-f0-9]{64}/); // evidenceHash visible
  });

  test('Wave-18 invariant: cannot save approved version without reviewer + approver + signature', async () => {
    // Construct a doc directly bypassing the service to test the model invariant
    const beneficiaryId = new mongoose.Types.ObjectId();
    const branchId = new mongoose.Types.ObjectId();
    const doc = new CarePlanVersion({
      planId: 'plan_inv_test',
      versionNumber: 1,
      planType: 'individual_therapy',
      status: 'approved', // jumping straight to approved without reviewer
      beneficiaryId,
      branchId,
      authorId: new mongoose.Types.ObjectId(),
      reasonForPlan: 'initial',
    });

    let err = null;
    try {
      await doc.save();
    } catch (e) {
      err = e;
    }
    expect(err).toBeTruthy();
    expect(err.errors).toBeTruthy();
    // The invariant catches reviewer + approver + signatureChain in one pass
    expect(
      err.errors.reviewerId || err.errors.approverId || err.errors.signatureChain
    ).toBeDefined();
  });
});
