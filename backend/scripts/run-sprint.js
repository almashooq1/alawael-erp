#!/usr/bin/env node
'use strict';

/**
 * run-sprint.js — sprint-suite runner that bypasses Windows'
 * command-line length limits (cmd.exe 8191 chars + CreateProcess 32767).
 *
 * Background: as the sprint grew past 191 tests, the inlined
 * `test:sprint` npm script hit 8889 chars, which silently fails on
 * Windows (cmd.exe spawn caps at 8191). CI on Linux runners worked;
 * local Windows dev runs of `npm test:sprint` returned "The command
 * line is too long" and exit 0 from the wrapper, masking the failure.
 *
 * This runner reads the enumeration from sprint-tests.txt (one path
 * per line, blank lines + `#` comments ignored), resolves each to an
 * absolute path against backend/, and spawns jest with the resolved
 * argv via Node's child_process. Node's spawn() does not go through
 * cmd.exe argument parsing, so the OS-level argv array can be
 * arbitrarily long (the only true ceiling is the kernel's ARG_MAX,
 * which is megabytes on every platform we ship to).
 *
 * Cross-platform: works identically on Linux CI runners + macOS +
 * Windows. Exit code is jest's exit code so npm preserves the
 * pass/fail signal.
 *
 * Windows command-line ceiling (discovered 2026-06-15): the original
 * comment above claimed spawn() is bounded only by the kernel ARG_MAX
 * (megabytes). That is true on Linux/macOS but NOT on Windows, where
 * CreateProcess caps the ENTIRE command line at 32767 chars. Once the
 * sprint list grew past ~1100 files the joined argv blew that ceiling
 * and `spawn` threw ENAMETOOLONG on local Windows dev runs (CI on
 * Linux was unaffected). To stay length-immune everywhere, this runner
 * now hands the file list to jest's in-process programmatic API
 * (`@jest/core` runCLI) when the would-be command line is too long for
 * Windows — the list never touches the OS command line in that path.
 * Short ad-hoc runs keep using the proven spawn path.
 *
 * Flags after the test list are inherited from the legacy npm script:
 *   --no-coverage --passWithNoTests --forceExit
 *
 * If you need to add ad-hoc flags, pass them as extra argv:
 *   node scripts/run-sprint.js --bail --verbose
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const BACKEND_DIR = path.resolve(__dirname, '..');
// SPRINT_LIST_FILE lets CI / local validation point the runner at an
// alternate list (e.g. a tiny smoke subset) without editing the canonical
// sprint-tests.txt. Defaults to the canonical list.
const LIST_FILE = process.env.SPRINT_LIST_FILE
  ? path.resolve(process.env.SPRINT_LIST_FILE)
  : path.join(BACKEND_DIR, 'sprint-tests.txt');
const DEFAULT_FLAGS = ['--no-coverage', '--passWithNoTests', '--forceExit'];

// Windows CreateProcess hard-caps the full command line at 32767 chars.
// Stay comfortably under it (account for node.exe + jest.js path + flags).
const WIN_CMDLINE_SAFE_LIMIT = 28000;

function _readList() {
  const raw = fs.readFileSync(LIST_FILE, 'utf8');
  return raw
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'));
}

function _kebabToCamel(s) {
  return s.replace(/-([a-z])/g, (_m, c) => c.toUpperCase());
}

// Convert CLI flag strings (`--shard=1/4`, `--no-coverage`, `--json`,
// `--testTimeout=30000`, ...) into the parsed argv object that
// @jest/core runCLI expects (camelCase keys). Kept deliberately small —
// it only needs to cover the flags this runner actually receives
// (DEFAULT_FLAGS + the shard/json/outputFile flags the CI workflows add).
function _flagsToArgv(flags) {
  const argv = {};
  const NUMERIC = new Set(['testTimeout', 'bail', 'maxWorkers', 'workerThreads']);
  for (const flag of flags) {
    if (!flag.startsWith('--')) continue;
    let body = flag.slice(2);
    let value = true;
    const eq = body.indexOf('=');
    if (eq !== -1) {
      value = body.slice(eq + 1);
      body = body.slice(0, eq);
    } else if (body.startsWith('no-')) {
      body = body.slice(3);
      value = false;
    }
    const key = _kebabToCamel(body);
    if (value !== true && value !== false && NUMERIC.has(key)) {
      const n = Number(value);
      if (!Number.isNaN(n)) value = n;
    }
    argv[key] = value;
  }
  return argv;
}

// Pure decision helper (no side effects) — picks the execution mode so a
// self-test can lock the Windows-ceiling logic without spawning jest.
// Returns { useProgrammatic, approxCmdLen }.
function _decideMode(tests, extraArgs, opts = {}) {
  const platform = opts.platform || process.platform;
  const force =
    opts.forceProgrammatic === undefined
      ? process.env.SPRINT_FORCE_PROGRAMMATIC === '1'
      : opts.forceProgrammatic;
  const jestBinPath = path.join(BACKEND_DIR, 'node_modules', 'jest', 'bin', 'jest.js');
  const approxCmdLen =
    [...tests, ...DEFAULT_FLAGS, ...extraArgs].reduce((n, s) => n + s.length + 1, 0) +
    (opts.execPath || process.execPath).length +
    jestBinPath.length +
    8;
  const useProgrammatic = force || (platform === 'win32' && approxCmdLen > WIN_CMDLINE_SAFE_LIMIT);
  return { useProgrammatic, approxCmdLen };
}

function _runViaSpawn(tests, extraArgs) {
  const args = [...tests, ...DEFAULT_FLAGS, ...extraArgs];
  const jestBin = path.join(BACKEND_DIR, 'node_modules', 'jest', 'bin', 'jest.js');
  const child = spawn(process.execPath, [jestBin, ...args], {
    cwd: BACKEND_DIR,
    stdio: 'inherit',
  });
  child.on('exit', code => {
    process.exit(code == null ? 1 : code);
  });
  child.on('error', err => {
    console.error('run-sprint: spawn failed:', err.message);
    process.exit(1);
  });
}

async function _runViaProgrammaticApi(tests, extraArgs) {
  // The file list lives only in process memory here, so the OS
  // command-line length limit never applies.
  const { runCLI } = require('@jest/core');
  const argv = {
    _: tests, // positional test-path patterns (same semantics as CLI)
    $0: 'jest',
    ..._flagsToArgv([...DEFAULT_FLAGS, ...extraArgs]),
  };
  try {
    const { results } = await runCLI(argv, [BACKEND_DIR]);
    process.exit(results && results.success ? 0 : 1);
  } catch (err) {
    console.error('run-sprint: programmatic jest run failed:', err && err.message);
    process.exit(1);
  }
}

function main() {
  const tests = _readList();
  if (tests.length === 0) {
    console.error(`run-sprint: no tests listed in ${LIST_FILE}`);
    process.exit(1);
  }

  const extraArgs = process.argv.slice(2);

  // Estimate the would-be command-line length and pick the execution mode.
  // Spawn (proven) when it fits under the Windows ceiling; in-process jest
  // API otherwise so the file list never touches the OS command line.
  const { useProgrammatic } = _decideMode(tests, extraArgs);

  console.log(
    `run-sprint: launching jest with ${tests.length} test files ` +
      `(${useProgrammatic ? 'in-process API' : 'spawn'})`
  );

  if (useProgrammatic) {
    _runViaProgrammaticApi(tests, extraArgs);
  } else {
    _runViaSpawn(tests, extraArgs);
  }
}

// Only run when invoked directly — `require()` from a self-test imports the
// pure helpers without launching jest.
if (require.main === module) {
  main();
}

module.exports = {
  _readList,
  _kebabToCamel,
  _flagsToArgv,
  _decideMode,
  WIN_CMDLINE_SAFE_LIMIT,
  DEFAULT_FLAGS,
};
