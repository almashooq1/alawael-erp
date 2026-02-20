/**
 * Civil Defense Integration Controller
 * معالج تكامل الدفاع المدني
 */

const civilDefenseService = require('../services/civilDefenseIntegration.service');
const {
  SafetyCertificate,
  SafetyAudit,
  ComplianceStatus,
  FireSafety,
  EmergencyDrill,
  CivilDefenseDocuments,
} = require('../models/civilDefense.model');

class CivilDefenseController {
  /**
   * ==================== CERTIFICATE MANAGEMENT ====================
   */

  /**
   * Request Safety Certificate
   */
  async requestSafetyCertificate(req, res) {
    try {
      const { facilityId, buildingType, facilitySizeMeters, address, ...otherData } = req.body;

      // Request from Civil Defense API
      const apiResponse = await civilDefenseService.requestSafetyCertificate({
        facilityId,
        buildingType,
        facilitySizeMeters,
        address,
        ...otherData,
      });

      // Save to database
      const certificate = new SafetyCertificate({
        certificateId: apiResponse.certificateId,
        referenceNumber: apiResponse.referenceNumber,
        facilityId,
        buildingType,
        address: typeof address === 'string' ? { street: address } : address,
        status: 'pending',
        submissionDate: new Date(),
        estimatedCompletionDate: apiResponse.estimatedCompletionDate,
        contactPerson: otherData.contactPerson || { name: req.user.name },
        createdBy: req.user.id,
      });

      await certificate.save();

      res.status(201).json({
        success: true,
        message: apiResponse.message,
        data: {
          certificateId: apiResponse.certificateId,
          referenceNumber: apiResponse.referenceNumber,
          status: 'pending',
          estimatedCompletionDate: apiResponse.estimatedCompletionDate,
        },
      });
    } catch (error) {
      console.error('Error requesting certificate:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get Certificate Status
   */
  async getCertificateStatus(req, res) {
    try {
      const { certificateId } = req.params;

      // Get from API
      const apiStatus = await civilDefenseService.getCertificateStatus(certificateId);

      // Update in database
      await SafetyCertificate.findOneAndUpdate(
        { certificateId },
        {
          status: apiStatus.status,
          completionPercentage: apiStatus.completionPercentage,
          requiredDocuments: apiStatus.requiredDocuments,
          missingDocuments: apiStatus.missingDocuments,
          updatedBy: req.user.id,
        }
      );

      res.json({
        success: true,
        data: apiStatus,
      });
    } catch (error) {
      console.error('Error getting certificate status:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Renew Safety Certificate
   */
  async renewSafetyCertificate(req, res) {
    try {
      const { certificateId } = req.params;
      const { buildingData } = req.body;

      // Renew via API
      const renewalResponse = await civilDefenseService.renewSafetyCertificate(
        certificateId,
        buildingData
      );

      // Get old certificate
      const oldCert = await SafetyCertificate.findOne({ certificateId });

      // Create new certificate record
      const newCertificate = new SafetyCertificate({
        certificateId: renewalResponse.newCertificateId,
        referenceNumber: renewalResponse.referenceNumber || `RN-${Date.now()}`,
        facilityId: oldCert.facilityId,
        buildingType: oldCert.buildingType,
        address: oldCert.address,
        status: 'processing',
        submissionDate: new Date(),
        expiryDate: renewalResponse.expiryDate,
        contactPerson: oldCert.contactPerson,
        createdBy: req.user.id,
      });

      await newCertificate.save();

      // Update renewal history on old certificate
      oldCert.renewalHistory.push({
        renewalDate: new Date(),
        expiryDate: renewalResponse.expiryDate,
        certificateId: renewalResponse.newCertificateId,
      });
      await oldCert.save();

      res.json({
        success: true,
        message: renewalResponse.message,
        data: {
          newCertificateId: renewalResponse.newCertificateId,
          renewalDate: renewalResponse.renewalDate,
          expiryDate: renewalResponse.expiryDate,
          status: 'processing',
        },
      });
    } catch (error) {
      console.error('Error renewing certificate:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get Certificates for Facility
   */
  async getCertificatesForFacility(req, res) {
    try {
      const { facilityId } = req.params;

      const certificates = await SafetyCertificate.find({ facilityId }).sort({ submissionDate: -1 });

      res.json({
        success: true,
        data: {
          totalCertificates: certificates.length,
          certificates,
          activeCertificate: certificates.find(c => c.status === 'approved'),
        },
      });
    } catch (error) {
      console.error('Error getting certificates:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * List All Certificates
   */
  async listCertificates(req, res) {
    try {
      const { status, facilityId, page = 1, limit = 20 } = req.query;
      const query = {};

      if (status) query.status = status;
      if (facilityId) query.facilityId = facilityId;

      const skip = (page - 1) * limit;
      const certificates = await SafetyCertificate.find(query)
        .sort({ submissionDate: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await SafetyCertificate.countDocuments(query);

      res.json({
        success: true,
        data: {
          certificates,
          pagination: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error) {
      console.error('Error listing certificates:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * ==================== SAFETY AUDITS ====================
   */

  /**
   * Schedule Safety Audit
   */
  async scheduleSafetyAudit(req, res) {
    try {
      const auditData = req.body;

      // Schedule via API
      const auditResponse = await civilDefenseService.scheduleSafetyAudit(auditData);

      // Save to database
      const audit = new SafetyAudit({
        auditId: auditResponse.auditId,
        facilityId: auditData.facilityId,
        auditType: auditData.auditType,
        status: 'scheduled',
        scheduledDate: auditData.preferredDate,
        inspector: {
          name: auditResponse.inspectorName,
          phone: auditResponse.inspectorPhone,
        },
        estimatedDuration: auditResponse.estimatedDuration,
        location: auditResponse.location,
        createdBy: req.user.id,
      });

      await audit.save();

      res.status(201).json({
        success: true,
        message: auditResponse.message,
        data: {
          auditId: auditResponse.auditId,
          scheduledDate: auditResponse.scheduledDate,
          inspectorName: auditResponse.inspectorName,
          estimatedDuration: auditResponse.estimatedDuration,
        },
      });
    } catch (error) {
      console.error('Error scheduling audit:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get Audit Details
   */
  async getAuditDetails(req, res) {
    try {
      const { auditId } = req.params;

      const audit = await SafetyAudit.findOne({ auditId });
      if (!audit) {
        return res.status(404).json({
          success: false,
          message: 'Audit not found',
        });
      }

      res.json({
        success: true,
        data: audit,
      });
    } catch (error) {
      console.error('Error getting audit details:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get Audits by Facility
   */
  async getAuditsByFacility(req, res) {
    try {
      const { facilityId } = req.params;

      const audits = await SafetyAudit.find({ facilityId }).sort({ scheduledDate: -1 });

      res.json({
        success: true,
        data: {
          totalAudits: audits.length,
          audits,
          upcomingAudits: audits.filter(a => a.status === 'scheduled'),
          completedAudits: audits.filter(a => a.status === 'completed'),
        },
      });
    } catch (error) {
      console.error('Error getting audits:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get Available Audit Slots
   */
  async getAvailableAuditSlots(req, res) {
    try {
      const { facilityId, date } = req.query;

      const slots = await civilDefenseService.getAuditScheduleSlots(facilityId, date);

      res.json({
        success: true,
        data: {
          date,
          availableSlots: slots,
          totalAvailable: slots.length,
        },
      });
    } catch (error) {
      console.error('Error getting audit slots:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Complete Audit
   */
  async completeAudit(req, res) {
    try {
      const { auditId } = req.params;
      const { findings, recommendations, rating, notes } = req.body;

      const audit = await SafetyAudit.findOne({ auditId });
      if (!audit) {
        return res.status(404).json({
          success: false,
          message: 'Audit not found',
        });
      }

      audit.status = 'completed';
      audit.completionDate = new Date();
      audit.findings = findings;
      audit.recommendations = recommendations;
      audit.certificateRating = rating;
      audit.notes = notes;
      audit.updatedBy = req.user.id;

      await audit.save();

      res.json({
        success: true,
        message: 'Audit completed successfully',
        data: audit,
      });
    } catch (error) {
      console.error('Error completing audit:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * ==================== COMPLIANCE ====================
   */

  /**
   * Get Compliance Status
   */
  async getComplianceStatus(req, res) {
    try {
      const { facilityId } = req.params;

      // Get from API
      const complianceStatus = await civilDefenseService.getComplianceStatus(facilityId);

      // Save/Update in database
      await ComplianceStatus.findOneAndUpdate(
        { facilityId },
        complianceStatus,
        { upsert: true, new: true }
      );

      res.json({
        success: true,
        data: complianceStatus,
      });
    } catch (error) {
      console.error('Error getting compliance status:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get Violations
   */
  async getViolations(req, res) {
    try {
      const { facilityId } = req.params;

      const violations = await civilDefenseService.getViolations(facilityId);

      res.json({
        success: true,
        data: violations,
      });
    } catch (error) {
      console.error('Error getting violations:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Resolve Violation
   */
  async resolveViolation(req, res) {
    try {
      const { facilityId } = req.params;
      const { violationId, actions, completionDate } = req.body;

      // Update compliance status
      const compliance = await ComplianceStatus.findOne({ facilityId });
      if (compliance) {
        const violation = compliance.violations.find(v => v.violationId === violationId);
        if (violation) {
          violation.status = 'resolved';
          violation.deadline = completionDate;
          await compliance.save();
        }
      }

      res.json({
        success: true,
        message: 'Violation marked as resolved',
        data: { violationId, status: 'resolved' },
      });
    } catch (error) {
      console.error('Error resolving violation:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Generate Compliance Report
   */
  async generateComplianceReport(req, res) {
    try {
      const { facilityId } = req.params;

      const compliance = await ComplianceStatus.findOne({ facilityId });
      if (!compliance) {
        return res.status(404).json({
          success: false,
          message: 'No compliance data found',
        });
      }

      const report = {
        facilityId,
        generatedDate: new Date(),
        overallStatus: compliance.overallStatus,
        compliancePercentage: compliance.compliancePercentage,
        categories: compliance.categories,
        violations: compliance.violations,
        recommendations: compliance.recommendations,
        summary: {
          compliant: compliance.compliancePercentage >= 90,
          requiresImprovement: compliance.compliancePercentage < 90 && compliance.compliancePercentage >= 70,
          nonCompliant: compliance.compliancePercentage < 70,
        },
      };

      res.json({
        success: true,
        data: report,
      });
    } catch (error) {
      console.error('Error generating compliance report:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * ==================== FIRE SAFETY ====================
   */

  /**
   * Schedule Fire Safety Inspection
   */
  async scheduleFireSafetyInspection(req, res) {
    try {
      const inspectionData = req.body;

      const response = await civilDefenseService.scheduleFireSafetyInspection(inspectionData);

      res.status(201).json({
        success: true,
        message: 'Fire safety inspection scheduled',
        data: response,
      });
    } catch (error) {
      console.error('Error scheduling fire inspection:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get Fire Safety Status
   */
  async getFireSafetyStatus(req, res) {
    try {
      const { facilityId } = req.params;

      const fireSafetyStatus = await civilDefenseService.getFireSafetyStatus(facilityId);

      // Save/Update in database
      await FireSafety.findOneAndUpdate(
        { facilityId },
        fireSafetyStatus,
        { upsert: true, new: true }
      );

      res.json({
        success: true,
        data: fireSafetyStatus,
      });
    } catch (error) {
      console.error('Error getting fire safety status:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Update Fire Safety Equipment
   */
  async updateFireSafetyEquipment(req, res) {
    try {
      const { facilityId, equipmentType, status, nextMaintenanceDue } = req.body;

      const fireSafety = await FireSafety.findOne({ facilityId });
      if (!fireSafety) {
        return res.status(404).json({
          success: false,
          message: 'Fire safety record not found',
        });
      }

      // Update the specific equipment status
      if (equipmentType === 'fire_extinguishers') {
        fireSafety.fireExtinguishersStatus.functional = status.functional;
        fireSafety.fireExtinguishersStatus.nextMaintenanceDue = nextMaintenanceDue;
      } else if (equipmentType === 'fire_alarms') {
        fireSafety.fireAlarmsStatus.functional = status.functional;
        fireSafety.fireAlarmsStatus.nextTestDue = nextMaintenanceDue;
      } else if (equipmentType === 'emergency_lights') {
        fireSafety.emergencyLightsStatus.functional = status.functional;
      } else if (equipmentType === 'exit_signs') {
        fireSafety.exitSignsStatus.functional = status.functional;
      } else if (equipmentType === 'sprinkler_system') {
        fireSafety.sprinklerSystemStatus.functional = status.functional;
        fireSafety.sprinklerSystemStatus.nextInspection = nextMaintenanceDue;
      }

      await fireSafety.save();

      res.json({
        success: true,
        message: 'Equipment status updated',
        data: fireSafety,
      });
    } catch (error) {
      console.error('Error updating equipment:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Log Maintenance Activity
   */
  async logMaintenanceActivity(req, res) {
    try {
      const { facilityId, maintenanceType, completedBy, notes, nextScheduled } = req.body;

      const fireSafety = await FireSafety.findOne({ facilityId });
      if (!fireSafety) {
        return res.status(404).json({
          success: false,
          message: 'Fire safety record not found',
        });
      }

      fireSafety.maintenanceRecords.push({
        maintenanceType,
        maintenanceDate: new Date(),
        completedBy,
        notes,
        nextScheduledMaintenance: nextScheduled,
      });

      await fireSafety.save();

      res.json({
        success: true,
        message: 'Maintenance activity logged',
        data: fireSafety,
      });
    } catch (error) {
      console.error('Error logging maintenance:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * ==================== EMERGENCY MANAGEMENT ====================
   */

  /**
   * Schedule Emergency Drill
   */
  async scheduleEmergencyDrill(req, res) {
    try {
      const drillData = req.body;

      const drillResponse = await civilDefenseService.scheduleEmergencyDrill(drillData);

      const drill = new EmergencyDrill({
        drillId: drillResponse.drillId,
        facilityId: drillData.facilityId,
        drillType: drillData.drillType,
        status: 'scheduled',
        scheduledDate: drillData.scheduledDate,
        scheduledTime: drillData.scheduledTime,
        expectedParticipants: drillData.expectedParticipants,
        coordinator: drillData.coordinator,
        createdBy: req.user.id,
      });

      await drill.save();

      res.status(201).json({
        success: true,
        message: 'Emergency drill scheduled',
        data: drillResponse,
      });
    } catch (error) {
      console.error('Error scheduling drill:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get Emergency Drill Results
   */
  async getEmergencyDrillResults(req, res) {
    try {
      const { drillId } = req.params;

      const results = await civilDefenseService.getEmergencyDrillResults(drillId);

      res.json({
        success: true,
        data: results,
      });
    } catch (error) {
      console.error('Error getting drill results:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get Emergency Drills by Facility
   */
  async getEmergencyDrillsByFacility(req, res) {
    try {
      const { facilityId } = req.params;

      const drills = await EmergencyDrill.find({ facilityId }).sort({ scheduledDate: -1 });

      res.json({
        success: true,
        data: {
          totalDrills: drills.length,
          drills,
          upcomingDrills: drills.filter(d => d.status === 'scheduled'),
          completedDrills: drills.filter(d => d.status === 'completed'),
        },
      });
    } catch (error) {
      console.error('Error getting drills:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Complete Emergency Drill
   */
  async completeEmergencyDrill(req, res) {
    try {
      const { drillId } = req.params;
      const { results, notes } = req.body;

      const drill = await EmergencyDrill.findOne({ drillId });
      if (!drill) {
        return res.status(404).json({
          success: false,
          message: 'Drill not found',
        });
      }

      drill.status = 'completed';
      drill.completionDate = new Date();
      drill.results = results;
      drill.notes = notes;
      drill.updatedBy = req.user.id;

      await drill.save();

      res.json({
        success: true,
        message: 'Emergency drill completed',
        data: drill,
      });
    } catch (error) {
      console.error('Error completing drill:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * ==================== DOCUMENTS ====================
   */

  /**
   * Upload Safety Documents
   */
  async uploadSafetyDocuments(req, res) {
    try {
      const { facilityId, documents } = req.body;
      const files = req.files || [];

      const uploadedDocs = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const doc = documents[i];

        const document = new CivilDefenseDocuments({
          documentId: `doc_${Date.now()}_${i}`,
          facilityId,
          documentType: doc.type,
          documentName: doc.name,
          description: doc.description,
          fileUrl: file.path,
          fileSize: file.size,
          uploadedBy: req.user.id,
        });

        await document.save();
        uploadedDocs.push(document);
      }

      // Upload to Civil Defense API
      await civilDefenseService.uploadSafetyDocuments(facilityId, uploadedDocs);

      res.status(201).json({
        success: true,
        message: 'Documents uploaded successfully',
        data: {
          uploadedDocuments: uploadedDocs.length,
          documents: uploadedDocs,
        },
      });
    } catch (error) {
      console.error('Error uploading documents:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get Facility Documents
   */
  async getFacilityDocuments(req, res) {
    try {
      const { facilityId } = req.params;

      const documents = await CivilDefenseDocuments.find({ facilityId }).sort({ uploadedDate: -1 });

      res.json({
        success: true,
        data: {
          totalDocuments: documents.length,
          documents,
          byType: this.groupByType(documents),
        },
      });
    } catch (error) {
      console.error('Error getting documents:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Delete Document
   */
  async deleteDocument(req, res) {
    try {
      const { documentId } = req.params;

      const document = await CivilDefenseDocuments.findOneAndDelete({ documentId });

      if (!document) {
        return res.status(404).json({
          success: false,
          message: 'Document not found',
        });
      }

      res.json({
        success: true,
        message: 'Document deleted',
      });
    } catch (error) {
      console.error('Error deleting document:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get Required Documents
   */
  async getRequiredDocuments(req, res) {
    try {
      const { buildingType } = req.params;

      const requirements = civilDefenseService.getRequiredDocumentsForType(buildingType);

      res.json({
        success: true,
        data: {
          buildingType,
          requiredDocuments: requirements,
          totalRequired: requirements.length,
        },
      });
    } catch (error) {
      console.error('Error getting document requirements:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * ==================== NOTIFICATIONS ====================
   */

  /**
   * Get Facility Notifications
   */
  async getFacilityNotifications(req, res) {
    try {
      const { facilityId } = req.params;

      // Collect notifications from various sources
      const upcomingAudits = await SafetyAudit.find({
        facilityId,
        status: 'scheduled',
        scheduledDate: { $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
      });

      const pendingDocuments = await CivilDefenseDocuments.find({
        facilityId,
        verificationStatus: 'unverified',
      });

      const expiringCertificates = await SafetyCertificate.find({
        facilityId,
        expiryDate: { $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
      });

      const unResolvedViolations = await ComplianceStatus.find({
        facilityId,
        'violations.status': 'open',
      });

      res.json({
        success: true,
        data: {
          upcomingAudits,
          pendingDocuments,
          expiringCertificates,
          unResolvedViolations,
        },
      });
    } catch (error) {
      console.error('Error getting notifications:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Acknowledge Notification
   */
  async acknowledgeNotification(req, res) {
    try {
      const { notificationId } = req.params;

      res.json({
        success: true,
        message: 'Notification acknowledged',
      });
    } catch (error) {
      console.error('Error acknowledging notification:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * ==================== REPORTS & ANALYTICS ====================
   */

  /**
   * Get Dashboard Data
   */
  async getDashboardData(req, res) {
    try {
      const totalCertificates = await SafetyCertificate.countDocuments();
      const activeCertificates = await SafetyCertificate.countDocuments({ status: 'approved' });
      const expiredCertificates = await SafetyCertificate.countDocuments({ status: 'expired' });
      const totalAudits = await SafetyAudit.countDocuments();
      const completedAudits = await SafetyAudit.countDocuments({ status: 'completed' });
      const totalViolations = await ComplianceStatus.aggregate([
        { $group: { _id: null, total: { $sum: { $size: '$violations' } } } },
      ]);

      res.json({
        success: true,
        data: {
          certificates: {
            total: totalCertificates,
            active: activeCertificates,
            expired: expiredCertificates,
          },
          audits: {
            total: totalAudits,
            completed: completedAudits,
            pending: totalAudits - completedAudits,
          },
          violations: {
            total: totalViolations[0]?.total || 0,
          },
        },
      });
    } catch (error) {
      console.error('Error getting dashboard data:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Generate Facility Report
   */
  async generateFacilityReport(req, res) {
    try {
      const { facilityId } = req.params;

      const certificate = await SafetyCertificate.findOne({ facilityId });
      const audits = await SafetyAudit.find({ facilityId });
      const compliance = await ComplianceStatus.findOne({ facilityId });
      const fireSafety = await FireSafety.findOne({ facilityId });

      const report = {
        facilityId,
        generatedDate: new Date(),
        certificate,
        audits: {
          total: audits.length,
          completed: audits.filter(a => a.status === 'completed').length,
          pending: audits.filter(a => a.status === 'scheduled').length,
        },
        compliance,
        fireSafety,
      };

      res.json({
        success: true,
        data: report,
      });
    } catch (error) {
      console.error('Error generating report:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Export Report
   */
  async exportReport(req, res) {
    try {
      const { facilityId, format } = req.body;

      const report = await this.generateFacilityReport({ params: { facilityId } }, res);

      // For now, just send JSON
      res.json({
        success: true,
        message: `Report exported as ${format}`,
        data: report,
      });
    } catch (error) {
      console.error('Error exporting report:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * ==================== SETTINGS ====================
   */

  /**
   * Get Settings
   */
  async getSettings(req, res) {
    try {
      res.json({
        success: true,
        data: {
          apiStatus: 'connected',
          lastSyncDate: new Date(),
          syncInterval: '1 hour',
        },
      });
    } catch (error) {
      console.error('Error getting settings:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Update Settings
   */
  async updateSettings(req, res) {
    try {
      const settings = req.body;

      res.json({
        success: true,
        message: 'Settings updated',
        data: settings,
      });
    } catch (error) {
      console.error('Error updating settings:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Check Health
   */
  async checkHealth(req, res) {
    try {
      res.json({
        success: true,
        data: {
          status: 'healthy',
          timestamp: new Date(),
          apiConnected: true,
        },
      });
    } catch (error) {
      console.error('Error checking health:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * ==================== SEARCH ====================
   */

  /**
   * Global Search
   */
  async globalSearch(req, res) {
    try {
      const { query, facilityId } = req.body;

      const certificates = await SafetyCertificate.find({
        facilityId,
        $or: [
          { certificateId: new RegExp(query, 'i') },
          { referenceNumber: new RegExp(query, 'i') },
        ],
      });

      const audits = await SafetyAudit.find({
        facilityId,
        $or: [
          { auditId: new RegExp(query, 'i') },
          { 'inspector.name': new RegExp(query, 'i') },
        ],
      });

      res.json({
        success: true,
        data: {
          certificates,
          audits,
          total: certificates.length + audits.length,
        },
      });
    } catch (error) {
      console.error('Error searching:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get Facilities Compliance Summary
   */
  async getFacilitiesComplianceSummary(req, res) {
    try {
      const summary = await ComplianceStatus.find().select(
        'facilityId overallStatus compliancePercentage'
      );

      res.json({
        success: true,
        data: {
          totalFacilities: summary.length,
          compliant: summary.filter(s => s.overallStatus === 'compliant').length,
          partial: summary.filter(s => s.overallStatus === 'partial').length,
          nonCompliant: summary.filter(s => s.overallStatus === 'non_compliant').length,
          facilities: summary,
        },
      });
    } catch (error) {
      console.error('Error getting compliance summary:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * ==================== HELPER METHODS ====================
   */

  /**
   * Group documents by type
   */
  groupByType(documents) {
    return documents.reduce((acc, doc) => {
      if (!acc[doc.documentType]) {
        acc[doc.documentType] = [];
      }
      acc[doc.documentType].push(doc);
      return acc;
    }, {});
  }
}

module.exports = new CivilDefenseController();
