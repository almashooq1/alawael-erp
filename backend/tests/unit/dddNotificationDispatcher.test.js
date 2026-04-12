'use strict';

// No model file to mock

const svc = require('../../services/dddNotificationDispatcher');

describe('dddNotificationDispatcher service', () => {
  test('dispatchDDDNotification resolves', async () => { await expect(svc.dispatchDDDNotification()).resolves.not.toThrow(); });
  test('dispatchToRole resolves', async () => { await expect(svc.dispatchToRole()).resolves.not.toThrow(); });
  test('getNotificationLogs resolves', async () => { await expect(svc.getNotificationLogs()).resolves.not.toThrow(); });
});
