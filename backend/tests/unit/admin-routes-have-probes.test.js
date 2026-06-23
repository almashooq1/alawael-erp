/**
 * admin-routes-have-probes.test.js — structural guard.
 *
 * The post-deploy smoke runner (`scripts/post-deploy-smoke.js`) checks
 * that every critical admin route is mounted in production. This test
 * is the symmetric guarantee at PR time: every admin/* dualMount in the
 * registry that we've decided is "critical enough to gate deploys on"
 * must have a corresponding probe.
 *
 * Why ratchet, not "every admin route must be probed":
 *   The registry has ~30 admin routes today. Demanding a probe for
 *   each would be a ~30-line PR with no real review value. Instead we
 *   maintain `MUST_HAVE_PROBE` — the list of bounded contexts whose
 *   404 would be a real production incident (the routes shipped 2026-05-02
 *   plus zatca-phase2 mounted at /api/zatca-phase2 not under /api/admin).
 *   Any addition to this list ratchets the smoke set up.
 *
 *   The reverse direction is also enforced: any probe whose path looks
 *   like /api/admin/<name> must point to an actual dualMount. Catches
 *   the dead-probe case (route was removed but smoke still calls it).
 */

'use strict';

const fs = require('fs');
const path = require('path');

const REGISTRY_PATHS = [
  path.resolve(__dirname, '../../routes/_registry.js'),
  // Sub-registries delegated from _registry.js — they contain
  // dualMount() calls too (e.g. PDPL is mounted from government.registry.js).
  path.resolve(__dirname, '../../routes/registries'),
];
const SMOKE_PATH = path.resolve(__dirname, '../../scripts/post-deploy-smoke.js');

// Bounded contexts that MUST have a probe. Add an entry here when you
// ship a new route whose unmounting would be a production incident.
// Entries don't have to start with admin/ — regulatory routes (PDPL,
// CBAHI) live at top-level paths but are equally critical.
const MUST_HAVE_PROBE = [
  // NPHIES + ZATCA (financial pipeline)
  'admin/insurance-tariffs', // tariff resolution for NPHIES claims
  'admin/zatca-credentials', // ZATCA per-branch CSIDs
  'admin/nphies-claims', // claim submission pipeline
  // NOTE: 'admin/therapy-sessions' was removed from the dualMount registry
  // in Phase 8 (sessions unification). The admin surface now lives at
  // /api/v1/sessions/admin and is guarded by sessions-admin-compat-mount.test.js
  // plus the smoke probe at /api/v1/sessions/admin.

  // CBAHI / ISO 9001 (regulatory — Saudi healthcare accreditation)
  'management-review', // ISO 9001 §9.3
  'evidence', // chain-of-custody hash vault
  'compliance-calendar', // licence renewals + MOH deadlines

  // PDPL (Saudi Personal Data Protection Law)
  'pdpl', // dashboard + consents + breaches + processing
  'admin/pii-access-audit', // Article 13 — "who viewed user X's data?"
];

function extractDualMounts(src) {
  // Captures the second arg of dualMount(app, '<name>', ...). Matches
  // both single + double quotes, ignores whitespace.
  const re = /dualMount\s*\(\s*app\s*,\s*['"]([^'"]+)['"]/g;
  const found = new Set();
  let m;
  while ((m = re.exec(src))) found.add(m[1]);
  return found;
}

function collectRegistryMounts() {
  const mounts = new Set();
  for (const p of REGISTRY_PATHS) {
    if (!fs.existsSync(p)) continue;
    const stat = fs.statSync(p);
    if (stat.isFile()) {
      for (const m of extractDualMounts(fs.readFileSync(p, 'utf8'))) mounts.add(m);
    } else if (stat.isDirectory()) {
      for (const f of fs.readdirSync(p)) {
        if (!f.endsWith('.js')) continue;
        const full = path.join(p, f);
        for (const m of extractDualMounts(fs.readFileSync(full, 'utf8'))) mounts.add(m);
      }
    }
  }
  return mounts;
}

function extractProbePaths(src) {
  // Pulls HTTP paths from all probe-declaration patterns the smoke
  // file uses:
  //   1. `{ path: '/foo', ... }` — direct probe objects
  //   2. `adminMounted('name', '/api/admin/name')` — admin helper
  //   3. `mountedRoute('name', '/api/...')` — generic helper (added
  //      2026-05-02 for non-admin regulatory routes like PDPL)
  const found = new Set();
  for (const re of [
    /path\s*:\s*['"](\/[^'"]+)['"]/g,
    /adminMounted\s*\(\s*['"][^'"]+['"]\s*,\s*['"](\/[^'"]+)['"]/g,
    /mountedRoute\s*\(\s*['"][^'"]+['"]\s*,\s*['"](\/[^'"]+)['"]/g,
  ]) {
    let m;
    while ((m = re.exec(src))) found.add(m[1]);
  }
  return found;
}

describe('admin-routes-have-probes', () => {
  const smokeSrc = fs.readFileSync(SMOKE_PATH, 'utf8');
  const mounted = collectRegistryMounts();
  const probePaths = extractProbePaths(smokeSrc);

  describe('forward: every MUST_HAVE_PROBE entry has both a mount AND a probe', () => {
    test.each(MUST_HAVE_PROBE)('%s is mounted in registry', name => {
      expect(mounted.has(name)).toBe(true);
    });

    test.each(MUST_HAVE_PROBE)('%s has a corresponding smoke probe', name => {
      // dualMount('admin/foo', ...) → probe path /api/admin/foo
      const expected = `/api/${name}`;
      const matched = Array.from(probePaths).some(
        p => p === expected || p.startsWith(`${expected}/`)
      );
      expect(matched).toBe(true);
    });
  });

  describe('reverse: every probe points at a real mount', () => {
    test('no dead probes (probe path /api/X without dualMount X)', () => {
      const dead = [];
      // Whitelist — these probes intentionally don't map to a single
      // dualMount (e.g. /api/v1/admin/* legacy paths, /api/docs).
      const allowedNonMounted = new Set([
        '/health',
        '/api/v1/admin/ops/integration-health',
        '/api/v1/admin/ops/dlq',
        '/api/docs/integration.json',
      ]);
      for (const probePath of probePaths) {
        if (allowedNonMounted.has(probePath)) continue;
        // Look for either /api/<X> or /api/admin/<X> with potential
        // sub-paths after.
        const m = probePath.match(/^\/api\/((?:admin\/)?[^/]+)/);
        if (!m) continue;
        const mountKey = m[1];
        // Skip /api/v1/* paths — those are versioned routes mounted via
        // `app.use('/api/v1/...')` (Phase 29 QMS + Phase 30 HR), not
        // through the dualMount registry. Their mount integrity is
        // covered by the smoke probe itself returning non-404.
        if (mountKey === 'v1') continue;
        if (!mounted.has(mountKey)) dead.push({ probePath, mountKey });
      }
      if (dead.length > 0) {
        const detail = dead
          .map(d => `  • ${d.probePath} → expected mount ${d.mountKey}`)
          .join('\n');
        throw new Error(
          `Dead probes detected (probe path has no corresponding dualMount):\n${detail}\n\n` +
            `Either remove the probe or restore the mount in routes/_registry.js.`
        );
      }
    });
  });

  describe('sanity', () => {
    test('the registry parser found a non-trivial set of mounts', () => {
      // If parsing breaks (e.g. someone refactors dualMount), this test
      // fails loudly instead of silently returning zero matches.
      expect(mounted.size).toBeGreaterThan(20);
    });

    test('the probe parser found at least the documented probes', () => {
      expect(probePaths.size).toBeGreaterThanOrEqual(MUST_HAVE_PROBE.length + 1);
      expect(probePaths.has('/health')).toBe(true);
    });
  });
});
