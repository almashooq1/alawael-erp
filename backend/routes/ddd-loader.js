'use strict';
/**
 * DDD Module Route Loader
 * منصة التأهيل — تحميل مسارات وحدات DDD
 *
 * Data-driven loader for all 125 DDD domain modules.
 * Each module has its own route file in backend/routes/ddd-*.routes.js
 * Mounted by platform.routes.js at /api/v1/platform and /api/v2/platform
 */

const express = require('express');
const router = express.Router();
const dddBaselineValidation = require('../middleware/ddd-baseline-validation');

// Apply baseline validation to ALL DDD routes (ObjectId, body, pagination, dates)
router.use(dddBaselineValidation);

function safeRequireRoute(filePath, label) {
  try {
    return require(filePath);
  } catch (e) {
    console.warn(`[DDD-Loader] ${label} route load failed:`, e.message);
    return null;
  }
}

/**
 * All DDD module routes.
 * Each entry: { path: mountPath, file: requirePath, label: humanLabel }
 */
const dddRoutes = [
  { path: '/', file: './ddd-access-control.routes', label: 'access-control' },
  { path: '/', file: './ddd-accreditation-manager.routes', label: 'accreditation-manager' },
  { path: '/', file: './ddd-activity-feed.routes', label: 'activity-feed' },
  { path: '/', file: './ddd-advocacy-program.routes', label: 'advocacy-program' },
  { path: '/', file: './ddd-analytics-dashboard.routes', label: 'analytics-dashboard' },
  { path: '/', file: './ddd-announcement-manager.routes', label: 'announcement-manager' },
  { path: '/', file: './ddd-api-gateway.routes', label: 'api-gateway' },
  { path: '/', file: './ddd-appointment-engine.routes', label: 'appointment-engine' },
  { path: '/', file: './ddd-approval-chain.routes', label: 'approval-chain' },
  { path: '/', file: './ddd-archive-manager.routes', label: 'archive-manager' },
  { path: '/', file: './ddd-asset-tracker.routes', label: 'asset-tracker' },
  { path: '/', file: './ddd-asset-tracking.routes', label: 'asset-tracking' },
  { path: '/', file: './ddd-backup-manager.routes', label: 'backup-manager' },
  { path: '/', file: './ddd-billing-engine.routes', label: 'billing-engine' },
  { path: '/', file: './ddd-business-continuity.routes', label: 'business-continuity' },
  { path: '/', file: './ddd-business-intelligence.routes', label: 'business-intelligence' },
  { path: '/', file: './ddd-capacity-planner.routes', label: 'capacity-planner' },
  { path: '/', file: './ddd-career-pathway.routes', label: 'career-pathway' },
  { path: '/', file: './ddd-case-conference.routes', label: 'case-conference' },
  { path: '/', file: './ddd-circuit-breaker.routes', label: 'circuit-breaker' },
  { path: '/', file: './ddd-claims-processor.routes', label: 'claims-processor' },
  { path: '/', file: './ddd-clinical-engine.routes', label: 'clinical-engine' },
  { path: '/', file: './ddd-clinical-research.routes', label: 'clinical-research' },
  { path: '/', file: './ddd-clinical-trial.routes', label: 'clinical-trial' },
  { path: '/', file: './ddd-clinical-trials.routes', label: 'clinical-trials' },
  { path: '/', file: './ddd-collaboration-hub.routes', label: 'collaboration-hub' },
  { path: '/', file: './ddd-communication-log.routes', label: 'communication-log' },
  { path: '/', file: './ddd-community-outreach.routes', label: 'community-outreach' },
  { path: '/', file: './ddd-community-program.routes', label: 'community-program' },
  { path: '/', file: './ddd-competency-tracker.routes', label: 'competency-tracker' },
  { path: '/', file: './ddd-complaint-manager.routes', label: 'complaint-manager' },
  { path: '/', file: './ddd-compliance-dashboard.routes', label: 'compliance-dashboard' },
  { path: '/', file: './ddd-config-manager.routes', label: 'config-manager' },
  { path: '/', file: './ddd-consent-manager.routes', label: 'consent-manager' },
  { path: '/', file: './ddd-continuous-education.routes', label: 'continuous-education' },
  { path: '/', file: './ddd-contract-manager.routes', label: 'contract-manager' },
  { path: '/', file: './ddd-credential-manager.routes', label: 'credential-manager' },
  { path: '/', file: './ddd-data-exchange.routes', label: 'data-exchange' },
  { path: '/', file: './ddd-data-migration.routes', label: 'data-migration' },
  { path: '/', file: './ddd-data-quality-monitor.routes', label: 'data-quality-monitor' },
  { path: '/', file: './ddd-data-warehouse.routes', label: 'data-warehouse' },
  { path: '/', file: './ddd-dev-portal.routes', label: 'dev-portal' },
  { path: '/', file: './ddd-digital-signature.routes', label: 'digital-signature' },
  { path: '/', file: './ddd-disaster-recovery.routes', label: 'disaster-recovery' },
  { path: '/', file: './ddd-document-collaboration.routes', label: 'document-collaboration' },
  { path: '/', file: './ddd-document-generator.routes', label: 'document-generator' },
  { path: '/', file: './ddd-document-vault.routes', label: 'document-vault' },
  { path: '/', file: './ddd-donation-manager.routes', label: 'donation-manager' },
  { path: '/', file: './ddd-donor-relations.routes', label: 'donor-relations' },
  { path: '/', file: './ddd-emergency-response.routes', label: 'emergency-response' },
  { path: '/', file: './ddd-encryption-service.routes', label: 'encryption-service' },
  { path: '/', file: './ddd-environmental-monitor.routes', label: 'environmental-monitor' },
  { path: '/', file: './ddd-environmental-monitoring.routes', label: 'environmental-monitoring' },
  { path: '/', file: './ddd-equipment-lifecycle.routes', label: 'equipment-lifecycle' },
  { path: '/', file: './ddd-error-tracker.routes', label: 'error-tracker' },
  { path: '/', file: './ddd-evidence-library.routes', label: 'evidence-library' },
  { path: '/', file: './ddd-facility-manager.routes', label: 'facility-manager' },
  { path: '/', file: './ddd-feature-flags.routes', label: 'feature-flags' },
  { path: '/', file: './ddd-feedback-manager.routes', label: 'feedback-manager' },
  { path: '/', file: './ddd-fhir-integration.routes', label: 'fhir-integration' },
  { path: '/', file: './ddd-fleet-tracker.routes', label: 'fleet-tracker' },
  { path: '/', file: './ddd-form-builder.routes', label: 'form-builder' },
  { path: '/', file: './ddd-h-l7-messaging.routes', label: 'hl7-messaging' },
  { path: '/', file: './ddd-health-education.routes', label: 'health-education' },
  { path: '/', file: './ddd-health-monitor.routes', label: 'health-monitor' },
  { path: '/', file: './ddd-incident-response.routes', label: 'incident-response' },
  { path: '/', file: './ddd-incident-tracker.routes', label: 'incident-tracker' },
  { path: '/', file: './ddd-inspection-tracker.routes', label: 'inspection-tracker' },
  { path: '/', file: './ddd-insurance-manager.routes', label: 'insurance-manager' },
  { path: '/', file: './ddd-interoperability-gateway.routes', label: 'interoperability-gateway' },
  { path: '/', file: './ddd-interoperability-hub.routes', label: 'interoperability-hub' },
  { path: '/', file: './ddd-inventory-manager.routes', label: 'inventory-manager' },
  { path: '/', file: './ddd-knowledge-base.routes', label: 'knowledge-base' },
  { path: '/', file: './ddd-learning-management.routes', label: 'learning-management' },
  { path: '/', file: './ddd-leave-manager.routes', label: 'leave-manager' },
  { path: '/', file: './ddd-legal-case-tracker.routes', label: 'legal-case-tracker' },
  { path: '/', file: './ddd-licensure-manager.routes', label: 'licensure-manager' },
  { path: '/', file: './ddd-localization-engine.routes', label: 'localization-engine' },
  { path: '/', file: './ddd-maintenance-tracker.routes', label: 'maintenance-tracker' },
  { path: '/', file: './ddd-mentorship-program.routes', label: 'mentorship-program' },
  { path: '/', file: './ddd-message-center.routes', label: 'message-center' },
  { path: '/', file: './ddd-metrics-collector.routes', label: 'metrics-collector' },
  { path: '/', file: './ddd-notification-engine.routes', label: 'notification-engine' },
  { path: '/', file: './ddd-outcome-research.routes', label: 'outcome-research' },
  { path: '/', file: './ddd-outcome-tracker.routes', label: 'outcome-tracker' },
  { path: '/', file: './ddd-outreach-tracker.routes', label: 'outreach-tracker' },
  { path: '/', file: './ddd-patient-community.routes', label: 'patient-community' },
  { path: '/', file: './ddd-patient-experience.routes', label: 'patient-experience' },
  { path: '/', file: './ddd-patient-portal.routes', label: 'patient-portal' },
  { path: '/', file: './ddd-patient-transport.routes', label: 'patient-transport' },
  { path: '/', file: './ddd-payment-gateway.routes', label: 'payment-gateway' },
  { path: '/', file: './ddd-performance-evaluator.routes', label: 'performance-evaluator' },
  { path: '/', file: './ddd-policy-governance.routes', label: 'policy-governance' },
  { path: '/', file: './ddd-predictive-engine.routes', label: 'predictive-engine' },
  { path: '/', file: './ddd-procurement-engine.routes', label: 'procurement-engine' },
  { path: '/', file: './ddd-publication-manager.routes', label: 'publication-manager' },
  { path: '/', file: './ddd-publication-tracker.routes', label: 'publication-tracker' },
  { path: '/', file: './ddd-record-manager.routes', label: 'record-manager' },
  { path: '/', file: './ddd-regulatory-tracker.routes', label: 'regulatory-tracker' },
  { path: '/', file: './ddd-remote-monitoring.routes', label: 'remote-monitoring' },
  { path: '/', file: './ddd-report-builder.routes', label: 'report-builder' },
  { path: '/', file: './ddd-research-protocol.routes', label: 'research-protocol' },
  { path: '/', file: './ddd-resource-manager.routes', label: 'resource-manager' },
  { path: '/', file: './ddd-risk-stratification.routes', label: 'risk-stratification' },
  { path: '/', file: './ddd-route-optimizer.routes', label: 'route-optimizer' },
  { path: '/', file: './ddd-safety-manager.routes', label: 'safety-manager' },
  { path: '/', file: './ddd-satisfaction-tracker.routes', label: 'satisfaction-tracker' },
  { path: '/', file: './ddd-security-auditor.routes', label: 'security-auditor' },
  { path: '/', file: './ddd-session-manager.routes', label: 'session-manager' },
  { path: '/', file: './ddd-shift-scheduler.routes', label: 'shift-scheduler' },
  { path: '/', file: './ddd-smart-scheduler.routes', label: 'smart-scheduler' },
  { path: '/', file: './ddd-space-allocator.routes', label: 'space-allocator' },
  { path: '/', file: './ddd-space-management.routes', label: 'space-management' },
  { path: '/', file: './ddd-staff-manager.routes', label: 'staff-manager' },
  { path: '/', file: './ddd-standards-compliance.routes', label: 'standards-compliance' },
  { path: '/', file: './ddd-supply-chain-tracker.routes', label: 'supply-chain-tracker' },
  { path: '/', file: './ddd-system-failover.routes', label: 'system-failover' },
  { path: '/', file: './ddd-task-queue.routes', label: 'task-queue' },
  { path: '/', file: './ddd-tenant-manager.routes', label: 'tenant-manager' },
  { path: '/', file: './ddd-transport-manager.routes', label: 'transport-manager' },
  { path: '/', file: './ddd-volunteer-management.routes', label: 'volunteer-management' },
  { path: '/', file: './ddd-volunteer-manager.routes', label: 'volunteer-manager' },
  { path: '/', file: './ddd-warehouse-manager.routes', label: 'warehouse-manager' },
  { path: '/', file: './ddd-workflow-engine.routes', label: 'workflow-engine' },
  { path: '/', file: './ddd-workforce-analytics.routes', label: 'workforce-analytics' },
];

// Load and mount all DDD module routes
let loadedCount = 0;
dddRoutes.forEach(r => {
  const rt = safeRequireRoute(r.file, r.label);
  if (rt) {
    router.use(r.path, rt);
    loadedCount++;
  }
});

console.log(`[DDD-Loader] ✓ ${loadedCount}/${dddRoutes.length} DDD modules loaded`);

module.exports = router;
