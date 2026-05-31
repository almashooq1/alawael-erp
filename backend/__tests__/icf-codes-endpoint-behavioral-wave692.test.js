'use strict';

/**
 * icf-codes-endpoint-behavioral-wave692.test.js — behavioral counterpart to
 * the W692 static drift guard. MongoMemoryServer + supertest.
 *
 * Seeds a handful of ICFCodeReference docs, mounts the bare router (the
 * /codes + /codes/tree endpoints carry no per-route auth — auth is applied at
 * dualMountAuth time), and asserts the wired endpoints actually return the
 * seeded catalog with filters + tree nesting working end-to-end.
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
let ICFCodeReference;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w692-behavioral-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  ICFCodeReference = require('../models/icf/ICFCodeReference.model');
  await ICFCodeReference.init();

  app = express();
  app.use(express.json());
  app.use('/icf', require('../routes/icf-assessments.routes'));
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await ICFCodeReference.deleteMany({});
  await ICFCodeReference.create([
    {
      code: 'b1',
      component: 'bodyFunctions',
      chapter: 1,
      level: 1,
      title: 'Mental functions',
      titleAr: 'الوظائف العقلية',
    },
    {
      code: 'b117',
      component: 'bodyFunctions',
      chapter: 1,
      level: 3,
      title: 'Intellectual functions',
      titleAr: 'الوظائف الذهنية',
      parentCode: 'b1',
      coreSetMemberships: [{ setName: 'generic_brief', setVersion: '2017', isCanonical: true }],
    },
    {
      code: 'd4',
      component: 'activitiesParticipation',
      chapter: 4,
      level: 1,
      title: 'Mobility',
      titleAr: 'التنقّل',
    },
    {
      code: 'd450',
      component: 'activitiesParticipation',
      chapter: 4,
      level: 3,
      title: 'Walking',
      titleAr: 'المشي',
      parentCode: 'd4',
      coreSetMemberships: [{ setName: 'generic_brief', setVersion: '2017', isCanonical: true }],
    },
  ]);
});

describe('W692 behavioral — GET /codes', () => {
  it('returns the seeded catalog (no placeholder literals)', async () => {
    const res = await request(app).get('/icf/codes');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(4);
    expect(res.body.data.find(c => c.code === 'b117')).toBeTruthy();
    // placeholder e115 must NOT appear
    expect(res.body.data.find(c => c.code === 'e115')).toBeFalsy();
  });

  it('filters by component', async () => {
    const res = await request(app).get('/icf/codes?component=bodyFunctions');
    expect(res.status).toBe(200);
    expect(res.body.data.every(c => c.component === 'bodyFunctions')).toBe(true);
    expect(res.body.data.length).toBe(2);
  });

  it('filters by coreSet membership', async () => {
    const res = await request(app).get('/icf/codes?coreSet=generic_brief');
    expect(res.body.data.length).toBe(2);
    expect(res.body.data.map(c => c.code).sort()).toEqual(['b117', 'd450']);
  });

  it('search matches Arabic title', async () => {
    const res = await request(app).get('/icf/codes?search=' + encodeURIComponent('المشي'));
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].code).toBe('d450');
  });

  it('search matches code prefix', async () => {
    const res = await request(app).get('/icf/codes?search=d4');
    expect(res.body.data.map(c => c.code).sort()).toEqual(['d4', 'd450']);
  });
});

describe('W692 behavioral — GET /codes/tree/:component', () => {
  it('nests level-3 codes under their level-1 chapter parent', async () => {
    const res = await request(app).get('/icf/codes/tree/bodyFunctions');
    expect(res.status).toBe(200);
    expect(res.body.data.component).toBe('bodyFunctions');
    expect(res.body.data.total).toBe(2);
    const root = res.body.data.codes.find(c => c.code === 'b1');
    expect(root).toBeTruthy();
    expect(root.children.map(c => c.code)).toContain('b117');
  });

  it('returns only the requested component', async () => {
    const res = await request(app).get('/icf/codes/tree/activitiesParticipation');
    expect(res.body.data.codes.every(c => c.code.startsWith('d'))).toBe(true);
  });
});
