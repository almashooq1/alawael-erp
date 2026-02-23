/**
 * Scheduler Service - خدمة الجدولة
 * Enterprise Job Scheduling for Alawael ERP
 */

const mongoose = require('mongoose');
const cron = require('node-cron');

/**
 * Scheduler Configuration
 */
const schedulerConfig = {
  // Max concurrent jobs
  maxConcurrentJobs: 100,
  
  // Job timeout (30 minutes)
  jobTimeout: 1800000,
  
  // Retry configuration
  retryAttempts: 3,
  retryDelay: 60000, // 1 minute
  
  // Cleanup interval (daily)
  cleanupInterval: '0 0 * * *',
  
  // History retention (days)
  historyRetention: 30,
};

/**
 * Job Schema
 */
const JobSchema = new mongoose.Schema({
  // Job identification
  name: { type: String, required: true },
  type: { type: String, required: true },
  description: String,
  
  // Schedule configuration
  schedule: {
    type: { type: String, enum: ['once', 'cron', 'interval'], required: true },
    cron: String, // Cron expression
    interval: Number, // Interval in milliseconds
    startDate: Date,
    endDate: Date,
  },
  
  // Job configuration
  config: {
    handler: { type: String, required: true }, // Handler name
    params: mongoose.Schema.Types.Mixed,
    timeout: { type: Number, default: schedulerConfig.jobTimeout },
    retries: { type: Number, default: 3 },
  },
  
  // Status
  status: { type: String, enum: ['active', 'paused', 'completed', 'failed'], default: 'active' },
  
  // Execution tracking
  lastRun: Date,
  nextRun: Date,
  runCount: { type: Number, default: 0 },
  failureCount: { type: Number, default: 0 },
  
  // Locking
  lockedAt: Date,
  lockedBy: String,
  
  // Metadata
  priority: { type: Number, default: 5 },
  tenantId: String,
  tags: [String],
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date,
}, {
  collection: 'scheduler_jobs',
});

// Indexes
JobSchema.index({ status: 1, nextRun: 1 });
JobSchema.index({ tenantId: 1 });

/**
 * Job History Schema
 */
const JobHistorySchema = new mongoose.Schema({
  jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
  jobName: String,
  
  // Execution details
  status: { type: String, enum: ['success', 'failed', 'timeout'], required: true },
  startedAt: { type: Date, required: true },
  completedAt: Date,
  duration: Number,
  
  // Results
  result: mongoose.Schema.Types.Mixed,
  error: String,
  
  // Metadata
  triggeredBy: String,
  tenantId: String,
}, {
  collection: 'scheduler_history',
});

// Indexes
JobHistorySchema.index({ jobId: 1, startedAt: -1 });
JobHistorySchema.index({ createdAt: 1 }, { expireAfterSeconds: schedulerConfig.historyRetention * 86400 });

/**
 * Scheduler Service Class
 */
class SchedulerService {
  constructor() {
    this.Job = null;
    this.JobHistory = null;
    this.handlers = new Map();
    this.cronJobs = new Map();
    this.intervalJobs = new Map();
    this.runningJobs = new Set();
    this.isRunning = false;
  }
  
  /**
   * Initialize scheduler
   */
  async initialize(connection) {
    this.Job = connection.model('Job', JobSchema);
    this.JobHistory = connection.model('JobHistory', JobHistorySchema);
    
    // Register default handlers
    this.registerDefaultHandlers();
    
    // Load and start all active jobs
    await this.loadJobs();
    
    // Start cleanup job
    this.startCleanup();
    
    this.isRunning = true;
    console.log('✅ Scheduler Service initialized');
  }
  
  /**
   * Register default handlers
   */
  registerDefaultHandlers() {
    // Email report handler
    this.registerHandler('sendReport', async (params) => {
      console.log(`Sending report: ${params.reportName}`);
      return { sent: true, recipients: params.recipients };
    });
    
    // Data cleanup handler
    this.registerHandler('cleanupData', async (params) => {
      console.log(`Cleaning up data older than ${params.days} days`);
      return { cleaned: true };
    });
    
    // Backup handler
    this.registerHandler('backup', async (params) => {
      console.log(`Creating backup: ${params.type}`);
      return { backupCreated: true };
    });
    
    // Sync handler
    this.registerHandler('sync', async (params) => {
      console.log(`Syncing: ${params.source}`);
      return { synced: true };
    });
    
    // Notification handler
    this.registerHandler('notify', async (params) => {
      console.log(`Sending notification: ${params.message}`);
      return { notified: true };
    });
    
    // Report generation handler
    this.registerHandler('generateReport', async (params) => {
      console.log(`Generating report: ${params.reportType}`);
      return { generated: true, reportId: Date.now() };
    });
  }
  
  /**
   * Register custom handler
   */
  registerHandler(name, handler) {
    this.handlers.set(name, handler);
  }
  
  /**
   * Load all active jobs
   */
  async loadJobs() {
    const jobs = await this.Job.find({ status: 'active' });
    
    for (const job of jobs) {
      await this.scheduleJob(job);
    }
    
    console.log(`📅 Loaded ${jobs.length} scheduled jobs`);
  }
  
  /**
   * Create a new job
   */
  async createJob(jobData) {
    const job = new this.Job(jobData);
    await job.save();
    
    if (job.status === 'active') {
      await this.scheduleJob(job);
    }
    
    return job;
  }
  
  /**
   * Schedule a job
   */
  async scheduleJob(job) {
    // Remove existing schedule
    this.unscheduleJob(job._id.toString());
    
    if (job.status !== 'active') return;
    
    const executeJob = async () => {
      await this.executeJob(job._id);
    };
    
    switch (job.schedule.type) {
      case 'cron':
        if (cron.validate(job.schedule.cron)) {
          const cronJob = cron.schedule(job.schedule.cron, executeJob, {
            timezone: 'Asia/Riyadh',
          });
          this.cronJobs.set(job._id.toString(), cronJob);
        }
        break;
        
      case 'interval':
        const intervalId = setInterval(executeJob, job.schedule.interval);
        this.intervalJobs.set(job._id.toString(), intervalId);
        break;
        
      case 'once':
        if (job.schedule.startDate) {
          const delay = new Date(job.schedule.startDate) - new Date();
          if (delay > 0) {
            const timeoutId = setTimeout(async () => {
              await this.executeJob(job._id);
              await this.Job.findByIdAndUpdate(job._id, { status: 'completed' });
            }, delay);
            this.intervalJobs.set(job._id.toString(), timeoutId);
          }
        }
        break;
    }
    
    // Calculate next run
    await this.updateNextRun(job);
  }
  
  /**
   * Unschedule a job
   */
  unscheduleJob(jobId) {
    if (this.cronJobs.has(jobId)) {
      this.cronJobs.get(jobId).stop();
      this.cronJobs.delete(jobId);
    }
    
    if (this.intervalJobs.has(jobId)) {
      clearInterval(this.intervalJobs.get(jobId));
      clearTimeout(this.intervalJobs.get(jobId));
      this.intervalJobs.delete(jobId);
    }
  }
  
  /**
   * Execute a job
   */
  async executeJob(jobId) {
    // Prevent concurrent execution
    if (this.runningJobs.has(jobId.toString())) {
      console.log(`Job ${jobId} is already running, skipping`);
      return;
    }
    
    const job = await this.Job.findById(jobId);
    if (!job || job.status !== 'active') return;
    
    // Acquire lock
    job.lockedAt = new Date();
    job.lockedBy = process.pid.toString();
    await job.save();
    
    this.runningJobs.add(jobId.toString());
    
    const historyEntry = {
      jobId: job._id,
      jobName: job.name,
      status: 'success',
      startedAt: new Date(),
      triggeredBy: 'scheduler',
      tenantId: job.tenantId,
    };
    
    try {
      // Get handler
      const handler = this.handlers.get(job.config.handler);
      if (!handler) {
        throw new Error(`Handler '${job.config.handler}' not found`);
      }
      
      // Execute with timeout
      const result = await this.executeWithTimeout(
        handler(job.config.params),
        job.config.timeout
      );
      
      historyEntry.completedAt = new Date();
      historyEntry.duration = historyEntry.completedAt - historyEntry.startedAt;
      historyEntry.result = result;
      
      // Update job
      job.lastRun = new Date();
      job.runCount += 1;
      job.failureCount = 0;
      job.lockedAt = null;
      job.lockedBy = null;
      await job.save();
      
    } catch (error) {
      historyEntry.status = 'failed';
      historyEntry.completedAt = new Date();
      historyEntry.duration = historyEntry.completedAt - historyEntry.startedAt;
      historyEntry.error = error.message;
      
      // Update job failure
      job.failureCount += 1;
      job.lockedAt = null;
      job.lockedBy = null;
      
      // Handle retry
      if (job.failureCount < job.config.retries) {
        console.log(`Retrying job ${job.name} (${job.failureCount}/${job.config.retries})`);
        setTimeout(() => this.executeJob(jobId), schedulerConfig.retryDelay);
      }
      
      await job.save();
    }
    
    // Save history
    await new this.JobHistory(historyEntry).save();
    
    // Update next run
    await this.updateNextRun(job);
    
    this.runningJobs.delete(jobId.toString());
    
    return historyEntry;
  }
  
  /**
   * Execute with timeout
   */
  async executeWithTimeout(promise, timeout) {
    return Promise.race([
      promise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Job timeout')), timeout)
      ),
    ]);
  }
  
  /**
   * Update next run time
   */
  async updateNextRun(job) {
    let nextRun = null;
    
    if (job.schedule.type === 'cron' && job.schedule.cron) {
      const interval = cron.parseExpression(job.schedule.cron, { timezone: 'Asia/Riyadh' });
      nextRun = interval.next().toDate();
    } else if (job.schedule.type === 'interval') {
      nextRun = new Date(Date.now() + job.schedule.interval);
    }
    
    await this.Job.findByIdAndUpdate(job._id, { nextRun });
  }
  
  /**
   * Pause a job
   */
  async pauseJob(jobId) {
    this.unscheduleJob(jobId);
    await this.Job.findByIdAndUpdate(jobId, { status: 'paused' });
  }
  
  /**
   * Resume a job
   */
  async resumeJob(jobId) {
    const job = await this.Job.findByIdAndUpdate(jobId, { status: 'active' }, { new: true });
    await this.scheduleJob(job);
  }
  
  /**
   * Delete a job
   */
  async deleteJob(jobId) {
    this.unscheduleJob(jobId);
    await this.Job.findByIdAndDelete(jobId);
  }
  
  /**
   * Run job immediately
   */
  async runNow(jobId) {
    return this.executeJob(jobId);
  }
  
  /**
   * Get job status
   */
  async getJobStatus(jobId) {
    const job = await this.Job.findById(jobId);
    return {
      name: job.name,
      status: job.status,
      lastRun: job.lastRun,
      nextRun: job.nextRun,
      runCount: job.runCount,
      failureCount: job.failureCount,
      isRunning: this.runningJobs.has(jobId.toString()),
    };
  }
  
  /**
   * Get all jobs
   */
  async getAllJobs(filter = {}) {
    return this.Job.find(filter).sort({ nextRun: 1 });
  }
  
  /**
   * Get job history
   */
  async getJobHistory(jobId, limit = 100) {
    return this.JobHistory.find({ jobId })
      .sort({ startedAt: -1 })
      .limit(limit);
  }
  
  /**
   * Start cleanup job
   */
  startCleanup() {
    cron.schedule(schedulerConfig.cleanupInterval, async () => {
      console.log('🧹 Cleaning up old job history...');
      
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - schedulerConfig.historyRetention);
      
      await this.JobHistory.deleteMany({
        startedAt: { $lt: cutoff }
      });
    });
  }
  
  /**
   * Shutdown scheduler
   */
  async shutdown() {
    // Stop all cron jobs
    for (const [id, cronJob] of this.cronJobs) {
      cronJob.stop();
    }
    
    // Clear all intervals
    for (const [id, intervalId] of this.intervalJobs) {
      clearInterval(intervalId);
      clearTimeout(intervalId);
    }
    
    // Wait for running jobs
    while (this.runningJobs.size > 0) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    this.isRunning = false;
    console.log('🔴 Scheduler Service shutdown');
  }
}

// Singleton instance
const schedulerService = new SchedulerService();

/**
 * Pre-defined Job Templates
 */
const jobTemplates = {
  // Daily report
  dailyReport: {
    name: 'daily_report',
    type: 'report',
    description: 'تقرير يومي',
    schedule: { type: 'cron', cron: '0 8 * * *' }, // Every day at 8 AM
    config: { handler: 'generateReport', params: { reportType: 'daily' } },
  },
  
  // Weekly backup
  weeklyBackup: {
    name: 'weekly_backup',
    type: 'backup',
    description: 'نسخ احتياطي أسبوعي',
    schedule: { type: 'cron', cron: '0 0 * * 0' }, // Every Sunday at midnight
    config: { handler: 'backup', params: { type: 'full' } },
  },
  
  // Monthly cleanup
  monthlyCleanup: {
    name: 'monthly_cleanup',
    type: 'cleanup',
    description: 'تنظيف شهري للبيانات',
    schedule: { type: 'cron', cron: '0 0 1 * *' }, // First day of month
    config: { handler: 'cleanupData', params: { days: 90 } },
  },
  
  // Hourly sync
  hourlySync: {
    name: 'hourly_sync',
    type: 'sync',
    description: 'مزامنة ساعية',
    schedule: { type: 'cron', cron: '0 * * * *' }, // Every hour
    config: { handler: 'sync', params: { source: 'external' } },
  },
  
  // Health check
  healthCheck: {
    name: 'health_check',
    type: 'monitoring',
    description: 'فحص صحة النظام',
    schedule: { type: 'interval', interval: 300000 }, // Every 5 minutes
    config: { handler: 'notify', params: { checkType: 'health' } },
  },
};

module.exports = {
  SchedulerService,
  schedulerService,
  schedulerConfig,
  jobTemplates,
};