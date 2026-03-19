/* eslint-disable no-unused-vars */
/**
 * Saudi Social Benefits Service for Disability Rehabilitation
 * خدمات الضمان الاجتماعي والمزايا للمستفيدين ذوي الإعاقة
 */

class SaudiSocialBenefitsService {
  constructor() {
    this.benefits = new Map();
    this.applications = new Map();
    this.payments = new Map();
    this.eligibility = new Map();
  }

  /**
   * التحقق من الأهلية للضمان الاجتماعي
   */
  async checkEligibility(beneficiaryId, beneficiaryData) {
    const eligibilityResult = {
      id: Date.now().toString(),
      beneficiaryId,
      checkDate: new Date(),
      criteria: {
        disabilityPercentage: beneficiaryData.disabilityPercentage,
        income: beneficiaryData.income,
        dependents: beneficiaryData.dependents,
        residency: beneficiaryData.residency, // saudi, resident
        age: beneficiaryData.age,
        employment: beneficiaryData.employment,
      },
      eligible: false,
      eligiblePrograms: [],
      ineligibleReasons: [],
      estimatedBenefits: 0,
      status: 'pending',
    };

    // التحقق من أهلية الضمان الاجتماعي
    if (
      beneficiaryData.residency === 'saudi' &&
      beneficiaryData.disabilityPercentage >= 50 &&
      beneficiaryData.income < 4000
    ) {
      eligibilityResult.eligiblePrograms.push({
        program: 'social_security',
        name: 'الضمان الاجتماعي',
        monthlyAmount: this._calculateSocialSecurity(beneficiaryData),
        requirements: ['تقديم تقرير طبي', 'كشف حساب بنكي'],
      });
      eligibilityResult.eligible = true;
    }

    // التحقق من أهلية إعانة ذوي الإعاقة
    if (beneficiaryData.disabilityPercentage >= 30) {
      eligibilityResult.eligiblePrograms.push({
        program: 'disability_allowance',
        name: 'إعانة ذوي الإعاقة',
        monthlyAmount: this._calculateDisabilityAllowance(beneficiaryData),
        requirements: ['شهادة إعاقة معتمدة'],
      });
      eligibilityResult.eligible = true;
    }

    // التحقق من أهلية设备的 مجانية
    if (beneficiaryData.disabilityPercentage >= 40) {
      eligibilityResult.eligiblePrograms.push({
        program: 'free_equipment',
        name: 'الأجهزة التعويضية المجانية',
        types: ['كراسي متحركة', 'أطراف صناعية', 'سماعات طبية', 'نظارات طبية'],
        requirements: ['توصية طبية', 'موافقة اللجنة الطبية'],
      });
    }

    // حساب إجمالي المزايا
    eligibilityResult.estimatedBenefits = eligibilityResult.eligiblePrograms.reduce(
      (sum, p) => sum + (p.monthlyAmount || 0),
      0
    );

    this.eligibility.set(eligibilityResult.id, eligibilityResult);
    return eligibilityResult;
  }

  /**
   * حساب مبلغ الضمان الاجتماعي
   */
  _calculateSocialSecurity(data) {
    const baseAmount = 1000;
    const dependentBonus = data.dependents * 200;
    const disabilityBonus =
      data.disabilityPercentage >= 80 ? 500 : data.disabilityPercentage >= 50 ? 300 : 0;
    return baseAmount + dependentBonus + disabilityBonus;
  }

  /**
   * حساب إعانة ذوي الإعاقة
   */
  _calculateDisabilityAllowance(data) {
    if (data.disabilityPercentage >= 80) return 4000;
    if (data.disabilityPercentage >= 60) return 3000;
    if (data.disabilityPercentage >= 40) return 2000;
    return 1000;
  }

  /**
   * تقديم طلب استحقاق
   */
  async submitBenefitApplication(beneficiaryId, applicationData) {
    const application = {
      id: Date.now().toString(),
      beneficiaryId,
      submissionDate: new Date(),
      program: applicationData.program,
      personalInfo: applicationData.personalInfo,
      disabilityInfo: applicationData.disabilityInfo,
      financialInfo: applicationData.financialInfo,
      documents: applicationData.documents || [],
      status: 'submitted',
      trackingNumber: `BEN-${Date.now()}`,
      timeline: [
        {
          date: new Date(),
          status: 'submitted',
          notes: 'تم استلام الطلب',
        },
      ],
      assignedTo: null,
      reviewDate: null,
      decision: null,
      appealDeadline: null,
    };

    this.applications.set(application.id, application);
    return application;
  }

  /**
   * مراجعة طلب الاستحقاق
   */
  async reviewApplication(applicationId, reviewData) {
    const application = this.applications.get(applicationId);
    if (!application) throw new Error('الطلب غير موجود');

    application.status = reviewData.decision; // approved, rejected, need_info
    application.decision = {
      date: new Date(),
      reviewer: reviewData.reviewer,
      decision: reviewData.decision,
      reason: reviewData.reason,
      approvedAmount: reviewData.approvedAmount || 0,
      startDate: reviewData.startDate,
      endDate: reviewData.endDate,
    };

    if (reviewData.decision === 'approved') {
      application.appealDeadline = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      await this._createBenefitRecord(application);
    }

    application.timeline.push({
      date: new Date(),
      status: reviewData.decision,
      notes: reviewData.notes,
    });

    return application;
  }

  /**
   * إنشاء سجل الاستحقاق
   */
  async _createBenefitRecord(application) {
    const benefit = {
      id: Date.now().toString(),
      beneficiaryId: application.beneficiaryId,
      applicationId: application.id,
      program: application.program,
      approvalDate: new Date(),
      monthlyAmount: application.decision.approvedAmount,
      startDate: application.decision.startDate,
      endDate: application.decision.endDate,
      status: 'active',
      payments: [],
      adjustments: [],
      renewalRequired: true,
      nextRenewalDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
    };

    this.benefits.set(benefit.id, benefit);
    return benefit;
  }

  /**
   * معالجة الدفعات
   */
  async processPayment(benefitId, paymentData) {
    const benefit = this.benefits.get(benefitId);
    if (!benefit) throw new Error('سجل الاستحقاق غير موجود');

    const payment = {
      id: Date.now().toString(),
      benefitId,
      beneficiaryId: benefit.beneficiaryId,
      paymentDate: paymentData.paymentDate || new Date(),
      amount: paymentData.amount || benefit.monthlyAmount,
      period: paymentData.period, // month, quarter
      method: paymentData.method, // bank_transfer, check, cash
      reference: `PAY-${Date.now()}`,
      status: 'processed',
      deductions: [],
      bonuses: [],
    };

    benefit.payments.push(payment.id);
    this.payments.set(payment.id, payment);

    return payment;
  }

  /**
   * الحصول على المزايا النشطة
   */
  async getActiveBenefits(beneficiaryId) {
    const allBenefits = Array.from(this.benefits.values());
    return allBenefits.filter(b => b.beneficiaryId === beneficiaryId && b.status === 'active');
  }

  /**
   * تجديد الاستحقاق
   */
  async renewBenefit(benefitId, renewalData) {
    const benefit = this.benefits.get(benefitId);
    if (!benefit) throw new Error('سجل الاستحقاق غير موجود');

    const renewal = {
      id: Date.now().toString(),
      benefitId,
      renewalDate: new Date(),
      newStartDate: renewalData.newStartDate,
      newEndDate: renewalData.newEndDate,
      updatedAmount: renewalData.updatedAmount,
      medicalReport: renewalData.medicalReport,
      status: 'approved',
      notes: renewalData.notes,
    };

    benefit.endDate = renewal.newEndDate;
    benefit.nextRenewalDate = new Date(
      new Date(renewal.newEndDate).setFullYear(new Date(renewal.newEndDate).getFullYear() + 1)
    );
    benefit.adjustments.push(renewal);

    return renewal;
  }

  /**
   * تقرير المزايا الشهري
   */
  async generateMonthlyReport(month, year) {
    const payments = Array.from(this.payments.values()).filter(p => {
      const paymentDate = new Date(p.paymentDate);
      return paymentDate.getMonth() + 1 === month && paymentDate.getFullYear() === year;
    });

    const benefits = Array.from(this.benefits.values());
    const applications = Array.from(this.applications.values());

    return {
      period: { month, year },
      generatedAt: new Date(),
      summary: {
        totalPayments: payments.length,
        totalAmount: payments.reduce((sum, p) => sum + p.amount, 0),
        activeBenefits: benefits.filter(b => b.status === 'active').length,
        newApplications: applications.filter(a => {
          const appDate = new Date(a.submissionDate);
          return appDate.getMonth() + 1 === month && appDate.getFullYear() === year;
        }).length,
      },
      byProgram: {
        socialSecurity: {
          beneficiaries: benefits.filter(
            b => b.program === 'social_security' && b.status === 'active'
          ).length,
          totalAmount: payments
            .filter(p => {
              const b = this.benefits.get(p.benefitId);
              return b && b.program === 'social_security';
            })
            .reduce((sum, p) => sum + p.amount, 0),
        },
        disabilityAllowance: {
          beneficiaries: benefits.filter(
            b => b.program === 'disability_allowance' && b.status === 'active'
          ).length,
          totalAmount: payments
            .filter(p => {
              const b = this.benefits.get(p.benefitId);
              return b && b.program === 'disability_allowance';
            })
            .reduce((sum, p) => sum + p.amount, 0),
        },
      },
    };
  }
}

module.exports = { SaudiSocialBenefitsService };
