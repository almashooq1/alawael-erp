/**
 * Civil Defense Integration Service
 * خدمة التكامل مع الدفاع المدني السعودي
 *
 * Features:
 * ✅ Certificate Management
 * ✅ Compliance Checking
 * ✅ Safety Audit Scheduling
 * ✅ Fire Safety Inspections
 * ✅ Emergency Simulations
 * ✅ Document Verification
 * ✅ Real-time Status Tracking
 * ✅ Automatic Notifications
 * ✅ Analytics & Reports
 */

const axios = require('axios');
const nodemailer = require('nodemailer');
const moment = require('moment');
const crypto = require('crypto');

class CivilDefenseIntegrationService {
  constructor() {
    // API Configuration
    this.apiBaseUrl = process.env.CIVIL_DEFENSE_API_URL || 'https://998.gov.sa/api/v1';
    this.apiKey = process.env.CIVIL_DEFENSE_API_KEY;
    this.apiSecret = process.env.CIVIL_DEFENSE_API_SECRET;
    
    // Timeout settings
    this.requestTimeout = 30000; // 30 seconds
    
    // Email Configuration
    this.emailTransporter = this.initializeEmailTransporter();
    
    // Cache for performance
    this.cache = new Map();
    this.cacheExpiry = 3600000; // 1 hour in milliseconds
  }

  /**
   * Initialize email transporter
   */
  initializeEmailTransporter() {
    return nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }

  /**
   * ==================== CERTIFICATE MANAGEMENT ====================
   */

  /**
   * Request Safety Certificate from Civil Defense
   */
  async requestSafetyCertificate(buildingData) {
    try {
      const validationResult = this.validateBuildingData(buildingData);
      if (!validationResult.isValid) {
        throw new Error(`Validation failed: ${validationResult.errors.join(', ')}`);
      }

      const requestPayload = this.buildCertificateRequest(buildingData);
      
      const response = await axios.post(
        `${this.apiBaseUrl}/certificates/request`,
        requestPayload,
        {
          headers: this.getAuthHeaders(),
          timeout: this.requestTimeout,
        }
      );

      return {
        success: true,
        certificateId: response.data.certificate_id,
        referenceNumber: response.data.reference_number,
        status: 'pending',
        estimatedCompletionDate: this.calculateCompletionDate(buildingData.buildingType),
        message: 'Safety certificate request submitted successfully',
      };
    } catch (error) {
      console.error('Error requesting safety certificate:', error);
      throw new Error(`Failed to request safety certificate: ${error.message}`);
    }
  }

  /**
   * Get Certificate Status
   */
  async getCertificateStatus(certificateId) {
    try {
      // Check cache first
      const cachedStatus = this.getFromCache(`cert_${certificateId}`);
      if (cachedStatus) {
        return cachedStatus;
      }

      const response = await axios.get(
        `${this.apiBaseUrl}/certificates/${certificateId}/status`,
        {
          headers: this.getAuthHeaders(),
          timeout: this.requestTimeout,
        }
      );

      const statusData = {
        certificateId,
        status: response.data.status,
        submissionDate: response.data.submission_date,
        lastUpdated: new Date(),
        completionPercentage: response.data.progress_percentage,
        requiredDocuments: response.data.required_documents,
        missingDocuments: response.data.missing_documents,
        notes: response.data.notes,
        estimatedCompletionDate: response.data.estimated_completion_date,
      };

      // Cache the result
      this.setCache(`cert_${certificateId}`, statusData);

      return statusData;
    } catch (error) {
      console.error('Error getting certificate status:', error);
      throw new Error(`Failed to get certificate status: ${error.message}`);
    }
  }

  /**
   * Renew Safety Certificate
   */
  async renewSafetyCertificate(certificateId, buildingData) {
    try {
      const response = await axios.post(
        `${this.apiBaseUrl}/certificates/${certificateId}/renew`,
        {
          certificate_id: certificateId,
          building_data: buildingData,
          renewal_date: new Date(),
        },
        {
          headers: this.getAuthHeaders(),
          timeout: this.requestTimeout,
        }
      );

      // Clear cache for this certificate
      this.clearCache(`cert_${certificateId}`);

      return {
        success: true,
        newCertificateId: response.data.new_certificate_id,
        renewalDate: response.data.renewal_date,
        expiryDate: response.data.expiry_date,
        status: 'processing',
        message: 'Certificate renewal request submitted',
      };
    } catch (error) {
      console.error('Error renewing certificate:', error);
      throw new Error(`Failed to renew certificate: ${error.message}`);
    }
  }

  /**
   * ==================== COMPLIANCE & AUDITS ====================
   */

  /**
   * Schedule Safety Audit
   */
  async scheduleSafetyAudit(auditData) {
    try {
      const validation = this.validateAuditData(auditData);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      // Check facility availability
      const availableSlots = await this.getAuditScheduleSlots(
        auditData.facilityId,
        auditData.preferredDate
      );

      if (availableSlots.length === 0) {
        throw new Error('No available slots for the selected date');
      }

      const response = await axios.post(
        `${this.apiBaseUrl}/audits/schedule`,
        {
          facility_id: auditData.facilityId,
          audit_type: auditData.auditType,
          scheduled_date: auditData.preferredDate,
          building_type: auditData.buildingType,
          facility_size: auditData.facilitySize,
          contact_person: auditData.contactPerson,
          contact_phone: auditData.contactPhone,
          contact_email: auditData.contactEmail,
          notes: auditData.notes,
        },
        {
          headers: this.getAuthHeaders(),
          timeout: this.requestTimeout,
        }
      );

      // Send confirmation email
      await this.sendAuditConfirmationEmail(response.data, auditData);

      return {
        success: true,
        auditId: response.data.audit_id,
        scheduledDate: response.data.scheduled_date,
        auditType: response.data.audit_type,
        inspectorName: response.data.inspector_name,
        inspectorPhone: response.data.inspector_phone,
        estimatedDuration: response.data.estimated_duration,
        location: response.data.location,
        message: 'Audit scheduled successfully',
      };
    } catch (error) {
      console.error('Error scheduling audit:', error);
      throw new Error(`Failed to schedule audit: ${error.message}`);
    }
  }

  /**
   * Get Available Audit Slots
   */
  async getAuditScheduleSlots(facilityId, date) {
    try {
      const cacheKey = `audit_slots_${facilityId}_${date}`;
      const cachedSlots = this.getFromCache(cacheKey);
      
      if (cachedSlots) {
        return cachedSlots;
      }

      const response = await axios.get(
        `${this.apiBaseUrl}/audits/available-slots`,
        {
          params: {
            facility_id: facilityId,
            date: moment(date).format('YYYY-MM-DD'),
          },
          headers: this.getAuthHeaders(),
          timeout: this.requestTimeout,
        }
      );

      const slots = response.data.available_slots || [];
      this.setCache(cacheKey, slots);

      return slots;
    } catch (error) {
      console.error('Error getting audit slots:', error);
      return [];
    }
  }

  /**
   * Get Compliance Status
   */
  async getComplianceStatus(facilityId) {
    try {
      const cacheKey = `compliance_${facilityId}`;
      const cachedStatus = this.getFromCache(cacheKey);
      
      if (cachedStatus) {
        return cachedStatus;
      }

      const response = await axios.get(
        `${this.apiBaseUrl}/compliance/status/${facilityId}`,
        {
          headers: this.getAuthHeaders(),
          timeout: this.requestTimeout,
        }
      );

      const complianceStatus = {
        facilityId,
        overallStatus: response.data.overall_status,
        compliancePercentage: response.data.compliance_percentage,
        categories: response.data.compliance_categories,
        lastAuditDate: response.data.last_audit_date,
        nextExpectedAudit: response.data.next_expected_audit,
        violations: response.data.violations || [],
        recommendations: response.data.recommendations || [],
        certificateStatus: response.data.certificate_status,
        certificateExpiryDate: response.data.certificate_expiry_date,
        daysUntilExpiry: this.calculateDaysRemaining(response.data.certificate_expiry_date),
      };

      this.setCache(cacheKey, complianceStatus);
      return complianceStatus;
    } catch (error) {
      console.error('Error getting compliance status:', error);
      throw new Error(`Failed to get compliance status: ${error.message}`);
    }
  }

  /**
   * Get Violations
   */
  async getViolations(facilityId) {
    try {
      const response = await axios.get(
        `${this.apiBaseUrl}/violations/${facilityId}`,
        {
          headers: this.getAuthHeaders(),
          timeout: this.requestTimeout,
        }
      );

      return {
        facilityId,
        totalViolations: response.data.violations.length,
        violations: response.data.violations.map(v => ({
          violationId: v.id,
          category: v.category,
          severity: v.severity,
          description: v.description,
          reportedDate: v.reported_date,
          status: v.status,
          deadlineToFix: v.deadline_to_fix,
          daysRemaining: this.calculateDaysRemaining(v.deadline_to_fix),
          requiredActions: v.required_actions,
          notes: v.notes,
        })),
        criticalViolations: response.data.violations.filter(v => v.severity === 'critical').length,
        warningViolations: response.data.violations.filter(v => v.severity === 'warning').length,
      };
    } catch (error) {
      console.error('Error getting violations:', error);
      throw new Error(`Failed to get violations: ${error.message}`);
    }
  }

  /**
   * ==================== FIRE SAFETY ====================
   */

  /**
   * Schedule Fire Safety Inspection
   */
  async scheduleFireSafetyInspection(inspectionData) {
    try {
      const response = await axios.post(
        `${this.apiBaseUrl}/fire-safety/inspections/schedule`,
        {
          facility_id: inspectionData.facilityId,
          building_type: inspectionData.buildingType,
          facility_size: inspectionData.facilitySize,
          number_of_floors: inspectionData.numberOfFloors,
          occupancy_capacity: inspectionData.occupancyCapacity,
          contact_person: inspectionData.contactPerson,
          contact_phone: inspectionData.contactPhone,
          preferred_date: inspectionData.preferredDate,
          notes: inspectionData.notes,
        },
        {
          headers: this.getAuthHeaders(),
          timeout: this.requestTimeout,
        }
      );

      return {
        success: true,
        inspectionId: response.data.inspection_id,
        scheduledDate: response.data.scheduled_date,
        inspectorName: response.data.inspector_name,
        inspectionType: response.data.inspection_type,
        estimatedDuration: response.data.estimated_duration,
      };
    } catch (error) {
      console.error('Error scheduling fire safety inspection:', error);
      throw new Error(`Failed to schedule fire safety inspection: ${error.message}`);
    }
  }

  /**
   * Get Fire Safety Status
   */
  async getFireSafetyStatus(facilityId) {
    try {
      const response = await axios.get(
        `${this.apiBaseUrl}/fire-safety/status/${facilityId}`,
        {
          headers: this.getAuthHeaders(),
          timeout: this.requestTimeout,
        }
      );

      return {
        facilityId,
        overallStatus: response.data.overall_status,
        fireSafetyRating: response.data.fire_safety_rating,
        lastInspectionDate: response.data.last_inspection_date,
        nextInspectionDue: response.data.next_inspection_due,
        equipmentStatus: {
          fireExtinguishers: response.data.fire_extinguishers_status,
          fireAlarms: response.data.fire_alarms_status,
          emergencyLights: response.data.emergency_lights_status,
          exitSigns: response.data.exit_signs_status,
          sprinklerSystem: response.data.sprinkler_system_status,
        },
        maintenanceRecords: response.data.maintenance_records || [],
        certificates: response.data.certificates || [],
      };
    } catch (error) {
      console.error('Error getting fire safety status:', error);
      throw new Error(`Failed to get fire safety status: ${error.message}`);
    }
  }

  /**
   * ==================== EMERGENCY MANAGEMENT ====================
   */

  /**
   * Schedule Emergency Drill/Simulation
   */
  async scheduleEmergencyDrill(drillData) {
    try {
      const response = await axios.post(
        `${this.apiBaseUrl}/emergency-management/drills/schedule`,
        {
          facility_id: drillData.facilityId,
          drill_type: drillData.drillType,
          scenario: drillData.scenario,
          expected_participants: drillData.expectedParticipants,
          scheduled_date: drillData.scheduledDate,
          scheduled_time: drillData.scheduledTime,
          duration_minutes: drillData.durationMinutes,
          coordinator_name: drillData.coordinatorName,
          coordinator_phone: drillData.coordinatorPhone,
          notes: drillData.notes,
        },
        {
          headers: this.getAuthHeaders(),
          timeout: this.requestTimeout,
        }
      );

      // Send notifications
      await this.sendEmergencyDrillNotification(response.data, drillData);

      return {
        success: true,
        drillId: response.data.drill_id,
        scheduledDate: response.data.scheduled_date,
        scheduledTime: response.data.scheduled_time,
        status: 'scheduled',
        coordinatorAssigned: response.data.coordinator_assigned,
      };
    } catch (error) {
      console.error('Error scheduling emergency drill:', error);
      throw new Error(`Failed to schedule emergency drill: ${error.message}`);
    }
  }

  /**
   * Get Emergency Drill Results
   */
  async getEmergencyDrillResults(drillId) {
    try {
      const response = await axios.get(
        `${this.apiBaseUrl}/emergency-management/drills/${drillId}/results`,
        {
          headers: this.getAuthHeaders(),
          timeout: this.requestTimeout,
        }
      );

      return {
        drillId,
        status: response.data.status,
        completionDate: response.data.completion_date,
        totalParticipants: response.data.total_participants,
        averageEvacuationTime: response.data.average_evacuation_time,
        issues: response.data.issues || [],
        recommendations: response.data.recommendations || [],
        report: response.data.detailed_report,
      };
    } catch (error) {
      console.error('Error getting drill results:', error);
      throw new Error(`Failed to get emergency drill results: ${error.message}`);
    }
  }

  /**
   * ==================== DOCUMENT MANAGEMENT ====================
   */

  /**
   * Upload Safety Documents
   */
  async uploadSafetyDocuments(facilityId, documents) {
    try {
      const formData = new FormData();
      formData.append('facility_id', facilityId);
      
      documents.forEach((doc, index) => {
        formData.append(`documents[${index}]`, doc.file);
        formData.append(`document_types[${index}]`, doc.type);
        formData.append(`descriptions[${index}]`, doc.description);
      });

      const response = await axios.post(
        `${this.apiBaseUrl}/documents/upload`,
        formData,
        {
          headers: {
            ...this.getAuthHeaders(),
            'Content-Type': 'multipart/form-data',
          },
          timeout: this.requestTimeout,
        }
      );

      // Clear compliance cache
      this.clearCache(`compliance_${facilityId}`);

      return {
        success: true,
        uploadedDocuments: response.data.uploaded_documents,
        totalSize: response.data.total_size,
        message: 'Documents uploaded successfully',
      };
    } catch (error) {
      console.error('Error uploading documents:', error);
      throw new Error(`Failed to upload documents: ${error.message}`);
    }
  }

  /**
   * Get Required Documents
   */
  getRequiredDocumentsForType(buildingType) {
    const documentRequirements = {
      'residential': [
        'Floor plans',
        'Fire escape plans',
        'Safety equipment list',
        'Electrical inspection report',
        'Water system report',
      ],
      'commercial': [
        'Floor plans',
        'Fire safety plan',
        'Emergency evacuation plan',
        'Safety equipment maintenance records',
        'Electrical inspection report',
        'Building inspection report',
      ],
      'industrial': [
        'Detailed floor plans',
        'Fire safety plan',
        'Emergency evacuation plan',
        'Chemical safety assessment',
        'Safety equipment maintenance records',
        'Environmental impact assessment',
        'Worker safety protocols',
      ],
      'healthcare': [
        'Floor plans with emergency routes',
        'Fire safety plan',
        'Emergency evacuation plan',
        'Medical gas safety report',
        'Safety equipment maintenance records',
        'Infection control procedures',
      ],
      'educational': [
        'Campus floor plans',
        'Fire safety plan',
        'Emergency evacuation plan',
        'Safety equipment list',
        'Maintenance records',
        'Student capacity report',
      ],
    };

    return documentRequirements[buildingType] || documentRequirements['commercial'];
  }

  /**
   * ==================== NOTIFICATIONS ====================
   */

  /**
   * Send Audit Confirmation Email
   */
  async sendAuditConfirmationEmail(auditData, requestData) {
    try {
      const emailContent = `
        <h2>تأكيد جدولة فحص السلامة - Civil Defense Safety Audit Confirmation</h2>
        <p>رقم الفحص: ${auditData.audit_id}</p>
        <p>Audit Reference: ${auditData.audit_id}</p>
        <p>التاريخ المجدول: ${moment(auditData.scheduled_date).format('DD-MM-YYYY')}</p>
        <p>Scheduled Date: ${moment(auditData.scheduled_date).format('DD-MM-YYYY')}</p>
        <p>اسم المفتش: ${auditData.inspector_name}</p>
        <p>Inspector Name: ${auditData.inspector_name}</p>
        <p>رقم الهاتف: ${auditData.inspector_phone}</p>
        <p>Phone: ${auditData.inspector_phone}</p>
        <p>المدة المتوقعة: ${auditData.estimated_duration}</p>
        <p>Estimated Duration: ${auditData.estimated_duration}</p>
      `;

      await this.emailTransporter.sendMail({
        to: requestData.contactEmail,
        subject: 'تأكيد فحص السلامة - Safety Audit Confirmation',
        html: emailContent,
      });

      return { success: true };
    } catch (error) {
      console.error('Error sending audit confirmation email:', error);
      // Don't throw - this is non-critical
      return { success: false };
    }
  }

  /**
   * Send Emergency Drill Notification
   */
  async sendEmergencyDrillNotification(drillData, requestData) {
    try {
      const emailContent = `
        <h2>إخطار بجدولة تمرين الطوارئ - Emergency Drill Notification</h2>
        <p>تم جدولة تمرين طوارئ في منشأتكم</p>
        <p>An emergency drill has been scheduled at your facility</p>
        <p>رقم التمرين: ${drillData.drill_id}</p>
        <p>Drill ID: ${drillData.drill_id}</p>
        <p>التاريخ: ${moment(drillData.scheduled_date).format('DD-MM-YYYY')}</p>
        <p>Date: ${moment(drillData.scheduled_date).format('DD-MM-YYYY')}</p>
        <p>الساعة: ${drillData.scheduled_time}</p>
        <p>Time: ${drillData.scheduled_time}</p>
      `;

      await this.emailTransporter.sendMail({
        to: requestData.coordinatorPhone + '@notification.gov.sa',
        subject: 'إخطار تمرين طوارئ - Emergency Drill Notification',
        html: emailContent,
      });

      return { success: true };
    } catch (error) {
      console.error('Error sending drill notification:', error);
      return { success: false };
    }
  }

  /**
   * ==================== HELPER METHODS ====================
   */

  /**
   * Get Authentication Headers
   */
  getAuthHeaders() {
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = this.generateSignature(timestamp);

    return {
      'X-API-Key': this.apiKey,
      'X-Signature': signature,
      'X-Timestamp': timestamp,
      'Content-Type': 'application/json',
      'Accept-Language': 'ar-SA',
    };
  }

  /**
   * Generate API Signature for secure communication
   */
  generateSignature(timestamp) {
    if (!this.apiSecret) {
      return '';
    }

    const message = `${this.apiKey}${timestamp}`;
    return crypto
      .createHmac('sha256', this.apiSecret)
      .update(message)
      .digest('hex');
  }

  /**
   * Validate Building Data
   */
  validateBuildingData(data) {
    const errors = [];
    const required = ['facilityId', 'buildingType', 'facilitySizeMeters', 'address'];

    required.forEach(field => {
      if (!data[field]) {
        errors.push(`${field} is required`);
      }
    });

    const validBuildingTypes = ['residential', 'commercial', 'industrial', 'healthcare', 'educational'];
    if (data.buildingType && !validBuildingTypes.includes(data.buildingType)) {
      errors.push(`Invalid building type: ${data.buildingType}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate Audit Data
   */
  validateAuditData(data) {
    const errors = [];
    const required = ['facilityId', 'auditType', 'preferredDate', 'contactPerson', 'contactPhone'];

    required.forEach(field => {
      if (!data[field]) {
        errors.push(`${field} is required`);
      }
    });

    if (data.preferredDate && moment(data.preferredDate).isBefore(moment())) {
      errors.push('Preferred date must be in the future');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Build Certificate Request Payload
   */
  buildCertificateRequest(buildingData) {
    return {
      facility_id: buildingData.facilityId,
      building_type: buildingData.buildingType,
      facility_size: buildingData.facilitySizeMeters,
      address: buildingData.address,
      contact_person: buildingData.contactPerson,
      contact_phone: buildingData.contactPhone,
      contact_email: buildingData.contactEmail,
      number_of_floors: buildingData.numberOfFloors || 0,
      occupancy_capacity: buildingData.occupancyCapacity || 0,
      notes: buildingData.notes || '',
      request_date: new Date(),
    };
  }

  /**
   * Calculate Completion Date
   */
  calculateCompletionDate(buildingType) {
    const daysToAdd = {
      'residential': 7,
      'commercial': 10,
      'industrial': 14,
      'healthcare': 14,
      'educational': 10,
    };

    const days = daysToAdd[buildingType] || 10;
    return moment().add(days, 'days').toDate();
  }

  /**
   * Calculate Days Remaining
   */
  calculateDaysRemaining(expiryDate) {
    if (!expiryDate) return 0;
    return moment(expiryDate).diff(moment(), 'days');
  }

  /**
   * Cache Management
   */
  setCache(key, value) {
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
    });
  }

  getFromCache(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.cacheExpiry) {
      this.cache.delete(key);
      return null;
    }

    return cached.value;
  }

  clearCache(key) {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }
}

module.exports = new CivilDefenseIntegrationService();
