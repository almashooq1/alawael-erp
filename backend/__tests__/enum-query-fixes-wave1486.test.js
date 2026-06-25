'use strict';

/**
 * W1486 — drift guard for enum-literal query fixes (W1481 bug class: a count/filter
 * query using a status value that is NOT in the model's enum → always returns 0).
 *
 * Found via a backend-wide audit (see the session report / agent memory
 * project_web_admin_stub_conversion_2026-06-23.md). This guard covers the two
 * UNAMBIGUOUS fixes; the other audited findings (Communication open/resolved,
 * Document advance-directive statuses, etc.) need domain decisions and are left
 * for per-feature triage.
 *
 * - facilities.routes.js rooms-by-status: 'under_maintenance' → 'maintenance'
 *   (Room enum = [available, occupied, maintenance, reserved]).
 * - warehouse.routes.js low-stock: 'low' → 'low_stock'
 *   (WHItem enum = [available, low_stock, out_of_stock, expired, discontinued]).
 */

const fs = require('fs');
const path = require('path');

const facilities = fs.readFileSync(path.join(__dirname, '..', 'routes', 'facilities.routes.js'), 'utf8');
const warehouse = fs.readFileSync(path.join(__dirname, '..', 'routes', 'warehouse.routes.js'), 'utf8');
const roomModel = fs.readFileSync(path.join(__dirname, '..', 'models', 'Room.js'), 'utf8');

describe('W1486 enum-literal query fixes', () => {
  test('facilities Room count uses the valid enum value "maintenance" (not "under_maintenance")', () => {
    expect(facilities).not.toMatch(/status:\s*'under_maintenance'/);
    expect(facilities).toMatch(/Room\.countDocuments\(\{[^}]*status:\s*'maintenance'/);
  });

  test('Room model enum contains "maintenance" and NOT "under_maintenance"', () => {
    expect(roomModel).toMatch(/enum:\s*\[[^\]]*'maintenance'/);
    expect(roomModel).not.toMatch(/'under_maintenance'/);
  });

  test('warehouse low-stock count uses the valid enum value "low_stock" (not "low")', () => {
    expect(warehouse).not.toMatch(/status:\s*'low'\s*\}/);
    expect(warehouse).toMatch(/status:\s*'low_stock'/);
  });
});
