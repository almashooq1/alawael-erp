/**
 * Insurance Automation Service
 * خدمة أتمتة التأمين
 *
 * Automated pre-authorization, claim submission, and payment processing
 */

const axios = require('axios');
const EventEmitter = require('events');

class InsuranceAutomationService extends EventEmitter {
  constructor() {
    super();
    this.insuranceProviders = new Map();
    this.eobSubmissions = new Map();
    this.preAuthCache = new Map();
    this.initializeProviders();
  }

  /**
   * Initialize insurance provider integrations
   */
  async initializeProviders() {
    try {
      // Load provider configurations from database
      const providers = [
        {
          name: 'aetna',
          endpoint: process.env.AETNA_API_ENDPOINT,
          key: process.env.AETNA_API_KEY
        },
        {
          name: 'bcbs',
          endpoint: process.env.BCBS_API_ENDPOINT,
          key: process.env.BCBS_API_KEY
        },
        {
          name: 'united',
          endpoint: process.env.UNITED_API_ENDPOINT,
          key: process.env.UNITED_API_KEY
        },
        {
          name: 'cigna',
          endpoint: process.env.CIGNA_API_ENDPOINT,
          key: process.env.CIGNA_API_KEY
        }
      ];

      providers.forEach(provider => {
        if (provider.endpoint && provider.key) {
          this.insuranceProviders.set(provider.name, {
            endpoint: provider.endpoint,
            key: provider.key,
            status: 'active'
          });
        }
      });

      console.log(`✅ Insurance Automation initialized with ${this.insuranceProviders.size} providers`);
    } catch (error) {
      console.error('Insurance initialization error:', error);
    }
  }

  /**
   * Request pre-authorization for therapy services
   * طلب التصريح المسبق لخدمات العلاج
   */
  async requestPreAuthorization(authData) {
    try {
      const {
        memberId,
        memberName,
        insuranceProviderId,
        serviceName,
        expectedDuration,
        expectedSessions,
        therapyType,
        diagnosisCode,
        therapistNPI
      } = authData;

      // Check cache first
      const cacheKey = `${memberId}-${serviceName}`;
      if (this.preAuthCache.has(cacheKey)) {
        const cached = this.preAuthCache.get(cacheKey);
        if (new Date() - cached.timestamp < 86400000) { // 24 hours
          return { success: true, cached: true, ...cached };
        }
      }

      const provider = this.insuranceProviders.get(insuranceProviderId);
      if (!provider) {
        throw new Error(`Insurance provider ${insuranceProviderId} not configured`);
      }

      // Prepare pre-auth request
      const preAuthRequest = {
        requestType: 'preAuthorizationRequest',
        member: {
          id: memberId,
          name: memberName
        },
        service: {
          type: therapyType,
          description: serviceName,
          diagnosisCode,
          expectedDuration,
          expectedSessions,
          therapistNPI
        },
        requestDate: new Date(),
        priority: 'standard'
      };

      // Submit to insurance provider
      const response = await this.submitToProvider(
        provider,
        '/pre-authorization',
        preAuthRequest
      );

      if (response.status === 'approved') {
        // Cache approved pre-auth
        this.preAuthCache.set(cacheKey, {
          ...response,
          timestamp: new Date()
        });

        this.emit('insurance:auth-approved', {
          memberId,
          authNumber: response.authorizationNumber,
          approvedSessions: response.approvedSessions
        });

        return {
          success: true,
          authorizationNumber: response.authorizationNumber,
          approvedSessions: response.approvedSessions,
          validUntil: response.validUntil,
          copay: response.copay,
          coinsurance: response.coinsurance,
          deductible: response.deductible
        };
      } else if (response.status === 'pending') {
        return {
          success: false,
          status: 'pending',
          message: 'Pre-authorization pending review',
          referenceNumber: response.referenceNumber
        };
      } else {
        this.emit('insurance:auth-denied', {
          memberId,
          reason: response.denialReason
        });

        return {
          success: false,
          status: 'denied',
          reason: response.denialReason
        };
      }
    } catch (error) {
      console.error('Pre-authorization request error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Submit insurance claim automatically
   * تقديم مطالبة التأمين تلقائياً
   */
  async submitInsuranceClaim(claimData) {
    try {
      const {
        invoiceId,
        memberId,
        insuranceProviderId,
        claimAmount,
        serviceDate,
        servicesRendered,
        therapistNPI,
        facilityCode,
        diagnosisCode,
        authorizationNumber
      } = claimData;

      const provider = this.insuranceProviders.get(insuranceProviderId);
      if (!provider) {
        throw new Error(`Insurance provider not found`);
      }

      // Prepare 837 EDI claim
      const claimRequest = {
        claimType: '837P', // Professional claim
        member: {
          id: memberId,
          subscriptionId: claimData.subscriptionId
        },
        provider: {
          npi: therapistNPI,
          facilityCode
        },
        claim: {
          claimNumber: invoiceId,
          serviceDate,
          amount: claimAmount,
          diagnosisCode,
          authorizationNumber,
          serviceLines: servicesRendered.map(service => ({
            procedureCode: service.code, // CPT code
            description: service.description,
            units: service.units || 1,
            unitPrice: service.unitPrice,
            modifiers: service.modifiers || [],
            total: (service.units || 1) * service.unitPrice
          }))
        },
        submissionDate: new Date(),
        submissionMethod: 'electronic'
      };

      // Submit claim to insurance
      const response = await this.submitToProvider(
        provider,
        '/claims',
        claimRequest
      );

      const submission = {
        submissionId: response.submissionId,
        claimId: invoiceId,
        memberId,
        insuranceProviderId,
        amount: claimAmount,
        status: 'submitted',
        submittedDate: new Date(),
        eob: null,
        paymentStatus: 'pending'
      };

      this.eobSubmissions.set(response.submissionId, submission);

      this.emit('insurance:claim-submitted', {
        submissionId: response.submissionId,
        claimId: invoiceId,
        amount: claimAmount
      });

      return {
        success: true,
        submissionId: response.submissionId,
        status: 'submitted',
        expectedResponseDate: response.expectedResponseDate
      };
    } catch (error) {
      console.error('Claim submission error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check claim status and receive EOB
   * التحقق من حالة المطالبة واستقبال EOB
   */
  async checkClaimStatus(submissionId, insuranceProviderId) {
    try {
      const provider = this.insuranceProviders.get(insuranceProviderId);
      if (!provider) {
        throw new Error('Insurance provider not found');
      }

      const response = await this.submitToProvider(
        provider,
        `/claims/${submissionId}/status`,
        {}
      );

      const submission = this.eobSubmissions.get(submissionId);
      if (submission) {
        submission.status = response.status;
        submission.eob = response.eob;
        submission.paymentStatus = response.paymentStatus;
      }

      this.emit('insurance:status-checked', {
        submissionId,
        status: response.status
      });

      return {
        success: true,
        status: response.status,
        eob: response.eob,
        paymentDetails: {
          allowedAmount: response.allowedAmount,
          deductibleApplied: response.deductibleApplied,
          coinsuranceApplied: response.coinsuranceApplied,
          copayApplied: response.copayApplied,
          insurancePayment: response.insurancePayment,
          patientResponsibility: response.patientResponsibility,
          expectedPaymentDate: response.expectedPaymentDate
        }
      };
    } catch (error) {
      console.error('Claim status check error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Verify insurance coverage and benefits
   * التحقق من تغطية التأمين والمزايا
   */
  async verifyCoverage(memberId, insuranceProviderId, serviceName) {
    try {
      const provider = this.insuranceProviders.get(insuranceProviderId);
      if (!provider) {
        throw new Error('Insurance provider not found');
      }

      const response = await this.submitToProvider(
        provider,
        '/coverage/verify',
        {
          memberId,
          serviceName,
          queryDate: new Date()
        }
      );

      return {
        success: true,
        coverage: {
          active: response.active,
          planName: response.planName,
          groupNumber: response.groupNumber,
          deductible: {
            individual: response.deductibleIndividual,
            family: response.deductibleFamily,
            metIndividual: response.metDeductibleIndividual,
            metFamily: response.metDeductibleFamily
          },
          outOfPocket: {
            individual: response.outOfPocketIndividual,
            family: response.outOfPocketFamily
          },
          benefits: {
            therapyVisits: response.therapyVisits,
            copay: response.copay,
            coinsurance: response.coinsurance,
            requiresPreAuth: response.requiresPreAuth
          },
          restrictions: response.restrictions || [],
          exclusions: response.exclusions || []
        }
      };
    } catch (error) {
      console.error('Coverage verification error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle insurance payment posting
   * معالجة نشر دفع التأمين
   */
  async postInsurancePayment(paymentData) {
    try {
      const {
        submissionId,
        claimId,
        memberId,
        insurancePayment,
        patientResponsibility,
        eobDate
      } = paymentData;

      const submission = this.eobSubmissions.get(submissionId);
      if (!submission) {
        throw new Error('Submission not found');
      }

      submission.paymentStatus = 'received';
      submission.insurancePayment = insurancePayment;
      submission.patientResponsibility = patientResponsibility;
      submission.eobDate = eobDate;

      this.emit('insurance:payment-received', {
        submissionId,
        claimId,
        amount: insurancePayment,
        date: eobDate
      });

      return {
        success: true,
        submissionId,
        paymentApplied: insurancePayment,
        balance: patientResponsibility
      };
    } catch (error) {
      console.error('Payment posting error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Appeal insurance claim denial
   * استئناف رفض مطالبة التأمين
   */
  async appealClaimDenial(appealData) {
    try {
      const {
        submissionId,
        denialReason,
        insuranceProviderId,
        appealReason,
        supportingDocumentation
      } = appealData;

      const provider = this.insuranceProviders.get(insuranceProviderId);
      if (!provider) {
        throw new Error('Insurance provider not found');
      }

      const appealRequest = {
        originalSubmissionId: submissionId,
        denialReason,
        appealReason,
        supportingDocumentation,
        appealDate: new Date(),
        level: 1 // First level appeal
      };

      const response = await this.submitToProvider(
        provider,
        '/claims/appeal',
        appealRequest
      );

      this.emit('insurance:appeal-submitted', {
        submissionId,
        appealId: response.appealId
      });

      return {
        success: true,
        appealId: response.appealId,
        status: 'submitted',
        expectedDecisionDate: response.expectedDecisionDate
      };
    } catch (error) {
      console.error('Appeal submission error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate insurance report for clinic
   * توليد تقرير التأمين للعيادة
   */
  async generateInsuranceReport(timeframe = 'month') {
    try {
      const submissions = Array.from(this.eobSubmissions.values());

      const report = {
        timeframe,
        totalClaims: submissions.length,
        totalSubmitted: submissions.reduce((sum, s) => sum + s.amount, 0),
        claimsByStatus: {
          submitted: submissions.filter(s => s.status === 'submitted').length,
          processed: submissions.filter(s => s.status === 'processed').length,
          paid: submissions.filter(s => s.status === 'paid').length,
          denied: submissions.filter(s => s.status === 'denied').length,
          appealed: submissions.filter(s => s.status === 'appealed').length
        },
        totalInsurancePayments: submissions
          .filter(s => s.paymentStatus === 'received')
          .reduce((sum, s) => sum + (s.insurancePayment || 0), 0),
        totalPatientResponsibility: submissions
          .filter(s => s.paymentStatus === 'received')
          .reduce((sum, s) => sum + (s.patientResponsibility || 0), 0),
        averageProcessingTime: Math.round(
          submissions.filter(s => s.eobDate).reduce((sum, s) => {
            return sum + (new Date(s.eobDate) - new Date(s.submittedDate));
          }, 0) / submissions.filter(s => s.eobDate).length / 86400000
        ),
        denialRate: (submissions.filter(s => s.status === 'denied').length / submissions.length * 100).toFixed(2) + '%',
        collectionsRate: (submissions
          .filter(s => s.paymentStatus === 'received')
          .reduce((sum, s) => sum + s.insurancePayment, 0) /
          submissions.reduce((sum, s) => sum + s.amount, 0) * 100).toFixed(2) + '%'
      };

      return {
        success: true,
        report
      };
    } catch (error) {
      console.error('Report generation error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * HELPER METHOD - Submit to insurance provider
   */
  async submitToProvider(provider, endpoint, data) {
    try {
      const response = await axios.post(
        `${provider.endpoint}${endpoint}`,
        data,
        {
          headers: {
            'Authorization': `Bearer ${provider.key}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      // Fallback for provider unavailability
      if (error.response?.status === 503) {
        return this.fallbackInsuranceResponse();
      }
      throw error;
    }
  }

  fallbackInsuranceResponse() {
    return {
      status: 'pending',
      message: 'Provider temporarily unavailable',
      referenceNumber: `REF-${Date.now()}`
    };
  }
}

module.exports = new InsuranceAutomationService();
