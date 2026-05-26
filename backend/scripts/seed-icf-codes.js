#!/usr/bin/env node
/**
 * seed-icf-codes.js — bootstrap ICF code catalog + Core Set memberships (W448).
 *
 * Loads ICF Core Sets from `backend/intelligence/icf/core-sets/*.json` into the
 * `ICFCodeReference` collection. Phase A starter ships only the Generic Brief
 * Core Set (17 codes covering b/d/e components). Condition-specific Core Sets
 * (CP, ASD, ID, ADHD, Hearing, Vision, Stroke, SCI, DCD) ship as separate
 * curation waves once their WHO publications are translated and reviewed.
 *
 * Idempotent: re-runs upsert existing codes by `code` field. Core Set
 * memberships are merged (duplicate setName entries deduped per code).
 *
 * Usage:
 *   node scripts/seed-icf-codes.js                       seed all available Core Sets
 *   node scripts/seed-icf-codes.js --set generic_brief   seed only one Core Set
 *   node scripts/seed-icf-codes.js --list                list available Core Sets + counts
 *   node scripts/seed-icf-codes.js --dry-run             preview, no DB write
 *   node scripts/seed-icf-codes.js --update              refresh translations on existing
 *   node scripts/seed-icf-codes.js --json                machine-readable output
 *
 * Env:
 *   MONGODB_URI   mongo connection (required unless --dry-run / --list)
 */

'use strict';

const fs = require('fs');
const path = require('path');

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
const SET_FILTER = arg('--set');

if (HELP) {
  console.log(fs.readFileSync(__filename, 'utf8').split('\n').slice(0, 28).join('\n'));
  process.exit(0);
}

const CORE_SETS_DIR = path.join(__dirname, '..', 'intelligence', 'icf', 'core-sets');

function loadCoreSets() {
  if (!fs.existsSync(CORE_SETS_DIR)) {
    throw new Error(`Core Sets directory not found: ${CORE_SETS_DIR}`);
  }
  const files = fs.readdirSync(CORE_SETS_DIR).filter(f => f.endsWith('.json'));
  const sets = [];
  for (const file of files) {
    const full = path.join(CORE_SETS_DIR, file);
    try {
      const data = JSON.parse(fs.readFileSync(full, 'utf8'));
      if (!data.setName) {
        throw new Error(`missing setName in ${file}`);
      }
      if (!Array.isArray(data.codes) || data.codes.length === 0) {
        throw new Error(`missing or empty codes array in ${file}`);
      }
      sets.push({ file, data });
    } catch (err) {
      console.error(`Skipping ${file}: ${err.message}`);
    }
  }
  return sets;
}

if (LIST) {
  const sets = loadCoreSets();
  if (JSON_OUT) {
    console.log(
      JSON.stringify(
        sets.map(s => ({
          file: s.file,
          setName: s.data.setName,
          setVersion: s.data.setVersion,
          displayName: s.data.displayName,
          codeCount: s.data.codes.length,
        })),
        null,
        2
      )
    );
  } else {
    console.log(`Available Core Sets (${sets.length}):\n`);
    for (const s of sets) {
      const dn = s.data.displayName?.ar || s.data.displayName?.en || s.data.setName;
      console.log(`  ${s.data.setName.padEnd(25)} ${s.data.codes.length} codes  ${dn}`);
    }
  }
  process.exit(0);
}

async function main() {
  const sets = loadCoreSets();
  const selected = SET_FILTER ? sets.filter(s => s.data.setName === SET_FILTER) : sets;

  if (selected.length === 0) {
    console.error(`No Core Sets matched filter --set "${SET_FILTER}"`);
    console.error(`Available: ${sets.map(s => s.data.setName).join(', ')}`);
    process.exit(1);
  }

  if (DRY_RUN) {
    const totalCodes = selected.reduce((sum, s) => sum + s.data.codes.length, 0);
    console.log(
      `DRY RUN — would seed ${selected.length} Core Set(s), ${totalCodes} code memberships`
    );
    for (const s of selected) {
      console.log(`  ${s.data.setName}: ${s.data.codes.length} codes`);
    }
    process.exit(0);
  }

  // Connect to mongo
  const mongoose = require('mongoose');
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI not set — cannot connect to database');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI);

  // Lazy require the model so the seed script can run with a fresh connection
  require('../models/icf/ICFCodeReference.model');
  const ICFCodeReference = mongoose.model('ICFCodeReference');

  let created = 0;
  let updated = 0;
  let membershipsAdded = 0;
  let unchanged = 0;
  const errors = [];

  for (const s of selected) {
    const { setName, setVersion = '2017' } = s.data;
    for (const codeEntry of s.data.codes) {
      try {
        const existing = await ICFCodeReference.findOne({ code: codeEntry.code });

        if (!existing) {
          await ICFCodeReference.create({
            code: codeEntry.code,
            component: codeEntry.component,
            chapter: codeEntry.chapter,
            level: codeEntry.level,
            title: codeEntry.title,
            titleAr: codeEntry.titleAr,
            description: codeEntry.description,
            descriptionAr: codeEntry.descriptionAr,
            includes: codeEntry.includes || [],
            excludes: codeEntry.excludes || [],
            parentCode: codeEntry.parentCode,
            isActive: true,
            isCyOnly: codeEntry.isCyOnly === true,
            coreSetMemberships: [{ setName, setVersion, isCanonical: true }],
          });
          created++;
          continue;
        }

        // Existing — check if this Core Set membership is already present
        const hasMembership = (existing.coreSetMemberships || []).some(m => m.setName === setName);
        const needsUpdate =
          UPDATE &&
          (existing.titleAr !== codeEntry.titleAr ||
            existing.descriptionAr !== codeEntry.descriptionAr ||
            existing.title !== codeEntry.title);

        if (!hasMembership) {
          existing.coreSetMemberships = [
            ...(existing.coreSetMemberships || []),
            { setName, setVersion, isCanonical: true },
          ];
          membershipsAdded++;
        }

        if (needsUpdate) {
          existing.title = codeEntry.title;
          existing.titleAr = codeEntry.titleAr;
          existing.description = codeEntry.description;
          existing.descriptionAr = codeEntry.descriptionAr;
          updated++;
        }

        if (hasMembership && !needsUpdate) {
          unchanged++;
        } else {
          await existing.save();
        }
      } catch (err) {
        errors.push({ code: codeEntry.code, set: setName, error: err.message });
      }
    }
  }

  await mongoose.disconnect();

  const summary = {
    setsProcessed: selected.length,
    created,
    updated,
    membershipsAdded,
    unchanged,
    errors: errors.length,
    errorDetails: errors.slice(0, 10),
  };

  if (JSON_OUT) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    console.log(`ICF seed complete:`);
    console.log(`  Sets processed:      ${summary.setsProcessed}`);
    console.log(`  Codes created:       ${created}`);
    console.log(`  Codes updated:       ${updated}`);
    console.log(`  Memberships added:   ${membershipsAdded}`);
    console.log(`  Unchanged:           ${unchanged}`);
    console.log(`  Errors:              ${errors.length}`);
    if (errors.length > 0) {
      console.log('\nFirst errors:');
      for (const e of errors.slice(0, 10)) {
        console.log(`  ${e.code} (${e.set}): ${e.error}`);
      }
    }
  }
}

if (require.main === module) {
  main().catch(err => {
    console.error('Seed failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  });
}

module.exports = { loadCoreSets };
