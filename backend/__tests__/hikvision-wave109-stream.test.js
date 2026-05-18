/**
 * hikvision-wave109-stream.test.js — Wave 109.
 *
 * Sections:
 *   1. Registry — normalizeStreamTimestamp + computeStreamExternalEventId
 *   2. Parser   — parseStreamChunk (multipart split + remainder)
 *   3. Parser   — parseStreamPart XML
 *   4. Parser   — parseStreamPart JSON
 *   5. Parser   — kind classification (face/door/spoof/unregistered)
 *   6. Client   — happy path: connects, emits events, idle (no failures)
 *   7. Client   — body 'end' triggers reconnect with backoff
 *   8. Client   — repeated failures open circuit breaker
 *   9. Client   — watchdog: silence longer than maxSilenceMs forces reconnect
 *  10. Client   — stop() halts and prevents further reconnects
 *  11. Supervisor — happy: events batched + dedup'd + flushed to ingestBatch
 *  12. Supervisor — overflow drops oldest + increments eventsDropped
 *  13. Supervisor — fast-path enqueues review for spoof attempts
 *  14. Supervisor — refresh() attaches new devices + detaches retired
 */

'use strict';

const reg = require('../intelligence/hikvision.registry');
const {
  parseStreamChunk,
  parseStreamPart,
  _classifyKind,
} = require('../intelligence/hikvision-stream-parser');
const { createEventStreamClient } = require('../intelligence/hikvision-stream-client.service');
const {
  createEventStreamSupervisor,
} = require('../intelligence/hikvision-stream-supervisor.service');
const { createMockHttpStreamer } = require('../intelligence/hikvision-stream-http');

const SILENT = { info: () => {}, warn: () => {}, error: () => {} };

// Manual clock helper
function makeClock(initial = 1_700_000_000_000) {
  const state = { t: initial };
  return {
    now: () => new Date(state.t),
    advance: ms => {
      state.t += ms;
    },
  };
}

// Wait until predicate true or timeout. Falls back to async ticks
// rather than real timers — lets us drive the event loop deterministically.
async function waitUntil(pred, timeoutMs = 1000, stepMs = 5) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    if (pred()) return;
    await new Promise(r => setTimeout(r, stepMs));
  }
  throw new Error('waitUntil timeout');
}

// Build a multipart fixture body for one face-match event.
// Includes a trailing `--mock\r\n` so the chunk splitter can flush the
// part immediately — without a second boundary in view, the part stays
// in the remainder buffer until the next chunk arrives.
function buildMultipartXML({
  deviceCode = 'TRM-001',
  dateTime,
  fpid = 'pid-7a3c',
  sim = 89.2,
  antiSpoof = 'real',
} = {}) {
  const xml =
    `<EventNotificationAlert><dateTime>${dateTime || '2026-05-18T08:14:23Z'}</dateTime>` +
    `<channelID>1</channelID><eventType>faceCapture</eventType>` +
    `<FaceCapture><FPID>${fpid}</FPID><similarity>${sim}</similarity>` +
    `<antiSpoofResult>${antiSpoof}</antiSpoofResult></FaceCapture></EventNotificationAlert>`;
  void deviceCode;
  return (
    '--mock\r\n' +
    'Content-Type: application/xml\r\n' +
    `Content-Length: ${xml.length}\r\n\r\n` +
    xml +
    '\r\n--mock\r\n'
  );
}

// ═══ 1. Registry helpers ═══════════════════════════════════════

describe('registry — stream helpers', () => {
  test('normalizeStreamTimestamp — no drift returns clean tuple', () => {
    const captured = '2026-05-18T08:14:23Z';
    const server = new Date('2026-05-18T08:14:25Z'); // 2s later
    const r = reg.normalizeStreamTimestamp(captured, server);
    expect(r.driftMs).toBe(2000);
    expect(r.driftFlag).toBeNull();
    expect(r.capturedAt.toISOString()).toBe('2026-05-18T08:14:23.000Z');
  });

  test('normalizeStreamTimestamp — drift > 5min flags time-drift', () => {
    const captured = '2026-05-18T08:00:00Z';
    const server = new Date('2026-05-18T08:10:00Z'); // 10 min later
    const r = reg.normalizeStreamTimestamp(captured, server);
    expect(Math.abs(r.driftMs)).toBe(600_000);
    expect(r.driftFlag).toBe('time-drift');
  });

  test('computeStreamExternalEventId — deterministic per (device, time, fpid)', () => {
    const a = reg.computeStreamExternalEventId({
      deviceCode: 'X',
      dateTime: '2026-01-01T00:00:00Z',
      fpid: 'pid-1',
    });
    const b = reg.computeStreamExternalEventId({
      deviceCode: 'X',
      dateTime: '2026-01-01T00:00:00Z',
      fpid: 'pid-1',
    });
    const c = reg.computeStreamExternalEventId({
      deviceCode: 'Y',
      dateTime: '2026-01-01T00:00:00Z',
      fpid: 'pid-1',
    });
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a.startsWith('stream-')).toBe(true);
  });
});

// ═══ 2. Multipart splitter ═════════════════════════════════════

describe('parseStreamChunk', () => {
  test('returns one part when boundary closes a single XML body', () => {
    const buf = Buffer.from(buildMultipartXML({}) + '--mock\r\n', 'utf8');
    const r = parseStreamChunk(buf, 'mock');
    expect(r.parts.length).toBe(1);
    expect(r.parts[0].headers['content-type']).toMatch(/xml/);
    expect(r.parts[0].body).toMatch(/EventNotificationAlert/);
  });

  test('keeps trailing fragment as remainder', () => {
    const buf = Buffer.from('--mock\r\nContent-Type: app', 'utf8');
    const r = parseStreamChunk(buf, 'mock');
    expect(r.parts).toHaveLength(0);
    expect(r.remainder.length).toBeGreaterThan(0);
  });

  test('multiple parts split correctly', () => {
    const buf = Buffer.from(
      buildMultipartXML({ fpid: 'pid-1' }) + buildMultipartXML({ fpid: 'pid-2' }) + '--mock\r\n',
      'utf8'
    );
    const r = parseStreamChunk(buf, 'mock');
    expect(r.parts.length).toBe(2);
    expect(r.parts[0].body).toMatch(/pid-1/);
    expect(r.parts[1].body).toMatch(/pid-2/);
  });
});

// ═══ 3. Part-level XML ═════════════════════════════════════════

describe('parseStreamPart — XML', () => {
  test('extracts FPID + similarity + antiSpoof + classifies face-match', () => {
    const xml =
      '<EventNotificationAlert><dateTime>2026-05-18T08:14:23Z</dateTime>' +
      '<channelID>2</channelID><eventType>faceCapture</eventType>' +
      '<FaceCapture><FPID>pid-7a3c</FPID><similarity>89.2</similarity>' +
      '<antiSpoofResult>real</antiSpoofResult></FaceCapture></EventNotificationAlert>';
    const r = parseStreamPart({
      headers: { 'content-type': 'application/xml' },
      body: xml,
      deviceCode: 'TRM-001',
      serverNow: new Date('2026-05-18T08:14:25Z'),
    });
    expect(r.ok).toBe(true);
    expect(r.event.kind).toBe(reg.RAW_EVENT_KIND.FACE_MATCH);
    expect(r.event.hikvisionPersonId).toBe('pid-7a3c');
    expect(r.event.similarity).toBe(89.2);
    expect(r.event.antiSpoof).toBe('real');
    expect(r.event.channelNo).toBe(2);
    expect(r.event.parseConfidence).toBe('high');
  });

  test('image parts are skipped, not parsed', () => {
    const r = parseStreamPart({
      headers: { 'content-type': 'image/jpeg' },
      body: 'binary-junk',
      deviceCode: 'TRM-001',
    });
    expect(r.ok).toBe(false);
    expect(r.skipReason).toBe('image-part');
  });
});

// ═══ 4. Part-level JSON ════════════════════════════════════════

describe('parseStreamPart — JSON', () => {
  test('AccessControllerEvent JSON → face-match', () => {
    const body = JSON.stringify({
      dateTime: '2026-05-18T09:00:00Z',
      eventType: 'AccessControllerEvent',
      channelID: 1,
      AccessControllerEvent: {
        personID: 'pid-XYZ',
        currentVerifyMode: 'face',
        similarity: 92.5,
      },
    });
    const r = parseStreamPart({
      headers: { 'content-type': 'application/json' },
      body,
      deviceCode: 'TRM-002',
      serverNow: new Date('2026-05-18T09:00:01Z'),
    });
    expect(r.ok).toBe(true);
    expect(r.event.kind).toBe(reg.RAW_EVENT_KIND.FACE_MATCH);
    expect(r.event.hikvisionPersonId).toBe('pid-XYZ');
    expect(r.event.encoding).toBe('json');
  });

  test('invalid JSON → STREAM_PARSE_FAILED', () => {
    const r = parseStreamPart({
      headers: { 'content-type': 'application/json' },
      body: '{not json',
      deviceCode: 'TRM-002',
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.STREAM_PARSE_FAILED);
  });
});

// ═══ 5. Kind classification ═════════════════════════════════════

describe('_classifyKind', () => {
  test('antiSpoof spoof wins over event type', () => {
    expect(
      _classifyKind({ eventType: 'faceCapture', fpid: 'p1', similarity: 90, antiSpoofRaw: 'spoof' })
    ).toBe(reg.RAW_EVENT_KIND.SPOOF_ATTEMPT);
  });

  test('face without fpid → unregistered-face', () => {
    expect(_classifyKind({ eventType: 'faceCapture', fpid: null })).toBe(
      reg.RAW_EVENT_KIND.UNREGISTERED_FACE
    );
  });

  test('similarity below 70 → face-mismatch', () => {
    expect(_classifyKind({ eventType: 'faceCapture', fpid: 'p', similarity: 60 })).toBe(
      reg.RAW_EVENT_KIND.FACE_MISMATCH
    );
  });

  test('door open event → door-open', () => {
    expect(_classifyKind({ eventType: 'doorOpenEvent', fpid: null })).toBe(
      reg.RAW_EVENT_KIND.DOOR_OPEN
    );
  });
});

// ═══ 6. Client — happy path ═════════════════════════════════════

describe('EventStreamClient — happy path', () => {
  test('connects + emits events + state=connected', async () => {
    const transport = createMockHttpStreamer();
    const events = [];
    const states = [];
    const client = createEventStreamClient({
      device: { _id: 'd1', deviceCode: 'TRM-001', ip: '10.0.0.1', port: 80 },
      transport,
      onEvent: e => events.push(e),
      onStateChange: e => states.push(e),
      logger: SILENT,
    });
    client.start();
    await waitUntil(() => client.getState() === reg.STREAM_STATE.CONNECTED);
    const conn = transport.connect('TRM-001');
    conn.write(buildMultipartXML({ fpid: 'pid-A' }) + buildMultipartXML({ fpid: 'pid-B' }));
    await waitUntil(() => events.length >= 2, 2000);
    expect(events[0].event.hikvisionPersonId).toBe('pid-A');
    expect(events[1].event.hikvisionPersonId).toBe('pid-B');
    expect(client.getState()).toBe(reg.STREAM_STATE.CONNECTED);
    client.stop();
  });
});

// ═══ 7. Client — body 'end' triggers reconnect ═════════════════

describe('EventStreamClient — reconnect on body end', () => {
  test('body end → state=reconnecting → second connect succeeds', async () => {
    const transport = createMockHttpStreamer();
    const states = [];
    const client = createEventStreamClient({
      device: { _id: 'd1', deviceCode: 'TRM-001', ip: '10.0.0.1', port: 80 },
      transport,
      onStateChange: e => states.push(e.to),
      logger: SILENT,
      config: { backoffMs: [10, 10] }, // tight backoff for the test
    });
    client.start();
    await waitUntil(() => client.getState() === reg.STREAM_STATE.CONNECTED);
    const conn1 = transport.connect('TRM-001');
    conn1.close();
    await waitUntil(() => states.includes(reg.STREAM_STATE.RECONNECTING), 2000);
    await waitUntil(() => client.getState() === reg.STREAM_STATE.CONNECTED, 2000);
    client.stop();
  });
});

// ═══ 8. Client — circuit breaker ════════════════════════════════

describe('EventStreamClient — circuit breaker', () => {
  test('opens circuit after N consecutive failures', async () => {
    const transport = createMockHttpStreamer();
    transport.injectFailure('TRM-001', 'connect-refused');
    const client = createEventStreamClient({
      device: { _id: 'd1', deviceCode: 'TRM-001', ip: '10.0.0.1', port: 80 },
      transport,
      logger: SILENT,
      config: {
        backoffMs: [5, 5, 5, 5, 5], // very tight to let the test finish quickly
        circuitOpenAfterFailures: 3,
        circuitHalfOpenAfterMs: 60_000, // long enough to not flap mid-test
      },
    });
    client.start();
    await waitUntil(() => client.getState() === reg.STREAM_STATE.CIRCUIT_OPEN, 3000);
    expect(client.getState()).toBe(reg.STREAM_STATE.CIRCUIT_OPEN);
    client.stop();
  });
});

// ═══ 9. Client — watchdog ═══════════════════════════════════════

describe('EventStreamClient — watchdog', () => {
  test('silence longer than maxSilenceMs forces reconnect', async () => {
    const transport = createMockHttpStreamer();
    const clock = makeClock();
    const client = createEventStreamClient({
      device: { _id: 'd1', deviceCode: 'TRM-001', ip: '10.0.0.1', port: 80 },
      transport,
      logger: SILENT,
      clock: clock.now,
      config: {
        watchdogIntervalMs: 20,
        maxSilenceMs: 50,
        backoffMs: [10, 10],
      },
    });
    client.start();
    await waitUntil(() => client.getState() === reg.STREAM_STATE.CONNECTED);
    // Don't write anything; advance the synthetic clock past maxSilence.
    clock.advance(100);
    // Watchdog interval runs every 20ms — give it a tick.
    await waitUntil(
      () =>
        client.getState() === reg.STREAM_STATE.RECONNECTING ||
        client.getState() === reg.STREAM_STATE.CONNECTING,
      1000
    );
    client.stop();
  });
});

// ═══ 10. Client — stop ══════════════════════════════════════════

describe('EventStreamClient — stop', () => {
  test('stop() prevents further reconnects', async () => {
    const transport = createMockHttpStreamer();
    const states = [];
    const client = createEventStreamClient({
      device: { _id: 'd1', deviceCode: 'TRM-001', ip: '10.0.0.1', port: 80 },
      transport,
      onStateChange: e => states.push(e.to),
      logger: SILENT,
    });
    client.start();
    await waitUntil(() => client.getState() === reg.STREAM_STATE.CONNECTED);
    client.stop();
    // Wait a beat — make sure no reconnect happens after stop.
    await new Promise(r => setTimeout(r, 50));
    expect(client.getState()).toBe(reg.STREAM_STATE.STOPPED);
  });
});

// ═══ 11-14. Supervisor ═════════════════════════════════════════

function buildDeviceModel(devices) {
  const M = {};
  M.find = function (q = {}) {
    let filtered = devices;
    if (q.retiredAt === null) filtered = filtered.filter(d => !d.retiredAt);
    const chain = {
      lean: async () => filtered.map(d => ({ ...d })),
      then: resolve => resolve(filtered.map(d => ({ ...d }))),
    };
    return chain;
  };
  M._devices = devices;
  return M;
}

function buildIngestion(captureRef) {
  return {
    async ingestBatch(items) {
      const results = items.map(it => ({
        ok: true,
        event: {
          _id: `db-${it.externalEventId}`,
          deviceId: 'd1',
          externalEventId: it.externalEventId,
        },
      }));
      captureRef.batches.push(items);
      return { ok: true, results };
    },
  };
}

describe('EventStreamSupervisor — batched ingest', () => {
  test('events from a single device land in ingestBatch after batch window', async () => {
    const devices = [
      { _id: 'd1', deviceCode: 'TRM-001', ip: '10.0.0.1', capabilities: ['face-capture'] },
    ];
    const transport = createMockHttpStreamer();
    const captured = { batches: [] };
    const supervisor = createEventStreamSupervisor({
      deviceModel: buildDeviceModel(devices),
      ingestionService: buildIngestion(captured),
      transport,
      logger: SILENT,
      config: { batchWindowMs: 20, batchSize: 50 },
    });
    await supervisor.start();
    await waitUntil(() => transport._snapshot().openCount === 1, 1000);
    const conn = transport.connect('TRM-001');
    conn.write(buildMultipartXML({ fpid: 'pid-A' }));
    conn.write(buildMultipartXML({ fpid: 'pid-B' }));
    await waitUntil(() => captured.batches.length >= 1, 1000);
    await supervisor._flushAll();
    const total = captured.batches.reduce((s, b) => s + b.length, 0);
    expect(total).toBeGreaterThanOrEqual(2);
    await supervisor.stop();
  });

  test('duplicate externalEventId is deduplicated (LRU L1)', async () => {
    const devices = [
      { _id: 'd1', deviceCode: 'TRM-001', ip: '10.0.0.1', capabilities: ['face-capture'] },
    ];
    const transport = createMockHttpStreamer();
    const captured = { batches: [] };
    const supervisor = createEventStreamSupervisor({
      deviceModel: buildDeviceModel(devices),
      ingestionService: buildIngestion(captured),
      transport,
      logger: SILENT,
      config: { batchWindowMs: 10 },
    });
    await supervisor.start();
    await waitUntil(() => transport._snapshot().openCount === 1, 1000);
    const conn = transport.connect('TRM-001');
    // Same fixture twice — same externalEventId.
    const same = buildMultipartXML({ fpid: 'pid-DUP', dateTime: '2026-05-18T08:14:23Z' });
    conn.write(same);
    conn.write(same);
    await new Promise(r => setTimeout(r, 60));
    await supervisor._flushAll();
    const status = supervisor.getStatus();
    expect(status.metrics.eventsAccepted).toBeGreaterThanOrEqual(2);
    expect(status.metrics.eventsDeduped).toBeGreaterThanOrEqual(1);
    await supervisor.stop();
  });
});

describe('EventStreamSupervisor — bounded queue overflow', () => {
  test('queue overflow drops oldest + increments eventsDropped', async () => {
    const devices = [
      { _id: 'd1', deviceCode: 'TRM-001', ip: '10.0.0.1', capabilities: ['face-capture'] },
    ];
    const transport = createMockHttpStreamer();
    const captured = { batches: [] };
    // Slow-ingest mock: never resolves until release(); lets the queue back up.
    let release;
    const blocked = new Promise(r => {
      release = r;
    });
    const slowIngestion = {
      async ingestBatch(items) {
        await blocked;
        return { ok: true, results: items.map(() => ({ ok: true })) };
      },
    };
    const supervisor = createEventStreamSupervisor({
      deviceModel: buildDeviceModel(devices),
      ingestionService: slowIngestion,
      transport,
      logger: SILENT,
      config: {
        batchWindowMs: 5,
        batchSize: 10,
        boundedQueueSize: 3,
      },
    });
    await supervisor.start();
    await waitUntil(() => transport._snapshot().openCount === 1, 1000);
    const conn = transport.connect('TRM-001');
    // Push 8 unique events; queue size = 3 so 5 should be dropped.
    for (let i = 0; i < 8; i++) {
      conn.write(buildMultipartXML({ fpid: `pid-${i}`, dateTime: `2026-05-18T08:14:${10 + i}Z` }));
    }
    await new Promise(r => setTimeout(r, 50));
    const status = supervisor.getStatus();
    expect(status.metrics.eventsDropped).toBeGreaterThan(0);
    if (release) release();
    void captured;
    await supervisor.stop();
  });
});

describe('EventStreamSupervisor — refresh', () => {
  test('refresh attaches newly-eligible device', async () => {
    const devices = [
      { _id: 'd1', deviceCode: 'TRM-001', ip: '10.0.0.1', capabilities: ['face-capture'] },
    ];
    const transport = createMockHttpStreamer();
    const captured = { batches: [] };
    const supervisor = createEventStreamSupervisor({
      deviceModel: buildDeviceModel(devices),
      ingestionService: buildIngestion(captured),
      transport,
      logger: SILENT,
    });
    await supervisor.start();
    await waitUntil(() => supervisor.getStatus().totalDevices === 1);
    // Add a second device to the registry and call refresh.
    devices.push({
      _id: 'd2',
      deviceCode: 'TRM-002',
      ip: '10.0.0.2',
      capabilities: ['attendance'],
    });
    const r = await supervisor.refresh();
    expect(r.ok).toBe(true);
    expect(r.attached).toBe(1);
    expect(supervisor.getStatus().totalDevices).toBe(2);
    await supervisor.stop();
  });

  test('refresh detaches retired device', async () => {
    const devices = [
      { _id: 'd1', deviceCode: 'TRM-001', ip: '10.0.0.1', capabilities: ['face-capture'] },
      { _id: 'd2', deviceCode: 'TRM-002', ip: '10.0.0.2', capabilities: ['face-capture'] },
    ];
    const transport = createMockHttpStreamer();
    const captured = { batches: [] };
    const supervisor = createEventStreamSupervisor({
      deviceModel: buildDeviceModel(devices),
      ingestionService: buildIngestion(captured),
      transport,
      logger: SILENT,
    });
    await supervisor.start();
    await waitUntil(() => supervisor.getStatus().totalDevices === 2);
    // Retire d2.
    devices[1].retiredAt = new Date();
    const r = await supervisor.refresh();
    expect(r.detached).toBe(1);
    expect(supervisor.getStatus().totalDevices).toBe(1);
    await supervisor.stop();
  });
});

describe('EventStreamSupervisor — fast-path enqueue for spoof', () => {
  test('spoof event routes through reviewQueueService.fastEnqueue', async () => {
    const devices = [
      { _id: 'd1', deviceCode: 'TRM-001', ip: '10.0.0.1', capabilities: ['face-capture'] },
    ];
    const transport = createMockHttpStreamer();
    const captured = { batches: [] };
    const fastCalls = [];
    const reviewQueueService = {
      fastEnqueue: async args => {
        fastCalls.push(args);
        return { ok: true };
      },
    };
    const supervisor = createEventStreamSupervisor({
      deviceModel: buildDeviceModel(devices),
      ingestionService: buildIngestion(captured),
      transport,
      reviewQueueService,
      logger: SILENT,
      config: { batchWindowMs: 10 },
    });
    await supervisor.start();
    await waitUntil(() => transport._snapshot().openCount === 1, 1000);
    const conn = transport.connect('TRM-001');
    conn.write(buildMultipartXML({ fpid: 'pid-S', sim: 90, antiSpoof: 'spoof' }));
    await waitUntil(() => fastCalls.length >= 1, 2000);
    expect(fastCalls[0].queue).toBe('security');
    expect(fastCalls[0].sla).toBe('urgent');
    await supervisor.stop();
  });
});
