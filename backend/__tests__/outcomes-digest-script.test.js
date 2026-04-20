/**
 * outcomes-digest-script.test.js — exit-code contract.
 */

'use strict';

const { spawnSync } = require('child_process');
const path = require('path');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'outcomes-digest.js');

function run(args = [], env = {}) {
  return spawnSync('node', [SCRIPT, ...args], {
    env: { ...process.env, MONGODB_URI: 'mongodb://127.0.0.1:1/nope', ...env },
    encoding: 'utf8',
    timeout: 20000,
  });
}

describe('outcomes-digest CLI', () => {
  it('exits 2 when DB unreachable', () => {
    expect(run().status).toBe(2);
  }, 30000);

  it('--json on error returns JSON error payload', () => {
    const r = run(['--json']);
    expect(r.status).toBe(2);
    const payload = JSON.parse(r.stdout.trim());
    expect(payload.error).toBeTruthy();
  }, 30000);

  it('--help exits 0 without DB', () => {
    const r = run(['--help']);
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/outcomes-digest/);
  });

  it('has shebang + exit-code documentation', () => {
    const fs = require('fs');
    const src = fs.readFileSync(SCRIPT, 'utf8');
    expect(src.split('\n')[0]).toBe('#!/usr/bin/env node');
    expect(src.slice(0, 1500)).toMatch(/Exit codes/i);
  });
});
