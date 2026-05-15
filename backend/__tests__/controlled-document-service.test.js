'use strict';

/**
 * controlled-document-service.test.js — World-Class QMS Phase 29 Commit 7.
 *
 * Tests for 21 CFR Part 11-compliant controlled documents.
 */

jest.unmock('mongoose');
jest.resetModules();

process.env.NODE_ENV = 'test';

const mongoose = require('mongoose');
const {
  createControlledDocumentService,
} = require('../services/quality/controlledDocument.service');
const registry = require('../config/controlled-document.registry');

let ownServer = null;
let ControlledDocument;
const owner = new mongoose.Types.ObjectId();
const author = new mongoose.Types.ObjectId();
const reviewer = new mongoose.Types.ObjectId();
const approver = new mongoose.Types.ObjectId();

beforeAll(async () => {
  const { MongoMemoryServer } = require('mongodb-memory-server');
  ownServer = await MongoMemoryServer.create();
  const uri = ownServer.getUri();
  if (mongoose.connection.readyState !== 0) {
    try {
      await mongoose.disconnect();
    } catch {
      /* ignore */
    }
  }
  await mongoose.connect(uri, { dbName: 'doc-test', serverSelectionTimeoutMS: 10000 });
  ControlledDocument = require('../models/quality/ControlledDocument.model');
}, 60_000);

afterAll(async () => {
  await mongoose.disconnect();
  if (ownServer) await ownServer.stop();
});

afterEach(async () => {
  await ControlledDocument.deleteMany({});
});

describe('ControlledDocumentService.createDocument + draftNewVersion', () => {
  test('creates a document and increments version numbers', async () => {
    const svc = createControlledDocumentService({ model: ControlledDocument });
    let doc = await svc.createDocument({ title: 'سياسة سلامة المرضى', type: 'policy' }, owner);
    expect(doc.documentNumber).toMatch(/^DOC-\d{4}-\d{4}$/);
    doc = await svc.draftNewVersion(doc._id, { bodyHtml: '<p>v1</p>' }, owner);
    expect(doc.versions).toHaveLength(1);
    expect(doc.versions[0].versionNumber).toBe(1);
    expect(doc.versions[0].contentHash).toHaveLength(64); // sha-256 hex
    doc = await svc.draftNewVersion(
      doc._id,
      { bodyHtml: '<p>v2</p>', changeSummary: 'updated phrasing' },
      owner
    );
    expect(doc.versions).toHaveLength(2);
    expect(doc.versions[1].versionNumber).toBe(2);
    expect(doc.versions[1].changeSummary).toBe('updated phrasing');
  });
});

describe('ControlledDocumentService.signVersion (21 CFR Part 11)', () => {
  test('appends a signature with hash chain link', async () => {
    const svc = createControlledDocumentService({ model: ControlledDocument });
    let doc = await svc.createDocument({ title: 't', type: 'sop' }, owner);
    doc = await svc.draftNewVersion(doc._id, { bodyHtml: '<p>body</p>' }, owner);
    doc = await svc.signVersion(
      doc._id,
      1,
      { meaning: 'authored', reAuthConfirmed: true },
      { _id: author, name: 'Author One', role: 'quality_manager' }
    );
    expect(doc.versions[0].signatures).toHaveLength(1);
    const s = doc.versions[0].signatures[0];
    expect(s.meaning).toBe('authored');
    expect(s.printedName).toBe('Author One');
    expect(s.prevHash).toBe(doc.versions[0].contentHash);
    expect(s.currentHash).toHaveLength(64);
  });

  test('rejects signature without re-auth confirmation', async () => {
    const svc = createControlledDocumentService({ model: ControlledDocument });
    let doc = await svc.createDocument({ title: 't', type: 'sop' }, owner);
    doc = await svc.draftNewVersion(doc._id, { bodyHtml: '<p>x</p>' }, owner);
    await expect(
      svc.signVersion(
        doc._id,
        1,
        { meaning: 'authored', reAuthConfirmed: false },
        { _id: author, role: 'quality_manager' }
      )
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  test('rejects signer whose role cannot sign with that meaning', async () => {
    const svc = createControlledDocumentService({ model: ControlledDocument });
    let doc = await svc.createDocument({ title: 't', type: 'sop' }, owner);
    doc = await svc.draftNewVersion(doc._id, { bodyHtml: '<p>x</p>' }, owner);
    // A "nurse" cannot approve.
    await expect(
      svc.signVersion(
        doc._id,
        1,
        { meaning: 'approved', reAuthConfirmed: true },
        { _id: author, role: 'nurse' }
      )
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  test('auto-advances draft → in_review → approved when all required meanings present', async () => {
    const svc = createControlledDocumentService({ model: ControlledDocument });
    let doc = await svc.createDocument({ title: 't', type: 'sop' }, owner);
    doc = await svc.draftNewVersion(doc._id, { bodyHtml: '<p>x</p>' }, owner);
    expect(doc.versions[0].status).toBe('draft');

    doc = await svc.signVersion(
      doc._id,
      1,
      { meaning: 'authored', reAuthConfirmed: true },
      { _id: author, role: 'quality_manager' }
    );
    expect(doc.versions[0].status).toBe('in_review');

    doc = await svc.signVersion(
      doc._id,
      1,
      { meaning: 'reviewed', reAuthConfirmed: true },
      { _id: reviewer, role: 'department_head' }
    );
    doc = await svc.signVersion(
      doc._id,
      1,
      { meaning: 'approved', reAuthConfirmed: true },
      { _id: approver, role: 'ceo' }
    );
    expect(doc.versions[0].status).toBe('approved');
  });
});

describe('ControlledDocumentService.transitionVersion', () => {
  async function fullyApproved() {
    const svc = createControlledDocumentService({ model: ControlledDocument });
    let doc = await svc.createDocument({ title: 't', type: 'sop' }, owner);
    doc = await svc.draftNewVersion(doc._id, { bodyHtml: '<p>x</p>' }, owner);
    doc = await svc.signVersion(
      doc._id,
      1,
      { meaning: 'authored', reAuthConfirmed: true },
      { _id: author, role: 'quality_manager' }
    );
    doc = await svc.signVersion(
      doc._id,
      1,
      { meaning: 'reviewed', reAuthConfirmed: true },
      { _id: reviewer, role: 'department_head' }
    );
    doc = await svc.signVersion(
      doc._id,
      1,
      { meaning: 'approved', reAuthConfirmed: true },
      { _id: approver, role: 'ceo' }
    );
    return { svc, doc };
  }

  test('blocks moving to effective without all required signatures', async () => {
    const svc = createControlledDocumentService({ model: ControlledDocument });
    let doc = await svc.createDocument({ title: 't', type: 'sop' }, owner);
    doc = await svc.draftNewVersion(doc._id, { bodyHtml: '<p>x</p>' }, owner);
    await svc.signVersion(
      doc._id,
      1,
      { meaning: 'authored', reAuthConfirmed: true },
      { _id: author, role: 'quality_manager' }
    );
    // Only authored exists — reviewed + approved missing.
    await expect(svc.transitionVersion(doc._id, 1, 'effective', owner)).rejects.toMatchObject({
      code: 'ILLEGAL_TRANSITION',
    });
  });

  test('activates version after approval and supersedes earlier effective versions', async () => {
    const { svc, doc: initial } = await fullyApproved();
    let doc = await svc.transitionVersion(initial._id, 1, 'effective', owner);
    expect(doc.activeVersionNumber).toBe(1);
    expect(doc.versions[0].status).toBe('effective');

    // Draft v2 and approve + activate it.
    doc = await svc.draftNewVersion(doc._id, { bodyHtml: '<p>v2</p>' }, owner);
    doc = await svc.signVersion(
      doc._id,
      2,
      { meaning: 'authored', reAuthConfirmed: true },
      { _id: author, role: 'quality_manager' }
    );
    doc = await svc.signVersion(
      doc._id,
      2,
      { meaning: 'reviewed', reAuthConfirmed: true },
      { _id: reviewer, role: 'department_head' }
    );
    doc = await svc.signVersion(
      doc._id,
      2,
      { meaning: 'approved', reAuthConfirmed: true },
      { _id: approver, role: 'ceo' }
    );
    doc = await svc.transitionVersion(doc._id, 2, 'effective', owner);
    expect(doc.activeVersionNumber).toBe(2);
    expect(doc.versions[0].status).toBe('superseded');
    expect(doc.versions[0].supersededByVersionNumber).toBe(2);
  });
});

describe('ControlledDocumentService.verifyIntegrity', () => {
  test('detects tampered signature hash', async () => {
    const svc = createControlledDocumentService({ model: ControlledDocument });
    let doc = await svc.createDocument({ title: 't', type: 'sop' }, owner);
    doc = await svc.draftNewVersion(doc._id, { bodyHtml: '<p>x</p>' }, owner);
    doc = await svc.signVersion(
      doc._id,
      1,
      { meaning: 'authored', reAuthConfirmed: true },
      { _id: author, role: 'quality_manager' }
    );
    // Tamper with the hash.
    doc.versions[0].signatures[0].currentHash = 'bogus_hash';
    await doc.save();
    const result = svc.verifyIntegrity(doc);
    expect(result.ok).toBe(false);
    expect(result.breaks.length).toBeGreaterThan(0);
  });

  test('clean documents verify cleanly', async () => {
    const svc = createControlledDocumentService({ model: ControlledDocument });
    let doc = await svc.createDocument({ title: 't', type: 'sop' }, owner);
    doc = await svc.draftNewVersion(doc._id, { bodyHtml: '<p>x</p>' }, owner);
    doc = await svc.signVersion(
      doc._id,
      1,
      { meaning: 'authored', reAuthConfirmed: true },
      { _id: author, role: 'quality_manager' }
    );
    doc = await svc.signVersion(
      doc._id,
      1,
      { meaning: 'reviewed', reAuthConfirmed: true },
      { _id: reviewer, role: 'department_head' }
    );
    const result = svc.verifyIntegrity(doc);
    expect(result.ok).toBe(true);
    expect(result.breaks).toHaveLength(0);
  });
});

describe('ControlledDocumentService.acknowledgeRead', () => {
  test('only allowed on effective versions; idempotent', async () => {
    const svc = createControlledDocumentService({ model: ControlledDocument });
    let doc = await svc.createDocument({ title: 't', type: 'sop' }, owner);
    doc = await svc.draftNewVersion(doc._id, { bodyHtml: '<p>x</p>' }, owner);
    // not yet effective → rejected
    const reader = new mongoose.Types.ObjectId();
    await expect(svc.acknowledgeRead(doc._id, 1, reader)).rejects.toMatchObject({
      code: 'INVALID_PHASE',
    });
    // walk to effective
    doc = await svc.signVersion(
      doc._id,
      1,
      { meaning: 'authored', reAuthConfirmed: true },
      { _id: author, role: 'quality_manager' }
    );
    doc = await svc.signVersion(
      doc._id,
      1,
      { meaning: 'reviewed', reAuthConfirmed: true },
      { _id: reviewer, role: 'department_head' }
    );
    doc = await svc.signVersion(
      doc._id,
      1,
      { meaning: 'approved', reAuthConfirmed: true },
      { _id: approver, role: 'ceo' }
    );
    doc = await svc.transitionVersion(doc._id, 1, 'effective', owner);
    doc = await svc.acknowledgeRead(doc._id, 1, reader);
    expect(doc.versions[0].readAcknowledgements).toHaveLength(1);
    // idempotent
    doc = await svc.acknowledgeRead(doc._id, 1, reader);
    expect(doc.versions[0].readAcknowledgements).toHaveLength(1);
  });
});

describe('ControlledDocumentService.revokeSignature', () => {
  test('marks original sig as revoked and appends a witnessed counter-entry', async () => {
    const svc = createControlledDocumentService({ model: ControlledDocument });
    let doc = await svc.createDocument({ title: 't', type: 'sop' }, owner);
    doc = await svc.draftNewVersion(doc._id, { bodyHtml: '<p>x</p>' }, owner);
    doc = await svc.signVersion(
      doc._id,
      1,
      { meaning: 'authored', reAuthConfirmed: true },
      { _id: author, role: 'quality_manager' }
    );
    const sigId = doc.versions[0].signatures[0]._id;
    doc = await svc.revokeSignature(doc._id, 1, sigId, 'incorrect document content', owner);
    const original = doc.versions[0].signatures.id(sigId);
    expect(original.revokedByEntryId).toBeTruthy();
    expect(original.revocationReason).toBe('incorrect document content');
    expect(doc.versions[0].signatures).toHaveLength(2); // original + revocation entry
  });
});

describe('Registry constants are exposed correctly', () => {
  test('REQUIRED_SIGNATURES_FOR_EFFECTIVE has the three classic meanings', () => {
    expect(registry.REQUIRED_SIGNATURES_FOR_EFFECTIVE).toEqual(
      expect.arrayContaining(['authored', 'reviewed', 'approved'])
    );
  });

  test('SIGNATURE_MEANINGS has the five 21 CFR meanings', () => {
    expect(registry.SIGNATURE_MEANINGS).toHaveLength(5);
    expect(registry.SIGNATURE_MEANINGS.map(s => s.code)).toEqual(
      expect.arrayContaining(['authored', 'reviewed', 'approved', 'witnessed', 'acknowledged'])
    );
  });
});
