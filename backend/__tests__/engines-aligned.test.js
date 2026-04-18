/**
 * engines-aligned.test.js — root / backend / frontend package.json
 * declare compatible Node version ranges.
 *
 * Drift here is subtle but painful: root says >=18, backend says >=20,
 * `npm install` at root works, `cd backend && npm install` rejects
 * — CI passes where local dev fails, or vice versa. Keep them aligned.
 */

'use strict';

const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');

function eng(rel) {
  const pkg = require(path.join(REPO_ROOT, rel));
  return (pkg.engines && pkg.engines.node) || null;
}

describe('package.json engines.node alignment', () => {
  const root = eng('package.json');
  const backend = eng('backend/package.json');
  const frontend = (() => {
    try {
      return eng('frontend/package.json');
    } catch {
      return null;
    }
  })();

  it('root package.json declares engines.node', () => {
    expect(root).toBeTruthy();
    expect(root).toMatch(/\d/);
  });

  it('backend package.json declares engines.node', () => {
    expect(backend).toBeTruthy();
    expect(backend).toMatch(/\d/);
  });

  it('root and backend engines.node agree', () => {
    expect(backend).toBe(root);
  });

  if (frontend) {
    it('frontend engines.node (if declared) agrees with root', () => {
      expect(frontend).toBe(root);
    });
  }
});
