'use strict';

/**
 * Storage Service — طبقة تخزين مجردة للمستندات
 * ═══════════════════════════════════════════════════════════
 * توفر واجهة موحدة للتخزين المحلي أو السحابي (S3).
 * يمكن تبديل المزود عبر متغير البيئة STORAGE_PROVIDER.
 */

const path = require('path');
const logger = require('../../utils/logger');

const PROVIDERS = {
  local: require('./local.provider'),
  s3: require('./s3.provider'),
};

const DEFAULT_PROVIDER = 'local';

function getProvider() {
  const name = (process.env.STORAGE_PROVIDER || DEFAULT_PROVIDER).toLowerCase();
  const provider = PROVIDERS[name];
  if (!provider) {
    logger.warn(`[Storage] Unknown provider "${name}". Falling back to local.`);
    return PROVIDERS.local;
  }
  return provider;
}

/**
 * Upload a file to storage.
 * @param {Buffer} buffer - File contents
 * @param {string} fileName - Original file name
 * @param {string} mimeType - MIME type
 * @param {Object} options - Additional options (folder, purpose, etc.)
 * @returns {Promise<{storagePath: string, storageProvider: string, size: number, checksum: string}>}
 */
async function upload(buffer, fileName, mimeType, options = {}) {
  const provider = getProvider();
  return provider.upload(buffer, fileName, mimeType, options);
}

/**
 * Download a file from storage.
 * @param {string} storagePath
 * @param {string} storageProvider
 * @returns {Promise<Buffer|stream.Readable>}
 */
async function download(storagePath, storageProvider) {
  const provider = getProviderByName(storageProvider);
  return provider.download(storagePath);
}

/**
 * Delete a file from storage.
 * @param {string} storagePath
 * @param {string} storageProvider
 * @returns {Promise<boolean>}
 */
async function remove(storagePath, storageProvider) {
  const provider = getProviderByName(storageProvider);
  return provider.delete(storagePath);
}

/**
 * Check if a file exists in storage.
 * @param {string} storagePath
 * @param {string} storageProvider
 * @returns {Promise<boolean>}
 */
async function exists(storagePath, storageProvider) {
  const provider = getProviderByName(storageProvider);
  return provider.exists(storagePath);
}

/**
 * Get a URL for a file (for public/shared access).
 * @param {string} storagePath
 * @param {string} storageProvider
 * @returns {Promise<string>}
 */
async function getUrl(storagePath, storageProvider) {
  const provider = getProviderByName(storageProvider);
  return provider.getUrl ? provider.getUrl(storagePath) : storagePath;
}

function getProviderByName(name) {
  const provider = PROVIDERS[(name || DEFAULT_PROVIDER).toLowerCase()];
  if (!provider) {
    throw new Error(`Storage provider "${name}" is not configured.`);
  }
  return provider;
}

module.exports = {
  upload,
  download,
  remove,
  exists,
  getUrl,
  getProvider,
  getProviderByName,
  DEFAULT_PROVIDER,
};
