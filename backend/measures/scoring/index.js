'use strict';

/**
 * scoring/index.js — Wave 212
 *
 * Registry of per-measure scoring modules. Auto-discovers every
 * `{code}.js` file in this directory (except files starting with `_`),
 * validates each against the contract, and exposes:
 *
 *   resolve(measureCode)               — get the module by Measure.code
 *   resolveStrict(measure)             — resolve + verify versions match
 *                                         the measure document
 *   list()                             — { measureCode, engineVersion, derivedType }[]
 *   has(measureCode)
 *   reload()                           — re-scan dir (used in tests)
 *
 * Modules are loaded eagerly at first call and frozen. Any contract
 * violation surfaces at load time — not at scoring time — so a broken
 * module fails the test suite, not a live administration.
 */

const fs = require('fs');
const path = require('path');
const { validateContract } = require('./contract');

const SCORING_DIR = __dirname;
const NON_MODULE_FILES = new Set(['index.js', 'contract.js']);

let _registry = null;

function _load() {
  const map = new Map();
  const errors = [];

  const files = fs
    .readdirSync(SCORING_DIR)
    .filter(f => f.endsWith('.js') && !f.startsWith('_') && !NON_MODULE_FILES.has(f));

  for (const file of files) {
    const fullPath = path.join(SCORING_DIR, file);
    try {
      const mod = require(fullPath);
      const frozen = validateContract(mod, file);

      // Filename should align with measureCode for predictable resolution.
      // We allow loose match (case-insensitive, ignore hyphens) so SCQ.js
      // declares measureCode='SCQ' and gmfm-66.js declares 'GMFM-66'.
      const expected = path.basename(file, '.js').toUpperCase().replace(/-/g, '');
      const actual = frozen.measureCode.toUpperCase().replace(/-/g, '');
      if (expected !== actual) {
        errors.push(
          `[scoring/${file}] filename '${file}' doesn't match measureCode='${frozen.measureCode}' ` +
            `(normalised '${expected}' vs '${actual}')`
        );
        continue;
      }

      // First-write wins. Duplicate codes are a load-time error.
      if (map.has(frozen.measureCode)) {
        errors.push(
          `[scoring/${file}] duplicate measureCode='${frozen.measureCode}' (already in registry)`
        );
        continue;
      }
      map.set(frozen.measureCode, frozen);
    } catch (err) {
      errors.push(`[scoring/${file}] ${err.message}`);
    }
  }

  if (errors.length) {
    // Fail loudly — a broken module shipped to prod is worse than a
    // load-time crash (silent wrong scores would propagate everywhere).
    throw new Error(
      `Scoring registry refused to load ${errors.length} module(s):\n  - ${errors.join('\n  - ')}`
    );
  }
  return map;
}

function _ensure() {
  if (!_registry) _registry = _load();
  return _registry;
}

function resolve(measureCode) {
  if (!measureCode) return null;
  return _ensure().get(measureCode) || null;
}

/**
 * Resolve a scoring module AND verify it matches the Measure document's
 * declared scoringEngineVersion. Refuses to return the module if the
 * versions don't agree (would produce scores that violate the version-
 * pinning contract W211b relies on).
 */
function resolveStrict(measure) {
  if (!measure || !measure.code) {
    throw new Error('resolveStrict: measure with .code required');
  }
  const mod = resolve(measure.code);
  if (!mod) {
    throw new Error(`No scoring module registered for measureCode='${measure.code}'`);
  }
  if (measure.scoringEngineVersion && measure.scoringEngineVersion !== mod.engineVersion) {
    throw new Error(
      `Scoring engine version mismatch for ${measure.code}: ` +
        `Measure declares '${measure.scoringEngineVersion}', ` +
        `module is at '${mod.engineVersion}'. ` +
        'Bump the module version + add a frozen test fixture before publishing.'
    );
  }
  return mod;
}

function list() {
  return [..._ensure().values()].map(m => ({
    measureCode: m.measureCode,
    engineVersion: m.engineVersion,
    derivedType: m.derivedType,
    direction: m.direction,
    hasSubscales: !!m.subscaleDerivedTypes,
  }));
}

function has(measureCode) {
  return _ensure().has(measureCode);
}

function reload() {
  _registry = null;
  return _ensure();
}

module.exports = { resolve, resolveStrict, list, has, reload };
