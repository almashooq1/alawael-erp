/**
 * attendance-digest-script.test.js — exit-code contract for the
 * attendance-digest CLI. Same shape as cpe-attention-script tests.
 */

'use strict';

const { spawnSync } = require('child_process');
const path = require('path');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'attendance-digest.js');

function run(args = [], env = {}) {
  return spawnSync('node', [SCRIPT, ...args], {
    env: {
      ...process.env,
      MONGODB_URI: 'mongodb://127.0.0.1:1/attendance-test-unreachable',
      ...env,
    },
    encoding: 'utf8',
    timeout: 20000,
  });
}

describe('attendance-digest CLI', () => {
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

  it('--help exits 0 without touching DB', () => {
    const r = run(['--help']);
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/attendance-digest/);
    expect(r.stdout).toMatch(/status code/i);
  });

  it('has a shebang line', () => {
    const fs = require('fs');
    const first = fs.readFileSync(SCRIPT, 'utf8').split('\n')[0];
    expect(first).toBe('#!/usr/bin/env node');
  });

  it('documents the exit-code contract in the file header', () => {
    const fs = require('fs');
    const head = fs.readFileSync(SCRIPT, 'utf8').slice(0, 1500);
    expect(head).toMatch(/Exit codes/i);
    expect(head).toMatch(/0.*nobody|0.*attention/i);
    expect(head).toMatch(/2.*error/i);
  });
});
