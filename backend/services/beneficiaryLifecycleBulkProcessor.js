'use strict';

/**
 * beneficiaryLifecycleBulkProcessor.js — Phase D.
 *
 * Background worker that polls `BeneficiaryLifecycleBulkJob` documents in
 * `queued` status and processes them one at a time. Each item is handed to
 * the appropriate lifecycle service method; failures are captured per-item
 * and do not abort the rest of the batch.
 *
 * Usage:
 *   const processor = new BeneficiaryLifecycleBulkProcessor({
 *     lifecycleService,
 *     bulkJobModel,
 *     logger,
 *     pollIntervalMs: 5000,
 *   });
 *   processor.start();
 *   // on shutdown:
 *   processor.stop();
 */

const DEFAULT_POLL_INTERVAL_MS = 5000;

class BeneficiaryLifecycleBulkProcessor {
  constructor({
    lifecycleService,
    bulkJobModel,
    logger = console,
    pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
  } = {}) {
    if (!lifecycleService) {
      throw new Error('BeneficiaryLifecycleBulkProcessor: lifecycleService is required');
    }
    if (!bulkJobModel) {
      throw new Error('BeneficiaryLifecycleBulkProcessor: bulkJobModel is required');
    }

    this.lifecycleService = lifecycleService;
    this.bulkJobModel = bulkJobModel;
    this.logger = logger;
    this.pollIntervalMs = pollIntervalMs;

    this._timer = null;
    this._running = false;
    this._stats = {
      processedJobs: 0,
      processedItems: 0,
      successfulItems: 0,
      failedItems: 0,
      lastError: null,
    };
  }

  start() {
    if (this._timer) return;
    this.logger.info?.(
      `[BeneficiaryLifecycleBulkProcessor] starting (interval: ${this.pollIntervalMs}ms)`
    );
    this._tick();
    this._timer = setInterval(() => this._tick(), this.pollIntervalMs);
    if (this._timer && typeof this._timer.unref === 'function') {
      this._timer.unref();
    }
  }

  stop() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
    this.logger.info?.('[BeneficiaryLifecycleBulkProcessor] stopped');
  }

  ranSinceBoot() {
    return { ...this._stats };
  }

  async _tick() {
    if (this._running) return;
    this._running = true;

    try {
      const job = await this.bulkJobModel.findOneAndUpdate(
        { status: 'queued' },
        { $set: { status: 'running', startedAt: new Date() } },
        { sort: { createdAt: 1 }, new: true }
      );

      if (!job) {
        return;
      }

      await this._processJob(job);
    } catch (err) {
      this._stats.lastError = err?.message || String(err);
      this.logger.error?.(
        `[BeneficiaryLifecycleBulkProcessor] tick error: ${this._stats.lastError}`
      );
    } finally {
      this._running = false;
    }
  }

  async _processJob(job) {
    const startedAt = Date.now();
    const items = Array.isArray(job.items) ? job.items : [];
    const total = items.length;

    const results = [];
    const errors = [];
    let successful = 0;
    let failed = 0;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      let result;
      try {
        result = await this._dispatchItem(job.operation, item, job.actorSnapshot);
      } catch (err) {
        result = {
          ok: false,
          reason: err?.message || 'PROCESSOR_EXCEPTION',
          index: i,
        };
      }

      const row = this._normalizeResult(job.operation, item, result, i);
      results.push(row);
      if (row.ok) {
        successful += 1;
      } else {
        failed += 1;
        errors.push(row);
      }

      // Persist incremental progress so clients can poll meaningfully.
      job.progress = {
        total,
        processed: i + 1,
        successful,
        failed,
        percentage: total > 0 ? Math.round(((i + 1) / total) * 100) : 0,
      };
      job.results = results;
      job.errors = errors;
      try {
        await job.save();
      } catch (saveErr) {
        this.logger.warn?.(
          `[BeneficiaryLifecycleBulkProcessor] progress save failed: ${saveErr.message || saveErr}`
        );
      }
    }

    this._stats.processedJobs += 1;

    const durationMs = Date.now() - startedAt;
    const allFailed = total > 0 && failed === total;
    job.status = allFailed ? 'failed' : 'completed';
    job.completedAt = new Date();
    job.durationMs = durationMs;
    job.errorMessage = allFailed ? 'All items failed' : null;

    this._stats.processedItems += total;
    this._stats.successfulItems += successful;
    this._stats.failedItems += failed;

    try {
      await job.save();
      this.logger.info?.(
        `[BeneficiaryLifecycleBulkProcessor] job ${job._id} ${job.status}: ${successful}/${total} in ${durationMs}ms`
      );
    } catch (saveErr) {
      this.logger.error?.(
        `[BeneficiaryLifecycleBulkProcessor] final save failed for job ${job._id}: ${saveErr.message || saveErr}`
      );
    }
  }

  _dispatchItem(operation, item, _actorSnapshot) {
    const actor = _actorSnapshot || {};
    switch (operation) {
      case 'bulk-request':
        return this.lifecycleService.requestTransition({
          beneficiaryId: item.beneficiaryId,
          branchId: item.branchId || null,
          destinationBranchId: item.destinationBranchId || null,
          transitionId: item.transitionId,
          actor,
          reason: item.reason || null,
          reasonCode: item.reasonCode || null,
          evidenceLinks: Array.isArray(item.evidenceLinks) ? item.evidenceLinks : [],
          correlationId: item.correlationId || null,
          metadata: item.metadata || {},
        });
      case 'bulk-approve':
        return this.lifecycleService.approveTransition({
          transitionRecordId: item.transitionRecordId,
          actor,
          approverRole: item.approverRole,
          decision: item.decision || 'approve',
          nafathSignatureId: item.nafathSignatureId || null,
          comment: item.comment || null,
        });
      case 'bulk-execute':
        return this.lifecycleService.executeTransition({
          transitionRecordId: item.transitionRecordId,
          actor,
        });
      default:
        throw new Error(`Unsupported bulk operation: ${operation}`);
    }
  }

  _normalizeResult(operation, item, result, index) {
    const base = { index, ok: !!result?.ok, reason: result?.reason || null };
    if (operation === 'bulk-request') {
      return {
        ...base,
        beneficiaryId: item.beneficiaryId,
        transitionId: item.transitionId,
        transitionRecordId: result?.transitionRecord?._id || null,
      };
    }
    return {
      ...base,
      transitionRecordId: item.transitionRecordId,
      transitionRecord: result?.transitionRecord || null,
    };
  }
}

module.exports = { BeneficiaryLifecycleBulkProcessor };
