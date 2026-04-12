'use strict';

jest.mock('../../models/DddCollaborationHub', () => ({
  DDDChannel: {},
  DDDCollabMessage: {},
  DDDPresence: {},
}));

const service = require('../../services/dddCollaborationHub');

describe('dddCollaborationHub service', () => {
  /* ── Arrays ── */
  test('CHANNEL_TYPES is array', () => expect(Array.isArray(service.CHANNEL_TYPES)).toBe(true));
  test('BUILTIN_CHANNELS is array', () =>
    expect(Array.isArray(service.BUILTIN_CHANNELS)).toBe(true));
  test('PRESENCE_STATUSES is array', () =>
    expect(Array.isArray(service.PRESENCE_STATUSES)).toBe(true));

  /* ── Function exports ── */
  const fns = [
    'sendMessage',
    'getChannelMessages',
    'markAsRead',
    'addReaction',
    'updatePresence',
    'getOnlineUsers',
    'searchMessages',
    'getUnreadCount',
    'seedChannels',
    'getCollaborationDashboard',
  ];
  test.each(fns)('%s is exported as function', fn => {
    expect(typeof service[fn]).toBe('function');
  });

  /* ── TODO stubs resolve ── */
  const stubs = [
    'sendMessage',
    'getChannelMessages',
    'markAsRead',
    'addReaction',
    'updatePresence',
    'getOnlineUsers',
    'searchMessages',
    'getUnreadCount',
    'seedChannels',
  ];
  test.each(stubs)('%s resolves without error', async fn => {
    await expect(service[fn]()).resolves.not.toThrow();
  });

  /* ── Dashboard ── */
  test('getCollaborationDashboard returns health object', async () => {
    const d = await service.getCollaborationDashboard();
    expect(d).toHaveProperty('service', 'CollaborationHub');
    expect(d).toHaveProperty('status', 'healthy');
    expect(d).toHaveProperty('timestamp');
  });
});
