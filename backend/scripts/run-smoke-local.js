#!/usr/bin/env node
'use strict';

/**
 * run-smoke-local.js — Local validation wrapper for live-DB smoke scripts.
 *
 * Starts a temporary MongoMemoryServer, then runs the requested smoke script(s)
 * against it. This lets developers validate smoke logic locally without needing
 * MONGODB_URI to point at a real (or prod) database.
 *
 * Usage:
 *   node scripts/run-smoke-local.js smoke-primary-journey
 *   node scripts/run-smoke-local.js smoke-launch-spine smoke-clinical-spine
 *   node scripts/run-smoke-local.js --seed smoke-launch-spine smoke-clinical-spine
 *
 * The --seed flag creates a minimal FormTemplate + active Measure so the
 * launch-spine and clinical-spine smokes can pass against an empty MMS.
 */

const { MongoMemoryServer } = require('mongodb-memory-server');
const { spawn } = require('child_process');
const path = require('path');

async function seedMinimalData(uri) {
  const mongoose = require('mongoose');
  await mongoose.connect(uri);

  const seeds = [];

  try {
    const FormTemplate = (() => {
      try {
        return require('../models/FormTemplate');
      } catch (_e) {
        return mongoose.model('FormTemplate');
      }
    })();
    const existingTemplate = await FormTemplate.findOne({}).lean();
    if (!existingTemplate) {
      const tpl = await FormTemplate.create({
        templateId: 'smoke-local-template',
        name: 'Smoke Local Template',
        category: 'general',
        status: 'active',
      });
      seeds.push({ model: FormTemplate, id: tpl._id });
      console.log('🌱 Seeded FormTemplate');
    }
  } catch (err) {
    console.warn('⚠️ Could not seed FormTemplate:', err.message);
  }

  try {
    const { Measure } = require('../domains/goals/models/Measure');
    const existingMeasure = await Measure.findOne({ status: 'active' }).lean();
    if (!existingMeasure) {
      const measure = await Measure.create({
        code: 'SMOKE-BERG',
        name: 'Smoke Balance Measure',
        name_ar: 'مقياس توازن تجريبي',
        category: 'motor',
        type: 'standardized',
        status: 'active',
        scoringDirection: 'higher_better',
      });
      seeds.push({ model: Measure, id: measure._id });
      console.log('🌱 Seeded Measure');
    }
  } catch (err) {
    console.warn('⚠️ Could not seed Measure:', err.message);
  }

  await mongoose.disconnect();
  return seeds;
}

async function cleanupSeeds(uri, seeds) {
  if (seeds.length === 0) return;
  const mongoose = require('mongoose');
  await mongoose.connect(uri);
  for (const s of seeds) {
    try {
      await s.model.deleteOne({ _id: s.id });
    } catch (_e) {
      /* best effort */
    }
  }
  await mongoose.disconnect();
}

async function runScript(scriptName, uri) {
  const scriptPath = path.join(__dirname, `${scriptName}.js`);
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath], {
      cwd: path.resolve(__dirname, '..'),
      env: { ...process.env, MONGODB_URI: uri },
      stdio: 'inherit',
    });
    child.on('exit', code => {
      if (code === 0) resolve();
      else reject(new Error(`${scriptName} exited with code ${code}`));
    });
    child.on('error', reject);
  });
}

async function main() {
  const args = process.argv.slice(2);
  const shouldSeed = args.includes('--seed');
  const scripts = args.filter(a => a !== '--seed');

  if (scripts.length === 0) {
    console.error('Usage: node scripts/run-smoke-local.js [--seed] <smoke-script-name> [...]');
    console.error(
      'Example: node scripts/run-smoke-local.js --seed smoke-launch-spine smoke-clinical-spine'
    );
    process.exit(1);
  }

  console.log('🔌 Starting local MongoMemoryServer for smoke validation...');
  const mongod = await MongoMemoryServer.create({
    instance: { dbName: 'alawael-smoke-local' },
  });
  const uri = mongod.getUri();
  console.log(`✅ Local MMS ready: ${uri}\n`);

  let seeds = [];
  let failed = false;
  try {
    if (shouldSeed) {
      console.log('🌱 Seeding minimal catalog data...\n');
      seeds = await seedMinimalData(uri);
    }

    for (const name of scripts) {
      console.log(`\n▶ Running ${name}...`);
      await runScript(name, uri);
      console.log(`✅ ${name} passed`);
    }
  } catch (err) {
    failed = true;
    console.error(`\n❌ ${err.message}`);
  } finally {
    if (shouldSeed) {
      console.log('\n🧹 Cleaning up seeded catalog data...');
      await cleanupSeeds(uri, seeds);
    }
    console.log('\n🛑 Stopping local MongoMemoryServer...');
    await mongod.stop();
  }

  if (failed) process.exit(1);
  console.log('\n✅ All local smoke validations passed');
}

main().catch(err => {
  console.error('Unexpected error:', err.message);
  process.exit(1);
});
