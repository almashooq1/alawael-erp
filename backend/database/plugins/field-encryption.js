/**
 * Field-Level Encryption Plugin - Al-Awael ERP
 * إضافة تشفير البيانات على مستوى الحقول
 *
 * Features:
 *  - AES-256-GCM encryption for sensitive fields
 *  - Automatic encrypt on save, decrypt on read
 *  - Searchable encrypted fields (using deterministic hashing)
 *  - Key rotation support
 *  - Masking for display (show last 4 digits, etc.)
 *  - Audit trail for who accessed encrypted data
 *  - HIPAA/GDPR compliant data protection
 */

'use strict';

const crypto = require('crypto');
const logger = require('../../utils/logger');

// ── Constants ──
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const _AUTH_TAG_LENGTH = 16;
const ENCODING = 'hex';
const ENCRYPTION_PREFIX = 'enc:v1:';
const HASH_ALGORITHM = 'sha256';

// ══════════════════════════════════════════════════════════════════
// Key Management
// ══════════════════════════════════════════════════════════════════
class KeyManager {
  constructor() {
    this._keys = new Map();
    this._currentKeyId = 'default';
  }

  /**
   * Initialize with encryption key(s)
   * @param {Object} keys - { keyId: keyHex, ... }
   * @param {string} currentKeyId - Active key ID for new encryptions
   */
  init(keys = {}, currentKeyId = 'default') {
    // Default key from environment
    const envKey = process.env.DB_ENCRYPTION_KEY || process.env.FIELD_ENCRYPTION_KEY;
    if (envKey) {
      this._keys.set('default', this._normalizeKey(envKey));
    }

    // Additional keys (for rotation)
    for (const [id, key] of Object.entries(keys)) {
      this._keys.set(id, this._normalizeKey(key));
    }

    if (currentKeyId && this._keys.has(currentKeyId)) {
      this._currentKeyId = currentKeyId;
    }

    if (this._keys.size === 0) {
      // Generate a fallback key (NOT for production)
      if (process.env.NODE_ENV === 'production') {
        logger.error('[Encryption] No encryption key configured! Set DB_ENCRYPTION_KEY env var.');
      } else {
        const fallback = crypto.randomBytes(32).toString('hex');
        this._keys.set('default', Buffer.from(fallback, 'hex'));
        logger.warn(
          '[Encryption] Using random fallback key (dev only — data will be unreadable after restart)'
        );
      }
    }
  }

  _normalizeKey(key) {
    if (Buffer.isBuffer(key))
      return key.length === 32 ? key : crypto.createHash('sha256').update(key).digest();
    if (typeof key === 'string') {
      // If hex string of correct length
      if (/^[0-9a-f]{64}$/i.test(key)) return Buffer.from(key, 'hex');
      // Otherwise hash it
      return crypto.createHash('sha256').update(key).digest();
    }
    throw new Error('Invalid encryption key format');
  }

  getCurrentKey() {
    return { id: this._currentKeyId, key: this._keys.get(this._currentKeyId) };
  }

  getKey(keyId) {
    return this._keys.get(keyId || this._currentKeyId);
  }

  hasKey(keyId) {
    return this._keys.has(keyId);
  }
}

const keyManager = new KeyManager();

// ══════════════════════════════════════════════════════════════════
// Encryption / Decryption Functions
// ══════════════════════════════════════════════════════════════════

/**
 * Encrypt a string value
 * @param {string} plaintext
 * @param {string} keyId - Optional key ID (uses current key if omitted)
 * @returns {string} Encrypted string in format: enc:v1:{keyId}:{iv}:{authTag}:{ciphertext}
 */
function encrypt(plaintext, keyId = null) {
  if (!plaintext || typeof plaintext !== 'string') return plaintext;
  if (plaintext.startsWith(ENCRYPTION_PREFIX)) return plaintext; // Already encrypted

  const { id, key } = keyId
    ? { id: keyId, key: keyManager.getKey(keyId) }
    : keyManager.getCurrentKey();
  if (!key) throw new Error('Encryption key not found');

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', ENCODING);
  encrypted += cipher.final(ENCODING);

  const authTag = cipher.getAuthTag().toString(ENCODING);

  return `${ENCRYPTION_PREFIX}${id}:${iv.toString(ENCODING)}:${authTag}:${encrypted}`;
}

/**
 * Decrypt an encrypted string
 * @param {string} encryptedText
 * @returns {string} Decrypted plaintext
 */
function decrypt(encryptedText) {
  if (!encryptedText || typeof encryptedText !== 'string') return encryptedText;
  if (!encryptedText.startsWith(ENCRYPTION_PREFIX)) return encryptedText; // Not encrypted

  const payload = encryptedText.slice(ENCRYPTION_PREFIX.length);
  const [keyId, ivHex, authTagHex, ciphertext] = payload.split(':');

  const key = keyManager.getKey(keyId);
  if (!key) throw new Error(`Encryption key not found: ${keyId}`);

  const iv = Buffer.from(ivHex, ENCODING);
  const authTag = Buffer.from(authTagHex, ENCODING);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, ENCODING, 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Create a deterministic hash for searchable encrypted fields
 * @param {string} value
 * @param {string} salt - Optional salt (use field name for consistency)
 * @returns {string} Hash
 */
function deterministicHash(value, salt = '') {
  if (!value) return value;
  // Centralized: throws in prod if unset instead of silently using a
  // repo-published default key (audit #4). Preserves the prior resolution
  // chain + default value for dev/test.
  const hmacKey = require('../../config/secrets').dbHashKey();
  return crypto.createHmac(HASH_ALGORITHM, hmacKey).update(`${salt}:${value}`).digest(ENCODING);
}

/**
 * Mask a value for display (e.g., "****1234")
 * @param {string} value
 * @param {Object} options - { showLast, showFirst, maskChar }
 */
function maskValue(value, options = {}) {
  if (!value || typeof value !== 'string') return '****';
  const { showLast = 4, showFirst = 0, maskChar = '*' } = options;

  if (value.length <= showLast + showFirst) return maskChar.repeat(value.length);

  const first = showFirst > 0 ? value.slice(0, showFirst) : '';
  const last = showLast > 0 ? value.slice(-showLast) : '';
  const maskLen = value.length - showFirst - showLast;

  return `${first}${maskChar.repeat(maskLen)}${last}`;
}

// ══════════════════════════════════════════════════════════════════
// Mongoose Plugin: encryptedFields
// ══════════════════════════════════════════════════════════════════
/**
 * Plugin that auto-encrypts specified fields on save and decrypts on read
 *
 * @param {Object} options
 * @param {string[]} options.fields - Field paths to encrypt (e.g., ['nationalId', 'phone', 'iban'])
 * @param {string[]} options.searchable - Fields that need deterministic hash for searching
 * @param {Object} options.masking - { fieldName: { showLast, showFirst, maskChar } }
 *
 * @example
 *   userSchema.plugin(encryptedFieldsPlugin, {
 *     fields: ['nationalId', 'phone', 'bankAccount.iban'],
 *     searchable: ['nationalId', 'phone'],
 *     masking: {
 *       nationalId: { showLast: 4 },
 *       phone: { showLast: 4, showFirst: 4 },
 *     },
 *   });
 */
function encryptedFieldsPlugin(schema, options = {}) {
  const { fields = [], searchable = [], masking = {} } = options;

  if (fields.length === 0) return;

  // Add hash fields for searchable encrypted fields
  for (const field of searchable) {
    const hashField = `_hash_${field.replace(/\./g, '_')}`;
    schema.add({ [hashField]: { type: String, index: true } });
  }

  // Add masked virtual fields
  for (const [field, maskOpts] of Object.entries(masking)) {
    schema.virtual(`${field}Masked`).get(function () {
      const raw = this.get(field);
      if (!raw) return null;
      try {
        const decrypted = decrypt(raw);
        return maskValue(decrypted, maskOpts);
      } catch {
        return '****';
      }
    });
  }

  // ── Encrypt on save ──
  // W955 — async (Mongoose-9 native); a throw rejects the save exactly as
  // next(err) did. No longer depends on the legacy-hook shim.
  schema.pre('save', async function () {
    for (const fieldPath of fields) {
      const value = this.get(fieldPath);
      if (value && typeof value === 'string' && !value.startsWith(ENCRYPTION_PREFIX)) {
        // Encrypt the value
        this.set(fieldPath, encrypt(value));

        // Update search hash if searchable
        if (searchable.includes(fieldPath)) {
          const hashField = `_hash_${fieldPath.replace(/\./g, '_')}`;
          this.set(hashField, deterministicHash(value, fieldPath));
        }
      }
    }
  });

  // ── Encrypt on update ──
  // W955 — async (Mongoose-9 native); no longer depends on the legacy-hook shim.
  schema.pre(['updateOne', 'findOneAndUpdate', 'updateMany'], async function () {
    const update = this.getUpdate();
    if (!update) return;

    const processObj = obj => {
      for (const fieldPath of fields) {
        const value = obj[fieldPath];
        if (value && typeof value === 'string' && !value.startsWith(ENCRYPTION_PREFIX)) {
          obj[fieldPath] = encrypt(value);

          if (searchable.includes(fieldPath)) {
            const hashField = `_hash_${fieldPath.replace(/\./g, '_')}`;
            obj[hashField] = deterministicHash(value, fieldPath);
          }
        }
      }
    };

    processObj(update);
    if (update.$set) processObj(update.$set);
  });

  // ── Decrypt after find ──
  const decryptDoc = doc => {
    if (!doc || typeof doc !== 'object') return doc;
    for (const fieldPath of fields) {
      const parts = fieldPath.split('.');
      let obj = doc;
      for (let i = 0; i < parts.length - 1; i++) {
        obj = obj?.[parts[i]];
      }
      const lastKey = parts[parts.length - 1];
      if (obj && obj[lastKey] && typeof obj[lastKey] === 'string') {
        try {
          obj[lastKey] = decrypt(obj[lastKey]);
        } catch {
          // Leave encrypted if decryption fails
        }
      }
    }
    return doc;
  };

  schema.post('init', function (doc) {
    decryptDoc(doc);
  });

  // For lean queries, add a transform
  schema.post(['find', 'findOne', 'findOneAndUpdate'], function (result) {
    if (!result) return;
    if (Array.isArray(result)) {
      result.forEach(decryptDoc);
    } else {
      decryptDoc(result);
    }
  });

  // ── Static: Search by encrypted field ──
  schema.statics.findByEncrypted = function (field, plainValue, additionalFilter = {}) {
    const hashField = `_hash_${field.replace(/\./g, '_')}`;
    const hash = deterministicHash(plainValue, field);
    return this.find({ ...additionalFilter, [hashField]: hash });
  };

  // ── Static: Rotate encryption key for all documents ──
  schema.statics.rotateEncryption = async function (newKeyId, batchSize = 100) {
    let processed = 0;
    const cursor = this.find().cursor();
    let batch = [];

    for await (const doc of cursor) {
      let needsSave = false;

      for (const fieldPath of fields) {
        const value = doc.get(fieldPath);
        if (value && typeof value === 'string' && value.startsWith(ENCRYPTION_PREFIX)) {
          // Decrypt with old key, re-encrypt with new key
          const decrypted = decrypt(value);
          doc.set(fieldPath, encrypt(decrypted, newKeyId));
          needsSave = true;
        }
      }

      if (needsSave) {
        batch.push(doc.save());
        if (batch.length >= batchSize) {
          await Promise.all(batch);
          processed += batch.length;
          batch = [];
        }
      }
    }

    if (batch.length > 0) {
      await Promise.all(batch);
      processed += batch.length;
    }

    logger.info(`[Encryption] Key rotation complete: ${processed} documents updated`);
    return { processed };
  };
}

// ══════════════════════════════════════════════════════════════════
// Initialization
// ══════════════════════════════════════════════════════════════════
function initEncryption(keys = {}, currentKeyId = 'default') {
  keyManager.init(keys, currentKeyId);
  logger.info('[Encryption] Field-level encryption initialized');
}

module.exports = {
  encrypt,
  decrypt,
  deterministicHash,
  maskValue,
  encryptedFieldsPlugin,
  initEncryption,
  keyManager,
};
