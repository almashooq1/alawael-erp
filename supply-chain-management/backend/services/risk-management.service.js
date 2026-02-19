/**
 * Risk Management & Compliance Service
 * Phase 20: Risk Identification, Assessment, Compliance Tracking, Audit Management
 */

class RiskManagementService {
  constructor() {
    this.risks = [];
    this.mitigations = new Map();
    this.complianceControls = new Map();
    this.auditLogs = [];
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RISK IDENTIFICATION & MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  identifyRisk(riskData) {
    const { name, category, description, owner } = riskData;

    if (!name || !category || !description) {
      throw new Error('Missing required fields: name, category, description');
    }

    const risk = {
      id: `RIS-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      category,
      description,
      owner: owner || 'unassigned',
      status: 'identified',
      likelihood: 3,
      impact: 3,
      riskScore: 9,
      riskLevel: 'medium',
      monitoring: {
        frequency: 'monthly',
        lastReview: new Date(),
        nextReview: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      history: [
        {
          action: 'identified',
          changedBy: riskData.createdBy || 'system',
          changedAt: new Date(),
        },
      ],
      mitigation: null,
      createdAt: new Date(),
    };

    this.risks.push(risk);
    return risk;
  }

  assessRisk(riskId, assessmentData) {
    const risk = this.risks.find(r => r.id === riskId);
    if (!risk) {
      throw new Error('Risk not found');
    }

    let { likelihood, impact } = assessmentData;

    // Clamp values to 1-5 range
    likelihood = Math.max(1, Math.min(5, likelihood || 3));
    impact = Math.max(1, Math.min(5, impact || 3));

    risk.likelihood = likelihood;
    risk.impact = impact;
    risk.riskScore = likelihood * impact;
    risk.status = 'assessed';

    // Determine risk level based on score
    if (risk.riskScore >= 20) {
      risk.riskLevel = 'critical';
    } else if (risk.riskScore >= 12) {
      risk.riskLevel = 'high';
    } else if (risk.riskScore >= 6) {
      risk.riskLevel = 'medium';
    } else if (risk.riskScore >= 3) {
      risk.riskLevel = 'low';
    } else {
      risk.riskLevel = 'minimal';
    }

    risk.history.push({
      action: 'assessed',
      oldValue: { likelihood: 3, impact: 3 },
      newValue: { likelihood, impact },
      changedBy: assessmentData.assessedBy || 'system',
      changedAt: new Date(),
    });

    return {
      id: risk.id,
      likelihood,
      impact,
      riskScore: risk.riskScore,
      riskLevel: risk.riskLevel,
      assessedAt: new Date(),
    };
  }

  getRiskById(riskId) {
    const risk = this.risks.find(r => r.id === riskId);
    if (!risk) {
      throw new Error('Risk not found');
    }
    return risk;
  }

  getAllRisks(filters = {}) {
    let filtered = [...this.risks];

    if (filters.category) {
      filtered = filtered.filter(r => r.category === filters.category);
    }

    if (filters.status) {
      filtered = filtered.filter(r => r.status === filters.status);
    }

    if (filters.minScore !== undefined) {
      filtered = filtered.filter(r => r.riskScore >= filters.minScore);
    }

    return filtered.sort((a, b) => b.riskScore - a.riskScore);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MITIGATION MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  defineMitigation(riskId, mitigationData) {
    const risk = this.getRiskById(riskId);
    const { strategy, owner, description, actions } = mitigationData;

    if (!strategy || !owner) {
      throw new Error('Missing required fields: strategy, owner');
    }

    // Determine priority based on risk level
    let priority;
    if (risk.riskScore >= 20) {
      priority = 'critical';
    } else if (risk.riskScore >= 12) {
      priority = 'high';
    } else if (risk.riskScore >= 6) {
      priority = 'medium';
    } else {
      priority = 'low';
    }

    const mitigation = {
      id: `MIT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      riskId,
      strategy: strategy, // mitigate, avoid, accept, transfer
      description,
      owner,
      actions: actions || [],
      status: 'planned', // planned, in_progress, completed
      priority,
      effectiveness: 0,
      targetDate: mitigationData.targetDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
      completionDate: null,
    };

    this.mitigations.set(mitigation.id, mitigation);
    risk.mitigation = mitigation.id;

    return mitigation;
  }

  updateMitigationStatus(mitigationId, statusData) {
    const mitigation = this.mitigations.get(mitigationId);
    if (!mitigation) {
      throw new Error('Mitigation not found');
    }

    mitigation.status = statusData.status || mitigation.status;
    mitigation.effectiveness = statusData.effectiveness || 0;

    if (statusData.status === 'completed') {
      mitigation.completionDate = new Date();
    }

    return mitigation;
  }

  trackMitigationProgress(mitigationId) {
    const mitigation = this.mitigations.get(mitigationId);
    if (!mitigation) {
      throw new Error('Mitigation not found');
    }

    return {
      id: mitigation.id,
      riskId: mitigation.riskId,
      strategy: mitigation.strategy,
      status: mitigation.status,
      priority: mitigation.priority,
      effectiveness: mitigation.effectiveness,
      targetDate: mitigation.targetDate,
      actions: mitigation.actions,
      completionPercentage: this._calculateMitigationProgress(mitigation),
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPLIANCE MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  defineComplianceControl(controlData) {
    const { name, framework, requirement, owner } = controlData;

    if (!name || !framework) {
      throw new Error('Missing required fields: name, framework');
    }

    const control = {
      id: `CC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      framework,
      requirement: requirement || '',
      owner: owner || 'unassigned',
      status: 'planned', // planned, in_progress, implemented, compliant, non_compliant
      evidenceRequired: controlData.evidenceRequired || [],
      evidenceProvided: [],
      findings: [],
      createdAt: new Date(),
      assessmentSchedule: {
        frequency: controlData.frequency || 'annually',
        lastAssessed: null,
        nextAssessment: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
    };

    this.complianceControls.set(control.id, control);
    return control;
  }

  trackComplianceStatus(controlId) {
    const control = this.complianceControls.get(controlId);
    if (!control) {
      throw new Error('Compliance control not found');
    }

    const evidencePercentage =
      control.evidenceRequired.length > 0
        ? (control.evidenceProvided.length / control.evidenceRequired.length) * 100
        : 0;

    const openFindings = control.findings.filter(f => f.status === 'open').length;
    const totalFindings = control.findings.length;

    return {
      id: controlId,
      name: control.name,
      framework: control.framework,
      status: control.status,
      evidencePercentage: evidencePercentage.toFixed(2),
      openFindings,
      totalFindings,
      nextAssessment: control.assessmentSchedule.nextAssessment,
      owner: control.owner,
    };
  }

  submitComplianceEvidence(controlId, evidenceData) {
    const control = this.complianceControls.get(controlId);
    if (!control) {
      throw new Error('Compliance control not found');
    }

    const evidence = {
      documentId: `DOC-${Date.now()}`,
      documentName: evidenceData.documentName,
      uploadedAt: new Date(),
      uploadedBy: evidenceData.uploadedBy,
    };

    control.evidenceProvided.push(evidence);

    if (control.evidenceProvided.length === control.evidenceRequired.length) {
      control.status = 'implemented';
    }

    return evidence;
  }

  logComplianceFinding(controlId, findingData) {
    const control = this.complianceControls.get(controlId);
    if (!control) {
      throw new Error('Compliance control not found');
    }

    const finding = {
      findingId: `FND-${Date.now()}`,
      severity: findingData.severity || 'medium',
      description: findingData.description,
      remediation: findingData.remediation,
      dueDate: findingData.dueDate,
      status: 'open',
      createdAt: new Date(),
    };

    control.findings.push(finding);
    control.status = 'non_compliant';

    return finding;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // AUDIT MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  createAuditPlan(auditData) {
    const { name, scope, objectives, owner, startDate, endDate } = auditData;

    if (!name || !scope) {
      throw new Error('Missing required fields: name, scope');
    }

    const plan = {
      id: `AUD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      scope,
      objectives: objectives || [],
      owner: owner || 'unassigned',
      status: 'planned', // planned, in_progress, completed
      startDate: startDate || new Date(),
      endDate: endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      findings: [],
      createdAt: new Date(),
    };

    this.auditLogs.push(plan);
    return plan;
  }

  executeAudit(auditId, executionData) {
    const audit = this.auditLogs.find(a => a.id === auditId);
    if (!audit) {
      throw new Error('Audit not found');
    }

    audit.status = 'in_progress';
    audit.executedBy = executionData.executedBy;
    audit.executionNotes = executionData.notes;
    audit.startedAt = new Date();

    return audit;
  }

  documentAuditResult(auditId, result) {
    const audit = this.auditLogs.find(a => a.id === auditId);
    if (!audit) {
      throw new Error('Audit not found');
    }

    audit.status = 'completed';
    audit.findings = result.findings || [];
    audit.conclusion = result.conclusion;
    audit.rating = result.rating; // compliant, partially_compliant, non_compliant
    audit.completedAt = new Date();

    return {
      id: audit.id,
      status: audit.status,
      rating: audit.rating,
      findingsCount: audit.findings.length,
      completedAt: audit.completedAt,
    };
  }

  getAuditReport(auditId) {
    const audit = this.auditLogs.find(a => a.id === auditId);
    if (!audit) {
      throw new Error('Audit not found');
    }

    return {
      id: audit.id,
      name: audit.name,
      scope: audit.scope,
      status: audit.status,
      owner: audit.owner,
      startDate: audit.startDate,
      endDate: audit.endDate,
      completedAt: audit.completedAt,
      findings: audit.findings,
      rating: audit.rating,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // REPORTING
  // ═══════════════════════════════════════════════════════════════════════════

  generateRiskReport(filters = {}) {
    const risks = this.getAllRisks(filters);

    const byCategory = {};
    const byLevel = { critical: 0, high: 0, medium: 0, low: 0, minimal: 0 };
    const byStatus = {};

    risks.forEach(risk => {
      byCategory[risk.category] = (byCategory[risk.category] || 0) + 1;
      byLevel[risk.riskLevel]++;
      byStatus[risk.status] = (byStatus[risk.status] || 0) + 1;
    });

    const avgScore =
      risks.length > 0
        ? (risks.reduce((sum, r) => sum + r.riskScore, 0) / risks.length).toFixed(2)
        : 0;

    return {
      totalRisks: risks.length,
      avgRiskScore: avgScore,
      byCategory,
      byLevel,
      byStatus,
      topRisks: risks.slice(0, 5),
      reportGeneratedAt: new Date(),
    };
  }

  trackRiskTrends(timeframe) {
    // TODO: Implement trend tracking over time
    return this.generateRiskReport();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPER METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  _calculateMitigationProgress(mitigation) {
    const completedActions = mitigation.actions.filter(a => a.completed).length;
    return mitigation.actions.length > 0 ? (completedActions / mitigation.actions.length) * 100 : 0;
  }

  validateComplianceFramework(framework) {
    const validFrameworks = ['ISO27001', 'GDPR', 'HIPAA', 'PCI-DSS', 'SOX'];
    return validFrameworks.includes(framework);
  }
}

module.exports = RiskManagementService;
