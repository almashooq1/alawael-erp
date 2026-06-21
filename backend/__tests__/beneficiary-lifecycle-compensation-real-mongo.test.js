'use strict';

/**
 * beneficiary-lifecycle-compensation-real-mongo.test.js — Phase E.
 *
 * End-to-end integration tests against a real in-memory MongoDB instance.
 * Drives the full lifecycle workflow for reversible transitions and proves
 * that the compensation handlers actually undo the forward mutations on
 * Appointment and EpisodeOfCare documents.
 */

jest.unmock('mongoose');
jest.setTimeout(120000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const {
  createBeneficiaryLifecycleService,
  REASON,
} = require('../intelligence/beneficiary-lifecycle.service');
const {
  createBeneficiaryLifecycleSideEffectHandlers,
} = require('../intelligence/beneficiary-lifecycle-side-effects.service');

const FIXED_NOW = new Date('2026-06-01T12:00:00.000Z');

// Wrap a Mongoose model so aggregation-pipeline updates receive
// { updatePipeline: true } automatically. This is only needed in test
// contexts that use real Mongoose models; the service handlers use plain
// updateMany(filter, pipeline) for flexibility.
function withPipelineOption(model) {
  return {
    ...model,
    updateMany: async (filter, update, options = {}) => {
      const opts = Array.isArray(update) ? { ...options, updatePipeline: true } : options;
      return model.updateMany(filter, update, opts);
    },
  };
}

function oid(seed = null) {
  return seed ? new mongoose.Types.ObjectId(seed) : new mongoose.Types.ObjectId();
}

function actor(role) {
  return { userId: new mongoose.Types.ObjectId(), role };
}

let mongod;
let Beneficiary;
let Appointment;
let EpisodeOfCare;
let BeneficiaryLifecycleTransition;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'lifecycle-compensation' } });
  await mongoose.connect(mongod.getUri());

  Beneficiary = require('../models/Beneficiary');
  Appointment = require('../models/Appointment');
  ({ EpisodeOfCare } = require('../domains/episodes/models/EpisodeOfCare'));
  BeneficiaryLifecycleTransition = require('../models/BeneficiaryLifecycleTransition');
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

afterEach(async () => {
  await Promise.all([
    Beneficiary.deleteMany({}),
    Appointment.deleteMany({}),
    EpisodeOfCare.deleteMany({}),
    BeneficiaryLifecycleTransition.deleteMany({}),
  ]);
});

function buildService() {
  const handlers = createBeneficiaryLifecycleSideEffectHandlers({
    appointmentModel: withPipelineOption(Appointment),
    episodeModel: withPipelineOption(EpisodeOfCare),
    beneficiaryModel: Beneficiary,
    now: () => FIXED_NOW,
    logger: { warn: () => {}, info: () => {} },
  });

  return createBeneficiaryLifecycleService({
    transitionLog: BeneficiaryLifecycleTransition,
    beneficiaryModel: Beneficiary,
    sideEffectHandlers: handlers,
    now: () => FIXED_NOW,
    logger: { warn: () => {}, info: () => {} },
    enforceMfa: false,
  });
}

async function seedBeneficiary() {
  return Beneficiary.create({
    status: 'active',
    firstName: 'Test',
    lastName: 'Beneficiary',
    fullNameArabic: 'اختبار',
    dateOfBirth: new Date('2010-01-01'),
    contactInfo: { primaryPhone: '0500000000' },
  });
}

async function seedFutureAppointments(beneficiaryId) {
  const base = new Date(FIXED_NOW.getTime() + 24 * 60 * 60 * 1000);
  return Appointment.create([
    { beneficiary: beneficiaryId, date: base, startTime: '09:00', status: 'PENDING' },
    {
      beneficiary: beneficiaryId,
      date: new Date(base.getTime() + 60 * 60 * 1000),
      startTime: '10:00',
      status: 'CONFIRMED',
    },
  ]);
}

async function seedActiveEpisode(beneficiaryId) {
  return EpisodeOfCare.create({
    beneficiaryId,
    startDate: new Date('2026-01-01'),
    status: 'active',
    careTeam: [
      {
        userId: oid(),
        role: 'lead_therapist',
        isActive: true,
        assignedAt: new Date('2026-01-01'),
      },
      {
        userId: oid(),
        role: 'speech_therapist',
        isActive: true,
        assignedAt: new Date('2026-01-01'),
      },
    ],
  });
}

async function approveAll(svc, record, roles) {
  for (const role of roles) {
    const res = await svc.approveTransition({
      transitionRecordId: record._id,
      actor: actor(role),
      approverRole: role,
      nafathSignatureId: `nafath-${role}`,
    });
    expect(res.ok).toBe(true);
    expect(res.reason).not.toBe(REASON.SELF_APPROVAL);
  }
}

describe('BeneficiaryLifecycle compensation — real MongoDB', () => {
  test('discharge execute cancels appointments/releases care team; reverse restores them', async () => {
    const svc = buildService();
    const beneficiary = await seedBeneficiary();
    const [appt1, appt2] = await seedFutureAppointments(beneficiary._id);
    const episode = await seedActiveEpisode(beneficiary._id);
    const branchId = oid();

    const req = await svc.requestTransition({
      beneficiaryId: beneficiary._id,
      branchId,
      transitionId: 'discharge',
      actor: actor('clinical_lead'),
      reason: 'Goals met',
      reasonCode: 'goals-met',
    });
    expect(req.ok).toBe(true);

    await approveAll(
      svc,
      req.transitionRecord,
      ['clinical_lead', 'family_acknowledgment'],
      req.transitionRecord.requestedBy
    );

    const exec = await svc.executeTransition({
      transitionRecordId: req.transitionRecord._id,
      actor: actor('clinical_lead'),
    });
    expect(exec.ok).toBe(true);

    // Forward effects
    let refreshed = await Beneficiary.findById(beneficiary._id).lean();
    expect(refreshed.status).toBe('discharged');

    const cancelled = await Appointment.find({ beneficiary: beneficiary._id }).lean();
    expect(cancelled.every(a => a.status === 'CANCELLED')).toBe(true);
    expect(
      cancelled.every(
        a => a.lifecycleCancellationTag && a.lifecycleCancellationTag.transitionId === 'discharge'
      )
    ).toBe(true);

    let epAfter = await EpisodeOfCare.findById(episode._id).lean();
    expect(epAfter.careTeam.every(m => !m.isActive && m.removedAt)).toBe(true);
    expect(
      epAfter.careTeam.every(
        m => m.lifecycleReleaseTag && m.lifecycleReleaseTag.transitionId === 'discharge'
      )
    ).toBe(true);

    // Reverse
    const rev = await svc.reverseTransition({
      transitionRecordId: req.transitionRecord._id,
      actor: actor('dpo'),
      reason: 'family appealed',
    });
    expect(rev.ok).toBe(true);

    refreshed = await Beneficiary.findById(beneficiary._id).lean();
    expect(refreshed.status).toBe('active');

    const restored = await Appointment.find({ beneficiary: beneficiary._id }).lean();
    expect(restored.find(a => String(a._id) === String(appt1._id)).status).toBe('PENDING');
    expect(restored.find(a => String(a._id) === String(appt2._id)).status).toBe('CONFIRMED');
    expect(restored.every(a => a.lifecycleCancellationTag == null)).toBe(true);

    epAfter = await EpisodeOfCare.findById(episode._id).lean();
    expect(epAfter.careTeam.every(m => m.isActive && m.removedAt == null)).toBe(true);
    expect(epAfter.careTeam.every(m => m.lifecycleReleaseTag == null)).toBe(true);

    const record = await BeneficiaryLifecycleTransition.findById(req.transitionRecord._id).lean();
    expect(record.status).toBe('reversed');
    expect(Array.isArray(record.compensationEffectsAudit)).toBe(true);
  });

  test('record_deceased execute closes episode; reverse reopens it', async () => {
    const svc = buildService();
    const beneficiary = await seedBeneficiary();
    const [appt1] = await seedFutureAppointments(beneficiary._id);
    const episode = await seedActiveEpisode(beneficiary._id);
    const branchId = oid();

    const req = await svc.requestTransition({
      beneficiaryId: beneficiary._id,
      branchId,
      transitionId: 'record_deceased',
      actor: actor('clinical_lead'),
      reason: 'Natural causes',
      reasonCode: 'natural',
    });
    expect(req.ok).toBe(true);

    await approveAll(
      svc,
      req.transitionRecord,
      ['clinical_lead', 'branch_director'],
      req.transitionRecord.requestedBy
    );

    const exec = await svc.executeTransition({
      transitionRecordId: req.transitionRecord._id,
      actor: actor('clinical_lead'),
    });
    expect(exec.ok).toBe(true);

    let epAfter = await EpisodeOfCare.findById(episode._id).lean();
    expect(epAfter.status).toBe('completed');
    expect(epAfter.actualEndDate).toEqual(FIXED_NOW);
    expect(epAfter.dischargeReason).toBe('medical_reason');
    expect(epAfter.lifecycleClosureTag.transitionId).toBe('record_deceased');

    // Reverse
    const rev = await svc.reverseTransition({
      transitionRecordId: req.transitionRecord._id,
      actor: actor('dpo'),
      reason: 'data correction',
    });
    expect(rev.ok).toBe(true);

    epAfter = await EpisodeOfCare.findById(episode._id).lean();
    expect(epAfter.status).toBe('active');
    expect(epAfter.actualEndDate).toBeNull();
    expect(epAfter.dischargeReason).toBeNull();
    expect(epAfter.lifecycleClosureTag).toBeNull();

    const restored = await Appointment.findById(appt1._id).lean();
    expect(restored.status).toBe('PENDING');
    expect(restored.lifecycleCancellationTag).toBeNull();
  });
});
