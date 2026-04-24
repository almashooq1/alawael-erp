/**
 * openapi-integration.routes.js — serves the hand-crafted OpenAPI 3.1 spec
 * for the integration layer and a human-readable Swagger UI at
 * /api/docs/integration.
 *
 * Why a hand-crafted YAML instead of jsdoc auto-gen?
 *   - The integration endpoints span 6 domains (Nafath, Yakeen, Wasel,
 *     NPHIES, DLQ admin, Prom metrics). Pinning them in one file makes
 *     partner onboarding and SDK generation one `curl` away.
 *   - Errors + idempotency semantics are richer than jsdoc comments can
 *     express cleanly.
 *   - The spec lives under `docs/api/` where it's version-controlled and
 *     reviewed alongside the code.
 *
 * Endpoints:
 *   GET /api/docs/integration.yaml — raw spec
 *   GET /api/docs/integration.json — parsed JSON (same content)
 *   GET /api/docs/integration       — interactive Swagger UI
 *
 * All three are public (no auth) because:
 *   - Integration partners need to see the spec before provisioning.
 *   - The spec itself carries no secrets — every schema references the
 *     Bearer / HMAC security requirement, but the tokens aren't in the
 *     file.
 */

'use strict';

const express = require('express');
const fs = require('fs');
const path = require('path');
const YAML = require('yaml');

const router = express.Router();

const SPEC_PATH = path.resolve(__dirname, '..', '..', 'docs', 'api', 'openapi-integration.yaml');
const ASYNCAPI_PATH = path.resolve(__dirname, '..', '..', 'docs', 'api', 'asyncapi-events.yaml');

const cache = new Map(); // path -> { yaml, parsed, mtimeMs }

function _loadYamlFile(p) {
  const stat = fs.statSync(p);
  const entry = cache.get(p);
  if (entry && entry.mtimeMs === stat.mtimeMs) return entry;
  const yaml = fs.readFileSync(p, 'utf8');
  const parsed = YAML.parse(yaml);
  const fresh = { yaml, parsed, mtimeMs: stat.mtimeMs };
  cache.set(p, fresh);
  return fresh;
}

function _loadSpec() {
  return _loadYamlFile(SPEC_PATH);
}

function _loadAsyncapi() {
  return _loadYamlFile(ASYNCAPI_PATH);
}

router.get('/integration.yaml', (_req, res) => {
  try {
    const { yaml } = _loadSpec();
    res.set('Content-Type', 'application/yaml; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=60');
    res.send(yaml);
  } catch (err) {
    res.status(500).json({ error: 'SPEC_LOAD_FAILED', message: err.message });
  }
});

router.get('/integration.json', (_req, res) => {
  try {
    const { parsed } = _loadSpec();
    res.set('Content-Type', 'application/json; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=60');
    res.send(JSON.stringify(parsed, null, 2));
  } catch (err) {
    res.status(500).json({ error: 'SPEC_LOAD_FAILED', message: err.message });
  }
});

// Swagger UI — lazy-required so a missing optional dep never breaks boot.
router.get('/integration', (req, res, next) => {
  try {
    const swaggerUi = require('swagger-ui-express');
    const { parsed } = _loadSpec();
    const setup = swaggerUi.setup(parsed, {
      customSiteTitle: 'Al-Awael — Integration APIs',
      customfavIcon: '/favicon.ico',
      swaggerOptions: {
        docExpansion: 'list',
        defaultModelsExpandDepth: 1,
        persistAuthorization: true,
      },
    });
    // serve() returns middleware that needs a one-off application
    const serve = swaggerUi.serve;
    return serve
      .reduce((chain, mw) => chain.then(() => new Promise(r => mw(req, res, r))), Promise.resolve())
      .then(() => setup(req, res, next));
  } catch (err) {
    res.status(500).json({ error: 'SWAGGER_UI_LOAD_FAILED', message: err.message });
  }
});

// ─── Postman Collection v2.1 — auto-generated from the OpenAPI spec ─────

router.get('/integration.postman.json', (_req, res) => {
  try {
    const { parsed } = _loadSpec();
    const { convert } = require('../services/openapiToPostman');
    const collection = convert(parsed);
    res.set('Content-Type', 'application/json; charset=utf-8');
    res.set(
      'Content-Disposition',
      'attachment; filename="alawael-integration.postman_collection.json"'
    );
    res.send(JSON.stringify(collection, null, 2));
  } catch (err) {
    res.status(500).json({ error: 'POSTMAN_GEN_FAILED', message: err.message });
  }
});

// ─── AsyncAPI 3.0 — event bus contract ──────────────────────────────────

router.get('/events.yaml', (_req, res) => {
  try {
    const { yaml } = _loadAsyncapi();
    res.set('Content-Type', 'application/yaml; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=60');
    res.send(yaml);
  } catch (err) {
    res.status(500).json({ error: 'ASYNCAPI_LOAD_FAILED', message: err.message });
  }
});

router.get('/events.json', (_req, res) => {
  try {
    const { parsed } = _loadAsyncapi();
    res.set('Content-Type', 'application/json; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=60');
    res.send(JSON.stringify(parsed, null, 2));
  } catch (err) {
    res.status(500).json({ error: 'ASYNCAPI_LOAD_FAILED', message: err.message });
  }
});

module.exports = router;
