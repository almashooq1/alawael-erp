/**
 * cpe-attention-script.test.js — lock the exit-code contract for the
 * cpe-attention CLI.
 *
 * The script is cron-facing, so the operator needs a stable promise:
 *   • exit 0 → nothing to do
 *   • exit 1 → HR has to act on at least one therapist
 *   • exit 2 → internal error (DB unreachable, bad data, etc.)
 *
 * These tests spawn the real script in a child process. Since CI
 * has no MongoDB, we point it at an unreachable URI and assert the
 * error path. The happy-path (exit 0/1) is exercised via the REST
 * smoke tests + the pure-math cpeService unit tests.
 */

'use strict';

const { spawnSync } = require('child_process');
const path = require('path');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'cpe-attention.js');

function run(args = [], env = {}) {
  return spawnSync('node', [SCRIPT, ...args], {
    env: {
      ...process.env,
      MONGODB_URI: 'mongodb://127.0.0.1:1/cpe-test-unreachable',
      ...env,
    },
    encoding: 'utf8',
    timeout: 20000,
  });
}

describe('cpe-attention CLI', () => {
  it('exits 2 when MongoDB is unreachable', () => {
    const r = run();
    expect(r.status).toBe(2);
  }, 30000);

  it('exits 2 with JSON error payload when --json + DB unreachable', () => {
    const r = run(['--json']);
    expect(r.status).toBe(2);
    const payload = JSON.parse(r.stdout.trim());
    expect(payload.error).toBeTruthy();
    expect(payload.checkedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  }, 30000);

  it('respects --quiet (no stdout noise, exit-code only)', () => {
    const r = run(['--quiet']);
    expect(r.status).toBe(2);
    expect(r.stdout.trim()).toBe('');
  }, 30000);

  it('script file has a shebang line so it runs as an executable', () => {
    const fs = require('fs');
    const first = fs.readFileSync(SCRIPT, 'utf8').split('\n')[0];
    expect(first).toBe('#!/usr/bin/env node');
  });

  it('documents exit-code contract in the file header', () => {
    const fs = require('fs');
    const head = fs.readFileSync(SCRIPT, 'utf8').slice(0, 1500);
    expect(head).toMatch(/Exit codes/i);
    expect(head).toMatch(/0.*attention/i);
    expect(head).toMatch(/1.*attention/i);
    expect(head).toMatch(/2.*error/i);
  });
});
