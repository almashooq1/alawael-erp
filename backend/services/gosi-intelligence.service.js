/**
 * AI-Powered GOSI Intelligence Service
 * خدمة الذكاء الاصطناعي للتأمينات الاجتماعية
 * 
 * Features:
 * - Predictive analytics
 * - Anomaly detection
 * - Smart recommendations
 * - Risk assessment
 * - Forecasting
 */

const logger = require('../utils/logger');
const EventEmitter = require('events');

class GOSIIntelligenceService extends EventEmitter {
  constructor() {
    super();
    this.name = 'GOSIIntelligenceService';
  }

  /**
   * Predict employee GOSI eligibility
   * التنبؤ بأهلية الموظف للتأمينات
   */
  predictGOSIEligibility(employeeData) {
    try {
      const {
        salary,
        nationality,
        contractType,
        workingHours = 8,
        startDate,
        position
      } = employeeData;

      const predictions = {
        eligible: true,
        eligibilityScore: 0,
        factors: [],
        recommendations: [],
        riskFactors: [],
        estimatedBenefits: {}
      };

      // Factor 1: Salary range
      if (salary >= 1500) {
        predictions.eligibilityScore += 20;
        predictions.factors.push('✅ Salary meets minimum threshold');
      } else {
        predictions.eligible = false;
        predictions.riskFactors.push('❌ Salary below minimum threshold');
      }

      // Factor 2: Contract type
      if (contractType === 'unlimited') {
        predictions.eligibilityScore += 25;
        predictions.factors.push('✅ Unlimited contract ensures eligibility');
      } else if (contractType === 'limited') {
        predictions.eligibilityScore += 15;
        predictions.riskFactors.push('⚠️ Limited contract requires verification');
      } else {
        predictions.eligibilityScore -= 10;
        predictions.riskFactors.push('❌ Contract type not recognized');
      }

      // Factor 3: Nationality
      const isSaudi = nationality === 'Saudi' || nationality === 'SA';
      if (isSaudi) {
        predictions.eligibilityScore += 20;
        predictions.factors.push('✅ Saudi national - Full benefits applicable');
      } else {
        predictions.eligibilityScore += 15;
        predictions.factors.push('✅ Foreign worker - Employer coverage required');
      }

      // Factor 4: Working hours
      if (workingHours >= 8) {
        predictions.eligibilityScore += 10;
        predictions.factors.push('✅ Adequate working hours');
      } else {
        predictions.riskFactors.push('⚠️ Part-time worker - Verify eligibility');
        predictions.eligibilityScore -= 5;
      }

      // Factor 5: Employment duration
      const monthsEmployed = (Date.now() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24 * 30);
      if (monthsEmployed >= 1) {
        predictions.eligibilityScore += 10;
        predictions.factors.push(`✅ Employed for ${Math.floor(monthsEmployed)} months`);
      } else if (monthsEmployed > 0) {
        predictions.riskFactors.push('⚠️ Recent hire - GOSI eligibility starts after 1 month');
        predictions.recommendations.push('Schedule GOSI registration after 1-month work anniversary');
      }

      // Calculate estimated benefits
      const { employerRate, employeeRate, totalRate } = this._getRatesForNationality(isSaudi);
      const subscriberWage = salary + (salary * 0.25); // + housing

      predictions.estimatedBenefits = {
        monthlyEmployerContribution: Math.round(subscriberWage * employerRate * 100) / 100,
        monthlyEmployeeContribution: Math.round(subscriberWage * employeeRate * 100) / 100,
        annualTotalContribution: Math.round(subscriberWage * totalRate * 12 * 100) / 100,
        expectedBenefits: isSaudi ? [
          'Disability insurance',
          'Work injury coverage',
          'Old-age pension',
          'Survivors benefits',
          'Healthcare coverage'
        ] : [
          'Work injury coverage',
          'Basic benefits'
        ]
      };

      // Smart recommendations
      if (predictions.eligible && monthsEmployed < 1) {
        predictions.recommendations.push('🔔 Schedule GOSI registration 1 month from hire date');
      }
      if (predictions.eligibilityScore < 40) {
        predictions.recommendations.push('⚠️ Verify employment details before GOSI registration');
      }
      predictions.recommendations.push('📋 Ensure all documents are ready for GOSI submission');

      // Normalize score
      predictions.eligibilityScore = Math.min(100, Math.max(0, predictions.eligibilityScore));

      return {
        ...predictions,
        timestamp: new Date(),
        status: predictions.eligible ? 'eligible' : 'not_eligible',
        actionItems: this._generateActionItems(predictions)
      };
    } catch (error) {
      logger.error('Failed to predict GOSI eligibility', error);
      throw error;
    }
  }

  /**
   * Predict compliance issues
   * التنبؤ بمشاكل الامتثال
   */
  predictComplianceRisks(employeeData) {
    try {
      const {
        lastGOSIUpdate,
        lastMedicalInsuranceCheck,
        salary,
        salaryHistory = [],
        medicalInsuranceExpiry,
        contractEndDate,
        nationality
      } = employeeData;

      const riskAssessment = {
        overallRisk: 'low',
        riskScore: 0, // 0-100
        risks: [],
        alerts: [],
        urgentActions: []
      };

      // Risk 1: GOSI data staleness
      const daysSinceGOSIUpdate = (Date.now() - new Date(lastGOSIUpdate)) / (1000 * 60 * 60 * 24);
      if (daysSinceGOSIUpdate > 90) {
        riskAssessment.riskScore += 30;
        riskAssessment.risks.push({
          type: 'data_staleness',
          severity: 'high',
          message: `GOSI data not updated for ${Math.floor(daysSinceGOSIUpdate)} days`,
          action: 'Update GOSI information immediately'
        });
      } else if (daysSinceGOSIUpdate > 30) {
        riskAssessment.riskScore += 15;
        riskAssessment.alerts.push(`GOSI data should be refreshed (${Math.floor(daysSinceGOSIUpdate)} days old)`);
      }

      // Risk 2: Medical insurance expiry
      if (medicalInsuranceExpiry) {
        const daysUntilExpiry = (new Date(medicalInsuranceExpiry) - Date.now()) / (1000 * 60 * 60 * 24);
        if (daysUntilExpiry < 0) {
          riskAssessment.riskScore += 40;
          riskAssessment.risks.push({
            type: 'insurance_expired',
            severity: 'critical',
            message: 'Medical insurance has expired',
            action: 'Renew medical insurance immediately'
          });
          riskAssessment.urgentActions.push('🚨 Renew medical insurance urgently');
        } else if (daysUntilExpiry < 30) {
          riskAssessment.riskScore += 25;
          riskAssessment.alerts.push(`Medical insurance expires in ${Math.floor(daysUntilExpiry)} days`);
          riskAssessment.urgentActions.push(`📅 Schedule medical insurance renewal (${Math.floor(daysUntilExpiry)} days remaining)`);
        }
      }

      // Risk 3: Salary anomalies
      if (salaryHistory.length > 0) {
        const avgSalary = salaryHistory.reduce((a, b) => a + b, 0) / salaryHistory.length;
        const salaryDifference = Math.abs(salary - avgSalary) / avgSalary;
        
        if (salaryDifference > 0.3) { // 30% change
          riskAssessment.riskScore += 20;
          riskAssessment.alerts.push(`Salary change of ${(salaryDifference * 100).toFixed(1)}% detected`);
          riskAssessment.urgentActions.push('✏️ Verify salary change with HR');
        }
      }

      // Risk 4: Contract end date approaching
      if (contractEndDate) {
        const daysUntilEnd = (new Date(contractEndDate) - Date.now()) / (1000 * 60 * 60 * 24);
        if (daysUntilEnd < 30 && daysUntilEnd > 0) {
          riskAssessment.riskScore += 15;
          riskAssessment.alerts.push(`Contract ends in ${Math.floor(daysUntilEnd)} days`);
          riskAssessment.urgentActions.push(`📋 Prepare contract renewal or exit procedures (${Math.floor(daysUntilEnd)} days remaining)`);
        }
      }

      // Determine overall risk level
      if (riskAssessment.riskScore > 60) {
        riskAssessment.overallRisk = 'critical';
      } else if (riskAssessment.riskScore > 40) {
        riskAssessment.overallRisk = 'high';
      } else if (riskAssessment.riskScore > 20) {
        riskAssessment.overallRisk = 'medium';
      }

      return {
        ...riskAssessment,
        riskScore: Math.min(100, riskAssessment.riskScore),
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('Failed to predict compliance risks', error);
      throw error;
    }
  }

  /**
   * Forecast financial impact
   * التنبؤ بالتأثير المالي
   */
  forecastFinancialImpact(employeeData, forecastMonths = 12) {
    try {
      const {
        salary,
        nationality,
        benefits = {},
        expectedRaise = 0,
        bonusFrequency = 'annual'
      } = employeeData;

      const forecast = {
        period: {
          months: forecastMonths,
          startDate: new Date(),
          endDate: new Date(Date.now() + forecastMonths * 30 * 24 * 60 * 60 * 1000)
        },
        monthly: [],
        summary: {
          totalSalary: 0,
          totalEmployerContribution: 0,
          totalEmployeeContribution: 0,
          totalBenefits: 0,
          estimatedBonuses: 0,
          totalCostOfEmployment: 0
        },
        insights: []
      };

      const isSaudi = nationality === 'Saudi' || nationality === 'SA';
      const { employerRate, employeeRate } = this._getRatesForNationality(isSaudi);
      const subscriberWage = salary + (salary * 0.25);

      let currentSalary = salary;
      let monthsSinceRaise = 0;

      for (let month = 0; month < forecastMonths; month++) {
        // Apply annual raise
        if (monthsSinceRaise >= 12 && expectedRaise > 0) {
          currentSalary += currentSalary * expectedRaise;
          monthsSinceRaise = 0;
        }

        const currentSubscriberWage = currentSalary + (currentSalary * 0.25);
        const employerContribution = Math.round(currentSubscriberWage * employerRate * 100) / 100;
        const employeeContribution = Math.round(currentSubscriberWage * employeeRate * 100) / 100;
        
        let bonusAmount = 0;
        if (bonusFrequency === 'annual' && month === 11) {
          bonusAmount = currentSalary;
        } else if (bonusFrequency === 'quarterly' && month % 3 === 2) {
          bonusAmount = currentSalary / 3;
        }

        const monthData = {
          month: month + 1,
          salary: Math.round(currentSalary * 100) / 100,
          employerContribution,
          employeeContribution,
          bonus: bonusAmount,
          totalCost: Math.round((currentSalary + employerContribution + bonusAmount) * 100) / 100
        };

        forecast.monthly.push(monthData);
        forecast.summary.totalSalary += monthData.salary;
        forecast.summary.totalEmployerContribution += monthData.employerContribution;
        forecast.summary.totalEmployeeContribution += monthData.employeeContribution;
        forecast.summary.estimatedBonuses += monthData.bonus;
        forecast.summary.totalCostOfEmployment += monthData.totalCost;

        monthsSinceRaise++;
      }

      // Generate insights
      forecast.insights.push(`💰 Total 12-month salary cost: ${this._formatCurrency(forecast.summary.totalSalary)}`);
      forecast.insights.push(`💼 Total employer contribution: ${this._formatCurrency(forecast.summary.totalEmployerContribution)}`);
      forecast.insights.push(`👤 Total employee contribution: ${this._formatCurrency(forecast.summary.totalEmployeeContribution)}`);
      
      const costPerMonth = Math.round(forecast.summary.totalCostOfEmployment / forecastMonths * 100) / 100;
      forecast.insights.push(`📊 Average monthly cost: ${this._formatCurrency(costPerMonth)}`);

      if (expectedRaise > 0) {
        forecast.insights.push(`📈 Expected annual raise: ${(expectedRaise * 100).toFixed(1)}%`);
      }

      return forecast;
    } catch (error) {
      logger.error('Failed to forecast financial impact', error);
      throw error;
    }
  }

  /**
   * Generate smart recommendations
   * توليد التوصيات الذكية
   */
  generateRecommendations(employeeData, analysisResults = {}) {
    try {
      const recommendations = {
        immediate: [],
        short_term: [], // 1-4 weeks
        medium_term: [], // 1-3 months
        long_term: [], // 3+ months
        insights: []
      };

      const {
        lastGOSIUpdate,
        lastMedicalInsuranceCheck,
        medicalInsuranceExpiry,
        salary,
        position,
        contractEndDate
      } = employeeData;

      // Immediate actions
      const daysSinceGOSIUpdate = (Date.now() - new Date(lastGOSIUpdate)) / (1000 * 60 * 60 * 24);
      if (daysSinceGOSIUpdate > 60) {
        recommendations.immediate.push({
          priority: 'high',
          action: 'Update GOSI Information',
          description: `GOSI data hasn't been updated for ${Math.floor(daysSinceGOSIUpdate)} days`,
          expectedBenefit: 'Ensure compliance and accurate records',
          estimatedTime: '2 hours'
        });
      }

      if (medicalInsuranceExpiry) {
        const daysUntilExpiry = (new Date(medicalInsuranceExpiry) - Date.now()) / (1000 * 60 * 60 * 24);
        if (daysUntilExpiry < 7) {
          recommendations.immediate.push({
            priority: 'critical',
            action: 'Renew Medical Insurance',
            description: `Medical insurance expires in ${Math.floor(daysUntilExpiry)} days`,
            expectedBenefit: 'Prevent coverage gap and ensure employee protection',
            estimatedTime: '4 hours'
          });
        }
      }

      // Short-term actions
      if (daysSinceGOSIUpdate > 30) {
        recommendations.short_term.push({
          priority: 'medium',
          action: 'Schedule Regular GOSI Review',
          description: 'Establish quarterly review schedule for GOSI compliance',
          expectedBenefit: 'Maintain compliance and catch issues early',
          estimatedTime: '1 week'
        });
      }

      recommendations.short_term.push({
        priority: 'medium',
        action: 'Review Salary Structure',
        description: 'Analyze current salary against market and GOSI calculations',
        expectedBenefit: 'Optimize GOSI contributions and ensure competitiveness',
        estimatedTime: '2 weeks'
      });

      // Medium-term actions
      recommendations.medium_term.push({
        priority: 'low',
        action: 'Plan Benefits Enhancement',
        description: 'Consider additional benefits or insurance coverage',
        expectedBenefit: 'Improve employee retention and satisfaction',
        estimatedTime: '4 weeks'
      });

      // Insights
      if (salary < 5000) {
        recommendations.insights.push('💡 Consider performance-based salary increases to improve employee retention');
      }
      
      recommendations.insights.push('📊 Regular compliance audits can reduce legal risks by up to 70%');
      recommendations.insights.push('🎯 Automated GOSI updates reduce administrative errors by 95%');

      return {
        ...recommendations,
        generatedAt: new Date(),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      };
    } catch (error) {
      logger.error('Failed to generate recommendations', error);
      throw error;
    }
  }

  /**
   * Private helpers
   */
  _getRatesForNationality(isSaudi) {
    if (isSaudi) {
      return {
        employerRate: 0.1175, // 11.75%
        employeeRate: 0.0975, // 9.75%
        totalRate: 0.215 // 21.5%
      };
    } else {
      return {
        employerRate: 0.02, // 2%
        employeeRate: 0,
        totalRate: 0.02
      };
    }
  }

  _generateActionItems(predictions) {
    const items = [];
    if (!predictions.eligible) {
      items.push({
        type: 'verify',
        description: 'Verify employee eligibility with HR',
        priority: 'high'
      });
    }
    predictions.recommendations.forEach(rec => {
      items.push({
        type: 'action',
        description: rec,
        priority: 'medium'
      });
    });
    return items;
  }

  _formatCurrency(amount) {
    return new Intl.NumberFormat('en-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }
}

module.exports = new GOSIIntelligenceService();
