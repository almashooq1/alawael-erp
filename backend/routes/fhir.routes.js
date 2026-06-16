'use strict';

/**
 * FHIR R4 interoperability surface — W1357 (first consumer of the dormant
 * FHIR mapper/validator layer at intelligence/fhir/, ~1386 assertions).
 *
 * Scope (deliberately minimal + non-breaking):
 *   GET /metadata → FHIR R4 CapabilityStatement (server conformance).
 *
 * This is the canonical FHIR discovery endpoint. It declares WHICH resource
 * types the layer can emit (derived from RESOURCE_TYPES) and the interactions
 * supported (read / search-type, read-only). It contains NO PHI — only
 * static server-capability metadata.
 *
 * Mounted auth-gated (dualMountAuth) in routes/registries/features.registry.js
 * at /api/(v1/)fhir. Auth is a conservative choice: the CapabilityStatement
 * is non-sensitive, but gating avoids adding a new anonymous attack surface
 * (W502 doctrine — only the Nafath login flow is intentionally public).
 *
 * PHI export — GET /Patient/:id (W1358):
 *   A single-resource read that maps a canonical Beneficiary to a FHIR R4
 *   Patient. It is PHI-exposing, so it is gated THREE ways and ships OFF:
 *     1. Feature flag  — ENABLE_FHIR_PHI_EXPORT must be 'true'. Default OFF →
 *        the endpoint behaves exactly as if it does not exist (404), so
 *        current production behavior (no PHI over FHIR) is byte-for-byte
 *        unchanged until an operator deliberately flips the flag.
 *     2. Branch isolation — enforceBeneficiaryBranch (W269) rejects restricted
 *        callers reaching across branches.
 *     3. PDPL consent — an active (not revoked, not expired) data_sharing
 *        consent is mandatory; absent it the response is 403.
 *   Two deliberate human actions (set the flag + record consent) are required
 *   before any PHI can leave — the product/consent decision stays with the
 *   operator, this only wires the mechanism.
 *
 * PHI export — GET /Patient/:id/$everything (W1364, compartment W1365):
 *   The FHIR R4 patient-compartment operation. Returns a searchset Bundle of
 *   the Patient plus every resource in the beneficiary's compartment (the
 *   platform's canonical unifying core). It is PHI-exposing and multi-resource,
 *   so it ships behind the SAME three gates as GET /Patient/:id — identical
 *   default-OFF feature flag, branch isolation, and data_sharing consent — so
 *   production behavior is unchanged until an operator deliberately opts in.
 *   The Bundle is structurally validated (toValidatedFhirBundle, W1346) before
 *   it is returned; a malformed compartment yields 422 + OperationOutcome, not
 *   a partial leak.
 *
 *   The compartment is a frozen, audited registry (PATIENT_COMPARTMENT below).
 *   Every entry is admitted only after verifying ALL of: (a) a single Mongoose
 *   registration under the EXACT mapper-key name (no W340 dual-registration
 *   ambiguity), (b) a top-level beneficiaryId field, and (c) a pure FHIR mapper
 *   round-trip-tested against that canonical schema. Confidentiality-sensitive
 *   records (e.g. SafeguardingConcern) and nested-key records (AssistiveDevice,
 *   keyed inside loans[]) are deliberately EXCLUDED — admitting them is a
 *   product/privacy decision, not a mechanical wire-up. Each model is resolved
 *   defensively (tryModel): an unregistered model contributes zero entries
 *   rather than throwing, keeping the export robust across deployments.
 */

const mongoose = require('mongoose');
const express = require('express');

const router = express.Router();

const {
  buildCapabilityStatement,
  toValidatedFhir,
  toValidatedFhirBundle,
  buildOperationOutcome,
} = require('../intelligence/fhir');
const { enforceBeneficiaryBranch } = require('../middleware/assertBranchMatch');

/**
 * Feature flag — PHI FHIR export. Default OFF. Read once at module load so the
 * gate is a single source of truth (env mutation after boot is intentionally
 * ignored, matching the rest of the route layer).
 * @type {boolean}
 */
const FHIR_PHI_EXPORT_ENABLED =
  String(process.env.ENABLE_FHIR_PHI_EXPORT || '')
    .trim()
    .toLowerCase() === 'true';

/** Build a FHIR R4 OperationOutcome error body (application/fhir+json). */
function fhirError(res, status, message, code) {
  return res
    .status(status)
    .type('application/fhir+json')
    .json(buildOperationOutcome({ errors: [message], code }));
}

/**
 * GET /metadata — FHIR R4 CapabilityStatement.
 * No path/query params, no body, read-only. NO PHI.
 */
router.get('/metadata', (req, res) => {
  const statement = buildCapabilityStatement({ date: new Date().toISOString() });
  res.set('Content-Type', 'application/fhir+json');
  return res.status(200).json(statement);
});

/**
 * GET /Patient/:id — FHIR R4 Patient for one Beneficiary. PHI-exposing.
 * Gated: feature flag (default OFF → 404) + branch isolation + data_sharing
 * consent. See the file header for the full rationale.
 */
router.get('/Patient/:id', async (req, res) => {
  // Gate 1 — feature flag. OFF by default: behave as if the route is absent.
  if (!FHIR_PHI_EXPORT_ENABLED) {
    return fhirError(res, 404, 'resource not found', 'not-found');
  }

  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return fhirError(res, 400, 'invalid Patient id', 'value');
  }

  try {
    // Gate 2 — branch isolation (W269). Throws 403/404 for restricted callers
    // reaching across branches; no-op for cross-branch / unscoped roles.
    await enforceBeneficiaryBranch(req, id);

    const Beneficiary = mongoose.model('Beneficiary');
    const beneficiary = await Beneficiary.findById(id).lean();
    if (!beneficiary) {
      return fhirError(res, 404, 'Patient not found', 'not-found');
    }

    // Gate 3 — PDPL consent. Active, non-revoked, non-expired data_sharing
    // consent is mandatory before any PHI leaves over FHIR.
    const { Consent } = require('../models/Consent');
    const now = new Date();
    const consent = await Consent.findOne({
      beneficiaryId: id,
      type: 'data_sharing',
      revokedAt: null,
      $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
    })
      .select('_id')
      .lean();
    if (!consent) {
      return fhirError(
        res,
        403,
        'active data_sharing consent required for FHIR export',
        'forbidden'
      );
    }

    const { resource, validation, operationOutcome } = toValidatedFhir('Beneficiary', beneficiary);
    if (!validation.valid) {
      return res.status(422).type('application/fhir+json').json(operationOutcome);
    }
    return res.status(200).type('application/fhir+json').json(resource);
  } catch (err) {
    const status = err && err.status ? err.status : 500;
    const code = status === 403 ? 'forbidden' : status === 404 ? 'not-found' : 'exception';
    return fhirError(res, status, (err && err.message) || 'export failed', code);
  }
});

/**
 * Resolve a registered Mongoose model by name, or null when it is not yet
 * registered in this process. Domain models are registered by their domain
 * bootstrap in a live process; treating an unregistered model as "contributes
 * nothing" keeps $everything robust rather than throwing MissingSchemaError.
 * @param {string} name
 * @returns {import('mongoose').Model<any>|null}
 */
function tryModel(name) {
  try {
    return mongoose.model(name);
  } catch (_e) {
    return null;
  }
}

/**
 * Audited FHIR patient-compartment registry (W1365). Each entry's entityName
 * is BOTH the registered Mongoose model name AND the FHIR mapper key — verified
 * 1:1. beneficiaryField is the top-level path linking the record to the
 * beneficiary. See the module header for the admission criteria. Add an entry
 * only after verifying single-registration + top-level beneficiary key + a
 * round-trip-tested mapper; never admit confidentiality-sensitive records.
 * @type {ReadonlyArray<{ entityName: string, beneficiaryField: string }>}
 */
const PATIENT_COMPARTMENT = Object.freeze([
  Object.freeze({ entityName: 'EpisodeOfCare', beneficiaryField: 'beneficiaryId' }),
  Object.freeze({ entityName: 'SeizureEvent', beneficiaryField: 'beneficiaryId' }),
  Object.freeze({ entityName: 'BehaviorIncident', beneficiaryField: 'beneficiaryId' }),
  Object.freeze({ entityName: 'AdaptiveSportsProgram', beneficiaryField: 'beneficiaryId' }),
  Object.freeze({ entityName: 'CaregiverSupportProgram', beneficiaryField: 'beneficiaryId' }),
  Object.freeze({ entityName: 'RespiteBooking', beneficiaryField: 'beneficiaryId' }),
]);

/**
 * GET /Patient/:id/$everything — FHIR R4 patient-compartment export.
 * PHI-exposing + multi-resource. Gated identically to GET /Patient/:id
 * (feature flag default OFF → 404, branch isolation, data_sharing consent).
 */
router.get('/Patient/:id/\\$everything', async (req, res) => {
  // Gate 1 — feature flag. OFF by default: behave as if the route is absent.
  if (!FHIR_PHI_EXPORT_ENABLED) {
    return fhirError(res, 404, 'resource not found', 'not-found');
  }

  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return fhirError(res, 400, 'invalid Patient id', 'value');
  }

  try {
    // Gate 2 — branch isolation (W269).
    await enforceBeneficiaryBranch(req, id);

    const Beneficiary = mongoose.model('Beneficiary');
    const beneficiary = await Beneficiary.findById(id).lean();
    if (!beneficiary) {
      return fhirError(res, 404, 'Patient not found', 'not-found');
    }

    // Gate 3 — PDPL consent (active, non-revoked, non-expired data_sharing).
    const { Consent } = require('../models/Consent');
    const now = new Date();
    const consent = await Consent.findOne({
      beneficiaryId: id,
      type: 'data_sharing',
      revokedAt: null,
      $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
    })
      .select('_id')
      .lean();
    if (!consent) {
      return fhirError(
        res,
        403,
        'active data_sharing consent required for FHIR export',
        'forbidden'
      );
    }

    // Compartment — Patient + every audited resource keyed to the beneficiary.
    const entries = [{ entityName: 'Beneficiary', record: beneficiary }];
    for (const { entityName, beneficiaryField } of PATIENT_COMPARTMENT) {
      const Model = tryModel(entityName);
      if (!Model) continue;
      const records = await Model.find({ [beneficiaryField]: id }).lean();
      for (const record of records) {
        entries.push({ entityName, record });
      }
    }

    const { bundle, validation, operationOutcome } = toValidatedFhirBundle(entries, {
      bundleOpts: { type: 'searchset' },
    });
    if (!validation.valid) {
      return res.status(422).type('application/fhir+json').json(operationOutcome);
    }
    return res.status(200).type('application/fhir+json').json(bundle);
  } catch (err) {
    const status = err && err.status ? err.status : 500;
    const code = status === 403 ? 'forbidden' : status === 404 ? 'not-found' : 'exception';
    return fhirError(res, status, (err && err.message) || 'export failed', code);
  }
});

module.exports = router;
