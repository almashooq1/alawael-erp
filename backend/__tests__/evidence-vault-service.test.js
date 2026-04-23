'use strict';

/**
 * evidence-vault-service.test.js — Phase 13 Commit 2 (4.0.56).
 *
 * Integration tests for the compliance evidence vault using
 * mongodb-memory-server. Covers ingestion, hashing, verification,
 * supersession, revocation, signatures, legal-hold, queries, and
 * retention-policy defaults.
 */

process.env.NODE_ENV = 'test';

const crypto = require('crypto');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const { createEvidenceVaultService } = require('../services/quality/evidenceVault.service');
const {
  EVIDENCE_TYPES,
  EXPIRY_WARNING_DAYS,
  RETENTION_POLICIES,
} = require('../config/evidence.registry');

let mongoServer;
let EvidenceItem;

const userA = new mongoose.Types.ObjectId();
const userB = new mongoose.Types.ObjectId();
const branch1 = new mongoose.Types.ObjectId();

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function makeDispatcher() {
  const events = [];
  return {
    events,
    async emit(name, payload) {
      events.push({ name, payload });
    },
  };
}

// ── setup ──────────────────────────────────────────────────────────

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  if (mongoose.connection.readyState !== 0) {
    try {
      await mongoose.disconnect();
    } catch {
      /* ignore */
    }
  }
  await mongoose.connect(mongoServer.getUri(), { dbName: 'evidence-vault-test' });
  EvidenceItem = require('../models/quality/EvidenceItem.model');
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

afterEach(async () => {
  await EvidenceItem.deleteMany({});
});

// ── tests ──────────────────────────────────────────────────────────

describe('EvidenceVaultService', () => {
  function svc(dispatcher) {
    return createEvidenceVaultService({ model: EvidenceItem, dispatcher });
  }

  describe('ingest', () => {
    it('stores a metadata-only item with auto code and retention', async () => {
      const d = makeDispatcher();
      const doc = await svc(d).ingest(
        {
          title: 'Fire Drill Report 2026-Q1',
          type: 'audit_finding',
          sourceModule: 'quality',
          regulationRefs: [
            { standard: 'cbahi', clause: 'FMS.07' },
            { standard: 'jci', clause: 'FMS.11' },
          ],
          branchId: branch1,
          validFrom: '2026-01-15T08:00:00Z',
          validUntil: '2027-01-15T08:00:00Z',
        },
        userA
      );

      expect(doc.code).toMatch(/^EV-\d{4}-000001$/);
      expect(doc.status).toBe('valid');
      expect(doc.retention.policy).toBe('quality_audit');
      expect(doc.retention.destroyAfter).toBeInstanceOf(Date);
      // destroyAfter = collectedAt + 5 years (quality_audit)
      const years = RETENTION_POLICIES.quality_audit.years;
      const expected = new Date(doc.collectedAt);
      expected.setUTCFullYear(expected.getUTCFullYear() + years);
      expect(doc.retention.destroyAfter.getTime()).toBe(expected.getTime());

      expect(d.events.map(e => e.name)).toContain('compliance.evidence.ingested');
    });

    it('hashes a buffer when provided', async () => {
      const s = svc();
      const content = Buffer.from('policy-v2 body text');
      const doc = await s.ingest(
        {
          title: 'Policy v2',
          type: 'document',
          sourceModule: 'governance',
          buffer: content,
          file: { storageClass: 'local', storageKey: '/vault/policy-v2' },
        },
        userA
      );
      expect(doc.file.hash).toBe(sha256(content));
      expect(doc.file.hashAlgorithm).toBe('sha256');
      expect(doc.file.sizeBytes).toBe(content.length);
    });

    it('rejects malformed pre-computed hash', async () => {
      await expect(
        svc().ingest(
          {
            title: 'x',
            type: 'document',
            sourceModule: 'governance',
            file: { storageClass: 'inline', hash: 'not-a-hash' },
          },
          userA
        )
      ).rejects.toMatchObject({ code: 'BAD_HASH' });
    });

    it('applies the type-to-policy default mapping', async () => {
      const s = svc();
      const credDoc = await s.ingest(
        { title: 'License', type: 'credential', sourceModule: 'hr' },
        userA
      );
      expect(credDoc.retention.policy).toBe('hr_active');

      const logDoc = await s.ingest(
        { title: 'Access log snap', type: 'log', sourceModule: 'security' },
        userA
      );
      expect(logDoc.retention.policy).toBe('access_log');
    });

    it('honours an explicit retentionPolicy override', async () => {
      const doc = await svc().ingest(
        {
          title: 'Clinical note evidence',
          type: 'document',
          sourceModule: 'clinical',
          retentionPolicy: 'clinical_critical',
        },
        userA
      );
      expect(doc.retention.policy).toBe('clinical_critical');
    });
  });

  describe('verify', () => {
    it('returns ok when recomputed hash matches and not expired', async () => {
      const s = svc();
      const buf = Buffer.from('hello-vault');
      const doc = await s.ingest(
        {
          title: 'Doc',
          type: 'document',
          sourceModule: 'governance',
          buffer: buf,
          validUntil: '2099-01-01',
        },
        userA
      );
      const result = await s.verify(doc._id, buf);
      expect(result.ok).toBe(true);
      expect(result.effectiveStatus).toBe('valid');
      expect(result.recomputedHash).toBe(result.storedHash);
    });

    it('flags mismatch when buffer was tampered', async () => {
      const s = svc();
      const original = Buffer.from('hello-vault');
      const tampered = Buffer.from('hello-vault-evil');
      const doc = await s.ingest(
        {
          title: 'Doc',
          type: 'document',
          sourceModule: 'governance',
          buffer: original,
          validUntil: '2099-01-01',
        },
        userA
      );
      const result = await s.verify(doc._id, tampered);
      expect(result.ok).toBe(false);
      expect(result.recomputedHash).not.toBe(result.storedHash);
    });

    it('metadata-only check reports effective status', async () => {
      const s = svc();
      const doc = await s.ingest(
        {
          title: 'Old credential',
          type: 'credential',
          sourceModule: 'hr',
          validUntil: new Date(Date.now() - 86400000), // expired yesterday
        },
        userA
      );
      const result = await s.verify(doc._id, null);
      expect(result.effectiveStatus).toBe('expired');
      expect(result.ok).toBe(false);
    });

    it('NO_HASH when buffer supplied but item has none', async () => {
      const s = svc();
      const doc = await s.ingest(
        { title: 'x', type: 'attestation', sourceModule: 'governance' },
        userA
      );
      await expect(s.verify(doc._id, Buffer.from('abc'))).rejects.toMatchObject({
        code: 'NO_HASH',
      });
    });
  });

  describe('supersede', () => {
    it('chains old → new and flips old to superseded', async () => {
      const d = makeDispatcher();
      const s = svc(d);
      const v1 = await s.ingest(
        {
          title: 'Policy v1',
          type: 'document',
          sourceModule: 'governance',
          regulationRefs: [{ standard: 'iso_9001', clause: '7.5' }],
        },
        userA
      );
      const { old, new: v2 } = await s.supersede(
        v1._id,
        { title: 'Policy v2', buffer: Buffer.from('v2') },
        userA
      );

      expect(old.status).toBe('superseded');
      expect(String(old.supersededBy)).toBe(String(v2._id));
      expect(String(v2.supersedes)).toBe(String(old._id));
      // regulation mapping carried forward
      expect(v2.regulationRefs.map(r => r.clause)).toContain('7.5');

      const names = d.events.map(e => e.name);
      expect(names).toContain('compliance.evidence.superseded');
    });

    it('rejects supersede on already-terminal item', async () => {
      const s = svc();
      const v1 = await s.ingest(
        { title: 'x', type: 'document', sourceModule: 'governance' },
        userA
      );
      await s.revoke(v1._id, 'wrong data', userA);
      await expect(s.supersede(v1._id, { title: 'y' }, userA)).rejects.toMatchObject({
        code: 'ILLEGAL_TRANSITION',
      });
    });
  });

  describe('revoke', () => {
    it('requires a reason', async () => {
      const s = svc();
      const doc = await s.ingest(
        { title: 'x', type: 'document', sourceModule: 'governance' },
        userA
      );
      await expect(s.revoke(doc._id, '', userA)).rejects.toThrow(/reason/);
    });

    it('revokes and is idempotent', async () => {
      const d = makeDispatcher();
      const s = svc(d);
      const doc = await s.ingest(
        { title: 'x', type: 'document', sourceModule: 'governance' },
        userA
      );
      const r1 = await s.revoke(doc._id, 'legal review', userA);
      const r2 = await s.revoke(doc._id, 'again', userA);
      expect(r1.status).toBe('revoked');
      expect(r2.revokedReason).toBe('legal review'); // no overwrite
      expect(d.events.filter(e => e.name === 'compliance.evidence.revoked')).toHaveLength(1);
    });
  });

  describe('sign', () => {
    it('appends a signature with user + role snapshot', async () => {
      const s = svc();
      const doc = await s.ingest(
        { title: 'Attestation', type: 'attestation', sourceModule: 'governance' },
        userA
      );
      const after = await s.sign(
        doc._id,
        { role: 'quality_manager', intent: 'approval', nameSnapshot: 'QM Khalid' },
        userB
      );
      expect(after.signatures).toHaveLength(1);
      expect(after.signatures[0].role).toBe('quality_manager');
      expect(String(after.signatures[0].userId)).toBe(String(userB));
    });

    it('rejects signing on revoked item', async () => {
      const s = svc();
      const doc = await s.ingest(
        { title: 'x', type: 'document', sourceModule: 'governance' },
        userA
      );
      await s.revoke(doc._id, 'reason', userA);
      await expect(s.sign(doc._id, { role: 'admin' }, userA)).rejects.toMatchObject({
        code: 'ILLEGAL_TRANSITION',
      });
    });
  });

  describe('legal hold', () => {
    it('sets and clears the hold flag', async () => {
      const s = svc();
      const doc = await s.ingest(
        { title: 'x', type: 'document', sourceModule: 'governance' },
        userA
      );
      const held = await s.setLegalHold(doc._id, 'regulator request #42', userA);
      expect(held.retention.legalHold).toBe(true);
      expect(held.retention.legalHoldReason).toMatch(/regulator/);

      const cleared = await s.clearLegalHold(doc._id, userA);
      expect(cleared.retention.legalHold).toBe(false);
      expect(cleared.retention.legalHoldReason).toBeNull();
    });
  });

  describe('queries', () => {
    it('findExpiring returns only items within the horizon', async () => {
      const s = svc();
      const soon = new Date(Date.now() + 10 * 86400000);
      const far = new Date(Date.now() + 365 * 86400000);

      await s.ingest(
        {
          title: 'Expiring soon',
          type: 'credential',
          sourceModule: 'hr',
          validUntil: soon,
        },
        userA
      );
      await s.ingest(
        {
          title: 'Expiring far',
          type: 'credential',
          sourceModule: 'hr',
          validUntil: far,
        },
        userA
      );

      const rows = await s.findExpiring(EXPIRY_WARNING_DAYS);
      expect(rows).toHaveLength(1);
      expect(rows[0].title).toBe('Expiring soon');
    });

    it('getStats returns correct buckets', async () => {
      const s = svc();
      // Valid (no expiry)
      await s.ingest({ title: 'A', type: 'document', sourceModule: 'governance' }, userA);
      // Expiring soon
      await s.ingest(
        {
          title: 'B',
          type: 'credential',
          sourceModule: 'hr',
          validUntil: new Date(Date.now() + 5 * 86400000),
        },
        userA
      );
      // Already expired
      await s.ingest(
        {
          title: 'C',
          type: 'credential',
          sourceModule: 'hr',
          validUntil: new Date(Date.now() - 86400000),
        },
        userA
      );
      // Revoked
      const rev = await s.ingest(
        { title: 'D', type: 'document', sourceModule: 'governance' },
        userA
      );
      await s.revoke(rev._id, 'r', userA);

      const stats = await s.getStats();
      expect(stats.total).toBe(4);
      expect(stats.valid).toBe(1);
      expect(stats.expiring).toBe(1);
      expect(stats.expired).toBe(1);
      expect(stats.revoked).toBe(1);
    });

    it('list filters by type, status and source module', async () => {
      const s = svc();
      await s.ingest({ title: 'HR cred', type: 'credential', sourceModule: 'hr' }, userA);
      await s.ingest({ title: 'Policy', type: 'document', sourceModule: 'governance' }, userA);

      const credentials = await s.list({ type: 'credential' });
      expect(credentials).toHaveLength(1);
      expect(credentials[0].title).toBe('HR cred');

      const hrOnly = await s.list({ sourceModule: 'hr' });
      expect(hrOnly).toHaveLength(1);
    });
  });

  describe('model-level guards', () => {
    it('registry lists every evidence type the schema allows', () => {
      // Smoke test: registry vs enum stay in sync.
      const schemaEnum = EvidenceItem.schema.path('type').enumValues;
      expect(schemaEnum.sort()).toEqual([...EVIDENCE_TYPES].sort());
    });
  });
});
