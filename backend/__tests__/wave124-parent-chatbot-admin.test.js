/**
 * wave124-parent-chatbot-admin.test.js — Wave 124 / P3.6 admin visibility.
 *
 * Test sections:
 *   1. listSessions — filters (userId / beneficiaryId / branchId / since / intent / escalatedOnly)
 *   2. listSessions — pagination + sorting
 *   3. listSessions — summary shape (no full turns leaked)
 *   4. getStats — happy path with mixed sessions
 *   5. getStats — empty window (no turns) → safe defaults
 *   6. getStats — confidence + escalation aggregations
 *   7. error paths (sessionModel throws)
 */

'use strict';

const reg = require('../intelligence/parent-chatbot.registry');
const { createParentChatbotService } = require('../intelligence/parent-chatbot.service');

const SILENT = { info: () => {}, warn: () => {}, error: () => {} };
const DAY = 24 * 3600 * 1000;

function makeClock(initial = 1_700_000_000_000) {
  const state = { t: initial };
  return {
    now: () => new Date(state.t),
    advance: ms => {
      state.t += ms;
    },
  };
}

// ─── Mock session model ────────────────────────────────────────────

function buildSessionModel(seed = []) {
  const store = seed.slice();
  function M(data) {
    Object.assign(this, data);
    this.save = async () => {
      const i = store.findIndex(p => p.sessionId === this.sessionId);
      if (i >= 0) store[i] = { ...this };
      else store.push({ ...this });
      return this;
    };
  }
  M.find = (q = {}) => {
    let arr = store.filter(s => {
      if (q.userId && String(s.userId) !== String(q.userId)) return false;
      if (q.beneficiaryId && String(s.beneficiaryId) !== String(q.beneficiaryId)) return false;
      if (q.branchId && String(s.branchId) !== String(q.branchId)) return false;
      if (q.lastActivityAt && q.lastActivityAt.$gte) {
        const min = new Date(q.lastActivityAt.$gte).getTime();
        const sv = s.lastActivityAt ? new Date(s.lastActivityAt).getTime() : 0;
        if (sv < min) return false;
      }
      return true;
    });
    const chain = {
      sort(spec) {
        const key = Object.keys(spec || {})[0];
        if (!key) return chain;
        const dir = spec[key];
        arr = arr.slice().sort((a, b) => {
          const av = a[key] ? new Date(a[key]).getTime() : 0;
          const bv = b[key] ? new Date(b[key]).getTime() : 0;
          return (av - bv) * dir;
        });
        return chain;
      },
      lean: async () => arr.map(r => ({ ...r })),
      then: resolve => resolve(arr.map(r => ({ ...r }))),
    };
    return chain;
  };
  M.findOne = q => ({
    lean: async () => {
      const found = store.find(p => p.sessionId === q.sessionId);
      return found ? { ...found } : null;
    },
    then: resolve => {
      const found = store.find(p => p.sessionId === q.sessionId);
      resolve(found || null);
    },
  });
  M.updateOne = async (filter, update) => {
    const i = store.findIndex(p => p.sessionId === filter.sessionId);
    if (i < 0) return { modifiedCount: 0 };
    Object.assign(store[i], (update && update.$set) || {});
    return { modifiedCount: 1 };
  };
  M._store = store;
  return M;
}

function makeSession({ sessionId, userId, beneficiaryId, branchId, age, turns }) {
  const lastActivityAt = new Date(Date.now() - (age || 0) * DAY);
  return {
    sessionId,
    userId: userId || null,
    beneficiaryId: beneficiaryId || null,
    branchId: branchId || null,
    startedAt: lastActivityAt,
    lastActivityAt,
    turnCount: (turns || []).length,
    turns: turns || [],
  };
}

function turn({ intent, confidence = 0.9, askedAt }) {
  return {
    askedAt: askedAt || new Date(),
    message: 'm',
    intent,
    confidence,
    respondedIntent: intent,
    response: 'r',
  };
}

// ─── 1. listSessions filters ──────────────────────────────────────

describe('listSessions — filters', () => {
  test('filters by userId', async () => {
    const model = buildSessionModel([
      makeSession({ sessionId: 's1', userId: 'u1', turns: [turn({ intent: 'greeting' })] }),
      makeSession({ sessionId: 's2', userId: 'u2', turns: [turn({ intent: 'greeting' })] }),
    ]);
    const svc = createParentChatbotService({ sessionModel: model, logger: SILENT });
    const r = await svc.listSessions({ userId: 'u1' });
    expect(r.ok).toBe(true);
    expect(r.total).toBe(1);
    expect(r.sessions[0].sessionId).toBe('s1');
  });

  test('filters by beneficiaryId', async () => {
    const model = buildSessionModel([
      makeSession({ sessionId: 's1', beneficiaryId: 'b1', turns: [turn({ intent: 'greeting' })] }),
      makeSession({ sessionId: 's2', beneficiaryId: 'b2', turns: [turn({ intent: 'greeting' })] }),
    ]);
    const svc = createParentChatbotService({ sessionModel: model, logger: SILENT });
    const r = await svc.listSessions({ beneficiaryId: 'b1' });
    expect(r.total).toBe(1);
    expect(r.sessions[0].beneficiaryId).toBe('b1');
  });

  test('filters by branchId', async () => {
    const model = buildSessionModel([
      makeSession({ sessionId: 's1', branchId: 'br1', turns: [turn({ intent: 'greeting' })] }),
      makeSession({ sessionId: 's2', branchId: 'br2', turns: [turn({ intent: 'greeting' })] }),
    ]);
    const svc = createParentChatbotService({ sessionModel: model, logger: SILENT });
    const r = await svc.listSessions({ branchId: 'br1' });
    expect(r.total).toBe(1);
  });

  test('filters by since (lastActivityAt)', async () => {
    const model = buildSessionModel([
      makeSession({ sessionId: 'old', age: 30, turns: [turn({ intent: 'greeting' })] }),
      makeSession({ sessionId: 'new', age: 1, turns: [turn({ intent: 'greeting' })] }),
    ]);
    const svc = createParentChatbotService({ sessionModel: model, logger: SILENT });
    const r = await svc.listSessions({ since: new Date(Date.now() - 7 * DAY) });
    expect(r.total).toBe(1);
    expect(r.sessions[0].sessionId).toBe('new');
  });

  test('filters by intent — only sessions whose turns include the intent', async () => {
    const model = buildSessionModel([
      makeSession({
        sessionId: 'has',
        turns: [turn({ intent: 'greeting' }), turn({ intent: 'appointment.next' })],
      }),
      makeSession({ sessionId: 'lacks', turns: [turn({ intent: 'greeting' })] }),
    ]);
    const svc = createParentChatbotService({ sessionModel: model, logger: SILENT });
    const r = await svc.listSessions({ intent: 'appointment.next' });
    expect(r.total).toBe(1);
    expect(r.sessions[0].sessionId).toBe('has');
  });

  test('escalatedOnly filters to sessions with escalate.human turn', async () => {
    const model = buildSessionModel([
      makeSession({
        sessionId: 'escalated',
        turns: [turn({ intent: 'greeting' }), turn({ intent: reg.INTENT.ESCALATE_HUMAN })],
      }),
      makeSession({ sessionId: 'normal', turns: [turn({ intent: 'greeting' })] }),
    ]);
    const svc = createParentChatbotService({ sessionModel: model, logger: SILENT });
    const r = await svc.listSessions({ escalatedOnly: true });
    expect(r.total).toBe(1);
    expect(r.sessions[0].escalated).toBe(true);
  });
});

// ─── 2. listSessions pagination + sorting ─────────────────────────

describe('listSessions — pagination + sorting', () => {
  test('sorts by lastActivityAt descending (newest first)', async () => {
    const model = buildSessionModel([
      makeSession({ sessionId: 'old', age: 10, turns: [turn({ intent: 'greeting' })] }),
      makeSession({ sessionId: 'mid', age: 5, turns: [turn({ intent: 'greeting' })] }),
      makeSession({ sessionId: 'new', age: 1, turns: [turn({ intent: 'greeting' })] }),
    ]);
    const svc = createParentChatbotService({ sessionModel: model, logger: SILENT });
    const r = await svc.listSessions();
    expect(r.sessions.map(s => s.sessionId)).toEqual(['new', 'mid', 'old']);
  });

  test('respects limit + offset', async () => {
    const sessions = [];
    for (let i = 0; i < 20; i++) {
      sessions.push(
        makeSession({ sessionId: `s${i}`, age: 20 - i, turns: [turn({ intent: 'greeting' })] })
      );
    }
    const model = buildSessionModel(sessions);
    const svc = createParentChatbotService({ sessionModel: model, logger: SILENT });
    const r = await svc.listSessions({ limit: 5, offset: 5 });
    expect(r.total).toBe(20);
    expect(r.sessions).toHaveLength(5);
    expect(r.limit).toBe(5);
    expect(r.offset).toBe(5);
  });
});

// ─── 3. listSessions summary shape ────────────────────────────────

describe('listSessions — summary shape', () => {
  test('returns lightweight summary (no full turns leaked)', async () => {
    const turns = [
      turn({ intent: 'greeting' }),
      turn({ intent: 'appointment.next' }),
      turn({ intent: reg.INTENT.ESCALATE_HUMAN }),
    ];
    const model = buildSessionModel([
      makeSession({
        sessionId: 'detailed',
        userId: 'u1',
        beneficiaryId: 'b1',
        branchId: 'br1',
        turns,
      }),
    ]);
    const svc = createParentChatbotService({ sessionModel: model, logger: SILENT });
    const r = await svc.listSessions();
    const s = r.sessions[0];
    expect(s.sessionId).toBe('detailed');
    expect(s.userId).toBe('u1');
    expect(s.turnCount).toBe(3);
    expect(s.lastIntent).toBe(reg.INTENT.ESCALATE_HUMAN);
    expect(s.escalated).toBe(true);
    expect(s).not.toHaveProperty('turns'); // turns array NOT included
    expect(s).not.toHaveProperty('messages');
  });
});

// ─── 4. getStats happy path ───────────────────────────────────────

describe('getStats — happy path', () => {
  test('aggregates byIntent across all turns', async () => {
    const model = buildSessionModel([
      makeSession({
        sessionId: 's1',
        turns: [
          turn({ intent: 'greeting', confidence: 0.9 }),
          turn({ intent: 'appointment.next', confidence: 0.8 }),
        ],
      }),
      makeSession({
        sessionId: 's2',
        turns: [
          turn({ intent: 'greeting', confidence: 0.7 }),
          turn({ intent: 'clinic.hours', confidence: 0.85 }),
        ],
      }),
    ]);
    const svc = createParentChatbotService({ sessionModel: model, logger: SILENT });
    const r = await svc.getStats({});
    expect(r.ok).toBe(true);
    expect(r.sessionCount).toBe(2);
    expect(r.turnCount).toBe(4);
    expect(r.byIntent.greeting).toBe(2);
    expect(r.byIntent['appointment.next']).toBe(1);
    expect(r.byIntent['clinic.hours']).toBe(1);
  });

  test('computes avgConfidence over turns with non-zero confidence', async () => {
    const model = buildSessionModel([
      makeSession({
        sessionId: 's1',
        turns: [
          turn({ intent: 'greeting', confidence: 0.8 }),
          turn({ intent: 'greeting', confidence: 0.6 }),
        ],
      }),
    ]);
    const svc = createParentChatbotService({ sessionModel: model, logger: SILENT });
    const r = await svc.getStats({});
    expect(r.avgConfidence).toBeCloseTo(0.7, 4);
  });

  test('computes escalationRate', async () => {
    const model = buildSessionModel([
      makeSession({
        sessionId: 's1',
        turns: [
          turn({ intent: 'greeting' }),
          turn({ intent: reg.INTENT.ESCALATE_HUMAN }),
          turn({ intent: 'greeting' }),
        ],
      }),
    ]);
    const svc = createParentChatbotService({ sessionModel: model, logger: SILENT });
    const r = await svc.getStats({});
    expect(r.escalationRate).toBeCloseTo(1 / 3, 4);
  });

  test('filters by branchId', async () => {
    const model = buildSessionModel([
      makeSession({ sessionId: 's1', branchId: 'br1', turns: [turn({ intent: 'greeting' })] }),
      makeSession({ sessionId: 's2', branchId: 'br2', turns: [turn({ intent: 'clinic.hours' })] }),
    ]);
    const svc = createParentChatbotService({ sessionModel: model, logger: SILENT });
    const r = await svc.getStats({ branchId: 'br1' });
    expect(r.sessionCount).toBe(1);
    expect(r.byIntent.greeting).toBe(1);
    expect(r.byIntent['clinic.hours']).toBeUndefined();
  });

  test('reports newest/oldest session times', async () => {
    const model = buildSessionModel([
      makeSession({ sessionId: 's1', age: 5, turns: [turn({ intent: 'greeting' })] }),
      makeSession({ sessionId: 's2', age: 1, turns: [turn({ intent: 'greeting' })] }),
    ]);
    const svc = createParentChatbotService({ sessionModel: model, logger: SILENT });
    const r = await svc.getStats({ since: new Date(Date.now() - 30 * DAY) });
    expect(r.oldestSessionAt).toBeDefined();
    expect(r.newestSessionAt).toBeDefined();
    expect(new Date(r.newestSessionAt).getTime()).toBeGreaterThan(
      new Date(r.oldestSessionAt).getTime()
    );
  });
});

// ─── 5. getStats — empty window ────────────────────────────────────

describe('getStats — empty window', () => {
  test('returns safe defaults when no sessions', async () => {
    const svc = createParentChatbotService({
      sessionModel: buildSessionModel(),
      logger: SILENT,
    });
    const r = await svc.getStats({});
    expect(r.ok).toBe(true);
    expect(r.sessionCount).toBe(0);
    expect(r.turnCount).toBe(0);
    expect(r.escalationRate).toBe(0);
    expect(r.avgConfidence).toBeNull();
    expect(r.byIntent).toEqual({});
    expect(r.oldestSessionAt).toBeNull();
    expect(r.newestSessionAt).toBeNull();
  });
});

// ─── 6. listSessions — empty results ───────────────────────────────

describe('listSessions — empty results', () => {
  test('returns total=0 and empty sessions array', async () => {
    const svc = createParentChatbotService({
      sessionModel: buildSessionModel(),
      logger: SILENT,
    });
    const r = await svc.listSessions({ userId: 'nobody' });
    expect(r.ok).toBe(true);
    expect(r.total).toBe(0);
    expect(r.sessions).toEqual([]);
  });
});

// ─── 7. Error paths ───────────────────────────────────────────────

describe('admin endpoints — error paths', () => {
  test('listSessions: sessionModel throws → CHATBOT_UNAVAILABLE', async () => {
    const brokenModel = {
      find: () => {
        throw new Error('db down');
      },
    };
    const svc = createParentChatbotService({ sessionModel: brokenModel, logger: SILENT });
    const r = await svc.listSessions();
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.CHATBOT_UNAVAILABLE);
  });

  test('getStats: sessionModel throws → CHATBOT_UNAVAILABLE', async () => {
    const brokenModel = {
      find: () => {
        throw new Error('db down');
      },
    };
    const svc = createParentChatbotService({ sessionModel: brokenModel, logger: SILENT });
    const r = await svc.getStats({});
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.CHATBOT_UNAVAILABLE);
  });
});
