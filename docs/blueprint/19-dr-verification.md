# 19 — DR Verification & Backup Alerting

> **Why this exists**
>
> A backup that has never been restored is not a backup. Until 2026-05-02 the
> Al-Awael ERP had a mature backup pipeline (4 scripts, 6 services, daily
> archives, S3 sync, 30-day retention) but **zero automated restore drills**.
> This runbook describes the verification + alerting layer added on top so a
> bad/missing backup is detected within 24h instead of during a real disaster.

## Components added

| File                                     | Purpose                                                                                                                                                                                                                 |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `backend/services/ops-alerter.js`        | Thin wrapper over `unifiedNotifier` that fans an operational alert to all admins listed in `OPS_ALERT_EMAIL` / `OPS_ALERT_PHONE`. Errors inside the alerter are swallowed so alerting never masks the original failure. |
| `backend/scripts/dr-verify.js`           | Locates the most recent backup, restores it into a sandbox database, asserts that critical collections meet minimum row counts, drops the sandbox, and fires `ops-alerter` on failure.                                  |
| `backend/config/backup.js`               | Existing scheduler — now calls `ops-alerter` when the daily `mongodump` itself fails.                                                                                                                                   |
| `backend/tests/unit/ops-alerter.test.js` | 5 tests — recipients, severity, error swallowing, channel override.                                                                                                                                                     |
| `backend/tests/unit/dr-verify.test.js`   | 8 tests — backup discovery, stale-backup early-fail, dry-run, missing-backup, count thresholds.                                                                                                                         |

## How it works

```
                                ┌──────────────┐
backupMongoDB() fails ─────────►│ ops-alerter  │── whatsapp ─► on-call
                                │              │── sms ──────► on-call
dr-verify.js detects:           │              │── email ────► all admins
  • no backup found             │              │
  • backup > 36h old            │              │
  • restore fails               │              │
  • collection counts too low ─►│              │
                                └──────────────┘
```

Sandbox database name: `alawael_dr_verify_<unix-ms>` — dropped at the end of
each run regardless of success.

## Operating it

### One-off run (manual drill)

```bash
node backend/scripts/dr-verify.js              # full restore + verify
node backend/scripts/dr-verify.js --dry-run    # locate latest backup only
node backend/scripts/dr-verify.js --json       # machine-readable output
```

Exit code is `0` on success, `1` on verification failure, `2` on script crash.

### Scheduled run (production)

The script is intentionally **not** mounted into the Node.js scheduler so it
runs in a clean process and cannot interfere with the live workload.

It is scheduled via **GitHub Actions** (preferred — runs even if the VPS or
its pm2 process is down, which is the failure mode we most need to detect):

- Workflow: `.github/workflows/dr-verify.yml`
- Cadence: `0 4 * * *` UTC = 07:00 KSA (after the 02:00 KSA backup, before
  business hours)
- Manual trigger: GitHub UI → Actions → "DR Drill (daily)" → Run workflow.
  Pass `dry_run=true` to skip the actual restore (useful when the VPS disk
  is tight and you only want to confirm a recent archive exists).
- Secrets reused from `deploy-hostinger.yml`: `VPS_HOST`, `VPS_USER`,
  `VPS_SSH_KEY`.

**Two-layer alerting:**

1. The script itself fires `ops-alerter` (whatsapp/sms/email) on failure.
2. GitHub Actions sends the standard workflow-failure email to repo admins.

Both run independently so a single point of failure (e.g. SMS provider down)
won't silence the alarm.

The JSON report is uploaded as a workflow artifact (`dr-report-<run-id>`)
with 30-day retention.

### Required env

| Variable               | Purpose                                                                             | Example                                 |
| ---------------------- | ----------------------------------------------------------------------------------- | --------------------------------------- |
| `MONGODB_URI`          | Source cluster (script overrides the db part with the sandbox name)                 | `mongodb://localhost:27017/alawael-erp` |
| `BACKUP_DIR`           | Where `backupMongoDB()` writes archives                                             | `backend/backups`                       |
| `DB_BACKUP_DIR`        | Where `db-backup.js` writes directory dumps                                         | `backups/mongodb`                       |
| `OPS_ALERT_EMAIL`      | Comma-separated admin emails (no recipients = alert silently dropped with warn log) | `oncall@alaweal.org,cto@alaweal.org`    |
| `OPS_ALERT_PHONE`      | Comma-separated phones for whatsapp/sms fallback chain                              | `+966500000001,+966500000002`           |
| `DR_MIN_USERS`         | Minimum users to consider backup healthy                                            | `1` (default)                           |
| `DR_MIN_BENEFICIARIES` | Minimum beneficiaries                                                               | `0` (default)                           |

### What gets checked

Critical collections (configured in `dr-verify.js → CRITICAL_COLLECTIONS`):

- `users` — min 1 (cluster is non-functional with zero users)
- `beneficiaries`
- `branches`
- `roles`

Add more by editing the array. The script counts via the sandbox DB only — the
production database is never touched.

## SLOs

| Metric                 | Target                   | Source of truth                                 |
| ---------------------- | ------------------------ | ----------------------------------------------- |
| RPO (data loss window) | ≤ 24h                    | `BACKUP_INTERVAL = 24h` in `config/backup.js`   |
| RTO (time to restore)  | ≤ 4h                     | Documented in `docs/archive/BACKUP_RECOVERY.md` |
| Backup-stale alert     | > 36h since last archive | `dr-verify.js` early-fail branch                |
| DR drill cadence       | Daily                    | This script                                     |
| Alert delivery         | < 5 min from failure     | `ops-alerter` → whatsapp/sms/email              |

## Failure-mode flags

- `mongorestore_not_installed` — VPS missing MongoDB Database Tools.
- `no_backup_found` — both backup directories empty. Production-blocking.
- `backup_stale (Xh old)` — most recent backup is older than 36h. Investigate
  the scheduler, the Redis lock, and pm2 logs.
- `count_threshold_failed` — restore succeeded but a critical collection has
  fewer rows than expected. Either the source DB is being wiped, or the
  backup itself is corrupt — compare against live counts before re-running.

## Why ops-alerter is separate from unifiedNotifier

`unifiedNotifier` is a generic delivery primitive — it requires a recipient
object per call and writes to `NotificationLog` for audit. `ops-alerter`
adapts it for the on-call use case:

1. Recipients come from **env**, not the database, so it works even when the
   DB is the thing that broke.
2. Errors are **swallowed** — alerting must never throw, because that would
   mask the original failure that triggered it.
3. The subject is auto-prefixed with severity + kind for filtering in
   admin inboxes.

## Encryption-at-rest (PDPL / NPHIES)

Saudi PDPL (Personal Data Protection Law) and the NPHIES integration spec
both require healthcare PII to be encrypted-at-rest. Plain `mongodump` gzip
archives sitting on disk **fail this requirement**, so backups are encrypted
post-dump with AES-256-GCM.

### Components

| File                               | Purpose                                                                                                                                                                                                                                                                         |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `backend/utils/backup-crypto.js`   | Streaming AES-256-GCM encrypt/decrypt (works on multi-GB archives without buffering into memory). Custom `AWAE` file format: 18-byte header (magic + version + 12-byte IV) + ciphertext + 16-byte trailing GCM auth tag.                                                        |
| `backend/scripts/backup-keygen.js` | One-shot CLI that prints a fresh 32-byte hex key.                                                                                                                                                                                                                               |
| `backend/config/backup.js`         | If `BACKUP_ENCRYPTION_KEY` is set, every scheduled archive is encrypted in-place (`<file>.gz.enc`) and the plaintext is deleted. If encryption fails, the scheduler **rejects** so `ops-alerter` fires — a plaintext archive sitting on disk is treated as a security incident. |
| `backend/scripts/dr-verify.js`     | Recognizes `.gz.enc` files as `archive-encrypted` kind. The drill decrypts to a temp file, restores, then deletes the temp.                                                                                                                                                     |

### Initial setup

```bash
# 1. Generate a key on the VPS (NOT a dev laptop)
node backend/scripts/backup-keygen.js

# 2. Add the printed line to /opt/alawael/.env (root-only, chmod 600):
echo 'BACKUP_ENCRYPTION_KEY=<HEX>' | sudo tee -a /opt/alawael/.env

# 3. Save a copy in the org password manager (1Password / Bitwarden)
#    — losing the key means losing access to every encrypted backup.

# 4. Restart pm2 so the scheduler picks up the env var:
sudo -u alawael pm2 restart all --update-env

# 5. Verify the next backup is encrypted:
ls -la backend/backups/        # should see *.gz.enc, not *.gz
node backend/scripts/dr-verify.js   # should round-trip successfully
```

### Threat model

| Threat                                             | Mitigated? | How                                                                                                                                             |
| -------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Disk theft / lost VPS snapshot                     | ✅         | AES-256-GCM ciphertext is opaque without the key                                                                                                |
| Tampered archive                                   | ✅         | GCM auth tag fails verification on any bit-flip                                                                                                 |
| Replay of old archive                              | ⚠️ partial | We don't sign with metadata; an attacker who possesses any old encrypted archive can re-introduce it. Rely on filesystem mtime + S3 versioning. |
| Compromised VPS where the key sits next to backups | ❌         | Key on the same host means an attacker reads both. Mitigate with off-host key escrow / AWS KMS in a future iteration.                           |

### Key rotation

Today's design uses a single key. To rotate:

```bash
# 1. Generate a new key, BUT KEEP THE OLD ONE
node backend/scripts/backup-keygen.js   # → KEY_NEW

# 2. Decrypt every existing archive with the old key, re-encrypt with the new
for f in backend/backups/*.gz.enc; do
  node -e "
    require('./backend/utils/backup-crypto').decryptFile({
      inputPath: '$f',
      outputPath: '$f.tmp',
      keyHex: process.env.OLD_KEY,
    }).then(() =>
      require('./backend/utils/backup-crypto').encryptFile({
        inputPath: '$f.tmp',
        outputPath: '$f',
        keyHex: process.env.NEW_KEY,
      })
    );
  "
  rm "$f.tmp"
done

# 3. Update .env to BACKUP_ENCRYPTION_KEY=KEY_NEW
# 4. Restart pm2; run dr-verify to confirm
# 5. Only after dr-verify passes, retire KEY_OLD from the password manager
```

A multi-key registry (versioned, with key-id in the file header) is a
v2 feature — current files all use header version `0x01` so adding it later
is forward-compatible.

## Tests

```
backend/tests/unit/ops-alerter.test.js     #  5 tests
backend/tests/unit/dr-verify.test.js       #  9 tests
backend/tests/unit/backup-crypto.test.js   # 16 tests (incl. tamper detection)
```

Run all: `npx jest tests/unit/ops-alerter.test.js tests/unit/dr-verify.test.js tests/unit/backup-crypto.test.js`
