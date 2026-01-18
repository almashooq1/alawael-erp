/**
 * Workflow Enhancement Service
 * خدمات تحسين نظام سير العمل
 *
 * إضافة ميزات متقدمة:
 * - Smart Notifications
 * - Performance Analytics
 * - Workflow Optimization
 * - Risk Assessment
 */

class WorkflowEnhancementService {
  constructor() {
    this.performanceMetrics = new Map();
    this.bottlenecks = [];
    this.riskAssessments = new Map();
  }

  /**
   * تحليل أداء سير العمل
   */
  analyzeWorkflowPerformance(workflows) {
    const metrics = {
      averageCompletionTime: 0,
      totalWorkflows: workflows.length,
      averageApprovals: 0,
      bottlenecks: [],
      performanceScore: 0,
      recommendations: [],
    };

    if (workflows.length === 0) return metrics;

    // حساب متوسط وقت الإنجاز
    const completedWorkflows = workflows.filter(w => w.completedAt);
    if (completedWorkflows.length > 0) {
      const totalTime = completedWorkflows.reduce((sum, w) => {
        return sum + (w.completedAt - w.createdAt);
      }, 0);
      metrics.averageCompletionTime = totalTime / completedWorkflows.length;
    }

    // حساب متوسط عدد الموافقات
    const totalApprovals = workflows.reduce((sum, w) => {
      return sum + (w.stages ? w.stages.length : 0);
    }, 0);
    metrics.averageApprovals = totalApprovals / workflows.length;

    // تحديد نقاط الاختناق
    metrics.bottlenecks = this.identifyBottlenecks(workflows);

    // حساب درجة الأداء
    metrics.performanceScore = this.calculatePerformanceScore(workflows);

    // توليد توصيات
    metrics.recommendations = this.generateRecommendations(metrics, workflows);

    return metrics;
  }

  /**
   * تحديد نقاط الاختناق في سير العمل
   */
  identifyBottlenecks(workflows) {
    const stageAnalysis = new Map();

    workflows.forEach(workflow => {
      if (!workflow.stages) return;

      workflow.stages.forEach(stage => {
        const key = stage.name || `Stage-${stage.id}`;

        if (!stageAnalysis.has(key)) {
          stageAnalysis.set(key, {
            name: key,
            totalDuration: 0,
            count: 0,
            slaBreaches: 0,
            avgDuration: 0,
            breachRate: 0,
          });
        }

        const analysis = stageAnalysis.get(key);
        analysis.count++;

        if (stage.endTime && stage.startTime) {
          const duration = stage.endTime - stage.startTime;
          analysis.totalDuration += duration;
        }

        if (stage.sla && stage.sla.breached) {
          analysis.slaBreaches++;
        }
      });
    });

    // حساب الإحصائيات
    const bottlenecks = Array.from(stageAnalysis.values())
      .map(analysis => ({
        ...analysis,
        avgDuration: analysis.count > 0 ? analysis.totalDuration / analysis.count : 0,
        breachRate: analysis.count > 0 ? (analysis.slaBreaches / analysis.count) * 100 : 0,
      }))
      .filter(analysis => analysis.breachRate > 10 || analysis.avgDuration > 48 * 60 * 60 * 1000)
      .sort((a, b) => b.breachRate - a.breachRate);

    return bottlenecks;
  }

  /**
   * حساب درجة أداء سير العمل
   */
  calculatePerformanceScore(workflows) {
    let score = 100;

    if (workflows.length === 0) return score;

    // تقليل النقاط بناءً على انتهاكات SLA
    const breachedWorkflows = workflows.filter(w => w.sla && w.sla.breached).length;
    const slaScore = (breachedWorkflows / workflows.length) * 100;
    score -= slaScore * 0.3; // 30% وزن

    // تقليل النقاط بناءً على المراجعات المطلوبة
    const revisedWorkflows = workflows.filter(w => w.status === 'revision-required').length;
    const revisionScore = (revisedWorkflows / workflows.length) * 100;
    score -= revisionScore * 0.2; // 20% وزن

    // تقليل النقاط بناءً على الرفضات
    const rejectedWorkflows = workflows.filter(w => w.status === 'rejected').length;
    const rejectionScore = (rejectedWorkflows / workflows.length) * 100;
    score -= rejectionScore * 0.3; // 30% وزن

    // إضافة نقاط للموافقات السريعة
    const completedWorkflows = workflows.filter(w => w.completedAt);
    if (completedWorkflows.length > 0) {
      const avgTime = completedWorkflows.reduce((sum, w) => sum + (w.completedAt - w.createdAt), 0) / completedWorkflows.length;

      // إذا كان متوسط الوقت أقل من 24 ساعة
      if (avgTime < 24 * 60 * 60 * 1000) {
        score += 10; // 10% نقاط إضافية
      }
    }

    return Math.max(0, Math.min(100, score)); // بين 0 و 100
  }

  /**
   * توليد توصيات لتحسين الأداء
   */
  generateRecommendations(metrics, workflows) {
    const recommendations = [];

    // توصيات بناءً على الاختناقات
    if (metrics.bottlenecks.length > 0) {
      const topBottleneck = metrics.bottlenecks[0];
      recommendations.push({
        priority: 'high',
        title: 'تحسين مرحلة بطيئة',
        description: `المرحلة "${topBottleneck.name}" بها معدل انتهاك SLA ${topBottleneck.breachRate.toFixed(1)}%`,
        action: 'review-stage',
        stage: topBottleneck.name,
      });
    }

    // توصيات بناءً على معدل الانتهاكات
    const totalBreaches = workflows.filter(w => w.sla && w.sla.breached).length;
    const breachRate = (totalBreaches / workflows.length) * 100;

    if (breachRate > 20) {
      recommendations.push({
        priority: 'high',
        title: 'تقليل انتهاكات SLA',
        description: `معدل انتهاك SLA ${breachRate.toFixed(1)}% مرتفع جداً`,
        action: 'reduce-sla-breaches',
        currentRate: breachRate,
        targetRate: 10,
      });
    }

    // توصيات بناءً على معدل الرفضات
    const totalRejected = workflows.filter(w => w.status === 'rejected').length;
    const rejectionRate = (totalRejected / workflows.length) * 100;

    if (rejectionRate > 15) {
      recommendations.push({
        priority: 'medium',
        title: 'تحسين جودة الطلبات',
        description: `معدل الرفض ${rejectionRate.toFixed(1)}% يشير إلى مشاكل في الجودة`,
        action: 'improve-quality',
        currentRate: rejectionRate,
        suggestion: 'تدريب المستخدمين على متطلبات الطلبات',
      });
    }

    // توصيات بناءً على متوسط وقت الإنجاز
    const avgCompletionHours = metrics.averageCompletionTime / (60 * 60 * 1000);

    if (avgCompletionHours > 72) {
      recommendations.push({
        priority: 'medium',
        title: 'تسريع عملية الموافقة',
        description: `متوسط وقت الإنجاز ${avgCompletionHours.toFixed(1)} ساعة مرتفع جداً`,
        action: 'speed-up-approvals',
        currentHours: avgCompletionHours,
        targetHours: 48,
      });
    }

    // توصية حول درجة الأداء
    if (metrics.performanceScore < 70) {
      recommendations.push({
        priority: 'critical',
        title: 'تحسين شامل للنظام',
        description: `درجة أداء النظام ${metrics.performanceScore.toFixed(1)} منخفضة`,
        action: 'system-review',
        currentScore: metrics.performanceScore,
        targetScore: 85,
      });
    }

    return recommendations;
  }

  /**
   * تقييم المخاطر في سير العمل
   */
  assessWorkflowRisk(workflow) {
    const risk = {
      workflowId: workflow.id,
      riskLevel: 'low',
      riskScore: 0,
      factors: [],
      recommendations: [],
    };

    let riskScore = 0;

    // عامل 1: تأخر في الموافقة
    if (workflow.stages) {
      const overdueStages = workflow.stages.filter(s => {
        if (!s.sla || !s.dueDate) return false;
        return new Date() > s.dueDate;
      }).length;

      if (overdueStages > 0) {
        riskScore += 25;
        risk.factors.push({
          type: 'overdue',
          severity: 'high',
          description: `${overdueStages} مرحلة متأخرة عن الموعد`,
          weight: 25,
        });
      }
    }

    // عامل 2: عدد مرات المراجعة
    const revisionCount = workflow.history ? workflow.history.filter(h => h.action === 'revision_required').length : 0;

    if (revisionCount > 2) {
      riskScore += 20;
      risk.factors.push({
        type: 'revisions',
        severity: 'medium',
        description: `تم طلب مراجعة ${revisionCount} مرات`,
        weight: 20,
      });
    }

    // عامل 3: مدة انتظار طويلة
    if (workflow.createdAt) {
      const waitingDays = (new Date() - workflow.createdAt) / (1000 * 60 * 60 * 24);

      if (waitingDays > 7) {
        riskScore += 20;
        risk.factors.push({
          type: 'long-wait',
          severity: 'medium',
          description: `انتظار ${waitingDays.toFixed(1)} أيام`,
          weight: 20,
        });
      }
    }

    // عامل 4: عدد المعتمدين المطلوبين
    const approverCount = workflow.stages ? workflow.stages.filter(s => s.assignees && s.assignees.length > 0).length : 0;

    if (approverCount > 4) {
      riskScore += 15;
      risk.factors.push({
        type: 'complex-approval',
        severity: 'low',
        description: `يتطلب موافقة ${approverCount} أطراف`,
        weight: 15,
      });
    }

    // عامل 5: أولوية عالية
    if (workflow.priority === 'high' || workflow.priority === 'urgent') {
      riskScore += 10;
      risk.factors.push({
        type: 'high-priority',
        severity: 'medium',
        description: `طلب ذو أولوية ${workflow.priority}`,
        weight: 10,
      });
    }

    // تحديد مستوى المخاطر
    if (riskScore >= 75) {
      risk.riskLevel = 'critical';
    } else if (riskScore >= 50) {
      risk.riskLevel = 'high';
    } else if (riskScore >= 25) {
      risk.riskLevel = 'medium';
    } else {
      risk.riskLevel = 'low';
    }

    risk.riskScore = riskScore;

    // توليد التوصيات
    if (riskScore >= 50) {
      risk.recommendations.push({
        priority: risk.riskLevel,
        action: 'escalate',
        description: 'يجب تصعيد هذا الطلب للمدير',
      });
    }

    if (revisionCount > 1) {
      risk.recommendations.push({
        priority: 'medium',
        action: 'quality-check',
        description: 'التحقق من جودة البيانات المقدمة',
      });
    }

    return risk;
  }

  /**
   * تحسين سير عمل قائم
   */
  optimizeWorkflow(workflow) {
    const optimization = {
      workflowId: workflow.id,
      currentState: {
        status: workflow.status,
        stagesCount: workflow.stages ? workflow.stages.length : 0,
        currentStage: workflow.currentStage,
        estimatedCompletionTime: 0,
      },
      suggestions: [],
    };

    // حساب الوقت المتبقي المتوقع
    if (workflow.stages && workflow.currentStage < workflow.stages.length) {
      const remainingStages = workflow.stages.length - workflow.currentStage;
      const avgTimePerStage = 24; // ساعة
      optimization.currentState.estimatedCompletionTime = remainingStages * avgTimePerStage;
    }

    // اقتراح: دمج المراحل البسيطة
    if (workflow.stages && workflow.stages.length > 5) {
      optimization.suggestions.push({
        type: 'merge-stages',
        priority: 'medium',
        description: 'يمكن دمج بعض المراحل البسيطة لتقليل الوقت',
        currentStages: workflow.stages.length,
        suggestedStages: Math.ceil(workflow.stages.length * 0.7),
      });
    }

    // اقتراح: تفويض للمتخصصين
    if (workflow.priority === 'urgent') {
      optimization.suggestions.push({
        type: 'assign-specialists',
        priority: 'high',
        description: 'تعيين معتمدين متخصصين لتسريع الموافقة',
        estimatedTimeSaving: '24 hours',
      });
    }

    // اقتراح: إضافة تنبيهات فورية
    optimization.suggestions.push({
      type: 'add-alerts',
      priority: 'medium',
      description: 'إضافة تنبيهات فورية عند تأخر المراحل',
      benefit: 'تقليل وقت الانتظار',
    });

    return optimization;
  }

  /**
   * إنشاء تقرير شامل عن أداء النظام
   */
  generateSystemReport(workflows) {
    const report = {
      generatedAt: new Date(),
      totalWorkflows: workflows.length,
      summary: {},
      performance: {},
      risks: {},
      recommendations: [],
    };

    // الملخص العام
    report.summary = {
      completed: workflows.filter(w => w.status === 'completed').length,
      inProgress: workflows.filter(w => w.status === 'in-progress').length,
      pending: workflows.filter(w => w.status === 'initiated').length,
      rejected: workflows.filter(w => w.status === 'rejected').length,
      revisionRequired: workflows.filter(w => w.status === 'revision-required').length,
    };

    // مقاييس الأداء
    const completedWorkflows = workflows.filter(w => w.completedAt);
    if (completedWorkflows.length > 0) {
      const totalTime = completedWorkflows.reduce((sum, w) => sum + (w.completedAt - w.createdAt), 0);
      const avgTime = totalTime / completedWorkflows.length;

      report.performance = {
        averageCompletionTime: avgTime,
        averageCompletionHours: avgTime / (60 * 60 * 1000),
        completionRate: (report.summary.completed / workflows.length) * 100,
        slaCompliance: this.calculateSLACompliance(workflows),
      };
    }

    // تقييم المخاطر
    const riskAssessments = workflows.map(w => this.assessWorkflowRisk(w));
    report.risks = {
      critical: riskAssessments.filter(r => r.riskLevel === 'critical').length,
      high: riskAssessments.filter(r => r.riskLevel === 'high').length,
      medium: riskAssessments.filter(r => r.riskLevel === 'medium').length,
      low: riskAssessments.filter(r => r.riskLevel === 'low').length,
      averageRiskScore: riskAssessments.reduce((sum, r) => sum + r.riskScore, 0) / riskAssessments.length,
    };

    // التوصيات الشاملة
    const performance = this.analyzeWorkflowPerformance(workflows);
    report.recommendations = performance.recommendations.slice(0, 5);

    return report;
  }

  /**
   * حساب معدل امتثال SLA
   */
  calculateSLACompliance(workflows) {
    const completedWorkflows = workflows.filter(w => w.completedAt);
    if (completedWorkflows.length === 0) return 100;

    const withinSLA = completedWorkflows.filter(w => !w.sla || !w.sla.breached).length;
    return (withinSLA / completedWorkflows.length) * 100;
  }
}

module.exports = WorkflowEnhancementService;
