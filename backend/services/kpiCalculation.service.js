/**
 * KpiCalculation Service — خدمة حساب مؤشرات الأداء
 * النظام 36: لوحة KPIs الذكية
 */
'use strict';

const KpiDefinition = require('../models/KpiDefinition');
const KpiValue = require('../models/KpiValue');
const KpiTarget = require('../models/KpiTarget');
const KpiAlert = require('../models/KpiAlert');
const KpiScorecard = require('../models/KpiScorecard');

// ─── مساعدات الفترة الزمنية ────────────────────────────────────────────────

/**
 * الحصول على تواريخ بداية ونهاية الفترة
 */
function getPeriodDates(type, year, period) {
  const y = parseInt(year);
  const p = parseInt(period);

  switch (type) {
    case 'monthly': {
      const start = new Date(y, p - 1, 1);
      const end = new Date(y, p, 0, 23, 59, 59);
      return [start, end];
    }
    case 'quarterly': {
      const startMonth = (p - 1) * 3;
      const start = new Date(y, startMonth, 1);
      const end = new Date(y, startMonth + 3, 0, 23, 59, 59);
      return [start, end];
    }
    case 'yearly': {
      return [new Date(y, 0, 1), new Date(y, 11, 31, 23, 59, 59)];
    }
    case 'daily': {
      const d = new Date(y, 0, p);
      const end = new Date(d);
      end.setHours(23, 59, 59);
      return [d, end];
    }
    default: {
      const start = new Date(y, p - 1, 1);
      const end = new Date(y, p, 0, 23, 59, 59);
      return [start, end];
    }
  }
}

/**
 * الحصول على الفترة السابقة
 */
function getPreviousPeriod(type, year, period) {
  const y = parseInt(year);
  const p = parseInt(period);

  if (type === 'monthly') {
    return p === 1 ? [y - 1, 12] : [y, p - 1];
  }
  if (type === 'quarterly') {
    return p === 1 ? [y - 1, 4] : [y, p - 1];
  }
  return [y - 1, p];
}

// ─── حسابات KPI ──────────────────────────────────────────────────────────────

/**
 * حساب قيمة KPI حسب نوع البيانات
 */
async function computeRawValue(definition, branchId, dateFrom, dateTo) {
  // في هذا التطبيق نُرجع قيمة عشوائية لأغراض العرض التجريبي
  // في بيئة الإنتاج يجب ربط كل dataSource بالنموذج المناسب

  const base = Math.random() * 100;

  switch (definition.calculationType) {
    case 'sum':
      return parseFloat((base * 1000).toFixed(2));
    case 'avg':
      return parseFloat(base.toFixed(2));
    case 'count':
      return Math.floor(base);
    case 'ratio':
      return parseFloat(base.toFixed(2));
    case 'rate':
      return parseFloat((base / 10).toFixed(2));
    default:
      return parseFloat(base.toFixed(2));
  }
}

/**
 * تحديد حالة KPI بناءً على القيمة والهدف
 */
function determineStatus(definition, value, targetValue, variancePct) {
  if (targetValue === null || targetValue === undefined) return 'no_data';

  const threshold = (definition.alertThresholdPct || 10) / 100;
  const dir = definition.direction || 'higher_better';

  if (dir === 'higher_better') {
    if (variancePct >= 0) return 'exceeded';
    if (variancePct >= -threshold * 100) return 'on_track';
    if (variancePct >= -(threshold * 2) * 100) return 'at_risk';
    return 'off_track';
  }

  if (dir === 'lower_better') {
    if (variancePct <= 0) return 'exceeded';
    if (variancePct <= threshold * 100) return 'on_track';
    if (variancePct <= threshold * 2 * 100) return 'at_risk';
    return 'off_track';
  }

  // target_based
  const absDev = Math.abs(variancePct || 0);
  if (absDev <= threshold * 100) return 'on_track';
  if (absDev <= threshold * 2 * 100) return 'at_risk';
  return 'off_track';
}

/**
 * التحقق وإنشاء تنبيه الانحراف
 */
async function checkAndCreateAlert(definition, kpiValue, branchId) {
  const threshold = definition.alertThresholdPct || 10;
  const devPct = Math.abs(kpiValue.variancePct || 0);

  if (devPct < threshold) return;

  // تجاهل التنبيهات المكررة خلال 24 ساعة
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const exists = await KpiAlert.exists({
    kpiDefinitionId: definition._id,
    branchId,
    status: 'active',
    createdAt: { $gte: cutoff },
  });

  if (exists) return;

  const severity =
    devPct > threshold * 3 ? 'critical' : devPct > threshold * 2 ? 'warning' : 'info';

  await KpiAlert.create({
    kpiDefinitionId: definition._id,
    kpiValueId: kpiValue._id,
    branchId,
    alertType: 'deviation',
    severity,
    actualValue: kpiValue.value,
    thresholdValue: kpiValue.targetValue,
    deviationPct: kpiValue.variancePct,
    message: `KPI ${definition.name} deviated by ${(kpiValue.variancePct || 0).toFixed(1)}%`,
    messageAr: `انحرف مؤشر ${definition.nameAr} بنسبة ${(kpiValue.variancePct || 0).toFixed(1)}%`,
    periodLabel: `Period ${kpiValue.periodNumber}/${kpiValue.periodYear}`,
    status: 'active',
  });
}

/**
 * حساب درجة فئة KPI
 */
function calculateCategoryScore(values, categoryCode) {
  const catValues = values.filter(
    v =>
      v.kpiDefinitionId &&
      v.kpiDefinitionId.categoryId &&
      v.kpiDefinitionId.categoryId.code === categoryCode
  );

  if (catValues.length === 0) return null;

  const sum = catValues.reduce((acc, v) => {
    const score =
      {
        exceeded: 100,
        on_track: 90,
        at_risk: 60,
        off_track: 30,
        no_data: 50,
      }[v.status] || 50;
    return acc + score;
  }, 0);

  return parseFloat((sum / catValues.length).toFixed(2));
}

// ─── الدوال الرئيسية ──────────────────────────────────────────────────────────

/**
 * حساب KPI واحد
 */
async function calculateSingle(definition, branchId, periodType, year, period) {
  const [dateFrom, dateTo] = getPeriodDates(periodType, year, period);

  const rawValue = await computeRawValue(definition, branchId, dateFrom, dateTo);

  // الهدف
  const target = await KpiTarget.findOne({
    kpiDefinitionId: definition._id,
    branchId,
    periodType,
    periodYear: year,
    periodNumber: period,
  });

  // القيمة السابقة
  const [prevYear, prevPeriod] = getPreviousPeriod(periodType, year, period);
  const prevRecord = await KpiValue.findOne({
    kpiDefinitionId: definition._id,
    branchId,
    periodType,
    periodYear: prevYear,
    periodNumber: prevPeriod,
  });
  const previousValue = prevRecord ? prevRecord.value : null;

  const targetValue = target ? target.targetValue : null;
  const variance = targetValue !== null ? rawValue - targetValue : null;
  const variancePct =
    targetValue !== null && targetValue !== 0
      ? parseFloat((((rawValue - targetValue) / targetValue) * 100).toFixed(2))
      : null;

  let trendPct = null;
  let trend = 'stable';
  if (previousValue !== null && previousValue !== 0) {
    trendPct = parseFloat((((rawValue - previousValue) / previousValue) * 100).toFixed(2));
    trend = trendPct > 1 ? 'up' : trendPct < -1 ? 'down' : 'stable';
  }

  const status = determineStatus(definition, rawValue, targetValue, variancePct);

  const kpiValue = await KpiValue.findOneAndUpdate(
    {
      kpiDefinitionId: definition._id,
      branchId,
      periodType,
      periodYear: year,
      periodNumber: period,
      departmentId: null,
    },
    {
      periodDate: dateFrom,
      value: rawValue,
      previousValue,
      targetValue,
      variance,
      variancePct,
      trend,
      trendPct,
      status,
      isCalculated: true,
      calculatedAt: new Date(),
    },
    { upsert: true, new: true }
  );

  if (definition.enableAlerts && variancePct !== null) {
    await checkAndCreateAlert(definition, kpiValue, branchId);
  }

  return kpiValue;
}

/**
 * حساب جميع KPIs لفرع وفترة معينة
 */
async function calculateAll(branchId, periodType, year, period) {
  const definitions = await KpiDefinition.find({ branchId, isActive: true });
  const results = [];

  for (const def of definitions) {
    try {
      const val = await calculateSingle(def, branchId, periodType, year, period);
      results.push(val);
    } catch (err) {
      console.error(`[KPI] Error calculating ${def.code}:`, err.message);
    }
  }

  await generateScorecard(branchId, periodType, year, period);

  return results;
}

/**
 * إنشاء بطاقة الأداء
 */
async function generateScorecard(branchId, periodType, year, period) {
  const values = await KpiValue.find({
    branchId,
    periodType,
    periodYear: year,
    periodNumber: period,
  }).populate({ path: 'kpiDefinitionId', populate: { path: 'categoryId' } });

  const scores = {
    clinical: calculateCategoryScore(values, 'clinical'),
    financial: calculateCategoryScore(values, 'financial'),
    operational: calculateCategoryScore(values, 'operational'),
    quality: calculateCategoryScore(values, 'quality'),
    hr: calculateCategoryScore(values, 'hr'),
  };

  const weights = { clinical: 0.3, financial: 0.25, operational: 0.2, quality: 0.15, hr: 0.1 };
  let overall = 0;
  for (const [cat, score] of Object.entries(scores)) {
    overall += (score || 0) * (weights[cat] || 0);
  }
  overall = parseFloat(overall.toFixed(2));

  let rating = 'poor';
  if (overall >= 90) rating = 'excellent';
  else if (overall >= 75) rating = 'good';
  else if (overall >= 60) rating = 'satisfactory';
  else if (overall >= 40) rating = 'needs_improvement';

  const [dateFrom] = getPeriodDates(periodType, year, period);

  return KpiScorecard.findOneAndUpdate(
    { branchId, periodType, periodYear: year, periodNumber: period, departmentId: null },
    {
      periodDate: dateFrom,
      overallScore: overall,
      clinicalScore: scores.clinical,
      financialScore: scores.financial,
      operationalScore: scores.operational,
      qualityScore: scores.quality,
      hrScore: scores.hr,
      rating,
      kpiDetails: values.map(v => ({
        kpi: v.kpiDefinitionId?.nameAr || '',
        value: v.value,
        target: v.targetValue,
        status: v.status,
      })),
      generatedAt: new Date(),
    },
    { upsert: true, new: true }
  );
}

/**
 * بيانات لوحة التحكم
 */
async function getDashboardData(branchId, periodType = 'monthly') {
  const now = new Date();
  const year = now.getFullYear();
  const period =
    periodType === 'quarterly' ? Math.ceil((now.getMonth() + 1) / 3) : now.getMonth() + 1;

  const scorecard = await KpiScorecard.findOne({
    branchId,
    periodType,
    periodYear: year,
    periodNumber: period,
  });

  const kpis = await KpiValue.find({
    branchId,
    periodType,
    periodYear: year,
    periodNumber: period,
  }).populate({
    path: 'kpiDefinitionId',
    match: { showOnDashboard: true },
    populate: { path: 'categoryId' },
  });

  const alerts = await KpiAlert.find({ branchId, status: 'active' })
    .sort({ createdAt: -1 })
    .limit(10);

  const branchComparison = await KpiScorecard.find({
    periodType,
    periodYear: year,
    periodNumber: period,
  })
    .populate('branchId')
    .sort({ overallScore: -1 });

  return {
    scorecard,
    kpis: kpis.filter(k => k.kpiDefinitionId),
    alerts,
    branchComparison,
    period: { periodType, year, period },
  };
}

/**
 * مقارنة سنة بسنة
 */
async function getYearOverYearComparison(branchId, kpiCode, years = 3) {
  const definition = await KpiDefinition.findOne({ code: kpiCode, branchId });
  if (!definition) return {};

  const currentYear = new Date().getFullYear();
  const data = {};

  for (let y = currentYear - years + 1; y <= currentYear; y++) {
    const yearly = await KpiValue.find({
      kpiDefinitionId: definition._id,
      branchId,
      periodType: 'monthly',
      periodYear: y,
    })
      .sort({ periodNumber: 1 })
      .select('periodNumber value');

    data[y] = {};
    for (const v of yearly) {
      data[y][v.periodNumber] = v.value;
    }
  }

  return data;
}

module.exports = {
  calculateAll,
  calculateSingle,
  generateScorecard,
  getDashboardData,
  getYearOverYearComparison,
  getPeriodDates,
};
