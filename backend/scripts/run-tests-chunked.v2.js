#!/usr/bin/env node
'use strict';

/**
 * run-tests-chunked.v2.js — split-track chunked runner for the full backend gate.
 *
 * The backend test surface is a mix of:
 *   • mocked-mongoose tests (the majority) that rely on the global mongoose mock
 *     in jest.setup.js and do NOT need a real MongoDB.
 *   • real-mongoose tests that call jest.unmock('mongoose') and need a live
 *     MongoMemoryServer.
 *
 * This runner discovers the exact list that the configured npm script would run,
 * splits it into the two tracks, then:
 *   • runs the mocked track with globalSetup/globalTeardown disabled;
 *   • starts ONE shared MongoMemoryServer for the real track, runs real tests in
 *     chunks, and drops the test database(s) between chunks to avoid state leaks.
 *
 * Usage:
 *   node scripts/run-tests-chunked.v2.js [npm-script] [--chunk-size N] [--memory MB] [--bail]
 *
 * Defaults:
 *   npm-script  = test
 *   chunk-size  = 100
 *   memory      = 4096 (MB)
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const BACKEND_DIR = path.resolve(__dirname, '..');
const JEST_CACHE = path.join(BACKEND_DIR, '.jest-cache');
const URI_FILE = path.join(BACKEND_DIR, '.test-mongo-uri');
const DBPATH_FILE = path.join(BACKEND_DIR, '.test-mongo-dbpath');
const MAINTENANCE_FLAG = path.join(BACKEND_DIR, '..', 'maintenance.flag');
const NOOP_SETUP = path.join(BACKEND_DIR, 'scripts', 'jest-noop-global.js');
const NOOP_TEARDOWN = path.join(BACKEND_DIR, 'scripts', 'jest-noop-teardown.js');
const JEST_BIN = path.join(BACKEND_DIR, 'node_modules', 'jest', 'bin', 'jest.js');

const DEFAULT_SCRIPT = 'test';
const DEFAULT_CHUNK_SIZE = 100;
const DEFAULT_MEMORY_MB = 4096;

function parseArgs(argv) {
  let script = DEFAULT_SCRIPT;
  let chunkSize = DEFAULT_CHUNK_SIZE;
  let memoryMb = DEFAULT_MEMORY_MB;
  let bail = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--chunk-size' && argv[i + 1]) {
      chunkSize = parseInt(argv[i + 1], 10) || chunkSize;
      i++;
    } else if (arg === '--memory' && argv[i + 1]) {
      memoryMb = parseInt(argv[i + 1], 10) || memoryMb;
      i++;
    } else if (arg === '--bail') {
      bail = true;
    } else if (!arg.startsWith('--')) {
      script = arg;
    }
  }
  return { script, chunkSize, memoryMb, bail };
}

function chunk(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

function discoverTests(script) {
  return new Promise((resolve, reject) => {
    const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const child = spawn(npmCmd, ['run', script, '--', '--listTests'], {
      cwd: BACKEND_DIR,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: process.platform === 'win32',
    });

    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', d => (stdout += d));
    child.stderr.on('data', d => (stderr += d));

    child.on('error', reject);
    child.on('exit', code => {
      if (code !== 0) {
        return reject(new Error(`--listTests failed (code ${code}): ${stderr}`));
      }
      const tests = stdout
        .split(/\r?\n/)
        .map(l => l.trim())
        .filter(l => /\.(test|spec)\.js$/.test(l) && fs.existsSync(l));
      resolve(tests);
    });
  });
}

function isRealMongooseTest(filePath) {
  try {
    const src = fs.readFileSync(filePath, 'utf8');
    return /jest\s*\.\s*unmock\s*\(\s*['"]mongoose['"]\s*\)/.test(src);
  } catch {
    return false;
  }
}

function splitByMongooseMock(files) {
  const mocked = [];
  const real = [];
  for (const f of files) {
    if (isRealMongooseTest(f)) {
      real.push(f);
    } else {
      mocked.push(f);
    }
  }
  return { mocked, real };
}

function removeStaleArtifacts() {
  for (const f of [URI_FILE, DBPATH_FILE]) {
    try {
      if (fs.existsSync(f)) fs.unlinkSync(f);
    } catch {
      // ignore
    }
  }
  try {
    if (fs.existsSync(MAINTENANCE_FLAG)) fs.unlinkSync(MAINTENANCE_FLAG);
  } catch {
    // ignore
  }
}

function ensureNoopHelpers() {
  fs.mkdirSync(path.dirname(NOOP_SETUP), { recursive: true });
  const body = "'use strict';\nmodule.exports = async () => {};\n";
  fs.writeFileSync(NOOP_SETUP, body, 'utf8');
  fs.writeFileSync(NOOP_TEARDOWN, body, 'utf8');
}

function removeNoopHelpers() {
  for (const f of [NOOP_SETUP, NOOP_TEARDOWN]) {
    try {
      if (fs.existsSync(f)) fs.unlinkSync(f);
    } catch {
      // ignore
    }
  }
}

async function startMongoMemoryServer() {
  removeStaleArtifacts();

  const { MongoMemoryServer } = require('mongodb-memory-server');
  const mongod = await MongoMemoryServer.create({
    instance: {
      dbName: 'alawael-test',
    },
    binary: { checkMD5: false },
  });
  const uri = mongod.getUri();
  fs.writeFileSync(URI_FILE, uri, 'utf8');
  return mongod;
}

async function stopMongoMemoryServer(mongod) {
  try {
    if (mongod) await mongod.stop();
  } catch (err) {
    console.warn(`[v2] MongoMemoryServer stop warning: ${err.message}`);
  }
  for (const f of [URI_FILE, DBPATH_FILE]) {
    try {
      if (fs.existsSync(f)) fs.unlinkSync(f);
    } catch {
      // ignore
    }
  }
}

async function dropTestDatabases(uri) {
  let client;
  try {
    const { MongoClient } = require('mongodb');
    client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });
    await client.connect();
    const admin = client.db().admin();
    const { databases } = await admin.listDatabases();
    for (const db of databases) {
      if (db.name.startsWith('alawael-test')) {
        await client.db(db.name).dropDatabase();
      }
    }
  } catch (err) {
    console.warn(`[v2] dropTestDatabases warning: ${err.message}`);
  } finally {
    try {
      if (client) await client.close();
    } catch {
      // ignore
    }
  }
}

function writeTempConfig({ track, tests, chunkIndex }) {
  const configPath = path.join(
    JEST_CACHE,
    `chunked.v2.${track}.${Date.now()}.${process.pid}.${chunkIndex}.js`
  );
  const baseConfigPath = path.join(BACKEND_DIR, 'jest.config.js').replace(/\\/g, '/');
  const absoluteTests = tests.map(t => t.replace(/\\/g, '/'));

  const body = `
const base = require(${JSON.stringify(baseConfigPath)});
module.exports = {
  ...base,
  rootDir: ${JSON.stringify(BACKEND_DIR.replace(/\\/g, '/'))},
  testMatch: ${JSON.stringify(absoluteTests)},
  globalSetup: ${JSON.stringify(NOOP_SETUP.replace(/\\/g, '/'))},
  globalTeardown: ${JSON.stringify(NOOP_TEARDOWN.replace(/\\/g, '/'))},
  detectOpenHandles: false,
};
`;
  fs.mkdirSync(JEST_CACHE, { recursive: true });
  fs.writeFileSync(configPath, body, 'utf8');
  return configPath;
}

function runJestWithConfig(configPath, { memoryMb, bail }) {
  return new Promise(resolve => {
    const args = [
      `--max-old-space-size=${memoryMb}`,
      JEST_BIN,
      '--config',
      configPath,
      '--no-coverage',
      '--runInBand',
      '--forceExit',
    ];
    if (bail) args.push('--bail=1');

    const child = spawn(process.execPath, args, {
      cwd: BACKEND_DIR,
      stdio: 'inherit',
    });

    let settled = false;
    function finish(ok) {
      if (settled) return;
      settled = true;
      try {
        if (fs.existsSync(configPath)) fs.unlinkSync(configPath);
      } catch {
        // ignore cleanup errors
      }
      resolve(ok);
    }

    child.on('error', err => {
      console.error(`[v2] jest spawn error: ${err.message}`);
      finish(false);
    });
    child.on('exit', code => finish(code === 0));
  });
}

async function runTrack({ files, track, memoryMb, chunkSize, bail, sharedUri }) {
  const chunks = chunk(files, chunkSize);
  const results = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunkIndex = i + 1;
    const configPath = writeTempConfig({ track, tests: chunks[i], chunkIndex });
    console.log(`[v2] [${track}] chunk ${chunkIndex}/${chunks.length}: ${chunks[i].length} files`);

    const started = Date.now();
    const ok = await runJestWithConfig(configPath, { memoryMb, bail });
    const elapsed = ((Date.now() - started) / 1000).toFixed(1);
    results.push({ chunkIndex, ok, count: chunks[i].length });
    console.log(`[v2] [${track}] chunk ${chunkIndex} ${ok ? 'PASS' : 'FAIL'} (${elapsed}s)`);

    if (track === 'real' && sharedUri) {
      await dropTestDatabases(sharedUri);
    }

    if (bail && !ok) {
      console.log(`[v2] [${track}] bail requested, stopping after first failing chunk`);
      break;
    }
  }

  return results;
}

function printSummary(track, results, totalFiles) {
  const passed = results.filter(r => r.ok).reduce((a, r) => a + r.count, 0);
  const failedChunks = results.filter(r => !r.ok);
  const failed = failedChunks.reduce((a, r) => a + r.count, 0);
  console.log(`\n===== [v2] ${track} track summary =====`);
  console.log(`chunks run : ${results.length}`);
  console.log(`files ok   : ${passed}`);
  console.log(`files fail : ${failed}`);
  console.log(`total      : ${totalFiles}`);
  if (failedChunks.length) {
    console.log(`failing chunks: ${failedChunks.map(r => r.chunkIndex).join(', ')}`);
  }
  console.log('=====================================\n');
}

async function main() {
  const { script, chunkSize, memoryMb, bail } = parseArgs(process.argv.slice(2));
  console.log(
    `[v2] run-tests-chunked: script=${script}, chunk-size=${chunkSize}, memory=${memoryMb}MB, bail=${bail}`
  );

  const tests = await discoverTests(script);
  if (tests.length === 0) {
    console.error('[v2] no test files discovered');
    process.exit(1);
  }
  console.log(`[v2] discovered ${tests.length} test files`);

  ensureNoopHelpers();

  const { mocked, real } = splitByMongooseMock(tests);
  console.log(`[v2] mocked-mongoose: ${mocked.length}, real-mongoose: ${real.length}`);

  let globalOk = true;

  if (mocked.length > 0) {
    const mockedResults = await runTrack({
      files: mocked,
      track: 'mocked',
      memoryMb,
      chunkSize,
      bail,
    });
    printSummary('mocked', mockedResults, mocked.length);
    if (mockedResults.some(r => !r.ok)) globalOk = false;
  }

  let mongod;
  if (real.length > 0 && (!bail || globalOk)) {
    mongod = await startMongoMemoryServer();
    const sharedUri = fs.readFileSync(URI_FILE, 'utf8').trim();
    const realResults = await runTrack({
      files: real,
      track: 'real',
      memoryMb,
      chunkSize,
      bail,
      sharedUri,
    });
    printSummary('real', realResults, real.length);
    if (realResults.some(r => !r.ok)) globalOk = false;
  }

  if (mongod) await stopMongoMemoryServer(mongod);
  removeNoopHelpers();

  console.log(`\n[v2] final verdict: ${globalOk ? 'PASS' : 'FAIL'}`);
  process.exit(globalOk ? 0 : 1);
}

main().catch(err => {
  console.error('[v2] fatal error:', err.message);
  removeNoopHelpers();
  process.exit(1);
});
