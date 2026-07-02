/**
 * W1608 — backfill-ei-branch script.
 *
 * Verifies the legacy branchId backfill that completes the EI isolation arc
 * (#914/#925/#928/#931): a child's branch is derived from createdBy (fallback
 * primaryCoordinator) User.branchId; sub-resources inherit the parent child's
 * branchId; dry-run writes nothing; unmappable docs are reported; idempotent.
 */
'use strict';

jest.setTimeout(60000);
jest.unmock('mongoose');

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let backfillEiBranch;
let EarlyInterventionChild;
let DevelopmentalScreening;
let IFSP;
let User;

const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  // Minimal User with branchId (the backfill source).
  User = mongoose.model('User', new mongoose.Schema({ branchId: mongoose.Schema.Types.ObjectId }));
  ({ EarlyInterventionChild, DevelopmentalScreening, IFSP } = require('../models/EarlyIntervention'));
  ({ backfillEiBranch } = require('../scripts/backfill-ei-branch'));
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

const child = (createdBy, coordinator) => ({
  firstName: 'C',
  lastName: 'T',
  gender: 'MALE',
  birthInfo: { birthDate: new Date('2024-01-01') },
  createdBy,
  primaryCoordinator: coordinator,
});

describe('W1608 EI branch backfill', () => {
  let childA;
  let childB;
  let childOrphan;

  beforeAll(async () => {
    const userA = await User.create({ branchId: BRANCH_A });
    const userB = await User.create({ branchId: BRANCH_B });
    const userNoBranch = await User.create({});
    // childA: branch via createdBy; childB: branch via coordinator fallback; orphan: none.
    childA = await EarlyInterventionChild.create(child(userA._id, undefined));
    childB = await EarlyInterventionChild.create(child(userNoBranch._id, userB._id));
    childOrphan = await EarlyInterventionChild.create(child(userNoBranch._id, userNoBranch._id));
    await DevelopmentalScreening.create({
      child: childA._id,
      screeningDate: new Date(),
      childAgeMonths: 12,
      overallResult: 'TYPICAL',
    });
    await IFSP.create({ child: childB._id, startDate: new Date(), serviceCoordinator: userA._id });
  });

  test('dry-run reports mappable docs but writes nothing', async () => {
    const report = await backfillEiBranch({ apply: false });
    expect(report.childrenMapped).toBe(2); // childA (createdBy) + childB (coordinator)
    expect(report.childrenUnmapped).toBe(1); // orphan
    expect(report.subMapped).toBe(2); // screening + IFSP
    // nothing written
    const a = await EarlyInterventionChild.findById(childA._id).select('branchId').lean();
    expect(a.branchId == null).toBe(true);
  });

  test('apply writes derived branchIds (createdBy + coordinator fallback + inheritance)', async () => {
    await backfillEiBranch({ apply: true });
    const a = await EarlyInterventionChild.findById(childA._id).select('branchId').lean();
    const b = await EarlyInterventionChild.findById(childB._id).select('branchId').lean();
    const o = await EarlyInterventionChild.findById(childOrphan._id).select('branchId').lean();
    expect(String(a.branchId)).toBe(String(BRANCH_A)); // via createdBy
    expect(String(b.branchId)).toBe(String(BRANCH_B)); // via primaryCoordinator fallback
    expect(o.branchId == null).toBe(true); // unmappable → left null (legacy escape)

    const scr = await DevelopmentalScreening.findOne({ child: childA._id }).select('branchId').lean();
    const ifsp = await IFSP.findOne({ child: childB._id }).select('branchId').lean();
    expect(String(scr.branchId)).toBe(String(BRANCH_A)); // inherited from child
    expect(String(ifsp.branchId)).toBe(String(BRANCH_B));
  });

  test('idempotent — a second apply maps nothing new', async () => {
    const report = await backfillEiBranch({ apply: true });
    expect(report.childrenMapped).toBe(0);
    expect(report.subMapped).toBe(0);
    expect(report.childrenUnmapped).toBe(1); // orphan still unmappable
  });
});
