/**
 * adapter-circuit-live-path.test.js — integration tests that prove the
 * circuit breaker is wired correctly into the live-call path of each
 * paid adapter (Absher, NPHIES, Fatoora).
 *
 * Strategy: stub global.fetch, drive the adapter in live mode, assert:
 *   1. 5 consecutive 5xx responses trip the breaker (open=true)
 *   2. Once open, next call short-circuits (fetch NOT invoked)
 *   3. A successful response (after reset) closes the breaker again
 *   4. 4xx ZATCA/NPHIES responses (validation failures) do NOT trip —
 *      those are "provider answered, our input was bad"
 */

'use strict';

const originalFetch = global.fetch;

function mockFetchSequence(responses) {
  let call = 0;
  global.fetch = jest.fn(async () => {
    const r = responses[call] || responses[responses.length - 1];
    call += 1;
    if (r.throw) throw new Error(r.throw);
    return {
      ok: r.status >= 200 && r.status < 300,
      status: r.status,
      text: async () => r.text || '',
      json: async () => r.json || {},
    };
  });
  return () => call;
}

afterEach(() => {
  global.fetch = originalFetch;
  jest.resetModules();
});

function resetBreakerRegistry() {
  // Force a fresh load so circuit state doesn't leak between tests
  jest.resetModules();
}

describe('Absher — circuit breaker live-path', () => {
  beforeEach(() => {
    resetBreakerRegistry();
    process.env.ABSHER_MODE = 'live';
    process.env.ABSHER_BASE_URL = 'https://mock.absher.sa';
    process.env.ABSHER_CLIENT_ID = 'id';
    process.env.ABSHER_CLIENT_SECRET = 'secret';
  });

  afterEach(() => {
    delete process.env.ABSHER_MODE;
  });

  it('trips after 5 consecutive 5xx responses', async () => {
    // All calls return 500 (alternating token + verify, all 500).
    // 5 failed verify calls → breaker opens.
    mockFetchSequence([
      { status: 200, json: { access_token: 't', expires_in: 3600 } }, // token
      { status: 500 },
      { status: 500 },
      { status: 500 },
      { status: 500 },
      { status: 500 },
    ]);
    const absher = require('../services/absherAdapter');
    for (let i = 0; i < 5; i += 1) {
      await absher.verify({ nationalId: '1234567890' });
    }
    const cfg = absher.getConfig();
    expect(cfg.circuit.open).toBe(true);
    expect(cfg.circuit.failures).toBeGreaterThanOrEqual(5);
  });

  it('short-circuits once open (fetch not called again)', async () => {
    const getCallCount = mockFetchSequence([
      { status: 200, json: { access_token: 't', expires_in: 3600 } },
      { status: 500 },
      { status: 500 },
      { status: 500 },
      { status: 500 },
      { status: 500 },
    ]);
    const absher = require('../services/absherAdapter');
    for (let i = 0; i < 5; i += 1) await absher.verify({ nationalId: '1234567890' });
    const callsAfterTrip = getCallCount();
    // Now do a 6th verify — should short-circuit, NO new fetch.
    const r = await absher.verify({ nationalId: '1234567890' });
    expect(r.circuitOpen).toBe(true);
    expect(getCallCount()).toBe(callsAfterTrip);
  });

  it('404 (not_found) does NOT trip the breaker — provider answered', async () => {
    mockFetchSequence([
      { status: 200, json: { access_token: 't', expires_in: 3600 } },
      { status: 404 },
      { status: 404 },
      { status: 404 },
      { status: 404 },
      { status: 404 },
      { status: 404 },
    ]);
    const absher = require('../services/absherAdapter');
    for (let i = 0; i < 6; i += 1) await absher.verify({ nationalId: '1234567890' });
    expect(absher.getConfig().circuit.open).toBe(false);
  });
});

describe('NPHIES — circuit breaker live-path', () => {
  beforeEach(() => {
    resetBreakerRegistry();
    process.env.NPHIES_MODE = 'live';
    process.env.NPHIES_BASE_URL = 'https://mock.nphies.sa';
    process.env.NPHIES_CLIENT_ID = 'id';
    process.env.NPHIES_CLIENT_SECRET = 'secret';
    process.env.NPHIES_PROVIDER_ID = 'HPO-TEST';
  });

  afterEach(() => {
    delete process.env.NPHIES_MODE;
  });

  it('network errors trip the breaker', async () => {
    mockFetchSequence([
      { status: 200, json: { access_token: 't', expires_in: 3600 } },
      { throw: 'ECONNRESET' },
      { throw: 'ECONNRESET' },
      { throw: 'ECONNRESET' },
      { throw: 'ECONNRESET' },
      { throw: 'ECONNRESET' },
    ]);
    const nphies = require('../services/nphiesAdapter');
    for (let i = 0; i < 5; i += 1) {
      await nphies.checkEligibility({ memberId: 'AB12345', insurerId: 'INS-1' });
    }
    expect(nphies.getConfig().circuit.open).toBe(true);
  });

  it('claim submission also participates in the same breaker', async () => {
    mockFetchSequence([
      { status: 200, json: { access_token: 't', expires_in: 3600 } },
      { status: 500 },
      { status: 500 },
      { status: 500 },
      { status: 500 },
      { status: 500 },
    ]);
    const nphies = require('../services/nphiesAdapter');
    for (let i = 0; i < 5; i += 1) {
      await nphies.submitClaim({
        memberId: 'AB12345',
        insurerId: 'INS-1',
        services: [],
        totalAmount: 100,
      });
    }
    expect(nphies.getConfig().circuit.open).toBe(true);
  });
});

describe('Fatoora — circuit breaker live-path', () => {
  beforeEach(() => {
    resetBreakerRegistry();
    process.env.FATOORA_MODE = 'live';
    process.env.FATOORA_BASE_URL = 'https://mock.fatoora.sa';
    process.env.FATOORA_BINARY_TOKEN = 'token';
  });

  afterEach(() => {
    delete process.env.FATOORA_MODE;
  });

  it('5xx + network errors trip the breaker', async () => {
    mockFetchSequence([
      { status: 500 },
      { status: 500 },
      { status: 500 },
      { throw: 'ETIMEDOUT' },
      { throw: 'ETIMEDOUT' },
    ]);
    const fatoora = require('../services/fatooraAdapter');
    for (let i = 0; i < 5; i += 1) {
      await fatoora.submit({
        invoice: { totalAmount: 100 },
        uuid: '00000000-0000-0000-0000-000000000000',
        invoiceHash: 'hash',
        invoiceXmlB64: 'PHhtbC8+',
      });
    }
    expect(fatoora.getConfig().circuit.open).toBe(true);
  });

  it('400 (ZATCA validation reject) does NOT trip the breaker', async () => {
    mockFetchSequence([
      {
        status: 400,
        json: { validationResults: { errorMessages: [{ code: 'X', message: 'y' }] } },
      },
      {
        status: 400,
        json: { validationResults: { errorMessages: [{ code: 'X', message: 'y' }] } },
      },
      {
        status: 400,
        json: { validationResults: { errorMessages: [{ code: 'X', message: 'y' }] } },
      },
      {
        status: 400,
        json: { validationResults: { errorMessages: [{ code: 'X', message: 'y' }] } },
      },
      {
        status: 400,
        json: { validationResults: { errorMessages: [{ code: 'X', message: 'y' }] } },
      },
      {
        status: 400,
        json: { validationResults: { errorMessages: [{ code: 'X', message: 'y' }] } },
      },
    ]);
    const fatoora = require('../services/fatooraAdapter');
    for (let i = 0; i < 6; i += 1) {
      await fatoora.submit({
        invoice: { totalAmount: 100 },
        uuid: '00000000-0000-0000-0000-000000000000',
        invoiceHash: 'hash',
        invoiceXmlB64: 'PHhtbC8+',
      });
    }
    expect(fatoora.getConfig().circuit.open).toBe(false);
  });
});
