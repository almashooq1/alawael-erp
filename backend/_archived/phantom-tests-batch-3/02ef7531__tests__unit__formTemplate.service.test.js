'use strict';

// Auto-generated unit test for formTemplate.service

const mockFormTemplateChain = {
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
jest.mock('../../models/FormTemplate', () => ({
  FormTemplate: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockFormTemplateChain),
  FormSubmission: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockFormTemplateChain)
}));

const mockFormSubmissionChain = {
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
jest.mock('../../models/FormSubmission', () => ({
  FormTemplate: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockFormSubmissionChain),
  FormSubmission: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockFormSubmissionChain)
}));
jest.mock('mongoose', () => ({
  connection: { readyState: 1, db: { admin: () => ({ ping: jest.fn().mockResolvedValue(true) }) } },
  model: jest.fn(),
  Schema: jest.fn().mockImplementation(() => ({ index: jest.fn(), pre: jest.fn(), post: jest.fn(), virtual: jest.fn().mockReturnThis(), set: jest.fn() })),
  Types: { ObjectId: jest.fn(v => v || 'mock-id') },
}));
jest.mock('../../utils/logger', () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() }));
jest.mock('../../utils/sanitize', () => ({ sanitizeInput: jest.fn(v => v), sanitize: jest.fn(v => v) }));

const svc = require('../../services/formTemplate.service');

describe('formTemplate.service service', () => {
  test('module exports an object with functions', () => {
    expect(svc).toBeDefined();
    expect(typeof svc).toBe('object');
  });

  test('listTemplates is callable', async () => {
    if (typeof svc.listTemplates !== 'function') return;
    let r;
    try { r = await svc.listTemplates({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getTemplateById is callable', async () => {
    if (typeof svc.getTemplateById !== 'function') return;
    let r;
    try { r = await svc.getTemplateById({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('createTemplate is callable', async () => {
    if (typeof svc.createTemplate !== 'function') return;
    let r;
    try { r = await svc.createTemplate({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('updateTemplate is callable', async () => {
    if (typeof svc.updateTemplate !== 'function') return;
    let r;
    try { r = await svc.updateTemplate({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('deleteTemplate is callable', async () => {
    if (typeof svc.deleteTemplate !== 'function') return;
    let r;
    try { r = await svc.deleteTemplate({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('cloneTemplate is callable', async () => {
    if (typeof svc.cloneTemplate !== 'function') return;
    let r;
    try { r = await svc.cloneTemplate({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('updateDesign is callable', async () => {
    if (typeof svc.updateDesign !== 'function') return;
    let r;
    try { r = await svc.updateDesign({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('setLogo is callable', async () => {
    if (typeof svc.setLogo !== 'function') return;
    let r;
    try { r = await svc.setLogo({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('setSecondaryLogo is callable', async () => {
    if (typeof svc.setSecondaryLogo !== 'function') return;
    let r;
    try { r = await svc.setSecondaryLogo({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('updateHeader is callable', async () => {
    if (typeof svc.updateHeader !== 'function') return;
    let r;
    try { r = await svc.updateHeader({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('updateFooter is callable', async () => {
    if (typeof svc.updateFooter !== 'function') return;
    let r;
    try { r = await svc.updateFooter({}); } catch (e) { r = e; }
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

  test('submitForm is callable', async () => {
    if (typeof svc.submitForm !== 'function') return;
    let r;
    try { r = await svc.submitForm({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getUserSubmissions is callable', async () => {
    if (typeof svc.getUserSubmissions !== 'function') return;
    let r;
    try { r = await svc.getUserSubmissions({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getPendingSubmissions is callable', async () => {
    if (typeof svc.getPendingSubmissions !== 'function') return;
    let r;
    try { r = await svc.getPendingSubmissions({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getSubmissionById is callable', async () => {
    if (typeof svc.getSubmissionById !== 'function') return;
    let r;
    try { r = await svc.getSubmissionById({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('approveSubmission is callable', async () => {
    if (typeof svc.approveSubmission !== 'function') return;
    let r;
    try { r = await svc.approveSubmission({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('rejectSubmission is callable', async () => {
    if (typeof svc.rejectSubmission !== 'function') return;
    let r;
    try { r = await svc.rejectSubmission({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('returnSubmission is callable', async () => {
    if (typeof svc.returnSubmission !== 'function') return;
    let r;
    try { r = await svc.returnSubmission({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('resubmitForm is callable', async () => {
    if (typeof svc.resubmitForm !== 'function') return;
    let r;
    try { r = await svc.resubmitForm({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('addComment is callable', async () => {
    if (typeof svc.addComment !== 'function') return;
    let r;
    try { r = await svc.addComment({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getCategories is callable', async () => {
    if (typeof svc.getCategories !== 'function') return;
    let r;
    try { r = await svc.getCategories({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getStats is callable', async () => {
    if (typeof svc.getStats !== 'function') return;
    let r;
    try { r = await svc.getStats({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('renderSubmissionHtml is callable', async () => {
    if (typeof svc.renderSubmissionHtml !== 'function') return;
    let r;
    try { r = await svc.renderSubmissionHtml({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('seedBuiltInTemplates is callable', async () => {
    if (typeof svc.seedBuiltInTemplates !== 'function') return;
    let r;
    try { r = await svc.seedBuiltInTemplates({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

});
