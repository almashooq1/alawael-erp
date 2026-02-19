/**
 * SupportService.js - Beneficiary Support & Counseling Service
 * Handles support plans, counseling sessions, and psychosocial support
 *
 * @module services/SupportService
 * @requires mongoose
 */

const EventEmitter = require('events');

class SupportService extends EventEmitter {
  /**
   * Initialize SupportService
   * @param {Object} db - Database connection
   */
  constructor(db) {
    super();
    this.db = db;
    this.supportPlanCollection = 'supportPlans';
    this.counselingCollection = 'counselingSessions';
    this.supportResourceCollection = 'supportResources';
  }

  /**
   * Create comprehensive support plan
   * @async
   * @param {string} beneficiaryId - Beneficiary ID
   * @param {Object} planData - Plan data
   * @param {string} planData.type - 'academic', 'behavioral', 'financial', 'health', 'comprehensive'
   * @param {Array<string>} planData.concerns - Areas of concern
   * @param {string} planData.assessmentNotes - Initial assessment
   * @returns {Promise<Object>} Support plan
   */
  async createSupportPlan(beneficiaryId, planData) {
    try {
      if (!beneficiaryId || !planData) {
        throw new Error('beneficiaryId and planData are required');
      }

      // Assessment
      const assessment = await this.conductInitialAssessment(beneficiaryId, planData);

      // Create plan
      const supportPlan = {
        beneficiaryId,
        type: planData.type,
        status: 'ACTIVE',
        concerns: planData.concerns || [],
        assessment: assessment,
        goals: this.createGoals(planData.type, planData.concerns),
        interventions: this.recommendInterventions(planData.type, planData.concerns),
        supportCoordinator: planData.coordinator || 'system',
        startDate: new Date(),
        endDate: null,
        reviewSchedule: 'monthly',
        nextReviewDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
        auditLog: [{
          action: 'PLAN_CREATED',
          user: planData.coordinator || 'system',
          timestamp: new Date()
        }]
      };

      const saved = await this.db.collection(this.supportPlanCollection).insertOne(supportPlan);

      this.emit('support:plan-created', {
        beneficiaryId,
        planId: saved.insertedId,
        type: planData.type
      });

      return {
        status: 'success',
        message: 'Support plan created successfully',
        data: {
          planId: saved.insertedId,
          type: planData.type,
          status: supportPlan.status,
          nextReview: supportPlan.nextReviewDate,
          goals: supportPlan.goals.length
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
   * Schedule counseling session
   * @async
   * @param {string} beneficiaryId - Beneficiary ID
   * @param {Object} sessionData - Session data
   * @param {Date} sessionData.scheduledDate - Session date/time
   * @param {string} sessionData.counselorId - Counselor ID
   * @param {string} sessionData.type - 'individual', 'group', 'family'
   * @param {string} sessionData.topic - Session topic
   * @returns {Promise<Object>} Session scheduling
   */
  async scheduleCounselingSession(beneficiaryId, sessionData) {
    try {
      if (!beneficiaryId || !sessionData) {
        throw new Error('beneficiaryId and sessionData are required');
      }

      // Check availability
      const conflict = await this.db.collection(this.counselingCollection)
        .findOne({
          counselorId: sessionData.counselorId,
          scheduledDate: new Date(sessionData.scheduledDate),
          status: { $ne: 'CANCELLED' }
        });

      if (conflict) {
        throw new Error('Counselor not available at this time');
      }

      // Create session
      const session = {
        beneficiaryId,
        counselorId: sessionData.counselorId,
        scheduledDate: new Date(sessionData.scheduledDate),
        type: sessionData.type || 'individual',
        topic: sessionData.topic,
        status: 'SCHEDULED',
        notes: '',
        outcome: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        auditLog: [{
          action: 'SESSION_SCHEDULED',
          user: sessionData.counselorId,
          timestamp: new Date()
        }]
      };

      const saved = await this.db.collection(this.counselingCollection).insertOne(session);

      // Send notification
      this.emit('counseling:scheduled', {
        beneficiaryId,
        sessionId: saved.insertedId,
        scheduledDate: sessionData.scheduledDate,
        counselorId: sessionData.counselorId
      });

      return {
        status: 'success',
        message: 'Counseling session scheduled successfully',
        data: {
          sessionId: saved.insertedId,
          scheduledDate: sessionData.scheduledDate,
          counselorId: sessionData.counselorId,
          type: sessionData.type
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
   * Manage financial support
   * @async
   * @param {string} beneficiaryId - Beneficiary ID
   * @param {Object} supportData - Support data
   * @param {string} supportData.type - 'emergency', 'food', 'transportation', 'housing', 'other'
   * @param {number} supportData.amount - Support amount
   * @param {string} supportData.justification - Reason for support
   * @returns {Promise<Object>} Support request
   */
  async manageFinancialSupport(beneficiaryId, supportData) {
    try {
      if (!beneficiaryId || !supportData) {
        throw new Error('beneficiaryId and supportData are required');
      }

      // Validate eligibility
      const eligible = await this.validateFinancialEligibility(beneficiaryId);
      if (!eligible) {
        throw new Error('Beneficiary is not eligible for additional financial support at this time');
      }

      // Create support request
      const request = {
        beneficiaryId,
        type: supportData.type,
        amount: supportData.amount,
        justification: supportData.justification,
        status: 'PENDING', // PENDING, APPROVED, REJECTED, PROCESSED
        approvedAmount: null,
        requestDate: new Date(),
        processedDate: null,
        approvedBy: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const saved = await this.db.collection('financialSupport').insertOne(request);

      this.emit('support:financial-requested', {
        beneficiaryId,
        supportId: saved.insertedId,
        type: supportData.type,
        amount: supportData.amount
      });

      return {
        status: 'success',
        message: 'Financial support request submitted',
        data: {
          supportId: saved.insertedId,
          type: supportData.type,
          amount: supportData.amount,
          status: 'PENDING',
          message: 'Your request will be reviewed within 3 business days'
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
   * Provide psychosocial support resources
   * @async
   * @param {string} beneficiaryId - Beneficiary ID
   * @param {Object} options - Options
   * @param {string} options.concern - Area of concern
   * @returns {Promise<Object>} Resources
   */
  async providePsychosocialSupport(beneficiaryId, options = {}) {
    try {
      if (!beneficiaryId) {
        throw new Error('beneficiaryId is required');
      }

      // Get support resources
      const query = options.concern ? { category: options.concern } : {};

      const resources = await this.db.collection(this.supportResourceCollection)
        .find(query)
        .toArray();

      // Get active sessions
      const sessions = await this.db.collection(this.counselingCollection)
        .find({
          beneficiaryId,
          status: { $in: ['SCHEDULED', 'IN_PROGRESS'] }
        })
        .toArray();

      // Get support plan
      const supportPlan = await this.db.collection(this.supportPlanCollection)
        .findOne({ beneficiaryId, status: 'ACTIVE' });

      const response = {
        beneficiaryId,
        resources: {
          available: resources.map(r => ({
            id: r._id,
            title: r.title,
            description: r.description,
            category: r.category,
            contact: r.contact,
            availability: r.availability
          })),
          count: resources.length
        },
        activeSessions: sessions.length,
        upcomingSessions: sessions.slice(0, 3),
        supportPlan: supportPlan ? {
          id: supportPlan._id,
          type: supportPlan.type,
          status: supportPlan.status,
          nextReview: supportPlan.nextReviewDate
        } : null,
        emergencyContacts: [
          {
            name: 'Crisis Hotline',
            number: '1-800-XXX-XXXX',
            available: '24/7'
          },
          {
            name: 'Mental Health Support',
            number: '1-800-YYY-YYYY',
            available: 'Mon-Fri 9AM-5PM'
          }
        ]
      };

      return {
        status: 'success',
        message: 'Psychosocial support resources retrieved',
        data: response,
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
   * Conduct initial assessment
   * @private
   * @async
   * @param {string} beneficiaryId - Beneficiary ID
   * @param {Object} planData - Plan data
   * @returns {Promise<Object>} Assessment
   */
  async conductInitialAssessment(beneficiaryId, planData) {
    try {
      const { ObjectId } = require('mongodb');

      // Get beneficiary data
      const beneficiary = await this.db.collection('beneficiaries')
        .findOne({ _id: new ObjectId(beneficiaryId) });

      const assessment = {
        conductedDate: new Date(),
        overallStatus: 'NEEDS_SUPPORT',
        domains: {
          academic: beneficiary?.academicStatus || 'UNKNOWN',
          behavioral: 'UNDER_ASSESSMENT',
          emotional: 'UNDER_ASSESSMENT',
          financial: 'UNDER_ASSESSMENT',
          social: 'UNDER_ASSESSMENT'
        },
        riskFactors: planData.concerns || [],
        strengths: [],
        recommendations: []
      };

      return assessment;
    } catch (error) {
      console.error('Assessment error:', error);
      return {};
    }
  }

  /**
   * Create goals for support plan
   * @private
   * @param {string} planType - Plan type
   * @param {Array<string>} concerns - Concerns
   * @returns {Array<Object>} Goals
   */
  createGoals(planType, concerns) {
    const baseGoals = {
      'academic': [
        { goal: 'Improve GPA', timeline: '6 months', priority: 'HIGH' },
        { goal: 'Complete all assignments', timeline: '3 months', priority: 'HIGH' },
        { goal: 'Regular class attendance', timeline: 'ongoing', priority: 'HIGH' }
      ],
      'behavioral': [
        { goal: 'Reduce behavioral incidents', timeline: '3 months', priority: 'HIGH' },
        { goal: 'Develop anger management skills', timeline: '6 months', priority: 'MEDIUM' }
      ],
      'financial': [
        { goal: 'Secure financial aid', timeline: '1 month', priority: 'HIGH' },
        { goal: 'Develop financial literacy', timeline: '3 months', priority: 'MEDIUM' }
      ],
      'comprehensive': [
        { goal: 'Improve overall wellbeing', timeline: '6 months', priority: 'HIGH' },
        { goal: 'Establish support network', timeline: '3 months', priority: 'HIGH' }
      ]
    };

    return baseGoals[planType] || baseGoals['comprehensive'];
  }

  /**
   * Recommend interventions
   * @private
   * @param {string} planType - Plan type
   * @param {Array<string>} concerns - Concerns
   * @returns {Array<Object>} Interventions
   */
  recommendInterventions(planType, concerns) {
    const interventions = [
      { type: 'counseling', frequency: 'bi-weekly', duration: '6 months' },
      { type: 'academic_tutoring', frequency: 'weekly', duration: '6 months' },
      { type: 'resource_referral', frequency: 'as_needed', duration: 'ongoing' },
      { type: 'family_support', frequency: 'monthly', duration: '6 months' },
      { type: 'peer_mentoring', frequency: 'weekly', duration: '6 months' }
    ];

    return interventions;
  }

  /**
   * Validate financial support eligibility
   * @private
   * @async
   * @param {string} beneficiaryId - Beneficiary ID
   * @returns {Promise<boolean>} Eligible or not
   */
  async validateFinancialEligibility(beneficiaryId) {
    try {
      // Check recent support
      const recent = await this.db.collection('financialSupport')
        .countDocuments({
          beneficiaryId,
          requestDate: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        },);

      return recent < 2; // Allow max 2 requests per month
    } catch (error) {
      return true; // Default to eligible if check fails
    }
  }

  /**
   * Get support summary
   * @async
   * @param {string} beneficiaryId - Beneficiary ID
   * @returns {Promise<Object>} Summary
   */
  async getSupportSummary(beneficiaryId) {
    try {
      const activePlan = await this.db.collection(this.supportPlanCollection)
        .findOne({ beneficiaryId, status: 'ACTIVE' });

      const sessions = await this.db.collection(this.counselingCollection)
        .find({ beneficiaryId })
        .sort({ scheduledDate: -1 })
        .limit(10)
        .toArray();

      const financialSupport = await this.db.collection('financialSupport')
        .find({ beneficiaryId })
        .toArray();

      return {
        status: 'success',
        message: 'Support summary retrieved',
        data: {
          beneficiaryId,
          activePlan: activePlan ? {
            id: activePlan._id,
            type: activePlan.type,
            nextReview: activePlan.nextReviewDate
          } : null,
          sessions: {
            total: sessions.length,
            completed: sessions.filter(s => s.status === 'COMPLETED').length,
            upcoming: sessions.filter(s => s.status === 'SCHEDULED').length
          },
          financialSupport: {
            total: financialSupport.length,
            approved: financialSupport.filter(s => s.status === 'APPROVED').length,
            totalAmountApproved: financialSupport
              .filter(s => s.status === 'APPROVED')
              .reduce((sum, s) => sum + (s.approvedAmount || 0), 0)
          }
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

module.exports = SupportService;
