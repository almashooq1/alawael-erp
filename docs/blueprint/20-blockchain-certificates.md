# 20 — Blockchain Certificates

**Last updated:** 2026-05-03 — Phase A+B+C+D+E shipped (`v4.1.x`).

This document is the operational runbook for the certificate platform: what
the moving parts are, how to switch chains, how to debug verification, and
what alerts mean.

---

## 1 · System overview

```text
                ┌──────────────────────────────┐
                │   admin UI (web-admin)       │
                │  ──────────────────────────  │
                │  Dashboard · Templates       │
                │  BatchIssue · Logs · Detail  │
                └──────────────┬───────────────┘
                               │ /api/blockchain/*
                               ▼
┌────────────────────────────────────────────────────────────┐
│   backend/routes/blockchain.routes.js   (auth + branch)    │
│   backend/routes/blockchain-public.routes.js (no auth)     │
└──────────────┬───────────────┬─────────────────────────────┘
               │               │
               ▼               ▼
   blockchainCertService    blockchainAutoIssueService
        │                      │
        │   ┌──────────────────┘
        ▼   ▼
   ┌─────────────────────────┐
   │ services/blockchain/    │
   │  ├ merkleTree.js        │
   │  ├ metrics.js           │
   │  ├ autoIssueSubscribers │
   │  └ adapters/            │
   │     ├ internalAdapter   │   ← default
   │     ├ mockEthereumAdapter│  ← demos
   │     └ ethereumAdapter   │   ← real EVM (ethers v6)
   └─────────────────────────┘
```

**Stores:**

- `BlockchainCertificate` — every cert (immutable hash chain)
- `CertificateTemplate` — reusable specs
- `VerificationLog` — every public/admin verification call
- `AnchorLedger` — one row per merkle-root anchor (across all adapters)

---

## 2 · Lifecycle

```text
draft ──issue()──▶ issued ──[batch anchor]──▶ has merkleRoot/proof + tx
   │                  │
   │                  ├──sign()──▶ multi-signature
   │                  └──revoke()─▶ revoked
   │
   └─ cert created from auto-issue (LMS/IEP/onboarding) takes the same path,
      idempotent on (source, sourceRef).
```

The chain hash linkage is **inside** the BlockchainCertificate collection
(`previousHash` → `hash`) AND, separately, anchored by merkle root via the
adapter. Two-layer integrity:

1. **Cert hash** — recomputable from `(recipient, title, data, issueDate, previousHash)`
2. **Merkle proof** — proves the cert was in the batch that produced `merkleRoot`
3. **Anchor lookup** — proves `merkleRoot` was actually written to the chain

The `/verify` endpoint reports all three independently.

---

## 3 · Switching chains

Set `BLOCKCHAIN_NETWORK`:

| value                  | adapter                | requires                                 |
| ---------------------- | ---------------------- | ---------------------------------------- |
| `internal` _(default)_ | InternalAdapter        | nothing                                  |
| `mock-ethereum`        | MockEthereumAdapter    | nothing — fakes 0x-prefixed tx hashes    |
| `mock-polygon`         | MockEthereumAdapter    | nothing                                  |
| `ethereum`             | EthereumAdapter (real) | `npm i ethers@^6` + RPC url + signer key |
| `polygon`              | EthereumAdapter (real) | same as above (with Polygon RPC)         |
| `sepolia`              | EthereumAdapter        | testnet — useful for staging             |
| `amoy`                 | EthereumAdapter        | Polygon testnet                          |

Real-chain env:

```bash
BLOCKCHAIN_NETWORK=polygon
BLOCKCHAIN_ETH_RPC_URL=https://polygon-rpc.example
BLOCKCHAIN_ETH_PRIVATE_KEY=0x…           # hot signer; rotate quarterly
BLOCKCHAIN_CONTRACT_ADDRESS=0x…          # optional: anchor(bytes32) registry
```

If `BLOCKCHAIN_CONTRACT_ADDRESS` is unset the adapter sends a 0-value
self-transfer with the merkle root in calldata. Cheaper than a contract
call but harder to index — recommended only for low-volume setups.

---

## 4 · Auto-issue

Off by default. Turn on with `BLOCKCHAIN_AUTO_ISSUE=1`.

When on, three sources auto-issue certs whenever their record's `status`
flips to `'completed'`:

| Source              | Trigger                                  | Idempotency key                 |
| ------------------- | ---------------------------------------- | ------------------------------- |
| LMS course          | `CourseEnrollment.status='completed'`    | `auto:lms:<enrollmentId>`       |
| Smart IEP           | `SmartIEP.status='completed'`            | `auto:iep:<iepId>`              |
| HR onboarding       | `OnboardingChecklist.status='completed'` | `auto:onboarding:<checklistId>` |
| CPE _(manual call)_ | `autoIssueService.autoIssue({...})`      | `auto:cpe:<userId>:<cycleEnd>`  |

**CPE is not subscribed automatically** — it's a derived state across many
CpdRecord rows. Schedule a job that calls `autoIssue` directly when a
practitioner crosses the renewal threshold.

Failure isolation: auto-issue errors are logged + counted but never
rethrown. A chain outage **must not** block a course from being marked
complete.

---

## 5 · Verification surface

| Endpoint                                         | Auth | Use                                 |
| ------------------------------------------------ | ---- | ----------------------------------- |
| `GET /api/blockchain/verify/:hash`               | yes  | admin → records userId in audit log |
| `GET /api/blockchain/verify/number/:certNumber`  | yes  | redirect to hash variant            |
| `GET /api/v1/blockchain/public/verify/:hash`     | no   | QR-scan landing; PII stripped       |
| `GET /api/v1/blockchain/public/verify/number/:n` | no   | as above                            |

The public endpoints are rate-limited (`apiLimiter`) — check
`backend/middleware/rateLimiter.js` if you need the exact thresholds.

Frontend:

- `/verify` and `/verify/:hash` — public landing page (no shell, no auth)
- `/blockchain-certificates` (+ subpages) — admin UI

---

## 6 · Metrics

Counters emitted via `services/blockchain/metrics.js` and surfaced through
the existing `/integrations-metrics` Prometheus endpoint.

| Metric                           | Labels                                          | Meaning               |
| -------------------------------- | ----------------------------------------------- | --------------------- |
| `blockchain_certificates_total`  | `outcome=created/deduped/issued/signed/revoked` | Cert lifecycle counts |
| `blockchain_anchors_total`       | `network, outcome=success/fail`                 | Adapter calls         |
| `blockchain_verifications_total` | `result, hash_match`                            | Every verify call     |
| `blockchain_auto_issue_total`    | `source, outcome=issued/deduped/error`          | Per-source auto-issue |

Alert rules: `docs/alerts/blockchain-certificates.rules.yml`.

Three alerts to know about:

- **BlockchainAnchorFailureSpike** — chain is degraded; new certs pile up in `draft`. Check the adapter logs first, then RPC health.
- **BlockchainHashTamperDetected** — high-severity: a `valid` cert's hash didn't recompute. Either DB was edited out-of-band or hashing logic drifted. Compare `computeCertHash()` output with the stored `hash` for the cert.
- **BlockchainAutoIssueFailing** — >50% error on a source. The source's payload shape probably changed; fix `autoIssueSubscribers.js`.

---

## 7 · Tamper detection

`/verify` returns three checks:

```json
{
  "verified": true,
  "hashMatch": true,
  "merkleMatch": true,
  "blockchainMatch": true
}
```

If any of the three flips to `false` the verdict goes `verified=false`. The
public UI shows the breakdown so an admin can act on the specific failure:

- `hashMatch: false` → DB record was edited after issuance (audit + investigate writes)
- `merkleMatch: false` → `merkleProof` was corrupted (rare; check for migrations)
- `blockchainMatch: false` → AnchorLedger entry missing or tx hash mismatch (chain re-org or DB pruning)

---

## 8 · Common operations

### Re-issue a cert that got stuck after a chain failure

```js
// scripts/blockchain-rerun-issue.js (sketch)
const { issueCertificate } = require('./services/blockchainCertService');
await issueCertificate('<certId>');
```

Idempotency at the chain level: if the merkle root was anchored on the
first attempt the second call will create a new anchor (different root,
same cert hash). Better path: check `AnchorLedger.findOne({ merkleRoot })`
before re-running.

### Bulk issue from a CSV

`/blockchain-certificates/batch-issue` UI — handles the create + atomic
anchor for hundreds of certs in a single tx.

### Debug a tampered cert

```js
const cert = await BlockchainCertificate.findOne({ certificateNumber: 'CERT-…' });
const recomputed = require('./services/blockchainCertService').computeCertHash({
  recipient: cert.recipient,
  title: cert.title,
  data: cert.data,
  issueDate: cert.issueDate,
  previousHash: cert.previousHash,
});
console.log('stored ', cert.hash);
console.log('recomp ', recomputed);
```

If they differ, walk back through audit logs to find the writer.

---

## 9 · Open follow-ups

- Sync `AnchorLedger` against the chain on boot when `BLOCKCHAIN_NETWORK=ethereum/polygon` (defends against DB-only pruning).
- Add a CLI: `npm run blockchain:verify-chain` that walks every cert and reports `hashMatch` / `merkleMatch` / `blockchainMatch` so chain-wide tampering is auditable in one command.
- Wire the existing `qualityEventBus` so quality flows can subscribe to `cert.issued` for compliance metrics.
