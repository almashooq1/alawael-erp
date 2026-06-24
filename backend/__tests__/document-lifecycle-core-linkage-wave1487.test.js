'use strict';

/**
 * document-lifecycle-core-linkage-wave1487.test.js — W1487.
 *
 * Runtime guard for the document-domain → unified-core wiring added in the
 * document-subscriber follow-up. The W392 / W998 drift guards prove the
 * subscriber pattern exists and its literals fit the CareTimeline schema, but
 * only a real save exercises the full handler path (mongoose casting, enum
 * validation, recordEvent static, metadata snapshot).
 *
 * We directly invoke the wildcard subscriber handler so the test is isolated
 * from integration-bus singleton state across the chunked sprint suite.
 */

jest.unmock('mongoose');
jest.setTimeout(90000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { waitForRows } = require('./helpers/waitForTimelineRows');

let mongod;
let CareTimeline;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1487-doc-core' } });
  await mongoose.connect(mongod.getUri());
  ({ CareTimeline } = require('../domains/timeline/models/CareTimeline'));
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

afterEach(async () => {
  await CareTimeline.deleteMany({});
});

function findDocumentSubscriber() {
  const { createSubscribers } = require('../integration/crossModuleSubscribers');
  const subscriber = createSubscribers(null, null).find(s => s.pattern === 'documents.document.*');
  expect(subscriber).toBeTruthy();
  return subscriber;
}

describe('W1487 — Beneficiary-linked document events reach the unified-core timeline', () => {
  it('document.uploaded writes a document_uploaded CareTimeline row', async () => {
    const subscriber = findDocumentSubscriber();
    const beneficiaryId = new mongoose.Types.ObjectId();
    const documentId = new mongoose.Types.ObjectId();

    await subscriber.handler({
      domain: 'documents',
      eventType: 'document.uploaded',
      payload: {
        documentId,
        entityType: 'beneficiary',
        entityId: String(beneficiaryId),
        fileName: 'assessment-report.pdf',
        sourceModule: 'medical',
        uploadedBy: new mongoose.Types.ObjectId().toString(),
      },
      metadata: { timestamp: new Date().toISOString() },
    });

    const rows = await waitForRows({ beneficiaryId, eventType: 'document_uploaded' }, 1);
    expect(rows).toHaveLength(1);
    const tl = rows[0];
    expect(tl.category).toBe('communication');
    expect(tl.severity).toBe('info');
    expect(String(tl.relatedEntity.id)).toBe(String(documentId));
    expect(tl.relatedEntity.label).toBe('assessment-report.pdf');
    expect(tl.metadata.sourceEventType).toBe('document.uploaded');
    expect(tl.metadata.fileName).toBe('assessment-report.pdf');
  });

  it('document.shared writes a document_shared row for a beneficiary', async () => {
    const subscriber = findDocumentSubscriber();
    const beneficiaryId = new mongoose.Types.ObjectId();
    const documentId = new mongoose.Types.ObjectId();

    await subscriber.handler({
      domain: 'documents',
      eventType: 'document.shared',
      payload: {
        documentId,
        entityType: 'beneficiary',
        entityId: String(beneficiaryId),
        fileName: 'care-plan.pdf',
        sourceModule: 'documents',
        sharedWith: ['family@example.com'],
      },
      metadata: { timestamp: new Date().toISOString() },
    });

    const rows = await waitForRows({ beneficiaryId, eventType: 'document_shared' }, 1);
    expect(rows).toHaveLength(1);
    expect(rows[0].title).toContain('shared');
  });

  it('ignores document events not linked to a beneficiary', async () => {
    const subscriber = findDocumentSubscriber();
    const employeeId = new mongoose.Types.ObjectId();
    const documentId = new mongoose.Types.ObjectId();

    await subscriber.handler({
      domain: 'documents',
      eventType: 'document.uploaded',
      payload: {
        documentId,
        entityType: 'employee',
        entityId: String(employeeId),
        fileName: 'contract.pdf',
      },
      metadata: { timestamp: new Date().toISOString() },
    });

    const rows = await CareTimeline.find({}).lean();
    expect(rows).toHaveLength(0);
  });

  it('maps unknown document event types to document_uploaded safely', async () => {
    const subscriber = findDocumentSubscriber();
    const beneficiaryId = new mongoose.Types.ObjectId();
    const documentId = new mongoose.Types.ObjectId();

    await subscriber.handler({
      domain: 'documents',
      eventType: 'document.unknown_future_event',
      payload: {
        documentId,
        entityType: 'beneficiary',
        entityId: String(beneficiaryId),
        fileName: 'future.pdf',
      },
      metadata: { timestamp: new Date().toISOString() },
    });

    const rows = await waitForRows({ beneficiaryId, eventType: 'document_uploaded' }, 1);
    expect(rows).toHaveLength(1);
  });
});
