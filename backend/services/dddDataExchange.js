'use strict';
/**
 * DDD Data Exchange Service
 * ─────────────────────────
 * Phase 32 – Integration & Interoperability (Module 3/4)
 *
 * Manages data transformation pipelines, import/export jobs,
 * format conversions, validation rules, and exchange agreements.
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

/* ═══════════════════ Constants ═══════════════════ */
const EXCHANGE_FORMATS = [
  'JSON',
  'XML',
  'CSV',
  'HL7v2',
  'FHIR_JSON',
  'FHIR_XML',
  'CDA',
  'DICOM',
  'PDF',
  'XLSX',
  'CCDA',
  'X12',
];

const JOB_TYPES = [
  'import',
  'export',
  'transform',
  'sync',
  'migration',
  'backup',
  'restore',
  'validate',
  'enrich',
  'deduplicate',
];

const JOB_STATUSES = [
  'queued',
  'running',
  'completed',
  'failed',
  'cancelled',
  'paused',
  'retrying',
  'partial',
  'scheduled',
  'expired',
];

const TRANSFORM_OPERATIONS = [
  'map_field',
  'rename_field',
  'convert_type',
  'split_field',
  'merge_fields',
  'lookup',
  'calculate',
  'filter',
  'aggregate',
  'normalize',
];

const VALIDATION_RULES = [
  'required',
  'format',
  'range',
  'enum',
  'regex',
  'unique',
  'reference',
  'conditional',
  'cross_field',
  'business_rule',
];

const EXCHANGE_PROTOCOLS = [
  'REST_API',
  'SFTP',
  'MLLP',
  'SOAP',
  'GraphQL',
  'gRPC',
  'WebSocket',
  'Email',
  'S3',
  'Azure_Blob',
];

const BUILTIN_EXCHANGE_CONFIGS = [
  {
    code: 'CSV_TO_FHIR',
    name: 'CSV to FHIR Patient',
    sourceFormat: 'CSV',
    targetFormat: 'FHIR_JSON',
  },
  { code: 'HL7_TO_JSON', name: 'HL7v2 to JSON', sourceFormat: 'HL7v2', targetFormat: 'JSON' },
  { code: 'FHIR_TO_CDA', name: 'FHIR to CDA', sourceFormat: 'FHIR_JSON', targetFormat: 'CDA' },
  { code: 'XML_TO_JSON', name: 'XML to JSON Convert', sourceFormat: 'XML', targetFormat: 'JSON' },
  {
    code: 'DICOM_META',
    name: 'DICOM Metadata Extract',
    sourceFormat: 'DICOM',
    targetFormat: 'JSON',
  },
  { code: 'CCDA_TO_FHIR', name: 'CCDA to FHIR', sourceFormat: 'CCDA', targetFormat: 'FHIR_JSON' },
  { code: 'XLSX_IMPORT', name: 'Excel Data Import', sourceFormat: 'XLSX', targetFormat: 'JSON' },
  {
    code: 'FHIR_BUNDLE',
    name: 'FHIR Bundle Export',
    sourceFormat: 'JSON',
    targetFormat: 'FHIR_JSON',
  },
  { code: 'PDF_EXTRACT', name: 'PDF Data Extraction', sourceFormat: 'PDF', targetFormat: 'JSON' },
  { code: 'X12_TO_JSON', name: 'X12 to JSON', sourceFormat: 'X12', targetFormat: 'JSON' },
];

/* ═══════════════════ Schemas ═══════════════════ */
const exchangeJobSchema = new Schema(
  {
    name: { type: String, required: true },
    jobType: { type: String, enum: JOB_TYPES, required: true },
    status: { type: String, enum: JOB_STATUSES, default: 'queued' },
    sourceFormat: { type: String, enum: EXCHANGE_FORMATS },
    targetFormat: { type: String, enum: EXCHANGE_FORMATS },
    protocol: { type: String, enum: EXCHANGE_PROTOCOLS },
    sourceConfig: { type: Schema.Types.Mixed },
    targetConfig: { type: Schema.Types.Mixed },
    recordsTotal: { type: Number, default: 0 },
    recordsProcessed: { type: Number, default: 0 },
    recordsFailed: { type: Number, default: 0 },
    startedAt: { type: Date },
    completedAt: { type: Date },
    errors: [{ record: Number, message: String, field: String }],
    scheduleCron: { type: String },
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
exchangeJobSchema.index({ jobType: 1, status: 1 });
exchangeJobSchema.index({ createdAt: -1 });

const transformPipelineSchema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    sourceFormat: { type: String, enum: EXCHANGE_FORMATS, required: true },
    targetFormat: { type: String, enum: EXCHANGE_FORMATS, required: true },
    steps: [
      {
        order: { type: Number, required: true },
        operation: { type: String, enum: TRANSFORM_OPERATIONS, required: true },
        config: { type: Schema.Types.Mixed },
        description: { type: String },
      },
    ],
    isActive: { type: Boolean, default: true },
    version: { type: Number, default: 1 },
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
transformPipelineSchema.index({ sourceFormat: 1, targetFormat: 1 });
transformPipelineSchema.index({ isActive: 1 });

const validationSchemaDoc = new Schema(
  {
    name: { type: String, required: true },
    format: { type: String, enum: EXCHANGE_FORMATS, required: true },
    rules: [
      {
        field: { type: String, required: true },
        rule: { type: String, enum: VALIDATION_RULES, required: true },
        params: { type: Schema.Types.Mixed },
        message: { type: String },
      },
    ],
    isActive: { type: Boolean, default: true },
    version: { type: Number, default: 1 },
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
validationSchemaDoc.index({ format: 1, isActive: 1 });

const exchangeAgreementSchema = new Schema(
  {
    name: { type: String, required: true },
    partnerName: { type: String, required: true },
    partnerSystem: { type: String },
    protocol: { type: String, enum: EXCHANGE_PROTOCOLS, required: true },
    dataFormats: [{ type: String, enum: EXCHANGE_FORMATS }],
    direction: { type: String, enum: ['inbound', 'outbound', 'bidirectional'], required: true },
    status: {
      type: String,
      enum: ['draft', 'active', 'suspended', 'terminated'],
      default: 'draft',
    },
    effectiveFrom: { type: Date },
    effectiveTo: { type: Date },
    slaResponseMs: { type: Number },
    contactEmail: { type: String },
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
exchangeAgreementSchema.index({ partnerName: 1, status: 1 });
exchangeAgreementSchema.index({ status: 1, direction: 1 });

/* ═══════════════════ Models ═══════════════════ */
const DDDExchangeJob =
  mongoose.models.DDDExchangeJob || mongoose.model('DDDExchangeJob', exchangeJobSchema);
const DDDTransformPipeline =
  mongoose.models.DDDTransformPipeline ||
  mongoose.model('DDDTransformPipeline', transformPipelineSchema);
const DDDValidationSchema =
  mongoose.models.DDDValidationSchema || mongoose.model('DDDValidationSchema', validationSchemaDoc);
const DDDExchangeAgreement =
  mongoose.models.DDDExchangeAgreement ||
  mongoose.model('DDDExchangeAgreement', exchangeAgreementSchema);

/* ═══════════════════ Domain Class ═══════════════════ */
class DataExchange {
  async createJob(data) {
    return DDDExchangeJob.create(data);
  }
  async listJobs(filter = {}, page = 1, limit = 20) {
    return DDDExchangeJob.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }
  async updateJobStatus(id, status, extra = {}) {
    return DDDExchangeJob.findByIdAndUpdate(id, { status, ...extra }, { new: true }).lean();
  }

  async createPipeline(data) {
    return DDDTransformPipeline.create(data);
  }
  async listPipelines(filter = {}, page = 1, limit = 20) {
    return DDDTransformPipeline.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }
  async updatePipeline(id, data) {
    return DDDTransformPipeline.findByIdAndUpdate(id, data, { new: true }).lean();
  }

  async createValidation(data) {
    return DDDValidationSchema.create(data);
  }
  async listValidations(filter = {}, page = 1, limit = 20) {
    return DDDValidationSchema.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }

  async createAgreement(data) {
    return DDDExchangeAgreement.create(data);
  }
  async listAgreements(filter = {}, page = 1, limit = 20) {
    return DDDExchangeAgreement.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }
  async updateAgreement(id, data) {
    return DDDExchangeAgreement.findByIdAndUpdate(id, data, { new: true }).lean();
  }

  async getExchangeStats() {
    const [jobs, pipelines, agreements, failedJobs] = await Promise.all([
      DDDExchangeJob.countDocuments(),
      DDDTransformPipeline.countDocuments({ isActive: true }),
      DDDExchangeAgreement.countDocuments({ status: 'active' }),
      DDDExchangeJob.countDocuments({ status: 'failed' }),
    ]);
    return {
      totalJobs: jobs,
      activePipelines: pipelines,
      activeAgreements: agreements,
      failedJobs,
    };
  }

  async healthCheck() {
    const [jobs, pipelines, validations, agreements] = await Promise.all([
      DDDExchangeJob.countDocuments(),
      DDDTransformPipeline.countDocuments(),
      DDDValidationSchema.countDocuments(),
      DDDExchangeAgreement.countDocuments(),
    ]);
    return {
      status: 'ok',
      module: 'DataExchange',
      counts: { jobs, pipelines, validations, agreements },
    };
  }
}

/* ═══════════════════ Router Factory ═══════════════════ */
function createDataExchangeRouter() {
  const { Router } = require('express');
  const router = Router();
  const svc = new DataExchange();

  router.get('/data-exchange/health', async (_req, res) => {
    try {
      res.json(await svc.healthCheck());
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.post('/data-exchange/jobs', async (req, res) => {
    try {
      res.status(201).json(await svc.createJob(req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.get('/data-exchange/jobs', async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json(await svc.listJobs(f, +page, +limit));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.post('/data-exchange/pipelines', async (req, res) => {
    try {
      res.status(201).json(await svc.createPipeline(req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.get('/data-exchange/pipelines', async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json(await svc.listPipelines(f, +page, +limit));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.post('/data-exchange/validations', async (req, res) => {
    try {
      res.status(201).json(await svc.createValidation(req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.get('/data-exchange/validations', async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json(await svc.listValidations(f, +page, +limit));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.post('/data-exchange/agreements', async (req, res) => {
    try {
      res.status(201).json(await svc.createAgreement(req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.get('/data-exchange/agreements', async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json(await svc.listAgreements(f, +page, +limit));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.get('/data-exchange/stats', async (_req, res) => {
    try {
      res.json(await svc.getExchangeStats());
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  return router;
}

/* ═══════════════════ Exports ═══════════════════ */
module.exports = {
  EXCHANGE_FORMATS,
  JOB_TYPES,
  JOB_STATUSES,
  TRANSFORM_OPERATIONS,
  VALIDATION_RULES,
  EXCHANGE_PROTOCOLS,
  BUILTIN_EXCHANGE_CONFIGS,
  DDDExchangeJob,
  DDDTransformPipeline,
  DDDValidationSchema,
  DDDExchangeAgreement,
  DataExchange,
  createDataExchangeRouter,
};
