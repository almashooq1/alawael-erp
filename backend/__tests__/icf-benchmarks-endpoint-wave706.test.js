'use strict';

/**
 * icf-benchmarks-endpoint-wave706.test.js — behavioral + static guard.
 *
 * W706 wires the icf-assessments /benchmarks surface (was 4 stubs returning
 * []/req.body/{imported:0}/{score:null}, shadowing the real ICFBenchmark
 * model) to the canonical ICFBenchmark collection, and computes per-assessment
 * z-score/percentile comparison from the assessment's own qualifier arrays.
 */

jest.unmock('mongoose');
jest.setTimeout(30000);

const fs = require('fs');
const path = require('path');
const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let app;
let ICFBenchmark;
let ICFAssessment;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w706-benchmarks-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  ICFBenchmark = require('../models/icf/ICFBenchmark.model');
  ICFAssessment = require('../models/icf/ICFAssessment.model');
  await ICFBenchmark.init();

  app = express();
  app.use(express.json());
  app.use('/icf', require('../routes/icf-assessments.routes'));
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await ICFBenchmark.deleteMany({});
  await ICFAssessment.deleteMany({});
});

describe('W706 static — placeholders removed, wired to ICFBenchmark', () => {
  const src = fs.readFileSync(
    path.join(__dirname, '..', 'routes', 'icf-assessments.routes.js'),
    'utf8'
  );
  it('declares an IcfBenchmark model loader', () => {
    expect(src).toMatch(/function IcfBenchmark\s*\(/);
    expect(src).toMatch(/mongoose\.model\(\s*['"]ICFBenchmark['"]\s*\)/);
  });
  it('/benchmarks no longer returns a static empty array', () => {
    const idx = src.indexOf("'/benchmarks'");
    const block = src.slice(idx, idx + 400);
    expect(block).toMatch(/IcfBenchmark\(\)/);
    expect(block).not.toMatch(/res\.json\(\{ success: true, data: \[\] \}\)/);
  });
  it('/:id/benchmark computes z-score/percentile (no static null)', () => {
    const idx = src.indexOf("'/:id/benchmark'");
    const block = src.slice(idx, idx + 2500);
    expect(block).toMatch(/zScore/);
    expect(block).not.toMatch(/score: null, percentile: null/);
  });
});

describe('W706 behavioral — /benchmarks CRUD', () => {
  const bench = (o = {}) => ({
    code: 'b117',
    population: 'pediatric',
    ageGroup: '6-12',
    mean: 2,
    standardDeviation: 1,
    dataSource: 'WHO-norm',
    ...o,
  });

  it('POST creates, GET lists, filters by population', async () => {
    const c = await request(app).post('/icf/benchmarks').send(bench());
    expect(c.status).toBe(201);
    await request(app)
      .post('/icf/benchmarks')
      .send(bench({ code: 'd450', population: 'general' }));

    const all = await request(app).get('/icf/benchmarks');
    expect(all.body.data.length).toBe(2);

    const ped = await request(app).get('/icf/benchmarks?population=pediatric');
    expect(ped.body.data.length).toBe(1);
    expect(ped.body.data[0].code).toBe('b117');
  });

  it('import upserts idempotently by (code, population, ageGroup)', async () => {
    const rows = [bench(), bench({ code: 'd450' })];
    const r1 = await request(app).post('/icf/benchmarks/import').send({ benchmarks: rows });
    expect(r1.body.data.imported).toBe(2);
    // re-import same rows → still 2 docs total (no duplicates)
    await request(app).post('/icf/benchmarks/import').send({ benchmarks: rows });
    expect(await ICFBenchmark.countDocuments()).toBe(2);
  });
});

describe('W706 behavioral — GET /:id/benchmark comparison', () => {
  const icfAssessmentFixture = (overrides = {}) => ({
    title: 'W706 benchmark test',
    assessmentType: 'initial',
    beneficiaryId: new mongoose.Types.ObjectId(),
    assessorId: new mongoose.Types.ObjectId(),
    assessmentDate: new Date(),
    ...overrides,
  });

  it('joins assessment qualifiers to norms → z-score + percentile', async () => {
    await ICFBenchmark.create({
      code: 'b117',
      population: 'general',
      mean: 2,
      standardDeviation: 1,
      dataSource: 'WHO',
    });
    const a = await ICFAssessment.create(
      icfAssessmentFixture({
        bodyFunctions: {
          chapter1_mental: [{ code: 'b117', title: 'Attention', qualifier: 4 }],
        },
      })
    );
    const res = await request(app).get(`/icf/${a._id}/benchmark`);
    expect(res.status).toBe(200);
    expect(res.body.data.benchmarkedCount).toBe(1);
    const cmp = res.body.data.comparisons[0];
    expect(cmp.code).toBe('b117');
    expect(cmp.zScore).toBe(2); // (4-2)/1
    expect(cmp.percentileRank).toBe(98);
  });

  it('returns empty comparison (not 500) when no norms seeded', async () => {
    const a = await ICFAssessment.create(
      icfAssessmentFixture({
        bodyFunctions: {
          chapter1_mental: [{ code: 'b117', title: 'Attention', qualifier: 3 }],
        },
      })
    );
    const res = await request(app).get(`/icf/${a._id}/benchmark`);
    expect(res.status).toBe(200);
    expect(res.body.data.benchmarkedCount).toBe(0);
  });

  it('404 for unknown assessment id', async () => {
    const res = await request(app).get(`/icf/${new mongoose.Types.ObjectId()}/benchmark`);
    expect(res.status).toBe(404);
  });
});
