// ml.aggregation.ts
// نظام تجميع وتحليل التنبيهات الذكي

import MLAlert, { IMLAlert } from '../models/ml.alert.model';
import MLDriftEvent, { IMLDriftEvent } from '../models/ml.drift.model';
import MLFeedback, { IMLFeedback, RiskLabel } from '../models/ml.feedback.model';

// تجميع التنبيهات حسب الفترة الزمنية
export interface AlertAggregation {
  period: string; // 'hour', 'day', 'week', 'month'
  timestamp: Date;
  total: number;
  bySeverity: {
    high: number;
    medium: number;
    low: number;
  };
  bySource: {
    'feedback-mismatch': number;
    drift: number;
  };
  avgResponseTime?: number; // متوسط الوقت حتى قراءة التنبيه
}

// تجميع التنبيهات حسب النوع والفترة
export async function aggregateAlerts(
  startDate: Date,
  endDate: Date,
  period: 'hour' | 'day' | 'week' | 'month' = 'day'
): Promise<AlertAggregation[]> {
  const aggregations: AlertAggregation[] = [];

  // حساب عدد الفواصل الزمنية
  const intervals = getTimeIntervals(startDate, endDate, period);

  for (const interval of intervals) {
    const alerts = await MLAlert.find({
      createdAt: {
        $gte: interval.start,
        $lt: interval.end,
      },
    }).lean();

    const agg: AlertAggregation = {
      period,
      timestamp: interval.start,
      total: alerts.length,
      bySeverity: {
        high: alerts.filter((a) => a.severity === 'high').length,
        medium: alerts.filter((a) => a.severity === 'medium').length,
        low: alerts.filter((a) => a.severity === 'low').length,
      },
      bySource: {
        'feedback-mismatch': alerts.filter((a) => a.source === 'feedback-mismatch')
          .length,
        drift: alerts.filter((a) => a.source === 'drift').length,
      },
    };

    // حساب متوسط وقت الاستجابة
    const readAlerts = alerts.filter((a) => a.read && a.readAt);
    if (readAlerts.length > 0) {
      const totalResponseTime = readAlerts.reduce((sum, alert) => {
        const responseTime =
          new Date(alert.readAt!).getTime() -
          new Date(alert.createdAt).getTime();
        return sum + responseTime;
      }, 0);
      agg.avgResponseTime = totalResponseTime / readAlerts.length;
    }

    aggregations.push(agg);
  }

  return aggregations;
}

// تحليل الأنماط: اكتشاف الأنماط المتكررة في التنبيهات
export interface AlertPattern {
  patternType: 'recurring' | 'spike' | 'trend';
  description: string;
  severity: 'critical' | 'warning' | 'info';
  frequency?: number; // عدد مرات التكرار
  affectedPeriods: Date[];
  recommendation: string;
}

export async function detectAlertPatterns(
  lookbackDays: number = 30
): Promise<AlertPattern[]> {
  const patterns: AlertPattern[] = [];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - lookbackDays);

  const dailyAggs = await aggregateAlerts(startDate, new Date(), 'day');

  // اكتشاف الارتفاعات المفاجئة (Spikes)
  const avgDaily = dailyAggs.reduce((sum, agg) => sum + agg.total, 0) / dailyAggs.length;
  const stdDev = Math.sqrt(
    dailyAggs.reduce((sum, agg) => sum + Math.pow(agg.total - avgDaily, 2), 0) /
      dailyAggs.length
  );

  const spikeDays = dailyAggs.filter((agg) => agg.total > avgDaily + 2 * stdDev);
  if (spikeDays.length > 0) {
    patterns.push({
      patternType: 'spike',
      description: `Detected ${spikeDays.length} spike day(s) with significantly higher alert volume`,
      severity: spikeDays.length > 5 ? 'critical' : 'warning',
      affectedPeriods: spikeDays.map((d) => d.timestamp),
      recommendation:
        'Investigate root causes during spike periods. Consider scaling ML infrastructure.',
    });
  }

  // اكتشاف الاتجاهات (Trends)
  const recentWeek = dailyAggs.slice(-7);
  const previousWeek = dailyAggs.slice(-14, -7);
  const recentAvg = recentWeek.reduce((sum, agg) => sum + agg.total, 0) / 7;
  const previousAvg = previousWeek.reduce((sum, agg) => sum + agg.total, 0) / 7;
  const changePercent = ((recentAvg - previousAvg) / previousAvg) * 100;

  if (Math.abs(changePercent) > 20) {
    patterns.push({
      patternType: 'trend',
      description: `Alert volume ${changePercent > 0 ? 'increased' : 'decreased'} by ${Math.abs(changePercent).toFixed(1)}% in the last week`,
      severity: changePercent > 50 ? 'critical' : changePercent > 20 ? 'warning' : 'info',
      affectedPeriods: recentWeek.map((d) => d.timestamp),
      recommendation:
        changePercent > 0
          ? 'Upward trend detected. Consider proactive model retraining or parameter tuning.'
          : 'Downward trend detected. Recent improvements may be stabilizing the model.',
    });
  }

  // اكتشاف الأنماط المتكررة (Recurring)
  const highSeverityDays = dailyAggs.filter(
    (agg) => agg.bySeverity.high > agg.total * 0.3
  );
  if (highSeverityDays.length > lookbackDays * 0.2) {
    patterns.push({
      patternType: 'recurring',
      description: `High-severity alerts occur frequently (${highSeverityDays.length} days out of ${lookbackDays})`,
      severity: 'critical',
      frequency: highSeverityDays.length,
      affectedPeriods: highSeverityDays.map((d) => d.timestamp),
      recommendation:
        'Persistent high-severity alerts indicate systematic issues. Immediate model review recommended.',
    });
  }

  return patterns;
}

// تحليل الأداء: مقارنة الأداء عبر الفترات الزمنية
export interface PerformanceComparison {
  currentPeriod: {
    startDate: Date;
    endDate: Date;
    metrics: {
      accuracy: number;
      precision: number;
      recall: number;
      f1Score: number;
    };
  };
  previousPeriod: {
    startDate: Date;
    endDate: Date;
    metrics: {
      accuracy: number;
      precision: number;
      recall: number;
      f1Score: number;
    };
  };
  changes: {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
  };
  status: 'improved' | 'degraded' | 'stable';
  recommendation: string;
}

export async function comparePerformance(
  currentStart: Date,
  currentEnd: Date,
  previousStart: Date,
  previousEnd: Date
): Promise<PerformanceComparison> {
  const currentMetrics = await calculateMetrics(currentStart, currentEnd);
  const previousMetrics = await calculateMetrics(previousStart, previousEnd);

  const changes = {
    accuracy: currentMetrics.accuracy - previousMetrics.accuracy,
    precision: currentMetrics.precision - previousMetrics.precision,
    recall: currentMetrics.recall - previousMetrics.recall,
    f1Score: currentMetrics.f1Score - previousMetrics.f1Score,
  };

  const avgChange =
    (changes.accuracy + changes.precision + changes.recall + changes.f1Score) / 4;

  let status: 'improved' | 'degraded' | 'stable' = 'stable';
  let recommendation = 'Performance is stable. Continue monitoring.';

  if (avgChange > 0.05) {
    status = 'improved';
    recommendation =
      'Performance improved significantly. Document recent changes for future reference.';
  } else if (avgChange < -0.05) {
    status = 'degraded';
    recommendation =
      'Performance degraded. Review recent data changes, consider model retraining.';
  }

  return {
    currentPeriod: {
      startDate: currentStart,
      endDate: currentEnd,
      metrics: currentMetrics,
    },
    previousPeriod: {
      startDate: previousStart,
      endDate: previousEnd,
      metrics: previousMetrics,
    },
    changes,
    status,
    recommendation,
  };
}

// حساب المقاييس لفترة زمنية محددة
async function calculateMetrics(
  startDate: Date,
  endDate: Date
): Promise<{
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
}> {
  const feedback = await MLFeedback.find({
    createdAt: {
      $gte: startDate,
      $lte: endDate,
    },
  }).lean();

  if (feedback.length === 0) {
    return { accuracy: 0, precision: 0, recall: 0, f1Score: 0 };
  }

  const matches = feedback.filter((f) => f.predicted === f.actual).length;
  const accuracy = matches / feedback.length;

  // حساب Precision, Recall, F1 (افتراض تصنيف ثنائي)
  const positiveLabel: RiskLabel = 'high';
  const truePositives = feedback.filter(
    (f) => f.predicted === positiveLabel && f.actual === positiveLabel
  ).length;
  const falsePositives = feedback.filter(
    (f) => f.predicted === positiveLabel && f.actual !== positiveLabel
  ).length;
  const falseNegatives = feedback.filter(
    (f) => f.predicted !== positiveLabel && f.actual === positiveLabel
  ).length;

  const precision =
    truePositives + falsePositives > 0
      ? truePositives / (truePositives + falsePositives)
      : 0;
  const recall =
    truePositives + falseNegatives > 0
      ? truePositives / (truePositives + falseNegatives)
      : 0;
  const f1Score =
    precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

  return { accuracy, precision, recall, f1Score };
}

// دالة مساعدة لحساب الفواصل الزمنية
function getTimeIntervals(
  start: Date,
  end: Date,
  period: 'hour' | 'day' | 'week' | 'month'
): Array<{ start: Date; end: Date }> {
  const intervals: Array<{ start: Date; end: Date }> = [];
  let current = new Date(start);

  while (current < end) {
    const intervalStart = new Date(current);
    let intervalEnd: Date;

    switch (period) {
      case 'hour':
        intervalEnd = new Date(current);
        intervalEnd.setHours(intervalEnd.getHours() + 1);
        break;
      case 'day':
        intervalEnd = new Date(current);
        intervalEnd.setDate(intervalEnd.getDate() + 1);
        break;
      case 'week':
        intervalEnd = new Date(current);
        intervalEnd.setDate(intervalEnd.getDate() + 7);
        break;
      case 'month':
        intervalEnd = new Date(current);
        intervalEnd.setMonth(intervalEnd.getMonth() + 1);
        break;
    }

    if (intervalEnd > end) {
      intervalEnd = new Date(end);
    }

    intervals.push({ start: intervalStart, end: intervalEnd });
    current = intervalEnd;
  }

  return intervals;
}

// ملخص ذكي: توليد ملخص تلقائي للحالة
export interface IntelligentSummary {
  overallStatus: 'healthy' | 'warning' | 'critical';
  summary: string;
  keyFindings: string[];
  actionItems: string[];
  metrics: {
    totalAlerts: number;
    unreadAlerts: number;
    highSeverityAlerts: number;
    driftEventsCount: number;
    currentAccuracy: number;
  };
}

export async function generateIntelligentSummary(
  lookbackDays: number = 7
): Promise<IntelligentSummary> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - lookbackDays);

  const [alerts, driftEvents, patterns, recentMetrics] = await Promise.all([
    MLAlert.find({ createdAt: { $gte: startDate } }).lean(),
    MLDriftEvent.find({ createdAt: { $gte: startDate } }).lean(),
    detectAlertPatterns(lookbackDays),
    calculateMetrics(startDate, new Date()),
  ]);

  const totalAlerts = alerts.length;
  const unreadAlerts = alerts.filter((a) => !a.read).length;
  const highSeverityAlerts = alerts.filter((a) => a.severity === 'high').length;
  const driftEventsCount = driftEvents.length;

  // تحديد الحالة العامة
  let overallStatus: 'healthy' | 'warning' | 'critical' = 'healthy';
  if (highSeverityAlerts > 10 || driftEventsCount > 3 || recentMetrics.accuracy < 0.7) {
    overallStatus = 'critical';
  } else if (
    highSeverityAlerts > 5 ||
    driftEventsCount > 1 ||
    recentMetrics.accuracy < 0.8
  ) {
    overallStatus = 'warning';
  }

  // توليد الملخص
  const summary = `Over the last ${lookbackDays} days: ${totalAlerts} alerts (${unreadAlerts} unread), ${driftEventsCount} drift events detected. Current accuracy: ${(recentMetrics.accuracy * 100).toFixed(1)}%.`;

  // النتائج الرئيسية
  const keyFindings: string[] = [];
  if (highSeverityAlerts > 0) {
    keyFindings.push(`${highSeverityAlerts} high-severity alerts require attention`);
  }
  if (driftEventsCount > 0) {
    keyFindings.push(
      `Model drift detected ${driftEventsCount} time(s) - performance degradation observed`
    );
  }
  if (patterns.length > 0) {
    keyFindings.push(
      `${patterns.length} alert pattern(s) identified (${patterns.map((p) => p.patternType).join(', ')})`
    );
  }
  if (recentMetrics.f1Score < 0.75) {
    keyFindings.push(
      `F1 score below threshold: ${(recentMetrics.f1Score * 100).toFixed(1)}%`
    );
  }

  // عناصر العمل
  const actionItems: string[] = [];
  if (overallStatus === 'critical') {
    actionItems.push('URGENT: Review high-severity alerts immediately');
    actionItems.push('Schedule model retraining session');
  }
  if (driftEventsCount > 1) {
    actionItems.push('Investigate data distribution changes');
  }
  if (unreadAlerts > 20) {
    actionItems.push('Review and triage unread alerts');
  }
  patterns.forEach((pattern) => {
    if (pattern.severity === 'critical') {
      actionItems.push(pattern.recommendation);
    }
  });

  if (actionItems.length === 0) {
    actionItems.push('Continue routine monitoring - no immediate actions required');
  }

  return {
    overallStatus,
    summary,
    keyFindings,
    actionItems,
    metrics: {
      totalAlerts,
      unreadAlerts,
      highSeverityAlerts,
      driftEventsCount,
      currentAccuracy: recentMetrics.accuracy,
    },
  };
}
