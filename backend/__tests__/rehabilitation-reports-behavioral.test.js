'use strict';

const {
  RehabilitationReportsService,
} = require('../rehabilitation-services/rehabilitation-reports-service');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

describe('RehabilitationReportsService — behavioral', () => {
  let service;

  beforeEach(() => {
    service = new RehabilitationReportsService();
  });

  describe('templates', () => {
    it('initializes report templates', () => {
      const templates = service.templates;
      expect(Object.keys(templates)).toContain('individualProgress');
      expect(Object.keys(templates)).toContain('serviceStatistics');
      expect(Object.keys(templates)).toContain('outcomesReport');
      expect(Object.keys(templates)).toContain('complianceReport');
    });
  });

  describe('individual progress report', () => {
    it('generates an individual progress report', async () => {
      const report = await service.generateIndividualProgressReport('B-001');
      expect(report.type).toBe('individual_progress');
      expect(report.beneficiaryId).toBe('B-001');
      expect(report.status).toBe('generated');
      expect(report.sections.goalsStatus).toBeDefined();
    });

    it('stores generated report in memory', async () => {
      const report = await service.generateIndividualProgressReport('B-001');
      const stored = service.reports.get(report.id);
      expect(stored.id).toBe(report.id);
    });

    it('applies custom date options', async () => {
      const start = new Date('2024-01-01');
      const end = new Date('2024-01-31');
      const report = await service.generateIndividualProgressReport('B-001', {
        startDate: start,
        endDate: end,
      });
      expect(report.period.start.getTime()).toBe(start.getTime());
      expect(report.period.end.getTime()).toBe(end.getTime());
    });

    it('lists generated reports', async () => {
      await service.generateIndividualProgressReport('B-001');
      await delay(2);
      await service.generateIndividualProgressReport('B-002');
      const list = await service.listReports();
      expect(list.total).toBe(2);
    });

    it('filters reports by type', async () => {
      await service.generateIndividualProgressReport('B-001');
      await delay(2);
      await service.generateCenterStatisticsReport('C-001');
      const list = await service.listReports({ type: 'individual_progress' });
      expect(list.total).toBe(1);
    });
  });

  describe('center statistics report', () => {
    it('generates center statistics report', async () => {
      const report = await service.generateCenterStatisticsReport('C-001', 'monthly');
      expect(report.type).toBe('center_statistics');
      expect(report.centerId).toBe('C-001');
      expect(report.period).toBe('monthly');
      expect(report.statistics.beneficiaries).toBeDefined();
    });

    it('includes insights and recommendations', async () => {
      const report = await service.generateCenterStatisticsReport('C-001');
      expect(report.insights).toBeInstanceOf(Array);
      expect(report.recommendations).toBeInstanceOf(Array);
    });

    it('supports different period values', async () => {
      const report = await service.generateCenterStatisticsReport('C-001', 'quarterly');
      expect(report.period).toBe('quarterly');
    });
  });

  describe('outcomes report', () => {
    it('generates outcomes report', async () => {
      const report = await service.generateOutcomesReport('quarterly');
      expect(report.type).toBe('outcomes');
      expect(report.period).toBe('quarterly');
      expect(report.kpis.rehabilitation).toBeDefined();
      expect(report.kpis.employment).toBeDefined();
      expect(report.kpis.service).toBeDefined();
      expect(report.kpis.compliance).toBeDefined();
    });

    it('includes metrics with targets', async () => {
      const report = await service.generateOutcomesReport();
      const metrics = report.kpis.rehabilitation.metrics;
      expect(metrics.length).toBeGreaterThan(0);
      expect(metrics[0].target).toBeDefined();
    });

    it('includes analysis and action plan sections', async () => {
      const report = await service.generateOutcomesReport();
      expect(report.analysis).toBeDefined();
      expect(report.actionPlan).toBeDefined();
    });
  });

  describe('compliance report', () => {
    it('generates compliance report with overall score', async () => {
      const report = await service.generateComplianceReport('national');
      expect(report.type).toBe('compliance');
      expect(report.standardType).toBe('national');
      expect(report.overallCompliance.score).toBeGreaterThan(0);
    });

    it('calculates category overall scores', async () => {
      const report = await service.generateComplianceReport();
      const infrastructure = report.standards.infrastructure;
      expect(infrastructure.overallScore).toBeGreaterThan(0);
    });
  });

  describe('custom report builder', () => {
    it('builds a custom report from config', async () => {
      const report = await service.generateCustomReport({
        name: 'Custom',
        filters: { type: 'x' },
        columns: ['a', 'b'],
      });
      expect(report.type).toBe('custom');
      expect(report.name).toBe('Custom');
    });
  });

  describe('export helpers', () => {
    it('exports report with download url', async () => {
      const report = await service.generateIndividualProgressReport('B-001');
      const exported = await service.exportReport(report.id, 'pdf');
      expect(exported.reportId).toBe(report.id);
      expect(exported.format).toBe('pdf');
      expect(exported.downloadUrl).toContain(report.id);
    });

    it('throws when exporting non-existent report', async () => {
      await expect(service.exportReport('MISSING', 'pdf')).rejects.toThrow('التقرير غير موجود');
    });
  });

  describe('insights and recommendations', () => {
    it('generates insights from statistics', () => {
      const insights = service._generateInsights({
        beneficiaries: { new: 10, completed: 5 },
        outcomes: { satisfactionRate: 90 },
        performance: { averageWaitTime: 20 },
      });
      expect(insights.length).toBeGreaterThan(0);
    });

    it('generates center recommendations', () => {
      const recs = service._generateCenterRecommendations({
        staff: { ratio: 3 },
        outcomes: { employmentRate: 20 },
      });
      expect(recs.length).toBeGreaterThan(0);
    });
  });
});
