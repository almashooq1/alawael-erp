# W1437 Deployment Cheat Sheet

> One-page reference for the W1437 production release.

---

## 🔑 Key Facts

- **Release:** W1437 (feat/w1406-preflight-followup)
- **PR:** #579
- **Hotfix:** W1444 (native-driver migration fix)
- **Why:** Fixes production DB timeouts (`advancedtickets`, `nphiesclaims`) and LLM anomaly save failures.
- **Must do before deploy:** Run `NphiesClaim` `updatedAt` backfill migration.

---

## ✅ Pre-Deploy

```bash
./scripts/final-review-w1437.sh
```

## 🚀 Deploy (pick one)

### Option 1: Existing VPS deploy script
```bash
export MONGODB_URI="mongodb+srv://..."
./scripts/deploy-vps.sh --with-w1437-migration
```

### Option 2: Canary deployment
```bash
export MONGODB_URI="mongodb+srv://..."
export CANARY_HOST="canary.alaweal.org"
export PROD_HOST="alaweal.org"
export VPS_USER="..."
export VPS_SSH_KEY="$HOME/.ssh/deploy_key"
./scripts/deploy-canary-w1437.sh
```

### Option 3: Standalone migration then deploy
```bash
# On production host
export MONGODB_URI="mongodb+srv://..."
export NODE_ENV=production
./scripts/deploy-w1437.sh --force
# Then deploy backend/frontend manually
```

### Option 4: Docker Compose
```bash
export MONGODB_URI="mongodb+srv://..."
export COMPOSE_FILE="docker-compose.professional.yml:docker-compose.production.yml"
export COMPOSE_PROJECT_NAME=alawael
./scripts/deploy-w1437-docker.sh up
```

### Option 5: GitHub Actions
Actions → **🗄️ W1437 Production Migration** → type `migrate` → optionally deploy.

---

## ✅ Verify

### Immediate smoke tests
```bash
./scripts/smoke-test-w1437.sh https://alaweal.org
```

### With auto-rollback on failure
```bash
./scripts/smoke-test-w1437.sh --auto-rollback https://alaweal.org
```

### 30-minute monitor
```bash
# VPS
./scripts/monitor-w1437.sh logs/error1.log

# Docker
./scripts/monitor-w1437-docker.sh alawael-backend-1
```

---

## ⚠️ Watch For

| Signature | Severity | Meaning |
|-----------|----------|---------|
| `Operation advancedtickets.find() buffering timed out after 10000ms` | P0 | W1437 `$in` fix not working |
| `Operation nphiesclaims.find() buffering timed out after 10000ms` | P0 | Migration/index issue |
| `[llm-anomaly-history] save failed:` | P2 | DB timeout cascade persists |

---

## ↩️ Rollback

```bash
export DEPLOY_ROOT=/opt/alawael-erp
./scripts/rollback-w1437.sh
```

Or to a specific commit/tag:
```bash
./scripts/rollback-w1437.sh v1.2.3
```

---

## 📚 Docs

- Full runbook: `docs/RUNBOOK_W1437.md` / `docs/RUNBOOK_W1437.pdf`
- Wiki page: `docs/WIKI_W1437.md`
- Deployment notes: `docs/DEPLOYMENT_NOTES_W1437.md`
- Problem ledger: `docs/PROBLEM_LEDGER_v6.md`

---

## 🔧 Useful Commands

### Dry-run migration
```bash
DRY_RUN=1 NODE_ENV=production node backend/scripts/migrate-nphies-claim-updatedAt.js
```

### Generate PDF runbook
```bash
python3 scripts/generate-runbook-pdf.py
```

### Re-run GitHub monitor
Actions → **👁️ W1437 Post-Deploy Monitor**
