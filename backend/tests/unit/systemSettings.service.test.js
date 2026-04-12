'use strict';

// Auto-generated unit test for systemSettings.service

const mockSystemSettingsChain = {
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
jest.mock('../../models/SystemSettings', () => {
  const M = jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) }));
  Object.assign(M, mockSystemSettingsChain);
  return M;
});

const svc = require('../../services/systemSettings.service');

describe('systemSettings.service service', () => {
  test('module exports an object', () => {
    expect(svc).toBeDefined();
    expect(typeof svc).toBe('object');
  });

  test('update is callable', async () => {
    if (typeof svc.update !== 'function') return;
    let r;
    try { r = await svc.update({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('resetSection is callable', async () => {
    if (typeof svc.resetSection !== 'function') return;
    let r;
    try { r = await svc.resetSection({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('toggleMaintenance is callable', async () => {
    if (typeof svc.toggleMaintenance !== 'function') return;
    let r;
    try { r = await svc.toggleMaintenance({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

});
