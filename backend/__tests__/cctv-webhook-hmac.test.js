'use strict';

/**
 * cctv-webhook-hmac.test.js — Phase 27.
 *
 * HMAC signature verification + XML body parsing for the Hikvision webhook.
 */

jest.unmock('mongoose');
jest.resetModules();
process.env.NODE_ENV = 'test';

const crypto = require('crypto');
const { verifyHmac, parseHikvisionBody } = require('../routes/cctv/webhooks.routes');

describe('verifyHmac', () => {
  const secret = 'super-secret';
  const body = Buffer.from(
    '<EventNotificationAlert><eventType>VMD</eventType></EventNotificationAlert>'
  );
  const sig = 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex');

  test('accepts a correct signature', () => {
    expect(verifyHmac(secret, body, sig)).toBe(true);
  });
  test('rejects a tampered signature', () => {
    expect(verifyHmac(secret, body, sig.replace(/[0-9a-f]$/, '0'))).toBe(false);
  });
  test('rejects when secret is missing', () => {
    expect(verifyHmac('', body, sig)).toBe(false);
  });
  test('rejects when header is missing', () => {
    expect(verifyHmac(secret, body, '')).toBe(false);
  });
  test('rejects when body is altered', () => {
    const altered = Buffer.from(body.toString() + 'X');
    expect(verifyHmac(secret, altered, sig)).toBe(false);
  });
});

describe('parseHikvisionBody', () => {
  test('extracts XML tag values', () => {
    const buf = Buffer.from(`
      <EventNotificationAlert>
        <eventType>linedetection</eventType>
        <channelID>3</channelID>
        <dateTime>2026-05-15T10:00:00+03:00</dateTime>
        <licensePlate>ABC1234</licensePlate>
      </EventNotificationAlert>`);
    const parsed = parseHikvisionBody(buf, 'application/xml');
    expect(parsed.eventType).toBe('linedetection');
    expect(parsed.channelID).toBe('3');
    expect(parsed.dateTime).toContain('2026-05-15');
    expect(parsed.licensePlate).toBe('ABC1234');
  });
  test('parses JSON body', () => {
    const buf = Buffer.from(JSON.stringify({ eventType: 'falldown', channelID: 7 }));
    const parsed = parseHikvisionBody(buf, 'application/json');
    expect(parsed.eventType).toBe('falldown');
    expect(parsed.channelID).toBe(7);
  });
});
