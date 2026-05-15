'use strict';

/**
 * cctv-models-registration.test.js — Phase 27.
 *
 * Ensures every CCTV model registers without collision and that the barrel
 * exports them all. Catches dup-mongoose-model regressions early.
 */

jest.unmock('mongoose');
jest.resetModules();
process.env.NODE_ENV = 'test';

const mongoose = require('mongoose');

const expectedNames = [
  'CctvCamera',
  'CctvNvr',
  'CctvEvent',
  'CctvRecording',
  'CctvAlert',
  'CctvViewAudit',
  'CctvAccessGrant',
  'CctvFaceIdentity',
  'CctvAnpr',
  'CctvZone',
  'CctvStreamSession',
  'CctvHealthCheck',
];

const barrel = require('../models/cctv');

describe('CCTV models', () => {
  test('barrel exports every expected model', () => {
    for (const name of expectedNames) {
      expect(barrel[name]).toBeDefined();
      expect(typeof barrel[name].modelName).toBe('string');
      expect(barrel[name].modelName).toBe(name);
    }
  });

  test('all models are registered on the default mongoose connection', () => {
    for (const name of expectedNames) {
      expect(mongoose.modelNames()).toContain(name);
    }
  });

  test('CctvCamera has expected indexes', () => {
    const idx = barrel.CctvCamera.schema.indexes();
    const keys = idx.map(i => Object.keys(i[0]).join(','));
    expect(keys).toEqual(expect.arrayContaining(['branchCode,status']));
  });

  test('CctvEvent has TTL on retainUntil', () => {
    const idx = barrel.CctvEvent.schema.indexes();
    const ttl = idx.find(i => i[1] && i[1].expireAfterSeconds === 0);
    expect(ttl).toBeDefined();
  });
});
