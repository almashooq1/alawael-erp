#!/usr/bin/env node
'use strict';

/**
 * run-sprint.js — sprint-suite runner that bypasses Windows' 8191-char
 * command-line limit.
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
const LIST_FILE = path.join(BACKEND_DIR, 'sprint-tests.txt');
const DEFAULT_FLAGS = ['--no-coverage', '--passWithNoTests', '--forceExit'];

function _readList() {
  const raw = fs.readFileSync(LIST_FILE, 'utf8');
  return raw
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'));
}

function main() {
  const tests = _readList();
  if (tests.length === 0) {
    console.error(`run-sprint: no tests listed in ${LIST_FILE}`);
    process.exit(1);
  }

  const extraArgs = process.argv.slice(2);
  const args = [...tests, ...DEFAULT_FLAGS, ...extraArgs];

  console.log(`run-sprint: launching jest with ${tests.length} test files`);
  // Resolve jest directly from node_modules so we don't go through
  // npx (which on Windows requires shell:true to spawn a .cmd, and
  // shell:true re-introduces the cmdline-length problem this script
  // exists to avoid). Calling node directly with jest's bin path
  // sidesteps the shell entirely.
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

main();
