/**
 * root-proxy-scripts.test.js — root package.json scripts that proxy
 * into `cd backend && npm run X` or `cd frontend && npm run X` all
 * point at a script that actually exists there.
 *
 * Catches the "renamed backend script but forgot the root proxy"
 * class of drift. Previously would fail as "npm ERR! Missing script"
 * only when the operator ran `npm run X` at repo root.
 */

'use strict';

const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');

describe('root package.json proxy scripts', () => {
  const rootPkg = require(path.join(REPO_ROOT, 'package.json'));
  const backendPkg = require(path.join(REPO_ROOT, 'backend/package.json'));
  const frontendPkg = (() => {
    try {
      return require(path.join(REPO_ROOT, 'frontend/package.json'));
    } catch {
      return { scripts: {} };
    }
  })();

  const rootScripts = rootPkg.scripts || {};
  const backendScripts = new Set(Object.keys(backendPkg.scripts || {}));
  const frontendScripts = new Set(Object.keys(frontendPkg.scripts || {}));

  // Match: cd backend && npm run <name>  OR  cd frontend && npm run <name>
  // (optional trailing flags like --silent or -- are ignored)
  const proxyRe = /cd\s+(backend|frontend)\s+&&\s+npm\s+run\s+([a-zA-Z][\w:-]*)/;

  it('every `cd backend && npm run X` proxy resolves', () => {
    const misses = [];
    for (const [rootName, cmd] of Object.entries(rootScripts)) {
      const m = cmd.match(proxyRe);
      if (!m) continue;
      const [, workspace, target] = m;
      const pool = workspace === 'backend' ? backendScripts : frontendScripts;
      if (!pool.has(target)) {
        misses.push(
          `  ${rootName}: cd ${workspace} && npm run ${target}  (missing in ${workspace}/package.json)`
        );
      }
    }
    if (misses.length) {
      throw new Error(`Root proxy points at non-existent scripts:\n${misses.join('\n')}`);
    }
  });

  it('at least one proxy exists (sanity — otherwise the check is inert)', () => {
    const proxyCount = Object.values(rootScripts).filter(c => proxyRe.test(c)).length;
    expect(proxyCount).toBeGreaterThan(0);
  });
});
