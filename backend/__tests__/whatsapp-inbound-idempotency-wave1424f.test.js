'use strict';

/**
 * W1424f — inbound webhook idempotency (dedup on providerMessageId).
 *
 * The live Meta webhook acks 200 BEFORE processing, but Meta still re-delivers a
 * webhook if the 200 never reaches it (network drop) or on any retry. Without a
 * dedup, handleIncomingMessage re-classifies + re-pushes the message + re-fires
 * the auto-reply / bot FSM → duplicate reply + duplicate row (+ duplicate
 * emergency alert). This guard locks the dedup BEFORE the persist.
 */

const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(
  path.join(__dirname, '..', 'services', 'whatsapp', 'whatsappWebhook.service.js'),
  'utf8'
);

// Strip comments so the ordering check matches CODE only — the fix's own comment
// mentions `$push` and `messages.providerMessageId`, which would skew the indices.
const CODE = SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

describe('W1424f inbound webhook idempotency', () => {
  test('handleIncomingMessage dedups on providerMessageId BEFORE persisting', () => {
    const fnStart = CODE.indexOf('async function handleIncomingMessage');
    expect(fnStart).toBeGreaterThan(-1);
    const region = CODE.slice(fnStart, fnStart + 3500);
    const dedupIdx = region.indexOf("'messages.providerMessageId': msg.id");
    const pushIdx = region.indexOf('$push');
    expect(dedupIdx).toBeGreaterThan(-1);
    expect(pushIdx).toBeGreaterThan(-1);
    expect(dedupIdx).toBeLessThan(pushIdx);
  });

  test('dedup uses an indexed exists() lookup and early-returns on a hit', () => {
    const fnStart = CODE.indexOf('async function handleIncomingMessage');
    const region = CODE.slice(fnStart, fnStart + 3500);
    expect(region).toMatch(/\.exists\(\{/);
    expect(region).toMatch(/return;/);
  });
});
