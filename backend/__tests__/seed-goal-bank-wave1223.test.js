'use strict';

/**
 * W1223 — seed-goal-bank starter catalog (Blueprint-43 §7.2 + the R4
 * pathway-bundles data prerequisite).
 *
 * Layers:
 *  1. CATALOG SHAPE — every starter goal satisfies the GoalBank schema enums
 *     (domain/difficulty), carries a sane age window, Arabic SMART text and a
 *     measurement criterion; (domain,category,description) keys are unique
 *     (they ARE the idempotency key); every GoalBank domain is represented
 *     (the bundles registry maps each bundle to ≥1 of them).
 *  2. CLI BEHAVIORAL (MMS) — real `node scripts/seed-goal-bank.js` child runs:
 *     first run inserts all, second run skips all (idempotent), --reset
 *     deletes ONLY starter-tagged rows (hand-entered rows survive).
 */

jest.unmock('mongoose');
jest.setTimeout(120000);

const path = require('path');
const { execFileSync } = require('child_process');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'seed-goal-bank.js');
const { CATALOG, STARTER_TAGS } = require('../scripts/seed-goal-bank');

const GOALBANK_DOMAINS = ['SPEECH', 'OCCUPATIONAL', 'PHYSICAL', 'BEHAVIORAL', 'SPECIAL_EDU'];
const DIFFICULTIES = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'];

describe('W1223 catalog shape', () => {
  test('source enums in this guard match models/GoalBank.js', () => {
    const src = require('fs').readFileSync(path.join(__dirname, '..', 'models', 'GoalBank.js'), 'utf8');
    for (const d of GOALBANK_DOMAINS) expect(src).toContain(`'${d}'`);
    for (const d of DIFFICULTIES) expect(src).toContain(`'${d}'`);
  });

  test('every item is schema-valid in shape', () => {
    expect(CATALOG.length).toBeGreaterThanOrEqual(30);
    for (const g of CATALOG) {
      expect(GOALBANK_DOMAINS).toContain(g.domain);
      expect(DIFFICULTIES).toContain(g.difficulty);
      expect(typeof g.category).toBe('string');
      expect(g.category.length).toBeGreaterThan(2);
      expect(typeof g.description).toBe('string');
      expect(g.description.length).toBeGreaterThan(30); // real SMART text, not a stub
      expect(/[؀-ۿ]/.test(g.description)).toBe(true); // Arabic
      expect(typeof g.measurementCriteria).toBe('string');
      expect(Number.isInteger(g.targetAgeMin)).toBe(true);
      expect(Number.isInteger(g.targetAgeMax)).toBe(true);
      expect(g.targetAgeMin).toBeGreaterThanOrEqual(0);
      expect(g.targetAgeMax).toBeGreaterThan(g.targetAgeMin);
      expect(g.targetAgeMax).toBeLessThanOrEqual(18);
    }
  });

  test('(domain, category, description) idempotency keys are unique', () => {
    const keys = CATALOG.map(g => `${g.domain}|${g.category}|${g.description}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  test('every GoalBank domain is represented (bundles map into all of them)', () => {
    const domains = new Set(CATALOG.map(g => g.domain));
    for (const d of GOALBANK_DOMAINS) expect(domains.has(d)).toBe(true);
  });

  test('age coverage spans early-intervention through teen for every domain', () => {
    for (const d of GOALBANK_DOMAINS) {
      const items = CATALOG.filter(g => g.domain === d);
      expect(Math.min(...items.map(g => g.targetAgeMin))).toBeLessThanOrEqual(4);
      expect(Math.max(...items.map(g => g.targetAgeMax))).toBeGreaterThanOrEqual(8);
    }
  });
});

describe('W1223 CLI behavioral (MMS)', () => {
  let mongod;
  let uri;
  let GoalBank;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1223-goalbank' } });
    uri = mongod.getUri();
    await mongoose.connect(uri);
    GoalBank = require('../models/GoalBank');
  });

  afterAll(async () => {
    await mongoose.disconnect().catch(() => null);
    if (mongod) await mongod.stop().catch(() => null);
  });

  function runSeeder(extraArgs = []) {
    const out = execFileSync(process.execPath, [SCRIPT, '--json', ...extraArgs], {
      env: { ...process.env, MONGODB_URI: uri },
      encoding: 'utf8',
      timeout: 60000,
    });
    return JSON.parse(out);
  }

  test('first run inserts the full catalog; second run skips everything (idempotent)', async () => {
    const first = runSeeder();
    expect(first.inserted).toBe(CATALOG.length);
    expect(first.skipped).toBe(0);
    expect(await GoalBank.countDocuments({})).toBe(CATALOG.length);

    const second = runSeeder();
    expect(second.inserted).toBe(0);
    expect(second.skipped).toBe(CATALOG.length);
    expect(await GoalBank.countDocuments({})).toBe(CATALOG.length);
  });

  test('--reset deletes ONLY starter-tagged rows; hand-entered goals survive', async () => {
    await GoalBank.create({
      domain: 'SPEECH',
      category: 'Clinician Custom',
      description: 'هدف مُدخل يدوياً من أخصائي يجب ألا يمسّه إعادة الزرع أبداً',
      targetAgeMin: 3,
      targetAgeMax: 9,
      difficulty: 'BEGINNER',
      tags: ['clinician'],
    });

    const res = runSeeder(['--reset']);
    expect(res.deleted).toBe(CATALOG.length); // starter rows from the previous test
    expect(res.inserted).toBe(CATALOG.length); // re-seeded fresh
    expect(await GoalBank.countDocuments({ category: 'Clinician Custom' })).toBe(1);
    expect(await GoalBank.countDocuments({ tags: { $all: STARTER_TAGS } })).toBe(CATALOG.length);
  });
});
