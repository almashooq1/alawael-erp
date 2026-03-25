/**
 * Risk Management Service — Unit Tests
 * Covers: Risk CRUD, Assessment, Mitigation, Compliance, Audit, Trends
 */

const RiskManagementService = require('../services/risk-management.service');

describe('RiskManagementService', () => {
  let svc;

  beforeEach(() => {
    svc = new RiskManagementService();
  });

  // ═══════════════════════════════════════════
  // RISK IDENTIFICATION
  // ═══════════════════════════════════════════

  describe('Risk Identification', () => {
    const validRisk = {
      name: 'Supply Disruption',
      category: 'operational',
      description: 'Key supplier may go offline',
      owner: 'risk-team',
    };

    test('identifyRisk — creates risk with defaults', () => {
      const risk = svc.identifyRisk(validRisk);
      expect(risk.id).toMatch(/^RIS-/);
      expect(risk.status).toBe('identified');
      expect(risk.riskLevel).toBe('medium');
      expect(risk.riskScore).toBe(9); // 3 * 3 default
    });

    test('identifyRisk — throws on missing fields', () => {
      expect(() => svc.identifyRisk({ name: 'X' })).toThrow('Missing required fields');
    });

    test('Multiple risks stored independently', () => {
      svc.identifyRisk(validRisk);
      svc.identifyRisk({ ...validRisk, name: 'Cyber Attack', category: 'security' });
      expect(svc.risks.length).toBe(2);
    });
  });

  // ═══════════════════════════════════════════
  // RISK ASSESSMENT
  // ═══════════════════════════════════════════

  describe('Risk Assessment', () => {
    let riskId;

    beforeEach(() => {
      const risk = svc.identifyRisk({
        name: 'Data Breach',
        category: 'security',
        description: 'Potential data leak',
      });
      riskId = risk.id;
    });

    test('assessRisk — updates likelihood, impact, score', () => {
      const assessed = svc.assessRisk(riskId, { likelihood: 5, impact: 4 });
      expect(assessed.likelihood).toBe(5);
      expect(assessed.impact).toBe(4);
      expect(assessed.riskScore).toBe(20);
      expect(assessed.riskLevel).toBe('critical');
    });

    test('assessRisk — clamps values to 1-5', () => {
      const assessed = svc.assessRisk(riskId, { likelihood: 10, impact: -2 });
      expect(assessed.likelihood).toBe(5);
      expect(assessed.impact).toBe(1);
    });

    test('assessRisk — throws for unknown risk', () => {
      expect(() => svc.assessRisk('bad-id', { likelihood: 3, impact: 3 })).toThrow();
    });

    test('Risk levels calculated correctly', () => {
      // medium: 6-11
      svc.assessRisk(riskId, { likelihood: 2, impact: 3 });
      expect(svc.getRiskById(riskId).riskLevel).toBe('medium');

      // high: 12-19
      svc.assessRisk(riskId, { likelihood: 4, impact: 4 });
      expect(svc.getRiskById(riskId).riskLevel).toBe('high');

      // critical: 20+
      svc.assessRisk(riskId, { likelihood: 5, impact: 5 });
      expect(svc.getRiskById(riskId).riskLevel).toBe('critical');
    });
  });

  // ═══════════════════════════════════════════
  // RISK RETRIEVAL
  // ═══════════════════════════════════════════

  describe('Risk Retrieval', () => {
    test('getRiskById — returns risk', () => {
      const risk = svc.identifyRisk({
        name: 'Flood',
        category: 'environmental',
        description: 'Warehouse flood risk',
      });
      expect(svc.getRiskById(risk.id)).toBeDefined();
      expect(svc.getRiskById(risk.id).name).toBe('Flood');
    });

    test('getRiskById — throws for unknown', () => {
      expect(() => svc.getRiskById('nonexistent')).toThrow();
    });

    test('getAllRisks — returns all with optional filters', () => {
      svc.identifyRisk({ name: 'A', category: 'security', description: 'x' });
      svc.identifyRisk({ name: 'B', category: 'operational', description: 'y' });
      const all = svc.getAllRisks();
      expect(all.length).toBe(2);

      const secOnly = svc.getAllRisks({ category: 'security' });
      expect(secOnly.length).toBe(1);
      expect(secOnly[0].name).toBe('A');
    });
  });

  // ═══════════════════════════════════════════
  // MITIGATION
  // ═══════════════════════════════════════════

  describe('Mitigation', () => {
    let riskId;

    beforeEach(() => {
      const risk = svc.identifyRisk({
        name: 'Supplier Risk',
        category: 'operational',
        description: 'Single-source dependency',
      });
      riskId = risk.id;
    });

    test('defineMitigation — creates mitigation plan', () => {
      const mit = svc.defineMitigation(riskId, {
        strategy: 'Diversify suppliers',
        owner: 'procurement',
        actions: ['Identify 3 alternates', 'Negotiate contracts'],
      });
      expect(mit.id).toMatch(/^MIT-/);
      expect(mit.status).toBe('planned');
    });

    test('updateMitigationStatus — changes status', () => {
      const mit = svc.defineMitigation(riskId, {
        strategy: 'Diversify',
        owner: 'proc',
        actions: ['Find alternates'],
      });
      const updated = svc.updateMitigationStatus(mit.id, {
        status: 'in_progress',
      });
      expect(updated.status).toBe('in_progress');
    });
  });

  // ═══════════════════════════════════════════
  // COMPLIANCE
  // ═══════════════════════════════════════════

  describe('Compliance', () => {
    test('defineComplianceControl — creates control', () => {
      const ctrl = svc.defineComplianceControl({
        name: 'GDPR Data Handling',
        framework: 'GDPR',
        requirement: 'Personal data processing controls',
        owner: 'dpo',
      });
      expect(ctrl.id).toMatch(/^CC-/);
      expect(ctrl.status).toBe('planned');
    });

    test('submitComplianceEvidence — attaches evidence', () => {
      const ctrl = svc.defineComplianceControl({
        name: 'ISO 27001',
        framework: 'ISO',
        description: 'ISMS controls',
        owner: 'ciso',
      });
      const ev = svc.submitComplianceEvidence(ctrl.id, {
        type: 'document',
        description: 'Policy document v2',
        submittedBy: 'ciso',
      });
      expect(ev).toBeDefined();
    });

    test('validateComplianceFramework — validates known frameworks', () => {
      const result = svc.validateComplianceFramework('GDPR');
      expect(result).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════
  // AUDIT
  // ═══════════════════════════════════════════

  describe('Audit', () => {
    test('createAuditPlan — creates audit plan', () => {
      const audit = svc.createAuditPlan({
        name: 'Q4 Security Audit',
        scope: 'IT infrastructure',
        owner: 'ext-auditor',
      });
      expect(audit.id).toMatch(/^AUD-/);
      expect(audit.status).toBe('planned');
    });

    test('executeAudit — moves to in_progress', () => {
      const audit = svc.createAuditPlan({
        name: 'Compliance Audit',
        scope: 'Financial controls',
        owner: 'int-auditor',
      });
      const exec = svc.executeAudit(audit.id, { executedBy: 'int-auditor' });
      expect(exec.status).toBe('in_progress');
    });

    test('getAuditReport — returns report for audit', () => {
      const audit = svc.createAuditPlan({
        name: 'Annual Audit',
        scope: 'Full',
        owner: 'ext',
      });
      const report = svc.getAuditReport(audit.id);
      expect(report).toBeDefined();
      expect(report.id).toBe(audit.id);
    });
  });

  // ═══════════════════════════════════════════
  // REPORTING & TRENDS
  // ═══════════════════════════════════════════

  describe('Reporting & Trends', () => {
    test('generateRiskReport — returns summary', () => {
      svc.identifyRisk({ name: 'R1', category: 'security', description: 'x' });
      svc.identifyRisk({ name: 'R2', category: 'operational', description: 'y' });
      const report = svc.generateRiskReport();
      expect(report).toBeDefined();
      expect(report.totalRisks).toBe(2);
    });

    test('trackRiskTrends — returns trend data', () => {
      svc.identifyRisk({ name: 'R1', category: 'security', description: 'x' });
      svc.assessRisk(svc.risks[0].id, { likelihood: 4, impact: 3 });
      const trend = svc.trackRiskTrends('30d');
      expect(trend).toBeDefined();
      expect(trend.timeframe).toBe('30d');
    });
  });
});
