#!/usr/bin/env node
'use strict';

/**
 * check-route-shadowing.js — static drift guard for Express route-ordering bugs.
 *
 * WHY: Express matches routes in declaration order. A literal route declared
 * AFTER a same-shape `:param` sibling is UNREACHABLE — the param route wins and
 * (commonly) tries to cast the literal segment as a Mongo ObjectId → 500.
 * E.g. `GET /devices/:id` declared before `GET /devices/health-check` makes
 * /devices/health-check return "Cast to ObjectId failed for value health-check".
 * Found app-wide while auditing the HR surface (biometric-attendance,
 * branch-enhanced, documents.smart, electronic-directives, enterpriseProPlus,
 * dashboardWidget, …).
 *
 * WHAT: for each route file under routes/ (recursive), parse the ordered
 * `router.METHOD('<path>', …)` declarations. For each LITERAL path, flag it if
 * an EARLIER route of the same method has the same segment count and a param
 * pattern that matches it (each earlier segment is `:param` or equals the
 * literal's segment, with ≥1 param). Pure source analysis — no DB, no boot.
 *
 * Exit 0 when findings ⊆ baseline; exit 1 on any NEW shadowed route OR any
 * STALE baseline entry (ratchet-down, W325c lineage). `--json` prints findings.
 */

const fs = require('fs');
const path = require('path');

const ROUTES_DIR = path.join(__dirname, '..', 'routes');

// Pre-existing shadowed routes pending per-file reorder waves (ratchet-DOWN
// only — never add new entries; fix + remove). Format: "relFile::METHOD::path".
// W531 fixed biometric-attendance + branch-enhanced; the rest chip down next.
const BASELINE = new Set([
  'routes/ai-recommendations.routes.js::GET::/metrics',
  'routes/archive.routes.js::POST::/bulk/archive',
  'routes/community.js::GET::/sessions/upcoming',
  'routes/community.js::GET::/sessions/stats',
  'routes/community.js::GET::/library/search',
  'routes/community.js::GET::/library/stats',
  'routes/complaints-enhanced.routes.js::GET::/categories',
  'routes/complaints-enhanced.routes.js::GET::/sla-configs',
  'routes/complaints-enhanced.routes.js::GET::/feedback',
  'routes/dashboardWidget.routes.js::GET::/templates',
  'routes/dashboardWidget.routes.js::GET::/themes',
  'routes/dashboardWidget.routes.js::GET::/stats',
  'routes/dashboardWidget.routes.js::GET::/health',
  'routes/documentAdvanced.routes.js::GET::/watermarks/templates',
  'routes/documentAdvanced.routes.js::GET::/qr/stats',
  'routes/electronic-directives.routes.js::GET::/templates',
  'routes/electronic-directives.routes.js::GET::/stats',
  'routes/enterprisePro.routes.js::PUT::/project-pro/tasks/reorder',
  'routes/enterpriseProPlus.routes.js::GET::/facilities/leases',
  'routes/enterpriseProPlus.routes.js::GET::/facilities/utilities',
  'routes/gradebook.routes.js::GET::/reports',
  'routes/managementReview.routes.js::GET::/analytics',
  'routes/measurements.routes.js::GET::/categories',
  'routes/measurements.routes.js::GET::/programs',
  'routes/measurements.routes.js::GET::/dashboard',
  'routes/measurements.routes.js::POST::/batch-assessment',
  'routes/media.routes.js::GET::/albums',
  'routes/media.routes.js::GET::/tags',
  'routes/media.routes.js::GET::/trash',
  'routes/montessori.js::GET::/students',
  'routes/montessori.js::GET::/plans',
  'routes/montessori.js::GET::/sessions',
  'routes/montessori.js::GET::/evaluations',
  'routes/montessori.js::GET::/activities',
  'routes/montessori.js::GET::/team',
  'routes/montessori.js::GET::/parents',
  'routes/montessori.js::GET::/media',
  'routes/montessori.js::GET::/reports',
  'routes/scheduling-module.routes.js::GET::/appointments/calendar',
  'routes/student-certificates.routes.js::GET::/types',
  'routes/student-certificates.routes.js::GET::/stats',
  'routes/student-complaints.routes.js::GET::/categories',
  'routes/student-complaints.routes.js::GET::/stats',
  'routes/student-events.routes.js::GET::/calendar',
  'routes/student-events.routes.js::GET::/stats',
  'routes/student-management.routes.js::GET::/classes',
  'routes/student-management.routes.js::GET::/stats',
  'routes/ticketing-system.routes.js::GET::/sla-configs',
  'routes/ticketing-system.routes.js::GET::/escalation-rules',
  'routes/ticketing-system.routes.js::GET::/auto-assignments',
  'routes/volunteer.routes.js::GET::/opportunities',
  'routes/volunteer.routes.js::GET::/assignments',
  'routes/volunteer.routes.js::GET::/training',
  'routes/volunteer.routes.js::GET::/recognitions',
  'routes/workflow.routes.js::POST::/tasks/bulk/complete',
  'routes/workflowPro.routes.js::GET::/forms/field-types',
  'routes/workflowPro.routes.js::GET::/forms/stats',
  'routes/workflowPro.routes.js::GET::/sla-policies/dashboard',
  'routes/workflowPro.routes.js::GET::/sla-policies/stats',
  'routes/workflowPro.routes.js::GET::/approval-chains/instances',
  'routes/workflowPro.routes.js::GET::/approval-chains/stats',
  'routes/workflowPro.routes.js::GET::/approval-chains/my-pending',
  'routes/workflowPro.routes.js::GET::/automations/logs',
  'routes/workflowPro.routes.js::GET::/automations/stats',
  'routes/workflowPro.routes.js::GET::/automations/events',
  'routes/workflowPro.routes.js::GET::/automations/actions',
]);

const METHOD_RE = /\brouter\.(get|post|put|patch|delete|all)\s*\(\s*['"`]([^'"`]+)['"`]/g;

function listRouteFiles(dir, acc) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === '_archived' || e.name === 'node_modules') continue;
    const fp = path.join(dir, e.name);
    if (e.isDirectory()) listRouteFiles(fp, acc);
    else if (
      e.name.endsWith('.routes.js') ||
      (e.name.endsWith('.js') && dir.split(path.sep).includes('routes'))
    )
      acc.push(fp);
  }
  return acc;
}

function segs(p) {
  return p.split('/').filter(Boolean);
}
function isLiteral(p) {
  return !p.includes(':') && !p.includes('*');
}
// Does an earlier param-pattern `pat` match (and therefore shadow) literal `lit`?
function paramShadows(pat, lit) {
  const a = segs(pat);
  const b = segs(lit);
  if (a.length !== b.length) return false;
  let hasParam = false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith(':')) hasParam = true;
    else if (a[i] !== b[i]) return false; // literal mismatch → no shadow
  }
  return hasParam;
}

function analyzeFile(file) {
  const src = fs.readFileSync(file, 'utf8');
  const routes = [];
  let m;
  METHOD_RE.lastIndex = 0;
  while ((m = METHOD_RE.exec(src))) routes.push({ method: m[1], path: m[2] });

  const findings = [];
  for (let i = 0; i < routes.length; i++) {
    const r = routes[i];
    if (!isLiteral(r.path)) continue;
    for (let j = 0; j < i; j++) {
      const p = routes[j];
      if (p.method !== r.method) continue;
      if (p.path.includes('*')) continue;
      if (!isLiteral(p.path) && paramShadows(p.path, r.path)) {
        findings.push({ method: r.method.toUpperCase(), literal: r.path, shadowedBy: p.path });
        break;
      }
    }
  }
  return findings;
}

function main() {
  const json = process.argv.includes('--json');
  const files = listRouteFiles(ROUTES_DIR, []);
  const current = new Set();
  const detail = [];
  for (const file of files) {
    const rel = path.relative(path.join(__dirname, '..'), file).replace(/\\/g, '/');
    for (const f of analyzeFile(file)) {
      const key = `${rel}::${f.method}::${f.literal}`;
      current.add(key);
      detail.push({ key, file: rel, ...f });
    }
  }

  const newOnes = detail.filter(d => !BASELINE.has(d.key));
  const stale = [...BASELINE].filter(k => !current.has(k));

  if (json) {
    console.log(JSON.stringify({ total: detail.length, newOnes, stale }, null, 2));
  } else {
    console.log(
      `Scanned ${files.length} route files; ${detail.length} shadowed literal route(s) total (baseline ${BASELINE.size}).`
    );
    if (newOnes.length) {
      console.log(
        `\n✗ ${newOnes.length} NEW shadowed route(s) — a literal declared after a matching :param sibling is unreachable:`
      );
      for (const d of newOnes)
        console.log(`  ${d.file}  ${d.method} ${d.literal}  (shadowed by ${d.shadowedBy})`);
      console.log(
        `\n  Fix: move the literal route's declaration ABOVE the :param route in the file.`
      );
    }
    if (stale.length) {
      console.log(`\n✗ ${stale.length} STALE baseline entr(y/ies) — fixed; remove from BASELINE:`);
      for (const k of stale) console.log(`  ${k}`);
    }
    if (!newOnes.length && !stale.length)
      console.log('✓ No new route-shadowing; baseline in sync.');
  }

  process.exit(newOnes.length || stale.length ? 1 : 0);
}

if (require.main === module) main();

module.exports = { segs, isLiteral, paramShadows, analyzeFile, BASELINE };
