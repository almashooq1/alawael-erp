import Queue, { Job, JobOptions } from 'bull';
import { createLogger } from '../utils/logger';

const logger = createLogger('QueueService');

// Queue configuration
const queueConfig = {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_QUEUE_DB || '1')
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    },
    removeOnComplete: true,
    removeOnFail: false
  } as JobOptions
};

// Define job types
export enum JobType {
  SEND_EMAIL = 'send-email',
  GENERATE_REPORT = 'generate-report',
  TRAIN_MODEL = 'train-model',
  PROCESS_DATASET = 'process-dataset',
  EXPORT_DATA = 'export-data',
  CLEANUP_FILES = 'cleanup-files',
  SEND_NOTIFICATION = 'send-notification',
  BACKUP_DATABASE = 'backup-database'
}

export class QueueService {
  private static instance: QueueService;
  private queues: Map<string, Queue.Queue> = new Map();

  private constructor() {
    this.initializeQueues();
  }

  public static getInstance(): QueueService {
    if (!QueueService.instance) {
      QueueService.instance = new QueueService();
    }
    return QueueService.instance;
  }

  private initializeQueues() {
    // Create queues for different job types
    Object.values(JobType).forEach(jobType => {
      const queue = new Queue(jobType, queueConfig);
      
      // Setup event handlers
      queue.on('completed', (job, result) => {
        logger.info(`Job completed: ${job.id}`, { jobType, result });
      });

      queue.on('failed', (job, err) => {
        logger.error(`Job failed: ${job.id}`, { jobType, error: err.message });
      });

      queue.on('error', (error) => {
        logger.error(`Queue error: ${jobType}`, { error: error.message });
      });

      this.queues.set(jobType, queue);
    });

    logger.info('All queues initialized');
  }

  // Add job to queue
  public async addJob(
    jobType: JobType,
    data: any,
    options?: JobOptions
  ): Promise<Job> {
    const queue = this.queues.get(jobType);
    if (!queue) {
      throw new Error(`Queue not found: ${jobType}`);
    }

    const job = await queue.add(data, {
      ...queueConfig.defaultJobOptions,
      ...options
    });

    logger.info(`Job added: ${job.id}`, { jobType, data });
    return job;
  }

  // Add job with delay
  public async addDelayedJob(
    jobType: JobType,
    data: any,
    delayMs: number,
    options?: JobOptions
  ): Promise<Job> {
    return this.addJob(jobType, data, {
      ...options,
      delay: delayMs
    });
  }

  // Add recurring job (cron)
  public async addRecurringJob(
    jobType: JobType,
    data: any,
    cronExpression: string,
    options?: JobOptions
  ): Promise<Job> {
    return this.addJob(jobType, data, {
      ...options,
      repeat: {
        cron: cronExpression
      }
    });
  }

  // Process jobs
  public processJobs(
    jobType: JobType,
    processor: (job: Job) => Promise<any>,
    concurrency: number = 1
  ) {
    const queue = this.queues.get(jobType);
    if (!queue) {
      throw new Error(`Queue not found: ${jobType}`);
    }

    queue.process(concurrency, async (job) => {
      logger.info(`Processing job: ${job.id}`, { jobType, data: job.data });
      
      try {
        const result = await processor(job);
        logger.info(`Job processed successfully: ${job.id}`, { result });
        return result;
      } catch (error: any) {
        logger.error(`Job processing error: ${job.id}`, { error: error.message });
        throw error;
      }
    });

    logger.info(`Processor registered for: ${jobType}`, { concurrency });
  }

  // Get job status
  public async getJob(jobType: JobType, jobId: string): Promise<Job | null> {
    const queue = this.queues.get(jobType);
    if (!queue) return null;
    return queue.getJob(jobId);
  }

  // Get queue stats
  public async getQueueStats(jobType: JobType) {
    const queue = this.queues.get(jobType);
    if (!queue) return null;

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount()
    ]);

    return { waiting, active, completed, failed, delayed };
  }

  // Get all queue stats
  public async getAllQueueStats() {
    const stats: any = {};
    
    for (const [jobType, queue] of this.queues.entries()) {
      stats[jobType] = await this.getQueueStats(jobType as JobType);
    }

    return stats;
  }

  // Pause queue
  public async pauseQueue(jobType: JobType) {
    const queue = this.queues.get(jobType);
    if (queue) {
      await queue.pause();
      logger.info(`Queue paused: ${jobType}`);
    }
  }

  // Resume queue
  public async resumeQueue(jobType: JobType) {
    const queue = this.queues.get(jobType);
    if (queue) {
      await queue.resume();
      logger.info(`Queue resumed: ${jobType}`);
    }
  }

  // Clean queue
  public async cleanQueue(
    jobType: JobType,
    grace: number = 0,
    status?: 'completed' | 'wait' | 'active' | 'delayed' | 'failed'
  ) {
    const queue = this.queues.get(jobType);
    if (queue) {
      await queue.clean(grace, status);
      logger.info(`Queue cleaned: ${jobType}`, { grace, status });
    }
  }

  // Empty queue (remove all jobs)
  public async emptyQueue(jobType: JobType) {
    const queue = this.queues.get(jobType);
    if (queue) {
      await queue.empty();
      logger.info(`Queue emptied: ${jobType}`);
    }
  }

  // Close all queues
  public async closeAll() {
    for (const [jobType, queue] of this.queues.entries()) {
      await queue.close();
      logger.info(`Queue closed: ${jobType}`);
    }
  }
}

// Singleton instance
export const queueService = QueueService.getInstance();

// Export convenience methods
export const addEmailJob = (data: any, options?: JobOptions) =>
  queueService.addJob(JobType.SEND_EMAIL, data, options);

export const addReportJob = (data: any, options?: JobOptions) =>
  queueService.addJob(JobType.GENERATE_REPORT, data, options);

export const addModelTrainingJob = (data: any, options?: JobOptions) =>
  queueService.addJob(JobType.TRAIN_MODEL, data, options);

export const addDatasetProcessingJob = (data: any, options?: JobOptions) =>
  queueService.addJob(JobType.PROCESS_DATASET, data, options);

// Example usage:
/*
import { queueService, JobType, addEmailJob } from './services/queue';

// Start processing jobs
queueService.processJobs(JobType.SEND_EMAIL, async (job) => {
  const { to, subject, body } = job.data;
  await sendEmail(to, subject, body);
  return { sent: true };
}, 5); // Process 5 emails concurrently

// Add a job
const job = await addEmailJob({
  to: 'user@example.com',
  subject: 'Welcome',
  body: 'Hello!'
});

// Add delayed job (send in 1 hour)
const delayedJob = await queueService.addDelayedJob(
  JobType.SEND_EMAIL,
  { to: 'user@example.com', subject: 'Reminder' },
  60 * 60 * 1000
);

// Add recurring job (daily backup at 2 AM)
const recurringJob = await queueService.addRecurringJob(
  JobType.BACKUP_DATABASE,
  { database: 'main' },
  '0 2 * * *'
);
*/
