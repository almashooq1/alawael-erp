/**
 * gov-adapters.e2e.test.js — end-to-end deterministic tests for all 10
 * Saudi government adapters shipped in the 2026-04-17/18 sprint.
 *
 * These are pure unit-tests against the mock mode of each adapter — no
 * server, no DB, no network. They lock in the state machine:
 *
 *   • Every status enum branch is covered
 *   • Deterministic mock keys (national-id / license-number suffixes)
 *     continue to produce expected outputs
 *   • Public interface (verify / testConnection / getConfig) stays stable
 *
 * Run: npx jest gov-adapters.e2e
 */

'use strict';

// Force mock mode across all adapters before import
process.env.GOSI_MODE = 'mock';
process.env.SCFHS_MODE = 'mock';
process.env.ABSHER_MODE = 'mock';
process.env.QIWA_MODE = 'mock';
process.env.NAFATH_MODE = 'mock';
process.env.FATOORA_MODE = 'mock';
process.env.MUQEEM_MODE = 'mock';
process.env.NPHIES_MODE = 'mock';
process.env.WASEL_MODE = 'mock';
process.env.BALADY_MODE = 'mock';

const gosi = require('../services/gosiAdapter');
const scfhs = require('../services/scfhsAdapter');
const absher = require('../services/absherAdapter');
const qiwa = require('../services/qiwaAdapter');
const nafath = require('../services/nafathAdapter');
const fatoora = require('../services/fatooraAdapter');
const muqeem = require('../services/muqeemAdapter');
const nphies = require('../services/nphiesAdapter');
const wasel = require('../services/waselAdapter');
const balady = require('../services/baladyAdapter');
const { buildEnvelope, canonicalHash, uuidv4 } = require('../services/zatcaEnvelope');

// ═══════════════════════════════════════════════════════════════════════
//  GOSI
// ═══════════════════════════════════════════════════════════════════════
describe('GOSI adapter', () => {
  it('active: valid Saudi NID returns active subscription', async () => {
    const r = await gosi.verify({ nationalId: '1234567890' });
    expect(r.status).toBe('active');
    expect(r.employerName).toBeTruthy();
    expect(typeof r.monthlyWage).toBe('number');
    expect(r.monthlyWage).toBeGreaterThan(0);
    expect(r.mode).toBe('mock');
  });
  it('inactive: NID ending "11" returns inactive', async () => {
    const r = await gosi.verify({ nationalId: '1000000011' });
    expect(r.status).toBe('inactive');
    expect(r.monthlyWage).toBe(0);
  });
  it('not_found: NID ending "00" returns not_found', async () => {
    const r = await gosi.verify({ nationalId: '1000000100' });
    expect(r.status).toBe('not_found');
  });
  it('unknown: malformed NID returns unknown', async () => {
    const r = await gosi.verify({ nationalId: '123' });
    expect(r.status).toBe('unknown');
  });
  it('getConfig: mock mode reports configured', () => {
    const c = gosi.getConfig();
    expect(c.mode).toBe('mock');
    expect(c.configured).toBe(true);
    expect(c.circuit.open).toBe(false);
  });
  it('testConnection: mock mode returns ok', async () => {
    const r = await gosi.testConnection();
    expect(r.ok).toBe(true);
    expect(r.mode).toBe('mock');
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  SCFHS
// ═══════════════════════════════════════════════════════════════════════
describe('SCFHS adapter', () => {
  it('active license returns active + classification + specialty', async () => {
    const r = await scfhs.verify({ licenseNumber: '12345' });
    expect(r.status).toBe('active');
    expect(r.classification).toBeTruthy();
    expect(r.specialty).toBeTruthy();
    expect(r.expiryDate).toBeInstanceOf(Date);
  });
  it('license ending "0" is expired', async () => {
    const r = await scfhs.verify({ licenseNumber: '12340' });
    expect(r.status).toBe('expired');
    expect(r.expiryDate.getTime()).toBeLessThan(Date.now());
  });
  it('license ending "9" is suspended', async () => {
    const r = await scfhs.verify({ licenseNumber: '12349' });
    expect(r.status).toBe('suspended');
  });
  it('license ending "999" is not_found', async () => {
    const r = await scfhs.verify({ licenseNumber: '12999' });
    expect(r.status).toBe('not_found');
  });
  it('invalid license format → unknown', async () => {
    const r = await scfhs.verify({ licenseNumber: 'abc' });
    expect(r.status).toBe('unknown');
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  Absher / Yakeen
// ═══════════════════════════════════════════════════════════════════════
describe('Absher adapter', () => {
  it('default NID returns match with synthesized attributes', async () => {
    const r = await absher.verify({ nationalId: '1234567890' });
    expect(r.status).toBe('match');
    expect(r.attributes).toMatchObject({
      fullName_ar: expect.any(String),
      gender: expect.stringMatching(/^[MF]$/),
      nationality: 'SAU',
      isAlive: true,
    });
  });
  it('NID ending "00" is not_found', async () => {
    const r = await absher.verify({ nationalId: '1000000100' });
    expect(r.status).toBe('not_found');
  });
  it('NID ending "77" + firstName triggers mismatch', async () => {
    const r = await absher.verify({ nationalId: '1000000177', firstName_ar: 'احمد' });
    expect(r.status).toBe('mismatch');
  });
  it('invalid NID → unknown', async () => {
    const r = await absher.verify({ nationalId: '999' });
    expect(r.status).toBe('unknown');
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  Qiwa
// ═══════════════════════════════════════════════════════════════════════
describe('Qiwa adapter', () => {
  it('default NID is compliant with active contract + WPS', async () => {
    const r = await qiwa.verify({ nationalId: '1234567890' });
    expect(r.status).toBe('compliant');
    expect(r.contractType).toBeTruthy();
    expect(r.wpsCompliant).toBe(true);
    expect(r.contractStartDate).toBeInstanceOf(Date);
  });
  it('NID ending "55" has no_contract', async () => {
    const r = await qiwa.verify({ nationalId: '1000000155' });
    expect(r.status).toBe('no_contract');
    expect(r.wpsCompliant).toBe(false);
  });
  it('NID ending "66" triggers wps_violation', async () => {
    const r = await qiwa.verify({ nationalId: '1000000166' });
    expect(r.status).toBe('wps_violation');
    expect(r.wpsCompliant).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  Nafath
// ═══════════════════════════════════════════════════════════════════════
describe('Nafath adapter', () => {
  it('initiate returns transactionId + 2-digit randomNumber', async () => {
    const r = await nafath.initiate({ nationalId: '1234567890' });
    expect(r.transactionId).toMatch(/^nafath-/);
    expect(r.randomNumber).toMatch(/^\d{2}$/);
    expect(r.expiresAt).toBeInstanceOf(Date);
    expect(r.expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(r.mode).toBe('mock');
  });
  it('initiate throws on invalid national id', async () => {
    await expect(nafath.initiate({ nationalId: '123' })).rejects.toMatchObject({
      code: 'INVALID_ID',
    });
  });
  it('checkStatus pending before MOCK_APPROVE_MS elapses', async () => {
    const r = await nafath.checkStatus({
      nationalId: '1234567890',
      createdAtMs: Date.now(),
    });
    expect(r.status).toBe('PENDING');
  });
  it('checkStatus approved after elapsed window (default-tail NID)', async () => {
    const r = await nafath.checkStatus({
      nationalId: '1234567890',
      createdAtMs: Date.now() - 10_000,
    });
    expect(r.status).toBe('APPROVED');
    expect(r.attributes).toMatchObject({ phone: expect.any(String) });
  });
  it('checkStatus rejected for NID ending "99"', async () => {
    const r = await nafath.checkStatus({
      nationalId: '1000000199',
      createdAtMs: Date.now() - 10_000,
    });
    expect(r.status).toBe('REJECTED');
  });
  it('checkStatus expired for NID ending "88"', async () => {
    const r = await nafath.checkStatus({
      nationalId: '1000000188',
      createdAtMs: Date.now() - 10_000,
    });
    expect(r.status).toBe('EXPIRED');
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  ZATCA envelope + Fatoora
// ═══════════════════════════════════════════════════════════════════════
describe('ZATCA envelope', () => {
  it('uuidv4 produces RFC-4122 format', () => {
    const u = uuidv4();
    expect(u).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });
  it('canonicalHash is deterministic for identical inputs', () => {
    const inv = {
      invoiceNumber: 'INV-001',
      issueDate: '2026-04-18',
      subTotal: 100,
      taxAmount: 15,
      totalAmount: 115,
      beneficiary: 'xxx',
      items: [{ description: 'x', quantity: 1, unitPrice: 100, total: 100 }],
    };
    const h1 = canonicalHash(inv);
    const h2 = canonicalHash({ ...inv });
    expect(h1).toBe(h2);
    expect(h1).toHaveLength(44); // SHA-256 base64
  });
  it('buildEnvelope composes uuid + hash + QR', () => {
    const env = buildEnvelope(
      {
        invoiceNumber: 'INV-002',
        issueDate: new Date(),
        subTotal: 200,
        taxAmount: 30,
        totalAmount: 230,
        items: [],
      },
      { sellerName: 'Alawael', sellerVatNumber: '300000000000003', icv: 5 }
    );
    expect(env.uuid).toHaveLength(36);
    expect(env.icv).toBe(5);
    expect(env.invoiceHash).toHaveLength(44);
    expect(env.qrCode.length).toBeGreaterThan(40);
    expect(env.invoiceType).toBe('SIMPLIFIED');
  });
  it('buildEnvelope switches to STANDARD when buyerVatNumber present', () => {
    const env = buildEnvelope(
      { invoiceNumber: 'INV-003', issueDate: new Date(), totalAmount: 100, taxAmount: 15 },
      { sellerName: 'X', sellerVatNumber: '...', buyerVatNumber: '400000000000001', icv: 1 }
    );
    expect(env.invoiceType).toBe('STANDARD');
  });
});

describe('Fatoora adapter', () => {
  const baseEnv = {
    uuid: 'abcd-1234',
    invoiceHash: 'hash123',
  };
  it('small amount → REPORTED (reporting flow)', async () => {
    const r = await fatoora.submit({
      invoice: { totalAmount: 500 },
      ...baseEnv,
    });
    expect(r.status).toBe('REPORTED');
    expect(r.submissionType).toBe('reporting');
    expect(r.zatcaReference).toMatch(/^MOCK-/);
  });
  it('large amount (>= 10k) → ACCEPTED (clearance)', async () => {
    const r = await fatoora.submit({
      invoice: { totalAmount: 15_000 },
      ...baseEnv,
    });
    expect(r.status).toBe('ACCEPTED');
    expect(r.submissionType).toBe('clearance');
  });
  it('amount ending .99 → REJECTED with BR-S-08', async () => {
    const r = await fatoora.submit({
      invoice: { totalAmount: 99.99 },
      ...baseEnv,
    });
    expect(r.status).toBe('REJECTED');
    expect(r.errors[0].code).toBe('BR-S-08');
  });
  it('missing uuid → ERROR', async () => {
    const r = await fatoora.submit({ invoice: { totalAmount: 100 }, invoiceHash: 'h' });
    expect(r.status).toBe('ERROR');
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  Muqeem
// ═══════════════════════════════════════════════════════════════════════
describe('Muqeem adapter', () => {
  it('active iqama with 90+ days returns sponsor + nationality + profession', async () => {
    const r = await muqeem.verify({ iqamaNumber: '2345678901' });
    expect(r.status).toBe('active');
    expect(r.sponsor).toBeTruthy();
    expect(r.nationality).toBeTruthy();
    expect(r.remainingDays).toBeGreaterThan(0);
  });
  it('iqama ending "00" → not_found', async () => {
    const r = await muqeem.verify({ iqamaNumber: '2000000000' });
    expect(r.status).toBe('not_found');
  });
  it('iqama ending "11" → cancelled', async () => {
    const r = await muqeem.verify({ iqamaNumber: '2000000011' });
    expect(r.status).toBe('cancelled');
  });
  it('iqama ending "22" → expired with negative remainingDays', async () => {
    const r = await muqeem.verify({ iqamaNumber: '2000000022' });
    expect(r.status).toBe('expired');
    expect(r.remainingDays).toBeLessThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  NPHIES
// ═══════════════════════════════════════════════════════════════════════
describe('NPHIES adapter', () => {
  describe('checkEligibility', () => {
    it('default member is eligible with copay/deductible/planName', async () => {
      const r = await nphies.checkEligibility({ memberId: 'ABC123' });
      expect(r.status).toBe('eligible');
      expect(r.copay).toBeGreaterThan(0);
      expect(r.deductible).toBeGreaterThan(0);
      expect(r.planName).toBeTruthy();
      expect(r.coverageStart).toBeInstanceOf(Date);
    });
    it('member ending "00" is not_covered', async () => {
      const r = await nphies.checkEligibility({ memberId: 'AB00' });
      expect(r.status).toBe('not_covered');
    });
    it('member ending "99" requires_preauth', async () => {
      const r = await nphies.checkEligibility({ memberId: 'AB99' });
      expect(r.status).toBe('requires_preauth');
    });
  });
  describe('submitClaim', () => {
    it('small claim → APPROVED with 80% approvedAmount', async () => {
      const r = await nphies.submitClaim({ memberId: 'ABC123', totalAmount: 1000 });
      expect(r.status).toBe('APPROVED');
      expect(r.approvedAmount).toBe(800);
      expect(r.remainingBalance).toBe(200);
      expect(r.claimReference).toMatch(/^NP-A-/);
    });
    it('claim > 10k → PENDING_REVIEW', async () => {
      const r = await nphies.submitClaim({ memberId: 'ABC123', totalAmount: 15_000 });
      expect(r.status).toBe('PENDING_REVIEW');
    });
    it('member ending "77" → REJECTED', async () => {
      const r = await nphies.submitClaim({ memberId: 'AB77', totalAmount: 500 });
      expect(r.status).toBe('REJECTED');
      expect(r.reason).toBeTruthy();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  Wasel
// ═══════════════════════════════════════════════════════════════════════
describe('Wasel adapter', () => {
  it('valid short code → match with full address + geo', async () => {
    const r = await wasel.verifyShortCode({ shortCode: 'RFYA1234' });
    expect(r.status).toBe('match');
    expect(r.city).toBeTruthy();
    expect(r.district).toBeTruthy();
    expect(r.postalCode).toMatch(/^\d+$/);
    expect(r.geo).toMatchObject({ lat: expect.any(Number), lng: expect.any(Number) });
    expect(r.isDeliverable).toBe(true);
  });
  it('short code ending "00" → not_found', async () => {
    const r = await wasel.verifyShortCode({ shortCode: 'RFYA1200' });
    expect(r.status).toBe('not_found');
  });
  it('short code ending "99" → invalid_format', async () => {
    const r = await wasel.verifyShortCode({ shortCode: 'RFYA1299' });
    expect(r.status).toBe('invalid_format');
  });
  it('malformed code → invalid_format', async () => {
    const r = await wasel.verifyShortCode({ shortCode: 'abc' });
    expect(r.status).toBe('invalid_format');
  });
  it('searchByNationalId returns addresses array', async () => {
    const r = await wasel.searchByNationalId({ nationalId: '1234567890' });
    expect(r.status).toBe('found');
    expect(Array.isArray(r.addresses)).toBe(true);
    expect(r.addresses.length).toBeGreaterThan(0);
  });
  it('searchByNationalId NID ending "00" → no_addresses', async () => {
    const r = await wasel.searchByNationalId({ nationalId: '1000000100' });
    expect(r.status).toBe('no_addresses');
    expect(r.addresses).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  Balady
// ═══════════════════════════════════════════════════════════════════════
describe('Balady adapter', () => {
  it('valid license → active with full license details', async () => {
    const r = await balady.verify({ licenseNumber: '12345678' });
    expect(r.status).toBe('active');
    expect(r.licenseType).toBeTruthy();
    expect(r.activityName).toBeTruthy();
    expect(r.governorate).toBeTruthy();
    expect(r.city).toBeTruthy();
    expect(r.remainingDays).toBeGreaterThan(0);
  });
  it('license ending "0" → expired with negative remainingDays', async () => {
    const r = await balady.verify({ licenseNumber: '12345670' });
    expect(r.status).toBe('expired');
    expect(r.remainingDays).toBeLessThan(0);
  });
  it('license ending "9" → suspended', async () => {
    const r = await balady.verify({ licenseNumber: '12345679' });
    expect(r.status).toBe('suspended');
  });
  it('license ending "999" → not_found', async () => {
    const r = await balady.verify({ licenseNumber: '12345999' });
    expect(r.status).toBe('not_found');
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  Uniform interface check
// ═══════════════════════════════════════════════════════════════════════
describe('All adapters share uniform interface', () => {
  const all = [
    { name: 'gosi', adapter: gosi },
    { name: 'scfhs', adapter: scfhs },
    { name: 'absher', adapter: absher },
    { name: 'qiwa', adapter: qiwa },
    { name: 'muqeem', adapter: muqeem },
    { name: 'wasel', adapter: wasel },
    { name: 'balady', adapter: balady },
    { name: 'fatoora', adapter: fatoora },
  ];
  all.forEach(({ name, adapter }) => {
    it(`${name} exports MODE constant`, () => {
      expect(adapter.MODE).toBe('mock');
    });
  });
  // Adapters with getConfig/testConnection
  const cfgAdapters = all.filter(a => typeof a.adapter.getConfig === 'function');
  cfgAdapters.forEach(({ name, adapter }) => {
    it(`${name}.getConfig returns mode + configured`, () => {
      const c = adapter.getConfig();
      expect(c.mode).toBe('mock');
      expect(c.configured).toBe(true);
    });
    it(`${name}.testConnection returns ok in mock`, async () => {
      const r = await adapter.testConnection();
      expect(r.ok).toBe(true);
      expect(r.mode).toBe('mock');
    });
  });
});
