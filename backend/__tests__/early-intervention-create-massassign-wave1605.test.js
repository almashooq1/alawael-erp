/**
 * W1605 — Early-Intervention create mass-assignment guard.
 *
 * The 5 EI create paths spread req.body into `new Model(data)` with no
 * whitelist, so a caller could forge lifecycle/workflow fields that carry a
 * schema default or belong to a review/consent/discharge flow:
 *   • child.status ('DISCHARGED'), child.eligibilityStatus ('ELIGIBLE' without a
 *     review), child.eligibilityDate / dischargeDate
 *   • ifsp.parentConsent / parentSignature (forge already-obtained parental
 *     consent + signature on a child's service plan), ifsp.status
 *   • screening/milestone/referral.status, referral.parentConsent
 *
 * Fix: stripCreate(data, resource) deletes those keys before construction, so the
 * schema defaults apply. Clinical INPUT (overallResult, scores) is untouched;
 * createdBy/branchId are stamped server-side.
 *
 * Behavioral proof (MongoMemoryServer): forged values do NOT persist.
 */
'use strict';

jest.setTimeout(60000);
jest.unmock('mongoose');

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let service;
const USER = new mongoose.Types.ObjectId();

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  if (!mongoose.models.User)
    mongoose.model('User', new mongoose.Schema({ name: String, email: String }));
  service = require('../services/earlyIntervention.service');
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

describe('W1605 EI create mass-assign strip', () => {
  test('child create cannot forge status / eligibilityStatus (defaults apply)', async () => {
    const child = await service.createChild(
      {
        firstName: 'Forge',
        lastName: 'Test',
        gender: 'MALE',
        birthInfo: { birthDate: new Date('2024-01-01') },
        status: 'DISCHARGED', // forged lifecycle
        eligibilityStatus: 'ELIGIBLE', // forged — must go through eligibility review
        eligibilityDate: new Date(),
        dischargeDate: new Date(),
      },
      USER
    );
    expect(child.status).toBe('ACTIVE'); // schema default, not the forged value
    expect(child.eligibilityStatus).toBe('PENDING'); // schema default
    expect(child.eligibilityDate).toBeUndefined();
    expect(child.dischargeDate).toBeUndefined();
  });

  test('IFSP create cannot forge parental consent / signature (defaults apply)', async () => {
    const child = await service.createChild(
      { firstName: 'IfspChild', lastName: 'T', gender: 'FEMALE', birthInfo: { birthDate: new Date('2024-02-01') } },
      USER
    );
    const ifsp = await service.createIFSP(
      {
        child: child._id,
        startDate: new Date(),
        serviceCoordinator: USER,
        parentConsent: true, // forged — consent must be captured via its own flow
        parentSignature: 'FORGED-SIGNATURE',
      },
      USER
    );
    expect(ifsp.parentConsent).toBe(false); // schema default, not the forged true
    expect(ifsp.parentSignature).toBeUndefined();
  });

  test('legitimate clinical input is preserved (only lifecycle keys stripped)', async () => {
    const child = await service.createChild(
      {
        firstName: 'Keep',
        lastName: 'Fields',
        gender: 'MALE',
        birthInfo: { birthDate: new Date('2024-03-01') },
        primaryDiagnosis: 'Global developmental delay',
        disabilityType: 'DEVELOPMENTAL_DELAY',
      },
      USER
    );
    expect(child.firstName).toBe('Keep');
    expect(child.primaryDiagnosis).toBe('Global developmental delay');
    expect(child.disabilityType).toBe('DEVELOPMENTAL_DELAY');
  });
});
