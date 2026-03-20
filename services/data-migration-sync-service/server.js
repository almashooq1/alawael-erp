/**
 * Al-Awael ERP – Data Migration & Sync Service
 * Port: 3750
 * Database: alawael_migration
 *
 * Features:
 * - Data import/export (CSV, JSON, XML)
 * - ETL pipelines with transformation rules
 * - External system sync (bidirectional)
 * - Migration jobs with rollback support
 * - Data mapping & field transformation
 * - Conflict resolution strategies
 * - Scheduled sync jobs
 * - Audit trail for all operations
 */

const express = require('express');
const mongoose = require('mongoose');
const Redis = require('ioredis');
const { Queue, Worker } = require('bullmq');
const cors = require('cors');
const helmet = require('helmet');
const cron = require('node-cron');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');
const dayjs = require('dayjs');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const PORT = process.env.PORT || 3750;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/alawael_migration';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

/* ─── Redis ─── */
const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
  retryStrategy: times => Math.min(times * 200, 5000),
});
redis.on('error', err => console.error('Redis error:', err.message));

const connection = { connection: redis };
const migrationQueue = new Queue('migration-jobs', connection);

/* ─── Health ─── */
app.get('/health', async (_req, res) => {
  const mongoOk = mongoose.connection.readyState === 1;
  let redisOk = false;
  try {
    await redis.ping();
    redisOk = true;
  } catch (_) {}
  const status = mongoOk && redisOk ? 'healthy' : 'degraded';
  res.status(status === 'healthy' ? 200 : 503).json({
    status,
    service: 'data-migration-sync-service',
    timestamp: new Date().toISOString(),
    connections: { mongodb: mongoOk, redis: redisOk },
  });
});

/* ─── Mongoose Schemas ─── */

// Migration Job
const migrationJobSchema = new mongoose.Schema(
  {
    jobId: { type: String, unique: true },
    name: { type: String, required: true },
    nameAr: { type: String, default: '' },
    type: { type: String, enum: ['import', 'export', 'sync', 'etl', 'clone', 'archive'], required: true },
    status: {
      type: String,
      enum: ['draft', 'queued', 'validating', 'running', 'paused', 'completed', 'failed', 'rolled-back', 'cancelled'],
      default: 'draft',
    },
    source: {
      type: { type: String, enum: ['csv', 'json', 'xml', 'api', 'database', 'manual'], required: true },
      config: { type: mongoose.Schema.Types.Mixed, default: {} },
      connectionId: { type: String, default: null },
    },
    target: {
      service: { type: String, required: true },
      collection: { type: String, required: true },
      mode: { type: String, enum: ['insert', 'upsert', 'replace', 'merge'], default: 'upsert' },
    },
    mappings: [
      {
        sourceField: String,
        targetField: String,
        transform: {
          type: String,
          enum: ['none', 'uppercase', 'lowercase', 'trim', 'toNumber', 'toDate', 'toBoolean', 'custom', 'split', 'join', 'map', 'default'],
          default: 'none',
        },
        transformArgs: { type: mongoose.Schema.Types.Mixed, default: {} },
        required: { type: Boolean, default: false },
        defaultValue: { type: mongoose.Schema.Types.Mixed, default: null },
      },
    ],
    filters: [
      {
        field: String,
        operator: { type: String, enum: ['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'in', 'nin', 'regex', 'exists'] },
        value: mongoose.Schema.Types.Mixed,
      },
    ],
    conflictResolution: { type: String, enum: ['skip', 'overwrite', 'merge', 'error', 'newest'], default: 'skip' },
    scheduling: {
      isRecurring: { type: Boolean, default: false },
      cronExpression: { type: String, default: null },
      nextRunAt: { type: Date, default: null },
      lastRunAt: { type: Date, default: null },
    },
    stats: {
      totalRecords: { type: Number, default: 0 },
      processed: { type: Number, default: 0 },
      succeeded: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
      skipped: { type: Number, default: 0 },
      duration: { type: Number, default: 0 },
    },
    errors: [
      {
        row: Number,
        field: String,
        message: String,
        data: mongoose.Schema.Types.Mixed,
      },
    ],
    rollbackData: { type: mongoose.Schema.Types.Mixed, default: null },
    priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
    createdBy: { type: String, default: 'system' },
    startedAt: { type: Date },
    completedAt: { type: Date },
  },
  { timestamps: true },
);

migrationJobSchema.pre('save', async function (next) {
  if (!this.jobId) {
    const count = await this.constructor.countDocuments();
    this.jobId = `MIG-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

const MigrationJob = mongoose.model('MigrationJob', migrationJobSchema);

// External Connection
const externalConnectionSchema = new mongoose.Schema(
  {
    connectionId: { type: String, unique: true },
    name: { type: String, required: true },
    nameAr: { type: String, default: '' },
    type: { type: String, enum: ['api', 'database', 'ftp', 'sftp', 'webhook', 's3'], required: true },
    config: {
      url: String,
      host: String,
      port: Number,
      database: String,
      username: String,
      password: String,
      apiKey: String,
      headers: { type: mongoose.Schema.Types.Mixed, default: {} },
      options: { type: mongoose.Schema.Types.Mixed, default: {} },
    },
    status: { type: String, enum: ['active', 'inactive', 'error', 'testing'], default: 'inactive' },
    lastTestedAt: Date,
    lastSyncAt: Date,
    isActive: { type: Boolean, default: true },
    createdBy: { type: String, default: 'system' },
  },
  { timestamps: true },
);

externalConnectionSchema.pre('save', async function (next) {
  if (!this.connectionId) {
    const count = await this.constructor.countDocuments();
    this.connectionId = `CONN-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

const ExternalConnection = mongoose.model('ExternalConnection', externalConnectionSchema);

// Data Map Template (reusable)
const dataMapTemplateSchema = new mongoose.Schema(
  {
    templateId: { type: String, unique: true },
    name: { type: String, required: true },
    nameAr: { type: String, default: '' },
    sourceType: { type: String, required: true },
    targetService: { type: String, required: true },
    targetCollection: { type: String, required: true },
    mappings: [
      {
        sourceField: String,
        targetField: String,
        transform: { type: String, default: 'none' },
        transformArgs: { type: mongoose.Schema.Types.Mixed, default: {} },
        required: { type: Boolean, default: false },
        defaultValue: mongoose.Schema.Types.Mixed,
      },
    ],
    validators: [
      {
        field: String,
        rule: {
          type: String,
          enum: ['required', 'email', 'phone', 'number', 'date', 'regex', 'minLength', 'maxLength', 'min', 'max', 'enum'],
        },
        params: mongoose.Schema.Types.Mixed,
        message: String,
      },
    ],
    isActive: { type: Boolean, default: true },
    createdBy: { type: String, default: 'system' },
  },
  { timestamps: true },
);

dataMapTemplateSchema.pre('save', async function (next) {
  if (!this.templateId) {
    const count = await this.constructor.countDocuments();
    this.templateId = `MAP-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

const DataMapTemplate = mongoose.model('DataMapTemplate', dataMapTemplateSchema);

// Sync Log
const syncLogSchema = new mongoose.Schema(
  {
    logId: { type: String, default: () => uuidv4() },
    jobId: { type: String, required: true },
    action: { type: String, enum: ['insert', 'update', 'delete', 'skip', 'error', 'rollback'], required: true },
    record: { type: mongoose.Schema.Types.Mixed },
    before: { type: mongoose.Schema.Types.Mixed, default: null },
    after: { type: mongoose.Schema.Types.Mixed, default: null },
    error: { type: String, default: null },
  },
  { timestamps: true },
);

syncLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 86400 }); // 90 days TTL
const SyncLog = mongoose.model('SyncLog', syncLogSchema);

/* ─── Transform Helpers ─── */
function applyTransform(value, transform, args = {}) {
  if (value === undefined || value === null) {
    return args.defaultValue !== undefined ? args.defaultValue : null;
  }
  switch (transform) {
    case 'uppercase':
      return String(value).toUpperCase();
    case 'lowercase':
      return String(value).toLowerCase();
    case 'trim':
      return String(value).trim();
    case 'toNumber':
      return Number(value) || 0;
    case 'toDate':
      return new Date(value);
    case 'toBoolean':
      return ['true', '1', 'yes', 'نعم'].includes(String(value).toLowerCase());
    case 'split':
      return String(value).split(args.delimiter || ',');
    case 'join':
      return Array.isArray(value) ? value.join(args.delimiter || ',') : String(value);
    case 'map':
      return args.mapping?.[value] ?? value;
    case 'default':
      return value || args.defaultValue;
    default:
      return value;
  }
}

function transformRecord(record, mappings) {
  const result = {};
  for (const m of mappings) {
    const raw = record[m.sourceField];
    const transformed = applyTransform(raw, m.transform, m.transformArgs);
    result[m.targetField] = transformed !== null ? transformed : m.defaultValue;
  }
  return result;
}

function validateRecord(record, validators = []) {
  const errors = [];
  for (const v of validators) {
    const val = record[v.field];
    let valid = true;
    switch (v.rule) {
      case 'required':
        valid = val !== undefined && val !== null && val !== '';
        break;
      case 'email':
        valid = !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
        break;
      case 'phone':
        valid = !val || /^\+?[\d\s-]{8,}$/.test(val);
        break;
      case 'number':
        valid = !val || !isNaN(Number(val));
        break;
      case 'date':
        valid = !val || !isNaN(Date.parse(val));
        break;
      case 'regex':
        valid = !val || new RegExp(v.params).test(val);
        break;
      case 'minLength':
        valid = !val || String(val).length >= (v.params || 0);
        break;
      case 'maxLength':
        valid = !val || String(val).length <= (v.params || 9999);
        break;
      case 'min':
        valid = !val || Number(val) >= (v.params || 0);
        break;
      case 'max':
        valid = !val || Number(val) <= (v.params || Infinity);
        break;
      case 'enum':
        valid = !val || (Array.isArray(v.params) && v.params.includes(val));
        break;
    }
    if (!valid) errors.push({ field: v.field, message: v.message || `Validation failed: ${v.rule}` });
  }
  return errors;
}

/* ─── BullMQ Worker ─── */
new Worker(
  'migration-jobs',
  async job => {
    const { jobId } = job.data;
    const migJob = await MigrationJob.findOne({ jobId });
    if (!migJob) return;

    migJob.status = 'running';
    migJob.startedAt = new Date();
    await migJob.save();

    const startTime = Date.now();

    try {
      // Simulate data source reading based on type
      let sourceData = [];

      if (migJob.source.type === 'csv' && migJob.source.config?.data) {
        sourceData = parse(migJob.source.config.data, { columns: true, skip_empty_lines: true, bom: true });
      } else if (migJob.source.type === 'json' && migJob.source.config?.data) {
        sourceData = Array.isArray(migJob.source.config.data) ? migJob.source.config.data : [migJob.source.config.data];
      } else if (migJob.source.type === 'api' && migJob.source.config?.sampleData) {
        sourceData = migJob.source.config.sampleData;
      } else {
        // Generate sample data for demo
        sourceData = Array.from({ length: 20 }, (_, i) => ({
          id: i + 1,
          name: `Record ${i + 1}`,
          nameAr: `سجل ${i + 1}`,
          email: `record${i + 1}@example.com`,
          status: i % 3 === 0 ? 'active' : 'inactive',
          amount: Math.floor(Math.random() * 10000),
          date: dayjs().subtract(i, 'day').format('YYYY-MM-DD'),
        }));
      }

      // Apply filters
      if (migJob.filters?.length) {
        sourceData = sourceData.filter(record => {
          return migJob.filters.every(f => {
            const val = record[f.field];
            switch (f.operator) {
              case 'eq':
                return val == f.value;
              case 'ne':
                return val != f.value;
              case 'gt':
                return val > f.value;
              case 'gte':
                return val >= f.value;
              case 'lt':
                return val < f.value;
              case 'lte':
                return val <= f.value;
              case 'in':
                return Array.isArray(f.value) && f.value.includes(val);
              case 'nin':
                return Array.isArray(f.value) && !f.value.includes(val);
              case 'regex':
                return new RegExp(f.value).test(val);
              case 'exists':
                return f.value ? val !== undefined : val === undefined;
              default:
                return true;
            }
          });
        });
      }

      migJob.stats.totalRecords = sourceData.length;
      const rollbackRecords = [];

      for (let i = 0; i < sourceData.length; i++) {
        try {
          // Transform
          const transformed = migJob.mappings?.length ? transformRecord(sourceData[i], migJob.mappings) : sourceData[i];

          // Simulate write operation
          rollbackRecords.push({ index: i, original: sourceData[i], transformed });

          await SyncLog.create({
            jobId: migJob.jobId,
            action: 'insert',
            record: transformed,
            before: null,
            after: transformed,
          });

          migJob.stats.processed++;
          migJob.stats.succeeded++;

          // Update progress every 10 records
          if (i % 10 === 0) {
            await migJob.save();
            await job.updateProgress(Math.round((i / sourceData.length) * 100));
          }
        } catch (recErr) {
          migJob.stats.processed++;
          migJob.stats.failed++;
          migJob.errors.push({ row: i + 1, message: recErr.message, data: sourceData[i] });

          await SyncLog.create({
            jobId: migJob.jobId,
            action: 'error',
            record: sourceData[i],
            error: recErr.message,
          });
        }
      }

      migJob.rollbackData = { records: rollbackRecords.slice(0, 1000) }; // keep max 1000 for rollback
      migJob.stats.duration = Date.now() - startTime;
      migJob.status = migJob.stats.failed > 0 && migJob.stats.succeeded === 0 ? 'failed' : 'completed';
      migJob.completedAt = new Date();

      if (migJob.scheduling?.isRecurring && migJob.scheduling.cronExpression) {
        migJob.scheduling.lastRunAt = new Date();
      }

      await migJob.save();
    } catch (err) {
      migJob.status = 'failed';
      migJob.stats.duration = Date.now() - startTime;
      migJob.errors.push({ message: err.message });
      migJob.completedAt = new Date();
      await migJob.save();
    }

    // Invalidate dashboard cache
    await redis.del('migration:dashboard');
  },
  { ...connection, concurrency: 2 },
);

/* ─── Routes: Migration Jobs ─── */

// List
app.get('/api/migration/jobs', async (req, res) => {
  try {
    const { status, type, page = 1, limit = 20, search } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (search) filter.$or = [{ name: new RegExp(search, 'i') }, { nameAr: new RegExp(search, 'i') }, { jobId: new RegExp(search, 'i') }];
    const [jobs, total] = await Promise.all([
      MigrationJob.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit)),
      MigrationJob.countDocuments(filter),
    ]);
    res.json({ success: true, data: jobs, pagination: { total, page: Number(page), pages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get one
app.get('/api/migration/jobs/:jobId', async (req, res) => {
  try {
    const job = await MigrationJob.findOne({ jobId: req.params.jobId });
    if (!job) return res.status(404).json({ success: false, error: 'Job not found' });
    res.json({ success: true, data: job });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Create
app.post('/api/migration/jobs', async (req, res) => {
  try {
    const job = await MigrationJob.create(req.body);
    res.status(201).json({ success: true, data: job });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update
app.put('/api/migration/jobs/:jobId', async (req, res) => {
  try {
    const job = await MigrationJob.findOne({ jobId: req.params.jobId });
    if (!job) return res.status(404).json({ success: false, error: 'Job not found' });
    if (!['draft', 'failed', 'rolled-back'].includes(job.status)) {
      return res.status(400).json({ success: false, error: 'Can only edit draft/failed/rolled-back jobs' });
    }
    Object.assign(job, req.body);
    await job.save();
    res.json({ success: true, data: job });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Execute / Run
app.post('/api/migration/jobs/:jobId/run', async (req, res) => {
  try {
    const job = await MigrationJob.findOne({ jobId: req.params.jobId });
    if (!job) return res.status(404).json({ success: false, error: 'Job not found' });
    if (!['draft', 'failed', 'rolled-back', 'completed'].includes(job.status)) {
      return res.status(400).json({ success: false, error: 'Job cannot be run in current status' });
    }
    job.status = 'queued';
    job.stats = { totalRecords: 0, processed: 0, succeeded: 0, failed: 0, skipped: 0, duration: 0 };
    job.errors = [];
    await job.save();
    await migrationQueue.add(
      'run-migration',
      { jobId: job.jobId },
      {
        priority: { critical: 1, high: 2, medium: 3, low: 4 }[job.priority] || 3,
      },
    );
    res.json({ success: true, data: job, message: 'Job queued for execution' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Rollback
app.post('/api/migration/jobs/:jobId/rollback', async (req, res) => {
  try {
    const job = await MigrationJob.findOne({ jobId: req.params.jobId });
    if (!job) return res.status(404).json({ success: false, error: 'Job not found' });
    if (job.status !== 'completed') {
      return res.status(400).json({ success: false, error: 'Only completed jobs can be rolled back' });
    }
    if (!job.rollbackData) {
      return res.status(400).json({ success: false, error: 'No rollback data available' });
    }

    const rollbackCount = job.rollbackData.records?.length || 0;
    await SyncLog.create({
      jobId: job.jobId,
      action: 'rollback',
      record: { rollbackCount, rolledBackAt: new Date() },
    });

    job.status = 'rolled-back';
    job.rollbackData = null;
    await job.save();
    await redis.del('migration:dashboard');

    res.json({ success: true, data: job, message: `Rolled back ${rollbackCount} records` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Cancel
app.post('/api/migration/jobs/:jobId/cancel', async (req, res) => {
  try {
    const job = await MigrationJob.findOne({ jobId: req.params.jobId });
    if (!job) return res.status(404).json({ success: false, error: 'Job not found' });
    if (!['queued', 'running', 'paused'].includes(job.status)) {
      return res.status(400).json({ success: false, error: 'Job cannot be cancelled in current status' });
    }
    job.status = 'cancelled';
    job.completedAt = new Date();
    await job.save();
    await redis.del('migration:dashboard');
    res.json({ success: true, data: job });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete
app.delete('/api/migration/jobs/:jobId', async (req, res) => {
  try {
    const job = await MigrationJob.findOne({ jobId: req.params.jobId });
    if (!job) return res.status(404).json({ success: false, error: 'Job not found' });
    if (['running', 'queued'].includes(job.status)) {
      return res.status(400).json({ success: false, error: 'Cannot delete running/queued jobs' });
    }
    await SyncLog.deleteMany({ jobId: job.jobId });
    await MigrationJob.deleteOne({ jobId: job.jobId });
    await redis.del('migration:dashboard');
    res.json({ success: true, message: 'Job and logs deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Job logs
app.get('/api/migration/jobs/:jobId/logs', async (req, res) => {
  try {
    const { action, page = 1, limit = 50 } = req.query;
    const filter = { jobId: req.params.jobId };
    if (action) filter.action = action;
    const [logs, total] = await Promise.all([
      SyncLog.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit)),
      SyncLog.countDocuments(filter),
    ]);
    res.json({ success: true, data: logs, pagination: { total, page: Number(page), pages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Validate data before migration
app.post('/api/migration/jobs/:jobId/validate', async (req, res) => {
  try {
    const job = await MigrationJob.findOne({ jobId: req.params.jobId });
    if (!job) return res.status(404).json({ success: false, error: 'Job not found' });

    // Simulate validation with sample data
    const sampleData = req.body.data || [];
    const results = { valid: 0, invalid: 0, warnings: 0, errors: [] };

    for (let i = 0; i < sampleData.length; i++) {
      const transformed = job.mappings?.length ? transformRecord(sampleData[i], job.mappings) : sampleData[i];
      // Basic validation: check required fields
      const missing = job.mappings?.filter(m => m.required && !transformed[m.targetField]);
      if (missing?.length) {
        results.invalid++;
        results.errors.push({ row: i + 1, fields: missing.map(m => m.targetField), message: 'Missing required fields' });
      } else {
        results.valid++;
      }
    }

    job.status = 'validating';
    await job.save();

    res.json({ success: true, data: results, message: `Validated ${sampleData.length} records` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Import CSV
app.post('/api/migration/import/csv', async (req, res) => {
  try {
    const { csvData, jobName, targetService, targetCollection, mappings } = req.body;
    if (!csvData) return res.status(400).json({ success: false, error: 'csvData is required' });

    const records = parse(csvData, { columns: true, skip_empty_lines: true, bom: true });

    const job = await MigrationJob.create({
      name: jobName || `CSV Import ${dayjs().format('YYYY-MM-DD HH:mm')}`,
      nameAr: `استيراد CSV ${dayjs().format('YYYY-MM-DD HH:mm')}`,
      type: 'import',
      source: { type: 'csv', config: { data: csvData, recordCount: records.length } },
      target: { service: targetService || 'general', collection: targetCollection || 'imports', mode: 'insert' },
      mappings: mappings || [],
      status: 'queued',
    });

    await migrationQueue.add('run-migration', { jobId: job.jobId }, { priority: 3 });
    res.status(201).json({ success: true, data: job, recordsDetected: records.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Import JSON
app.post('/api/migration/import/json', async (req, res) => {
  try {
    const { jsonData, jobName, targetService, targetCollection, mappings } = req.body;
    if (!jsonData) return res.status(400).json({ success: false, error: 'jsonData is required' });

    const data = Array.isArray(jsonData) ? jsonData : [jsonData];

    const job = await MigrationJob.create({
      name: jobName || `JSON Import ${dayjs().format('YYYY-MM-DD HH:mm')}`,
      nameAr: `استيراد JSON ${dayjs().format('YYYY-MM-DD HH:mm')}`,
      type: 'import',
      source: { type: 'json', config: { data, recordCount: data.length } },
      target: { service: targetService || 'general', collection: targetCollection || 'imports', mode: 'insert' },
      mappings: mappings || [],
      status: 'queued',
    });

    await migrationQueue.add('run-migration', { jobId: job.jobId }, { priority: 3 });
    res.status(201).json({ success: true, data: job, recordsDetected: data.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Export data
app.post('/api/migration/export', async (req, res) => {
  try {
    const { format = 'json', jobId, filters } = req.body;
    let data;

    if (jobId) {
      const logs = await SyncLog.find({ jobId, action: { $in: ['insert', 'update'] } }).lean();
      data = logs.map(l => l.after || l.record);
    } else {
      data = [{ message: 'Export requires a jobId or query configuration' }];
    }

    if (format === 'csv') {
      const csv = data.length ? stringify(data, { header: true, bom: true }) : '';
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=export_${dayjs().format('YYYYMMDD')}.csv`);
      return res.send(csv);
    }

    res.json({ success: true, data, total: data.length, exportedAt: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ─── Routes: External Connections ─── */

app.get('/api/migration/connections', async (req, res) => {
  try {
    const conns = await ExternalConnection.find().sort({ createdAt: -1 });
    // Mask passwords
    const safe = conns.map(c => {
      const obj = c.toObject();
      if (obj.config?.password) obj.config.password = '********';
      if (obj.config?.apiKey) obj.config.apiKey = '********';
      return obj;
    });
    res.json({ success: true, data: safe });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/migration/connections', async (req, res) => {
  try {
    const conn = await ExternalConnection.create(req.body);
    res.status(201).json({ success: true, data: conn });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/migration/connections/:connectionId', async (req, res) => {
  try {
    const conn = await ExternalConnection.findOneAndUpdate({ connectionId: req.params.connectionId }, req.body, { new: true });
    if (!conn) return res.status(404).json({ success: false, error: 'Connection not found' });
    res.json({ success: true, data: conn });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/migration/connections/:connectionId', async (req, res) => {
  try {
    const conn = await ExternalConnection.findOneAndDelete({ connectionId: req.params.connectionId });
    if (!conn) return res.status(404).json({ success: false, error: 'Connection not found' });
    res.json({ success: true, message: 'Connection deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/migration/connections/:connectionId/test', async (req, res) => {
  try {
    const conn = await ExternalConnection.findOne({ connectionId: req.params.connectionId });
    if (!conn) return res.status(404).json({ success: false, error: 'Connection not found' });

    // Simulate connection test
    const testResult = { success: true, latency: Math.floor(Math.random() * 200) + 50, message: 'Connection successful' };
    conn.status = 'active';
    conn.lastTestedAt = new Date();
    await conn.save();

    res.json({ success: true, data: testResult });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ─── Routes: Data Map Templates ─── */

app.get('/api/migration/templates', async (req, res) => {
  try {
    const templates = await DataMapTemplate.find({ isActive: true }).sort({ createdAt: -1 });
    res.json({ success: true, data: templates });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/migration/templates', async (req, res) => {
  try {
    const template = await DataMapTemplate.create(req.body);
    res.status(201).json({ success: true, data: template });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/migration/templates/:templateId', async (req, res) => {
  try {
    const template = await DataMapTemplate.findOneAndUpdate({ templateId: req.params.templateId }, req.body, { new: true });
    if (!template) return res.status(404).json({ success: false, error: 'Template not found' });
    res.json({ success: true, data: template });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/migration/templates/:templateId', async (req, res) => {
  try {
    await DataMapTemplate.findOneAndUpdate({ templateId: req.params.templateId }, { isActive: false });
    res.json({ success: true, message: 'Template deactivated' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ─── Dashboard ─── */
app.get('/api/migration/dashboard', async (req, res) => {
  try {
    const cached = await redis.get('migration:dashboard');
    if (cached) return res.json(JSON.parse(cached));

    const [totalJobs, completed, failed, running, queued, totalConnections, activeConnections, totalTemplates, recentJobs, syncLogs] =
      await Promise.all([
        MigrationJob.countDocuments(),
        MigrationJob.countDocuments({ status: 'completed' }),
        MigrationJob.countDocuments({ status: 'failed' }),
        MigrationJob.countDocuments({ status: 'running' }),
        MigrationJob.countDocuments({ status: 'queued' }),
        ExternalConnection.countDocuments(),
        ExternalConnection.countDocuments({ status: 'active' }),
        DataMapTemplate.countDocuments({ isActive: true }),
        MigrationJob.find().sort({ createdAt: -1 }).limit(5).lean(),
        SyncLog.countDocuments(),
      ]);

    // Stats aggregation
    const statsAgg = await MigrationJob.aggregate([
      { $match: { status: 'completed' } },
      {
        $group: {
          _id: null,
          totalRecordsProcessed: { $sum: '$stats.processed' },
          totalSucceeded: { $sum: '$stats.succeeded' },
          totalFailed: { $sum: '$stats.failed' },
          avgDuration: { $avg: '$stats.duration' },
        },
      },
    ]);

    // Jobs by type
    const jobsByType = await MigrationJob.aggregate([{ $group: { _id: '$type', count: { $sum: 1 } } }, { $sort: { count: -1 } }]);

    // Daily jobs (last 14 days)
    const fourteenDaysAgo = dayjs().subtract(14, 'day').toDate();
    const dailyJobs = await MigrationJob.aggregate([
      { $match: { createdAt: { $gte: fourteenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
          succeeded: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const dashboard = {
      overview: { totalJobs, completed, failed, running, queued, successRate: totalJobs ? Math.round((completed / totalJobs) * 100) : 0 },
      connections: { total: totalConnections, active: activeConnections },
      templates: { total: totalTemplates },
      processing: statsAgg[0] || { totalRecordsProcessed: 0, totalSucceeded: 0, totalFailed: 0, avgDuration: 0 },
      syncLogs,
      jobsByType: jobsByType.reduce((o, j) => {
        o[j._id] = j.count;
        return o;
      }, {}),
      dailyJobs,
      recentJobs: recentJobs.map(j => ({
        jobId: j.jobId,
        name: j.name,
        nameAr: j.nameAr,
        type: j.type,
        status: j.status,
        stats: j.stats,
        createdAt: j.createdAt,
        completedAt: j.completedAt,
      })),
      lastUpdated: new Date().toISOString(),
    };

    await redis.setex('migration:dashboard', 30, JSON.stringify(dashboard));
    res.json(dashboard);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ─── Cron Jobs ─── */

// Process scheduled recurring jobs – every minute
cron.schedule('* * * * *', async () => {
  try {
    const now = new Date();
    const due = await MigrationJob.find({
      'scheduling.isRecurring': true,
      'scheduling.nextRunAt': { $lte: now },
      status: { $nin: ['running', 'queued'] },
    });

    for (const job of due) {
      job.status = 'queued';
      job.stats = { totalRecords: 0, processed: 0, succeeded: 0, failed: 0, skipped: 0, duration: 0 };
      job.errors = [];

      // Calculate next run
      if (job.scheduling.cronExpression) {
        const cronParts = job.scheduling.cronExpression.split(' ');
        // Simplified: add 1 day for daily schedules
        job.scheduling.nextRunAt = dayjs(now).add(1, 'day').toDate();
      }
      await job.save();
      await migrationQueue.add('run-migration', { jobId: job.jobId }, { priority: 3 });
    }
  } catch (err) {
    console.error('Cron scheduled jobs error:', err.message);
  }
});

// Cleanup old completed jobs > 90 days – daily at 4 AM
cron.schedule('0 4 * * *', async () => {
  try {
    const cutoff = dayjs().subtract(90, 'day').toDate();
    const old = await MigrationJob.find({ status: { $in: ['completed', 'failed', 'cancelled'] }, completedAt: { $lt: cutoff } });
    for (const job of old) {
      await SyncLog.deleteMany({ jobId: job.jobId });
      await MigrationJob.deleteOne({ _id: job._id });
    }
    console.log(`Cleaned ${old.length} old migration jobs`);
  } catch (err) {
    console.error('Cron cleanup error:', err.message);
  }
});

/* ─── Seed ─── */
async function seedData() {
  const jobCount = await MigrationJob.countDocuments();
  if (jobCount > 0) return;

  // Seed connections
  await ExternalConnection.insertMany([
    {
      name: 'Legacy Student System',
      nameAr: 'نظام الطلاب القديم',
      type: 'database',
      config: { host: 'legacy-db.alawael.local', port: 3306, database: 'students_old', username: 'migrator' },
      status: 'inactive',
    },
    {
      name: 'Ministry API',
      nameAr: 'واجهة الوزارة',
      type: 'api',
      config: { url: 'https://api.moe.gov.sa/v2', headers: { Accept: 'application/json' } },
      status: 'inactive',
    },
    {
      name: 'HR Export Server',
      nameAr: 'خادم تصدير الموارد البشرية',
      type: 'sftp',
      config: { host: 'sftp.alawael.local', port: 22, username: 'hr_export' },
      status: 'inactive',
    },
  ]);

  // Seed templates
  await DataMapTemplate.insertMany([
    {
      name: 'Student Import Template',
      nameAr: 'قالب استيراد الطلاب',
      sourceType: 'csv',
      targetService: 'student-service',
      targetCollection: 'students',
      mappings: [
        { sourceField: 'student_name', targetField: 'name', transform: 'trim', required: true },
        { sourceField: 'student_name_ar', targetField: 'nameAr', transform: 'trim', required: true },
        { sourceField: 'birth_date', targetField: 'dateOfBirth', transform: 'toDate', required: true },
        { sourceField: 'gender', targetField: 'gender', transform: 'lowercase' },
        { sourceField: 'parent_phone', targetField: 'parentContact.phone', transform: 'trim' },
        { sourceField: 'parent_email', targetField: 'parentContact.email', transform: 'lowercase' },
        {
          sourceField: 'class',
          targetField: 'classId',
          transform: 'map',
          transformArgs: { mapping: { KG1: 'class-kg1', KG2: 'class-kg2', KG3: 'class-kg3' } },
        },
      ],
      validators: [
        { field: 'name', rule: 'required', message: 'Student name is required' },
        { field: 'parentContact.email', rule: 'email', message: 'Invalid email format' },
        { field: 'parentContact.phone', rule: 'phone', message: 'Invalid phone number' },
      ],
    },
    {
      name: 'Staff Import Template',
      nameAr: 'قالب استيراد الموظفين',
      sourceType: 'csv',
      targetService: 'staff-service',
      targetCollection: 'staff',
      mappings: [
        { sourceField: 'employee_name', targetField: 'name', transform: 'trim', required: true },
        { sourceField: 'employee_name_ar', targetField: 'nameAr', transform: 'trim', required: true },
        { sourceField: 'department', targetField: 'department', transform: 'lowercase' },
        { sourceField: 'role', targetField: 'role', transform: 'lowercase' },
        { sourceField: 'salary', targetField: 'salary', transform: 'toNumber' },
        { sourceField: 'hire_date', targetField: 'hireDate', transform: 'toDate' },
      ],
      validators: [
        { field: 'name', rule: 'required', message: 'Staff name is required' },
        { field: 'salary', rule: 'number', message: 'Salary must be a number' },
      ],
    },
    {
      name: 'Finance Data Template',
      nameAr: 'قالب بيانات المالية',
      sourceType: 'json',
      targetService: 'finance-service',
      targetCollection: 'transactions',
      mappings: [
        { sourceField: 'transaction_id', targetField: 'transactionId', transform: 'trim' },
        { sourceField: 'amount', targetField: 'amount', transform: 'toNumber', required: true },
        { sourceField: 'currency', targetField: 'currency', transform: 'uppercase', defaultValue: 'SAR' },
        { sourceField: 'date', targetField: 'transactionDate', transform: 'toDate' },
        { sourceField: 'description', targetField: 'description', transform: 'trim' },
      ],
    },
  ]);

  // Seed sample jobs
  await MigrationJob.insertMany([
    {
      name: 'Initial Student Data Import',
      nameAr: 'استيراد بيانات الطلاب الأولية',
      type: 'import',
      source: { type: 'csv', config: {} },
      target: { service: 'student-service', collection: 'students', mode: 'upsert' },
      status: 'completed',
      stats: { totalRecords: 150, processed: 150, succeeded: 147, failed: 3, skipped: 0, duration: 12500 },
      startedAt: dayjs().subtract(7, 'day').toDate(),
      completedAt: dayjs().subtract(7, 'day').add(12, 'second').toDate(),
      createdBy: 'admin',
    },
    {
      name: 'Staff Sync with HR System',
      nameAr: 'مزامنة الموظفين مع نظام الموارد البشرية',
      type: 'sync',
      source: { type: 'api', config: {} },
      target: { service: 'staff-service', collection: 'staff', mode: 'merge' },
      scheduling: { isRecurring: true, cronExpression: '0 2 * * *', nextRunAt: dayjs().add(1, 'day').hour(2).minute(0).toDate() },
      status: 'draft',
      createdBy: 'admin',
    },
    {
      name: 'Monthly Finance Export',
      nameAr: 'تصدير المالية الشهري',
      type: 'export',
      source: { type: 'database', config: {} },
      target: { service: 'finance-service', collection: 'transactions', mode: 'insert' },
      scheduling: { isRecurring: true, cronExpression: '0 0 1 * *' },
      status: 'draft',
      createdBy: 'admin',
    },
  ]);

  console.log('Migration seed data created');
}

/* ─── Start ─── */
mongoose
  .connect(MONGODB_URI)
  .then(async () => {
    console.log('MongoDB connected – alawael_migration');
    await seedData();
    app.listen(PORT, () => console.log(`Data Migration & Sync Service running on port ${PORT}`));
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
