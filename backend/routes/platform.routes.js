/**
 * DDD Platform Health API
 * نقطة نهاية صحة المنصة الموحدة
 *
 * Endpoints:
 *  GET /api/v1/platform/health       — Full health check
 *  GET /api/v1/platform/domains      — List all domains
 *  GET /api/v1/platform/stats        — Platform-wide stats
 *  GET /api/v1/platform/version      — Platform version info
 */

'use strict';

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

/* ── Phase 3: Search + Batch routers ── */
let searchRouter, batchRouter;
try {
  const { createSearchRouter } = require('../domains/_base/ddd-search');
  searchRouter = createSearchRouter();
} catch (e) {
  console.warn('[Platform] Search router load failed:', e.message);
}
try {
  const { createBatchRouter } = require('../domains/_base/ddd-batch');
  batchRouter = createBatchRouter();
} catch (e) {
  console.warn('[Platform] Batch router load failed:', e.message);
}

/* ── Phase 4: Analytics + Export routers ── */
let analyticsRouter, exportRouter;
try {
  const { createAnalyticsRouter } = require('../domains/_base/ddd-analytics');
  analyticsRouter = createAnalyticsRouter();
} catch (e) {
  console.warn('[Platform] Analytics router load failed:', e.message);
}
try {
  const { createExportRouter } = require('../services/dddExportService');
  exportRouter = createExportRouter();
} catch (e) {
  console.warn('[Platform] Export router load failed:', e.message);
}

/* ── Phase 5: Attachments + Webhooks + Reports + Notifications routers ── */
let attachmentsRouter, webhookRouter, reportBuilderRouter;
try {
  const { createAttachmentsRouter } = require('../domains/_base/ddd-attachments');
  attachmentsRouter = createAttachmentsRouter();
} catch (e) {
  console.warn('[Platform] Attachments router load failed:', e.message);
}
try {
  const { createWebhookRouter } = require('../integration/dddWebhookDispatcher');
  webhookRouter = createWebhookRouter();
} catch (e) {
  console.warn('[Platform] Webhook router load failed:', e.message);
}
try {
  const { createReportBuilderRouter } = require('../services/dddReportBuilder');
  reportBuilderRouter = createReportBuilderRouter();
} catch (e) {
  console.warn('[Platform] Report Builder router load failed:', e.message);
}

/* ── Phase 6: Clinical Intelligence routers ── */
let clinicalEngineRouter, outcomeRouter, riskStratRouter, smartSchedulerRouter;
try {
  const { createClinicalEngineRouter } = require('../services/dddClinicalEngine');
  clinicalEngineRouter = createClinicalEngineRouter();
} catch (e) {
  console.warn('[Platform] Clinical Engine router load failed:', e.message);
}
try {
  const { createOutcomeRouter } = require('../services/dddOutcomeTracker');
  outcomeRouter = createOutcomeRouter();
} catch (e) {
  console.warn('[Platform] Outcome Tracker router load failed:', e.message);
}
try {
  const { createRiskStratificationRouter } = require('../services/dddRiskStratification');
  riskStratRouter = createRiskStratificationRouter();
} catch (e) {
  console.warn('[Platform] Risk Stratification router load failed:', e.message);
}
try {
  const { createSmartSchedulerRouter } = require('../services/dddSmartScheduler');
  smartSchedulerRouter = createSmartSchedulerRouter();
} catch (e) {
  console.warn('[Platform] Smart Scheduler router load failed:', e.message);
}

/* ── Phase 7: Data Governance & Compliance routers ── */
let consentRouter, complianceRouter, dataQualityRouter, interopRouter;
try {
  const { createConsentRouter } = require('../services/dddConsentManager');
  consentRouter = createConsentRouter();
} catch (e) {
  console.warn('[Platform] Consent Manager router load failed:', e.message);
}
try {
  const { createComplianceDashboardRouter } = require('../services/dddComplianceDashboard');
  complianceRouter = createComplianceDashboardRouter();
} catch (e) {
  console.warn('[Platform] Compliance Dashboard router load failed:', e.message);
}
try {
  const { createDataQualityRouter } = require('../services/dddDataQualityMonitor');
  dataQualityRouter = createDataQualityRouter();
} catch (e) {
  console.warn('[Platform] Data Quality Monitor router load failed:', e.message);
}
try {
  const { createInteropRouter } = require('../services/dddInteroperabilityGateway');
  interopRouter = createInteropRouter();
} catch (e) {
  console.warn('[Platform] Interoperability Gateway router load failed:', e.message);
}

/* ── Phase 8: Multi-Tenancy, Configuration & Localization routers ── */
let tenantRouter, featureFlagRouter, configRouter, localizationRouter;
try {
  const { createTenantRouter } = require('../services/dddTenantManager');
  tenantRouter = createTenantRouter();
} catch (e) {
  console.warn('[Platform] Tenant Manager router load failed:', e.message);
}
try {
  const { createFeatureFlagRouter } = require('../services/dddFeatureFlags');
  featureFlagRouter = createFeatureFlagRouter();
} catch (e) {
  console.warn('[Platform] Feature Flags router load failed:', e.message);
}
try {
  const { createConfigRouter } = require('../services/dddConfigManager');
  configRouter = createConfigRouter();
} catch (e) {
  console.warn('[Platform] Config Manager router load failed:', e.message);
}
try {
  const { createLocalizationRouter } = require('../services/dddLocalizationEngine');
  localizationRouter = createLocalizationRouter();
} catch (e) {
  console.warn('[Platform] Localization Engine router load failed:', e.message);
}

/* ── Phase 9: Monitoring, Health & Resilience routers ── */
let healthMonitorRouter, metricsRouter, circuitBreakerRouter, errorTrackerRouter;
try {
  const { createHealthMonitorRouter } = require('../services/dddHealthMonitor');
  healthMonitorRouter = createHealthMonitorRouter();
} catch (e) {
  console.warn('[Platform] Health Monitor router load failed:', e.message);
}
try {
  const { createMetricsRouter } = require('../services/dddMetricsCollector');
  metricsRouter = createMetricsRouter();
} catch (e) {
  console.warn('[Platform] Metrics Collector router load failed:', e.message);
}
try {
  const { createCircuitBreakerRouter } = require('../services/dddCircuitBreaker');
  circuitBreakerRouter = createCircuitBreakerRouter();
} catch (e) {
  console.warn('[Platform] Circuit Breaker router load failed:', e.message);
}
try {
  const { createErrorTrackerRouter } = require('../services/dddErrorTracker');
  errorTrackerRouter = createErrorTrackerRouter();
} catch (e) {
  console.warn('[Platform] Error Tracker router load failed:', e.message);
}

/* ── Phase 10: API Gateway, Migration, Task Queue & Dev Portal routers ── */
let apiGatewayRouter, dataMigrationRouter, taskQueueRouter, devPortalRouter;
try {
  const { createApiGatewayRouter } = require('../services/dddApiGateway');
  apiGatewayRouter = createApiGatewayRouter();
} catch (e) {
  console.warn('[Platform] API Gateway router load failed:', e.message);
}
try {
  const { createDataMigrationRouter } = require('../services/dddDataMigration');
  dataMigrationRouter = createDataMigrationRouter();
} catch (e) {
  console.warn('[Platform] Data Migration router load failed:', e.message);
}
try {
  const { createTaskQueueRouter } = require('../services/dddTaskQueue');
  taskQueueRouter = createTaskQueueRouter();
} catch (e) {
  console.warn('[Platform] Task Queue router load failed:', e.message);
}
try {
  const { createDevPortalRouter } = require('../services/dddDevPortal');
  devPortalRouter = createDevPortalRouter();
} catch (e) {
  console.warn('[Platform] Dev Portal router load failed:', e.message);
}

/* ── Phase 11: Advanced Security & Access Control routers ── */
let securityAuditorRouter, sessionManagerRouter, encryptionRouter, accessControlRouter;
try {
  const { createSecurityAuditorRouter } = require('../services/dddSecurityAuditor');
  securityAuditorRouter = createSecurityAuditorRouter();
} catch (e) {
  console.warn('[Platform] Security Auditor router load failed:', e.message);
}
try {
  const { createSessionManagerRouter } = require('../services/dddSessionManager');
  sessionManagerRouter = createSessionManagerRouter();
} catch (e) {
  console.warn('[Platform] Session Manager router load failed:', e.message);
}
try {
  const { createEncryptionRouter } = require('../services/dddEncryptionService');
  encryptionRouter = createEncryptionRouter();
} catch (e) {
  console.warn('[Platform] Encryption Service router load failed:', e.message);
}
try {
  const { createAccessControlRouter } = require('../services/dddAccessControl');
  accessControlRouter = createAccessControlRouter();
} catch (e) {
  console.warn('[Platform] Access Control router load failed:', e.message);
}

/* ── Phase 12: Advanced Analytics & Business Intelligence routers ── */
let analyticsDashboardRouter,
  predictiveEngineRouter,
  dataWarehouseRouter,
  businessIntelligenceRouter;
try {
  const { createAnalyticsDashboardRouter } = require('../services/dddAnalyticsDashboard');
  analyticsDashboardRouter = createAnalyticsDashboardRouter();
} catch (e) {
  console.warn('[Platform] Analytics Dashboard router load failed:', e.message);
}
try {
  const { createPredictiveEngineRouter } = require('../services/dddPredictiveEngine');
  predictiveEngineRouter = createPredictiveEngineRouter();
} catch (e) {
  console.warn('[Platform] Predictive Engine router load failed:', e.message);
}
try {
  const { createDataWarehouseRouter } = require('../services/dddDataWarehouse');
  dataWarehouseRouter = createDataWarehouseRouter();
} catch (e) {
  console.warn('[Platform] Data Warehouse router load failed:', e.message);
}
try {
  const { createBusinessIntelligenceRouter } = require('../services/dddBusinessIntelligence');
  businessIntelligenceRouter = createBusinessIntelligenceRouter();
} catch (e) {
  console.warn('[Platform] Business Intelligence router load failed:', e.message);
}

/* ── Phase 13: Real-time Collaboration & Communication routers ── */
let collaborationHubRouter, caseConferenceRouter, documentCollaborationRouter, activityFeedRouter;
try {
  const { createCollaborationHubRouter } = require('../services/dddCollaborationHub');
  collaborationHubRouter = createCollaborationHubRouter();
} catch (e) {
  console.warn('[Platform] Collaboration Hub router load failed:', e.message);
}
try {
  const { createCaseConferenceRouter } = require('../services/dddCaseConference');
  caseConferenceRouter = createCaseConferenceRouter();
} catch (e) {
  console.warn('[Platform] Case Conference router load failed:', e.message);
}
try {
  const { createDocumentCollaborationRouter } = require('../services/dddDocumentCollaboration');
  documentCollaborationRouter = createDocumentCollaborationRouter();
} catch (e) {
  console.warn('[Platform] Document Collaboration router load failed:', e.message);
}
try {
  const { createActivityFeedRouter } = require('../services/dddActivityFeed');
  activityFeedRouter = createActivityFeedRouter();
} catch (e) {
  console.warn('[Platform] Activity Feed router load failed:', e.message);
}

/* ── Phase 14: Resource Management & Capacity Planning declarations ── */
let resourceManagerRouter, capacityPlannerRouter, appointmentEngineRouter, assetTrackerRouter;
try {
  const { createResourceManagerRouter } = require('../services/dddResourceManager');
  resourceManagerRouter = createResourceManagerRouter();
} catch (e) {
  console.warn('[Platform] Resource Manager router load failed:', e.message);
}
try {
  const { createCapacityPlannerRouter } = require('../services/dddCapacityPlanner');
  capacityPlannerRouter = createCapacityPlannerRouter();
} catch (e) {
  console.warn('[Platform] Capacity Planner router load failed:', e.message);
}
try {
  const { createAppointmentEngineRouter } = require('../services/dddAppointmentEngine');
  appointmentEngineRouter = createAppointmentEngineRouter();
} catch (e) {
  console.warn('[Platform] Appointment Engine router load failed:', e.message);
}
try {
  const { createAssetTrackerRouter } = require('../services/dddAssetTracker');
  assetTrackerRouter = createAssetTrackerRouter();
} catch (e) {
  console.warn('[Platform] Asset Tracker router load failed:', e.message);
}

/* ── Phase 15: Workflow & Process Automation declarations ── */
let workflowEngineRouter, formBuilderRouter, approvalChainRouter, documentGeneratorRouter;
try {
  const { createWorkflowEngineRouter } = require('../services/dddWorkflowEngine');
  workflowEngineRouter = createWorkflowEngineRouter();
} catch (e) {
  console.warn('[Platform] Workflow Engine router load failed:', e.message);
}
try {
  const { createFormBuilderRouter } = require('../services/dddFormBuilder');
  formBuilderRouter = createFormBuilderRouter();
} catch (e) {
  console.warn('[Platform] Form Builder router load failed:', e.message);
}
try {
  const { createApprovalChainRouter } = require('../services/dddApprovalChain');
  approvalChainRouter = createApprovalChainRouter();
} catch (e) {
  console.warn('[Platform] Approval Chain router load failed:', e.message);
}
try {
  const { createDocumentGeneratorRouter } = require('../services/dddDocumentGenerator');
  documentGeneratorRouter = createDocumentGeneratorRouter();
} catch (e) {
  console.warn('[Platform] Document Generator router load failed:', e.message);
}

/* ── Phase 16 — Financial & Billing Management ── */
let billingEngineRouter, insuranceManagerRouter, claimsProcessorRouter, paymentGatewayRouter;
let learningManagementRouter,
  competencyTrackerRouter,
  continuousEducationRouter,
  knowledgeBaseRouter;
let inventoryManagerRouter,
  procurementEngineRouter,
  supplyChainTrackerRouter,
  warehouseManagerRouter;
let facilityManagerRouter,
  environmentalMonitorRouter,
  spaceAllocatorRouter,
  maintenanceTrackerRouter;
let staffManagerRouter, shiftSchedulerRouter, performanceEvaluatorRouter, leaveManagerRouter;
let messageCenterRouter,
  notificationEngineRouter,
  announcementManagerRouter,
  communicationLogRouter;
let documentVaultRouter, recordManagerRouter, digitalSignatureRouter, archiveManagerRouter;
let incidentTrackerRouter, emergencyResponseRouter, disasterRecoveryRouter, safetyManagerRouter;
let transportManagerRouter, patientTransportRouter, fleetTrackerRouter, routeOptimizerRouter;
let volunteerManagerRouter, communityProgramRouter, outreachTrackerRouter, donationManagerRouter;
let contractManagerRouter, legalCaseTrackerRouter, policyGovernanceRouter, regulatoryTrackerRouter;
let feedbackManagerRouter,
  satisfactionTrackerRouter,
  complaintManagerRouter,
  patientExperienceRouter;
let researchProtocolRouter, evidenceLibraryRouter, clinicalTrialRouter, publicationTrackerRouter;
let workforceAnalyticsRouter, credentialManagerRouter, mentorshipProgramRouter, careerPathwayRouter;
let accreditationManagerRouter,
  inspectionTrackerRouter,
  standardsComplianceRouter,
  licensureManagerRouter;
let patientPortalRouter, healthEducationRouter, remoteMonitoringRouter, patientCommunityRouter;
let fhirIntegrationRouter, hl7MessagingRouter, dataExchangeRouter, interoperabilityHubRouter;
let backupManagerRouter, businessContinuityRouter, systemFailoverRouter, incidentResponseRouter;
let equipmentLifecycleRouter,
  environmentalMonitoringRouter,
  spaceManagementRouter,
  assetTrackingRouter;
let clinicalResearchRouter, clinicalTrialsRouter, outcomeResearchRouter, publicationManagerRouter;
let volunteerManagementRouter, communityOutreachRouter, donorRelationsRouter, advocacyProgramRouter;
try {
  const { createBillingEngineRouter } = require('../services/dddBillingEngine');
  billingEngineRouter = createBillingEngineRouter();
} catch (e) {
  console.warn('[Platform] Billing Engine router load failed:', e.message);
}
try {
  const { createInsuranceManagerRouter } = require('../services/dddInsuranceManager');
  insuranceManagerRouter = createInsuranceManagerRouter();
} catch (e) {
  console.warn('[Platform] Insurance Manager router load failed:', e.message);
}
try {
  const { createClaimsProcessorRouter } = require('../services/dddClaimsProcessor');
  claimsProcessorRouter = createClaimsProcessorRouter();
} catch (e) {
  console.warn('[Platform] Claims Processor router load failed:', e.message);
}
try {
  const { createPaymentGatewayRouter } = require('../services/dddPaymentGateway');
  paymentGatewayRouter = createPaymentGatewayRouter();
} catch (e) {
  console.warn('[Platform] Payment Gateway router load failed:', e.message);
}

/* Phase 17 — Learning Management & Training */
try {
  const { createLearningManagementRouter } = require('../services/dddLearningManagement');
  learningManagementRouter = createLearningManagementRouter();
} catch (e) {
  console.warn('[Platform] Learning Management router load failed:', e.message);
}
try {
  const { createCompetencyTrackerRouter } = require('../services/dddCompetencyTracker');
  competencyTrackerRouter = createCompetencyTrackerRouter();
} catch (e) {
  console.warn('[Platform] Competency Tracker router load failed:', e.message);
}
try {
  const { createContinuousEducationRouter } = require('../services/dddContinuousEducation');
  continuousEducationRouter = createContinuousEducationRouter();
} catch (e) {
  console.warn('[Platform] Continuous Education router load failed:', e.message);
}
try {
  const { createKnowledgeBaseRouter } = require('../services/dddKnowledgeBase');
  knowledgeBaseRouter = createKnowledgeBaseRouter();
} catch (e) {
  console.warn('[Platform] Knowledge Base router load failed:', e.message);
}

/* Phase 18 — Supply Chain & Inventory Management */
try {
  const { createInventoryManagerRouter } = require('../services/dddInventoryManager');
  inventoryManagerRouter = createInventoryManagerRouter();
} catch (e) {
  console.warn('[Platform] Inventory Manager router load failed:', e.message);
}
try {
  const { createProcurementEngineRouter } = require('../services/dddProcurementEngine');
  procurementEngineRouter = createProcurementEngineRouter();
} catch (e) {
  console.warn('[Platform] Procurement Engine router load failed:', e.message);
}
try {
  const { createSupplyChainTrackerRouter } = require('../services/dddSupplyChainTracker');
  supplyChainTrackerRouter = createSupplyChainTrackerRouter();
} catch (e) {
  console.warn('[Platform] Supply Chain Tracker router load failed:', e.message);
}
try {
  const { createWarehouseManagerRouter } = require('../services/dddWarehouseManager');
  warehouseManagerRouter = createWarehouseManagerRouter();
} catch (e) {
  console.warn('[Platform] Warehouse Manager router load failed:', e.message);
}
try {
  const { createFacilityManagerRouter } = require('../services/dddFacilityManager');
  facilityManagerRouter = createFacilityManagerRouter();
} catch (e) {
  console.warn('[Platform] Facility Manager router load failed:', e.message);
}
try {
  const { createEnvironmentalMonitorRouter } = require('../services/dddEnvironmentalMonitor');
  environmentalMonitorRouter = createEnvironmentalMonitorRouter();
} catch (e) {
  console.warn('[Platform] Environmental Monitor router load failed:', e.message);
}
try {
  const { createSpaceAllocatorRouter } = require('../services/dddSpaceAllocator');
  spaceAllocatorRouter = createSpaceAllocatorRouter();
} catch (e) {
  console.warn('[Platform] Space Allocator router load failed:', e.message);
}
try {
  const { createMaintenanceTrackerRouter } = require('../services/dddMaintenanceTracker');
  maintenanceTrackerRouter = createMaintenanceTrackerRouter();
} catch (e) {
  console.warn('[Platform] Maintenance Tracker router load failed:', e.message);
}
try {
  const { createStaffManagerRouter } = require('../services/dddStaffManager');
  staffManagerRouter = createStaffManagerRouter();
} catch (e) {
  console.warn('[Platform] Staff Manager router load failed:', e.message);
}
try {
  const { createShiftSchedulerRouter } = require('../services/dddShiftScheduler');
  shiftSchedulerRouter = createShiftSchedulerRouter();
} catch (e) {
  console.warn('[Platform] Shift Scheduler router load failed:', e.message);
}
try {
  const { createPerformanceEvaluatorRouter } = require('../services/dddPerformanceEvaluator');
  performanceEvaluatorRouter = createPerformanceEvaluatorRouter();
} catch (e) {
  console.warn('[Platform] Performance Evaluator router load failed:', e.message);
}
try {
  const { createLeaveManagerRouter } = require('../services/dddLeaveManager');
  leaveManagerRouter = createLeaveManagerRouter();
} catch (e) {
  console.warn('[Platform] Leave Manager router load failed:', e.message);
}
try {
  const { createMessageCenterRouter } = require('../services/dddMessageCenter');
  messageCenterRouter = createMessageCenterRouter();
} catch (e) {
  console.warn('[Platform] Message Center router load failed:', e.message);
}
try {
  const { createNotificationEngineRouter } = require('../services/dddNotificationEngine');
  notificationEngineRouter = createNotificationEngineRouter();
} catch (e) {
  console.warn('[Platform] Notification Engine router load failed:', e.message);
}
try {
  const { createAnnouncementManagerRouter } = require('../services/dddAnnouncementManager');
  announcementManagerRouter = createAnnouncementManagerRouter();
} catch (e) {
  console.warn('[Platform] Announcement Manager router load failed:', e.message);
}
try {
  const { createCommunicationLogRouter } = require('../services/dddCommunicationLog');
  communicationLogRouter = createCommunicationLogRouter();
} catch (e) {
  console.warn('[Platform] Communication Log router load failed:', e.message);
}
try {
  const { createDocumentVaultRouter } = require('../services/dddDocumentVault');
  documentVaultRouter = createDocumentVaultRouter();
} catch (e) {
  console.warn('[Platform] Document Vault router load failed:', e.message);
}
try {
  const { createRecordManagerRouter } = require('../services/dddRecordManager');
  recordManagerRouter = createRecordManagerRouter();
} catch (e) {
  console.warn('[Platform] Record Manager router load failed:', e.message);
}
try {
  const { createDigitalSignatureRouter } = require('../services/dddDigitalSignature');
  digitalSignatureRouter = createDigitalSignatureRouter();
} catch (e) {
  console.warn('[Platform] Digital Signature router load failed:', e.message);
}
try {
  const { createArchiveManagerRouter } = require('../services/dddArchiveManager');
  archiveManagerRouter = createArchiveManagerRouter();
} catch (e) {
  console.warn('[Platform] Archive Manager router load failed:', e.message);
}
try {
  const { createIncidentTrackerRouter } = require('../services/dddIncidentTracker');
  incidentTrackerRouter = createIncidentTrackerRouter();
} catch (e) {
  console.warn('[Platform] Incident Tracker router load failed:', e.message);
}
try {
  const { createEmergencyResponseRouter } = require('../services/dddEmergencyResponse');
  emergencyResponseRouter = createEmergencyResponseRouter();
} catch (e) {
  console.warn('[Platform] Emergency Response router load failed:', e.message);
}
try {
  const { createDisasterRecoveryRouter } = require('../services/dddDisasterRecovery');
  disasterRecoveryRouter = createDisasterRecoveryRouter();
} catch (e) {
  console.warn('[Platform] Disaster Recovery router load failed:', e.message);
}
try {
  const { createSafetyManagerRouter } = require('../services/dddSafetyManager');
  safetyManagerRouter = createSafetyManagerRouter();
} catch (e) {
  console.warn('[Platform] Safety Manager router load failed:', e.message);
}
try {
  const { createTransportManagerRouter } = require('../services/dddTransportManager');
  transportManagerRouter = createTransportManagerRouter();
} catch (e) {
  console.warn('[Platform] Transport Manager router load failed:', e.message);
}
try {
  const { createPatientTransportRouter } = require('../services/dddPatientTransport');
  patientTransportRouter = createPatientTransportRouter();
} catch (e) {
  console.warn('[Platform] Patient Transport router load failed:', e.message);
}
try {
  const { createFleetTrackerRouter } = require('../services/dddFleetTracker');
  fleetTrackerRouter = createFleetTrackerRouter();
} catch (e) {
  console.warn('[Platform] Fleet Tracker router load failed:', e.message);
}
try {
  const { createRouteOptimizerRouter } = require('../services/dddRouteOptimizer');
  routeOptimizerRouter = createRouteOptimizerRouter();
} catch (e) {
  console.warn('[Platform] Route Optimizer router load failed:', e.message);
}
try {
  const { createVolunteerManagerRouter } = require('../services/dddVolunteerManager');
  volunteerManagerRouter = createVolunteerManagerRouter();
} catch (e) {
  console.warn('[Platform] Volunteer Manager router load failed:', e.message);
}
try {
  const { createCommunityProgramRouter } = require('../services/dddCommunityProgram');
  communityProgramRouter = createCommunityProgramRouter();
} catch (e) {
  console.warn('[Platform] Community Program router load failed:', e.message);
}
try {
  const { createOutreachTrackerRouter } = require('../services/dddOutreachTracker');
  outreachTrackerRouter = createOutreachTrackerRouter();
} catch (e) {
  console.warn('[Platform] Outreach Tracker router load failed:', e.message);
}
try {
  const { createDonationManagerRouter } = require('../services/dddDonationManager');
  donationManagerRouter = createDonationManagerRouter();
} catch (e) {
  console.warn('[Platform] Donation Manager router load failed:', e.message);
}
try {
  const { createContractManagerRouter } = require('../services/dddContractManager');
  contractManagerRouter = createContractManagerRouter();
} catch (e) {
  console.warn('[Platform] Contract Manager router load failed:', e.message);
}
try {
  const { createLegalCaseTrackerRouter } = require('../services/dddLegalCaseTracker');
  legalCaseTrackerRouter = createLegalCaseTrackerRouter();
} catch (e) {
  console.warn('[Platform] Legal Case Tracker router load failed:', e.message);
}
try {
  const { createPolicyGovernanceRouter } = require('../services/dddPolicyGovernance');
  policyGovernanceRouter = createPolicyGovernanceRouter();
} catch (e) {
  console.warn('[Platform] Policy Governance router load failed:', e.message);
}
try {
  const { createRegulatoryTrackerRouter } = require('../services/dddRegulatoryTracker');
  regulatoryTrackerRouter = createRegulatoryTrackerRouter();
} catch (e) {
  console.warn('[Platform] Regulatory Tracker router load failed:', e.message);
}

/* Phase 27 — Patient Feedback & Satisfaction Management */
try {
  const { createFeedbackManagerRouter } = require('../services/dddFeedbackManager');
  feedbackManagerRouter = createFeedbackManagerRouter();
} catch (e) {
  console.warn('[Platform] Feedback Manager router load failed:', e.message);
}
try {
  const { createSatisfactionTrackerRouter } = require('../services/dddSatisfactionTracker');
  satisfactionTrackerRouter = createSatisfactionTrackerRouter();
} catch (e) {
  console.warn('[Platform] Satisfaction Tracker router load failed:', e.message);
}
try {
  const { createComplaintManagerRouter } = require('../services/dddComplaintManager');
  complaintManagerRouter = createComplaintManagerRouter();
} catch (e) {
  console.warn('[Platform] Complaint Manager router load failed:', e.message);
}
try {
  const { createPatientExperienceRouter } = require('../services/dddPatientExperience');
  patientExperienceRouter = createPatientExperienceRouter();
} catch (e) {
  console.warn('[Platform] Patient Experience router load failed:', e.message);
}

/* Phase 28 — Research & Evidence-Based Practice */
try {
  const { createResearchProtocolRouter } = require('../services/dddResearchProtocol');
  researchProtocolRouter = createResearchProtocolRouter();
} catch (e) {
  console.warn('[Platform] Research Protocol router load failed:', e.message);
}
try {
  const { createEvidenceLibraryRouter } = require('../services/dddEvidenceLibrary');
  evidenceLibraryRouter = createEvidenceLibraryRouter();
} catch (e) {
  console.warn('[Platform] Evidence Library router load failed:', e.message);
}
try {
  const { createClinicalTrialRouter } = require('../services/dddClinicalTrial');
  clinicalTrialRouter = createClinicalTrialRouter();
} catch (e) {
  console.warn('[Platform] Clinical Trial router load failed:', e.message);
}
try {
  const { createPublicationTrackerRouter } = require('../services/dddPublicationTracker');
  publicationTrackerRouter = createPublicationTrackerRouter();
} catch (e) {
  console.warn('[Platform] Publication Tracker router load failed:', e.message);
}
try {
  const { createWorkforceAnalyticsRouter } = require('../services/dddWorkforceAnalytics');
  workforceAnalyticsRouter = createWorkforceAnalyticsRouter();
} catch (e) {
  console.warn('[Platform] Workforce Analytics router load failed:', e.message);
}
try {
  const { createCredentialManagerRouter } = require('../services/dddCredentialManager');
  credentialManagerRouter = createCredentialManagerRouter();
} catch (e) {
  console.warn('[Platform] Credential Manager router load failed:', e.message);
}
try {
  const { createMentorshipProgramRouter } = require('../services/dddMentorshipProgram');
  mentorshipProgramRouter = createMentorshipProgramRouter();
} catch (e) {
  console.warn('[Platform] Mentorship Program router load failed:', e.message);
}
try {
  const { createCareerPathwayRouter } = require('../services/dddCareerPathway');
  careerPathwayRouter = createCareerPathwayRouter();
} catch (e) {
  console.warn('[Platform] Career Pathway router load failed:', e.message);
}
try {
  const { createAccreditationManagerRouter } = require('../services/dddAccreditationManager');
  accreditationManagerRouter = createAccreditationManagerRouter();
} catch (e) {
  console.warn('[Platform] Accreditation Manager router load failed:', e.message);
}
try {
  const { createInspectionTrackerRouter } = require('../services/dddInspectionTracker');
  inspectionTrackerRouter = createInspectionTrackerRouter();
} catch (e) {
  console.warn('[Platform] Inspection Tracker router load failed:', e.message);
}
try {
  const { createStandardsComplianceRouter } = require('../services/dddStandardsCompliance');
  standardsComplianceRouter = createStandardsComplianceRouter();
} catch (e) {
  console.warn('[Platform] Standards Compliance router load failed:', e.message);
}
try {
  const { createLicensureManagerRouter } = require('../services/dddLicensureManager');
  licensureManagerRouter = createLicensureManagerRouter();
} catch (e) {
  console.warn('[Platform] Licensure Manager router load failed:', e.message);
}
try {
  const { createPatientPortalRouter } = require('../services/dddPatientPortal');
  patientPortalRouter = createPatientPortalRouter();
} catch (e) {
  console.warn('[Platform] Patient Portal router load failed:', e.message);
}
try {
  const { createHealthEducationRouter } = require('../services/dddHealthEducation');
  healthEducationRouter = createHealthEducationRouter();
} catch (e) {
  console.warn('[Platform] Health Education router load failed:', e.message);
}
try {
  const { createRemoteMonitoringRouter } = require('../services/dddRemoteMonitoring');
  remoteMonitoringRouter = createRemoteMonitoringRouter();
} catch (e) {
  console.warn('[Platform] Remote Monitoring router load failed:', e.message);
}
try {
  const { createPatientCommunityRouter } = require('../services/dddPatientCommunity');
  patientCommunityRouter = createPatientCommunityRouter();
} catch (e) {
  console.warn('[Platform] Patient Community router load failed:', e.message);
}
try {
  const { createFhirIntegrationRouter } = require('../services/dddFhirIntegration');
  fhirIntegrationRouter = createFhirIntegrationRouter();
} catch (e) {
  console.warn('[Platform] FHIR Integration router load failed:', e.message);
}
try {
  const { createHL7MessagingRouter } = require('../services/dddHL7Messaging');
  hl7MessagingRouter = createHL7MessagingRouter();
} catch (e) {
  console.warn('[Platform] HL7 Messaging router load failed:', e.message);
}
try {
  const { createDataExchangeRouter } = require('../services/dddDataExchange');
  dataExchangeRouter = createDataExchangeRouter();
} catch (e) {
  console.warn('[Platform] Data Exchange router load failed:', e.message);
}
try {
  const { createInteroperabilityHubRouter } = require('../services/dddInteroperabilityHub');
  interoperabilityHubRouter = createInteroperabilityHubRouter();
} catch (e) {
  console.warn('[Platform] Interoperability Hub router load failed:', e.message);
}
try {
  const { createBackupManagerRouter } = require('../services/dddBackupManager');
  backupManagerRouter = createBackupManagerRouter();
} catch (e) {
  console.warn('[Platform] Backup Manager router load failed:', e.message);
}
try {
  const { createBusinessContinuityRouter } = require('../services/dddBusinessContinuity');
  businessContinuityRouter = createBusinessContinuityRouter();
} catch (e) {
  console.warn('[Platform] Business Continuity router load failed:', e.message);
}
try {
  const { createSystemFailoverRouter } = require('../services/dddSystemFailover');
  systemFailoverRouter = createSystemFailoverRouter();
} catch (e) {
  console.warn('[Platform] System Failover router load failed:', e.message);
}
try {
  const { createIncidentResponseRouter } = require('../services/dddIncidentResponse');
  incidentResponseRouter = createIncidentResponseRouter();
} catch (e) {
  console.warn('[Platform] Incident Response router load failed:', e.message);
}
try {
  const { createEquipmentLifecycleRouter } = require('../services/dddEquipmentLifecycle');
  equipmentLifecycleRouter = createEquipmentLifecycleRouter();
} catch (e) {
  console.warn('[Platform] Equipment Lifecycle router load failed:', e.message);
}
try {
  const { createEnvironmentalMonitoringRouter } = require('../services/dddEnvironmentalMonitoring');
  environmentalMonitoringRouter = createEnvironmentalMonitoringRouter();
} catch (e) {
  console.warn('[Platform] Environmental Monitoring router load failed:', e.message);
}
try {
  const { createSpaceManagementRouter } = require('../services/dddSpaceManagement');
  spaceManagementRouter = createSpaceManagementRouter();
} catch (e) {
  console.warn('[Platform] Space Management router load failed:', e.message);
}
try {
  const { createAssetTrackingRouter } = require('../services/dddAssetTracking');
  assetTrackingRouter = createAssetTrackingRouter();
} catch (e) {
  console.warn('[Platform] Asset Tracking router load failed:', e.message);
}
try {
  const { createClinicalResearchRouter } = require('../services/dddClinicalResearch');
  clinicalResearchRouter = createClinicalResearchRouter();
} catch (e) {
  console.warn('[Platform] Clinical Research router load failed:', e.message);
}
try {
  const { createClinicalTrialsRouter } = require('../services/dddClinicalTrials');
  clinicalTrialsRouter = createClinicalTrialsRouter();
} catch (e) {
  console.warn('[Platform] Clinical Trials router load failed:', e.message);
}
try {
  const { createOutcomeResearchRouter } = require('../services/dddOutcomeResearch');
  outcomeResearchRouter = createOutcomeResearchRouter();
} catch (e) {
  console.warn('[Platform] Outcome Research router load failed:', e.message);
}
try {
  const { createPublicationManagerRouter } = require('../services/dddPublicationManager');
  publicationManagerRouter = createPublicationManagerRouter();
} catch (e) {
  console.warn('[Platform] Publication Manager router load failed:', e.message);
}
try {
  const { createVolunteerManagementRouter } = require('../services/dddVolunteerManagement');
  volunteerManagementRouter = createVolunteerManagementRouter();
} catch (e) {
  console.warn('[Platform] Volunteer Management router load failed:', e.message);
}
try {
  const { createCommunityOutreachRouter } = require('../services/dddCommunityOutreach');
  communityOutreachRouter = createCommunityOutreachRouter();
} catch (e) {
  console.warn('[Platform] Community Outreach router load failed:', e.message);
}
try {
  const { createDonorRelationsRouter } = require('../services/dddDonorRelations');
  donorRelationsRouter = createDonorRelationsRouter();
} catch (e) {
  console.warn('[Platform] Donor Relations router load failed:', e.message);
}
try {
  const { createAdvocacyProgramRouter } = require('../services/dddAdvocacyProgram');
  advocacyProgramRouter = createAdvocacyProgramRouter();
} catch (e) {
  console.warn('[Platform] Advocacy Program router load failed:', e.message);
}

/* ── GET /health — Full platform health check ── */
router.get('/health', async (req, res) => {
  try {
    const { listDomains, healthCheckAll } = require('../domains');
    const domains = listDomains();

    // Database connection
    const dbState = mongoose.connection.readyState;
    const dbStatus = dbState === 1 ? 'connected' : dbState === 2 ? 'connecting' : 'disconnected';

    // Domain health
    let domainHealth;
    try {
      domainHealth = await healthCheckAll();
    } catch {
      domainHealth = domains.map(d => ({ name: d.name, status: 'unknown' }));
    }

    // Model count
    const modelNames = mongoose.modelNames();

    // Memory usage
    const mem = process.memoryUsage();

    const health = {
      status: dbStatus === 'connected' ? 'healthy' : 'degraded',
      platform: 'Unified Rehabilitation Intelligence Platform',
      platformAr: 'منصة التأهيل الموحدة الذكية',
      version: '2.0.0-ddd',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      database: {
        status: dbStatus,
        name: mongoose.connection.name || 'alawael-erp',
      },
      domains: {
        total: domains.length,
        list: domains.map(d => ({
          name: d.name,
          version: d.version,
          prefix: d.prefix,
          description: d.description,
          status: 'active',
        })),
      },
      models: {
        total: modelNames.length,
        list: modelNames.sort(),
      },
      memory: {
        rss: `${Math.round(mem.rss / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(mem.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(mem.heapTotal / 1024 / 1024)}MB`,
      },
      node: process.version,
    };

    res.json(health);
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: err.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/* ── GET /domains — List all domains ── */
router.get('/domains', (req, res) => {
  try {
    const { listDomains } = require('../domains');
    const domains = listDomains();

    res.json({
      total: domains.length,
      domains: domains.map(d => ({
        name: d.name,
        version: d.version,
        prefix: d.prefix,
        description: d.description,
        endpoints: [`/api/v1/${d.prefix || d.name}`, `/api/v2/${d.prefix || d.name}`],
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── GET /stats — Platform-wide statistics ── */
router.get('/stats', async (req, res) => {
  try {
    const db = mongoose.connection;
    if (db.readyState !== 1) {
      return res.status(503).json({ error: 'Database not connected' });
    }

    // Count documents across core collections
    const collections = [
      { name: 'beneficiaries', label: 'المستفيدون', labelEn: 'Beneficiaries' },
      { name: 'episodesofcares', label: 'حلقات الرعاية', labelEn: 'Episodes' },
      { name: 'clinicalsessions', label: 'الجلسات', labelEn: 'Sessions' },
      { name: 'clinicalassessments', label: 'التقييمات', labelEn: 'Assessments' },
      { name: 'therapeuticgoals', label: 'الأهداف', labelEn: 'Goals' },
      { name: 'unifiedcareplans', label: 'خطط الرعاية', labelEn: 'Care Plans' },
      { name: 'workflowtasks', label: 'المهام', labelEn: 'Tasks' },
      { name: 'recommendations', label: 'التوصيات', labelEn: 'Recommendations' },
      { name: 'qualityaudits', label: 'مراجعات الجودة', labelEn: 'Audits' },
      { name: 'familymembers', label: 'أفراد الأسرة', labelEn: 'Family Members' },
      { name: 'therapygroups', label: 'المجموعات العلاجية', labelEn: 'Groups' },
      { name: 'telesessions', label: 'جلسات عن بُعد', labelEn: 'Tele Sessions' },
      { name: 'arvrsessions', label: 'جلسات AR/VR', labelEn: 'AR/VR Sessions' },
      { name: 'behaviorrecords', label: 'سجلات السلوك', labelEn: 'Behavior Records' },
      { name: 'researchstudies', label: 'الدراسات', labelEn: 'Studies' },
      { name: 'trainingprograms', label: 'برامج التدريب', labelEn: 'Training Programs' },
    ];

    const statPromises = collections.map(async col => {
      try {
        const count = await db.collection(col.name).countDocuments();
        return { ...col, count };
      } catch {
        return { ...col, count: 0 };
      }
    });

    const stats = await Promise.all(statPromises);
    const totalDocuments = stats.reduce((s, st) => s + st.count, 0);

    res.json({
      totalDocuments,
      collections: stats,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── GET /version — Version info ── */
router.get('/version', (req, res) => {
  const { listDomains } = require('../domains');
  const domains = listDomains();
  const modelCount = mongoose.modelNames().length;

  res.json({
    platform: 'Unified Rehabilitation Intelligence Platform',
    platformAr: 'منصة التأهيل الموحدة الذكية',
    version: '2.0.0-ddd',
    architecture: 'Domain-Driven Design (DDD)',
    domains: domains.length,
    models: modelCount,
    endpoints: domains.length * 3, // /api, /api/v1, /api/v2
    features: [
      '20 DDD domains',
      '34 Mongoose models',
      '12-phase Episode of Care',
      'Beneficiary 360° profile',
      'AI Recommendations engine',
      'Decision Support with 8 rules',
      'Real-time Socket.IO events',
      'Comprehensive quality audits',
      '15 standard KPIs',
      'Group & Tele-Rehabilitation',
      'AR/VR sessions',
      'Family portal',
      'Field training management',
      'Clinical research tracking',
    ],
    buildDate: new Date().toISOString(),
  });
});

/* ── Phase 3: Mount Search + Batch routers ── */
if (searchRouter) router.use('/', searchRouter);
if (batchRouter) router.use('/', batchRouter);

/* ── Phase 4: Mount Analytics + Export routers ── */
if (analyticsRouter) router.use('/', analyticsRouter);
if (exportRouter) router.use('/', exportRouter);

/* ── Phase 5: Mount Attachments + Webhooks + Reports routers ── */
if (attachmentsRouter) router.use('/', attachmentsRouter);
if (webhookRouter) router.use('/', webhookRouter);
if (reportBuilderRouter) router.use('/', reportBuilderRouter);

/* ── Phase 6: Mount Clinical Intelligence routers ── */
if (clinicalEngineRouter) router.use('/', clinicalEngineRouter);
if (outcomeRouter) router.use('/', outcomeRouter);
if (riskStratRouter) router.use('/', riskStratRouter);
if (smartSchedulerRouter) router.use('/', smartSchedulerRouter);

/* ── Phase 7: Mount Data Governance & Compliance routers ── */
if (consentRouter) router.use('/', consentRouter);
if (complianceRouter) router.use('/', complianceRouter);
if (dataQualityRouter) router.use('/', dataQualityRouter);
if (interopRouter) router.use('/', interopRouter);

/* ── Phase 8: Mount Multi-Tenancy, Configuration & Localization routers ── */
if (tenantRouter) router.use('/', tenantRouter);
if (featureFlagRouter) router.use('/', featureFlagRouter);
if (configRouter) router.use('/', configRouter);
if (localizationRouter) router.use('/', localizationRouter);

/* ── Phase 9: Mount Monitoring, Health & Resilience routers ── */
if (healthMonitorRouter) router.use('/', healthMonitorRouter);
if (metricsRouter) router.use('/', metricsRouter);
if (circuitBreakerRouter) router.use('/', circuitBreakerRouter);
if (errorTrackerRouter) router.use('/', errorTrackerRouter);

/* ── Phase 10: Mount API Gateway, Migration, Task Queue & Dev Portal routers ── */
if (apiGatewayRouter) router.use('/', apiGatewayRouter);
if (dataMigrationRouter) router.use('/', dataMigrationRouter);
if (taskQueueRouter) router.use('/', taskQueueRouter);
if (devPortalRouter) router.use('/', devPortalRouter);

/* ── Phase 11: Mount Advanced Security & Access Control routers ── */
if (securityAuditorRouter) router.use('/', securityAuditorRouter);
if (sessionManagerRouter) router.use('/', sessionManagerRouter);
if (encryptionRouter) router.use('/', encryptionRouter);
if (accessControlRouter) router.use('/', accessControlRouter);

/* ── Phase 12: Mount Advanced Analytics & Business Intelligence routers ── */
if (analyticsDashboardRouter) router.use('/', analyticsDashboardRouter);
if (predictiveEngineRouter) router.use('/', predictiveEngineRouter);
if (dataWarehouseRouter) router.use('/', dataWarehouseRouter);
if (businessIntelligenceRouter) router.use('/', businessIntelligenceRouter);

/* ── Phase 13: Mount Real-time Collaboration & Communication routers ── */
if (collaborationHubRouter) router.use('/', collaborationHubRouter);
if (caseConferenceRouter) router.use('/', caseConferenceRouter);
if (documentCollaborationRouter) router.use('/', documentCollaborationRouter);
if (activityFeedRouter) router.use('/', activityFeedRouter);

/* ── Phase 14: Mount Resource Management & Capacity Planning routers ── */
if (resourceManagerRouter) router.use('/', resourceManagerRouter);
if (capacityPlannerRouter) router.use('/', capacityPlannerRouter);
if (appointmentEngineRouter) router.use('/', appointmentEngineRouter);
if (assetTrackerRouter) router.use('/', assetTrackerRouter);

/* ── Phase 15: Mount Workflow & Process Automation routers ── */
if (workflowEngineRouter) router.use('/', workflowEngineRouter);
if (formBuilderRouter) router.use('/', formBuilderRouter);
if (approvalChainRouter) router.use('/', approvalChainRouter);
if (documentGeneratorRouter) router.use('/', documentGeneratorRouter);

/* Phase 16 — Financial & Billing Management */
if (billingEngineRouter) router.use('/', billingEngineRouter);
if (insuranceManagerRouter) router.use('/', insuranceManagerRouter);
if (claimsProcessorRouter) router.use('/', claimsProcessorRouter);
if (paymentGatewayRouter) router.use('/', paymentGatewayRouter);

/* Phase 17 — Learning Management & Training */
if (learningManagementRouter) router.use('/', learningManagementRouter);
if (competencyTrackerRouter) router.use('/', competencyTrackerRouter);
if (continuousEducationRouter) router.use('/', continuousEducationRouter);
if (knowledgeBaseRouter) router.use('/', knowledgeBaseRouter);

/* Phase 18 — Supply Chain & Inventory Management */
if (inventoryManagerRouter) router.use('/', inventoryManagerRouter);
if (procurementEngineRouter) router.use('/', procurementEngineRouter);
if (supplyChainTrackerRouter) router.use('/', supplyChainTrackerRouter);
if (warehouseManagerRouter) router.use('/', warehouseManagerRouter);
if (facilityManagerRouter) router.use('/', facilityManagerRouter);
if (environmentalMonitorRouter) router.use('/', environmentalMonitorRouter);
if (spaceAllocatorRouter) router.use('/', spaceAllocatorRouter);
if (maintenanceTrackerRouter) router.use('/', maintenanceTrackerRouter);
if (staffManagerRouter) router.use('/', staffManagerRouter);
if (shiftSchedulerRouter) router.use('/', shiftSchedulerRouter);
if (performanceEvaluatorRouter) router.use('/', performanceEvaluatorRouter);
if (leaveManagerRouter) router.use('/', leaveManagerRouter);
if (messageCenterRouter) router.use('/', messageCenterRouter);
if (notificationEngineRouter) router.use('/', notificationEngineRouter);
if (announcementManagerRouter) router.use('/', announcementManagerRouter);
if (communicationLogRouter) router.use('/', communicationLogRouter);
if (documentVaultRouter) router.use('/', documentVaultRouter);
if (recordManagerRouter) router.use('/', recordManagerRouter);
if (digitalSignatureRouter) router.use('/', digitalSignatureRouter);
if (archiveManagerRouter) router.use('/', archiveManagerRouter);
if (incidentTrackerRouter) router.use('/', incidentTrackerRouter);
if (emergencyResponseRouter) router.use('/', emergencyResponseRouter);
if (disasterRecoveryRouter) router.use('/', disasterRecoveryRouter);
if (safetyManagerRouter) router.use('/', safetyManagerRouter);
if (transportManagerRouter) router.use('/', transportManagerRouter);
if (patientTransportRouter) router.use('/', patientTransportRouter);
if (fleetTrackerRouter) router.use('/', fleetTrackerRouter);
if (routeOptimizerRouter) router.use('/', routeOptimizerRouter);
if (volunteerManagerRouter) router.use('/', volunteerManagerRouter);
if (communityProgramRouter) router.use('/', communityProgramRouter);
if (outreachTrackerRouter) router.use('/', outreachTrackerRouter);
if (donationManagerRouter) router.use('/', donationManagerRouter);
if (contractManagerRouter) router.use('/', contractManagerRouter);
if (legalCaseTrackerRouter) router.use('/', legalCaseTrackerRouter);
if (policyGovernanceRouter) router.use('/', policyGovernanceRouter);
if (regulatoryTrackerRouter) router.use('/', regulatoryTrackerRouter);
if (feedbackManagerRouter) router.use('/', feedbackManagerRouter);
if (satisfactionTrackerRouter) router.use('/', satisfactionTrackerRouter);
if (complaintManagerRouter) router.use('/', complaintManagerRouter);
if (patientExperienceRouter) router.use('/', patientExperienceRouter);
if (researchProtocolRouter) router.use('/', researchProtocolRouter);
if (evidenceLibraryRouter) router.use('/', evidenceLibraryRouter);
if (clinicalTrialRouter) router.use('/', clinicalTrialRouter);
if (publicationTrackerRouter) router.use('/', publicationTrackerRouter);
if (workforceAnalyticsRouter) router.use('/', workforceAnalyticsRouter);
if (credentialManagerRouter) router.use('/', credentialManagerRouter);
if (mentorshipProgramRouter) router.use('/', mentorshipProgramRouter);
if (careerPathwayRouter) router.use('/', careerPathwayRouter);
if (accreditationManagerRouter) router.use('/', accreditationManagerRouter);
if (inspectionTrackerRouter) router.use('/', inspectionTrackerRouter);
if (standardsComplianceRouter) router.use('/', standardsComplianceRouter);
if (licensureManagerRouter) router.use('/', licensureManagerRouter);
if (patientPortalRouter) router.use('/', patientPortalRouter);
if (healthEducationRouter) router.use('/', healthEducationRouter);
if (remoteMonitoringRouter) router.use('/', remoteMonitoringRouter);
if (patientCommunityRouter) router.use('/', patientCommunityRouter);
if (fhirIntegrationRouter) router.use('/', fhirIntegrationRouter);
if (hl7MessagingRouter) router.use('/', hl7MessagingRouter);
if (dataExchangeRouter) router.use('/', dataExchangeRouter);
if (interoperabilityHubRouter) router.use('/', interoperabilityHubRouter);
if (backupManagerRouter) router.use('/', backupManagerRouter);
if (businessContinuityRouter) router.use('/', businessContinuityRouter);
if (systemFailoverRouter) router.use('/', systemFailoverRouter);
if (incidentResponseRouter) router.use('/', incidentResponseRouter);
if (equipmentLifecycleRouter) router.use('/', equipmentLifecycleRouter);
if (environmentalMonitoringRouter) router.use('/', environmentalMonitoringRouter);
if (spaceManagementRouter) router.use('/', spaceManagementRouter);
if (assetTrackingRouter) router.use('/', assetTrackingRouter);
if (clinicalResearchRouter) router.use('/', clinicalResearchRouter);
if (clinicalTrialsRouter) router.use('/', clinicalTrialsRouter);
if (outcomeResearchRouter) router.use('/', outcomeResearchRouter);
if (publicationManagerRouter) router.use('/', publicationManagerRouter);
if (volunteerManagementRouter) router.use('/', volunteerManagementRouter);
if (communityOutreachRouter) router.use('/', communityOutreachRouter);
if (donorRelationsRouter) router.use('/', donorRelationsRouter);
if (advocacyProgramRouter) router.use('/', advocacyProgramRouter);

/* ── Notification templates listing ── */
router.get('/notifications/templates', (_req, res) => {
  try {
    const { listTemplates } = require('../services/dddNotificationDispatcher');
    res.json({ success: true, templates: listTemplates() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ── Notification delivery logs ── */
router.get('/notifications/logs', async (req, res) => {
  try {
    const { getNotificationLogs } = require('../services/dddNotificationDispatcher');
    const { templateKey, domain, limit, page, startDate, endDate } = req.query;
    const data = await getNotificationLogs({
      templateKey,
      domain,
      limit: parseInt(limit, 10) || 50,
      page: parseInt(page, 10) || 1,
      startDate,
      endDate,
    });
    res.json({ success: true, ...data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ── Scheduler status endpoint ── */
router.get('/scheduler', (_req, res) => {
  try {
    const { getSchedulerStatus } = require('../services/dddScheduler');
    res.json({ success: true, ...getSchedulerStatus() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ── Automation logs endpoint ── */
router.get('/automations/logs', async (req, res) => {
  try {
    const { getAutomationLogs } = require('../integration/dddWorkflowAutomations');
    const { ruleId, domain, status, limit, page, startDate, endDate } = req.query;
    const data = await getAutomationLogs({
      ruleId,
      domain,
      status,
      limit: parseInt(limit, 10) || 50,
      page: parseInt(page, 10) || 1,
      startDate,
      endDate,
    });
    res.json({ success: true, ...data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
