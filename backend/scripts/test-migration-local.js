#!/usr/bin/env node
'use strict';

/**
 * Local test for the W1437 NphiesClaim migration.
 *
 * Spins up an in-memory MongoDB, seeds NphiesClaim documents in various states,
 * runs the migration in dry-run mode, then runs it for real, and verifies
 * the results.
 *
 * Usage:
 *   node scripts/test-migration-local.js
 *
 * Requires:
 *   mongodb-memory-server (already a project dev dependency)
 */

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const { spawn } = require('child_process');
const path = require('path');

const MIGRATION_SCRIPT = path.join(__dirname, 'migrate-nphies-claim-updatedAt.js');

function runMigration(uri, dryRun) {
  return new Promise((resolve, reject) => {
    const child = spawn('node', [MIGRATION_SCRIPT], {
      env: {
        ...process.env,
        MONGODB_URI: uri,
        DRY_RUN: dryRun ? '1' : '0',
        NODE_ENV: 'test',
      },
      cwd: path.join(__dirname, '..'),
      stdio: 'pipe',
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
      process.stdout.write(data);
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
      process.stderr.write(data);
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`Migration exited with code ${code}\n${stderr}`));
      }
    });
  });
}

async function main() {
  let mongod;
  try {
    console.log('[test-migration-local] Starting in-memory MongoDB...');
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    console.log('[test-migration-local] Connecting Mongoose...');
    await mongoose.connect(uri, { maxPoolSize: 10 });

    // Define a minimal NphiesClaim schema for testing
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
    const NphiesClaim = mongoose.model('NphiesClaim', NphiesClaimSchema);

    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Seed documents
    const docs = [
      {
        status: 'PENDING_REVIEW',
        nphies: { submission: { status: 'PENDING_REVIEW', submittedAt: yesterday } },
        createdAt: yesterday,
      },
      {
        status: 'PENDING_REVIEW',
        nphies: { submission: { status: 'PENDING_REVIEW', submittedAt: null } },
        createdAt: yesterday,
      },
      {
        status: 'PENDING_REVIEW',
        nphies: { submission: { status: 'PENDING_REVIEW', updatedAt: now, updatedBy: 'test' } },
        createdAt: yesterday,
      },
      {
        status: 'PENDING_REVIEW',
        nphies: { submission: { status: 'PENDING_REVIEW' } },
        // no createdAt
      },
    ];

    console.log('[test-migration-local] Seeding test documents...');
    await NphiesClaim.insertMany(docs);

    const beforeCount = await NphiesClaim.countDocuments();
    const beforeMissing = await NphiesClaim.countDocuments({
      $or: [
        { 'nphies.submission.updatedAt': { $exists: false } },
        { 'nphies.submission.updatedAt': null },
      ],
    });
    console.log(`[test-migration-local] Seeded: ${beforeCount} docs, ${beforeMissing} missing updatedAt`);

    // Run dry-run
    console.log('[test-migration-local] Running migration in DRY-RUN mode...');
    await runMigration(uri, true);

    const afterDryRunMissing = await NphiesClaim.countDocuments({
      $or: [
        { 'nphies.submission.updatedAt': { $exists: false } },
        { 'nphies.submission.updatedAt': null },
      ],
    });
    if (afterDryRunMissing !== beforeMissing) {
      throw new Error(`Dry-run modified data! Missing count changed from ${beforeMissing} to ${afterDryRunMissing}`);
    }
    console.log('[test-migration-local] Dry-run OK: no documents modified');

    // Run real migration
    console.log('[test-migration-local] Running migration for real...');
    await runMigration(uri, false);

    const afterRealMissing = await NphiesClaim.countDocuments({
      $or: [
        { 'nphies.submission.updatedAt': { $exists: false } },
        { 'nphies.submission.updatedAt': null },
      ],
    });
    if (afterRealMissing !== 0) {
      throw new Error(`Real migration left ${afterRealMissing} documents without updatedAt`);
    }

    const updatedDocs = await NphiesClaim.find({ 'nphies.submission.updatedBy': 'migration' }).lean();
    console.log(`[test-migration-local] Real migration OK: ${updatedDocs.length} documents updated`);

    // Verify fallback values
    for (const doc of updatedDocs) {
      const updatedAt = doc.nphies?.submission?.updatedAt;
      if (!updatedAt) {
        throw new Error('Document missing updatedAt after migration');
      }
    }
    console.log('[test-migration-local] All updated docs have valid updatedAt');

    console.log('[test-migration-local] ✅ Local migration test PASSED');
  } catch (err) {
    console.error('[test-migration-local] ❌ FAILED', err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect().catch(() => {});
    if (mongod) await mongod.stop().catch(() => {});
  }
}

main();
