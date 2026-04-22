#!/usr/bin/env node
/**
 * rbac-export-matrix.js — Phase-7 Commit 10 docs helper.
 *
 * Emits the full role × resource × action permission matrix as CSV
 * (or JSON). Used by CBAHI / SCFHS / MOH auditors who ask for a
 * human-readable snapshot of who can do what. Pulled live from
 * `config/rbac.config.js` so the CSV is always in sync with the
 * running config — no drift between a wiki page and reality.
 *
 * Output shape (CSV):
 *   role,resource,action,hierarchy_level
 *
 * One row per (role, resource, action) triple where the role has
 * permission after walking the ROLE_HIERARCHY inheritance chain.
 *
 * Usage:
 *   node scripts/rbac-export-matrix.js                   # CSV to stdout
 *   node scripts/rbac-export-matrix.js --json            # JSON to stdout
 *   node scripts/rbac-export-matrix.js --role=hr         # filter to one role
 *   node scripts/rbac-export-matrix.js --resource=invoices # filter to one resource
 *   node scripts/rbac-export-matrix.js --out=matrix.csv  # write to file
 *
 * Exit codes:
 *   0  written successfully
 *   1  filter matched nothing (likely typo)
 *   2  internal error
 */

'use strict';

const fs = require('fs');
const {
  ROLES,
  ROLE_HIERARCHY,
  ROLE_PERMISSIONS,
  ACTIONS,
  RESOURCES,
} = require('../config/rbac.config');

const args = process.argv.slice(2);
const JSON_MODE = args.includes('--json');
const roleFilter = args.find(a => a.startsWith('--role='));
const resourceFilter = args.find(a => a.startsWith('--resource='));
const outFilter = args.find(a => a.startsWith('--out='));
const ROLE = roleFilter ? roleFilter.split('=')[1] : null;
const RESOURCE = resourceFilter ? resourceFilter.split('=')[1] : null;
const OUT = outFilter ? outFilter.split('=')[1] : null;

if (args.includes('--help') || args.includes('-h')) {
  process.stdout.write(
    [
      'rbac-export-matrix — dump the full RBAC permission matrix',
      '',
      'Exit codes:',
      '  0  written successfully',
      '  1  filter matched nothing',
      '  2  internal error',
      '',
      'Usage:',
      '  node scripts/rbac-export-matrix.js',
      '  node scripts/rbac-export-matrix.js --json',
      '  node scripts/rbac-export-matrix.js --role=hr',
      '  node scripts/rbac-export-matrix.js --resource=invoices',
      '  node scripts/rbac-export-matrix.js --out=matrix.csv',
      '',
    ].join('\n')
  );
  process.exit(0);
}

/**
 * Resolve the effective permission set for one role, walking the
 * inheritance chain. Returns Map<resource, Set<action>>.
 *
 * Exported for unit testing.
 */
function resolvePermissions(role) {
  const effective = new Map();
  const seen = new Set();

  function merge(current) {
    if (seen.has(current)) return;
    seen.add(current);
    const direct = ROLE_PERMISSIONS[current] || {};
    for (const [resource, actions] of Object.entries(direct)) {
      const existing = effective.get(resource) || new Set();
      for (const a of actions) existing.add(a);
      effective.set(resource, existing);
    }
    const meta = ROLE_HIERARCHY[current];
    if (meta && Array.isArray(meta.inherits)) {
      for (const parent of meta.inherits) merge(parent);
    }
  }
  merge(role);
  return effective;
}

/**
 * Expand wildcards: `{ '*': ['*'] }` or `{ resource: ['*'] }` gets
 * flattened to every concrete (resource, action) pair so the CSV
 * stays row-per-permission for auditors.
 *
 * Exported for unit testing.
 */
function expandWildcards(effective) {
  const allResources = Object.values(RESOURCES);
  const allActions = Object.values(ACTIONS);
  const expanded = new Map();

  for (const [resource, actionSet] of effective.entries()) {
    if (resource === '*') {
      const targets = [...actionSet].some(a => a === '*') ? allActions : [...actionSet];
      for (const r of allResources) {
        const cur = expanded.get(r) || new Set();
        for (const a of targets) cur.add(a);
        expanded.set(r, cur);
      }
    } else {
      const targets = [...actionSet].some(a => a === '*') ? allActions : [...actionSet];
      const cur = expanded.get(resource) || new Set();
      for (const a of targets) cur.add(a);
      expanded.set(resource, cur);
    }
  }
  return expanded;
}

/**
 * Produce the flat matrix rows: { role, resource, action, level }.
 * Exported for unit testing (no I/O).
 */
function buildMatrix({ roleFilter: rf = null, resourceFilter: resf = null } = {}) {
  const rows = [];
  const roles = Object.values(ROLES)
    .filter(r => !rf || r === rf)
    .sort();
  for (const role of roles) {
    const level = ROLE_HIERARCHY[role]?.level ?? 0;
    const resolved = expandWildcards(resolvePermissions(role));
    const resources = [...resolved.keys()].filter(r => !resf || r === resf).sort();
    for (const resource of resources) {
      const actions = [...resolved.get(resource)].sort();
      for (const action of actions) {
        rows.push({ role, resource, action, level });
      }
    }
  }
  return rows;
}

function toCSV(rows) {
  const lines = ['role,resource,action,hierarchy_level'];
  for (const r of rows) {
    lines.push(`${r.role},${r.resource},${r.action},${r.level}`);
  }
  return lines.join('\n') + '\n';
}

function main() {
  const rows = buildMatrix({ roleFilter: ROLE, resourceFilter: RESOURCE });
  if (rows.length === 0) {
    const hint = [];
    if (ROLE) hint.push(`role=${ROLE}`);
    if (RESOURCE) hint.push(`resource=${RESOURCE}`);
    process.stderr.write(`no rows match (${hint.join(', ') || 'no filters'})\n`);
    return 1;
  }
  const output = JSON_MODE ? JSON.stringify(rows, null, 2) + '\n' : toCSV(rows);
  if (OUT) {
    fs.writeFileSync(OUT, output, 'utf8');
    process.stderr.write(`wrote ${rows.length} rows to ${OUT}\n`);
  } else {
    process.stdout.write(output);
  }
  return 0;
}

module.exports = { resolvePermissions, expandWildcards, buildMatrix, toCSV };

if (require.main === module) {
  try {
    process.exit(main());
  } catch (err) {
    process.stderr.write(`rbac-export-matrix failed: ${err.message}\n`);
    process.exit(2);
  }
}
