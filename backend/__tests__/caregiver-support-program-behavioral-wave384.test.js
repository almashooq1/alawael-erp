'use strict';

/**
 * caregiver-support-program-behavioral-wave384.test.js — behavioral counterpart
 * to the static-analysis drift guard `caregiver-support-program-wave384.test.js`.
 *
 * The static guard checks SOURCE TEXT (regex matches against the model file)
 * but cannot catch behavioral bugs — e.g. a Wave-18 invariant whose regex looks
 * right but whose conditional path never fires at runtime (the W385 / W408
 * pattern: "static drift guards catch eventType string-presence but NOT
 * envelope-shape correctness"). This file fills that gap by instantiating the
 * model against an in-memory MongoDB and asserting actual save/save-rejection
 * behavior.
 *
 * Coverage:
 *   1. Wave-18 invariants ACTUALLY fire (caregiver identity, status terminals,
 *      sibling age range, training module count, sessions sessionDate+format,
 *      Zarit 0-88, module hoursCompleted ≤ targetHours)
 *   2. Virtual computations (sessionsCount / sessionsAttendedCount /
 *      modulesCompletedCount / modulesProgressPct / hoursCompletedTotal /
 *      burdenScoreDelta / isOverdue)
 *   3. Default values (status='enrolled', sessions=[], modulesProgress=[])
 *   4. Indexes are created (compound + per-field)
 *
 * Run: cd backend && npx jest --config=jest.config.js __tests__/caregiver-support-program-behavioral-wave384.test.js --runInBand
 */

jest.unmock('mongoose');
jest.setTimeout(30000);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let Program;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w384-behavioral-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  Program = require('../models/CaregiverSupportProgram');
  await Program.init();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await Program.deleteMany({});
});

// ─── Fixtures ─────────────────────────────────────────────────────────

const validBene = () => new mongoose.Types.ObjectId();
const validBranch = () => new mongoose.Types.ObjectId();

function baseDoc(overrides = {}) {
  return {
    beneficiaryId: validBene(),
    branchId: validBranch(),
    programType: 'caregiver_counseling',
    caregiverName: 'أم المستفيد',
    caregiverRelationship: 'أم',
    ...overrides,
  };
}

// ─── 1. Wave-18 invariants (the real test — does it actually fire?) ──

describe('W384 behavioral — caregiver identity invariant', () => {
  it('saves successfully with name + relationship (no guardianId)', async () => {
    const doc = await Program.create(baseDoc());
    expect(doc.status).toBe('enrolled');
    expect(doc.caregiverName).toBe('أم المستفيد');
  });

  it('saves with caregiverGuardianId + empty name/relationship', async () => {
    const doc = await Program.create({
      beneficiaryId: validBene(),
      programType: 'caregiver_counseling',
      caregiverGuardianId: new mongoose.Types.ObjectId(),
    });
    expect(doc.caregiverGuardianId).toBeDefined();
  });

  it('REJECTS save when neither guardianId nor (name+relationship) provided', async () => {
    const p = new Program({
      beneficiaryId: validBene(),
      programType: 'caregiver_counseling',
    });
    await expect(p.save()).rejects.toThrow(/caregiverName/);
  });

  it('REJECTS when only name is set (relationship missing)', async () => {
    const p = new Program({
      beneficiaryId: validBene(),
      programType: 'caregiver_counseling',
      caregiverName: 'أم المستفيد',
    });
    await expect(p.save()).rejects.toThrow(/caregiverName/);
  });
});

describe('W384 behavioral — status terminal invariants', () => {
  it('status=completed REJECTS without completedAt', async () => {
    const p = new Program(baseDoc({ status: 'completed' }));
    await expect(p.save()).rejects.toThrow(/completedAt/);
  });

  it('status=completed SAVES with completedAt', async () => {
    const doc = await Program.create(baseDoc({ status: 'completed', completedAt: new Date() }));
    expect(doc.status).toBe('completed');
  });

  it('status=discontinued REJECTS without reason', async () => {
    const p = new Program(baseDoc({ status: 'discontinued', discontinuedAt: new Date() }));
    await expect(p.save()).rejects.toThrow(/discontinuationReason/);
  });

  it('status=discontinued REJECTS without discontinuedAt', async () => {
    const p = new Program(
      baseDoc({ status: 'discontinued', discontinuationReason: 'caregiver opted out' })
    );
    await expect(p.save()).rejects.toThrow(/discontinuedAt/);
  });

  it('status=discontinued SAVES with both timestamp + reason', async () => {
    const doc = await Program.create(
      baseDoc({
        status: 'discontinued',
        discontinuedAt: new Date(),
        discontinuationReason: 'caregiver opted out',
      })
    );
    expect(doc.status).toBe('discontinued');
  });

  it('status=paused REJECTS without pausedAt', async () => {
    const p = new Program(baseDoc({ status: 'paused' }));
    await expect(p.save()).rejects.toThrow(/pausedAt/);
  });
});

describe('W384 behavioral — programType-specific invariants', () => {
  it('sibling_support_group REJECTS without ageRange', async () => {
    const p = new Program(baseDoc({ programType: 'sibling_support_group' }));
    await expect(p.save()).rejects.toThrow(/siblingAgeRange/);
  });

  it('sibling_support_group REJECTS when min > max', async () => {
    const p = new Program(
      baseDoc({
        programType: 'sibling_support_group',
        siblingAgeRange: { min: 12, max: 8 },
      })
    );
    await expect(p.save()).rejects.toThrow(/siblingAgeRange/);
  });

  it('sibling_support_group SAVES with valid age range', async () => {
    const doc = await Program.create(
      baseDoc({
        programType: 'sibling_support_group',
        siblingAgeRange: { min: 6, max: 12 },
      })
    );
    expect(doc.siblingAgeRange.min).toBe(6);
    expect(doc.siblingAgeRange.max).toBe(12);
  });

  it('caregiver_training REJECTS without totalModules ≥ 1', async () => {
    const p = new Program(baseDoc({ programType: 'caregiver_training' }));
    await expect(p.save()).rejects.toThrow(/totalModules/);
  });

  it('caregiver_training SAVES with totalModules ≥ 1', async () => {
    const doc = await Program.create(
      baseDoc({ programType: 'caregiver_training', totalModules: 5, totalTargetHours: 20 })
    );
    expect(doc.totalModules).toBe(5);
  });
});

describe('W384 behavioral — sessions[] invariants', () => {
  it('REJECTS session with no sessionDate', async () => {
    const p = new Program(baseDoc({ sessions: [{ format: 'individual' }] }));
    await expect(p.save()).rejects.toThrow(/sessionDate/);
  });

  it('REJECTS session with invalid format', async () => {
    const p = new Program(
      baseDoc({ sessions: [{ sessionDate: new Date(), format: 'invalid_format' }] })
    );
    await expect(p.save()).rejects.toThrow();
  });

  it('SAVES with valid session entry', async () => {
    const doc = await Program.create(
      baseDoc({
        sessions: [
          {
            sessionDate: new Date(),
            format: 'individual',
            topic: 'Initial assessment',
            attendanceStatus: 'attended',
          },
        ],
      })
    );
    expect(doc.sessions).toHaveLength(1);
  });
});

describe('W384 behavioral — outcomes Zarit boundary', () => {
  it('REJECTS preProgramBurdenScore > 88', async () => {
    const p = new Program(baseDoc({ outcomes: { preProgramBurdenScore: 92 } }));
    await expect(p.save()).rejects.toThrow();
  });

  it('REJECTS postProgramBurdenScore < 0 (negative)', async () => {
    const p = new Program(baseDoc({ outcomes: { postProgramBurdenScore: -5 } }));
    await expect(p.save()).rejects.toThrow();
  });

  it('REJECTS satisfactionScore > 10', async () => {
    const p = new Program(baseDoc({ outcomes: { satisfactionScore: 15 } }));
    await expect(p.save()).rejects.toThrow();
  });

  it('SAVES with all outcomes within bounds', async () => {
    const doc = await Program.create(
      baseDoc({
        outcomes: {
          preProgramBurdenScore: 48,
          postProgramBurdenScore: 31,
          satisfactionScore: 8,
        },
      })
    );
    expect(doc.outcomes.preProgramBurdenScore).toBe(48);
    expect(doc.outcomes.postProgramBurdenScore).toBe(31);
  });
});

describe('W384 behavioral — modulesProgress invariant', () => {
  it('REJECTS module with hoursCompleted > targetHours', async () => {
    const p = new Program(
      baseDoc({
        programType: 'caregiver_training',
        totalModules: 5,
        modulesProgress: [{ moduleNumber: 1, title: 'Intro', targetHours: 4, hoursCompleted: 10 }],
      })
    );
    await expect(p.save()).rejects.toThrow(/hoursCompleted/);
  });

  it('SAVES when hoursCompleted ≤ targetHours', async () => {
    const doc = await Program.create(
      baseDoc({
        programType: 'caregiver_training',
        totalModules: 5,
        modulesProgress: [{ moduleNumber: 1, title: 'Intro', targetHours: 4, hoursCompleted: 3 }],
      })
    );
    expect(doc.modulesProgress).toHaveLength(1);
  });
});

// ─── 2. Virtuals (computed at read-time) ─────────────────────────────

describe('W384 behavioral — virtuals', () => {
  it('sessionsCount returns 0 for empty sessions[]', async () => {
    const doc = await Program.create(baseDoc());
    expect(doc.sessionsCount).toBe(0);
  });

  it('sessionsCount returns N for N sessions', async () => {
    const doc = await Program.create(
      baseDoc({
        sessions: [
          { sessionDate: new Date(), format: 'individual', attendanceStatus: 'attended' },
          { sessionDate: new Date(), format: 'family', attendanceStatus: 'attended' },
          { sessionDate: new Date(), format: 'group', attendanceStatus: 'cancelled' },
        ],
      })
    );
    expect(doc.sessionsCount).toBe(3);
  });

  it('sessionsAttendedCount excludes cancelled + absent', async () => {
    const doc = await Program.create(
      baseDoc({
        sessions: [
          { sessionDate: new Date(), format: 'individual', attendanceStatus: 'attended' },
          { sessionDate: new Date(), format: 'family', attendanceStatus: 'cancelled' },
          { sessionDate: new Date(), format: 'group', attendanceStatus: 'attended' },
          { sessionDate: new Date(), format: 'phone', attendanceStatus: 'absent' },
        ],
      })
    );
    expect(doc.sessionsAttendedCount).toBe(2);
  });

  it('burdenScoreDelta = post - pre (negative for clinical improvement)', async () => {
    const doc = await Program.create(
      baseDoc({
        outcomes: { preProgramBurdenScore: 48, postProgramBurdenScore: 31 },
      })
    );
    expect(doc.burdenScoreDelta).toBe(-17);
  });

  it('burdenScoreDelta returns null when either score missing', async () => {
    const doc = await Program.create(baseDoc({ outcomes: { preProgramBurdenScore: 48 } }));
    expect(doc.burdenScoreDelta).toBeNull();
  });

  it('modulesCompletedCount + hoursCompletedTotal + modulesProgressPct compute correctly', async () => {
    const doc = await Program.create(
      baseDoc({
        programType: 'caregiver_training',
        totalModules: 4,
        modulesProgress: [
          {
            moduleNumber: 1,
            title: 'M1',
            targetHours: 4,
            hoursCompleted: 4,
            completedAt: new Date(),
          },
          {
            moduleNumber: 2,
            title: 'M2',
            targetHours: 4,
            hoursCompleted: 4,
            completedAt: new Date(),
          },
          { moduleNumber: 3, title: 'M3', targetHours: 4, hoursCompleted: 2 }, // not completed
        ],
      })
    );
    expect(doc.modulesCompletedCount).toBe(2);
    expect(doc.hoursCompletedTotal).toBe(10);
    expect(doc.modulesProgressPct).toBe(50); // 2 of 4 totalModules
  });

  it('isOverdue=true when active + targetCompletionDate in past', async () => {
    const past = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const doc = await Program.create(baseDoc({ targetCompletionDate: past }));
    expect(doc.isOverdue).toBe(true);
  });

  it('isOverdue=false when completed even if past target', async () => {
    const past = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const doc = await Program.create(
      baseDoc({ targetCompletionDate: past, status: 'completed', completedAt: new Date() })
    );
    expect(doc.isOverdue).toBe(false);
  });
});

// ─── 3. Defaults ──────────────────────────────────────────────────────

describe('W384 behavioral — defaults', () => {
  it('defaults status=enrolled + empty sessions/modulesProgress/history', async () => {
    const doc = await Program.create(baseDoc());
    expect(doc.status).toBe('enrolled');
    expect(doc.sessions).toEqual([]);
    expect(doc.modulesProgress).toEqual([]);
    expect(doc.history).toEqual([]);
    expect(doc.enrolledAt).toBeInstanceOf(Date);
  });

  it('outcomes defaults to all-null Zarit/satisfaction', async () => {
    const doc = await Program.create(baseDoc());
    expect(doc.outcomes.preProgramBurdenScore).toBeNull();
    expect(doc.outcomes.postProgramBurdenScore).toBeNull();
    expect(doc.outcomes.satisfactionScore).toBeNull();
  });
});

// ─── 4. Indexes ───────────────────────────────────────────────────────

describe('W384 behavioral — indexes', () => {
  it('compound + per-field indexes exist', async () => {
    const indexes = await Program.collection.indexes();
    const indexKeys = indexes.map(i => Object.keys(i.key).join('+'));
    // Compound: beneficiaryId+programType+status
    expect(indexKeys).toContain('beneficiaryId+programType+status');
    // branchId+status
    expect(indexKeys).toContain('branchId+status');
    // targetCompletionDate+status (used by overdue sweeper)
    expect(indexKeys).toContain('targetCompletionDate+status');
  });
});

// ─── 5. End-to-end lifecycle (typical session flow) ──────────────────

describe('W384 behavioral — end-to-end caregiver enrollment lifecycle', () => {
  it('enrolled → in_progress → completed full flow persists correctly', async () => {
    // 1. Enroll
    const doc = await Program.create(
      baseDoc({ targetCompletionDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) })
    );
    expect(doc.status).toBe('enrolled');

    // 2. Add first session manually (simulating route handler auto-promote)
    doc.sessions.push({
      sessionDate: new Date(),
      format: 'individual',
      topic: 'Initial',
      attendanceStatus: 'attended',
    });
    doc.history.push({
      fromStatus: 'enrolled',
      toStatus: 'in_progress',
      reason: 'first session recorded',
    });
    doc.status = 'in_progress';
    await doc.save();

    expect(doc.sessionsCount).toBe(1);
    expect(doc.history).toHaveLength(1);
    expect(doc.history[0].fromStatus).toBe('enrolled');

    // 3. Record outcomes pre/post Zarit
    doc.outcomes = {
      preProgramBurdenScore: 50,
      postProgramBurdenScore: 28,
      satisfactionScore: 9,
    };
    await doc.save();
    expect(doc.burdenScoreDelta).toBe(-22);

    // 4. Complete
    doc.history.push({
      fromStatus: 'in_progress',
      toStatus: 'completed',
      reason: '8 sessions + outcomes recorded',
    });
    doc.status = 'completed';
    doc.completedAt = new Date();
    await doc.save();

    // 5. Reload + verify persistence
    const reloaded = await Program.findById(doc._id);
    expect(reloaded.status).toBe('completed');
    expect(reloaded.completedAt).toBeInstanceOf(Date);
    expect(reloaded.burdenScoreDelta).toBe(-22);
    expect(reloaded.history).toHaveLength(2);
  });
});
