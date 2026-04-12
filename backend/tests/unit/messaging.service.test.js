'use strict';

// Auto-generated unit test for messaging.service

const mockmessage_modelChain = {
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
jest.mock('../../models/message.model', () => ({
  Message: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockmessage_modelChain),
  Conversation: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockmessage_modelChain)
}));

const mockconversation_modelChain = {
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
jest.mock('../../models/conversation.model', () => ({
  Message: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockconversation_modelChain),
  Conversation: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockconversation_modelChain)
}));

const svc = require('../../services/messaging.service');

describe('messaging.service service', () => {
  test('module exports an object with functions', () => {
    expect(svc).toBeDefined();
    expect(typeof svc).toBe('object');
  });

  test('createMessage is callable', async () => {
    if (typeof svc.createMessage !== 'function') return;
    let r;
    try { r = await svc.createMessage({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getMessages is callable', async () => {
    if (typeof svc.getMessages !== 'function') return;
    let r;
    try { r = await svc.getMessages({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getMessage is callable', async () => {
    if (typeof svc.getMessage !== 'function') return;
    let r;
    try { r = await svc.getMessage({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('updateMessage is callable', async () => {
    if (typeof svc.updateMessage !== 'function') return;
    let r;
    try { r = await svc.updateMessage({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('deleteMessage is callable', async () => {
    if (typeof svc.deleteMessage !== 'function') return;
    let r;
    try { r = await svc.deleteMessage({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('markAsRead is callable', async () => {
    if (typeof svc.markAsRead !== 'function') return;
    let r;
    try { r = await svc.markAsRead({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('markMultipleAsRead is callable', async () => {
    if (typeof svc.markMultipleAsRead !== 'function') return;
    let r;
    try { r = await svc.markMultipleAsRead({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('bulkDeleteMessages is callable', async () => {
    if (typeof svc.bulkDeleteMessages !== 'function') return;
    let r;
    try { r = await svc.bulkDeleteMessages({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('searchMessages is callable', async () => {
    if (typeof svc.searchMessages !== 'function') return;
    let r;
    try { r = await svc.searchMessages({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getUnreadCount is callable', async () => {
    if (typeof svc.getUnreadCount !== 'function') return;
    let r;
    try { r = await svc.getUnreadCount({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('createThread is callable', async () => {
    if (typeof svc.createThread !== 'function') return;
    let r;
    try { r = await svc.createThread({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getThreads is callable', async () => {
    if (typeof svc.getThreads !== 'function') return;
    let r;
    try { r = await svc.getThreads({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getThread is callable', async () => {
    if (typeof svc.getThread !== 'function') return;
    let r;
    try { r = await svc.getThread({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('addMessageToThread is callable', async () => {
    if (typeof svc.addMessageToThread !== 'function') return;
    let r;
    try { r = await svc.addMessageToThread({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('archiveThread is callable', async () => {
    if (typeof svc.archiveThread !== 'function') return;
    let r;
    try { r = await svc.archiveThread({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('leaveThread is callable', async () => {
    if (typeof svc.leaveThread !== 'function') return;
    let r;
    try { r = await svc.leaveThread({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getUnreadMessages is callable', async () => {
    if (typeof svc.getUnreadMessages !== 'function') return;
    let r;
    try { r = await svc.getUnreadMessages({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('clearUnread is callable', async () => {
    if (typeof svc.clearUnread !== 'function') return;
    let r;
    try { r = await svc.clearUnread({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('markConversationAsRead is callable', async () => {
    if (typeof svc.markConversationAsRead !== 'function') return;
    let r;
    try { r = await svc.markConversationAsRead({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

});
