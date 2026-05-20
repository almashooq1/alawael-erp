/**
 * ssoKeys.service.js — RS256 key management for SSO/OIDC (W205c).
 *
 * Provides:
 *   - getPrivateKeyPem()      → PEM string for jwt.sign
 *   - getPublicJwks()         → JSON Web Key Set (array of {kty,kid,use,alg,n,e})
 *   - getActiveKid()          → key ID used for new tokens
 *   - getKeyMaterial()        → { privatePem, publicPem, kid } for the active key
 *
 * Key source precedence:
 *   1. SSO_RSA_PRIVATE_KEY env var (PEM, supports \n-escaped or real newlines)
 *      + optional SSO_RSA_KID for the kid header. The public half is derived.
 *   2. On-disk cache at SSO_KEYS_DIR (default backend/.sso-keys/) — keep across
 *      restarts so previously-issued tokens keep verifying.
 *   3. Generate ephemeral keypair on first call (test/dev only — survives the
 *      process lifetime but is lost on restart).
 *
 * Multi-key (rotation) support: this service can hold N public keys for
 * verification but signs new tokens with exactly one (the "active" key).
 * Rotation procedure: bump SSO_RSA_KID and SSO_RSA_PRIVATE_KEY in env; keep
 * the old public key in the JWKS for the lifetime of the longest-lived
 * outstanding token (we expose addLegacyPublicKey() for that).
 */

'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const KEYS_DIR = process.env.SSO_KEYS_DIR || path.join(__dirname, '..', '.sso-keys');
const ACTIVE_PRIV_FILE = path.join(KEYS_DIR, 'rs256.private.pem');
const ACTIVE_PUB_FILE = path.join(KEYS_DIR, 'rs256.public.pem');
const ACTIVE_KID_FILE = path.join(KEYS_DIR, 'rs256.kid');

let _initialized = false;
let _activeKid = null;
let _privatePem = null;
let _publicPem = null;
// kid → publicPem map for verification (active + legacy keys)
const _publicKeys = new Map();

function normalizePem(s) {
  if (!s) return null;
  // Allow envs that escape newlines as literal "\n"
  return s.replace(/\\n/g, '\n').trim();
}

function deriveKidFromPublicPem(pubPem) {
  const sha = crypto.createHash('sha256').update(pubPem).digest('base64');
  return sha.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '').slice(0, 16);
}

function generateNewKeypair() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  return { publicPem: publicKey, privatePem: privateKey };
}

function loadFromDisk() {
  try {
    if (
      fs.existsSync(ACTIVE_PRIV_FILE) &&
      fs.existsSync(ACTIVE_PUB_FILE) &&
      fs.existsSync(ACTIVE_KID_FILE)
    ) {
      const privatePem = fs.readFileSync(ACTIVE_PRIV_FILE, 'utf8');
      const publicPem = fs.readFileSync(ACTIVE_PUB_FILE, 'utf8');
      const kid = fs.readFileSync(ACTIVE_KID_FILE, 'utf8').trim();
      return { privatePem, publicPem, kid };
    }
  } catch (err) {
    logger.warn('[ssoKeys] disk load failed:', err.message);
  }
  return null;
}

function persistToDisk(privatePem, publicPem, kid) {
  try {
    if (!fs.existsSync(KEYS_DIR)) {
      fs.mkdirSync(KEYS_DIR, { recursive: true, mode: 0o700 });
    }
    fs.writeFileSync(ACTIVE_PRIV_FILE, privatePem, { mode: 0o600 });
    fs.writeFileSync(ACTIVE_PUB_FILE, publicPem, { mode: 0o644 });
    fs.writeFileSync(ACTIVE_KID_FILE, kid, { mode: 0o644 });
  } catch (err) {
    logger.warn('[ssoKeys] disk persist failed (continuing in-memory):', err.message);
  }
}

function initIfNeeded() {
  if (_initialized) return;

  // 1. env var path
  const envPriv = normalizePem(process.env.SSO_RSA_PRIVATE_KEY);
  if (envPriv) {
    try {
      const privateKey = crypto.createPrivateKey(envPriv);
      const publicKey = crypto.createPublicKey(privateKey);
      const publicPem = publicKey.export({ type: 'spki', format: 'pem' });
      const kid = process.env.SSO_RSA_KID || deriveKidFromPublicPem(publicPem);
      _privatePem = envPriv;
      _publicPem = publicPem;
      _activeKid = kid;
      _publicKeys.set(kid, publicPem);
      _initialized = true;
      logger.info(`[ssoKeys] loaded RS256 key from env (kid=${kid})`);
      return;
    } catch (err) {
      logger.warn('[ssoKeys] env SSO_RSA_PRIVATE_KEY invalid, falling through:', err.message);
    }
  }

  // 2. disk cache
  const fromDisk = loadFromDisk();
  if (fromDisk) {
    _privatePem = fromDisk.privatePem;
    _publicPem = fromDisk.publicPem;
    _activeKid = fromDisk.kid;
    _publicKeys.set(fromDisk.kid, fromDisk.publicPem);
    _initialized = true;
    logger.info(`[ssoKeys] loaded RS256 key from disk (kid=${_activeKid})`);
    return;
  }

  // 3. generate ephemeral keypair (and try to persist for next restart)
  const fresh = generateNewKeypair();
  const kid = deriveKidFromPublicPem(fresh.publicPem);
  _privatePem = fresh.privatePem;
  _publicPem = fresh.publicPem;
  _activeKid = kid;
  _publicKeys.set(kid, fresh.publicPem);
  _initialized = true;
  persistToDisk(fresh.privatePem, fresh.publicPem, kid);
  logger.info(`[ssoKeys] generated new RS256 key (kid=${kid})`);
}

/**
 * Convert an SPKI public-key PEM to a JWK with kid/alg/use.
 */
function publicPemToJwk(pem, kid) {
  const keyObject = crypto.createPublicKey(pem);
  // Node ≥15 supports format:'jwk'
  const jwk = keyObject.export({ format: 'jwk' });
  return {
    kty: jwk.kty,
    use: 'sig',
    alg: 'RS256',
    kid,
    n: jwk.n,
    e: jwk.e,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────

function getActiveKid() {
  initIfNeeded();
  return _activeKid;
}

function getPrivateKeyPem() {
  initIfNeeded();
  return _privatePem;
}

function getPublicKeyPem(kid) {
  initIfNeeded();
  return _publicKeys.get(kid) || null;
}

function getActivePublicKeyPem() {
  initIfNeeded();
  return _publicPem;
}

/**
 * Register a legacy public key for verification only (e.g. after rotation).
 */
function addLegacyPublicKey(pem, kid) {
  const id = kid || deriveKidFromPublicPem(pem);
  _publicKeys.set(id, pem);
  return id;
}

function getKeyMaterial() {
  initIfNeeded();
  return { privatePem: _privatePem, publicPem: _publicPem, kid: _activeKid };
}

/**
 * JSON Web Key Set — body for GET /.well-known/jwks.json
 */
function getPublicJwks() {
  initIfNeeded();
  const keys = [];
  for (const [kid, pem] of _publicKeys.entries()) {
    try {
      keys.push(publicPemToJwk(pem, kid));
    } catch (err) {
      logger.warn('[ssoKeys] JWK export failed for kid=' + kid, err.message);
    }
  }
  return { keys };
}

/**
 * Reset internal state — TEST-ONLY helper.
 */
function _resetForTests() {
  _initialized = false;
  _activeKid = null;
  _privatePem = null;
  _publicPem = null;
  _publicKeys.clear();
}

module.exports = {
  getActiveKid,
  getPrivateKeyPem,
  getPublicKeyPem,
  getActivePublicKeyPem,
  addLegacyPublicKey,
  getKeyMaterial,
  getPublicJwks,
  _resetForTests,
};
