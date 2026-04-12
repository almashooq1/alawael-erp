'use strict';

jest.mock('../../models/DddTaskQueue', () => ({
  DDDJob: {},
  PRIORITY_WEIGHTS: ['item1'],
  QUEUE_DEFINITIONS: ['item1'],
  JOB_TYPES: ['item1'],

}));

const svc = require('../../services/dddTaskQueue');

describe('dddTaskQueue service', () => {
  test('PRIORITY_WEIGHTS is an array', () => { expect(Array.isArray(svc.PRIORITY_WEIGHTS)).toBe(true); });
  test('QUEUE_DEFINITIONS is an array', () => { expect(Array.isArray(svc.QUEUE_DEFINITIONS)).toBe(true); });
  test('JOB_TYPES is an array', () => { expect(Array.isArray(svc.JOB_TYPES)).toBe(true); });
  test('queueBus resolves', async () => { await expect(svc.queueBus()).resolves.not.toThrow(); });
  test('registerHandler resolves', async () => { await expect(svc.registerHandler()).resolves.not.toThrow(); });
  test('getHandler resolves', async () => { await expect(svc.getHandler()).resolves.not.toThrow(); });
  test('enqueueJob resolves', async () => { await expect(svc.enqueueJob()).resolves.not.toThrow(); });
  test('processNextJob resolves', async () => { await expect(svc.processNextJob()).resolves.not.toThrow(); });
  test('cancelJob resolves', async () => { await expect(svc.cancelJob()).resolves.not.toThrow(); });
  test('retryDeadJob resolves', async () => { await expect(svc.retryDeadJob()).resolves.not.toThrow(); });
  test('purgeDeadJobs resolves', async () => { await expect(svc.purgeDeadJobs()).resolves.not.toThrow(); });
  test('getQueueDashboard returns health object', async () => {
    const d = await svc.getQueueDashboard();
    expect(d).toHaveProperty('status', 'healthy');
    expect(d).toHaveProperty('timestamp');
  });
});
