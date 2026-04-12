/* eslint-disable no-unused-vars */
/**
 * ALAWAEL ERP - PHASE 21: WORKFORCE ANALYTICS & PLANNING SYSTEM
 * ──────────────────────────────────────────────────────────────
 * PROXY — delegates to the canonical DB-backed service at:
 *   backend/services/dddWorkforceAnalytics.js
 *
 * Kept for backward compatibility with workforce-analytics.routes.js.
 * The canonical service uses Mongoose models and persists to MongoDB.
 */

const canonical = require('./dddWorkforceAnalytics');

class WorkforceAnalyticsService {
  /* ── Delegated methods (DB-backed) ── */
  async healthCheck() {
    return canonical.healthCheck();
  }
  async createSnapshot(d, uid) {
    return canonical.createSnapshot(d, uid);
  }
  async listSnapshots(f, p, l) {
    return canonical.listSnapshots(f, p, l);
  }
  async getSnapshotById(id) {
    return canonical.getSnapshotById(id);
  }
  async createStaffProfile(d, u) {
    return canonical.createStaffProfile(d, u);
  }
  async listStaffProfiles(f, p, l) {
    return canonical.listStaffProfiles(f, p, l);
  }
  async getStaffProfileById(id) {
    return canonical.getStaffProfileById(id);
  }
  async updateStaffProfile(id, d, u) {
    return canonical.updateStaffProfile(id, d, u);
  }
  async deleteStaffProfile(id) {
    return canonical.deleteStaffProfile(id);
  }
  async createWorkloadEntry(d, u) {
    return canonical.createWorkloadEntry(d, u);
  }
  async listWorkloadEntries(f, p, l) {
    return canonical.listWorkloadEntries(f, p, l);
  }
  async createKPIRecord(d, u) {
    return canonical.createKPIRecord(d, u);
  }
  async listKPIRecords(f, p, l) {
    return canonical.listKPIRecords(f, p, l);
  }
  async getKPIDashboard(dept) {
    return canonical.getKPIDashboard(dept);
  }
  getKPITemplates() {
    return canonical.getKPITemplates();
  }
  async getDepartmentSummary(d) {
    return canonical.getDepartmentSummary(d);
  }
  async getWorkloadDistribution() {
    return canonical.getWorkloadDistribution();
  }
  async getTurnoverTrend(d, m) {
    return canonical.getTurnoverTrend(d, m);
  }
  async getOvertimeAnalysis() {
    return canonical.getOvertimeAnalysis();
  }
  async predictAttritionRisk(id) {
    return canonical.predictAttritionRisk(id);
  }

  /* ── Phase 21 legacy methods (kept for route compat) ── */
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
      status: 'draft',
      approvalStatus: 'pending',
      createdDate: new Date(),
      quarterlyBreakdown: {
        Q1: Math.floor(planData.targetHeadcount * 0.23),
        Q2: Math.floor(planData.targetHeadcount * 0.24),
        Q3: Math.floor(planData.targetHeadcount * 0.25),
        Q4: Math.floor(planData.targetHeadcount * 0.28),
      },
    };
    if (!this._headcountPlans) this._headcountPlans = [];
    this._headcountPlans.push(plan);
    return plan;
  }
  get headcountPlans() {
    return this._headcountPlans || [];
  }

  approveHeadcountPlan(planId, approverData) {
    const plan = (this._headcountPlans || []).find(p => p.id === planId);
    if (!plan) throw new Error('Plan not found');
    plan.approvalStatus = approverData.status;
    plan.approvedDate = new Date();
    if (approverData.status === 'approved') plan.status = 'approved';
    return plan;
  }

  createForecast(forecastData) {
    if (!forecastData.metric || !forecastData.department || !forecastData.period) {
      throw new Error('Missing required fields: metric, department, period');
    }
    const forecast = {
      id: `FC-${Date.now()}`,
      metric: forecastData.metric,
      department: forecastData.department,
      period: forecastData.period,
      predictedValue: forecastData.predictedValue || null,
      methodology: forecastData.methodology || 'trend-analysis',
      createdDate: new Date(),
      accuracy: null,
    };
    if (!this._forecasts) this._forecasts = [];
    this._forecasts.push(forecast);
    return forecast;
  }
  get forecasts() {
    return this._forecasts || [];
  }

  updateForecastAccuracy(forecastId, accuracyData) {
    const forecast = (this._forecasts || []).find(f => f.id === forecastId);
    if (!forecast) throw new Error('Forecast not found');
    const error = Math.abs(accuracyData.actualValue - forecast.predictedValue);
    forecast.accuracy = {
      actualValue: accuracyData.actualValue,
      error,
      MAPE: ((error / accuracyData.actualValue) * 100).toFixed(2),
      evaluatedDate: new Date(),
    };
    return forecast;
  }

  createSuccessionPlan(planData) {
    if (!planData.positionId || !planData.currentHolder || !planData.criticalityLevel) {
      throw new Error('Missing required fields: positionId, currentHolder, criticalityLevel');
    }
    const plan = {
      id: `SUC-${Date.now()}`,
      positionId: planData.positionId,
      currentHolder: planData.currentHolder,
      criticalityLevel: planData.criticalityLevel,
      successors: planData.successors || [],
      status: 'active',
      createdDate: new Date(),
    };
    if (!this._successionPlans) this._successionPlans = [];
    this._successionPlans.push(plan);
    return plan;
  }
  get successionPlans() {
    return this._successionPlans || [];
  }

  addSuccessor(planId, successorData) {
    const plan = (this._successionPlans || []).find(p => p.id === planId);
    if (!plan) throw new Error('Succession plan not found');
    const successor = {
      employeeId: successorData.employeeId,
      name: successorData.name,
      readinessLevel: successorData.readinessLevel,
      addedDate: new Date(),
    };
    plan.successors.push(successor);
    return successor;
  }

  createSkillMapping(mappingData) {
    if (!mappingData.employeeId || !mappingData.department) {
      throw new Error('Missing required fields: employeeId, department');
    }
    return { id: `SKL-${Date.now()}`, ...mappingData, createdDate: new Date() };
  }

  updateSkillProficiency(skillMappingId, skillUpdate) {
    return { id: skillMappingId, ...skillUpdate, lastUpdated: new Date() };
  }

  analyzeRetention(analysisData) {
    if (!analysisData.department || !analysisData.period) {
      throw new Error('Missing required fields: department, period');
    }
    const analysis = {
      id: `RET-${Date.now()}`,
      department: analysisData.department,
      period: analysisData.period,
      retentionRate:
        analysisData.startHeadcount > 0
          ? (
              ((analysisData.startHeadcount - (analysisData.separations || 0)) /
                analysisData.startHeadcount) *
              100
            ).toFixed(2)
          : 0,
      createdDate: new Date(),
    };
    return analysis;
  }

  predictAttritionRiskLegacy(employeeData) {
    if (!employeeData.employeeId) throw new Error('Missing required field: employeeId');
    let riskScore = 0;
    if ((employeeData.yearsWithCompany || 0) < 2) riskScore += 25;
    if ((employeeData.performanceRating || 3) > 4) riskScore += 20;
    riskScore = Math.max(0, Math.min(100, riskScore));
    return {
      employeeId: employeeData.employeeId,
      riskScore,
      riskLevel: riskScore > 70 ? 'high' : riskScore > 40 ? 'medium' : 'low',
      analyzedDate: new Date(),
    };
  }

  createSalaryBand(bandData) {
    if (!bandData.bandName || !bandData.minSalary || !bandData.maxSalary) {
      throw new Error('Missing required fields: bandName, minSalary, maxSalary');
    }
    const band = {
      id: `SB-${Date.now()}`,
      bandName: bandData.bandName,
      minSalary: bandData.minSalary,
      midPoint: (bandData.minSalary + bandData.maxSalary) / 2,
      maxSalary: bandData.maxSalary,
      effectiveDate: new Date(),
    };
    if (!this._salaryBands) this._salaryBands = [];
    this._salaryBands.push(band);
    return band;
  }
  get salaryBands() {
    return this._salaryBands || [];
  }

  analyzeCompensation(analysisData) {
    if (!analysisData.department) throw new Error('Missing required field: department');
    return {
      id: `COMP-${Date.now()}`,
      department: analysisData.department,
      averageSalary: analysisData.headcount
        ? (analysisData.totalPayroll / analysisData.headcount).toFixed(2)
        : 0,
      createdDate: new Date(),
    };
  }

  identifyCompensationAdjustments(employeeId, benchmarkData) {
    if (!employeeId || !benchmarkData.marketRate) {
      throw new Error('Missing required fields: employeeId, marketRate');
    }
    return {
      employeeId,
      gap: benchmarkData.marketRate - (benchmarkData.currentSalary || 0),
      priority:
        Math.abs(benchmarkData.marketRate - (benchmarkData.currentSalary || 0)) > 10000
          ? 'high'
          : 'medium',
    };
  }

  getDepartmentAnalytics(departmentId) {
    return { departmentId, timestamp: new Date(), overview: { headcount: 0 } };
  }

  generateWorkforceReport(reportConfig) {
    if (!reportConfig.period) throw new Error('Missing required field: period');
    return { id: `WFR-${Date.now()}`, period: reportConfig.period, generatedDate: new Date() };
  }

  getWorkforceHealthScore() {
    return { overallHealthScore: 0, status: 'no-data', timestamp: new Date() };
  }
}

module.exports = WorkforceAnalyticsService;
