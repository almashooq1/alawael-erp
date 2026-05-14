'use strict';

// Bypass the global mongoose mock in jest.setup.js — these tests need real
// mongoose + an in-memory MongoDB.
jest.unmock('mongoose');
jest.resetModules();

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const svc = require('../services/universalCode');
const UniversalCode = require('../models/UniversalCode');

let mongo;
beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});
afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});
afterEach(async () => {
  await UniversalCode.deleteMany({});
});

describe('UniversalCode service', () => {
  describe('formatCode + parseCode', () => {
    test('formats and round-trips a beneficiary code', () => {
      const code = svc.formatCode('BNF', 'A1B2C3');
      expect(code).toBe('RH-BNF-A1B2C3');
      expect(svc.parseCode(code)).toEqual({
        prefix: 'RH',
        entityType: 'BNF',
        shortId: 'A1B2C3',
      });
    });

    test('rejects malformed input', () => {
      expect(() => svc.formatCode('xx', 'A1B2C3')).toThrow();
      expect(() => svc.formatCode('BNF', '12')).toThrow();
      expect(svc.parseCode('not-a-code')).toBeNull();
      expect(svc.parseCode('RH-XX-AAAAAA')).toBeNull(); // 2-char type
      expect(svc.parseCode('RH-BNF-A')).toBeNull(); // too short
    });

    test('parses case-insensitively + trims whitespace', () => {
      expect(svc.parseCode('  rh-bnf-a1b2c3  ')).toEqual({
        prefix: 'RH',
        entityType: 'BNF',
        shortId: 'A1B2C3',
      });
    });
  });

  describe('shortFromObjectId', () => {
    test('produces stable 6-char base32 short IDs', () => {
      const id = new mongoose.Types.ObjectId().toHexString();
      const s1 = svc.shortFromObjectId(id);
      const s2 = svc.shortFromObjectId(id);
      expect(s1).toBe(s2);
      expect(s1).toMatch(/^[0-9A-Z]{6}$/);
    });
  });

  describe('generate()', () => {
    test('issues a new code for a never-seen entity', async () => {
      const entityId = new mongoose.Types.ObjectId();
      const doc = await svc.generate('BNF', entityId, { entityLabel: 'Test Beneficiary' });
      expect(doc.code).toMatch(/^RH-BNF-[0-9A-Z]{6}$/);
      expect(doc.entityLabel).toBe('Test Beneficiary');
      expect(doc.status).toBe('active');
      expect(doc.scanCount).toBe(0);
    });

    test('is idempotent — same entity returns same code', async () => {
      const entityId = new mongoose.Types.ObjectId();
      const doc1 = await svc.generate('EMP', entityId);
      const doc2 = await svc.generate('EMP', entityId);
      expect(doc1.code).toBe(doc2.code);
      expect(String(doc1._id)).toBe(String(doc2._id));
    });

    test('updates entityLabel on re-generate without minting a new code', async () => {
      const entityId = new mongoose.Types.ObjectId();
      const doc1 = await svc.generate('BNF', entityId, { entityLabel: 'old name' });
      const doc2 = await svc.generate('BNF', entityId, { entityLabel: 'new name' });
      expect(doc1.code).toBe(doc2.code);
      expect(doc2.entityLabel).toBe('new name');
    });

    test('rejects unknown entityType', async () => {
      await expect(svc.generate('XXX', new mongoose.Types.ObjectId())).rejects.toThrow(
        /unknown entityType/
      );
    });

    test('produces distinct codes for distinct entityIds', async () => {
      const a = await svc.generate('INV', new mongoose.Types.ObjectId());
      const b = await svc.generate('INV', new mongoose.Types.ObjectId());
      expect(a.code).not.toBe(b.code);
    });
  });

  describe('resolve()', () => {
    test('returns the doc for a valid code', async () => {
      const doc = await svc.generate('AST', new mongoose.Types.ObjectId());
      const found = await svc.resolve(doc.code);
      expect(found.code).toBe(doc.code);
    });

    test('404 on missing', async () => {
      await expect(svc.resolve('RH-BNF-AAAAAA')).rejects.toMatchObject({ statusCode: 404 });
    });

    test('400 on malformed', async () => {
      await expect(svc.resolve('garbage')).rejects.toMatchObject({ statusCode: 400 });
    });
  });

  describe('scan()', () => {
    test('increments scanCount + stamps lastScannedAt', async () => {
      const doc = await svc.generate('SES', new mongoose.Types.ObjectId());
      const u = new mongoose.Types.ObjectId();
      const after = await svc.scan(doc.code, u);
      expect(after.scanCount).toBe(1);
      expect(after.lastScannedAt).toBeInstanceOf(Date);
      expect(String(after.lastScannedBy)).toBe(String(u));
      const after2 = await svc.scan(doc.code);
      expect(after2.scanCount).toBe(2);
    });

    test('410 when scanning a revoked code', async () => {
      const doc = await svc.generate('DOC', new mongoose.Types.ObjectId());
      await svc.revoke(doc.code);
      await expect(svc.scan(doc.code)).rejects.toMatchObject({ statusCode: 410 });
    });
  });

  describe('renderQR + renderBarcode', () => {
    test('renderQR returns a PNG buffer', async () => {
      const buf = await svc.renderQR('RH-BNF-AAAAAA', { width: 128 });
      expect(Buffer.isBuffer(buf)).toBe(true);
      expect(buf.length).toBeGreaterThan(100);
      // PNG magic bytes 89 50 4E 47
      expect(buf[0]).toBe(0x89);
      expect(buf[1]).toBe(0x50);
      expect(buf[2]).toBe(0x4e);
      expect(buf[3]).toBe(0x47);
    });

    test('renderBarcode returns a PNG buffer', async () => {
      const buf = await svc.renderBarcode('RH-BNF-AAAAAA');
      expect(Buffer.isBuffer(buf)).toBe(true);
      expect(buf.length).toBeGreaterThan(100);
      expect(buf[0]).toBe(0x89);
    });
  });
});
