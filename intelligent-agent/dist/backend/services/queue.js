"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addDatasetProcessingJob = exports.addModelTrainingJob = exports.addReportJob = exports.addEmailJob = exports.queueService = exports.QueueService = exports.JobType = void 0;
const bull_1 = __importDefault(require("bull"));
const logger_1 = require("../utils/logger");
const logger = (0, logger_1.createLogger)('QueueService');
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
    }
};
// Define job types
var JobType;
(function (JobType) {
    JobType["SEND_EMAIL"] = "send-email";
    JobType["GENERATE_REPORT"] = "generate-report";
    JobType["TRAIN_MODEL"] = "train-model";
    JobType["PROCESS_DATASET"] = "process-dataset";
    JobType["EXPORT_DATA"] = "export-data";
    JobType["CLEANUP_FILES"] = "cleanup-files";
    JobType["SEND_NOTIFICATION"] = "send-notification";
    JobType["BACKUP_DATABASE"] = "backup-database";
})(JobType || (exports.JobType = JobType = {}));
class QueueService {
    constructor() {
        this.queues = new Map();
        this.initializeQueues();
    }
    static getInstance() {
        if (!QueueService.instance) {
            QueueService.instance = new QueueService();
        }
        return QueueService.instance;
    }
    initializeQueues() {
        // Create queues for different job types
        Object.values(JobType).forEach(jobType => {
            const queue = new bull_1.default(jobType, queueConfig);
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
    async addJob(jobType, data, options) {
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
    async addDelayedJob(jobType, data, delayMs, options) {
        return this.addJob(jobType, data, {
            ...options,
            delay: delayMs
        });
    }
    // Add recurring job (cron)
    async addRecurringJob(jobType, data, cronExpression, options) {
        return this.addJob(jobType, data, {
            ...options,
            repeat: {
                cron: cronExpression
            }
        });
    }
    // Process jobs
    processJobs(jobType, processor, concurrency = 1) {
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
            }
            catch (error) {
                logger.error(`Job processing error: ${job.id}`, { error: error.message });
                throw error;
            }
        });
        logger.info(`Processor registered for: ${jobType}`, { concurrency });
    }
    // Get job status
    async getJob(jobType, jobId) {
        const queue = this.queues.get(jobType);
        if (!queue)
            return null;
        return queue.getJob(jobId);
    }
    // Get queue stats
    async getQueueStats(jobType) {
        const queue = this.queues.get(jobType);
        if (!queue)
            return null;
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
    async getAllQueueStats() {
        const stats = {};
        for (const [jobType, queue] of this.queues.entries()) {
            stats[jobType] = await this.getQueueStats(jobType);
        }
        return stats;
    }
    // Pause queue
    async pauseQueue(jobType) {
        const queue = this.queues.get(jobType);
        if (queue) {
            await queue.pause();
            logger.info(`Queue paused: ${jobType}`);
        }
    }
    // Resume queue
    async resumeQueue(jobType) {
        const queue = this.queues.get(jobType);
        if (queue) {
            await queue.resume();
            logger.info(`Queue resumed: ${jobType}`);
        }
    }
    // Clean queue
    async cleanQueue(jobType, grace = 0, status) {
        const queue = this.queues.get(jobType);
        if (queue) {
            await queue.clean(grace, status);
            logger.info(`Queue cleaned: ${jobType}`, { grace, status });
        }
    }
    // Empty queue (remove all jobs)
    async emptyQueue(jobType) {
        const queue = this.queues.get(jobType);
        if (queue) {
            await queue.empty();
            logger.info(`Queue emptied: ${jobType}`);
        }
    }
    // Close all queues
    async closeAll() {
        for (const [jobType, queue] of this.queues.entries()) {
            await queue.close();
            logger.info(`Queue closed: ${jobType}`);
        }
    }
}
exports.QueueService = QueueService;
// Singleton instance
exports.queueService = QueueService.getInstance();
// Export convenience methods
const addEmailJob = (data, options) => exports.queueService.addJob(JobType.SEND_EMAIL, data, options);
exports.addEmailJob = addEmailJob;
const addReportJob = (data, options) => exports.queueService.addJob(JobType.GENERATE_REPORT, data, options);
exports.addReportJob = addReportJob;
const addModelTrainingJob = (data, options) => exports.queueService.addJob(JobType.TRAIN_MODEL, data, options);
exports.addModelTrainingJob = addModelTrainingJob;
const addDatasetProcessingJob = (data, options) => exports.queueService.addJob(JobType.PROCESS_DATASET, data, options);
exports.addDatasetProcessingJob = addDatasetProcessingJob;
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
