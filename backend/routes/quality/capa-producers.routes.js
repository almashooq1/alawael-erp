'use strict';

/**
 * capa-producers.routes.js — W348 (CAPA Pass 6 REST surface for producers).
 *
 * Wires the W346 capa-producers.service into HTTP. Each endpoint:
 *   1. Loads the parent doc (AuditOccurrence / RcaInvestigation / FmeaWorksheet)
 *   2. Invokes the appropriate producer (which calls capaService.createCapaItem)
 *   3. Sets linkedCapaId on the source sub-doc + saves the parent
 *   4. Returns the new CAPA + the updated parent context
 *
 * If step 3 fails after step 2 succeeds, the new CAPA is orphaned (created but
 * not linked back). This is logged loudly so an operator can investigate; the
 * CAPA itself is still valid (has source.refId + source.collection back-pointer).
 *
 * MFA tiers (ADR-019):
 *   POST /audit/:occurrenceId/findings/:findingId      tier 1
 *   POST /rca/:rcaId/root-causes/:rootCauseId          tier 1
 *   POST /fmea/:fmeaId/rows/:rowId/actions/:actionId   tier 1
 *
 * Service-layer (W344) MFA tier defense still applies — but creation always
 * requires only tier 1; the tier 2 escalations gate later transitions
 * (VERIFIED→CLOSED, ANY→REJECTED), not creation.
 *
 * Errors:
 *   INVALID_INPUT     → 400
 *   MISSING_SUB_DOC   → 404
 *   PARENT_NOT_FOUND  → 404
 *   SERVICE_NOT_WIRED → 503
 *   (createCapaItem errors propagate via the producer's transparent throw)
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const { authenticate } = require('../../middleware/auth');
const { attachMfaActor, requireMfaTier } = require('../../middleware/requireMfaTier');
const logger = require('../../utils/logger');

function _producers(req) {
  const p = req.app._capaProducers;
  if (!p) {
    const err = new Error(
      'CapaProducers not wired (capaBootstrap.wireCapa not called or producers absent)'
    );
    err.code = 'SERVICE_NOT_WIRED';
    throw err;
  }
  return p;
}

function _modelOrThrow(name) {
  try {
    return mongoose.model(name);
  } catch {
    const err = new Error(`${name} model not registered`);
    err.code = 'SERVICE_NOT_WIRED';
    throw err;
  }
}

function mapErrorToHttp(err) {
  if (err.code === 'INVALID_INPUT') {
    return { status: 400, body: { code: err.code, message: err.message } };
  }
  if (err.code === 'MISSING_SUB_DOC') {
    return { status: 404, body: { code: err.code, message: err.message } };
  }
  if (err.code === 'PARENT_NOT_FOUND') {
    return { status: 404, body: { code: err.code, message: err.message } };
  }
  if (err.code === 'SERVICE_NOT_WIRED') {
    return { status: 503, body: { code: err.code, message: err.message } };
  }
  // createCapaItem propagated errors keep their codes
  if (err.code === 'MFA_TIER_INSUFFICIENT') {
    return { status: 403, body: { code: err.code, message: err.message } };
  }
  if (err.code === 'REASON_CODE_REQUIRED') {
    return { status: 400, body: { code: err.code, message: err.message } };
  }
  return { status: 500, body: { code: 'INTERNAL_ERROR', message: err.message } };
}

router.use(authenticate);
router.use(attachMfaActor);

// ── POST /audit/:occurrenceId/findings/:findingId ────────────────────────
router.post('/audit/:occurrenceId/findings/:findingId', requireMfaTier(1), async (req, res) => {
  try {
    const producers = _producers(req);
    const Occurrence = _modelOrThrow('AuditOccurrence');
    const occurrenceDoc = await Occurrence.findById(req.params.occurrenceId);
    if (!occurrenceDoc) {
      const err = new Error('AuditOccurrence not found');
      err.code = 'PARENT_NOT_FOUND';
      throw err;
    }
    const capa = await producers.createCapaFromAuditFinding({
      occurrenceDoc,
      findingId: req.params.findingId,
      ownerUserId: req.body?.ownerUserId,
      dueDate: req.body?.dueDate,
      createdBy: req.user?._id || req.user?.id,
    });

    // Set linkedCapaId on the finding + save parent. Log loudly on failure.
    const finding = occurrenceDoc.findings.id(req.params.findingId);
    if (finding) {
      finding.linkedCapaId = capa._id;
      finding.capaCreated = true;
      try {
        await occurrenceDoc.save();
      } catch (saveErr) {
        logger.error(
          `[capa-producers] WARNING: CAPA ${capa.capaNumber} created but linkedCapaId update FAILED on AuditOccurrence ${occurrenceDoc._id}: ${saveErr.message}`
        );
      }
    }

    res
      .status(201)
      .json({ success: true, capa, parent: { id: occurrenceDoc._id, type: 'AuditOccurrence' } });
  } catch (err) {
    logger.error('[capa-producers] POST /audit/...', err);
    const mapped = mapErrorToHttp(err);
    res.status(mapped.status).json({ success: false, ...mapped.body });
  }
});

// ── POST /rca/:rcaId/root-causes/:rootCauseId ────────────────────────────
router.post('/rca/:rcaId/root-causes/:rootCauseId', requireMfaTier(1), async (req, res) => {
  try {
    const producers = _producers(req);
    const Rca = _modelOrThrow('RcaInvestigation');
    const rcaDoc = await Rca.findById(req.params.rcaId);
    if (!rcaDoc) {
      const err = new Error('RcaInvestigation not found');
      err.code = 'PARENT_NOT_FOUND';
      throw err;
    }
    const capa = await producers.createCapaFromRcaRootCause({
      rcaDoc,
      rootCauseId: req.params.rootCauseId,
      ownerUserId: req.body?.ownerUserId,
      dueDate: req.body?.dueDate,
      createdBy: req.user?._id || req.user?.id,
    });

    const root = rcaDoc.rootCauses.id(req.params.rootCauseId);
    if (root) {
      root.linkedCapaId = capa._id;
      root.addressed = true;
      try {
        await rcaDoc.save();
      } catch (saveErr) {
        logger.error(
          `[capa-producers] WARNING: CAPA ${capa.capaNumber} created but linkedCapaId update FAILED on Rca ${rcaDoc._id}: ${saveErr.message}`
        );
      }
    }

    res
      .status(201)
      .json({ success: true, capa, parent: { id: rcaDoc._id, type: 'RcaInvestigation' } });
  } catch (err) {
    logger.error('[capa-producers] POST /rca/...', err);
    const mapped = mapErrorToHttp(err);
    res.status(mapped.status).json({ success: false, ...mapped.body });
  }
});

// ── POST /fmea/:fmeaId/rows/:rowId/actions/:actionId ─────────────────────
router.post('/fmea/:fmeaId/rows/:rowId/actions/:actionId', requireMfaTier(1), async (req, res) => {
  try {
    const producers = _producers(req);
    const Fmea = _modelOrThrow('FmeaWorksheet');
    const fmeaDoc = await Fmea.findById(req.params.fmeaId);
    if (!fmeaDoc) {
      const err = new Error('FmeaWorksheet not found');
      err.code = 'PARENT_NOT_FOUND';
      throw err;
    }
    const capa = await producers.createCapaFromFmeaAction({
      fmeaDoc,
      rowId: req.params.rowId,
      actionId: req.params.actionId,
      ownerUserId: req.body?.ownerUserId,
      dueDate: req.body?.dueDate,
      createdBy: req.user?._id || req.user?.id,
    });

    const row = fmeaDoc.rows.id(req.params.rowId);
    const action = row?.actions.id(req.params.actionId);
    if (action) {
      action.linkedCapaId = capa._id;
      // Also append to worksheet-level relatedCapaIds for back-traversal.
      if (!Array.isArray(fmeaDoc.relatedCapaIds)) fmeaDoc.relatedCapaIds = [];
      fmeaDoc.relatedCapaIds.push(capa._id);
      try {
        await fmeaDoc.save();
      } catch (saveErr) {
        logger.error(
          `[capa-producers] WARNING: CAPA ${capa.capaNumber} created but linkedCapaId update FAILED on Fmea ${fmeaDoc._id}: ${saveErr.message}`
        );
      }
    }

    res
      .status(201)
      .json({ success: true, capa, parent: { id: fmeaDoc._id, type: 'FmeaWorksheet' } });
  } catch (err) {
    logger.error('[capa-producers] POST /fmea/...', err);
    const mapped = mapErrorToHttp(err);
    res.status(mapped.status).json({ success: false, ...mapped.body });
  }
});

module.exports = router;
