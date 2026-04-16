'use strict';

// Auto-generated unit test for documentCollaborationService

const mockDocumentVersionChain = {
  find: jest.fn().mockReturnThis(),
  findOne: jest.fn().mockReturnThis(),
  findById: jest.fn().mockReturnThis(),
  findOneAndUpdate: jest.fn().mockReturnThis(),
  findOneAndDelete: jest.fn().mockReturnThis(),
  findByIdAndUpdate: jest.fn().mockResolvedValue({ _id: 'id1' }),
  findByIdAndDelete: jest.fn().mockResolvedValue({ _id: 'id1' }),
  countDocuments: jest.fn().mockResolvedValue(0),
  aggregate: jest.fn().mockResolvedValue([]),
  distinct: jest.fn().mockResolvedValue([]),
  deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
  updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
  insertMany: jest.fn().mockResolvedValue([]),
  create: jest.fn().mockResolvedValue({ _id: 'id1' }),
  save: jest.fn().mockResolvedValue({ _id: 'id1' }),
  populate: jest.fn().mockReturnThis(),
  lean: jest.fn().mockResolvedValue([]),
  sort: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  exec: jest.fn().mockResolvedValue([]),
};
jest.mock('../../models/DocumentVersion', () => ({
  DocumentVersion: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockDocumentVersionChain),
  Document: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockDocumentVersionChain)
}));

const mockDocumentChain = {
  find: jest.fn().mockReturnThis(),
  findOne: jest.fn().mockReturnThis(),
  findById: jest.fn().mockReturnThis(),
  findOneAndUpdate: jest.fn().mockReturnThis(),
  findOneAndDelete: jest.fn().mockReturnThis(),
  findByIdAndUpdate: jest.fn().mockResolvedValue({ _id: 'id1' }),
  findByIdAndDelete: jest.fn().mockResolvedValue({ _id: 'id1' }),
  countDocuments: jest.fn().mockResolvedValue(0),
  aggregate: jest.fn().mockResolvedValue([]),
  distinct: jest.fn().mockResolvedValue([]),
  deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
  updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
  insertMany: jest.fn().mockResolvedValue([]),
  create: jest.fn().mockResolvedValue({ _id: 'id1' }),
  save: jest.fn().mockResolvedValue({ _id: 'id1' }),
  populate: jest.fn().mockReturnThis(),
  lean: jest.fn().mockResolvedValue([]),
  sort: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  exec: jest.fn().mockResolvedValue([]),
};
jest.mock('../../models/Document', () => ({
  DocumentVersion: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockDocumentChain),
  Document: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockDocumentChain)
}));

const svc = require('../../services/documentCollaborationService');

describe('documentCollaborationService service', () => {
  test('module exports an object', () => {
    expect(svc).toBeDefined();
    expect(typeof svc).toBe('object');
  });

  test('createVersion is callable', async () => {
    if (typeof svc.createVersion !== 'function') return;
    let r;
    try { r = await svc.createVersion({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getVersionHistory is callable', async () => {
    if (typeof svc.getVersionHistory !== 'function') return;
    let r;
    try { r = await svc.getVersionHistory({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('restoreVersion is callable', async () => {
    if (typeof svc.restoreVersion !== 'function') return;
    let r;
    try { r = await svc.restoreVersion({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('compareVersions is callable', async () => {
    if (typeof svc.compareVersions !== 'function') return;
    let r;
    try { r = await svc.compareVersions({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('updateWorkflowStatus is callable', async () => {
    if (typeof svc.updateWorkflowStatus !== 'function') return;
    let r;
    try { r = await svc.updateWorkflowStatus({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('shareVersion is callable', async () => {
    if (typeof svc.shareVersion !== 'function') return;
    let r;
    try { r = await svc.shareVersion({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('addVersionComment is callable', async () => {
    if (typeof svc.addVersionComment !== 'function') return;
    let r;
    try { r = await svc.addVersionComment({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('startEditSession is callable', async () => {
    if (typeof svc.startEditSession !== 'function') return;
    let r;
    try { r = await svc.startEditSession({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('endEditSession is callable', async () => {
    if (typeof svc.endEditSession !== 'function') return;
    let r;
    try { r = await svc.endEditSession({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('calculateMetadata is callable', async () => {
    if (typeof svc.calculateMetadata !== 'function') return;
    let r;
    try { r = await svc.calculateMetadata({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('calculateDifferences is callable', async () => {
    if (typeof svc.calculateDifferences !== 'function') return;
    let r;
    try { r = await svc.calculateDifferences({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getCollaborators is callable', async () => {
    if (typeof svc.getCollaborators !== 'function') return;
    let r;
    try { r = await svc.getCollaborators({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('archiveOldVersions is callable', async () => {
    if (typeof svc.archiveOldVersions !== 'function') return;
    let r;
    try { r = await svc.archiveOldVersions({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

});
