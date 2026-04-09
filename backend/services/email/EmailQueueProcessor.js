/**
 * ═══════════════════════════════════════════════════════════════
 * 📧 Email Queue Processor — معالج قائمة الانتظار
 * ═══════════════════════════════════════════════════════════════
 *
 * Background worker that processes the email queue with:
 *  - Exponential backoff retry
 *  - Priority ordering
 *  - Stale detection
 *  - Dead letter handling
 *  - Health monitoring
 */

const config = require('./EmailConfig');
const logger = require('../../utils/logger');

class EmailQueueProcessor {
  /**
   * @param {import('./EmailManager')} emailManager
   */
  constructor(emailManager) {
    this.emailManager = emailManager;
    this._timer = null;
    this._running = false;
    this._processedCount = 0;
    this._errorCount = 0;
    this._lastRunAt = null;
    this._lastRunDuration = 0;
  }

  /**
   * Start the queue processor
   */
  start() {
    if (this._timer) return;

    const interval = config.queue.pollIntervalMs;
    logger.info(`[EmailQueue] 🚀 Starting queue processor (interval: ${interval}ms)`);

    // Initial run
    this._tick();

    // Recurring poll
    this._timer = setInterval(() => this._tick(), interval);
  }

  /**
   * Stop the queue processor
   */
  stop() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
      logger.info('[EmailQueue] ⏹️ Stopped queue processor');
    }
  }

  /**
   * Process one batch
   */
  async _tick() {
    if (this._running) return;
    this._running = true;
    const startTime = Date.now();

    try {
      const EmailQueue = this.emailManager._EmailQueue;
      if (!EmailQueue) {
        this._running = false;
        return;
      }

      // 1. Recover stale entries (stuck in 'processing' too long)
      await this._recoverStale(EmailQueue);

      // 2. Fetch pending batch
      const batch = await EmailQueue.find({
        status: 'pending',
        $or: [{ scheduledFor: { $lte: new Date() } }, { scheduledFor: null }],
        $expr: { $lt: ['$attempts', '$maxAttempts'] },
      })
        .sort({ priority: -1, createdAt: 1 })
        .limit(config.queue.batchSize)
        .lean();

      if (!batch.length) {
        this._running = false;
        this._lastRunAt = new Date();
        this._lastRunDuration = Date.now() - startTime;
        return;
      }

      logger.info(`[EmailQueue] 📦 Processing ${batch.length} queued emails`);

      let processed = 0;
      let failed = 0;

      for (const item of batch) {
        try {
          // Mark as processing
          await EmailQueue.updateOne(
            { _id: item._id, status: 'pending' },
            {
              $set: { status: 'processing', lastAttemptAt: new Date() },
              $inc: { attempts: 1 },
            }
          );

          // Attempt send
          const result = await this.emailManager.send({
            to: item.emailData?.to || item.to,
            cc: item.emailData?.cc,
            bcc: item.emailData?.bcc,
            subject: item.emailData?.subject || item.subject,
            html: item.emailData?.html || item.html,
            text: item.emailData?.text || item.text,
            attachments: item.emailData?.attachments || item.attachments,
            metadata: { ...item.metadata, autoRetry: false, fromQueue: true },
          });

          if (result.success) {
            await EmailQueue.updateOne(
              { _id: item._id },
              {
                $set: {
                  status: 'completed',
                  'metadata.sentAt': new Date(),
                  'metadata.messageId': result.messageId,
                },
              }
            );
            processed++;
          } else {
            await this._handleFailedItem(EmailQueue, item, result.error);
            failed++;
          }
        } catch (error) {
          await this._handleFailedItem(EmailQueue, item, error.message);
          failed++;
        }
      }

      this._processedCount += processed;
      this._errorCount += failed;
      this._lastRunAt = new Date();
      this._lastRunDuration = Date.now() - startTime;

      logger.info(
        `[EmailQueue] ✅ Batch complete: ${processed} sent, ${failed} failed (${this._lastRunDuration}ms)`
      );
    } catch (error) {
      logger.error(`[EmailQueue] ❌ Tick error: ${error.message}`);
    } finally {
      this._running = false;
    }
  }

  /**
   * Handle failed queue item with exponential backoff
   */
  async _handleFailedItem(EmailQueue, item, errorMsg) {
    const attempts = (item.attempts || 0) + 1;
    const maxAttempts = item.maxAttempts || config.retry.maxAttempts;

    if (attempts >= maxAttempts) {
      // Move to dead letter
      await EmailQueue.updateOne(
        { _id: item._id },
        {
          $set: {
            status: 'failed',
            error: `Max attempts (${maxAttempts}) reached. Last error: ${errorMsg}`,
          },
        }
      );
      logger.warn(`[EmailQueue] 💀 Dead letter: ${item._id} after ${attempts} attempts`);
      return;
    }

    // Exponential backoff
    const delayMs =
      config.retry.initialDelayMs * Math.pow(config.retry.backoffMultiplier, attempts - 1);
    const nextAttempt = new Date(Date.now() + delayMs);

    await EmailQueue.updateOne(
      { _id: item._id },
      {
        $set: {
          status: 'pending',
          error: errorMsg,
          nextAttemptAt: nextAttempt,
          scheduledFor: nextAttempt,
        },
      }
    );

    logger.debug(
      `[EmailQueue] 🔄 Retry ${item._id} in ${delayMs}ms (attempt ${attempts}/${maxAttempts})`
    );
  }

  /**
   * Recover items stuck in 'processing' state
   */
  async _recoverStale(EmailQueue) {
    const staleThreshold = new Date(Date.now() - config.queue.staleTimeoutMs);

    const result = await EmailQueue.updateMany(
      {
        status: 'processing',
        lastAttemptAt: { $lt: staleThreshold },
      },
      {
        $set: { status: 'pending', error: 'Recovered from stale processing state' },
      }
    );

    if (result.modifiedCount > 0) {
      logger.warn(`[EmailQueue] 🔧 Recovered ${result.modifiedCount} stale queue items`);
    }
  }

  /**
   * Force process the queue now (manual trigger)
   */
  async processNow() {
    await this._tick();
    return this.getStats();
  }

  /**
   * Purge completed items older than given days
   */
  async purgeCompleted(olderThanDays = 7) {
    const EmailQueue = this.emailManager._EmailQueue;
    if (!EmailQueue) return { deleted: 0 };

    const threshold = new Date(Date.now() - olderThanDays * 86400000);
    const result = await EmailQueue.deleteMany({
      status: 'completed',
      updatedAt: { $lt: threshold },
    });

    return { deleted: result.deletedCount };
  }

  /**
   * Retry all failed items
   */
  async retryFailed() {
    const EmailQueue = this.emailManager._EmailQueue;
    if (!EmailQueue) return { retried: 0 };

    const result = await EmailQueue.updateMany(
      { status: 'failed' },
      {
        $set: {
          status: 'pending',
          attempts: 0,
          error: null,
          scheduledFor: new Date(),
        },
      }
    );

    return { retried: result.modifiedCount };
  }

  /**
   * Get queue processor stats
   */
  getStats() {
    return {
      running: this._running,
      timerActive: !!this._timer,
      processedTotal: this._processedCount,
      errorsTotal: this._errorCount,
      lastRunAt: this._lastRunAt,
      lastRunDuration: this._lastRunDuration,
      config: {
        batchSize: config.queue.batchSize,
        pollInterval: config.queue.pollIntervalMs,
        maxRetries: config.retry.maxAttempts,
      },
    };
  }
}

module.exports = EmailQueueProcessor;
