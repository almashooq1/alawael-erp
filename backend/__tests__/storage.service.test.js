/**
 * storage.service.test.js — Unit tests for the storage abstraction layer.
 */

'use strict';

const storageService = require('../services/storage/storage.service');

describe('storage.service', () => {
  it('defaults to local provider', () => {
    const provider = storageService.getProvider();
    expect(provider).toBeDefined();
    expect(typeof provider.upload).toBe('function');
    expect(typeof provider.download).toBe('function');
    expect(typeof provider.delete).toBe('function');
    expect(typeof provider.exists).toBe('function');
  });

  it('local provider uploads and downloads a buffer', async () => {
    const originalProvider = process.env.STORAGE_PROVIDER;
    process.env.STORAGE_PROVIDER = 'local';

    try {
      const buffer = Buffer.from('hello document hub');
      const result = await storageService.upload(buffer, 'test.txt', 'text/plain', {
        purpose: 'test',
      });

      expect(result.storageProvider).toBe('local');
      expect(result.size).toBe(buffer.length);
      expect(result.checksum).toMatch(/^[a-f0-9]{64}$/);

      const exists = await storageService.exists(result.storagePath, 'local');
      expect(exists).toBe(true);

      const downloaded = await storageService.download(result.storagePath, 'local');
      expect(downloaded.toString()).toBe('hello document hub');

      await storageService.remove(result.storagePath, 'local');
      const afterDelete = await storageService.exists(result.storagePath, 'local');
      expect(afterDelete).toBe(false);
    } finally {
      process.env.STORAGE_PROVIDER = originalProvider;
    }
  });

  it('rejects path traversal in local provider', async () => {
    const localProvider = require('../services/storage/local.provider');
    await expect(localProvider.download('../../../etc/passwd')).rejects.toThrow(
      'Path traversal detected'
    );
  });

  it('throws for unknown provider name', () => {
    expect(() => storageService.getProviderByName('unknown')).toThrow(
      'Storage provider "unknown" is not configured'
    );
  });
});
