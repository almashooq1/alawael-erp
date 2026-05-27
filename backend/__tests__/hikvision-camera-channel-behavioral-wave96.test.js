'use strict';

/**
 * hikvision-camera-channel-behavioral-wave96.test.js — behavioral coverage
 * for W96 Phase 1 HikvisionCameraChannel.
 *
 * One physical camera may expose multiple channels (entry/exit, multi-lens).
 * Wave-18 invariant:
 *   • attendanceEligible=true is INCOMPATIBLE with recognitionMode=surveillance
 *     (surveillance channels cannot produce attendance events — they need face
 *     recognition).
 *
 * Plus (deviceId, channelNo) compound-unique.
 *
 * Per CLAUDE.md doctrine — 34× application. 5th Hikvision suite entry.
 */

jest.unmock('mongoose');
jest.unmock('../intelligence/hikvision.registry');
jest.setTimeout(30000);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let Channel;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w96-camera-channel-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  require('../config/mongoose.plugins'); // Mongoose-9 legacy-hook shim
  Channel = require('../models/HikvisionCameraChannel');
  await Channel.init().catch(() => null);
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await Channel.deleteMany({});
});

const oid = () => new mongoose.Types.ObjectId();

function baseChannel(overrides = {}) {
  return {
    deviceId: oid(),
    channelNo: 1,
    zoneId: 'gate-east',
    ...overrides,
  };
}

// ─── 1. Required fields + defaults ──────────────────────────────────

describe('W96 behavioral — required fields + defaults', () => {
  it('REJECTS without deviceId', async () => {
    const p = new Channel({ ...baseChannel(), deviceId: undefined });
    await expect(p.save()).rejects.toThrow(/deviceId/);
  });

  it('REJECTS without channelNo', async () => {
    const p = new Channel({ ...baseChannel(), channelNo: undefined });
    await expect(p.save()).rejects.toThrow(/channelNo/);
  });

  it('REJECTS without zoneId', async () => {
    const p = new Channel({ ...baseChannel(), zoneId: undefined });
    await expect(p.save()).rejects.toThrow(/zoneId/);
  });

  it('SAVES baseline with defaults populating', async () => {
    const doc = await Channel.create(baseChannel());
    expect(doc.direction).toBe('bidirectional');
    expect(doc.recognitionMode).toBe('surveillance');
    expect(doc.attendanceEligible).toBe(false);
  });
});

// ─── 2. Numeric bounds ──────────────────────────────────────────────

describe('W96 behavioral — channelNo + fps bounds', () => {
  it('REJECTS channelNo > 999', async () => {
    const p = new Channel(baseChannel({ channelNo: 1000 }));
    await expect(p.save()).rejects.toThrow();
  });

  it('REJECTS channelNo < 1', async () => {
    const p = new Channel(baseChannel({ channelNo: 0 }));
    await expect(p.save()).rejects.toThrow();
  });

  it('SAVES at boundaries 1 + 999', async () => {
    const a = await Channel.create(baseChannel({ deviceId: oid(), channelNo: 1 }));
    const b = await Channel.create(baseChannel({ deviceId: oid(), channelNo: 999 }));
    expect(a.channelNo).toBe(1);
    expect(b.channelNo).toBe(999);
  });

  it('REJECTS fps > 120', async () => {
    const p = new Channel(baseChannel({ fps: 200 }));
    await expect(p.save()).rejects.toThrow();
  });

  it('REJECTS fps < 1', async () => {
    const p = new Channel(baseChannel({ fps: 0 }));
    await expect(p.save()).rejects.toThrow();
  });

  it('SAVES fps at typical 30', async () => {
    const doc = await Channel.create(baseChannel({ fps: 30 }));
    expect(doc.fps).toBe(30);
  });
});

// ─── 3. Enums ───────────────────────────────────────────────────────

describe('W96 behavioral — direction enum', () => {
  for (const valid of ['in', 'out', 'bidirectional']) {
    it(`SAVES direction='${valid}'`, async () => {
      const doc = await Channel.create(baseChannel({ deviceId: oid(), direction: valid }));
      expect(doc.direction).toBe(valid);
    });
  }

  it('REJECTS invalid direction', async () => {
    const p = new Channel(baseChannel({ direction: 'diagonal' }));
    await expect(p.save()).rejects.toThrow();
  });
});

describe('W96 behavioral — recognitionMode enum', () => {
  for (const valid of ['face', 'face+anti-spoof', 'surveillance']) {
    it(`SAVES recognitionMode='${valid}'`, async () => {
      // attendanceEligible default is false — surveillance allowed
      const doc = await Channel.create(baseChannel({ deviceId: oid(), recognitionMode: valid }));
      expect(doc.recognitionMode).toBe(valid);
    });
  }

  it('REJECTS invalid recognitionMode', async () => {
    const p = new Channel(baseChannel({ recognitionMode: 'face+iris' }));
    await expect(p.save()).rejects.toThrow();
  });
});

// ─── 4. Wave-18: attendance-eligible + surveillance incompatibility ─

describe('W96 behavioral — attendance-eligible + recognition-mode interlock', () => {
  it('REJECTS attendanceEligible=true + recognitionMode=surveillance', async () => {
    const p = new Channel(
      baseChannel({ attendanceEligible: true, recognitionMode: 'surveillance' })
    );
    await expect(p.save()).rejects.toThrow(
      /attendanceEligible channels cannot run in "surveillance" mode/
    );
  });

  it('SAVES attendanceEligible=true + recognitionMode=face', async () => {
    const doc = await Channel.create(
      baseChannel({ attendanceEligible: true, recognitionMode: 'face' })
    );
    expect(doc.attendanceEligible).toBe(true);
  });

  it('SAVES attendanceEligible=true + recognitionMode=face+anti-spoof (recommended)', async () => {
    const doc = await Channel.create(
      baseChannel({ attendanceEligible: true, recognitionMode: 'face+anti-spoof' })
    );
    expect(doc.recognitionMode).toBe('face+anti-spoof');
  });

  it('SAVES attendanceEligible=false + recognitionMode=surveillance (default surveillance-only)', async () => {
    const doc = await Channel.create(baseChannel({ recognitionMode: 'surveillance' }));
    expect(doc.attendanceEligible).toBe(false);
    expect(doc.recognitionMode).toBe('surveillance');
  });
});

// ─── 5. (deviceId, channelNo) compound unique ──────────────────────

describe('W96 behavioral — (deviceId, channelNo) UNIQUE compound', () => {
  it('REJECTS duplicate (deviceId, channelNo)', async () => {
    const deviceId = oid();
    await Channel.create(baseChannel({ deviceId, channelNo: 1 }));
    await expect(Channel.create(baseChannel({ deviceId, channelNo: 1 }))).rejects.toThrow(
      /E11000|duplicate/i
    );
  });

  it('ALLOWS different channelNo on same device', async () => {
    const deviceId = oid();
    const a = await Channel.create(baseChannel({ deviceId, channelNo: 1 }));
    const b = await Channel.create(baseChannel({ deviceId, channelNo: 2, zoneId: 'gate-west' }));
    expect(a.channelNo).toBe(1);
    expect(b.channelNo).toBe(2);
  });

  it('ALLOWS same channelNo on different devices', async () => {
    const a = await Channel.create(baseChannel({ deviceId: oid(), channelNo: 1 }));
    const b = await Channel.create(baseChannel({ deviceId: oid(), channelNo: 1 }));
    expect(a._id).not.toEqual(b._id);
  });
});

// ─── 6. Collection name ────────────────────────────────────────────

describe('W96 behavioral — canonical collection name', () => {
  it('uses canonical collection name hikvision_camera_channels', () => {
    expect(Channel.collection.collectionName).toBe('hikvision_camera_channels');
  });
});

// ─── 7. End-to-end: device with 2 channels + 1 attendance entry/exit ─

describe('W96 behavioral — multi-channel device end-to-end', () => {
  it('records entry + exit channels on a single device with proper attendance gating', async () => {
    const deviceId = oid();

    const entry = await Channel.create({
      deviceId,
      channelNo: 1,
      zoneId: 'main-gate',
      gateId: 'gate-001',
      direction: 'in',
      attendanceEligible: true,
      recognitionMode: 'face+anti-spoof',
      resolution: '1920x1080',
      fps: 30,
    });
    expect(entry.attendanceEligible).toBe(true);

    const exit = await Channel.create({
      deviceId,
      channelNo: 2,
      zoneId: 'main-gate',
      gateId: 'gate-001',
      direction: 'out',
      attendanceEligible: true,
      recognitionMode: 'face+anti-spoof',
    });
    expect(exit.direction).toBe('out');

    // 3rd surveillance channel (no attendance) on same device — allowed
    const survey = await Channel.create({
      deviceId,
      channelNo: 3,
      zoneId: 'parking-lot',
      attendanceEligible: false,
      recognitionMode: 'surveillance',
      notes: 'Visitor lot overflow camera; surveillance only',
    });
    expect(survey.attendanceEligible).toBe(false);

    const all = await Channel.find({ deviceId }).sort({ channelNo: 1 });
    expect(all).toHaveLength(3);
    expect(all.filter(c => c.attendanceEligible)).toHaveLength(2);
  });
});
