#!/usr/bin/env node
'use strict';

/**
 * generate-care-plan-postman.js — Wave 63.
 *
 * Generates a Postman v2.1 collection from the Care Planning Engine
 * OpenAPI spec (Wave 51) and writes it to `docs/api/care-plan.postman.json`.
 *
 * Reuses the shared `services/openapiToPostman.js` converter (built for
 * the integration spec — same structural contract).
 *
 * Usage:
 *   node backend/scripts/generate-care-plan-postman.js
 *   node backend/scripts/generate-care-plan-postman.js --stdout    # write to stdout instead of file
 *
 * Test:
 *   Import the resulting `.json` into Postman → "Care Planning Engine"
 *   collection with 25 requests grouped by 9 tags.
 */

const fs = require('fs');
const path = require('path');
const YAML = require('yaml');
const { convert } = require('../services/openapiToPostman');

const SPEC = path.resolve(__dirname, '..', '..', 'docs', 'api', 'openapi-care-planning.yaml');
const OUT = path.resolve(__dirname, '..', '..', 'docs', 'api', 'care-plan.postman.json');

function main() {
  const stdout = process.argv.includes('--stdout');

  if (!fs.existsSync(SPEC)) {
    console.error(`[postman] OpenAPI spec not found: ${SPEC}`);
    process.exit(1);
  }

  const yamlText = fs.readFileSync(SPEC, 'utf-8');
  const spec = YAML.parse(yamlText);

  const collection = convert(spec, {
    baseUrlVariable: 'baseUrl',
    bearerTokenVariable: 'bearerToken',
    defaultBaseUrl: 'https://alaweal.org',
  });

  // Override collection name to reflect the engine + add a brief description
  collection.info.name = 'Care Planning Engine';
  collection.info.description =
    'AlAwael Rehab Platform — Care Planning Engine HTTP API.\n\n' +
    'Generated from `docs/api/openapi-care-planning.yaml` via\n' +
    '`backend/scripts/generate-care-plan-postman.js`.\n\n' +
    'Auth: set the `bearerToken` collection variable to a valid JWT from\n' +
    'POST /api/v1/auth/login. The `baseUrl` defaults to the production host;\n' +
    'override per-environment.\n\n' +
    'Coverage: 25 endpoints across 9 tags (lifecycle / review / family / ' +
    'recommendations / progress / reports / library / groups / audit + ops).';

  const json = JSON.stringify(collection, null, 2);

  if (stdout) {
    process.stdout.write(json);
    return;
  }

  fs.writeFileSync(OUT, json, 'utf-8');
  const requestCount = collection.item.reduce(
    (sum, folder) => sum + (Array.isArray(folder.item) ? folder.item.length : 0),
    0
  );
  console.log(`[postman] ✓ Wrote ${OUT}`);
  console.log(`[postman]   ${collection.item.length} folders, ${requestCount} requests`);
}

main();
