const crypto = require('crypto');

const PREFIX = 'enc:';
const ALGORITHM = 'aes-256-gcm';

const getKey = () => {
  // Only use explicit DATA_ENCRYPTION_KEY - no fallback to JWT_SECRET in production
  const rawKey = process.env.DATA_ENCRYPTION_KEY || '';

  if (!rawKey) return null;

  return crypto.createHash('sha256').update(rawKey).digest();
};

const isEncrypted = value => typeof value === 'string' && value.startsWith(PREFIX);

const encrypt = value => {
  if (value === null || typeof value === 'undefined') return value;
  if (isEncrypted(value)) return value;

  const key = getKey();
  if (!key) return value;

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const plaintext = typeof value === 'string' ? value : JSON.stringify(value);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const tag = cipher.getAuthTag();

  return `${PREFIX}${iv.toString('hex')}:${encrypted}:${tag.toString('hex')}`;
};

const decrypt = value => {
  if (!isEncrypted(value)) return value;

  const key = getKey();
  if (!key) return value;

  const payload = value.slice(PREFIX.length);
  const parts = payload.split(':');
  if (parts.length !== 3) return value;

  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];
  const tag = Buffer.from(parts[2], 'hex');

  try {
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    try {
      return JSON.parse(decrypted);
    } catch {
      return decrypted;
    }
  } catch {
    return value;
  }
};

module.exports = {
  encrypt,
  decrypt,
  isEncrypted,
};
