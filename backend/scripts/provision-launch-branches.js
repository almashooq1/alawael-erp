'use strict';

/**
 * provision-launch-branches.js — one-command launch provisioning of real branches.
 *
 * Companion to provision-launch-staff.js. The prod "branches" at launch-prep were
 * DEMO placeholders (codes MAIN-TEST / DEMO-HQ / DEMO-RIY / DEMO-JED / DEMO-RYD);
 * a real launch needs real branches. This reads a JSON config the owner fills and
 * creates Branch docs matching the canonical model (code unique+uppercase,
 * name_ar + name_en required; type/status/is_hq/location optional).
 *
 * Design (same contract as the staff tool):
 *   - IDEMPOTENT — skips a branch whose `code` already exists (code is unique).
 *   - SAFE — --dry-run previews with zero writes; per-branch try/catch; schema
 *     enums (type/status) rejected + reported per row.
 *   - Self-loads dotenv, so `node scripts/provision-launch-branches.js` and
 *     `npm run provision:branches` both work from backend/.
 *
 * Usage (from backend/):
 *   npm run provision:branches:list                 # show current branches
 *   npm run provision:branches:dry                  # preview from default config
 *   npm run provision:branches                       # apply
 *   node scripts/provision-launch-branches.js --config ./my-branches.json --dry-run
 *
 * Config (default scripts/launch-branches.config.json — see .sample.json):
 *   { "branches": [ { code, name_ar, name_en, short_name?, type?, status?,
 *                     is_hq?, location?: { city_ar, city_en, address_ar,
 *                     address_en, phone } } ] }
 *   After creating branches, provision staff with provision-launch-staff.js using
 *   the new branchCode values.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const args = process.argv.slice(2);
const has = f => args.includes(f);
const val = (f, d) => {
  const i = args.indexOf(f);
  return i >= 0 && args[i + 1] ? args[i + 1] : d;
};
const DRY = has('--dry-run');
const LIST = has('--list');
const CONFIG = val('--config', path.join(__dirname, 'launch-branches.config.json'));

const TYPES = ['hq', 'main', 'branch', 'satellite'];
const STATUSES = ['active', 'inactive', 'maintenance', 'opening_soon'];

(async () => {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGODB_URI not set — run from backend/ where .env lives.');
    process.exit(1);
  }
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
  const Branch = require('../models/Branch');

  if (LIST) {
    const branches = await Branch.find().select('code name_ar name_en type status is_hq').lean();
    console.log(`Existing branches (${branches.length}):`);
    branches.forEach(b =>
      console.log(
        `  ${String(b.code || '?').padEnd(12)} ${String(b.name_ar || b.name_en || '(no name)').padEnd(28)} ${String(b.type || '-').padEnd(10)} ${b.status || '-'}${b.is_hq ? ' [HQ]' : ''}`
      )
    );
    await mongoose.disconnect();
    return;
  }

  if (!fs.existsSync(CONFIG)) {
    console.error(
      `Config not found: ${CONFIG}\nCopy scripts/launch-branches.config.sample.json and fill in your branches, then re-run.`
    );
    await mongoose.disconnect();
    process.exit(1);
  }

  let cfg;
  try {
    cfg = JSON.parse(fs.readFileSync(CONFIG, 'utf8'));
  } catch (e) {
    console.error(`Invalid JSON in ${CONFIG}: ${e.message}`);
    await mongoose.disconnect();
    process.exit(1);
  }
  const list = Array.isArray(cfg.branches) ? cfg.branches : [];
  if (!list.length) {
    console.error('Config has no branches[].');
    await mongoose.disconnect();
    process.exit(1);
  }

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const b of list) {
    const code = (b.code || '').toString().trim().toUpperCase();
    const id = code || JSON.stringify(b).slice(0, 40);
    try {
      if (!code || !b.name_ar || !b.name_en) {
        console.log(`  ✗ skip (needs code + name_ar + name_en): ${id}`);
        errors++;
        continue;
      }
      if (b.type && !TYPES.includes(b.type)) {
        console.log(`  ✗ skip ${id}: invalid type "${b.type}" (allowed: ${TYPES.join('/')})`);
        errors++;
        continue;
      }
      if (b.status && !STATUSES.includes(b.status)) {
        console.log(
          `  ✗ skip ${id}: invalid status "${b.status}" (allowed: ${STATUSES.join('/')})`
        );
        errors++;
        continue;
      }
      const dupe = await Branch.findOne({ code }).lean();
      if (dupe) {
        console.log(`  • exists, skip: ${code}`);
        skipped++;
        continue;
      }
      const doc = {
        code,
        name_ar: b.name_ar,
        name_en: b.name_en,
        short_name: b.short_name || undefined,
        type: b.type || 'branch',
        status: b.status || 'active',
        is_hq: b.is_hq === true || b.type === 'hq',
        location: b.location || undefined,
      };
      if (DRY) {
        console.log(
          `  [dry] would create ${code} (${doc.name_ar}) type=${doc.type}${doc.is_hq ? ' HQ' : ''}`
        );
      } else {
        await Branch.create(doc);
        console.log(
          `  ✓ created ${code} (${doc.name_ar}) type=${doc.type}${doc.is_hq ? ' HQ' : ''}`
        );
      }
      created++;
    } catch (e) {
      console.log(`  ✗ error for ${id}: ${e.message}`);
      errors++;
    }
  }

  console.log(
    `\n${DRY ? '[DRY RUN] ' : ''}Done. created=${created} skipped(existing)=${skipped} errors=${errors}`
  );
  if (created && !DRY) {
    console.log(
      'Next: provision staff with `npm run provision:staff` using these branchCode values.'
    );
  }
  await mongoose.disconnect();
})().catch(e => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
