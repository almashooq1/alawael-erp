# Al-Awael ERP — operator entry point.
#
# Every task below wraps an existing npm script so operators can run
# familiar make targets without memorising the nested monorepo paths.
#
# Quick start:
#   make help             — list all targets
#   make ops-check        — gov-integrations health snapshot
#   make preflight        — deploy gate (exits non-zero on misconfig)
#   make sprint-tests     — run the 681-test gate
#
# Discoverability: `make` alone prints the help menu.

SHELL := /bin/bash
.DEFAULT_GOAL := help

# ── Phony declarations — targets that don't produce files ─────────────
.PHONY: help ops-check ops-check-json preflight preflight-prod \
        dsar-hash cpe-attention cpe-attention-json \
        drift-tests sprint-tests ops-subsystems-tests ship-check \
        demo-seed demo-seed-dry \
        install backend-install frontend-install mobile-install \
        backend-dev frontend-dev lint audit

# ─── Help ──────────────────────────────────────────────────────────────
help: ## Show this help message
	@echo ""
	@echo "  Al-Awael ERP — make targets"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-22s\033[0m %s\n", $$1, $$2}'
	@echo ""
	@echo "  Docs: OPERATIONS.md · GOV_INTEGRATIONS_GO_LIVE.md · runbooks/"
	@echo ""

# ─── Ops — gov integrations (4.0.x) ────────────────────────────────────
ops-check: ## CLI snapshot of all 10 gov adapters (exit 0/1/2)
	@cd backend && npm run gov:status --silent

ops-check-json: ## Same as ops-check but emits machine-readable JSON
	@cd backend && npm run gov:status:json --silent

preflight: ## Deploy gate — exits 1 if any live adapter is misconfigured
	@cd backend && npm run preflight --silent

preflight-prod: ## CI mode — compact stderr only (wire into k8s initContainer)
	@cd backend && npm run preflight:prod --silent

dsar-hash: ## Compute SHA-256 targetHash for DSAR queries (pass ID=...)
	@cd backend && node scripts/dsar-hash.js $(ID)

cpe-attention: ## SCFHS CPE compliance digest — exits 1 if HR needs to act
	@cd backend && npm run cpe:attention --silent

cpe-attention-json: ## Same, machine-readable JSON (pipe into #hr-compliance)
	@cd backend && npm run cpe:attention:json --silent

# ─── Tests ─────────────────────────────────────────────────────────────
drift-tests: ## Fast static drift checks (~15s) — pre-push sanity tier
	@cd backend && npm run test:drift

sprint-tests: ## Run the 681-test sprint CI gate
	@cd backend && npm run test:sprint

ops-subsystems-tests: ## Run rate-limit / circuit / metrics / preflight tests only
	@cd backend && npm run test:ops-subsystems

ship-check: ## Opt-in pre-push gate — drift + preflight + ops-subsystems (~2m, 300+ tests)
	@echo ""
	@echo "  [1/3] Drift — static invariant checks"
	@cd backend && npm run test:drift --silent
	@echo ""
	@echo "  [2/3] Preflight — live-adapter config check"
	@cd backend && npm run preflight --silent
	@echo ""
	@echo "  [3/3] Ops subsystems — rate/circuit/metrics/audit/preflight/dsar"
	@cd backend && npm run test:ops-subsystems --silent
	@echo ""
	@echo "  ✓ ship-check pass — safe to push"

# ─── Demo data ─────────────────────────────────────────────────────────
demo-seed: ## Seed demo data (destructive — wipes existing demo records)
	@cd backend && npm run seed:demo:reset

demo-seed-dry: ## Dry-run the demo seed (no writes)
	@cd backend && npm run seed:demo:dry

# ─── Setup ─────────────────────────────────────────────────────────────
install: backend-install frontend-install ## Install all workspace dependencies

backend-install:
	@cd backend && npm ci --legacy-peer-deps

frontend-install:
	@cd frontend && npm ci --legacy-peer-deps

mobile-install:
	@cd mobile && npm ci --legacy-peer-deps

# ─── Dev servers ───────────────────────────────────────────────────────
backend-dev: ## Run the backend in dev mode (nodemon on :3001)
	@cd backend && npm run dev

frontend-dev: ## Run the frontend in dev mode (CRA on :3000)
	@cd frontend && npm start

# ─── Quality ───────────────────────────────────────────────────────────
lint: ## Run ESLint across backend + frontend
	@cd backend && npm run lint || true
	@cd frontend && npm run lint || true

audit: ## npm audit across backend + frontend (high severity only)
	@cd backend && npm audit --audit-level=high || true
	@cd frontend && npm audit --audit-level=high || true
