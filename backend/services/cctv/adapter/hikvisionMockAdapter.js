/**
 * hikvisionMockAdapter — in-memory implementation of the Hikvision ISAPI
 * surface used by tests and local development.
 *
 * Behaviour: deterministic responses keyed by device IP + channel. Generates
 * plausible event streams, snapshots, and playback search results so the
 * services + routes + UI can be exercised without real hardware.
 */
'use strict';

const crypto = require('crypto');

function fakeDeviceInfo(ip) {
  return {
    deviceName: `Hikvision-Mock-${ip}`,
    deviceID: crypto.createHash('md5').update(ip).digest('hex').slice(0, 16),
    model: 'DS-2CD2T46G2-MOCK',
    serialNumber:
      'MOCK' + crypto.createHash('md5').update(ip).digest('hex').slice(0, 12).toUpperCase(),
    macAddress: '00:11:22:33:44:55',
    firmwareVersion: 'V5.7.3 (mock)',
    firmwareReleasedDate: '2025-06-01',
    bootTime: new Date(Date.now() - 86400 * 1000).toISOString(),
    deviceType: 'IPCamera',
    telecontrolID: 1,
    supportBeep: false,
  };
}

function fakeStatus() {
  return {
    cpu: 18 + Math.floor(Math.random() * 10),
    memory: 32 + Math.floor(Math.random() * 12),
    uptime: 86400 + Math.floor(Math.random() * 1000),
    tempC: 41 + Math.random() * 3,
  };
}

function fakeChannels(count = 4) {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: `Channel ${i + 1}`,
    online: true,
    rtspMain: `/Streaming/Channels/${(i + 1) * 100 + 1}`,
    rtspSub: `/Streaming/Channels/${(i + 1) * 100 + 2}`,
    resolution: '1920x1080',
    fps: 25,
    codec: 'h265',
  }));
}

function fakeSnapshot(_ip, _channel) {
  // 1x1 JPEG header so callers see valid bytes
  const buf = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01,
    0x00, 0x01, 0x00, 0x00, 0xff, 0xd9,
  ]);
  return {
    contentType: 'image/jpeg',
    bytes: buf,
    width: 1920,
    height: 1080,
    capturedAt: new Date(),
    mock: true,
  };
}

function fakePlayback({ channel, from, to }) {
  const segs = [];
  let t = new Date(from).getTime();
  const end = new Date(to).getTime();
  while (t < end) {
    segs.push({
      startTime: new Date(t).toISOString(),
      endTime: new Date(Math.min(t + 3600 * 1000, end)).toISOString(),
      sizeBytes: 90_000_000 + Math.floor(Math.random() * 30_000_000),
      trackId: channel * 1000,
      playbackUrl: `rtsp://mock/Streaming/tracks/${channel * 1000}?starttime=${new Date(t).toISOString()}`,
    });
    t += 3600 * 1000;
  }
  return segs;
}

function fakeEvents(opts = {}) {
  const types = ['motion', 'tampering', 'line_crossing', 'intrusion', 'face_detected'];
  const count = opts.count || 3;
  return Array.from({ length: count }, (_, i) => ({
    eventType: types[i % types.length],
    channelID: opts.channel || 1,
    dateTime: new Date(Date.now() - i * 60_000).toISOString(),
    eventDescription: `mock event ${i}`,
    snapshot: null,
  }));
}

module.exports = {
  mode: 'mock',
  async getDeviceInfo({ ip }) {
    return { ok: true, data: fakeDeviceInfo(ip), mode: 'mock' };
  },
  async getStatus({ ip: _ip }) {
    return { ok: true, data: fakeStatus(), mode: 'mock' };
  },
  async listChannels({ ip: _ip, channels }) {
    return { ok: true, data: fakeChannels(channels || 4), mode: 'mock' };
  },
  async snapshot({ ip, channel = 1 }) {
    return { ok: true, data: fakeSnapshot(ip, channel), mode: 'mock' };
  },
  async getStreamUrl({ ip, channel, stream = 'main', rtspPort = 554, username, password }) {
    const ch = (channel || 1) * 100 + (stream === 'sub' ? 2 : 1);
    const auth = username
      ? `${encodeURIComponent(username)}:${encodeURIComponent(password || '')}@`
      : '';
    return {
      ok: true,
      data: { url: `rtsp://${auth}${ip}:${rtspPort}/Streaming/Channels/${ch}`, mode: 'mock' },
      mode: 'mock',
    };
  },
  async searchPlayback(opts) {
    return { ok: true, data: fakePlayback(opts), mode: 'mock' };
  },
  async ptzContinuous({ pan = 0, tilt = 0, zoom = 0 }) {
    return { ok: true, data: { applied: { pan, tilt, zoom } }, mode: 'mock' };
  },
  async ptzStop() {
    return { ok: true, data: { stopped: true }, mode: 'mock' };
  },
  async gotoPreset({ presetId }) {
    return { ok: true, data: { presetId }, mode: 'mock' };
  },
  async setLineDetection({ channel, lines }) {
    return { ok: true, data: { channel, applied: lines?.length || 0 }, mode: 'mock' };
  },
  async setFieldDetection({ channel, regions }) {
    return { ok: true, data: { channel, applied: regions?.length || 0 }, mode: 'mock' };
  },
  async addFaceToLib({ faceLibId, faceData: _faceData }) {
    return {
      ok: true,
      data: { faceId: crypto.randomBytes(8).toString('hex'), faceLibId },
      mode: 'mock',
    };
  },
  async deleteFace({ faceLibId, faceId }) {
    return { ok: true, data: { faceLibId, faceId }, mode: 'mock' };
  },
  async pollEvents({ ip: _ip, channel, sinceMs: _sinceMs }) {
    return { ok: true, data: fakeEvents({ channel, count: 2 }), mode: 'mock' };
  },
  async ping({ ip: _ip }) {
    return { ok: true, data: { reachable: true, latencyMs: 12 + Math.random() * 8 }, mode: 'mock' };
  },
  fakeDeviceInfo,
  fakeChannels,
  fakeSnapshot,
  fakeEvents,
};
