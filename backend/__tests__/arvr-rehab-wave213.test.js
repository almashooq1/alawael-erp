'use strict';

/**
 * arvr-rehab-wave213.test.js — Wave 213.
 *
 * Closes the AR/VR rehabilitation dashboard contract gap. The legacy
 * `frontend/src/pages/ar-vr-rehab/ARVRRehabPage.jsx` (the page shown in
 * the user's 404 screenshot) reads `totalSessions / byType / completionRate
 * / safetyIncidents / avgPerformanceScore / pausedSessions / abortedSessions`
 * off the dashboard payload; prior to W213 the service returned
 * `{last30Days, byTechnology, cybersicknessIncidence}` only — every KPI
 * card rendered as "—" and the page surfaced a 404-like empty state.
 *
 * Also pins:
 *   - validator accepts the UI's `sessionType` alias + `duration`/`goals`
 *     create shape (no `therapistId` required from the UI)
 *   - hologram / bci / mixed accepted as technologyType (previously the
 *     model enum rejected them → 400)
 *   - status pending↔scheduled and active↔in_progress aliases
 *   - getBeneficiaryProgress returns the summary-with-sessions[] shape
 *   - scenarios + devices catalog endpoints respond
 *   - analytics endpoint produces a daily trend bucket
 *   - safety-incident push doesn't drop the prior incidents array
 */

jest.unmock('mongoose');
jest.setTimeout(30000);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const express = require('express');
const request = require('supertest');

const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let app;
let ARVRSession;
let arvrService;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w213-arvr' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);

  // Stub the populated refs so listSessions's populate() doesn't throw
  // MissingSchemaError. We only need the model registration, not behavior.
  if (!mongoose.models.Beneficiary) {
    mongoose.model(
      'Beneficiary',
      new mongoose.Schema({ firstName: String, lastName: String, fileNumber: String })
    );
  }
  if (!mongoose.models.User) {
    mongoose.model('User', new mongoose.Schema({ name: String, email: String }));
  }

  ARVRSession = require('../domains/ar-vr/models/ARVRSession');
  ({ arvrService } = require('../domains/ar-vr/services/ARVRService'));
  const routes = require('../domains/ar-vr/routes/ar-vr.routes');

  app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = { _id: new mongoose.Types.ObjectId(), branchId: undefined };
    next();
  });
  app.use('/api/v1/ar-vr', routes);
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  if (mongoose.connection.readyState === 1) {
    await ARVRSession.deleteMany({});
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────────────────────

const oid = () => new mongoose.Types.ObjectId();

async function seedSession(overrides = {}) {
  return ARVRSession.create({
    beneficiaryId: oid(),
    therapistId: oid(),
    technologyType: 'vr',
    scenario: { name: 'مشهد عام', difficultyLevel: 4 },
    status: 'scheduled',
    plannedDurationMinutes: 15,
    ...overrides,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  1) Validator accepts UI's `sessionType` + omitted `therapistId`
// ─────────────────────────────────────────────────────────────────────────────

describe('W213.1 — validator accepts UI create-form shape', () => {
  test('UI shape (sessionType, duration, goals, difficulty, no therapistId) → 201', async () => {
    const beneficiaryId = oid().toString();
    const res = await request(app)
      .post('/api/v1/ar-vr')
      .send({
        beneficiaryId,
        sessionType: 'vr',
        duration: 20,
        environment: 'بستان افتراضي',
        goals: ['reach', 'grasp'],
        difficulty: 'medium',
      });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.technologyType).toBe('vr');
    expect(res.body.data.plannedDurationMinutes).toBe(20);
    expect(res.body.data.scenario.objectives).toEqual(['reach', 'grasp']);
    expect(res.body.data.scenario.difficultyLevel).toBe(5); // medium → 5
  });

  test('hologram + bci accepted (previously model enum rejected)', async () => {
    for (const tech of ['hologram', 'bci', 'mixed']) {
      const res = await request(app)
        .post('/api/v1/ar-vr')
        .send({ beneficiaryId: oid().toString(), sessionType: tech, duration: 10 });
      expect(res.status).toBe(201);
      expect(res.body.data.technologyType).toBe(tech);
    }
  });

  test('missing beneficiaryId → 400 with Arabic error', async () => {
    const res = await request(app).post('/api/v1/ar-vr').send({ sessionType: 'vr' });
    expect(res.status).toBe(400);
    expect(res.body.errors[0]).toMatch(/معرّف المستفيد/);
  });

  test('invalid technologyType → 400', async () => {
    const res = await request(app)
      .post('/api/v1/ar-vr')
      .send({ beneficiaryId: oid().toString(), sessionType: 'telepathy' });
    expect(res.status).toBe(400);
    expect(res.body.errors[0]).toMatch(/نوع التقنية/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  2) Scenario catalog hydration when scenarioId is sent
// ─────────────────────────────────────────────────────────────────────────────

describe('W213.2 — scenarioId hydrates from catalog', () => {
  test('scenarioId mr-upper-limb-fruit-pick → scenario sub-doc filled', async () => {
    const res = await request(app).post('/api/v1/ar-vr').send({
      beneficiaryId: oid().toString(),
      sessionType: 'vr',
      scenarioId: 'mr-upper-limb-fruit-pick',
    });
    expect(res.status).toBe(201);
    expect(res.body.data.scenario.scenarioId).toBe('mr-upper-limb-fruit-pick');
    expect(res.body.data.scenario.name).toMatch(/قطف الفواكه/);
    expect(res.body.data.scenario.objectives).toContain('reach');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  3) Status aliasing — UI's `active` → in_progress; `pending` → scheduled
// ─────────────────────────────────────────────────────────────────────────────

describe('W213.3 — status alias in/out', () => {
  test('list filter ?status=active matches in_progress rows', async () => {
    await seedSession({ status: 'in_progress' });
    await seedSession({ status: 'completed' });
    const res = await request(app).get('/api/v1/ar-vr?status=active');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].status).toBe('in_progress');
    expect(res.body.data[0].uiStatus).toBe('active');
  });

  test('list filter ?status=pending matches scheduled rows', async () => {
    await seedSession({ status: 'scheduled' });
    const res = await request(app).get('/api/v1/ar-vr?status=pending');
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].uiStatus).toBe('pending');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  4) Dashboard contract — the actual W213 fix
// ─────────────────────────────────────────────────────────────────────────────

describe('W213.4 — dashboard contract matches UI', () => {
  test('empty system → all zeros with correct keys', async () => {
    const res = await request(app).get('/api/v1/ar-vr/dashboard');
    expect(res.status).toBe(200);
    const d = res.body.data;
    // The exact keys the UI's KpiCard + الأداء rows read.
    expect(d).toEqual(
      expect.objectContaining({
        totalSessions: 0,
        activeSessions: 0,
        pausedSessions: 0,
        completedSessions: 0,
        abortedSessions: 0,
        totalBeneficiaries: 0,
        byType: expect.objectContaining({
          vr: 0,
          ar: 0,
          xr: 0,
          mr: 0,
          mixed: 0,
          hologram: 0,
          bci: 0,
        }),
        avgDuration: null,
        avgPerformanceScore: null,
        completionRate: 0,
        safetyIncidents: 0,
      })
    );
  });

  test('seeded data → computed KPIs', async () => {
    const benA = oid();
    const benB = oid();
    await seedSession({ beneficiaryId: benA, status: 'in_progress', technologyType: 'vr' });
    await seedSession({ beneficiaryId: benA, status: 'paused', technologyType: 'ar' });
    await seedSession({
      beneficiaryId: benB,
      status: 'completed',
      technologyType: 'vr',
      activeDurationSeconds: 600,
      performance: { overallScore: 80 },
    });
    await seedSession({
      beneficiaryId: benB,
      status: 'completed',
      technologyType: 'hologram',
      activeDurationSeconds: 1200,
      performance: { overallScore: 90 },
    });
    await seedSession({ beneficiaryId: benA, status: 'aborted' });

    const res = await request(app).get('/api/v1/ar-vr/dashboard');
    const d = res.body.data;
    expect(d.totalSessions).toBe(5);
    expect(d.activeSessions).toBe(1);
    expect(d.pausedSessions).toBe(1);
    expect(d.completedSessions).toBe(2);
    expect(d.abortedSessions).toBe(1);
    expect(d.totalBeneficiaries).toBe(2);
    expect(d.byType.vr).toBe(3); // seed default uses vr; plus the completed vr
    expect(d.byType.ar).toBe(1);
    expect(d.byType.hologram).toBe(1);
    expect(d.completionRate).toBe(40); // 2/5
    expect(d.avgPerformanceScore).toBe(85);
    expect(d.avgDuration).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  5) Lifecycle endpoints
// ─────────────────────────────────────────────────────────────────────────────

describe('W213.5 — lifecycle endpoints', () => {
  test('start → pause → resume → complete', async () => {
    const session = await seedSession();
    const id = session._id.toString();

    let res = await request(app).put(`/api/v1/ar-vr/${id}/start`).send();
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('in_progress');

    res = await request(app).put(`/api/v1/ar-vr/${id}/pause`).send();
    expect(res.body.data.status).toBe('paused');
    expect(res.body.data.pauseCount).toBe(1);

    res = await request(app).put(`/api/v1/ar-vr/${id}/resume`).send();
    expect(res.body.data.status).toBe('in_progress');

    res = await request(app)
      .put(`/api/v1/ar-vr/${id}/complete`)
      .send({ performanceScore: 88, notes: 'جيد جداً' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('completed');
    expect(res.body.data.performance.overallScore).toBe(88);
  });

  test('complete without payload → 400', async () => {
    const session = await seedSession();
    const res = await request(app).put(`/api/v1/ar-vr/${session._id}/complete`).send({});
    expect(res.status).toBe(400);
  });

  test('abort with reason', async () => {
    const session = await seedSession({ status: 'in_progress' });
    const res = await request(app)
      .put(`/api/v1/ar-vr/${session._id}/abort`)
      .send({ reason: 'discomfort' });
    expect(res.body.data.status).toBe('aborted');
    expect(res.body.data.abortReason).toBe('discomfort');
  });

  test('safety incident: low → minor + appended (not replaced)', async () => {
    const session = await seedSession({ status: 'in_progress' });
    const id = session._id.toString();

    let res = await request(app)
      .put(`/api/v1/ar-vr/${id}/safety`)
      .send({ type: 'discomfort', severity: 'low', description: 'إزعاج بسيط' });
    expect(res.status).toBe(200);
    expect(res.body.data.safety.cybersicknessLevel).toBe('mild');
    expect(res.body.data.safety.safetyIncidents).toHaveLength(1);
    expect(res.body.data.safety.safetyIncidents[0].severity).toBe('minor');

    res = await request(app)
      .put(`/api/v1/ar-vr/${id}/safety`)
      .send({ type: 'nausea', severity: 'high', description: 'غثيان قوي' });
    expect(res.body.data.safety.cybersicknessLevel).toBe('severe');
    // Push, not overwrite — both incidents persist
    expect(res.body.data.safety.safetyIncidents).toHaveLength(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  6) Progress summary contract
// ─────────────────────────────────────────────────────────────────────────────

describe('W213.6 — getBeneficiaryProgress returns summary shape', () => {
  test('returns { totalSessions, completedSessions, totalDuration, avgScore, sessions[] }', async () => {
    const ben = oid();
    await seedSession({
      beneficiaryId: ben,
      status: 'completed',
      activeDurationSeconds: 600,
      performance: { overallScore: 70 },
    });
    await seedSession({
      beneficiaryId: ben,
      status: 'completed',
      activeDurationSeconds: 1200,
      performance: { overallScore: 90 },
    });
    await seedSession({ beneficiaryId: ben, status: 'scheduled' });

    const res = await request(app).get(`/api/v1/ar-vr/progress/${ben}`);
    expect(res.status).toBe(200);
    const d = res.body.data;
    expect(d.totalSessions).toBe(3);
    expect(d.completedSessions).toBe(2);
    expect(d.totalDuration).toBeGreaterThan(0);
    expect(d.avgScore).toBe(80);
    expect(Array.isArray(d.sessions)).toBe(true);
    expect(d.sessions).toHaveLength(3);
    expect(d.sessions[0]).toEqual(
      expect.objectContaining({
        _id: expect.anything(),
        sessionType: expect.any(String),
        status: expect.any(String),
      })
    );
  });

  test('invalid beneficiaryId → 400 (not 500)', async () => {
    const res = await request(app).get('/api/v1/ar-vr/progress/not-an-id');
    expect(res.status).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  7) Catalog endpoints (scenarios + devices)
// ─────────────────────────────────────────────────────────────────────────────

describe('W213.7 — catalog endpoints', () => {
  test('GET /scenarios → list with ≥10 entries', async () => {
    const res = await request(app).get('/api/v1/ar-vr/scenarios');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(10);
    expect(res.body.data[0]).toHaveProperty('id');
    expect(res.body.data[0]).toHaveProperty('name');
    expect(res.body.data[0]).toHaveProperty('technologyType');
    expect(res.body.data[0]).toHaveProperty('specialty');
  });

  test('GET /scenarios?specialty=motor_rehab filters', async () => {
    const res = await request(app).get('/api/v1/ar-vr/scenarios?specialty=motor_rehab');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data.every(s => s.specialty === 'motor_rehab')).toBe(true);
  });

  test('GET /scenarios/:id existing → 200', async () => {
    const res = await request(app).get('/api/v1/ar-vr/scenarios/bal-tightrope-canyon');
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe('bal-tightrope-canyon');
    expect(res.body.data.contraindications).toContain('vestibular_disorder');
  });

  test('GET /scenarios/:id missing → 404', async () => {
    const res = await request(app).get('/api/v1/ar-vr/scenarios/does-not-exist');
    expect(res.status).toBe(404);
  });

  test('GET /devices → ≥6 entries, including Meta Quest 3', async () => {
    const res = await request(app).get('/api/v1/ar-vr/devices');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(6);
    expect(res.body.data.some(d => d.model === 'meta_quest_3')).toBe(true);
  });

  test('GET /devices?handTracking=true filters', async () => {
    const res = await request(app).get('/api/v1/ar-vr/devices?handTracking=true');
    expect(res.status).toBe(200);
    expect(res.body.data.every(d => d.handTracking === true)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  8) Analytics endpoint
// ─────────────────────────────────────────────────────────────────────────────

describe('W213.8 — analytics endpoint', () => {
  test('GET /analytics → { windowDays, perDay[], topScenarios[], cybersicknessIncidence }', async () => {
    await seedSession({
      status: 'completed',
      performance: { overallScore: 75 },
      scenario: { name: 'مشهد X', scenarioId: 'x', difficultyLevel: 3 },
    });
    await seedSession({
      status: 'completed',
      performance: { overallScore: 85 },
      scenario: { name: 'مشهد X', scenarioId: 'x', difficultyLevel: 3 },
    });
    const res = await request(app).get('/api/v1/ar-vr/analytics?days=7');
    expect(res.status).toBe(200);
    const d = res.body.data;
    expect(d.windowDays).toBe(7);
    expect(Array.isArray(d.perDay)).toBe(true);
    expect(Array.isArray(d.topScenarios)).toBe(true);
    expect(d.topScenarios[0]).toMatchObject({ scenarioId: 'x', sessions: 2, avgScore: 80 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  9) Route precedence — /scenarios and /dashboard must NOT match /:id
// ─────────────────────────────────────────────────────────────────────────────

describe('W213.9 — static paths declared before /:id', () => {
  test('/dashboard does not collide with /:id (would 500 on ObjectId cast)', async () => {
    const res = await request(app).get('/api/v1/ar-vr/dashboard');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('totalSessions');
  });
  test('/scenarios does not collide with /:id', async () => {
    const res = await request(app).get('/api/v1/ar-vr/scenarios');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
  test('/devices does not collide with /:id', async () => {
    const res = await request(app).get('/api/v1/ar-vr/devices');
    expect(res.status).toBe(200);
  });
});
