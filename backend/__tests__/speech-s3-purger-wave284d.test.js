'use strict';

/**
 * speech-s3-purger-wave284d.test.js — real S3-backed storagePurger
 * factory + speechBootstrap wiring.
 *
 * Closes the PDPL-compliance gap from W284c: that bootstrap shipped with
 * a log-only placeholder ("would purge s3://bucket/key (no-op
 * placeholder)") which never actually deleted audio files. Per the
 * PRODUCTION_GAPS_BEFORE_LIVE.md matrix, retention violation accumulates
 * silently until intervention.
 *
 * This guard locks:
 *   • createS3Purger returns NULL when SDK + region both missing
 *     (intended: graceful degradation, not a thrown error)
 *   • createS3Purger returns a working function when test client is
 *     injected (DeleteObjectCommand called with correct Bucket + Key)
 *   • Bootstrap source PREFERS real purger over log-only fallback
 *     (regex on `createS3Purger` + `realPurger ||` pattern)
 *   • Bootstrap source emits a WARN log when falling back to log-only
 *     (PDPL gap visibility at boot)
 *
 * Pure-lib + static-source pattern. No mongoose, no cron, no S3.
 */

const fs = require('fs');
const path = require('path');

const { createS3Purger } = require('../services/ai/speech-s3-purger.service');

describe('W284d — createS3Purger factory', () => {
  describe('returns null when no construction path', () => {
    it('returns null when no region + no sdk + no client', () => {
      const orig = process.env.AWS_REGION;
      delete process.env.AWS_REGION;
      try {
        // Inject empty sdk to bypass the loadOptional() resolve attempt
        // (which would otherwise return null because the package isn't
        // installed — same result by a different path).
        const p = createS3Purger({ sdk: null });
        expect(p).toBeNull();
      } finally {
        if (orig !== undefined) process.env.AWS_REGION = orig;
      }
    });

    it('returns null when sdk loads but region missing', () => {
      const orig = process.env.AWS_REGION;
      delete process.env.AWS_REGION;
      try {
        const fakeSdk = {
          S3Client: jest.fn(),
          DeleteObjectCommand: jest.fn(),
        };
        const p = createS3Purger({ sdk: fakeSdk });
        expect(p).toBeNull();
        expect(fakeSdk.S3Client).not.toHaveBeenCalled();
      } finally {
        if (orig !== undefined) process.env.AWS_REGION = orig;
      }
    });
  });

  describe('returns a working purger when constructable', () => {
    it('constructs an S3Client when sdk + region present', () => {
      const fakeClient = { send: jest.fn().mockResolvedValue({}) };
      const fakeSdk = {
        S3Client: jest.fn().mockReturnValue(fakeClient),
        DeleteObjectCommand: jest.fn(args => ({ __cmd: 'Delete', args })),
      };
      const p = createS3Purger({ sdk: fakeSdk, region: 'me-south-1' });
      expect(typeof p).toBe('function');
      expect(fakeSdk.S3Client).toHaveBeenCalledWith({ region: 'me-south-1' });
    });

    it('uses pre-constructed s3Client when injected (test path)', async () => {
      const fakeClient = { send: jest.fn().mockResolvedValue({}) };
      const fakeSdk = {
        DeleteObjectCommand: jest.fn(args => ({ __cmd: 'Delete', args })),
      };
      const p = createS3Purger({ s3Client: fakeClient, sdk: fakeSdk });
      await p({ bucket: 'b1', key: 'audio/recording-1.mp3' });
      expect(fakeSdk.DeleteObjectCommand).toHaveBeenCalledWith({
        Bucket: 'b1',
        Key: 'audio/recording-1.mp3',
      });
      expect(fakeClient.send).toHaveBeenCalledTimes(1);
      expect(fakeClient.send).toHaveBeenCalledWith({
        __cmd: 'Delete',
        args: { Bucket: 'b1', Key: 'audio/recording-1.mp3' },
      });
    });

    it('throws on missing bucket', async () => {
      const fakeClient = { send: jest.fn() };
      const p = createS3Purger({ s3Client: fakeClient });
      await expect(p({ key: 'k' })).rejects.toThrow(/bucket required/);
      expect(fakeClient.send).not.toHaveBeenCalled();
    });

    it('throws on missing key', async () => {
      const fakeClient = { send: jest.fn() };
      const p = createS3Purger({ s3Client: fakeClient });
      await expect(p({ bucket: 'b' })).rejects.toThrow(/key required/);
      expect(fakeClient.send).not.toHaveBeenCalled();
    });

    it('logs on success when logger provided', async () => {
      const fakeClient = { send: jest.fn().mockResolvedValue({}) };
      const debug = jest.fn();
      const p = createS3Purger({
        s3Client: fakeClient,
        logger: { debug },
      });
      await p({ bucket: 'b', key: 'k' });
      expect(debug).toHaveBeenCalledWith(expect.stringContaining('purged s3://b/k'));
    });
  });
});

describe('W284d — speechBootstrap source wiring', () => {
  const SRC = fs.readFileSync(path.join(__dirname, '..', 'startup', 'speechBootstrap.js'), 'utf8');

  it('imports createS3Purger from the new service', () => {
    expect(SRC).toMatch(/require\(['"]\.\.\/services\/ai\/speech-s3-purger\.service['"]\)/);
    expect(SRC).toMatch(/createS3Purger/);
  });

  it('prefers real purger over log-only fallback (realPurger || fallback)', () => {
    expect(SRC).toMatch(/const\s+realPurger\s*=\s*createS3Purger\s*\(/);
    expect(SRC).toMatch(/realPurger\s*\|\|\s*\(async/);
  });

  it('emits PDPL-compliance WARN when falling back to log-only', () => {
    // Verify the boot-time WARN exists so ops see the gap immediately.
    expect(SRC).toMatch(/if\s*\(\s*!realPurger\s*\)\s*\{[\s\S]*logger\.warn/);
    expect(SRC).toMatch(/PDPL retention non-compliant/);
  });

  it('emits INFO confirmation when real purger wired', () => {
    expect(SRC).toMatch(/else\s*\{[\s\S]*logger\.info[\s\S]*PDPL retention enforced/);
  });
});
