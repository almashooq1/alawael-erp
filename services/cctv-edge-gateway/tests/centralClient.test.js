'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');

const { sign } = require('../centralClient');

test('sign produces deterministic sha256= prefix', () => {
  const body = Buffer.from('{"eventType":"motion"}');
  const a = sign('s3cr3t', body);
  const b = sign('s3cr3t', body);
  assert.equal(a, b);
  assert.match(a, /^sha256=[0-9a-f]{64}$/);
  // Compare against a known computation
  const expected = 'sha256=' + crypto.createHmac('sha256', 's3cr3t').update(body).digest('hex');
  assert.equal(a, expected);
});

test('sign differs across secrets', () => {
  const body = Buffer.from('x');
  assert.notEqual(sign('a', body), sign('b', body));
});

test('sign differs across bodies', () => {
  assert.notEqual(sign('s', Buffer.from('a')), sign('s', Buffer.from('b')));
});
