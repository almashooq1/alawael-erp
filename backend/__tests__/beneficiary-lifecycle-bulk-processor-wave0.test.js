'use strict';

/**
 * beneficiary-lifecycle-bulk-processor-wave0.test.js — Phase D.
 *
 * Tests the async bulk lifecycle job processor.
 */

const mongoose = require('mongoose');
const {
  BeneficiaryLifecycleBulkProcessor,
} = require('../services/beneficiaryLifecycleBulkProcessor');

function makeLifecycleService(overrides = {}) {
  return {
    requestTransition: jest.fn(async ({ beneficiaryId, transitionId }) => {
      if (beneficiaryId === 'b-bad') {
        return { ok: false, reason: 'INVALID_FROM_STATE' };
      }
      return {
        ok: true,
        transitionRecord: { _id: `txn-${beneficiaryId}`, beneficiaryId, transitionId },
      };
    }),
    approveTransition: jest.fn(async ({ transitionRecordId }) => ({
      ok: true,
      transitionRecord: { _id: transitionRecordId, status: 'approved' },
    })),
    executeTransition: jest.fn(async ({ transitionRecordId }) => ({
      ok: true,
      transitionRecord: { _id: transitionRecordId, status: 'executed' },
    })),
    ...overrides,
  };
}

function makeJob(overrides = {}) {
  const doc = {
    _id: new mongoose.Types.ObjectId(),
    operation: 'bulk-request',
    items: [
      { beneficiaryId: 'b-1', transitionId: 'suspend' },
      { beneficiaryId: 'b-2', transitionId: 'suspend' },
    ],
    actorSnapshot: { userId: 'U-1', role: 'branch_manager' },
    status: 'queued',
    progress: { total: 2, processed: 0, successful: 0, failed: 0, percentage: 0 },
    results: [],
    errors: [],
    save: jest.fn(async function () {
      return this;
    }),
    ...overrides,
  };
  if (overrides.items) {
    doc.progress.total = overrides.items.length;
  }
  return doc;
}

describe('BeneficiaryLifecycleBulkProcessor', () => {
  test('processes every item and marks the job completed', async () => {
    const service = makeLifecycleService();
    const processor = new BeneficiaryLifecycleBulkProcessor({
      lifecycleService: service,
      bulkJobModel: {},
      logger: { info: () => {}, warn: () => {}, error: () => {} },
    });
    const job = makeJob();

    await processor._processJob(job);

    expect(service.requestTransition).toHaveBeenCalledTimes(2);
    expect(job.status).toBe('completed');
    expect(job.progress.successful).toBe(2);
    expect(job.progress.failed).toBe(0);
    expect(job.progress.percentage).toBe(100);
    expect(job.completedAt).toBeInstanceOf(Date);
    expect(job.durationMs).toBeGreaterThanOrEqual(0);
    expect(job.save).toHaveBeenCalled();
  });

  test('continues processing when individual items fail', async () => {
    const service = makeLifecycleService();
    const job = makeJob({
      items: [
        { beneficiaryId: 'b-ok', transitionId: 'suspend' },
        { beneficiaryId: 'b-bad', transitionId: 'suspend' },
        { beneficiaryId: 'b-ok-2', transitionId: 'suspend' },
      ],
    });

    const processor = new BeneficiaryLifecycleBulkProcessor({
      lifecycleService: service,
      bulkJobModel: {},
      logger: { info: () => {}, warn: () => {}, error: () => {} },
    });

    await processor._processJob(job);

    expect(job.status).toBe('completed');
    expect(job.progress.successful).toBe(2);
    expect(job.progress.failed).toBe(1);
    expect(job.errors).toHaveLength(1);
    expect(job.errors[0]).toMatchObject({
      beneficiaryId: 'b-bad',
      ok: false,
      reason: 'INVALID_FROM_STATE',
    });
    expect(service.requestTransition).toHaveBeenCalledTimes(3);
  });

  test('marks the job failed when every item fails', async () => {
    const service = makeLifecycleService();
    const job = makeJob({
      items: [
        { beneficiaryId: 'b-bad', transitionId: 'suspend' },
        { beneficiaryId: 'b-bad', transitionId: 'suspend' },
      ],
    });

    const processor = new BeneficiaryLifecycleBulkProcessor({
      lifecycleService: service,
      bulkJobModel: {},
      logger: { info: () => {}, warn: () => {}, error: () => {} },
    });

    await processor._processJob(job);

    expect(job.status).toBe('failed');
    expect(job.progress.successful).toBe(0);
    expect(job.progress.failed).toBe(2);
    expect(job.errorMessage).toBe('All items failed');
  });

  test('handles bulk-approve operations', async () => {
    const service = makeLifecycleService();
    const job = makeJob({
      operation: 'bulk-approve',
      items: [{ transitionRecordId: 't1', approverRole: 'branch_manager' }],
    });

    const processor = new BeneficiaryLifecycleBulkProcessor({
      lifecycleService: service,
      bulkJobModel: {},
      logger: { info: () => {}, warn: () => {}, error: () => {} },
    });

    await processor._processJob(job);

    expect(service.approveTransition).toHaveBeenCalledTimes(1);
    expect(service.approveTransition).toHaveBeenCalledWith(
      expect.objectContaining({ transitionRecordId: 't1', actor: job.actorSnapshot })
    );
    expect(job.status).toBe('completed');
  });

  test('handles bulk-execute operations', async () => {
    const service = makeLifecycleService();
    const job = makeJob({
      operation: 'bulk-execute',
      items: [{ transitionRecordId: 't1' }],
    });

    const processor = new BeneficiaryLifecycleBulkProcessor({
      lifecycleService: service,
      bulkJobModel: {},
      logger: { info: () => {}, warn: () => {}, error: () => {} },
    });

    await processor._processJob(job);

    expect(service.executeTransition).toHaveBeenCalledTimes(1);
    expect(service.executeTransition).toHaveBeenCalledWith(
      expect.objectContaining({ transitionRecordId: 't1', actor: job.actorSnapshot })
    );
    expect(job.status).toBe('completed');
  });

  test('increments processor stats', async () => {
    const service = makeLifecycleService();
    const job = makeJob();
    const processor = new BeneficiaryLifecycleBulkProcessor({
      lifecycleService: service,
      bulkJobModel: {},
      logger: { info: () => {}, warn: () => {}, error: () => {} },
    });

    await processor._processJob(job);

    const stats = processor.ranSinceBoot();
    expect(stats.processedItems).toBe(2);
    expect(stats.successfulItems).toBe(2);
    expect(stats.failedItems).toBe(0);
  });

  test('start/stop controls the polling timer', () => {
    jest.useFakeTimers();
    const processor = new BeneficiaryLifecycleBulkProcessor({
      lifecycleService: makeLifecycleService(),
      bulkJobModel: { findOneAndUpdate: jest.fn(async () => null) },
      logger: { info: () => {}, warn: () => {}, error: () => {} },
      pollIntervalMs: 1000,
    });

    processor.start();
    expect(processor._timer).toBeTruthy();

    jest.advanceTimersByTime(3000);

    processor.stop();
    expect(processor._timer).toBeFalsy();
    jest.useRealTimers();
  });
});
