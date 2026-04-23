'use strict';

/**
 * ncrAutoLinkPipeline.service.js — Phase 13 Commit 7 (4.0.62).
 *
 * Auto-generates a Non-Conformance Report (NCR) + skeleton CAPA
 * when an incident of sufficient severity is reported, and links
 * them back to the source Incident. Closes the loop:
 *
 *      Incident (severity ≥ major)
 *           │
 *           ▼
 *      NonConformanceReport  (auto-created, status 'open')
 *           │
 *           ▼
 *      CorrectivePreventiveAction  (skeleton; status 'planning';
 *                                   linkedNcr populated)
 *           │
 *           ▼
 *      quality.ncr.auto_linked event fires
 *           └─ downstream training service can listen + create
 *              mandatory-training requirement for the root cause
 *
 * Subscribes to the `quality.incident.reported` event family on the
 * injected event bus. Idempotent per (incidentId, pipelineRun) —
 * re-emissions do not spawn duplicates.
 *
 * Why a pipeline instead of inline logic in the incident service?
 *
 *   1. Keeps the incident module independent of the quality BC.
 *   2. The chain is auditable as its own unit (separate events +
 *      tests) — you can see at a glance what happened without
 *      tracing into three services.
 *   3. Lets tests exercise the chain end-to-end without booting
 *      the whole app; inject fakes for each model.
 */

const SEVERITIES_TRIGGERING = Object.freeze(['major', 'catastrophic', 'critical', 'sentinel']);

function _incidentTriggersChain(severity) {
  if (!severity) return false;
  return SEVERITIES_TRIGGERING.includes(String(severity).toLowerCase());
}

function createNcrAutoLinkPipeline({
  bus, // QualityEventBus-compatible (required — supplies `on`/`emit`)
  incidentModel, // mongoose model (required to re-load incident by id on event)
  ncrModel, // NonConformanceReport model (required)
  capaModel, // CorrectivePreventiveAction model (required)
  logger = console,
  now = () => new Date(),
} = {}) {
  if (!bus || typeof bus.on !== 'function') {
    throw new Error('ncrAutoLinkPipeline: bus with .on() required');
  }
  if (!incidentModel) throw new Error('ncrAutoLinkPipeline: incidentModel required');
  if (!ncrModel) throw new Error('ncrAutoLinkPipeline: ncrModel required');
  if (!capaModel) throw new Error('ncrAutoLinkPipeline: capaModel required');

  // Dedup: the chain runs once per incident. Same incidentId on a
  // re-emission produces no side effects.
  const _processed = new Set();
  let _unsub = null;

  async function _emit(name, payload) {
    if (typeof bus.emit !== 'function') return;
    try {
      await bus.emit(name, payload);
    } catch (err) {
      logger.warn(`[NCR-Pipeline] emit ${name} failed: ${err.message}`);
    }
  }

  /**
   * The chain itself. Exposed so tests can invoke it directly
   * instead of going through the bus.
   */
  async function runChain({ incidentId, severity, title, branchId, reportedBy }) {
    if (!incidentId) throw new Error('incidentId is required');
    if (_processed.has(String(incidentId))) {
      return { skipped: true, reason: 'already_processed' };
    }
    if (!_incidentTriggersChain(severity)) {
      return { skipped: true, reason: 'severity_below_threshold' };
    }

    const nowDate = now();
    const year = nowDate.getUTCFullYear();
    const incidentStr = String(incidentId).slice(-6);

    // 1. Create NCR.
    let ncr;
    try {
      ncr = await ncrModel.create({
        ncrId: `NCR-${year}-${incidentStr}`,
        reportInfo: {
          title: title ? `Auto-NCR: ${title}` : `Auto-NCR for incident ${incidentStr}`,
          titleAr: 'عدم مطابقة تلقائي من حادثة',
          description: `Auto-generated from incident ${incidentId} (severity=${severity}).`,
          reportDate: nowDate,
          reportedBy: reportedBy ? String(reportedBy) : 'system',
          reporterRole: 'ncr_pipeline',
        },
        classification: {
          type: 'other',
          sourceReference: {
            collection: 'incidents',
            docId: String(incidentId),
          },
        },
      });
    } catch (err) {
      logger.warn(`[NCR-Pipeline] NCR create failed: ${err.message}`);
      return { skipped: true, reason: 'ncr_create_failed', error: err.message };
    }

    // 2. Create CAPA skeleton.
    let capa;
    try {
      capa = await capaModel.create({
        actionId: `CAPA-${year}-${incidentStr}`,
        type: 'corrective',
        linkedNcr: {
          ncrId: ncr.ncrId,
          ncrTitle: ncr.reportInfo?.title || null,
          relationshipType: 'auto-linked-from-incident',
        },
        actionInfo: {
          title: `Auto-CAPA for ${ncr.ncrId}`,
          titleAr: 'إجراء تصحيحي تلقائي',
          description: `Auto-generated from NCR ${ncr.ncrId}, incident ${incidentId}.`,
          createdDate: nowDate,
          createdBy: reportedBy ? String(reportedBy) : 'system',
        },
        implementation: {
          status: 'planning',
          targetCompletionDate: new Date(nowDate.getTime() + 30 * 86400000),
          progressPercentage: 0,
        },
      });
    } catch (err) {
      logger.warn(`[NCR-Pipeline] CAPA create failed: ${err.message}`);
      return {
        skipped: false,
        ncrId: ncr.ncrId,
        capaId: null,
        reason: 'capa_create_failed',
        error: err.message,
      };
    }

    _processed.add(String(incidentId));

    await _emit('quality.ncr.auto_linked', {
      incidentId: String(incidentId),
      severity,
      ncrId: ncr.ncrId,
      capaId: capa.actionId,
      branchId: branchId ? String(branchId) : null,
      at: nowDate,
    });

    return {
      skipped: false,
      ncrId: ncr.ncrId,
      capaId: capa.actionId,
    };
  }

  function start() {
    if (_unsub) return;
    _unsub = bus.on('quality.incident.reported', async payload => {
      try {
        await runChain(payload || {});
      } catch (err) {
        logger.warn(`[NCR-Pipeline] chain failed: ${err.message}`);
      }
    });
    logger.info('[NCR-Pipeline] listening on quality.incident.reported');
  }

  function stop() {
    if (_unsub) {
      _unsub();
      _unsub = null;
    }
  }

  function resetDedup() {
    _processed.clear();
  }

  return { runChain, start, stop, resetDedup, _incidentTriggersChain: _incidentTriggersChain };
}

module.exports = {
  createNcrAutoLinkPipeline,
  SEVERITIES_TRIGGERING,
  _incidentTriggersChain,
};
