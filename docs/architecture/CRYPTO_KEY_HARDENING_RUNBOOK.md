# Crypto-Key Hardening Runbook (audit #4/#5/#12/#13/#16)

Companion to `docs/architecture/PROJECT_AUDIT_2026-05-29.md`. These five findings
all share one hazard: **a secret/key currently falls back to a hardcoded default,
and naively requiring a new value (or changing a cipher) invalidates data that was
already produced under the old key.** This runbook gives a safe rollout for each,
covering both prod states.

## The one decision that drives everything

> **Is the dedicated env var already set in production, or is prod running on the code default?**

| Prod state                                           | What the fix can do                               | Migration needed                                                                                                                                                                                                                            |
| ---------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Env var already set** (e.g. `DB_HASH_KEY` present) | Route through `config/secrets.js`, throw-in-prod. | **None** — prod already uses the strong key; you're only removing the dead default branch. Ship immediately.                                                                                                                                |
| **Unset / running on the default**                   | Same code change, but stage the env first.        | Yes — see the per-finding "Migration" rows. The safe universal first step is: **set the env var to the _current legacy default value_** so existing data still validates, deploy, then optionally rotate to a strong key with a re-key job. |

The code change is identical in both cases; only the deploy sequence differs.

## Universal code pattern

Replace each `process.env.X || 'literal-default'` with the centralized helper that
already throws in production on missing required secrets:

```js
// backend/config/secrets.js already exports secret(envKey, devFallback, required)
const { secret } = require('../config/secrets'); // adjust relative path
const hmacKey = secret('DB_HASH_KEY', 'dev-only-db-hash-key', true);
```

`required: true` → throws in prod if unset (forces configuration), uses the dev
fallback only outside production. This matches `jwtSecret`/`encryptionKey` already
in `config/secrets.js`.

## Per-finding specifics

### #4 — `backend/database/plugins/field-encryption.js:164` (`deterministicHash`)

- **Role:** HMAC that blinds searchable encrypted fields (e.g. national ID). Deterministic — the same input must hash the same way for search to work.
- **Code:** `DB_HASH_KEY || DB_ENCRYPTION_KEY || 'default-hash-key'` → `secret('DB_HASH_KEY', …, true)` (keep `DB_ENCRYPTION_KEY` as a documented secondary).
- **Migration (only if key value changes):** every stored deterministic hash must be recomputed. Write a one-off job that reads each searchable-encrypted doc, recomputes `deterministicHash` with the new key, and updates the blind-index field. Until it finishes, **search by those fields returns nothing** — run it in a maintenance window or dual-write both hashes during transition.

### #5 + #16 — `backend/services/documents/documentIntegrations.service.js:228/235`

- **Role:** Encrypts third-party integration credentials. Uses `INTEGRATION_SECRET || 'integration-default-key-32chars!!'`, a **static scrypt salt** (`'salt'`), and **AES-256-CBC (unauthenticated)**.
- **Code:** route the key via `secret('INTEGRATION_SECRET', …, true)`; replace the constant salt with a per-record random salt stored alongside the ciphertext; switch the cipher to **AES-256-GCM** (`createCipheriv('aes-256-gcm', …)` + `getAuthTag`/`setAuthTag`), mirroring `field-encryption.js`.
- **Migration (key/salt/cipher all change → existing ciphertext unreadable):** decrypt-with-old → re-encrypt-with-new. Implement a versioned envelope (prefix ciphertext with `v2:` and a stored salt + authTag); keep a legacy `decrypt` path that recognizes the old `iv:ciphertext` CBC format so old rows still read until re-encrypted. Re-encrypt lazily on next write, or via a one-off job.

### #12 — `backend/services/documents/documentQRCode.service.js:167`

- **Role:** HMAC that makes document QR codes verifiable. `QR_SECRET || 'doc-qr-secret'`.
- **Code:** `secret('QR_SECRET', …, true)`.
- **Migration (only if value changes):** already-printed QR codes verify against the old secret. Either (a) accept **both** old and new secrets during a transition window, or (b) regenerate/re-issue QR codes. Forward-only if no QR codes exist yet.

### #13 — `backend/integrations/nafath/signingClient.js:37`

- **Role:** HS secret for Nafath JWS signing. `NAFATH_JWS_HS_SECRET || 'alawael-nafath-mock-secret-do-not-use-in-prod'`.
- **Code:** `secret('NAFATH_JWS_HS_SECRET', …, true)`.
- **Migration: none for stored data** — each signature is verified at creation time; this is forward-only. ⚠️ But any signatures already produced with the _mock_ secret are cryptographically worthless; treat them as unsigned and re-sign if they matter.

## Recommended rollout order

1. **#13** (no data migration) — ship first; pure win.
2. **#4** + **#12** — ship the code; run the re-key/re-hash job (or dual-accept window) per the migration rows.
3. **#5/#16** — highest effort (versioned envelope + cipher swap); do last with the legacy-decrypt fallback so nothing breaks mid-migration.

## Verification per change

- `node --check` the file.
- Round-trip test: encrypt/hash → persist → read back → decrypt/verify against `MongoMemoryServer`.
- Confirm `config/secrets.js` throws in prod when the env var is unset (the W276 drift guard already scans factory construction sites; add the new secret keys to any relevant allow-list).
