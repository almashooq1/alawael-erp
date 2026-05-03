/**
 * student-portal-routes.test.js — route-level coverage for the
 * /api/v1/student/* surface (commit landing in 4.0.114).
 *
 * Variables / helpers the jest.mock factories reference are prefixed
 * with `mock` so Jest's hoister allows the cross-scope access.
 */

'use strict';

const express = require('express');
const request = require('supertest');

// Mongoose-style chainable thenable; defined in module scope (mock-prefixed
// so jest.mock factories can capture it after hoisting).
function mockThenable(value) {
  const q = {
    select: jest.fn(() => q),
    sort: jest.fn(() => q),
    limit: jest.fn(() => q),
    lean: jest.fn(() => Promise.resolve(value)),
    then: (resolve, reject) => Promise.resolve(value).then(resolve, reject),
    catch: cb => Promise.resolve(value).catch(cb),
  };
  return q;
}

// In-memory state — each test resets these.
const mockState = {
  beneficiary: { findByIdValue: null, findByIdOverride: null, updateOneCall: null },
  appointment: { findRows: [], findOneRow: null, count: 0 },
  redFlag: { createCalls: [] },
  studentActivity: {
    findRows: [],
    findByIdValue: null,
    findByIdOverride: null,
  },
};

jest.mock('../middleware/auth', () => ({
  authenticate: (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    next();
  },
}));

jest.mock('../models/Beneficiary', () => ({
  findById: jest.fn(() => {
    if (mockState.beneficiary.findByIdOverride) {
      return mockState.beneficiary.findByIdOverride();
    }
    return mockThenable(mockState.beneficiary.findByIdValue);
  }),
  updateOne: jest.fn((...args) => {
    mockState.beneficiary.updateOneCall = args;
    return Promise.resolve({ acknowledged: true, modifiedCount: 1 });
  }),
}));

jest.mock('../models/Appointment', () => ({
  find: jest.fn(() => mockThenable(mockState.appointment.findRows)),
  findOne: jest.fn(() => mockThenable(mockState.appointment.findOneRow)),
  countDocuments: jest.fn(() => Promise.resolve(mockState.appointment.count)),
}));

jest.mock('../models/RedFlagState', () => ({
  create: jest.fn(payload => {
    mockState.redFlag.createCalls.push(payload);
    return Promise.resolve(payload);
  }),
}));

jest.mock('../models/StudentActivity', () => ({
  find: jest.fn(() => mockThenable(mockState.studentActivity.findRows)),
  findById: jest.fn(() => {
    if (mockState.studentActivity.findByIdOverride) {
      return mockState.studentActivity.findByIdOverride();
    }
    return mockThenable(mockState.studentActivity.findByIdValue);
  }),
}));

const router = require('../routes/student-portal.routes');

function buildApp(user) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    if (user) req.user = user;
    next();
  });
  app.use('/api/v1/student', router);
  return app;
}

beforeEach(() => {
  mockState.beneficiary.findByIdValue = null;
  mockState.beneficiary.findByIdOverride = null;
  mockState.beneficiary.updateOneCall = null;
  mockState.appointment.findRows = [];
  mockState.appointment.findOneRow = null;
  mockState.appointment.count = 0;
  mockState.redFlag.createCalls.length = 0;
  mockState.studentActivity.findRows = [];
  mockState.studentActivity.findByIdValue = null;
  mockState.studentActivity.findByIdOverride = null;
  jest.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────
// /me
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/v1/student/me', () => {
  it('returns 403 when an authenticated user has no beneficiary scope', async () => {
    const app = buildApp({ id: 'u-1', role: 'therapist' });
    const res = await request(app).get('/api/v1/student/me');
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Forbidden');
  });

  it('returns 404 when the beneficiary record cannot be found', async () => {
    const app = buildApp({ beneficiaryId: 'b-missing' });
    mockState.beneficiary.findByIdValue = null;
    const res = await request(app).get('/api/v1/student/me');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('BeneficiaryNotFound');
  });

  it('shapes the profile and infers variant from age', async () => {
    const app = buildApp({ beneficiaryId: 'b-1' });
    const dob = new Date();
    dob.setFullYear(dob.getFullYear() - 11); // 11yo → YOUTH
    mockState.beneficiary.findByIdValue = {
      _id: 'b-1',
      firstName_ar: 'سارة',
      lastName_ar: 'الأحمد',
      dateOfBirth: dob,
      gender: 'female',
      student_level: 3,
      student_xp: 75,
      student_streak_days: 4,
    };

    const res = await request(app).get('/api/v1/student/me');
    expect(res.status).toBe(200);
    expect(res.body.nameAr).toBe('سارة الأحمد');
    expect(res.body.variant).toBe('YOUTH');
    expect(res.body.level).toBe(3);
    expect(res.body.xp).toBe(75);
    expect(res.body.streakDays).toBe(4);
    expect(res.body.avatarEmoji).toBeDefined();
  });

  it('classifies a 6-year-old as CHILD variant', async () => {
    const app = buildApp({ beneficiaryId: 'b-2' });
    const dob = new Date();
    dob.setFullYear(dob.getFullYear() - 6);
    mockState.beneficiary.findByIdValue = {
      _id: 'b-2',
      firstName_ar: 'علي',
      dateOfBirth: dob,
      gender: 'male',
    };
    const res = await request(app).get('/api/v1/student/me');
    expect(res.body.variant).toBe('CHILD');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// /today
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/v1/student/today', () => {
  function todayAt(hh, mm) {
    const d = new Date();
    d.setHours(hh, mm, 0, 0);
    return d;
  }

  it('returns todayActivities derived from todays appointments', async () => {
    const app = buildApp({ beneficiaryId: 'b-1' });
    const dob = new Date();
    dob.setFullYear(dob.getFullYear() - 10);
    mockState.beneficiary.findByIdValue = {
      _id: 'b-1',
      firstName_ar: 'سارة',
      dateOfBirth: dob,
      moodLog: [],
    };
    mockState.appointment.findRows = [
      {
        _id: 'a-1',
        date: todayAt(9, 0),
        startTime: '09:00',
        type: 'علاج طبيعي',
        therapistName: 'د. ليلى',
        status: 'CONFIRMED',
      },
      {
        _id: 'a-2',
        date: todayAt(11, 0),
        startTime: '11:00',
        type: 'نطق وتخاطب',
        therapistName: 'د. أحمد',
        status: 'COMPLETED',
      },
    ];

    const res = await request(app).get('/api/v1/student/today');
    expect(res.status).toBe(200);
    expect(res.body.todayActivities).toHaveLength(2);
    expect(res.body.todayActivities[0]).toMatchObject({
      // Appointment-sourced entries get an `appt:` id prefix to keep them
      // distinguishable from real StudentActivity rows in the merged list.
      id: 'appt:a-1',
      source: 'APPOINTMENT',
      kind: 'MOTOR',
      icon: '🤸',
      time: '09:00',
      completed: false,
      xpReward: 30,
    });
    expect(res.body.todayActivities[1].completed).toBe(true);
  });

  it('flags moodCheckedInToday=true when an entry sits inside today', async () => {
    const app = buildApp({ beneficiaryId: 'b-1' });
    const dob = new Date();
    dob.setFullYear(dob.getFullYear() - 10);
    let call = 0;
    mockState.beneficiary.findByIdOverride = () => {
      call += 1;
      if (call === 1) {
        return mockThenable({ _id: 'b-1', firstName_ar: 'س', dateOfBirth: dob });
      }
      return mockThenable({ moodLog: [{ date: todayAt(8, 30), mood: 4 }] });
    };

    const res = await request(app).get('/api/v1/student/today');
    expect(res.status).toBe(200);
    expect(res.body.moodCheckedInToday).toBe(true);
  });

  it('returns nextSession when an upcoming appointment exists', async () => {
    const app = buildApp({ beneficiaryId: 'b-1' });
    const dob = new Date();
    dob.setFullYear(dob.getFullYear() - 10);
    mockState.beneficiary.findByIdValue = { _id: 'b-1', firstName_ar: 'س', dateOfBirth: dob };
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    mockState.appointment.findOneRow = {
      _id: 'a-99',
      date: tomorrow,
      startTime: '10:30',
      type: 'علاج وظيفي',
      therapistName: 'د. منى',
    };

    const res = await request(app).get('/api/v1/student/today');
    expect(res.body.nextSession).toBeTruthy();
    expect(res.body.nextSession.therapistNameAr).toBe('د. منى');
    expect(res.body.nextSession.programNameAr).toBe('علاج وظيفي');
    expect(typeof res.body.nextSession.startsAt).toBe('string');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// /schedule
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/v1/student/schedule', () => {
  it('returns 7 day buckets including empty ones', async () => {
    const app = buildApp({ beneficiaryId: 'b-1' });
    const today = new Date();
    today.setHours(10, 0, 0, 0);
    mockState.appointment.findRows = [
      {
        _id: 'a-1',
        date: today,
        startTime: '10:00',
        type: 'علاج سلوكي',
        therapistName: 'د. ر',
        status: 'CONFIRMED',
      },
    ];
    const res = await request(app).get('/api/v1/student/schedule');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(7);
    const todayIso = today.toISOString().slice(0, 10);
    const todaysBucket = res.body.find(b => b.date === todayIso);
    expect(todaysBucket.items).toHaveLength(1);
    // /schedule emits kind:'SESSION' (week-grid hint, not the appointment-type
    // mapping used by /today.todayActivities). Icon still comes from the map.
    expect(todaysBucket.items[0].kind).toBe('SESSION');
    expect(todaysBucket.items[0].icon).toBe('🧠');
    const empty = res.body.filter(b => b.items.length === 0);
    expect(empty.length).toBe(6);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// /achievements
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/v1/student/achievements', () => {
  it('counts COMPLETED appointments as sessionsAttended', async () => {
    const app = buildApp({ beneficiaryId: 'b-1' });
    mockState.beneficiary.findByIdValue = {
      _id: 'b-1',
      student_level: 2,
      student_xp: 30,
      student_streak_days: 5,
      student_longest_streak: 9,
    };
    mockState.appointment.count = 7;
    const res = await request(app).get('/api/v1/student/achievements');
    expect(res.status).toBe(200);
    expect(res.body.level).toBe(2);
    expect(res.body.streakDays).toBe(5);
    expect(res.body.longestStreak).toBe(9);
    expect(res.body.stats.sessionsAttended).toBe(7);
    expect(res.body.badges).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// /mood (POST)
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/v1/student/mood', () => {
  it('rejects non-integer mood', async () => {
    const app = buildApp({ beneficiaryId: 'b-1' });
    const res = await request(app).post('/api/v1/student/mood').send({ mood: 'good' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('InvalidBody');
  });

  it('rejects mood out of 1-5 range', async () => {
    const app = buildApp({ beneficiaryId: 'b-1' });
    const res = await request(app).post('/api/v1/student/mood').send({ mood: 9 });
    expect(res.status).toBe(400);
  });

  it('persists the entry via $push and trims via $slice', async () => {
    const app = buildApp({ beneficiaryId: 'b-1' });
    mockState.beneficiary.findByIdOverride = () => mockThenable({ moodLog: [] });
    const res = await request(app)
      .post('/api/v1/student/mood')
      .send({ mood: 4, note: ' أشعر بتحسن ' });
    expect(res.status).toBe(200);
    expect(res.body.mood).toBe(4);
    expect(res.body.note).toBe('أشعر بتحسن');
    const [, update] = mockState.beneficiary.updateOneCall;
    expect(update.$push.moodLog.$slice).toBe(-365);
    expect(update.$push.moodLog.$each[0].mood).toBe(4);
  });

  it('auto-raises a red-flag when 3+ trailing entries are mood<=2', async () => {
    const app = buildApp({ beneficiaryId: 'b-1' });
    mockState.beneficiary.findByIdOverride = () =>
      mockThenable({
        moodLog: [
          { mood: 1, date: new Date() },
          { mood: 2, date: new Date() },
          { mood: 1, date: new Date() },
        ],
      });
    const res = await request(app).post('/api/v1/student/mood').send({ mood: 1 });
    expect(res.status).toBe(200);
    expect(mockState.redFlag.createCalls).toHaveLength(1);
    expect(mockState.redFlag.createCalls[0]).toMatchObject({
      beneficiaryId: 'b-1',
      flagId: 'auto:mood_decline',
      status: 'active',
      domain: 'CLINICAL',
    });
  });

  it('does NOT raise a flag for an isolated low mood', async () => {
    const app = buildApp({ beneficiaryId: 'b-1' });
    mockState.beneficiary.findByIdOverride = () =>
      mockThenable({
        moodLog: [
          { mood: 4, date: new Date() },
          { mood: 5, date: new Date() },
          { mood: 1, date: new Date() },
        ],
      });
    const res = await request(app).post('/api/v1/student/mood').send({ mood: 1 });
    expect(res.status).toBe(200);
    expect(mockState.redFlag.createCalls).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// /mood/history (GET)
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/v1/student/mood/history', () => {
  it('returns 403 when beneficiary scope cannot be resolved', async () => {
    const app = buildApp({ id: 'u-1', role: 'therapist' });
    const res = await request(app).get('/api/v1/student/mood/history');
    expect(res.status).toBe(403);
  });

  it('returns 404 when beneficiary not found', async () => {
    const app = buildApp({ beneficiaryId: 'missing' });
    mockState.beneficiary.findByIdValue = null;
    const res = await request(app).get('/api/v1/student/mood/history');
    expect(res.status).toBe(404);
  });

  it('returns shaped entries + summary including average + counts', async () => {
    const app = buildApp({ beneficiaryId: 'b-1' });
    mockState.beneficiary.findByIdValue = {
      moodLog: [
        { _id: 'm1', mood: 4, date: new Date('2026-04-01'), note: 'يوم جيد' },
        { _id: 'm2', mood: 3, date: new Date('2026-04-02') },
        { _id: 'm3', mood: 5, date: new Date('2026-04-03') },
      ],
    };
    const res = await request(app).get('/api/v1/student/mood/history?limit=20');
    expect(res.status).toBe(200);
    expect(res.body.entries).toHaveLength(3);
    expect(res.body.entries[0].mood).toBe(4);
    expect(res.body.summary.count).toBe(3);
    expect(res.body.summary.average).toBe(4); // (4+3+5)/3 = 4
    expect(res.body.summary.counts).toMatchObject({ 3: 1, 4: 1, 5: 1 });
    expect(res.body.summary.worrisome).toBe(false);
  });

  it('flags a worrisome trailing pattern in the summary', async () => {
    const app = buildApp({ beneficiaryId: 'b-1' });
    mockState.beneficiary.findByIdValue = {
      moodLog: [
        { _id: 'm1', mood: 5, date: new Date('2026-04-01') },
        { _id: 'm2', mood: 4, date: new Date('2026-04-02') },
        { _id: 'm3', mood: 1, date: new Date('2026-04-03') },
        { _id: 'm4', mood: 2, date: new Date('2026-04-04') },
        { _id: 'm5', mood: 1, date: new Date('2026-04-05') },
      ],
    };
    const res = await request(app).get('/api/v1/student/mood/history');
    expect(res.body.summary.worrisome).toBe(true);
  });

  it('clamps limit to 90 even when the caller asks for more', async () => {
    const app = buildApp({ beneficiaryId: 'b-1' });
    const sliceSpy = jest.fn();
    mockState.beneficiary.findByIdOverride = () => {
      const q = mockThenable({ moodLog: [] });
      q.select = jest.fn(arg => {
        sliceSpy(arg);
        return q;
      });
      return q;
    };
    await request(app).get('/api/v1/student/mood/history?limit=999');
    expect(sliceSpy).toHaveBeenCalledWith({ moodLog: { $slice: -90 } });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// resolveBeneficiaryScope (admin override path)
// ─────────────────────────────────────────────────────────────────────────────
describe('beneficiary-scope guard', () => {
  it('lets admin role read another beneficiary via ?beneficiaryId=', async () => {
    const app = buildApp({ id: 'admin-1', role: 'admin' });
    mockState.beneficiary.findByIdValue = {
      _id: 'b-x',
      firstName_ar: 'مالك',
      dateOfBirth: (() => {
        const d = new Date();
        d.setFullYear(d.getFullYear() - 12);
        return d;
      })(),
    };
    const res = await request(app).get('/api/v1/student/me?beneficiaryId=b-x');
    expect(res.status).toBe(200);
    expect(res.body.nameAr).toBe('مالك');
  });

  it('rejects an admin without explicit ?beneficiaryId=', async () => {
    const app = buildApp({ id: 'admin-1', role: 'admin' });
    const res = await request(app).get('/api/v1/student/me');
    expect(res.status).toBe(403);
  });

  it('rejects parent role even with ?beneficiaryId= (must use parent portal)', async () => {
    const app = buildApp({ id: 'p-1', role: 'parent' });
    const res = await request(app).get('/api/v1/student/me?beneficiaryId=b-x');
    expect(res.status).toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// /activities (real StudentActivity collection)
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/v1/student/activities', () => {
  it('returns pending activities due today, sorted by dueAt', async () => {
    const app = buildApp({ beneficiaryId: 'b-1' });
    const todayAt = (h, m) => {
      const d = new Date();
      d.setHours(h, m, 0, 0);
      return d;
    };
    mockState.studentActivity.findRows = [
      {
        _id: 'sa-1',
        beneficiaryId: 'b-1',
        kind: 'JOURNAL',
        icon: '📓',
        titleAr: 'كتابة يومية',
        xpReward: 25,
        dueAt: todayAt(8, 0),
        status: 'pending',
      },
      {
        _id: 'sa-2',
        beneficiaryId: 'b-1',
        kind: 'PRACTICE',
        icon: '🎯',
        titleAr: 'تمرين تركيز',
        xpReward: 40,
        dueAt: todayAt(15, 0),
        status: 'pending',
      },
    ];
    const res = await request(app).get('/api/v1/student/activities');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0]).toMatchObject({
      id: 'sa-1',
      kind: 'JOURNAL',
      icon: '📓',
      titleAr: 'كتابة يومية',
      xpReward: 25,
      completed: false,
    });
  });
});

describe('GET /api/v1/student/activities/:id', () => {
  it('returns 404 when the activity belongs to a different beneficiary', async () => {
    const app = buildApp({ beneficiaryId: 'b-1' });
    mockState.studentActivity.findByIdValue = {
      _id: 'sa-9',
      beneficiaryId: 'b-OTHER',
      titleAr: 'foreign',
      kind: 'PRACTICE',
      xpReward: 30,
      status: 'pending',
    };
    const res = await request(app).get('/api/v1/student/activities/sa-9');
    expect(res.status).toBe(404);
  });

  it('returns the activity for the owning beneficiary', async () => {
    const app = buildApp({ beneficiaryId: 'b-1' });
    mockState.studentActivity.findByIdValue = {
      _id: 'sa-1',
      beneficiaryId: 'b-1',
      titleAr: 'تمرين',
      kind: 'COGNITIVE',
      icon: '🧠',
      xpReward: 50,
      status: 'pending',
      dueAt: new Date('2026-05-02T10:00:00Z'),
    };
    const res = await request(app).get('/api/v1/student/activities/sa-1');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: 'sa-1',
      titleAr: 'تمرين',
      kind: 'COGNITIVE',
      xpReward: 50,
      status: 'pending',
    });
  });
});

describe('POST /api/v1/student/activities/:id/complete', () => {
  it('rejects when activity belongs to another beneficiary', async () => {
    const app = buildApp({ beneficiaryId: 'b-1' });
    mockState.studentActivity.findByIdOverride = () =>
      Promise.resolve({
        _id: 'sa-x',
        beneficiaryId: 'b-OTHER',
        status: 'pending',
        xpReward: 30,
      });
    const res = await request(app).post('/api/v1/student/activities/sa-x/complete');
    expect(res.status).toBe(404);
  });

  it('rejects when activity is already completed', async () => {
    const app = buildApp({ beneficiaryId: 'b-1' });
    mockState.studentActivity.findByIdOverride = () =>
      Promise.resolve({
        _id: 'sa-1',
        beneficiaryId: 'b-1',
        status: 'completed',
        xpReward: 30,
      });
    const res = await request(app).post('/api/v1/student/activities/sa-1/complete');
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('AlreadyCompleted');
  });

  it('awards the activity-specific xpReward, not the 30-default', async () => {
    const app = buildApp({ beneficiaryId: 'b-1' });
    const activitySaved = jest.fn(() => Promise.resolve());
    mockState.studentActivity.findByIdOverride = () =>
      Promise.resolve({
        _id: 'sa-1',
        beneficiaryId: 'b-1',
        status: 'pending',
        xpReward: 75,
        save: activitySaved,
      });
    const beneficiarySave = jest.fn(() => Promise.resolve());
    mockState.beneficiary.findByIdOverride = () => {
      const b = {
        student_xp: 10,
        student_level: 1,
        student_streak_days: 0,
        save: beneficiarySave,
      };
      return mockThenable(b);
    };
    const res = await request(app).post('/api/v1/student/activities/sa-1/complete');
    expect(res.status).toBe(200);
    expect(res.body.xpGained).toBe(75);
    expect(activitySaved).toHaveBeenCalled();
    expect(beneficiarySave).toHaveBeenCalled();
  });

  it('falls back to 30 XP when the activity record is absent (demo path)', async () => {
    const app = buildApp({ beneficiaryId: 'b-1' });
    mockState.studentActivity.findByIdOverride = () => Promise.resolve(null);
    const beneficiarySave = jest.fn(() => Promise.resolve());
    mockState.beneficiary.findByIdOverride = () =>
      mockThenable({
        student_xp: 0,
        student_level: 1,
        student_streak_days: 0,
        save: beneficiarySave,
      });
    const res = await request(app).post('/api/v1/student/activities/sa-demo/complete');
    expect(res.status).toBe(200);
    expect(res.body.xpGained).toBe(30);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// /today.todayActivities — merged appointments + StudentActivity rows
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/v1/student/today (merged activities)', () => {
  it('includes both appointment and StudentActivity entries', async () => {
    const app = buildApp({ beneficiaryId: 'b-1' });
    const dob = new Date();
    dob.setFullYear(dob.getFullYear() - 10);
    const todayAt = (h, m) => {
      const d = new Date();
      d.setHours(h, m, 0, 0);
      return d;
    };
    mockState.beneficiary.findByIdValue = {
      _id: 'b-1',
      firstName_ar: 'لينة',
      dateOfBirth: dob,
    };
    mockState.appointment.findRows = [
      {
        _id: 'a-1',
        date: todayAt(9, 0),
        startTime: '09:00',
        type: 'علاج طبيعي',
        therapistName: 'د. ل',
        status: 'CONFIRMED',
      },
    ];
    mockState.studentActivity.findRows = [
      {
        _id: 'sa-1',
        beneficiaryId: 'b-1',
        kind: 'JOURNAL',
        icon: '📓',
        titleAr: 'يوميتي',
        xpReward: 20,
        dueAt: todayAt(20, 0),
        status: 'pending',
      },
    ];
    const res = await request(app).get('/api/v1/student/today');
    expect(res.status).toBe(200);
    expect(res.body.todayActivities).toHaveLength(2);
    const sources = res.body.todayActivities.map(a => a.source);
    expect(sources).toEqual(expect.arrayContaining(['APPOINTMENT', 'TASK']));
    const task = res.body.todayActivities.find(a => a.source === 'TASK');
    expect(task.titleAr).toBe('يوميتي');
    expect(task.xpReward).toBe(20);
  });
});
