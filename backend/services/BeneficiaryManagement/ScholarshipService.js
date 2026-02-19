/**
 * ScholarshipService.js - Beneficiary Scholarship Management Service
 * Handles scholarship applications, approvals, and disbursements
 *
 * @module services/ScholarshipService
 * @requires mongoose
 */

const EventEmitter = require('events');

class ScholarshipService extends EventEmitter {
  /**
   * Initialize ScholarshipService
   * @param {Object} db - Database connection
   */
  constructor(db) {
    super();
    this.db = db;
    this.scholarshipCollection = 'scholarships';
    this.paymentCollection = 'scholarshipPayments';
  }

  /**
   * Apply for scholarship
   * @async
   * @param {string} beneficiaryId - Beneficiary ID
   * @param {Object} applicationData - Application data
   * @param {string} applicationData.programName - Scholarship program name
   * @param {number} applicationData.requestedAmount - Requested amount
   * @param {string} applicationData.academicYear - Academic year
   * @param {Object} applicationData.supportingDocuments - Documents
   * @returns {Promise<Object>} Application result
   */
  async applyForScholarship(beneficiaryId, applicationData) {
    try {
      if (!beneficiaryId || !applicationData) {
        throw new Error('beneficiaryId and applicationData are required');
      }

      // Validate eligibility
      const eligibility = await this.validateEligibility(beneficiaryId, applicationData);

      if (!eligibility.eligible) {
        return {
          status: 'error',
          message: 'Beneficiary does not meet scholarship eligibility criteria',
          data: { eligibilityChecks: eligibility.reasons },
          timestamp: new Date()
        };
      }

      // Create application
      const application = {
        beneficiaryId,
        programName: applicationData.programName,
        requestedAmount: applicationData.requestedAmount,
        academicYear: applicationData.academicYear,
        status: 'PENDING', // PENDING, APPROVED, REJECTED, ACTIVE, COMPLETED
        applicationDate: new Date(),
        supportingDocuments: applicationData.supportingDocuments || [],
        eligibilityChecks: eligibility.details,
        createdAt: new Date(),
        updatedAt: new Date(),
        auditLog: [{
          action: 'APPLICATION_SUBMITTED',
          user: 'beneficiary',
          timestamp: new Date(),
          details: 'Scholarship application submitted'
        }]
      };

      // Save application
      const saved = await this.db.collection(this.scholarshipCollection).insertOne(application);

      this.emit('scholarship:applied', {
        beneficiaryId,
        programName: applicationData.programName,
        applicationId: saved.insertedId,
        amount: applicationData.requestedAmount
      });

      return {
        status: 'success',
        message: 'Scholarship application submitted successfully',
        data: {
          applicationId: saved.insertedId,
          status: application.status,
          programName: applicationData.programName,
          requestedAmount: applicationData.requestedAmount,
          nextSteps: 'Application will be reviewed by scholarship committee'
        },
        timestamp: new Date()
      };

    } catch (error) {
      return {
        status: 'error',
        message: error.message,
        data: null,
        timestamp: new Date()
      };
    }
  }

  /**
   * Approve scholarship application
   * @async
   * @param {string} applicationId - Application ID
   * @param {Object} approvalData - Approval data
   * @param {number} approvalData.approvedAmount - Approved amount
   * @param {string} approvalData.approvedBy - Approver name
   * @param {string} approvalData.notes - Approval notes
   * @returns {Promise<Object>} Approval result
   */
  async approveScholarship(applicationId, approvalData) {
    try {
      if (!applicationId || !approvalData) {
        throw new Error('applicationId and approvalData are required');
      }

      // Get application
      const { ObjectId } = require('mongodb');
      const application = await this.db.collection(this.scholarshipCollection)
        .findOne({ _id: new ObjectId(applicationId) });

      if (!application) {
        throw new Error('Scholarship application not found');
      }

      // Update application
      const updateData = {
        status: 'APPROVED',
        approvedAmount: approvalData.approvedAmount,
        approvedBy: approvalData.approvedBy,
        approvalDate: new Date(),
        approvalNotes: approvalData.notes || '',
        updatedAt: new Date(),
        $push: {
          auditLog: {
            action: 'APPLICATION_APPROVED',
            user: approvalData.approvedBy,
            timestamp: new Date(),
            details: `Approved for ${approvalData.approvedAmount}`
          }
        }
      };

      await this.db.collection(this.scholarshipCollection).updateOne(
        { _id: new ObjectId(applicationId) },
        { $set: updateData, $push: { auditLog: updateData.$push.auditLog } }
      );

      this.emit('scholarship:approved', {
        applicationId,
        approvedAmount: approvalData.approvedAmount,
        approvedBy: approvalData.approvedBy
      });

      return {
        status: 'success',
        message: 'Scholarship approved successfully',
        data: {
          applicationId,
          approvedAmount: approvalData.approvedAmount,
          status: 'APPROVED',
          nextStep: 'Payment will be processed according to disbursement schedule'
        },
        timestamp: new Date()
      };

    } catch (error) {
      return {
        status: 'error',
        message: error.message,
        data: null,
        timestamp: new Date()
      };
    }
  }

  /**
   * Process scholarship payment/disbursement
   * @async
   * @param {string} applicationId - Application ID
   * @param {Object} paymentData - Payment data
   * @param {number} paymentData.amount - Payment amount
   * @param {string} paymentData.disbursementMethod - 'bank_transfer', 'check', 'direct_payment'
   * @param {string} paymentData.processedBy - Processor name
   * @returns {Promise<Object>} Payment result
   */
  async processScholarshipPayment(applicationId, paymentData) {
    try {
      if (!applicationId || !paymentData) {
        throw new Error('applicationId and paymentData are required');
      }

      // Get application
      const { ObjectId } = require('mongodb');
      const application = await this.db.collection(this.scholarshipCollection)
        .findOne({ _id: new ObjectId(applicationId) });

      if (!application) {
        throw new Error('Scholarship application not found');
      }

      if (application.status !== 'APPROVED') {
        throw new Error('Only approved scholarships can be paid');
      }

      // Create payment record
      const payment = {
        applicationId: new ObjectId(applicationId),
        beneficiaryId: application.beneficiaryId,
        amount: paymentData.amount,
        disbursementMethod: paymentData.disbursementMethod,
        status: 'COMPLETED',
        processedBy: paymentData.processedBy,
        processedDate: new Date(),
        referenceNumber: `SCL-${Date.now()}`,
        createdAt: new Date()
      };

      // Save payment
      const savedPayment = await this.db.collection(this.paymentCollection).insertOne(payment);

      // Update scholarship status to ACTIVE
      await this.db.collection(this.scholarshipCollection).updateOne(
        { _id: new ObjectId(applicationId) },
        {
          $set: { status: 'ACTIVE', updatedAt: new Date() },
          $push: {
            auditLog: {
              action: 'PAYMENT_PROCESSED',
              user: paymentData.processedBy,
              timestamp: new Date(),
              details: `Payment of ${paymentData.amount} processed via ${paymentData.disbursementMethod}`
            }
          }
        }
      );

      this.emit('scholarship:payment-processed', {
        applicationId,
        beneficiaryId: application.beneficiaryId,
        amount: paymentData.amount,
        referenceNumber: payment.referenceNumber
      });

      return {
        status: 'success',
        message: 'Scholarship payment processed successfully',
        data: {
          applicationId,
          paymentId: savedPayment.insertedId,
          amount: paymentData.amount,
          referenceNumber: payment.referenceNumber,
          disbursementMethod: paymentData.disbursementMethod,
          status: 'COMPLETED'
        },
        timestamp: new Date()
      };

    } catch (error) {
      return {
        status: 'error',
        message: error.message,
        data: null,
        timestamp: new Date()
      };
    }
  }

  /**
   * Monitor scholarship performance requirements
   * @async
   * @param {string} applicationId - Application ID
   * @returns {Promise<Object>} Performance report
   */
  async monitorScholarshipPerformance(applicationId) {
    try {
      if (!applicationId) {
        throw new Error('applicationId is required');
      }

      const { ObjectId } = require('mongodb');
      const application = await this.db.collection(this.scholarshipCollection)
        .findOne({ _id: new ObjectId(applicationId) });

      if (!application) {
        throw new Error('Scholarship application not found');
      }

      // Get beneficiary academic data
      const beneficiary = await this.db.collection('beneficiaries')
        .findOne({ _id: new ObjectId(application.beneficiaryId) });

      const grades = await this.db.collection('academicRecords')
        .findOne({ beneficiaryId: application.beneficiaryId });

      // Check performance requirements
      const alerts = [];
      const details = {
        applicationId,
        programName: application.programName,
        approvedAmount: application.approvedAmount,
        checkDate: new Date(),
        requirements: {}
      };

      // Minimum GPA requirement (typically 2.0 - 3.0)
      if (grades) {
        const minGPA = 2.0;
        const currentGPA = grades.currentGPA || 0;

        details.requirements.minimumGPA = minGPA;
        details.requirements.currentGPA = currentGPA;

        if (currentGPA < minGPA) {
          alerts.push({
            severity: 'HIGH',
            type: 'LOW_GPA',
            message: `GPA (${currentGPA}) is below minimum requirement (${minGPA})`,
            action: 'REVIEW_REQUIRED'
          });
        }
      }

      // Attendance requirement (typically 80%)
      const attendance = await this.db.collection('attendanceRecords')
        .find({ beneficiaryId: application.beneficiaryId })
        .toArray();

      if (attendance.length > 0) {
        const present = attendance.filter(a => a.status === 'present').length;
        const rate = (present / attendance.length) * 100;
        const minAttendance = 80;

        details.requirements.minimumAttendance = `${minAttendance}%`;
        details.requirements.currentAttendance = `${rate.toFixed(2)}%`;

        if (rate < minAttendance) {
          alerts.push({
            severity: 'MEDIUM',
            type: 'LOW_ATTENDANCE',
            message: `Attendance rate (${rate.toFixed(2)}%) is below requirement (${minAttendance}%)`,
            action: 'NOTIFICATION_SENT'
          });
        }
      }

      // Academic progress
      details.requirements.academicProgress = 'On Track';

      if (alerts.length > 0) {
        this.emit('scholarship:performance-alert', {
          applicationId,
          beneficiaryId: application.beneficiaryId,
          alerts: alerts
        });
      }

      return {
        status: 'success',
        message: alerts.length > 0 ? 'Performance alerts generated' : 'Performance is satisfactory',
        data: {
          ...details,
          alerts,
          statusOk: alerts.filter(a => a.severity === 'HIGH').length === 0
        },
        timestamp: new Date()
      };

    } catch (error) {
      return {
        status: 'error',
        message: error.message,
        data: null,
        timestamp: new Date()
      };
    }
  }

  /**
   * Validate scholarship eligibility
   * @private
   * @async
   * @param {string} beneficiaryId - Beneficiary ID
   * @param {Object} applicationData - Application data
   * @returns {Promise<Object>} Eligibility result
   */
  async validateEligibility(beneficiaryId, applicationData) {
    const details = {};
    const reasons = [];

    try {
      const { ObjectId } = require('mongodb');

      // Get beneficiary
      const beneficiary = await this.db.collection('beneficiaries')
        .findOne({ _id: new ObjectId(beneficiaryId) });

      if (!beneficiary) {
        reasons.push('Beneficiary not found in system');
        return { eligible: false, reasons, details };
      }

      details.beneficiaryFound = true;

      // Check enrollment status
      if (!beneficiary.status || beneficiary.status !== 'ACTIVE') {
        reasons.push('Beneficiary must be actively enrolled');
      } else {
        details.enrollmentStatus = 'Active';
      }

      // Check for existing scholarships
      const existingScholarship = await this.db.collection(this.scholarshipCollection)
        .findOne({
          beneficiaryId,
          status: { $in: ['APPROVED', 'ACTIVE'] }
        });

      if (existingScholarship) {
        reasons.push('Beneficiary already has an active scholarship');
      } else {
        details.existingScholarships = 'None';
      }

      // Check academic standing
      const grades = await this.db.collection('academicRecords')
        .findOne({ beneficiaryId });

      if (grades && grades.currentGPA) {
        details.currentGPA = grades.currentGPA;
        if (grades.currentGPA >= 2.0) {
          details.academicStanding = 'Good';
        } else {
          reasons.push('GPA is below minimum requirement');
        }
      }

      // Check for disciplinary issues
      const disciplinary = await this.db.collection('disciplinaryRecords')
        .findOne({ beneficiaryId, status: 'ACTIVE' });

      if (disciplinary) {
        reasons.push('Active disciplinary record on file');
      } else {
        details.disciplinaryRecord = 'Clear';
      }

      return {
        eligible: reasons.length === 0,
        reasons,
        details
      };

    } catch (error) {
      reasons.push(`Error validating eligibility: ${error.message}`);
      return { eligible: false, reasons, details };
    }
  }

  /**
   * Get scholarship statistics
   * @async
   * @param {Object} options - Options
   * @returns {Promise<Object>} Statistics
   */
  async getScholarshipStatistics(options = {}) {
    try {
      const pipeline = [
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalAmount: { $sum: '$approvedAmount' }
          }
        }
      ];

      const stats = await this.db.collection(this.scholarshipCollection)
        .aggregate(pipeline)
        .toArray();

      return {
        status: 'success',
        message: 'Scholarship statistics retrieved',
        data: {
          byStatus: stats,
          generatedAt: new Date()
        },
        timestamp: new Date()
      };

    } catch (error) {
      return {
        status: 'error',
        message: error.message,
        data: null,
        timestamp: new Date()
      };
    }
  }
}

module.exports = ScholarshipService;
