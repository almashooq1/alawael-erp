'use strict';

/**
 * provision-launch-staff.js — one-command launch provisioning of staff accounts.
 *
 * Closes the launch tooling gap: the repo has rich *reference/demo* seeders but
 * nothing to provision REAL staff (branches already exist; only 3 users at audit
 * time). This reads a JSON config the owner fills and creates the staff users
 * with correct roles + branch assignment, matching the canonical User.create
 * shape used by user-management.routes.js (password is auto-bcrypt-hashed by the
 * User pre-save hook).
 *
 * Design:
 *   - IDEMPOTENT — skips a user that already exists (by email OR username).
 *   - SAFE — --dry-run previews with zero writes; every user is in its own
 *     try/catch so one bad row never aborts the rest; invalid roles are rejected
 *     by the schema enum and reported per-row.
 *   - Self-loads dotenv, so both `node scripts/provision-launch-staff.js` and
 *     `npm run provision:staff` work from backend/ (unlike the older seeders
 *     which need `node -r dotenv/config`).
 *
 * Usage (from backend/):
 *   npm run provision:staff:list                 # show current users
 *   npm run provision:staff:dry                  # preview from default config
 *   npm run provision:staff                       # apply
 *   node scripts/provision-launch-staff.js --config ./my-staff.json --dry-run
 *
 * Config (default scripts/launch-staff.config.json — see .sample.json):
 *   { "users": [ { fullName, email|username, role, branchName|branchCode|branchId,
 *                  phone?, password?, isActive? } ] }
 *   - password omitted → a strong temp password is generated and printed once so
 *     the owner can distribute it; users should reset on first login (email works).
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');

const args = process.argv.slice(2);
const has = f => args.includes(f);
const val = (f, d) => {
  const i = args.indexOf(f);
  return i >= 0 && args[i + 1] ? args[i + 1] : d;
};
const DRY = has('--dry-run');
const LIST = has('--list');
const CONFIG = val('--config', path.join(__dirname, 'launch-staff.config.json'));

function tempPassword() {
  // 10 url-safe chars + guaranteed symbol/upper/digit to satisfy strength rules.
  const base = crypto
    .randomBytes(8)
    .toString('base64')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 8);
  return `${base}!A9`;
}

(async () => {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGODB_URI not set — run from backend/ where .env lives.');
    process.exit(1);
  }
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
  const User = require('../models/User');
  const Branch = require('../models/Branch');

  if (LIST) {
    const users = await User.find()
      .select('fullName username email role branchId isActive')
      .populate('branchId', 'name code')
      .lean();
    console.log(`Existing users (${users.length}):`);
    users.forEach(u =>
      console.log(
        `  ${String(u.email || u.username || '?').padEnd(32)} ${String(u.role || '-').padEnd(16)} ${u.isActive ? 'active' : 'inactive'}  ${u.branchId?.name || ''}`
      )
    );
    await mongoose.disconnect();
    return;
  }

  if (!fs.existsSync(CONFIG)) {
    console.error(
      `Config not found: ${CONFIG}\nCopy scripts/launch-staff.config.sample.json and fill in your staff, then re-run.`
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
  const list = Array.isArray(cfg.users) ? cfg.users : [];
  if (!list.length) {
    console.error('Config has no users[].');
    await mongoose.disconnect();
    process.exit(1);
  }

  const branchCache = new Map();
  async function resolveBranch(u) {
    const key = u.branchId || u.branchCode || u.branchName;
    if (!key) return undefined; // org-global user (no branch)
    if (branchCache.has(key)) return branchCache.get(key);
    let b = null;
    if (u.branchId && mongoose.isValidObjectId(u.branchId))
      b = await Branch.findById(u.branchId).lean();
    if (!b) b = await Branch.findOne({ $or: [{ code: key }, { name: key }] }).lean();
    branchCache.set(key, b);
    return b;
  }

  let created = 0;
  let skipped = 0;
  let errors = 0;
  const creds = [];

  for (const u of list) {
    const id = (u.email || u.username || JSON.stringify(u)).toString().slice(0, 48);
    try {
      const email = (u.email || '').toLowerCase() || undefined;
      const username = u.username || undefined;
      if (!u.fullName || (!email && !username)) {
        console.log(`  ✗ skip (needs fullName + email|username): ${id}`);
        errors++;
        continue;
      }
      const dupe = await User.findOne({
        $or: [email ? { email } : null, username ? { username } : null].filter(Boolean),
      }).lean();
      if (dupe) {
        console.log(`  • exists, skip: ${id}`);
        skipped++;
        continue;
      }
      const wantsBranch = u.branchId || u.branchCode || u.branchName;
      const branch = await resolveBranch(u);
      if (wantsBranch && !branch) {
        console.log(
          `  ✗ branch not found for ${id}: "${wantsBranch}" (use exact name/code, or --list branches)`
        );
        errors++;
        continue;
      }
      const password = u.password || tempPassword();
      const doc = {
        fullName: u.fullName,
        username,
        email,
        phone: u.phone || undefined,
        password,
        role: u.role || 'user',
        branch: branch ? branch._id : undefined,
        isActive: u.isActive !== undefined ? u.isActive : true,
      };
      if (DRY) {
        console.log(`  [dry] would create ${id} role=${doc.role} branch=${branch?.name || '-'}`);
      } else {
        await User.create(doc);
        console.log(`  ✓ created ${id} role=${doc.role} branch=${branch?.name || '-'}`);
      }
      created++;
      creds.push({ user: id, password: u.password ? '(provided)' : password });
    } catch (e) {
      console.log(`  ✗ error for ${id}: ${e.message}`);
      errors++;
    }
  }

  console.log(
    `\n${DRY ? '[DRY RUN] ' : ''}Done. created=${created} skipped(existing)=${skipped} errors=${errors}`
  );
  const generated = creds.filter(c => c.password !== '(provided)');
  if (generated.length) {
    console.log('\nGenerated temp passwords — share securely; users should reset on first login:');
    generated.forEach(c => console.log(`  ${String(c.user).padEnd(32)} →  ${c.password}`));
  }
  await mongoose.disconnect();
})().catch(e => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
