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
 * Deferred (product decision, PHI-exposing): Patient/:id read, $everything
 * export, and Bundle search endpoints. Those require an explicit data-sharing
 * / consent decision and are intentionally NOT shipped here.
 */

const express = require('express');

const router = express.Router();

const { buildCapabilityStatement } = require('../intelligence/fhir');

/**
 * GET /metadata — FHIR R4 CapabilityStatement.
 * No path/query params, no body, read-only. NO PHI.
 */
router.get('/metadata', (req, res) => {
  const statement = buildCapabilityStatement({ date: new Date().toISOString() });
  res.set('Content-Type', 'application/fhir+json');
  return res.status(200).json(statement);
});

module.exports = router;
