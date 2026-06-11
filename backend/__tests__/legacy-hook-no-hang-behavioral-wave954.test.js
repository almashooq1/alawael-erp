/**
 * W954 behavioral — end-to-end proof that a SYNC 1-param post('save') hook does
 * NOT hang .save() once the global legacy-hook shim is installed.
 *
 * Reproduces the exact prod bug: config/mongoose.plugins.js (loaded globally in
 * server.js via registerGlobalPlugins) patches Schema.prototype.pre/post. Before
 * the W954 fix it wrapped `post('save', function (doc) {…})`, passing the
 * wrapper's `next` in as `doc`; the sync body never called next nor returned a
 * thenable, so the wrapper Promise never resolved → save() hung forever. This
 * test would TIME OUT on the buggy shim and PASS on the fixed one.
 *
 * Paired with the static guard legacy-hook-adapter-wave954.test.js per the
 * "pair every static drift guard with a behavioral counterpart" doctrine.
 */

'use strict';

jest.unmock('mongoose');

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let postHookRan = false;
let postHookSawRealDoc = false;
let Probe;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w954-no-hang' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);

  // Install the global shim exactly as server.js does, so Schema.prototype is
  // patched before our probe schema declares its hooks.
  const plugins = require('../config/mongoose.plugins');
  plugins.registerGlobalPlugins();

  const schema = new mongoose.Schema({ name: String });

  // The bug pattern: synchronous, single param named `doc` (the document).
  schema.post('save', function (doc) {
    postHookRan = true;
    // On the buggy shim, `doc` would actually be the wrapper's `next` function.
    postHookSawRealDoc = !!doc && typeof doc.name === 'string' && typeof doc !== 'function';
  });

  Probe = mongoose.models.W954HangProbe || mongoose.model('W954HangProbe', schema);
  await Probe.init();
}, 60000);

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W954 — a sync `post(save, function(doc))` hook never hangs save()', () => {
  it('resolves create() promptly (would time out on the pre-W954 shim)', async () => {
    const doc = await Probe.create({ name: 'no-hang' });
    expect(doc).toBeTruthy();
    expect(doc.name).toBe('no-hang');
  }, 15000);

  it('the post hook ran and received the real document (not the wrapper next)', () => {
    expect(postHookRan).toBe(true);
    expect(postHookSawRealDoc).toBe(true);
  });

  it('a legacy `pre(save, function(next))` callback still works (W946 rescue intact)', async () => {
    let preRan = false;
    const s2 = new mongoose.Schema({ v: Number });

    s2.pre('save', function (next) {
      preRan = true;
      this.v = (this.v || 0) + 1;
      next();
    });
    const M2 = mongoose.models.W954PreProbe || mongoose.model('W954PreProbe', s2);
    const d = await M2.create({ v: 1 });
    expect(preRan).toBe(true);
    expect(d.v).toBe(2);
  }, 15000);
});
