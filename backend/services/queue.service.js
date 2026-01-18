const Queue = require('bull');
const { createClient } = require('redis');

// Redis Configuration (from Docker environment)
const redisConfig = {
  host: 'redis', // Docker service name
  port: 6379,
  maxRetriesPerRequest: null,
};

// 1. Define Queues
const emailQueue = new Queue('email-queue', { redis: redisConfig });
const reportsQueue = new Queue('reports-queue', { redis: redisConfig });
const aiPredictionsQueue = new Queue('ai-predictions-queue', { redis: redisConfig });

// 2. Process Jobs (Workers)
// In a real microservices architecture, these would be in a separate "worker" process
emailQueue.process(async job => {
  console.log(`📧 Processing email job ${job.id} for ${job.data.to}`);
  // Simulate email sending
  await new Promise(resolve => setTimeout(resolve, 1000));
  console.log(`✅ Email sent to ${job.data.to}`);
});

reportsQueue.process(async job => {
  console.log(`📊 Generating report ${job.data.reportId} (${job.data.type})`);
  // Simulate heavy calculation
  await new Promise(resolve => setTimeout(resolve, 5000));
  console.log(`✅ Report ${job.data.reportId} generated`);
});

// 3. Public API to Add Jobs
const addToQueue = async (queueName, data, options = {}) => {
  try {
    let queue;
    switch (queueName) {
      case 'email':
        queue = emailQueue;
        break;
      case 'reports':
        queue = reportsQueue;
        break;
      case 'ai':
        queue = aiPredictionsQueue;
        break;
      default:
        throw new Error(`Unknown queue: ${queueName}`);
    }

    // Default options for reliability
    const jobOptions = {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: true,
      ...options,
    };

    const job = await queue.add(data, jobOptions);
    console.log(`📥 Job added to ${queueName} queue: ${job.id}`);
    return job;
  } catch (error) {
    console.error('Queue Error:', error);
    // Fallback: execute synchronously if queue fails (optional)
    return null;
  }
};

module.exports = {
  addToQueue,
  queues: { emailQueue, reportsQueue, aiPredictionsQueue },
};
