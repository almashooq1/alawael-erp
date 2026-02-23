/**
 * Message Queue System - نظام قوائم الرسائل
 * Professional Job Queue for Alawael ERP
 */

const EventEmitter = require('events');

/**
 * Queue Configuration
 */
const queueConfig = {
  // Default job options
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: 100,
    removeOnFail: 500,
    timeout: 30000,
  },
  
  // Queue settings
  maxJobs: 10000,
  concurrency: 5,
};

/**
 * In-Memory Queue (for development)
 */
class InMemoryQueue extends EventEmitter {
  constructor(name, options = {}) {
    super();
    this.name = name;
    this.options = { ...queueConfig, ...options };
    this.jobs = new Map();
    this.pending = [];
    this.processing = new Map();
    this.completed = [];
    this.failed = [];
    this.workers = [];
    this.isPaused = false;
    this.jobIdCounter = 0;
  }
  
  /**
   * Add job to queue
   */
  async add(data, options = {}) {
    const jobId = ++this.jobIdCounter;
    const job = {
      id: `${this.name}:${jobId}`,
      name: this.name,
      data,
      options: { ...this.options.defaultJobOptions, ...options },
      attempts: 0,
      maxAttempts: options.attempts || this.options.defaultJobOptions.attempts,
      state: 'waiting',
      timestamp: Date.now(),
      processedOn: null,
      finishedOn: null,
      delay: options.delay || 0,
    };
    
    this.jobs.set(job.id, job);
    
    if (job.delay > 0) {
      setTimeout(() => {
        if (job.state === 'waiting') {
          this.pending.push(job);
          this.processNext();
        }
      }, job.delay);
    } else {
      this.pending.push(job);
      this.processNext();
    }
    
    this.emit('job:added', job);
    
    return job;
  }
  
  /**
   * Add bulk jobs
   */
  async addBulk(jobs) {
    const addedJobs = [];
    for (const { data, options } of jobs) {
      const job = await this.add(data, options);
      addedJobs.push(job);
    }
    return addedJobs;
  }
  
  /**
   * Process jobs
   */
  process(processor) {
    this.workers.push(processor);
    this.processNext();
  }
  
  /**
   * Process next job
   */
  async processNext() {
    if (this.isPaused) return;
    if (this.pending.length === 0) return;
    if (this.processing.size >= this.options.concurrency) return;
    
    const job = this.pending.shift();
    if (!job) return;
    
    job.state = 'active';
    job.processedOn = Date.now();
    this.processing.set(job.id, job);
    
    this.emit('job:active', job);
    
    try {
      // Find available worker
      const processor = this.workers[0];
      if (!processor) {
        this.pending.unshift(job);
        return;
      }
      
      const result = await processor(job);
      
      // Job completed successfully
      job.state = 'completed';
      job.finishedOn = Date.now();
      job.returnvalue = result;
      
      this.processing.delete(job.id);
      this.completed.push(job);
      
      // Trim completed jobs
      if (this.completed.length > this.options.defaultJobOptions.removeOnComplete) {
        const removed = this.completed.shift();
        this.jobs.delete(removed.id);
      }
      
      this.emit('job:completed', job, result);
    } catch (error) {
      job.attempts++;
      job.failedReason = error.message;
      
      if (job.attempts < job.maxAttempts) {
        // Retry with backoff
        const backoff = this.options.defaultJobOptions.backoff;
        const delay = backoff.type === 'exponential'
          ? backoff.delay * Math.pow(2, job.attempts - 1)
          : backoff.delay;
        
        setTimeout(() => {
          job.state = 'waiting';
          this.pending.push(job);
          this.processing.delete(job.id);
          this.emit('job:retry', job);
          this.processNext();
        }, delay);
      } else {
        // Job failed permanently
        job.state = 'failed';
        job.finishedOn = Date.now();
        
        this.processing.delete(job.id);
        this.failed.push(job);
        
        // Trim failed jobs
        if (this.failed.length > this.options.defaultJobOptions.removeOnFail) {
          const removed = this.failed.shift();
          this.jobs.delete(removed.id);
        }
        
        this.emit('job:failed', job, error);
      }
    }
    
    // Process next job
    setImmediate(() => this.processNext());
  }
  
  /**
   * Get job by ID
   */
  getJob(jobId) {
    return this.jobs.get(jobId);
  }
  
  /**
   * Get queue stats
   */
  getStats() {
    return {
      name: this.name,
      waiting: this.pending.length,
      active: this.processing.size,
      completed: this.completed.length,
      failed: this.failed.length,
      total: this.jobs.size,
      isPaused: this.isPaused,
    };
  }
  
  /**
   * Pause queue
   */
  pause() {
    this.isPaused = true;
    this.emit('queue:paused');
  }
  
  /**
   * Resume queue
   */
  resume() {
    this.isPaused = false;
    this.emit('queue:resumed');
    this.processNext();
  }
  
  /**
   * Clear queue
   */
  async empty() {
    this.pending = [];
    this.processing.clear();
    this.jobs.clear();
    this.emit('queue:emptied');
  }
  
  /**
   * Close queue
   */
  async close() {
    this.isPaused = true;
    this.emit('queue:closed');
  }
}

/**
 * Queue Manager
 */
class QueueManager {
  constructor() {
    this.queues = new Map();
    this.schedulers = new Map();
  }
  
  /**
   * Create or get queue
   */
  getQueue(name, options = {}) {
    if (!this.queues.has(name)) {
      const queue = new InMemoryQueue(name, options);
      this.queues.set(name, queue);
    }
    return this.queues.get(name);
  }
  
  /**
   * Create scheduled job
   */
  schedule(name, cron, data, options = {}) {
    const cronstrue = require('cronstrue');
    
    // Parse cron (simplified - use node-cron in production)
    const schedule = {
      name,
      cron,
      data,
      options,
      description: cronstrue.toString(cron),
      nextRun: this.getNextCronTime(cron),
      isRunning: false,
    };
    
    // Start scheduler
    schedule.timer = setInterval(() => {
      const now = new Date();
      if (this.shouldRunCron(cron, now)) {
        const queue = this.getQueue(name);
        queue.add(data, options);
        schedule.lastRun = now;
        schedule.nextRun = this.getNextCronTime(cron);
      }
    }, 60000); // Check every minute
    
    this.schedulers.set(name, schedule);
    
    return schedule;
  }
  
  /**
   * Get next cron time (simplified)
   */
  getNextCronTime(cron) {
    // Simplified - use proper cron library in production
    const now = new Date();
    return new Date(now.getTime() + 60000);
  }
  
  /**
   * Check if cron should run (simplified)
   */
  shouldRunCron(cron, date) {
    // Simplified - use proper cron library in production
    return date.getSeconds() === 0;
  }
  
  /**
   * Cancel scheduled job
   */
  cancelSchedule(name) {
    const schedule = this.schedulers.get(name);
    if (schedule && schedule.timer) {
      clearInterval(schedule.timer);
    }
    this.schedulers.delete(name);
  }
  
  /**
   * Get all queue stats
   */
  getAllStats() {
    const stats = {};
    for (const [name, queue] of this.queues) {
      stats[name] = queue.getStats();
    }
    return stats;
  }
  
  /**
   * Close all queues
   */
  async closeAll() {
    for (const queue of this.queues.values()) {
      await queue.close();
    }
    for (const schedule of this.schedulers.values()) {
      if (schedule.timer) {
        clearInterval(schedule.timer);
      }
    }
  }
}

// Singleton instance
const queueManager = new QueueManager();

/**
 * Predefined Job Types
 */
const JobTypes = {
  // Email Jobs
  EMAIL_SEND: 'email:send',
  EMAIL_BULK: 'email:bulk',
  EMAIL_NEWSLETTER: 'email:newsletter',
  
  // Report Jobs
  REPORT_GENERATE: 'report:generate',
  REPORT_EXPORT: 'report:export',
  REPORT_SCHEDULED: 'report:scheduled',
  
  // Notification Jobs
  NOTIFICATION_PUSH: 'notification:push',
  NOTIFICATION_SMS: 'notification:sms',
  NOTIFICATION_BULK: 'notification:bulk',
  
  // Data Processing Jobs
  DATA_IMPORT: 'data:import',
  DATA_EXPORT: 'data:export',
  DATA_SYNC: 'data:sync',
  DATA_BACKUP: 'data:backup',
  
  // Integration Jobs
  INTEGRATION_SYNC: 'integration:sync',
  INTEGRATION_WEBHOOK: 'integration:webhook',
  ZATCA_INVOICE: 'zatca:invoice',
  QIWA_SYNC: 'qiwa:sync',
  
  // Maintenance Jobs
  CLEANUP_TEMP: 'cleanup:temp',
  CLEANUP_LOGS: 'cleanup:logs',
  HEALTH_CHECK: 'health:check',
  
  // Analytics Jobs
  ANALYTICS_AGGREGATE: 'analytics:aggregate',
  ANALYTICS_REPORT: 'analytics:report',
};

/**
 * Create Queue Helper
 */
const createQueue = (name, options = {}) => {
  return queueManager.getQueue(name, options);
};

/**
 * Add Job Helper
 */
const addJob = async (queueName, data, options = {}) => {
  const queue = createQueue(queueName);
  return queue.add(data, options);
};

/**
 * Process Job Helper
 */
const processJob = (queueName, processor) => {
  const queue = createQueue(queueName);
  queue.process(processor);
  return queue;
};

// Export
module.exports = {
  InMemoryQueue,
  QueueManager,
  queueManager,
  JobTypes,
  createQueue,
  addJob,
  processJob,
  queueConfig,
};