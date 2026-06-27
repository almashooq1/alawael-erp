'use strict';
/**
 * check-enum-literal-queries — W1487 (on-demand backend audit, NOT in pre-push).
 *
 * WHY: the "W1481 bug class" — a Mongoose count/filter query that hard-codes a
 * `status` (etc.) value which is NOT in the target model's enum. Mongoose does
 * not error on this; the query just silently matches 0 documents, so the KPI /
 * dashboard / filter is permanently wrong. Found 4 real instances this way:
 *   - traffic-accidents /stats `status:'open'` + `$severity` (W1481, #616)
 *   - facilities rooms `status:'under_maintenance'` → 'maintenance' (W1486, #623)
 *   - warehouse low-stock `status:'low'` → 'low_stock' (W1486, #623)
 *   - (+ ~15 more needing domain triage — Communication/Document/Notification/WA)
 *
 * HOW: index every model's `<field>: { enum: [...] }` (also resolving an
 * `enum: SOME_CONST` to a same-file `const SOME_CONST = [...]`), keyed by the
 * EXACT relative path from models/ (basename keying is WRONG — there are 3
 * Trip.js and 2 Document.js models) AND by registered model name. Then scan
 * routes for `<Recv>.<finder>({ ... <field>: '<literal>' ... })`, resolve
 * <Recv> via its `require('../models/<path>')` (exact) or
 * `safeModel('Name')` / `mongoose.model('Name')`, and flag literals not in the
 * resolved enum. Conservative: only flags when the receiver resolves to a model
 * with that field's enum — dynamic/unresolved receivers are skipped (no false
 * positive). Models with multiple enum blocks for one field are UNIONed (so a
 * value valid in any block is accepted).
 *
 * USAGE:
 *   node scripts/check-enum-literal-queries.js            # human-readable
 *   node scripts/check-enum-literal-queries.js --json     # machine-readable
 * EXIT: 0 = no mismatches; 1 = mismatch(es) found (run during cleanup waves).
 *
 * INTENTIONALLY ON-DEMAND (not pre-push): heuristic resolution can drift on new
 * model/route idioms; keep it out of the blocking hook to avoid false-red CI.
 */

const fs = require('fs');
const path = require('path');

const FIELDS = ['status', 'state', 'paymentStatus', 'type', 'severity', 'priority'];

function walk(dir, out = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (
      e.name === 'node_modules' ||
      e.name.startsWith('_archived') ||
      e.name === 'tests' ||
      e.name === '__tests__'
    ) {
      continue;
    }
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.js')) out.push(p);
  }
  return out;
}

function extractFieldEnums(src) {
  const perField = {};
  for (const field of FIELDS) {
    const re = new RegExp(
      `\\b${field}\\s*:\\s*\\{[\\s\\S]{0,250}?enum\\s*:\\s*(\\[[\\s\\S]{0,400}?\\]|[A-Z_][A-Z0-9_]*)`,
      'g'
    );
    let m;
    while ((m = re.exec(src))) {
      const raw = m[1];
      let vals = [];
      if (raw.startsWith('[')) {
        vals = [...raw.matchAll(/'([^']+)'|"([^"]+)"/g)].map(x => x[1] ?? x[2]);
      } else {
        const cre = new RegExp(
          `(?:const|var|let)\\s+${raw}\\s*=\\s*(?:Object\\.freeze\\()?\\s*\\[([\\s\\S]{0,500}?)\\]`
        );
        const cm = cre.exec(src);
        if (cm) vals = [...cm[1].matchAll(/'([^']+)'|"([^"]+)"/g)].map(x => x[1] ?? x[2]);
      }
      if (vals.length) {
        perField[field] = perField[field] || new Set();
        vals.forEach(v => perField[field].add(v));
      }
    }
  }
  return perField;
}

function buildEnumIndex(modelsDir) {
  const pathEnums = {}; // 'Fleet/Trip' -> {field -> Set}
  const nameEnums = {}; // model name -> {field -> Set}
  for (const mf of walk(modelsDir)) {
    const src = fs.readFileSync(mf, 'utf8');
    const relKey = path.relative(modelsDir, mf).replace(/\\/g, '/').replace(/\.js$/, '');
    const perField = extractFieldEnums(src);
    if (!Object.keys(perField).length) continue;
    pathEnums[relKey] = perField;
    for (const nm of src.matchAll(/mongoose\.model\(\s*['"]([^'"]+)['"]/g)) {
      nameEnums[nm[1]] = perField;
    }
  }
  return { pathEnums, nameEnums };
}

function scanRoutes(routesDir, { pathEnums, nameEnums }, rootForRel) {
  const findings = [];
  for (const rf of walk(routesDir)) {
    const src = fs.readFileSync(rf, 'utf8');
    const recv = {};
    for (const m of src.matchAll(
      /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*require\([^)]*models\/([A-Za-z0-9_./-]+)['"]\)/g
    )) {
      const relKey = m[2].replace(/\\/g, '/').replace(/\.js$/, '');
      if (pathEnums[relKey]) recv[m[1]] = pathEnums[relKey];
    }
    for (const m of src.matchAll(
      /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:mongoose\.model|safeModel|safeRequire)\(\s*['"]([^'"]+)['"]/g
    )) {
      if (nameEnums[m[2]]) recv[m[1]] = nameEnums[m[2]];
    }
    for (const m of src.matchAll(
      /([A-Za-z_$][\w$]*)\.(?:countDocuments|find|findOne|updateMany|updateOne|deleteMany)\(\s*\{([^{}]{0,300}?)\}/g
    )) {
      const enums = recv[m[1]];
      if (!enums) continue;
      for (const field of FIELDS) {
        const fm = new RegExp(`\\b${field}\\s*:\\s*'([^']+)'`).exec(m[2]);
        if (fm && enums[field] && !enums[field].has(fm[1])) {
          const line = src.slice(0, m.index).split('\n').length;
          findings.push({
            file: path.relative(rootForRel, rf).replace(/\\/g, '/'),
            line,
            receiver: m[1],
            field,
            value: fm[1],
            enum: [...enums[field]],
          });
        }
      }
    }
  }
  return findings;
}

function audit(backendRoot) {
  const idx = buildEnumIndex(path.join(backendRoot, 'models'));
  const findings = scanRoutes(path.join(backendRoot, 'routes'), idx, backendRoot);
  return { modelsIndexed: Object.keys(idx.pathEnums).length, findings };
}

module.exports = { extractFieldEnums, buildEnumIndex, scanRoutes, audit, FIELDS };

if (require.main === module) {
  const json = process.argv.includes('--json');
  const root = path.resolve(__dirname, '..');
  const { modelsIndexed, findings } = audit(root);
  if (json) {
    process.stdout.write(
      JSON.stringify({ modelsIndexed, count: findings.length, findings }, null, 2) + '\n'
    );
  } else if (!findings.length) {
    console.log(`check-enum-literal-queries — models indexed: ${modelsIndexed}`);
    console.log('  ✓ no enum-literal query mismatches detected (W1481 class clean).');
  } else {
    console.log(`check-enum-literal-queries — models indexed: ${modelsIndexed}`);
    console.log(
      `  ✗ ${findings.length} enum-literal query mismatch(es) (query silently matches 0 docs):`
    );
    for (const f of findings) {
      console.log(
        `    ${f.file}:${f.line}  ${f.receiver}.{${f.field}:'${f.value}'} — enum=[${f.enum.join(',')}]`
      );
    }
  }
  process.exit(findings.length ? 1 : 0);
}
