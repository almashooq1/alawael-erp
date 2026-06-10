/**
 * W1148 — modelEventBridge phantom-mapping drift guard.
 *
 * The W974 global pre-compile plugin (registerModelEventBridgePlugin) dispatches
 * a model save to its canonical event ONLY when `this.constructor.modelName`
 * matches a `MAPPINGS[].modelName`. If a mapping names a model that never
 * registers (a PHANTOM), the plugin silently no-ops it — NO warning, NO error.
 * That is exactly how `AttendanceRecord` (employee.checked_in / checked_out)
 * stayed dead unnoticed until the 2026-06-10 post-activation audit.
 *
 * This guard scans backend/models + backend/domains source for actual
 * `mongoose.model('X', ...)` (and connection/conn/db variants) registrations and
 * asserts every bridge mapping modelName resolves to one — except the documented
 * KNOWN_PHANTOM baseline. Ratchet-down (W325c lineage): a baseline entry that now
 * registers (or whose mapping was removed) FAILS, forcing baseline pruning in the
 * same commit that wires it. Pure static — no mongoose, no DB.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const { MAPPINGS } = require('../integration/modelEventBridge');

// Models the bridge maps but that intentionally/known-ly do not register.
// Remove an entry in the SAME commit that wires it to a real model.
const KNOWN_PHANTOM_BRIDGE_MODELS = new Set([
  // AttendanceRecord — 2 mappings (employee.checked_in + employee.checked_out).
  // No model registers under this name. The attendance domain is heavily
  // fragmented (>40 Attendance* models; the live check-in flow writes to
  // different models per service: Attendance / DailyAttendance / SmartAttendance
  // / attendanceModel). Wiring needs (a) a canonical-attendance-model decision
  // and (b) a high-volume-event judgment (check-in/out could flood the bus).
  // Documented in memory: project_alerts_bridge_flipped_prod_2026-06-10.
  'AttendanceRecord',
]);

function collectRegisteredModelNames() {
  const names = new Set();
  const roots = ['models', 'domains'].map(d => path.join(__dirname, '..', d));
  const re = /(?:mongoose|connection|conn|db)\.model\(\s*['"]([^'"]+)['"]\s*,/g;
  const walk = dir => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === '__tests__') continue;
        walk(p);
      } else if (entry.name.endsWith('.js')) {
        const src = fs.readFileSync(p, 'utf8');
        let m;
        while ((m = re.exec(src)) !== null) names.add(m[1]);
      }
    }
  };
  for (const root of roots) if (fs.existsSync(root)) walk(root);
  return names;
}

describe('W1148 — modelEventBridge mapping models exist', () => {
  const registered = collectRegisteredModelNames();
  const mappingModels = [...new Set(MAPPINGS.map(m => m.modelName))];

  test('sanity: the scan finds a healthy population of registered models', () => {
    // Guards against a broken scan silently passing everything.
    expect(registered.size).toBeGreaterThan(100);
    // Known-good anchors that MUST be present if the scan works.
    for (const anchor of ['Beneficiary', 'Invoice', 'Employee']) {
      expect(registered.has(anchor)).toBe(true);
    }
  });

  test('every bridge mapping modelName registers (or is a known phantom)', () => {
    const phantoms = mappingModels.filter(
      n => !registered.has(n) && !KNOWN_PHANTOM_BRIDGE_MODELS.has(n)
    );
    expect(phantoms).toEqual([]);
  });

  test('no STALE known-phantom entry (ratchet-down once wired/removed)', () => {
    const stale = [...KNOWN_PHANTOM_BRIDGE_MODELS].filter(
      n => registered.has(n) || !mappingModels.includes(n)
    );
    expect(stale).toEqual([]);
  });
});
