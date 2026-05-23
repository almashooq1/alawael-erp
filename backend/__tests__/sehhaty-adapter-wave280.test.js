/**
 * sehhaty-adapter-wave280.test.js — Sehhaty/Tawakkalna integration (W280).
 *
 * Two layers verified:
 *   (A) Adapter (`sehhatyAdapter.js`) — pure transport, mock-first.
 *   (B) Service (`sehhaty.service.js`) — CONSENT GATE + audit + persistence.
 *
 * The PHI-critical gate is the service's `checkConsent()`; without a
 * valid, non-revoked, non-expired `Consent` of correct type, NO call
 * reaches the adapter. Tests 9-14 cover every reject path.
 */

'use strict';

jest.unmock('mongoose');

const adapter = require('../services/sehhatyAdapter');
const sehhatyServiceFactory = require('../services/sehhaty.service');

describe('W280 — Sehhaty adapter + service (consent-gated PHI import)', () => {
  // ── A. Adapter layer ─────────────────────────────────────────────────
  describe('adapter shape + mock behavior', () => {
    it('exports the public surface', () => {
      expect(typeof adapter.importHealthSummary).toBe('function');
      expect(typeof adapter.pullVaccinationRecords).toBe('function');
      expect(typeof adapter.linkTawakkalna).toBe('function');
      expect(typeof adapter.getConfig).toBe('function');
    });

    it('importHealthSummary returns synthetic but plausible summary', async () => {
      const result = await adapter.importHealthSummary({
        nationalId: '1234567890',
        consentRecordId: 'consent-1',
      });
      expect(result.summary).toBeTruthy();
      expect(result.summary.demographics.nationalId).toBe('1234567890');
      expect(Array.isArray(result.summary.activeConditions)).toBe(true);
      expect(result.source).toBe('sehhaty');
    });

    it('importHealthSummary: nationalId ending 99 → throws CONSENT_REVOKED_AT_SOURCE', async () => {
      await expect(
        adapter.importHealthSummary({ nationalId: '1234567899', consentRecordId: 'c1' })
      ).rejects.toMatchObject({ code: 'SEHHATY_CONSENT_REVOKED_AT_SOURCE' });
    });

    it('importHealthSummary: nationalId ending 88 → returns NO_RECORDS_AT_SOURCE', async () => {
      const r = await adapter.importHealthSummary({
        nationalId: '1234567888',
        consentRecordId: 'c1',
      });
      expect(r.summary).toBeNull();
      expect(r.reason).toBe('NO_RECORDS_AT_SOURCE');
    });

    it('requires consentRecordId at adapter layer too (defense-in-depth)', async () => {
      await expect(adapter.importHealthSummary({ nationalId: '1234567890' })).rejects.toMatchObject(
        { code: 'SEHHATY_INVALID_INPUT' }
      );
    });

    it('pullVaccinationRecords returns 4 mock entries', async () => {
      const r = await adapter.pullVaccinationRecords({
        nationalId: '1234567890',
        consentRecordId: 'c1',
      });
      expect(r.vaccinations.length).toBe(4);
      expect(r.vaccinations[0]).toMatchObject({
        vaccine: expect.any(String),
        date: expect.any(String),
      });
    });

    it('linkTawakkalna rejects short token', async () => {
      await expect(
        adapter.linkTawakkalna({ nationalId: '1234567890', guardianTawakkalnaToken: 'short' })
      ).rejects.toMatchObject({ code: 'SEHHATY_INVALID_TAWAKKALNA_TOKEN' });
    });

    it('linkTawakkalna returns linkId for valid token', async () => {
      const r = await adapter.linkTawakkalna({
        nationalId: '1234567890',
        guardianTawakkalnaToken: 'long-enough-token-1234567890',
      });
      expect(r.linkId).toMatch(/^twk-/);
      expect(r.linkedAt).toBeInstanceOf(Date);
    });
  });

  // ── B. Service layer (consent gate) ──────────────────────────────────
  describe('service: consent gate enforced before adapter call', () => {
    let svc;
    let consentStore;
    let auditEvents;
    let MockAuditLogger;
    let MockConsent;

    beforeEach(() => {
      consentStore = new Map();
      auditEvents = [];
      MockConsent = {
        findById(id) {
          return Promise.resolve(consentStore.get(id) || null);
        },
      };
      MockAuditLogger = {
        async log(entry) {
          auditEvents.push(entry);
        },
      };
      svc = sehhatyServiceFactory({
        adapter,
        ConsentModel: MockConsent,
        AuditLogger: MockAuditLogger,
        enforceMfa: true,
      });
    });

    function seedConsent({ id, beneficiaryId, type, revokedAt, expiresAt }) {
      consentStore.set(id, {
        _id: id,
        beneficiaryId,
        type: type || 'health_summary_import',
        revokedAt: revokedAt || null,
        expiresAt: expiresAt || null,
      });
    }

    it('rejects when consent record not found', async () => {
      await expect(
        svc.importHealthSummary({
          beneficiaryId: 'b1',
          nationalId: '1234567890',
          consentRecordId: 'missing',
          actor: { userId: 'u1', mfaTier: 1 },
        })
      ).rejects.toMatchObject({ code: 'SEHHATY_CONSENT_NOT_FOUND' });
    });

    it('rejects when consent belongs to a different beneficiary', async () => {
      seedConsent({ id: 'c1', beneficiaryId: 'b-other' });
      await expect(
        svc.importHealthSummary({
          beneficiaryId: 'b1',
          nationalId: '1234567890',
          consentRecordId: 'c1',
          actor: { userId: 'u1', mfaTier: 1 },
        })
      ).rejects.toMatchObject({ code: 'SEHHATY_CONSENT_MISMATCH' });
    });

    it('rejects when consent type insufficient', async () => {
      seedConsent({ id: 'c1', beneficiaryId: 'b1', type: 'photography' });
      await expect(
        svc.importHealthSummary({
          beneficiaryId: 'b1',
          nationalId: '1234567890',
          consentRecordId: 'c1',
          actor: { userId: 'u1', mfaTier: 1 },
        })
      ).rejects.toMatchObject({ code: 'SEHHATY_CONSENT_TYPE_INSUFFICIENT' });
    });

    it('rejects when consent revoked', async () => {
      seedConsent({ id: 'c1', beneficiaryId: 'b1', revokedAt: new Date() });
      await expect(
        svc.importHealthSummary({
          beneficiaryId: 'b1',
          nationalId: '1234567890',
          consentRecordId: 'c1',
          actor: { userId: 'u1', mfaTier: 1 },
        })
      ).rejects.toMatchObject({ code: 'SEHHATY_CONSENT_REVOKED' });
    });

    it('rejects when consent expired', async () => {
      seedConsent({
        id: 'c1',
        beneficiaryId: 'b1',
        expiresAt: new Date(Date.now() - 1000),
      });
      await expect(
        svc.importHealthSummary({
          beneficiaryId: 'b1',
          nationalId: '1234567890',
          consentRecordId: 'c1',
          actor: { userId: 'u1', mfaTier: 1 },
        })
      ).rejects.toMatchObject({ code: 'SEHHATY_CONSENT_EXPIRED' });
    });

    it('enforceMfa:true rejects actor with mfaTier=0', async () => {
      seedConsent({ id: 'c1', beneficiaryId: 'b1' });
      await expect(
        svc.importHealthSummary({
          beneficiaryId: 'b1',
          nationalId: '1234567890',
          consentRecordId: 'c1',
          actor: { userId: 'u1', mfaTier: 0 },
        })
      ).rejects.toMatchObject({ code: 'SEHHATY_MFA_INSUFFICIENT' });
    });

    it('happy path: returns summary + hash + consent ref + audit', async () => {
      seedConsent({ id: 'c1', beneficiaryId: 'b1' });
      const result = await svc.importHealthSummary({
        beneficiaryId: 'b1',
        nationalId: '1234567890',
        consentRecordId: 'c1',
        actor: { userId: 'u1', mfaTier: 1 },
      });
      expect(result.summary).toBeTruthy();
      expect(result.summaryHash).toMatch(/^[a-f0-9]{64}$/);
      expect(String(result.consentRecordId)).toBe('c1');

      // Audit emitted (success path)
      expect(auditEvents.length).toBe(1);
      expect(auditEvents[0]).toMatchObject({
        component: 'sehhaty',
        action: 'import_health_summary_success',
        beneficiaryId: 'b1',
        summaryHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      });
    });

    it('failed import still emits audit event', async () => {
      seedConsent({ id: 'c1', beneficiaryId: 'b1' });
      await expect(
        svc.importHealthSummary({
          beneficiaryId: 'b1',
          nationalId: '1234567899', // mock-trip CONSENT_REVOKED_AT_SOURCE
          consentRecordId: 'c1',
          actor: { userId: 'u1', mfaTier: 1 },
        })
      ).rejects.toMatchObject({ code: 'SEHHATY_CONSENT_REVOKED_AT_SOURCE' });
      expect(auditEvents[0].action).toBe('import_health_summary_failed');
    });
  });

  // ── C. Consent model extension ───────────────────────────────────────
  describe('Consent model extended with W280 + W284 types', () => {
    it('Consent.CONSENT_TYPES includes health_summary_import', () => {
      const { CONSENT_TYPES } = require('../models/Consent');
      expect(CONSENT_TYPES).toContain('health_summary_import');
      expect(CONSENT_TYPES).toContain('voice_recording');
      expect(CONSENT_TYPES).toContain('motion_recording');
    });
  });
});
