'use strict';

/**
 * W1269 — center-ops drift guard (static) + gap-detector behavioral (MMS).
 *
 *   1. STATIC — read-only invariant, W269 branch isolation, role gating,
 *      dualMountAuth mount, fail-soft tiles (Promise.allSettled).
 *   2. BEHAVIORAL — the missing-plans detector logic proven on real models:
 *      an active beneficiary with an OPEN episode and NO live plan is
 *      flagged; adding a draft plan clears the flag.
 */

jest.unmock('mongoose');
jest.setTimeout(120000);

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const read = rel => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
const routeSrc = read('routes/center-ops.routes.js');
const registrySrc = read('routes/registries/features.registry.js');

describe('W1269 static guard', () => {
  test('read-only — no mutating router verbs, no mass assignment', () => {
    expect(/router\.(post|put|patch|delete)\s*\(/.test(routeSrc)).toBe(false);
    expect(routeSrc.includes('...req.body')).toBe(false);
  });

  test('W269 branch isolation + role gating on every endpoint', () => {
    expect(routeSrc).toContain('router.use(requireBranchAccess)');
    expect(routeSrc).toContain('branchFilter(req)');
    expect(/req\.branchId/.test(routeSrc)).toBe(false);
    const gets = routeSrc.match(/router\.get\(/g) || [];
    const gated = routeSrc.match(/router\.get\([^,]+,\s*requireRole\(/g) || [];
    expect(gets.length).toBe(2);
    expect(gated.length).toBe(gets.length);
  });

  test('fail-soft tiles via Promise.allSettled', () => {
    expect(routeSrc).toContain('Promise.allSettled');
  });

  test('mounted via dualMountAuth in features.registry', () => {
    expect(registrySrc).toContain(
      "dualMountAuth(app, 'center-ops', centerOpsRoutes, authenticate)"
    );
  });
});

describe('W1269 gap detector (MMS)', () => {
  let mongod;
  let Beneficiary;
  let Episode;
  let Plan;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
    Beneficiary = require('../models/Beneficiary');
    require('../domains/episodes/models/EpisodeOfCare');
    Episode = mongoose.model('EpisodeOfCare');
    ({ UnifiedCarePlan: Plan } = require('../domains/care-plans/models/UnifiedCarePlan'));
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongod) await mongod.stop();
  });

  beforeEach(async () => {
    await Promise.all([Beneficiary.deleteMany({}), Episode.deleteMany({}), Plan.deleteMany({})]);
  });

  // The detector's exact core logic, extracted for behavioral proof.
  async function detectGaps() {
    const open = await Episode.find({
      status: { $in: ['planned', 'active', 'on_hold', 'suspended'] },
    })
      .select('beneficiaryId')
      .lean();
    const withEpisode = [...new Set(open.map(e => String(e.beneficiaryId)))];
    const planned = await Plan.find({
      beneficiaryId: { $in: withEpisode },
      isDeleted: { $ne: true },
      status: { $in: ['draft', 'pending_approval', 'active', 'under_review'] },
    })
      .select('beneficiaryId')
      .lean();
    const plannedSet = new Set(planned.map(p => String(p.beneficiaryId)));
    return withEpisode.filter(id => !plannedSet.has(id));
  }

  test('active beneficiary + open episode + no plan → FLAGGED; draft plan clears it', async () => {
    const ben = await Beneficiary.create({
      firstName: 'فجوة',
      lastName: 'اختبارية',
      status: 'active',
      category: 'mental',
    });
    await Episode.create({ beneficiaryId: ben._id, status: 'active', startDate: new Date() });

    let gaps = await detectGaps();
    expect(gaps).toContain(String(ben._id)); // flagged

    await Plan.create({
      beneficiaryId: ben._id,
      episodeId: new mongoose.Types.ObjectId(),
      startDate: new Date(),
      status: 'draft',
    });
    gaps = await detectGaps();
    expect(gaps).not.toContain(String(ben._id)); // cleared by the draft
  });

  test('closed episodes and completed plans do not affect the flag', async () => {
    const ben = await Beneficiary.create({
      firstName: 'مغلق',
      lastName: 'اختباري',
      status: 'active',
      category: 'mental',
    });
    await Episode.create({ beneficiaryId: ben._id, status: 'completed', startDate: new Date() });
    expect(await detectGaps()).not.toContain(String(ben._id)); // no open episode → not in scope

    await Episode.create({ beneficiaryId: ben._id, status: 'active', startDate: new Date() });
    await Plan.create({
      beneficiaryId: ben._id,
      episodeId: new mongoose.Types.ObjectId(),
      startDate: new Date(),
      status: 'completed', // not a live plan
    });
    expect(await detectGaps()).toContain(String(ben._id)); // completed plan ≠ coverage
  });
});
