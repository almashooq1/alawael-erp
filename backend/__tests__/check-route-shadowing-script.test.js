'use strict';

/**
 * check-route-shadowing-script.test.js — self-test for the W531 route-ordering
 * drift guard (scripts/check-route-shadowing.js).
 *
 * Covers the pure matching helpers + the analyzeFile parser against in-memory
 * fixture route files (mkdtempSync, no DB). Mirrors the W522
 * check-mongoose-hook-style-script.test.js reference.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const { segs, isLiteral, paramShadows, analyzeFile } = require('../scripts/check-route-shadowing');
const SCRIPT = path.join(__dirname, '..', 'scripts', 'check-route-shadowing.js');

describe('check-route-shadowing pure helpers', () => {
  test('segs splits and drops empties', () => {
    expect(segs('/devices/:id')).toEqual(['devices', ':id']);
    expect(segs('/')).toEqual([]);
  });

  test('isLiteral distinguishes literal vs param/wildcard', () => {
    expect(isLiteral('/devices/health-check')).toBe(true);
    expect(isLiteral('/devices/:id')).toBe(false);
    expect(isLiteral('/files/*')).toBe(false);
  });

  describe('paramShadows', () => {
    test('param sibling of same segment count shadows a literal', () => {
      expect(paramShadows('/devices/:id', '/devices/health-check')).toBe(true);
      expect(paramShadows('/:branchId', '/transfers')).toBe(true);
      expect(paramShadows('/forms/:id', '/forms/stats')).toBe(true);
    });
    test('different segment count does NOT shadow', () => {
      expect(paramShadows('/devices', '/devices/health-check')).toBe(false);
      expect(paramShadows('/:id', '/a/b')).toBe(false);
    });
    test('literal prefix mismatch does NOT shadow', () => {
      expect(paramShadows('/users/:id', '/devices/stats')).toBe(false);
    });
    test('a fully-literal "pattern" never shadows (needs ≥1 param)', () => {
      expect(paramShadows('/devices/list', '/devices/stats')).toBe(false);
    });
  });
});

describe('analyzeFile detects shadowed literals in declaration order', () => {
  let dir;
  beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rshadow-'));
  });
  afterAll(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  function fixture(name, body) {
    const fp = path.join(dir, name);
    fs.writeFileSync(fp, body);
    return fp;
  }

  test('flags a literal declared AFTER a matching :param route', () => {
    const fp = fixture(
      'bad.routes.js',
      `
      const router = require('express').Router();
      router.get('/devices/:id', h);
      router.get('/devices/health-check', h);
      module.exports = router;
    `
    );
    const findings = analyzeFile(fp);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      method: 'GET',
      literal: '/devices/health-check',
      shadowedBy: '/devices/:id',
    });
  });

  test('no finding when the literal is declared BEFORE the :param route', () => {
    const fp = fixture(
      'good.routes.js',
      `
      const router = require('express').Router();
      router.get('/devices/health-check', h);
      router.get('/devices/:id', h);
      module.exports = router;
    `
    );
    expect(analyzeFile(fp)).toHaveLength(0);
  });

  test('different HTTP methods do not shadow each other', () => {
    const fp = fixture(
      'methods.routes.js',
      `
      const router = require('express').Router();
      router.get('/x/:id', h);
      router.post('/x/bulk', h);
      module.exports = router;
    `
    );
    expect(analyzeFile(fp)).toHaveLength(0);
  });

  test('a :param route that falls through via next() does NOT shadow (guarded)', () => {
    // Mirrors montessori.js: the /:id handler returns next() for literal subpaths.
    const fp = fixture(
      'guarded.routes.js',
      `
      const router = require('express').Router();
      router.get('/:id', async (req, res, next) => {
        if (['students', 'plans'].includes(req.params.id)) return next();
        res.json(await Model.findById(req.params.id));
      });
      router.get('/students', (req, res) => res.json([]));
      router.get('/plans', (req, res) => res.json([]));
      module.exports = router;
    `
    );
    expect(analyzeFile(fp)).toHaveLength(0);
  });
});

describe('CLI exit contract', () => {
  test('repo scan exits 0 (baseline in sync) and reports a total', () => {
    let out;
    let code = 0;
    try {
      out = execFileSync('node', [SCRIPT], { encoding: 'utf8' });
    } catch (e) {
      code = e.status;
      out = (e.stdout || '') + (e.stderr || '');
    }
    expect(code).toBe(0);
    expect(out).toMatch(/shadowed literal route\(s\) total/);
  });

  test('--json emits parseable findings object', () => {
    const out = execFileSync('node', [SCRIPT, '--json'], { encoding: 'utf8' });
    const parsed = JSON.parse(out);
    expect(parsed).toHaveProperty('total');
    expect(Array.isArray(parsed.newOnes)).toBe(true);
    expect(Array.isArray(parsed.stale)).toBe(true);
    expect(parsed.newOnes).toHaveLength(0); // baseline in sync → no new
  });
});
