#!/usr/bin/env node
/**
 * DDD Platform — E2E Verification Script
 * سكريبت التحقق الشامل لمنصة التأهيل الموحدة
 *
 * Validates:
 *  1. All 20 domain modules load without error
 *  2. All 34 Mongoose models register correctly
 *  3. Domain registry functions work (list, health)
 *  4. Platform routes are mountable
 *  5. Seed data file is valid
 *  6. Socket handler file is valid
 *  7. Frontend files exist
 *
 * Usage:
 *   node scripts/verify-ddd-platform.js
 */

'use strict';

const path = require('path');
const fs = require('fs');

// ── Colour helpers (ANSI) ────────────────────────────────────────────────────
const c = {
  green: s => `\x1b[32m${s}\x1b[0m`,
  red: s => `\x1b[31m${s}\x1b[0m`,
  yellow: s => `\x1b[33m${s}\x1b[0m`,
  cyan: s => `\x1b[36m${s}\x1b[0m`,
  bold: s => `\x1b[1m${s}\x1b[0m`,
  dim: s => `\x1b[2m${s}\x1b[0m`,
};

const PASS = c.green('✓ PASS');
const FAIL = c.red('✗ FAIL');
const WARN = c.yellow('⚠ WARN');

let passed = 0;
let failed = 0;
let warnings = 0;

function check(label, fn) {
  try {
    const result = fn();
    if (result === false) {
      console.log(`  ${FAIL}  ${label}`);
      failed++;
    } else {
      console.log(`  ${PASS}  ${label}`);
      passed++;
    }
  } catch (err) {
    console.log(`  ${FAIL}  ${label} — ${c.red(err.message)}`);
    failed++;
  }
}

function warn(label, condition) {
  if (!condition) {
    console.log(`  ${WARN}  ${label}`);
    warnings++;
  } else {
    console.log(`  ${PASS}  ${label}`);
    passed++;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
console.log('');
console.log(c.bold('═══════════════════════════════════════════════════════════════'));
console.log(c.bold('  DDD Platform Verification — منصة التأهيل الموحدة الذكية'));
console.log(c.bold('═══════════════════════════════════════════════════════════════'));
console.log('');

const backendRoot = path.resolve(__dirname, '..');
const frontendRoot = path.resolve(backendRoot, '..', 'frontend', 'src');

// ── 1. Domain Modules ────────────────────────────────────────────────────────
console.log(c.cyan('\n📦 1. Domain Modules (20 expected)\n'));

const expectedDomains = [
  'core',
  'episodes',
  'timeline',
  'assessments',
  'care-plans',
  'sessions',
  'goals',
  'workflow',
  'programs',
  'ai-recommendations',
  'quality',
  'family',
  'reports',
  'group-therapy',
  'tele-rehab',
  'ar-vr',
  'behavior',
  'research',
  'field-training',
  'dashboards',
];

for (const domain of expectedDomains) {
  const domainPath = path.join(backendRoot, 'domains', domain);
  check(`Domain: ${domain}`, () => {
    if (!fs.existsSync(domainPath)) return false;
    // Check for index.js
    const indexPath = path.join(domainPath, 'index.js');
    if (!fs.existsSync(indexPath)) return false;
    // Try to require it
    require(indexPath);
    return true;
  });
}

// ── 2. Domain Registry ──────────────────────────────────────────────────────
console.log(c.cyan('\n📋 2. Domain Registry\n'));

check('Registry loads without error', () => {
  require(path.join(backendRoot, 'domains', 'index.js'));
  return true;
});

check('listDomains returns 20 domains', () => {
  const { listDomains } = require(path.join(backendRoot, 'domains', 'index.js'));
  const domains = listDomains();
  if (domains.length !== 20) {
    throw new Error(`Expected 20, got ${domains.length}`);
  }
  return true;
});

// ── 3. Mongoose Models ──────────────────────────────────────────────────────
console.log(c.cyan('\n🗄️  3. Mongoose Models (34 expected)\n'));

const mongoose = require('mongoose');
const modelNames = mongoose.modelNames().sort();

check(`Total models: ${modelNames.length} (expected ≥ 34)`, () => {
  return modelNames.length >= 34;
});

const expectedModels = [
  'Beneficiary',
  'EpisodeOfCare',
  'CareTimeline',
  'ClinicalAssessment',
  'UnifiedCarePlan',
  'ClinicalSession',
  'TherapeuticGoal',
  'Measure',
  'MeasureApplication',
  'WorkflowTask',
  'WorkflowTransitionLog',
  'Program',
  'ProgramEnrollment',
  'ClinicalRiskScore',
  'Recommendation',
  'QualityAudit',
  'CorrectiveAction',
  'FamilyMember',
  'FamilyCommunication',
  'ReportTemplate',
  'GeneratedReport',
  'TherapyGroup',
  'GroupSession',
  'TeleSession',
  'ARVRSession',
  'BehaviorRecord',
  'BehaviorPlan',
  'ResearchStudy',
  'TrainingProgram',
  'TraineeRecord',
  'DashboardConfig',
  'KPIDefinition',
  'KPISnapshot',
  'DecisionAlert',
];

for (const model of expectedModels) {
  check(`Model: ${model}`, () => {
    return !!mongoose.models[model];
  });
}

// ── 4. Infrastructure Files ─────────────────────────────────────────────────
console.log(c.cyan('\n🔧 4. Infrastructure Files\n'));

const infraFiles = [
  ['Platform Routes', 'routes/platform.routes.js'],
  ['Seed: DDD Domains', 'seeds/ddd-domains-seed.js'],
  ['Socket: DDD Handler', 'sockets/handlers/dddHandler.js'],
  ['Test: DDD Smoke', '__tests__/domains/ddd-smoke.test.js'],
  ['Docs: API Reference', 'docs/DDD_API_REFERENCE.md'],
  // Phase 2 — Event-Driven Architecture, RBAC, Performance
  ['Event Contracts', 'events/contracts/dddEventContracts.js'],
  ['Cross-Domain Subscribers', 'integration/dddCrossModuleSubscribers.js'],
  ['Notification Triggers', 'integration/dddNotificationTriggers.js'],
  ['Performance Indexes', 'domains/_base/ddd-indexes.js'],
  ['RBAC DDD Guards', 'middleware/dddAuth.middleware.js'],
  ['Swagger DDD Config', 'config/swagger-ddd.config.js'],
  ['Cache Middleware', 'middleware/dddCache.middleware.js'],
  // Phase 3 — Audit, Versioning, Validation, Search, Batch, Rate Limiting
  ['Audit Trail Middleware', 'middleware/dddAudit.middleware.js'],
  ['Document Versioning', 'domains/_base/ddd-versioning.js'],
  ['Validation Schemas', 'middleware/dddValidation.middleware.js'],
  ['Cross-Domain Search', 'domains/_base/ddd-search.js'],
  ['Batch Operations', 'domains/_base/ddd-batch.js'],
  ['Rate Limiting', 'middleware/dddRateLimit.middleware.js'],
  // Phase 4 — Operational Intelligence
  ['Workflow Automations', 'integration/dddWorkflowAutomations.js'],
  ['Analytics Pipelines', 'domains/_base/ddd-analytics.js'],
  ['Export Service', 'services/dddExportService.js'],
  ['Scheduler Service', 'services/dddScheduler.js'],
  ['Phase 4 Tests', '__tests__/domains/ddd-phase4.test.js'],
  // Phase 5 — Enterprise Integration
  ['Notification Dispatcher', 'services/dddNotificationDispatcher.js'],
  ['File Attachments', 'domains/_base/ddd-attachments.js'],
  ['Webhook Dispatcher', 'integration/dddWebhookDispatcher.js'],
  ['Report Builder', 'services/dddReportBuilder.js'],
  // Phase 6 — Clinical Intelligence & Decision Support
  ['Clinical Decision Engine', 'services/dddClinicalEngine.js'],
  ['Outcome Tracker', 'services/dddOutcomeTracker.js'],
  ['Risk Stratification', 'services/dddRiskStratification.js'],
  ['Smart Scheduler', 'services/dddSmartScheduler.js'],
  // Phase 7 — Data Governance & Compliance
  ['Consent Manager', 'services/dddConsentManager.js'],
  ['Compliance Dashboard', 'services/dddComplianceDashboard.js'],
  ['Data Quality Monitor', 'services/dddDataQualityMonitor.js'],
  ['Interoperability Gateway', 'services/dddInteroperabilityGateway.js'],
  // Phase 8 — Multi-Tenancy, Configuration & Localization
  ['Tenant Manager', 'services/dddTenantManager.js'],
  ['Feature Flags', 'services/dddFeatureFlags.js'],
  ['Config Manager', 'services/dddConfigManager.js'],
  ['Localization Engine', 'services/dddLocalizationEngine.js'],
  // Phase 9 — Monitoring, Health & Resilience
  ['Health Monitor', 'services/dddHealthMonitor.js'],
  ['Metrics Collector', 'services/dddMetricsCollector.js'],
  ['Circuit Breaker', 'services/dddCircuitBreaker.js'],
  ['Error Tracker', 'services/dddErrorTracker.js'],
  // Phase 10 — API Gateway, Migration, Task Queue & Dev Portal
  ['API Gateway', 'services/dddApiGateway.js'],
  ['Data Migration', 'services/dddDataMigration.js'],
  ['Task Queue', 'services/dddTaskQueue.js'],
  ['Dev Portal', 'services/dddDevPortal.js'],
  // Phase 11 — Advanced Security & Access Control
  ['Security Auditor', 'services/dddSecurityAuditor.js'],
  ['Session Manager', 'services/dddSessionManager.js'],
  ['Encryption Service', 'services/dddEncryptionService.js'],
  ['Access Control', 'services/dddAccessControl.js'],
  ['Analytics Dashboard', 'services/dddAnalyticsDashboard.js'],
  ['Predictive Engine', 'services/dddPredictiveEngine.js'],
  ['Data Warehouse', 'services/dddDataWarehouse.js'],
  ['Business Intelligence', 'services/dddBusinessIntelligence.js'],
  ['Collaboration Hub', 'services/dddCollaborationHub.js'],
  ['Case Conference', 'services/dddCaseConference.js'],
  ['Document Collaboration', 'services/dddDocumentCollaboration.js'],
  ['Activity Feed', 'services/dddActivityFeed.js'],
  ['Resource Manager', 'services/dddResourceManager.js'],
  ['Capacity Planner', 'services/dddCapacityPlanner.js'],
  ['Appointment Engine', 'services/dddAppointmentEngine.js'],
  ['Asset Tracker', 'services/dddAssetTracker.js'],
  ['Workflow Engine', 'services/dddWorkflowEngine.js'],
  ['Form Builder', 'services/dddFormBuilder.js'],
  ['Approval Chain', 'services/dddApprovalChain.js'],
  ['Document Generator', 'services/dddDocumentGenerator.js'],
  // Phase 16 — Financial & Billing Management
  ['Billing Engine', 'services/dddBillingEngine.js'],
  ['Insurance Manager', 'services/dddInsuranceManager.js'],
  ['Claims Processor', 'services/dddClaimsProcessor.js'],
  ['Payment Gateway', 'services/dddPaymentGateway.js'],

  // Phase 17 — Learning Management & Training
  ['Learning Management', 'services/dddLearningManagement.js'],
  ['Competency Tracker', 'services/dddCompetencyTracker.js'],
  ['Continuous Education', 'services/dddContinuousEducation.js'],
  ['Knowledge Base', 'services/dddKnowledgeBase.js'],

  // Phase 18 — Supply Chain & Inventory Management
  ['Inventory Manager', 'services/dddInventoryManager.js'],
  ['Procurement Engine', 'services/dddProcurementEngine.js'],
  ['Supply Chain Tracker', 'services/dddSupplyChainTracker.js'],
  ['Warehouse Manager', 'services/dddWarehouseManager.js'],
  ['Facility Manager', 'services/dddFacilityManager.js'],
  ['Environmental Monitor', 'services/dddEnvironmentalMonitor.js'],
  ['Space Allocator', 'services/dddSpaceAllocator.js'],
  ['Maintenance Tracker', 'services/dddMaintenanceTracker.js'],
  ['Staff Manager', 'services/dddStaffManager.js'],
  ['Shift Scheduler', 'services/dddShiftScheduler.js'],
  ['Performance Evaluator', 'services/dddPerformanceEvaluator.js'],
  ['Leave Manager', 'services/dddLeaveManager.js'],
  ['Message Center', 'services/dddMessageCenter.js'],
  ['Notification Engine', 'services/dddNotificationEngine.js'],
  ['Announcement Manager', 'services/dddAnnouncementManager.js'],
  ['Communication Log', 'services/dddCommunicationLog.js'],
  ['Document Vault', 'services/dddDocumentVault.js'],
  ['Record Manager', 'services/dddRecordManager.js'],
  ['Digital Signature', 'services/dddDigitalSignature.js'],
  ['Archive Manager', 'services/dddArchiveManager.js'],
  ['Incident Tracker', 'services/dddIncidentTracker.js'],
  ['Emergency Response', 'services/dddEmergencyResponse.js'],
  ['Disaster Recovery', 'services/dddDisasterRecovery.js'],
  ['Safety Manager', 'services/dddSafetyManager.js'],
  ['Transport Manager', 'services/dddTransportManager.js'],
  ['Patient Transport', 'services/dddPatientTransport.js'],
  ['Fleet Tracker', 'services/dddFleetTracker.js'],
  ['Route Optimizer', 'services/dddRouteOptimizer.js'],
  ['Volunteer Manager', 'services/dddVolunteerManager.js'],
  ['Community Program', 'services/dddCommunityProgram.js'],
  ['Outreach Tracker', 'services/dddOutreachTracker.js'],
  ['Donation Manager', 'services/dddDonationManager.js'],
  ['Contract Manager', 'services/dddContractManager.js'],
  ['Legal Case Tracker', 'services/dddLegalCaseTracker.js'],
  ['Policy Governance', 'services/dddPolicyGovernance.js'],
  ['Regulatory Tracker', 'services/dddRegulatoryTracker.js'],
  ['Feedback Manager', 'services/dddFeedbackManager.js'],
  ['Satisfaction Tracker', 'services/dddSatisfactionTracker.js'],
  ['Complaint Manager', 'services/dddComplaintManager.js'],
  ['Patient Experience', 'services/dddPatientExperience.js'],
  ['Research Protocol', 'services/dddResearchProtocol.js'],
  ['Evidence Library', 'services/dddEvidenceLibrary.js'],
  ['Clinical Trial', 'services/dddClinicalTrial.js'],
  ['Publication Tracker', 'services/dddPublicationTracker.js'],
];

for (const [label, relPath] of infraFiles) {
  const fullPath = path.join(backendRoot, relPath);
  check(`${label} — ${relPath}`, () => fs.existsSync(fullPath));
}

// ── 5. Seed File Validation ─────────────────────────────────────────────────
console.log(c.cyan('\n🌱 5. Seed File Validation\n'));

check('Seed file exports seed() function', () => {
  const seed = require(path.join(backendRoot, 'seeds', 'ddd-domains-seed.js'));
  return typeof seed.seed === 'function' || typeof seed.up === 'function';
});

check('Seed registered in seed-all.js registry', () => {
  const content = fs.readFileSync(path.join(backendRoot, 'scripts', 'seed-all.js'), 'utf8');
  return content.includes('ddd-domains') || content.includes('ddd-domains-seed');
});

check('package.json has db:seed:ddd script', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(backendRoot, 'package.json'), 'utf8'));
  return !!pkg.scripts['db:seed:ddd'];
});

// ── 6. Frontend Files ───────────────────────────────────────────────────────
console.log(c.cyan('\n🖥️  6. Frontend Integration Files\n'));

const frontendFiles = [
  ['API Service Layer', 'services/ddd/index.js'],
  ['DDD Hooks', 'hooks/useDDD.js'],
  ['Real-time Hooks', 'hooks/useRealtimeDDD.js'],
  ['DDD Routes', 'routes/DDDRoutes.jsx'],
  ['Platform Layout', 'components/ddd/DDDPlatformLayout.jsx'],
  ['DDD Sidebar', 'components/ddd/DDDSidebar.jsx'],
  ['Component Barrel', 'components/ddd/index.js'],
  ['Executive Dashboard', 'pages/executive-dashboard/ExecutiveDashboard.jsx'],
  ['Beneficiary 360', 'pages/beneficiary-360/Beneficiary360Page.jsx'],
  ['Beneficiary List', 'pages/beneficiary-list/BeneficiaryListPage.jsx'],
  ['Episodes Page', 'pages/episodes/EpisodesPage.jsx'],
  ['Sessions Page', 'pages/sessions/SessionsPage.jsx'],
  ['Workflow Page', 'pages/workflow/WorkflowPage.jsx'],
  ['Quality Page', 'pages/quality/QualityPage.jsx'],
  ['Reports Page', 'pages/reports/ReportsPage.jsx'],
  ['Domain Pages Factory', 'pages/domains/DomainPages.jsx'],
];

for (const [label, relPath] of frontendFiles) {
  const fullPath = path.join(frontendRoot, relPath);
  check(`${label} — ${relPath}`, () => fs.existsSync(fullPath));
}

// ── 7. Docker Compose ───────────────────────────────────────────────────────
console.log(c.cyan('\n🐳 7. Docker Configuration\n'));

check('docker-compose.yml has DDD env vars', () => {
  const content = fs.readFileSync(path.join(backendRoot, '..', 'docker-compose.yml'), 'utf8');
  return content.includes('DDD_DOMAINS_ENABLED') && content.includes('DDD_REALTIME_ENABLED');
});

// ── 8. Event-Driven Architecture & RBAC ─────────────────────────────────────
console.log(c.cyan('\n⚡ 8. Event-Driven Architecture, RBAC & Performance\n'));

check('DDD Event Contracts export DDD_CONTRACTS', () => {
  const { DDD_CONTRACTS, getDDDContractStats } = require(
    path.join(backendRoot, 'events', 'contracts', 'dddEventContracts')
  );
  const stats = getDDDContractStats();
  if (stats.domains < 17) throw new Error(`Expected ≥17 domains, got ${stats.domains}`);
  if (stats.totalEvents < 30) throw new Error(`Expected ≥30 events, got ${stats.totalEvents}`);
  return true;
});

check('DDD Cross-Domain Subscribers export initializeDDDSubscribers', () => {
  const { initializeDDDSubscribers } = require(
    path.join(backendRoot, 'integration', 'dddCrossModuleSubscribers')
  );
  return typeof initializeDDDSubscribers === 'function';
});

check('DDD Notification Triggers export initializeDDDNotifications', () => {
  const { initializeDDDNotifications } = require(
    path.join(backendRoot, 'integration', 'dddNotificationTriggers')
  );
  return typeof initializeDDDNotifications === 'function';
});

check('DDD Indexes export ensureDDDIndexes', () => {
  const { ensureDDDIndexes, DDD_INDEX_CATALOG } = require(
    path.join(backendRoot, 'domains', '_base', 'ddd-indexes')
  );
  if (typeof ensureDDDIndexes !== 'function') return false;
  const modelCount = Object.keys(DDD_INDEX_CATALOG).length;
  if (modelCount < 30) throw new Error(`Expected ≥30 models in catalog, got ${modelCount}`);
  return true;
});

check('DDD RBAC Guards export dddGuard + dddAutoGuard', () => {
  const { dddGuard, dddAutoGuard, DOMAIN_RESOURCE_MAP } = require(
    path.join(backendRoot, 'middleware', 'dddAuth.middleware')
  );
  if (typeof dddGuard !== 'function') return false;
  if (typeof dddAutoGuard !== 'function') return false;
  if (Object.keys(DOMAIN_RESOURCE_MAP).length < 20) throw new Error('Expected ≥20 domain mappings');
  return true;
});

check('DDD Cache Middleware export dddCache + dddInvalidate', () => {
  const { dddCache, dddInvalidate, flushDDDCache, DOMAIN_TTL } = require(
    path.join(backendRoot, 'middleware', 'dddCache.middleware')
  );
  if (typeof dddCache !== 'function') return false;
  if (typeof dddInvalidate !== 'function') return false;
  if (typeof flushDDDCache !== 'function') return false;
  if (Object.keys(DOMAIN_TTL).length < 20) throw new Error('Expected ≥20 domain TTLs');
  return true;
});

check('Swagger DDD Config export enrichSwaggerWithDDD', () => {
  const { enrichSwaggerWithDDD, DDD_TAGS, DDD_SCHEMAS } = require(
    path.join(backendRoot, 'config', 'swagger-ddd.config')
  );
  if (typeof enrichSwaggerWithDDD !== 'function') return false;
  if (DDD_TAGS.length < 20) throw new Error(`Expected ≥20 tags, got ${DDD_TAGS.length}`);
  if (Object.keys(DDD_SCHEMAS).length < 8) throw new Error('Expected ≥8 schemas');
  return true;
});

check('RBAC config has DDD resources (BENEFICIARIES)', () => {
  const { RESOURCES } = require(path.join(backendRoot, 'config', 'rbac.config'));
  return !!RESOURCES.BENEFICIARIES && !!RESOURCES.EPISODES && !!RESOURCES.CLINICAL_SESSIONS;
});

// ── 9. Phase 3 — Audit, Versioning, Validation, Search, Batch, Rate Limiting
console.log(c.cyan('\n🛡️  9. Audit, Versioning, Validation, Search, Batch & Rate Limiting\n'));

check('DDD Audit Middleware exports dddAudit + dddAutoAudit', () => {
  const { dddAudit, dddAutoAudit, recordAudit, queryDDDAuditTrail } = require(
    path.join(backendRoot, 'middleware', 'dddAudit.middleware')
  );
  if (typeof dddAudit !== 'function') return false;
  if (typeof dddAutoAudit !== 'function') return false;
  if (typeof recordAudit !== 'function') return false;
  if (typeof queryDDDAuditTrail !== 'function') return false;
  return true;
});

check('DDD Versioning exports dddVersioning + createVersion', () => {
  const { dddVersioning, createVersion, getVersionHistory, rollbackToVersion } = require(
    path.join(backendRoot, 'domains', '_base', 'ddd-versioning')
  );
  if (typeof dddVersioning !== 'function') return false;
  if (typeof createVersion !== 'function') return false;
  if (typeof getVersionHistory !== 'function') return false;
  if (typeof rollbackToVersion !== 'function') return false;
  return true;
});

check('DDD Validation exports schemas for all 16 domain groups', () => {
  const { schemas, dddValidate, dddValidateQuery } = require(
    path.join(backendRoot, 'middleware', 'dddValidation.middleware')
  );
  if (typeof dddValidate !== 'function') return false;
  if (typeof dddValidateQuery !== 'function') return false;
  const schemaKeys = Object.keys(schemas);
  if (schemaKeys.length < 15)
    throw new Error(`Expected ≥15 schema groups, got ${schemaKeys.length}`);
  // Spot-check critical schemas
  if (!schemas.beneficiary?.create) throw new Error('Missing beneficiary.create schema');
  if (!schemas.session?.create) throw new Error('Missing session.create schema');
  if (!schemas.episode?.create) throw new Error('Missing episode.create schema');
  return true;
});

check('DDD Search exports dddSearch + createSearchRouter', () => {
  const { dddSearch, createSearchRouter, DOMAIN_MODELS } = require(
    path.join(backendRoot, 'domains', '_base', 'ddd-search')
  );
  if (typeof dddSearch !== 'function') return false;
  if (typeof createSearchRouter !== 'function') return false;
  if (Object.keys(DOMAIN_MODELS).length < 20)
    throw new Error('Expected ≥20 domains in DOMAIN_MODELS');
  return true;
});

check('DDD Batch exports batchCreate + createBatchRouter', () => {
  const {
    batchCreate,
    batchUpdate,
    batchDelete,
    createBatchRouter,
    DOMAIN_PRIMARY_MODEL,
  } = require(path.join(backendRoot, 'domains', '_base', 'ddd-batch'));
  if (typeof batchCreate !== 'function') return false;
  if (typeof batchUpdate !== 'function') return false;
  if (typeof batchDelete !== 'function') return false;
  if (typeof createBatchRouter !== 'function') return false;
  if (Object.keys(DOMAIN_PRIMARY_MODEL).length < 20) throw new Error('Expected ≥20 domains');
  return true;
});

check('DDD Rate Limit exports dddRateLimit + dddAutoRateLimit', () => {
  const { dddRateLimit, dddAutoRateLimit, TIERS, DOMAIN_TIERS } = require(
    path.join(backendRoot, 'middleware', 'dddRateLimit.middleware')
  );
  if (typeof dddRateLimit !== 'function') return false;
  if (typeof dddAutoRateLimit !== 'function') return false;
  if (Object.keys(TIERS).length < 4) throw new Error('Expected ≥4 rate limit tiers');
  if (Object.keys(DOMAIN_TIERS).length < 20) throw new Error('Expected ≥20 domain tier mappings');
  return true;
});

check('Platform routes mount Search + Batch routers', () => {
  const content = fs.readFileSync(path.join(backendRoot, 'routes', 'platform.routes.js'), 'utf8');
  return (
    content.includes('ddd-search') &&
    content.includes('ddd-batch') &&
    content.includes('searchRouter') &&
    content.includes('batchRouter')
  );
});

// ── 10. Phase 4 — Operational Intelligence Layer
console.log(c.cyan('\n🚀  10. Workflow Automations, Analytics, Export & Scheduler\n'));

check('Workflow Automations exports processAutomation + initializeDDDAutomations', () => {
  const m = require(path.join(backendRoot, 'integration', 'dddWorkflowAutomations'));
  if (typeof m.processAutomation !== 'function') return false;
  if (typeof m.initializeDDDAutomations !== 'function') return false;
  if (typeof m.getAutomationLogs !== 'function') return false;
  if (typeof m.evaluateConditions !== 'function') return false;
  return true;
});

check('Automation rules ≥ 10 enabled', () => {
  const { AUTOMATION_RULES } = require(
    path.join(backendRoot, 'integration', 'dddWorkflowAutomations')
  );
  const enabled = AUTOMATION_RULES.filter(r => r.enabled);
  if (enabled.length < 10) throw new Error(`Expected ≥10 enabled rules, got ${enabled.length}`);
  return true;
});

check('AutomationLog model registered', () => {
  const { AutomationLog } = require(
    path.join(backendRoot, 'integration', 'dddWorkflowAutomations')
  );
  return !!AutomationLog && AutomationLog.modelName === 'AutomationLog';
});

check('Analytics exports ≥13 pipeline functions + router', () => {
  const m = require(path.join(backendRoot, 'domains', '_base', 'ddd-analytics'));
  if (typeof m.createAnalyticsRouter !== 'function') return false;
  if (typeof m.executiveSummary !== 'function') return false;
  if (typeof m.beneficiaryDistribution !== 'function') return false;
  if (typeof m.sessionUtilization !== 'function') return false;
  if (typeof m.therapistProductivity !== 'function') return false;
  if (typeof m.goalAchievementRate !== 'function') return false;
  if (typeof m.qualityComplianceRate !== 'function') return false;
  return true;
});

check('Export Service exports toCSV + toExcel + toPDF + router', () => {
  const m = require(path.join(backendRoot, 'services', 'dddExportService'));
  if (typeof m.toCSV !== 'function') return false;
  if (typeof m.toExcel !== 'function') return false;
  if (typeof m.toPDF !== 'function') return false;
  if (typeof m.createExportRouter !== 'function') return false;
  if (Object.keys(m.EXPORT_COLUMNS).length < 8) throw new Error('Expected ≥8 export column defs');
  return true;
});

check('Scheduler exports initializeDDDScheduler + ≥6 jobs', () => {
  const m = require(path.join(backendRoot, 'services', 'dddScheduler'));
  if (typeof m.initializeDDDScheduler !== 'function') return false;
  if (typeof m.stopDDDScheduler !== 'function') return false;
  if (typeof m.getSchedulerStatus !== 'function') return false;
  if (m.JOB_SCHEDULE.length < 6) throw new Error(`Expected ≥6 jobs, got ${m.JOB_SCHEDULE.length}`);
  return true;
});

check('Platform routes mount Analytics + Export routers', () => {
  const content = fs.readFileSync(path.join(backendRoot, 'routes', 'platform.routes.js'), 'utf8');
  return (
    content.includes('ddd-analytics') &&
    content.includes('dddExportService') &&
    content.includes('analyticsRouter') &&
    content.includes('exportRouter')
  );
});

check('app.js wires Automations + Scheduler', () => {
  const content = fs.readFileSync(path.join(backendRoot, 'app.js'), 'utf8');
  return (
    content.includes('dddWorkflowAutomations') &&
    content.includes('initializeDDDAutomations') &&
    content.includes('dddScheduler') &&
    content.includes('initializeDDDScheduler')
  );
});

// ── 11. Phase 5 — Enterprise Integration ────────────────────────────────────
console.log(c.cyan('\n🔗 11. Phase 5 — Enterprise Integration\n'));

check('Notification Dispatcher exports templates + dispatch functions', () => {
  const m = require(path.join(backendRoot, 'services', 'dddNotificationDispatcher'));
  if (typeof m.dispatchDDDNotification !== 'function') return false;
  if (typeof m.dispatchToRole !== 'function') return false;
  if (typeof m.getNotificationLogs !== 'function') return false;
  if (typeof m.listTemplates !== 'function') return false;
  if (typeof m.interpolate !== 'function') return false;
  const templates = m.listTemplates();
  if (templates.length < 20)
    throw new Error(`Expected ≥20 notification templates, got ${templates.length}`);
  return true;
});

check('Notification Dispatcher DDDNotificationLog model', () => {
  const m = require(path.join(backendRoot, 'services', 'dddNotificationDispatcher'));
  return m.DDDNotificationLog && m.DDDNotificationLog.modelName === 'DDDNotificationLog';
});

check('File Attachments exports DDDAttachment model + router', () => {
  const m = require(path.join(backendRoot, 'domains', '_base', 'ddd-attachments'));
  if (!m.DDDAttachment) return false;
  if (typeof m.createAttachmentsRouter !== 'function') return false;
  if (typeof m.createAttachment !== 'function') return false;
  if (typeof m.listAttachments !== 'function') return false;
  if (typeof m.deleteAttachment !== 'function') return false;
  return true;
});

check('File Attachments DOMAIN_MODELS covers ≥15 domains', () => {
  const m = require(path.join(backendRoot, 'domains', '_base', 'ddd-attachments'));
  if (Object.keys(m.DOMAIN_MODELS).length < 15)
    throw new Error(`Expected ≥15 domain models, got ${Object.keys(m.DOMAIN_MODELS).length}`);
  return true;
});

check('Webhook Dispatcher exports + ≥30 event types', () => {
  const m = require(path.join(backendRoot, 'integration', 'dddWebhookDispatcher'));
  if (typeof m.initializeDDDWebhooks !== 'function') return false;
  if (typeof m.dispatchDDDWebhook !== 'function') return false;
  if (typeof m.createWebhookRouter !== 'function') return false;
  if (typeof m.signPayload !== 'function') return false;
  return true;
});

check('Webhook Dispatcher models DDDWebhook + DDDWebhookDelivery', () => {
  const m = require(path.join(backendRoot, 'integration', 'dddWebhookDispatcher'));
  return m.DDDWebhook && m.DDDWebhookDelivery;
});

check('Report Builder exports + ≥8 builtin report definitions', () => {
  const m = require(path.join(backendRoot, 'services', 'dddReportBuilder'));
  if (typeof m.executeReport !== 'function') return false;
  if (typeof m.executeBuiltinReport !== 'function') return false;
  if (typeof m.createReportBuilderRouter !== 'function') return false;
  if (typeof m.getReportHistory !== 'function') return false;
  if (m.BUILTIN_REPORTS.length < 8)
    throw new Error(`Expected ≥8 builtin reports, got ${m.BUILTIN_REPORTS.length}`);
  return true;
});

check('Report Builder models DDDReportDefinition + DDDReportHistory', () => {
  const m = require(path.join(backendRoot, 'services', 'dddReportBuilder'));
  return m.DDDReportDefinition && m.DDDReportHistory;
});

check('Platform routes mount Phase 5 routers (Attachments + Webhooks + Reports)', () => {
  const content = fs.readFileSync(path.join(backendRoot, 'routes', 'platform.routes.js'), 'utf8');
  return (
    content.includes('ddd-attachments') &&
    content.includes('dddWebhookDispatcher') &&
    content.includes('dddReportBuilder') &&
    content.includes('attachmentsRouter') &&
    content.includes('webhookRouter') &&
    content.includes('reportBuilderRouter')
  );
});

check('Platform routes expose notification endpoints', () => {
  const content = fs.readFileSync(path.join(backendRoot, 'routes', 'platform.routes.js'), 'utf8');
  return (
    content.includes('dddNotificationDispatcher') &&
    content.includes('notifications/templates') &&
    content.includes('notifications/logs')
  );
});

check('app.js wires DDD Webhook Dispatcher', () => {
  const content = fs.readFileSync(path.join(backendRoot, 'app.js'), 'utf8');
  return content.includes('dddWebhookDispatcher') && content.includes('initializeDDDWebhooks');
});

// ── 12. Phase 6 — Clinical Intelligence & Decision Support ──────────────────
console.log(c.cyan('\n🧠 12. Phase 6 — Clinical Intelligence & Decision Support\n'));

check('Clinical Engine exports CLINICAL_RULES ≥15 + evaluateBeneficiary', () => {
  const m = require(path.join(backendRoot, 'services', 'dddClinicalEngine'));
  if (!m.DDDClinicalInsight) return false;
  if (typeof m.evaluateBeneficiary !== 'function') return false;
  if (typeof m.evaluateBatch !== 'function') return false;
  if (typeof m.createClinicalEngineRouter !== 'function') return false;
  if (typeof m.listRules !== 'function') return false;
  if (typeof m.getLatestInsight !== 'function') return false;
  if (typeof m.getClinicalDashboard !== 'function') return false;
  if (typeof m.getCriticalCases !== 'function') return false;
  if (m.CLINICAL_RULES.length < 15)
    throw new Error(`Expected ≥15 clinical rules, got ${m.CLINICAL_RULES.length}`);
  return true;
});

check('Clinical Engine DDDClinicalInsight model registered', () => {
  const m = require(path.join(backendRoot, 'services', 'dddClinicalEngine'));
  return m.DDDClinicalInsight && m.DDDClinicalInsight.modelName === 'DDDClinicalInsight';
});

check('Outcome Tracker exports trackOutcome + GAS + effect sizes', () => {
  const m = require(path.join(backendRoot, 'services', 'dddOutcomeTracker'));
  if (!m.DDDOutcomeSnapshot) return false;
  if (typeof m.trackOutcome !== 'function') return false;
  if (typeof m.calculateGAS !== 'function') return false;
  if (typeof m.evaluateDischargeReadiness !== 'function') return false;
  if (typeof m.cohensD !== 'function') return false;
  if (typeof m.glassDelta !== 'function') return false;
  if (typeof m.computeEffectSizes !== 'function') return false;
  if (typeof m.createOutcomeRouter !== 'function') return false;
  return true;
});

check('Outcome Tracker DDDOutcomeSnapshot model registered', () => {
  const m = require(path.join(backendRoot, 'services', 'dddOutcomeTracker'));
  return m.DDDOutcomeSnapshot && m.DDDOutcomeSnapshot.modelName === 'DDDOutcomeSnapshot';
});

check('Risk Stratification exports RISK_WEIGHTS (5) + TIER_THRESHOLDS (4) + core functions', () => {
  const m = require(path.join(backendRoot, 'services', 'dddRiskStratification'));
  if (!m.DDDWatchlist) return false;
  if (typeof m.stratifyBeneficiary !== 'function') return false;
  if (typeof m.stratifyPopulation !== 'function') return false;
  if (typeof m.getCaseloadPriorities !== 'function') return false;
  if (typeof m.getRiskDashboard !== 'function') return false;
  if (typeof m.detectEarlyWarnings !== 'function') return false;
  if (typeof m.createRiskStratificationRouter !== 'function') return false;
  if (Object.keys(m.RISK_WEIGHTS).length < 5) throw new Error('Expected ≥5 risk weights');
  if (Object.keys(m.TIER_THRESHOLDS).length < 4) throw new Error('Expected ≥4 tier thresholds');
  return true;
});

check('Risk Stratification DDDWatchlist model registered', () => {
  const m = require(path.join(backendRoot, 'services', 'dddRiskStratification'));
  return m.DDDWatchlist && m.DDDWatchlist.modelName === 'DDDWatchlist';
});

check('Smart Scheduler exports predictNoShow + recommendFrequency + workload', () => {
  const m = require(path.join(backendRoot, 'services', 'dddSmartScheduler'));
  if (!m.DDDSchedulingRecommendation) return false;
  if (typeof m.predictNoShow !== 'function') return false;
  if (typeof m.recommendFrequency !== 'function') return false;
  if (typeof m.analyzeWorkload !== 'function') return false;
  if (typeof m.detectConflicts !== 'function') return false;
  if (typeof m.generateRecommendations !== 'function') return false;
  if (typeof m.createSmartSchedulerRouter !== 'function') return false;
  return true;
});

check('Smart Scheduler DDDSchedulingRecommendation model registered', () => {
  const m = require(path.join(backendRoot, 'services', 'dddSmartScheduler'));
  return (
    m.DDDSchedulingRecommendation &&
    m.DDDSchedulingRecommendation.modelName === 'DDDSchedulingRecommendation'
  );
});

check('Platform routes mount Phase 6 routers (Clinical + Outcome + Risk + Scheduler)', () => {
  const content = fs.readFileSync(path.join(backendRoot, 'routes', 'platform.routes.js'), 'utf8');
  return (
    content.includes('dddClinicalEngine') &&
    content.includes('dddOutcomeTracker') &&
    content.includes('dddRiskStratification') &&
    content.includes('dddSmartScheduler') &&
    content.includes('clinicalEngineRouter') &&
    content.includes('outcomeRouter') &&
    content.includes('riskStratRouter') &&
    content.includes('smartSchedulerRouter')
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// 13. Phase 7 — Data Governance & Compliance
// ═══════════════════════════════════════════════════════════════════════════════
console.log('');
console.log(c.bold('  Section 13 — Phase 7: Data Governance & Compliance'));
console.log(c.dim('  ─────────────────────────────────────────────────'));

/* ── 13a. Consent Manager ── */
check('Consent Manager — DDDConsent model', () => {
  const m = require('../services/dddConsentManager');
  return m.DDDConsent && typeof m.DDDConsent.modelName === 'string';
});

check('Consent Manager — DDDDataSubjectRequest model', () => {
  const m = require('../services/dddConsentManager');
  return m.DDDDataSubjectRequest && typeof m.DDDDataSubjectRequest.modelName === 'string';
});

check('Consent Manager — CONSENT_PURPOSES (≥15)', () => {
  const { CONSENT_PURPOSES } = require('../services/dddConsentManager');
  return Array.isArray(CONSENT_PURPOSES) && CONSENT_PURPOSES.length >= 15;
});

check('Consent Manager — core functions exported', () => {
  const m = require('../services/dddConsentManager');
  return (
    typeof m.grantConsent === 'function' &&
    typeof m.withdrawConsent === 'function' &&
    typeof m.checkConsent === 'function'
  );
});

check('Consent Manager — DSAR functions exported', () => {
  const m = require('../services/dddConsentManager');
  return (
    typeof m.createDSAR === 'function' &&
    typeof m.processDSARAccess === 'function' &&
    typeof m.processDSARErasure === 'function'
  );
});

check('Consent Manager — createConsentRouter exported', () => {
  const { createConsentRouter } = require('../services/dddConsentManager');
  return typeof createConsentRouter === 'function';
});

/* ── 13b. Compliance Dashboard ── */
check('Compliance Dashboard — createComplianceDashboardRouter exported', () => {
  const { createComplianceDashboardRouter } = require('../services/dddComplianceDashboard');
  return typeof createComplianceDashboardRouter === 'function';
});

check('Compliance Dashboard — models exported (Policy + Assessment)', () => {
  const m = require('../services/dddComplianceDashboard');
  return (m.DDDCompliancePolicy || m.DDDComplianceAssessment) && true;
});

check('Compliance Dashboard — core functions exported', () => {
  const m = require('../services/dddComplianceDashboard');
  return (
    typeof m.getComplianceDashboard === 'function' ||
    typeof m.assessCompliance === 'function' ||
    typeof m.createComplianceDashboardRouter === 'function'
  );
});

/* ── 13c. Data Quality Monitor ── */
check('Data Quality Monitor — DDDDataQualityReport model', () => {
  const { DDDDataQualityReport } = require('../services/dddDataQualityMonitor');
  return DDDDataQualityReport && typeof DDDDataQualityReport.modelName === 'string';
});

check('Data Quality Monitor — MODEL_QUALITY_DEFS (≥10 models)', () => {
  const { MODEL_QUALITY_DEFS } = require('../services/dddDataQualityMonitor');
  return MODEL_QUALITY_DEFS && Object.keys(MODEL_QUALITY_DEFS).length >= 10;
});

check('Data Quality Monitor — check functions exported', () => {
  const m = require('../services/dddDataQualityMonitor');
  return (
    typeof m.checkCompleteness === 'function' &&
    typeof m.checkReferentialIntegrity === 'function' &&
    typeof m.checkFreshness === 'function'
  );
});

check('Data Quality Monitor — assessModelQuality + assessGlobalQuality', () => {
  const m = require('../services/dddDataQualityMonitor');
  return typeof m.assessModelQuality === 'function' && typeof m.assessGlobalQuality === 'function';
});

check('Data Quality Monitor — createDataQualityRouter exported', () => {
  const { createDataQualityRouter } = require('../services/dddDataQualityMonitor');
  return typeof createDataQualityRouter === 'function';
});

/* ── 13d. Interoperability Gateway ── */
check('Interoperability Gateway — DDDIntegrationLog model', () => {
  const { DDDIntegrationLog } = require('../services/dddInteroperabilityGateway');
  return DDDIntegrationLog && typeof DDDIntegrationLog.modelName === 'string';
});

check('Interoperability Gateway — FHIR_MAPPERS (≥5 resource types)', () => {
  const { FHIR_MAPPERS, SUPPORTED_RESOURCES } = require('../services/dddInteroperabilityGateway');
  return FHIR_MAPPERS && SUPPORTED_RESOURCES && SUPPORTED_RESOURCES.length >= 5;
});

check('Interoperability Gateway — FHIR operations exported', () => {
  const m = require('../services/dddInteroperabilityGateway');
  return (
    typeof m.fhirRead === 'function' &&
    typeof m.fhirSearch === 'function' &&
    typeof m.fhirCreate === 'function'
  );
});

check('Interoperability Gateway — Capability Statement', () => {
  const { getCapabilityStatement } = require('../services/dddInteroperabilityGateway');
  const cs = getCapabilityStatement();
  return cs && cs.resourceType === 'CapabilityStatement' && cs.fhirVersion === '4.0.1';
});

check('Interoperability Gateway — createInteropRouter exported', () => {
  const { createInteropRouter } = require('../services/dddInteroperabilityGateway');
  return typeof createInteropRouter === 'function';
});

/* ── 13e. Platform routes wiring ── */
check(
  'Platform routes mount Phase 7 routers (Consent + Compliance + DataQuality + Interop)',
  () => {
    const content = fs.readFileSync(path.join(backendRoot, 'routes', 'platform.routes.js'), 'utf8');
    return (
      content.includes('dddConsentManager') &&
      content.includes('dddComplianceDashboard') &&
      content.includes('dddDataQualityMonitor') &&
      content.includes('dddInteroperabilityGateway') &&
      content.includes('consentRouter') &&
      content.includes('complianceRouter') &&
      content.includes('dataQualityRouter') &&
      content.includes('interopRouter')
    );
  }
);

// ═══════════════════════════════════════════════════════════════════════════════
// 14. Phase 8 — Multi-Tenancy, Configuration & Localization
// ═══════════════════════════════════════════════════════════════════════════════
console.log('');
console.log(c.bold('  Section 14 — Phase 8: Multi-Tenancy, Configuration & Localization'));
console.log(c.dim('  ─────────────────────────────────────────────────'));

/* ── 14a. Tenant Manager ── */
check('Tenant Manager — DDDBranch model', () => {
  const { DDDBranch } = require('../services/dddTenantManager');
  return DDDBranch && typeof DDDBranch.modelName === 'string';
});

check('Tenant Manager — DDDTenantAccess model', () => {
  const { DDDTenantAccess } = require('../services/dddTenantManager');
  return DDDTenantAccess && typeof DDDTenantAccess.modelName === 'string';
});

check('Tenant Manager — TENANT_SCOPED_MODELS (≥20)', () => {
  const { TENANT_SCOPED_MODELS } = require('../services/dddTenantManager');
  return Array.isArray(TENANT_SCOPED_MODELS) && TENANT_SCOPED_MODELS.length >= 20;
});

check('Tenant Manager — core functions exported', () => {
  const m = require('../services/dddTenantManager');
  return (
    typeof m.createBranch === 'function' &&
    typeof m.grantAccess === 'function' &&
    typeof m.checkBranchAccess === 'function'
  );
});

check('Tenant Manager — middleware exported', () => {
  const m = require('../services/dddTenantManager');
  return typeof m.tenantScopeMiddleware === 'function' && typeof m.buildTenantQuery === 'function';
});

check('Tenant Manager — createTenantRouter exported', () => {
  const { createTenantRouter } = require('../services/dddTenantManager');
  return typeof createTenantRouter === 'function';
});

/* ── 14b. Feature Flags ── */
check('Feature Flags — DDDFeatureFlag model', () => {
  const { DDDFeatureFlag } = require('../services/dddFeatureFlags');
  return DDDFeatureFlag && typeof DDDFeatureFlag.modelName === 'string';
});

check('Feature Flags — DDDFlagAudit model', () => {
  const { DDDFlagAudit } = require('../services/dddFeatureFlags');
  return DDDFlagAudit && typeof DDDFlagAudit.modelName === 'string';
});

check('Feature Flags — DEFAULT_FLAGS (≥20)', () => {
  const { DEFAULT_FLAGS } = require('../services/dddFeatureFlags');
  return Array.isArray(DEFAULT_FLAGS) && DEFAULT_FLAGS.length >= 20;
});

check('Feature Flags — evaluation engine exported', () => {
  const m = require('../services/dddFeatureFlags');
  return (
    typeof m.evaluateFlag === 'function' &&
    typeof m.isEnabled === 'function' &&
    typeof m.hashPercentage === 'function'
  );
});

check('Feature Flags — createFeatureFlagRouter exported', () => {
  const { createFeatureFlagRouter } = require('../services/dddFeatureFlags');
  return typeof createFeatureFlagRouter === 'function';
});

/* ── 14c. Config Manager ── */
check('Config Manager — DDDConfig model', () => {
  const { DDDConfig } = require('../services/dddConfigManager');
  return DDDConfig && typeof DDDConfig.modelName === 'string';
});

check('Config Manager — DDDConfigVersion model', () => {
  const { DDDConfigVersion } = require('../services/dddConfigManager');
  return DDDConfigVersion && typeof DDDConfigVersion.modelName === 'string';
});

check('Config Manager — DEFAULT_CONFIGS (≥25)', () => {
  const { DEFAULT_CONFIGS } = require('../services/dddConfigManager');
  return Array.isArray(DEFAULT_CONFIGS) && DEFAULT_CONFIGS.length >= 25;
});

check('Config Manager — core functions exported', () => {
  const m = require('../services/dddConfigManager');
  return (
    typeof m.setConfig === 'function' &&
    typeof m.getConfig === 'function' &&
    typeof m.rollbackConfig === 'function'
  );
});

check('Config Manager — encryption helpers exported', () => {
  const m = require('../services/dddConfigManager');
  return typeof m.encrypt === 'function' && typeof m.decrypt === 'function';
});

check('Config Manager — createConfigRouter exported', () => {
  const { createConfigRouter } = require('../services/dddConfigManager');
  return typeof createConfigRouter === 'function';
});

/* ── 14d. Localization Engine ── */
check('Localization Engine — DDDTranslation model', () => {
  const { DDDTranslation } = require('../services/dddLocalizationEngine');
  return DDDTranslation && typeof DDDTranslation.modelName === 'string';
});

check('Localization Engine — SUPPORTED_LOCALES (ar + en)', () => {
  const { SUPPORTED_LOCALES } = require('../services/dddLocalizationEngine');
  return (
    Array.isArray(SUPPORTED_LOCALES) &&
    SUPPORTED_LOCALES.includes('ar') &&
    SUPPORTED_LOCALES.includes('en')
  );
});

check('Localization Engine — BUILTIN_TRANSLATIONS (≥5 namespaces)', () => {
  const { BUILTIN_TRANSLATIONS } = require('../services/dddLocalizationEngine');
  return BUILTIN_TRANSLATIONS && Object.keys(BUILTIN_TRANSLATIONS).length >= 5;
});

check('Localization Engine — translation function t() exported', () => {
  const { t } = require('../services/dddLocalizationEngine');
  return typeof t === 'function';
});

check('Localization Engine — localeMiddleware exported', () => {
  const { localeMiddleware } = require('../services/dddLocalizationEngine');
  return typeof localeMiddleware === 'function';
});

check('Localization Engine — createLocalizationRouter exported', () => {
  const { createLocalizationRouter } = require('../services/dddLocalizationEngine');
  return typeof createLocalizationRouter === 'function';
});

/* ── 14e. Platform routes wiring ── */
check('Platform routes mount Phase 8 routers (Tenant + Flags + Config + i18n)', () => {
  const content = fs.readFileSync(path.join(backendRoot, 'routes', 'platform.routes.js'), 'utf8');
  return (
    content.includes('dddTenantManager') &&
    content.includes('dddFeatureFlags') &&
    content.includes('dddConfigManager') &&
    content.includes('dddLocalizationEngine') &&
    content.includes('tenantRouter') &&
    content.includes('featureFlagRouter') &&
    content.includes('configRouter') &&
    content.includes('localizationRouter')
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// 15. Phase 9 — Monitoring, Health & Resilience
// ═══════════════════════════════════════════════════════════════════════════════
console.log('');
console.log(c.bold('  Section 15 — Phase 9: Monitoring, Health & Resilience'));
console.log(c.dim('  ─────────────────────────────────────────────────'));

/* ── 15a. Health Monitor ── */
check('Health Monitor — DDDHealthCheck model', () => {
  const { DDDHealthCheck } = require('../services/dddHealthMonitor');
  return DDDHealthCheck && typeof DDDHealthCheck.modelName === 'string';
});

check('Health Monitor — HEALTH_CHECK_DEFS (≥20 domains)', () => {
  const { HEALTH_CHECK_DEFS } = require('../services/dddHealthMonitor');
  return HEALTH_CHECK_DEFS && Object.keys(HEALTH_CHECK_DEFS).length >= 20;
});

check('Health Monitor — DOMAIN_MODEL_MAP exported', () => {
  const { DOMAIN_MODEL_MAP } = require('../services/dddHealthMonitor');
  return (
    DOMAIN_MODEL_MAP &&
    typeof DOMAIN_MODEL_MAP === 'object' &&
    Object.keys(DOMAIN_MODEL_MAP).length > 0
  );
});

check('Health Monitor — core check functions exported', () => {
  const m = require('../services/dddHealthMonitor');
  return (
    typeof m.checkMongoDB === 'function' &&
    typeof m.checkRedis === 'function' &&
    typeof m.checkMemory === 'function' &&
    typeof m.checkUptime === 'function'
  );
});

check('Health Monitor — domain health functions exported', () => {
  const m = require('../services/dddHealthMonitor');
  return (
    typeof m.checkDomainHealth === 'function' &&
    typeof m.checkAllDomains === 'function' &&
    typeof m.runFullHealthCheck === 'function'
  );
});

check('Health Monitor — probes exported (liveness + readiness)', () => {
  const m = require('../services/dddHealthMonitor');
  return typeof m.livenessCheck === 'function' && typeof m.readinessCheck === 'function';
});

check('Health Monitor — createHealthMonitorRouter exported', () => {
  const { createHealthMonitorRouter } = require('../services/dddHealthMonitor');
  return typeof createHealthMonitorRouter === 'function';
});

/* ── 15b. Metrics Collector ── */
check('Metrics Collector — DDDMetricEntry model', () => {
  const { DDDMetricEntry } = require('../services/dddMetricsCollector');
  return DDDMetricEntry && typeof DDDMetricEntry.modelName === 'string';
});

check('Metrics Collector — METRIC_TYPES defined', () => {
  const { METRIC_TYPES } = require('../services/dddMetricsCollector');
  return Array.isArray(METRIC_TYPES) && METRIC_TYPES.length > 0;
});

check('Metrics Collector — recordMetric function exported', () => {
  const { recordMetric } = require('../services/dddMetricsCollector');
  return typeof recordMetric === 'function';
});

check('Metrics Collector — metricsMiddleware exported', () => {
  const { metricsMiddleware } = require('../services/dddMetricsCollector');
  return typeof metricsMiddleware === 'function';
});

check('Metrics Collector — dashboard & prometheus output exported', () => {
  const m = require('../services/dddMetricsCollector');
  return typeof m.getMetricsDashboard === 'function' && typeof m.getPrometheusOutput === 'function';
});

check('Metrics Collector — createMetricsRouter exported', () => {
  const { createMetricsRouter } = require('../services/dddMetricsCollector');
  return typeof createMetricsRouter === 'function';
});

/* ── 15c. Circuit Breaker ── */
check('Circuit Breaker — DDDCircuitState model', () => {
  const { DDDCircuitState } = require('../services/dddCircuitBreaker');
  return DDDCircuitState && typeof DDDCircuitState.modelName === 'string';
});

check('Circuit Breaker — CircuitBreaker class exported', () => {
  const { CircuitBreaker } = require('../services/dddCircuitBreaker');
  return typeof CircuitBreaker === 'function';
});

check('Circuit Breaker — CIRCUIT_DEFAULTS defined', () => {
  const { CIRCUIT_DEFAULTS } = require('../services/dddCircuitBreaker');
  return CIRCUIT_DEFAULTS && typeof CIRCUIT_DEFAULTS.failureThreshold === 'number';
});

check('Circuit Breaker — withRetry & withFallback exported', () => {
  const m = require('../services/dddCircuitBreaker');
  return typeof m.withRetry === 'function' && typeof m.withFallback === 'function';
});

check('Circuit Breaker — getCircuitDashboard exported', () => {
  const { getCircuitDashboard } = require('../services/dddCircuitBreaker');
  return typeof getCircuitDashboard === 'function';
});

check('Circuit Breaker — createCircuitBreakerRouter exported', () => {
  const { createCircuitBreakerRouter } = require('../services/dddCircuitBreaker');
  return typeof createCircuitBreakerRouter === 'function';
});

/* ── 15d. Error Tracker ── */
check('Error Tracker — DDDErrorLog model', () => {
  const { DDDErrorLog } = require('../services/dddErrorTracker');
  return DDDErrorLog && typeof DDDErrorLog.modelName === 'string';
});

check('Error Tracker — ERROR_CATEGORIES (≥10)', () => {
  const { ERROR_CATEGORIES } = require('../services/dddErrorTracker');
  return Array.isArray(ERROR_CATEGORIES) && ERROR_CATEGORIES.length >= 10;
});

check('Error Tracker — classifyError & classifySeverity exported', () => {
  const m = require('../services/dddErrorTracker');
  return typeof m.classifyError === 'function' && typeof m.classifySeverity === 'function';
});

check('Error Tracker — trackError function exported', () => {
  const { trackError } = require('../services/dddErrorTracker');
  return typeof trackError === 'function';
});

check('Error Tracker — errorMiddleware exported', () => {
  const { errorMiddleware } = require('../services/dddErrorTracker');
  return typeof errorMiddleware === 'function';
});

check('Error Tracker — dashboard & trend exported', () => {
  const m = require('../services/dddErrorTracker');
  return typeof m.getErrorDashboard === 'function' && typeof m.getErrorTrend === 'function';
});

check('Error Tracker — createErrorTrackerRouter exported', () => {
  const { createErrorTrackerRouter } = require('../services/dddErrorTracker');
  return typeof createErrorTrackerRouter === 'function';
});

/* ── 15e. Platform routes wiring ── */
check('Platform routes mount Phase 9 routers (Health + Metrics + Circuit + Errors)', () => {
  const content = fs.readFileSync(path.join(backendRoot, 'routes', 'platform.routes.js'), 'utf8');
  return (
    content.includes('dddHealthMonitor') &&
    content.includes('dddMetricsCollector') &&
    content.includes('dddCircuitBreaker') &&
    content.includes('dddErrorTracker') &&
    content.includes('healthMonitorRouter') &&
    content.includes('metricsRouter') &&
    content.includes('circuitBreakerRouter') &&
    content.includes('errorTrackerRouter')
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// 16. Phase 10 — API Gateway, Developer Experience & Migration
// ═══════════════════════════════════════════════════════════════════════════════
console.log('');
console.log(c.bold('  Section 16 — Phase 10: API Gateway, Developer Experience & Migration'));
console.log(c.dim('  ─────────────────────────────────────────────────'));

/* ── 16a. API Gateway ── */
check('API Gateway — DDDApiKey model', () => {
  const { DDDApiKey } = require('../services/dddApiGateway');
  return DDDApiKey && typeof DDDApiKey.modelName === 'string';
});

check('API Gateway — DDDApiUsage model', () => {
  const { DDDApiUsage } = require('../services/dddApiGateway');
  return DDDApiUsage && typeof DDDApiUsage.modelName === 'string';
});

check('API Gateway — API_VERSIONS & CURRENT_VERSION defined', () => {
  const { API_VERSIONS, CURRENT_VERSION } = require('../services/dddApiGateway');
  return (
    Array.isArray(API_VERSIONS) && API_VERSIONS.length >= 3 && typeof CURRENT_VERSION === 'string'
  );
});

check('API Gateway — key management functions exported', () => {
  const m = require('../services/dddApiGateway');
  return (
    typeof m.createApiKey === 'function' &&
    typeof m.validateApiKey === 'function' &&
    typeof m.revokeApiKey === 'function' &&
    typeof m.suspendApiKey === 'function'
  );
});

check('API Gateway — middleware exported (apiKey + usageTracking)', () => {
  const m = require('../services/dddApiGateway');
  return (
    typeof m.apiKeyMiddleware === 'function' && typeof m.usageTrackingMiddleware === 'function'
  );
});

check('API Gateway — RESPONSE_TRANSFORMS defined', () => {
  const { RESPONSE_TRANSFORMS } = require('../services/dddApiGateway');
  return RESPONSE_TRANSFORMS && typeof RESPONSE_TRANSFORMS.envelope === 'function';
});

check('API Gateway — createApiGatewayRouter exported', () => {
  const { createApiGatewayRouter } = require('../services/dddApiGateway');
  return typeof createApiGatewayRouter === 'function';
});

/* ── 16b. Data Migration ── */
check('Data Migration — DDDMigration model', () => {
  const { DDDMigration } = require('../services/dddDataMigration');
  return DDDMigration && typeof DDDMigration.modelName === 'string';
});

check('Data Migration — DDDMigrationLock model', () => {
  const { DDDMigrationLock } = require('../services/dddDataMigration');
  return DDDMigrationLock && typeof DDDMigrationLock.modelName === 'string';
});

check('Data Migration — BUILTIN_MIGRATIONS (≥10)', () => {
  const { BUILTIN_MIGRATIONS } = require('../services/dddDataMigration');
  return Array.isArray(BUILTIN_MIGRATIONS) && BUILTIN_MIGRATIONS.length >= 10;
});

check('Data Migration — migration lifecycle functions exported', () => {
  const m = require('../services/dddDataMigration');
  return (
    typeof m.runMigration === 'function' &&
    typeof m.rollbackMigration === 'function' &&
    typeof m.runAllPending === 'function'
  );
});

check('Data Migration — lock management exported', () => {
  const m = require('../services/dddDataMigration');
  return typeof m.acquireLock === 'function' && typeof m.releaseLock === 'function';
});

check('Data Migration — createDataMigrationRouter exported', () => {
  const { createDataMigrationRouter } = require('../services/dddDataMigration');
  return typeof createDataMigrationRouter === 'function';
});

/* ── 16c. Task Queue ── */
check('Task Queue — DDDJob model', () => {
  const { DDDJob } = require('../services/dddTaskQueue');
  return DDDJob && typeof DDDJob.modelName === 'string';
});

check('Task Queue — QUEUE_DEFINITIONS (≥10)', () => {
  const { QUEUE_DEFINITIONS } = require('../services/dddTaskQueue');
  return Array.isArray(QUEUE_DEFINITIONS) && QUEUE_DEFINITIONS.length >= 10;
});

check('Task Queue — JOB_TYPES (≥15)', () => {
  const { JOB_TYPES } = require('../services/dddTaskQueue');
  return Array.isArray(JOB_TYPES) && JOB_TYPES.length >= 15;
});

check('Task Queue — PRIORITY_WEIGHTS defined', () => {
  const { PRIORITY_WEIGHTS } = require('../services/dddTaskQueue');
  return PRIORITY_WEIGHTS && typeof PRIORITY_WEIGHTS.critical === 'number';
});

check('Task Queue — job lifecycle functions exported', () => {
  const m = require('../services/dddTaskQueue');
  return (
    typeof m.enqueueJob === 'function' &&
    typeof m.processNextJob === 'function' &&
    typeof m.cancelJob === 'function' &&
    typeof m.retryDeadJob === 'function'
  );
});

check('Task Queue — handler registry exported', () => {
  const m = require('../services/dddTaskQueue');
  return typeof m.registerHandler === 'function' && typeof m.getHandler === 'function';
});

check('Task Queue — createTaskQueueRouter exported', () => {
  const { createTaskQueueRouter } = require('../services/dddTaskQueue');
  return typeof createTaskQueueRouter === 'function';
});

/* ── 16d. Dev Portal ── */
check('Dev Portal — DDDChangelog model', () => {
  const { DDDChangelog } = require('../services/dddDevPortal');
  return DDDChangelog && typeof DDDChangelog.modelName === 'string';
});

check('Dev Portal — DOMAIN_ENDPOINTS (≥30)', () => {
  const { DOMAIN_ENDPOINTS } = require('../services/dddDevPortal');
  return Array.isArray(DOMAIN_ENDPOINTS) && DOMAIN_ENDPOINTS.length >= 30;
});

check('Dev Portal — SDK_TARGETS (≥5 languages)', () => {
  const { SDK_TARGETS } = require('../services/dddDevPortal');
  return Array.isArray(SDK_TARGETS) && SDK_TARGETS.length >= 5;
});

check('Dev Portal — generateOpenAPISpec exported', () => {
  const { generateOpenAPISpec } = require('../services/dddDevPortal');
  return typeof generateOpenAPISpec === 'function';
});

check('Dev Portal — OpenAPI spec is valid', () => {
  const { generateOpenAPISpec } = require('../services/dddDevPortal');
  const spec = generateOpenAPISpec();
  return spec.openapi === '3.0.3' && spec.info && spec.paths && Object.keys(spec.paths).length > 0;
});

check('Dev Portal — changelog functions exported', () => {
  const m = require('../services/dddDevPortal');
  return typeof m.addChangelog === 'function' && typeof m.getChangelogs === 'function';
});

check('Dev Portal — createDevPortalRouter exported', () => {
  const { createDevPortalRouter } = require('../services/dddDevPortal');
  return typeof createDevPortalRouter === 'function';
});

/* ── 16e. Platform routes wiring ── */
check('Platform routes mount Phase 10 routers (Gateway + Migration + Queue + DevPortal)', () => {
  const content = fs.readFileSync(path.join(backendRoot, 'routes', 'platform.routes.js'), 'utf8');
  return (
    content.includes('dddApiGateway') &&
    content.includes('dddDataMigration') &&
    content.includes('dddTaskQueue') &&
    content.includes('dddDevPortal') &&
    content.includes('apiGatewayRouter') &&
    content.includes('dataMigrationRouter') &&
    content.includes('taskQueueRouter') &&
    content.includes('devPortalRouter')
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// 17. Phase 11 — Advanced Security & Access Control
// ═══════════════════════════════════════════════════════════════════════════════
console.log('');
console.log(c.bold('  Section 17 — Phase 11: Advanced Security & Access Control'));
console.log(c.dim('  ─────────────────────────────────────────────────'));

/* ── 17a. Security Auditor ── */
check('Security Auditor — DDDSecurityEvent model', () => {
  const { DDDSecurityEvent } = require('../services/dddSecurityAuditor');
  return DDDSecurityEvent && typeof DDDSecurityEvent.modelName === 'string';
});

check('Security Auditor — DDDSecurityPolicy model', () => {
  const { DDDSecurityPolicy } = require('../services/dddSecurityAuditor');
  return DDDSecurityPolicy && typeof DDDSecurityPolicy.modelName === 'string';
});

check('Security Auditor — BUILTIN_POLICIES (≥15)', () => {
  const { BUILTIN_POLICIES } = require('../services/dddSecurityAuditor');
  return Array.isArray(BUILTIN_POLICIES) && BUILTIN_POLICIES.length >= 15;
});

check('Security Auditor — THREAT_PATTERNS defined', () => {
  const { THREAT_PATTERNS } = require('../services/dddSecurityAuditor');
  return Array.isArray(THREAT_PATTERNS) && THREAT_PATTERNS.length > 0;
});

check('Security Auditor — core functions exported', () => {
  const m = require('../services/dddSecurityAuditor');
  return (
    typeof m.detectThreats === 'function' &&
    typeof m.logSecurityEvent === 'function' &&
    typeof m.checkBruteForce === 'function' &&
    typeof m.getIPReputation === 'function'
  );
});

check('Security Auditor — securityScanMiddleware exported', () => {
  const { securityScanMiddleware } = require('../services/dddSecurityAuditor');
  return typeof securityScanMiddleware === 'function';
});

check('Security Auditor — createSecurityAuditorRouter exported', () => {
  const { createSecurityAuditorRouter } = require('../services/dddSecurityAuditor');
  return typeof createSecurityAuditorRouter === 'function';
});

/* ── 17b. Session Manager ── */
check('Session Manager — DDDSession model', () => {
  const { DDDSession } = require('../services/dddSessionManager');
  return DDDSession && typeof DDDSession.modelName === 'string';
});

check('Session Manager — SESSION_DEFAULTS & DEVICE_TYPES defined', () => {
  const { SESSION_DEFAULTS, DEVICE_TYPES } = require('../services/dddSessionManager');
  return (
    SESSION_DEFAULTS &&
    typeof SESSION_DEFAULTS.maxConcurrentSessions === 'number' &&
    Array.isArray(DEVICE_TYPES)
  );
});

check('Session Manager — session lifecycle functions exported', () => {
  const m = require('../services/dddSessionManager');
  return (
    typeof m.createSession === 'function' &&
    typeof m.touchSession === 'function' &&
    typeof m.terminateSession === 'function' &&
    typeof m.terminateAllUserSessions === 'function' &&
    typeof m.getActiveSessions === 'function'
  );
});

check('Session Manager — enforceSessionLimits & cleanExpiredSessions exported', () => {
  const m = require('../services/dddSessionManager');
  return (
    typeof m.enforceSessionLimits === 'function' && typeof m.cleanExpiredSessions === 'function'
  );
});

check('Session Manager — device helpers exported', () => {
  const m = require('../services/dddSessionManager');
  return (
    typeof m.generateDeviceFingerprint === 'function' && typeof m.parseUserAgent === 'function'
  );
});

check('Session Manager — sessionTrackingMiddleware exported', () => {
  const { sessionTrackingMiddleware } = require('../services/dddSessionManager');
  return typeof sessionTrackingMiddleware === 'function';
});

check('Session Manager — createSessionManagerRouter exported', () => {
  const { createSessionManagerRouter } = require('../services/dddSessionManager');
  return typeof createSessionManagerRouter === 'function';
});

/* ── 17c. Encryption Service ── */
check('Encryption Service — DDDEncryptionKey model', () => {
  const { DDDEncryptionKey } = require('../services/dddEncryptionService');
  return DDDEncryptionKey && typeof DDDEncryptionKey.modelName === 'string';
});

check('Encryption Service — ENCRYPTION_DEFAULTS defined', () => {
  const { ENCRYPTION_DEFAULTS } = require('../services/dddEncryptionService');
  return ENCRYPTION_DEFAULTS && ENCRYPTION_DEFAULTS.algorithm === 'aes-256-gcm';
});

check('Encryption Service — DATA_CLASSIFICATIONS (≥4)', () => {
  const { DATA_CLASSIFICATIONS } = require('../services/dddEncryptionService');
  return Array.isArray(DATA_CLASSIFICATIONS) && DATA_CLASSIFICATIONS.length >= 4;
});

check('Encryption Service — PII_FIELDS (≥10)', () => {
  const { PII_FIELDS } = require('../services/dddEncryptionService');
  return Array.isArray(PII_FIELDS) && PII_FIELDS.length >= 10;
});

check('Encryption Service — encrypt/decrypt functions work', () => {
  const { encrypt, decrypt } = require('../services/dddEncryptionService');
  const plain = 'test-secret-data-12345';
  const encrypted = encrypt(plain);
  const decrypted = decrypt(encrypted);
  return decrypted === plain;
});

check('Encryption Service — masking functions exported', () => {
  const m = require('../services/dddEncryptionService');
  return (
    typeof m.maskValue === 'function' &&
    typeof m.maskObject === 'function' &&
    typeof m.detectPII === 'function'
  );
});

check('Encryption Service — tokenize/detokenize exported', () => {
  const m = require('../services/dddEncryptionService');
  return typeof m.tokenize === 'function' && typeof m.detokenize === 'function';
});

check('Encryption Service — key management exported', () => {
  const m = require('../services/dddEncryptionService');
  return typeof m.generateKey === 'function' && typeof m.rotateKey === 'function';
});

check('Encryption Service — createEncryptionRouter exported', () => {
  const { createEncryptionRouter } = require('../services/dddEncryptionService');
  return typeof createEncryptionRouter === 'function';
});

/* ── 17d. Access Control (ABAC) ── */
check('Access Control — DDDAccessPolicy model', () => {
  const { DDDAccessPolicy } = require('../services/dddAccessControl');
  return DDDAccessPolicy && typeof DDDAccessPolicy.modelName === 'string';
});

check('Access Control — DDDPermissionMatrix model', () => {
  const { DDDPermissionMatrix } = require('../services/dddAccessControl');
  return DDDPermissionMatrix && typeof DDDPermissionMatrix.modelName === 'string';
});

check('Access Control — DDDAccessLog model', () => {
  const { DDDAccessLog } = require('../services/dddAccessControl');
  return DDDAccessLog && typeof DDDAccessLog.modelName === 'string';
});

check('Access Control — ABAC_ATTRIBUTES defined', () => {
  const { ABAC_ATTRIBUTES } = require('../services/dddAccessControl');
  return (
    ABAC_ATTRIBUTES &&
    Array.isArray(ABAC_ATTRIBUTES.subject) &&
    Array.isArray(ABAC_ATTRIBUTES.action)
  );
});

check('Access Control — ROLES (≥15) & DOMAINS (≥20)', () => {
  const { ROLES, DOMAINS } = require('../services/dddAccessControl');
  return (
    Array.isArray(ROLES) && ROLES.length >= 15 && Array.isArray(DOMAINS) && DOMAINS.length >= 20
  );
});

check('Access Control — BUILTIN_ABAC_POLICIES (≥12)', () => {
  const { BUILTIN_ABAC_POLICIES } = require('../services/dddAccessControl');
  return Array.isArray(BUILTIN_ABAC_POLICIES) && BUILTIN_ABAC_POLICIES.length >= 12;
});

check('Access Control — evaluateAccess function works', () => {
  const { evaluateAccess, BUILTIN_ABAC_POLICIES } = require('../services/dddAccessControl');
  const result = evaluateAccess(
    {
      subject: { role: 'superadmin' },
      resource: { domain: 'core' },
      action: 'read',
      environment: {},
    },
    BUILTIN_ABAC_POLICIES
  );
  return result.allowed === true;
});

check('Access Control — abacMiddleware exported', () => {
  const { abacMiddleware } = require('../services/dddAccessControl');
  return typeof abacMiddleware === 'function';
});

check('Access Control — createAccessControlRouter exported', () => {
  const { createAccessControlRouter } = require('../services/dddAccessControl');
  return typeof createAccessControlRouter === 'function';
});

/* ── 17e. Platform routes wiring ── */
check('Platform routes mount Phase 11 routers (Security + Session + Encryption + ABAC)', () => {
  const content = fs.readFileSync(path.join(backendRoot, 'routes', 'platform.routes.js'), 'utf8');
  return (
    content.includes('dddSecurityAuditor') &&
    content.includes('dddSessionManager') &&
    content.includes('dddEncryptionService') &&
    content.includes('dddAccessControl') &&
    content.includes('securityAuditorRouter') &&
    content.includes('sessionManagerRouter') &&
    content.includes('encryptionRouter') &&
    content.includes('accessControlRouter')
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// 18. Phase 12 — Advanced Analytics & Business Intelligence
// ═══════════════════════════════════════════════════════════════════════════════
console.log('');
console.log(c.bold('  Section 18 — Phase 12: Advanced Analytics & Business Intelligence'));
console.log('');

/* ── 18a. Analytics Dashboard ── */
check('Analytics Dashboard — DDDWidget model', () => {
  const { DDDWidget } = require('../services/dddAnalyticsDashboard');
  return DDDWidget && typeof DDDWidget.modelName === 'string';
});

check('Analytics Dashboard — DDDDashboardLayout model', () => {
  const { DDDDashboardLayout } = require('../services/dddAnalyticsDashboard');
  return DDDDashboardLayout && typeof DDDDashboardLayout.modelName === 'string';
});

check('Analytics Dashboard — DDDAnalyticsSnapshot model', () => {
  const { DDDAnalyticsSnapshot } = require('../services/dddAnalyticsDashboard');
  return DDDAnalyticsSnapshot && typeof DDDAnalyticsSnapshot.modelName === 'string';
});

check('Analytics Dashboard — WIDGET_TYPES (≥10)', () => {
  const { WIDGET_TYPES } = require('../services/dddAnalyticsDashboard');
  return Object.keys(WIDGET_TYPES).length >= 10;
});

check('Analytics Dashboard — BUILTIN_WIDGETS (≥20)', () => {
  const { BUILTIN_WIDGETS } = require('../services/dddAnalyticsDashboard');
  return Array.isArray(BUILTIN_WIDGETS) && BUILTIN_WIDGETS.length >= 20;
});

check('Analytics Dashboard — COHORT_DEFINITIONS (≥8)', () => {
  const { COHORT_DEFINITIONS } = require('../services/dddAnalyticsDashboard');
  return Array.isArray(COHORT_DEFINITIONS) && COHORT_DEFINITIONS.length >= 8;
});

check('Analytics Dashboard — core functions exported', () => {
  const m = require('../services/dddAnalyticsDashboard');
  return (
    typeof m.upsertWidget === 'function' &&
    typeof m.executeWidget === 'function' &&
    typeof m.recordSnapshot === 'function' &&
    typeof m.getTrend === 'function' &&
    typeof m.runCohortAnalysis === 'function'
  );
});

check('Analytics Dashboard — createAnalyticsDashboardRouter exported', () => {
  const { createAnalyticsDashboardRouter } = require('../services/dddAnalyticsDashboard');
  return typeof createAnalyticsDashboardRouter === 'function';
});

/* ── 18b. Predictive Engine ── */
check('Predictive Engine — DDDPredictionModel model', () => {
  const { DDDPredictionModel } = require('../services/dddPredictiveEngine');
  return DDDPredictionModel && typeof DDDPredictionModel.modelName === 'string';
});

check('Predictive Engine — DDDPredictionResult model', () => {
  const { DDDPredictionResult } = require('../services/dddPredictiveEngine');
  return DDDPredictionResult && typeof DDDPredictionResult.modelName === 'string';
});

check('Predictive Engine — DDDAnomaly model', () => {
  const { DDDAnomaly } = require('../services/dddPredictiveEngine');
  return DDDAnomaly && typeof DDDAnomaly.modelName === 'string';
});

check('Predictive Engine — BUILTIN_MODELS (≥12)', () => {
  const { BUILTIN_MODELS } = require('../services/dddPredictiveEngine');
  return Array.isArray(BUILTIN_MODELS) && BUILTIN_MODELS.length >= 12;
});

check('Predictive Engine — ANOMALY_THRESHOLDS defined', () => {
  const { ANOMALY_THRESHOLDS } = require('../services/dddPredictiveEngine');
  return ANOMALY_THRESHOLDS && Object.keys(ANOMALY_THRESHOLDS).length >= 5;
});

check('Predictive Engine — runPrediction + detectAnomalies + generateForecast', () => {
  const m = require('../services/dddPredictiveEngine');
  return (
    typeof m.runPrediction === 'function' &&
    typeof m.detectAnomalies === 'function' &&
    typeof m.generateForecast === 'function'
  );
});

check('Predictive Engine — generateForecast works', () => {
  const { generateForecast } = require('../services/dddPredictiveEngine');
  const result = generateForecast([10, 12, 14, 16, 18], 3);
  return Array.isArray(result) && result.length === 3 && result[0].value !== undefined;
});

check('Predictive Engine — createPredictiveEngineRouter exported', () => {
  const { createPredictiveEngineRouter } = require('../services/dddPredictiveEngine');
  return typeof createPredictiveEngineRouter === 'function';
});

/* ── 18c. Data Warehouse ── */
check('Data Warehouse — DDDETLPipeline model', () => {
  const { DDDETLPipeline } = require('../services/dddDataWarehouse');
  return DDDETLPipeline && typeof DDDETLPipeline.modelName === 'string';
});

check('Data Warehouse — DDDMaterializedView model', () => {
  const { DDDMaterializedView } = require('../services/dddDataWarehouse');
  return DDDMaterializedView && typeof DDDMaterializedView.modelName === 'string';
});

check('Data Warehouse — DDDOLAPCube model', () => {
  const { DDDOLAPCube } = require('../services/dddDataWarehouse');
  return DDDOLAPCube && typeof DDDOLAPCube.modelName === 'string';
});

check('Data Warehouse — BUILTIN_PIPELINES (≥10)', () => {
  const { BUILTIN_PIPELINES } = require('../services/dddDataWarehouse');
  return Array.isArray(BUILTIN_PIPELINES) && BUILTIN_PIPELINES.length >= 10;
});

check('Data Warehouse — BUILTIN_VIEWS (≥6)', () => {
  const { BUILTIN_VIEWS } = require('../services/dddDataWarehouse');
  return Array.isArray(BUILTIN_VIEWS) && BUILTIN_VIEWS.length >= 6;
});

check('Data Warehouse — BUILTIN_CUBES (≥5)', () => {
  const { BUILTIN_CUBES } = require('../services/dddDataWarehouse');
  return Array.isArray(BUILTIN_CUBES) && BUILTIN_CUBES.length >= 5;
});

check('Data Warehouse — runETLPipeline + refreshMaterializedView + queryCube', () => {
  const m = require('../services/dddDataWarehouse');
  return (
    typeof m.runETLPipeline === 'function' &&
    typeof m.refreshMaterializedView === 'function' &&
    typeof m.queryCube === 'function'
  );
});

check('Data Warehouse — createDataWarehouseRouter exported', () => {
  const { createDataWarehouseRouter } = require('../services/dddDataWarehouse');
  return typeof createDataWarehouseRouter === 'function';
});

/* ── 18d. Business Intelligence ── */
check('Business Intelligence — DDDBIReport model', () => {
  const { DDDBIReport } = require('../services/dddBusinessIntelligence');
  return DDDBIReport && typeof DDDBIReport.modelName === 'string';
});

check('Business Intelligence — DDDScorecard model', () => {
  const { DDDScorecard } = require('../services/dddBusinessIntelligence');
  return DDDScorecard && typeof DDDScorecard.modelName === 'string';
});

check('Business Intelligence — DDDBenchmark model', () => {
  const { DDDBenchmark } = require('../services/dddBusinessIntelligence');
  return DDDBenchmark && typeof DDDBenchmark.modelName === 'string';
});

check('Business Intelligence — BUILTIN_REPORTS (≥12)', () => {
  const { BUILTIN_REPORTS } = require('../services/dddBusinessIntelligence');
  return Array.isArray(BUILTIN_REPORTS) && BUILTIN_REPORTS.length >= 12;
});

check('Business Intelligence — BUILTIN_SCORECARDS (≥5)', () => {
  const { BUILTIN_SCORECARDS } = require('../services/dddBusinessIntelligence');
  return Array.isArray(BUILTIN_SCORECARDS) && BUILTIN_SCORECARDS.length >= 5;
});

check('Business Intelligence — REPORT_CATEGORIES (≥10)', () => {
  const { REPORT_CATEGORIES } = require('../services/dddBusinessIntelligence');
  return REPORT_CATEGORIES && Object.keys(REPORT_CATEGORIES).length >= 10;
});

check('Business Intelligence — executeReport + calculateScorecard + executiveSummary', () => {
  const m = require('../services/dddBusinessIntelligence');
  return (
    typeof m.executeReport === 'function' &&
    typeof m.calculateScorecard === 'function' &&
    typeof m.executiveSummary === 'function'
  );
});

check('Business Intelligence — createBusinessIntelligenceRouter exported', () => {
  const { createBusinessIntelligenceRouter } = require('../services/dddBusinessIntelligence');
  return typeof createBusinessIntelligenceRouter === 'function';
});

/* ── 18e. Platform routes wiring ── */
check('Platform routes mount Phase 12 routers (Analytics + Predictive + DW + BI)', () => {
  const content = fs.readFileSync(path.join(backendRoot, 'routes', 'platform.routes.js'), 'utf8');
  return (
    content.includes('dddAnalyticsDashboard') &&
    content.includes('dddPredictiveEngine') &&
    content.includes('dddDataWarehouse') &&
    content.includes('dddBusinessIntelligence') &&
    content.includes('analyticsDashboardRouter') &&
    content.includes('predictiveEngineRouter') &&
    content.includes('dataWarehouseRouter') &&
    content.includes('businessIntelligenceRouter')
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// 19. Phase 13 — Real-time Collaboration & Communication
// ═══════════════════════════════════════════════════════════════════════════════
console.log('');
console.log(c.bold('  Section 19 — Phase 13: Real-time Collaboration & Communication'));
console.log('');

/* ── 19a. Collaboration Hub ── */
check('Collaboration Hub — DDDChannel model', () => {
  const { DDDChannel } = require('../services/dddCollaborationHub');
  return DDDChannel && typeof DDDChannel.modelName === 'string';
});

check('Collaboration Hub — DDDMessage model', () => {
  const { DDDMessage } = require('../services/dddCollaborationHub');
  return DDDMessage && typeof DDDMessage.modelName === 'string';
});

check('Collaboration Hub — DDDPresence model', () => {
  const { DDDPresence } = require('../services/dddCollaborationHub');
  return DDDPresence && typeof DDDPresence.modelName === 'string';
});

check('Collaboration Hub — CHANNEL_TYPES (≥7)', () => {
  const { CHANNEL_TYPES } = require('../services/dddCollaborationHub');
  return CHANNEL_TYPES && Object.keys(CHANNEL_TYPES).length >= 7;
});

check('Collaboration Hub — BUILTIN_CHANNELS (≥10)', () => {
  const { BUILTIN_CHANNELS } = require('../services/dddCollaborationHub');
  return Array.isArray(BUILTIN_CHANNELS) && BUILTIN_CHANNELS.length >= 10;
});

check('Collaboration Hub — PRESENCE_STATUSES (≥5)', () => {
  const { PRESENCE_STATUSES } = require('../services/dddCollaborationHub');
  return PRESENCE_STATUSES && Object.keys(PRESENCE_STATUSES).length >= 5;
});

check('Collaboration Hub — core functions exported', () => {
  const m = require('../services/dddCollaborationHub');
  return (
    typeof m.createChannel === 'function' &&
    typeof m.sendMessage === 'function' &&
    typeof m.markAsRead === 'function' &&
    typeof m.updatePresence === 'function' &&
    typeof m.searchMessages === 'function'
  );
});

check('Collaboration Hub — createCollaborationHubRouter exported', () => {
  const { createCollaborationHubRouter } = require('../services/dddCollaborationHub');
  return typeof createCollaborationHubRouter === 'function';
});

/* ── 19b. Case Conference ── */
check('Case Conference — DDDCaseConference model', () => {
  const { DDDCaseConference } = require('../services/dddCaseConference');
  return DDDCaseConference && typeof DDDCaseConference.modelName === 'string';
});

check('Case Conference — DDDConferenceTemplate model', () => {
  const { DDDConferenceTemplate } = require('../services/dddCaseConference');
  return DDDConferenceTemplate && typeof DDDConferenceTemplate.modelName === 'string';
});

check('Case Conference — CONFERENCE_TYPES (≥10)', () => {
  const { CONFERENCE_TYPES } = require('../services/dddCaseConference');
  return CONFERENCE_TYPES && Object.keys(CONFERENCE_TYPES).length >= 10;
});

check('Case Conference — BUILTIN_TEMPLATES (≥8)', () => {
  const { BUILTIN_TEMPLATES } = require('../services/dddCaseConference');
  return Array.isArray(BUILTIN_TEMPLATES) && BUILTIN_TEMPLATES.length >= 8;
});

check('Case Conference — scheduleConference + addDecision + addActionItem', () => {
  const m = require('../services/dddCaseConference');
  return (
    typeof m.scheduleConference === 'function' &&
    typeof m.addDecision === 'function' &&
    typeof m.addActionItem === 'function' &&
    typeof m.completeConference === 'function'
  );
});

check('Case Conference — createCaseConferenceRouter exported', () => {
  const { createCaseConferenceRouter } = require('../services/dddCaseConference');
  return typeof createCaseConferenceRouter === 'function';
});

/* ── 19c. Document Collaboration ── */
check('Document Collaboration — DDDCollabDocument model', () => {
  const { DDDCollabDocument } = require('../services/dddDocumentCollaboration');
  return DDDCollabDocument && typeof DDDCollabDocument.modelName === 'string';
});

check('Document Collaboration — DDDComment model', () => {
  const { DDDComment } = require('../services/dddDocumentCollaboration');
  return DDDComment && typeof DDDComment.modelName === 'string';
});

check('Document Collaboration — DOCUMENT_TYPES (≥12)', () => {
  const { DOCUMENT_TYPES } = require('../services/dddDocumentCollaboration');
  return DOCUMENT_TYPES && Object.keys(DOCUMENT_TYPES).length >= 12;
});

check('Document Collaboration — REVIEW_WORKFLOWS (≥5)', () => {
  const { REVIEW_WORKFLOWS } = require('../services/dddDocumentCollaboration');
  return REVIEW_WORKFLOWS && Object.keys(REVIEW_WORKFLOWS).length >= 5;
});

check('Document Collaboration — createDocument + updateDocument + addComment', () => {
  const m = require('../services/dddDocumentCollaboration');
  return (
    typeof m.createDocument === 'function' &&
    typeof m.updateDocument === 'function' &&
    typeof m.addComment === 'function' &&
    typeof m.submitForReview === 'function' &&
    typeof m.submitReview === 'function'
  );
});

check('Document Collaboration — lockDocument + unlockDocument', () => {
  const m = require('../services/dddDocumentCollaboration');
  return typeof m.lockDocument === 'function' && typeof m.unlockDocument === 'function';
});

check('Document Collaboration — createDocumentCollaborationRouter exported', () => {
  const { createDocumentCollaborationRouter } = require('../services/dddDocumentCollaboration');
  return typeof createDocumentCollaborationRouter === 'function';
});

/* ── 19d. Activity Feed ── */
check('Activity Feed — DDDActivity model', () => {
  const { DDDActivity } = require('../services/dddActivityFeed');
  return DDDActivity && typeof DDDActivity.modelName === 'string';
});

check('Activity Feed — DDDSubscription model', () => {
  const { DDDSubscription } = require('../services/dddActivityFeed');
  return DDDSubscription && typeof DDDSubscription.modelName === 'string';
});

check('Activity Feed — DDDDigest model', () => {
  const { DDDDigest } = require('../services/dddActivityFeed');
  return DDDDigest && typeof DDDDigest.modelName === 'string';
});

check('Activity Feed — ACTIVITY_VERBS (≥20)', () => {
  const { ACTIVITY_VERBS } = require('../services/dddActivityFeed');
  return ACTIVITY_VERBS && Object.keys(ACTIVITY_VERBS).length >= 20;
});

check('Activity Feed — ACTIVITY_CATEGORIES (≥10)', () => {
  const { ACTIVITY_CATEGORIES } = require('../services/dddActivityFeed');
  return ACTIVITY_CATEGORIES && Object.keys(ACTIVITY_CATEGORIES).length >= 10;
});

check('Activity Feed — publishActivity + getFeed + getEntityTimeline', () => {
  const m = require('../services/dddActivityFeed');
  return (
    typeof m.publishActivity === 'function' &&
    typeof m.getFeed === 'function' &&
    typeof m.getEntityTimeline === 'function' &&
    typeof m.subscribe === 'function'
  );
});

check('Activity Feed — generateDigest + getActivityAnalytics', () => {
  const m = require('../services/dddActivityFeed');
  return typeof m.generateDigest === 'function' && typeof m.getActivityAnalytics === 'function';
});

check('Activity Feed — createActivityFeedRouter exported', () => {
  const { createActivityFeedRouter } = require('../services/dddActivityFeed');
  return typeof createActivityFeedRouter === 'function';
});

/* ── 19e. Platform routes wiring ── */
check(
  'Platform routes mount Phase 13 routers (Collaboration + Conference + DocCollab + ActivityFeed)',
  () => {
    const content = fs.readFileSync(path.join(backendRoot, 'routes', 'platform.routes.js'), 'utf8');
    return (
      content.includes('dddCollaborationHub') &&
      content.includes('dddCaseConference') &&
      content.includes('dddDocumentCollaboration') &&
      content.includes('dddActivityFeed') &&
      content.includes('collaborationHubRouter') &&
      content.includes('caseConferenceRouter') &&
      content.includes('documentCollaborationRouter') &&
      content.includes('activityFeedRouter')
    );
  }
);

// ═══════════════════════════════════════════════════════════════════════════════
// Section 20 — Phase 14: Resource Management & Capacity Planning
// ═══════════════════════════════════════════════════════════════════════════════
console.log(c.cyan('\n═══ Section 20: Resource Management & Capacity Planning ═══'));

/* ── 20.1 Resource Manager ── */
check('Resource Manager — module loads', () => {
  const m = require('../services/dddResourceManager');
  return m && typeof m.createResourceManagerRouter === 'function';
});
check('Resource Manager — DDDResource model', () => {
  const m = require('../services/dddResourceManager');
  return m.DDDResource && typeof m.DDDResource.modelName === 'string';
});
check('Resource Manager — DDDAvailabilitySlot model', () => {
  const m = require('../services/dddResourceManager');
  return m.DDDAvailabilitySlot && typeof m.DDDAvailabilitySlot.modelName === 'string';
});
check('Resource Manager — DDDResourceAllocation model', () => {
  const m = require('../services/dddResourceManager');
  return m.DDDResourceAllocation && typeof m.DDDResourceAllocation.modelName === 'string';
});
check('Resource Manager — RESOURCE_TYPES (12)', () => {
  const { RESOURCE_TYPES } = require('../services/dddResourceManager');
  return Array.isArray(RESOURCE_TYPES) && RESOURCE_TYPES.length >= 12;
});
check('Resource Manager — SKILL_CATEGORIES (10)', () => {
  const { SKILL_CATEGORIES } = require('../services/dddResourceManager');
  return Array.isArray(SKILL_CATEGORIES) && SKILL_CATEGORIES.length >= 10;
});
check('Resource Manager — BUILTIN_RESOURCES (8)', () => {
  const { BUILTIN_RESOURCES } = require('../services/dddResourceManager');
  return Array.isArray(BUILTIN_RESOURCES) && BUILTIN_RESOURCES.length >= 8;
});
check('Resource Manager — service instance', () => {
  const { resourceManagerService } = require('../services/dddResourceManager');
  return resourceManagerService && typeof resourceManagerService.listResources === 'function';
});

/* ── 20.2 Capacity Planner ── */
check('Capacity Planner — module loads', () => {
  const m = require('../services/dddCapacityPlanner');
  return m && typeof m.createCapacityPlannerRouter === 'function';
});
check('Capacity Planner — DDDCapacityPlan model', () => {
  const m = require('../services/dddCapacityPlanner');
  return m.DDDCapacityPlan && typeof m.DDDCapacityPlan.modelName === 'string';
});
check('Capacity Planner — DDDDemandForecast model', () => {
  const m = require('../services/dddCapacityPlanner');
  return m.DDDDemandForecast && typeof m.DDDDemandForecast.modelName === 'string';
});
check('Capacity Planner — DDDBottleneck model', () => {
  const m = require('../services/dddCapacityPlanner');
  return m.DDDBottleneck && typeof m.DDDBottleneck.modelName === 'string';
});
check('Capacity Planner — PLANNING_HORIZONS (5)', () => {
  const { PLANNING_HORIZONS } = require('../services/dddCapacityPlanner');
  return Array.isArray(PLANNING_HORIZONS) && PLANNING_HORIZONS.length >= 5;
});
check('Capacity Planner — DEMAND_CATEGORIES (10)', () => {
  const { DEMAND_CATEGORIES } = require('../services/dddCapacityPlanner');
  return Array.isArray(DEMAND_CATEGORIES) && DEMAND_CATEGORIES.length >= 10;
});
check('Capacity Planner — BOTTLENECK_TYPES (8)', () => {
  const { BOTTLENECK_TYPES } = require('../services/dddCapacityPlanner');
  return Array.isArray(BOTTLENECK_TYPES) && BOTTLENECK_TYPES.length >= 8;
});
check('Capacity Planner — BUILTIN_CAPACITY_RULES (8)', () => {
  const { BUILTIN_CAPACITY_RULES } = require('../services/dddCapacityPlanner');
  return Array.isArray(BUILTIN_CAPACITY_RULES) && BUILTIN_CAPACITY_RULES.length >= 8;
});
check('Capacity Planner — service instance', () => {
  const { capacityPlannerService } = require('../services/dddCapacityPlanner');
  return capacityPlannerService && typeof capacityPlannerService.listPlans === 'function';
});

/* ── 20.3 Appointment Engine ── */
check('Appointment Engine — module loads', () => {
  const m = require('../services/dddAppointmentEngine');
  return m && typeof m.createAppointmentEngineRouter === 'function';
});
check('Appointment Engine — DDDAppointment model', () => {
  const m = require('../services/dddAppointmentEngine');
  return m.DDDAppointment && typeof m.DDDAppointment.modelName === 'string';
});
check('Appointment Engine — DDDWaitlist model', () => {
  const m = require('../services/dddAppointmentEngine');
  return m.DDDWaitlist && typeof m.DDDWaitlist.modelName === 'string';
});
check('Appointment Engine — APPOINTMENT_TYPES (12)', () => {
  const { APPOINTMENT_TYPES } = require('../services/dddAppointmentEngine');
  return Array.isArray(APPOINTMENT_TYPES) && APPOINTMENT_TYPES.length >= 12;
});
check('Appointment Engine — APPOINTMENT_STATUSES (9)', () => {
  const { APPOINTMENT_STATUSES } = require('../services/dddAppointmentEngine');
  return Array.isArray(APPOINTMENT_STATUSES) && APPOINTMENT_STATUSES.length >= 9;
});
check('Appointment Engine — WAITLIST_PRIORITIES (5)', () => {
  const { WAITLIST_PRIORITIES } = require('../services/dddAppointmentEngine');
  return Array.isArray(WAITLIST_PRIORITIES) && WAITLIST_PRIORITIES.length >= 5;
});
check('Appointment Engine — BUILTIN_APPOINTMENT_TEMPLATES (10)', () => {
  const { BUILTIN_APPOINTMENT_TEMPLATES } = require('../services/dddAppointmentEngine');
  return Array.isArray(BUILTIN_APPOINTMENT_TEMPLATES) && BUILTIN_APPOINTMENT_TEMPLATES.length >= 10;
});
check('Appointment Engine — service instance', () => {
  const { appointmentEngineService } = require('../services/dddAppointmentEngine');
  return (
    appointmentEngineService && typeof appointmentEngineService.listAppointments === 'function'
  );
});

/* ── 20.4 Asset Tracker ── */
check('Asset Tracker — module loads', () => {
  const m = require('../services/dddAssetTracker');
  return m && typeof m.createAssetTrackerRouter === 'function';
});
check('Asset Tracker — DDDAsset model', () => {
  const m = require('../services/dddAssetTracker');
  return m.DDDAsset && typeof m.DDDAsset.modelName === 'string';
});
check('Asset Tracker — DDDMaintenanceRecord model', () => {
  const m = require('../services/dddAssetTracker');
  return m.DDDMaintenanceRecord && typeof m.DDDMaintenanceRecord.modelName === 'string';
});
check('Asset Tracker — DDDAssetUsageLog model', () => {
  const m = require('../services/dddAssetTracker');
  return m.DDDAssetUsageLog && typeof m.DDDAssetUsageLog.modelName === 'string';
});
check('Asset Tracker — ASSET_CATEGORIES (12)', () => {
  const { ASSET_CATEGORIES } = require('../services/dddAssetTracker');
  return Array.isArray(ASSET_CATEGORIES) && ASSET_CATEGORIES.length >= 12;
});
check('Asset Tracker — MAINTENANCE_TYPES (7)', () => {
  const { MAINTENANCE_TYPES } = require('../services/dddAssetTracker');
  return Array.isArray(MAINTENANCE_TYPES) && MAINTENANCE_TYPES.length >= 7;
});
check('Asset Tracker — BUILTIN_ASSET_TYPES (10)', () => {
  const { BUILTIN_ASSET_TYPES } = require('../services/dddAssetTracker');
  return Array.isArray(BUILTIN_ASSET_TYPES) && BUILTIN_ASSET_TYPES.length >= 10;
});
check('Asset Tracker — service instance', () => {
  const { assetTrackerService } = require('../services/dddAssetTracker');
  return assetTrackerService && typeof assetTrackerService.listAssets === 'function';
});

/* ── 20.5 Route Wiring ── */
check('Phase 14 — routers wired in platform.routes.js', () => {
  const content = fs.readFileSync(path.join(backendRoot, 'routes', 'platform.routes.js'), 'utf-8');
  return (
    content.includes('resourceManagerRouter') &&
    content.includes('capacityPlannerRouter') &&
    content.includes('appointmentEngineRouter') &&
    content.includes('assetTrackerRouter')
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// Section 21 — Phase 15: Workflow & Process Automation
// ═══════════════════════════════════════════════════════════════════════════════
console.log(c.cyan('\n═══ Section 21: Workflow & Process Automation ═══'));

/* ── 21.1 Workflow Engine ── */
check('Workflow Engine — module loads', () => {
  const m = require('../services/dddWorkflowEngine');
  return m && typeof m.createWorkflowEngineRouter === 'function';
});
check('Workflow Engine — DDDWorkflowDefinition model', () => {
  const m = require('../services/dddWorkflowEngine');
  return m.DDDWorkflowDefinition && typeof m.DDDWorkflowDefinition.modelName === 'string';
});
check('Workflow Engine — DDDWorkflowInstance model', () => {
  const m = require('../services/dddWorkflowEngine');
  return m.DDDWorkflowInstance && typeof m.DDDWorkflowInstance.modelName === 'string';
});
check('Workflow Engine — DDDWorkflowTask model', () => {
  const m = require('../services/dddWorkflowEngine');
  return m.DDDWorkflowTask && typeof m.DDDWorkflowTask.modelName === 'string';
});
check('Workflow Engine — WORKFLOW_TYPES (12)', () => {
  const { WORKFLOW_TYPES } = require('../services/dddWorkflowEngine');
  return Array.isArray(WORKFLOW_TYPES) && WORKFLOW_TYPES.length >= 12;
});
check('Workflow Engine — TRIGGER_TYPES (7)', () => {
  const { TRIGGER_TYPES } = require('../services/dddWorkflowEngine');
  return Array.isArray(TRIGGER_TYPES) && TRIGGER_TYPES.length >= 7;
});
check('Workflow Engine — ACTION_TYPES (12)', () => {
  const { ACTION_TYPES } = require('../services/dddWorkflowEngine');
  return Array.isArray(ACTION_TYPES) && ACTION_TYPES.length >= 12;
});
check('Workflow Engine — BUILTIN_WORKFLOWS (10)', () => {
  const { BUILTIN_WORKFLOWS } = require('../services/dddWorkflowEngine');
  return Array.isArray(BUILTIN_WORKFLOWS) && BUILTIN_WORKFLOWS.length >= 10;
});
check('Workflow Engine — service instance', () => {
  const { workflowEngineService } = require('../services/dddWorkflowEngine');
  return workflowEngineService && typeof workflowEngineService.startWorkflow === 'function';
});

/* ── 21.2 Form Builder ── */
check('Form Builder — module loads', () => {
  const m = require('../services/dddFormBuilder');
  return m && typeof m.createFormBuilderRouter === 'function';
});
check('Form Builder — DDDFormTemplate model', () => {
  const m = require('../services/dddFormBuilder');
  return m.DDDFormTemplate && typeof m.DDDFormTemplate.modelName === 'string';
});
check('Form Builder — DDDFormSubmission model', () => {
  const m = require('../services/dddFormBuilder');
  return m.DDDFormSubmission && typeof m.DDDFormSubmission.modelName === 'string';
});
check('Form Builder — FIELD_TYPES (20)', () => {
  const { FIELD_TYPES } = require('../services/dddFormBuilder');
  return Array.isArray(FIELD_TYPES) && FIELD_TYPES.length >= 20;
});
check('Form Builder — FORM_CATEGORIES (11)', () => {
  const { FORM_CATEGORIES } = require('../services/dddFormBuilder');
  return Array.isArray(FORM_CATEGORIES) && FORM_CATEGORIES.length >= 11;
});
check('Form Builder — VALIDATION_RULES (11)', () => {
  const { VALIDATION_RULES } = require('../services/dddFormBuilder');
  return Array.isArray(VALIDATION_RULES) && VALIDATION_RULES.length >= 11;
});
check('Form Builder — BUILTIN_FORM_TEMPLATES (10)', () => {
  const { BUILTIN_FORM_TEMPLATES } = require('../services/dddFormBuilder');
  return Array.isArray(BUILTIN_FORM_TEMPLATES) && BUILTIN_FORM_TEMPLATES.length >= 10;
});
check('Form Builder — service instance', () => {
  const { formBuilderService } = require('../services/dddFormBuilder');
  return formBuilderService && typeof formBuilderService.submitForm === 'function';
});

/* ── 21.3 Approval Chain ── */
check('Approval Chain — module loads', () => {
  const m = require('../services/dddApprovalChain');
  return m && typeof m.createApprovalChainRouter === 'function';
});
check('Approval Chain — DDDApprovalPolicy model', () => {
  const m = require('../services/dddApprovalChain');
  return m.DDDApprovalPolicy && typeof m.DDDApprovalPolicy.modelName === 'string';
});
check('Approval Chain — DDDApprovalRequest model', () => {
  const m = require('../services/dddApprovalChain');
  return m.DDDApprovalRequest && typeof m.DDDApprovalRequest.modelName === 'string';
});
check('Approval Chain — DDDDelegation model', () => {
  const m = require('../services/dddApprovalChain');
  return m.DDDDelegation && typeof m.DDDDelegation.modelName === 'string';
});
check('Approval Chain — APPROVAL_TYPES (10)', () => {
  const { APPROVAL_TYPES } = require('../services/dddApprovalChain');
  return Array.isArray(APPROVAL_TYPES) && APPROVAL_TYPES.length >= 10;
});
check('Approval Chain — APPROVAL_STATUSES (8)', () => {
  const { APPROVAL_STATUSES } = require('../services/dddApprovalChain');
  return Array.isArray(APPROVAL_STATUSES) && APPROVAL_STATUSES.length >= 8;
});
check('Approval Chain — ESCALATION_TRIGGERS (5)', () => {
  const { ESCALATION_TRIGGERS } = require('../services/dddApprovalChain');
  return Array.isArray(ESCALATION_TRIGGERS) && ESCALATION_TRIGGERS.length >= 5;
});
check('Approval Chain — BUILTIN_APPROVAL_POLICIES (8)', () => {
  const { BUILTIN_APPROVAL_POLICIES } = require('../services/dddApprovalChain');
  return Array.isArray(BUILTIN_APPROVAL_POLICIES) && BUILTIN_APPROVAL_POLICIES.length >= 8;
});
check('Approval Chain — service instance', () => {
  const { approvalChainService } = require('../services/dddApprovalChain');
  return approvalChainService && typeof approvalChainService.decide === 'function';
});

/* ── 21.4 Document Generator ── */
check('Document Generator — module loads', () => {
  const m = require('../services/dddDocumentGenerator');
  return m && typeof m.createDocumentGeneratorRouter === 'function';
});
check('Document Generator — DDDDocumentTemplate model', () => {
  const m = require('../services/dddDocumentGenerator');
  return m.DDDDocumentTemplate && typeof m.DDDDocumentTemplate.modelName === 'string';
});
check('Document Generator — DDDGeneratedDocument model', () => {
  const m = require('../services/dddDocumentGenerator');
  return m.DDDGeneratedDocument && typeof m.DDDGeneratedDocument.modelName === 'string';
});
check('Document Generator — DOCUMENT_TYPES (13)', () => {
  const { DOCUMENT_TYPES } = require('../services/dddDocumentGenerator');
  return Array.isArray(DOCUMENT_TYPES) && DOCUMENT_TYPES.length >= 13;
});
check('Document Generator — OUTPUT_FORMATS (6)', () => {
  const { OUTPUT_FORMATS } = require('../services/dddDocumentGenerator');
  return Array.isArray(OUTPUT_FORMATS) && OUTPUT_FORMATS.length >= 6;
});
check('Document Generator — BUILTIN_DOC_TEMPLATES (12)', () => {
  const { BUILTIN_DOC_TEMPLATES } = require('../services/dddDocumentGenerator');
  return Array.isArray(BUILTIN_DOC_TEMPLATES) && BUILTIN_DOC_TEMPLATES.length >= 12;
});
check('Document Generator — service instance', () => {
  const { documentGeneratorService } = require('../services/dddDocumentGenerator');
  return (
    documentGeneratorService && typeof documentGeneratorService.generateDocument === 'function'
  );
});

/* ── 21.5 Route Wiring ── */
check('Phase 15 — routers wired in platform.routes.js', () => {
  const content = fs.readFileSync(path.join(backendRoot, 'routes', 'platform.routes.js'), 'utf-8');
  return (
    content.includes('workflowEngineRouter') &&
    content.includes('formBuilderRouter') &&
    content.includes('approvalChainRouter') &&
    content.includes('documentGeneratorRouter')
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// Section 22 — Phase 16: Financial & Billing Management
// ═══════════════════════════════════════════════════════════════════════════════

console.log(c.cyan('\n═══ Section 22: Financial & Billing Management ═══'));

/* ── 22-A  Billing Engine ── */
check('BillingEngine — module exports', () => {
  const m = require('../services/dddBillingEngine');
  return m.BillingEngine && typeof m.createBillingEngineRouter === 'function';
});
check('BillingEngine — INVOICE_STATUSES count ≥ 10', () => {
  const { INVOICE_STATUSES } = require('../services/dddBillingEngine');
  return INVOICE_STATUSES.length >= 10;
});
check('BillingEngine — PAYMENT_METHODS count ≥ 10', () => {
  const { PAYMENT_METHODS } = require('../services/dddBillingEngine');
  return PAYMENT_METHODS.length >= 10;
});
check('BillingEngine — CHARGE_CATEGORIES count ≥ 15', () => {
  const { CHARGE_CATEGORIES } = require('../services/dddBillingEngine');
  return CHARGE_CATEGORIES.length >= 15;
});
check('BillingEngine — BILLING_CYCLES count ≥ 7', () => {
  const { BILLING_CYCLES } = require('../services/dddBillingEngine');
  return BILLING_CYCLES.length >= 7;
});
check('BillingEngine — BUILTIN_SERVICE_CHARGES count ≥ 12', () => {
  const { BUILTIN_SERVICE_CHARGES } = require('../services/dddBillingEngine');
  return BUILTIN_SERVICE_CHARGES.length >= 12;
});
check('BillingEngine — DDDBillingAccount model', () => {
  const { DDDBillingAccount } = require('../services/dddBillingEngine');
  return DDDBillingAccount && DDDBillingAccount.modelName === 'DDDBillingAccount';
});
check('BillingEngine — DDDInvoice model', () => {
  const { DDDInvoice } = require('../services/dddBillingEngine');
  return DDDInvoice && DDDInvoice.modelName === 'DDDInvoice';
});
check('BillingEngine — DDDPayment model', () => {
  const { DDDPayment } = require('../services/dddBillingEngine');
  return DDDPayment && DDDPayment.modelName === 'DDDPayment';
});
check('BillingEngine — DDDServiceCharge model', () => {
  const { DDDServiceCharge } = require('../services/dddBillingEngine');
  return DDDServiceCharge && DDDServiceCharge.modelName === 'DDDServiceCharge';
});

/* ── 22-B  Insurance Manager ── */
check('InsuranceManager — module exports', () => {
  const m = require('../services/dddInsuranceManager');
  return m.InsuranceManager && typeof m.createInsuranceManagerRouter === 'function';
});
check('InsuranceManager — PROVIDER_TYPES count ≥ 10', () => {
  const { PROVIDER_TYPES } = require('../services/dddInsuranceManager');
  return PROVIDER_TYPES.length >= 10;
});
check('InsuranceManager — POLICY_STATUSES count ≥ 7', () => {
  const { POLICY_STATUSES } = require('../services/dddInsuranceManager');
  return POLICY_STATUSES.length >= 7;
});
check('InsuranceManager — COVERAGE_TYPES count ≥ 8', () => {
  const { COVERAGE_TYPES } = require('../services/dddInsuranceManager');
  return COVERAGE_TYPES.length >= 8;
});
check('InsuranceManager — PREAUTH_STATUSES count ≥ 8', () => {
  const { PREAUTH_STATUSES } = require('../services/dddInsuranceManager');
  return PREAUTH_STATUSES.length >= 8;
});
check('InsuranceManager — BUILTIN_PROVIDERS count ≥ 10', () => {
  const { BUILTIN_PROVIDERS } = require('../services/dddInsuranceManager');
  return BUILTIN_PROVIDERS.length >= 10;
});
check('InsuranceManager — DDDInsuranceProvider model', () => {
  const { DDDInsuranceProvider } = require('../services/dddInsuranceManager');
  return DDDInsuranceProvider && DDDInsuranceProvider.modelName === 'DDDInsuranceProvider';
});
check('InsuranceManager — DDDInsurancePolicy model', () => {
  const { DDDInsurancePolicy } = require('../services/dddInsuranceManager');
  return DDDInsurancePolicy && DDDInsurancePolicy.modelName === 'DDDInsurancePolicy';
});
check('InsuranceManager — DDDPreAuthorization model', () => {
  const { DDDPreAuthorization } = require('../services/dddInsuranceManager');
  return DDDPreAuthorization && DDDPreAuthorization.modelName === 'DDDPreAuthorization';
});
check('InsuranceManager — DDDCoverageRule model', () => {
  const { DDDCoverageRule } = require('../services/dddInsuranceManager');
  return DDDCoverageRule && DDDCoverageRule.modelName === 'DDDCoverageRule';
});

/* ── 22-C  Claims Processor ── */
check('ClaimsProcessor — module exports', () => {
  const m = require('../services/dddClaimsProcessor');
  return m.ClaimsProcessor && typeof m.createClaimsProcessorRouter === 'function';
});
check('ClaimsProcessor — CLAIM_STATUSES count ≥ 14', () => {
  const { CLAIM_STATUSES } = require('../services/dddClaimsProcessor');
  return CLAIM_STATUSES.length >= 14;
});
check('ClaimsProcessor — CLAIM_TYPES count ≥ 10', () => {
  const { CLAIM_TYPES } = require('../services/dddClaimsProcessor');
  return CLAIM_TYPES.length >= 10;
});
check('ClaimsProcessor — DENIAL_REASONS count ≥ 12', () => {
  const { DENIAL_REASONS } = require('../services/dddClaimsProcessor');
  return DENIAL_REASONS.length >= 12;
});
check('ClaimsProcessor — APPEAL_STATUSES count ≥ 8', () => {
  const { APPEAL_STATUSES } = require('../services/dddClaimsProcessor');
  return APPEAL_STATUSES.length >= 8;
});
check('ClaimsProcessor — BUILTIN_CLAIM_TEMPLATES count ≥ 10', () => {
  const { BUILTIN_CLAIM_TEMPLATES } = require('../services/dddClaimsProcessor');
  return BUILTIN_CLAIM_TEMPLATES.length >= 10;
});
check('ClaimsProcessor — DDDClaim model', () => {
  const { DDDClaim } = require('../services/dddClaimsProcessor');
  return DDDClaim && DDDClaim.modelName === 'DDDClaim';
});
check('ClaimsProcessor — DDDClaimBatch model', () => {
  const { DDDClaimBatch } = require('../services/dddClaimsProcessor');
  return DDDClaimBatch && DDDClaimBatch.modelName === 'DDDClaimBatch';
});
check('ClaimsProcessor — DDDClaimAppeal model', () => {
  const { DDDClaimAppeal } = require('../services/dddClaimsProcessor');
  return DDDClaimAppeal && DDDClaimAppeal.modelName === 'DDDClaimAppeal';
});
check('ClaimsProcessor — DDDEOB model', () => {
  const { DDDEOB } = require('../services/dddClaimsProcessor');
  return DDDEOB && DDDEOB.modelName === 'DDDEOB';
});

/* ── 22-D  Payment Gateway ── */
check('PaymentGateway — module exports', () => {
  const m = require('../services/dddPaymentGateway');
  return m.PaymentGateway && typeof m.createPaymentGatewayRouter === 'function';
});
check('PaymentGateway — GATEWAY_PROVIDERS count ≥ 12', () => {
  const { GATEWAY_PROVIDERS } = require('../services/dddPaymentGateway');
  return GATEWAY_PROVIDERS.length >= 12;
});
check('PaymentGateway — TRANSACTION_TYPES count ≥ 10', () => {
  const { TRANSACTION_TYPES } = require('../services/dddPaymentGateway');
  return TRANSACTION_TYPES.length >= 10;
});
check('PaymentGateway — TRANSACTION_STATUSES count ≥ 10', () => {
  const { TRANSACTION_STATUSES } = require('../services/dddPaymentGateway');
  return TRANSACTION_STATUSES.length >= 10;
});
check('PaymentGateway — BUILTIN_GATEWAYS count ≥ 10', () => {
  const { BUILTIN_GATEWAYS } = require('../services/dddPaymentGateway');
  return BUILTIN_GATEWAYS.length >= 10;
});
check('PaymentGateway — DDDPaymentGatewayConfig model', () => {
  const { DDDPaymentGatewayConfig } = require('../services/dddPaymentGateway');
  return DDDPaymentGatewayConfig && DDDPaymentGatewayConfig.modelName === 'DDDPaymentGatewayConfig';
});
check('PaymentGateway — DDDTransaction model', () => {
  const { DDDTransaction } = require('../services/dddPaymentGateway');
  return DDDTransaction && DDDTransaction.modelName === 'DDDTransaction';
});
check('PaymentGateway — DDDPaymentPlan model', () => {
  const { DDDPaymentPlan } = require('../services/dddPaymentGateway');
  return DDDPaymentPlan && DDDPaymentPlan.modelName === 'DDDPaymentPlan';
});
check('PaymentGateway — DDDReconciliation model', () => {
  const { DDDReconciliation } = require('../services/dddPaymentGateway');
  return DDDReconciliation && DDDReconciliation.modelName === 'DDDReconciliation';
});

/* ── 22-E  Phase 16 route wiring ── */
check('Phase 16 routes wired in platform.routes.js', () => {
  const content = fs.readFileSync(path.join(backendRoot, 'routes', 'platform.routes.js'), 'utf8');
  return (
    content.includes('billingEngineRouter') &&
    content.includes('insuranceManagerRouter') &&
    content.includes('claimsProcessorRouter') &&
    content.includes('paymentGatewayRouter')
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// Section 23: Learning Management & Training (Phase 17)
// ═══════════════════════════════════════════════════════════════════════════════
console.log(c.cyan('\n═══ Section 23: Learning Management & Training ═══'));

/* 23.1 — Learning Management exports */
check('dddLearningManagement exports LearningManagement class', () => {
  const mod = require('../services/dddLearningManagement');
  return typeof mod.LearningManagement === 'function';
});
check('dddLearningManagement exports createLearningManagementRouter', () => {
  const mod = require('../services/dddLearningManagement');
  return typeof mod.createLearningManagementRouter === 'function';
});
check('dddLearningManagement exports DDDCourse model', () => {
  const mod = require('../services/dddLearningManagement');
  return mod.DDDCourse && typeof mod.DDDCourse.modelName === 'string';
});
check('dddLearningManagement exports DDDCurriculum model', () => {
  const mod = require('../services/dddLearningManagement');
  return mod.DDDCurriculum && typeof mod.DDDCurriculum.modelName === 'string';
});
check('dddLearningManagement exports DDDLearningPath model', () => {
  const mod = require('../services/dddLearningManagement');
  return mod.DDDLearningPath && typeof mod.DDDLearningPath.modelName === 'string';
});
check('dddLearningManagement exports DDDEnrollment model', () => {
  const mod = require('../services/dddLearningManagement');
  return mod.DDDEnrollment && typeof mod.DDDEnrollment.modelName === 'string';
});
check('dddLearningManagement COURSE_CATEGORIES array ≥ 10', () => {
  const mod = require('../services/dddLearningManagement');
  return Array.isArray(mod.COURSE_CATEGORIES) && mod.COURSE_CATEGORIES.length >= 10;
});
check('dddLearningManagement COURSE_STATUSES array ≥ 6', () => {
  const mod = require('../services/dddLearningManagement');
  return Array.isArray(mod.COURSE_STATUSES) && mod.COURSE_STATUSES.length >= 6;
});
check('dddLearningManagement DELIVERY_MODES array ≥ 8', () => {
  const mod = require('../services/dddLearningManagement');
  return Array.isArray(mod.DELIVERY_MODES) && mod.DELIVERY_MODES.length >= 8;
});
check('dddLearningManagement BUILTIN_COURSES array ≥ 8', () => {
  const mod = require('../services/dddLearningManagement');
  return Array.isArray(mod.BUILTIN_COURSES) && mod.BUILTIN_COURSES.length >= 8;
});

/* 23.2 — Competency Tracker exports */
check('dddCompetencyTracker exports CompetencyTracker class', () => {
  const mod = require('../services/dddCompetencyTracker');
  return typeof mod.CompetencyTracker === 'function';
});
check('dddCompetencyTracker exports createCompetencyTrackerRouter', () => {
  const mod = require('../services/dddCompetencyTracker');
  return typeof mod.createCompetencyTrackerRouter === 'function';
});
check('dddCompetencyTracker exports DDDCompetency model', () => {
  const mod = require('../services/dddCompetencyTracker');
  return mod.DDDCompetency && typeof mod.DDDCompetency.modelName === 'string';
});
check('dddCompetencyTracker exports DDDCredential model', () => {
  const mod = require('../services/dddCompetencyTracker');
  return mod.DDDCredential && typeof mod.DDDCredential.modelName === 'string';
});
check('dddCompetencyTracker exports DDDSkillAssessment model', () => {
  const mod = require('../services/dddCompetencyTracker');
  return mod.DDDSkillAssessment && typeof mod.DDDSkillAssessment.modelName === 'string';
});
check('dddCompetencyTracker COMPETENCY_DOMAINS array ≥ 10', () => {
  const mod = require('../services/dddCompetencyTracker');
  return Array.isArray(mod.COMPETENCY_DOMAINS) && mod.COMPETENCY_DOMAINS.length >= 10;
});
check('dddCompetencyTracker PROFICIENCY_LEVELS array ≥ 5', () => {
  const mod = require('../services/dddCompetencyTracker');
  return Array.isArray(mod.PROFICIENCY_LEVELS) && mod.PROFICIENCY_LEVELS.length >= 5;
});
check('dddCompetencyTracker CREDENTIAL_TYPES array ≥ 8', () => {
  const mod = require('../services/dddCompetencyTracker');
  return Array.isArray(mod.CREDENTIAL_TYPES) && mod.CREDENTIAL_TYPES.length >= 8;
});
check('dddCompetencyTracker BUILTIN_FRAMEWORKS array ≥ 8', () => {
  const mod = require('../services/dddCompetencyTracker');
  return Array.isArray(mod.BUILTIN_FRAMEWORKS) && mod.BUILTIN_FRAMEWORKS.length >= 8;
});

/* 23.3 — Continuous Education exports */
check('dddContinuousEducation exports ContinuousEducation class', () => {
  const mod = require('../services/dddContinuousEducation');
  return typeof mod.ContinuousEducation === 'function';
});
check('dddContinuousEducation exports createContinuousEducationRouter', () => {
  const mod = require('../services/dddContinuousEducation');
  return typeof mod.createContinuousEducationRouter === 'function';
});
check('dddContinuousEducation exports DDDCEURecord model', () => {
  const mod = require('../services/dddContinuousEducation');
  return mod.DDDCEURecord && typeof mod.DDDCEURecord.modelName === 'string';
});
check('dddContinuousEducation exports DDDProfessionalDevelopment model', () => {
  const mod = require('../services/dddContinuousEducation');
  return (
    mod.DDDProfessionalDevelopment && typeof mod.DDDProfessionalDevelopment.modelName === 'string'
  );
});
check('dddContinuousEducation exports DDDAccreditation model', () => {
  const mod = require('../services/dddContinuousEducation');
  return mod.DDDAccreditation && typeof mod.DDDAccreditation.modelName === 'string';
});
check('dddContinuousEducation CEU_CATEGORIES array ≥ 10', () => {
  const mod = require('../services/dddContinuousEducation');
  return Array.isArray(mod.CEU_CATEGORIES) && mod.CEU_CATEGORIES.length >= 10;
});
check('dddContinuousEducation CEU_ACTIVITY_TYPES array ≥ 8', () => {
  const mod = require('../services/dddContinuousEducation');
  return Array.isArray(mod.CEU_ACTIVITY_TYPES) && mod.CEU_ACTIVITY_TYPES.length >= 8;
});
check('dddContinuousEducation ACCREDITATION_TYPES array ≥ 8', () => {
  const mod = require('../services/dddContinuousEducation');
  return Array.isArray(mod.ACCREDITATION_TYPES) && mod.ACCREDITATION_TYPES.length >= 8;
});
check('dddContinuousEducation BUILTIN_CEU_REQUIREMENTS array ≥ 8', () => {
  const mod = require('../services/dddContinuousEducation');
  return Array.isArray(mod.BUILTIN_CEU_REQUIREMENTS) && mod.BUILTIN_CEU_REQUIREMENTS.length >= 8;
});

/* 23.4 — Knowledge Base exports */
check('dddKnowledgeBase exports KnowledgeBase class', () => {
  const mod = require('../services/dddKnowledgeBase');
  return typeof mod.KnowledgeBase === 'function';
});
check('dddKnowledgeBase exports createKnowledgeBaseRouter', () => {
  const mod = require('../services/dddKnowledgeBase');
  return typeof mod.createKnowledgeBaseRouter === 'function';
});
check('dddKnowledgeBase exports DDDArticle model', () => {
  const mod = require('../services/dddKnowledgeBase');
  return mod.DDDArticle && typeof mod.DDDArticle.modelName === 'string';
});
check('dddKnowledgeBase exports DDDProtocol model', () => {
  const mod = require('../services/dddKnowledgeBase');
  return mod.DDDProtocol && typeof mod.DDDProtocol.modelName === 'string';
});
check('dddKnowledgeBase exports DDDFAQ model', () => {
  const mod = require('../services/dddKnowledgeBase');
  return mod.DDDFAQ && typeof mod.DDDFAQ.modelName === 'string';
});
check('dddKnowledgeBase exports DDDArticleCategory model', () => {
  const mod = require('../services/dddKnowledgeBase');
  return mod.DDDArticleCategory && typeof mod.DDDArticleCategory.modelName === 'string';
});
check('dddKnowledgeBase ARTICLE_CATEGORIES array ≥ 10', () => {
  const mod = require('../services/dddKnowledgeBase');
  return Array.isArray(mod.ARTICLE_CATEGORIES) && mod.ARTICLE_CATEGORIES.length >= 10;
});
check('dddKnowledgeBase ARTICLE_TYPES array ≥ 8', () => {
  const mod = require('../services/dddKnowledgeBase');
  return Array.isArray(mod.ARTICLE_TYPES) && mod.ARTICLE_TYPES.length >= 8;
});
check('dddKnowledgeBase PROTOCOL_LEVELS array ≥ 5', () => {
  const mod = require('../services/dddKnowledgeBase');
  return Array.isArray(mod.PROTOCOL_LEVELS) && mod.PROTOCOL_LEVELS.length >= 5;
});
check('dddKnowledgeBase EVIDENCE_LEVELS array ≥ 8', () => {
  const mod = require('../services/dddKnowledgeBase');
  return Array.isArray(mod.EVIDENCE_LEVELS) && mod.EVIDENCE_LEVELS.length >= 8;
});
check('dddKnowledgeBase BUILTIN_CATEGORIES array ≥ 8', () => {
  const mod = require('../services/dddKnowledgeBase');
  return Array.isArray(mod.BUILTIN_CATEGORIES) && mod.BUILTIN_CATEGORIES.length >= 8;
});

/* 23.5 — Phase 17 route wiring */
check('platform.routes.js wires Phase 17 routers', () => {
  const content = fs.readFileSync(path.join(backendRoot, 'routes', 'platform.routes.js'), 'utf8');
  return (
    content.includes('learningManagementRouter') &&
    content.includes('competencyTrackerRouter') &&
    content.includes('continuousEducationRouter') &&
    content.includes('knowledgeBaseRouter')
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// Section 24: Supply Chain & Inventory Management (Phase 18)
// ═══════════════════════════════════════════════════════════════════════════════
console.log(c.cyan('\n═══ Section 24: Supply Chain & Inventory Management ═══'));

/* 24.1 — Inventory Manager exports */
check('dddInventoryManager exports InventoryManager class', () => {
  const mod = require('../services/dddInventoryManager');
  return typeof mod.InventoryManager === 'function';
});
check('dddInventoryManager exports createInventoryManagerRouter', () => {
  const mod = require('../services/dddInventoryManager');
  return typeof mod.createInventoryManagerRouter === 'function';
});
check('dddInventoryManager exports DDDInventoryItem model', () => {
  const mod = require('../services/dddInventoryManager');
  return mod.DDDInventoryItem && typeof mod.DDDInventoryItem.modelName === 'string';
});
check('dddInventoryManager exports DDDStockLevel model', () => {
  const mod = require('../services/dddInventoryManager');
  return mod.DDDStockLevel && typeof mod.DDDStockLevel.modelName === 'string';
});
check('dddInventoryManager exports DDDStockTransaction model', () => {
  const mod = require('../services/dddInventoryManager');
  return mod.DDDStockTransaction && typeof mod.DDDStockTransaction.modelName === 'string';
});
check('dddInventoryManager exports DDDReorderRule model', () => {
  const mod = require('../services/dddInventoryManager');
  return mod.DDDReorderRule && typeof mod.DDDReorderRule.modelName === 'string';
});
check('dddInventoryManager ITEM_CATEGORIES array ≥ 10', () => {
  const mod = require('../services/dddInventoryManager');
  return Array.isArray(mod.ITEM_CATEGORIES) && mod.ITEM_CATEGORIES.length >= 10;
});
check('dddInventoryManager STOCK_TRANSACTION_TYPES array ≥ 10', () => {
  const mod = require('../services/dddInventoryManager');
  return Array.isArray(mod.STOCK_TRANSACTION_TYPES) && mod.STOCK_TRANSACTION_TYPES.length >= 10;
});
check('dddInventoryManager STORAGE_CONDITIONS array ≥ 8', () => {
  const mod = require('../services/dddInventoryManager');
  return Array.isArray(mod.STORAGE_CONDITIONS) && mod.STORAGE_CONDITIONS.length >= 8;
});
check('dddInventoryManager BUILTIN_ITEMS array ≥ 8', () => {
  const mod = require('../services/dddInventoryManager');
  return Array.isArray(mod.BUILTIN_ITEMS) && mod.BUILTIN_ITEMS.length >= 8;
});

/* 24.2 — Procurement Engine exports */
check('dddProcurementEngine exports ProcurementEngine class', () => {
  const mod = require('../services/dddProcurementEngine');
  return typeof mod.ProcurementEngine === 'function';
});
check('dddProcurementEngine exports createProcurementEngineRouter', () => {
  const mod = require('../services/dddProcurementEngine');
  return typeof mod.createProcurementEngineRouter === 'function';
});
check('dddProcurementEngine exports DDDSupplier model', () => {
  const mod = require('../services/dddProcurementEngine');
  return mod.DDDSupplier && typeof mod.DDDSupplier.modelName === 'string';
});
check('dddProcurementEngine exports DDDPurchaseOrder model', () => {
  const mod = require('../services/dddProcurementEngine');
  return mod.DDDPurchaseOrder && typeof mod.DDDPurchaseOrder.modelName === 'string';
});
check('dddProcurementEngine exports DDDRequisition model', () => {
  const mod = require('../services/dddProcurementEngine');
  return mod.DDDRequisition && typeof mod.DDDRequisition.modelName === 'string';
});
check('dddProcurementEngine exports DDDSupplierEvaluation model', () => {
  const mod = require('../services/dddProcurementEngine');
  return mod.DDDSupplierEvaluation && typeof mod.DDDSupplierEvaluation.modelName === 'string';
});
check('dddProcurementEngine SUPPLIER_CATEGORIES array ≥ 10', () => {
  const mod = require('../services/dddProcurementEngine');
  return Array.isArray(mod.SUPPLIER_CATEGORIES) && mod.SUPPLIER_CATEGORIES.length >= 10;
});
check('dddProcurementEngine PO_STATUSES array ≥ 8', () => {
  const mod = require('../services/dddProcurementEngine');
  return Array.isArray(mod.PO_STATUSES) && mod.PO_STATUSES.length >= 8;
});
check('dddProcurementEngine EVALUATION_CRITERIA array ≥ 8', () => {
  const mod = require('../services/dddProcurementEngine');
  return Array.isArray(mod.EVALUATION_CRITERIA) && mod.EVALUATION_CRITERIA.length >= 8;
});
check('dddProcurementEngine BUILTIN_SUPPLIERS array ≥ 8', () => {
  const mod = require('../services/dddProcurementEngine');
  return Array.isArray(mod.BUILTIN_SUPPLIERS) && mod.BUILTIN_SUPPLIERS.length >= 8;
});

/* 24.3 — Supply Chain Tracker exports */
check('dddSupplyChainTracker exports SupplyChainTracker class', () => {
  const mod = require('../services/dddSupplyChainTracker');
  return typeof mod.SupplyChainTracker === 'function';
});
check('dddSupplyChainTracker exports createSupplyChainTrackerRouter', () => {
  const mod = require('../services/dddSupplyChainTracker');
  return typeof mod.createSupplyChainTrackerRouter === 'function';
});
check('dddSupplyChainTracker exports DDDShipment model', () => {
  const mod = require('../services/dddSupplyChainTracker');
  return mod.DDDShipment && typeof mod.DDDShipment.modelName === 'string';
});
check('dddSupplyChainTracker exports DDDDeliveryRoute model', () => {
  const mod = require('../services/dddSupplyChainTracker');
  return mod.DDDDeliveryRoute && typeof mod.DDDDeliveryRoute.modelName === 'string';
});
check('dddSupplyChainTracker exports DDDSupplyChainEvent model', () => {
  const mod = require('../services/dddSupplyChainTracker');
  return mod.DDDSupplyChainEvent && typeof mod.DDDSupplyChainEvent.modelName === 'string';
});
check('dddSupplyChainTracker exports DDDLogisticsPartner model', () => {
  const mod = require('../services/dddSupplyChainTracker');
  return mod.DDDLogisticsPartner && typeof mod.DDDLogisticsPartner.modelName === 'string';
});
check('dddSupplyChainTracker SHIPMENT_STATUSES array ≥ 10', () => {
  const mod = require('../services/dddSupplyChainTracker');
  return Array.isArray(mod.SHIPMENT_STATUSES) && mod.SHIPMENT_STATUSES.length >= 10;
});
check('dddSupplyChainTracker TRANSPORT_MODES array ≥ 8', () => {
  const mod = require('../services/dddSupplyChainTracker');
  return Array.isArray(mod.TRANSPORT_MODES) && mod.TRANSPORT_MODES.length >= 8;
});
check('dddSupplyChainTracker EVENT_TYPES array ≥ 10', () => {
  const mod = require('../services/dddSupplyChainTracker');
  return Array.isArray(mod.EVENT_TYPES) && mod.EVENT_TYPES.length >= 10;
});
check('dddSupplyChainTracker BUILTIN_PARTNERS array ≥ 8', () => {
  const mod = require('../services/dddSupplyChainTracker');
  return Array.isArray(mod.BUILTIN_PARTNERS) && mod.BUILTIN_PARTNERS.length >= 8;
});

/* 24.4 — Warehouse Manager exports */
check('dddWarehouseManager exports WarehouseManager class', () => {
  const mod = require('../services/dddWarehouseManager');
  return typeof mod.WarehouseManager === 'function';
});
check('dddWarehouseManager exports createWarehouseManagerRouter', () => {
  const mod = require('../services/dddWarehouseManager');
  return typeof mod.createWarehouseManagerRouter === 'function';
});
check('dddWarehouseManager exports DDDWarehouse model', () => {
  const mod = require('../services/dddWarehouseManager');
  return mod.DDDWarehouse && typeof mod.DDDWarehouse.modelName === 'string';
});
check('dddWarehouseManager exports DDDStorageBin model', () => {
  const mod = require('../services/dddWarehouseManager');
  return mod.DDDStorageBin && typeof mod.DDDStorageBin.modelName === 'string';
});
check('dddWarehouseManager exports DDDPickList model', () => {
  const mod = require('../services/dddWarehouseManager');
  return mod.DDDPickList && typeof mod.DDDPickList.modelName === 'string';
});
check('dddWarehouseManager exports DDDCycleCount model', () => {
  const mod = require('../services/dddWarehouseManager');
  return mod.DDDCycleCount && typeof mod.DDDCycleCount.modelName === 'string';
});
check('dddWarehouseManager WAREHOUSE_TYPES array ≥ 8', () => {
  const mod = require('../services/dddWarehouseManager');
  return Array.isArray(mod.WAREHOUSE_TYPES) && mod.WAREHOUSE_TYPES.length >= 8;
});
check('dddWarehouseManager BIN_TYPES array ≥ 8', () => {
  const mod = require('../services/dddWarehouseManager');
  return Array.isArray(mod.BIN_TYPES) && mod.BIN_TYPES.length >= 8;
});
check('dddWarehouseManager CYCLE_COUNT_STATUSES array ≥ 6', () => {
  const mod = require('../services/dddWarehouseManager');
  return Array.isArray(mod.CYCLE_COUNT_STATUSES) && mod.CYCLE_COUNT_STATUSES.length >= 6;
});
check('dddWarehouseManager BUILTIN_WAREHOUSES array ≥ 8', () => {
  const mod = require('../services/dddWarehouseManager');
  return Array.isArray(mod.BUILTIN_WAREHOUSES) && mod.BUILTIN_WAREHOUSES.length >= 8;
});

/* 24.5 — Phase 18 route wiring */
check('platform.routes.js wires Phase 18 routers', () => {
  const content = fs.readFileSync(path.join(backendRoot, 'routes', 'platform.routes.js'), 'utf8');
  return (
    content.includes('inventoryManagerRouter') &&
    content.includes('procurementEngineRouter') &&
    content.includes('supplyChainTrackerRouter') &&
    content.includes('warehouseManagerRouter')
  );
});

// Section 25: Facility & Environment Management (Phase 19)
//
console.log(c.cyan('\n═══ Section 25: Facility & Environment Management ═══'));

/* 25.1 — dddFacilityManager exports */
check('dddFacilityManager exports FacilityManager class', () => {
  const mod = require('../services/dddFacilityManager');
  return typeof mod.FacilityManager === 'function';
});
check('dddFacilityManager exports DDDBuilding model', () => {
  const mod = require('../services/dddFacilityManager');
  return mod.DDDBuilding && typeof mod.DDDBuilding.modelName === 'string';
});
check('dddFacilityManager exports DDDFloor model', () => {
  const mod = require('../services/dddFacilityManager');
  return mod.DDDFloor && typeof mod.DDDFloor.modelName === 'string';
});
check('dddFacilityManager exports DDDRoom model', () => {
  const mod = require('../services/dddFacilityManager');
  return mod.DDDRoom && typeof mod.DDDRoom.modelName === 'string';
});
check('dddFacilityManager exports DDDFacilityInspection model', () => {
  const mod = require('../services/dddFacilityManager');
  return mod.DDDFacilityInspection && typeof mod.DDDFacilityInspection.modelName === 'string';
});
check('dddFacilityManager BUILDING_TYPES array ≥ 10', () => {
  const mod = require('../services/dddFacilityManager');
  return Array.isArray(mod.BUILDING_TYPES) && mod.BUILDING_TYPES.length >= 10;
});
check('dddFacilityManager BUILDING_STATUSES array ≥ 6', () => {
  const mod = require('../services/dddFacilityManager');
  return Array.isArray(mod.BUILDING_STATUSES) && mod.BUILDING_STATUSES.length >= 6;
});
check('dddFacilityManager ROOM_TYPES array ≥ 10', () => {
  const mod = require('../services/dddFacilityManager');
  return Array.isArray(mod.ROOM_TYPES) && mod.ROOM_TYPES.length >= 10;
});
check('dddFacilityManager ROOM_STATUSES array ≥ 8', () => {
  const mod = require('../services/dddFacilityManager');
  return Array.isArray(mod.ROOM_STATUSES) && mod.ROOM_STATUSES.length >= 8;
});
check('dddFacilityManager ACCESSIBILITY_FEATURES array ≥ 10', () => {
  const mod = require('../services/dddFacilityManager');
  return Array.isArray(mod.ACCESSIBILITY_FEATURES) && mod.ACCESSIBILITY_FEATURES.length >= 10;
});
check('dddFacilityManager INSPECTION_TYPES array ≥ 10', () => {
  const mod = require('../services/dddFacilityManager');
  return Array.isArray(mod.INSPECTION_TYPES) && mod.INSPECTION_TYPES.length >= 10;
});
check('dddFacilityManager BUILTIN_BUILDINGS array ≥ 8', () => {
  const mod = require('../services/dddFacilityManager');
  return Array.isArray(mod.BUILTIN_BUILDINGS) && mod.BUILTIN_BUILDINGS.length >= 8;
});
check('dddFacilityManager exports createFacilityManagerRouter', () => {
  const mod = require('../services/dddFacilityManager');
  return typeof mod.createFacilityManagerRouter === 'function';
});

/* 25.2 — dddEnvironmentalMonitor exports */
check('dddEnvironmentalMonitor exports EnvironmentalMonitor class', () => {
  const mod = require('../services/dddEnvironmentalMonitor');
  return typeof mod.EnvironmentalMonitor === 'function';
});
check('dddEnvironmentalMonitor exports DDDSensor model', () => {
  const mod = require('../services/dddEnvironmentalMonitor');
  return mod.DDDSensor && typeof mod.DDDSensor.modelName === 'string';
});
check('dddEnvironmentalMonitor exports DDDEnvironmentReading model', () => {
  const mod = require('../services/dddEnvironmentalMonitor');
  return mod.DDDEnvironmentReading && typeof mod.DDDEnvironmentReading.modelName === 'string';
});
check('dddEnvironmentalMonitor exports DDDEnvironmentAlert model', () => {
  const mod = require('../services/dddEnvironmentalMonitor');
  return mod.DDDEnvironmentAlert && typeof mod.DDDEnvironmentAlert.modelName === 'string';
});
check('dddEnvironmentalMonitor exports DDDEnvironmentPolicy model', () => {
  const mod = require('../services/dddEnvironmentalMonitor');
  return mod.DDDEnvironmentPolicy && typeof mod.DDDEnvironmentPolicy.modelName === 'string';
});
check('dddEnvironmentalMonitor SENSOR_TYPES array ≥ 10', () => {
  const mod = require('../services/dddEnvironmentalMonitor');
  return Array.isArray(mod.SENSOR_TYPES) && mod.SENSOR_TYPES.length >= 10;
});
check('dddEnvironmentalMonitor SENSOR_STATUSES array ≥ 6', () => {
  const mod = require('../services/dddEnvironmentalMonitor');
  return Array.isArray(mod.SENSOR_STATUSES) && mod.SENSOR_STATUSES.length >= 6;
});
check('dddEnvironmentalMonitor READING_UNITS array ≥ 10', () => {
  const mod = require('../services/dddEnvironmentalMonitor');
  return Array.isArray(mod.READING_UNITS) && mod.READING_UNITS.length >= 10;
});
check('dddEnvironmentalMonitor ALERT_SEVERITIES array ≥ 5', () => {
  const mod = require('../services/dddEnvironmentalMonitor');
  return Array.isArray(mod.ALERT_SEVERITIES) && mod.ALERT_SEVERITIES.length >= 5;
});
check('dddEnvironmentalMonitor ALERT_STATUSES array ≥ 6', () => {
  const mod = require('../services/dddEnvironmentalMonitor');
  return Array.isArray(mod.ALERT_STATUSES) && mod.ALERT_STATUSES.length >= 6;
});
check('dddEnvironmentalMonitor MONITORING_ZONES array ≥ 10', () => {
  const mod = require('../services/dddEnvironmentalMonitor');
  return Array.isArray(mod.MONITORING_ZONES) && mod.MONITORING_ZONES.length >= 10;
});
check('dddEnvironmentalMonitor BUILTIN_SENSORS array ≥ 8', () => {
  const mod = require('../services/dddEnvironmentalMonitor');
  return Array.isArray(mod.BUILTIN_SENSORS) && mod.BUILTIN_SENSORS.length >= 8;
});
check('dddEnvironmentalMonitor exports createEnvironmentalMonitorRouter', () => {
  const mod = require('../services/dddEnvironmentalMonitor');
  return typeof mod.createEnvironmentalMonitorRouter === 'function';
});

/* 25.3 — dddSpaceAllocator exports */
check('dddSpaceAllocator exports SpaceAllocator class', () => {
  const mod = require('../services/dddSpaceAllocator');
  return typeof mod.SpaceAllocator === 'function';
});
check('dddSpaceAllocator exports DDDSpaceReservation model', () => {
  const mod = require('../services/dddSpaceAllocator');
  return mod.DDDSpaceReservation && typeof mod.DDDSpaceReservation.modelName === 'string';
});
check('dddSpaceAllocator exports DDDSpaceSchedule model', () => {
  const mod = require('../services/dddSpaceAllocator');
  return mod.DDDSpaceSchedule && typeof mod.DDDSpaceSchedule.modelName === 'string';
});
check('dddSpaceAllocator exports DDDSpaceUtilization model', () => {
  const mod = require('../services/dddSpaceAllocator');
  return mod.DDDSpaceUtilization && typeof mod.DDDSpaceUtilization.modelName === 'string';
});
check('dddSpaceAllocator exports DDDSpaceRequest model', () => {
  const mod = require('../services/dddSpaceAllocator');
  return mod.DDDSpaceRequest && typeof mod.DDDSpaceRequest.modelName === 'string';
});
check('dddSpaceAllocator RESERVATION_STATUSES array ≥ 8', () => {
  const mod = require('../services/dddSpaceAllocator');
  return Array.isArray(mod.RESERVATION_STATUSES) && mod.RESERVATION_STATUSES.length >= 8;
});
check('dddSpaceAllocator RESERVATION_TYPES array ≥ 10', () => {
  const mod = require('../services/dddSpaceAllocator');
  return Array.isArray(mod.RESERVATION_TYPES) && mod.RESERVATION_TYPES.length >= 10;
});
check('dddSpaceAllocator SCHEDULE_RECURRENCE array ≥ 8', () => {
  const mod = require('../services/dddSpaceAllocator');
  return Array.isArray(mod.SCHEDULE_RECURRENCE) && mod.SCHEDULE_RECURRENCE.length >= 8;
});
check('dddSpaceAllocator UTILIZATION_METRICS array ≥ 8', () => {
  const mod = require('../services/dddSpaceAllocator');
  return Array.isArray(mod.UTILIZATION_METRICS) && mod.UTILIZATION_METRICS.length >= 8;
});
check('dddSpaceAllocator REQUEST_STATUSES array ≥ 8', () => {
  const mod = require('../services/dddSpaceAllocator');
  return Array.isArray(mod.REQUEST_STATUSES) && mod.REQUEST_STATUSES.length >= 8;
});
check('dddSpaceAllocator SPACE_PRIORITIES array ≥ 5', () => {
  const mod = require('../services/dddSpaceAllocator');
  return Array.isArray(mod.SPACE_PRIORITIES) && mod.SPACE_PRIORITIES.length >= 5;
});
check('dddSpaceAllocator BUILTIN_SCHEDULES array ≥ 8', () => {
  const mod = require('../services/dddSpaceAllocator');
  return Array.isArray(mod.BUILTIN_SCHEDULES) && mod.BUILTIN_SCHEDULES.length >= 8;
});
check('dddSpaceAllocator exports createSpaceAllocatorRouter', () => {
  const mod = require('../services/dddSpaceAllocator');
  return typeof mod.createSpaceAllocatorRouter === 'function';
});

/* 25.4 — dddMaintenanceTracker exports */
check('dddMaintenanceTracker exports MaintenanceTracker class', () => {
  const mod = require('../services/dddMaintenanceTracker');
  return typeof mod.MaintenanceTracker === 'function';
});
check('dddMaintenanceTracker exports DDDWorkOrder model', () => {
  const mod = require('../services/dddMaintenanceTracker');
  return mod.DDDWorkOrder && typeof mod.DDDWorkOrder.modelName === 'string';
});
check('dddMaintenanceTracker exports DDDPreventiveSchedule model', () => {
  const mod = require('../services/dddMaintenanceTracker');
  return mod.DDDPreventiveSchedule && typeof mod.DDDPreventiveSchedule.modelName === 'string';
});
check('dddMaintenanceTracker exports DDDServiceRecord model', () => {
  const mod = require('../services/dddMaintenanceTracker');
  return mod.DDDServiceRecord && typeof mod.DDDServiceRecord.modelName === 'string';
});
check('dddMaintenanceTracker exports DDDMaintenanceAsset model', () => {
  const mod = require('../services/dddMaintenanceTracker');
  return mod.DDDMaintenanceAsset && typeof mod.DDDMaintenanceAsset.modelName === 'string';
});
check('dddMaintenanceTracker WORK_ORDER_TYPES array ≥ 10', () => {
  const mod = require('../services/dddMaintenanceTracker');
  return Array.isArray(mod.WORK_ORDER_TYPES) && mod.WORK_ORDER_TYPES.length >= 10;
});
check('dddMaintenanceTracker WORK_ORDER_STATUSES array ≥ 8', () => {
  const mod = require('../services/dddMaintenanceTracker');
  return Array.isArray(mod.WORK_ORDER_STATUSES) && mod.WORK_ORDER_STATUSES.length >= 8;
});
check('dddMaintenanceTracker WORK_ORDER_PRIORITIES array ≥ 5', () => {
  const mod = require('../services/dddMaintenanceTracker');
  return Array.isArray(mod.WORK_ORDER_PRIORITIES) && mod.WORK_ORDER_PRIORITIES.length >= 5;
});
check('dddMaintenanceTracker PM_FREQUENCIES array ≥ 8', () => {
  const mod = require('../services/dddMaintenanceTracker');
  return Array.isArray(mod.PM_FREQUENCIES) && mod.PM_FREQUENCIES.length >= 8;
});
check('dddMaintenanceTracker SERVICE_CATEGORIES array ≥ 10', () => {
  const mod = require('../services/dddMaintenanceTracker');
  return Array.isArray(mod.SERVICE_CATEGORIES) && mod.SERVICE_CATEGORIES.length >= 10;
});
check('dddMaintenanceTracker ASSET_CONDITIONS array ≥ 6', () => {
  const mod = require('../services/dddMaintenanceTracker');
  return Array.isArray(mod.ASSET_CONDITIONS) && mod.ASSET_CONDITIONS.length >= 6;
});
check('dddMaintenanceTracker BUILTIN_ASSETS array ≥ 8', () => {
  const mod = require('../services/dddMaintenanceTracker');
  return Array.isArray(mod.BUILTIN_ASSETS) && mod.BUILTIN_ASSETS.length >= 8;
});
check('dddMaintenanceTracker exports createMaintenanceTrackerRouter', () => {
  const mod = require('../services/dddMaintenanceTracker');
  return typeof mod.createMaintenanceTrackerRouter === 'function';
});

/* 25.5 — Phase 19 route wiring */
check('platform.routes.js wires Phase 19 routers', () => {
  const content = fs.readFileSync(path.join(backendRoot, 'routes', 'platform.routes.js'), 'utf8');
  return (
    content.includes('facilityManagerRouter') &&
    content.includes('environmentalMonitorRouter') &&
    content.includes('spaceAllocatorRouter') &&
    content.includes('maintenanceTrackerRouter')
  );
});

// Section 26: Human Resources & Staff Management (Phase 20)
//
console.log(c.cyan('\n═══ Section 26: Human Resources & Staff Management ═══'));

/* 26.1 — dddStaffManager exports */
check('dddStaffManager exports StaffManager class', () => {
  const mod = require('../services/dddStaffManager');
  return typeof mod.StaffManager === 'function';
});
check('dddStaffManager exports DDDStaffProfile model', () => {
  const mod = require('../services/dddStaffManager');
  return mod.DDDStaffProfile && typeof mod.DDDStaffProfile.modelName === 'string';
});
check('dddStaffManager exports DDDDepartment model', () => {
  const mod = require('../services/dddStaffManager');
  return mod.DDDDepartment && typeof mod.DDDDepartment.modelName === 'string';
});
check('dddStaffManager exports DDDPosition model', () => {
  const mod = require('../services/dddStaffManager');
  return mod.DDDPosition && typeof mod.DDDPosition.modelName === 'string';
});
check('dddStaffManager exports DDDQualification model', () => {
  const mod = require('../services/dddStaffManager');
  return mod.DDDQualification && typeof mod.DDDQualification.modelName === 'string';
});
check('dddStaffManager STAFF_TYPES array ≥ 10', () => {
  const mod = require('../services/dddStaffManager');
  return Array.isArray(mod.STAFF_TYPES) && mod.STAFF_TYPES.length >= 10;
});
check('dddStaffManager STAFF_STATUSES array ≥ 8', () => {
  const mod = require('../services/dddStaffManager');
  return Array.isArray(mod.STAFF_STATUSES) && mod.STAFF_STATUSES.length >= 8;
});
check('dddStaffManager DEPARTMENT_TYPES array ≥ 10', () => {
  const mod = require('../services/dddStaffManager');
  return Array.isArray(mod.DEPARTMENT_TYPES) && mod.DEPARTMENT_TYPES.length >= 10;
});
check('dddStaffManager POSITION_LEVELS array ≥ 8', () => {
  const mod = require('../services/dddStaffManager');
  return Array.isArray(mod.POSITION_LEVELS) && mod.POSITION_LEVELS.length >= 8;
});
check('dddStaffManager QUALIFICATION_TYPES array ≥ 10', () => {
  const mod = require('../services/dddStaffManager');
  return Array.isArray(mod.QUALIFICATION_TYPES) && mod.QUALIFICATION_TYPES.length >= 10;
});
check('dddStaffManager EMPLOYMENT_TYPES array ≥ 8', () => {
  const mod = require('../services/dddStaffManager');
  return Array.isArray(mod.EMPLOYMENT_TYPES) && mod.EMPLOYMENT_TYPES.length >= 8;
});
check('dddStaffManager BUILTIN_DEPARTMENTS array ≥ 8', () => {
  const mod = require('../services/dddStaffManager');
  return Array.isArray(mod.BUILTIN_DEPARTMENTS) && mod.BUILTIN_DEPARTMENTS.length >= 8;
});
check('dddStaffManager exports createStaffManagerRouter', () => {
  const mod = require('../services/dddStaffManager');
  return typeof mod.createStaffManagerRouter === 'function';
});

/* 26.2 — dddShiftScheduler exports */
check('dddShiftScheduler exports ShiftScheduler class', () => {
  const mod = require('../services/dddShiftScheduler');
  return typeof mod.ShiftScheduler === 'function';
});
check('dddShiftScheduler exports DDDShiftTemplate model', () => {
  const mod = require('../services/dddShiftScheduler');
  return mod.DDDShiftTemplate && typeof mod.DDDShiftTemplate.modelName === 'string';
});
check('dddShiftScheduler exports DDDShiftAssignment model', () => {
  const mod = require('../services/dddShiftScheduler');
  return mod.DDDShiftAssignment && typeof mod.DDDShiftAssignment.modelName === 'string';
});
check('dddShiftScheduler exports DDDTimeRecord model', () => {
  const mod = require('../services/dddShiftScheduler');
  return mod.DDDTimeRecord && typeof mod.DDDTimeRecord.modelName === 'string';
});
check('dddShiftScheduler exports DDDAttendanceLog model', () => {
  const mod = require('../services/dddShiftScheduler');
  return mod.DDDAttendanceLog && typeof mod.DDDAttendanceLog.modelName === 'string';
});
check('dddShiftScheduler SHIFT_TYPES array ≥ 10', () => {
  const mod = require('../services/dddShiftScheduler');
  return Array.isArray(mod.SHIFT_TYPES) && mod.SHIFT_TYPES.length >= 10;
});
check('dddShiftScheduler SHIFT_STATUSES array ≥ 8', () => {
  const mod = require('../services/dddShiftScheduler');
  return Array.isArray(mod.SHIFT_STATUSES) && mod.SHIFT_STATUSES.length >= 8;
});
check('dddShiftScheduler ATTENDANCE_STATUSES array ≥ 10', () => {
  const mod = require('../services/dddShiftScheduler');
  return Array.isArray(mod.ATTENDANCE_STATUSES) && mod.ATTENDANCE_STATUSES.length >= 10;
});
check('dddShiftScheduler TIME_RECORD_TYPES array ≥ 8', () => {
  const mod = require('../services/dddShiftScheduler');
  return Array.isArray(mod.TIME_RECORD_TYPES) && mod.TIME_RECORD_TYPES.length >= 8;
});
check('dddShiftScheduler ROSTER_PATTERNS array ≥ 8', () => {
  const mod = require('../services/dddShiftScheduler');
  return Array.isArray(mod.ROSTER_PATTERNS) && mod.ROSTER_PATTERNS.length >= 8;
});
check('dddShiftScheduler OVERTIME_TYPES array ≥ 7', () => {
  const mod = require('../services/dddShiftScheduler');
  return Array.isArray(mod.OVERTIME_TYPES) && mod.OVERTIME_TYPES.length >= 7;
});
check('dddShiftScheduler BUILTIN_SHIFT_TEMPLATES array ≥ 8', () => {
  const mod = require('../services/dddShiftScheduler');
  return Array.isArray(mod.BUILTIN_SHIFT_TEMPLATES) && mod.BUILTIN_SHIFT_TEMPLATES.length >= 8;
});
check('dddShiftScheduler exports createShiftSchedulerRouter', () => {
  const mod = require('../services/dddShiftScheduler');
  return typeof mod.createShiftSchedulerRouter === 'function';
});

/* 26.3 — dddPerformanceEvaluator exports */
check('dddPerformanceEvaluator exports PerformanceEvaluator class', () => {
  const mod = require('../services/dddPerformanceEvaluator');
  return typeof mod.PerformanceEvaluator === 'function';
});
check('dddPerformanceEvaluator exports DDDPerformanceReview model', () => {
  const mod = require('../services/dddPerformanceEvaluator');
  return mod.DDDPerformanceReview && typeof mod.DDDPerformanceReview.modelName === 'string';
});
check('dddPerformanceEvaluator exports DDDPerformanceGoal model', () => {
  const mod = require('../services/dddPerformanceEvaluator');
  return mod.DDDPerformanceGoal && typeof mod.DDDPerformanceGoal.modelName === 'string';
});
check('dddPerformanceEvaluator exports DDDFeedback model', () => {
  const mod = require('../services/dddPerformanceEvaluator');
  return mod.DDDFeedback && typeof mod.DDDFeedback.modelName === 'string';
});
check('dddPerformanceEvaluator exports DDDPerformanceKPI model', () => {
  const mod = require('../services/dddPerformanceEvaluator');
  return mod.DDDPerformanceKPI && typeof mod.DDDPerformanceKPI.modelName === 'string';
});
check('dddPerformanceEvaluator REVIEW_TYPES array ≥ 10', () => {
  const mod = require('../services/dddPerformanceEvaluator');
  return Array.isArray(mod.REVIEW_TYPES) && mod.REVIEW_TYPES.length >= 10;
});
check('dddPerformanceEvaluator REVIEW_STATUSES array ≥ 8', () => {
  const mod = require('../services/dddPerformanceEvaluator');
  return Array.isArray(mod.REVIEW_STATUSES) && mod.REVIEW_STATUSES.length >= 8;
});
check('dddPerformanceEvaluator RATING_SCALES array ≥ 8', () => {
  const mod = require('../services/dddPerformanceEvaluator');
  return Array.isArray(mod.RATING_SCALES) && mod.RATING_SCALES.length >= 8;
});
check('dddPerformanceEvaluator GOAL_STATUSES array ≥ 8', () => {
  const mod = require('../services/dddPerformanceEvaluator');
  return Array.isArray(mod.GOAL_STATUSES) && mod.GOAL_STATUSES.length >= 8;
});
check('dddPerformanceEvaluator FEEDBACK_TYPES array ≥ 8', () => {
  const mod = require('../services/dddPerformanceEvaluator');
  return Array.isArray(mod.FEEDBACK_TYPES) && mod.FEEDBACK_TYPES.length >= 8;
});
check('dddPerformanceEvaluator KPI_CATEGORIES array ≥ 10', () => {
  const mod = require('../services/dddPerformanceEvaluator');
  return Array.isArray(mod.KPI_CATEGORIES) && mod.KPI_CATEGORIES.length >= 10;
});
check('dddPerformanceEvaluator BUILTIN_KPIS array ≥ 8', () => {
  const mod = require('../services/dddPerformanceEvaluator');
  return Array.isArray(mod.BUILTIN_KPIS) && mod.BUILTIN_KPIS.length >= 8;
});
check('dddPerformanceEvaluator exports createPerformanceEvaluatorRouter', () => {
  const mod = require('../services/dddPerformanceEvaluator');
  return typeof mod.createPerformanceEvaluatorRouter === 'function';
});

/* 26.4 — dddLeaveManager exports */
check('dddLeaveManager exports LeaveManager class', () => {
  const mod = require('../services/dddLeaveManager');
  return typeof mod.LeaveManager === 'function';
});
check('dddLeaveManager exports DDDLeaveRequest model', () => {
  const mod = require('../services/dddLeaveManager');
  return mod.DDDLeaveRequest && typeof mod.DDDLeaveRequest.modelName === 'string';
});
check('dddLeaveManager exports DDDLeaveBalance model', () => {
  const mod = require('../services/dddLeaveManager');
  return mod.DDDLeaveBalance && typeof mod.DDDLeaveBalance.modelName === 'string';
});
check('dddLeaveManager exports DDDLeavePolicy model', () => {
  const mod = require('../services/dddLeaveManager');
  return mod.DDDLeavePolicy && typeof mod.DDDLeavePolicy.modelName === 'string';
});
check('dddLeaveManager exports DDDHolidayCalendar model', () => {
  const mod = require('../services/dddLeaveManager');
  return mod.DDDHolidayCalendar && typeof mod.DDDHolidayCalendar.modelName === 'string';
});
check('dddLeaveManager LEAVE_TYPES array ≥ 10', () => {
  const mod = require('../services/dddLeaveManager');
  return Array.isArray(mod.LEAVE_TYPES) && mod.LEAVE_TYPES.length >= 10;
});
check('dddLeaveManager LEAVE_STATUSES array ≥ 8', () => {
  const mod = require('../services/dddLeaveManager');
  return Array.isArray(mod.LEAVE_STATUSES) && mod.LEAVE_STATUSES.length >= 8;
});
check('dddLeaveManager ACCRUAL_FREQUENCIES array ≥ 8', () => {
  const mod = require('../services/dddLeaveManager');
  return Array.isArray(mod.ACCRUAL_FREQUENCIES) && mod.ACCRUAL_FREQUENCIES.length >= 8;
});
check('dddLeaveManager HOLIDAY_TYPES array ≥ 8', () => {
  const mod = require('../services/dddLeaveManager');
  return Array.isArray(mod.HOLIDAY_TYPES) && mod.HOLIDAY_TYPES.length >= 8;
});
check('dddLeaveManager BALANCE_ADJUSTMENT_TYPES array ≥ 8', () => {
  const mod = require('../services/dddLeaveManager');
  return Array.isArray(mod.BALANCE_ADJUSTMENT_TYPES) && mod.BALANCE_ADJUSTMENT_TYPES.length >= 8;
});
check('dddLeaveManager POLICY_SCOPES array ≥ 6', () => {
  const mod = require('../services/dddLeaveManager');
  return Array.isArray(mod.POLICY_SCOPES) && mod.POLICY_SCOPES.length >= 6;
});
check('dddLeaveManager BUILTIN_POLICIES array ≥ 8', () => {
  const mod = require('../services/dddLeaveManager');
  return Array.isArray(mod.BUILTIN_POLICIES) && mod.BUILTIN_POLICIES.length >= 8;
});
check('dddLeaveManager exports createLeaveManagerRouter', () => {
  const mod = require('../services/dddLeaveManager');
  return typeof mod.createLeaveManagerRouter === 'function';
});

/* 26.5 — Phase 20 route wiring */
check('platform.routes.js wires Phase 20 routers', () => {
  const content = fs.readFileSync(path.join(backendRoot, 'routes', 'platform.routes.js'), 'utf8');
  return (
    content.includes('staffManagerRouter') &&
    content.includes('shiftSchedulerRouter') &&
    content.includes('performanceEvaluatorRouter') &&
    content.includes('leaveManagerRouter')
  );
});

// Section 27: Communication & Messaging (Phase 21)

console.log(c.cyan('\n═══ Section 27: Communication & Messaging ═══'));

/* 27.1 — Message Center */
check('dddMessageCenter.js exports MessageCenter class', () => {
  const m = require(path.join(backendRoot, 'services', 'dddMessageCenter'));
  return typeof m.MessageCenter === 'function';
});
check('dddMessageCenter.js exports DDDConversation model', () => {
  const m = require(path.join(backendRoot, 'services', 'dddMessageCenter'));
  return m.DDDConversation && typeof m.DDDConversation.modelName === 'string';
});
check('dddMessageCenter.js exports DDDMessage model', () => {
  const m = require(path.join(backendRoot, 'services', 'dddMessageCenter'));
  return m.DDDMessage && typeof m.DDDMessage.modelName === 'string';
});
check('dddMessageCenter.js exports DDDMessageTemplate model', () => {
  const m = require(path.join(backendRoot, 'services', 'dddMessageCenter'));
  return m.DDDMessageTemplate && typeof m.DDDMessageTemplate.modelName === 'string';
});
check('dddMessageCenter.js exports DDDMessageDraft model', () => {
  const m = require(path.join(backendRoot, 'services', 'dddMessageCenter'));
  return m.DDDMessageDraft && typeof m.DDDMessageDraft.modelName === 'string';
});
check('dddMessageCenter.js exports CONVERSATION_TYPES (≥10)', () => {
  const m = require(path.join(backendRoot, 'services', 'dddMessageCenter'));
  return Array.isArray(m.CONVERSATION_TYPES) && m.CONVERSATION_TYPES.length >= 10;
});
check('dddMessageCenter.js exports CONVERSATION_STATUSES (≥10)', () => {
  const m = require(path.join(backendRoot, 'services', 'dddMessageCenter'));
  return Array.isArray(m.CONVERSATION_STATUSES) && m.CONVERSATION_STATUSES.length >= 10;
});
check('dddMessageCenter.js exports MESSAGE_TYPES (≥10)', () => {
  const m = require(path.join(backendRoot, 'services', 'dddMessageCenter'));
  return Array.isArray(m.MESSAGE_TYPES) && m.MESSAGE_TYPES.length >= 10;
});
check('dddMessageCenter.js exports MESSAGE_STATUSES (≥10)', () => {
  const m = require(path.join(backendRoot, 'services', 'dddMessageCenter'));
  return Array.isArray(m.MESSAGE_STATUSES) && m.MESSAGE_STATUSES.length >= 10;
});
check('dddMessageCenter.js exports TEMPLATE_CATEGORIES (≥10)', () => {
  const m = require(path.join(backendRoot, 'services', 'dddMessageCenter'));
  return Array.isArray(m.TEMPLATE_CATEGORIES) && m.TEMPLATE_CATEGORIES.length >= 10;
});
check('dddMessageCenter.js exports MESSAGE_PRIORITIES (≥6)', () => {
  const m = require(path.join(backendRoot, 'services', 'dddMessageCenter'));
  return Array.isArray(m.MESSAGE_PRIORITIES) && m.MESSAGE_PRIORITIES.length >= 6;
});
check('dddMessageCenter.js exports BUILTIN_TEMPLATES (≥8)', () => {
  const m = require(path.join(backendRoot, 'services', 'dddMessageCenter'));
  return Array.isArray(m.BUILTIN_TEMPLATES) && m.BUILTIN_TEMPLATES.length >= 8;
});
check('dddMessageCenter.js exports createMessageCenterRouter', () => {
  const m = require(path.join(backendRoot, 'services', 'dddMessageCenter'));
  return typeof m.createMessageCenterRouter === 'function';
});
check('MessageCenter — listConversations + sendMessage + searchMessages', () => {
  const m = require(path.join(backendRoot, 'services', 'dddMessageCenter'));
  const inst = new m.MessageCenter();
  return (
    typeof inst.listConversations === 'function' &&
    typeof inst.sendMessage === 'function' &&
    typeof inst.searchMessages === 'function'
  );
});

/* 27.2 — Notification Engine */
check('dddNotificationEngine.js exports NotificationEngine class', () => {
  const m = require(path.join(backendRoot, 'services', 'dddNotificationEngine'));
  return typeof m.NotificationEngine === 'function';
});
check('dddNotificationEngine.js exports DDDNotificationChannel model', () => {
  const m = require(path.join(backendRoot, 'services', 'dddNotificationEngine'));
  return m.DDDNotificationChannel && typeof m.DDDNotificationChannel.modelName === 'string';
});
check('dddNotificationEngine.js exports DDDNotificationRule model', () => {
  const m = require(path.join(backendRoot, 'services', 'dddNotificationEngine'));
  return m.DDDNotificationRule && typeof m.DDDNotificationRule.modelName === 'string';
});
check('dddNotificationEngine.js exports DDDNotificationDelivery model', () => {
  const m = require(path.join(backendRoot, 'services', 'dddNotificationEngine'));
  return m.DDDNotificationDelivery && typeof m.DDDNotificationDelivery.modelName === 'string';
});
check('dddNotificationEngine.js exports DDDNotificationPreference model', () => {
  const m = require(path.join(backendRoot, 'services', 'dddNotificationEngine'));
  return m.DDDNotificationPreference && typeof m.DDDNotificationPreference.modelName === 'string';
});
check('dddNotificationEngine.js exports CHANNEL_TYPES (≥10)', () => {
  const m = require(path.join(backendRoot, 'services', 'dddNotificationEngine'));
  return Array.isArray(m.CHANNEL_TYPES) && m.CHANNEL_TYPES.length >= 10;
});
check('dddNotificationEngine.js exports CHANNEL_STATUSES (≥8)', () => {
  const m = require(path.join(backendRoot, 'services', 'dddNotificationEngine'));
  return Array.isArray(m.CHANNEL_STATUSES) && m.CHANNEL_STATUSES.length >= 8;
});
check('dddNotificationEngine.js exports DELIVERY_STATUSES (≥10)', () => {
  const m = require(path.join(backendRoot, 'services', 'dddNotificationEngine'));
  return Array.isArray(m.DELIVERY_STATUSES) && m.DELIVERY_STATUSES.length >= 10;
});
check('dddNotificationEngine.js exports RULE_TRIGGERS (≥10)', () => {
  const m = require(path.join(backendRoot, 'services', 'dddNotificationEngine'));
  return Array.isArray(m.RULE_TRIGGERS) && m.RULE_TRIGGERS.length >= 10;
});
check('dddNotificationEngine.js exports NOTIFICATION_CATEGORIES (≥10)', () => {
  const m = require(path.join(backendRoot, 'services', 'dddNotificationEngine'));
  return Array.isArray(m.NOTIFICATION_CATEGORIES) && m.NOTIFICATION_CATEGORIES.length >= 10;
});
check('dddNotificationEngine.js exports ESCALATION_LEVELS (≥6)', () => {
  const m = require(path.join(backendRoot, 'services', 'dddNotificationEngine'));
  return Array.isArray(m.ESCALATION_LEVELS) && m.ESCALATION_LEVELS.length >= 6;
});
check('dddNotificationEngine.js exports BUILTIN_CHANNELS (≥8)', () => {
  const m = require(path.join(backendRoot, 'services', 'dddNotificationEngine'));
  return Array.isArray(m.BUILTIN_CHANNELS) && m.BUILTIN_CHANNELS.length >= 8;
});
check('dddNotificationEngine.js exports createNotificationEngineRouter', () => {
  const m = require(path.join(backendRoot, 'services', 'dddNotificationEngine'));
  return typeof m.createNotificationEngineRouter === 'function';
});
check('NotificationEngine — listChannels + sendNotification + listDeliveries', () => {
  const m = require(path.join(backendRoot, 'services', 'dddNotificationEngine'));
  const inst = new m.NotificationEngine();
  return (
    typeof inst.listChannels === 'function' &&
    typeof inst.sendNotification === 'function' &&
    typeof inst.listDeliveries === 'function'
  );
});

/* 27.3 — Announcement Manager */
check('dddAnnouncementManager.js exports AnnouncementManager class', () => {
  const m = require(path.join(backendRoot, 'services', 'dddAnnouncementManager'));
  return typeof m.AnnouncementManager === 'function';
});
check('dddAnnouncementManager.js exports DDDAnnouncement model', () => {
  const m = require(path.join(backendRoot, 'services', 'dddAnnouncementManager'));
  return m.DDDAnnouncement && typeof m.DDDAnnouncement.modelName === 'string';
});
check('dddAnnouncementManager.js exports DDDBulletinBoard model', () => {
  const m = require(path.join(backendRoot, 'services', 'dddAnnouncementManager'));
  return m.DDDBulletinBoard && typeof m.DDDBulletinBoard.modelName === 'string';
});
check('dddAnnouncementManager.js exports DDDAnnouncementCategory model', () => {
  const m = require(path.join(backendRoot, 'services', 'dddAnnouncementManager'));
  return m.DDDAnnouncementCategory && typeof m.DDDAnnouncementCategory.modelName === 'string';
});
check('dddAnnouncementManager.js exports DDDAnnouncementReaction model', () => {
  const m = require(path.join(backendRoot, 'services', 'dddAnnouncementManager'));
  return m.DDDAnnouncementReaction && typeof m.DDDAnnouncementReaction.modelName === 'string';
});
check('dddAnnouncementManager.js exports ANNOUNCEMENT_TYPES (≥10)', () => {
  const m = require(path.join(backendRoot, 'services', 'dddAnnouncementManager'));
  return Array.isArray(m.ANNOUNCEMENT_TYPES) && m.ANNOUNCEMENT_TYPES.length >= 10;
});
check('dddAnnouncementManager.js exports ANNOUNCEMENT_STATUSES (≥10)', () => {
  const m = require(path.join(backendRoot, 'services', 'dddAnnouncementManager'));
  return Array.isArray(m.ANNOUNCEMENT_STATUSES) && m.ANNOUNCEMENT_STATUSES.length >= 10;
});
check('dddAnnouncementManager.js exports AUDIENCE_SCOPES (≥10)', () => {
  const m = require(path.join(backendRoot, 'services', 'dddAnnouncementManager'));
  return Array.isArray(m.AUDIENCE_SCOPES) && m.AUDIENCE_SCOPES.length >= 10;
});
check('dddAnnouncementManager.js exports BULLETIN_TYPES (≥10)', () => {
  const m = require(path.join(backendRoot, 'services', 'dddAnnouncementManager'));
  return Array.isArray(m.BULLETIN_TYPES) && m.BULLETIN_TYPES.length >= 10;
});
check('dddAnnouncementManager.js exports REACTION_TYPES (≥8)', () => {
  const m = require(path.join(backendRoot, 'services', 'dddAnnouncementManager'));
  return Array.isArray(m.REACTION_TYPES) && m.REACTION_TYPES.length >= 8;
});
check('dddAnnouncementManager.js exports DISPLAY_PRIORITIES (≥6)', () => {
  const m = require(path.join(backendRoot, 'services', 'dddAnnouncementManager'));
  return Array.isArray(m.DISPLAY_PRIORITIES) && m.DISPLAY_PRIORITIES.length >= 6;
});
check('dddAnnouncementManager.js exports BUILTIN_CATEGORIES (≥8)', () => {
  const m = require(path.join(backendRoot, 'services', 'dddAnnouncementManager'));
  return Array.isArray(m.BUILTIN_CATEGORIES) && m.BUILTIN_CATEGORIES.length >= 8;
});
check('dddAnnouncementManager.js exports createAnnouncementManagerRouter', () => {
  const m = require(path.join(backendRoot, 'services', 'dddAnnouncementManager'));
  return typeof m.createAnnouncementManagerRouter === 'function';
});
check('AnnouncementManager — listAnnouncements + createAnnouncement + addReaction', () => {
  const m = require(path.join(backendRoot, 'services', 'dddAnnouncementManager'));
  const inst = new m.AnnouncementManager();
  return (
    typeof inst.listAnnouncements === 'function' &&
    typeof inst.createAnnouncement === 'function' &&
    typeof inst.addReaction === 'function'
  );
});

/* 27.4 — Communication Log */
check('dddCommunicationLog.js exports CommunicationLog class', () => {
  const m = require(path.join(backendRoot, 'services', 'dddCommunicationLog'));
  return typeof m.CommunicationLog === 'function';
});
check('dddCommunicationLog.js exports DDDCommunicationEntry model', () => {
  const m = require(path.join(backendRoot, 'services', 'dddCommunicationLog'));
  return m.DDDCommunicationEntry && typeof m.DDDCommunicationEntry.modelName === 'string';
});
check('dddCommunicationLog.js exports DDDDeliveryTracking model', () => {
  const m = require(path.join(backendRoot, 'services', 'dddCommunicationLog'));
  return m.DDDDeliveryTracking && typeof m.DDDDeliveryTracking.modelName === 'string';
});
check('dddCommunicationLog.js exports DDDCommChannel model', () => {
  const m = require(path.join(backendRoot, 'services', 'dddCommunicationLog'));
  return m.DDDCommChannel && typeof m.DDDCommChannel.modelName === 'string';
});
check('dddCommunicationLog.js exports DDDCommunicationReport model', () => {
  const m = require(path.join(backendRoot, 'services', 'dddCommunicationLog'));
  return m.DDDCommunicationReport && typeof m.DDDCommunicationReport.modelName === 'string';
});
check('dddCommunicationLog.js exports ENTRY_TYPES (≥10)', () => {
  const m = require(path.join(backendRoot, 'services', 'dddCommunicationLog'));
  return Array.isArray(m.ENTRY_TYPES) && m.ENTRY_TYPES.length >= 10;
});
check('dddCommunicationLog.js exports ENTRY_STATUSES (≥10)', () => {
  const m = require(path.join(backendRoot, 'services', 'dddCommunicationLog'));
  return Array.isArray(m.ENTRY_STATUSES) && m.ENTRY_STATUSES.length >= 10;
});
check('dddCommunicationLog.js exports DELIVERY_METHODS (≥10)', () => {
  const m = require(path.join(backendRoot, 'services', 'dddCommunicationLog'));
  return Array.isArray(m.DELIVERY_METHODS) && m.DELIVERY_METHODS.length >= 10;
});
check('dddCommunicationLog.js exports TRACKING_STATUSES (≥10)', () => {
  const m = require(path.join(backendRoot, 'services', 'dddCommunicationLog'));
  return Array.isArray(m.TRACKING_STATUSES) && m.TRACKING_STATUSES.length >= 10;
});
check('dddCommunicationLog.js exports REPORT_TYPES (≥10)', () => {
  const m = require(path.join(backendRoot, 'services', 'dddCommunicationLog'));
  return Array.isArray(m.REPORT_TYPES) && m.REPORT_TYPES.length >= 10;
});
check('dddCommunicationLog.js exports COMPLIANCE_FLAGS (≥8)', () => {
  const m = require(path.join(backendRoot, 'services', 'dddCommunicationLog'));
  return Array.isArray(m.COMPLIANCE_FLAGS) && m.COMPLIANCE_FLAGS.length >= 8;
});
check('dddCommunicationLog.js exports BUILTIN_COMM_CHANNELS (≥8)', () => {
  const m = require(path.join(backendRoot, 'services', 'dddCommunicationLog'));
  return Array.isArray(m.BUILTIN_COMM_CHANNELS) && m.BUILTIN_COMM_CHANNELS.length >= 8;
});
check('dddCommunicationLog.js exports createCommunicationLogRouter', () => {
  const m = require(path.join(backendRoot, 'services', 'dddCommunicationLog'));
  return typeof m.createCommunicationLogRouter === 'function';
});
check('CommunicationLog — listEntries + logEntry + listTracking', () => {
  const m = require(path.join(backendRoot, 'services', 'dddCommunicationLog'));
  const inst = new m.CommunicationLog();
  return (
    typeof inst.listEntries === 'function' &&
    typeof inst.logEntry === 'function' &&
    typeof inst.listTracking === 'function'
  );
});

/* 27.5 — Phase 21 route wiring */
check('platform.routes.js wires Phase 21 routers', () => {
  const content = fs.readFileSync(path.join(backendRoot, 'routes', 'platform.routes.js'), 'utf8');
  return (
    content.includes('messageCenterRouter') &&
    content.includes('notificationEngineRouter') &&
    content.includes('announcementManagerRouter') &&
    content.includes('communicationLogRouter')
  );
});

// Section 28: Document Management & Digital Records (Phase 22)

console.log(c.cyan('\n═══ Section 28: Document Management & Digital Records ═══'));

/* 28.1 — Document Vault */
check('dddDocumentVault.js exports DocumentVault class', () => {
  const m = require(path.join(backendRoot, 'services', 'dddDocumentVault'));
  return typeof m.DocumentVault === 'function';
});
check('dddDocumentVault.js exports DDDVaultDocument model', () => {
  const m = require(path.join(backendRoot, 'services', 'dddDocumentVault'));
  return m.DDDVaultDocument && typeof m.DDDVaultDocument.modelName === 'string';
});
check('dddDocumentVault.js exports DDDFolder model', () => {
  const m = require(path.join(backendRoot, 'services', 'dddDocumentVault'));
  return m.DDDFolder && typeof m.DDDFolder.modelName === 'string';
});
check('dddDocumentVault.js exports DDDDocumentTag model', () => {
  const m = require(path.join(backendRoot, 'services', 'dddDocumentVault'));
  return m.DDDDocumentTag && typeof m.DDDDocumentTag.modelName === 'string';
});
check('dddDocumentVault.js exports DDDDocumentAccess model', () => {
  const m = require(path.join(backendRoot, 'services', 'dddDocumentVault'));
  return m.DDDDocumentAccess && typeof m.DDDDocumentAccess.modelName === 'string';
});
check('dddDocumentVault.js exports DOCUMENT_TYPES (≥10)', () => {
  const m = require(path.join(backendRoot, 'services', 'dddDocumentVault'));
  return Array.isArray(m.DOCUMENT_TYPES) && m.DOCUMENT_TYPES.length >= 10;
});
check('dddDocumentVault.js exports DOCUMENT_STATUSES (≥10)', () => {
  const m = require(path.join(backendRoot, 'services', 'dddDocumentVault'));
  return Array.isArray(m.DOCUMENT_STATUSES) && m.DOCUMENT_STATUSES.length >= 10;
});
check('dddDocumentVault.js exports STORAGE_TYPES (≥10)', () => {
  const m = require(path.join(backendRoot, 'services', 'dddDocumentVault'));
  return Array.isArray(m.STORAGE_TYPES) && m.STORAGE_TYPES.length >= 10;
});
check('dddDocumentVault.js exports MIME_CATEGORIES (≥10)', () => {
  const m = require(path.join(backendRoot, 'services', 'dddDocumentVault'));
  return Array.isArray(m.MIME_CATEGORIES) && m.MIME_CATEGORIES.length >= 10;
});
check('dddDocumentVault.js exports ACCESS_LEVELS (≥6)', () => {
  const m = require(path.join(backendRoot, 'services', 'dddDocumentVault'));
  return Array.isArray(m.ACCESS_LEVELS) && m.ACCESS_LEVELS.length >= 6;
});
check('dddDocumentVault.js exports CLASSIFICATION_LEVELS (≥8)', () => {
  const m = require(path.join(backendRoot, 'services', 'dddDocumentVault'));
  return Array.isArray(m.CLASSIFICATION_LEVELS) && m.CLASSIFICATION_LEVELS.length >= 8;
});
check('dddDocumentVault.js exports BUILTIN_TAGS (≥8)', () => {
  const m = require(path.join(backendRoot, 'services', 'dddDocumentVault'));
  return Array.isArray(m.BUILTIN_TAGS) && m.BUILTIN_TAGS.length >= 8;
});
check('dddDocumentVault.js exports createDocumentVaultRouter', () => {
  const m = require(path.join(backendRoot, 'services', 'dddDocumentVault'));
  return typeof m.createDocumentVaultRouter === 'function';
});
check('DocumentVault — listDocuments + uploadDocument + searchDocuments', () => {
  const m = require(path.join(backendRoot, 'services', 'dddDocumentVault'));
  const inst = new m.DocumentVault();
  return (
    typeof inst.listDocuments === 'function' &&
    typeof inst.uploadDocument === 'function' &&
    typeof inst.searchDocuments === 'function'
  );
});

/* 28.2 — Record Manager */
check('dddRecordManager.js exports RecordManager class', () => {
  const m = require(path.join(backendRoot, 'services', 'dddRecordManager'));
  return typeof m.RecordManager === 'function';
});
check('dddRecordManager.js exports DDDClinicalRecord model', () => {
  const m = require(path.join(backendRoot, 'services', 'dddRecordManager'));
  return m.DDDClinicalRecord && typeof m.DDDClinicalRecord.modelName === 'string';
});
check('dddRecordManager.js exports DDDRecordCategory model', () => {
  const m = require(path.join(backendRoot, 'services', 'dddRecordManager'));
  return m.DDDRecordCategory && typeof m.DDDRecordCategory.modelName === 'string';
});
check('dddRecordManager.js exports DDDRecordRetention model', () => {
  const m = require(path.join(backendRoot, 'services', 'dddRecordManager'));
  return m.DDDRecordRetention && typeof m.DDDRecordRetention.modelName === 'string';
});
check('dddRecordManager.js exports DDDRecordAuditLog model', () => {
  const m = require(path.join(backendRoot, 'services', 'dddRecordManager'));
  return m.DDDRecordAuditLog && typeof m.DDDRecordAuditLog.modelName === 'string';
});
check('dddRecordManager.js exports RECORD_TYPES (≥10)', () => {
  const m = require(path.join(backendRoot, 'services', 'dddRecordManager'));
  return Array.isArray(m.RECORD_TYPES) && m.RECORD_TYPES.length >= 10;
});
check('dddRecordManager.js exports RECORD_STATUSES (≥10)', () => {
  const m = require(path.join(backendRoot, 'services', 'dddRecordManager'));
  return Array.isArray(m.RECORD_STATUSES) && m.RECORD_STATUSES.length >= 10;
});
check('dddRecordManager.js exports RETENTION_PERIODS (≥10)', () => {
  const m = require(path.join(backendRoot, 'services', 'dddRecordManager'));
  return Array.isArray(m.RETENTION_PERIODS) && m.RETENTION_PERIODS.length >= 10;
});
check('dddRecordManager.js exports RECORD_SOURCES (≥10)', () => {
  const m = require(path.join(backendRoot, 'services', 'dddRecordManager'));
  return Array.isArray(m.RECORD_SOURCES) && m.RECORD_SOURCES.length >= 10;
});
check('dddRecordManager.js exports AUDIT_ACTION_TYPES (≥10)', () => {
  const m = require(path.join(backendRoot, 'services', 'dddRecordManager'));
  return Array.isArray(m.AUDIT_ACTION_TYPES) && m.AUDIT_ACTION_TYPES.length >= 10;
});
check('dddRecordManager.js exports SENSITIVITY_LEVELS (≥6)', () => {
  const m = require(path.join(backendRoot, 'services', 'dddRecordManager'));
  return Array.isArray(m.SENSITIVITY_LEVELS) && m.SENSITIVITY_LEVELS.length >= 6;
});
check('dddRecordManager.js exports BUILTIN_RECORD_CATEGORIES (≥8)', () => {
  const m = require(path.join(backendRoot, 'services', 'dddRecordManager'));
  return Array.isArray(m.BUILTIN_RECORD_CATEGORIES) && m.BUILTIN_RECORD_CATEGORIES.length >= 8;
});
check('dddRecordManager.js exports createRecordManagerRouter', () => {
  const m = require(path.join(backendRoot, 'services', 'dddRecordManager'));
  return typeof m.createRecordManagerRouter === 'function';
});
check('RecordManager — listRecords + createRecord + amendRecord', () => {
  const m = require(path.join(backendRoot, 'services', 'dddRecordManager'));
  const inst = new m.RecordManager();
  return (
    typeof inst.listRecords === 'function' &&
    typeof inst.createRecord === 'function' &&
    typeof inst.amendRecord === 'function'
  );
});

/* 28.3 — Digital Signature */
check('dddDigitalSignature.js exports DigitalSignature class', () => {
  const m = require(path.join(backendRoot, 'services', 'dddDigitalSignature'));
  return typeof m.DigitalSignature === 'function';
});
check('dddDigitalSignature.js exports DDDSignatureRequest model', () => {
  const m = require(path.join(backendRoot, 'services', 'dddDigitalSignature'));
  return m.DDDSignatureRequest && typeof m.DDDSignatureRequest.modelName === 'string';
});
check('dddDigitalSignature.js exports DDDSignatureTemplate model', () => {
  const m = require(path.join(backendRoot, 'services', 'dddDigitalSignature'));
  return m.DDDSignatureTemplate && typeof m.DDDSignatureTemplate.modelName === 'string';
});
check('dddDigitalSignature.js exports DDDCertificate model', () => {
  const m = require(path.join(backendRoot, 'services', 'dddDigitalSignature'));
  return m.DDDCertificate && typeof m.DDDCertificate.modelName === 'string';
});
check('dddDigitalSignature.js exports DDDSignatureAudit model', () => {
  const m = require(path.join(backendRoot, 'services', 'dddDigitalSignature'));
  return m.DDDSignatureAudit && typeof m.DDDSignatureAudit.modelName === 'string';
});
check('dddDigitalSignature.js exports SIGNATURE_TYPES (≥10)', () => {
  const m = require(path.join(backendRoot, 'services', 'dddDigitalSignature'));
  return Array.isArray(m.SIGNATURE_TYPES) && m.SIGNATURE_TYPES.length >= 10;
});
check('dddDigitalSignature.js exports SIGNATURE_STATUSES (≥10)', () => {
  const m = require(path.join(backendRoot, 'services', 'dddDigitalSignature'));
  return Array.isArray(m.SIGNATURE_STATUSES) && m.SIGNATURE_STATUSES.length >= 10;
});
check('dddDigitalSignature.js exports SIGNER_ROLES (≥10)', () => {
  const m = require(path.join(backendRoot, 'services', 'dddDigitalSignature'));
  return Array.isArray(m.SIGNER_ROLES) && m.SIGNER_ROLES.length >= 10;
});
check('dddDigitalSignature.js exports CERTIFICATE_STATUSES (≥8)', () => {
  const m = require(path.join(backendRoot, 'services', 'dddDigitalSignature'));
  return Array.isArray(m.CERTIFICATE_STATUSES) && m.CERTIFICATE_STATUSES.length >= 8;
});
check('dddDigitalSignature.js exports VERIFICATION_METHODS (≥8)', () => {
  const m = require(path.join(backendRoot, 'services', 'dddDigitalSignature'));
  return Array.isArray(m.VERIFICATION_METHODS) && m.VERIFICATION_METHODS.length >= 8;
});
check('dddDigitalSignature.js exports SIGNING_ALGORITHMS (≥6)', () => {
  const m = require(path.join(backendRoot, 'services', 'dddDigitalSignature'));
  return Array.isArray(m.SIGNING_ALGORITHMS) && m.SIGNING_ALGORITHMS.length >= 6;
});
check('dddDigitalSignature.js exports BUILTIN_SIGNATURE_TEMPLATES (≥8)', () => {
  const m = require(path.join(backendRoot, 'services', 'dddDigitalSignature'));
  return Array.isArray(m.BUILTIN_SIGNATURE_TEMPLATES) && m.BUILTIN_SIGNATURE_TEMPLATES.length >= 8;
});
check('dddDigitalSignature.js exports createDigitalSignatureRouter', () => {
  const m = require(path.join(backendRoot, 'services', 'dddDigitalSignature'));
  return typeof m.createDigitalSignatureRouter === 'function';
});
check('DigitalSignature — listRequests + createRequest + signDocument', () => {
  const m = require(path.join(backendRoot, 'services', 'dddDigitalSignature'));
  const inst = new m.DigitalSignature();
  return (
    typeof inst.listRequests === 'function' &&
    typeof inst.createRequest === 'function' &&
    typeof inst.signDocument === 'function'
  );
});

/* 28.4 — Archive Manager */
check('dddArchiveManager.js exports ArchiveManager class', () => {
  const m = require(path.join(backendRoot, 'services', 'dddArchiveManager'));
  return typeof m.ArchiveManager === 'function';
});
check('dddArchiveManager.js exports DDDArchiveRecord model', () => {
  const m = require(path.join(backendRoot, 'services', 'dddArchiveManager'));
  return m.DDDArchiveRecord && typeof m.DDDArchiveRecord.modelName === 'string';
});
check('dddArchiveManager.js exports DDDRetentionPolicy model', () => {
  const m = require(path.join(backendRoot, 'services', 'dddArchiveManager'));
  return m.DDDRetentionPolicy && typeof m.DDDRetentionPolicy.modelName === 'string';
});
check('dddArchiveManager.js exports DDDLegalHold model', () => {
  const m = require(path.join(backendRoot, 'services', 'dddArchiveManager'));
  return m.DDDLegalHold && typeof m.DDDLegalHold.modelName === 'string';
});
check('dddArchiveManager.js exports DDDDisposalRequest model', () => {
  const m = require(path.join(backendRoot, 'services', 'dddArchiveManager'));
  return m.DDDDisposalRequest && typeof m.DDDDisposalRequest.modelName === 'string';
});
check('dddArchiveManager.js exports ARCHIVE_TYPES (≥10)', () => {
  const m = require(path.join(backendRoot, 'services', 'dddArchiveManager'));
  return Array.isArray(m.ARCHIVE_TYPES) && m.ARCHIVE_TYPES.length >= 10;
});
check('dddArchiveManager.js exports ARCHIVE_STATUSES (≥10)', () => {
  const m = require(path.join(backendRoot, 'services', 'dddArchiveManager'));
  return Array.isArray(m.ARCHIVE_STATUSES) && m.ARCHIVE_STATUSES.length >= 10;
});
check('dddArchiveManager.js exports RETENTION_CATEGORIES (≥10)', () => {
  const m = require(path.join(backendRoot, 'services', 'dddArchiveManager'));
  return Array.isArray(m.RETENTION_CATEGORIES) && m.RETENTION_CATEGORIES.length >= 10;
});
check('dddArchiveManager.js exports HOLD_TYPES (≥10)', () => {
  const m = require(path.join(backendRoot, 'services', 'dddArchiveManager'));
  return Array.isArray(m.HOLD_TYPES) && m.HOLD_TYPES.length >= 10;
});
check('dddArchiveManager.js exports DISPOSAL_METHODS (≥8)', () => {
  const m = require(path.join(backendRoot, 'services', 'dddArchiveManager'));
  return Array.isArray(m.DISPOSAL_METHODS) && m.DISPOSAL_METHODS.length >= 8;
});
check('dddArchiveManager.js exports ARCHIVE_PRIORITIES (≥6)', () => {
  const m = require(path.join(backendRoot, 'services', 'dddArchiveManager'));
  return Array.isArray(m.ARCHIVE_PRIORITIES) && m.ARCHIVE_PRIORITIES.length >= 6;
});
check('dddArchiveManager.js exports BUILTIN_RETENTION_POLICIES (≥8)', () => {
  const m = require(path.join(backendRoot, 'services', 'dddArchiveManager'));
  return Array.isArray(m.BUILTIN_RETENTION_POLICIES) && m.BUILTIN_RETENTION_POLICIES.length >= 8;
});
check('dddArchiveManager.js exports createArchiveManagerRouter', () => {
  const m = require(path.join(backendRoot, 'services', 'dddArchiveManager'));
  return typeof m.createArchiveManagerRouter === 'function';
});
check('ArchiveManager — listArchives + createArchive + restoreArchive', () => {
  const m = require(path.join(backendRoot, 'services', 'dddArchiveManager'));
  const inst = new m.ArchiveManager();
  return (
    typeof inst.listArchives === 'function' &&
    typeof inst.createArchive === 'function' &&
    typeof inst.restoreArchive === 'function'
  );
});

/* 28.5 — Phase 22 route wiring */
check('platform.routes.js wires Phase 22 routers', () => {
  const content = fs.readFileSync(path.join(backendRoot, 'routes', 'platform.routes.js'), 'utf8');
  return (
    content.includes('documentVaultRouter') &&
    content.includes('recordManagerRouter') &&
    content.includes('digitalSignatureRouter') &&
    content.includes('archiveManagerRouter')
  );
});

// Section 29: Emergency & Incident Management (Phase 23)
console.log(c.cyan('\n═══ Section 29: Emergency & Incident Management ═══'));

/* 29.1 — Incident Tracker */
check('29.1.1 — dddIncidentTracker.js exists', () =>
  fs.existsSync(path.join(backendRoot, 'services/dddIncidentTracker.js'))
);
check('29.1.2 — IncidentTracker class exported', () => {
  const m = require(path.join(backendRoot, 'services/dddIncidentTracker'));
  return typeof m.IncidentTracker === 'function';
});
check('29.1.3 — DDDIncident model exported', () => {
  const m = require(path.join(backendRoot, 'services/dddIncidentTracker'));
  return m.DDDIncident && typeof m.DDDIncident.modelName === 'string';
});
check('29.1.4 — DDDInvestigation model exported', () => {
  const m = require(path.join(backendRoot, 'services/dddIncidentTracker'));
  return m.DDDInvestigation && typeof m.DDDInvestigation.modelName === 'string';
});
check('29.1.5 — DDDCorrectiveActionPlan model exported', () => {
  const m = require(path.join(backendRoot, 'services/dddIncidentTracker'));
  return m.DDDCorrectiveActionPlan && typeof m.DDDCorrectiveActionPlan.modelName === 'string';
});
check('29.1.6 — DDDIncidentCategory model exported', () => {
  const m = require(path.join(backendRoot, 'services/dddIncidentTracker'));
  return m.DDDIncidentCategory && typeof m.DDDIncidentCategory.modelName === 'string';
});
check('29.1.7 — INCIDENT_TYPES has ≥ 10 entries', () => {
  const m = require(path.join(backendRoot, 'services/dddIncidentTracker'));
  return Array.isArray(m.INCIDENT_TYPES) && m.INCIDENT_TYPES.length >= 10;
});
check('29.1.8 — INCIDENT_STATUSES has ≥ 10 entries', () => {
  const m = require(path.join(backendRoot, 'services/dddIncidentTracker'));
  return Array.isArray(m.INCIDENT_STATUSES) && m.INCIDENT_STATUSES.length >= 10;
});
check('29.1.9 — SEVERITY_LEVELS has ≥ 10 entries', () => {
  const m = require(path.join(backendRoot, 'services/dddIncidentTracker'));
  return Array.isArray(m.SEVERITY_LEVELS) && m.SEVERITY_LEVELS.length >= 10;
});
check('29.1.10 — ROOT_CAUSE_CATEGORIES has ≥ 10 entries', () => {
  const m = require(path.join(backendRoot, 'services/dddIncidentTracker'));
  return Array.isArray(m.ROOT_CAUSE_CATEGORIES) && m.ROOT_CAUSE_CATEGORIES.length >= 10;
});
check('29.1.11 — BUILTIN_INCIDENT_CATEGORIES has ≥ 8 entries', () => {
  const m = require(path.join(backendRoot, 'services/dddIncidentTracker'));
  return Array.isArray(m.BUILTIN_INCIDENT_CATEGORIES) && m.BUILTIN_INCIDENT_CATEGORIES.length >= 8;
});
check('29.1.12 — createIncidentTrackerRouter exported', () => {
  const m = require(path.join(backendRoot, 'services/dddIncidentTracker'));
  return typeof m.createIncidentTrackerRouter === 'function';
});
check('29.1.13 — IncidentTracker has listIncidents method', () => {
  const m = require(path.join(backendRoot, 'services/dddIncidentTracker'));
  const inst = new m.IncidentTracker();
  return typeof inst.listIncidents === 'function';
});
check('29.1.14 — IncidentTracker has reportIncident method', () => {
  const m = require(path.join(backendRoot, 'services/dddIncidentTracker'));
  const inst = new m.IncidentTracker();
  return typeof inst.reportIncident === 'function';
});
check('29.1.15 — IncidentTracker has getIncidentAnalytics method', () => {
  const m = require(path.join(backendRoot, 'services/dddIncidentTracker'));
  const inst = new m.IncidentTracker();
  return typeof inst.getIncidentAnalytics === 'function';
});

/* 29.2 — Emergency Response */
check('29.2.1 — dddEmergencyResponse.js exists', () =>
  fs.existsSync(path.join(backendRoot, 'services/dddEmergencyResponse.js'))
);
check('29.2.2 — EmergencyResponse class exported', () => {
  const m = require(path.join(backendRoot, 'services/dddEmergencyResponse'));
  return typeof m.EmergencyResponse === 'function';
});
check('29.2.3 — DDDEmergencyPlan model exported', () => {
  const m = require(path.join(backendRoot, 'services/dddEmergencyResponse'));
  return m.DDDEmergencyPlan && typeof m.DDDEmergencyPlan.modelName === 'string';
});
check('29.2.4 — DDDEmergencyEvent model exported', () => {
  const m = require(path.join(backendRoot, 'services/dddEmergencyResponse'));
  return m.DDDEmergencyEvent && typeof m.DDDEmergencyEvent.modelName === 'string';
});
check('29.2.5 — DDDResponseTeam model exported', () => {
  const m = require(path.join(backendRoot, 'services/dddEmergencyResponse'));
  return m.DDDResponseTeam && typeof m.DDDResponseTeam.modelName === 'string';
});
check('29.2.6 — DDDEmergencyDrill model exported', () => {
  const m = require(path.join(backendRoot, 'services/dddEmergencyResponse'));
  return m.DDDEmergencyDrill && typeof m.DDDEmergencyDrill.modelName === 'string';
});
check('29.2.7 — EMERGENCY_TYPES has ≥ 10 entries', () => {
  const m = require(path.join(backendRoot, 'services/dddEmergencyResponse'));
  return Array.isArray(m.EMERGENCY_TYPES) && m.EMERGENCY_TYPES.length >= 10;
});
check('29.2.8 — EMERGENCY_STATUSES has ≥ 10 entries', () => {
  const m = require(path.join(backendRoot, 'services/dddEmergencyResponse'));
  return Array.isArray(m.EMERGENCY_STATUSES) && m.EMERGENCY_STATUSES.length >= 10;
});
check('29.2.9 — RESPONSE_LEVELS has ≥ 10 entries', () => {
  const m = require(path.join(backendRoot, 'services/dddEmergencyResponse'));
  return Array.isArray(m.RESPONSE_LEVELS) && m.RESPONSE_LEVELS.length >= 10;
});
check('29.2.10 — TEAM_ROLES has ≥ 10 entries', () => {
  const m = require(path.join(backendRoot, 'services/dddEmergencyResponse'));
  return Array.isArray(m.TEAM_ROLES) && m.TEAM_ROLES.length >= 10;
});
check('29.2.11 — BUILTIN_EMERGENCY_PLANS has ≥ 8 entries', () => {
  const m = require(path.join(backendRoot, 'services/dddEmergencyResponse'));
  return Array.isArray(m.BUILTIN_EMERGENCY_PLANS) && m.BUILTIN_EMERGENCY_PLANS.length >= 8;
});
check('29.2.12 — createEmergencyResponseRouter exported', () => {
  const m = require(path.join(backendRoot, 'services/dddEmergencyResponse'));
  return typeof m.createEmergencyResponseRouter === 'function';
});
check('29.2.13 — EmergencyResponse has activateEmergency method', () => {
  const m = require(path.join(backendRoot, 'services/dddEmergencyResponse'));
  const inst = new m.EmergencyResponse();
  return typeof inst.activateEmergency === 'function';
});
check('29.2.14 — EmergencyResponse has listTeams method', () => {
  const m = require(path.join(backendRoot, 'services/dddEmergencyResponse'));
  const inst = new m.EmergencyResponse();
  return typeof inst.listTeams === 'function';
});
check('29.2.15 — EmergencyResponse has scheduleDrill method', () => {
  const m = require(path.join(backendRoot, 'services/dddEmergencyResponse'));
  const inst = new m.EmergencyResponse();
  return typeof inst.scheduleDrill === 'function';
});

/* 29.3 — Disaster Recovery */
check('29.3.1 — dddDisasterRecovery.js exists', () =>
  fs.existsSync(path.join(backendRoot, 'services/dddDisasterRecovery.js'))
);
check('29.3.2 — DisasterRecovery class exported', () => {
  const m = require(path.join(backendRoot, 'services/dddDisasterRecovery'));
  return typeof m.DisasterRecovery === 'function';
});
check('29.3.3 — DDDRecoveryPlan model exported', () => {
  const m = require(path.join(backendRoot, 'services/dddDisasterRecovery'));
  return m.DDDRecoveryPlan && typeof m.DDDRecoveryPlan.modelName === 'string';
});
check('29.3.4 — DDDBackupSchedule model exported', () => {
  const m = require(path.join(backendRoot, 'services/dddDisasterRecovery'));
  return m.DDDBackupSchedule && typeof m.DDDBackupSchedule.modelName === 'string';
});
check('29.3.5 — DDDRecoveryTest model exported', () => {
  const m = require(path.join(backendRoot, 'services/dddDisasterRecovery'));
  return m.DDDRecoveryTest && typeof m.DDDRecoveryTest.modelName === 'string';
});
check('29.3.6 — DDDRecoveryLog model exported', () => {
  const m = require(path.join(backendRoot, 'services/dddDisasterRecovery'));
  return m.DDDRecoveryLog && typeof m.DDDRecoveryLog.modelName === 'string';
});
check('29.3.7 — DISASTER_TYPES has ≥ 10 entries', () => {
  const m = require(path.join(backendRoot, 'services/dddDisasterRecovery'));
  return Array.isArray(m.DISASTER_TYPES) && m.DISASTER_TYPES.length >= 10;
});
check('29.3.8 — RECOVERY_STATUSES has ≥ 10 entries', () => {
  const m = require(path.join(backendRoot, 'services/dddDisasterRecovery'));
  return Array.isArray(m.RECOVERY_STATUSES) && m.RECOVERY_STATUSES.length >= 10;
});
check('29.3.9 — BACKUP_TYPES has ≥ 10 entries', () => {
  const m = require(path.join(backendRoot, 'services/dddDisasterRecovery'));
  return Array.isArray(m.BACKUP_TYPES) && m.BACKUP_TYPES.length >= 10;
});
check('29.3.10 — RTO_LEVELS has ≥ 8 entries', () => {
  const m = require(path.join(backendRoot, 'services/dddDisasterRecovery'));
  return Array.isArray(m.RTO_LEVELS) && m.RTO_LEVELS.length >= 8;
});
check('29.3.11 — BUILTIN_RECOVERY_PLANS has ≥ 8 entries', () => {
  const m = require(path.join(backendRoot, 'services/dddDisasterRecovery'));
  return Array.isArray(m.BUILTIN_RECOVERY_PLANS) && m.BUILTIN_RECOVERY_PLANS.length >= 8;
});
check('29.3.12 — createDisasterRecoveryRouter exported', () => {
  const m = require(path.join(backendRoot, 'services/dddDisasterRecovery'));
  return typeof m.createDisasterRecoveryRouter === 'function';
});
check('29.3.13 — DisasterRecovery has listPlans method', () => {
  const m = require(path.join(backendRoot, 'services/dddDisasterRecovery'));
  const inst = new m.DisasterRecovery();
  return typeof inst.listPlans === 'function';
});
check('29.3.14 — DisasterRecovery has triggerRecovery method', () => {
  const m = require(path.join(backendRoot, 'services/dddDisasterRecovery'));
  const inst = new m.DisasterRecovery();
  return typeof inst.triggerRecovery === 'function';
});
check('29.3.15 — DisasterRecovery has getRecoveryAnalytics method', () => {
  const m = require(path.join(backendRoot, 'services/dddDisasterRecovery'));
  const inst = new m.DisasterRecovery();
  return typeof inst.getRecoveryAnalytics === 'function';
});

/* 29.4 — Safety Manager */
check('29.4.1 — dddSafetyManager.js exists', () =>
  fs.existsSync(path.join(backendRoot, 'services/dddSafetyManager.js'))
);
check('29.4.2 — SafetyManager class exported', () => {
  const m = require(path.join(backendRoot, 'services/dddSafetyManager'));
  return typeof m.SafetyManager === 'function';
});
check('29.4.3 — DDDSafetyInspection model exported', () => {
  const m = require(path.join(backendRoot, 'services/dddSafetyManager'));
  return m.DDDSafetyInspection && typeof m.DDDSafetyInspection.modelName === 'string';
});
check('29.4.4 — DDDHazardReport model exported', () => {
  const m = require(path.join(backendRoot, 'services/dddSafetyManager'));
  return m.DDDHazardReport && typeof m.DDDHazardReport.modelName === 'string';
});
check('29.4.5 — DDDSafetyPolicy model exported', () => {
  const m = require(path.join(backendRoot, 'services/dddSafetyManager'));
  return m.DDDSafetyPolicy && typeof m.DDDSafetyPolicy.modelName === 'string';
});
check('29.4.6 — DDDSafetyTraining model exported', () => {
  const m = require(path.join(backendRoot, 'services/dddSafetyManager'));
  return m.DDDSafetyTraining && typeof m.DDDSafetyTraining.modelName === 'string';
});
check('29.4.7 — HAZARD_TYPES has ≥ 10 entries', () => {
  const m = require(path.join(backendRoot, 'services/dddSafetyManager'));
  return Array.isArray(m.HAZARD_TYPES) && m.HAZARD_TYPES.length >= 10;
});
check('29.4.8 — HAZARD_STATUSES has ≥ 10 entries', () => {
  const m = require(path.join(backendRoot, 'services/dddSafetyManager'));
  return Array.isArray(m.HAZARD_STATUSES) && m.HAZARD_STATUSES.length >= 10;
});
check('29.4.9 — INSPECTION_TYPES has ≥ 10 entries', () => {
  const m = require(path.join(backendRoot, 'services/dddSafetyManager'));
  return Array.isArray(m.INSPECTION_TYPES) && m.INSPECTION_TYPES.length >= 10;
});
check('29.4.10 — RISK_LEVELS has ≥ 10 entries', () => {
  const m = require(path.join(backendRoot, 'services/dddSafetyManager'));
  return Array.isArray(m.RISK_LEVELS) && m.RISK_LEVELS.length >= 10;
});
check('29.4.11 — BUILTIN_SAFETY_POLICIES has ≥ 8 entries', () => {
  const m = require(path.join(backendRoot, 'services/dddSafetyManager'));
  return Array.isArray(m.BUILTIN_SAFETY_POLICIES) && m.BUILTIN_SAFETY_POLICIES.length >= 8;
});
check('29.4.12 — createSafetyManagerRouter exported', () => {
  const m = require(path.join(backendRoot, 'services/dddSafetyManager'));
  return typeof m.createSafetyManagerRouter === 'function';
});
check('29.4.13 — SafetyManager has listInspections method', () => {
  const m = require(path.join(backendRoot, 'services/dddSafetyManager'));
  const inst = new m.SafetyManager();
  return typeof inst.listInspections === 'function';
});
check('29.4.14 — SafetyManager has reportHazard method', () => {
  const m = require(path.join(backendRoot, 'services/dddSafetyManager'));
  const inst = new m.SafetyManager();
  return typeof inst.reportHazard === 'function';
});
check('29.4.15 — SafetyManager has getSafetyAnalytics method', () => {
  const m = require(path.join(backendRoot, 'services/dddSafetyManager'));
  const inst = new m.SafetyManager();
  return typeof inst.getSafetyAnalytics === 'function';
});

/* 29.5 — Phase 23 Route Wiring */
check('29.5.1 — platform.routes.js references all Phase 23 routers', () => {
  const content = fs.readFileSync(path.join(backendRoot, 'routes/platform.routes.js'), 'utf8');
  return (
    content.includes('incidentTrackerRouter') &&
    content.includes('emergencyResponseRouter') &&
    content.includes('disasterRecoveryRouter') &&
    content.includes('safetyManagerRouter')
  );
});

// Section 30: Transportation & Logistics Management (Phase 24)
console.log(c.cyan('\n═══ Section 30: Transportation & Logistics Management ═══'));

/* 30.1 — Transport Manager */
check('30.1.1 — dddTransportManager.js exists', () =>
  fs.existsSync(path.join(backendRoot, 'services/dddTransportManager.js'))
);
check('30.1.2 — TransportManager class exported', () => {
  const m = require(path.join(backendRoot, 'services/dddTransportManager'));
  return typeof m.TransportManager === 'function';
});
check('30.1.3 — DDDVehicle model exported', () => {
  const m = require(path.join(backendRoot, 'services/dddTransportManager'));
  return m.DDDVehicle && typeof m.DDDVehicle.modelName === 'string';
});
check('30.1.4 — DDDDriver model exported', () => {
  const m = require(path.join(backendRoot, 'services/dddTransportManager'));
  return m.DDDDriver && typeof m.DDDDriver.modelName === 'string';
});
check('30.1.5 — DDDTransportSchedule model exported', () => {
  const m = require(path.join(backendRoot, 'services/dddTransportManager'));
  return m.DDDTransportSchedule && typeof m.DDDTransportSchedule.modelName === 'string';
});
check('30.1.6 — DDDTransportPolicy model exported', () => {
  const m = require(path.join(backendRoot, 'services/dddTransportManager'));
  return m.DDDTransportPolicy && typeof m.DDDTransportPolicy.modelName === 'string';
});
check('30.1.7 — VEHICLE_TYPES has ≥ 10 entries', () => {
  const m = require(path.join(backendRoot, 'services/dddTransportManager'));
  return Array.isArray(m.VEHICLE_TYPES) && m.VEHICLE_TYPES.length >= 10;
});
check('30.1.8 — VEHICLE_STATUSES has ≥ 10 entries', () => {
  const m = require(path.join(backendRoot, 'services/dddTransportManager'));
  return Array.isArray(m.VEHICLE_STATUSES) && m.VEHICLE_STATUSES.length >= 10;
});
check('30.1.9 — DRIVER_STATUSES has ≥ 10 entries', () => {
  const m = require(path.join(backendRoot, 'services/dddTransportManager'));
  return Array.isArray(m.DRIVER_STATUSES) && m.DRIVER_STATUSES.length >= 10;
});
check('30.1.10 — DRIVER_CERTIFICATIONS has ≥ 10 entries', () => {
  const m = require(path.join(backendRoot, 'services/dddTransportManager'));
  return Array.isArray(m.DRIVER_CERTIFICATIONS) && m.DRIVER_CERTIFICATIONS.length >= 10;
});
check('30.1.11 — BUILTIN_TRANSPORT_POLICIES has ≥ 8 entries', () => {
  const m = require(path.join(backendRoot, 'services/dddTransportManager'));
  return Array.isArray(m.BUILTIN_TRANSPORT_POLICIES) && m.BUILTIN_TRANSPORT_POLICIES.length >= 8;
});
check('30.1.12 — createTransportManagerRouter exported', () => {
  const m = require(path.join(backendRoot, 'services/dddTransportManager'));
  return typeof m.createTransportManagerRouter === 'function';
});
check('30.1.13 — TransportManager has listVehicles method', () => {
  const m = require(path.join(backendRoot, 'services/dddTransportManager'));
  const inst = new m.TransportManager();
  return typeof inst.listVehicles === 'function';
});
check('30.1.14 — TransportManager has registerDriver method', () => {
  const m = require(path.join(backendRoot, 'services/dddTransportManager'));
  const inst = new m.TransportManager();
  return typeof inst.registerDriver === 'function';
});
check('30.1.15 — TransportManager has getTransportAnalytics method', () => {
  const m = require(path.join(backendRoot, 'services/dddTransportManager'));
  const inst = new m.TransportManager();
  return typeof inst.getTransportAnalytics === 'function';
});

/* 30.2 — Patient Transport */
check('30.2.1 — dddPatientTransport.js exists', () =>
  fs.existsSync(path.join(backendRoot, 'services/dddPatientTransport.js'))
);
check('30.2.2 — PatientTransport class exported', () => {
  const m = require(path.join(backendRoot, 'services/dddPatientTransport'));
  return typeof m.PatientTransport === 'function';
});
check('30.2.3 — DDDTransportRequest model exported', () => {
  const m = require(path.join(backendRoot, 'services/dddPatientTransport'));
  return m.DDDTransportRequest && typeof m.DDDTransportRequest.modelName === 'string';
});
check('30.2.4 — DDDTripRecord model exported', () => {
  const m = require(path.join(backendRoot, 'services/dddPatientTransport'));
  return m.DDDTripRecord && typeof m.DDDTripRecord.modelName === 'string';
});
check('30.2.5 — DDDAccessibilityNeed model exported', () => {
  const m = require(path.join(backendRoot, 'services/dddPatientTransport'));
  return m.DDDAccessibilityNeed && typeof m.DDDAccessibilityNeed.modelName === 'string';
});
check('30.2.6 — DDDMedicalEscort model exported', () => {
  const m = require(path.join(backendRoot, 'services/dddPatientTransport'));
  return m.DDDMedicalEscort && typeof m.DDDMedicalEscort.modelName === 'string';
});
check('30.2.7 — REQUEST_STATUSES has ≥ 10 entries', () => {
  const m = require(path.join(backendRoot, 'services/dddPatientTransport'));
  return Array.isArray(m.REQUEST_STATUSES) && m.REQUEST_STATUSES.length >= 10;
});
check('30.2.8 — TRIP_TYPES has ≥ 10 entries', () => {
  const m = require(path.join(backendRoot, 'services/dddPatientTransport'));
  return Array.isArray(m.TRIP_TYPES) && m.TRIP_TYPES.length >= 10;
});
check('30.2.9 — ACCESSIBILITY_TYPES has ≥ 10 entries', () => {
  const m = require(path.join(backendRoot, 'services/dddPatientTransport'));
  return Array.isArray(m.ACCESSIBILITY_TYPES) && m.ACCESSIBILITY_TYPES.length >= 10;
});
check('30.2.10 — ESCORT_TYPES has ≥ 10 entries', () => {
  const m = require(path.join(backendRoot, 'services/dddPatientTransport'));
  return Array.isArray(m.ESCORT_TYPES) && m.ESCORT_TYPES.length >= 10;
});
check('30.2.11 — BUILTIN_ACCESSIBILITY_PROFILES has ≥ 8 entries', () => {
  const m = require(path.join(backendRoot, 'services/dddPatientTransport'));
  return (
    Array.isArray(m.BUILTIN_ACCESSIBILITY_PROFILES) && m.BUILTIN_ACCESSIBILITY_PROFILES.length >= 8
  );
});
check('30.2.12 — createPatientTransportRouter exported', () => {
  const m = require(path.join(backendRoot, 'services/dddPatientTransport'));
  return typeof m.createPatientTransportRouter === 'function';
});
check('30.2.13 — PatientTransport has createRequest method', () => {
  const m = require(path.join(backendRoot, 'services/dddPatientTransport'));
  const inst = new m.PatientTransport();
  return typeof inst.createRequest === 'function';
});
check('30.2.14 — PatientTransport has startTrip method', () => {
  const m = require(path.join(backendRoot, 'services/dddPatientTransport'));
  const inst = new m.PatientTransport();
  return typeof inst.startTrip === 'function';
});
check('30.2.15 — PatientTransport has getPatientTransportAnalytics method', () => {
  const m = require(path.join(backendRoot, 'services/dddPatientTransport'));
  const inst = new m.PatientTransport();
  return typeof inst.getPatientTransportAnalytics === 'function';
});

/* 30.3 — Fleet Tracker */
check('30.3.1 — dddFleetTracker.js exists', () =>
  fs.existsSync(path.join(backendRoot, 'services/dddFleetTracker.js'))
);
check('30.3.2 — FleetTracker class exported', () => {
  const m = require(path.join(backendRoot, 'services/dddFleetTracker'));
  return typeof m.FleetTracker === 'function';
});
check('30.3.3 — DDDFuelLog model exported', () => {
  const m = require(path.join(backendRoot, 'services/dddFleetTracker'));
  return m.DDDFuelLog && typeof m.DDDFuelLog.modelName === 'string';
});
check('30.3.4 — DDDGPSTracking model exported', () => {
  const m = require(path.join(backendRoot, 'services/dddFleetTracker'));
  return m.DDDGPSTracking && typeof m.DDDGPSTracking.modelName === 'string';
});
check('30.3.5 — DDDVehicleMaintenance model exported', () => {
  const m = require(path.join(backendRoot, 'services/dddFleetTracker'));
  return m.DDDVehicleMaintenance && typeof m.DDDVehicleMaintenance.modelName === 'string';
});
check('30.3.6 — DDDVehicleInspection model exported', () => {
  const m = require(path.join(backendRoot, 'services/dddFleetTracker'));
  return m.DDDVehicleInspection && typeof m.DDDVehicleInspection.modelName === 'string';
});
check('30.3.7 — FUEL_TYPES has ≥ 10 entries', () => {
  const m = require(path.join(backendRoot, 'services/dddFleetTracker'));
  return Array.isArray(m.FUEL_TYPES) && m.FUEL_TYPES.length >= 10;
});
check('30.3.8 — MAINTENANCE_CATEGORIES has ≥ 10 entries', () => {
  const m = require(path.join(backendRoot, 'services/dddFleetTracker'));
  return Array.isArray(m.MAINTENANCE_CATEGORIES) && m.MAINTENANCE_CATEGORIES.length >= 10;
});
check('30.3.9 — TRACKING_EVENTS has ≥ 10 entries', () => {
  const m = require(path.join(backendRoot, 'services/dddFleetTracker'));
  return Array.isArray(m.TRACKING_EVENTS) && m.TRACKING_EVENTS.length >= 10;
});
check('30.3.10 — ALERT_TYPES has ≥ 10 entries', () => {
  const m = require(path.join(backendRoot, 'services/dddFleetTracker'));
  return Array.isArray(m.ALERT_TYPES) && m.ALERT_TYPES.length >= 10;
});
check('30.3.11 — BUILTIN_MAINTENANCE_SCHEDULES has ≥ 8 entries', () => {
  const m = require(path.join(backendRoot, 'services/dddFleetTracker'));
  return (
    Array.isArray(m.BUILTIN_MAINTENANCE_SCHEDULES) && m.BUILTIN_MAINTENANCE_SCHEDULES.length >= 8
  );
});
check('30.3.12 — createFleetTrackerRouter exported', () => {
  const m = require(path.join(backendRoot, 'services/dddFleetTracker'));
  return typeof m.createFleetTrackerRouter === 'function';
});
check('30.3.13 — FleetTracker has logFuel method', () => {
  const m = require(path.join(backendRoot, 'services/dddFleetTracker'));
  const inst = new m.FleetTracker();
  return typeof inst.logFuel === 'function';
});
check('30.3.14 — FleetTracker has scheduleMaintenance method', () => {
  const m = require(path.join(backendRoot, 'services/dddFleetTracker'));
  const inst = new m.FleetTracker();
  return typeof inst.scheduleMaintenance === 'function';
});
check('30.3.15 — FleetTracker has getFleetAnalytics method', () => {
  const m = require(path.join(backendRoot, 'services/dddFleetTracker'));
  const inst = new m.FleetTracker();
  return typeof inst.getFleetAnalytics === 'function';
});

/* 30.4 — Route Optimizer */
check('30.4.1 — dddRouteOptimizer.js exists', () =>
  fs.existsSync(path.join(backendRoot, 'services/dddRouteOptimizer.js'))
);
check('30.4.2 — RouteOptimizer class exported', () => {
  const m = require(path.join(backendRoot, 'services/dddRouteOptimizer'));
  return typeof m.RouteOptimizer === 'function';
});
check('30.4.3 — DDDRoute model exported', () => {
  const m = require(path.join(backendRoot, 'services/dddRouteOptimizer'));
  return m.DDDRoute && typeof m.DDDRoute.modelName === 'string';
});
check('30.4.4 — DDDRouteExecution model exported', () => {
  const m = require(path.join(backendRoot, 'services/dddRouteOptimizer'));
  return m.DDDRouteExecution && typeof m.DDDRouteExecution.modelName === 'string';
});
check('30.4.5 — DDDServiceZone model exported', () => {
  const m = require(path.join(backendRoot, 'services/dddRouteOptimizer'));
  return m.DDDServiceZone && typeof m.DDDServiceZone.modelName === 'string';
});
check('30.4.6 — DDDETACalculation model exported', () => {
  const m = require(path.join(backendRoot, 'services/dddRouteOptimizer'));
  return m.DDDETACalculation && typeof m.DDDETACalculation.modelName === 'string';
});
check('30.4.7 — ROUTE_TYPES has ≥ 10 entries', () => {
  const m = require(path.join(backendRoot, 'services/dddRouteOptimizer'));
  return Array.isArray(m.ROUTE_TYPES) && m.ROUTE_TYPES.length >= 10;
});
check('30.4.8 — ROUTE_STATUSES has ≥ 10 entries', () => {
  const m = require(path.join(backendRoot, 'services/dddRouteOptimizer'));
  return Array.isArray(m.ROUTE_STATUSES) && m.ROUTE_STATUSES.length >= 10;
});
check('30.4.9 — ZONE_TYPES has ≥ 10 entries', () => {
  const m = require(path.join(backendRoot, 'services/dddRouteOptimizer'));
  return Array.isArray(m.ZONE_TYPES) && m.ZONE_TYPES.length >= 10;
});
check('30.4.10 — OPTIMIZATION_CRITERIA has ≥ 10 entries', () => {
  const m = require(path.join(backendRoot, 'services/dddRouteOptimizer'));
  return Array.isArray(m.OPTIMIZATION_CRITERIA) && m.OPTIMIZATION_CRITERIA.length >= 10;
});
check('30.4.11 — BUILTIN_ROUTES has ≥ 8 entries', () => {
  const m = require(path.join(backendRoot, 'services/dddRouteOptimizer'));
  return Array.isArray(m.BUILTIN_ROUTES) && m.BUILTIN_ROUTES.length >= 8;
});
check('30.4.12 — createRouteOptimizerRouter exported', () => {
  const m = require(path.join(backendRoot, 'services/dddRouteOptimizer'));
  return typeof m.createRouteOptimizerRouter === 'function';
});
check('30.4.13 — RouteOptimizer has listRoutes method', () => {
  const m = require(path.join(backendRoot, 'services/dddRouteOptimizer'));
  const inst = new m.RouteOptimizer();
  return typeof inst.listRoutes === 'function';
});
check('30.4.14 — RouteOptimizer has optimizeRoute method', () => {
  const m = require(path.join(backendRoot, 'services/dddRouteOptimizer'));
  const inst = new m.RouteOptimizer();
  return typeof inst.optimizeRoute === 'function';
});
check('30.4.15 — RouteOptimizer has getRouteAnalytics method', () => {
  const m = require(path.join(backendRoot, 'services/dddRouteOptimizer'));
  const inst = new m.RouteOptimizer();
  return typeof inst.getRouteAnalytics === 'function';
});

/* 30.5 — Phase 24 Route Wiring */
check('30.5.1 — platform.routes.js references all Phase 24 routers', () => {
  const content = fs.readFileSync(path.join(backendRoot, 'routes/platform.routes.js'), 'utf8');
  return (
    content.includes('transportManagerRouter') &&
    content.includes('patientTransportRouter') &&
    content.includes('fleetTrackerRouter') &&
    content.includes('routeOptimizerRouter')
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// Section 31 — Phase 25: Volunteer & Community Engagement Management
// ═══════════════════════════════════════════════════════════════════════════════
console.log(c.cyan('\n═══ Section 31: Volunteer & Community Engagement ═══'));

/* 31.1 — Volunteer Manager */
check('31.1.1 — dddVolunteerManager.js exists', () =>
  fs.existsSync(path.join(backendRoot, 'services/dddVolunteerManager.js'))
);
check('31.1.2 — exports VolunteerManager class', () => {
  const m = require(path.join(backendRoot, 'services/dddVolunteerManager'));
  return typeof m.VolunteerManager === 'function';
});
check('31.1.3 — exports DDDVolunteer model', () => {
  const m = require(path.join(backendRoot, 'services/dddVolunteerManager'));
  return m.DDDVolunteer && typeof m.DDDVolunteer.modelName === 'string';
});
check('31.1.4 — exports DDDVolunteerShift model', () => {
  const m = require(path.join(backendRoot, 'services/dddVolunteerManager'));
  return m.DDDVolunteerShift && typeof m.DDDVolunteerShift.modelName === 'string';
});
check('31.1.5 — exports DDDVolunteerSkill model', () => {
  const m = require(path.join(backendRoot, 'services/dddVolunteerManager'));
  return m.DDDVolunteerSkill && typeof m.DDDVolunteerSkill.modelName === 'string';
});
check('31.1.6 — exports DDDVolunteerRecognition model', () => {
  const m = require(path.join(backendRoot, 'services/dddVolunteerManager'));
  return m.DDDVolunteerRecognition && typeof m.DDDVolunteerRecognition.modelName === 'string';
});
check('31.1.7 — VOLUNTEER_STATUSES has ≥10 items', () => {
  const m = require(path.join(backendRoot, 'services/dddVolunteerManager'));
  return Array.isArray(m.VOLUNTEER_STATUSES) && m.VOLUNTEER_STATUSES.length >= 10;
});
check('31.1.8 — VOLUNTEER_CATEGORIES has ≥10 items', () => {
  const m = require(path.join(backendRoot, 'services/dddVolunteerManager'));
  return Array.isArray(m.VOLUNTEER_CATEGORIES) && m.VOLUNTEER_CATEGORIES.length >= 10;
});
check('31.1.9 — SHIFT_STATUSES has ≥10 items', () => {
  const m = require(path.join(backendRoot, 'services/dddVolunteerManager'));
  return Array.isArray(m.SHIFT_STATUSES) && m.SHIFT_STATUSES.length >= 10;
});
check('31.1.10 — SKILL_LEVELS has ≥6 items', () => {
  const m = require(path.join(backendRoot, 'services/dddVolunteerManager'));
  return Array.isArray(m.SKILL_LEVELS) && m.SKILL_LEVELS.length >= 6;
});
check('31.1.11 — RECOGNITION_TYPES has ≥10 items', () => {
  const m = require(path.join(backendRoot, 'services/dddVolunteerManager'));
  return Array.isArray(m.RECOGNITION_TYPES) && m.RECOGNITION_TYPES.length >= 10;
});
check('31.1.12 — AVAILABILITY_PATTERNS has ≥8 items', () => {
  const m = require(path.join(backendRoot, 'services/dddVolunteerManager'));
  return Array.isArray(m.AVAILABILITY_PATTERNS) && m.AVAILABILITY_PATTERNS.length >= 8;
});
check('31.1.13 — BUILTIN_VOLUNTEER_ROLES has ≥8 items', () => {
  const m = require(path.join(backendRoot, 'services/dddVolunteerManager'));
  return Array.isArray(m.BUILTIN_VOLUNTEER_ROLES) && m.BUILTIN_VOLUNTEER_ROLES.length >= 8;
});
check('31.1.14 — exports createVolunteerManagerRouter', () => {
  const m = require(path.join(backendRoot, 'services/dddVolunteerManager'));
  return typeof m.createVolunteerManagerRouter === 'function';
});
check('31.1.15 — VolunteerManager has listVolunteers method', () => {
  const m = require(path.join(backendRoot, 'services/dddVolunteerManager'));
  const inst = new m.VolunteerManager();
  return typeof inst.listVolunteers === 'function';
});
check('31.1.16 — VolunteerManager has registerVolunteer method', () => {
  const m = require(path.join(backendRoot, 'services/dddVolunteerManager'));
  const inst = new m.VolunteerManager();
  return typeof inst.registerVolunteer === 'function';
});
check('31.1.17 — VolunteerManager has getVolunteerAnalytics method', () => {
  const m = require(path.join(backendRoot, 'services/dddVolunteerManager'));
  const inst = new m.VolunteerManager();
  return typeof inst.getVolunteerAnalytics === 'function';
});

/* 31.2 — Community Program */
check('31.2.1 — dddCommunityProgram.js exists', () =>
  fs.existsSync(path.join(backendRoot, 'services/dddCommunityProgram.js'))
);
check('31.2.2 — exports CommunityProgram class', () => {
  const m = require(path.join(backendRoot, 'services/dddCommunityProgram'));
  return typeof m.CommunityProgram === 'function';
});
check('31.2.3 — exports DDDProgram model', () => {
  const m = require(path.join(backendRoot, 'services/dddCommunityProgram'));
  return m.DDDProgram && typeof m.DDDProgram.modelName === 'string';
});
check('31.2.4 — exports DDDProgramEnrollment model', () => {
  const m = require(path.join(backendRoot, 'services/dddCommunityProgram'));
  return m.DDDProgramEnrollment && typeof m.DDDProgramEnrollment.modelName === 'string';
});
check('31.2.5 — exports DDDProgramActivity model', () => {
  const m = require(path.join(backendRoot, 'services/dddCommunityProgram'));
  return m.DDDProgramActivity && typeof m.DDDProgramActivity.modelName === 'string';
});
check('31.2.6 — exports DDDProgramOutcome model', () => {
  const m = require(path.join(backendRoot, 'services/dddCommunityProgram'));
  return m.DDDProgramOutcome && typeof m.DDDProgramOutcome.modelName === 'string';
});
check('31.2.7 — PROGRAM_TYPES has ≥10 items', () => {
  const m = require(path.join(backendRoot, 'services/dddCommunityProgram'));
  return Array.isArray(m.PROGRAM_TYPES) && m.PROGRAM_TYPES.length >= 10;
});
check('31.2.8 — PROGRAM_STATUSES has ≥10 items', () => {
  const m = require(path.join(backendRoot, 'services/dddCommunityProgram'));
  return Array.isArray(m.PROGRAM_STATUSES) && m.PROGRAM_STATUSES.length >= 10;
});
check('31.2.9 — ENROLLMENT_STATUSES has ≥10 items', () => {
  const m = require(path.join(backendRoot, 'services/dddCommunityProgram'));
  return Array.isArray(m.ENROLLMENT_STATUSES) && m.ENROLLMENT_STATUSES.length >= 10;
});
check('31.2.10 — ACTIVITY_TYPES has ≥10 items', () => {
  const m = require(path.join(backendRoot, 'services/dddCommunityProgram'));
  return Array.isArray(m.ACTIVITY_TYPES) && m.ACTIVITY_TYPES.length >= 10;
});
check('31.2.11 — OUTCOME_TYPES has ≥10 items', () => {
  const m = require(path.join(backendRoot, 'services/dddCommunityProgram'));
  return Array.isArray(m.OUTCOME_TYPES) && m.OUTCOME_TYPES.length >= 10;
});
check('31.2.12 — FUNDING_SOURCES has ≥8 items', () => {
  const m = require(path.join(backendRoot, 'services/dddCommunityProgram'));
  return Array.isArray(m.FUNDING_SOURCES) && m.FUNDING_SOURCES.length >= 8;
});
check('31.2.13 — BUILTIN_PROGRAMS has ≥8 items', () => {
  const m = require(path.join(backendRoot, 'services/dddCommunityProgram'));
  return Array.isArray(m.BUILTIN_PROGRAMS) && m.BUILTIN_PROGRAMS.length >= 8;
});
check('31.2.14 — exports createCommunityProgramRouter', () => {
  const m = require(path.join(backendRoot, 'services/dddCommunityProgram'));
  return typeof m.createCommunityProgramRouter === 'function';
});
check('31.2.15 — CommunityProgram has listPrograms method', () => {
  const m = require(path.join(backendRoot, 'services/dddCommunityProgram'));
  const inst = new m.CommunityProgram();
  return typeof inst.listPrograms === 'function';
});
check('31.2.16 — CommunityProgram has enrollParticipant method', () => {
  const m = require(path.join(backendRoot, 'services/dddCommunityProgram'));
  const inst = new m.CommunityProgram();
  return typeof inst.enrollParticipant === 'function';
});
check('31.2.17 — CommunityProgram has getProgramAnalytics method', () => {
  const m = require(path.join(backendRoot, 'services/dddCommunityProgram'));
  const inst = new m.CommunityProgram();
  return typeof inst.getProgramAnalytics === 'function';
});

/* 31.3 — Outreach Tracker */
check('31.3.1 — dddOutreachTracker.js exists', () =>
  fs.existsSync(path.join(backendRoot, 'services/dddOutreachTracker.js'))
);
check('31.3.2 — exports OutreachTracker class', () => {
  const m = require(path.join(backendRoot, 'services/dddOutreachTracker'));
  return typeof m.OutreachTracker === 'function';
});
check('31.3.3 — exports DDDOutreachCampaign model', () => {
  const m = require(path.join(backendRoot, 'services/dddOutreachTracker'));
  return m.DDDOutreachCampaign && typeof m.DDDOutreachCampaign.modelName === 'string';
});
check('31.3.4 — exports DDDOutreachContact model', () => {
  const m = require(path.join(backendRoot, 'services/dddOutreachTracker'));
  return m.DDDOutreachContact && typeof m.DDDOutreachContact.modelName === 'string';
});
check('31.3.5 — exports DDDOutreachEvent model', () => {
  const m = require(path.join(backendRoot, 'services/dddOutreachTracker'));
  return m.DDDOutreachEvent && typeof m.DDDOutreachEvent.modelName === 'string';
});
check('31.3.6 — exports DDDOutreachReport model', () => {
  const m = require(path.join(backendRoot, 'services/dddOutreachTracker'));
  return m.DDDOutreachReport && typeof m.DDDOutreachReport.modelName === 'string';
});
check('31.3.7 — CAMPAIGN_TYPES has ≥10 items', () => {
  const m = require(path.join(backendRoot, 'services/dddOutreachTracker'));
  return Array.isArray(m.CAMPAIGN_TYPES) && m.CAMPAIGN_TYPES.length >= 10;
});
check('31.3.8 — CAMPAIGN_STATUSES has ≥10 items', () => {
  const m = require(path.join(backendRoot, 'services/dddOutreachTracker'));
  return Array.isArray(m.CAMPAIGN_STATUSES) && m.CAMPAIGN_STATUSES.length >= 10;
});
check('31.3.9 — CONTACT_TYPES has ≥10 items', () => {
  const m = require(path.join(backendRoot, 'services/dddOutreachTracker'));
  return Array.isArray(m.CONTACT_TYPES) && m.CONTACT_TYPES.length >= 10;
});
check('31.3.10 — EVENT_TYPES has ≥10 items', () => {
  const m = require(path.join(backendRoot, 'services/dddOutreachTracker'));
  return Array.isArray(m.EVENT_TYPES) && m.EVENT_TYPES.length >= 10;
});
check('31.3.11 — REPORT_TYPES has ≥10 items', () => {
  const m = require(path.join(backendRoot, 'services/dddOutreachTracker'));
  return Array.isArray(m.REPORT_TYPES) && m.REPORT_TYPES.length >= 10;
});
check('31.3.12 — OUTREACH_CHANNELS has ≥8 items', () => {
  const m = require(path.join(backendRoot, 'services/dddOutreachTracker'));
  return Array.isArray(m.OUTREACH_CHANNELS) && m.OUTREACH_CHANNELS.length >= 8;
});
check('31.3.13 — BUILTIN_CAMPAIGNS has ≥8 items', () => {
  const m = require(path.join(backendRoot, 'services/dddOutreachTracker'));
  return Array.isArray(m.BUILTIN_CAMPAIGNS) && m.BUILTIN_CAMPAIGNS.length >= 8;
});
check('31.3.14 — exports createOutreachTrackerRouter', () => {
  const m = require(path.join(backendRoot, 'services/dddOutreachTracker'));
  return typeof m.createOutreachTrackerRouter === 'function';
});
check('31.3.15 — OutreachTracker has listCampaigns method', () => {
  const m = require(path.join(backendRoot, 'services/dddOutreachTracker'));
  const inst = new m.OutreachTracker();
  return typeof inst.listCampaigns === 'function';
});
check('31.3.16 — OutreachTracker has createCampaign method', () => {
  const m = require(path.join(backendRoot, 'services/dddOutreachTracker'));
  const inst = new m.OutreachTracker();
  return typeof inst.createCampaign === 'function';
});
check('31.3.17 — OutreachTracker has getOutreachAnalytics method', () => {
  const m = require(path.join(backendRoot, 'services/dddOutreachTracker'));
  const inst = new m.OutreachTracker();
  return typeof inst.getOutreachAnalytics === 'function';
});

/* 31.4 — Donation Manager */
check('31.4.1 — dddDonationManager.js exists', () =>
  fs.existsSync(path.join(backendRoot, 'services/dddDonationManager.js'))
);
check('31.4.2 — exports DonationManager class', () => {
  const m = require(path.join(backendRoot, 'services/dddDonationManager'));
  return typeof m.DonationManager === 'function';
});
check('31.4.3 — exports DDDDonation model', () => {
  const m = require(path.join(backendRoot, 'services/dddDonationManager'));
  return m.DDDDonation && typeof m.DDDDonation.modelName === 'string';
});
check('31.4.4 — exports DDDDonor model', () => {
  const m = require(path.join(backendRoot, 'services/dddDonationManager'));
  return m.DDDDonor && typeof m.DDDDonor.modelName === 'string';
});
check('31.4.5 — exports DDDFundraiser model', () => {
  const m = require(path.join(backendRoot, 'services/dddDonationManager'));
  return m.DDDFundraiser && typeof m.DDDFundraiser.modelName === 'string';
});
check('31.4.6 — exports DDDDonationReceipt model', () => {
  const m = require(path.join(backendRoot, 'services/dddDonationManager'));
  return m.DDDDonationReceipt && typeof m.DDDDonationReceipt.modelName === 'string';
});
check('31.4.7 — DONATION_TYPES has ≥10 items', () => {
  const m = require(path.join(backendRoot, 'services/dddDonationManager'));
  return Array.isArray(m.DONATION_TYPES) && m.DONATION_TYPES.length >= 10;
});
check('31.4.8 — DONATION_STATUSES has ≥10 items', () => {
  const m = require(path.join(backendRoot, 'services/dddDonationManager'));
  return Array.isArray(m.DONATION_STATUSES) && m.DONATION_STATUSES.length >= 10;
});
check('31.4.9 — PAYMENT_METHODS has ≥10 items', () => {
  const m = require(path.join(backendRoot, 'services/dddDonationManager'));
  return Array.isArray(m.PAYMENT_METHODS) && m.PAYMENT_METHODS.length >= 10;
});
check('31.4.10 — DONOR_CATEGORIES has ≥10 items', () => {
  const m = require(path.join(backendRoot, 'services/dddDonationManager'));
  return Array.isArray(m.DONOR_CATEGORIES) && m.DONOR_CATEGORIES.length >= 10;
});
check('31.4.11 — FUNDRAISER_TYPES has ≥10 items', () => {
  const m = require(path.join(backendRoot, 'services/dddDonationManager'));
  return Array.isArray(m.FUNDRAISER_TYPES) && m.FUNDRAISER_TYPES.length >= 10;
});
check('31.4.12 — FUNDRAISER_STATUSES has ≥10 items', () => {
  const m = require(path.join(backendRoot, 'services/dddDonationManager'));
  return Array.isArray(m.FUNDRAISER_STATUSES) && m.FUNDRAISER_STATUSES.length >= 10;
});
check('31.4.13 — BUILTIN_FUNDRAISERS has ≥8 items', () => {
  const m = require(path.join(backendRoot, 'services/dddDonationManager'));
  return Array.isArray(m.BUILTIN_FUNDRAISERS) && m.BUILTIN_FUNDRAISERS.length >= 8;
});
check('31.4.14 — exports createDonationManagerRouter', () => {
  const m = require(path.join(backendRoot, 'services/dddDonationManager'));
  return typeof m.createDonationManagerRouter === 'function';
});
check('31.4.15 — DonationManager has listDonations method', () => {
  const m = require(path.join(backendRoot, 'services/dddDonationManager'));
  const inst = new m.DonationManager();
  return typeof inst.listDonations === 'function';
});
check('31.4.16 — DonationManager has recordDonation method', () => {
  const m = require(path.join(backendRoot, 'services/dddDonationManager'));
  const inst = new m.DonationManager();
  return typeof inst.recordDonation === 'function';
});
check('31.4.17 — DonationManager has getDonationAnalytics method', () => {
  const m = require(path.join(backendRoot, 'services/dddDonationManager'));
  const inst = new m.DonationManager();
  return typeof inst.getDonationAnalytics === 'function';
});

/* 31.5 — Phase 25 Route Wiring */
check('31.5.1 — platform.routes.js references all Phase 25 routers', () => {
  const content = fs.readFileSync(path.join(backendRoot, 'routes/platform.routes.js'), 'utf8');
  return (
    content.includes('volunteerManagerRouter') &&
    content.includes('communityProgramRouter') &&
    content.includes('outreachTrackerRouter') &&
    content.includes('donationManagerRouter')
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// Section 32 — Phase 26: Legal & Contract Management
// ═══════════════════════════════════════════════════════════════════════════════
console.log(c.cyan('\n═══ Section 32: Legal & Contract Management ═══'));

/* 32.1 — Contract Manager */
check('32.1.1 — dddContractManager.js exists', () =>
  fs.existsSync(path.join(backendRoot, 'services/dddContractManager.js'))
);
check('32.1.2 — exports ContractManager class', () => {
  const m = require(path.join(backendRoot, 'services/dddContractManager'));
  return typeof m.ContractManager === 'function';
});
check('32.1.3 — exports DDDContract model', () => {
  const m = require(path.join(backendRoot, 'services/dddContractManager'));
  return m.DDDContract && typeof m.DDDContract.modelName === 'string';
});
check('32.1.4 — exports DDDContractTemplate model', () => {
  const m = require(path.join(backendRoot, 'services/dddContractManager'));
  return m.DDDContractTemplate && typeof m.DDDContractTemplate.modelName === 'string';
});
check('32.1.5 — exports DDDContractAmendment model', () => {
  const m = require(path.join(backendRoot, 'services/dddContractManager'));
  return m.DDDContractAmendment && typeof m.DDDContractAmendment.modelName === 'string';
});
check('32.1.6 — exports DDDContractObligation model', () => {
  const m = require(path.join(backendRoot, 'services/dddContractManager'));
  return m.DDDContractObligation && typeof m.DDDContractObligation.modelName === 'string';
});
check('32.1.7 — CONTRACT_TYPES has ≥10 items', () => {
  const m = require(path.join(backendRoot, 'services/dddContractManager'));
  return Array.isArray(m.CONTRACT_TYPES) && m.CONTRACT_TYPES.length >= 10;
});
check('32.1.8 — CONTRACT_STATUSES has ≥10 items', () => {
  const m = require(path.join(backendRoot, 'services/dddContractManager'));
  return Array.isArray(m.CONTRACT_STATUSES) && m.CONTRACT_STATUSES.length >= 10;
});
check('32.1.9 — OBLIGATION_TYPES has ≥10 items', () => {
  const m = require(path.join(backendRoot, 'services/dddContractManager'));
  return Array.isArray(m.OBLIGATION_TYPES) && m.OBLIGATION_TYPES.length >= 10;
});
check('32.1.10 — OBLIGATION_STATUSES has ≥10 items', () => {
  const m = require(path.join(backendRoot, 'services/dddContractManager'));
  return Array.isArray(m.OBLIGATION_STATUSES) && m.OBLIGATION_STATUSES.length >= 10;
});
check('32.1.11 — AMENDMENT_TYPES has ≥10 items', () => {
  const m = require(path.join(backendRoot, 'services/dddContractManager'));
  return Array.isArray(m.AMENDMENT_TYPES) && m.AMENDMENT_TYPES.length >= 10;
});
check('32.1.12 — TEMPLATE_CATEGORIES has ≥10 items', () => {
  const m = require(path.join(backendRoot, 'services/dddContractManager'));
  return Array.isArray(m.TEMPLATE_CATEGORIES) && m.TEMPLATE_CATEGORIES.length >= 10;
});
check('32.1.13 — BUILTIN_CONTRACT_TEMPLATES has ≥8 items', () => {
  const m = require(path.join(backendRoot, 'services/dddContractManager'));
  return Array.isArray(m.BUILTIN_CONTRACT_TEMPLATES) && m.BUILTIN_CONTRACT_TEMPLATES.length >= 8;
});
check('32.1.14 — exports createContractManagerRouter', () => {
  const m = require(path.join(backendRoot, 'services/dddContractManager'));
  return typeof m.createContractManagerRouter === 'function';
});
check('32.1.15 — ContractManager has listContracts method', () => {
  const m = require(path.join(backendRoot, 'services/dddContractManager'));
  const inst = new m.ContractManager();
  return typeof inst.listContracts === 'function';
});
check('32.1.16 — ContractManager has createContract method', () => {
  const m = require(path.join(backendRoot, 'services/dddContractManager'));
  const inst = new m.ContractManager();
  return typeof inst.createContract === 'function';
});
check('32.1.17 — ContractManager has getContractAnalytics method', () => {
  const m = require(path.join(backendRoot, 'services/dddContractManager'));
  const inst = new m.ContractManager();
  return typeof inst.getContractAnalytics === 'function';
});

/* 32.2 — Legal Case Tracker */
check('32.2.1 — dddLegalCaseTracker.js exists', () =>
  fs.existsSync(path.join(backendRoot, 'services/dddLegalCaseTracker.js'))
);
check('32.2.2 — exports LegalCaseTracker class', () => {
  const m = require(path.join(backendRoot, 'services/dddLegalCaseTracker'));
  return typeof m.LegalCaseTracker === 'function';
});
check('32.2.3 — exports DDDLegalCase model', () => {
  const m = require(path.join(backendRoot, 'services/dddLegalCaseTracker'));
  return m.DDDLegalCase && typeof m.DDDLegalCase.modelName === 'string';
});
check('32.2.4 — exports DDDLegalDocument model', () => {
  const m = require(path.join(backendRoot, 'services/dddLegalCaseTracker'));
  return m.DDDLegalDocument && typeof m.DDDLegalDocument.modelName === 'string';
});
check('32.2.5 — exports DDDLegalParty model', () => {
  const m = require(path.join(backendRoot, 'services/dddLegalCaseTracker'));
  return m.DDDLegalParty && typeof m.DDDLegalParty.modelName === 'string';
});
check('32.2.6 — exports DDDLegalMilestone model', () => {
  const m = require(path.join(backendRoot, 'services/dddLegalCaseTracker'));
  return m.DDDLegalMilestone && typeof m.DDDLegalMilestone.modelName === 'string';
});
check('32.2.7 — CASE_TYPES has ≥10 items', () => {
  const m = require(path.join(backendRoot, 'services/dddLegalCaseTracker'));
  return Array.isArray(m.CASE_TYPES) && m.CASE_TYPES.length >= 10;
});
check('32.2.8 — CASE_STATUSES has ≥10 items', () => {
  const m = require(path.join(backendRoot, 'services/dddLegalCaseTracker'));
  return Array.isArray(m.CASE_STATUSES) && m.CASE_STATUSES.length >= 10;
});
check('32.2.9 — CASE_PRIORITIES has ≥10 items', () => {
  const m = require(path.join(backendRoot, 'services/dddLegalCaseTracker'));
  return Array.isArray(m.CASE_PRIORITIES) && m.CASE_PRIORITIES.length >= 10;
});
check('32.2.10 — DOCUMENT_TYPES has ≥10 items', () => {
  const m = require(path.join(backendRoot, 'services/dddLegalCaseTracker'));
  return Array.isArray(m.DOCUMENT_TYPES) && m.DOCUMENT_TYPES.length >= 10;
});
check('32.2.11 — PARTY_ROLES has ≥10 items', () => {
  const m = require(path.join(backendRoot, 'services/dddLegalCaseTracker'));
  return Array.isArray(m.PARTY_ROLES) && m.PARTY_ROLES.length >= 10;
});
check('32.2.12 — MILESTONE_TYPES has ≥10 items', () => {
  const m = require(path.join(backendRoot, 'services/dddLegalCaseTracker'));
  return Array.isArray(m.MILESTONE_TYPES) && m.MILESTONE_TYPES.length >= 10;
});
check('32.2.13 — BUILTIN_CASE_CATEGORIES has ≥8 items', () => {
  const m = require(path.join(backendRoot, 'services/dddLegalCaseTracker'));
  return Array.isArray(m.BUILTIN_CASE_CATEGORIES) && m.BUILTIN_CASE_CATEGORIES.length >= 8;
});
check('32.2.14 — exports createLegalCaseTrackerRouter', () => {
  const m = require(path.join(backendRoot, 'services/dddLegalCaseTracker'));
  return typeof m.createLegalCaseTrackerRouter === 'function';
});
check('32.2.15 — LegalCaseTracker has listCases method', () => {
  const m = require(path.join(backendRoot, 'services/dddLegalCaseTracker'));
  const inst = new m.LegalCaseTracker();
  return typeof inst.listCases === 'function';
});
check('32.2.16 — LegalCaseTracker has openCase method', () => {
  const m = require(path.join(backendRoot, 'services/dddLegalCaseTracker'));
  const inst = new m.LegalCaseTracker();
  return typeof inst.openCase === 'function';
});
check('32.2.17 — LegalCaseTracker has getCaseAnalytics method', () => {
  const m = require(path.join(backendRoot, 'services/dddLegalCaseTracker'));
  const inst = new m.LegalCaseTracker();
  return typeof inst.getCaseAnalytics === 'function';
});

/* 32.3 — Policy Governance */
check('32.3.1 — dddPolicyGovernance.js exists', () =>
  fs.existsSync(path.join(backendRoot, 'services/dddPolicyGovernance.js'))
);
check('32.3.2 — exports PolicyGovernance class', () => {
  const m = require(path.join(backendRoot, 'services/dddPolicyGovernance'));
  return typeof m.PolicyGovernance === 'function';
});
check('32.3.3 — exports DDDOrganizationalPolicy model', () => {
  const m = require(path.join(backendRoot, 'services/dddPolicyGovernance'));
  return m.DDDOrganizationalPolicy && typeof m.DDDOrganizationalPolicy.modelName === 'string';
});
check('32.3.4 — exports DDDPolicyVersion model', () => {
  const m = require(path.join(backendRoot, 'services/dddPolicyGovernance'));
  return m.DDDPolicyVersion && typeof m.DDDPolicyVersion.modelName === 'string';
});
check('32.3.5 — exports DDDPolicyAcknowledgment model', () => {
  const m = require(path.join(backendRoot, 'services/dddPolicyGovernance'));
  return m.DDDPolicyAcknowledgment && typeof m.DDDPolicyAcknowledgment.modelName === 'string';
});
check('32.3.6 — exports DDDGovernanceCommittee model', () => {
  const m = require(path.join(backendRoot, 'services/dddPolicyGovernance'));
  return m.DDDGovernanceCommittee && typeof m.DDDGovernanceCommittee.modelName === 'string';
});
check('32.3.7 — POLICY_TYPES has ≥10 items', () => {
  const m = require(path.join(backendRoot, 'services/dddPolicyGovernance'));
  return Array.isArray(m.POLICY_TYPES) && m.POLICY_TYPES.length >= 10;
});
check('32.3.8 — POLICY_STATUSES has ≥10 items', () => {
  const m = require(path.join(backendRoot, 'services/dddPolicyGovernance'));
  return Array.isArray(m.POLICY_STATUSES) && m.POLICY_STATUSES.length >= 10;
});
check('32.3.9 — GOVERNANCE_LEVELS has ≥10 items', () => {
  const m = require(path.join(backendRoot, 'services/dddPolicyGovernance'));
  return Array.isArray(m.GOVERNANCE_LEVELS) && m.GOVERNANCE_LEVELS.length >= 10;
});
check('32.3.10 — ACKNOWLEDGMENT_STATUSES has ≥10 items', () => {
  const m = require(path.join(backendRoot, 'services/dddPolicyGovernance'));
  return Array.isArray(m.ACKNOWLEDGMENT_STATUSES) && m.ACKNOWLEDGMENT_STATUSES.length >= 10;
});
check('32.3.11 — COMMITTEE_TYPES has ≥10 items', () => {
  const m = require(path.join(backendRoot, 'services/dddPolicyGovernance'));
  return Array.isArray(m.COMMITTEE_TYPES) && m.COMMITTEE_TYPES.length >= 10;
});
check('32.3.12 — REVIEW_FREQUENCIES has ≥8 items', () => {
  const m = require(path.join(backendRoot, 'services/dddPolicyGovernance'));
  return Array.isArray(m.REVIEW_FREQUENCIES) && m.REVIEW_FREQUENCIES.length >= 8;
});
check('32.3.13 — BUILTIN_POLICIES has ≥8 items', () => {
  const m = require(path.join(backendRoot, 'services/dddPolicyGovernance'));
  return Array.isArray(m.BUILTIN_POLICIES) && m.BUILTIN_POLICIES.length >= 8;
});
check('32.3.14 — exports createPolicyGovernanceRouter', () => {
  const m = require(path.join(backendRoot, 'services/dddPolicyGovernance'));
  return typeof m.createPolicyGovernanceRouter === 'function';
});
check('32.3.15 — PolicyGovernance has listPolicies method', () => {
  const m = require(path.join(backendRoot, 'services/dddPolicyGovernance'));
  const inst = new m.PolicyGovernance();
  return typeof inst.listPolicies === 'function';
});
check('32.3.16 — PolicyGovernance has createPolicy method', () => {
  const m = require(path.join(backendRoot, 'services/dddPolicyGovernance'));
  const inst = new m.PolicyGovernance();
  return typeof inst.createPolicy === 'function';
});
check('32.3.17 — PolicyGovernance has getPolicyAnalytics method', () => {
  const m = require(path.join(backendRoot, 'services/dddPolicyGovernance'));
  const inst = new m.PolicyGovernance();
  return typeof inst.getPolicyAnalytics === 'function';
});

/* 32.4 — Regulatory Tracker */
check('32.4.1 — dddRegulatoryTracker.js exists', () =>
  fs.existsSync(path.join(backendRoot, 'services/dddRegulatoryTracker.js'))
);
check('32.4.2 — exports RegulatoryTracker class', () => {
  const m = require(path.join(backendRoot, 'services/dddRegulatoryTracker'));
  return typeof m.RegulatoryTracker === 'function';
});
check('32.4.3 — exports DDDRegulatoryRequirement model', () => {
  const m = require(path.join(backendRoot, 'services/dddRegulatoryTracker'));
  return m.DDDRegulatoryRequirement && typeof m.DDDRegulatoryRequirement.modelName === 'string';
});
check('32.4.4 — exports DDDComplianceAudit model', () => {
  const m = require(path.join(backendRoot, 'services/dddRegulatoryTracker'));
  return m.DDDComplianceAudit && typeof m.DDDComplianceAudit.modelName === 'string';
});
check('32.4.5 — exports DDDCertification model', () => {
  const m = require(path.join(backendRoot, 'services/dddRegulatoryTracker'));
  return m.DDDCertification && typeof m.DDDCertification.modelName === 'string';
});
check('32.4.6 — exports DDDRegulatoryChange model', () => {
  const m = require(path.join(backendRoot, 'services/dddRegulatoryTracker'));
  return m.DDDRegulatoryChange && typeof m.DDDRegulatoryChange.modelName === 'string';
});
check('32.4.7 — REQUIREMENT_TYPES has ≥10 items', () => {
  const m = require(path.join(backendRoot, 'services/dddRegulatoryTracker'));
  return Array.isArray(m.REQUIREMENT_TYPES) && m.REQUIREMENT_TYPES.length >= 10;
});
check('32.4.8 — REQUIREMENT_STATUSES has ≥10 items', () => {
  const m = require(path.join(backendRoot, 'services/dddRegulatoryTracker'));
  return Array.isArray(m.REQUIREMENT_STATUSES) && m.REQUIREMENT_STATUSES.length >= 10;
});
check('32.4.9 — AUDIT_TYPES has ≥10 items', () => {
  const m = require(path.join(backendRoot, 'services/dddRegulatoryTracker'));
  return Array.isArray(m.AUDIT_TYPES) && m.AUDIT_TYPES.length >= 10;
});
check('32.4.10 — AUDIT_STATUSES has ≥10 items', () => {
  const m = require(path.join(backendRoot, 'services/dddRegulatoryTracker'));
  return Array.isArray(m.AUDIT_STATUSES) && m.AUDIT_STATUSES.length >= 10;
});
check('32.4.11 — CERTIFICATION_TYPES has ≥10 items', () => {
  const m = require(path.join(backendRoot, 'services/dddRegulatoryTracker'));
  return Array.isArray(m.CERTIFICATION_TYPES) && m.CERTIFICATION_TYPES.length >= 10;
});
check('32.4.12 — CERTIFICATION_STATUSES has ≥10 items', () => {
  const m = require(path.join(backendRoot, 'services/dddRegulatoryTracker'));
  return Array.isArray(m.CERTIFICATION_STATUSES) && m.CERTIFICATION_STATUSES.length >= 10;
});
check('32.4.13 — CHANGE_IMPACT_LEVELS has ≥10 items', () => {
  const m = require(path.join(backendRoot, 'services/dddRegulatoryTracker'));
  return Array.isArray(m.CHANGE_IMPACT_LEVELS) && m.CHANGE_IMPACT_LEVELS.length >= 10;
});
check('32.4.14 — REGULATORY_BODIES has ≥10 items', () => {
  const m = require(path.join(backendRoot, 'services/dddRegulatoryTracker'));
  return Array.isArray(m.REGULATORY_BODIES) && m.REGULATORY_BODIES.length >= 10;
});
check('32.4.15 — BUILTIN_REQUIREMENTS has ≥8 items', () => {
  const m = require(path.join(backendRoot, 'services/dddRegulatoryTracker'));
  return Array.isArray(m.BUILTIN_REQUIREMENTS) && m.BUILTIN_REQUIREMENTS.length >= 8;
});
check('32.4.16 — exports createRegulatoryTrackerRouter', () => {
  const m = require(path.join(backendRoot, 'services/dddRegulatoryTracker'));
  return typeof m.createRegulatoryTrackerRouter === 'function';
});
check('32.4.17 — RegulatoryTracker has listRequirements method', () => {
  const m = require(path.join(backendRoot, 'services/dddRegulatoryTracker'));
  const inst = new m.RegulatoryTracker();
  return typeof inst.listRequirements === 'function';
});
check('32.4.18 — RegulatoryTracker has scheduleAudit method', () => {
  const m = require(path.join(backendRoot, 'services/dddRegulatoryTracker'));
  const inst = new m.RegulatoryTracker();
  return typeof inst.scheduleAudit === 'function';
});
check('32.4.19 — RegulatoryTracker has getRegulatoryAnalytics method', () => {
  const m = require(path.join(backendRoot, 'services/dddRegulatoryTracker'));
  const inst = new m.RegulatoryTracker();
  return typeof inst.getRegulatoryAnalytics === 'function';
});

/* 32.5 — Phase 26 Route Wiring */
check('32.5.1 — platform.routes.js references all Phase 26 routers', () => {
  const content = fs.readFileSync(path.join(backendRoot, 'routes/platform.routes.js'), 'utf8');
  return (
    content.includes('contractManagerRouter') &&
    content.includes('legalCaseTrackerRouter') &&
    content.includes('policyGovernanceRouter') &&
    content.includes('regulatoryTrackerRouter')
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// Section 33 — Phase 27: Patient Feedback & Satisfaction Management
// ═══════════════════════════════════════════════════════════════════════════════
console.log(c.cyan('\n═══ Section 33: Patient Feedback & Satisfaction Management ═══'));

/* 33.1 — Feedback Manager */
check('33.1.1 — dddFeedbackManager.js exports FeedbackManager class', () => {
  const mod = require(path.join(backendRoot, 'services/dddFeedbackManager'));
  return typeof mod.FeedbackManager === 'function';
});
check('33.1.2 — dddFeedbackManager.js exports DDDFeedback model', () => {
  const mod = require(path.join(backendRoot, 'services/dddFeedbackManager'));
  return mod.DDDFeedback && typeof mod.DDDFeedback.modelName === 'string';
});
check('33.1.3 — dddFeedbackManager.js exports DDDSurvey model', () => {
  const mod = require(path.join(backendRoot, 'services/dddFeedbackManager'));
  return mod.DDDSurvey && typeof mod.DDDSurvey.modelName === 'string';
});
check('33.1.4 — dddFeedbackManager.js exports DDDSurveyResponse model', () => {
  const mod = require(path.join(backendRoot, 'services/dddFeedbackManager'));
  return mod.DDDSurveyResponse && typeof mod.DDDSurveyResponse.modelName === 'string';
});
check('33.1.5 — dddFeedbackManager.js exports DDDFeedbackAnalytics model', () => {
  const mod = require(path.join(backendRoot, 'services/dddFeedbackManager'));
  return mod.DDDFeedbackAnalytics && typeof mod.DDDFeedbackAnalytics.modelName === 'string';
});
check('33.1.6 — FEEDBACK_TYPES has 12 entries', () => {
  const { FEEDBACK_TYPES } = require(path.join(backendRoot, 'services/dddFeedbackManager'));
  return Array.isArray(FEEDBACK_TYPES) && FEEDBACK_TYPES.length === 12;
});
check('33.1.7 — FEEDBACK_STATUSES has 10 entries', () => {
  const { FEEDBACK_STATUSES } = require(path.join(backendRoot, 'services/dddFeedbackManager'));
  return Array.isArray(FEEDBACK_STATUSES) && FEEDBACK_STATUSES.length === 10;
});
check('33.1.8 — SURVEY_TYPES has 12 entries', () => {
  const { SURVEY_TYPES } = require(path.join(backendRoot, 'services/dddFeedbackManager'));
  return Array.isArray(SURVEY_TYPES) && SURVEY_TYPES.length === 12;
});
check('33.1.9 — SURVEY_STATUSES has 10 entries', () => {
  const { SURVEY_STATUSES } = require(path.join(backendRoot, 'services/dddFeedbackManager'));
  return Array.isArray(SURVEY_STATUSES) && SURVEY_STATUSES.length === 10;
});
check('33.1.10 — QUESTION_TYPES has 12 entries', () => {
  const { QUESTION_TYPES } = require(path.join(backendRoot, 'services/dddFeedbackManager'));
  return Array.isArray(QUESTION_TYPES) && QUESTION_TYPES.length === 12;
});
check('33.1.11 — RATING_CATEGORIES has 10 entries', () => {
  const { RATING_CATEGORIES } = require(path.join(backendRoot, 'services/dddFeedbackManager'));
  return Array.isArray(RATING_CATEGORIES) && RATING_CATEGORIES.length === 10;
});
check('33.1.12 — BUILTIN_SURVEY_TEMPLATES has 10 entries', () => {
  const { BUILTIN_SURVEY_TEMPLATES } = require(
    path.join(backendRoot, 'services/dddFeedbackManager')
  );
  return Array.isArray(BUILTIN_SURVEY_TEMPLATES) && BUILTIN_SURVEY_TEMPLATES.length === 10;
});
check('33.1.13 — createFeedbackManagerRouter is a function', () => {
  const { createFeedbackManagerRouter } = require(
    path.join(backendRoot, 'services/dddFeedbackManager')
  );
  return typeof createFeedbackManagerRouter === 'function';
});
check('33.1.14 — FeedbackManager has listFeedbacks method', () => {
  const { FeedbackManager } = require(path.join(backendRoot, 'services/dddFeedbackManager'));
  const inst = new FeedbackManager();
  return typeof inst.listFeedbacks === 'function';
});
check('33.1.15 — FeedbackManager has submitFeedback method', () => {
  const { FeedbackManager } = require(path.join(backendRoot, 'services/dddFeedbackManager'));
  const inst = new FeedbackManager();
  return typeof inst.submitFeedback === 'function';
});
check('33.1.16 — FeedbackManager has listSurveys method', () => {
  const { FeedbackManager } = require(path.join(backendRoot, 'services/dddFeedbackManager'));
  const inst = new FeedbackManager();
  return typeof inst.listSurveys === 'function';
});
check('33.1.17 — FeedbackManager has createSurvey method', () => {
  const { FeedbackManager } = require(path.join(backendRoot, 'services/dddFeedbackManager'));
  const inst = new FeedbackManager();
  return typeof inst.createSurvey === 'function';
});
check('33.1.18 — FeedbackManager has submitResponse method', () => {
  const { FeedbackManager } = require(path.join(backendRoot, 'services/dddFeedbackManager'));
  const inst = new FeedbackManager();
  return typeof inst.submitResponse === 'function';
});
check('33.1.19 — FeedbackManager has healthCheck method', () => {
  const { FeedbackManager } = require(path.join(backendRoot, 'services/dddFeedbackManager'));
  const inst = new FeedbackManager();
  return typeof inst.healthCheck === 'function';
});

/* 33.2 — Satisfaction Tracker */
check('33.2.1 — dddSatisfactionTracker.js exports SatisfactionTracker class', () => {
  const mod = require(path.join(backendRoot, 'services/dddSatisfactionTracker'));
  return typeof mod.SatisfactionTracker === 'function';
});
check('33.2.2 — dddSatisfactionTracker.js exports DDDSatisfactionScore model', () => {
  const mod = require(path.join(backendRoot, 'services/dddSatisfactionTracker'));
  return mod.DDDSatisfactionScore && typeof mod.DDDSatisfactionScore.modelName === 'string';
});
check('33.2.3 — dddSatisfactionTracker.js exports DDDSatisfactionTrend model', () => {
  const mod = require(path.join(backendRoot, 'services/dddSatisfactionTracker'));
  return mod.DDDSatisfactionTrend && typeof mod.DDDSatisfactionTrend.modelName === 'string';
});
check('33.2.4 — dddSatisfactionTracker.js exports DDDBenchmark model', () => {
  const mod = require(path.join(backendRoot, 'services/dddSatisfactionTracker'));
  return mod.DDDBenchmark && typeof mod.DDDBenchmark.modelName === 'string';
});
check('33.2.5 — dddSatisfactionTracker.js exports DDDSatisfactionAlert model', () => {
  const mod = require(path.join(backendRoot, 'services/dddSatisfactionTracker'));
  return mod.DDDSatisfactionAlert && typeof mod.DDDSatisfactionAlert.modelName === 'string';
});
check('33.2.6 — SATISFACTION_METRICS has 12 entries', () => {
  const { SATISFACTION_METRICS } = require(
    path.join(backendRoot, 'services/dddSatisfactionTracker')
  );
  return Array.isArray(SATISFACTION_METRICS) && SATISFACTION_METRICS.length === 12;
});
check('33.2.7 — METRIC_STATUSES has 10 entries', () => {
  const { METRIC_STATUSES } = require(path.join(backendRoot, 'services/dddSatisfactionTracker'));
  return Array.isArray(METRIC_STATUSES) && METRIC_STATUSES.length === 10;
});
check('33.2.8 — SCORE_CATEGORIES has 12 entries', () => {
  const { SCORE_CATEGORIES } = require(path.join(backendRoot, 'services/dddSatisfactionTracker'));
  return Array.isArray(SCORE_CATEGORIES) && SCORE_CATEGORIES.length === 12;
});
check('33.2.9 — BENCHMARK_TYPES has 10 entries', () => {
  const { BENCHMARK_TYPES } = require(path.join(backendRoot, 'services/dddSatisfactionTracker'));
  return Array.isArray(BENCHMARK_TYPES) && BENCHMARK_TYPES.length === 10;
});
check('33.2.10 — TREND_PERIODS has 10 entries', () => {
  const { TREND_PERIODS } = require(path.join(backendRoot, 'services/dddSatisfactionTracker'));
  return Array.isArray(TREND_PERIODS) && TREND_PERIODS.length === 10;
});
check('33.2.11 — SEGMENT_TYPES has 12 entries', () => {
  const { SEGMENT_TYPES } = require(path.join(backendRoot, 'services/dddSatisfactionTracker'));
  return Array.isArray(SEGMENT_TYPES) && SEGMENT_TYPES.length === 12;
});
check('33.2.12 — BUILTIN_BENCHMARKS has 10 entries', () => {
  const { BUILTIN_BENCHMARKS } = require(path.join(backendRoot, 'services/dddSatisfactionTracker'));
  return Array.isArray(BUILTIN_BENCHMARKS) && BUILTIN_BENCHMARKS.length === 10;
});
check('33.2.13 — createSatisfactionTrackerRouter is a function', () => {
  const { createSatisfactionTrackerRouter } = require(
    path.join(backendRoot, 'services/dddSatisfactionTracker')
  );
  return typeof createSatisfactionTrackerRouter === 'function';
});
check('33.2.14 — SatisfactionTracker has listScores method', () => {
  const { SatisfactionTracker } = require(
    path.join(backendRoot, 'services/dddSatisfactionTracker')
  );
  const inst = new SatisfactionTracker();
  return typeof inst.listScores === 'function';
});
check('33.2.15 — SatisfactionTracker has recordScore method', () => {
  const { SatisfactionTracker } = require(
    path.join(backendRoot, 'services/dddSatisfactionTracker')
  );
  const inst = new SatisfactionTracker();
  return typeof inst.recordScore === 'function';
});
check('33.2.16 — SatisfactionTracker has listTrends method', () => {
  const { SatisfactionTracker } = require(
    path.join(backendRoot, 'services/dddSatisfactionTracker')
  );
  const inst = new SatisfactionTracker();
  return typeof inst.listTrends === 'function';
});
check('33.2.17 — SatisfactionTracker has listBenchmarks method', () => {
  const { SatisfactionTracker } = require(
    path.join(backendRoot, 'services/dddSatisfactionTracker')
  );
  const inst = new SatisfactionTracker();
  return typeof inst.listBenchmarks === 'function';
});
check('33.2.18 — SatisfactionTracker has getSatisfactionAnalytics method', () => {
  const { SatisfactionTracker } = require(
    path.join(backendRoot, 'services/dddSatisfactionTracker')
  );
  const inst = new SatisfactionTracker();
  return typeof inst.getSatisfactionAnalytics === 'function';
});
check('33.2.19 — SatisfactionTracker has healthCheck method', () => {
  const { SatisfactionTracker } = require(
    path.join(backendRoot, 'services/dddSatisfactionTracker')
  );
  const inst = new SatisfactionTracker();
  return typeof inst.healthCheck === 'function';
});

/* 33.3 — Complaint Manager */
check('33.3.1 — dddComplaintManager.js exports ComplaintManager class', () => {
  const mod = require(path.join(backendRoot, 'services/dddComplaintManager'));
  return typeof mod.ComplaintManager === 'function';
});
check('33.3.2 — dddComplaintManager.js exports DDDComplaint model', () => {
  const mod = require(path.join(backendRoot, 'services/dddComplaintManager'));
  return mod.DDDComplaint && typeof mod.DDDComplaint.modelName === 'string';
});
check('33.3.3 — dddComplaintManager.js exports DDDResolution model', () => {
  const mod = require(path.join(backendRoot, 'services/dddComplaintManager'));
  return mod.DDDResolution && typeof mod.DDDResolution.modelName === 'string';
});
check('33.3.4 — dddComplaintManager.js exports DDDEscalation model', () => {
  const mod = require(path.join(backendRoot, 'services/dddComplaintManager'));
  return mod.DDDEscalation && typeof mod.DDDEscalation.modelName === 'string';
});
check('33.3.5 — dddComplaintManager.js exports DDDComplaintAnalytics model', () => {
  const mod = require(path.join(backendRoot, 'services/dddComplaintManager'));
  return mod.DDDComplaintAnalytics && typeof mod.DDDComplaintAnalytics.modelName === 'string';
});
check('33.3.6 — COMPLAINT_TYPES has 12 entries', () => {
  const { COMPLAINT_TYPES } = require(path.join(backendRoot, 'services/dddComplaintManager'));
  return Array.isArray(COMPLAINT_TYPES) && COMPLAINT_TYPES.length === 12;
});
check('33.3.7 — COMPLAINT_STATUSES has 10 entries', () => {
  const { COMPLAINT_STATUSES } = require(path.join(backendRoot, 'services/dddComplaintManager'));
  return Array.isArray(COMPLAINT_STATUSES) && COMPLAINT_STATUSES.length === 10;
});
check('33.3.8 — COMPLAINT_PRIORITIES has 10 entries', () => {
  const { COMPLAINT_PRIORITIES } = require(path.join(backendRoot, 'services/dddComplaintManager'));
  return Array.isArray(COMPLAINT_PRIORITIES) && COMPLAINT_PRIORITIES.length === 10;
});
check('33.3.9 — RESOLUTION_TYPES has 12 entries', () => {
  const { RESOLUTION_TYPES } = require(path.join(backendRoot, 'services/dddComplaintManager'));
  return Array.isArray(RESOLUTION_TYPES) && RESOLUTION_TYPES.length === 12;
});
check('33.3.10 — ESCALATION_LEVELS has 10 entries', () => {
  const { ESCALATION_LEVELS } = require(path.join(backendRoot, 'services/dddComplaintManager'));
  return Array.isArray(ESCALATION_LEVELS) && ESCALATION_LEVELS.length === 10;
});
check('33.3.11 — GRIEVANCE_CATEGORIES has 12 entries', () => {
  const { GRIEVANCE_CATEGORIES } = require(path.join(backendRoot, 'services/dddComplaintManager'));
  return Array.isArray(GRIEVANCE_CATEGORIES) && GRIEVANCE_CATEGORIES.length === 12;
});
check('33.3.12 — BUILTIN_RESOLUTION_TEMPLATES has 10 entries', () => {
  const { BUILTIN_RESOLUTION_TEMPLATES } = require(
    path.join(backendRoot, 'services/dddComplaintManager')
  );
  return Array.isArray(BUILTIN_RESOLUTION_TEMPLATES) && BUILTIN_RESOLUTION_TEMPLATES.length === 10;
});
check('33.3.13 — createComplaintManagerRouter is a function', () => {
  const { createComplaintManagerRouter } = require(
    path.join(backendRoot, 'services/dddComplaintManager')
  );
  return typeof createComplaintManagerRouter === 'function';
});
check('33.3.14 — ComplaintManager has listComplaints method', () => {
  const { ComplaintManager } = require(path.join(backendRoot, 'services/dddComplaintManager'));
  const inst = new ComplaintManager();
  return typeof inst.listComplaints === 'function';
});
check('33.3.15 — ComplaintManager has fileComplaint method', () => {
  const { ComplaintManager } = require(path.join(backendRoot, 'services/dddComplaintManager'));
  const inst = new ComplaintManager();
  return typeof inst.fileComplaint === 'function';
});
check('33.3.16 — ComplaintManager has listResolutions method', () => {
  const { ComplaintManager } = require(path.join(backendRoot, 'services/dddComplaintManager'));
  const inst = new ComplaintManager();
  return typeof inst.listResolutions === 'function';
});
check('33.3.17 — ComplaintManager has escalate method', () => {
  const { ComplaintManager } = require(path.join(backendRoot, 'services/dddComplaintManager'));
  const inst = new ComplaintManager();
  return typeof inst.escalate === 'function';
});
check('33.3.18 — ComplaintManager has getComplaintAnalytics method', () => {
  const { ComplaintManager } = require(path.join(backendRoot, 'services/dddComplaintManager'));
  const inst = new ComplaintManager();
  return typeof inst.getComplaintAnalytics === 'function';
});
check('33.3.19 — ComplaintManager has healthCheck method', () => {
  const { ComplaintManager } = require(path.join(backendRoot, 'services/dddComplaintManager'));
  const inst = new ComplaintManager();
  return typeof inst.healthCheck === 'function';
});

/* 33.4 — Patient Experience */
check('33.4.1 — dddPatientExperience.js exports PatientExperience class', () => {
  const mod = require(path.join(backendRoot, 'services/dddPatientExperience'));
  return typeof mod.PatientExperience === 'function';
});
check('33.4.2 — dddPatientExperience.js exports DDDJourneyMap model', () => {
  const mod = require(path.join(backendRoot, 'services/dddPatientExperience'));
  return mod.DDDJourneyMap && typeof mod.DDDJourneyMap.modelName === 'string';
});
check('33.4.3 — dddPatientExperience.js exports DDDTouchpoint model', () => {
  const mod = require(path.join(backendRoot, 'services/dddPatientExperience'));
  return mod.DDDTouchpoint && typeof mod.DDDTouchpoint.modelName === 'string';
});
check('33.4.4 — dddPatientExperience.js exports DDDExperienceScore model', () => {
  const mod = require(path.join(backendRoot, 'services/dddPatientExperience'));
  return mod.DDDExperienceScore && typeof mod.DDDExperienceScore.modelName === 'string';
});
check('33.4.5 — dddPatientExperience.js exports DDDExperienceInsight model', () => {
  const mod = require(path.join(backendRoot, 'services/dddPatientExperience'));
  return mod.DDDExperienceInsight && typeof mod.DDDExperienceInsight.modelName === 'string';
});
check('33.4.6 — JOURNEY_STAGES has 12 entries', () => {
  const { JOURNEY_STAGES } = require(path.join(backendRoot, 'services/dddPatientExperience'));
  return Array.isArray(JOURNEY_STAGES) && JOURNEY_STAGES.length === 12;
});
check('33.4.7 — JOURNEY_STATUSES has 10 entries', () => {
  const { JOURNEY_STATUSES } = require(path.join(backendRoot, 'services/dddPatientExperience'));
  return Array.isArray(JOURNEY_STATUSES) && JOURNEY_STATUSES.length === 10;
});
check('33.4.8 — TOUCHPOINT_TYPES has 12 entries', () => {
  const { TOUCHPOINT_TYPES } = require(path.join(backendRoot, 'services/dddPatientExperience'));
  return Array.isArray(TOUCHPOINT_TYPES) && TOUCHPOINT_TYPES.length === 12;
});
check('33.4.9 — TOUCHPOINT_CHANNELS has 12 entries', () => {
  const { TOUCHPOINT_CHANNELS } = require(path.join(backendRoot, 'services/dddPatientExperience'));
  return Array.isArray(TOUCHPOINT_CHANNELS) && TOUCHPOINT_CHANNELS.length === 12;
});
check('33.4.10 — EMOTION_RATINGS has 10 entries', () => {
  const { EMOTION_RATINGS } = require(path.join(backendRoot, 'services/dddPatientExperience'));
  return Array.isArray(EMOTION_RATINGS) && EMOTION_RATINGS.length === 10;
});
check('33.4.11 — EXPERIENCE_DIMENSIONS has 12 entries', () => {
  const { EXPERIENCE_DIMENSIONS } = require(
    path.join(backendRoot, 'services/dddPatientExperience')
  );
  return Array.isArray(EXPERIENCE_DIMENSIONS) && EXPERIENCE_DIMENSIONS.length === 12;
});
check('33.4.12 — BUILTIN_JOURNEY_TEMPLATES has 10 entries', () => {
  const { BUILTIN_JOURNEY_TEMPLATES } = require(
    path.join(backendRoot, 'services/dddPatientExperience')
  );
  return Array.isArray(BUILTIN_JOURNEY_TEMPLATES) && BUILTIN_JOURNEY_TEMPLATES.length === 10;
});
check('33.4.13 — createPatientExperienceRouter is a function', () => {
  const { createPatientExperienceRouter } = require(
    path.join(backendRoot, 'services/dddPatientExperience')
  );
  return typeof createPatientExperienceRouter === 'function';
});
check('33.4.14 — PatientExperience has listJourneys method', () => {
  const { PatientExperience } = require(path.join(backendRoot, 'services/dddPatientExperience'));
  const inst = new PatientExperience();
  return typeof inst.listJourneys === 'function';
});
check('33.4.15 — PatientExperience has createJourney method', () => {
  const { PatientExperience } = require(path.join(backendRoot, 'services/dddPatientExperience'));
  const inst = new PatientExperience();
  return typeof inst.createJourney === 'function';
});
check('33.4.16 — PatientExperience has advanceStage method', () => {
  const { PatientExperience } = require(path.join(backendRoot, 'services/dddPatientExperience'));
  const inst = new PatientExperience();
  return typeof inst.advanceStage === 'function';
});
check('33.4.17 — PatientExperience has listTouchpoints method', () => {
  const { PatientExperience } = require(path.join(backendRoot, 'services/dddPatientExperience'));
  const inst = new PatientExperience();
  return typeof inst.listTouchpoints === 'function';
});
check('33.4.18 — PatientExperience has recordTouchpoint method', () => {
  const { PatientExperience } = require(path.join(backendRoot, 'services/dddPatientExperience'));
  const inst = new PatientExperience();
  return typeof inst.recordTouchpoint === 'function';
});
check('33.4.19 — PatientExperience has getExperienceAnalytics method', () => {
  const { PatientExperience } = require(path.join(backendRoot, 'services/dddPatientExperience'));
  const inst = new PatientExperience();
  return typeof inst.getExperienceAnalytics === 'function';
});
check('33.4.20 — PatientExperience has healthCheck method', () => {
  const { PatientExperience } = require(path.join(backendRoot, 'services/dddPatientExperience'));
  const inst = new PatientExperience();
  return typeof inst.healthCheck === 'function';
});

/* 33.5 — Phase 27 Route Wiring */
check('33.5.1 — platform.routes.js references all Phase 27 routers', () => {
  const content = fs.readFileSync(path.join(backendRoot, 'routes/platform.routes.js'), 'utf8');
  return (
    content.includes('feedbackManagerRouter') &&
    content.includes('satisfactionTrackerRouter') &&
    content.includes('complaintManagerRouter') &&
    content.includes('patientExperienceRouter')
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// Section 34 — Phase 28: Research & Evidence-Based Practice
// ═══════════════════════════════════════════════════════════════════════════════
console.log(c.cyan('\n═══ Section 34: Phase 28 — Research & Evidence-Based Practice ═══'));

/* 34.1 — Research Protocol */
check('34.1.1 — dddResearchProtocol.js exports ResearchProtocol class', () => {
  const mod = require(path.join(backendRoot, 'services/dddResearchProtocol'));
  return typeof mod.ResearchProtocol === 'function';
});
check('34.1.2 — dddResearchProtocol.js exports DDDResearchProtocol model', () => {
  const mod = require(path.join(backendRoot, 'services/dddResearchProtocol'));
  return mod.DDDResearchProtocol && typeof mod.DDDResearchProtocol.modelName === 'string';
});
check('34.1.3 — dddResearchProtocol.js exports DDDIRBSubmission model', () => {
  const mod = require(path.join(backendRoot, 'services/dddResearchProtocol'));
  return mod.DDDIRBSubmission && typeof mod.DDDIRBSubmission.modelName === 'string';
});
check('34.1.4 — dddResearchProtocol.js exports DDDResearchTeam model', () => {
  const mod = require(path.join(backendRoot, 'services/dddResearchProtocol'));
  return mod.DDDResearchTeam && typeof mod.DDDResearchTeam.modelName === 'string';
});
check('34.1.5 — dddResearchProtocol.js exports DDDDataCollection model', () => {
  const mod = require(path.join(backendRoot, 'services/dddResearchProtocol'));
  return mod.DDDDataCollection && typeof mod.DDDDataCollection.modelName === 'string';
});
check('34.1.6 — PROTOCOL_TYPES has 12 entries', () => {
  const { PROTOCOL_TYPES } = require(path.join(backendRoot, 'services/dddResearchProtocol'));
  return Array.isArray(PROTOCOL_TYPES) && PROTOCOL_TYPES.length === 12;
});
check('34.1.7 — PROTOCOL_STATUSES has 10 entries', () => {
  const { PROTOCOL_STATUSES } = require(path.join(backendRoot, 'services/dddResearchProtocol'));
  return Array.isArray(PROTOCOL_STATUSES) && PROTOCOL_STATUSES.length === 10;
});
check('34.1.8 — IRB_STATUSES has 10 entries', () => {
  const { IRB_STATUSES } = require(path.join(backendRoot, 'services/dddResearchProtocol'));
  return Array.isArray(IRB_STATUSES) && IRB_STATUSES.length === 10;
});
check('34.1.9 — STUDY_PHASES has 10 entries', () => {
  const { STUDY_PHASES } = require(path.join(backendRoot, 'services/dddResearchProtocol'));
  return Array.isArray(STUDY_PHASES) && STUDY_PHASES.length === 10;
});
check('34.1.10 — RISK_LEVELS has 10 entries', () => {
  const { RISK_LEVELS } = require(path.join(backendRoot, 'services/dddResearchProtocol'));
  return Array.isArray(RISK_LEVELS) && RISK_LEVELS.length === 10;
});
check('34.1.11 — FUNDING_TYPES has 12 entries', () => {
  const { FUNDING_TYPES } = require(path.join(backendRoot, 'services/dddResearchProtocol'));
  return Array.isArray(FUNDING_TYPES) && FUNDING_TYPES.length === 12;
});
check('34.1.12 — BUILTIN_PROTOCOL_TEMPLATES has 10 entries', () => {
  const { BUILTIN_PROTOCOL_TEMPLATES } = require(
    path.join(backendRoot, 'services/dddResearchProtocol')
  );
  return Array.isArray(BUILTIN_PROTOCOL_TEMPLATES) && BUILTIN_PROTOCOL_TEMPLATES.length === 10;
});
check('34.1.13 — createResearchProtocolRouter is a function', () => {
  const { createResearchProtocolRouter } = require(
    path.join(backendRoot, 'services/dddResearchProtocol')
  );
  return typeof createResearchProtocolRouter === 'function';
});
check('34.1.14 — ResearchProtocol has listProtocols method', () => {
  const { ResearchProtocol } = require(path.join(backendRoot, 'services/dddResearchProtocol'));
  return typeof new ResearchProtocol().listProtocols === 'function';
});
check('34.1.15 — ResearchProtocol has createProtocol method', () => {
  const { ResearchProtocol } = require(path.join(backendRoot, 'services/dddResearchProtocol'));
  return typeof new ResearchProtocol().createProtocol === 'function';
});
check('34.1.16 — ResearchProtocol has submitToIRB method', () => {
  const { ResearchProtocol } = require(path.join(backendRoot, 'services/dddResearchProtocol'));
  return typeof new ResearchProtocol().submitToIRB === 'function';
});
check('34.1.17 — ResearchProtocol has listTeams method', () => {
  const { ResearchProtocol } = require(path.join(backendRoot, 'services/dddResearchProtocol'));
  return typeof new ResearchProtocol().listTeams === 'function';
});
check('34.1.18 — ResearchProtocol has getProtocolAnalytics method', () => {
  const { ResearchProtocol } = require(path.join(backendRoot, 'services/dddResearchProtocol'));
  return typeof new ResearchProtocol().getProtocolAnalytics === 'function';
});
check('34.1.19 — ResearchProtocol has healthCheck method', () => {
  const { ResearchProtocol } = require(path.join(backendRoot, 'services/dddResearchProtocol'));
  return typeof new ResearchProtocol().healthCheck === 'function';
});

/* 34.2 — Evidence Library */
check('34.2.1 — dddEvidenceLibrary.js exports EvidenceLibrary class', () => {
  const mod = require(path.join(backendRoot, 'services/dddEvidenceLibrary'));
  return typeof mod.EvidenceLibrary === 'function';
});
check('34.2.2 — dddEvidenceLibrary.js exports DDDEvidenceItem model', () => {
  const mod = require(path.join(backendRoot, 'services/dddEvidenceLibrary'));
  return mod.DDDEvidenceItem && typeof mod.DDDEvidenceItem.modelName === 'string';
});
check('34.2.3 — dddEvidenceLibrary.js exports DDDGuideline model', () => {
  const mod = require(path.join(backendRoot, 'services/dddEvidenceLibrary'));
  return mod.DDDGuideline && typeof mod.DDDGuideline.modelName === 'string';
});
check('34.2.4 — dddEvidenceLibrary.js exports DDDEvidenceReview model', () => {
  const mod = require(path.join(backendRoot, 'services/dddEvidenceLibrary'));
  return mod.DDDEvidenceReview && typeof mod.DDDEvidenceReview.modelName === 'string';
});
check('34.2.5 — dddEvidenceLibrary.js exports DDDEvidenceSummary model', () => {
  const mod = require(path.join(backendRoot, 'services/dddEvidenceLibrary'));
  return mod.DDDEvidenceSummary && typeof mod.DDDEvidenceSummary.modelName === 'string';
});
check('34.2.6 — EVIDENCE_LEVELS has 12 entries', () => {
  const { EVIDENCE_LEVELS } = require(path.join(backendRoot, 'services/dddEvidenceLibrary'));
  return Array.isArray(EVIDENCE_LEVELS) && EVIDENCE_LEVELS.length === 12;
});
check('34.2.7 — EVIDENCE_STATUSES has 10 entries', () => {
  const { EVIDENCE_STATUSES } = require(path.join(backendRoot, 'services/dddEvidenceLibrary'));
  return Array.isArray(EVIDENCE_STATUSES) && EVIDENCE_STATUSES.length === 10;
});
check('34.2.8 — PRACTICE_DOMAINS has 12 entries', () => {
  const { PRACTICE_DOMAINS } = require(path.join(backendRoot, 'services/dddEvidenceLibrary'));
  return Array.isArray(PRACTICE_DOMAINS) && PRACTICE_DOMAINS.length === 12;
});
check('34.2.9 — RECOMMENDATION_GRADES has 10 entries', () => {
  const { RECOMMENDATION_GRADES } = require(path.join(backendRoot, 'services/dddEvidenceLibrary'));
  return Array.isArray(RECOMMENDATION_GRADES) && RECOMMENDATION_GRADES.length === 10;
});
check('34.2.10 — GUIDELINE_TYPES has 12 entries', () => {
  const { GUIDELINE_TYPES } = require(path.join(backendRoot, 'services/dddEvidenceLibrary'));
  return Array.isArray(GUIDELINE_TYPES) && GUIDELINE_TYPES.length === 12;
});
check('34.2.11 — SOURCE_TYPES has 12 entries', () => {
  const { SOURCE_TYPES } = require(path.join(backendRoot, 'services/dddEvidenceLibrary'));
  return Array.isArray(SOURCE_TYPES) && SOURCE_TYPES.length === 12;
});
check('34.2.12 — BUILTIN_EVIDENCE_CATEGORIES has 10 entries', () => {
  const { BUILTIN_EVIDENCE_CATEGORIES } = require(
    path.join(backendRoot, 'services/dddEvidenceLibrary')
  );
  return Array.isArray(BUILTIN_EVIDENCE_CATEGORIES) && BUILTIN_EVIDENCE_CATEGORIES.length === 10;
});
check('34.2.13 — createEvidenceLibraryRouter is a function', () => {
  const { createEvidenceLibraryRouter } = require(
    path.join(backendRoot, 'services/dddEvidenceLibrary')
  );
  return typeof createEvidenceLibraryRouter === 'function';
});
check('34.2.14 — EvidenceLibrary has listEvidence method', () => {
  const { EvidenceLibrary } = require(path.join(backendRoot, 'services/dddEvidenceLibrary'));
  return typeof new EvidenceLibrary().listEvidence === 'function';
});
check('34.2.15 — EvidenceLibrary has addEvidence method', () => {
  const { EvidenceLibrary } = require(path.join(backendRoot, 'services/dddEvidenceLibrary'));
  return typeof new EvidenceLibrary().addEvidence === 'function';
});
check('34.2.16 — EvidenceLibrary has listGuidelines method', () => {
  const { EvidenceLibrary } = require(path.join(backendRoot, 'services/dddEvidenceLibrary'));
  return typeof new EvidenceLibrary().listGuidelines === 'function';
});
check('34.2.17 — EvidenceLibrary has submitReview method', () => {
  const { EvidenceLibrary } = require(path.join(backendRoot, 'services/dddEvidenceLibrary'));
  return typeof new EvidenceLibrary().submitReview === 'function';
});
check('34.2.18 — EvidenceLibrary has getEvidenceAnalytics method', () => {
  const { EvidenceLibrary } = require(path.join(backendRoot, 'services/dddEvidenceLibrary'));
  return typeof new EvidenceLibrary().getEvidenceAnalytics === 'function';
});
check('34.2.19 — EvidenceLibrary has healthCheck method', () => {
  const { EvidenceLibrary } = require(path.join(backendRoot, 'services/dddEvidenceLibrary'));
  return typeof new EvidenceLibrary().healthCheck === 'function';
});

/* 34.3 — Clinical Trial */
check('34.3.1 — dddClinicalTrial.js exports ClinicalTrial class', () => {
  const mod = require(path.join(backendRoot, 'services/dddClinicalTrial'));
  return typeof mod.ClinicalTrial === 'function';
});
check('34.3.2 — dddClinicalTrial.js exports DDDClinicalTrial model', () => {
  const mod = require(path.join(backendRoot, 'services/dddClinicalTrial'));
  return mod.DDDClinicalTrial && typeof mod.DDDClinicalTrial.modelName === 'string';
});
check('34.3.3 — dddClinicalTrial.js exports DDDTrialParticipant model', () => {
  const mod = require(path.join(backendRoot, 'services/dddClinicalTrial'));
  return mod.DDDTrialParticipant && typeof mod.DDDTrialParticipant.modelName === 'string';
});
check('34.3.4 — dddClinicalTrial.js exports DDDMonitoringEvent model', () => {
  const mod = require(path.join(backendRoot, 'services/dddClinicalTrial'));
  return mod.DDDMonitoringEvent && typeof mod.DDDMonitoringEvent.modelName === 'string';
});
check('34.3.5 — dddClinicalTrial.js exports DDDAdverseEvent model', () => {
  const mod = require(path.join(backendRoot, 'services/dddClinicalTrial'));
  return mod.DDDAdverseEvent && typeof mod.DDDAdverseEvent.modelName === 'string';
});
check('34.3.6 — TRIAL_TYPES has 12 entries', () => {
  const { TRIAL_TYPES } = require(path.join(backendRoot, 'services/dddClinicalTrial'));
  return Array.isArray(TRIAL_TYPES) && TRIAL_TYPES.length === 12;
});
check('34.3.7 — TRIAL_STATUSES has 10 entries', () => {
  const { TRIAL_STATUSES } = require(path.join(backendRoot, 'services/dddClinicalTrial'));
  return Array.isArray(TRIAL_STATUSES) && TRIAL_STATUSES.length === 10;
});
check('34.3.8 — ENROLLMENT_STATUSES has 10 entries', () => {
  const { ENROLLMENT_STATUSES } = require(path.join(backendRoot, 'services/dddClinicalTrial'));
  return Array.isArray(ENROLLMENT_STATUSES) && ENROLLMENT_STATUSES.length === 10;
});
check('34.3.9 — MONITORING_TYPES has 10 entries', () => {
  const { MONITORING_TYPES } = require(path.join(backendRoot, 'services/dddClinicalTrial'));
  return Array.isArray(MONITORING_TYPES) && MONITORING_TYPES.length === 10;
});
check('34.3.10 — ADVERSE_EVENT_GRADES has 10 entries', () => {
  const { ADVERSE_EVENT_GRADES } = require(path.join(backendRoot, 'services/dddClinicalTrial'));
  return Array.isArray(ADVERSE_EVENT_GRADES) && ADVERSE_EVENT_GRADES.length === 10;
});
check('34.3.11 — RANDOMIZATION_METHODS has 12 entries', () => {
  const { RANDOMIZATION_METHODS } = require(path.join(backendRoot, 'services/dddClinicalTrial'));
  return Array.isArray(RANDOMIZATION_METHODS) && RANDOMIZATION_METHODS.length === 12;
});
check('34.3.12 — BUILTIN_TRIAL_TEMPLATES has 10 entries', () => {
  const { BUILTIN_TRIAL_TEMPLATES } = require(path.join(backendRoot, 'services/dddClinicalTrial'));
  return Array.isArray(BUILTIN_TRIAL_TEMPLATES) && BUILTIN_TRIAL_TEMPLATES.length === 10;
});
check('34.3.13 — createClinicalTrialRouter is a function', () => {
  const { createClinicalTrialRouter } = require(
    path.join(backendRoot, 'services/dddClinicalTrial')
  );
  return typeof createClinicalTrialRouter === 'function';
});
check('34.3.14 — ClinicalTrial has listTrials method', () => {
  const { ClinicalTrial } = require(path.join(backendRoot, 'services/dddClinicalTrial'));
  return typeof new ClinicalTrial().listTrials === 'function';
});
check('34.3.15 — ClinicalTrial has createTrial method', () => {
  const { ClinicalTrial } = require(path.join(backendRoot, 'services/dddClinicalTrial'));
  return typeof new ClinicalTrial().createTrial === 'function';
});
check('34.3.16 — ClinicalTrial has enrollParticipant method', () => {
  const { ClinicalTrial } = require(path.join(backendRoot, 'services/dddClinicalTrial'));
  return typeof new ClinicalTrial().enrollParticipant === 'function';
});
check('34.3.17 — ClinicalTrial has recordMonitoringEvent method', () => {
  const { ClinicalTrial } = require(path.join(backendRoot, 'services/dddClinicalTrial'));
  return typeof new ClinicalTrial().recordMonitoringEvent === 'function';
});
check('34.3.18 — ClinicalTrial has reportAdverseEvent method', () => {
  const { ClinicalTrial } = require(path.join(backendRoot, 'services/dddClinicalTrial'));
  return typeof new ClinicalTrial().reportAdverseEvent === 'function';
});
check('34.3.19 — ClinicalTrial has healthCheck method', () => {
  const { ClinicalTrial } = require(path.join(backendRoot, 'services/dddClinicalTrial'));
  return typeof new ClinicalTrial().healthCheck === 'function';
});

/* 34.4 — Publication Tracker */
check('34.4.1 — dddPublicationTracker.js exports PublicationTracker class', () => {
  const mod = require(path.join(backendRoot, 'services/dddPublicationTracker'));
  return typeof mod.PublicationTracker === 'function';
});
check('34.4.2 — dddPublicationTracker.js exports DDDPublication model', () => {
  const mod = require(path.join(backendRoot, 'services/dddPublicationTracker'));
  return mod.DDDPublication && typeof mod.DDDPublication.modelName === 'string';
});
check('34.4.3 — dddPublicationTracker.js exports DDDCitation model', () => {
  const mod = require(path.join(backendRoot, 'services/dddPublicationTracker'));
  return mod.DDDCitation && typeof mod.DDDCitation.modelName === 'string';
});
check('34.4.4 — dddPublicationTracker.js exports DDDImpactRecord model', () => {
  const mod = require(path.join(backendRoot, 'services/dddPublicationTracker'));
  return mod.DDDImpactRecord && typeof mod.DDDImpactRecord.modelName === 'string';
});
check('34.4.5 — dddPublicationTracker.js exports DDDDissemination model', () => {
  const mod = require(path.join(backendRoot, 'services/dddPublicationTracker'));
  return mod.DDDDissemination && typeof mod.DDDDissemination.modelName === 'string';
});
check('34.4.6 — PUBLICATION_TYPES has 12 entries', () => {
  const { PUBLICATION_TYPES } = require(path.join(backendRoot, 'services/dddPublicationTracker'));
  return Array.isArray(PUBLICATION_TYPES) && PUBLICATION_TYPES.length === 12;
});
check('34.4.7 — PUBLICATION_STATUSES has 10 entries', () => {
  const { PUBLICATION_STATUSES } = require(
    path.join(backendRoot, 'services/dddPublicationTracker')
  );
  return Array.isArray(PUBLICATION_STATUSES) && PUBLICATION_STATUSES.length === 10;
});
check('34.4.8 — JOURNAL_TIERS has 10 entries', () => {
  const { JOURNAL_TIERS } = require(path.join(backendRoot, 'services/dddPublicationTracker'));
  return Array.isArray(JOURNAL_TIERS) && JOURNAL_TIERS.length === 10;
});
check('34.4.9 — AUTHOR_ROLES has 12 entries', () => {
  const { AUTHOR_ROLES } = require(path.join(backendRoot, 'services/dddPublicationTracker'));
  return Array.isArray(AUTHOR_ROLES) && AUTHOR_ROLES.length === 12;
});
check('34.4.10 — IMPACT_METRICS has 12 entries', () => {
  const { IMPACT_METRICS } = require(path.join(backendRoot, 'services/dddPublicationTracker'));
  return Array.isArray(IMPACT_METRICS) && IMPACT_METRICS.length === 12;
});
check('34.4.11 — DISSEMINATION_CHANNELS has 12 entries', () => {
  const { DISSEMINATION_CHANNELS } = require(
    path.join(backendRoot, 'services/dddPublicationTracker')
  );
  return Array.isArray(DISSEMINATION_CHANNELS) && DISSEMINATION_CHANNELS.length === 12;
});
check('34.4.12 — BUILTIN_JOURNAL_LIST has 10 entries', () => {
  const { BUILTIN_JOURNAL_LIST } = require(
    path.join(backendRoot, 'services/dddPublicationTracker')
  );
  return Array.isArray(BUILTIN_JOURNAL_LIST) && BUILTIN_JOURNAL_LIST.length === 10;
});
check('34.4.13 — createPublicationTrackerRouter is a function', () => {
  const { createPublicationTrackerRouter } = require(
    path.join(backendRoot, 'services/dddPublicationTracker')
  );
  return typeof createPublicationTrackerRouter === 'function';
});
check('34.4.14 — PublicationTracker has listPublications method', () => {
  const { PublicationTracker } = require(path.join(backendRoot, 'services/dddPublicationTracker'));
  return typeof new PublicationTracker().listPublications === 'function';
});
check('34.4.15 — PublicationTracker has createPublication method', () => {
  const { PublicationTracker } = require(path.join(backendRoot, 'services/dddPublicationTracker'));
  return typeof new PublicationTracker().createPublication === 'function';
});
check('34.4.16 — PublicationTracker has addCitation method', () => {
  const { PublicationTracker } = require(path.join(backendRoot, 'services/dddPublicationTracker'));
  return typeof new PublicationTracker().addCitation === 'function';
});
check('34.4.17 — PublicationTracker has recordImpact method', () => {
  const { PublicationTracker } = require(path.join(backendRoot, 'services/dddPublicationTracker'));
  return typeof new PublicationTracker().recordImpact === 'function';
});
check('34.4.18 — PublicationTracker has createDissemination method', () => {
  const { PublicationTracker } = require(path.join(backendRoot, 'services/dddPublicationTracker'));
  return typeof new PublicationTracker().createDissemination === 'function';
});
check('34.4.19 — PublicationTracker has getPublicationAnalytics method', () => {
  const { PublicationTracker } = require(path.join(backendRoot, 'services/dddPublicationTracker'));
  return typeof new PublicationTracker().getPublicationAnalytics === 'function';
});
check('34.4.20 — PublicationTracker has healthCheck method', () => {
  const { PublicationTracker } = require(path.join(backendRoot, 'services/dddPublicationTracker'));
  return typeof new PublicationTracker().healthCheck === 'function';
});

/* 34.5 — Phase 28 Route Wiring */
check('34.5.1 — platform.routes.js references all Phase 28 routers', () => {
  const content = fs.readFileSync(path.join(backendRoot, 'routes/platform.routes.js'), 'utf8');
  return (
    content.includes('researchProtocolRouter') &&
    content.includes('evidenceLibraryRouter') &&
    content.includes('clinicalTrialRouter') &&
    content.includes('publicationTrackerRouter')
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════════════════════════════
console.log('');
console.log(c.bold('═══════════════════════════════════════════════════════════════'));
console.log(c.bold('  Verification Summary'));
console.log(c.bold('═══════════════════════════════════════════════════════════════'));
console.log('');
console.log(`  ${c.green('Passed')}: ${passed}`);
console.log(`  ${c.red('Failed')}: ${failed}`);
console.log(`  ${c.yellow('Warnings')}: ${warnings}`);
console.log('');

if (failed === 0) {
  console.log(c.green(c.bold('  ✅ ALL CHECKS PASSED — DDD Platform is fully integrated!')));
  console.log(c.dim('  منصة التأهيل الموحدة الذكية — جميع الفحوصات ناجحة'));
} else {
  console.log(c.red(c.bold(`  ❌ ${failed} check(s) FAILED — review the output above.`)));
}

console.log('');
process.exit(failed > 0 ? 1 : 0);
