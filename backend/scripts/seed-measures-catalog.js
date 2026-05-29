#!/usr/bin/env node
/**
 * seed-measures-catalog.js — W556
 *
 * Upserts the flagship standardized-instrument `Measure` documents
 * (measures_library) so the digital-administration scoring chain works
 * end-to-end. Before W556 the scoring modules existed but NO Measure docs
 * referenced them — `measureScoringEngine.resolveStrict` could never bind
 * a code to a module, so the engine was effectively dormant.
 *
 * Source of truth for catalog metadata: measures/catalog/flagship-measures.catalog.js
 * Source of truth for item TEXT + scoring math: measures/scoring/<code>.js
 *
 * Every entry is cross-checked against the scoring registry BEFORE any DB
 * write — a catalog/scorer mismatch (code, engineVersion, direction,
 * derivedRange) aborts the run so the two never silently diverge.
 *
 * Idempotent: re-runs upsert by `code`. Existing docs are updated only
 * with --update (otherwise left untouched and counted as unchanged).
 *
 * Usage:
 *   node scripts/seed-measures-catalog.js              seed all flagship measures
 *   node scripts/seed-measures-catalog.js --code PEDSQL  seed one
 *   node scripts/seed-measures-catalog.js --list        list catalog + scorer cross-check
 *   node scripts/seed-measures-catalog.js --dry-run     validate + preview, no DB write
 *   node scripts/seed-measures-catalog.js --update      refresh existing docs
 *   node scripts/seed-measures-catalog.js --json        machine-readable output
 *
 * Env:
 *   MONGODB_URI   mongo connection (required unless --dry-run / --list)
 */

'use strict';

const { MEASURES } = require('../measures/catalog/flagship-measures.catalog');
const registry = require('../measures/scoring');

const args = process.argv.slice(2);
function arg(name) {
  const idx = args.indexOf(name);
  return idx >= 0 ? args[idx + 1] : undefined;
}
function flag(name) {
  return args.includes(name);
}

const HELP = flag('--help') || flag('-h');
const LIST = flag('--list');
const DRY_RUN = flag('--dry-run');
const UPDATE = flag('--update');
const JSON_OUT = flag('--json');
const CODE_FILTER = arg('--code');

if (HELP) {
  console.log(require('fs').readFileSync(__filename, 'utf8').split('\n').slice(0, 36).join('\n'));
  process.exit(0);
}

/**
 * Cross-check a catalog entry against the wired scoring module. Returns
 * { ok, errors[] }. Pure — no DB.
 */
function crossCheck(entry) {
  const errors = [];
  const mod = registry.resolve(entry.code);
  if (!mod) {
    errors.push(`no scoring module registered for code='${entry.code}'`);
    return { ok: false, errors };
  }
  if (entry.scoringEngineVersion !== mod.engineVersion) {
    errors.push(
      `scoringEngineVersion '${entry.scoringEngineVersion}' ≠ module engineVersion '${mod.engineVersion}'`
    );
  }
  if (entry.scoringDirection !== mod.direction) {
    errors.push(
      `scoringDirection '${entry.scoringDirection}' ≠ module direction '${mod.direction}'`
    );
  }
  if (mod.scoreRange && entry.derivedRange) {
    if (
      entry.derivedRange.min !== mod.scoreRange.min ||
      entry.derivedRange.max !== mod.scoreRange.max
    ) {
      errors.push(
        `derivedRange ${JSON.stringify(entry.derivedRange)} ≠ module scoreRange ` +
          `${JSON.stringify(mod.scoreRange)}`
      );
    }
  }
  if (!mod.itemBank) {
    errors.push(`module '${entry.code}' has no itemBank — not administrable digitally`);
  }
  return { ok: errors.length === 0, errors };
}

function crossCheckAll(entries) {
  const problems = [];
  for (const e of entries) {
    const r = crossCheck(e);
    if (!r.ok) problems.push({ code: e.code, errors: r.errors });
  }
  return problems;
}

if (LIST) {
  const rows = MEASURES.map(m => {
    const r = crossCheck(m);
    const mod = registry.resolve(m.code);
    return {
      code: m.code,
      abbreviation: m.abbreviation,
      category: m.category,
      items: mod && mod.itemBank ? mod.itemBank.items.length : null,
      direction: m.scoringDirection,
      scorerOk: r.ok,
      issues: r.errors,
    };
  });
  if (JSON_OUT) {
    console.log(JSON.stringify(rows, null, 2));
  } else {
    console.log(`Flagship measures catalog (${rows.length}):\n`);
    for (const r of rows) {
      const status = r.scorerOk ? 'OK ' : 'ERR';

      console.log(
        `  [${status}] ${r.code.padEnd(10)} ${String(r.items).padStart(3)} items  ${r.category}` +
          (r.issues.length ? `  ⚠ ${r.issues.join('; ')}` : '')
      );
    }
  }
  process.exit(0);
}

async function main() {
  const selected = CODE_FILTER ? MEASURES.filter(m => m.code === CODE_FILTER) : MEASURES;
  if (selected.length === 0) {
    console.error(`No catalog measure matched --code "${CODE_FILTER}"`);

    console.error(`Available: ${MEASURES.map(m => m.code).join(', ')}`);
    process.exit(1);
  }

  // Cross-check BEFORE any DB write — abort on mismatch.
  const problems = crossCheckAll(selected);
  if (problems.length) {
    console.error('Catalog/scorer cross-check FAILED — aborting:');
    for (const p of problems) {
      console.error(`  ${p.code}: ${p.errors.join('; ')}`);
    }
    process.exit(1);
  }

  if (DRY_RUN) {
    console.log(`DRY RUN — cross-check passed for ${selected.length} measure(s):`);
    for (const m of selected) {
      console.log(`  ${m.code} (${m.abbreviation}) — would upsert`);
    }
    process.exit(0);
  }

  const mongoose = require('mongoose');
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI not set — cannot connect to database');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI, { family: 4 });

  require('../domains/goals/models/Measure');
  const Measure = mongoose.model('Measure');

  let created = 0;
  let updated = 0;
  let unchanged = 0;
  const errors = [];

  for (const def of selected) {
    try {
      const existing = await Measure.findOne({ code: def.code });
      if (!existing) {
        await Measure.create(def);
        created++;
        continue;
      }
      if (UPDATE) {
        existing.set(def);
        await existing.save();
        updated++;
      } else {
        unchanged++;
      }
    } catch (err) {
      errors.push({ code: def.code, error: err.message });
    }
  }

  await mongoose.disconnect();

  const summary = {
    processed: selected.length,
    created,
    updated,
    unchanged,
    errors: errors.length,
    errorDetails: errors,
  };
  if (JSON_OUT) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    console.log('Measures catalog seed complete:');

    console.log(`  Created:   ${created}`);

    console.log(`  Updated:   ${updated}`);

    console.log(`  Unchanged: ${unchanged}  (re-run with --update to refresh)`);

    console.log(`  Errors:    ${errors.length}`);
    for (const e of errors) {
      console.log(`    ${e.code}: ${e.error}`);
    }
  }
  if (errors.length) process.exit(1);
}

if (require.main === module) {
  main().catch(err => {
    console.error('Seed failed:', err.message);

    console.error(err.stack);
    process.exit(1);
  });
}

module.exports = { crossCheck, crossCheckAll, MEASURES };
