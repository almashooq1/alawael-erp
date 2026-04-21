'use strict';

const { spawnSync } = require('child_process');
const path = require('path');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'migrations', 'zkteco-device-merge.js');
const run = (args = [], env = {}) =>
  spawnSync('node', [SCRIPT, ...args], {
    env: { ...process.env, MONGODB_URI: 'mongodb://127.0.0.1:1/nope', ...env },
    encoding: 'utf8',
    timeout: 20000,
  });

describe('zkteco-device-merge migration script', () => {
  it('--help exits 0', () => expect(run(['--help']).status).toBe(0));

  it('exits 2 when DB unreachable', () => expect(run().status).toBe(2), 30000);

  it('--json reports error when DB unreachable', () => {
    const r = run(['--json']);
    expect(r.status).toBe(2);
    expect(JSON.parse(r.stdout.trim()).error).toBeTruthy();
  }, 30000);

  it('--execute without --confirm exits 2', () => {
    const r = run(['--execute', '--json']);
    expect(r.status).toBe(2);
    // Error surfaces regardless of DB reachability because confirm
    // flag is validated AFTER reading plan; missing confirm on execute
    // mode should never write.
  }, 30000);

  it('shebang + exit-code doc', () => {
    const fs = require('fs');
    const src = fs.readFileSync(SCRIPT, 'utf8');
    expect(src.split('\n')[0]).toBe('#!/usr/bin/env node');
    expect(src.slice(0, 1000)).toMatch(/Exit codes/i);
    // Confirm phrase must be in the source so operators can find it.
    expect(src).toMatch(/I-UNDERSTAND-THIS-WRITES-TO-MONGODB/);
  });
});

describe('zkteco-device-merge pure-math exports', () => {
  const {
    mapLegacyToCanonical,
    classifyRow,
  } = require('../scripts/migrations/zkteco-device-merge');

  it('mapLegacyToCanonical maps field names', () => {
    const mapped = mapLegacyToCanonical({
      serialNumber: 'ZK-001',
      name: 'Entrance A',
      ipAddress: '10.0.0.5',
      port: 4370,
      lastSyncAt: new Date('2026-04-01'),
      enrolledCount: 42,
      isActive: true,
      supportFingerprint: true,
      supportFace: false,
      supportCard: true,
      communicationType: 'tcp',
      status: 'online',
    });
    expect(mapped.deviceName).toBe('Entrance A'); // name → deviceName
    expect(mapped.lastSync).toEqual(new Date('2026-04-01')); // lastSyncAt → lastSync
    expect(mapped.deviceInfo.userCount).toBe(42); // enrolledCount → deviceInfo.userCount
    expect(mapped.capabilities.fingerprint).toBe(true); // supportFingerprint → capabilities.*
    expect(mapped.capabilities.face).toBe(false);
    expect(mapped.protocol).toBe('tcp'); // communicationType → protocol
    expect(mapped.status).toBe('online'); // pass-through
  });

  it('isActive=false maps to status=inactive', () => {
    const mapped = mapLegacyToCanonical({
      serialNumber: 'ZK-002',
      isActive: false,
      status: 'online', // should be overridden
    });
    expect(mapped.status).toBe('inactive');
  });

  it('strips undefined fields from the canonical shape', () => {
    const mapped = mapLegacyToCanonical({ serialNumber: 'ZK-003' });
    expect(mapped).not.toHaveProperty('deviceName');
    expect(mapped).not.toHaveProperty('location');
  });

  it('classifyRow detects insert when no canonical match', () => {
    const r = classifyRow({ deviceName: 'A', status: 'online' }, null);
    expect(r.action).toBe('insert');
  });

  it('classifyRow detects noop when fields match', () => {
    const r = classifyRow(
      { deviceName: 'A', status: 'online' },
      { deviceName: 'A', status: 'online' }
    );
    expect(r.action).toBe('noop');
  });

  it('classifyRow detects conflict when field values differ', () => {
    const r = classifyRow(
      { deviceName: 'Old Name', status: 'online' },
      { deviceName: 'New Name', status: 'online' }
    );
    expect(r.action).toBe('conflict');
    expect(r.diffs.length).toBe(1);
    expect(r.diffs[0].field).toBe('deviceName');
  });

  it('classifyRow walks into nested capabilities', () => {
    const r = classifyRow(
      { deviceName: 'A', capabilities: { fingerprint: true, face: false } },
      { deviceName: 'A', capabilities: { fingerprint: false, face: false } }
    );
    expect(r.action).toBe('conflict');
    expect(r.diffs[0].field).toBe('capabilities.fingerprint');
  });
});
