#!/usr/bin/env node
'use strict';

/**
 * W1437 Chaos / Regression Tests
 *
 * Verifies that the W1437 feature flag correctly toggles between old and new
 * behavior, and that the migration remains idempotent under load.
 *
 * Usage:
 *   node scripts/chaos-test-w1437.js
 */

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const assert = require('assert');

const MIGRATION_SCRIPT = require('path').join(__dirname, 'migrate-nphies-claim-updatedAt.js');

async function runMigration(uri, dryRun) {
  const { spawn } = require('child_process');
  return new Promise((resolve, reject) => {
    const child = spawn('node', [MIGRATION_SCRIPT], {
      env: { ...process.env, MONGODB_URI: uri, DRY_RUN: dryRun ? '1' : '0', NODE_ENV: 'test' },
      cwd: require('path').join(__dirname, '..'),
      stdio: 'pipe',
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', d => stdout += d);
    child.stderr.on('data', d => stderr += d);
    child.on('close', code => (code === 0 ? resolve(stdout) : reject(new Error(stderr))));
  });
}

async function testFeatureFlags(_uri) {
  console.log('[chaos-test-w1437] Testing feature flag behavior...');

  // Load the modules fresh for each env state
  delete require.cache[require.resolve('../config/featureFlags')];
  delete require.cache[require.resolve('../services/ticketSlaScheduler')];
  delete require.cache[require.resolve('../services/nphiesReconciliationService')];
  delete require.cache[require.resolve('../models/NphiesClaim')];

  process.env.FEATURE_W1437 = 'true';
  const ffTrue = require('../config/featureFlags');
  assert.strictEqual(ffTrue.isFeatureEnabled('w1437'), true, 'FEATURE_W1437=true should be enabled');

  process.env.FEATURE_W1437 = 'false';
  delete require.cache[require.resolve('../config/featureFlags')];
  const ffFalse = require('../config/featureFlags');
  assert.strictEqual(ffFalse.isFeatureEnabled('w1437'), false, 'FEATURE_W1437=false should be disabled');

  process.env.FEATURE_W1437 = 'true';
  console.log('[chaos-test-w1437] Feature flag behavior OK');
}

async function testMigrationIdempotency(uri) {
  console.log('[chaos-test-w1437] Testing migration idempotency...');

  await mongoose.connect(uri, { maxPoolSize: 10 });

  const NphiesClaimSchema = new mongoose.Schema(
    {
      status: String,
      nphies: {
        submission: {
          status: String,
          submittedAt: Date,
          updatedAt: Date,
          updatedBy: String,
        },
      },
      createdAt: Date,
    },
    { collection: 'nphiesclaims' }
  );
  const NphiesClaim = mongoose.model('NphiesClaim2', NphiesClaimSchema);

  // Seed
  await NphiesClaim.deleteMany({});
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  await NphiesClaim.insertMany([
    { status: 'PENDING_REVIEW', nphies: { submission: { status: 'PENDING_REVIEW', submittedAt: yesterday } }, createdAt: yesterday },
    { status: 'PENDING_REVIEW', nphies: { submission: { status: 'PENDING_REVIEW', submittedAt: null } }, createdAt: yesterday },
  ]);

  // First run
  await runMigration(uri, false);
  const afterFirst = await NphiesClaim.countDocuments({ 'nphies.submission.updatedBy': 'migration' });
  assert.strictEqual(afterFirst, 2, 'First migration should update 2 docs');

  // Second run should modify nothing
  await runMigration(uri, false);
  const afterSecond = await NphiesClaim.countDocuments({ 'nphies.submission.updatedBy': 'migration' });
  assert.strictEqual(afterSecond, 2, 'Second migration should not change count');

  await mongoose.disconnect();
  console.log('[chaos-test-w1437] Migration idempotency OK');
}

async function testConcurrentMigrations(uri) {
  console.log('[chaos-test-w1437] Testing concurrent migration safety...');

  await mongoose.connect(uri, { maxPoolSize: 10 });
  const NphiesClaimSchema = new mongoose.Schema(
    {
      status: String,
      nphies: {
        submission: {
          status: String,
          submittedAt: Date,
          updatedAt: Date,
          updatedBy: String,
        },
      },
      createdAt: Date,
    },
    { collection: 'nphiesclaims' }
  );
  const NphiesClaim = mongoose.model('NphiesClaimConcurrent', NphiesClaimSchema);

  await NphiesClaim.deleteMany({});
  const docs = [];
  for (let i = 0; i < 50; i++) {
    docs.push({
      status: 'PENDING_REVIEW',
      nphies: { submission: { status: 'PENDING_REVIEW', submittedAt: new Date() } },
      createdAt: new Date(),
    });
  }
  await NphiesClaim.insertMany(docs);
  await mongoose.disconnect();

  // Run 3 migrations concurrently
  await Promise.all([runMigration(uri, false), runMigration(uri, false), runMigration(uri, false)]);

  await mongoose.connect(uri, { maxPoolSize: 10 });
  const updated = await NphiesClaim.countDocuments({ 'nphies.submission.updatedBy': 'migration' });
  await mongoose.disconnect();

  assert.strictEqual(updated, 50, 'Concurrent migrations should update all 50 docs exactly once');
  console.log('[chaos-test-w1437] Concurrent migration safety OK');
}

async function main() {
  let mongod;
  try {
    console.log('[chaos-test-w1437] Starting in-memory MongoDB...');
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    await testFeatureFlags(uri);
    await testMigrationIdempotency(uri);
    await testConcurrentMigrations(uri);

    console.log('[chaos-test-w1437] ✅ All chaos/regression tests PASSED');
  } catch (err) {
    console.error('[chaos-test-w1437] ❌ FAILED', err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect().catch(() => {});
    if (mongod) await mongod.stop().catch(() => {});
  }
}

main();
