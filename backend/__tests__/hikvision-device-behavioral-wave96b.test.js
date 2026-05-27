'use strict';

/**
 * hikvision-device-behavioral-wave96b.test.js — behavioral coverage for
 * HikvisionDevice (the per-device infrastructure record).
 *
 * Wave-18 invariants:
 *   1. Terminal devices require at least one of [face, fingerprint, card]
 *   2. Cameras participating in attendance (enrollmentRole≠surveillance-only)
 *      require the 'face' capability
 *   3. NVR devices MUST be enrollmentRole='surveillance-only'
 *   4. ip must be valid IPv4 (Phase 1 scope; IPv6 skipped)
 *
 * Plus deviceCode UNIQUE + port 1-65535 + capability enum allowlist.
 *
 * Per CLAUDE.md doctrine — 37× application. 8th Hikvision suite entry.
 */

jest.unmock('mongoose');
jest.unmock('../intelligence/hikvision.registry');
jest.setTimeout(30000);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let Device;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w96b-device-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  require('../config/mongoose.plugins');
  Device = require('../models/HikvisionDevice');
  await Device.init().catch(() => null);
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await Device.deleteMany({});
});

const oid = () => new mongoose.Types.ObjectId();

let codeCounter = 0;
function uniqueCode() {
  codeCounter += 1;
  return `DEV-${String(codeCounter).padStart(4, '0')}`;
}

function baseDevice(overrides = {}) {
  // Default = a face-capable terminal (passes all invariants)
  return {
    deviceCode: uniqueCode(),
    kind: 'terminal',
    branchId: oid(),
    ip: '192.168.10.50',
    capabilities: ['face'],
    ...overrides,
  };
}

// ─── 1. Required fields ────────────────────────────────────────────

describe('W96b behavioral — required fields + defaults', () => {
  it('REJECTS without deviceCode', async () => {
    const p = new Device({ ...baseDevice(), deviceCode: undefined });
    await expect(p.save()).rejects.toThrow(/deviceCode/);
  });

  it('REJECTS without kind', async () => {
    const p = new Device({ ...baseDevice(), kind: undefined });
    await expect(p.save()).rejects.toThrow(/kind/);
  });

  it('REJECTS without branchId', async () => {
    const p = new Device({ ...baseDevice(), branchId: undefined });
    await expect(p.save()).rejects.toThrow(/branchId/);
  });

  it('REJECTS without ip', async () => {
    const p = new Device({ ...baseDevice(), ip: undefined });
    await expect(p.save()).rejects.toThrow(/ip/);
  });

  it('SAVES baseline terminal + defaults populate', async () => {
    const doc = await Device.create(baseDevice());
    expect(doc.port).toBe(80);
    expect(doc.protocol).toBe('isapi');
    expect(doc.authMode).toBe('digest');
    expect(doc.enrollmentRole).toBe('primary');
    expect(doc.status).toBe('provisioning');
  });
});

// ─── 2. deviceCode UNIQUE ──────────────────────────────────────────

describe('W96b behavioral — deviceCode UNIQUE', () => {
  it('REJECTS duplicate deviceCode', async () => {
    const code = uniqueCode();
    await Device.create(baseDevice({ deviceCode: code }));
    await expect(Device.create(baseDevice({ deviceCode: code }))).rejects.toThrow(
      /E11000|duplicate/i
    );
  });
});

// ─── 3. Enums + port bounds ────────────────────────────────────────

describe('W96b behavioral — enums + port bounds', () => {
  for (const valid of ['terminal', 'camera', 'nvr']) {
    it(`SAVES kind='${valid}' with appropriate config`, async () => {
      const extras =
        valid === 'camera'
          ? { capabilities: ['face'] }
          : valid === 'nvr'
            ? { enrollmentRole: 'surveillance-only', capabilities: [] }
            : { capabilities: ['face'] };
      const doc = await Device.create(baseDevice({ kind: valid, ...extras }));
      expect(doc.kind).toBe(valid);
    });
  }

  it('REJECTS invalid kind', async () => {
    const p = new Device(baseDevice({ kind: 'beeper' }));
    await expect(p.save()).rejects.toThrow();
  });

  it('REJECTS invalid protocol', async () => {
    const p = new Device(baseDevice({ protocol: 'rest' }));
    await expect(p.save()).rejects.toThrow();
  });

  it('REJECTS invalid authMode', async () => {
    const p = new Device(baseDevice({ authMode: 'oauth' }));
    await expect(p.save()).rejects.toThrow();
  });

  it('REJECTS port > 65535', async () => {
    const p = new Device(baseDevice({ port: 70000 }));
    await expect(p.save()).rejects.toThrow();
  });

  it('REJECTS port < 1', async () => {
    const p = new Device(baseDevice({ port: 0 }));
    await expect(p.save()).rejects.toThrow();
  });
});

// ─── 4. Wave-18: terminal capability requirement ───────────────────

describe('W96b behavioral — terminal capability invariant', () => {
  it('REJECTS terminal with no recognized capabilities', async () => {
    const p = new Device(baseDevice({ kind: 'terminal', capabilities: ['temperature'] }));
    await expect(p.save()).rejects.toThrow(
      /terminal devices require at least one of \[face, fingerprint, card\]/
    );
  });

  it('REJECTS terminal with empty capabilities', async () => {
    const p = new Device(baseDevice({ kind: 'terminal', capabilities: [] }));
    await expect(p.save()).rejects.toThrow(
      /terminal devices require at least one of \[face, fingerprint, card\]/
    );
  });

  it('SAVES terminal with face capability', async () => {
    const doc = await Device.create(baseDevice({ kind: 'terminal', capabilities: ['face'] }));
    expect(doc.capabilities).toContain('face');
  });

  it('SAVES terminal with fingerprint capability', async () => {
    const doc = await Device.create(
      baseDevice({ kind: 'terminal', capabilities: ['fingerprint'] })
    );
    expect(doc.capabilities).toContain('fingerprint');
  });

  it('SAVES terminal with face+anti-spoof+temperature combo', async () => {
    const doc = await Device.create(
      baseDevice({ kind: 'terminal', capabilities: ['face', 'anti-spoof', 'temperature'] })
    );
    expect(doc.capabilities).toEqual(['face', 'anti-spoof', 'temperature']);
  });
});

// ─── 5. Wave-18: attendance-participating cameras need face ────────

describe('W96b behavioral — attendance-camera face-capability invariant', () => {
  it('REJECTS primary-role camera without face capability', async () => {
    const p = new Device(
      baseDevice({
        kind: 'camera',
        enrollmentRole: 'primary',
        capabilities: ['lpr'],
      })
    );
    await expect(p.save()).rejects.toThrow(
      /attendance-participating cameras require the "face" capability/
    );
  });

  it('REJECTS secondary-role camera without face capability', async () => {
    const p = new Device(
      baseDevice({
        kind: 'camera',
        enrollmentRole: 'secondary',
        capabilities: [],
      })
    );
    await expect(p.save()).rejects.toThrow(/face.*capability/);
  });

  it('ALLOWS surveillance-only camera without face capability', async () => {
    const doc = await Device.create(
      baseDevice({
        kind: 'camera',
        enrollmentRole: 'surveillance-only',
        capabilities: ['lpr'],
      })
    );
    expect(doc.enrollmentRole).toBe('surveillance-only');
  });

  it('SAVES primary camera with face capability', async () => {
    const doc = await Device.create(
      baseDevice({
        kind: 'camera',
        enrollmentRole: 'primary',
        capabilities: ['face', 'anti-spoof'],
      })
    );
    expect(doc.capabilities).toContain('face');
  });
});

// ─── 6. Wave-18: NVR must be surveillance-only ─────────────────────

describe('W96b behavioral — NVR enrollment invariant', () => {
  it('REJECTS NVR with enrollmentRole=primary', async () => {
    const p = new Device(baseDevice({ kind: 'nvr', enrollmentRole: 'primary', capabilities: [] }));
    await expect(p.save()).rejects.toThrow(/NVR devices must be enrolled as "surveillance-only"/);
  });

  it('REJECTS NVR with enrollmentRole=secondary', async () => {
    const p = new Device(
      baseDevice({ kind: 'nvr', enrollmentRole: 'secondary', capabilities: [] })
    );
    await expect(p.save()).rejects.toThrow(/NVR.*surveillance-only/);
  });

  it('SAVES NVR with enrollmentRole=surveillance-only', async () => {
    const doc = await Device.create(
      baseDevice({ kind: 'nvr', enrollmentRole: 'surveillance-only', capabilities: [] })
    );
    expect(doc.enrollmentRole).toBe('surveillance-only');
  });
});

// ─── 7. Wave-18: IPv4 validation ───────────────────────────────────

describe('W96b behavioral — IPv4 validation', () => {
  it('REJECTS invalid IPv4 (out-of-range octet)', async () => {
    const p = new Device(baseDevice({ ip: '999.999.1.1' }));
    await expect(p.save()).rejects.toThrow(/ip must be a valid IPv4 address/);
  });

  it('REJECTS malformed IPv4', async () => {
    const p = new Device(baseDevice({ ip: 'not-an-ip' }));
    await expect(p.save()).rejects.toThrow(/ip must be a valid IPv4 address/);
  });

  it('SAVES standard private IPv4', async () => {
    const doc = await Device.create(baseDevice({ ip: '192.168.50.10' }));
    expect(doc.ip).toBe('192.168.50.10');
  });

  it('SAVES IPv6 (skipped by sanity check)', async () => {
    const doc = await Device.create(baseDevice({ ip: '2001:db8::1' }));
    expect(doc.ip).toBe('2001:db8::1');
  });
});

// ─── 8. Collection name ────────────────────────────────────────────

describe('W96b behavioral — canonical collection name', () => {
  it('uses canonical collection name hikvision_devices', () => {
    expect(Device.collection.collectionName).toBe('hikvision_devices');
  });
});
