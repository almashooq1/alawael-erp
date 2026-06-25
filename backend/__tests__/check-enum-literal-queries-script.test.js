'use strict';

/**
 * W1487 self-test for scripts/check-enum-literal-queries.js — the on-demand
 * audit that finds Mongoose count/filter queries hard-coding a status value
 * not in the model's enum (silently matches 0 docs; the W1481 bug class).
 *
 * Pure-helper tests on in-memory fixtures (mkdtemp; no Mongo, no real models).
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  extractFieldEnums,
  buildEnumIndex,
  scanRoutes,
  audit,
} = require('../scripts/check-enum-literal-queries');

describe('check-enum-literal-queries — extractFieldEnums', () => {
  test('extracts an inline status enum array', () => {
    const e = extractFieldEnums(`status: { type: String, enum: ['a', 'b', 'c'], default: 'a' }`);
    expect([...e.status]).toEqual(['a', 'b', 'c']);
  });

  test('resolves enum referencing a same-file const (Object.freeze)', () => {
    const src = `const S = Object.freeze(['x', 'y']);\nstatus: { type: String, enum: S }`;
    expect([...extractFieldEnums(src).status]).toEqual(['x', 'y']);
  });

  test('unions multiple enum blocks for the same field', () => {
    const src = `status: { enum: ['a'] }\n// ...\nstatus: { enum: ['b'] }`;
    expect([...extractFieldEnums(src).status].sort()).toEqual(['a', 'b']);
  });

  test('returns nothing when no tracked field has an enum', () => {
    expect(Object.keys(extractFieldEnums(`name: { type: String }`))).toEqual([]);
  });
});

describe('check-enum-literal-queries — end-to-end on fixtures', () => {
  let dir;
  beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'enumq-'));
    fs.mkdirSync(path.join(dir, 'models', 'sub'), { recursive: true });
    fs.mkdirSync(path.join(dir, 'routes'), { recursive: true });
    // Root model Thing: status enum [open, closed]
    fs.writeFileSync(
      path.join(dir, 'models', 'Thing.js'),
      `const mongoose=require('mongoose');\nconst s=new mongoose.Schema({status:{type:String,enum:['open','closed']}});\nmodule.exports=mongoose.model('Thing',s);`,
    );
    // Basename-collision: sub/Thing has a DIFFERENT enum — must NOT bleed into root Thing.
    fs.writeFileSync(
      path.join(dir, 'models', 'sub', 'Thing.js'),
      `const mongoose=require('mongoose');\nnew mongoose.Schema({status:{type:String,enum:['scheduled','done']}});`,
    );
  });
  afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

  test('flags a literal NOT in the resolved (path-exact) enum', () => {
    fs.writeFileSync(
      path.join(dir, 'routes', 'bad.routes.js'),
      `const T=require('../models/Thing');\nT.countDocuments({ status: 'archived' });`,
    );
    const { findings } = audit(dir);
    const f = findings.find((x) => x.file.endsWith('bad.routes.js'));
    expect(f).toBeTruthy();
    expect(f.value).toBe('archived');
    expect(f.field).toBe('status');
    fs.unlinkSync(path.join(dir, 'routes', 'bad.routes.js'));
  });

  test('does NOT flag a valid literal', () => {
    fs.writeFileSync(
      path.join(dir, 'routes', 'ok.routes.js'),
      `const T=require('../models/Thing');\nT.countDocuments({ status: 'open' });`,
    );
    const { findings } = audit(dir);
    expect(findings.find((x) => x.file.endsWith('ok.routes.js'))).toBeFalsy();
    fs.unlinkSync(path.join(dir, 'routes', 'ok.routes.js'));
  });

  test('path-exact resolution: require("../models/sub/Thing") uses sub enum, not root', () => {
    fs.writeFileSync(
      path.join(dir, 'routes', 'sub.routes.js'),
      `const T=require('../models/sub/Thing');\nT.countDocuments({ status: 'scheduled' });`,
    );
    const { findings } = audit(dir);
    // 'scheduled' is valid for sub/Thing → must NOT be flagged (would be flagged if it
    // wrongly resolved to root Thing's [open,closed]).
    expect(findings.find((x) => x.file.endsWith('sub.routes.js'))).toBeFalsy();
    fs.unlinkSync(path.join(dir, 'routes', 'sub.routes.js'));
  });

  test('skips unresolved receivers (no false positive)', () => {
    fs.writeFileSync(
      path.join(dir, 'routes', 'dyn.routes.js'),
      `const M = getModel();\nM.countDocuments({ status: 'whatever' });`,
    );
    const { findings } = audit(dir);
    expect(findings.find((x) => x.file.endsWith('dyn.routes.js'))).toBeFalsy();
    fs.unlinkSync(path.join(dir, 'routes', 'dyn.routes.js'));
  });

  test('buildEnumIndex keys by exact rel-path (no basename collision)', () => {
    const { pathEnums } = buildEnumIndex(path.join(dir, 'models'));
    expect([...pathEnums['Thing'].status].sort()).toEqual(['closed', 'open']);
    expect([...pathEnums['sub/Thing'].status].sort()).toEqual(['done', 'scheduled']);
  });
});
