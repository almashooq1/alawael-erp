'use strict';

/**
 * Runs the backend CI Jest command with a larger Node heap to avoid
 * out-of-memory crashes on long runInBand suites.
 *
 * Keeps the exact same Jest flags previously used by `quality:ci`:
 *   npm test -- --passWithNoTests --ci --runInBand
 */

const { spawn } = require('child_process');

const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const args = ['test', '--', '--passWithNoTests', '--ci', '--runInBand'];

const heapFlag = '--max-old-space-size=8192';
const existingNodeOptions = process.env.NODE_OPTIONS ? String(process.env.NODE_OPTIONS).trim() : '';
const nodeOptions = existingNodeOptions ? `${existingNodeOptions} ${heapFlag}` : heapFlag;

const child = spawn(npmCmd, args, {
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: {
    ...process.env,
    NODE_OPTIONS: nodeOptions,
  },
});

child.on('exit', code => {
  process.exit(code == null ? 1 : code);
});

child.on('error', err => {
  console.error(`[quality:ci] failed to launch npm test: ${err.message}`);
  process.exit(1);
});
