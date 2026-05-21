'use strict';

/**
 * goal-linkage-insights-wave237.test.js — Wave 237.
 *
 * Reverse views + ops KPIs over W235 linkage data:
 *
 *   findOrphanedMeasures:
 *     - active measure with 0 links → orphan
 *     - active measure with active link → NOT orphan
 *     - active measure with only unlinked + CONTRAINDICATED links → orphan
 *     - sorted by least total activity first
 *     - branchId scopes the link search
 *
 *   findOverloadedMeasures:
 *     - measure linked to N > threshold distinct goals → reported
 *     - measure linked to ≤ threshold → not reported
 *     - distinct goals counted (same goal w/ measure twice → 1)
 *     - unlinked + CONTRAINDICATED filtered out
 *
 *   linkageKpis:
 *     - total goals, withMeasureLinks, withPrimaryLink, primaryCoverage
 *     - links total/active/flagged/under_review/unlinked counts
 *     - verbose rationale (≥20 chars) coverage
 *     - overdueReviews counts nextLinkReviewAt < now (active only)
 *     - empty org → null coverages
 *
 *   linkTypeDistribution:
 *     - counts per linkType, excludes unlinked
 */

jest.unmock('mongoose');
jest.setTimeout(30000);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const { MongoMemoryServer } = require('mongodb-memory-server');
let mongod;
let Measure;
let TherapeuticGoal;
let insights;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w237-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  ({ Measure } = require('../domains/goals/models/Measure'));
  ({ TherapeuticGoal } = require('../domains/goals/models/TherapeuticGoal'));
  insights = require('../services/goalLinkageInsights.service');
  await Measure.init();
  await TherapeuticGoal.init();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await Measure.deleteMany({});
  await TherapeuticGoal.deleteMany({});
});

const DAY = 86400000;

async function seedMeasure({ code = 'BERG', status = 'active' } = {}) {
  return Measure.create({
    code,
    name: code,
    category: 'motor',
    version: '1.0.0',
    purpose: 'outcome',
    rawShape: 'items_array',
    derivedType: 'sum',
    interpretationStyle: 'tier',
    scoringAlgorithmRef: `scoring/${code.toLowerCase()}.js`,
    scoringEngineVersion: '1.0.0',
    status,
    administrationTime: 20,
    administeredBy: ['physical_therapist'],
    ageRange: { min: 5, max: 95, unit: 'years' },
    minScore: 0,
    maxScore: 56,
    scoringDirection: 'higher_better',
    reassessment: { standardIntervalDays: 90 },
    interpretation: {
      mcid: { value: 4, type: 'absolute', status: 'established', source: 'cite' },
    },
    targetPopulation: ['all'],
  });
}

function makeLink(measure, opts = {}) {
  return {
    measureId: measure._id,
    measureCode: measure.code,
    linkType: opts.linkType || 'PRIMARY',
    weight: opts.weight ?? 1,
    linkRationale: opts.rationale ?? 'evidence-based primary measure',
    interventionRefs: opts.interventionRefs ?? ['PROGRAM_X'],
    status: opts.status || 'active',
    linkedBy: opts.linkedBy || new mongoose.Types.ObjectId(),
    linkedAt: opts.linkedAt || new Date(),
    nextLinkReviewAt: opts.nextLinkReviewAt,
    ...(opts.status === 'unlinked'
      ? {
          unlinkedAt: new Date(),
          unlinkedBy: new mongoose.Types.ObjectId(),
          unlinkReason: opts.unlinkReason || 'no longer needed',
          weight: 0,
        }
      : {}),
  };
}

async function seedGoalWithLinks({
  branchId,
  links,
  status = 'active',
  baselineValue = 20,
  targetValue = 40,
}) {
  return TherapeuticGoal.create({
    beneficiaryId: new mongoose.Types.ObjectId(),
    episodeId: new mongoose.Types.ObjectId(),
    title: 'g',
    type: 'short_term',
    startDate: new Date(),
    target: { value: targetValue },
    baseline: { value: baselineValue, date: new Date() },
    status,
    branchId,
    objectives: [
      {
        title: 'o',
        measureLinks: links,
      },
    ],
  });
}

// ════════════════════════════════════════════════════════════════════════
// 1. findOrphanedMeasures
// ════════════════════════════════════════════════════════════════════════

describe('W237 — findOrphanedMeasures', () => {
  test('active measure with no links → orphan', async () => {
    const m = await seedMeasure();
    const out = await insights.findOrphanedMeasures();
    expect(out.length).toBe(1);
    expect(out[0].measureId).toBe(String(m._id));
    expect(out[0].activeLinks).toBe(0);
    expect(out[0].totalLinks).toBe(0);
  });

  test('measure with active link → NOT orphan', async () => {
    const m = await seedMeasure();
    await seedGoalWithLinks({ links: [makeLink(m)] });
    const out = await insights.findOrphanedMeasures();
    expect(out).toEqual([]);
  });

  test('measure with only unlinked + CONTRAINDICATED → orphan (no active)', async () => {
    const m = await seedMeasure();
    // Use two separate goals for the unlinked and CONTRAINDICATED links so
    // each objective remains schema-valid (no need for a PRIMARY contributing link).
    await seedGoalWithLinks({
      links: [makeLink(m, { status: 'unlinked' })],
    });
    await seedGoalWithLinks({
      links: [makeLink(m, { linkType: 'CONTRAINDICATED', weight: 0, interventionRefs: [] })],
    });
    const out = await insights.findOrphanedMeasures();
    expect(out.length).toBe(1);
    expect(out[0].measureId).toBe(String(m._id));
    expect(out[0].activeLinks).toBe(0);
    expect(out[0].totalLinks).toBe(2); // both rows still counted in totalLinks
  });

  test('sort by least activity first', async () => {
    const m1 = await seedMeasure({ code: 'M1' });
    const m2 = await seedMeasure({ code: 'M2' });
    const m3 = await seedMeasure({ code: 'M3' });
    // m2 has 1 historical link (unlinked); m1 has 0; m3 has 0.
    await seedGoalWithLinks({
      links: [makeLink(m2, { status: 'unlinked' })],
    });
    const out = await insights.findOrphanedMeasures();
    const codes = out.map(o => o.code);
    // m1 (0) and m3 (0) come first (alphabetical), m2 (1 hist) last.
    expect(codes).toEqual(['M1', 'M3', 'M2']);
  });

  test('inactive measure excluded from orphan list', async () => {
    await seedMeasure({ code: 'DEPR', status: 'deprecated' });
    const out = await insights.findOrphanedMeasures();
    expect(out).toEqual([]);
  });

  test('limit param honored', async () => {
    await seedMeasure({ code: 'A' });
    await seedMeasure({ code: 'B' });
    await seedMeasure({ code: 'C' });
    const out = await insights.findOrphanedMeasures({ limit: 2 });
    expect(out.length).toBe(2);
  });

  test('branchId scopes link search but measure universe is global', async () => {
    const m = await seedMeasure();
    const branchA = new mongoose.Types.ObjectId();
    const branchB = new mongoose.Types.ObjectId();
    await seedGoalWithLinks({ branchId: branchA, links: [makeLink(m)] });
    // From branchB's POV, measure has no LOCAL links → orphan in branch B
    const outB = await insights.findOrphanedMeasures({ branchId: branchB });
    expect(outB.length).toBe(1);
    // From branchA: link exists → not orphan
    const outA = await insights.findOrphanedMeasures({ branchId: branchA });
    expect(outA).toEqual([]);
  });
});

// ════════════════════════════════════════════════════════════════════════
// 2. findOverloadedMeasures
// ════════════════════════════════════════════════════════════════════════

describe('W237 — findOverloadedMeasures', () => {
  test('measure used by > threshold distinct goals → reported', async () => {
    const m = await seedMeasure();
    for (let i = 0; i < 5; i++) {
      await seedGoalWithLinks({ links: [makeLink(m)] });
    }
    const out = await insights.findOverloadedMeasures({ threshold: 3 });
    expect(out.length).toBe(1);
    expect(out[0].measureId).toBe(String(m._id));
    expect(out[0].goalCount).toBe(5);
  });

  test('measure used by ≤ threshold → not reported', async () => {
    const m = await seedMeasure();
    await seedGoalWithLinks({ links: [makeLink(m)] });
    await seedGoalWithLinks({ links: [makeLink(m)] });
    const out = await insights.findOverloadedMeasures({ threshold: 2 });
    expect(out).toEqual([]);
  });

  test('unlinked + CONTRAINDICATED do not count', async () => {
    const m = await seedMeasure();
    await seedGoalWithLinks({ links: [makeLink(m, { status: 'unlinked' })] });
    await seedGoalWithLinks({
      links: [makeLink(m, { linkType: 'CONTRAINDICATED', weight: 0, interventionRefs: [] })],
    });
    await seedGoalWithLinks({ links: [makeLink(m)] }); // only active
    const out = await insights.findOverloadedMeasures({ threshold: 0 });
    expect(out[0].goalCount).toBe(1);
  });

  test('result hydrates code + name + status', async () => {
    const m = await seedMeasure({ code: 'BERG_OL' });
    for (let i = 0; i < 5; i++) {
      await seedGoalWithLinks({ links: [makeLink(m)] });
    }
    const out = await insights.findOverloadedMeasures({ threshold: 3 });
    expect(out[0].code).toBe('BERG_OL');
    expect(out[0].status).toBe('active');
  });

  test('sorted by goalCount descending', async () => {
    const mHigh = await seedMeasure({ code: 'HIGH' });
    const mMid = await seedMeasure({ code: 'MID' });
    for (let i = 0; i < 10; i++) {
      await seedGoalWithLinks({ links: [makeLink(mHigh)] });
    }
    for (let i = 0; i < 5; i++) {
      await seedGoalWithLinks({ links: [makeLink(mMid)] });
    }
    const out = await insights.findOverloadedMeasures({ threshold: 2 });
    expect(out.map(o => o.code)).toEqual(['HIGH', 'MID']);
  });
});

// ════════════════════════════════════════════════════════════════════════
// 3. linkageKpis
// ════════════════════════════════════════════════════════════════════════

describe('W237 — linkageKpis', () => {
  test('all-empty → zeros + null coverages', async () => {
    const out = await insights.linkageKpis();
    expect(out.goals.total).toBe(0);
    expect(out.goals.primaryCoverage).toBeNull();
    expect(out.links.total).toBe(0);
    expect(out.links.rationaleCoverage).toBeNull();
  });

  test('primaryCoverage when all goals have PRIMARY link', async () => {
    const m = await seedMeasure();
    await seedGoalWithLinks({ links: [makeLink(m)] });
    await seedGoalWithLinks({ links: [makeLink(m)] });
    const out = await insights.linkageKpis();
    expect(out.goals.total).toBe(2);
    expect(out.goals.withMeasureLinks).toBe(2);
    expect(out.goals.withPrimaryLink).toBe(2);
    expect(out.goals.primaryCoverage).toBe(1);
  });

  test('primaryCoverage partial', async () => {
    const m = await seedMeasure();
    await seedGoalWithLinks({ links: [makeLink(m)] }); // has PRIMARY
    // Goal without any measureLinks — empty objectives
    await TherapeuticGoal.create({
      beneficiaryId: new mongoose.Types.ObjectId(),
      episodeId: new mongoose.Types.ObjectId(),
      title: 'g',
      type: 'short_term',
      startDate: new Date(),
      target: { value: 40 },
      objectives: [{ title: 'o' }],
    });
    const out = await insights.linkageKpis();
    expect(out.goals.total).toBe(2);
    expect(out.goals.withPrimaryLink).toBe(1);
    expect(out.goals.primaryCoverage).toBe(0.5);
  });

  test('verbose rationale coverage (≥20 chars)', async () => {
    const m = await seedMeasure();
    await seedGoalWithLinks({
      links: [makeLink(m, { rationale: 'brief note' })], // 10 chars — passes ≥10 schema check but < 20 verbose threshold
    });
    await seedGoalWithLinks({
      links: [
        makeLink(m, {
          rationale: 'thoroughly documented clinical justification for this primary measure',
        }),
      ],
    });
    const out = await insights.linkageKpis();
    expect(out.links.total).toBe(2);
    expect(out.links.withVerboseRationale).toBe(1);
    expect(out.links.rationaleCoverage).toBe(0.5);
  });

  test('overdueReviews counts active links with past nextLinkReviewAt', async () => {
    const m = await seedMeasure();
    const past = new Date(Date.now() - 10 * DAY);
    const future = new Date(Date.now() + 10 * DAY);
    await seedGoalWithLinks({
      links: [makeLink(m, { nextLinkReviewAt: past })], // overdue
    });
    await seedGoalWithLinks({
      links: [makeLink(m, { nextLinkReviewAt: future })], // not overdue
    });
    const out = await insights.linkageKpis();
    expect(out.links.overdueReviews).toBe(1);
  });

  test('overdueReviews excludes unlinked', async () => {
    const m = await seedMeasure();
    const past = new Date(Date.now() - 10 * DAY);
    await seedGoalWithLinks({
      links: [makeLink(m, { status: 'unlinked', nextLinkReviewAt: past })],
    });
    const out = await insights.linkageKpis();
    expect(out.links.overdueReviews).toBe(0);
  });

  test('rationaleMinChars override applied', async () => {
    const m = await seedMeasure();
    await seedGoalWithLinks({
      links: [makeLink(m, { rationale: '15 char rationale here' })],
    });
    // With min=10 → passes; with min=30 → fails
    const lenient = await insights.linkageKpis({ rationaleMinChars: 10 });
    expect(lenient.links.withVerboseRationale).toBe(1);
    const strict = await insights.linkageKpis({ rationaleMinChars: 30 });
    expect(strict.links.withVerboseRationale).toBe(0);
  });

  test('branchId scopes the KPIs', async () => {
    const m = await seedMeasure();
    const branchA = new mongoose.Types.ObjectId();
    const branchB = new mongoose.Types.ObjectId();
    await seedGoalWithLinks({ branchId: branchA, links: [makeLink(m)] });
    await seedGoalWithLinks({ branchId: branchB, links: [makeLink(m)] });
    const outA = await insights.linkageKpis({ branchId: branchA });
    expect(outA.goals.total).toBe(1);
    expect(outA.links.total).toBe(1);
  });
});

// ════════════════════════════════════════════════════════════════════════
// 4. linkTypeDistribution
// ════════════════════════════════════════════════════════════════════════

describe('W237 — linkTypeDistribution', () => {
  test('counts per linkType, excludes unlinked', async () => {
    const m = await seedMeasure();
    // 2 PRIMARY + 1 SECONDARY + 1 unlinked
    await seedGoalWithLinks({ links: [makeLink(m)] });
    await seedGoalWithLinks({ links: [makeLink(m)] });
    const m2 = await seedMeasure({ code: 'M2_DIST' });
    await seedGoalWithLinks({
      links: [
        makeLink(m, { linkType: 'PRIMARY', weight: 0.7 }),
        makeLink(m2, { linkType: 'SECONDARY', weight: 0.3 }),
      ],
    });
    await seedGoalWithLinks({
      links: [makeLink(m, { status: 'unlinked' })],
    });
    const dist = await insights.linkTypeDistribution();
    expect(dist.PRIMARY).toBe(3); // 2 standalone + 1 in mixed goal
    expect(dist.SECONDARY).toBe(1);
    expect(dist.CONTRAINDICATED).toBe(0);
  });
});
