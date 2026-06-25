'use strict';

/**
 * whatsapp-beneficiary-context-behavioral-wave1523.test.js — behavioral
 * counterpart to the static guard whatsapp-beneficiary-context-wave1491.
 *
 * buildContext is the rehab-context sidebar's data source and the most-used M2
 * surface. Its whole point is RESILIENCE: a Promise.allSettled fan-out over 5
 * independent models so one unregistered model or one failing query never blanks
 * the rest (sidebar degrades, doesn't crash). The static guard reads the source;
 * it cannot prove the isolation actually holds. This drives the real function
 * with mongoose.model stubbed (no DB/boot) and asserts the per-source contract.
 *
 * Run: cd backend && npx jest --config=jest.config.js __tests__/whatsapp-beneficiary-context-behavioral-wave1523.test.js
 */

jest.unmock('mongoose');

const mongoose = require('mongoose');
const svc = require('../services/whatsapp/whatsappBeneficiaryContext.service');

const OID = String(new mongoose.Types.ObjectId());

// A chainable query stub: every builder method returns itself; lean()/then()
// terminate with `result` (or reject when `shouldThrow`).
function query(result, shouldThrow = false) {
  const q = {};
  for (const m of ['select', 'sort', 'limit', 'populate', 'where']) q[m] = () => q;
  q.lean = () => (shouldThrow ? Promise.reject(new Error('boom')) : Promise.resolve(result));
  q.then = (res, rej) => q.lean().then(res, rej);
  return q;
}

function fakeModel({ findById, findOne, find, throwOn } = {}) {
  return {
    findById: () => query(findById, throwOn === 'findById'),
    findOne: () => query(findOne, throwOn === 'findOne'),
    find: () => query(find, throwOn === 'find'),
  };
}

// Build the registry the service looks up by name; missing names → throw (so
// tryModel returns null → source 'unavailable').
function installModels(registry) {
  jest.spyOn(mongoose, 'model').mockImplementation(name => {
    if (registry[name]) return registry[name];
    throw new Error(`missing schema ${name}`);
  });
}

function allHealthy(overrides = {}) {
  return {
    Beneficiary: fakeModel({ findById: { fullNameArabic: 'سعد', status: 'active' } }),
    UnifiedCarePlan: fakeModel({ findOne: { planNumber: 'CP-1', status: 'active' } }),
    TherapeuticGoal: fakeModel({ find: [{ title: 'هدف', status: 'active' }] }),
    ClinicalSession: fakeModel({ find: [{ scheduledDate: new Date(), status: 'scheduled' }] }),
    Invoice: fakeModel({ find: [{ invoiceNumber: 'INV-1', status: 'unpaid', totalAmount: 100 }] }),
    ...overrides,
  };
}

afterEach(() => jest.restoreAllMocks());

describe('W1523 buildContext never throws + degrades gracefully', () => {
  test('invalid beneficiaryId → empty context (no lookups)', async () => {
    const spy = jest.spyOn(mongoose, 'model');
    const out = await svc.buildContext({ beneficiaryId: 'not-an-id' });
    expect(out.beneficiary).toBeNull();
    expect(out.goals).toEqual([]);
    expect(out.sources).toEqual({});
    expect(spy).not.toHaveBeenCalled();
  });

  test('all sources healthy → every source ok + mapped output', async () => {
    installModels(allHealthy());
    const out = await svc.buildContext({ beneficiaryId: OID });
    expect(out.sources).toMatchObject({ beneficiary: 'ok', carePlan: 'ok', goals: 'ok', sessions: 'ok', invoices: 'ok' });
    expect(out.beneficiary).not.toBeNull();
    expect(out.goals).toHaveLength(1);
    expect(out.upcomingSessions).toHaveLength(1);
  });

  test('an UNREGISTERED model → that source unavailable, the rest still ok', async () => {
    const reg = allHealthy();
    delete reg.TherapeuticGoal; // not registered
    installModels(reg);
    const out = await svc.buildContext({ beneficiaryId: OID });
    expect(out.sources.goals).toBe('unavailable');
    expect(out.goals).toEqual([]);
    expect(out.sources.beneficiary).toBe('ok');
    expect(out.beneficiary).not.toBeNull();
  });

  test('a FAILING query → that source error, the others isolated (allSettled)', async () => {
    const reg = allHealthy({ ClinicalSession: fakeModel({ throwOn: 'find', find: [] }) });
    installModels(reg);
    const out = await svc.buildContext({ beneficiaryId: OID });
    expect(out.sources.sessions).toBe('error');
    expect(out.upcomingSessions).toEqual([]);
    // neighbours unaffected
    expect(out.sources.beneficiary).toBe('ok');
    expect(out.sources.invoices).toBe('ok');
    expect(out.invoices.items).toHaveLength(1);
  });
});
