'use strict';

/**
 * W1424m — role gate on guardian-facing sends + consent mutation.
 *
 * Previously the /send/* + /bulk endpoints required only `authenticate` (ANY
 * logged-in user could message guardians), and /consent/:phone/opt-in|out had no
 * role gate (any user could flip any phone's consent). This guard locks the
 * authorize() gates in place. NOTE: the SEND_ROLES allow-list is owner-reviewable.
 */

const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'routes', 'whatsapp.routes.js'), 'utf8');
const CODE = SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

describe('W1424m WhatsApp send + consent role gate', () => {
  test('SEND_ROLES allow-list is defined', () => {
    expect(CODE).toMatch(/const SEND_ROLES = \[/);
  });

  test('the 5 guardian-facing send endpoints all require a SEND_ROLES role', () => {
    expect((CODE.match(/authorize\(SEND_ROLES\)/g) || []).length).toBeGreaterThanOrEqual(5);
  });

  test('each send endpoint gates with authorize BEFORE its handler', () => {
    for (const p of ['/send/text', '/send/template', '/send/document', '/send/interactive', '/bulk']) {
      const i = CODE.indexOf("'" + p + "'");
      expect(i).toBeGreaterThan(-1);
      expect(CODE.slice(i, i + 140)).toMatch(/authorize\(SEND_ROLES\)/);
    }
  });

  test('consent opt-in / opt-out require admin/manager', () => {
    for (const p of ['/consent/:phone/opt-in', '/consent/:phone/opt-out']) {
      const i = CODE.indexOf("'" + p + "'");
      expect(i).toBeGreaterThan(-1);
      expect(CODE.slice(i, i + 140)).toMatch(/authorize\('admin'/);
    }
  });
});
