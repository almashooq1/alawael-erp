/**
 * ALAWAEL ERP - QUALITY MANAGEMENT & ADVANCED REPORTING SERVICE
 * Quality Metrics, Defect Tracking, Process Audits, Advanced Analytics
 * Phase 18 - Quality Management System
 *
 * Features:
 * - Quality metrics and KPIs tracking
 * - Defect and issue management
 * - Process audit and compliance
 * - Root cause analysis (RCA)
 * - Corrective/Preventive Actions (CAPA)
 * - Advanced BI dashboards
 * - Report generation and analytics
 * - Trend analysis and forecasting
 */

class QualityManagementService {
  constructor() {
    this.qualityMetrics = [];
    this.defects = [];
    this.audits = [];
    this.correctionActions = [];
    this.processes = [];
    this.reports = [];
    this.dashboards = [];
    this.kpis = new Map();
    this.performanceHistory = [];
  }

  /**
   * QUALITY METRICS MANAGEMENT
   */

  createQualityMetric(metricData) {
    try {
      const {
        name,
        type, // 'conformance', 'efficiency', 'safety', 'delivery'
        category,
        targetValue,
        unit,
        description,
        department,
        owner,
      } = metricData;

      if (!name || !type || !targetValue) {
        throw new Error('Missing required fields: name, type, targetValue');
      }

      const metric = {
        id: `QM-${Date.now()}`,
        name,
        type,
        category,
        targetValue,
        currentValue: 0,
        unit,
        description,
        department,
        owner,
        status: 'active',
        trend: 'stable',
        measurements: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        performanceStatus: 'on-track',
      };

      this.qualityMetrics.push(metric);
      return metric;
    } catch (error) {
      throw new Error(`Failed to create quality metric: ${error.message}`);
    }
  }

  updateMetricValue(metricId, newValue, comments = '') {
    try {
      const metric = this.qualityMetrics.find((m) => m.id === metricId);
      if (!metric) {
        throw new Error(`Metric ${metricId} not found`);
      }

      const previousValue = metric.currentValue;
      metric.currentValue = newValue;
      metric.updatedAt = new Date();

      const trend = newValue > previousValue ? 'increasing' : newValue < previousValue ? 'decreasing' : 'stable';
      metric.trend = trend;

      metric.performanceStatus = newValue >= metric.targetValue * 0.95 ? 'on-track' : 'at-risk';

      metric.measurements.push({
        value: newValue,
        timestamp: new Date(),
        comments,
        variance: newValue - metric.targetValue,
        variancePercent: ((newValue - metric.targetValue) / metric.targetValue) * 100,
      });

      this.performanceHistory.push({
        metricId,
        previousValue,
        newValue,
        timestamp: new Date(),
        trend,
      });

      return metric;
    } catch (error) {
      throw new Error(`Failed to update metric: ${error.message}`);
    }
  }

  getQualityMetrics(filters = {}) {
    try {
      let results = [...this.qualityMetrics];

      if (filters.type) {
        results = results.filter((m) => m.type === filters.type);
      }
      if (filters.department) {
        results = results.filter((m) => m.department === filters.department);
      }
      if (filters.status) {
        results = results.filter((m) => m.status === filters.status);
      }

      return results;
    } catch (error) {
      throw new Error(`Failed to get quality metrics: ${error.message}`);
    }
  }

  /**
   * DEFECT & ISSUE TRACKING
   */

  reportDefect(defectData) {
    try {
      const {
        title,
        description,
        severity, // 'critical', 'high', 'medium', 'low'
        category,
        reportedBy,
        assignedTo,
        affectedArea,
        processId,
      } = defectData;

      if (!title || !severity) {
        throw new Error('Missing required fields: title, severity');
      }

      const defect = {
        id: `DEF-${Date.now()}`,
        title,
        description,
        severity,
        category,
        status: 'open',
        reportedBy,
        assignedTo,
        affectedArea,
        processId,
        createdAt: new Date(),
        updatedAt: new Date(),
        resolvedAt: null,
        rootCause: null,
        correctionAction: null,
        comments: [],
        attachments: [],
        resolution: null,
        priority:
          severity === 'critical' ? 1 : severity === 'high' ? 2 : severity === 'medium' ? 3 : 4,
      };

      this.defects.push(defect);
      return defect;
    } catch (error) {
      throw new Error(`Failed to report defect: ${error.message}`);
    }
  }

  updateDefectStatus(defectId, newStatus, resolution = null) {
    try {
      const defect = this.defects.find((d) => d.id === defectId);
      if (!defect) {
        throw new Error(`Defect ${defectId} not found`);
      }

      defect.status = newStatus;
      defect.updatedAt = new Date();

      if (newStatus === 'resolved' || newStatus === 'closed') {
        defect.resolvedAt = new Date();
        defect.resolution = resolution;
      }

      return defect;
    } catch (error) {
      throw new Error(`Failed to update defect: ${error.message}`);
    }
  }

  getDefects(filters = {}) {
    try {
      let results = [...this.defects];

      if (filters.status) {
        results = results.filter((d) => d.status === filters.status);
      }
      if (filters.severity) {
        results = results.filter((d) => d.severity === filters.severity);
      }
      if (filters.assignedTo) {
        results = results.filter((d) => d.assignedTo === filters.assignedTo);
      }

      return results.sort((a, b) => a.priority - b.priority);
    } catch (error) {
      throw new Error(`Failed to get defects: ${error.message}`);
    }
  }

  /**
   * ROOT CAUSE ANALYSIS & CAPA
   */

  performRootCauseAnalysis(defectId, analysisData) {
    try {
      const defect = this.defects.find((d) => d.id === defectId);
      if (!defect) {
        throw new Error(`Defect ${defectId} not found`);
      }

      const { primaryCause, contributingFactors, analysis, analyzedBy } = analysisData;

      const rca = {
        id: `RCA-${Date.now()}`,
        defectId,
        primaryCause,
        contributingFactors: contributingFactors || [],
        analysis,
        analyzedBy,
        createdAt: new Date(),
        depth: 'root-level',
        verified: false,
      };

      defect.rootCause = rca;
      return rca;
    } catch (error) {
      throw new Error(`Failed to perform RCA: ${error.message}`);
    }
  }

  createCorrectionAction(defectId, actionData) {
    try {
      const defect = this.defects.find((d) => d.id === defectId);
      if (!defect) {
        throw new Error(`Defect ${defectId} not found`);
      }

      const { actionType, description, targetDate, owner, expectedBenefit, implementation } =
        actionData;

      const action = {
        id: `CAPA-${Date.now()}`,
        defectId,
        actionType, // 'corrective', 'preventive'
        description,
        status: 'planned',
        targetDate,
        owner,
        expectedBenefit,
        implementation,
        effectiveness: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: null,
        verificationResults: null,
      };

      this.correctionActions.push(action);
      defect.correctionAction = action;

      return action;
    } catch (error) {
      throw new Error(`Failed to create correction action: ${error.message}`);
    }
  }

  /**
   * AUDIT & COMPLIANCE
   */

  conductAudit(auditData) {
    try {
      const {
        type, // 'internal', 'external', 'compliance'
        processId,
        department,
        auditor,
        auditDate,
        scope,
      } = auditData;

      if (!type || !auditor || !auditDate) {
        throw new Error('Missing required fields: type, auditor, auditDate');
      }

      const audit = {
        id: `AUD-${Date.now()}`,
        type,
        processId,
        department,
        auditor,
        auditDate,
        scope,
        status: 'in-progress',
        findings: [],
        score: null,
        createdAt: new Date(),
        completedAt: null,
        nonConformities: [],
        recommendations: [],
      };

      this.audits.push(audit);
      return audit;
    } catch (error) {
      throw new Error(`Failed to conduct audit: ${error.message}`);
    }
  }

  addAuditFinding(auditId, finding) {
    try {
      const audit = this.audits.find((a) => a.id === auditId);
      if (!audit) {
        throw new Error(`Audit ${auditId} not found`);
      }

      const auditFinding = {
        id: `FIND-${Date.now()}`,
        description: finding.description,
        category: finding.category,
        severity: finding.severity, // 'major', 'minor'
        evidence: finding.evidence,
        timestamp: new Date(),
        status: 'open',
      };

      audit.findings.push(auditFinding);

      if (finding.severity === 'major') {
        audit.nonConformities.push(auditFinding);
      }

      return auditFinding;
    } catch (error) {
      throw new Error(`Failed to add audit finding: ${error.message}`);
    }
  }

  /**
   * ADVANCED REPORTING & ANALYTICS
   */

  generateQualityReport(reportConfig) {
    try {
      const {
        type, // 'executive', 'detailed', 'trend', 'comparative'
        period,
        metrics = [],
        departments = [],
        includeDefects = true,
        includeAudits = true,
      } = reportConfig;

      if (!type || !period) {
        throw new Error('Missing required fields: type, period');
      }

      const report = {
        id: `RPT-${Date.now()}`,
        type,
        period,
        generatedAt: new Date(),
        generatedBy: reportConfig.generatedBy || 'system',
        status: 'completed',
        sections: {},
      };

      // Quality Metrics Summary
      const selectedMetrics =
        metrics.length > 0 ? this.qualityMetrics.filter((m) => metrics.includes(m.id)) : this.qualityMetrics;

      report.sections.metricsSummary = {
        total: selectedMetrics.length,
        onTrack: selectedMetrics.filter((m) => m.performanceStatus === 'on-track').length,
        atRisk: selectedMetrics.filter((m) => m.performanceStatus === 'at-risk').length,
        metrics: selectedMetrics.map((m) => ({
          id: m.id,
          name: m.name,
          current: m.currentValue,
          target: m.targetValue,
          status: m.performanceStatus,
          variance: (m.currentValue - m.targetValue).toFixed(2),
        })),
      };

      // Defect Analysis
      if (includeDefects) {
        const relevantDefects = this.defects.filter((d) => {
          const isInPeriod = new Date(d.createdAt) >= new Date(period.startDate);
          const isInDept =
            departments.length === 0 || departments.includes(d.affectedArea);
          return isInPeriod && isInDept;
        });

        report.sections.defectAnalysis = {
          total: relevantDefects.length,
          open: relevantDefects.filter((d) => d.status === 'open').length,
          resolved: relevantDefects.filter((d) => d.status === 'resolved').length,
          bySeverity: {
            critical: relevantDefects.filter((d) => d.severity === 'critical').length,
            high: relevantDefects.filter((d) => d.severity === 'high').length,
            medium: relevantDefects.filter((d) => d.severity === 'medium').length,
            low: relevantDefects.filter((d) => d.severity === 'low').length,
          },
          avgResolutionTime:
            relevantDefects
              .filter((d) => d.resolvedAt)
              .reduce((sum, d) => sum + (d.resolvedAt - d.createdAt), 0) /
              Math.max(relevantDefects.filter((d) => d.resolvedAt).length, 1) /
              (1000 * 60 * 60 * 24),
        };
      }

      // Audit Summary
      if (includeAudits) {
        const relevantAudits = this.audits.filter(
          (a) =>
            new Date(a.auditDate) >= new Date(period.startDate) &&
            (departments.length === 0 || departments.includes(a.department))
        );

        report.sections.auditSummary = {
          total: relevantAudits.length,
          completed: relevantAudits.filter((a) => a.status === 'completed').length,
          inProgress: relevantAudits.filter((a) => a.status === 'in-progress').length,
          totalFindings: relevantAudits.reduce((sum, a) => sum + a.findings.length, 0),
          nonConformities: relevantAudits.reduce((sum, a) => sum + a.nonConformities.length, 0),
        };
      }

      this.reports.push(report);
      return report;
    } catch (error) {
      throw new Error(`Failed to generate quality report: ${error.message}`);
    }
  }

  createQualityDashboard(dashboardConfig) {
    try {
      const { name, metrics = [], targetAudience, customizations = {} } = dashboardConfig;

      const dashboard = {
        id: `DASH-${Date.now()}`,
        name,
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'active',
        metrics: metrics,
        targetAudience,
        customizations,
        widgets: this._generateDashboardWidgets(metrics),
        refreshInterval: customizations.refreshInterval || 3600, // seconds
        alerts: [],
      };

      this.dashboards.push(dashboard);
      return dashboard;
    } catch (error) {
      throw new Error(`Failed to create quality dashboard: ${error.message}`);
    }
  }

  _generateDashboardWidgets(metricIds) {
    const widgets = [];

    // KPI Cards
    widgets.push({
      id: `WID-${Date.now()}-kpi`,
      type: 'kpi-cards',
      title: 'Key Performance Indicators',
      metrics: metricIds.slice(0, 4),
    });

    // Trend Chart
    widgets.push({
      id: `WID-${Date.now()}-trend`,
      type: 'trend-chart',
      title: 'Performance Trends',
      timeRange: '30d',
    });

    // Defect Distribution
    widgets.push({
      id: `WID-${Date.now()}-defect`,
      type: 'pie-chart',
      title: 'Defects by Severity',
    });

    // Audit Status
    widgets.push({
      id: `WID-${Date.now()}-audit`,
      type: 'status-board',
      title: 'Audit Compliance Status',
    });

    return widgets;
  }

  /**
   * TREND ANALYSIS & FORECASTING
   */

  analyzeTrends(metricId, period = 90) {
    try {
      const metric = this.qualityMetrics.find((m) => m.id === metricId);
      if (!metric) {
        throw new Error(`Metric ${metricId} not found`);
      }

      const threshold = new Date(Date.now() - period * 24 * 60 * 60 * 1000);
      const measurements = metric.measurements.filter(
        (m) => new Date(m.timestamp) >= threshold
      );

      if (measurements.length === 0) {
        return {
          metricId,
          trend: 'insufficient-data',
          dataPoints: 0,
        };
      }

      const values = measurements.map((m) => m.value);
      const average = values.reduce((a, b) => a + b, 0) / values.length;
      const trend = values[values.length - 1] > average ? 'improving' : 'declining';

      const variance = Math.sqrt(
        values.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / values.length
      );

      return {
        metricId,
        metricName: metric.name,
        period,
        dataPoints: measurements.length,
        average: average.toFixed(2),
        current: values[values.length - 1],
        trend,
        variance: variance.toFixed(2),
        projectedNext30Days: (average + variance).toFixed(2),
        measurements: measurements.slice(-10), // Last 10 measurements
      };
    } catch (error) {
      throw new Error(`Failed to analyze trends: ${error.message}`);
    }
  }

  /**
   * PROCESS MANAGEMENT
   */

  defineProcess(processData) {
    try {
      const {
        name,
        description,
        owner,
        steps,
        inputs,
        outputs,
        kpis = [],
      } = processData;

      if (!name || !owner) {
        throw new Error('Missing required fields: name, owner');
      }

      const process = {
        id: `PROC-${Date.now()}`,
        name,
        description,
        owner,
        steps: steps || [],
        inputs: inputs || [],
        outputs: outputs || [],
        kpis: kpis,
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'active',
        documentation: null,
        lastReviewDate: new Date(),
        effectiveness: null,
      };

      this.processes.push(process);
      return process;
    } catch (error) {
      throw new Error(`Failed to define process: ${error.message}`);
    }
  }

  /**
   * QUALITY DASHBOARD ANALYTICS
   */

  getQualityDashboardData(dashboardId) {
    try {
      const dashboard = this.dashboards.find((d) => d.id === dashboardId);
      if (!dashboard) {
        throw new Error(`Dashboard ${dashboardId} not found`);
      }

      const dashboardData = {
        dashboard: dashboard.name,
        generatedAt: new Date(),
        widgets: dashboard.widgets.map((widget) => ({
          ...widget,
          data: this._getWidgetData(widget),
        })),
        summary: {
          totalMetrics: dashboard.metrics.length,
          metricsOnTrack: this.qualityMetrics.filter(
            (m) =>
              dashboard.metrics.includes(m.id) && m.performanceStatus === 'on-track'
          ).length,
          openDefects: this.defects.filter((d) => d.status === 'open').length,
          pendingAudits: this.audits.filter((a) => a.status === 'in-progress').length,
        },
      };

      return dashboardData;
    } catch (error) {
      throw new Error(`Failed to get dashboard data: ${error.message}`);
    }
  }

  _getWidgetData(widget) {
    const data = {};

    switch (widget.type) {
      case 'kpi-cards':
        data.cards = widget.metrics.map((metricId) => {
          const metric = this.qualityMetrics.find((m) => m.id === metricId);
          return metric
            ? {
                name: metric.name,
                value: metric.currentValue,
                target: metric.targetValue,
                status: metric.performanceStatus,
              }
            : null;
        });
        break;

      case 'pie-chart':
        data.critical = this.defects.filter((d) => d.severity === 'critical').length;
        data.high = this.defects.filter((d) => d.severity === 'high').length;
        data.medium = this.defects.filter((d) => d.severity === 'medium').length;
        data.low = this.defects.filter((d) => d.severity === 'low').length;
        break;

      case 'status-board':
        data.totalAudits = this.audits.length;
        data.completedAudits = this.audits.filter((a) => a.status === 'completed').length;
        data.complianceRate = (
          (this.audits.filter((a) => a.status === 'completed').length / this.audits.length) *
          100
        ).toFixed(1);
        break;
    }

    return data;
  }
}

module.exports = QualityManagementService;
