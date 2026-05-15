'use strict';

/**
 * cctv-adapter.test.js — Phase 27.
 *
 * Pure unit tests for the Hikvision adapter selector + digest auth helper
 * + mock adapter shapes. No DB, no network.
 */

jest.resetModules();
process.env.NODE_ENV = 'test';
process.env.HIKVISION_MODE = 'mock';

const { parseChallenge, buildResponse, md5 } = require('../services/cctv/adapter/digestAuth');
const mock = require('../services/cctv/adapter/hikvisionMockAdapter');
const adapter = require('../services/cctv/adapter');

describe('digestAuth', () => {
  test('parseChallenge extracts realm/nonce/qop', () => {
    const ch = parseChallenge(
      'Digest realm="Hikvision", nonce="abc123", qop="auth", algorithm=MD5, opaque="oo"'
    );
    expect(ch.realm).toBe('Hikvision');
    expect(ch.nonce).toBe('abc123');
    expect(ch.qop).toBe('auth');
    expect(ch.opaque).toBe('oo');
  });

  test('parseChallenge returns null for non-Digest header', () => {
    expect(parseChallenge('Basic realm="x"')).toBeNull();
    expect(parseChallenge(null)).toBeNull();
  });

  test('buildResponse produces a stable response for fixed inputs', () => {
    const auth = buildResponse({
      username: 'admin',
      password: 'pw',
      method: 'GET',
      uri: '/ISAPI/System/deviceInfo',
      challenge: { realm: 'Hikvision', nonce: 'n', qop: 'auth', algorithm: 'MD5' },
      nc: '00000001',
      cnonce: 'c',
    });
    expect(auth).toMatch(/^Digest /);
    expect(auth).toContain('username="admin"');
    expect(auth).toContain('response="');
    // The response is md5 of HA1:nonce:nc:cnonce:qop:HA2
    const ha1 = md5('admin:Hikvision:pw');
    const ha2 = md5('GET:/ISAPI/System/deviceInfo');
    const expected = md5(`${ha1}:n:00000001:c:auth:${ha2}`);
    expect(auth).toContain(`response="${expected}"`);
  });
});

describe('hikvisionMockAdapter', () => {
  test('getDeviceInfo returns deterministic model + serial', async () => {
    const r1 = await mock.getDeviceInfo({ ip: '10.0.0.1' });
    const r2 = await mock.getDeviceInfo({ ip: '10.0.0.1' });
    expect(r1.ok).toBe(true);
    expect(r1.data.serialNumber).toBe(r2.data.serialNumber);
    expect(r1.data.model).toMatch(/MOCK/);
  });

  test('listChannels returns the requested count', async () => {
    const r = await mock.listChannels({ ip: '10.0.0.1', channels: 8 });
    expect(r.ok).toBe(true);
    expect(r.data).toHaveLength(8);
    expect(r.data[0]).toMatchObject({ id: 1, online: true });
  });

  test('snapshot returns JPEG magic bytes', async () => {
    const r = await mock.snapshot({ ip: '10.0.0.1', channel: 1 });
    expect(r.ok).toBe(true);
    expect(r.data.bytes[0]).toBe(0xff);
    expect(r.data.bytes[1]).toBe(0xd8);
  });

  test('getStreamUrl builds an rtsp:// URL', async () => {
    const r = await mock.getStreamUrl({
      ip: '10.0.0.1',
      channel: 2,
      stream: 'main',
      rtspPort: 554,
      username: 'admin',
      password: 'pw',
    });
    expect(r.data.url).toMatch(/^rtsp:\/\/admin:pw@10\.0\.0\.1:554\/Streaming\/Channels\/201$/);
  });
});

describe('adapter selector', () => {
  test('exposes the full surface', () => {
    const expected = [
      'getDeviceInfo',
      'getStatus',
      'listChannels',
      'snapshot',
      'getStreamUrl',
      'searchPlayback',
      'ptzContinuous',
      'ptzStop',
      'gotoPreset',
      'setLineDetection',
      'setFieldDetection',
      'addFaceToLib',
      'deleteFace',
      'pollEvents',
      'ping',
    ];
    for (const fn of expected) expect(typeof adapter[fn]).toBe('function');
  });

  test('getConfig() reports mock mode', () => {
    const cfg = adapter.getConfig();
    expect(cfg.mode).toBe('mock');
    expect(Array.isArray(cfg.surface)).toBe(true);
    expect(cfg.surface.length).toBeGreaterThan(10);
  });

  test('routes calls through to mock and includes latencyMs', async () => {
    const r = await adapter.ping({ ip: '127.0.0.1' });
    expect(r.ok).toBe(true);
    expect(typeof r.latencyMs).toBe('number');
    expect(r.mode).toBe('mock');
  });
});
