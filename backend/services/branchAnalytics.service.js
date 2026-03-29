/**
 * branchAnalytics.service.js — محرك التحليلات الذكية للفروع
 *
 * Features:
 * 1. Performance Scoring Algorithm (composite weighted score 0-100)
 * 2. Trend Analysis (7/30/90 day trends per KPI)
 * 3. Forecasting (linear regression + seasonal adjustment)
 * 4. Anomaly Detection (Z-score based)
 * 5. Branch Rankings
 * 6. Network-wide intelligence
 * 7. Recommendations Engine
 */

const BranchPerformanceLog = require('../models/BranchPerformanceLog');
const BranchTarget = require('../models/BranchTarget');
const BranchAuditLog = require('../models/BranchAuditLog');

// ─── KPI Weights (sum = 100) ──────────────────────────────────────────────────
const KPI_WEIGHTS = {
  session_completion_rate: 25, // نسبة إتمام الجلسات
  attendance_rate: 20, // نسبة الحضور
  monthly_revenue: 20, // الإيراد
  satisfaction_score: 15, // رضا الأسر
  staff_utilization: 10, // استغلال الكوادر
  on_time_transport: 10, // انتظام النقل
};

// ─── Grade Thresholds ─────────────────────────────────────────────────────────
const GRADE_THRESHOLDS = [
  { min: 95, grade: 'A+' },
  { min: 88, grade: 'A' },
  { min: 80, grade: 'B+' },
  { min: 70, grade: 'B' },
  { min: 60, grade: 'C' },
  { min: 50, grade: 'D' },
  { min: 0, grade: 'F' },
];

// ─── Helper: Linear Regression ────────────────────────────────────────────────
/**
 * Simple linear regression on array of {x, y} points
 * @returns {{ slope, intercept, r2 }}
 */
function linearRegression(points) {
  const n = points.length;
  if (n < 2) return { slope: 0, intercept: points[0]?.y || 0, r2: 0 };

  const sumX = points.reduce((s, p) => s + p.x, 0);
  const sumY = points.reduce((s, p) => s + p.y, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
  const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // R²
  const yMean = sumY / n;
  const ssTot = points.reduce((s, p) => s + Math.pow(p.y - yMean, 2), 0);
  const ssRes = points.reduce((s, p) => s + Math.pow(p.y - (slope * p.x + intercept), 2), 0);
  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;

  return { slope, intercept, r2: Math.max(0, r2) };
}

// ─── Helper: Z-Score Anomaly ──────────────────────────────────────────────────
function detectAnomaly(values, newValue, threshold = 2.5) {
  if (values.length < 5) return null;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const std = Math.sqrt(values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length);
  if (std === 0) return null;
  const z = Math.abs((newValue - mean) / std);
  if (z < threshold) return null;
  return {
    z_score: Math.round(z * 100) / 100,
    mean: Math.round(mean * 100) / 100,
    std: Math.round(std * 100) / 100,
    direction: newValue > mean ? 'spike' : 'drop',
    severity: z >= 4 ? 'critical' : z >= 3 ? 'high' : 'medium',
  };
}

// ─── Helper: Grade from Score ─────────────────────────────────────────────────
function getGrade(score) {
  for (const t of GRADE_THRESHOLDS) {
    if (score >= t.min) return t.grade;
  }
  return 'F';
}

// ─── Core Analytics Functions ─────────────────────────────────────────────────

/**
 * 1. Compute composite performance score for a branch from a log entry
 * @param {Object} log - BranchPerformanceLog document
 * @returns {number} score 0-100
 */
function computePerformanceScore(log) {
  const scores = {
    session_completion_rate: Math.min(log.sessions?.completion_rate || 0, 100),
    attendance_rate: Math.min(log.patients?.attendance_rate || 0, 100),
    monthly_revenue: Math.min(log.target_achievement?.revenue_pct || 0, 120), // cap at 120%
    satisfaction_score: ((log.quality?.satisfaction_score || 0) / 5) * 100,
    staff_utilization: Math.min(log.staff?.staff_utilization_rate || 0, 100),
    on_time_transport: Math.min(log.transport?.on_time_rate || 0, 100),
  };

  let total = 0;
  let totalWeight = 0;
  for (const [key, weight] of Object.entries(KPI_WEIGHTS)) {
    const val = scores[key] ?? 0;
    total += val * weight;
    totalWeight += weight;
  }

  return Math.round(total / totalWeight);
}

/**
 * 2. Trend Analysis — for a branch over N days
 * @param {string} branchCode
 * @param {number} days
 * @returns {Object} trends per metric
 */
async function analyzeTrends(branchCode, days = 30) {
  const logs = await BranchPerformanceLog.getRecentLogs(branchCode, days);
  if (logs.length < 2) return { insufficient_data: true, logs_count: logs.length };

  const makePoints = extractor => logs.map((log, i) => ({ x: i, y: extractor(log) || 0 }));

  const trends = {};

  const metrics = {
    revenue: l => l.finance?.daily_revenue,
    sessions_completed: l => l.sessions?.completed,
    attendance_rate: l => l.patients?.attendance_rate,
    satisfaction_score: l => l.quality?.satisfaction_score,
    session_completion_rate: l => l.sessions?.completion_rate,
    staff_utilization: l => l.staff?.staff_utilization_rate,
    performance_score: l => l.performance_score,
  };

  for (const [name, extractor] of Object.entries(metrics)) {
    const points = makePoints(extractor);
    const reg = linearRegression(points);
    const values = points.map(p => p.y);
    const latest = values[values.length - 1];
    const earliest = values[0];
    const avg = values.reduce((a, b) => a + b, 0) / values.length;

    trends[name] = {
      slope: Math.round(reg.slope * 1000) / 1000,
      r2: Math.round(reg.r2 * 100) / 100,
      direction: reg.slope > 0.01 ? 'up' : reg.slope < -0.01 ? 'down' : 'stable',
      change_pct: earliest > 0 ? Math.round(((latest - earliest) / earliest) * 100) : 0,
      current: Math.round(latest * 100) / 100,
      avg: Math.round(avg * 100) / 100,
      min: Math.round(Math.min(...values) * 100) / 100,
      max: Math.round(Math.max(...values) * 100) / 100,
      data_points: values.map(v => Math.round(v * 100) / 100),
      dates: logs.map(l => l.snapshot_date_str),
    };
  }

  return {
    branch_code: branchCode,
    period_days: days,
    data_points: logs.length,
    trends,
  };
}

/**
 * 3. Forecast next N days for a specific metric
 * @param {string} branchCode
 * @param {string} metric - 'revenue' | 'sessions_completed' | 'attendance_rate' | ...
 * @param {number} forecastDays - how many days ahead
 * @param {number} historyDays - training window
 */
async function forecastMetric(branchCode, metric = 'revenue', forecastDays = 7, historyDays = 30) {
  const logs = await BranchPerformanceLog.getRecentLogs(branchCode, historyDays);

  const extractors = {
    revenue: l => l.finance?.daily_revenue || 0,
    sessions_completed: l => l.sessions?.completed || 0,
    attendance_rate: l => l.patients?.attendance_rate || 0,
    satisfaction_score: l => l.quality?.satisfaction_score || 0,
    session_completion_rate: l => l.sessions?.completion_rate || 0,
  };

  const extractor = extractors[metric];
  if (!extractor) return { error: `Unknown metric: ${metric}` };

  const points = logs.map((log, i) => ({ x: i, y: extractor(log) }));
  const reg = linearRegression(points);

  const lastIdx = points.length - 1;
  const forecastValues = [];
  const today = new Date();

  for (let i = 1; i <= forecastDays; i++) {
    const projectedX = lastIdx + i;
    let projectedY = reg.slope * projectedX + reg.intercept;

    // Simple seasonality: day-of-week factor (Fri/Sat lower for Saudi rehab centers)
    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + i);
    const dow = futureDate.getDay();
    const seasonFactor = dow === 5 || dow === 6 ? 0.75 : 1.0; // Fri/Sat = 75%
    projectedY *= seasonFactor;

    // Floor at 0
    projectedY = Math.max(0, Math.round(projectedY * 100) / 100);

    const dateStr = futureDate.toISOString().split('T')[0];
    forecastValues.push({
      date: dateStr,
      day_of_week: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'][dow],
      projected_value: projectedY,
      season_factor: seasonFactor,
      confidence: Math.round(reg.r2 * 100), // R² as confidence %
    });
  }

  // Monthly projection (sum of daily forecasts × factor)
  const avgDaily = points.reduce((s, p) => s + p.y, 0) / points.length;
  const workingDays = 26; // Saudi 5-day week ≈ 26 days/month
  const monthProjection = Math.round((reg.slope * (lastIdx + 15) + reg.intercept) * workingDays);

  return {
    branch_code: branchCode,
    metric,
    model: { slope: reg.slope, intercept: reg.intercept, r2: Math.round(reg.r2 * 100) / 100 },
    history_days: historyDays,
    history_avg: Math.round(avgDaily * 100) / 100,
    forecast: forecastValues,
    monthly_projection: monthProjection,
    trend: reg.slope > 0.01 ? 'تصاعدي ↑' : reg.slope < -0.01 ? 'تنازلي ↓' : 'مستقر →',
  };
}

/**
 * 4. Anomaly Detection across all metrics
 */
async function detectAnomalies(branchCode, days = 14) {
  const logs = await BranchPerformanceLog.getRecentLogs(branchCode, days);
  if (logs.length < 5) return { insufficient_data: true };

  const checks = [
    { name: 'session_completion_rate', extract: l => l.sessions?.completion_rate, threshold: 2.0 },
    { name: 'attendance_rate', extract: l => l.patients?.attendance_rate, threshold: 2.0 },
    { name: 'daily_revenue', extract: l => l.finance?.daily_revenue, threshold: 2.5 },
    { name: 'satisfaction_score', extract: l => l.quality?.satisfaction_score, threshold: 2.0 },
    { name: 'on_time_rate', extract: l => l.transport?.on_time_rate, threshold: 2.5 },
    { name: 'incidents', extract: l => l.quality?.incidents_today, threshold: 3.0 },
  ];

  const anomalies = [];
  const historicalLogs = logs.slice(0, -1); // Exclude last entry (current)
  const currentLog = logs[logs.length - 1];

  for (const check of checks) {
    const history = historicalLogs.map(check.extract).filter(v => v !== null && v !== undefined);
    const current = check.extract(currentLog);
    if (current === undefined || current === null) continue;

    const anomaly = detectAnomaly(history, current, check.threshold);
    if (anomaly) {
      anomalies.push({
        metric: check.name,
        current_value: current,
        ...anomaly,
        description: `${check.name}: قيمة ${current} تنحرف ${anomaly.z_score}σ عن المتوسط ${anomaly.mean}`,
      });
    }
  }

  return {
    branch_code: branchCode,
    scan_date: currentLog?.snapshot_date_str,
    anomalies_count: anomalies.length,
    anomalies: anomalies.sort((a, b) => b.z_score - a.z_score),
  };
}

/**
 * 5. Branch Rankings — network-wide for a date
 */
async function getBranchRankings(dateStr) {
  const logs = await BranchPerformanceLog.getRankingsForDate(dateStr);
  return logs.map((log, idx) => ({
    rank: idx + 1,
    branch_code: log.branch_code,
    performance_score: log.performance_score,
    grade: log.performance_grade,
    sessions_completed: log.sessions?.completed || 0,
    attendance_rate: log.patients?.attendance_rate || 0,
    daily_revenue: log.finance?.daily_revenue || 0,
    satisfaction_score: log.quality?.satisfaction_score || 0,
    anomalies_count: log.anomalies?.length || 0,
  }));
}

/**
 * 6. Network Intelligence — aggregated view for HQ
 */
async function getNetworkIntelligence(days = 30) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const [aggregates, recentAnomalies] = await Promise.all([
    BranchPerformanceLog.getNetworkAggregates(startDate, endDate),
    BranchPerformanceLog.find({
      snapshot_date: { $gte: startDate },
      'anomalies.0': { $exists: true },
    })
      .sort({ snapshot_date: -1 })
      .limit(50)
      .lean(),
  ]);

  // Revenue trend
  const revPoints = aggregates.map((a, i) => ({ x: i, y: a.total_revenue }));
  const revReg = linearRegression(revPoints);

  // Sessions trend
  const sessPoints = aggregates.map((a, i) => ({ x: i, y: a.total_sessions }));
  const sessReg = linearRegression(sessPoints);

  return {
    period_days: days,
    network_trends: {
      revenue: {
        direction: revReg.slope > 0 ? 'up' : 'down',
        slope: Math.round(revReg.slope * 100) / 100,
        r2: Math.round(revReg.r2 * 100) / 100,
      },
      sessions: {
        direction: sessReg.slope > 0 ? 'up' : 'down',
        slope: Math.round(sessReg.slope * 100) / 100,
        r2: Math.round(sessReg.r2 * 100) / 100,
      },
    },
    daily_aggregates: aggregates.slice(-14), // last 14 days
    recent_anomalies: recentAnomalies.slice(0, 10).map(l => ({
      branch_code: l.branch_code,
      date: l.snapshot_date_str,
      anomalies: l.anomalies,
    })),
  };
}

/**
 * 7. Recommendations Engine
 * Generates actionable recommendations based on analytics
 */
async function generateRecommendations(branchCode, days = 14) {
  const [logs, targets] = await Promise.all([
    BranchPerformanceLog.getRecentLogs(branchCode, days),
    BranchTarget.getMonthlyTargets(branchCode, new Date().getFullYear(), new Date().getMonth() + 1),
  ]);

  if (logs.length === 0) return { recommendations: [] };

  const latest = logs[logs.length - 1];
  const recommendations = [];

  // Rule 1: Low session completion
  if (latest.sessions?.completion_rate < 80) {
    recommendations.push({
      priority: 'high',
      category: 'sessions',
      title: 'نسبة إتمام الجلسات منخفضة',
      detail: `نسبة الإتمام ${latest.sessions.completion_rate}% أقل من الهدف 80%`,
      actions: [
        'مراجعة أسباب الإلغاء وعدم الحضور',
        'تفعيل نظام تذكير الأسر قبل 24 ساعة',
        'تحليل الأوقات ذات أعلى معدل غياب',
      ],
      impact: 'عالي',
    });
  }

  // Rule 2: Low attendance
  if (latest.patients?.attendance_rate < 75) {
    recommendations.push({
      priority: 'high',
      category: 'attendance',
      title: 'معدل حضور المرضى منخفض',
      detail: `الحضور ${latest.patients.attendance_rate}% — ${latest.patients.absent_today} غائب اليوم`,
      actions: [
        'الاتصال بالأسر الغائبة خلال 2 ساعة من الغياب',
        'مراجعة جدول النقل لتحسين الالتزام',
        'إجراء مسح سريع لأسباب الغياب المتكرر',
      ],
      impact: 'عالي',
    });
  }

  // Rule 3: Satisfaction below 4.0
  if (latest.quality?.satisfaction_score < 4.0 && latest.quality.satisfaction_score > 0) {
    recommendations.push({
      priority: 'medium',
      category: 'quality',
      title: 'رضا الأسر دون المستوى المستهدف',
      detail: `متوسط الرضا ${latest.quality.satisfaction_score}/5 — الهدف 4.2`,
      actions: [
        'عقد اجتماع مراجعة مع المعالجين',
        'إطلاق استبيان سريع للأسر غير الراضية',
        'تحسين بيئة الاستقبال والانتظار',
      ],
      impact: 'متوسط',
    });
  }

  // Rule 4: Staff underutilization
  if (latest.staff?.staff_utilization_rate < 60) {
    recommendations.push({
      priority: 'medium',
      category: 'efficiency',
      title: 'انخفاض نسبة استغلال الكوادر',
      detail: `الاستغلال ${latest.staff.staff_utilization_rate}% — يمكن استيعاب مرضى إضافيين`,
      actions: [
        'تفعيل قائمة الانتظار لملء الفجوات',
        'النظر في توزيع المعالجين المتاحين على فروع أخرى',
        'إضافة جلسات جماعية لزيادة الكفاءة',
      ],
      impact: 'منخفض-متوسط',
    });
  }

  // Rule 5: High incidents
  if (latest.quality?.incidents_today > 2) {
    recommendations.push({
      priority: 'critical',
      category: 'safety',
      title: 'ارتفاع عدد الحوادث',
      detail: `تم تسجيل ${latest.quality.incidents_today} حوادث اليوم`,
      actions: [
        'تفعيل بروتوكول الاستجابة الفورية',
        'مراجعة تقارير الحوادث مع مدير الجودة',
        'إبلاغ HQ فوراً',
      ],
      impact: 'حرج — يستوجب تدخلاً فورياً',
    });
  }

  // Rule 6: Revenue below target
  if (targets && latest.target_achievement?.revenue_pct < 70) {
    recommendations.push({
      priority: 'high',
      category: 'finance',
      title: 'الإيراد أقل من 70% من الهدف الشهري',
      detail: `تحقيق ${latest.target_achievement.revenue_pct}% من الهدف المالي`,
      actions: [
        'مراجعة معدلات التحصيل المتأخر',
        'تسريع إجراءات موافقات التأمين',
        'رفع عدد الجلسات لمرضى التأمين',
      ],
      impact: 'عالي — يؤثر على ربحية الفرع',
    });
  }

  // Performance trend (last 7 vs previous 7)
  if (logs.length >= 14) {
    const recentScores = logs.slice(-7).map(l => l.performance_score);
    const prevScores = logs.slice(-14, -7).map(l => l.performance_score);
    const recentAvg = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
    const prevAvg = prevScores.reduce((a, b) => a + b, 0) / prevScores.length;
    const change = Math.round(((recentAvg - prevAvg) / prevAvg) * 100);

    if (change < -10) {
      recommendations.push({
        priority: 'high',
        category: 'performance',
        title: 'تراجع ملحوظ في الأداء العام',
        detail: `انخفض مؤشر الأداء ${Math.abs(change)}% مقارنة بالأسبوع الماضي`,
        actions: [
          'اجتماع طارئ مع مدير الفرع',
          'تحليل المؤشرات المتراجعة تفصيلياً',
          'وضع خطة تصحيحية خلال 48 ساعة',
        ],
        impact: 'عالي',
      });
    }
  }

  return {
    branch_code: branchCode,
    generated_at: new Date().toISOString(),
    data_based_on: `آخر ${days} يوم`,
    recommendations: recommendations.sort((a, b) => {
      const order = { critical: 0, high: 1, medium: 2, low: 3 };
      return (order[a.priority] || 3) - (order[b.priority] || 3);
    }),
  };
}

/**
 * 8. Snapshot builder — creates a daily performance log entry
 * Called by cron job or manually
 */
async function buildDailySnapshot(branchCode, data = {}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dateStr = today.toISOString().split('T')[0];

  const snapshot = {
    branch_code: branchCode,
    snapshot_date: today,
    snapshot_date_str: dateStr,
    patients: data.patients || {},
    sessions: data.sessions || {},
    finance: data.finance || {},
    staff: data.staff || {},
    transport: data.transport || {},
    quality: data.quality || {},
    generated_by: data.generated_by || 'manual',
  };

  // Compute target achievement
  const targets = await BranchTarget.getMonthlyTargets(
    branchCode,
    today.getFullYear(),
    today.getMonth() + 1
  );

  if (targets) {
    const revTarget = targets.kpis.find(k => k.metric === 'monthly_revenue');
    const sessTarget = targets.kpis.find(k => k.metric === 'sessions_count');
    const attTarget = targets.kpis.find(k => k.metric === 'attendance_rate');

    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const dayOfMonth = today.getDate();
    const monthProgress = dayOfMonth / daysInMonth;

    snapshot.target_achievement = {
      revenue_pct: revTarget
        ? Math.round(
            ((data.finance?.mtd_revenue || 0) / (revTarget.target_value * monthProgress)) * 100
          )
        : 0,
      sessions_pct: sessTarget
        ? Math.round(
            ((data.sessions?.completed || 0) / Math.max(1, sessTarget.target_value / daysInMonth)) *
              100
          )
        : 0,
      attendance_pct: attTarget
        ? Math.round(((data.patients?.attendance_rate || 0) / attTarget.target_value) * 100)
        : 0,
    };
    snapshot.target_achievement.overall_pct = Math.round(
      snapshot.target_achievement.revenue_pct * 0.4 +
        snapshot.target_achievement.sessions_pct * 0.35 +
        snapshot.target_achievement.attendance_pct * 0.25
    );
  } else {
    snapshot.target_achievement = {
      revenue_pct: 0,
      sessions_pct: 0,
      attendance_pct: 0,
      overall_pct: 0,
    };
  }

  // Compute performance score & grade
  snapshot.performance_score = computePerformanceScore(snapshot);
  snapshot.performance_grade = getGrade(snapshot.performance_score);

  // Detect anomalies
  const anomalyResult = await detectAnomalies(branchCode, 14);
  snapshot.anomalies = anomalyResult.anomalies || [];

  // Upsert
  return BranchPerformanceLog.findOneAndUpdate(
    { branch_code: branchCode, snapshot_date_str: dateStr },
    { $set: snapshot },
    { upsert: true, new: true, runValidators: true }
  );
}

// ─── Exports ──────────────────────────────────────────────────────────────────
module.exports = {
  computePerformanceScore,
  analyzeTrends,
  forecastMetric,
  detectAnomalies,
  getBranchRankings,
  getNetworkIntelligence,
  generateRecommendations,
  buildDailySnapshot,
  getGrade,
  linearRegression,
};
