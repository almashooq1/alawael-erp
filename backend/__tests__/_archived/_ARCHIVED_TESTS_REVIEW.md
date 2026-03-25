# Archived Tests Review — Audit Item 5.4

**Reviewed:** Session 8 of comprehensive audit
**Total Files:** 14

## Summary

| Category | Count | Files |
|----------|-------|-------|
| SKIP (already covered) | 5 | advanced-workflows, docker-cicd, documents.management, documents.test, project-routes.comprehensive |
| EXTRACT (unique value) | 4 | backup-management, database, performance, trafficAccidents |
| DEAD (target code removed) | 5 | archiving.routes.comprehensive, document.routes.comprehensive, hrops.routes.comprehensive, unified, vehicle.routes.comprehensive |

## SKIP — Already Covered by Active Tests

1. **advanced-workflows.integration.test.js** (496 lines)
   - Tests cross-module workflows via supertest
   - Superseded by: `workflows.test.js`, `phase5-database-integration.test.js`

2. **docker-cicd.test.js** (973 lines)
   - Static file validation (Dockerfile, compose, nginx)
   - Low ROI; not testing application logic

3. **documents.management.test.js** (591 lines)
   - Document management E2E
   - Superseded by: `documents-routes.phase3.test.js`, `documents-advanced.phase3.test.js`

4. **documents.test.js** (330 lines)
   - Same as above, duplicate coverage

5. **project-routes.comprehensive.test.js** (543 lines)
   - Project management routes via supertest
   - Superseded by: `project-model.unit.test.js`; route structure changed

## EXTRACT — Unique Value

1. **trafficAccidents.test.js** (683 lines) ← **HIGHEST PRIORITY**
   - Full CRUD + filtering/pagination for `/api/traffic-accidents`
   - Route and model are **LIVE** with **zero active test coverage**
   - Missing `middleware/authenticate` mock prevented it from working
   - **Re-integrated as:** `trafficAccidents.routes.test.js` (active)

2. **backup-management.test.js** (527 lines)
   - Tests `enhanced-backup.service`, `backup-monitoring.service`, `backup-multi-location.service`
   - Health checks, metrics, alerts, multi-location storage
   - Partially covered by `phase-23-automated-backup.test.js`
   - **Future:** Extract monitoring + multi-location tests

3. **database.test.js** (721 lines)
   - 120+ model-level tests for `FinancialJournalEntry`, `CashFlow`, `RiskAssessment`, etc.
   - Finance model validations not tested elsewhere
   - Requires live MongoDB — needs adaptation for mock DB
   - **Future:** Extract finance model unit tests

4. **performance.test.js** (542 lines)
   - Database optimization benchmarks (`DatabaseOptimization`, `PerformanceBenchmark`)
   - Index validation, batch insert, query timing
   - Requires live MongoDB — benchmark tests, not unit tests
   - **Future:** Extract as optional perf test suite

## DEAD — Target Code Removed/Archived

1. **archiving.routes.comprehensive.test.js** — `archivingRoutes.js` in `routes/_archived/`
2. **document.routes.comprehensive.test.js** — `documentRoutes.js` in `routes/_archived/`
3. **hrops.routes.comprehensive.test.js** — `hrops.routes.js` in `routes/_archived/`
4. **unified.test.js** — `server.unified.js` does not exist
5. **vehicle.routes.comprehensive.test.js** — `vehicleRoutes.js` in `routes/_archived/`

## Recommendation

- DEAD files can remain archived indefinitely (safe to delete)
- SKIP files are properly superseded and need no action
- EXTRACT files #2-4 require MongoDB for meaningful testing; low priority
- EXTRACT file #1 (trafficAccidents) has been re-integrated into active suite
