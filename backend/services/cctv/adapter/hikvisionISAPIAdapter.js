/**
 * hikvisionISAPIAdapter — real Hikvision ISAPI client.
 *
 * Implements the subset of ISAPI we use:
 *   • Device discovery — System/deviceInfo, System/status
 *   • Channels — ContentMgmt/InputProxy/channels
 *   • Live — Streaming/Channels/{id} (RTSP URL), Streaming/channels/{id}/picture
 *   • Playback — ContentMgmt/search + ContentMgmt/StreamingProxy/channels/{id}
 *   • PTZ — PTZCtrl/channels/{id}/{continuous,momentary,presets/{p}/goto}
 *   • Smart — Smart/LineDetection/{id}, Smart/FieldDetection/{id}
 *   • Face — Intelligent/FDLib/FaceDataRecord
 *   • Events — Event/notification/alertStream (long-poll)
 *
 * Auth: HTTP Digest (Hikvision default). Falls back to Basic if device says so.
 * Errors are normalised to `{ ok: false, code, message, status }`.
 */
'use strict';

const http = require('http');
const https = require('https');
const { URL } = require('url');
const { parseChallenge, buildResponse } = require('./digestAuth');
const httpAgentPool = require('./httpAgentPool');

function defaultTimeoutMs() {
  return parseInt(process.env.HIKVISION_TIMEOUT_MS, 10) || 8000;
}

function joinUrl(base, path) {
  return base.replace(/\/+$/, '') + (path.startsWith('/') ? path : `/${path}`);
}

function rawRequest({ method, url, headers = {}, body, timeoutMs, expectBinary = false }) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const secure = u.protocol === 'https:';
    const lib = secure ? https : http;
    const port = u.port || (secure ? 443 : 80);
    const opts = {
      method,
      hostname: u.hostname,
      port,
      path: `${u.pathname}${u.search}`,
      headers: {
        Accept: 'application/json, application/xml, text/xml;q=0.9, */*;q=0.5',
        ...headers,
      },
      rejectUnauthorized: false,
      agent: httpAgentPool.for(u.hostname, port, secure),
    };
    const effectiveTimeout = timeoutMs || defaultTimeoutMs();
    if (body && !opts.headers['Content-Length']) {
      opts.headers['Content-Length'] = Buffer.byteLength(body);
    }
    const req = lib.request(opts, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: expectBinary ? buf : buf.toString('utf8'),
        });
      });
    });
    req.on('error', reject);
    req.setTimeout(effectiveTimeout, () =>
      req.destroy(new Error(`hikvision request timeout after ${effectiveTimeout}ms`))
    );
    if (body) req.write(body);
    req.end();
  });
}

async function digestRequest({ method, url, username, password, headers, body, expectBinary }) {
  const path = new URL(url).pathname + new URL(url).search;
  const probe = await rawRequest({ method, url, headers, body, expectBinary });
  if (probe.status !== 401 || !probe.headers['www-authenticate']) {
    return probe;
  }
  const ch = parseChallenge(probe.headers['www-authenticate']);
  if (!ch) return probe;
  if (/^Basic\b/i.test(probe.headers['www-authenticate'])) {
    return rawRequest({
      method,
      url,
      headers: {
        ...headers,
        Authorization: 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64'),
      },
      body,
      expectBinary,
    });
  }
  const auth = buildResponse({ username, password, method, uri: path, challenge: ch });
  return rawRequest({
    method,
    url,
    headers: { ...headers, Authorization: auth },
    body,
    expectBinary,
  });
}

function parseXmlField(xml, tag) {
  if (!xml) return null;
  const re = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'i');
  const m = xml.match(re);
  return m ? m[1].trim() : null;
}

function ok(data) {
  return { ok: true, data, mode: 'live' };
}
function fail(code, message, status) {
  return { ok: false, code, message, status, mode: 'live' };
}

function devBase(d) {
  const proto = d.tlsEnabled ? 'https' : 'http';
  const port = d.port || (d.tlsEnabled ? 443 : 80);
  return `${proto}://${d.ip}:${port}`;
}

async function getDeviceInfo(d) {
  const url = joinUrl(devBase(d), '/ISAPI/System/deviceInfo');
  const r = await digestRequest({ method: 'GET', url, username: d.username, password: d.password });
  if (r.status !== 200) return fail('device_info_failed', `HTTP ${r.status}`, r.status);
  const xml = r.body;
  return ok({
    deviceName: parseXmlField(xml, 'deviceName'),
    deviceID: parseXmlField(xml, 'deviceID'),
    model: parseXmlField(xml, 'model'),
    serialNumber: parseXmlField(xml, 'serialNumber'),
    macAddress: parseXmlField(xml, 'macAddress'),
    firmwareVersion: parseXmlField(xml, 'firmwareVersion'),
    firmwareReleasedDate: parseXmlField(xml, 'firmwareReleasedDate'),
    deviceType: parseXmlField(xml, 'deviceType'),
  });
}

async function getStatus(d) {
  const url = joinUrl(devBase(d), '/ISAPI/System/status');
  const r = await digestRequest({ method: 'GET', url, username: d.username, password: d.password });
  if (r.status !== 200) return fail('status_failed', `HTTP ${r.status}`, r.status);
  return ok({
    cpu: Number(parseXmlField(r.body, 'cpuUtilization')) || null,
    memory: Number(parseXmlField(r.body, 'memoryUsage')) || null,
    uptime: Number(parseXmlField(r.body, 'deviceUpTime')) || null,
    raw: r.body.slice(0, 2000),
  });
}

async function listChannels(d) {
  const url = joinUrl(devBase(d), '/ISAPI/ContentMgmt/InputProxy/channels');
  const r = await digestRequest({ method: 'GET', url, username: d.username, password: d.password });
  if (r.status !== 200) return fail('channels_failed', `HTTP ${r.status}`, r.status);
  const blocks = r.body.split(/<InputProxyChannel>/i).slice(1);
  const channels = blocks.map(b => ({
    id: Number(parseXmlField(b, 'id')) || null,
    name: parseXmlField(b, 'name'),
    online: /<online>true<\/online>/i.test(b),
  }));
  return ok(channels);
}

async function snapshot(d) {
  const ch = (d.channel || 1) * 100 + 1;
  const url = joinUrl(devBase(d), `/ISAPI/Streaming/channels/${ch}/picture`);
  const r = await digestRequest({
    method: 'GET',
    url,
    username: d.username,
    password: d.password,
    expectBinary: true,
  });
  if (r.status !== 200) return fail('snapshot_failed', `HTTP ${r.status}`, r.status);
  return ok({
    contentType: r.headers['content-type'] || 'image/jpeg',
    bytes: r.body,
    capturedAt: new Date(),
  });
}

function getStreamUrl(d) {
  const ch = (d.channel || 1) * 100 + (d.stream === 'sub' ? 2 : 1);
  const auth = d.username
    ? `${encodeURIComponent(d.username)}:${encodeURIComponent(d.password || '')}@`
    : '';
  const port = d.rtspPort || 554;
  return ok({ url: `rtsp://${auth}${d.ip}:${port}/Streaming/Channels/${ch}` });
}

async function searchPlayback(d) {
  const ch = (d.channel || 1) * 100 + 1;
  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<CMSearchDescription>` +
    `<searchID>${Date.now()}</searchID>` +
    `<trackList><trackID>${ch}</trackID></trackList>` +
    `<timeSpanList><timeSpan>` +
    `<startTime>${new Date(d.from).toISOString()}</startTime>` +
    `<endTime>${new Date(d.to).toISOString()}</endTime>` +
    `</timeSpan></timeSpanList>` +
    `<maxResults>${d.limit || 40}</maxResults>` +
    `<searchResultPostion>0</searchResultPostion>` +
    `<metadataList><metadataDescriptor>//metadata.ksi.com/VideoMotion</metadataDescriptor></metadataList>` +
    `</CMSearchDescription>`;
  const url = joinUrl(devBase(d), '/ISAPI/ContentMgmt/search');
  const r = await digestRequest({
    method: 'POST',
    url,
    username: d.username,
    password: d.password,
    body,
    headers: { 'Content-Type': 'application/xml' },
  });
  if (r.status !== 200) return fail('playback_search_failed', `HTTP ${r.status}`, r.status);
  const blocks = r.body.split(/<searchMatchItem>/i).slice(1);
  const items = blocks.map(b => ({
    startTime: parseXmlField(b, 'startTime'),
    endTime: parseXmlField(b, 'endTime'),
    trackId: Number(parseXmlField(b, 'trackID')) || ch,
    sizeBytes: null,
    playbackUrl: parseXmlField(b, 'playbackURI') || null,
  }));
  return ok(items);
}

async function ptzContinuous(d) {
  const ch = d.channel || 1;
  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<PTZData><pan>${d.pan || 0}</pan><tilt>${d.tilt || 0}</tilt><zoom>${d.zoom || 0}</zoom></PTZData>`;
  const url = joinUrl(devBase(d), `/ISAPI/PTZCtrl/channels/${ch}/continuous`);
  const r = await digestRequest({
    method: 'PUT',
    url,
    username: d.username,
    password: d.password,
    body,
    headers: { 'Content-Type': 'application/xml' },
  });
  if (r.status !== 200) return fail('ptz_failed', `HTTP ${r.status}`, r.status);
  return ok({ applied: { pan: d.pan, tilt: d.tilt, zoom: d.zoom } });
}

async function ptzStop(d) {
  return ptzContinuous({ ...d, pan: 0, tilt: 0, zoom: 0 });
}

async function gotoPreset(d) {
  const ch = d.channel || 1;
  const url = joinUrl(devBase(d), `/ISAPI/PTZCtrl/channels/${ch}/presets/${d.presetId}/goto`);
  const r = await digestRequest({ method: 'PUT', url, username: d.username, password: d.password });
  if (r.status !== 200) return fail('preset_failed', `HTTP ${r.status}`, r.status);
  return ok({ presetId: d.presetId });
}

async function setLineDetection(d) {
  const ch = d.channel || 1;
  const url = joinUrl(devBase(d), `/ISAPI/Smart/LineDetection/${ch}`);
  const r = await digestRequest({
    method: 'PUT',
    url,
    username: d.username,
    password: d.password,
    body: d.xml,
    headers: { 'Content-Type': 'application/xml' },
  });
  if (r.status !== 200) return fail('line_detection_failed', `HTTP ${r.status}`, r.status);
  return ok({ channel: ch, applied: true });
}

async function setFieldDetection(d) {
  const ch = d.channel || 1;
  const url = joinUrl(devBase(d), `/ISAPI/Smart/FieldDetection/${ch}`);
  const r = await digestRequest({
    method: 'PUT',
    url,
    username: d.username,
    password: d.password,
    body: d.xml,
    headers: { 'Content-Type': 'application/xml' },
  });
  if (r.status !== 200) return fail('field_detection_failed', `HTTP ${r.status}`, r.status);
  return ok({ channel: ch, applied: true });
}

async function addFaceToLib(d) {
  const url = joinUrl(
    devBase(d),
    `/ISAPI/Intelligent/FDLib/FaceDataRecord?format=json&FDID=${d.faceLibId}`
  );
  const r = await digestRequest({
    method: 'POST',
    url,
    username: d.username,
    password: d.password,
    body: d.body,
    headers: { 'Content-Type': 'multipart/form-data; boundary=' + (d.boundary || 'mfb') },
  });
  if (r.status !== 200) return fail('face_add_failed', `HTTP ${r.status}`, r.status);
  return ok({ faceLibId: d.faceLibId, faceId: parseXmlField(r.body, 'FPID') });
}

async function deleteFace(d) {
  const url = joinUrl(
    devBase(d),
    `/ISAPI/Intelligent/FDLib/FDSearch/Delete?FDID=${d.faceLibId}&FPID=${d.faceId}`
  );
  const r = await digestRequest({ method: 'PUT', url, username: d.username, password: d.password });
  if (r.status !== 200) return fail('face_delete_failed', `HTTP ${r.status}`, r.status);
  return ok({ faceLibId: d.faceLibId, faceId: d.faceId });
}

async function pollEvents(d) {
  const url = joinUrl(devBase(d), '/ISAPI/Event/notification/alertStream?format=json');
  const r = await digestRequest({
    method: 'GET',
    url,
    username: d.username,
    password: d.password,
    timeoutMs: d.timeoutMs || 5000,
  });
  if (r.status !== 200) return fail('poll_failed', `HTTP ${r.status}`, r.status);
  const blocks = r.body.split(/<EventNotificationAlert>/i).slice(1);
  const events = blocks.map(b => ({
    eventType: parseXmlField(b, 'eventType'),
    channelID: Number(parseXmlField(b, 'channelID')) || d.channel || null,
    dateTime: parseXmlField(b, 'dateTime'),
    eventDescription: parseXmlField(b, 'eventDescription'),
    eventState: parseXmlField(b, 'eventState'),
  }));
  return ok(events);
}

async function ping(d) {
  const start = Date.now();
  try {
    const r = await rawRequest({
      method: 'GET',
      url: joinUrl(devBase(d), '/ISAPI/System/deviceInfo'),
      timeoutMs: d.timeoutMs || 3000,
    });
    return ok({
      reachable: r.status === 401 || r.status === 200,
      latencyMs: Date.now() - start,
      status: r.status,
    });
  } catch (err) {
    return fail('unreachable', err.message);
  }
}

module.exports = {
  mode: 'live',
  getDeviceInfo,
  getStatus,
  listChannels,
  snapshot,
  getStreamUrl,
  searchPlayback,
  ptzContinuous,
  ptzStop,
  gotoPreset,
  setLineDetection,
  setFieldDetection,
  addFaceToLib,
  deleteFace,
  pollEvents,
  ping,
  _digestRequest: digestRequest,
  _parseXmlField: parseXmlField,
};
