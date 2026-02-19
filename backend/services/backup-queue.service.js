/**
 * ═══════════════════════════════════════════════════════════════════════
 * ADVANCED BACKUP QUEUE SYSTEM
 * نظام قوائم الانتظار المتقدم للنسخ الاحتياطية
 * ═══════════════════════════════════════════════════════════════════════
 * 
 * Features:
 * ✅ Job Queue Management
 * ✅ Priority Scheduling
 * ✅ Concurrent Processing
 * ✅ Retry Mechanism
 * ✅ Dead Letter Queue
 * ✅ Job History & Analytics
 * ═══════════════════════════════════════════════════════════════════════
 */

const EventEmitter = require('events');
const path = require('path');
const fs = require('fs').promises;

class BackupQueueSystem extends EventEmitter {
  constructor(options = {}) {
    super();

    this.queue = [];
    this.processing = new Map();
    this.completed = [];
    this.deadLetterQueue = [];
    this.maxConcurrent = options.maxConcurrent || 2;
    this.maxRetries = options.maxRetries || 3;
    this.jobTimeout = options.jobTimeout || 30 * 60 * 1000; // 30 minutes
    this.queuePath = options.queuePath || './data/queue';

    this.initializeQueue();
  }

  /**
   * Initialize queue system
   */
  async initializeQueue() {
    try {
      await fs.mkdir(this.queuePath, { recursive: true });
      await this.loadPersistedQueue();
      console.log('✅ Queue system initialized');
    } catch (error) {
      console.error('❌ Queue initialization failed:', error.message);
    }
  }

  /**
   * Add job to queue
   * إضافة مهمة إلى قائمة الانتظار
   */
  async addJob(job) {
    try {
      const jobId = this.generateJobId();
      
      const queueJob = {
        id: jobId,
        type: job.type || 'FULL_BACKUP',
        priority: job.priority || 'NORMAL', // HIGH, NORMAL, LOW
        status: 'PENDING',
        data: job.data || {},
        createdAt: new Date(),
        scheduledAt: job.scheduledAt || null,
        startedAt: null,
        completedAt: null,
        error: null,
        retries: 0,
        maxRetries: this.maxRetries,
        timeout: this.jobTimeout,
        progress: 0,
      };

      this.queue.push(queueJob);
      this.queue.sort((a, b) => this.comparePriority(a.priority, b.priority));

      await this.persistQueue();
      this.emit('job:added', queueJob);

      this.processQueue();

      return queueJob;
    } catch (error) {
      console.error('❌ Failed to add job:', error.message);
      throw error;
    }
  }

  /**
   * Process queue
   * معالجة قائمة الانتظار
   */
  async processQueue() {
    try {
      while (this.processing.size < this.maxConcurrent && this.queue.length > 0) {
        const job = this.queue.shift();

        if (job.scheduledAt && new Date() < new Date(job.scheduledAt)) {
          this.queue.unshift(job); // Put back if not time yet
          break;
        }

        this.processing.set(job.id, job);
        await this.executeJob(job);
      }
    } catch (error) {
      console.error('❌ Queue processing error:', error.message);
    }
  }

  /**
   * Execute job with timeout
   */
  async executeJob(job) {
    try {
      job.status = 'PROCESSING';
      job.startedAt = new Date();

      this.emit('job:started', job);
      console.log(`🔄 Processing job [${job.id}] - Type: ${job.type}`);

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Job timeout')), job.timeout)
      );

      const jobPromise = this.runJobLogic(job);

      const result = await Promise.race([jobPromise, timeoutPromise]);

      job.status = 'COMPLETED';
      job.completedAt = new Date();
      job.result = result;

      this.completed.push(job);
      this.processing.delete(job.id);

      this.emit('job:completed', job);
      console.log(`✅ Job completed [${job.id}]`);

      await this.persistQueue();
      this.processQueue();
    } catch (error) {
      await this.handleJobError(job, error);
    }
  }

  /**
   * Run job logic
   */
  async runJobLogic(job) {
    // This would be implemented with actual backup logic
    // For now, simulate the job
    return new Promise((resolve) => {
      const steps = 10;
      let currentStep = 0;

      const interval = setInterval(() => {
        currentStep++;
        job.progress = (currentStep / steps) * 100;
        this.emit('job:progress', job);

        if (currentStep >= steps) {
          clearInterval(interval);
          resolve({ success: true, jobId: job.id });
        }
      }, (job.timeout / steps) / 10);
    });
  }

  /**
   * Handle job error with retry
   */
  async handleJobError(job, error) {
    job.error = error.message;
    job.retries++;

    if (job.retries < job.maxRetries) {
      console.warn(`⚠️  Job failed, retrying [${job.id}] - Attempt ${job.retries + 1}`);
      job.status = 'PENDING';
      job.startedAt = null;
      this.queue.push(job);
      this.processing.delete(job.id);

      this.emit('job:retrying', job);
    } else {
      console.error(`❌ Job failed permanently [${job.id}]`);
      job.status = 'FAILED';
      job.completedAt = new Date();
      this.deadLetterQueue.push(job);
      this.processing.delete(job.id);

      this.emit('job:failed', job);
    }

    await this.persistQueue();
    this.processQueue();
  }

  /**
   * Get queue status
   */
  getQueueStatus() {
    return {
      pending: this.queue.filter(j => j.status === 'PENDING').length,
      processing: this.processing.size,
      completed: this.completed.length,
      failed: this.deadLetterQueue.length,
      total: this.queue.length + this.processing.size + this.completed.length + this.deadLetterQueue.length,
      averageTime: this.calculateAverageJobTime(),
      successRate: this.calculateSuccessRate(),
    };
  }

  /**
   * Get job by ID
   */
  getJob(jobId) {
    return (
      this.queue.find(j => j.id === jobId) ||
      this.processing.get(jobId) ||
      this.completed.find(j => j.id === jobId) ||
      this.deadLetterQueue.find(j => j.id === jobId)
    );
  }

  /**
   * Cancel job
   */
  cancelJob(jobId) {
    const jobIndex = this.queue.findIndex(j => j.id === jobId);
    if (jobIndex >= 0) {
      const job = this.queue.splice(jobIndex, 1)[0];
      job.status = 'CANCELLED';
      job.completedAt = new Date();
      this.completed.push(job);
      this.emit('job:cancelled', job);
      return true;
    }
    return false;
  }

  /**
   * Helper: Compare priority
   */
  comparePriority(a, b) {
    const priorityMap = { HIGH: 0, NORMAL: 1, LOW: 2 };
    return priorityMap[a] - priorityMap[b];
  }

  /**
   * Helper: Generate job ID
   */
  generateJobId() {
    return `job-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Helper: Calculate average job time
   */
  calculateAverageJobTime() {
    if (this.completed.length === 0) return 0;
    const totalTime = this.completed.reduce((sum, job) => {
      const duration = new Date(job.completedAt) - new Date(job.startedAt);
      return sum + duration;
    }, 0);
    return Math.round(totalTime / this.completed.length / 1000); // in seconds
  }

  /**
   * Helper: Calculate success rate
   */
  calculateSuccessRate() {
    const total = this.completed.length + this.deadLetterQueue.length;
    if (total === 0) return 100;
    return ((this.completed.length / total) * 100).toFixed(2);
  }

  /**
   * Persist queue to storage
   */
  async persistQueue() {
    try {
      const queueState = {
        queue: this.queue,
        processing: Array.from(this.processing.values()),
        completed: this.completed.slice(-100), // Keep last 100
        deadLetterQueue: this.deadLetterQueue,
        timestamp: new Date(),
      };

      await fs.writeFile(
        path.join(this.queuePath, 'queue-state.json'),
        JSON.stringify(queueState, null, 2)
      );
    } catch (error) {
      console.warn('⚠️  Failed to persist queue:', error.message);
    }
  }

  /**
   * Load persisted queue
   */
  async loadPersistedQueue() {
    try {
      const filePath = path.join(this.queuePath, 'queue-state.json');
      const content = await fs.readFile(filePath, 'utf8');
      const state = JSON.parse(content);

      this.queue = state.queue || [];
      this.completed = state.completed || [];
      this.deadLetterQueue = state.deadLetterQueue || [];
    } catch (error) {
      console.log('ℹ️  No persisted queue found, starting fresh');
    }
  }
}

module.exports = new BackupQueueSystem();
