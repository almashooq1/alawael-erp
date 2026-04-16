'use strict';

jest.mock('../../models/DddCollaborationHub', () => ({
  DDDChannel: {},
  DDDCollabMessage: {},
  DDDPresence: {},
  CHANNEL_TYPES: ['item1'],
  BUILTIN_CHANNELS: ['item1'],
  PRESENCE_STATUSES: ['item1'],

}));

const svc = require('../../services/dddCollaborationHub');

describe('dddCollaborationHub service', () => {
  test('CHANNEL_TYPES is an array', () => { expect(Array.isArray(svc.CHANNEL_TYPES)).toBe(true); });
  test('BUILTIN_CHANNELS is an array', () => { expect(Array.isArray(svc.BUILTIN_CHANNELS)).toBe(true); });
  test('PRESENCE_STATUSES is an array', () => { expect(Array.isArray(svc.PRESENCE_STATUSES)).toBe(true); });
  test('sendMessage resolves', async () => { await expect(svc.sendMessage()).resolves.not.toThrow(); });
  test('getChannelMessages resolves', async () => { await expect(svc.getChannelMessages()).resolves.not.toThrow(); });
  test('markAsRead resolves', async () => { await expect(svc.markAsRead()).resolves.not.toThrow(); });
  test('addReaction resolves', async () => { await expect(svc.addReaction()).resolves.not.toThrow(); });
  test('updatePresence resolves', async () => { await expect(svc.updatePresence()).resolves.not.toThrow(); });
  test('getOnlineUsers resolves', async () => { await expect(svc.getOnlineUsers()).resolves.not.toThrow(); });
  test('searchMessages resolves', async () => { await expect(svc.searchMessages()).resolves.not.toThrow(); });
  test('getUnreadCount resolves', async () => { await expect(svc.getUnreadCount()).resolves.not.toThrow(); });
  test('seedChannels resolves', async () => { await expect(svc.seedChannels()).resolves.not.toThrow(); });
  test('getCollaborationDashboard returns health object', async () => {
    const d = await svc.getCollaborationDashboard();
    expect(d).toHaveProperty('status', 'healthy');
    expect(d).toHaveProperty('timestamp');
  });
});
