'use strict';

/**
 * W354 — module-dependency-direction drift guard.
 *
 * Enforces the doctrine in `docs/architecture/MODULE_DEPENDENCY_RULES.md`
 * against the actual code in `backend/domains/`:
 *
 *   Tier 1: platform-core           — security, notifications, workflow
 *   Tier 2: beneficiary-360         — core, family, episodes, timeline
 *   Tier 3: assessment-measures     — assessments, goals
 *   Tier 4: goals-care-plans        — care-plans, behavior
 *   Tier 5: programs-sessions-      — programs, sessions, group-therapy,
 *                                     progress      tele-rehab, ar-vr, field-training
 *   Tier 6: operations-att-transp   — hr
 *   Tier 7: reports-approvals-fam   — reports, dashboards, ai-recommendations
 *   Tier 8: quality-risk-governance — quality, research
 *
 * Mapping is the ADR-025 decision; revise both the ADR and the TIER constant
 * below if stakeholders change Q1-Q5 answers.
 *
 * Three checks:
 *
 *   1. Tier direction. Every domain's `dependencies: [...]` (declared in
 *      `domains/X/index.js` via BaseDomainModule constructor) lists only
 *      targets of tier ≤ source tier. Doctrine §2: "modules later in the
 *      chain depend on modules earlier in the chain; reverse is forbidden."
 *
 *   2. No circular dependencies. DFS on the declared graph. Currently zero;
 *      any new cycle fails CI.
 *
 *   3. Facade respect. No `require('../../X/{models,services,repositories,
 *      routes,validators}/...')` from inside one domain into another.
 *      Doctrine §1.2 + §7: cross-module access goes through the target's
 *      public `index.js`, not directly into its internals.
 *
 * Baseline-ratchet pattern (W325c + W340): existing violations baselined as
 * `KNOWN_TIER_VIOLATIONS` + `KNOWN_FACADE_BYPASSES`. Two assertions per check:
 *   (a) any NEW violation not in the baseline fails the guard.
 *   (b) any STALE baseline entry (no longer present in source) fails the
 *       guard — forces removal from the Set in the same commit that
 *       refactors the violation away.
 *
 * Static analysis only (no module load, no mongoose, no DB). Safe to run
 * standalone via `npx jest --config=jest.config.js
 * __tests__/module-dependency-direction-wave354.test.js`.
 *
 * Snapshot at W354 introduction (2026-05-24):
 *   - 23 domains mapped to 8 tiers; 1 unmapped (`extensions`, allowlisted).
 *   - 8 tier-direction violations baselined.
 *   - 0 circular dependencies.
 *   - 8 facade-bypass occurrences, all in `domains/workflow/services/
 *     JourneyService.js` (reaches into episodes/core/timeline models).
 *
 * Related: ADR-025 (this guard's framework), ADR-006 (Domain Event Bus —
 * the alternative to direct calls).
 */

const fs = require('fs');
const path = require('path');

const BACKEND_ROOT = path.join(__dirname, '..');
const DOMAINS_ROOT = path.join(BACKEND_ROOT, 'domains');

// ─── Tier map per ADR-025 ────────────────────────────────────────────────────
// CONTRACT: editing this map without an ADR update is forbidden. Adding a new
// domain folder requires (a) deciding its tier per doctrine, (b) updating ADR-
// 025 mapping table, (c) adding the entry here.
const TIER = Object.freeze({
  // Tier 1 — platform-core
  security: 1,
  notifications: 1,
  workflow: 1,
  // Tier 2 — beneficiary-360
  core: 2,
  family: 2,
  episodes: 2,
  timeline: 2,
  // Tier 3 — assessment-measures
  assessments: 3,
  goals: 3,
  // Tier 4 — goals-care-plans
  'care-plans': 4,
  behavior: 4,
  // Tier 5 — programs-sessions-progress
  programs: 5,
  sessions: 5,
  'group-therapy': 5,
  'tele-rehab': 5,
  'ar-vr': 5,
  'field-training': 5,
  // Tier 6 — operations-attendance-transport
  hr: 6,
  // Tier 7 — reports-approvals-family-communication
  reports: 7,
  dashboards: 7,
  'ai-recommendations': 7,
  // Tier 8 — quality-risk-governance
  quality: 8,
  research: 8,
});

// Folders inside backend/domains/ that are NOT product domains.
const UNMAPPED_DOMAIN_ALLOWLIST = new Set([
  '_base', // base classes (BaseDomainModule, BaseService, BaseRepository)
  'extensions', // experimental / staging area
]);

// ─── Known violations baselined at W354 introduction (2026-05-24) ────────────

// Format: 'fromDomain|toDomain'
// Each entry is a CURRENTLY-DECLARED reversal that ADR-025 documents under
// Q1-Q5. Resolution lives behind stakeholder sign-off:
//   * workflow→{core,episodes,timeline}: Q1 (move workflow off tier 1, OR
//     refactor JourneyService to accept projections).
//   * family→{sessions,goals,care-plans}: family is currently in tier 2 but
//     pulls from 3-5. Either (a) split family into a tier-2 owner + a
//     tier-7 messaging consumer, or (b) re-tier family to 5+.
//   * dashboards→quality, reports→quality: Q2 (move quality off tier 8, or
//     invert via events).
//
// REMOVAL CONTRACT: when a violation is refactored away, remove the entry
// here in the SAME commit as the refactor. Test (b) catches stale entries.
const KNOWN_TIER_VIOLATIONS = new Set([
  'dashboards|quality',
  'family|sessions',
  'family|goals',
  'family|care-plans',
  'reports|quality',
  'workflow|core',
  'workflow|episodes',
  'workflow|timeline',
]);

// Format: 'fromDomain|targetDomain|targetSubdir|targetRest'
// `targetRest` is the path after the subdir, normalized to forward slashes
// and stripped of .js extension. We baseline by canonical require path
// (not by callsite line) so multiple require statements of the same module
// from the same file collapse to ONE baseline entry. JourneyService has 7
// requires that all collapse to 3 unique target modules (EpisodeOfCare ×5,
// Beneficiary ×1, CareTimeline ×1 → 3 entries).
const KNOWN_FACADE_BYPASSES = new Set([
  // domains/workflow/services/JourneyService.js — see Q1 in ADR-025
  'workflow|core|models|Beneficiary',
  'workflow|episodes|models|EpisodeOfCare',
  'workflow|timeline|models|CareTimeline',
]);

// ─── Scanning helpers ────────────────────────────────────────────────────────

function stripJsComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

function listDomainFolders() {
  if (!fs.existsSync(DOMAINS_ROOT)) return [];
  return fs
    .readdirSync(DOMAINS_ROOT, { withFileTypes: true })
    .filter(e => e.isDirectory())
    .map(e => e.name);
}

function listDomains() {
  return listDomainFolders().filter(d => !UNMAPPED_DOMAIN_ALLOWLIST.has(d));
}

function parseDeclaredDeps(domainName) {
  const indexPath = path.join(DOMAINS_ROOT, domainName, 'index.js');
  if (!fs.existsSync(indexPath)) return [];
  const src = stripJsComments(fs.readFileSync(indexPath, 'utf8'));
  // BaseDomainModule constructor receives `{ ..., dependencies: [...] }`.
  // Captures the array body (tolerates multi-line + arbitrary whitespace).
  const m = src.match(/dependencies\s*:\s*\[([\s\S]*?)\]/);
  if (!m) return [];
  return [...m[1].matchAll(/['"]([\w-]+)['"]/g)].map(mm => mm[1]);
}

function walkJs(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkJs(full, out);
    else if (entry.isFile() && entry.name.endsWith('.js')) out.push(full);
  }
  return out;
}

// require('../../<targetDomain>/<subdir>/<rest>') — facade-bypass shape.
// Subdir matches the categories doctrine §1.2 marks as internal. Files
// living directly under `domains/X/` (e.g. `WorkflowEngine.js`) are not
// caught — those are arguably top-level public API alongside index.js.
const CROSS_DOMAIN_INTERNAL_RE =
  /require\s*\(\s*['"]\.\.\/\.\.\/([\w-]+)\/(models|services|repositories|routes|validators)\/([^'"]+)['"]\s*\)/g;

function collectFacadeBypasses() {
  const set = new Set();
  for (const dom of listDomains()) {
    const files = walkJs(path.join(DOMAINS_ROOT, dom));
    for (const f of files) {
      const src = stripJsComments(fs.readFileSync(f, 'utf8'));
      for (const m of src.matchAll(CROSS_DOMAIN_INTERNAL_RE)) {
        const [, targetDom, subdir, rest] = m;
        if (targetDom === dom) continue; // intra-domain
        if (UNMAPPED_DOMAIN_ALLOWLIST.has(targetDom)) continue; // _base etc.
        if (TIER[targetDom] === undefined) continue; // not a product domain
        const restNoExt = rest.replace(/\.js$/, '').replace(/\\/g, '/');
        set.add(`${dom}|${targetDom}|${subdir}|${restNoExt}`);
      }
    }
  }
  return set;
}

function detectCycles(graph) {
  const WHITE = 0;
  const GRAY = 1;
  const BLACK = 2;
  const color = new Map();
  const cycles = [];

  function dfs(node, stack) {
    color.set(node, GRAY);
    stack.push(node);
    for (const next of graph.get(node) || []) {
      const c = color.get(next);
      if (c === GRAY) {
        const i = stack.indexOf(next);
        cycles.push(stack.slice(i).concat(next).join(' → '));
      } else if (c === undefined || c === WHITE) {
        dfs(next, stack);
      }
    }
    stack.pop();
    color.set(node, BLACK);
  }

  for (const node of graph.keys()) {
    const c = color.get(node);
    if (c === undefined || c === WHITE) dfs(node, []);
  }
  return cycles;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('W354 module-dependency-direction drift guard', () => {
  describe('tier mapping', () => {
    it('every folder under backend/domains/ is either mapped to a tier or allowlisted', () => {
      const unmapped = listDomainFolders().filter(
        d => TIER[d] === undefined && !UNMAPPED_DOMAIN_ALLOWLIST.has(d)
      );
      if (unmapped.length > 0) {
        throw new Error(
          `${unmapped.length} domain folder(s) under backend/domains/ are not mapped to a tier ` +
            `in TIER nor allowlisted in UNMAPPED_DOMAIN_ALLOWLIST:\n` +
            unmapped.map(d => `  - ${d}`).join('\n') +
            `\n\nAdd each one to TIER (with an ADR-025 update justifying the tier) ` +
            `or to UNMAPPED_DOMAIN_ALLOWLIST (with a reason).`
        );
      }
    });

    it('TIER values are within [1, 8] (no tier inflation without ADR)', () => {
      for (const [dom, tier] of Object.entries(TIER)) {
        expect(tier).toBeGreaterThanOrEqual(1);
        expect(tier).toBeLessThanOrEqual(8);
        expect(Number.isInteger(tier)).toBe(true);
        // Sanity: avoid typos like name capitalization
        expect(dom).toBe(dom.toLowerCase());
      }
    });
  });

  describe('declared dependency direction (doctrine §2)', () => {
    it('every declared dep respects tier ordering (target tier ≤ source tier)', () => {
      const newViolations = [];
      for (const dom of listDomains()) {
        const srcTier = TIER[dom];
        const deps = parseDeclaredDeps(dom);
        for (const dep of deps) {
          const tgtTier = TIER[dep];
          if (tgtTier === undefined) continue; // not a mapped domain
          if (tgtTier > srcTier) {
            const key = `${dom}|${dep}`;
            if (!KNOWN_TIER_VIOLATIONS.has(key)) {
              newViolations.push({ key, srcTier, tgtTier });
            }
          }
        }
      }
      if (newViolations.length > 0) {
        const lines = newViolations
          .map(
            v =>
              `  - ${v.key.replace('|', ' → ')}  (tier ${v.srcTier} → tier ${v.tgtTier} REVERSES doctrine direction)`
          )
          .join('\n');
        throw new Error(
          `Found ${newViolations.length} NEW tier-direction violation(s):\n${lines}\n\n` +
            `Doctrine (docs/architecture/MODULE_DEPENDENCY_RULES.md §2): a tier-N module can ` +
            `only declare dependencies on tier ≤ N modules.\n\n` +
            `Fix options:\n` +
            `  (a) Move the data the higher-tier module needs to a lower tier (or to platform-core).\n` +
            `  (b) Invert via Domain Events (doctrine §3.2): the lower module subscribes to events ` +
            `emitted by the higher module instead of reading from it.\n` +
            `  (c) Re-tier the source domain in ADR-025 + TIER map (only if the doctrine mapping was wrong).\n\n` +
            `Do NOT add to KNOWN_TIER_VIOLATIONS without ADR-025 update + stakeholder sign-off.`
        );
      }
    });

    it('every entry in KNOWN_TIER_VIOLATIONS still violates direction (ratchet-down check)', () => {
      const stillViolating = new Set();
      for (const dom of listDomains()) {
        const srcTier = TIER[dom];
        for (const dep of parseDeclaredDeps(dom)) {
          const tgtTier = TIER[dep];
          if (tgtTier === undefined) continue;
          if (tgtTier > srcTier) stillViolating.add(`${dom}|${dep}`);
        }
      }
      const stale = [...KNOWN_TIER_VIOLATIONS].filter(k => !stillViolating.has(k));
      if (stale.length > 0) {
        throw new Error(
          `${stale.length} entry/entries in KNOWN_TIER_VIOLATIONS are stale ` +
            `(no longer present in source). Remove them in the same commit that ` +
            `refactored the violation:\n` +
            stale.map(s => `  - ${s.replace('|', ' → ')}`).join('\n')
        );
      }
    });
  });

  describe('no circular dependencies (doctrine §5)', () => {
    it('declared dependency graph is acyclic', () => {
      const graph = new Map();
      for (const dom of listDomains()) {
        graph.set(
          dom,
          parseDeclaredDeps(dom).filter(d => TIER[d] !== undefined)
        );
      }
      const cycles = detectCycles(graph);
      if (cycles.length > 0) {
        throw new Error(
          `${cycles.length} circular dependency/dependencies detected in declared graph:\n` +
            cycles.map(c => `  - ${c}`).join('\n') +
            `\n\nDoctrine §5: no circular deps. Either extract the shared piece to platform-core ` +
            `or break the cycle via Domain Events (A emits, B subscribes — no direct call back).`
        );
      }
    });
  });

  describe('facade respect (doctrine §1.2 + §7)', () => {
    it('no cross-domain require reaches into another domain internals', () => {
      const current = collectFacadeBypasses();
      const newBypasses = [...current].filter(k => !KNOWN_FACADE_BYPASSES.has(k));
      if (newBypasses.length > 0) {
        const lines = newBypasses
          .map(k => {
            const [from, to, sub, rest] = k.split('|');
            return `  - domains/${from}/** requires domains/${to}/${sub}/${rest}`;
          })
          .join('\n');
        throw new Error(
          `Found ${newBypasses.length} NEW facade-bypass occurrence(s):\n${lines}\n\n` +
            `Doctrine §1.2 + §7: cross-module access goes through the target's public ` +
            `index.js (or a documented top-level export like WorkflowEngine.js), NEVER into ` +
            `its models/services/repositories/routes/validators directly.\n\n` +
            `Fix options:\n` +
            `  (a) Add a public method on the target's index.js / service facade and call that ` +
            `instead.\n` +
            `  (b) Pass the needed entity in as a parameter from a higher layer (inversion of ` +
            `control).\n` +
            `  (c) Subscribe to a Domain Event the target module emits.\n\n` +
            `Do NOT add to KNOWN_FACADE_BYPASSES without ADR-025 update.`
        );
      }
    });

    it('every entry in KNOWN_FACADE_BYPASSES still appears in source (ratchet-down check)', () => {
      const current = collectFacadeBypasses();
      const stale = [...KNOWN_FACADE_BYPASSES].filter(k => !current.has(k));
      if (stale.length > 0) {
        throw new Error(
          `${stale.length} entry/entries in KNOWN_FACADE_BYPASSES are stale ` +
            `(no longer present in source). Remove them in the same commit that ` +
            `refactored the bypass:\n` +
            stale.map(s => `  - ${s.replace(/\|/g, ' → ')}`).join('\n')
        );
      }
    });
  });

  describe('sanity', () => {
    it('scanner finds the expected number of domains (catches accidental directory moves)', () => {
      const mapped = listDomains();
      expect(mapped.length).toBeGreaterThanOrEqual(20);
      expect(mapped.length).toBeLessThanOrEqual(40);
    });

    it('every domain folder mapped in TIER actually exists on disk', () => {
      const folders = new Set(listDomainFolders());
      const missing = Object.keys(TIER).filter(d => !folders.has(d));
      if (missing.length > 0) {
        throw new Error(
          `${missing.length} entry/entries in TIER reference a domain folder that does not exist ` +
            `under backend/domains/:\n` +
            missing.map(d => `  - ${d}`).join('\n') +
            `\n\nEither the folder was moved/deleted (update TIER + ADR-025) or the name is wrong.`
        );
      }
    });
  });
});
