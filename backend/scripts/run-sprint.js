#!/usr/bin/env node
'use strict';

/**
 * run-sprint.js — sprint-suite runner that bypasses Windows' command-line
 * length limit.
 *
 * Background: as the sprint grew past 191 tests, the inlined
 * `test:sprint` npm script hit 8889 chars, which silently fails on
 * Windows (cmd.exe spawn caps at 8191). CI on Linux runners worked;
 * local Windows dev runs of `npm test:sprint` returned "The command
 * line is too long" and exit 0 from the wrapper, masking the failure.
 *
 * This runner reads the enumeration from sprint-tests.txt (one path
 * per line, blank lines + `#` comments ignored) and materialises the
 * list as a temporary Jest config that overrides `testMatch` with the
 * exact absolute paths. Jest is then spawned once with that config.
 * Because the enumerated paths are passed through a file instead of
 * argv, there is no OS command-line length ceiling to hit.
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
const DEFAULT_LIST_FILE = path.join(BACKEND_DIR, 'sprint-tests.txt');
const DEFAULT_FLAGS = ['--no-coverage', '--passWithNoTests', '--forceExit'];

function _readList(listFile) {
  const raw = fs.readFileSync(listFile, 'utf8');
  return raw
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'));
}

function _writeTempConfig(tests) {
  // Resolve each enumerated path to an absolute path so Jest's
  // testMatch can find them regardless of cwd subtleties.
  const absoluteTests = tests.map(t => {
    const resolved = path.resolve(BACKEND_DIR, t);
    // Forward slashes keep the generated JS readable on Windows.
    return resolved.replace(/\\/g, '/');
  });

  const configPath = path.join(
    BACKEND_DIR,
    '.jest-cache',
    `sprint.config.${Date.now()}.${process.pid}.js`
  );

  const baseConfigPath = path.join(BACKEND_DIR, 'jest.config.js').replace(/\\/g, '/');
  const configBody = `
const base = require(${JSON.stringify(baseConfigPath)});
module.exports = {
  ...base,
  rootDir: ${JSON.stringify(BACKEND_DIR.replace(/\\/g, '/'))},
  testMatch: ${JSON.stringify(absoluteTests)},
};
`;

  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, configBody, 'utf8');
  return configPath;
}

function main() {
  const extraArgs = process.argv.slice(2);

  // Support --list-file <path> to run a subset/chunk (e.g., split a long
  // sprint run across multiple background workers).
  let listFile = DEFAULT_LIST_FILE;
  const listFileIdx = extraArgs.indexOf('--list-file');
  if (listFileIdx !== -1 && extraArgs[listFileIdx + 1]) {
    listFile = path.resolve(BACKEND_DIR, extraArgs[listFileIdx + 1]);
    extraArgs.splice(listFileIdx, 2);
  }

  const tests = _readList(listFile);
  if (tests.length === 0) {
    console.error(`run-sprint: no tests listed in ${listFile}`);
    process.exit(1);
  }

  const args = ['--config', _writeTempConfig(tests), ...DEFAULT_FLAGS, ...extraArgs];

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
