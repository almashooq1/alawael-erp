'use strict';
/**
 * OutcomeResearch Service — Pure Business Logic
 * Singleton export — use directly, do NOT call `new`.
 * Models: ../models/DddOutcomeResearch.js
 */

const {
  DDDOutcomeMeasure,
  DDDOutcomeDataCollection,
  DDDCohortDefinition,
  DDDAnalysisResult,
  OUTCOME_DOMAINS,
  MEASUREMENT_LEVELS,
  DATA_COLLECTION_METHODS,
  ANALYSIS_TYPES,
  VALIDITY_TYPES,
  RELIABILITY_TYPES,
  BUILTIN_OUTCOME_MEASURES,
} = require('../models/DddOutcomeResearch');

const BaseCrudService = require('./base/BaseCrudService');

class OutcomeResearch extends BaseCrudService {
  constructor() {
    super('OutcomeResearch', {}, {
      outcomeMeasures: DDDOutcomeMeasure,
      outcomeDataCollections: DDDOutcomeDataCollection,
      cohortDefinitions: DDDCohortDefinition,
      analysisResults: DDDAnalysisResult,
    });
  }

  async createMeasure(data) { return this._create(DDDOutcomeMeasure, data); }
  async listMeasures(filter = {}, page = 1, limit = 20) { return this._list(DDDOutcomeMeasure, filter, { page: page, limit: limit, sort: { name: 1 } }); }
  async updateMeasure(id, data) { return this._update(DDDOutcomeMeasure, id, data); }

  async collectData(data) { return this._create(DDDOutcomeDataCollection, data); }
  async listCollections(filter = {}, page = 1, limit = 20) { return this._list(DDDOutcomeDataCollection, filter, { page: page, limit: limit, sort: { collectedAt: -1 } }); }

  async createCohort(data) { return this._create(DDDCohortDefinition, data); }
  async listCohorts(filter = {}, page = 1, limit = 20) { return this._list(DDDCohortDefinition, filter, { page: page, limit: limit, sort: { createdAt: -1 } }); }

  async saveAnalysis(data) { return this._create(DDDAnalysisResult, data); }
  async listAnalyses(filter = {}, page = 1, limit = 20) { return this._list(DDDAnalysisResult, filter, { page: page, limit: limit, sort: { createdAt: -1 } }); }

  async getOutcomeStats() {
    const [measures, collections, cohorts, analyses] = await Promise.all([
      DDDOutcomeMeasure.countDocuments(),
      DDDOutcomeDataCollection.countDocuments(),
      DDDCohortDefinition.countDocuments({ status: 'active' }),
      DDDAnalysisResult.countDocuments({ isSignificant: true }),
    ]);
    return {
      totalMeasures: measures,
      dataCollections: collections,
      activeCohorts: cohorts,
      significantResults: analyses,
    };
  }
}

/* ═══════════════════ Singleton Export ═══════════════════ */
module.exports = new OutcomeResearch();
