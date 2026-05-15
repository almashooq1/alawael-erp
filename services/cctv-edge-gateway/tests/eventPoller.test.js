'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { parseEventChunk, buildDigestHeader } = require('../eventPoller');

test('parseEventChunk extracts EventNotificationAlert fields', () => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <EventNotificationAlert version="2.0">
      <eventType>linedetection</eventType>
      <channelID>4</channelID>
      <dateTime>2026-05-15T10:00:00+03:00</dateTime>
      <eventDescription>line crossing</eventDescription>
      <licensePlate>ABC1234</licensePlate>
    </EventNotificationAlert>`;
  const ev = parseEventChunk(xml);
  assert.ok(ev);
  assert.equal(ev.eventType, 'linedetection');
  assert.equal(ev.channelID, '4');
  assert.equal(ev.licensePlate, 'ABC1234');
  assert.ok(ev.dateTime.includes('2026-05-15'));
});

test('parseEventChunk returns null for non-event chunks', () => {
  assert.equal(parseEventChunk(''), null);
  assert.equal(parseEventChunk('--MIME_boundary'), null);
});

test('buildDigestHeader produces RFC 7616 shape', () => {
  const header = buildDigestHeader({
    username: 'admin',
    password: 'pw',
    method: 'GET',
    uri: '/ISAPI/Event/notification/alertStream',
    challenge: { realm: 'Hikvision', nonce: 'n', qop: 'auth', algorithm: 'MD5' },
  });
  assert.match(header, /^Digest /);
  assert.match(header, /username="admin"/);
  assert.match(header, /realm="Hikvision"/);
  assert.match(header, /qop=auth/);
  assert.match(header, /response="[0-9a-f]{32}"/);
});
