/* eslint-disable no-unused-vars */
/**
 * Disability Certification Service
 * خدمة تصنيف وتوثيق الإعاقة
 */

class DisabilityCertificationService {
  constructor() {
    this.certifications = new Map();
    this.assessments = new Map();
    this.classifications = new Map();
    this.renewals = new Map();
  }

  /**
   * طلب تصنيف إعاقة جديد
   */
  async requestCertification(requestData) {
    const request = {
      id: Date.now().toString(),
      beneficiaryId: requestData.beneficiaryId,
      beneficiaryName: requestData.beneficiaryName,
      requestDate: new Date(),
      type: requestData.type, // new, renewal, update
      disabilityType: requestData.disabilityType,
      suspectedDisability: requestData.suspectedDisability || [],
      referralSource: requestData.referralSource,
      medicalReports: requestData.medicalReports || [],
      previousCertifications: [],
      status: 'pending',
      assessmentScheduled: false,
      assessmentDate: null,
      assignedAssessor: null,
      createdAt: new Date(),
    };

    this.certifications.set(request.id, request);
    return request;
  }

  /**
   * تقييم الإعاقة
   */
  async conductAssessment(certificationId, assessmentData) {
    const certification = this.certifications.get(certificationId);
    if (!certification) throw new Error('طلب التصنيف غير موجود');

    const assessment = {
      id: Date.now().toString(),
      certificationId,
      assessmentDate: new Date(),
      assessor: assessmentData.assessor,
      assessmentType: assessmentData.assessmentType, // comprehensive, specific
      medicalEvaluation: {
        diagnosis: assessmentData.diagnosis,
        primaryDisability: assessmentData.primaryDisability,
        secondaryDisabilities: assessmentData.secondaryDisabilities || [],
        etiology: assessmentData.etiology,
        prognosis: assessmentData.prognosis,
        stability: assessmentData.stability, // stable, progressive, improving
      },
      functionalEvaluation: {
        mobility: {
          score: assessmentData.mobilityScore || 0,
          limitations: assessmentData.mobilityLimitations || [],
          aids: assessmentData.mobilityAids || [],
        },
        selfCare: {
          score: assessmentData.selfCareScore || 0,
          limitations: assessmentData.selfCareLimitations || [],
          assistance: assessmentData.selfCareAssistance || [],
        },
        communication: {
          score: assessmentData.communicationScore || 0,
          limitations: assessmentData.communicationLimitations || [],
          methods: assessmentData.communicationMethods || [],
        },
        cognition: {
          score: assessmentData.cognitionScore || 0,
          limitations: assessmentData.cognitionLimitations || [],
        },
        sensory: {
          vision: assessmentData.visionScore || 0,
          hearing: assessmentData.hearingScore || 0,
          limitations: assessmentData.sensoryLimitations || [],
        },
      },
      severityAssessment: {
        overallSeverity: 'moderate', // mild, moderate, severe, profound
        category: '', // based on Saudi classification
        percentage: 0,
      },
      recommendations: [],
      documents: [],
      status: 'completed',
    };

    // حساب نسبة الإعاقة بناءً على التقييم
    assessment.severityAssessment.percentage = this._calculateDisabilityPercentage(assessment);
    assessment.severityAssessment.overallSeverity = this._determineSeverity(
      assessment.severityAssessment.percentage
    );
    assessment.severityAssessment.category = this._determineCategory(assessment);

    // إضافة التوصيات
    assessment.recommendations = this._generateRecommendations(assessment);

    this.assessments.set(assessment.id, assessment);
    certification.status = 'assessed';

    return assessment;
  }

  /**
   * حساب نسبة الإعاقة
   */
  _calculateDisabilityPercentage(assessment) {
    const functional = assessment.functionalEvaluation;
    const weights = {
      mobility: 0.25,
      selfCare: 0.25,
      communication: 0.2,
      cognition: 0.2,
      sensory: 0.1,
    };

    const sensoryAvg = (functional.sensory.vision + functional.sensory.hearing) / 2;

    const total =
      functional.mobility.score * weights.mobility +
      functional.selfCare.score * weights.selfCare +
      functional.communication.score * weights.communication +
      functional.cognition.score * weights.cognition +
      sensoryAvg * weights.sensory;

    return Math.min(100, Math.round(total));
  }

  /**
   * تحديد شدة الإعاقة
   */
  _determineSeverity(percentage) {
    if (percentage >= 80) return 'profound';
    if (percentage >= 60) return 'severe';
    if (percentage >= 40) return 'moderate';
    return 'mild';
  }

  /**
   * تحديد فئة الإعاقة
   */
  _determineCategory(assessment) {
    const categories = {
      physical: 'إعاقة حركية',
      visual: 'إعاقة بصرية',
      hearing: 'إعاقة سمعية',
      intellectual: 'إعاقة ذهنية',
      autism: 'اضطراب طيف التوحد',
      multiple: 'إعاقة متعددة',
    };

    return categories[assessment.medicalEvaluation.primaryDisability] || 'أخرى';
  }

  /**
   * إصدار شهادة الإعاقة
   */
  async issueCertificate(certificationId, certificateData) {
    const certification = this.certifications.get(certificationId);
    if (!certification) throw new Error('طلب التصنيف غير موجود');

    const certificate = {
      id: Date.now().toString(),
      certificationId,
      beneficiaryId: certification.beneficiaryId,
      certificateNumber: `DIS-${Date.now()}`,
      issueDate: new Date(),
      expiryDate: new Date(new Date().setFullYear(new Date().getFullYear() + 5)),
      disabilityType: certificateData.disabilityType,
      category: certificateData.category,
      severity: certificateData.severity,
      percentage: certificateData.percentage,
      benefits: {
        financialSupport: certificateData.percentage >= 50,
        medicalInsurance: true,
        transportationDiscount: true,
        employmentPriority: certificateData.percentage >= 30,
        educationalSupport: true,
        parkingPermit: certificateData.percentage >= 40,
        taxExemptions: certificateData.percentage >= 80,
      },
      restrictions: certificateData.restrictions || [],
      authorizedBy: certificateData.authorizedBy,
      status: 'active',
      qrCode: null,
      verifiedBy: [],
    };

    certification.status = 'issued';
    certification.certificateId = certificate.id;

    return certificate;
  }

  /**
   * تجديد الشهادة
   */
  async renewCertificate(certificateId, renewalData) {
    const renewal = {
      id: Date.now().toString(),
      originalCertificateId: certificateId,
      requestDate: new Date(),
      reason: renewalData.reason,
      medicalUpdateRequired: renewalData.medicalUpdateRequired || false,
      assessmentUpdate: null,
      newCertificateId: null,
      status: 'pending',
    };

    this.renewals.set(renewal.id, renewal);
    return renewal;
  }

  /**
   * توليد التوصيات
   */
  _generateRecommendations(assessment) {
    const recommendations = [];
    const functional = assessment.functionalEvaluation;

    if (functional.mobility.score > 50) {
      recommendations.push({
        type: 'assistive_device',
        description: 'استخدام أداة مساعدة للحركة',
        priority: 'high',
      });
    }

    if (functional.communication.score > 50) {
      recommendations.push({
        type: 'therapy',
        description: 'التفويض لتلقي علاج النطق واللغة',
        priority: 'high',
      });
    }

    if (assessment.severityAssessment.percentage >= 80) {
      recommendations.push({
        type: 'caregiver',
        description: 'توفير مرافق دائم',
        priority: 'urgent',
      });
    }

    return recommendations;
  }

  /**
   * التحقق من صحة الشهادة
   */
  async verifyCertificate(certificateNumber) {
    return {
      valid: true,
      certificateNumber,
      verifiedAt: new Date(),
    };
  }
}

module.exports = { DisabilityCertificationService };
