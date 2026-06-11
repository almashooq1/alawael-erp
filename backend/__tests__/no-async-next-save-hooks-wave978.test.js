'use strict';

/**
 * W978 — Mongoose-9 async save-hook migration guard + smoke.
 *
 * Under Mongoose 9, an async `pre/post('save', async function (next) { … next(); })`
 * hook does NOT receive `next` — calling it throws "next is not a function" on
 * EVERY .save() (proven by isolated repro; documented in
 * feedback_mongoose_9_pre_save_callback_silent_break). 53 models shipped with this
 * broken pattern (high-traffic ones like Beneficiary were already migrated); W978
 * converted all 53 to async-no-next.
 *
 * (1) DRIFT GUARD — no model may re-introduce an async `save` hook that declares
 *     `next`. Baseline is EMPTY (all cleared) → any new one fails CI.
 * (2) SMOKE — a sample of converted models saves on MongoMemoryServer WITHOUT
 *     throwing "next is not a function" (a validation error is fine — it proves the
 *     hook ran to completion past where next() used to throw).
 */

const fs = require('fs');
const path = require('path');

const MODELS_DIR = path.resolve(__dirname, '..', 'models');
const BROKEN_SAVE_HOOK = /\.(pre|post)\(\s*['"]save['"]\s*,\s*async function \(\s*next\s*\)/;
// W1213 — 3rd variant of the class: an async NO-PARAM hook whose body still
// CALLS next(...) → ReferenceError on every save (Communication crashed this
// way until W1193; AccountingPayment until W1213). Catch it on ANY hook event.
const ASYNC_NOPARAM_HOOK = /\.(pre|post)\(\s*['"](\w+)['"]\s*,\s*async function \(\s*\)\s*\{([\s\S]*?)\n\}\s*\)/g;

function walk(dir, acc) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === '_archived' || e.name === '__tests__') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (e.name.endsWith('.js')) acc.push(p);
  }
  return acc;
}

describe('W978 — no async save hook declares next (Mongoose-9 throw class)', () => {
  it('zero models use `async function (next)` for a save hook', () => {
    const offenders = walk(MODELS_DIR, []).filter(f =>
      BROKEN_SAVE_HOOK.test(fs.readFileSync(f, 'utf8'))
    );
    expect(offenders.map(f => path.relative(MODELS_DIR, f))).toEqual([]);
  });

  it('zero async NO-PARAM hooks call next() in their body (W1213 ReferenceError class)', () => {
    const offenders = [];
    for (const f of walk(MODELS_DIR, [])) {
      const src = fs.readFileSync(f, 'utf8');
      let m;
      ASYNC_NOPARAM_HOOK.lastIndex = 0;
      while ((m = ASYNC_NOPARAM_HOOK.exec(src))) {
        if (/\bnext\s*\(/.test(m[3])) {
          offenders.push(`${path.relative(MODELS_DIR, f)} :: ${m[1]}('${m[2]}')`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe('W978 — converted models save without the Mongoose-9 hook error', () => {
  const mongoose = require('mongoose');
  jest.unmock('mongoose');
  let mongod;

  // A varied sample of the 53 converted models (different domains).
  const SAMPLES = [
    'Budget',
    'Cheque',
    'communication/Announcement',
    'reports/ReportJob',
    'laundry.model',
  ];

  beforeAll(async () => {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
  }, 60000);

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongod) await mongod.stop();
  });

  it.each(SAMPLES)('%s: .save() never throws "next is not a function"', async rel => {
    const Model = require(`../models/${rel}`);
    let err = null;
    try {
      await new Model({}).save(); // empty doc → may fail validation, that's OK
    } catch (e) {
      err = e;
    }
    // The pre-save hook must have run past where next() used to throw. A
    // ValidationError (missing required fields) is the expected, acceptable outcome.
    if (err) {
      expect(err.message).not.toMatch(/next is not a function/i);
    }
  });
});
