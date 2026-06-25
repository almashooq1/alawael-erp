'use strict';

/**
 * document-model-hooks-producer-wave1501.test.js - W1510.
 *
 * Runtime guard for the Document-model producers added in W1510:
 *   - document.updated fires on post('save') for non-new documents
 *   - document.updated fires on post('findOneAndUpdate')
 *   - document.deleted fires on post('findOneAndDelete')
 *   - document.shared fires from the sharing service
 *
 * We mock documentEventPublisher so the test exercises the hook wiring
 * without needing the full integration bus + subscribers stack.
 */

jest.unmock('mongoose');
jest.setTimeout(90000);

jest.mock('../services/documents/documentEventPublisher.service', () => ({
  publish: jest.fn().mockResolvedValue(null),
}));

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let Document;
const eventPublisher = require('../services/documents/documentEventPublisher.service');

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1501-doc-hooks' } });
  await mongoose.connect(mongod.getUri());
  Document = require('../models/Document');
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

afterEach(async () => {
  await Document.deleteMany({});
  eventPublisher.publish.mockClear();
});

function makeDoc(extra = {}) {
  return Document.create({
    fileName: 'report.pdf',
    originalFileName: 'report.pdf',
    fileSize: 1024,
    filePath: '/tmp/report.pdf',
    title: 'Report',
    uploadedBy: new mongoose.Types.ObjectId(),
    entityType: 'beneficiary',
    entityId: new mongoose.Types.ObjectId().toString(),
    sourceModule: 'medical',
    ...extra,
  });
}

describe('W1510 - Document model hooks emit core lifecycle events', () => {
  it('post(save) emits document.updated when an existing document is modified', async () => {
    const doc = await makeDoc();
    eventPublisher.publish.mockClear();

    doc.title = 'Updated Report';
    await doc.save();

    expect(eventPublisher.publish).toHaveBeenCalledTimes(1);
    expect(eventPublisher.publish).toHaveBeenCalledWith(
      'updated',
      expect.objectContaining({
        documentId: String(doc._id),
        entityType: 'beneficiary',
        sourceModule: 'medical',
      })
    );
  });

  it('does NOT emit document.updated when a new document is created', async () => {
    await makeDoc();
    expect(eventPublisher.publish).not.toHaveBeenCalled();
  });

  it('post(findOneAndUpdate) emits document.updated', async () => {
    const doc = await makeDoc();
    eventPublisher.publish.mockClear();

    await Document.findByIdAndUpdate(doc._id, { title: 'Patched Title' });

    expect(eventPublisher.publish).toHaveBeenCalledTimes(1);
    expect(eventPublisher.publish).toHaveBeenCalledWith(
      'updated',
      expect.objectContaining({
        documentId: String(doc._id),
        entityType: 'beneficiary',
      })
    );
  });

  it('sharing service emits document.shared', async () => {
    const doc = await makeDoc();
    eventPublisher.publish.mockClear();

    const sharingService = require('../services/documents/documentSharing.service');
    await sharingService.shareWithUser(doc._id, new mongoose.Types.ObjectId(), {
      recipientId: new mongoose.Types.ObjectId(),
      permission: 'view',
    });

    expect(eventPublisher.publish).toHaveBeenCalledWith(
      'shared',
      expect.objectContaining({
        documentId: String(doc._id),
        entityType: 'beneficiary',
        shareType: 'user',
      })
    );
  });

  it('post(findOneAndDelete) emits document.deleted', async () => {
    const doc = await makeDoc();
    eventPublisher.publish.mockClear();

    await Document.findByIdAndDelete(doc._id);

    expect(eventPublisher.publish).toHaveBeenCalledTimes(1);
    expect(eventPublisher.publish).toHaveBeenCalledWith(
      'deleted',
      expect.objectContaining({
        documentId: String(doc._id),
        entityType: 'beneficiary',
      })
    );
  });
});
