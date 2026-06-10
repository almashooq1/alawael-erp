#!/usr/bin/env node
/**
 * seed-forms-catalog.js — bulk-instantiate the forms catalog into FormTemplate.
 *
 * Phase 19 Commit 4. CLI runner that materialises all (or filtered) catalog
 * entries as FormTemplate documents so a fresh tenant gets the 32
 * ready-to-use forms with a single command.
 *
 * Idempotent: re-running on the same tenant/branch is a no-op for entries
 * that already exist (matched by metadata.catalogId + tenantId + branchId).
 * Pass --reset to delete and recreate from-catalog entries.
 *
 * Usage:
 *   node scripts/seed-forms-catalog.js                       seed all
 *   node scripts/seed-forms-catalog.js --audience hr         only hr forms
 *   node scripts/seed-forms-catalog.js --tenant TENANT_ID
 *   node scripts/seed-forms-catalog.js --branch BRANCH_ID
 *   node scripts/seed-forms-catalog.js --dry-run             plan only
 *   node scripts/seed-forms-catalog.js --reset               wipe + reseed
 *   node scripts/seed-forms-catalog.js --json                machine-readable
 *
 * Env:
 *   MONGODB_URI                 mongo connection (required unless --dry-run)
 *   FORMS_SEED_TENANT_ID        default tenantId if --tenant not passed
 *   FORMS_SEED_BRANCH_ID        default branchId if --branch not passed
 */

'use strict';

const args = process.argv.slice(2);

function arg(name) {
  const idx = args.indexOf(name);
  return idx >= 0 ? args[idx + 1] : undefined;
}
function flag(name) {
  return args.includes(name);
}

const HELP = flag('--help') || flag('-h');
const DRY = flag('--dry-run');
const JSON_MODE = flag('--json');
const RESET = flag('--reset');
const SYNC_APPROVALS = flag('--sync-approvals');
const AUDIENCE = arg('--audience');
const TENANT_ID = arg('--tenant') || process.env.FORMS_SEED_TENANT_ID || null;
const BRANCH_ID = arg('--branch') || process.env.FORMS_SEED_BRANCH_ID || null;

if (HELP) {
  process.stdout.write(
    [
      'seed-forms-catalog — populate FormTemplate from the ready-forms catalog',
      '',
      'Options:',
      '  --audience hr|beneficiary|management   filter by audience',
      '  --tenant <id>                          tenantId scope (or FORMS_SEED_TENANT_ID)',
      '  --branch <id>                          branchId scope (or FORMS_SEED_BRANCH_ID)',
      '  --dry-run                              plan only, no DB writes',
      '  --reset                                delete existing from-catalog docs first',
      '  --sync-approvals                       backfill approvalSteps onto already-seeded',
      '                                         catalog docs missing a chain (W1186)',
      '  --json                                 machine-readable output',
      '  -h, --help                             this message',
      '',
      'Idempotent on (catalogId, tenantId, branchId) unless --reset.',
      '',
    ].join('\n')
  );
  process.exit(0);
}

const useColor = !JSON_MODE && process.stdout.isTTY;
const c = {
  reset: useColor ? '\x1b[0m' : '',
  bold: useColor ? '\x1b[1m' : '',
  dim: useColor ? '\x1b[2m' : '',
  green: useColor ? '\x1b[32m' : '',
  yellow: useColor ? '\x1b[33m' : '',
  red: useColor ? '\x1b[31m' : '',
  cyan: useColor ? '\x1b[36m' : '',
};

async function main() {
  const catalog = require('../config/forms-catalog.registry');
  const { createFormsCatalogService } = require('../services/formsCatalogService');

  if (DRY) {
    const entries = AUDIENCE ? catalog.listByAudience(AUDIENCE) : catalog.listAll();
    const summary = catalog.summary();
    if (JSON_MODE) {
      process.stdout.write(
        JSON.stringify(
          {
            mode: 'dry-run',
            audience: AUDIENCE || 'all',
            wouldSeed: entries.length,
            tenantId: TENANT_ID,
            branchId: BRANCH_ID,
            summary,
            ids: entries.map(e => e.id),
          },
          null,
          2
        ) + '\n'
      );
    } else {
      process.stdout.write(
        [
          `${c.bold}Forms Catalog Seed — DRY RUN${c.reset}`,
          '',
          `${c.cyan}Plan${c.reset}`,
          `  audience: ${AUDIENCE || 'all'}`,
          `  tenantId: ${TENANT_ID || c.dim + '(global)' + c.reset}`,
          `  branchId: ${BRANCH_ID || c.dim + '(global)' + c.reset}`,
          `  to seed: ${c.bold}${entries.length}${c.reset} templates`,
          '',
          `${c.cyan}IDs${c.reset}`,
          ...entries.map(
            e => `  ${c.dim}-${c.reset} ${e.id} ${c.dim}(${e.audience}.${e.category})${c.reset}`
          ),
          '',
        ].join('\n')
      );
    }
    return 0;
  }

  // Live mode: connect to mongo
  const mongoose = require('mongoose');
  const FormTemplate = require('../models/FormTemplate');

  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/alawael-erp';
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000, connectTimeoutMS: 8000 });

  // ── W1186: backfill approval chains onto already-seeded catalog docs ──────
  // Pre-W1186 instantiation wrote the registry's chain into the phantom
  // `approvalWorkflow` field, which strict mode dropped — so every seeded doc
  // has an empty approvalSteps[]. This mode is idempotent: it only touches
  // from-catalog docs (templateId matches a registry id, optionally
  // tenant-suffixed) whose approvalSteps is empty while the registry defines
  // a chain.
  if (SYNC_APPROVALS) {
    const { approvalStepsFromWorkflow } = require('../services/formsCatalogService');
    const entries = AUDIENCE ? catalog.listByAudience(AUDIENCE) : catalog.listAll();
    const results = { updated: [], skippedNoChain: 0, skippedHasChain: 0, notSeeded: 0 };
    for (const item of entries) {
      const entry = catalog.getById(item.id);
      const steps = approvalStepsFromWorkflow(entry.approvalWorkflow);
      if (steps.length === 0) {
        results.skippedNoChain += 1;
        continue;
      }
      const templateId = TENANT_ID ? `${entry.id}:${TENANT_ID}` : entry.id;
      const doc = await FormTemplate.findOne({ templateId }).select('approvalSteps').lean();
      if (!doc) {
        results.notSeeded += 1;
        continue;
      }
      if ((doc.approvalSteps || []).length > 0) {
        results.skippedHasChain += 1;
        continue;
      }
      await FormTemplate.updateOne(
        { _id: doc._id },
        { $set: { approvalSteps: steps, requiresApproval: true } }
      );
      results.updated.push(templateId);
    }
    await mongoose.disconnect();
    if (JSON_MODE) {
      process.stdout.write(
        JSON.stringify({ mode: 'sync-approvals', updated: results.updated.length, ...results }, null, 2) + '\n'
      );
    } else {
      process.stdout.write(
        [
          `${c.bold}Forms Catalog — SYNC APPROVALS (W1186)${c.reset}`,
          '',
          `${c.green}updated:${c.reset}        ${results.updated.length}`,
          `${c.dim}already had:${c.reset}    ${results.skippedHasChain}`,
          `${c.dim}no chain:${c.reset}       ${results.skippedNoChain}`,
          `${c.yellow}not seeded:${c.reset}     ${results.notSeeded}`,
          '',
          ...results.updated.map(id => `  ${c.green}✓${c.reset} ${id}`),
          '',
        ].join('\n')
      );
    }
    return 0;
  }

  if (RESET) {
    const filter = { 'metadata.catalogId': { $exists: true }, isFromCatalog: true };
    if (TENANT_ID) filter.tenantId = TENANT_ID;
    if (BRANCH_ID) filter.branchId = BRANCH_ID;
    const r = await FormTemplate.deleteMany(filter);
    if (!JSON_MODE) {
      process.stdout.write(
        `${c.yellow}🗑  --reset: deleted ${r.deletedCount} catalog-seeded templates${c.reset}\n`
      );
    }
  }

  const service = createFormsCatalogService({ formTemplateModel: FormTemplate });
  const ctx = { tenantId: TENANT_ID, branchId: BRANCH_ID };
  const filter = AUDIENCE ? { audience: AUDIENCE } : {};
  const result = await service.instantiateAll(ctx, filter);

  await mongoose.disconnect();

  if (JSON_MODE) {
    process.stdout.write(JSON.stringify({ mode: 'live', ...result }, null, 2) + '\n');
  } else {
    process.stdout.write(
      [
        `${c.bold}Forms Catalog Seed — RESULT${c.reset}`,
        '',
        `${c.green}created:${c.reset}  ${result.created}`,
        `${c.dim}exists:${c.reset}   ${result.existed}`,
        `${c.red}errors:${c.reset}   ${result.errors}`,
        `total:    ${result.total}`,
        '',
        ...result.results
          .filter(r => r.status === 'error')
          .map(r => `  ${c.red}✗${c.reset} ${r.id} — ${r.error}`),
      ].join('\n') + '\n'
    );
  }

  return result.errors > 0 ? 1 : 0;
}

main()
  .then(code => process.exit(code))
  .catch(err => {
    process.stderr.write(`[seed-forms-catalog] ERROR: ${err.stack || err.message}\n`);
    process.exit(2);
  });
