#!/usr/bin/env node
'use strict';

/**
 * run-sprint-chunked.js — chunked runner for the sprint test suite.
 *
 * `npm run test:sprint` selects >1000 test files and can exhaust memory or
 * exceed interactive timeouts. This runner splits sprint-tests.txt into
 * fixed-size chunks, runs each via run-sprint.js, and aggregates results.
 *
 * Usage:
 *   node scripts/run-sprint-chunked.js [--chunk-size N] [--memory MB] [--continue-on-fail]
 *
 * Defaults:
 *   chunk-size = 75
 *   memory     = 4096
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const BACKEND_DIR = path.resolve(__dirname, '..');
const SPRINT_LIST = path.join(BACKEND_DIR, 'sprint-tests.txt');
const RUN_SPRINT = path.join(BACKEND_DIR, 'scripts', 'run-sprint.js');
const MAINTENANCE_FLAG = path.join(BACKEND_DIR, '..', 'maintenance.flag');
const DEFAULT_CHUNK_SIZE = 75;
const DEFAULT_MEMORY_MB = 4096;

function parseArgs(argv) {
  let chunkSize = DEFAULT_CHUNK_SIZE;
  let continueOnFail = false;
  let memory = DEFAULT_MEMORY_MB;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--chunk-size' && argv[i + 1]) {
      chunkSize = parseInt(argv[i + 1], 10) || chunkSize;
      i++;
    } else if (argv[i] === '--memory' && argv[i + 1]) {
      memory = parseInt(argv[i + 1], 10) || memory;
      i++;
    } else if (argv[i] === '--continue-on-fail') {
      continueOnFail = true;
    }
  }
  return { chunkSize, continueOnFail, memory };
}

function readList() {
  return fs
    .readFileSync(SPRINT_LIST, 'utf8')
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#'));
}

function _cleanMaintenanceFlag() {
  try {
    if (fs.existsSync(MAINTENANCE_FLAG)) fs.unlinkSync(MAINTENANCE_FLAG);
  } catch {
    // ignore
  }
}

function runChunk(listFile, idx, total, memory) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    _cleanMaintenanceFlag();
    console.log(`[chunk ${idx}/${total}] starting: ${listFile}`);
    const logFile = path.join(BACKEND_DIR, '.jest-cache', `sprint-chunk-${idx}.log`);
    // Start each chunk with a fresh log so old summaries don't confuse extraction.
    try {
      fs.writeFileSync(logFile, '', 'utf8');
    } catch {
      // ignore logging setup errors
    }
    const child = spawn(
      process.execPath,
      [`--max-old-space-size=${memory}`, RUN_SPRINT, '--list-file', listFile, '--runInBand'],
      {
        cwd: BACKEND_DIR,
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    );

    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', d => {
      try {
        fs.appendFileSync(logFile, d, 'utf8');
      } catch {
        // ignore logging errors
      }
    });
    child.stderr.on('data', d => {
      stderr += d;
      try {
        fs.appendFileSync(logFile, d, 'utf8');
      } catch {
        // ignore logging errors
      }
    });

    child.on('error', reject);
    child.on('close', rawCode => {
      const code = rawCode == null ? 1 : rawCode;
      const elapsed = ((Date.now() - started) / 1000).toFixed(1);

      // Extract the final summary from the log file. Reading the log avoids
      // relying on a potentially huge in-memory stdout string and ignores
      // any stray color codes or carriage returns.
      let summary = 'unknown';
      let tests = 'unknown';
      try {
        const stripAnsiMod = require('strip-ansi');
        const stripAnsi = typeof stripAnsiMod === 'function' ? stripAnsiMod : stripAnsiMod.default;
        const logRaw = fs.readFileSync(logFile, 'utf8');
        const logLines = stripAnsi(logRaw).split(/\r?\n/);
        for (let i = logLines.length - 1; i >= 0; i--) {
          const line = logLines[i].trim();
          if (summary === 'unknown' && line.startsWith('Test Suites:')) {
            summary = line.replace(/^Test Suites:\s*/, '').trim();
          }
          if (tests === 'unknown' && line.startsWith('Tests:')) {
            tests = line.replace(/^Tests:\s*/, '').trim();
          }
          if (summary !== 'unknown' && tests !== 'unknown') break;
        }
      } catch {
        // fall back to unknown
      }

      console.log(
        `[chunk ${idx}/${total}] ${code === 0 ? 'PASS' : 'FAIL'} (${elapsed}s) — suites: ${summary}, tests: ${tests}`
      );
      if (code !== 0 && stderr) {
        const tail = stderr.split(/\r?\n/).slice(-10).join('\n');
        console.error(`[chunk ${idx}/${total}] stderr tail:\n${tail}`);
      }
      resolve({ idx, ok: code === 0, code, summary, tests });
    });
  });
}

async function main() {
  const { chunkSize, continueOnFail, memory } = parseArgs(process.argv.slice(2));
  const tests = readList();
  if (tests.length === 0) {
    console.error('run-sprint-chunked: no tests in sprint-tests.txt');
    process.exit(1);
  }

  const chunks = [];
  for (let i = 0; i < tests.length; i += chunkSize) {
    chunks.push(tests.slice(i, i + chunkSize));
  }

  // Write chunk list files next to run-sprint so relative paths resolve.
  const chunkFiles = chunks.map((chunk, i) => {
    const file = path.join(BACKEND_DIR, '.jest-cache', `sprint-chunk-${i + 1}.txt`);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, chunk.join('\n') + '\n', 'utf8');
    return file;
  });

  console.log(
    `run-sprint-chunked: ${tests.length} test files, ${chunks.length} chunks, chunk-size=${chunkSize}, memory=${memory}MB`
  );

  const results = [];
  let stopped = false;
  for (let i = 0; i < chunkFiles.length; i++) {
    const res = await runChunk(chunkFiles[i], i + 1, chunkFiles.length, memory);
    results.push(res);
    if (!res.ok && !continueOnFail) {
      stopped = true;
      console.log(
        'run-sprint-chunked: stopping after first failing chunk (use --continue-on-fail to keep going)'
      );
      break;
    }
  }

  console.log('\n===== run-sprint-chunked summary =====');
  console.log(`chunks run : ${results.length}/${chunks.length}${stopped ? ' (stopped early)' : ''}`);
  console.log(`chunks ok  : ${results.filter(r => r.ok).length}`);
  console.log(`chunks fail: ${results.filter(r => !r.ok).length}`);
  for (const r of results) {
    console.log(
      `  chunk ${r.idx}: ${r.ok ? 'PASS' : 'FAIL'} — suites ${r.summary}, tests ${r.tests}`
    );
  }
  console.log('=====================================');

  process.exit(results.every(r => r.ok) ? 0 : 1);
}

main().catch(err => {
  console.error('run-sprint-chunked: unexpected error:', err.message);
  process.exit(1);
});
