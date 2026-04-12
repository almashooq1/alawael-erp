'use strict';
/**
 * DataExchange Service — Pure Business Logic
 * Singleton export — use directly, do NOT call `new`.
 * Models: ../models/DddDataExchange.js
 */

const {
  DDDExchangeJob,
  DDDTransformPipeline,
  DDDValidationSchema,
  DDDExchangeAgreement,
  EXCHANGE_FORMATS,
  JOB_TYPES,
  JOB_STATUSES,
  TRANSFORM_OPERATIONS,
  VALIDATION_RULES,
  EXCHANGE_PROTOCOLS,
  BUILTIN_EXCHANGE_CONFIGS,
} = require('../models/DddDataExchange');

const BaseCrudService = require('./base/BaseCrudService');

class DataExchange extends BaseCrudService {
  constructor() {
    super('DataExchange', {}, {
      exchangeJobs: DDDExchangeJob,
      transformPipelines: DDDTransformPipeline,
      validationSchemas: DDDValidationSchema,
      exchangeAgreements: DDDExchangeAgreement,
    });
  }

  async createJob(data) { return this._create(DDDExchangeJob, data); }
  async listJobs(filter = {}, page = 1, limit = 20) { return this._list(DDDExchangeJob, filter, { page: page, limit: limit, sort: { createdAt: -1 } }); }
  async updateJobStatus(id, status, extra = {}) {
    return DDDExchangeJob.findByIdAndUpdate(id, { status, ...extra }, { new: true }).lean();
  }

  async createPipeline(data) { return this._create(DDDTransformPipeline, data); }
  async listPipelines(filter = {}, page = 1, limit = 20) { return this._list(DDDTransformPipeline, filter, { page: page, limit: limit, sort: { createdAt: -1 } }); }
  async updatePipeline(id, data) { return this._update(DDDTransformPipeline, id, data); }

  async createValidation(data) { return this._create(DDDValidationSchema, data); }
  async listValidations(filter = {}, page = 1, limit = 20) { return this._list(DDDValidationSchema, filter, { page: page, limit: limit, sort: { createdAt: -1 } }); }

  async createAgreement(data) { return this._create(DDDExchangeAgreement, data); }
  async listAgreements(filter = {}, page = 1, limit = 20) { return this._list(DDDExchangeAgreement, filter, { page: page, limit: limit, sort: { createdAt: -1 } }); }
  async updateAgreement(id, data) { return this._update(DDDExchangeAgreement, id, data); }

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
}

/* ═══════════════════ Singleton Export ═══════════════════ */
module.exports = new DataExchange();
