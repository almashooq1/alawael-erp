# Environment Preflight Check (`env:check`)

**Purpose:** Verify that all security-critical environment variables are set before deployment, preventing runtime crashes on missing keys.

**Tool:** `npm run env:check` (runs `backend/scripts/check-env.js`)

## Quick Start

```bash
cd backend

# Check current environment (reads .env if present + process.env)
npm run env:check

# Exit codes:
# 0 = all required keys present ✓
# 1 = one or more missing ✗
```

## Required Keys (Strict Mode)

The `env:check` preflight enforces these 5 keys when deployed to production or CI:

| Key                  | Purpose                 | Example                                                   | Min Length         |
| -------------------- | ----------------------- | --------------------------------------------------------- | ------------------ |
| `MONGODB_URI`        | Database connection     | `mongodb+srv://user:pass@cluster.mongodb.net/alawael-erp` | 32 chars           |
| `JWT_SECRET`         | Token signing (access)  | `openssl rand -base64 64`                                 | 32 chars           |
| `JWT_REFRESH_SECRET` | Token signing (refresh) | `openssl rand -base64 64`                                 | 32 chars, distinct |
| `ENCRYPTION_KEY`     | Data encryption (AES)   | `openssl rand -base64 48`                                 | 32 chars           |
| `SESSION_SECRET`     | Session cookie signing  | `openssl rand -base64 32`                                 | 16 chars           |

These keys map directly to `config/validateEnv.js:STRICT_REQUIRED_KEYS` — the tool cannot drift from the boot validator.

## When `env:check` Runs

- **Locally** (optional): `npm run env:check` before `npm run dev` to catch config issues early.
- **CI/CD** (automatic): Every deployment via `.github/workflows/*` runs `npm run preflight` (which includes this check).
- **Pre-deploy** (mandatory): The `backend/startup/configBootstrap.js` fails the app if strict keys are missing and `NODE_ENV=production` or `CI=true`.

## Sample Output

### ✓ All keys present

```
✓ env:check — all 5 strict-required keys are set
```

Exit: 0

### ✗ Missing keys

```
✖ env:check — 2 of 5 strict-required keys missing/blank:

  • JWT_REFRESH_SECRET
      → openssl rand -base64 64   (min 32 chars, distinct from JWT_SECRET)
  • ENCRYPTION_KEY
      → openssl rand -base64 48   (min 32 chars)

These are enforced at boot when NODE_ENV=production or CI=true.
```

Exit: 1

## Generating Missing Keys

Use OpenSSL to securely generate each key:

```bash
# JWT_SECRET (access token)
openssl rand -base64 64

# JWT_REFRESH_SECRET (refresh token — must be different)
openssl rand -base64 64

# ENCRYPTION_KEY (AES-256 data encryption)
openssl rand -base64 48

# SESSION_SECRET (session cookie)
openssl rand -base64 32

# MONGODB_URI (if using MongoDB Atlas)
# Format: mongodb+srv://username:password@cluster.mongodb.net/database-name?retryWrites=true&w=majority
```

Then set them in `.env` or deploy them to your infrastructure's secret manager.

## Setting Keys in Different Environments

### Local Development

1. Create `.env` in `backend/` directory:

   ```
   MONGODB_URI=mongodb://localhost:27017/alawael-erp
   JWT_SECRET=<paste generated secret>
   JWT_REFRESH_SECRET=<paste generated secret>
   ENCRYPTION_KEY=<paste generated secret>
   SESSION_SECRET=<paste generated secret>
   ```

2. Run preflight:

   ```bash
   npm run env:check
   ```

3. Start dev server:
   ```bash
   npm run dev
   ```

### Staging / Production

1. Store secrets in your infrastructure's secret manager (AWS Secrets Manager, Azure Key Vault, GitHub Secrets, etc.).

2. Deploy environment variables via your CI/CD pipeline:

   ```bash
   export MONGODB_URI="$PROD_MONGODB_URI"
   export JWT_SECRET="$PROD_JWT_SECRET"
   # ... etc
   npm run preflight  # includes env:check
   ```

3. Verify at deploy time:
   ```bash
   npm run env:check
   ```

## Drift Prevention

The required-key list is **imported directly from `config/validateEnv.js:STRICT_REQUIRED_KEYS`**:

- ✅ If a new security-critical key is added to the boot validator, `env:check` automatically includes it.
- ✅ If a key is removed from the validator, `env:check` stops requiring it.
- ❌ Manual env templates cannot drift from the boot validator (no copy-paste maintenance).

A test suite (`backend/__tests__/env-minimum-template-wave1395.test.js`) guards this contract.

## Troubleshooting

### "env:check: command not found"

Ensure `backend/` is the current directory and `node_modules/` is installed:

```bash
cd backend
npm install
npm run env:check
```

### Exit code 1 (missing keys)

1. Check which keys are missing from the output.
2. Generate the missing key using the hint provided.
3. Add it to `.env` or your secret manager.
4. Run `npm run env:check` again.

### "Cannot find module 'dotenv'"

Not a problem — `check-env.js` loads `.env` on a best-effort basis. If `.env` is missing, it reads `process.env` (which is what CI sets). You only need `dotenv` for local development.

## See Also

- [docs/security/THREAT_MODEL.md](../security/THREAT_MODEL.md) — environment isolation threat model
- [docs/wiki/SECURITY_COMPLIANCE_AUDIT_AND_VALIDATION.md](../wiki/SECURITY_COMPLIANCE_AUDIT_AND_VALIDATION.md) — full security posture
- [SECURITY.md](../../SECURITY.md#dynamic-security-scanning-dast) — vulnerability reporting + scanning policy
