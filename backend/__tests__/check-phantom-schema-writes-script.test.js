/**
 * W1189 — self-test for scripts/check-phantom-schema-writes.js.
 *
 * Follows the gate-script test recipe (check-mongoose-hook-style-script is
 * the reference): pure-helper assertions + CLI exit-code contract against
 * in-memory fixtures (mkdtempSync) + a clean-run assertion against the real
 * repo (current state must be clean — new phantom writes go through the
 * KNOWN_PHANTOM_WRITES ratchet, never silently).
 */

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'check-phantom-schema-writes.js');
const { scanObjectLiteral, extractSchemaKeySets, buildBindings, scanRepo } = require(SCRIPT);

// ─── fixtures ────────────────────────────────────────────────────────────────

function makeFixtureRepo({ phantom }) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'phantom-writes-'));
  fs.mkdirSync(path.join(root, 'models'));
  fs.mkdirSync(path.join(root, 'routes'));
  fs.mkdirSync(path.join(root, 'services'));
  fs.writeFileSync(
    path.join(root, 'models', 'Widget.js'),
    [
      "'use strict';",
      "const mongoose = require('mongoose');",
      'const WidgetSchema = new mongoose.Schema(',
      '  {',
      '    name: { type: String, required: true },',
      '    size: Number,',
      '    tags: [{ type: String }],',
      '  },',
      '  { timestamps: true }',
      ');',
      "module.exports = mongoose.model('Widget', WidgetSchema);",
    ].join('\n')
  );
  const extraKey = phantom ? 'phantomKey: 1,' : 'size: 1,';
  fs.writeFileSync(
    path.join(root, 'routes', 'widget.routes.js'),
    [
      "'use strict';",
      "const Widget = require('../models/Widget');",
      'async function create(req) {',
      '  return Widget.create({',
      '    name: req.body.name,',
      `    ${extraKey}`,
      '  });',
      '}',
      '// spread sites must be SKIPPED, not flagged:',
      'async function createSpread(req) {',
      '  return Widget.create({ ...req.body, name: 1 });',
      '}',
      'module.exports = { create, createSpread };',
    ].join('\n')
  );
  return root;
}

function runCli(args) {
  try {
    const stdout = execFileSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8' });
    return { code: 0, stdout };
  } catch (err) {
    return { code: err.status, stdout: String(err.stdout || '') };
  }
}

// ─── pure helpers ────────────────────────────────────────────────────────────

describe('scanObjectLiteral', () => {
  it('extracts top-level keys, ignoring nested objects/arrays', () => {
    const src = '{ a: 1, b: { x: 2, y: [3, { z: 4 }] }, c: "v" }';
    const r = scanObjectLiteral(src, 0);
    expect(r.keys).toEqual(['a', 'b', 'c']);
    expect(r.hasSpread).toBe(false);
  });

  it('handles quoted keys, shorthand keys, comments, and brace-laden strings', () => {
    const src = [
      '{',
      "  'quoted-key': 1, // line comment { with brace",
      '  /* block } comment */',
      '  shorthand,',
      // eslint-disable-next-line no-template-curly-in-string
      '  tpl: `text ${ { inner: 1 } } more`,',
      "  str: 'a } b { c',",
      '}',
    ].join('\n');
    const r = scanObjectLiteral(src, 0);
    expect(r.keys).toEqual(['quoted-key', 'shorthand', 'tpl', 'str']);
  });

  it('flags top-level spread', () => {
    const r = scanObjectLiteral('{ ...base, a: 1 }', 0);
    expect(r.hasSpread).toBe(true);
    expect(r.keys).toEqual(['a']);
  });

  it('returns null on unbalanced input', () => {
    expect(scanObjectLiteral('{ a: 1', 0)).toBeNull();
  });
});

describe('extractSchemaKeySets', () => {
  it('reads inline new Schema({...}) literals', () => {
    const sets = extractSchemaKeySets('const S = new mongoose.Schema({ a: 1, b: { c: 2 } });');
    expect(sets).toEqual([['a', 'b']]);
  });

  it('resolves new Schema(definitionVar) from an in-file literal', () => {
    const src = [
      'const def = { x: Number, y: String };',
      'const S = new Schema(def, { timestamps: true });',
    ].join('\n');
    expect(extractSchemaKeySets(src)).toEqual([['x', 'y']]);
  });

  it('includes schema.add({...}) keys', () => {
    const src = ['const S = new Schema({ a: 1 });', 'S.add({ extra: String });'].join('\n');
    expect(extractSchemaKeySets(src)).toEqual([['a'], ['extra']]);
  });

  it('poisons (returns []) when any schema definition is unresolvable', () => {
    const src = [
      "const external = require('./shape');",
      'const S = new Schema(external);',
      'const Sub = new Schema({ inline: 1 });',
    ].join('\n');
    expect(extractSchemaKeySets(src)).toEqual([]);
  });
});

describe('buildBindings', () => {
  it('maps require + mongoose.model + safeModel bindings', () => {
    const src = [
      "const Widget = require('../models/Widget');",
      "const Tool = require('../../models/tools/Tool.js');",
      "const Gadget = mongoose.model('Gadget');",
      "const Gizmo = safeModel('Gizmo');",
    ].join('\n');
    const b = buildBindings(src);
    expect(b.get('Widget')).toBe('widget');
    expect(b.get('Tool')).toBe('tool');
    expect(b.get('Gadget')).toBe('gadget');
    expect(b.get('Gizmo')).toBe('gizmo');
  });
});

// ─── scanRepo against fixtures ───────────────────────────────────────────────

describe('scanRepo (fixture repos)', () => {
  it('flags a phantom key and skips spread sites', () => {
    const root = makeFixtureRepo({ phantom: true });
    const r = scanRepo({ root });
    expect(r.newFindings).toHaveLength(1);
    expect(r.newFindings[0]).toMatchObject({ model: 'widget', key: 'phantomKey' });
    expect(r.skippedSites).toBe(1); // the spread site
    expect(r.scannedSites).toBe(1);
  });

  it('passes a clean fixture (declared keys + timestamps builtins)', () => {
    const root = makeFixtureRepo({ phantom: false });
    const r = scanRepo({ root });
    expect(r.newFindings).toHaveLength(0);
  });
});

// ─── W1214 missing-required detector ─────────────────────────────────────────

describe('scanRepo — missingRequired detector (W1214)', () => {
  function makeRequiredFixture(modelExtra, createBody) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'phantom-req-'));
    fs.mkdirSync(path.join(root, 'models'));
    fs.mkdirSync(path.join(root, 'routes'));
    fs.mkdirSync(path.join(root, 'services'));
    fs.writeFileSync(
      path.join(root, 'models', 'Gadget.js'),
      [
        "const mongoose = require('mongoose');",
        'const GadgetSchema = new mongoose.Schema({',
        '  name: { type: String, required: true },',
        modelExtra,
        '});',
        modelExtra.includes('hooked')
          ? "GadgetSchema.pre('validate', async function () { this.hooked = 'x'; });"
          : '',
        "module.exports = mongoose.model('Gadget', GadgetSchema);",
      ].join('\n')
    );
    fs.writeFileSync(
      path.join(root, 'routes', 'gadget.routes.js'),
      [
        "const Gadget = require('../models/Gadget');",
        `async function create(req) { return Gadget.create({ ${createBody} }); }`,
        'module.exports = { create };',
      ].join('\n')
    );
    return root;
  }

  it('flags a required-no-default key omitted from the create literal', () => {
    const root = makeRequiredFixture('  code: { type: String, required: true },', 'name: 1');
    const r = scanRepo({ root });
    const missing = r.newFindings.filter(f => f.type === 'missingRequired');
    expect(missing).toHaveLength(1);
    expect(missing[0].key).toBe('code');
    expect(missing[0].id).toContain('::MISSING::code');
  });

  it('does NOT flag when the key is provided, defaulted, hook-assigned, or array-typed', () => {
    for (const [extra, body] of [
      ['  code: { type: String, required: true },', 'name: 1, code: 2'], // provided
      ["  code: { type: String, required: true, default: 'X' },", 'name: 1'], // default
      ['  hooked: { type: String, required: true },', 'name: 1'], // hook-assigned
      ['  subs: [{ q: { type: String, required: true } }],', 'name: 1'], // array-typed
    ]) {
      const r = scanRepo({ root: makeRequiredFixture(extra, body) });
      expect(r.newFindings.filter(f => f.type === 'missingRequired')).toEqual([]);
    }
  });
});

// ─── CLI exit-code contract ──────────────────────────────────────────────────

describe('check-phantom-schema-writes — CLI exit-code contract', () => {
  it('exits 1 on a phantom fixture, 0 on a clean one', () => {
    expect(runCli([`--root=${makeFixtureRepo({ phantom: true })}`]).code).toBe(1);
    expect(runCli([`--root=${makeFixtureRepo({ phantom: false })}`]).code).toBe(0);
  });

  it('exits 0 against the real backend (current state clean or baselined)', () => {
    const r = runCli([]);
    expect(r.code).toBe(0);
  });

  it('--json prints valid JSON with the contract fields', () => {
    const r = runCli(['--json']);
    expect(r.code).toBe(0);
    const j = JSON.parse(r.stdout);
    for (const f of [
      'modelsIndexed',
      'scannedSites',
      'skippedSites',
      'newFindings',
      'staleBaseline',
      'baselineSize',
    ]) {
      expect(j).toHaveProperty(f);
    }
    expect(j.modelsIndexed).toBeGreaterThan(300);
    expect(j.newFindings).toEqual([]);
  });
});
