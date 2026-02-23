/**
 * Batch Processor Service - خدمة المعالجة الدفعية
 * High-Performance Batch Processing for Archive Documents
 */

const mongoose = require('mongoose');
const EventEmitter = require('events');

/**
 * Batch Processing Configuration
 */
const batchConfig = {
  // Queue settings
  queue: {
    maxSize: 1000,
    processingConcurrency: 5,
    retryAttempts: 3,
    retryDelay: 5000, // 5 seconds
  },
  
  // Job types
  jobTypes: {
    upload: 'رفع مستندات',
    ocr: 'معالجة OCR',
    index: 'فهرسة',
    export: 'تصدير',
    migrate: 'ترحيل',
    delete: 'حذف',
    sign: 'توقيع',
  },
  
  // Priorities
  priorities: {
    low: 1,
    normal: 5,
    high: 10,
    critical: 20,
  },
};

/**
 * Batch Job Schema
 */
const BatchJobSchema = new mongoose.Schema({
  // Job identification
  jobId: { type: String, unique: true },
  name: String,
  type: { type: String, enum: Object.keys(batchConfig.jobTypes) },
  
  // Items to process
  items: [{
    itemId: String,
    data: mongoose.Schema.Types.Mixed,
    status: { type: String, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending' },
    result: mongoose.Schema.Types.Mixed,
    error: String,
    processedAt: Date,
    retryCount: { type: Number, default: 0 },
  }],
  
  // Progress
  progress: {
    total: { type: Number, default: 0 },
    completed: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
  },
  
  // Settings
  settings: {
    concurrency: { type: Number, default: 5 },
    stopOnError: { type: Boolean, default: false },
    retryFailed: { type: Boolean, default: true },
    notifyOnComplete: { type: Boolean, default: true },
    deleteOnComplete: { type: Boolean, default: false },
    expireAfter: { type: Number, default: 7 * 24 * 60 * 60 * 1000 }, // 7 days
  },
  
  // Priority
  priority: { type: Number, default: 5 },
  
  // Status
  status: { type: String, enum: ['queued', 'running', 'paused', 'completed', 'failed', 'cancelled'], default: 'queued' },
  
  // Timing
  scheduledAt: Date,
  startedAt: Date,
  completedAt: Date,
  
  // Processing info
  processing: {
    currentBatch: Number,
    totalBatches: Number,
    estimatedTimeRemaining: Number, // seconds
    processingSpeed: Number, // items per second
  },
  
  // Results
  results: {
    summary: mongoose.Schema.Types.Mixed,
    errors: [{
      itemId: String,
      error: String,
      timestamp: Date,
    }],
  },
  
  // Creator
  createdBy: String,
  tenantId: String,
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date,
}, {
  collection: 'batch_jobs',
});

// Indexes
BatchJobSchema.index({ status: 1, priority: -1 });
BatchJobSchema.index({ type: 1, createdAt: -1 });

/**
 * Batch Processor Service Class
 */
class BatchProcessorService extends EventEmitter {
  constructor() {
    super();
    this.BatchJob = null;
    this.processors = new Map();
    this.runningJobs = new Map();
    this.isProcessing = false;
  }
  
  /**
   * Initialize service
   */
  async initialize(connection) {
    this.BatchJob = connection.model('BatchJob', BatchJobSchema);
    
    // Register default processors
    this.registerDefaultProcessors();
    
    // Start queue processor
    this.startQueueProcessor();
    
    console.log('✅ Batch Processor Service initialized');
  }
  
  /**
   * Register default processors
   */
  registerDefaultProcessors() {
    // Upload processor
    this.registerProcessor('upload', async (item, context) => {
      // Would integrate with archive service
      return { success: true, documentId: `doc-${Date.now()}` };
    });
    
    // OCR processor
    this.registerProcessor('ocr', async (item, context) => {
      // Would integrate with OCR service
      return { success: true, text: 'OCR result' };
    });
    
    // Index processor
    this.registerProcessor('index', async (item, context) => {
      // Would integrate with smart indexing service
      return { success: true, indexed: true };
    });
    
    // Export processor
    this.registerProcessor('export', async (item, context) => {
      // Would handle document export
      return { success: true, exported: true };
    });
    
    // Delete processor
    this.registerProcessor('delete', async (item, context) => {
      // Would handle document deletion
      return { success: true, deleted: true };
    });
  }
  
  /**
   * Register processor
   */
  registerProcessor(type, processor) {
    this.processors.set(type, processor);
  }
  
  /**
   * Start queue processor
   */
  startQueueProcessor() {
    setInterval(() => this.processQueue(), 1000);
  }
  
  /**
   * Create batch job
   */
  async createJob(type, items, options = {}) {
    const jobId = `JOB-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const job = await this.BatchJob.create({
      jobId,
      name: options.name || `Batch ${type}`,
      type,
      items: items.map((item, index) => ({
        itemId: item.id || `item-${index}`,
        data: item,
        status: 'pending',
      })),
      progress: {
        total: items.length,
        completed: 0,
        failed: 0,
        percentage: 0,
      },
      settings: {
        concurrency: options.concurrency || 5,
        stopOnError: options.stopOnError || false,
        retryFailed: options.retryFailed !== false,
        notifyOnComplete: options.notifyOnComplete !== false,
        expireAfter: options.expireAfter || 7 * 24 * 60 * 60 * 1000,
      },
      priority: options.priority || 5,
      status: 'queued',
      scheduledAt: options.scheduledAt || new Date(),
      processing: {
        currentBatch: 0,
        totalBatches: Math.ceil(items.length / (options.concurrency || 5)),
      },
      createdBy: options.userId,
      tenantId: options.tenantId,
    });
    
    // Emit event
    this.emit('job:created', job);
    
    return job;
  }
  
  /**
   * Process queue
   */
  async processQueue() {
    if (this.runningJobs.size >= batchConfig.queue.processingConcurrency) {
      return;
    }
    
    // Find next job
    const job = await this.BatchJob.findOne({
      status: 'queued',
      scheduledAt: { $lte: new Date() },
    }).sort({ priority: -1, createdAt: 1 });
    
    if (!job) return;
    
    // Start processing
    this.processJob(job);
  }
  
  /**
   * Process job
   */
  async processJob(job) {
    job.status = 'running';
    job.startedAt = new Date();
    await job.save();
    
    this.runningJobs.set(job.jobId, job);
    this.emit('job:started', job);
    
    const processor = this.processors.get(job.type);
    if (!processor) {
      job.status = 'failed';
      await job.save();
      return;
    }
    
    const startTime = Date.now();
    
    try {
      // Process items in batches
      const pendingItems = job.items.filter(i => i.status === 'pending');
      const batchSize = job.settings.concurrency;
      
      for (let i = 0; i < pendingItems.length; i += batchSize) {
        if (job.status === 'paused' || job.status === 'cancelled') {
          break;
        }
        
        const batch = pendingItems.slice(i, i + batchSize);
        
        // Process batch concurrently
        const results = await Promise.allSettled(
          batch.map(item => this.processItem(job, item, processor))
        );
        
        // Update progress
        await this.updateProgress(job, results, startTime);
        
        job.processing.currentBatch = Math.floor(i / batchSize) + 1;
        await job.save();
      }
      
      // Finalize job
      if (job.status === 'running') {
        job.status = job.progress.failed > 0 && job.progress.completed === 0 ? 'failed' : 'completed';
        job.completedAt = new Date();
        await job.save();
      }
      
      this.emit('job:completed', job);
      
    } catch (error) {
      job.status = 'failed';
      await job.save();
      this.emit('job:error', { job, error });
    }
    
    this.runningJobs.delete(job.jobId);
  }
  
  /**
   * Process item
   */
  async processItem(job, item, processor) {
    item.status = 'processing';
    await job.save();
    
    try {
      const result = await processor(item.data, { job, item });
      
      item.status = 'completed';
      item.result = result;
      item.processedAt = new Date();
      
      return { success: true, item };
      
    } catch (error) {
      item.retryCount++;
      
      if (item.retryCount < batchConfig.queue.retryAttempts && job.settings.retryFailed) {
        item.status = 'pending';
      } else {
        item.status = 'failed';
        item.error = error.message;
        
        job.results.errors.push({
          itemId: item.itemId,
          error: error.message,
          timestamp: new Date(),
        });
      }
      
      return { success: false, item, error };
    }
  }
  
  /**
   * Update progress
   */
  async updateProgress(job, results, startTime) {
    const completed = results.filter(r => r.value?.success).length;
    const failed = results.filter(r => !r.value?.success).length;
    
    job.progress.completed += completed;
    job.progress.failed += failed;
    job.progress.percentage = Math.round(
      ((job.progress.completed + job.progress.failed) / job.progress.total) * 100
    );
    
    // Calculate processing speed
    const elapsed = (Date.now() - startTime) / 1000;
    job.processing.processingSpeed = (job.progress.completed + job.progress.failed) / elapsed;
    
    // Estimate remaining time
    const remaining = job.progress.total - job.progress.completed - job.progress.failed;
    job.processing.estimatedTimeRemaining = Math.round(remaining / job.processing.processingSpeed);
    
    await job.save();
    
    this.emit('job:progress', job);
  }
  
  /**
   * Get job
   */
  async getJob(jobId) {
    return this.BatchJob.findOne({ jobId });
  }
  
  /**
   * Get jobs by status
   */
  async getJobs(status, options = {}) {
    const filter = {};
    if (status) filter.status = status;
    if (options.tenantId) filter.tenantId = options.tenantId;
    
    return this.BatchJob.find(filter)
      .sort({ priority: -1, createdAt: -1 })
      .limit(options.limit || 50);
  }
  
  /**
   * Pause job
   */
  async pauseJob(jobId) {
    const job = await this.BatchJob.findOne({ jobId });
    if (!job) throw new Error('Job not found');
    
    if (job.status !== 'running') {
      throw new Error('Only running jobs can be paused');
    }
    
    job.status = 'paused';
    await job.save();
    
    return job;
  }
  
  /**
   * Resume job
   */
  async resumeJob(jobId) {
    const job = await this.BatchJob.findOne({ jobId });
    if (!job) throw new Error('Job not found');
    
    if (job.status !== 'paused') {
      throw new Error('Only paused jobs can be resumed');
    }
    
    job.status = 'queued';
    await job.save();
    
    return job;
  }
  
  /**
   * Cancel job
   */
  async cancelJob(jobId) {
    const job = await this.BatchJob.findOne({ jobId });
    if (!job) throw new Error('Job not found');
    
    if (job.status === 'completed') {
      throw new Error('Completed jobs cannot be cancelled');
    }
    
    job.status = 'cancelled';
    await job.save();
    
    return job;
  }
  
  /**
   * Retry failed items
   */
  async retryFailedItems(jobId) {
    const job = await this.BatchJob.findOne({ jobId });
    if (!job) throw new Error('Job not found');
    
    // Reset failed items to pending
    for (const item of job.items) {
      if (item.status === 'failed') {
        item.status = 'pending';
        item.retryCount = 0;
      }
    }
    
    job.progress.failed = 0;
    job.status = 'queued';
    await job.save();
    
    return job;
  }
  
  /**
   * Get statistics
   */
  async getStatistics(tenantId) {
    const filter = tenantId ? { tenantId } : {};
    
    const [total, queued, running, completed, failed] = await Promise.all([
      this.BatchJob.countDocuments(filter),
      this.BatchJob.countDocuments({ ...filter, status: 'queued' }),
      this.BatchJob.countDocuments({ ...filter, status: 'running' }),
      this.BatchJob.countDocuments({ ...filter, status: 'completed' }),
      this.BatchJob.countDocuments({ ...filter, status: 'failed' }),
    ]);
    
    const byType = await this.BatchJob.aggregate([
      { $match: filter },
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ]);
    
    return {
      total,
      queued,
      running,
      completed,
      failed,
      byType: byType.reduce((acc, item) => ({ ...acc, [item._id]: item.count }), {}),
    };
  }
  
  /**
   * Clean expired jobs
   */
  async cleanExpired() {
    const result = await this.BatchJob.deleteMany({
      status: { $in: ['completed', 'failed', 'cancelled'] },
      completedAt: { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    });
    
    return { deleted: result.deletedCount };
  }
}

// Singleton instance
const batchProcessorService = new BatchProcessorService();

/**
 * Job Types (Arabic)
 */
const jobTypes = {
  upload: { name: 'upload', label: 'رفع مستندات', icon: 'upload' },
  ocr: { name: 'ocr', label: 'معالجة OCR', icon: 'scan' },
  index: { name: 'index', label: 'فهرسة', icon: 'index' },
  export: { name: 'export', label: 'تصدير', icon: 'download' },
  migrate: { name: 'migrate', label: 'ترحيل', icon: 'move' },
  delete: { name: 'delete', label: 'حذف', icon: 'trash' },
  sign: { name: 'sign', label: 'توقيع', icon: 'pen' },
};

module.exports = {
  BatchProcessorService,
  batchProcessorService,
  batchConfig,
  jobTypes,
};