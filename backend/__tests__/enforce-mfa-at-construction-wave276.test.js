'use strict';

/**
 * enforce-mfa-at-construction-wave276.test.js — Wave 276 (drift guard).
 *
 * Closes the 3rd silent-regression class identified by ADR-019:
 * a contributor copies an existing intelligence/*.service.js factory,
 * adds a new MFA-aware option (`enforceMfa`), wires the new service
 * into app.js but FORGETS the `enforceMfa: true` flag at the
 * construction site. The service ships with `enforceMfa: false`
 * (factory default for backwards compat), and the route-layer
 * `requireMfaTier` keeps protecting HTTP entry — BUT any non-HTTP
 * caller (cron, worker, CLI) silently bypasses the service-layer
 * defense-in-depth.
 *
 * The route drift guard (W273b) catches missing route-layer gates.
 * The scheduler drift guard (W275z) catches missing scheduler ↔
 * service method-name bindings. This guard closes the gap in
 * between: the app.js wiring layer where the factory's enforceMfa
 * option must be turned ON to actually take effect.
 *
 * ── How it works ─────────────────────────────────────────────────
 *
 * 1. Parse backend/app.js with @babel/parser.
 * 2. Pre-pass: walk every `const { X: Y } = require('./intelligence/…')`
 *    destructuring import and build an alias map. The W275u re-construction
 *    site at line ~2567 uses
 *    `const { createHikvisionEventParserService: createParserWithLock } = …`
 *    — without alias tracking we'd miss it.
 * 3. Main pass: every CallExpression whose callee resolves (via aliases or
 *    direct match) to a known MFA-aware factory MUST pass an ObjectExpression
 *    whose properties include `enforceMfa: true` (BooleanLiteral true).
 *
 * ── How to add a new MFA-aware service ───────────────────────────
 *
 *   1. Add the factory's exported name to MFA_AWARE_FACTORIES below.
 *   2. Add `enforceMfa: true` at every construction site in app.js.
 *   3. Add the service to ADR-019 §"Adopters" + bump count.
 *   4. Add the service to the route drift guard (W273b) for symmetry
 *      if it exposes HTTP endpoints.
 *
 * If a service is RETIRED, remove from MFA_AWARE_FACTORIES — the
 * registry-vs-call-sites test will catch a stale registry entry.
 *
 * ── Scope ────────────────────────────────────────────────────────
 *
 * This guard covers the FACTORY+CLOSURE pattern (intelligence/*.service.js).
 * The CLASS+STATIC-METHODS pattern (services/hr/zktecoService.js W275s)
 * uses a module-level constant `_ENFORCE_MFA_SYNC = true` set at module
 * load — it has no construction site and can't be drift-checked from
 * app.js. Its safety net is the `__setEnforceMfaSync` test export plus
 * the W275s baseline test asserting the default is `true`.
 */

const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

const APP_JS = path.join(__dirname, '..', 'app.js');

/**
 * Every factory whose intelligence/*.service.js export accepts an
 * `enforceMfa` option AND for which app.js MUST set it true. Order
 * matches the order each service adopted the pattern (W275/b/c/d/f/q/r/t/u/w).
 */
const MFA_AWARE_FACTORIES = Object.freeze([
  // W275  — payroll-period
  'createPayrollPeriodService',
  // W275b — fraud-detection
  'createHikvisionFraudDetectionService',
  // W275c — face-enrollment
  'createHikvisionFaceEnrollmentService',
  // W275d — attendance-reconciliation
  'createAttendanceReconciliationService',
  // W275f — branch-config
  'createHikvisionBranchConfigService',
  // W275q — fraud-score
  'createHikvisionFraudScoreService',
  // W275r — sync-worker
  'createHikvisionSyncWorker',
  // W275t — health-monitor
  'createHikvisionHealthService',
  // W275u — event-parser (also re-constructed via alias `createParserWithLock`)
  'createHikvisionEventParserService',
  // W275w — anomaly-history
  'createHikvisionAnomalyHistoryService',
]);

function _parseAppJs() {
  const source = fs.readFileSync(APP_JS, 'utf8');
  return parser.parse(source, {
    sourceType: 'unambiguous',
    allowReturnOutsideFunction: true,
    allowAwaitOutsideFunction: true,
    errorRecovery: false,
  });
}

/**
 * Walk every `const { X: Y } = require(...)` and capture aliases for
 * known MFA-aware factory names. Returns Map<localName, canonicalName>.
 * If no alias is used (X without : Y), localName === canonicalName and
 * the entry is still recorded so the call-site walker has a single
 * lookup path.
 */
function _collectAliases(ast) {
  const aliases = new Map();
  const knownSet = new Set(MFA_AWARE_FACTORIES);

  traverse(ast, {
    VariableDeclarator(p) {
      const { id, init } = p.node;
      if (!id || id.type !== 'ObjectPattern') return;
      if (!init || init.type !== 'CallExpression') return;
      const callee = init.callee;
      if (!callee || callee.type !== 'Identifier' || callee.name !== 'require') return;

      for (const prop of id.properties) {
        if (prop.type !== 'ObjectProperty') continue;
        if (!prop.key || prop.key.type !== 'Identifier') continue;
        const canonicalName = prop.key.name;
        if (!knownSet.has(canonicalName)) continue;

        let localName = canonicalName;
        if (prop.value && prop.value.type === 'Identifier') {
          localName = prop.value.name;
        }
        aliases.set(localName, canonicalName);
      }
    },
  });

  // Also register the identity mapping for any factory that's used
  // without destructuring rename (covers most call sites).
  for (const name of MFA_AWARE_FACTORIES) {
    if (!aliases.has(name)) aliases.set(name, name);
  }

  return aliases;
}

/**
 * Walk every CallExpression whose callee.name is in aliases. For each
 * hit, capture { canonicalName, localName, line, hasEnforceMfa }.
 * `hasEnforceMfa` is true iff the first argument is an ObjectExpression
 * with a property `enforceMfa: true` (literal).
 */
function _collectConstructionSites(ast, aliases) {
  const sites = [];

  traverse(ast, {
    CallExpression(p) {
      const callee = p.node.callee;
      if (!callee || callee.type !== 'Identifier') return;
      const localName = callee.name;
      const canonicalName = aliases.get(localName);
      if (!canonicalName) return;

      const opts = p.node.arguments[0];
      let hasEnforceMfa = false;
      if (opts && opts.type === 'ObjectExpression') {
        hasEnforceMfa = opts.properties.some(
          prop =>
            prop.type === 'ObjectProperty' &&
            prop.key &&
            ((prop.key.type === 'Identifier' && prop.key.name === 'enforceMfa') ||
              (prop.key.type === 'StringLiteral' && prop.key.value === 'enforceMfa')) &&
            prop.value &&
            prop.value.type === 'BooleanLiteral' &&
            prop.value.value === true
        );
      }

      sites.push({
        canonicalName,
        localName,
        line: (p.node.loc && p.node.loc.start.line) || -1,
        hasEnforceMfa,
      });
    },
  });

  return sites;
}

describe('Wave 276 — service-layer MFA enforceMfa drift guard on app.js construction sites', () => {
  let ast;
  let aliases;
  let sites;

  beforeAll(() => {
    ast = _parseAppJs();
    aliases = _collectAliases(ast);
    sites = _collectConstructionSites(ast, aliases);
  });

  test('app.js parses cleanly and at least one MFA-aware construction site is found', () => {
    expect(ast).toBeTruthy();
    expect(aliases.size).toBeGreaterThanOrEqual(MFA_AWARE_FACTORIES.length);
    expect(sites.length).toBeGreaterThan(0);
  });

  test('every MFA-aware factory in the registry has at least one call site in app.js', () => {
    const seen = new Set(sites.map(s => s.canonicalName));
    const missing = MFA_AWARE_FACTORIES.filter(name => !seen.has(name));
    if (missing.length) {
      throw new Error(
        `MFA-aware factories declared in MFA_AWARE_FACTORIES but never constructed in app.js:\n  ` +
          missing.join('\n  ') +
          `\n\nEither:\n` +
          `  (a) remove the entry from MFA_AWARE_FACTORIES (the service was retired), OR\n` +
          `  (b) add the construction site to app.js with \`enforceMfa: true\`.\n\n` +
          `Silent drift here means the service ships with enforceMfa=false (factory default for ` +
          `backwards compat) and the service-layer defense-in-depth is OFF.`
      );
    }
    expect(missing).toEqual([]);
  });

  test('every construction site of an MFA-aware factory passes enforceMfa: true', () => {
    const violations = sites.filter(s => !s.hasEnforceMfa);
    if (violations.length) {
      const lines = violations
        .map(v => `  • ${v.canonicalName} (called as ${v.localName}) at app.js:${v.line}`)
        .join('\n');
      throw new Error(
        `Construction sites missing \`enforceMfa: true\` in app.js:\n${lines}\n\n` +
          `Add \`enforceMfa: true\` to the options object literal at each site.\n` +
          `Defense-in-depth rationale: the route-layer requireMfaTier middleware (W273) ` +
          `only fires on HTTP requests. When a non-HTTP caller (cron, worker, CLI) invokes ` +
          `the same service method, only the service-layer enforceMfa flag protects the ` +
          `mutation. Shipping with enforceMfa=false at construction = silently disabling that ` +
          `safety net. See ADR-019 §"Service Layer (intelligence/<service>.service.js)".`
      );
    }
    expect(violations).toEqual([]);
  });

  // Sanity: alias resolution actually picks up the W275u
  // `createHikvisionEventParserService: createParserWithLock` rename.
  // If the alias map silently drops this entry, the re-construction
  // site at line ~2567 would be invisible to the violation scanner.
  test('alias map captures the createParserWithLock rename (W275u re-construction)', () => {
    const aliasEntry = aliases.get('createParserWithLock');
    expect(aliasEntry).toBe('createHikvisionEventParserService');

    // And both call sites for the parser factory are visible:
    // the initial Phase 3 site (Identifier) AND the Phase 4 re-construction
    // (aliased Identifier).
    const parserSites = sites.filter(s => s.canonicalName === 'createHikvisionEventParserService');
    expect(parserSites.length).toBeGreaterThanOrEqual(2);
    // Both must pass enforceMfa.
    for (const ps of parserSites) {
      expect(ps.hasEnforceMfa).toBe(true);
    }
  });

  // Synthetic positive control: prove the scanner ACTUALLY catches a
  // missing flag. We construct a tiny fixture AST equivalent to
  // `createPayrollPeriodService({ periodModel: M, logger: l })`
  // (no enforceMfa) and assert the violation detector flags it.
  test('scanner self-test: synthetic missing-flag site is flagged', () => {
    const fixture = `
      const { createPayrollPeriodService } = require('payroll-period-fixture');
      const svc = createPayrollPeriodService({ periodModel: M, logger: l });
    `;
    const fixtureAst = parser.parse(fixture, { sourceType: 'unambiguous' });
    const fixtureAliases = _collectAliases(fixtureAst);
    const fixtureSites = _collectConstructionSites(fixtureAst, fixtureAliases);
    expect(fixtureSites).toHaveLength(1);
    expect(fixtureSites[0].canonicalName).toBe('createPayrollPeriodService');
    expect(fixtureSites[0].hasEnforceMfa).toBe(false); // ← the bug we'd catch
  });

  // Synthetic negative control: prove the scanner doesn't false-positive
  // when enforceMfa IS present.
  test('scanner self-test: synthetic with-flag site is NOT flagged', () => {
    const fixture = `
      const { createPayrollPeriodService } = require('payroll-period-fixture');
      const svc = createPayrollPeriodService({ periodModel: M, logger: l, enforceMfa: true });
    `;
    const fixtureAst = parser.parse(fixture, { sourceType: 'unambiguous' });
    const fixtureAliases = _collectAliases(fixtureAst);
    const fixtureSites = _collectConstructionSites(fixtureAst, fixtureAliases);
    expect(fixtureSites).toHaveLength(1);
    expect(fixtureSites[0].hasEnforceMfa).toBe(true);
  });

  // Synthetic alias control: prove the scanner resolves a renamed
  // destructuring import the same way as W275u's createParserWithLock.
  test('scanner self-test: aliased call site resolves to canonical name', () => {
    const fixture = `
      const { createHikvisionEventParserService: createParserWithLock } = require('event-parser-fixture');
      const svc = createParserWithLock({ rawEventModel: R, enforceMfa: true });
    `;
    const fixtureAst = parser.parse(fixture, { sourceType: 'unambiguous' });
    const fixtureAliases = _collectAliases(fixtureAst);
    expect(fixtureAliases.get('createParserWithLock')).toBe('createHikvisionEventParserService');
    const fixtureSites = _collectConstructionSites(fixtureAst, fixtureAliases);
    expect(fixtureSites).toHaveLength(1);
    expect(fixtureSites[0].canonicalName).toBe('createHikvisionEventParserService');
    expect(fixtureSites[0].localName).toBe('createParserWithLock');
    expect(fixtureSites[0].hasEnforceMfa).toBe(true);
  });
});
