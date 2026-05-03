/**
 * backup-crypto.js — streaming AES-256-GCM for backup archives.
 *
 * Why a new module?
 *   `database-backup-service.js` already has GCM helpers, but they read the
 *   whole file into memory (`encrypt(string) → string`). Production backups
 *   can be multi-GB; we need a streaming pipeline that works for any size.
 *
 * On-disk format (`.enc` files):
 *   ┌─────────┬────────┬──────────┬────────┬────────────┬──────────┐
 *   │ magic   │ version│ reserved │ IV     │ ciphertext │ auth tag │
 *   │ 4 bytes │ 1 byte │  1 byte  │ 12 B   │ variable   │ 16 bytes │
 *   │ "AWAE"  │  0x01  │   0x00   │ random │            │ trailing │
 *   └─────────┴────────┴──────────┴────────┴────────────┴──────────┘
 *
 * Header is 18 bytes, footer is 16 bytes, total fixed overhead = 34 bytes.
 *
 * Key requirements:
 *   • 32 bytes (AES-256)
 *   • Provided as a 64-char hex string in env BACKUP_ENCRYPTION_KEY
 *   • Generate with: `node backend/scripts/backup-keygen.js`
 *
 * GCM gotcha:
 *   The auth tag is produced AFTER all plaintext is encrypted, so we append
 *   it after the cipher stream finishes. On decrypt we have to hold back the
 *   last 16 bytes of the file — those are the tag, not ciphertext.
 */

'use strict';

const crypto = require('crypto');
const fs = require('fs');
const { Transform, pipeline } = require('stream');
const { promisify } = require('util');

const pipelineAsync = promisify(pipeline);

const MAGIC = Buffer.from('AWAE', 'utf8');
const VERSION = 0x01;
const HEADER_LEN = 4 + 1 + 1 + 12; // 18
const TAG_LEN = 16;
const IV_LEN = 12;
const KEY_LEN = 32;
const ALGO = 'aes-256-gcm';

function loadKey(hex) {
  if (!hex) throw new Error('BACKUP_ENCRYPTION_KEY is not set');
  if (typeof hex !== 'string' || !/^[0-9a-fA-F]+$/.test(hex)) {
    throw new Error('BACKUP_ENCRYPTION_KEY must be a hex string');
  }
  const buf = Buffer.from(hex, 'hex');
  if (buf.length !== KEY_LEN) {
    throw new Error(`BACKUP_ENCRYPTION_KEY must decode to ${KEY_LEN} bytes (got ${buf.length})`);
  }
  return buf;
}

function generateKey() {
  return crypto.randomBytes(KEY_LEN).toString('hex');
}

function buildHeader(iv) {
  const header = Buffer.alloc(HEADER_LEN);
  MAGIC.copy(header, 0);
  header[4] = VERSION;
  header[5] = 0; // reserved
  iv.copy(header, 6);
  return header;
}

function parseHeader(header) {
  if (header.length < HEADER_LEN) throw new Error('encrypted file: header too short');
  if (!header.subarray(0, 4).equals(MAGIC)) throw new Error('encrypted file: bad magic');
  const version = header[4];
  if (version !== VERSION) throw new Error(`encrypted file: unsupported version ${version}`);
  const iv = header.subarray(6, 6 + IV_LEN);
  return { version, iv };
}

/**
 * Stream-encrypt `inputPath` → `outputPath` using AES-256-GCM.
 * Returns metadata (sizes, durationMs).
 */
async function encryptFile({ inputPath, outputPath, keyHex }) {
  const key = loadKey(keyHex);
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const startedAt = Date.now();

  const out = fs.createWriteStream(outputPath);
  out.write(buildHeader(iv));

  await pipelineAsync(
    fs.createReadStream(inputPath),
    cipher,
    async function* (source) {
      for await (const chunk of source) yield chunk;
    },
    out
  );

  // pipeline ended out — but we still need the auth tag, which is only
  // available after cipher.final(). Append it now via a fresh writer.
  const tag = cipher.getAuthTag();
  await new Promise((resolve, reject) => {
    fs.appendFile(outputPath, tag, err => (err ? reject(err) : resolve()));
  });

  const inSize = fs.statSync(inputPath).size;
  const outSize = fs.statSync(outputPath).size;
  return {
    durationMs: Date.now() - startedAt,
    plaintextBytes: inSize,
    ciphertextBytes: outSize,
    overhead: outSize - inSize,
  };
}

/**
 * Transform that buffers the last `tailBytes` of the stream and emits
 * everything else. On flush, it surfaces the held-back tail via callback.
 *
 * Used to peel the 16-byte GCM auth tag off the end of an encrypted file
 * while streaming the rest into the decipher.
 */
class TailHolder extends Transform {
  constructor(tailBytes, onTail) {
    super();
    this.tailBytes = tailBytes;
    this.onTail = onTail;
    this.buffer = Buffer.alloc(0);
  }

  _transform(chunk, _enc, cb) {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    if (this.buffer.length > this.tailBytes) {
      const flushable = this.buffer.subarray(0, this.buffer.length - this.tailBytes);
      this.buffer = this.buffer.subarray(this.buffer.length - this.tailBytes);
      this.push(flushable);
    }
    cb();
  }

  _flush(cb) {
    if (this.buffer.length !== this.tailBytes) {
      return cb(
        new Error(`encrypted file: expected ${this.tailBytes}-byte tail, got ${this.buffer.length}`)
      );
    }
    this.onTail(this.buffer);
    cb();
  }
}

/**
 * Stream-decrypt `inputPath` → `outputPath`. Throws if the auth tag fails.
 */
async function decryptFile({ inputPath, outputPath, keyHex }) {
  const key = loadKey(keyHex);
  const startedAt = Date.now();

  const fd = fs.openSync(inputPath, 'r');
  const header = Buffer.alloc(HEADER_LEN);
  fs.readSync(fd, header, 0, HEADER_LEN, 0);
  fs.closeSync(fd);
  const { iv } = parseHeader(header);

  const decipher = crypto.createDecipheriv(ALGO, key, iv);

  await new Promise((resolve, reject) => {
    const source = fs.createReadStream(inputPath, { start: HEADER_LEN });
    const tailHolder = new TailHolder(TAG_LEN, tag => decipher.setAuthTag(tag));
    const sink = fs.createWriteStream(outputPath);

    source.on('error', reject);
    tailHolder.on('error', reject);
    decipher.on('error', reject);
    sink.on('error', reject);
    sink.on('finish', resolve);

    source.pipe(tailHolder).pipe(decipher).pipe(sink);
  });

  const inSize = fs.statSync(inputPath).size;
  const outSize = fs.statSync(outputPath).size;
  return {
    durationMs: Date.now() - startedAt,
    ciphertextBytes: inSize,
    plaintextBytes: outSize,
  };
}

function isEncryptedFile(p) {
  if (!fs.existsSync(p)) return false;
  const stat = fs.statSync(p);
  if (!stat.isFile() || stat.size < HEADER_LEN + TAG_LEN) return false;
  const fd = fs.openSync(p, 'r');
  const buf = Buffer.alloc(4);
  fs.readSync(fd, buf, 0, 4, 0);
  fs.closeSync(fd);
  return buf.equals(MAGIC);
}

module.exports = {
  encryptFile,
  decryptFile,
  generateKey,
  isEncryptedFile,
  // exposed for tests + tooling
  HEADER_LEN,
  TAG_LEN,
  MAGIC,
  VERSION,
};
