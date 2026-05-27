/**
 * W506 — close tenant-takeover + mass-assignment via raw req.body in
 * Mongoose update calls.
 *
 * Pattern found across 38 call sites in 38 backend/routes files:
 *
 *   await Model.findOneAndUpdate(filter, req.body, { ... })
 *
 * (also findByIdAndUpdate / updateOne / updateMany / replaceOne).
 *
 * What raw `req.body` lets an authenticated caller do:
 *
 *   1. Tenant-takeover via branchId rewrite. The query filter
 *      `{ _id: req.params.id, branchId: req.user.branchId }` ensures
 *      the doc selected IS in the caller's tenant. But once selected,
 *      raw `req.body` can include `branchId: '<other-tenant>'` and
 *      Mongoose will dutifully relocate the doc out of the caller's
 *      tenant. Net effect: silent data-relocation attack — caller
 *      can move a doc into another tenant where they no longer have
 *      jurisdiction (or out to a tenant they DO control elsewhere).
 *
 *   2. Privilege escalation via role/permissions/isAdmin rewrite on
 *      Models that have those fields (some non-User models still
 *      carry role fields for actor history).
 *
 *   3. Mass-assignment of server-controlled meta: createdBy / createdAt /
 *      _id / __v / passwordHash / etc.
 *
 *   4. Prototype pollution via __proto__ injection (Express body-parser
 *      doesn't strip __proto__ by default; some downstream consumers
 *      walking the resulting Mongoose doc could be tricked).
 *
 * Fix: import `stripUpdateMeta` from `utils/sanitize.js` and wrap the
 * second argument:
 *
 *   - await Model.findOneAndUpdate(filter, req.body, opts)
 *   + await Model.findOneAndUpdate(filter, stripUpdateMeta(req.body), opts)
 *
 * `stripUpdateMeta` is the canonical deny-list (centralised since
 * earlier waves): _id / __v / id / createdBy / createdAt / updatedAt /
 * role / roles / isAdmin / isSuperAdmin / permissions / password /
 * passwordHash / __proto__ / constructor / prototype.
 *
 * Routes also responsible for tenant-takeover defense should
 * ADDITIONALLY `delete body.branchId` after the strip — stripUpdateMeta
 * does NOT touch branchId because some models legitimately migrate
 * docs cross-branch via explicit admin tooling. The W506
 * aiCommunication fix demonstrates the full two-step pattern.
 *
 * Drift guard: this test scans backend/routes/ for any update-method
 * call whose second positional argument is bare `req.body` (no
 * stripUpdateMeta wrap). Two-step matching to avoid false positives:
 *
 *   1. Collect every `<method>(` opening.
 *   2. Parse forward to find the matching `)` (depth-aware so nested
 *      parens don't confuse), then split args at top-level commas.
 *   3. If arg #2 (the update payload) is exactly `req.body`, flag.
 *
 * Service-layer calls (`await svc.foo(id, req.body)`) are NOT in
 * scope — that's a separate audit class (service-layer responsibility
 * to sanitise). Only direct Mongoose update calls in route files.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROUTES_DIR = path.join(__dirname, '..', 'routes');
const METHODS = ['findOneAndUpdate', 'findByIdAndUpdate', 'updateOne', 'updateMany', 'replaceOne'];

function walkJs(root, results = []) {
  if (!fs.existsSync(root)) return results;
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (
      entry.name === '_archived' ||
      entry.name === '__pycache__' ||
      entry.name === 'node_modules'
    ) {
      continue;
    }
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) walkJs(full, results);
    else if (entry.isFile() && entry.name.endsWith('.js')) results.push(full);
  }
  return results;
}

// Depth-aware split: return the call's arguments as a flat array of
// trimmed strings.  Returns null on parse failure.
function extractArgs(src, openParenIdx) {
  let depth = 0;
  let i = openParenIdx;
  let inStr = null;
  const args = [];
  let argStart = openParenIdx + 1;
  for (; i < src.length; i++) {
    const c = src[i];
    if (inStr) {
      if (c === '\\') {
        i++;
        continue;
      }
      if (c === inStr) inStr = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      inStr = c;
      continue;
    }
    if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') {
      depth--;
      if (depth === 0 && c === ')') {
        args.push(src.slice(argStart, i).trim());
        return args;
      }
    } else if (c === ',' && depth === 1) {
      args.push(src.slice(argStart, i).trim());
      argStart = i + 1;
    }
  }
  return null;
}

function findOffenders(src) {
  // Strip line + block comments first
  const code = src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map(l => l.replace(/\/\/.*$/, ''))
    .join('\n');
  const offenders = [];
  for (const method of METHODS) {
    const re = new RegExp('\\b' + method + '\\s*\\(', 'g');
    let m;
    while ((m = re.exec(code)) !== null) {
      const openIdx = re.lastIndex - 1;
      const args = extractArgs(code, openIdx);
      if (!args) continue;
      // Second argument is the update payload (for findByIdAndUpdate
      // the first is the id; for findOneAndUpdate the first is the
      // filter; either way arg #2 is the payload).
      if (args.length >= 2 && args[1] === 'req.body') {
        offenders.push({ method, lineNo: code.slice(0, openIdx).split('\n').length });
      }
    }
  }
  return offenders;
}

describe('W506 — no raw req.body in Mongoose update calls (tenant-takeover defense)', () => {
  const files = walkJs(ROUTES_DIR);

  const fileOffenders = [];
  for (const file of files) {
    const src = fs.readFileSync(file, 'utf8');
    const offs = findOffenders(src);
    if (offs.length > 0) {
      const rel = path.relative(path.join(__dirname, '..'), file).replace(/\\/g, '/');
      fileOffenders.push({ file: rel, offenders: offs });
    }
  }

  test('no route file passes bare `req.body` as the update payload', () => {
    expect(fileOffenders).toEqual([]);
  });

  test('aiCommunication.routes.js POST/PUT /templates wrap req.body', () => {
    const file = path.join(ROUTES_DIR, 'aiCommunication.routes.js');
    const src = fs.readFileSync(file, 'utf8');
    expect(src).toMatch(/stripUpdateMeta\(req\.body/);
    // POST + PUT both strip + drop branchId
    const branchIdDrops = (src.match(/delete body\.branchId/g) || []).length;
    expect(branchIdDrops).toBeGreaterThanOrEqual(2);
  });

  test('branch-enhanced.routes.js wraps update payloads', () => {
    const file = path.join(ROUTES_DIR, 'branch-enhanced.routes.js');
    const src = fs.readFileSync(file, 'utf8');
    expect(src).toMatch(/stripUpdateMeta\(req\.body\)/);
  });

  test('rbac.routes.js wraps update payload (privilege-escalation defense)', () => {
    const file = path.join(ROUTES_DIR, 'rbac.routes.js');
    const src = fs.readFileSync(file, 'utf8');
    expect(src).toMatch(/stripUpdateMeta\(req\.body\)/);
  });
});
