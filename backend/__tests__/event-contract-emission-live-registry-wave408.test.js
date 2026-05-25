'use strict';

/**
 * W408 — strict envelope-shape verification for the W400-W404 LIVE-registry
 * producers.
 *
 * Mirror of W384/W385/W386 (which behaviorally verified the W379-W383 DDD
 * wires) for the OTHER registry. The W401/W402/W403/W404 unit tests already
 * check individual payload field values, but they do NOT strictly compare
 * the published payload's key set against the canonical envelope declared in
 * `backend/events/contracts/domainEventContracts.js`. That gap is exactly
 * the W385 lesson:
 *
 *   "static drift guards (W375/W382) catch eventType string-presence but
 *    NOT envelope-shape correctness. Only Object.keys(payload).sort() ===
 *    envelopeKeysFor(contract) strict comparison catches envelope drift."
 *
 * W408 closes that gap for every producer surface added in W400-W404:
 *
 *   - W400 errorHandler 5xx publish → system.error.occurred
 *   - W401 budgetThresholdSweeper → finance.budget.threshold_reached
 *   - W402 absenceDetectionSweeper → attendance.absence.detected
 *   - W403 cachingService clear/pattern → system.cache.invalidated
 *   - W404 Prescription post-save (payload builder) → medical.prescription.issued
 *   - W404 RiskSnapshot post-save (payload builder) → medical.risk.alert_raised
 *   - W404 PayrollPeriod post-save (payload builder) → finance.payroll.processed
 *
 * For the 3 W404 mappings the payload-builder function is tested directly
 * (model post-save hook wiring already covered by W404 unit tests). For the
 * 2 sweepers and the cache hook we invoke the actual sweep / clear function
 * with a mock bus and assert what was published. For the error handler we
 * import the middleware and call it with a synthetic 500 response.
 */

const contracts = require('../events/contracts/domainEventContracts');

function envelopeKeysFor(domain, contractKey) {
  const group = contracts.ALL_CONTRACTS[domain];
  if (!group) throw new Error(`No contract group "${domain}"`);
  const evt = group[contractKey];
  if (!evt) throw new Error(`No contract "${domain}.${contractKey}"`);
  return Object.keys(evt.payload).sort();
}

function eventTypeFor(domain, contractKey) {
  return contracts.ALL_CONTRACTS[domain][contractKey].eventType;
}

function mockBus() {
  return { publish: jest.fn().mockResolvedValue(undefined) };
}

// ─── 1) W400 errorHandler → system.error.occurred ─────────────────────────────

describe('W408 — W400 errorHandler 5xx publish matches SYSTEM_EVENTS.ERROR_OCCURRED envelope', () => {
  it('publishes the canonical envelope on 5xx', async () => {
    // Stub the integrationBus before require so the middleware lazy-loads our stub
    jest.resetModules();
    const captured = [];
    jest.doMock('../integration/systemIntegrationBus', () => ({
      integrationBus: {
        publish: (...args) => {
          captured.push(args);
          return Promise.resolve();
        },
      },
    }));
    const { errorHandler } = require('../errors/errorHandler');
    const req = { method: 'GET', originalUrl: '/api/x', id: 'req-1' };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      set: jest.fn(),
    };
    const err = new Error('boom');
    err.statusCode = 500;
    err.stack = 'Error: boom\n  at line 1';

    errorHandler(err, req, res, () => {});
    // fire-and-forget publish — flush microtasks
    await new Promise(setImmediate);

    expect(captured.length).toBe(1);
    const [domain, eventType, payload] = captured[0];
    expect(domain).toBe('system');
    expect(eventType).toBe(eventTypeFor('system', 'ERROR_OCCURRED'));
    expect(Object.keys(payload).sort()).toEqual(envelopeKeysFor('system', 'ERROR_OCCURRED'));
    jest.dontMock('../integration/systemIntegrationBus');
  });
});

// ─── 2) W401 budgetThresholdSweeper → finance.budget.threshold_reached ────────

describe('W408 — W401 budget-threshold sweeper matches FINANCE_EVENTS.BUDGET_THRESHOLD_REACHED envelope', () => {
  it('publishes the canonical envelope when a budget is over threshold', async () => {
    const { sweepBudgetThresholds } = require('../services/finance/budgetThresholdSweeper');
    const bus = mockBus();
    await sweepBudgetThresholds({
      BudgetModel: {
        find: () => ({
          lean: () =>
            Promise.resolve([
              {
                _id: 'b1',
                department: 'd1',
                totalSpent: 90,
                totalBudgeted: 100,
                utilizationPercentage: 90,
              },
            ]),
        }),
      },
      integrationBus: bus,
    });
    expect(bus.publish).toHaveBeenCalledTimes(1);
    const [domain, eventType, payload] = bus.publish.mock.calls[0];
    expect(domain).toBe('finance');
    expect(eventType).toBe(eventTypeFor('finance', 'BUDGET_THRESHOLD_REACHED'));
    expect(Object.keys(payload).sort()).toEqual(
      envelopeKeysFor('finance', 'BUDGET_THRESHOLD_REACHED')
    );
  });
});

// ─── 3) W402 absenceDetectionSweeper → attendance.absence.detected ────────────

describe('W408 — W402 absence-detection sweeper matches ATTENDANCE_EVENTS.ABSENCE_DETECTED envelope', () => {
  it('publishes the canonical envelope for an absent record', async () => {
    const { sweepAbsenceDetection } = require('../services/hr/absenceDetectionSweeper');
    const bus = mockBus();
    const date = new Date('2026-05-24T08:00:00.000Z');
    await sweepAbsenceDetection({
      AttendanceRecordModel: {
        find: () => ({
          lean: () => Promise.resolve([{ _id: 'r1', employee_id: 'e1', date, status: 'absent' }]),
        }),
      },
      integrationBus: bus,
      now: new Date('2026-05-25T00:30:00.000Z'),
    });
    expect(bus.publish).toHaveBeenCalledTimes(1);
    const [domain, eventType, payload] = bus.publish.mock.calls[0];
    expect(domain).toBe('attendance');
    expect(eventType).toBe(eventTypeFor('attendance', 'ABSENCE_DETECTED'));
    expect(Object.keys(payload).sort()).toEqual(envelopeKeysFor('attendance', 'ABSENCE_DETECTED'));
  });
});

// ─── 4) W403 cachingService.clear() → system.cache.invalidated ────────────────

describe('W408 — W403 cachingService.clear emits SYSTEM_EVENTS.CACHE_INVALIDATED envelope', () => {
  it('publishes the canonical envelope on explicit clear()', async () => {
    jest.resetModules();
    const Singleton = require('../services/cachingService');
    const Klass = Singleton.constructor;
    const bus = mockBus();
    const svc = new Klass({
      integrationBus: bus,
      ttl: 60000,
      maxSize: 50,
      cacheModule: 'w408-cache',
    });
    svc.set('a', 1);
    svc.set('b', 2);
    svc.clear();
    await new Promise(setImmediate);
    expect(bus.publish).toHaveBeenCalledTimes(1);
    const [domain, eventType, payload] = bus.publish.mock.calls[0];
    expect(domain).toBe('system');
    expect(eventType).toBe(eventTypeFor('system', 'CACHE_INVALIDATED'));
    expect(Object.keys(payload).sort()).toEqual(envelopeKeysFor('system', 'CACHE_INVALIDATED'));
  });
});

// ─── 5–7) W404 modelEventBridge payload builders ─────────────────────────────

describe('W408 — W404 modelEventBridge payload builders match canonical envelopes', () => {
  const { MAPPINGS } = require('../integration/modelEventBridge');

  it('Prescription payload matches MEDICAL_EVENTS.PRESCRIPTION_ISSUED envelope', () => {
    const m = MAPPINGS.find(
      x => x.modelName === 'Prescription' && x.eventType === 'prescription.issued'
    );
    const payload = m.payload({
      _id: 'rx1',
      beneficiary: 'b1',
      prescriber: 'd1',
      items: [{ medication: 'm1', medicationName: 'Paracetamol' }],
    });
    expect(Object.keys(payload).sort()).toEqual(envelopeKeysFor('medical', 'PRESCRIPTION_ISSUED'));
  });

  it('RiskSnapshot payload matches MEDICAL_EVENTS.RISK_ALERT_RAISED envelope', () => {
    const m = MAPPINGS.find(
      x => x.modelName === 'RiskSnapshot' && x.eventType === 'risk.alert_raised'
    );
    const payload = m.payload({
      beneficiaryId: 'b1',
      overallTier: 'critical',
      reason: 'fall_risk_elevated',
      explanation: '3 falls',
    });
    expect(Object.keys(payload).sort()).toEqual(envelopeKeysFor('medical', 'RISK_ALERT_RAISED'));
  });

  it('PayrollPeriod payload matches FINANCE_EVENTS.PAYROLL_PROCESSED envelope', () => {
    const m = MAPPINGS.find(
      x => x.modelName === 'PayrollPeriod' && x.eventType === 'payroll.processed'
    );
    const payload = m.payload({
      _id: 'pp1',
      periodCode: '2026-05',
      casesCounted: 42,
      closedAt: new Date('2026-05-31T20:00:00Z'),
    });
    expect(Object.keys(payload).sort()).toEqual(envelopeKeysFor('finance', 'PAYROLL_PROCESSED'));
  });
});
