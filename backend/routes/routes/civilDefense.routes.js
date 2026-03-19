/**
 * Civil Defense Integration Routes
 * مسارات تكامل الدفاع المدني
 */

const express = require('express');
const router = express.Router();
const civilDefenseController = require('../controllers/civilDefense.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// ==================== Safety Certificates ====================
/**
 * @route   POST /api/civil-defense/certificates/request
 * @desc    Request a safety certificate
 * @access  Private
 */
router.post(
  '/certificates/request',
  authenticate,
  authorize('create_certificate', 'admin'),
  civilDefenseController.requestSafetyCertificate
);

/**
 * @route   GET /api/civil-defense/certificates/:certificateId/status
 * @desc    Get safety certificate status
 * @access  Private
 */
router.get(
  '/certificates/:certificateId/status',
  authenticate,
  civilDefenseController.getCertificateStatus
);

/**
 * @route   POST /api/civil-defense/certificates/:certificateId/renew
 * @desc    Renew safety certificate
 * @access  Private
 */
router.post(
  '/certificates/:certificateId/renew',
  authenticate,
  authorize('renew_certificate', 'admin'),
  civilDefenseController.renewSafetyCertificate
);

/**
 * @route   GET /api/civil-defense/certificates/facility/:facilityId
 * @desc    Get all certificates for a facility
 * @access  Private
 */
router.get(
  '/certificates/facility/:facilityId',
  authenticate,
  civilDefenseController.getCertificatesForFacility
);

/**
 * @route   GET /api/civil-defense/certificates
 * @desc    List all certificates (with filters)
 * @access  Private
 */
router.get(
  '/certificates',
  authenticate,
  authorize('view_certificates', 'admin'),
  civilDefenseController.listCertificates
);

// ==================== Safety Audits ====================
/**
 * @route   POST /api/civil-defense/audits/schedule
 * @desc    Schedule a safety audit
 * @access  Private
 */
router.post(
  '/audits/schedule',
  authenticate,
  authorize('schedule_audit', 'admin'),
  civilDefenseController.scheduleSafetyAudit
);

/**
 * @route   GET /api/civil-defense/audits/:auditId
 * @desc    Get audit details
 * @access  Private
 */
router.get(
  '/audits/:auditId',
  authenticate,
  civilDefenseController.getAuditDetails
);

/**
 * @route   GET /api/civil-defense/audits/facility/:facilityId
 * @desc    Get all audits for a facility
 * @access  Private
 */
router.get(
  '/audits/facility/:facilityId',
  authenticate,
  civilDefenseController.getAuditsByFacility
);

/**
 * @route   GET /api/civil-defense/audit-slots/available
 * @desc    Get available audit appointment slots
 * @access  Private
 */
router.get(
  '/audit-slots/available',
  authenticate,
  civilDefenseController.getAvailableAuditSlots
);

/**
 * @route   POST /api/civil-defense/audits/:auditId/complete
 * @desc    Mark audit as complete
 * @access  Private (Admin/Civil Defense Personnel)
 */
router.post(
  '/audits/:auditId/complete',
  authenticate,
  authorize('complete_audit', 'admin'),
  civilDefenseController.completeAudit
);

// ==================== Compliance ====================
/**
 * @route   GET /api/civil-defense/compliance/:facilityId
 * @desc    Get compliance status for a facility
 * @access  Private
 */
router.get(
  '/compliance/:facilityId',
  authenticate,
  civilDefenseController.getComplianceStatus
);

/**
 * @route   GET /api/civil-defense/compliance/:facilityId/violations
 * @desc    Get violations for a facility
 * @access  Private
 */
router.get(
  '/compliance/:facilityId/violations',
  authenticate,
  civilDefenseController.getViolations
);

/**
 * @route   POST /api/civil-defense/compliance/:facilityId/resolve-violation
 * @desc    Mark violation as resolved
 * @access  Private
 */
router.post(
  '/compliance/:facilityId/resolve-violation',
  authenticate,
  authorize('resolve_violation', 'admin'),
  civilDefenseController.resolveViolation
);

/**
 * @route   GET /api/civil-defense/compliance/report/:facilityId
 * @desc    Generate compliance report
 * @access  Private
 */
router.get(
  '/compliance/report/:facilityId',
  authenticate,
  civilDefenseController.generateComplianceReport
);

// ==================== Fire Safety ====================
/**
 * @route   POST /api/civil-defense/fire-safety/inspections/schedule
 * @desc    Schedule fire safety inspection
 * @access  Private
 */
router.post(
  '/fire-safety/inspections/schedule',
  authenticate,
  authorize('schedule_inspection', 'admin'),
  civilDefenseController.scheduleFireSafetyInspection
);

/**
 * @route   GET /api/civil-defense/fire-safety/status/:facilityId
 * @desc    Get fire safety status
 * @access  Private
 */
router.get(
  '/fire-safety/status/:facilityId',
  authenticate,
  civilDefenseController.getFireSafetyStatus
);

/**
 * @route   POST /api/civil-defense/fire-safety/equipment/update
 * @desc    Update fire safety equipment status
 * @access  Private
 */
router.post(
  '/fire-safety/equipment/update',
  authenticate,
  authorize('update_equipment', 'admin'),
  civilDefenseController.updateFireSafetyEquipment
);

/**
 * @route   POST /api/civil-defense/fire-safety/maintenance/log
 * @desc    Log maintenance activity
 * @access  Private
 */
router.post(
  '/fire-safety/maintenance/log',
  authenticate,
  authorize('log_maintenance', 'admin'),
  civilDefenseController.logMaintenanceActivity
);

// ==================== Emergency Management ====================
/**
 * @route   POST /api/civil-defense/emergency-drills/schedule
 * @desc    Schedule emergency drill
 * @access  Private
 */
router.post(
  '/emergency-drills/schedule',
  authenticate,
  authorize('schedule_drill', 'admin'),
  civilDefenseController.scheduleEmergencyDrill
);

/**
 * @route   GET /api/civil-defense/emergency-drills/:drillId/results
 * @desc    Get emergency drill results
 * @access  Private
 */
router.get(
  '/emergency-drills/:drillId/results',
  authenticate,
  civilDefenseController.getEmergencyDrillResults
);

/**
 * @route   GET /api/civil-defense/emergency-drills/facility/:facilityId
 * @desc    Get all emergency drills for a facility
 * @access  Private
 */
router.get(
  '/emergency-drills/facility/:facilityId',
  authenticate,
  civilDefenseController.getEmergencyDrillsByFacility
);

/**
 * @route   POST /api/civil-defense/emergency-drills/:drillId/complete
 * @desc    Complete an emergency drill
 * @access  Private
 */
router.post(
  '/emergency-drills/:drillId/complete',
  authenticate,
  authorize('complete_drill', 'admin'),
  civilDefenseController.completeEmergencyDrill
);

// ==================== Documents ====================
/**
 * @route   POST /api/civil-defense/documents/upload
 * @desc    Upload safety documents
 * @access  Private
 */
router.post(
  '/documents/upload',
  authenticate,
  authorize('upload_documents', 'admin'),
  civilDefenseController.uploadSafetyDocuments
);

/**
 * @route   GET /api/civil-defense/documents/:facilityId
 * @desc    Get documents for a facility
 * @access  Private
 */
router.get(
  '/documents/:facilityId',
  authenticate,
  civilDefenseController.getFacilityDocuments
);

/**
 * @route   DELETE /api/civil-defense/documents/:documentId
 * @desc    Delete a document
 * @access  Private
 */
router.delete(
  '/documents/:documentId',
  authenticate,
  authorize('delete_documents', 'admin'),
  civilDefenseController.deleteDocument
);

/**
 * @route   GET /api/civil-defense/documents/requirements/:buildingType
 * @desc    Get required documents for building type
 * @access  Public
 */
router.get(
  '/documents/requirements/:buildingType',
  civilDefenseController.getRequiredDocuments
);

// ==================== Notifications ====================
/**
 * @route   GET /api/civil-defense/notifications/facility/:facilityId
 * @desc    Get notifications for facility
 * @access  Private
 */
router.get(
  '/notifications/facility/:facilityId',
  authenticate,
  civilDefenseController.getFacilityNotifications
);

/**
 * @route   POST /api/civil-defense/notifications/:notificationId/acknowledge
 * @desc    Acknowledge notification
 * @access  Private
 */
router.post(
  '/notifications/:notificationId/acknowledge',
  authenticate,
  civilDefenseController.acknowledgeNotification
);

// ==================== Reports & Analytics ====================
/**
 * @route   GET /api/civil-defense/reports/dashboard
 * @desc    Get dashboard data
 * @access  Private
 */
router.get(
  '/reports/dashboard',
  authenticate,
  authorize('view_reports', 'admin'),
  civilDefenseController.getDashboardData
);

/**
 * @route   GET /api/civil-defense/reports/facility/:facilityId
 * @desc    Generate facility report
 * @access  Private
 */
router.get(
  '/reports/facility/:facilityId',
  authenticate,
  civilDefenseController.generateFacilityReport
);

/**
 * @route   POST /api/civil-defense/reports/export
 * @desc    Export report (PDF/Excel)
 * @access  Private
 */
router.post(
  '/reports/export',
  authenticate,
  authorize('export_reports', 'admin'),
  civilDefenseController.exportReport
);

// ==================== Settings & Configuration ====================
/**
 * @route   GET /api/civil-defense/settings
 * @desc    Get Civil Defense integration settings
 * @access  Private (Admin)
 */
router.get(
  '/settings',
  authenticate,
  authorize('admin'),
  civilDefenseController.getSettings
);

/**
 * @route   PUT /api/civil-defense/settings
 * @desc    Update Civil Defense integration settings
 * @access  Private (Admin)
 */
router.put(
  '/settings',
  authenticate,
  authorize('admin'),
  civilDefenseController.updateSettings
);

/**
 * @route   GET /api/civil-defense/health
 * @desc    Check API health and connectivity
 * @access  Private (Admin)
 */
router.get(
  '/health',
  authenticate,
  authorize('admin'),
  civilDefenseController.checkHealth
);

// ==================== Search & Filter ====================
/**
 * @route   POST /api/civil-defense/search
 * @desc    Search across all records
 * @access  Private
 */
router.post(
  '/search',
  authenticate,
  civilDefenseController.globalSearch
);

/**
 * @route   GET /api/civil-defense/facilities/compliance-summary
 * @desc    Get summary of all facilities compliance status
 * @access  Private (Admin)
 */
router.get(
  '/facilities/compliance-summary',
  authenticate,
  authorize('admin'),
  civilDefenseController.getFacilitiesComplianceSummary
);

module.exports = router;
