'use strict';

const { spawnSync } = require('child_process');
const path = require('path');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'utilization-digest.js');
const run = (args = [], env = {}) =>
  spawnSync('node', [SCRIPT, ...args], {
    env: { ...process.env, MONGODB_URI: 'mongodb://127.0.0.1:1/nope', ...env },
    encoding: 'utf8',
    timeout: 20000,
  });

describe('utilization-digest CLI', () => {
  it('exits 2 when DB unreachable', () => expect(run().status).toBe(2), 30000);
  it('--json error', () => {
    const r = run(['--json']);
    expect(r.status).toBe(2);
    expect(JSON.parse(r.stdout.trim()).error).toBeTruthy();
  }, 30000);
  it('--help exits 0', () => expect(run(['--help']).status).toBe(0));
  it('shebang + exit-code doc', () => {
    const fs = require('fs');
    const src = fs.readFileSync(SCRIPT, 'utf8');
    expect(src.split('\n')[0]).toBe('#!/usr/bin/env node');
    expect(src.slice(0, 600)).toMatch(/Exit codes/i);
  });
});
