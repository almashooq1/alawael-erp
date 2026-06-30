'use strict';

/**
 * W1424e — consent gate on POST /send/interactive + POST /bulk.
 *
 * The single sends (/send/text|template|document) all call assertCanMessage
 * before sending, but /send/interactive went straight to withSendGuards (no
 * consent check) and /bulk fan-out skipped consent entirely — a staff member
 * could blast non-consenting / opted-out guardians (PDPL + Meta-policy breach).
 * This static guard locks the consent gate into both handlers.
 */

const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'routes', 'whatsapp.routes.js'), 'utf8');

function handlerBlock(marker) {
  const start = SRC.indexOf(marker);
  if (start < 0) return '';
  const next = SRC.indexOf('\nrouter.', start + marker.length);
  return SRC.slice(start, next < 0 ? undefined : next);
}

describe('W1424e consent gate on /send/interactive + /bulk', () => {
  test('/send/interactive gates consent BEFORE sending', () => {
    const block = handlerBlock("'/send/interactive'");
    expect(block).toMatch(/assertCanMessage/);
    expect(block.indexOf('assertCanMessage')).toBeLessThan(block.indexOf('withSendGuards'));
  });

  test('/bulk gates consent per recipient and records blocked rows', () => {
    const block = handlerBlock("'/bulk'");
    expect(block).toMatch(/assertCanMessage/);
    expect(block).toMatch(/blocked:\s*true/);
    // the consent check must precede the withSendGuards send inside the loop
    expect(block.indexOf('assertCanMessage')).toBeLessThan(block.indexOf('withSendGuards'));
  });

  test('all 5 send surfaces (text/template/document/interactive/bulk) gate consent', () => {
    expect((SRC.match(/assertCanMessage/g) || []).length).toBeGreaterThanOrEqual(5);
  });
});
