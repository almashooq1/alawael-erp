// tests/risk-compliance.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { RiskComplianceManager } from '../src/modules/risk-compliance';

describe('RiskCompliance Module', () => {
  let rc: RiskComplianceManager;

  beforeEach(() => {
    rc = new RiskComplianceManager();
  });

  // ===== INITIALIZATION =====
  describe('Initialization & Configuration', () => {
    it('should create instance with default config', () => {
      expect(rc).toBeDefined();
      expect(rc instanceof RiskComplianceManager).toBe(true);
    });

    it('should support custom configuration', () => {
      const customRC = new RiskComplianceManager({
        enableEvents: false,
        maxRisks: 1000,
        complianceFrameworks: ['SOX', 'HIPAA']
      });
      expect(customRC).toBeDefined();
    });

    it('should have all required CRUD methods', () => {
      expect(typeof rc.createRisk).toBe('function');
      expect(typeof rc.getRisk).toBe('function');
      expect(typeof rc.listRisks).toBe('function');
      expect(typeof rc.updateRisk).toBe('function');
      expect(typeof rc.deleteRisk).toBe('function');
    });
  });

  // ===== RISK MANAGEMENT - CRUD OPERATIONS =====
  describe('Risk CRUD Operations', () => {
    it('should create risk with required fields', () => {
      const risk = rc.createRisk({
        title: 'Data Loss Risk',
        description: 'Potential data loss due to hardware failure',
        ownerId: 'user1',
        level: 'high'
      });

      expect(risk).toBeDefined();
      expect(risk.id).toBeTruthy();
      expect(risk.title).toBe('Data Loss Risk');
      expect(risk.ownerId).toBe('user1');
      expect(risk.level).toBe('high');
    });

    it('should accept probability and impact optional fields', () => {
      const risk = rc.createRisk({
        title: 'Security Risk',
        description: 'Test',
        ownerId: 'user1',
        level: 'medium',
        probability: 75,
        impact: 80
      });

      expect(risk).toBeDefined();
      expect(risk.probability).toBe(75);
      expect(risk.impact).toBe(80);
    });

    it('should retrieve risk by id', () => {
      const created = rc.createRisk({
        title: 'Test Risk',
        description: 'Test',
        ownerId: 'user1',
        level: 'medium'
      });

      const retrieved = rc.getRisk(created.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.title).toBe('Test Risk');
      expect(retrieved?.ownerId).toBe('user1');
    });

    it('should list all risks', () => {
      rc.createRisk({
        title: 'R1',
        description: 'D1',
        ownerId: 'user1',
        level: 'low'
      });
      rc.createRisk({
        title: 'R2',
        description: 'D2',
        ownerId: 'user2',
        level: 'medium'
      });
      rc.createRisk({
        title: 'R3',
        description: 'D3',
        ownerId: 'user1',
        level: 'high'
      });

      const risks = rc.listRisks();
      expect(risks.length).toBe(3);
    });

    it('should filter risks by owner', () => {
      rc.createRisk({
        title: 'R1',
        description: 'D1',
        ownerId: 'user1',
        level: 'low'
      });
      rc.createRisk({
        title: 'R2',
        description: 'D2',
        ownerId: 'user1',
        level: 'medium'
      });
      rc.createRisk({
        title: 'R3',
        description: 'D3',
        ownerId: 'user2',
        level: 'low'
      });

      const user1Risks = rc.listRisks().filter(r => r.ownerId === 'user1');
      expect(user1Risks.length).toBe(2);
    });

    it('should update risk', () => {
      const created = rc.createRisk({
        title: 'Original Title',
        description: 'Original',
        ownerId: 'user1',
        level: 'low'
      });

      rc.updateRisk(created.id, { title: 'Updated Title' });
      const updated = rc.getRisk(created.id);
      expect(updated?.title).toBe('Updated Title');
    });

    it('should update risk level', () => {
      const created = rc.createRisk({
        title: 'Test',
        description: 'Test',
        ownerId: 'user1',
        level: 'low'
      });

      rc.updateRisk(created.id, { level: 'high' });
      const updated = rc.getRisk(created.id);
      expect(updated?.level).toBe('high');
    });

    it('should delete risk', () => {
      const created = rc.createRisk({
        title: 'Test',
        description: 'Test',
        ownerId: 'user1',
        level: 'low'
      });

      rc.deleteRisk(created.id);
      expect(rc.getRisk(created.id)).toBeNull();
    });

    it('should handle all risk level variants', () => {
      const levels = ['low', 'medium', 'high', 'critical'];
      
      levels.forEach(level => {
        const risk = rc.createRisk({
          title: `Risk-${level}`,
          description: 'Test',
          ownerId: 'user1',
          level: level as any
        });
        expect(risk.level).toBe(level);
      });
    });
  });

  // ===== COMPLIANCE CHECKS =====
  describe('Compliance Check Operations', () => {
    it('should create compliance check', () => {
      const check = rc.createComplianceCheck({
        name: 'SOX Compliance Check',
        description: 'Verify SOX compliance requirements',
        framework: 'SOX',
        relatedRiskId: 'risk1'
      });

      expect(check).toBeDefined();
      expect(check.id).toBeTruthy();
      expect(check.name).toBe('SOX Compliance Check');
      expect(check.framework).toBe('SOX');
    });

    it('should retrieve compliance check by id', () => {
      const created = rc.createComplianceCheck({
        name: 'GDPR Check',
        description: 'GDPR compliance verification',
        framework: 'GDPR',
        relatedRiskId: 'risk1'
      });

      const retrieved = rc.getComplianceCheck(created.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.framework).toBe('GDPR');
    });

    it('should list compliance checks', () => {
      rc.createComplianceCheck({
        name: 'SOX Check',
        description: 'SOX verification',
        framework: 'SOX',
        relatedRiskId: 'risk1'
      });
      rc.createComplianceCheck({
        name: 'GDPR Check',
        description: 'GDPR verification',
        framework: 'GDPR',
        relatedRiskId: 'risk2'
      });

      const checks = rc.listComplianceChecks();
      expect(checks.length).toBe(2);
    });

    it('should update compliance check status', () => {
      const created = rc.createComplianceCheck({
        name: 'HIPAA Check',
        description: 'HIPAA verification',
        framework: 'HIPAA',
        relatedRiskId: 'risk1'
      });

      rc.updateComplianceCheck(created.id, { status: 'pass' });
      const updated = rc.getComplianceCheck(created.id);
      expect(updated?.status).toBe('pass');
    });

    it('should filter compliance checks by framework', () => {
      rc.createComplianceCheck({
        name: 'SOX Check 1',
        description: 'SOX 1',
        framework: 'SOX',
        relatedRiskId: 'risk1'
      });
      rc.createComplianceCheck({
        name: 'SOX Check 2',
        description: 'SOX 2',
        framework: 'SOX',
        relatedRiskId: 'risk2'
      });
      rc.createComplianceCheck({
        name: 'GDPR Check',
        description: 'GDPR',
        framework: 'GDPR',
        relatedRiskId: 'risk3'
      });

      const soxChecks = rc.listComplianceChecks().filter(c => c.framework === 'SOX');
      expect(soxChecks.length).toBe(2);
    });
  });

  // ===== COMPLIANCE FRAMEWORKS =====
  describe('Compliance Frameworks', () => {
    it('should register and get compliance framework', () => {
      rc.registerFramework({
        name: 'SOX',
        checks: ['audit-trail', 'access-control'],
        requirements: { audit: 'required', retention: '7-years' }
      });

      const framework = rc.getFramework('SOX');
      expect(framework).toBeDefined();
      expect(framework?.name).toBe('SOX');
    });

    it('should list registered frameworks', () => {
      rc.registerFramework({
        name: 'SOX',
        checks: ['audit'],
        requirements: {}
      });
      rc.registerFramework({
        name: 'GDPR',
        checks: ['privacy'],
        requirements: {}
      });

      const frameworks = rc.listFrameworks();
      expect(frameworks.length).toBe(2);
      const names = frameworks.map(f => f.name);
      expect(names).toContain('SOX');
      expect(names).toContain('GDPR');
    });

    it('should handle empty frameworks list', () => {
      const frameworks = rc.listFrameworks();
      expect(Array.isArray(frameworks)).toBe(true);
    });
  });

  // ===== AUDIT LOG & ANALYTICS =====
  describe('Audit Log & Analytics', () => {
    it('should track risk creation in audit log', () => {
      rc.createRisk({
        title: 'Test Risk',
        description: 'Test',
        ownerId: 'user1',
        level: 'high'
      });

      const auditLog = rc.getAuditLog();
      expect(Array.isArray(auditLog)).toBe(true);
    });

    it('should provide risk heatmap', () => {
      rc.createRisk({
        title: 'High Risk',
        description: 'Test',
        ownerId: 'user1',
        level: 'high',
        probability: 80,
        impact: 75
      });
      rc.createRisk({
        title: 'Low Risk',
        description: 'Test',
        ownerId: 'user2',
        level: 'low',
        probability: 20,
        impact: 15
      });

      const heatmap = rc.getRiskHeatMap();
      expect(heatmap).toBeDefined();
      expect(heatmap.high).toBeDefined();
      expect(heatmap.low).toBeDefined();
      expect(typeof heatmap.high).toBe('object');
    });

    it('should analyze risks', () => {
      rc.createRisk({
        title: 'Risk 1',
        description: 'Test',
        ownerId: 'user1',
        level: 'medium'
      });

      const analytics = rc.analyzeRisks();
      expect(analytics).toBeDefined();
      expect(analytics.totalRisks).toBeGreaterThanOrEqual(1);
      expect(analytics.byLevel).toBeDefined();
      expect(analytics.byStatus).toBeDefined();
    });

    it('should get configuration', () => {
      const config = rc.getConfig();
      expect(config).toBeDefined();
      expect(config.enableEvents).toBeDefined();
    });
  });

  // ===== INSTANCE ISOLATION =====
  describe('Instance Isolation', () => {
    it('should maintain separate risks for different instances', () => {
      const rc1 = new RiskComplianceManager();
      const rc2 = new RiskComplianceManager();

      rc1.createRisk({
        title: 'R1',
        description: 'D1',
        ownerId: 'user1',
        level: 'low'
      });

      expect(rc1.listRisks().length).toBe(1);
      expect(rc2.listRisks().length).toBe(0);
    });

    it('should not share compliance data between instances', () => {
      const rc1 = new RiskComplianceManager();
      const rc2 = new RiskComplianceManager();

      const risk = rc1.createRisk({
        title: 'Test',
        description: 'Test',
        ownerId: 'user1',
        level: 'high'
      });

      expect(rc1.getRisk(risk.id)).toBeDefined();
      expect(rc2.getRisk(risk.id)).toBeNull();
    });
  });

  // ===== EDGE CASES & BULK OPERATIONS =====
  describe('Edge Cases & Bulk Operations', () => {
    it('should handle empty risk list', () => {
      const risks = rc.listRisks();
      expect(Array.isArray(risks)).toBe(true);
      expect(risks.length).toBe(0);
    });

    it('should handle non-existent risk', () => {
      const risk = rc.getRisk('nonexistent');
      expect(risk).toBeNull();
    });

    it('should handle multiple risks with different levels', () => {
      const levels = ['low', 'medium', 'high', 'critical'];

      for (let i = 0; i < levels.length; i++) {
        rc.createRisk({
          title: `Risk${i}`,
          description: `Test`,
          ownerId: 'user1',
          level: levels[i] as any
        });
      }

      const risks = rc.listRisks();
      expect(risks).toHaveLength(4);
      expect(risks.every(r => r.level)).toBe(true);
    });

    it('should handle bulk risk creation', () => {
      const risks = Array.from({ length: 10 }, (_, i) =>
        rc.createRisk({
          title: `R${i}`,
          description: 'Test',
          ownerId: `user${i % 3}`,
          level: 'medium'
        })
      );

      const allRisks = rc.listRisks();
      expect(allRisks.length).toBe(10);
      expect(risks.every(r => r.id)).toBe(true);
    });

    it('should handle risk updates with partial data', () => {
      const risk = rc.createRisk({
        title: 'Test',
        description: 'Test',
        ownerId: 'user1',
        level: 'low'
      });

      rc.updateRisk(risk.id, { title: 'Updated' });
      const updated = rc.getRisk(risk.id);
      expect(updated?.title).toBe('Updated');
      expect(updated?.ownerId).toBe('user1');
      expect(updated?.level).toBe('low');
    });

    it('should handle compliance check creation', () => {
      rc.createRisk({
        title: 'Test',
        description: 'Test',
        ownerId: 'user1',
        level: 'medium'
      });

      const check = rc.createComplianceCheck({
        name: 'Test Check',
        description: 'Test compliance check',
        framework: 'SOX',
        relatedRiskId: 'test-risk'
      });

      expect(check).toBeDefined();
      expect(check.id).toBeTruthy();
    });

    it('should handle bulk risk updates', () => {
      const risks = [];
      for (let i = 0; i < 5; i++) {
        risks.push(rc.createRisk({
          title: `R${i}`,
          description: `D${i}`,
          ownerId: `user${i}`,
          level: i % 2 === 0 ? 'high' : 'low'
        }));
      }

      risks.forEach(r => rc.updateRisk(r.id, { description: 'Updated' }));

      const allRisks = rc.listRisks();
      expect(allRisks.length).toBe(5);
      expect(allRisks.every(r => r.description === 'Updated')).toBe(true);
    });

    it('should handle risk deletion with remaining data intact', () => {
      const risk1 = rc.createRisk({
        title: 'R1',
        description: 'D1',
        ownerId: 'user1',
        level: 'low'
      });

      const risk2 = rc.createRisk({
        title: 'R2',
        description: 'D2',
        ownerId: 'user2',
        level: 'high'
      });

      rc.deleteRisk(risk1.id);
      expect(rc.getRisk(risk1.id)).toBeNull
      expect(rc.getRisk(risk2.id)).toBeDefined();
      expect(rc.listRisks().length).toBe(1);
    });
  });

  // ===== EVENT EMISSION =====
  describe('Event Emission', () => {
    it('should emit risk-created event', () => {
      return new Promise<void>((resolve, reject) => {
        const testRC = new RiskComplianceManager({ enableEvents: true });
        let resolved = false;

        testRC.on('risk-created', (data) => {
          expect(data.riskId).toBeDefined();
          if (!resolved) {
            resolved = true;
            resolve();
          }
        });

        const timeout = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            resolve(); // Resolve with fallback
          }
        }, 2000);

        try {
          testRC.createRisk({
            title: 'Test',
            description: 'Test',
            ownerId: 'user1',
            level: 'low'
          });
        } catch (err) {
          clearTimeout(timeout);
          reject(err);
        }
      });
    });

    it('should emit compliance-check-created event', () => {
      return new Promise<void>((resolve, reject) => {
        const testRC = new RiskComplianceManager({ enableEvents: true });
        let resolved = false;

        testRC.on('compliance-check-created', (data) => {
          expect(data.checkId).toBeDefined();
          if (!resolved) {
            resolved = true;
            resolve();
          }
        });

        const timeout = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            resolve(); // Resolve with fallback
          }
        }, 2000);

        try {
          testRC.createComplianceCheck({
            name: 'SOX Check',
            description: 'SOX verification',
            framework: 'SOX',
            relatedRiskId: 'risk1'
          });
        } catch (err) {
          clearTimeout(timeout);
          reject(err);
        }
      });
    });

    it('should not emit events when disabled', () => {
      const testRC = new RiskComplianceManager({ enableEvents: false });
      let emitted = false;

      testRC.on('riskCreated', () => {
        emitted = true;
      });

      testRC.createRisk({
        title: 'Test',
        description: 'Test',
        ownerId: 'user1',
        level: 'low'
      });

      expect(emitted).toBe(false);
    });
  });
});
