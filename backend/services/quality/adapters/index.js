'use strict';

/**
 * adapters/index.js — Phase 14 Commit 1 (4.0.63).
 *
 * Factory that constructs all six HealthScoreAggregator source
 * adapters at boot time. Each adapter is created defensively — a
 * missing or broken underlying model makes that slot null rather
 * than aborting the whole health-score pillar graph.
 *
 * The qualityComplianceBootstrap calls this and passes the result
 * under `extraSources` so the aggregator gets all 10 pillars wired.
 */

const { createIncidentsHealthAdapter } = require('./incidentsHealthAdapter');
const { createComplaintsHealthAdapter } = require('./complaintsHealthAdapter');
const { createCapaHealthAdapter } = require('./capaHealthAdapter');
const { createSatisfactionHealthAdapter } = require('./satisfactionHealthAdapter');
const { createTrainingHealthAdapter } = require('./trainingHealthAdapter');
const { createDocumentsHealthAdapter } = require('./documentsHealthAdapter');

function _tryRequire(path, logger) {
  try {
    return require(path);
  } catch (err) {
    logger.warn(`[healthAdapters] model ${path} unavailable: ${err.message}`);
    return null;
  }
}

function _tryCreate(factory, deps, label, logger) {
  try {
    return factory(deps);
  } catch (err) {
    logger.warn(`[healthAdapters] ${label} adapter failed: ${err.message}`);
    return null;
  }
}

/**
 * Build all 6 adapters. Each entry in the returned object is
 * either an adapter instance or `null` — the aggregator already
 * treats null as "source unavailable" and renormalises weights.
 *
 * @param {object} deps  — optional pre-loaded models (tests) or
 *                         override factories
 * @returns { incidents, complaints, capa, satisfaction, training, documents }
 */
function buildHealthScoreAdapters({ logger = console, models = {} } = {}) {
  const incidentModel =
    models.incidents || _tryRequire('../../../models/quality/Incident.model', logger);
  const complaintModel =
    models.complaints || _tryRequire('../../../models/quality/Complaint.model', logger);
  const capaModel =
    models.capa ||
    _tryRequire('../../../models/internal-audit/CorrectivePreventiveAction.model', logger);
  const satisfactionModel =
    models.satisfaction || _tryRequire('../../../models/quality/SatisfactionSurvey.model', logger);
  const trainingModel =
    models.training || _tryRequire('../../../models/TrainingCompliance', logger);
  const documentModel = models.documents || _tryRequire('../../../models/Document', logger);

  return {
    incidents: incidentModel
      ? _tryCreate(
          createIncidentsHealthAdapter,
          { model: incidentModel, logger },
          'incidents',
          logger
        )
      : null,
    complaints: complaintModel
      ? _tryCreate(
          createComplaintsHealthAdapter,
          { model: complaintModel, logger },
          'complaints',
          logger
        )
      : null,
    capa: capaModel
      ? _tryCreate(createCapaHealthAdapter, { model: capaModel, logger }, 'capa', logger)
      : null,
    satisfaction: satisfactionModel
      ? _tryCreate(
          createSatisfactionHealthAdapter,
          { model: satisfactionModel, logger },
          'satisfaction',
          logger
        )
      : null,
    training: trainingModel
      ? _tryCreate(
          createTrainingHealthAdapter,
          { model: trainingModel, logger },
          'training',
          logger
        )
      : null,
    documents: documentModel
      ? _tryCreate(
          createDocumentsHealthAdapter,
          { model: documentModel, logger },
          'documents',
          logger
        )
      : null,
  };
}

module.exports = {
  buildHealthScoreAdapters,
  createIncidentsHealthAdapter,
  createComplaintsHealthAdapter,
  createCapaHealthAdapter,
  createSatisfactionHealthAdapter,
  createTrainingHealthAdapter,
  createDocumentsHealthAdapter,
};
