/**
 * wave122-parent-chatbot-context.test.js — Wave 122 / P3.6 Phase 2a.
 *
 * Test sections:
 *   1. fillTemplate — pure substitution + missing-token + bad input
 *   2. resolveContext per intent (happy paths + degraded paths)
 *   3. Service integration — ask() pulls tokens from contextService
 *      and emits a filled response
 *   4. contextStatus + filled flags on the ask() result
 *   5. Forbidden token VALUE — caller-injected dirty value rejected
 *   6. Graceful degradation — context resolver throws, ask still
 *      returns the (unfilled) template
 */

'use strict';

const reg = require('../intelligence/parent-chatbot.registry');
const {
  createParentChatbotContextService,
} = require('../intelligence/parent-chatbot-context.service');
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

// ─── Mocks ──────────────────────────────────────────────────────────

function matchesQuery(r, q) {
  for (const k of Object.keys(q || {})) {
    const v = q[k];
    if (v && typeof v === 'object' && v.$in) {
      if (!v.$in.includes(r[k])) return false;
    } else if (v && typeof v === 'object' && v.$ne !== undefined) {
      if (String(r[k]) === String(v.$ne)) return false;
      if (v.$ne === null && (r[k] === null || r[k] === undefined)) return false;
    } else if (v && typeof v === 'object' && (v.$gte || v.$lt)) {
      const rv = r[k] ? new Date(r[k]).getTime() : 0;
      if (v.$gte && rv < new Date(v.$gte).getTime()) return false;
      if (v.$lt && rv >= new Date(v.$lt).getTime()) return false;
    } else if (k === '$or') {
      const match = v.some(sub => Object.keys(sub).every(sk => String(r[sk]) === String(sub[sk])));
      if (!match) return false;
    } else if (k === '_id') {
      if (String(r._id) !== String(v)) return false;
    } else {
      if (String(r[k]) !== String(v)) return false;
    }
  }
  return true;
}

function buildModel(seed = []) {
  const store = seed.slice();
  function M(data) {
    Object.assign(this, data);
    this.save = async () => {
      store.push({ ...this });
      return this;
    };
  }
  M.findOne = q => {
    const matches = store.filter(r => matchesQuery(r, q));
    let sortSpec = null;
    const result = () => {
      let arr = matches.slice();
      if (sortSpec) {
        const key = Object.keys(sortSpec)[0];
        const dir = sortSpec[key];
        arr = arr.sort((a, b) => {
          const av = a[key] ? new Date(a[key]).getTime() : 0;
          const bv = b[key] ? new Date(b[key]).getTime() : 0;
          return (av - bv) * dir;
        });
      }
      return arr[0] || null;
    };
    const chain = {
      sort(spec) {
        sortSpec = spec;
        return chain;
      },
      lean: async () => {
        const r = result();
        return r ? { ...r } : null;
      },
      then: resolve => {
        const r = result();
        resolve(r ? r : null);
      },
    };
    return chain;
  };
  M.find = q => {
    let arr = store.filter(r => matchesQuery(r, q));
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
      limit(n) {
        arr = arr.slice(0, n);
        return chain;
      },
      lean: async () => arr.map(r => ({ ...r })),
      then: resolve => resolve(arr.map(r => ({ ...r }))),
    };
    return chain;
  };
  M._store = store;
  return M;
}

function buildSessionModel() {
  const store = [];
  function M(data) {
    Object.assign(this, data);
    this.save = async () => {
      const i = store.findIndex(p => p.sessionId === this.sessionId);
      if (i >= 0) store[i] = { ...this };
      else store.push({ ...this });
      return this;
    };
  }
  M.findOne = q => {
    const found = store.find(p => p.sessionId === q.sessionId);
    return {
      lean: async () => (found ? { ...found } : null),
      then: resolve => resolve(found || null),
    };
  };
  M.updateOne = async (filter, update) => {
    const i = store.findIndex(p => p.sessionId === filter.sessionId);
    if (i < 0) return { modifiedCount: 0 };
    const $set = (update && update.$set) || {};
    store[i] = { ...store[i], ...$set };
    return { modifiedCount: 1 };
  };
  M._store = store;
  return M;
}

// ─── 1. fillTemplate ────────────────────────────────────────────────

describe('fillTemplate', () => {
  const ctx = createParentChatbotContextService({ logger: SILENT });

  test('substitutes single token', () => {
    expect(ctx.fillTemplate('Hello {NAME}', { NAME: 'Ali' })).toBe('Hello Ali');
  });

  test('substitutes multiple tokens including numeric values', () => {
    expect(
      ctx.fillTemplate('You have {COUNT} items totalling {TOTAL} SAR', {
        COUNT: 3,
        TOTAL: 250.5,
      })
    ).toBe('You have 3 items totalling 250.5 SAR');
  });

  test('leaves unfilled tokens intact for QA visibility', () => {
    expect(ctx.fillTemplate('Hello {NAME}, age {AGE}', { NAME: 'Ali' })).toBe(
      'Hello Ali, age {AGE}'
    );
  });

  test('handles null/undefined token values by leaving placeholder intact', () => {
    expect(ctx.fillTemplate('Hi {X}', { X: null })).toBe('Hi {X}');
    expect(ctx.fillTemplate('Hi {X}', { X: undefined })).toBe('Hi {X}');
  });

  test('returns template unchanged when tokens arg is null/empty', () => {
    expect(ctx.fillTemplate('Hi {X}', null)).toBe('Hi {X}');
    expect(ctx.fillTemplate('Hi {X}', {})).toBe('Hi {X}');
  });

  test('returns empty string for null template', () => {
    expect(ctx.fillTemplate(null, { X: 1 })).toBe('');
  });

  test('ignores tokens that are not all-uppercase placeholders', () => {
    // {bad} is lowercase — registry's placeholder syntax is UPPERCASE only.
    expect(ctx.fillTemplate('Hi {bad}', { bad: 'x' })).toBe('Hi {bad}');
  });
});

// ─── 2. resolveContext per intent ───────────────────────────────────

describe('resolveContext — APPOINTMENT_NEXT', () => {
  test('returns the soonest upcoming PENDING/CONFIRMED appointment', async () => {
    const clock = makeClock();
    const apModel = buildModel([
      {
        _id: 'a1',
        beneficiary: 'b1',
        status: 'CONFIRMED',
        date: new Date(clock.now().getTime() + 5 * DAY),
        startTime: '10:00',
        therapistName: 'د. أحمد',
      },
      {
        _id: 'a2',
        beneficiary: 'b1',
        status: 'CONFIRMED',
        date: new Date(clock.now().getTime() + 2 * DAY), // sooner
        startTime: '14:30',
        therapistName: 'د. سارة',
      },
    ]);
    const ctx = createParentChatbotContextService({
      appointmentModel: apModel,
      logger: SILENT,
      now: clock.now,
    });
    const r = await ctx.resolveContext({
      intent: reg.INTENT.APPOINTMENT_NEXT,
      beneficiaryId: 'b1',
    });
    expect(r.ok).toBe(true);
    expect(r.tokens.APPOINTMENT_TIME).toBe('14:30');
    expect(r.tokens.THERAPIST_NAME).toBe('د. سارة');
  });

  test('returns NO_UPCOMING_APPOINTMENT when no future appointments exist', async () => {
    const clock = makeClock();
    const apModel = buildModel([
      {
        _id: 'a1',
        beneficiary: 'b1',
        status: 'COMPLETED',
        date: new Date(clock.now().getTime() - DAY),
      },
    ]);
    const ctx = createParentChatbotContextService({
      appointmentModel: apModel,
      logger: SILENT,
      now: clock.now,
    });
    const r = await ctx.resolveContext({
      intent: reg.INTENT.APPOINTMENT_NEXT,
      beneficiaryId: 'b1',
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('NO_UPCOMING_APPOINTMENT');
  });

  test('rejects when beneficiaryId is missing', async () => {
    const ctx = createParentChatbotContextService({
      appointmentModel: buildModel(),
      logger: SILENT,
    });
    const r = await ctx.resolveContext({ intent: reg.INTENT.APPOINTMENT_NEXT });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('BENEFICIARY_REQUIRED');
  });
});

describe('resolveContext — APPOINTMENT_HISTORY', () => {
  test('counts past appointments within the window', async () => {
    const clock = makeClock();
    const apModel = buildModel([
      {
        _id: 'h1',
        beneficiary: 'b1',
        status: 'COMPLETED',
        date: new Date(clock.now().getTime() - 30 * DAY),
      },
      {
        _id: 'h2',
        beneficiary: 'b1',
        status: 'NO_SHOW',
        date: new Date(clock.now().getTime() - 10 * DAY),
      },
      {
        _id: 'h3',
        beneficiary: 'b1',
        status: 'COMPLETED',
        date: new Date(clock.now().getTime() - 2 * DAY),
      },
    ]);
    const ctx = createParentChatbotContextService({
      appointmentModel: apModel,
      logger: SILENT,
      now: clock.now,
    });
    const r = await ctx.resolveContext({
      intent: reg.INTENT.APPOINTMENT_HISTORY,
      beneficiaryId: 'b1',
    });
    expect(r.ok).toBe(true);
    expect(r.tokens.APPOINTMENT_COUNT).toBe(3);
  });

  test('zero history yields APPOINTMENT_COUNT=0 with placeholder text', async () => {
    const ctx = createParentChatbotContextService({
      appointmentModel: buildModel(),
      logger: SILENT,
    });
    const r = await ctx.resolveContext({
      intent: reg.INTENT.APPOINTMENT_HISTORY,
      beneficiaryId: 'b1',
    });
    expect(r.ok).toBe(true);
    expect(r.tokens.APPOINTMENT_COUNT).toBe(0);
    expect(r.tokens.LAST_APPOINTMENT_DATE).toBe('لا يوجد');
  });
});

describe('resolveContext — INVOICE_BALANCE', () => {
  test('sums unpaid balances across guardian + beneficiary refs', async () => {
    const invModel = buildModel([
      { _id: 'i1', guardianId: 'u1', status: 'UNPAID', total: 200, paid: 50 },
      { _id: 'i2', beneficiary: 'b1', status: 'OVERDUE', total: 100, paid: 0 },
      // Paid — excluded by status filter
      { _id: 'i3', guardianId: 'u1', status: 'PAID', total: 500, paid: 500 },
    ]);
    const ctx = createParentChatbotContextService({
      invoiceModel: invModel,
      logger: SILENT,
    });
    const r = await ctx.resolveContext({
      intent: reg.INTENT.INVOICE_BALANCE,
      userId: 'u1',
      beneficiaryId: 'b1',
    });
    expect(r.ok).toBe(true);
    expect(r.tokens.BALANCE_SAR).toBe(250);
  });

  test('rejects when neither userId nor beneficiaryId provided', async () => {
    const ctx = createParentChatbotContextService({
      invoiceModel: buildModel(),
      logger: SILENT,
    });
    const r = await ctx.resolveContext({ intent: reg.INTENT.INVOICE_BALANCE });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('INVOICE_TARGET_REQUIRED');
  });
});

describe('resolveContext — PROGRESS_SUMMARY', () => {
  test('emits CHILD_NAME + SESSION_COUNT + goals from latest care plan', async () => {
    const clock = makeClock();
    const benModel = buildModel([{ _id: 'b1', name_ar: 'محمد' }]);
    const apModel = buildModel([
      {
        _id: 's1',
        beneficiary: 'b1',
        status: 'COMPLETED',
        date: new Date(clock.now().getTime() - 5 * DAY),
      },
      {
        _id: 's2',
        beneficiary: 'b1',
        status: 'COMPLETED',
        date: new Date(clock.now().getTime() - 15 * DAY),
      },
    ]);
    const planModel = buildModel([
      {
        _id: 'p1',
        beneficiary_id: 'b1',
        status: 'APPROVED',
        updated_at: clock.now(),
        goals: [{ status: 'achieved' }, { status: 'in_progress' }, { status: 'completed' }],
      },
    ]);
    const ctx = createParentChatbotContextService({
      beneficiaryModel: benModel,
      appointmentModel: apModel,
      carePlanModel: planModel,
      logger: SILENT,
      now: clock.now,
    });
    const r = await ctx.resolveContext({
      intent: reg.INTENT.PROGRESS_SUMMARY,
      beneficiaryId: 'b1',
    });
    expect(r.ok).toBe(true);
    expect(r.tokens.CHILD_NAME).toBe('محمد');
    expect(r.tokens.SESSION_COUNT).toBe(2);
    expect(r.tokens.GOALS_COMPLETED).toBe(2);
    expect(r.tokens.GOALS_TOTAL).toBe(3);
  });
});

describe('resolveContext — CLINIC_HOURS + CLINIC_ADDRESS', () => {
  test('reads from branch model when available', async () => {
    const branchModel = buildModel([
      {
        _id: 'br1',
        workingHours: '8:00 ص — 6:00 م',
        address_ar: 'الرياض، حي العليا',
      },
    ]);
    const ctx = createParentChatbotContextService({
      branchModel,
      logger: SILENT,
    });
    const hours = await ctx.resolveContext({
      intent: reg.INTENT.CLINIC_HOURS,
      branchId: 'br1',
    });
    expect(hours.tokens.CLINIC_HOURS).toBe('8:00 ص — 6:00 م');
    const addr = await ctx.resolveContext({
      intent: reg.INTENT.CLINIC_ADDRESS,
      branchId: 'br1',
    });
    expect(addr.tokens.CLINIC_ADDRESS).toBe('الرياض، حي العليا');
  });

  test('falls back to default text when branch model missing', async () => {
    const ctx = createParentChatbotContextService({ logger: SILENT });
    const r = await ctx.resolveContext({
      intent: reg.INTENT.CLINIC_HOURS,
      branchId: 'br1',
    });
    expect(r.ok).toBe(true);
    expect(r.tokens.CLINIC_HOURS).toMatch(/الأحد|الخميس|ص|م/);
  });
});

describe('resolveContext — TEAM_THERAPIST', () => {
  test('derives therapist from most recent appointment', async () => {
    const apModel = buildModel([
      {
        _id: 'a1',
        beneficiary: 'b1',
        therapist: 'e1',
        therapistName: 'د. ليلى',
        department: 'العلاج الوظيفي',
        date: new Date('2026-04-01'),
      },
    ]);
    const benModel = buildModel([{ _id: 'b1', name_ar: 'سلمى' }]);
    const ctx = createParentChatbotContextService({
      appointmentModel: apModel,
      beneficiaryModel: benModel,
      logger: SILENT,
    });
    const r = await ctx.resolveContext({
      intent: reg.INTENT.TEAM_THERAPIST,
      beneficiaryId: 'b1',
    });
    expect(r.ok).toBe(true);
    expect(r.tokens.CHILD_NAME).toBe('سلمى');
    expect(r.tokens.THERAPIST_NAME).toBe('د. ليلى');
    expect(r.tokens.SPECIALTY).toBe('العلاج الوظيفي');
  });
});

describe('resolveContext — fallback intents', () => {
  test('GREETING returns empty tokens', async () => {
    const ctx = createParentChatbotContextService({ logger: SILENT });
    const r = await ctx.resolveContext({ intent: reg.INTENT.GREETING });
    expect(r.ok).toBe(true);
    expect(r.tokens).toEqual({});
  });

  test('ESCALATE_HUMAN returns ETA_MINUTES', async () => {
    const ctx = createParentChatbotContextService({ logger: SILENT });
    const r = await ctx.resolveContext({ intent: reg.INTENT.ESCALATE_HUMAN });
    expect(r.ok).toBe(true);
    expect(r.tokens.ETA_MINUTES).toBe(15);
  });

  test('null intent returns empty tokens', async () => {
    const ctx = createParentChatbotContextService({ logger: SILENT });
    const r = await ctx.resolveContext({});
    expect(r.ok).toBe(true);
    expect(r.tokens).toEqual({});
  });
});

// ─── 3. Service integration — ask() pulls tokens + emits filled response

describe('ask integration with contextService', () => {
  test('filled=true + contextStatus=resolved when context resolves', async () => {
    const clock = makeClock();
    const apModel = buildModel([
      {
        _id: 'a1',
        beneficiary: 'b1',
        status: 'CONFIRMED',
        date: new Date(clock.now().getTime() + 2 * DAY),
        startTime: '10:00',
        therapistName: 'د. علي',
      },
    ]);
    const ctxSvc = createParentChatbotContextService({
      appointmentModel: apModel,
      logger: SILENT,
      now: clock.now,
    });
    const svc = createParentChatbotService({
      sessionModel: buildSessionModel(),
      contextService: ctxSvc,
      logger: SILENT,
      now: clock.now,
    });
    const r = await svc.ask({
      userId: 'u1',
      beneficiaryId: 'b1',
      message: 'next appointment',
    });
    expect(r.ok).toBe(true);
    expect(r.intent).toBe(reg.INTENT.APPOINTMENT_NEXT);
    expect(r.filled).toBe(true);
    expect(r.contextStatus).toBe('resolved');
    expect(r.response).toContain('10:00');
    expect(r.response).toContain('د. علي');
    // No unfilled placeholders should remain.
    expect(r.response).not.toMatch(/\{[A-Z_]+\}/);
  });

  test('filled=false + contextStatus="degraded:NO_UPCOMING_APPOINTMENT" when no upcoming appt', async () => {
    const clock = makeClock();
    const ctxSvc = createParentChatbotContextService({
      appointmentModel: buildModel(),
      logger: SILENT,
      now: clock.now,
    });
    const svc = createParentChatbotService({
      sessionModel: buildSessionModel(),
      contextService: ctxSvc,
      logger: SILENT,
      now: clock.now,
    });
    const r = await svc.ask({
      userId: 'u1',
      beneficiaryId: 'b1',
      message: 'next appointment',
    });
    expect(r.ok).toBe(true);
    expect(r.contextStatus).toBe('degraded:NO_UPCOMING_APPOINTMENT');
    // Template stays unfilled — placeholders remain visible.
    expect(r.response).toMatch(/\{APPOINTMENT_DATE\}/);
  });

  test('caller-supplied context wins over auto-resolution', async () => {
    const ctxSvc = createParentChatbotContextService({
      appointmentModel: buildModel(),
      logger: SILENT,
    });
    const svc = createParentChatbotService({
      sessionModel: buildSessionModel(),
      contextService: ctxSvc,
      logger: SILENT,
    });
    const r = await svc.ask({
      userId: 'u1',
      beneficiaryId: 'b1',
      message: 'next appointment',
      context: {
        APPOINTMENT_DATE: '2099-01-01',
        APPOINTMENT_TIME: '00:00',
        THERAPIST_NAME: 'Dr. Override',
      },
    });
    expect(r.ok).toBe(true);
    expect(r.contextStatus).toBe('caller-supplied');
    expect(r.response).toContain('2099-01-01');
    expect(r.response).toContain('Dr. Override');
  });

  test('no contextService wired → contextStatus=unresolved + filled=false', async () => {
    const svc = createParentChatbotService({
      sessionModel: buildSessionModel(),
      logger: SILENT,
    });
    const r = await svc.ask({ userId: 'u1', message: 'next appointment' });
    expect(r.ok).toBe(true);
    expect(r.contextStatus).toBe('unresolved');
    expect(r.filled).toBe(false);
  });
});

// ─── 4. Forbidden token VALUE rejected ──────────────────────────────

describe('forbidden token VALUE in caller-supplied context', () => {
  test('rejects when caller injects a banned word via a token', async () => {
    const svc = createParentChatbotService({
      sessionModel: buildSessionModel(),
      logger: SILENT,
    });
    const r = await svc.ask({
      userId: 'u1',
      message: 'next appointment',
      context: {
        APPOINTMENT_DATE: '2026-05-20',
        APPOINTMENT_TIME: '10:00',
        // Tries to slip "diagnosis" via the therapist field.
        THERAPIST_NAME: 'Dr. Diagnosis Specialist',
      },
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.RESPONSE_FORBIDDEN_CONTENT);
    expect(r.details.source).toBe('token-value');
  });
});

// ─── 5. Graceful degradation when contextService throws ─────────────

describe('graceful degradation', () => {
  test('contextService throwing falls back to unfilled template', async () => {
    const brokenCtxSvc = {
      resolveContext: async () => {
        throw new Error('boom');
      },
      fillTemplate: (t, _) => t, // identity fallback
    };
    const svc = createParentChatbotService({
      sessionModel: buildSessionModel(),
      contextService: brokenCtxSvc,
      logger: SILENT,
    });
    const r = await svc.ask({ userId: 'u1', message: 'next appointment' });
    expect(r.ok).toBe(true);
    expect(r.contextStatus).toBe('degraded:threw');
    expect(r.response).toMatch(/\{APPOINTMENT_DATE\}/);
  });
});
