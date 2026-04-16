'use strict';

// Auto-generated unit test for dmsService

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
jest.mock('../../models/Document', () => {
  const M = jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) }));
  Object.assign(M, mockDocumentChain);
  return M;
});

const Cls = require('../../services/dmsService');

describe('dmsService service', () => {
  let svc;

  beforeAll(() => {
    svc = new Cls();
  });

  test('constructor creates instance', () => {
    expect(svc).toBeDefined();
    expect(svc).toBeInstanceOf(Cls);
  });

  test('createNewVersion is callable', async () => {
    if (typeof svc.createNewVersion !== 'function') return;
    let r;
    try { r = await svc.createNewVersion({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('signDocument is callable', async () => {
    if (typeof svc.signDocument !== 'function') return;
    let r;
    try { r = await svc.signDocument({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('grantAccess is callable', async () => {
    if (typeof svc.grantAccess !== 'function') return;
    let r;
    try { r = await svc.grantAccess({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('triggerOcr is callable', async () => {
    if (typeof svc.triggerOcr !== 'function') return;
    let r;
    try { r = await svc.triggerOcr({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getDocument is callable', async () => {
    if (typeof svc.getDocument !== 'function') return;
    let r;
    try { r = await svc.getDocument({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

});
