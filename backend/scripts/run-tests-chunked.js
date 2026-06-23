#!/usr/bin/env node
'use strict';

/**
 * run-tests-chunked.js — chunked runner for the full `npm test` surface.
 *
 * Problem: `npm test` selects ~3000 test files and exhausts the Node heap
 * when Jest spawns the default worker pool or holds coverage maps in memory.
 *
 * Solution: discover the exact list that `npm test` would run via
 * `npm test -- --listTests`, split it into fixed-size chunks, then run each
 * chunk with `--runInBand --forceExit` and a bounded heap. Results are
 * aggregated and a final pass/fail verdict is returned.
 *
 * Usage:
 *   node scripts/run-tests-chunked.js [npm-script] [--chunk-size N] [--memory MB] [--bail]
 *
 * Defaults:
 *   npm-script  = test
 *   chunk-size  = 150
 *   memory      = 4096 (MB)
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const BACKEND_DIR = path.resolve(__dirname, '..');
const JEST_CACHE = path.join(BACKEND_DIR, '.jest-cache');
const DEFAULT_SCRIPT = 'test';
const DEFAULT_CHUNK_SIZE = 150;
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

function discoverTests(script) {
  return new Promise((resolve, reject) => {
    // Use `npm run <script> -- --listTests` so Jest resolves the exact
    // testMatch pattern defined in package.json (e.g. the long `test` regex).
    const child = spawn(
      process.platform === 'win32' ? 'npm.cmd' : 'npm',
      ['run', script, '--', '--listTests'],
      {
        cwd: BACKEND_DIR,
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: process.platform === 'win32',
      }
    );

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
        .filter(l => l.endsWith('.test.js') && fs.existsSync(l));
      resolve(tests);
    });
  });
}

function writeChunkConfig(tests, idx) {
  const configPath = path.join(JEST_CACHE, `chunked.config.${Date.now()}.${process.pid}.${idx}.js`);
  const baseConfigPath = path.join(BACKEND_DIR, 'jest.config.js').replace(/\\/g, '/');
  const absoluteTests = tests.map(t => t.replace(/\\/g, '/'));

  const body = `
const base = require(${JSON.stringify(baseConfigPath)});
module.exports = {
  ...base,
  rootDir: ${JSON.stringify(BACKEND_DIR.replace(/\\/g, '/'))},
  testMatch: ${JSON.stringify(absoluteTests)},
};
`;
  fs.mkdirSync(JEST_CACHE, { recursive: true });
  fs.writeFileSync(configPath, body, 'utf8');
  return configPath;
}

function runChunk(tests, idx, memoryMb, bail) {
  return new Promise((resolve, reject) => {
    const configPath = writeChunkConfig(tests, idx);
    const args = [
      `--max-old-space-size=${memoryMb}`,
      path.join(BACKEND_DIR, 'node_modules', 'jest', 'bin', 'jest.js'),
      '--config',
      configPath,
      '--no-coverage',
      '--runInBand',
      '--forceExit',
    ];
    if (bail) args.push('--bail=0');

    const started = Date.now();
    console.log(`[chunk ${idx + 1}] ${tests.length} test files, heap=${memoryMb}MB`);
    const child = spawn(process.execPath, args, {
      cwd: BACKEND_DIR,
      stdio: 'inherit',
    });

    child.on('error', reject);
    child.on('exit', code => {
      const elapsed = ((Date.now() - started) / 1000).toFixed(1);
      const ok = code === 0;
      console.log(`[chunk ${idx + 1}] ${ok ? 'PASS' : 'FAIL'} (${elapsed}s)`);
      resolve({ idx: idx + 1, ok, code: code == null ? 1 : code, count: tests.length });
    });
  });
}

async function main() {
  const { script, chunkSize, memoryMb, bail } = parseArgs(process.argv.slice(2));
  console.log(`run-tests-chunked: script=${script}, chunk-size=${chunkSize}, memory=${memoryMb}MB`);

  const tests = await discoverTests(script);
  if (tests.length === 0) {
    console.error('run-tests-chunked: no test files discovered');
    process.exit(1);
  }
  console.log(`run-tests-chunked: discovered ${tests.length} test files`);

  const chunks = [];
  for (let i = 0; i < tests.length; i += chunkSize) {
    chunks.push(tests.slice(i, i + chunkSize));
  }

  const results = [];
  for (let i = 0; i < chunks.length; i++) {
    const res = await runChunk(chunks[i], i, memoryMb, bail);
    results.push(res);
    if (bail && !res.ok) {
      console.log('run-tests-chunked: bail requested, stopping after first failing chunk');
      break;
    }
  }

  const passed = results.filter(r => r.ok).reduce((a, r) => a + r.count, 0);
  const failedChunks = results.filter(r => !r.ok);
  const failed = failedChunks.reduce((a, r) => a + r.count, 0);

  console.log('\n===== run-tests-chunked summary =====');
  console.log(`chunks run : ${results.length}/${chunks.length}`);
  console.log(`files ok   : ${passed}`);
  console.log(`files fail : ${failed}`);
  console.log(`total      : ${tests.length}`);
  if (failedChunks.length) {
    console.log(`failing chunks: ${failedChunks.map(r => r.idx).join(', ')}`);
  }
  console.log('=====================================\n');

  process.exit(failedChunks.length ? 1 : 0);
}

main().catch(err => {
  console.error('run-tests-chunked: fatal error:', err.message);
  process.exit(1);
});
