/**
 * ALAWAEL ERP - PHASE 20: RISK MANAGEMENT & COMPLIANCE TEST SUITE
 * Comprehensive testing of risk identification, compliance tracking, and audit management
 */

const RiskManagementService = require('../services/risk-management.service');

describe('Risk Management & Compliance System', () => {
  let service;

  beforeEach(() => {
    service = new RiskManagementService();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RISK IDENTIFICATION & ASSESSMENT TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Risk Identification', () => {
    test('should identify a new risk with required fields', () => {
      const riskData = {
        name: 'Data Breach Risk',
        category: 'operational',
        description: 'Potential cybersecurity threat',
        owner: 'IT Department',
      };

      const risk = service.identifyRisk(riskData);

      expect(risk).toBeDefined();
      expect(risk.id).toMatch(/^RIS-/);
      expect(risk.name).toBe('Data Breach Risk');
      expect(risk.category).toBe('operational');
      expect(risk.status).toBe('identified');
    });

    test('should throw error for missing required fields', () => {
      expect(() => service.identifyRisk({ name: 'Test' })).toThrow('Missing required fields');
    });

    test('should set default monitoring frequency', () => {
      const risk = service.identifyRisk({
        name: 'Test Risk',
        category: 'operational',
        description: 'Test',
      });

      expect(risk.monitoring.frequency).toBe('monthly');
      expect(risk.monitoring.lastReview).toBeDefined();
      expect(risk.monitoring.nextReview).toBeDefined();
    });

    test('should track identified risk in system', () => {
      service.identifyRisk({
        name: 'Market Risk',
        category: 'financial',
        description: 'Price volatility',
      });

      expect(service.risks.length).toBe(1);
    });

    test('should handle multiple risk identifications', () => {
      service.identifyRisk({
        name: 'Risk 1',
        category: 'operational',
        description: 'Test 1',
      });
      service.identifyRisk({
        name: 'Risk 2',
        category: 'compliance',
        description: 'Test 2',
      });

      expect(service.risks.length).toBe(2);
    });
  });

  describe('Risk Assessment', () => {
    test('should assess risk with likelihood and impact', () => {
      const risk = service.identifyRisk({
        name: 'Operational Risk',
        category: 'operational',
        description: 'System downtime',
      });

      const assessment = service.assessRisk(risk.id, {
        likelihood: 3,
        impact: 4,
        assessedBy: 'Risk Manager',
      });

      expect(assessment).toBeDefined();
      expect(assessment.likelihood).toBe(3);
      expect(assessment.impact).toBe(4);
      expect(assessment.riskScore).toBe(12);
    });

    test('should calculate risk level correctly', () => {
      const risk = service.identifyRisk({
        name: 'Test',
        category: 'operational',
        description: 'Test',
      });

      // Low risk (score 4)
      service.assessRisk(risk.id, { likelihood: 1, impact: 4 });
      expect(risk.riskLevel).toBe('low');
    });

    test('should classify high risk (score 12)', () => {
      const risk = service.identifyRisk({
        name: 'Test',
        category: 'operational',
        description: 'Test',
      });

      service.assessRisk(risk.id, { likelihood: 3, impact: 4 });
      expect(risk.riskLevel).toBe('high');
    });

    test('should classify critical risk (score 25)', () => {
      const risk = service.identifyRisk({
        name: 'Test',
        category: 'operational',
        description: 'Test',
      });

      service.assessRisk(risk.id, { likelihood: 5, impact: 5 });
      expect(risk.riskLevel).toBe('critical');
    });

    test('should throw error for non-existent risk', () => {
      expect(() => service.assessRisk('NON-EXISTENT', { likelihood: 3, impact: 4 })).toThrow(
        'Risk not found'
      );
    });

    test('should validate likelihood and impact ranges', () => {
      const risk = service.identifyRisk({
        name: 'Test',
        category: 'operational',
        description: 'Test',
      });

      service.assessRisk(risk.id, { likelihood: 10, impact: 10 });
      expect(risk.likelihood).toBeLessThanOrEqual(5);
      expect(risk.impact).toBeLessThanOrEqual(5);
    });

    test('should track assessment history', () => {
      const risk = service.identifyRisk({
        name: 'Test',
        category: 'operational',
        description: 'Test',
      });

      service.assessRisk(risk.id, { likelihood: 2, impact: 3 });
      expect(risk.history.length).toBe(1);
      expect(risk.history[0].action).toBe('assessed');
    });
  });

  describe('Mitigation Management', () => {
    test('should define mitigation strategy for risk', () => {
      const risk = service.identifyRisk({
        name: 'Test Risk',
        category: 'operational',
        description: 'Test',
      });
      service.assessRisk(risk.id, { likelihood: 4, impact: 4 });

      const mitigation = service.defineMitigation(risk.id, {
        strategy: 'mitigate',
        description: 'Implement protective measures',
        owner: 'Operations',
        actions: ['Install backup system', 'Train staff'],
      });

      expect(mitigation).toBeDefined();
      expect(mitigation.id).toMatch(/^MIT-/);
      expect(mitigation.strategy).toBe('mitigate');
      expect(mitigation.status).toBe('planned');
    });

    test('should calculate priority based on risk score', () => {
      const risk = service.identifyRisk({
        name: 'Test',
        category: 'operational',
        description: 'Test',
      });
      service.assessRisk(risk.id, { likelihood: 5, impact: 5 }); // Critical

      const mitigation = service.defineMitigation(risk.id, {
        strategy: 'mitigate',
        owner: 'Team',
      });

      expect(mitigation.priority).toBe('critical');
    });

    test('should update mitigation status', () => {
      const risk = service.identifyRisk({
        name: 'Test',
        category: 'operational',
        description: 'Test',
      });

      const mitigation = service.defineMitigation(risk.id, {
        strategy: 'mitigate',
        owner: 'Team',
      });

      const updated = service.updateMitigationStatus(mitigation.id, {
        status: 'completed',
        effectiveness: 85,
      });

      expect(updated.status).toBe('completed');
      expect(updated.completionDate).toBeDefined();
      expect(updated.effectiveness).toBe(85);
    });

    test('should link mitigation to risk', () => {
      const risk = service.identifyRisk({
        name: 'Test',
        category: 'operational',
        description: 'Test',
      });

      const mitigation = service.defineMitigation(risk.id, {
        strategy: 'mitigate',
        owner: 'Team',
      });

      expect(risk.mitigation).toBe(mitigation.id);
    });

    test('should throw error for missing mitigation data', () => {
      const risk = service.identifyRisk({
        name: 'Test',
        category: 'operational',
        description: 'Test',
      });

      expect(() => service.defineMitigation(risk.id, { strategy: 'mitigate' })).toThrow(
        'Missing required fields'
      );
    });
  });

  describe('Risk Matrix & Analysis', () => {
    test('should generate risk matrix', () => {
      service.identifyRisk({
        name: 'Risk 1',
        category: 'operational',
        description: 'Test',
        owner: 'IT',
      });
      service.identifyRisk({
        name: 'Risk 2',
        category: 'financial',
        description: 'Test',
        owner: 'Finance',
      });

      const matrix = service.getRiskMatrix(null);

      expect(matrix).toBeDefined();
      expect(matrix.totalRisks).toBe(2);
      expect(matrix.byCategory.operational).toBe(1);
      expect(matrix.byCategory.financial).toBe(1);
    });

    test('should filter matrix by department', () => {
      service.identifyRisk({
        name: 'Risk 1',
        category: 'operational',
        description: 'Test',
        owner: 'IT',
      });
      service.identifyRisk({
        name: 'Risk 2',
        category: 'financial',
        description: 'Test',
        owner: 'Finance',
      });

      const itMatrix = service.getRiskMatrix('IT');

      expect(itMatrix.totalRisks).toBe(1);
    });

    test('should count risks by level in matrix', () => {
      const risk1 = service.identifyRisk({
        name: 'Low Risk',
        category: 'operational',
        description: 'Test',
      });
      const risk2 = service.identifyRisk({
        name: 'Medium Risk',
        category: 'operational',
        description: 'Test',
      });

      service.assessRisk(risk1.id, { likelihood: 1, impact: 1 }); // score: 1 (low)
      service.assessRisk(risk2.id, { likelihood: 2, impact: 2 }); // score: 4 (medium)

      const matrix = service.getRiskMatrix(null);

      // Fixed: both risks are low level (1 and 4, both <= 5)
      expect(matrix.byLevel.low).toBe(2);
      expect(matrix.byLevel.medium).toBe(0);
    });

    test('should calculate average risk score', () => {
      const risk1 = service.identifyRisk({
        name: 'Risk 1',
        category: 'operational',
        description: 'Test',
      });
      const risk2 = service.identifyRisk({
        name: 'Risk 2',
        category: 'operational',
        description: 'Test',
      });

      service.assessRisk(risk1.id, { likelihood: 2, impact: 3 }); // score: 6
      service.assessRisk(risk2.id, { likelihood: 3, impact: 3 }); // score: 9

      const matrix = service.getRiskMatrix(null);

      // Average of 6 and 9 is 7.5
      expect(parseFloat(matrix.averageRiskScore)).toBe(7.5);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPLIANCE MANAGEMENT TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Compliance Frameworks', () => {
    test('should register compliance framework', () => {
      const framework = service.registerComplianceFramework({
        name: 'ISO 27001',
        type: 'regulatory',
        description: 'Information security standard',
        requirements: ['Access Control', 'Encryption', 'Audit Logging'],
      });

      expect(framework).toBeDefined();
      expect(framework.id).toMatch(/^FRAME-/);
      expect(framework.name).toBe('ISO 27001');
      expect(framework.status).toBe('active');
    });

    test('should throw error for missing framework data', () => {
      expect(() => service.registerComplianceFramework({ name: 'ISO 27001' })).toThrow(
        'Missing required fields'
      );
    });

    test('should track framework compliance checks', () => {
      const framework = service.registerComplianceFramework({
        name: 'GDPR',
        type: 'regulatory',
        requirements: ['Data Privacy'],
      });

      const check = service.conductComplianceCheck({
        frameworkId: framework.id,
        area: 'Data Protection',
        assessor: 'Auditor',
      });

      expect(framework.complianceChecks).toContain(check.id);
    });
  });

  describe('Compliance Checks', () => {
    test('should conduct compliance check', () => {
      const framework = service.registerComplianceFramework({
        name: 'SOX',
        type: 'regulatory',
        requirements: ['Financial Controls'],
      });

      const check = service.conductComplianceCheck({
        frameworkId: framework.id,
        area: 'Accounting',
        assessor: 'Internal Auditor',
        complianceStatus: 'compliant',
      });

      expect(check).toBeDefined();
      expect(check.id).toMatch(/^CHECK-/);
      expect(check.complianceStatus).toBe('compliant');
    });

    test('should throw error for non-existent framework', () => {
      expect(() =>
        service.conductComplianceCheck({
          frameworkId: 'NON-EXISTENT',
          area: 'Test',
          assessor: 'Auditor',
        })
      ).toThrow('Framework not found');
    });

    test('should track check history', () => {
      const framework = service.registerComplianceFramework({
        name: 'Test',
        type: 'regulatory',
        requirements: ['Req1'],
      });

      service.conductComplianceCheck({
        frameworkId: framework.id,
        area: 'Area',
        assessor: 'Auditor',
      });

      expect(service.complianceChecks.length).toBe(1);
    });
  });

  describe('Violation Reporting', () => {
    test('should report violation', () => {
      const framework = service.registerComplianceFramework({
        name: 'ISO 27001',
        type: 'regulatory',
        requirements: ['Access Control'],
      });

      const violation = service.reportViolation({
        frameworkId: framework.id,
        description: 'Inadequate access controls',
        severity: 'high',
        reportedBy: 'Auditor',
      });

      expect(violation).toBeDefined();
      expect(violation.id).toMatch(/^VIO-/);
      expect(violation.status).toBe('open');
    });

    test('should set default target resolution date', () => {
      const framework = service.registerComplianceFramework({
        name: 'Test',
        type: 'regulatory',
        requirements: ['Req1'],
      });

      const violation = service.reportViolation({
        frameworkId: framework.id,
        description: 'Test violation',
        severity: 'major',
      });

      expect(violation.targetResolutionDate).toBeDefined();
    });

    test('should close violation with root cause', () => {
      const framework = service.registerComplianceFramework({
        name: 'Test',
        type: 'regulatory',
        requirements: ['Req1'],
      });

      const violation = service.reportViolation({
        frameworkId: framework.id,
        description: 'Test',
        severity: 'major',
      });

      const closed = service.closeViolation(violation.id, {
        root_cause: 'Insufficient training',
        correctiveAction: 'Conduct security training',
      });

      expect(closed.status).toBe('resolved');
      expect(closed.resolvedDate).toBeDefined();
      expect(closed.root_cause).toBe('Insufficient training');
    });

    test('should throw error for missing violation data', () => {
      expect(() =>
        service.reportViolation({
          frameworkId: 'FRAME-123',
          description: 'Test',
        })
      ).toThrow('Missing required fields');
    });
  });

  describe('Compliance Status', () => {
    test('should calculate compliance status', () => {
      const framework = service.registerComplianceFramework({
        name: 'Test',
        type: 'regulatory',
        requirements: ['Req1'],
      });

      service.conductComplianceCheck({
        frameworkId: framework.id,
        area: 'Area 1',
        assessor: 'Auditor',
        complianceStatus: 'compliant',
      });
      service.conductComplianceCheck({
        frameworkId: framework.id,
        area: 'Area 2',
        assessor: 'Auditor',
        complianceStatus: 'non-compliant',
      });

      const status = service.getComplianceStatus(framework.id);

      expect(status.totalChecks).toBe(2);
      expect(status.compliantChecks).toBe(1);
      expect(parseFloat(status.complianceRate)).toBe(50);
    });

    test('should detect compliance trend', () => {
      const framework = service.registerComplianceFramework({
        name: 'Test',
        type: 'regulatory',
        requirements: ['Req1'],
      });

      service.conductComplianceCheck({
        frameworkId: framework.id,
        area: 'Area 1',
        assessor: 'Auditor',
        complianceStatus: 'non-compliant',
      });
      service.conductComplianceCheck({
        frameworkId: framework.id,
        area: 'Area 2',
        assessor: 'Auditor',
        complianceStatus: 'compliant',
      });

      const status = service.getComplianceStatus(framework.id);

      expect(status.trend).toBeDefined();
      expect(['improving', 'declining', 'stable', 'insufficient-data']).toContain(status.trend);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INTERNAL CONTROLS TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Control Definition', () => {
    test('should define internal control', () => {
      const control = service.defineControl({
        name: 'Authorization Control',
        objective: 'Prevent unauthorized transactions',
        type: 'preventive',
        owner: 'Finance',
      });

      expect(control).toBeDefined();
      expect(control.id).toMatch(/^CTL-/);
      expect(control.status).toBe('active');
    });

    test('should throw error for missing control data', () => {
      expect(() => service.defineControl({ name: 'Test' })).toThrow('Missing required fields');
    });

    test('should set default frequency', () => {
      const control = service.defineControl({
        name: 'Test Control',
        objective: 'Test',
        owner: 'Team',
      });

      expect(control.frequency).toBe('monthly');
    });
  });

  describe('Control Testing', () => {
    test('should test control', () => {
      const control = service.defineControl({
        name: 'Test Control',
        objective: 'Test',
        owner: 'Team',
      });

      const test = service.testControl(control.id, {
        testResult: 'pass',
        testedBy: 'Auditor',
      });

      expect(test).toBeDefined();
      expect(test.id).toMatch(/^TEST-/);
      expect(test.testResult).toBe('pass');
    });

    test('should calculate control effectiveness', () => {
      const control = service.defineControl({
        name: 'Test',
        objective: 'Test',
        owner: 'Team',
      });

      service.testControl(control.id, { testResult: 'pass' });
      service.testControl(control.id, { testResult: 'pass' });
      service.testControl(control.id, { testResult: 'fail' });

      expect(control.effectiveness).toBe('66.67');
    });

    test('should update last tested date', () => {
      const control = service.defineControl({
        name: 'Test',
        objective: 'Test',
        owner: 'Team',
      });

      service.testControl(control.id, { testResult: 'pass' });

      expect(control.lastTestedDate).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INCIDENT MANAGEMENT TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Incident Reporting', () => {
    test('should report incident', () => {
      const incident = service.reportIncident({
        title: 'System Outage',
        description: 'Database server went down',
        severity: 'critical',
        type: 'operational',
      });

      expect(incident).toBeDefined();
      expect(incident.id).toMatch(/^INC-/);
      expect(incident.status).toBe('open');
    });

    test('should throw error for missing incident data', () => {
      expect(() => service.reportIncident({ title: 'Test' })).toThrow('Missing required fields');
    });

    test('should update incident status', () => {
      const incident = service.reportIncident({
        title: 'Test',
        description: 'Test incident',
        severity: 'high',
      });

      const updated = service.updateIncidentStatus(incident.id, {
        status: 'closed',
        rootCause: 'Hardware failure',
        remediation: 'Replaced hardware',
      });

      expect(updated.status).toBe('closed');
      expect(updated.closedDate).toBeDefined();
      expect(updated.rootCause).toBe('Hardware failure');
    });

    test('should escalate incident', () => {
      const incident = service.reportIncident({
        title: 'Test',
        description: 'Test',
        severity: 'critical',
      });

      const escalation = service.escalateIncident(incident.id, {
        escalatedTo: 'Executive Management',
        reason: 'Business critical',
        priority: 'critical',
      });

      expect(escalation).toBeDefined();
      expect(incident.escalationHistory.length).toBe(1);
      expect(incident.escalationHistory[0].escalatedTo).toBe('Executive Management');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // REPORTING & ANALYTICS TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Risk Reporting', () => {
    test('should generate risk report', () => {
      service.identifyRisk({
        name: 'Test Risk',
        category: 'operational',
        description: 'Test',
      });

      const report = service.generateRiskReport({ period: 'Q4 2025' });

      expect(report).toBeDefined();
      expect(report.id).toMatch(/^RISK-RPT-/);
      expect(report.period).toBe('Q4 2025');
      expect(report.summary.totalRisks).toBe(1);
    });

    test('should include recommendations in risk report', () => {
      const risk = service.identifyRisk({
        name: 'Test Risk',
        category: 'operational',
        description: 'Test',
      });
      service.assessRisk(risk.id, { likelihood: 5, impact: 5 });

      const report = service.generateRiskReport({ period: 'Q4 2025' });

      expect(report.recommendations.length).toBeGreaterThan(0);
    });

    test('should track top risks in report', () => {
      const risk1 = service.identifyRisk({
        name: 'High Risk',
        category: 'operational',
        description: 'Test',
      });
      const risk2 = service.identifyRisk({
        name: 'Low Risk',
        category: 'operational',
        description: 'Test',
      });

      service.assessRisk(risk1.id, { likelihood: 4, impact: 4 }); // Higher score
      service.assessRisk(risk2.id, { likelihood: 2, impact: 2 }); // Lower score

      const report = service.generateRiskReport({ period: 'Q4 2025' });

      // Fixed: topRisks should be sorted by score, highest first
      expect(report.topRisks[0].name).toBe('High Risk');
    });
  });

  describe('Compliance Reporting', () => {
    test('should generate compliance report', () => {
      const framework = service.registerComplianceFramework({
        name: 'ISO 27001',
        type: 'regulatory',
        requirements: ['Req1'],
      });

      service.conductComplianceCheck({
        frameworkId: framework.id,
        area: 'Area 1',
        assessor: 'Auditor',
        complianceStatus: 'compliant',
      });

      const report = service.generateComplianceReport({ frameworkId: framework.id });

      expect(report).toBeDefined();
      expect(report.id).toMatch(/^COMP-RPT-/);
      expect(report.frameworkName).toBe('ISO 27001');
      expect(report.complianceStatus).toBeDefined();
    });

    test('should include recommendations if not fully compliant', () => {
      const framework = service.registerComplianceFramework({
        name: 'Test',
        type: 'regulatory',
        requirements: ['Req1'],
      });

      service.conductComplianceCheck({
        frameworkId: framework.id,
        area: 'Area 1',
        assessor: 'Auditor',
        complianceStatus: 'non-compliant',
      });

      const report = service.generateComplianceReport({ frameworkId: framework.id });

      expect(report.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('Dashboard Analytics', () => {
    test('should generate risk dashboard data', () => {
      service.identifyRisk({
        name: 'Test Risk',
        category: 'operational',
        description: 'Test',
      });

      const dashboard = service.getRiskDashboardData();

      expect(dashboard).toBeDefined();
      expect(dashboard.timestamp).toBeDefined();
      expect(dashboard.summary).toBeDefined();
      expect(dashboard.summary.totalRisks).toBe(1);
    });

    test('should include risk trend in dashboard', () => {
      const risk = service.identifyRisk({
        name: 'Test',
        category: 'operational',
        description: 'Test',
      });

      service.assessRisk(risk.id, { likelihood: 3, impact: 3 });

      const dashboard = service.getRiskDashboardData();

      expect(dashboard.riskTrend).toBeDefined();
      expect(['increasing', 'decreasing', 'stable', 'insufficient-data']).toContain(
        dashboard.riskTrend
      );
    });

    test('should calculate compliance trend', () => {
      const framework = service.registerComplianceFramework({
        name: 'Test',
        type: 'regulatory',
        requirements: ['Req1'],
      });

      service.conductComplianceCheck({
        frameworkId: framework.id,
        area: 'Area 1',
        assessor: 'Auditor',
        complianceStatus: 'compliant',
      });

      const dashboard = service.getRiskDashboardData();

      expect(dashboard.complianceTrend).toBeDefined();
    });

    test('should include top incidents in dashboard', () => {
      service.reportIncident({
        title: 'Critical Issue',
        description: 'Test',
        severity: 'critical',
      });
      service.reportIncident({
        title: 'Minor Issue',
        description: 'Test',
        severity: 'low',
      });

      const dashboard = service.getRiskDashboardData();

      expect(dashboard.topIncidents.length).toBeLessThanOrEqual(5);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INTEGRATION & COMPREHENSIVE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Complete Risk Management Workflow', () => {
    test('should handle end-to-end risk management', () => {
      // 1. Identify risk
      const risk = service.identifyRisk({
        name: 'Data Loss Risk',
        category: 'operational',
        description: 'Potential data loss',
        owner: 'IT',
      });

      // 2. Assess risk
      const assessment = service.assessRisk(risk.id, {
        likelihood: 4,
        impact: 5,
      });

      // 3. Define mitigation
      const mitigation = service.defineMitigation(risk.id, {
        strategy: 'mitigate',
        description: 'Implement backup system',
        owner: 'IT Manager',
      });

      // 4. Update status
      service.updateMitigationStatus(mitigation.id, {
        status: 'in-progress',
      });

      // Verify complete workflow
      expect(risk.riskLevel).toBe('critical');
      expect(risk.mitigation).toBe(mitigation.id);
      expect(assessment.riskScore).toBe(20);
    });

    test('should maintain data isolation across risks', () => {
      const risk1 = service.identifyRisk({
        name: 'Risk 1',
        category: 'operational',
        description: 'Test',
      });
      const risk2 = service.identifyRisk({
        name: 'Risk 2',
        category: 'financial',
        description: 'Test',
      });

      service.assessRisk(risk1.id, { likelihood: 2, impact: 3 }); // score: 6
      service.assessRisk(risk2.id, { likelihood: 4, impact: 4 }); // score: 16

      // Fixed: Verify scores are correctly calculated per risk
      const retrievedRisk1 = service.getRiskInfo(risk1.id);
      const retrievedRisk2 = service.getRiskInfo(risk2.id);

      expect(retrievedRisk1.riskScore).toBe(6);
      expect(retrievedRisk2.riskScore).toBe(16);
    });

    test('should handle concurrent compliance checks', () => {
      const framework = service.registerComplianceFramework({
        name: 'Multi-Area Framework',
        type: 'regulatory',
        requirements: ['Req1', 'Req2'],
      });

      const check1 = service.conductComplianceCheck({
        frameworkId: framework.id,
        area: 'Area 1',
        assessor: 'Auditor 1',
      });
      const check2 = service.conductComplianceCheck({
        frameworkId: framework.id,
        area: 'Area 2',
        assessor: 'Auditor 2',
      });

      expect(framework.complianceChecks).toContain(check1.id);
      expect(framework.complianceChecks).toContain(check2.id);
      expect(service.complianceChecks.length).toBe(2);
    });
  });
});
