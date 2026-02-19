/**
 * ALAWAEL ERP - PHASE 18: QUALITY MANAGEMENT TESTS
 * Comprehensive test suite for Quality Management & Advanced Reporting
 */

const QualityManagementService = require('../services/quality-management.service');

describe('Phase 18: Quality Management & Advanced Reporting', () => {
  let service;

  beforeEach(() => {
    service = new QualityManagementService();
  });

  /**
   * QUALITY METRICS TESTS
   */
  describe('QUALITY METRICS MANAGEMENT', () => {
    test('Should create quality metric', () => {
      const metric = service.createQualityMetric({
        name: 'On-Time Delivery',
        type: 'efficiency',
        category: 'logistics',
        targetValue: 95,
        unit: 'percent',
        description: 'Measure delivery timeliness',
        department: 'shipping',
        owner: 'john.doe',
      });

      expect(metric).toBeDefined();
      expect(metric.id).toMatch(/^QM-/);
      expect(metric.name).toBe('On-Time Delivery');
      expect(metric.status).toBe('active');
    });

    test('Should throw error for missing required fields', () => {
      expect(() => {
        service.createQualityMetric({
          name: 'Test Metric',
          // missing type and targetValue
        });
      }).toThrow('Missing required fields');
    });

    test('Should get quality metrics with filtering', () => {
      service.createQualityMetric({
        name: 'Metric 1',
        type: 'conformance',
        category: 'quality',
        targetValue: 99,
        unit: 'percent',
        department: 'production',
      });

      service.createQualityMetric({
        name: 'Metric 2',
        type: 'efficiency',
        category: 'quality',
        targetValue: 95,
        unit: 'percent',
        department: 'shipping',
      });

      const conformanceMetrics = service.getQualityMetrics({ type: 'conformance' });
      expect(conformanceMetrics.length).toBe(1);
      expect(conformanceMetrics[0].name).toBe('Metric 1');
    });

    test('Should update metric value and calculate variance', () => {
      const metric = service.createQualityMetric({
        name: 'Production Quality',
        type: 'conformance',
        category: 'quality',
        targetValue: 99,
        unit: 'percent',
        department: 'production',
      });

      const updated = service.updateMetricValue(metric.id, 98.5, 'Slightly below target');

      expect(updated.currentValue).toBe(98.5);
      expect(updated.measurements.length).toBe(1);
      expect(updated.measurements[0].variance).toBe(-0.5);
      expect(updated.performanceStatus).toBe('on-track'); // 98.5 >= 95% of 99 (94.05)
    });

    test('Should track metric trend', () => {
      const metric = service.createQualityMetric({
        name: 'Trend Test',
        type: 'efficiency',
        category: 'quality',
        targetValue: 90,
        unit: 'percent',
        department: 'production',
      });

      service.updateMetricValue(metric.id, 87);
      const updated1 = service.updateMetricValue(metric.id, 89);
      expect(updated1.trend).toBe('increasing');

      const updated2 = service.updateMetricValue(metric.id, 85);
      expect(updated2.trend).toBe('decreasing');
    });

    test('Should mark metric as on-track when above 95% of target', () => {
      const metric = service.createQualityMetric({
        name: 'Safety Metric',
        type: 'safety',
        category: 'quality',
        targetValue: 100,
        unit: 'percent',
        department: 'safety',
      });

      const updated = service.updateMetricValue(metric.id, 96); // 96% of 100
      expect(updated.performanceStatus).toBe('on-track');
    });

    test('Should maintain measurement history', () => {
      const metric = service.createQualityMetric({
        name: 'History Test',
        type: 'efficiency',
        category: 'quality',
        targetValue: 100,
        unit: 'count',
        department: 'production',
      });

      service.updateMetricValue(metric.id, 90);
      service.updateMetricValue(metric.id, 95);
      service.updateMetricValue(metric.id, 98);

      const updated = service.getQualityMetrics()[0];
      expect(updated.measurements.length).toBe(3);
      expect(updated.currentValue).toBe(98);
    });

    test('Should filter metrics by department', () => {
      service.createQualityMetric({
        name: 'Prod Metric',
        type: 'conformance',
        category: 'quality',
        targetValue: 99,
        unit: 'percent',
        department: 'production',
      });

      service.createQualityMetric({
        name: 'Ship Metric',
        type: 'efficiency',
        category: 'quality',
        targetValue: 95,
        unit: 'percent',
        department: 'shipping',
      });

      const prodMetrics = service.getQualityMetrics({ department: 'production' });
      expect(prodMetrics.length).toBe(1);
      expect(prodMetrics[0].department).toBe('production');
    });
  });

  /**
   * DEFECT MANAGEMENT TESTS
   */
  describe('DEFECT & ISSUE TRACKING', () => {
    test('Should report defect', () => {
      const defect = service.reportDefect({
        title: 'Component Failure',
        description: 'Component X failed under load',
        severity: 'critical',
        category: 'Hardware',
        reportedBy: 'jane.smith',
        assignedTo: 'john.does',
        affectedArea: 'Assembly Line A',
        processId: 'PROC-001',
      });

      expect(defect).toBeDefined();
      expect(defect.id).toMatch(/^DEF-/);
      expect(defect.status).toBe('open');
      expect(defect.priority).toBe(1); // critical = priority 1
    });

    test('Should set priority based on severity', () => {
      const criticalDefect = service.reportDefect({
        title: 'Critical Issue',
        description: 'Critical issue',
        severity: 'critical',
        reportedBy: 'user1',
      });

      const lowDefect = service.reportDefect({
        title: 'Low Issue',
        description: 'Low issue',
        severity: 'low',
        reportedBy: 'user1',
      });

      expect(criticalDefect.priority).toBe(1);
      expect(lowDefect.priority).toBe(4);
    });

    test('Should throw error for missing severity', () => {
      expect(() => {
        service.reportDefect({
          title: 'Test Defect',
          // missing severity
        });
      }).toThrow('Missing required fields');
    });

    test('Should update defect status', () => {
      const defect = service.reportDefect({
        title: 'Test Defect',
        severity: 'high',
        reportedBy: 'user1',
      });

      const updated = service.updateDefectStatus(
        defect.id,
        'resolved',
        'Fixed by replacing component'
      );

      expect(updated.status).toBe('resolved');
      expect(updated.resolvedAt).toBeDefined();
      expect(updated.resolution).toBe('Fixed by replacing component');
    });

    test('Should get defects with filtering', () => {
      service.reportDefect({
        title: 'Open Defect',
        severity: 'high',
        reportedBy: 'user1',
        assignedTo: 'user2',
      });

      service.reportDefect({
        title: 'Closed Defect',
        severity: 'low',
        reportedBy: 'user1',
        assignedTo: 'user3',
      });

      const openDefects = service.getDefects({ status: 'open' });
      expect(openDefects.length).toBe(2);

      const highSeverityDefects = service.getDefects({ severity: 'high' });
      expect(highSeverityDefects.length).toBe(1);
    });

    test('Should sort defects by priority', () => {
      service.reportDefect({
        title: 'Low Priority',
        severity: 'low',
        reportedBy: 'user1',
      });

      service.reportDefect({
        title: 'Critical Priority',
        severity: 'critical',
        reportedBy: 'user1',
      });

      const defects = service.getDefects();
      expect(defects[0].severity).toBe('critical');
      expect(defects[1].severity).toBe('low');
    });

    test('Should track defect by assigned owner', () => {
      service.reportDefect({
        title: 'Assigned to User A',
        severity: 'high',
        reportedBy: 'user1',
        assignedTo: 'userA',
      });

      service.reportDefect({
        title: 'Assigned to User B',
        severity: 'medium',
        reportedBy: 'user1',
        assignedTo: 'userB',
      });

      const userADefects = service.getDefects({ assignedTo: 'userA' });
      expect(userADefects.length).toBe(1);
      expect(userADefects[0].assignedTo).toBe('userA');
    });
  });

  /**
   * ROOT CAUSE ANALYSIS TESTS
   */
  describe('ROOT CAUSE ANALYSIS & CAPA', () => {
    test('Should perform root cause analysis', () => {
      const defect = service.reportDefect({
        title: 'Test Defect',
        severity: 'high',
        reportedBy: 'user1',
      });

      const rca = service.performRootCauseAnalysis(defect.id, {
        primaryCause: 'Inadequate maintenance',
        contributingFactors: ['Lack of training', 'Resource constraints'],
        analysis: 'The root cause was identified through 5-Why analysis',
        analyzedBy: 'analyst1',
      });

      expect(rca).toBeDefined();
      expect(rca.id).toMatch(/^RCA-/);
      expect(rca.primaryCause).toBe('Inadequate maintenance');
      expect(defect.rootCause).toBeDefined();
    });

    test('Should create correction action', () => {
      const defect = service.reportDefect({
        title: 'Test Defect',
        severity: 'high',
        reportedBy: 'user1',
      });

      const action = service.createCorrectionAction(defect.id, {
        actionType: 'corrective',
        description: 'Implement preventive maintenance schedule',
        targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        owner: 'manager1',
        expectedBenefit: 'Reduce defects by 50%',
        implementation: 'Train team and schedule maintenance',
      });

      expect(action).toBeDefined();
      expect(action.id).toMatch(/^CAPA-/);
      expect(action.actionType).toBe('corrective');
      expect(action.status).toBe('planned');
    });

    test('Should link CAPA to defect', () => {
      const defect = service.reportDefect({
        title: 'Test Defect',
        severity: 'medium',
        reportedBy: 'user1',
      });

      const action = service.createCorrectionAction(defect.id, {
        actionType: 'preventive',
        description: 'Implement preventive measures',
        targetDate: new Date(),
        owner: 'manager1',
        expectedBenefit: 'Prevent future defects',
      });

      const updated = service.getDefects()[0];
      expect(updated.correctionAction).toBeDefined();
      expect(updated.correctionAction.id).toBe(action.id);
    });

    test('Should distinguish between corrective and preventive actions', () => {
      const defect = service.reportDefect({
        title: 'Test Defect',
        severity: 'high',
        reportedBy: 'user1',
      });

      const correctiveAction = service.createCorrectionAction(defect.id, {
        actionType: 'corrective',
        description: 'Fix existing issue',
        targetDate: new Date(),
        owner: 'manager1',
      });

      expect(correctiveAction.actionType).toBe('corrective');
    });
  });

  /**
   * AUDIT TESTS
   */
  describe('AUDIT & COMPLIANCE', () => {
    test('Should conduct audit', () => {
      const audit = service.conductAudit({
        type: 'internal',
        processId: 'PROC-001',
        department: 'production',
        auditor: 'auditor1',
        auditDate: new Date(),
        scope: 'Quality management system',
      });

      expect(audit).toBeDefined();
      expect(audit.id).toMatch(/^AUD-/);
      expect(audit.status).toBe('in-progress');
      expect(audit.findings.length).toBe(0);
    });

    test('Should add audit findings', () => {
      const audit = service.conductAudit({
        type: 'internal',
        auditor: 'auditor1',
        auditDate: new Date(),
      });

      const finding = service.addAuditFinding(audit.id, {
        description: 'Documentation incomplete',
        category: 'Documentation',
        severity: 'minor',
        evidence: 'Missing process flow charts',
      });

      expect(finding).toBeDefined();
      expect(finding.id).toMatch(/^FIND-/);

      const updated = service.audits[0];
      expect(updated.findings.length).toBe(1);
      expect(updated.findings[0].description).toBe('Documentation incomplete');
    });

    test('Should track non-conformities for major findings', () => {
      const audit = service.conductAudit({
        type: 'internal',
        auditor: 'auditor1',
        auditDate: new Date(),
      });

      service.addAuditFinding(audit.id, {
        description: 'Major issue',
        category: 'Process',
        severity: 'major',
        evidence: 'Missing controls',
      });

      service.addAuditFinding(audit.id, {
        description: 'Minor issue',
        category: 'Documentation',
        severity: 'minor',
        evidence: 'Formatting issue',
      });

      const updated = service.audits[0];
      expect(updated.nonConformities.length).toBe(1);
      expect(updated.findings.length).toBe(2);
    });

    test('Should distinguish audit types', () => {
      const internalAudit = service.conductAudit({
        type: 'internal',
        auditor: 'auditor1',
        auditDate: new Date(),
      });

      const complianceAudit = service.conductAudit({
        type: 'compliance',
        auditor: 'auditor2',
        auditDate: new Date(),
      });

      expect(internalAudit.type).toBe('internal');
      expect(complianceAudit.type).toBe('compliance');
    });
  });

  /**
   * REPORTING TESTS
   */
  describe('ADVANCED REPORTING', () => {
    test('Should generate quality report', () => {
      service.createQualityMetric({
        name: 'Metric 1',
        type: 'conformance',
        category: 'quality',
        targetValue: 99,
        unit: 'percent',
        department: 'production',
      });

      service.reportDefect({
        title: 'Defect 1',
        severity: 'high',
        reportedBy: 'user1',
        affectedArea: 'Area A',
      });

      const report = service.generateQualityReport({
        type: 'executive',
        period: { startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), endDate: new Date() },
        includeDefects: true,
        includeAudits: false,
      });

      expect(report).toBeDefined();
      expect(report.id).toMatch(/^RPT-/);
      expect(report.type).toBe('executive');
      expect(report.sections.metricsSummary).toBeDefined();
      expect(report.sections.defectAnalysis).toBeDefined();
    });

    test('Should include metrics summary in report', () => {
      const metric1 = service.createQualityMetric({
        name: 'Metric On Track',
        type: 'conformance',
        category: 'quality',
        targetValue: 100,
        unit: 'percent',
        department: 'production',
      });

      service.updateMetricValue(metric1.id, 98); // Mark as on-track

      const report = service.generateQualityReport({
        type: 'detailed',
        period: { startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), endDate: new Date() },
      });

      expect(report.sections.metricsSummary).toBeDefined();
      expect(report.sections.metricsSummary.total).toBeGreaterThan(0);
      expect(report.sections.metricsSummary.onTrack).toBeGreaterThan(0);
    });

    test('Should calculate defect statistics in report', () => {
      service.reportDefect({
        title: 'Critical Defect',
        severity: 'critical',
        reportedBy: 'user1',
        affectedArea: 'Line A',
      });

      service.reportDefect({
        title: 'High Defect',
        severity: 'high',
        reportedBy: 'user1',
        affectedArea: 'Line A',
      });

      service.reportDefect({
        title: 'Low Defect',
        severity: 'low',
        reportedBy: 'user1',
        affectedArea: 'Line A',
      });

      const report = service.generateQualityReport({
        type: 'detailed',
        period: { startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), endDate: new Date() },
        includeDefects: true,
      });

      expect(report.sections.defectAnalysis.total).toBe(3);
      expect(report.sections.defectAnalysis.bySeverity.critical).toBe(1);
      expect(report.sections.defectAnalysis.bySeverity.high).toBe(1);
      expect(report.sections.defectAnalysis.bySeverity.low).toBe(1);
    });

    test('Should filter report by department', () => {
      service.reportDefect({
        title: 'Prod Defect',
        severity: 'high',
        reportedBy: 'user1',
        affectedArea: 'Production',
      });

      service.reportDefect({
        title: 'Ship Defect',
        severity: 'medium',
        reportedBy: 'user1',
        affectedArea: 'Shipping',
      });

      const report = service.generateQualityReport({
        type: 'detailed',
        period: { startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), endDate: new Date() },
        departments: ['Production'],
        includeDefects: true,
      });

      expect(report.sections.defectAnalysis.total).toBe(1);
    });
  });

  /**
   * DASHBOARD TESTS
   */
  describe('QUALITY DASHBOARDS', () => {
    test('Should create quality dashboard', () => {
      const metric = service.createQualityMetric({
        name: 'Test Metric',
        type: 'conformance',
        category: 'quality',
        targetValue: 99,
        unit: 'percent',
        department: 'production',
      });

      const dashboard = service.createQualityDashboard({
        name: 'Production Dashboard',
        metrics: [metric.id],
        targetAudience: ['production-manager'],
        customizations: { refreshInterval: 1800 },
      });

      expect(dashboard).toBeDefined();
      expect(dashboard.id).toMatch(/^DASH-/);
      expect(dashboard.name).toBe('Production Dashboard');
      expect(dashboard.status).toBe('active');
      expect(dashboard.widgets.length).toBeGreaterThan(0);
    });

    test('Should generate dashboard widgets', () => {
      const metric = service.createQualityMetric({
        name: 'Widget Test',
        type: 'efficiency',
        category: 'quality',
        targetValue: 95,
        unit: 'percent',
        department: 'production',
      });

      const dashboard = service.createQualityDashboard({
        name: 'Test Dashboard',
        metrics: [metric.id],
      });

      expect(dashboard.widgets).toBeDefined();
      expect(dashboard.widgets.length).toBeGreaterThan(0);
      expect(dashboard.widgets.some((w) => w.type === 'kpi-cards')).toBe(true);
      expect(dashboard.widgets.some((w) => w.type === 'pie-chart')).toBe(true);
    });

    test('Should get dashboard data with widget data', () => {
      const metric = service.createQualityMetric({
        name: 'Dashboard Data Test',
        type: 'conformance',
        category: 'quality',
        targetValue: 100,
        unit: 'percent',
        department: 'production',
      });

      service.updateMetricValue(metric.id, 98);

      const dashboard = service.createQualityDashboard({
        name: 'Data Dashboard',
        metrics: [metric.id],
      });

      const data = service.getQualityDashboardData(dashboard.id);

      expect(data).toBeDefined();
      expect(data.dashboard).toBe('Data Dashboard');
      expect(data.widgets).toBeDefined();
      expect(data.summary).toBeDefined();
      expect(data.summary.totalMetrics).toBe(1);
    });

    test('Should show open defects in dashboard summary', () => {
      service.reportDefect({
        title: 'Open Defect',
        severity: 'high',
        reportedBy: 'user1',
      });

      const dashboard = service.createQualityDashboard({
        name: 'Defect Dashboard',
        metrics: [],
      });

      const data = service.getQualityDashboardData(dashboard.id);

      expect(data.summary.openDefects).toBe(1);
    });
  });

  /**
   * TREND ANALYSIS TESTS
   */
  describe('TREND ANALYSIS & FORECASTING', () => {
    test('Should analyze metric trends', () => {
      const metric = service.createQualityMetric({
        name: 'Trend Metric',
        type: 'efficiency',
        category: 'quality',
        targetValue: 90,
        unit: 'percent',
        department: 'production',
      });

      service.updateMetricValue(metric.id, 85);
      service.updateMetricValue(metric.id, 87);
      service.updateMetricValue(metric.id, 89);

      const analysis = service.analyzeTrends(metric.id, 90);

      expect(analysis).toBeDefined();
      expect(analysis.metricId).toBe(metric.id);
      expect(analysis.dataPoints).toBe(3);
      expect(analysis.trend).toBe('improving');
      expect(analysis.average).toBeDefined();
      expect(analysis.current).toBe(89);
    });

    test('Should calculate variance for trend analysis', () => {
      const metric = service.createQualityMetric({
        name: 'Variance Test',
        type: 'efficiency',
        category: 'quality',
        targetValue: 100,
        unit: 'percent',
        department: 'production',
      });

      service.updateMetricValue(metric.id, 90);
      service.updateMetricValue(metric.id, 100);
      service.updateMetricValue(metric.id, 110);

      const analysis = service.analyzeTrends(metric.id);

      expect(analysis.variance).toBeDefined();
      expect(parseFloat(analysis.variance)).toBeGreaterThan(0);
    });

    test('Should project next 30 days in trend analysis', () => {
      const metric = service.createQualityMetric({
        name: 'Projection Test',
        type: 'efficiency',
        category: 'quality',
        targetValue: 100,
        unit: 'percent',
        department: 'production',
      });

      service.updateMetricValue(metric.id, 95);
      service.updateMetricValue(metric.id, 96);
      service.updateMetricValue(metric.id, 97);

      const analysis = service.analyzeTrends(metric.id);

      expect(analysis.projectedNext30Days).toBeDefined();
      expect(parseFloat(analysis.projectedNext30Days)).toBeGreaterThan(0);
    });

    test('Should return insufficient data when no measurements', () => {
      const metric = service.createQualityMetric({
        name: 'No Data Metric',
        type: 'conformance',
        category: 'quality',
        targetValue: 99,
        unit: 'percent',
        department: 'production',
      });

      const analysis = service.analyzeTrends(metric.id, 30);

      expect(analysis.trend).toBe('insufficient-data');
      expect(analysis.dataPoints).toBe(0);
    });
  });

  /**
   * PROCESS MANAGEMENT TESTS
   */
  describe('PROCESS MANAGEMENT', () => {
    test('Should define process', () => {
      const process = service.defineProcess({
        name: 'Quality Inspection',
        description: 'Inspection process for products',
        owner: 'manager1',
        steps: ['Inspect', 'Document', 'Report'],
        inputs: ['Product'],
        outputs: ['Inspection Report'],
        kpis: ['Inspection Accuracy'],
      });

      expect(process).toBeDefined();
      expect(process.id).toMatch(/^PROC-/);
      expect(process.name).toBe('Quality Inspection');
      expect(process.status).toBe('active');
      expect(process.steps.length).toBe(3);
    });

    test('Should track process effectiveness', () => {
      const process = service.defineProcess({
        name: 'Test Process',
        description: 'Test process',
        owner: 'manager1',
        steps: ['Step 1', 'Step 2'],
        inputs: ['Input 1'],
        outputs: ['Output 1'],
      });

      expect(process.effectiveness).toBeNull();
      expect(process.lastReviewDate).toBeDefined();
    });

    test('Should associate KPIs with process', () => {
      const metric = service.createQualityMetric({
        name: 'Process KPI',
        type: 'conformance',
        category: 'quality',
        targetValue: 99,
        unit: 'percent',
        department: 'production',
      });

      const process = service.defineProcess({
        name: 'KPI Process',
        description: 'Process with KPI',
        owner: 'manager1',
        kpis: [metric.id],
      });

      expect(process.kpis.length).toBe(1);
      expect(process.kpis[0]).toBe(metric.id);
    });
  });

  /**
   * INTEGRATION TESTS
   */
  describe('INTEGRATION TESTS', () => {
    test('Should complete end-to-end quality management workflow', () => {
      // Create metric
      const metric = service.createQualityMetric({
        name: 'Production Quality',
        type: 'conformance',
        category: 'quality',
        targetValue: 99,
        unit: 'percent',
        department: 'production',
      });

      // Update metric value
      service.updateMetricValue(metric.id, 97);

      // Report defect
      const defect = service.reportDefect({
        title: 'Quality Issue',
        severity: 'high',
        reportedBy: 'user1',
        affectedArea: 'production',
      });

      // Perform RCA
      const rca = service.performRootCauseAnalysis(defect.id, {
        primaryCause: 'Machine calibration',
        contributingFactors: ['Lack of maintenance'],
        analysis: '5-Why analysis conducted',
        analyzedBy: 'analyst1',
      });

      // Create CAPA
      const action = service.createCorrectionAction(defect.id, {
        actionType: 'corrective',
        description: 'Recalibrate machine',
        targetDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        owner: 'technician1',
        expectedBenefit: 'Improve quality to 99%',
      });

      // Generate report
      const report = service.generateQualityReport({
        type: 'executive',
        period: { startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), endDate: new Date() },
      });

      expect(metric).toBeDefined();
      expect(defect).toBeDefined();
      expect(rca).toBeDefined();
      expect(action).toBeDefined();
      expect(report).toBeDefined();
    });

    test('Should manage multiple defects and track resolutions', () => {
      const defect1 = service.reportDefect({
        title: 'Defect 1',
        severity: 'critical',
        reportedBy: 'user1',
      });

      const defect2 = service.reportDefect({
        title: 'Defect 2',
        severity: 'high',
        reportedBy: 'user1',
      });

      service.updateDefectStatus(defect1.id, 'resolved', 'Fixed');

      const openDefects = service.getDefects({ status: 'open' });
      const allDefects = service.getDefects();

      expect(allDefects.length).toBe(2);
      expect(openDefects.length).toBe(1);
    });

    test('Should generate comprehensive quality dashboard', () => {
      // Create multiple metrics
      const metric1 = service.createQualityMetric({
        name: 'Metric 1',
        type: 'conformance',
        category: 'quality',
        targetValue: 99,
        unit: 'percent',
        department: 'production',
      });

      const metric2 = service.createQualityMetric({
        name: 'Metric 2',
        type: 'efficiency',
        category: 'quality',
        targetValue: 95,
        unit: 'percent',
        department: 'production',
      });

      service.updateMetricValue(metric1.id, 98);
      service.updateMetricValue(metric2.id, 94);

      // Create defects
      service.reportDefect({
        title: 'Issue 1',
        severity: 'high',
        reportedBy: 'user1',
      });

      // Create dashboard
      const dashboard = service.createQualityDashboard({
        name: 'Executive Dashboard',
        metrics: [metric1.id, metric2.id],
        targetAudience: ['executives'],
      });

      const data = service.getQualityDashboardData(dashboard.id);

      expect(data.summary.totalMetrics).toBe(2);
      expect(data.summary.metricsOnTrack).toBeGreaterThan(0);
      expect(data.summary.openDefects).toBe(1);
      expect(data.widgets).toBeDefined();
    });

    test('Should maintain metrics, defects, and audits independently', () => {
      const metric = service.createQualityMetric({
        name: 'Metric',
        type: 'conformance',
        category: 'quality',
        targetValue: 99,
        unit: 'percent',
        department: 'production',
      });

      const defect = service.reportDefect({
        title: 'Defect',
        severity: 'high',
        reportedBy: 'user1',
      });

      const audit = service.conductAudit({
        type: 'internal',
        auditor: 'auditor1',
        auditDate: new Date(),
      });

      expect(service.qualityMetrics.length).toBe(1);
      expect(service.defects.length).toBe(1);
      expect(service.audits.length).toBe(1);
    });
  });

  /**
   * DATA VALIDATION TESTS
   */
  describe('DATA VALIDATION & ISOLATION', () => {
    test('Should validate required metric fields', () => {
      expect(() => {
        service.createQualityMetric({
          // name is required
          type: 'conformance',
          targetValue: 99,
        });
      }).toThrow();

      expect(() => {
        service.createQualityMetric({
          name: 'Metric',
          // type is required
          targetValue: 99,
        });
      }).toThrow();
    });

    test('Should validate defect severity levels', () => {
      const defect = service.reportDefect({
        title: 'Test',
        severity: 'unprecedented', // invalid severity
        reportedBy: 'user1',
      });

      // Should still create but may not have standard priority
      expect(defect).toBeDefined();
    });

    test('Should isolate data between different metric types', () => {
      const conformanceMetric = service.createQualityMetric({
        name: 'Conformance',
        type: 'conformance',
        category: 'quality',
        targetValue: 99,
        unit: 'percent',
        department: 'production',
      });

      const efficiencyMetric = service.createQualityMetric({
        name: 'Efficiency',
        type: 'efficiency',
        category: 'quality',
        targetValue: 95,
        unit: 'percent',
        department: 'production',
      });

      const conformanceMetrics = service.getQualityMetrics({ type: 'conformance' });
      const efficiencyMetrics = service.getQualityMetrics({ type: 'efficiency' });

      expect(conformanceMetrics.length).toBe(1);
      expect(efficiencyMetrics.length).toBe(1);
      expect(conformanceMetrics[0].type).not.toBe(efficiencyMetrics[0].type);
    });
  });
});
