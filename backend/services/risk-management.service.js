/**
 * ALAWAEL ERP - PHASE 20: RISK MANAGEMENT & COMPLIANCE SYSTEM
 * Enterprise risk assessment, compliance tracking, audit management, mitigation strategies
 */

class RiskManagementService {
  constructor() {
    // Risk tracking
    this.risks = [];
    this.riskAssessments = [];
    this.riskMatrices = [];
    this.mitigationStrategies = [];
    this.riskIdCounter = 0;

    // Compliance
    this.complianceChecks = [];
    this.complianceFrameworks = [];
    this.violations = [];
    this.corrections = [];

    // Audit & controls
    this.internalControls = [];
    this.controlTests = [];
    this.auditLogs = [];
    this.incidentReports = [];

    // Reporting
    this.riskReports = [];
    this.complianceReports = [];
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RISK IDENTIFICATION & ASSESSMENT
  // ═══════════════════════════════════════════════════════════════════════════

  identifyRisk(riskData) {
    if (!riskData.name || !riskData.category || !riskData.description) {
      throw new Error('Missing required fields: name, category, description');
    }

    this.riskIdCounter++;
    const risk = {
      id: `RIS-${this.riskIdCounter}`,
      name: riskData.name,
      category: riskData.category, // operational, financial, compliance, strategic, reputational
      description: riskData.description,
      identifiedBy: riskData.identifiedBy || 'system',
      identifiedDate: new Date(),
      status: 'identified',
      owner: riskData.owner || null,
      source: riskData.source || 'internal',
      likelihood: null,
      impact: null,
      riskScore: null,
      mitigation: null,
      monitoring: {
        frequency: riskData.monitoringFrequency || 'monthly',
        lastReview: new Date(),
        nextReview: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      history: [],
    };

    this.risks.push(risk);
    return risk;
  }

  assessRisk(riskId, assessmentData) {
    if (!riskId || assessmentData.likelihood === undefined || assessmentData.impact === undefined) {
      throw new Error('Missing required fields: riskId, likelihood, impact');
    }

    const risk = this.risks.find(r => r.id === riskId);
    if (!risk) throw new Error('Risk not found');

    // Likelihood: 1-5 scale
    // Impact: 1-5 scale
    const likelihood = Math.min(5, Math.max(1, assessmentData.likelihood));
    const impact = Math.min(5, Math.max(1, assessmentData.impact));
    const riskScore = likelihood * impact;

    risk.likelihood = likelihood;
    risk.impact = impact;
    risk.riskScore = riskScore;
    risk.riskLevel = this._calculateRiskLevel(riskScore);

    const assessment = {
      id: `ASS-${Date.now()}`,
      riskId,
      likelihood,
      impact,
      riskScore,
      riskLevel: risk.riskLevel,
      assessedBy: assessmentData.assessedBy || 'system',
      assessmentDate: new Date(),
      assumptions: assessmentData.assumptions || [],
      constraints: assessmentData.constraints || [],
      notes: assessmentData.notes || '',
    };

    this.riskAssessments.push(assessment);
    risk.history.push({
      action: 'assessed',
      timestamp: new Date(),
      details: assessment,
    });

    return assessment;
  }

  getRiskInfo(riskId) {
    const risk = this.risks.find(r => r.id === riskId);
    return risk || null;
  }

  _calculateRiskLevel(score) {
    if (score <= 5) return 'low';
    if (score <= 10) return 'medium';
    if (score <= 15) return 'high';
    return 'critical';
  }

  defineMitigation(riskId, mitigationData) {
    if (!riskId || !mitigationData.strategy || !mitigationData.owner) {
      throw new Error('Missing required fields: riskId, strategy, owner');
    }

    const risk = this.risks.find(r => r.id === riskId);
    if (!risk) throw new Error('Risk not found');

    const mitigation = {
      id: `MIT-${Date.now()}`,
      riskId,
      strategy: mitigationData.strategy, // avoid, mitigate, transfer, accept
      description: mitigationData.description || '',
      owner: mitigationData.owner,
      status: 'planned',
      priority: this._calculatePriority(risk.riskScore),
      targetDate: mitigationData.targetDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      actions: mitigationData.actions || [],
      cost: mitigationData.cost || null,
      effectiveness: null,
      createdDate: new Date(),
      completionDate: null,
    };

    this.mitigationStrategies.push(mitigation);
    risk.mitigation = mitigation.id;

    return mitigation;
  }

  _calculatePriority(riskScore) {
    if (riskScore >= 15) return 'critical';
    if (riskScore >= 10) return 'high';
    if (riskScore >= 5) return 'medium';
    return 'low';
  }

  updateMitigationStatus(mitigationId, statusUpdate) {
    const mitigation = this.mitigationStrategies.find(m => m.id === mitigationId);
    if (!mitigation) throw new Error('Mitigation not found');

    mitigation.status = statusUpdate.status;

    if (statusUpdate.status === 'completed') {
      mitigation.completionDate = new Date();
      mitigation.effectiveness = statusUpdate.effectiveness || null;
    }

    return mitigation;
  }

  getRiskMatrix(department) {
    const filteredRisks = department ? this.risks.filter(r => r.owner === department) : this.risks;

    const matrix = {
      id: `MATRIX-${Date.now()}`,
      department,
      totalRisks: filteredRisks.length,
      byLevel: {
        critical: filteredRisks.filter(r => r.riskLevel === 'critical').length,
        high: filteredRisks.filter(r => r.riskLevel === 'high').length,
        medium: filteredRisks.filter(r => r.riskLevel === 'medium').length,
        low: filteredRisks.filter(r => r.riskLevel === 'low').length,
      },
      byCategory: {},
      averageRiskScore:
        filteredRisks.length > 0
          ? (
              filteredRisks.reduce((sum, r) => sum + (r.riskScore || 0), 0) / filteredRisks.length
            ).toFixed(2)
          : 0,
      mitigatedCount: filteredRisks.filter(r => r.mitigation).length,
    };

    filteredRisks.forEach(r => {
      matrix.byCategory[r.category] = (matrix.byCategory[r.category] || 0) + 1;
    });

    return matrix;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPLIANCE MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  registerComplianceFramework(frameworkData) {
    if (!frameworkData.name || !frameworkData.requirements) {
      throw new Error('Missing required fields: name, requirements');
    }

    const framework = {
      id: `FRAME-${Date.now()}`,
      name: frameworkData.name,
      type: frameworkData.type || 'regulatory', // regulatory, industry, internal
      description: frameworkData.description || '',
      requirements: frameworkData.requirements,
      applicableAreas: frameworkData.applicableAreas || [],
      owner: frameworkData.owner || null,
      implementationDate: new Date(),
      status: 'active',
      complianceChecks: [],
    };

    this.complianceFrameworks.push(framework);
    return framework;
  }

  conductComplianceCheck(checkData) {
    if (!checkData.frameworkId || !checkData.area || !checkData.assessor) {
      throw new Error('Missing required fields: frameworkId, area, assessor');
    }

    const framework = this.complianceFrameworks.find(f => f.id === checkData.frameworkId);
    if (!framework) throw new Error('Framework not found');

    const check = {
      id: `CHECK-${Date.now()}`,
      frameworkId: checkData.frameworkId,
      area: checkData.area,
      requirements: checkData.requirements || framework.requirements,
      complianceStatus: checkData.complianceStatus || 'pending', // compliant, non-compliant, partial
      findings: checkData.findings || [],
      assessor: checkData.assessor,
      checkDate: new Date(),
      remediation: null,
      followUpDate: null,
    };

    this.complianceChecks.push(check);
    framework.complianceChecks.push(check.id);

    return check;
  }

  reportViolation(violationData) {
    if (!violationData.frameworkId || !violationData.description || !violationData.severity) {
      throw new Error('Missing required fields: frameworkId, description, severity');
    }

    const violation = {
      id: `VIO-${Date.now()}`,
      frameworkId: violationData.frameworkId,
      description: violationData.description,
      severity: violationData.severity, // minor, major, critical
      reportedDate: new Date(),
      reportedBy: violationData.reportedBy || 'system',
      status: 'open',
      root_cause: null,
      correctiveAction: null,
      targetResolutionDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      resolvedDate: null,
      evidenceLinks: violationData.evidenceLinks || [],
    };

    this.violations.push(violation);
    return violation;
  }

  closeViolation(violationId, resolutionData) {
    const violation = this.violations.find(v => v.id === violationId);
    if (!violation) throw new Error('Violation not found');

    violation.status = 'resolved';
    violation.resolvedDate = new Date();
    violation.root_cause = resolutionData.root_cause || null;
    violation.correctiveAction = resolutionData.correctiveAction || null;

    return violation;
  }

  getComplianceStatus(frameworkId) {
    const checks = this.complianceChecks.filter(c => c.frameworkId === frameworkId);
    const violations = this.violations.filter(v => v.frameworkId === frameworkId);

    const totalChecks = checks.length;
    const compliantChecks = checks.filter(c => c.complianceStatus === 'compliant').length;
    const openViolations = violations.filter(v => v.status === 'open').length;

    return {
      frameworkId,
      totalChecks,
      compliantChecks,
      complianceRate: totalChecks > 0 ? ((compliantChecks / totalChecks) * 100).toFixed(2) : 0,
      openViolations,
      violationsByStatus: {
        open: violations.filter(v => v.status === 'open').length,
        resolved: violations.filter(v => v.status === 'resolved').length,
      },
      trend: this._analyzeComplianceTrend(checks),
    };
  }

  _analyzeComplianceTrend(checks) {
    if (checks.length < 2) return 'insufficient-data';
    const recent = checks.slice(-5);
    const older = checks.slice(0, checks.length - 5);

    const recentCompliant =
      recent.filter(c => c.complianceStatus === 'compliant').length / recent.length;
    const olderCompliant =
      older.length > 0
        ? older.filter(c => c.complianceStatus === 'compliant').length / older.length
        : 0;

    if (recentCompliant > olderCompliant) return 'improving';
    if (recentCompliant < olderCompliant) return 'declining';
    return 'stable';
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INTERNAL CONTROLS & TESTING
  // ═══════════════════════════════════════════════════════════════════════════

  defineControl(controlData) {
    if (!controlData.name || !controlData.objective || !controlData.owner) {
      throw new Error('Missing required fields: name, objective, owner');
    }

    const control = {
      id: `CTL-${Date.now()}`,
      name: controlData.name,
      objective: controlData.objective,
      type: controlData.type || 'detective', // preventive, detective, corrective
      owner: controlData.owner,
      frequency: controlData.frequency || 'monthly',
      effectiveness: null,
      status: 'active',
      lastTestedDate: null,
      testResults: [],
      documentationLinks: controlData.documentationLinks || [],
      createdDate: new Date(),
    };

    this.internalControls.push(control);
    return control;
  }

  testControl(controlId, testData) {
    if (!controlId || testData.testResult === undefined) {
      throw new Error('Missing required fields: controlId, testResult');
    }

    const control = this.internalControls.find(c => c.id === controlId);
    if (!control) throw new Error('Control not found');

    const test = {
      id: `TEST-${Date.now()}`,
      controlId,
      testDate: new Date(),
      testedBy: testData.testedBy || 'system',
      testResult: testData.testResult, // pass, fail, partial
      observations: testData.observations || '',
      remediation: null,
      evidence: testData.evidence || [],
    };

    control.testResults.push(test);
    control.lastTestedDate = new Date();
    control.effectiveness = this._calculateControlEffectiveness(control.testResults);

    this.controlTests.push(test);
    return test;
  }

  _calculateControlEffectiveness(testResults) {
    if (testResults.length === 0) return null;
    const passedTests = testResults.filter(t => t.testResult === 'pass').length;
    return ((passedTests / testResults.length) * 100).toFixed(2);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INCIDENT & ISSUE MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  reportIncident(incidentData) {
    if (!incidentData.title || !incidentData.description || !incidentData.severity) {
      throw new Error('Missing required fields: title, description, severity');
    }

    const incident = {
      id: `INC-${Date.now()}`,
      title: incidentData.title,
      description: incidentData.description,
      severity: incidentData.severity, // low, medium, high, critical
      type: incidentData.type || 'operational', // operational, security, compliance, financial
      reportedDate: new Date(),
      reportedBy: incidentData.reportedBy || 'system',
      status: 'open',
      investigation: null,
      rootCause: null,
      remediation: null,
      closedDate: null,
      impactAssessment: incidentData.impactAssessment || {},
      escalationHistory: [],
    };

    this.incidentReports.push(incident);
    return incident;
  }

  updateIncidentStatus(incidentId, statusUpdate) {
    const incident = this.incidentReports.find(i => i.id === incidentId);
    if (!incident) throw new Error('Incident not found');

    incident.status = statusUpdate.status;
    incident.investigation = statusUpdate.investigation || null;
    incident.rootCause = statusUpdate.rootCause || null;
    incident.remediation = statusUpdate.remediation || null;

    if (statusUpdate.status === 'closed') {
      incident.closedDate = new Date();
    }

    return incident;
  }

  escalateIncident(incidentId, escalationData) {
    const incident = this.incidentReports.find(i => i.id === incidentId);
    if (!incident) throw new Error('Incident not found');

    const escalation = {
      escalatedAt: new Date(),
      escalatedTo: escalationData.escalatedTo,
      reason: escalationData.reason,
      priority: escalationData.priority || 'high',
    };

    incident.escalationHistory.push(escalation);
    return escalation;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // REPORTING & ANALYTICS
  // ═══════════════════════════════════════════════════════════════════════════

  generateRiskReport(reportConfig) {
    if (!reportConfig.period) {
      throw new Error('Missing required field: period');
    }

    const report = {
      id: `RISK-RPT-${Date.now()}`,
      period: reportConfig.period,
      generatedDate: new Date(),
      generatedBy: reportConfig.generatedBy || 'system',
      summary: {
        totalRisks: this.risks.length,
        byLevel: {
          critical: this.risks.filter(r => r.riskLevel === 'critical').length,
          high: this.risks.filter(r => r.riskLevel === 'high').length,
          medium: this.risks.filter(r => r.riskLevel === 'medium').length,
          low: this.risks.filter(r => r.riskLevel === 'low').length,
        },
        mitigatedCount: this.risks.filter(r => r.mitigation).length,
        averageRiskScore:
          this.risks.length > 0
            ? (
                this.risks.reduce((sum, r) => sum + (r.riskScore || 0), 0) / this.risks.length
              ).toFixed(2)
            : 0,
      },
      risksByCategory: {},
      topRisks: [],
      mitigationStatus: this._getMitigationStatus(),
      recommendations: this._generateRecommendations(),
    };

    this.risks.forEach(r => {
      report.risksByCategory[r.category] = (report.risksByCategory[r.category] || 0) + 1;
    });

    report.topRisks = this.risks
      .sort((a, b) => (b.riskScore || 0) - (a.riskScore || 0))
      .slice(0, 10);

    this.riskReports.push(report);
    return report;
  }

  _getMitigationStatus() {
    return {
      total: this.mitigationStrategies.length,
      planned: this.mitigationStrategies.filter(m => m.status === 'planned').length,
      inProgress: this.mitigationStrategies.filter(m => m.status === 'in-progress').length,
      completed: this.mitigationStrategies.filter(m => m.status === 'completed').length,
    };
  }

  _generateRecommendations() {
    const recommendations = [];
    const criticalRisks = this.risks.filter(r => r.riskLevel === 'critical');

    if (criticalRisks.length > 0) {
      recommendations.push({
        priority: 'critical',
        recommendation: `Address ${criticalRisks.length} critical risks immediately`,
        details: criticalRisks.map(r => r.name),
      });
    }

    const unmitigatedHigh = this.risks.filter(r => r.riskLevel === 'high' && !r.mitigation);
    if (unmitigatedHigh.length > 0) {
      recommendations.push({
        priority: 'high',
        recommendation: `Define mitigation for ${unmitigatedHigh.length} high-risk items`,
        details: unmitigatedHigh.map(r => r.name),
      });
    }

    return recommendations;
  }

  generateComplianceReport(reportConfig) {
    if (!reportConfig.frameworkId) {
      throw new Error('Missing required field: frameworkId');
    }

    const framework = this.complianceFrameworks.find(f => f.id === reportConfig.frameworkId);
    if (!framework) throw new Error('Framework not found');

    const report = {
      id: `COMP-RPT-${Date.now()}`,
      frameworkId: reportConfig.frameworkId,
      frameworkName: framework.name,
      reportDate: new Date(),
      generatedBy: reportConfig.generatedBy || 'system',
      complianceStatus: this.getComplianceStatus(reportConfig.frameworkId),
      checks: this.complianceChecks.filter(c => c.frameworkId === reportConfig.frameworkId),
      violations: this.violations.filter(v => v.frameworkId === reportConfig.frameworkId),
      openIssues: this.violations.filter(
        v => v.frameworkId === reportConfig.frameworkId && v.status === 'open'
      ).length,
      recommendations: [],
    };

    if (report.complianceStatus.openViolations > 0) {
      report.recommendations.push({
        priority: 'high',
        recommendation: `Resolve ${report.complianceStatus.openViolations} open violations`,
      });
    }

    if (report.complianceStatus.complianceRate < 100) {
      report.recommendations.push({
        priority: 'medium',
        recommendation: `Improve compliance rate from ${report.complianceStatus.complianceRate}% to 100%`,
      });
    }

    this.complianceReports.push(report);
    return report;
  }

  getRiskDashboardData() {
    const now = new Date();
    const pastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const recentIncidents = this.incidentReports.filter(i => new Date(i.reportedDate) >= pastMonth);

    return {
      timestamp: now,
      summary: {
        totalRisks: this.risks.length,
        criticalRisks: this.risks.filter(r => r.riskLevel === 'critical').length,
        highRisks: this.risks.filter(r => r.riskLevel === 'high').length,
        mitigatedRisks: this.risks.filter(r => r.mitigation).length,
        complianceFrameworks: this.complianceFrameworks.length,
        openViolations: this.violations.filter(v => v.status === 'open').length,
        recentIncidents: recentIncidents.length,
      },
      riskTrend: this._calculateRiskTrend(),
      complianceTrend: this._calculateOverallComplianceTrend(),
      topIncidents: recentIncidents
        .sort((a, b) => {
          const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
          return severityOrder[a.severity] - severityOrder[b.severity];
        })
        .slice(0, 5),
    };
  }

  _calculateRiskTrend() {
    if (this.riskAssessments.length < 2) return 'insufficient-data';
    const recentAssessments = this.riskAssessments.slice(-10);
    const olderAssessments = this.riskAssessments.slice(
      0,
      Math.max(1, this.riskAssessments.length - 10)
    );

    const recentAvg =
      recentAssessments.reduce((sum, a) => sum + a.riskScore, 0) / recentAssessments.length;
    const olderAvg =
      olderAssessments.reduce((sum, a) => sum + a.riskScore, 0) / olderAssessments.length;

    if (recentAvg > olderAvg) return 'increasing';
    if (recentAvg < olderAvg) return 'decreasing';
    return 'stable';
  }

  _calculateOverallComplianceTrend() {
    const compliantChecks = this.complianceChecks.filter(
      c => c.complianceStatus === 'compliant'
    ).length;
    const totalChecks = this.complianceChecks.length;
    return totalChecks > 0 ? ((compliantChecks / totalChecks) * 100).toFixed(2) : 0;
  }
}

module.exports = RiskManagementService;
