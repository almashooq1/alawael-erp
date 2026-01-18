/**
 * Workflow Analytics Service
 * خدمة تحليلات متقدمة لسير العمل
 *
 * توفر:
 * - تقارير شاملة
 * - إحصائيات تفصيلية
 * - تنبؤات الاتجاهات
 * - تحليل المسارات
 */

class WorkflowAnalyticsService {
  /**
   * إنشاء تقرير تنفيذي
   */
  static generateExecutiveReport(workflows) {
    const report = {
      generatedAt: new Date().toISOString(),
      period: this.determinePeriod(workflows),
      summary: this.generateSummary(workflows),
      keyMetrics: this.calculateKeyMetrics(workflows),
      trends: this.analyzeTrends(workflows),
      insights: this.generateInsights(workflows),
      recommendations: this.generateRecommendations(workflows),
    };

    return report;
  }

  /**
   * تحديد فترة التقرير
   */
  static determinePeriod(workflows) {
    if (workflows.length === 0) {
      return { start: null, end: null, days: 0 };
    }

    const dates = workflows
      .map(w => w.createdAt)
      .filter(d => d)
      .map(d => new Date(d).getTime())
      .sort((a, b) => a - b);

    if (dates.length === 0) {
      return { start: null, end: null, days: 0 };
    }

    const start = new Date(dates[0]);
    const end = new Date(dates[dates.length - 1]);
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
      days: Math.max(1, days),
    };
  }

  /**
   * توليد ملخص الأداء
   */
  static generateSummary(workflows) {
    const summary = {
      totalWorkflows: workflows.length,
      statuses: {
        completed: 0,
        inProgress: 0,
        pending: 0,
        rejected: 0,
        revisionRequired: 0,
      },
      priorities: {
        low: 0,
        normal: 0,
        high: 0,
        urgent: 0,
      },
      categories: {},
    };

    workflows.forEach(w => {
      // عد الحالات
      if (w.status in summary.statuses) {
        summary.statuses[w.status]++;
      }

      // عد الأولويات
      if (w.priority && w.priority in summary.priorities) {
        summary.priorities[w.priority]++;
      }

      // عد الفئات
      if (w.category) {
        summary.categories[w.category] = (summary.categories[w.category] || 0) + 1;
      }
    });

    return summary;
  }

  /**
   * حساب المؤشرات الرئيسية
   */
  static calculateKeyMetrics(workflows) {
    const completedWorkflows = workflows.filter(w => w.completedAt);
    const rejectedWorkflows = workflows.filter(w => w.status === 'rejected');
    const breachedWorkflows = workflows.filter(w => w.sla && w.sla.breached);

    const metrics = {
      completionRate: workflows.length > 0 ? (completedWorkflows.length / workflows.length) * 100 : 0,
      rejectionRate: workflows.length > 0 ? (rejectedWorkflows.length / workflows.length) * 100 : 0,
      slaComplianceRate: workflows.length > 0 ? 100 - (breachedWorkflows.length / workflows.length) * 100 : 100,
      averageCompletionTime: 0,
      averageApprovedTime: 0,
      throughput: 0,
    };

    // حساب متوسط وقت الإنجاز
    if (completedWorkflows.length > 0) {
      const totalTime = completedWorkflows.reduce((sum, w) => {
        return sum + (w.completedAt - w.createdAt);
      }, 0);
      metrics.averageCompletionTime = totalTime / completedWorkflows.length;
    }

    // حساب متوسط وقت الموافقة
    const approvedWorkflows = workflows.filter(w => w.currentStage && w.currentStage > 0);
    if (approvedWorkflows.length > 0) {
      const totalApprovalTime = approvedWorkflows.reduce((sum, w) => {
        return sum + (w.updatedAt - w.createdAt);
      }, 0);
      metrics.averageApprovedTime = totalApprovalTime / approvedWorkflows.length;
    }

    // حساب الإنتاجية (عدد سير العمل المكتملة في اليوم)
    const period = this.determinePeriod(workflows);
    if (period.days > 0) {
      metrics.throughput = completedWorkflows.length / period.days;
    }

    return metrics;
  }

  /**
   * تحليل الاتجاهات
   */
  static analyzeTrends(workflows) {
    const trends = {
      daily: {},
      weekly: {},
      byStatus: {},
      byPriority: {},
    };

    workflows.forEach(w => {
      if (!w.createdAt) return;

      const date = new Date(w.createdAt);
      const dateStr = date.toISOString().split('T')[0];
      const weekStart = new Date(date);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekStr = weekStart.toISOString().split('T')[0];

      // اتجاه يومي
      trends.daily[dateStr] = (trends.daily[dateStr] || 0) + 1;

      // اتجاه أسبوعي
      trends.weekly[weekStr] = (trends.weekly[weekStr] || 0) + 1;

      // بالحالة
      trends.byStatus[w.status] = (trends.byStatus[w.status] || 0) + 1;

      // بالأولوية
      trends.byPriority[w.priority || 'unknown'] = (trends.byPriority[w.priority || 'unknown'] || 0) + 1;
    });

    return trends;
  }

  /**
   * توليد الرؤى والملاحظات
   */
  static generateInsights(workflows) {
    const insights = [];
    const metrics = this.calculateKeyMetrics(workflows);
    const summary = this.generateSummary(workflows);

    // رؤية عن معدل الإنجاز
    if (metrics.completionRate > 80) {
      insights.push({
        type: 'positive',
        title: 'معدل إنجاز عالي',
        description: `معدل الإنجاز ${metrics.completionRate.toFixed(1)}% يشير إلى أداء قوية`,
      });
    } else if (metrics.completionRate < 50) {
      insights.push({
        type: 'critical',
        title: 'معدل إنجاز منخفض',
        description: `معدل الإنجاز ${metrics.completionRate.toFixed(1)}% يحتاج تحسين عاجل`,
      });
    }

    // رؤية عن معدل الرفض
    if (metrics.rejectionRate > 20) {
      insights.push({
        type: 'warning',
        title: 'معدل رفض مرتفع',
        description: `معدل الرفض ${metrics.rejectionRate.toFixed(1)}% يشير إلى مشاكل جودة`,
      });
    }

    // رؤية عن امتثال SLA
    if (metrics.slaComplianceRate < 80) {
      insights.push({
        type: 'critical',
        title: 'امتثال SLA منخفض',
        description: `معدل الامتثال ${metrics.slaComplianceRate.toFixed(1)}% أقل من الهدف`,
      });
    }

    // رؤية عن الأولويات
    const highPriority = summary.priorities.high || 0;
    const urgentPriority = summary.priorities.urgent || 0;
    const totalHigh = highPriority + urgentPriority;

    if (totalHigh > workflows.length * 0.3) {
      insights.push({
        type: 'warning',
        title: 'حصة عالية من الطلبات ذات الأولوية',
        description: `${((totalHigh / workflows.length) * 100).toFixed(1)}% من الطلبات لها أولوية عالية`,
      });
    }

    // رؤية عن الإنتاجية
    if (metrics.throughput > 10) {
      insights.push({
        type: 'positive',
        title: 'إنتاجية عالية',
        description: `متوسط ${metrics.throughput.toFixed(1)} طلب مكتمل يومياً`,
      });
    }

    return insights;
  }

  /**
   * توليد التوصيات
   */
  static generateRecommendations(workflows) {
    const recommendations = [];
    const metrics = this.calculateKeyMetrics(workflows);
    const summary = this.generateSummary(workflows);

    // التوصية 1: تحسين معدل الإنجاز
    if (metrics.completionRate < 70) {
      recommendations.push({
        priority: 'high',
        title: 'تسريع عملية الموافقة',
        actions: ['تقليل عدد المراحل غير الضرورية', 'تفويض الصلاحيات لتسريع الموافقة', 'تحديد مهل زمنية محددة لكل مرحلة'],
        expectedImpact: 'زيادة معدل الإنجاز بنسبة 20-30%',
      });
    }

    // التوصية 2: تحسين جودة الطلبات
    if (metrics.rejectionRate > 10) {
      recommendations.push({
        priority: 'high',
        title: 'تحسين جودة الطلبات',
        actions: ['توفير قوالب موحدة للطلبات', 'تدريب المستخدمين على المتطلبات', 'إضافة التحقق المسبق من البيانات'],
        expectedImpact: 'تقليل معدل الرفض بنسبة 50%',
      });
    }

    // التوصية 3: تحسين امتثال SLA
    if (metrics.slaComplianceRate < 80) {
      recommendations.push({
        priority: 'critical',
        title: 'تحسين امتثال SLA',
        actions: ['مراجعة مهل SLA الحالية', 'إضافة تنبيهات تلقائية قبل الانتهاء', 'تحديد نقاط الاختناق وحلها'],
        expectedImpact: 'زيادة امتثال SLA إلى 95%',
      });
    }

    // التوصية 4: إدارة حصة الأولويات
    const highPriority = (summary.priorities.high || 0) + (summary.priorities.urgent || 0);
    if (highPriority / workflows.length > 0.3) {
      recommendations.push({
        priority: 'medium',
        title: 'إعادة تقييم معايير الأولوية',
        actions: ['مراجعة معايير تصنيف الأولوية', 'تقليل عدد الطلبات ذات الأولوية العالية', 'تحديد معايير واضحة للأولوية'],
        expectedImpact: 'توازن أفضل في توزيع الموارد',
      });
    }

    return recommendations;
  }

  /**
   * تحليل مسارات سير العمل
   */
  static analyzeWorkflowPaths(workflows) {
    const paths = new Map();

    workflows.forEach(w => {
      if (!w.stages) return;

      const pathKey = w.stages.map(s => s.status).join(' -> ');

      if (!paths.has(pathKey)) {
        paths.set(pathKey, {
          path: pathKey,
          count: 0,
          stagesCount: 0,
          totalTime: 0,
          statuses: {},
        });
      }

      const pathData = paths.get(pathKey);
      pathData.count++;
      pathData.stagesCount = w.stages.length;

      if (w.completedAt && w.createdAt) {
        pathData.totalTime += w.completedAt - w.createdAt;
      }

      pathData.statuses[w.status] = (pathData.statuses[w.status] || 0) + 1;
    });

    // حساب متوسطات
    return Array.from(paths.values())
      .map(p => ({
        ...p,
        averageTime: p.count > 0 ? p.totalTime / p.count : 0,
        frequency: p.count,
      }))
      .sort((a, b) => b.frequency - a.frequency);
  }

  /**
   * تنبؤ الاتجاهات المستقبلية
   */
  static forecastTrends(workflows) {
    const completedWorkflows = workflows.filter(w => w.completedAt);
    const recentWorkflows = completedWorkflows.filter(w => {
      const daysAgo = (new Date() - new Date(w.completedAt)) / (1000 * 60 * 60 * 24);
      return daysAgo <= 30; // آخر 30 يوم
    });

    const forecast = {
      expectedCompletionRate: 0,
      estimatedRejectionRate: 0,
      projectedSLACompliance: 0,
      confidence: 'low',
    };

    if (recentWorkflows.length > 0) {
      const rejectedRecent = recentWorkflows.filter(w => w.status === 'rejected').length;
      const breachedRecent = recentWorkflows.filter(w => w.sla && w.sla.breached).length;

      forecast.expectedCompletionRate = ((recentWorkflows.length - rejectedRecent) / recentWorkflows.length) * 100;
      forecast.estimatedRejectionRate = (rejectedRecent / recentWorkflows.length) * 100;
      forecast.projectedSLACompliance = 100 - (breachedRecent / recentWorkflows.length) * 100;
      forecast.confidence = recentWorkflows.length >= 10 ? 'high' : 'medium';
    }

    return forecast;
  }

  /**
   * تحليل الأداء المقارن
   */
  static comparePerformance(workflows1, workflows2, label1 = 'Period 1', label2 = 'Period 2') {
    const metrics1 = this.calculateKeyMetrics(workflows1);
    const metrics2 = this.calculateKeyMetrics(workflows2);

    const comparison = {
      label1,
      label2,
      metrics: {
        completionRate: {
          [label1]: metrics1.completionRate,
          [label2]: metrics2.completionRate,
          change: metrics2.completionRate - metrics1.completionRate,
          trend: metrics2.completionRate > metrics1.completionRate ? 'up' : 'down',
        },
        rejectionRate: {
          [label1]: metrics1.rejectionRate,
          [label2]: metrics2.rejectionRate,
          change: metrics2.rejectionRate - metrics1.rejectionRate,
          trend: metrics2.rejectionRate < metrics1.rejectionRate ? 'up' : 'down',
        },
        slaCompliance: {
          [label1]: metrics1.slaComplianceRate,
          [label2]: metrics2.slaComplianceRate,
          change: metrics2.slaComplianceRate - metrics1.slaComplianceRate,
          trend: metrics2.slaComplianceRate > metrics1.slaComplianceRate ? 'up' : 'down',
        },
      },
    };

    return comparison;
  }
}

module.exports = WorkflowAnalyticsService;
