/**
 * ALAWAEL ERP - PHASE 21: WORKFORCE ANALYTICS & PLANNING SYSTEM
 * HR metrics, forecasting, succession planning, talent analytics, compensation analysis
 */

class WorkforceAnalyticsService {
  constructor() {
    // Workforce data
    this.employees = [];
    this.departments = [];
    this.positions = [];
    this.skills = [];

    // Planning & forecasting
    this.headcountPlans = [];
    this.forecasts = [];
    this.successionPlans = [];
    this.retentionAnalysis = [];

    // Compensation & benefits
    this.compensationData = [];
    this.salaryBands = [];
    this.benefitsCosts = [];

    // Performance & development
    this.performanceData = [];
    this.developmentPlans = [];
    this.trainingNeeds = [];

    // Analytics & reports
    this.workforceReports = [];
    this.analytics = [];
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WORKFORCE PLANNING
  // ═══════════════════════════════════════════════════════════════════════════

  createHeadcountPlan(planData) {
    if (!planData.departmentId || !planData.planYear || !planData.targetHeadcount) {
      throw new Error('Missing required fields: departmentId, planYear, targetHeadcount');
    }

    const plan = {
      id: `HCP-${Date.now()}`,
      departmentId: planData.departmentId,
      planYear: planData.planYear,
      currentHeadcount: planData.currentHeadcount || 0,
      targetHeadcount: planData.targetHeadcount,
      budgetedCost: planData.budgetedCost || null,
      plannedHires: planData.plannedHires || 0,
      plannedSeparations: planData.plannedSeparations || 0,
      status: 'draft',
      approvalStatus: 'pending',
      createdDate: new Date(),
      approvedDate: null,
      quarterlyBreakdown: this._generateQuarterlyBreakdown(planData.targetHeadcount),
      assumptions: planData.assumptions || [],
      risks: planData.risks || [],
    };

    this.headcountPlans.push(plan);
    return plan;
  }

  _generateQuarterlyBreakdown(targetHeadcount) {
    return {
      Q1: Math.floor(targetHeadcount * 0.23),
      Q2: Math.floor(targetHeadcount * 0.24),
      Q3: Math.floor(targetHeadcount * 0.25),
      Q4: Math.floor(targetHeadcount * 0.28),
    };
  }

  approveHeadcountPlan(planId, approverData) {
    const plan = this.headcountPlans.find(p => p.id === planId);
    if (!plan) throw new Error('Plan not found');

    plan.approvalStatus = approverData.status; // approved, rejected
    plan.approvedDate = new Date();
    plan.approver = approverData.approver || 'system';
    plan.approverComments = approverData.comments || '';

    if (approverData.status === 'approved') {
      plan.status = 'approved';
    }

    return plan;
  }

  createForecast(forecastData) {
    if (!forecastData.metric || !forecastData.department || !forecastData.period) {
      throw new Error('Missing required fields: metric, department, period');
    }

    const forecast = {
      id: `FC-${Date.now()}`,
      metric: forecastData.metric, // headcount, cost, attrition, revenue
      department: forecastData.department,
      period: forecastData.period,
      historicalData: forecastData.historicalData || [],
      predictedValue: forecastData.predictedValue || null,
      confidence: forecastData.confidence || null,
      methodology: forecastData.methodology || 'trend-analysis',
      createdDate: new Date(),
      accuracy: null,
    };

    this.forecasts.push(forecast);
    return forecast;
  }

  updateForecastAccuracy(forecastId, accuracyData) {
    const forecast = this.forecasts.find(f => f.id === forecastId);
    if (!forecast) throw new Error('Forecast not found');

    const error = Math.abs(accuracyData.actualValue - forecast.predictedValue);
    const mape = (error / accuracyData.actualValue) * 100;

    forecast.accuracy = {
      actualValue: accuracyData.actualValue,
      error: error,
      MAPE: mape.toFixed(2),
      evaluatedDate: new Date(),
    };

    return forecast;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SUCCESSION PLANNING
  // ═══════════════════════════════════════════════════════════════════════════

  createSuccessionPlan(planData) {
    if (!planData.positionId || !planData.currentHolder || !planData.criticalityLevel) {
      throw new Error('Missing required fields: positionId, currentHolder, criticalityLevel');
    }

    const plan = {
      id: `SUC-${Date.now()}`,
      positionId: planData.positionId,
      positionTitle: planData.positionTitle || null,
      currentHolder: planData.currentHolder,
      criticalityLevel: planData.criticalityLevel, // critical, high, medium, low
      successors: planData.successors || [],
      developmentNeeds: planData.developmentNeeds || [],
      riskFactors: planData.riskFactors || [],
      replacementReadiness: this._calculateReadiness(planData.successors || []),
      timelineToVacancy: planData.timelineToVacancy || null,
      createdDate: new Date(),
      lastReviewDate: new Date(),
      status: 'active',
    };

    this.successionPlans.push(plan);
    return plan;
  }

  _calculateReadiness(successors) {
    if (successors.length === 0) return 'high-risk';
    const readyCount = successors.filter(s => s.readinessLevel === 'ready').length;
    if (readyCount > 0) return 'ready';
    const developingCount = successors.filter(s => s.readinessLevel === 'developing').length;
    if (developingCount > 0) return 'developing';
    return 'not-ready';
  }

  addSuccessor(planId, successorData) {
    const plan = this.successionPlans.find(p => p.id === planId);
    if (!plan) throw new Error('Succession plan not found');

    const successor = {
      employeeId: successorData.employeeId,
      name: successorData.name,
      department: successorData.department,
      readinessLevel: successorData.readinessLevel, // ready, developing, not-ready
      developmentActions: successorData.developmentActions || [],
      estimatedReadyDate: successorData.estimatedReadyDate || null,
      priority: successorData.priority || 'secondary',
      addedDate: new Date(),
    };

    plan.successors.push(successor);
    plan.replacementReadiness = this._calculateReadiness(plan.successors);

    return successor;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SKILLS & COMPETENCY TRACKING
  // ═══════════════════════════════════════════════════════════════════════════

  createSkillMapping(mappingData) {
    if (!mappingData.employeeId || !mappingData.department) {
      throw new Error('Missing required fields: employeeId, department');
    }

    const mapping = {
      id: `SKL-${Date.now()}`,
      employeeId: mappingData.employeeId,
      employeeName: mappingData.employeeName || null,
      department: mappingData.department,
      skills: mappingData.skills || [], // Array of {skillName, proficiency, yearsOfExperience}
      certifications: mappingData.certifications || [],
      languages: mappingData.languages || [],
      clearances: mappingData.clearances || [],
      createdDate: new Date(),
      lastUpdated: new Date(),
      skillGaps: [],
    };

    this.skills.push(mapping);
    mapping.skillGaps = this._identifySkillGaps(mapping);
    return mapping;
  }

  _identifySkillGaps(mapping) {
    // Identify skills needed for advancement but not yet acquired
    return mapping.skills
      .filter(s => s.proficiency < 3 && s.yearsOfExperience < 5)
      .map(s => ({
        skillName: s.skillName,
        currentLevel: s.proficiency,
        targetLevel: 4,
        trainingNeeded: true,
      }));
  }

  updateSkillProficiency(skillMappingId, skillUpdate) {
    const mapping = this.skills.find(s => s.id === skillMappingId);
    if (!mapping) throw new Error('Skill mapping not found');

    const skill = mapping.skills.find(s => s.skillName === skillUpdate.skillName);
    if (skill) {
      skill.proficiency = Math.min(5, skillUpdate.proficiency);
      skill.yearsOfExperience = skillUpdate.yearsOfExperience || skill.yearsOfExperience;
    } else {
      mapping.skills.push({
        skillName: skillUpdate.skillName,
        proficiency: skillUpdate.proficiency,
        yearsOfExperience: skillUpdate.yearsOfExperience || 0,
      });
    }

    mapping.lastUpdated = new Date();
    mapping.skillGaps = this._identifySkillGaps(mapping);
    return mapping;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RETENTION & ATTRITION ANALYSIS
  // ═══════════════════════════════════════════════════════════════════════════

  analyzeRetention(analysisData) {
    if (!analysisData.department || !analysisData.period) {
      throw new Error('Missing required fields: department, period');
    }

    const analysis = {
      id: `RET-${Date.now()}`,
      department: analysisData.department,
      period: analysisData.period,
      startHeadcount: analysisData.startHeadcount || 0,
      endHeadcount: analysisData.endHeadcount || 0,
      separations: analysisData.separations || 0,
      voluntaryAttrition: analysisData.voluntaryAttrition || 0,
      involuntaryAttrition: analysisData.involuntaryAttrition || 0,
      retentionRate: 0,
      attritionRate: 0,
      riskEmployees: analysisData.riskEmployees || [],
      turnoverReasons: this._analyzeTurnoverReasons(analysisData.separations || []),
      createdDate: new Date(),
    };

    if (analysis.startHeadcount > 0) {
      analysis.retentionRate = (
        ((analysis.startHeadcount - analysis.separations) / analysis.startHeadcount) *
        100
      ).toFixed(2);
      analysis.attritionRate = ((analysis.separations / analysis.startHeadcount) * 100).toFixed(2);
    }

    this.retentionAnalysis.push(analysis);
    return analysis;
  }

  _analyzeTurnoverReasons(separations) {
    const reasons = {
      'better-opportunity': 0,
      compensation: 0,
      'career-growth': 0,
      management: 0,
      'work-environment': 0,
      relocation: 0,
      retirement: 0,
      involuntary: 0,
      other: 0,
    };

    // Count reasons from separation records
    return reasons;
  }

  predictAttritionRisk(employeeData) {
    if (!employeeData.employeeId) {
      throw new Error('Missing required field: employeeId');
    }

    const riskFactors = {
      yearsWithCompany: 0,
      performanceRating: 0,
      salaryPercentile: 0,
      promotionHistory: 0,
      skillMarketValue: 0,
    };

    let riskScore = 0;

    // Lower tenure = higher risk
    if ((employeeData.yearsWithCompany || 0) < 2) riskScore += 25;
    else if ((employeeData.yearsWithCompany || 0) < 5) riskScore += 10;

    // Low performance = lower risk (not valuable to market)
    if ((employeeData.performanceRating || 3) < 2.5) riskScore -= 10;
    if ((employeeData.performanceRating || 3) > 4) riskScore += 20;

    // High market value skills = higher risk
    if (employeeData.marketableSkills && employeeData.marketableSkills.length > 3) riskScore += 15;

    // Limited promotion history = higher risk
    if ((employeeData.promotionsInTenure || 0) === 0) riskScore += 20;

    riskScore = Math.max(0, Math.min(100, riskScore));

    return {
      employeeId: employeeData.employeeId,
      riskScore,
      riskLevel: riskScore > 70 ? 'high' : riskScore > 40 ? 'medium' : 'low',
      riskFactors,
      retentionActions: this._suggestRetentionActions(riskScore),
      analyzedDate: new Date(),
    };
  }

  _suggestRetentionActions(riskScore) {
    if (riskScore > 70) {
      return [
        'immediate-conversation',
        'compensation-review',
        'career-planning',
        'advancement-opportunity',
      ];
    }
    if (riskScore > 40) {
      return ['regular-check-in', 'development-plan', 'recognition', 'flexibility-options'];
    }
    return ['standard-engagement'];
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPENSATION & BENEFITS ANALYSIS
  // ═══════════════════════════════════════════════════════════════════════════

  createSalaryBand(bandData) {
    if (!bandData.bandName || !bandData.minSalary || !bandData.maxSalary) {
      throw new Error('Missing required fields: bandName, minSalary, maxSalary');
    }

    const band = {
      id: `SB-${Date.now()}`,
      bandName: bandData.bandName,
      level: bandData.level || 0,
      minSalary: bandData.minSalary,
      midPoint: (bandData.minSalary + bandData.maxSalary) / 2,
      maxSalary: bandData.maxSalary,
      range: bandData.maxSalary - bandData.minSalary,
      currency: bandData.currency || 'USD',
      effectiveDate: new Date(),
      positions: bandData.positions || [],
      employees: [],
    };

    this.salaryBands.push(band);
    return band;
  }

  analyzeCompensation(analysisData) {
    if (!analysisData.department) {
      throw new Error('Missing required field: department');
    }

    const analysis = {
      id: `COMP-${Date.now()}`,
      department: analysisData.department,
      totalPayroll: analysisData.totalPayroll || 0,
      headcount: analysisData.headcount || 0,
      averageSalary: analysisData.headcount
        ? (analysisData.totalPayroll / analysisData.headcount).toFixed(2)
        : 0,
      medianSalary: analysisData.medianSalary || 0,
      internalEquity: analysisData.internalEquity || null,
      externalCompetitiveness: analysisData.externalCompetitiveness || null,
      salaryDistribution: {
        percentile_10: 0,
        percentile_25: 0,
        percentile_50: 0,
        percentile_75: 0,
        percentile_90: 0,
      },
      benefitsCosts: analysisData.benefitsCosts || 0,
      totalCompensation: (analysisData.totalPayroll || 0) + (analysisData.benefitsCosts || 0),
      compaRatio: analysisData.compaRatio || null,
      gender_pay_gap: analysisData.genderPayGap || null,
      createdDate: new Date(),
    };

    this.compensationData.push(analysis);
    return analysis;
  }

  identifyCompensationAdjustments(employeeId, benchmarkData) {
    if (!employeeId || !benchmarkData.marketRate) {
      throw new Error('Missing required fields: employeeId, marketRate');
    }

    return {
      employeeId,
      currentSalary: benchmarkData.currentSalary || 0,
      marketRate: benchmarkData.marketRate,
      gap: benchmarkData.marketRate - (benchmarkData.currentSalary || 0),
      gapPercentage: (
        ((benchmarkData.marketRate - (benchmarkData.currentSalary || 0)) /
          benchmarkData.marketRate) *
        100
      ).toFixed(2),
      recommendedAdjustment:
        benchmarkData.marketRate > (benchmarkData.currentSalary || 0)
          ? Math.ceil(benchmarkData.marketRate * 1.02)
          : benchmarkData.currentSalary,
      justification:
        benchmarkData.marketRate > (benchmarkData.currentSalary || 0)
          ? 'market-competitive'
          : 'above-market',
      priority:
        Math.abs(benchmarkData.marketRate - (benchmarkData.currentSalary || 0)) > 10000
          ? 'high'
          : 'medium',
      effectiveDate: benchmarkData.effectiveDate || new Date(),
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WORKFORCE ANALYTICS & INSIGHTS
  // ═══════════════════════════════════════════════════════════════════════════

  getDepartmentAnalytics(departmentId) {
    if (!departmentId) {
      throw new Error('Missing required field: departmentId');
    }

    const analytics = {
      departmentId,
      timestamp: new Date(),
      overview: {
        headcount: 0,
        fullTimeEquivalent: 0,
        avgTenure: 0,
        turnoverRate: 0,
      },
      demographics: {
        byRole: {},
        byLevel: {},
        byTenure: {},
      },
      compensation: {
        totalPayroll: 0,
        avgSalary: 0,
        medianSalary: 0,
      },
      performance: {
        avgPerformanceScore: 0,
        highPerformers: 0,
        developmentNeeded: 0,
      },
      risks: {
        highTurnoverRoles: [],
        skillGaps: [],
        compensationIssues: [],
      },
      recommendations: this._generateAnalyticsRecommendations(),
    };

    return analytics;
  }

  _generateAnalyticsRecommendations() {
    return [
      'Conduct stay interviews with high performers in critical roles',
      'Review compensation for roles with high turnover',
      'Develop skills training programs for identified gaps',
      'Create succession plans for critical positions',
      'Implement flexible work arrangements',
    ];
  }

  generateWorkforceReport(reportConfig) {
    if (!reportConfig.period) {
      throw new Error('Missing required field: period');
    }

    const report = {
      id: `WFR-${Date.now()}`,
      period: reportConfig.period,
      generatedDate: new Date(),
      generatedBy: reportConfig.generatedBy || 'system',
      executiveSummary: {
        totalHeadcount: 0,
        newHires: 0,
        separations: 0,
        promotions: 0,
        internalMoves: 0,
      },
      keyMetrics: {
        retention_rate: 0,
        promotion_rate: 0,
        internal_hire_rate: 0,
        time_to_fill: 0,
        cost_per_hire: 0,
      },
      departmentBreakdown: {},
      risks: [],
      opportunities: [],
      actionItems: [],
      attachments: [],
    };

    this.workforceReports.push(report);
    return report;
  }

  getWorkforceHealthScore() {
    const now = new Date();
    const metrics = {
      retentionScore: 0,
      engagementScore: 0,
      compensationScore: 0,
      developmentScore: 0,
      diversityScore: 0,
    };

    // Calculate based on recent data
    const recentRetention = this.retentionAnalysis.filter(r => {
      const reportDate = new Date(r.createdDate);
      return (now - reportDate) / (1000 * 60 * 60 * 24) < 90;
    });

    if (recentRetention.length > 0) {
      const avgRetention =
        recentRetention.reduce((sum, r) => sum + parseFloat(r.retentionRate), 0) /
        recentRetention.length;
      metrics.retentionScore = Math.min(100, avgRetention);
    }

    const overallScore =
      (metrics.retentionScore +
        metrics.engagementScore +
        metrics.compensationScore +
        metrics.developmentScore +
        metrics.diversityScore) /
      5;

    return {
      timestamp: now,
      overallHealthScore: overallScore.toFixed(2),
      metrics,
      status: overallScore > 75 ? 'healthy' : overallScore > 50 ? 'at-risk' : 'critical',
      recommendations: this._getHealthRecommendations(overallScore),
    };
  }

  _getHealthRecommendations(score) {
    if (score > 75) return ['Maintain current initiatives', 'Consider advanced analytics'];
    if (score > 50)
      return ['Review retention programs', 'Enhance engagement initiatives', 'Audit compensation'];
    return [
      'Immediate intervention required',
      'Conduct stay interviews',
      'Review compensation strategy',
    ];
  }
}

module.exports = WorkforceAnalyticsService;
