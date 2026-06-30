'use strict';

/**
 * document-audit-getauditlog-shape.test.js
 *
 * documentAdvanced GET /audit/verify-chain + /audit/suspicious called the POSITIONAL
 * `getAuditLog(documentId, options)` with a single filter OBJECT as the first arg:
 *   getAuditLog({ documentId, type: 'integrity_check' })
 *   getAuditLog({ ...req.query, severity: 'high' })
 * → `documentId` was the object → `query = { documentId: {…} }` → Mongoose CastError
 * → BOTH endpoints 500 on every call.
 *
 * Fix: pass documentId positionally; make the service's documentId optional (so the
 * cross-document /audit/suspicious severity query works). DocumentAuditLog has a real
 * `severity` field but no `type`, so the dropped type filter was a no-op anyway.
 */

const fs = require('fs');
const path = require('path');

describe('document-audit getAuditLog call shape (static)', () => {
  const route = fs.readFileSync(
    path.join(__dirname, '..', 'routes', 'documentAdvanced.routes.js'),
    'utf8'
  );
  const svc = fs.readFileSync(
    path.join(__dirname, '..', 'services', 'documents', 'documentAudit.service.js'),
    'utf8'
  );
  test('routes pass documentId POSITIONALLY, not as a filter object', () => {
    expect(route).toMatch(/getAuditLog\(\s*req\.query\.documentId\s*,/);
    expect(route).toMatch(/getAuditLog\(\s*req\.query\.documentId\s*\|\|\s*null\s*,/);
    expect(route).not.toMatch(/getAuditLog\(\{/);
  });
  test('service treats documentId as optional (no forced { documentId } cast)', () => {
    expect(svc).toMatch(/const query = \{\};\s*[\r\n]+\s*if \(documentId\) query\.documentId = documentId;/);
    expect(svc).not.toMatch(/const query = \{ documentId \};/);
  });
});

describe('document-audit getAuditLog behavioral', () => {
  jest.unmock('mongoose');
  jest.setTimeout(60000);
  let mongoose;
  let mongod;
  let svc;
  let AuditLog;

  beforeAll(async () => {
    mongoose = require('mongoose');
    const { MongoMemoryServer } = require('mongodb-memory-server');
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'doc-audit-shape' } });
    await mongoose.connect(mongod.getUri());
    svc = require('../services/documents/documentAudit.service.js');
    AuditLog = svc.AuditLog;
  });

  afterAll(async () => {
    await mongoose.disconnect().catch(() => null);
    if (mongod) await mongod.stop().catch(() => null);
  });

  test('per-document query returns that document, and a cross-document severity query works (no 500)', async () => {
    const docA = new mongoose.Types.ObjectId();
    const docB = new mongoose.Types.ObjectId();
    await AuditLog.collection.insertMany([
      { documentId: docA, sequenceNumber: 1, currentHash: 'h1', severity: 'low', createdAt: new Date() },
      { documentId: docA, sequenceNumber: 2, currentHash: 'h2', severity: 'high', createdAt: new Date() },
      { documentId: docB, sequenceNumber: 1, currentHash: 'h3', severity: 'high', createdAt: new Date() },
    ]);

    // verify-chain style: documentId positional
    const perDoc = await svc.getAuditLog(docA, {});
    expect(perDoc.success).toBe(true);
    expect(perDoc.total).toBe(2);

    // suspicious style: null documentId + severity filter (cross-document)
    const suspicious = await svc.getAuditLog(null, { severity: 'high' });
    expect(suspicious.success).toBe(true);
    expect(suspicious.total).toBe(2); // docA#2 + docB#1, across documents — not a 500
  });
});
