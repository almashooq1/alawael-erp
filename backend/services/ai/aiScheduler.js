/**
 * AI Scheduler — جدولة فحوصات الذكاء الاصطناعي اليومية
 * البرومبت 20: وحدة الذكاء الاصطناعي والتحليلات التنبؤية
 *
 * يُشغّل يومياً الساعة 6:00 صباحاً:
 *  - فحوصات التنبيهات الاستباقية (7 أنواع)
 *  - التحقق من دقة التنبؤات المنتهية
 *  - توليد التقارير الشهرية (في اليوم الأول من كل شهر)
 */

const logger = require('../../utils/logger');

// ─── Simple Cron Implementation (no external dependency) ─────────────────────
// يستخدم setInterval بدلاً من node-cron لتجنب تبعيات إضافية

let schedulerStarted = false;

/**
 * تشغيل فحص واحد لجميع التنبيهات
 */
async function runDailyChecks(branchId = null) {
  const startTime = Date.now();
  logger.info('[AI-Scheduler] Starting daily AI checks...');

  try {
    const { runAllChecks } = require('./proactiveAlerts.service');
    const results = await runAllChecks(branchId);

    const totalAlerts = Object.values(results).reduce((sum, count) => sum + count, 0);
    logger.info(`[AI-Scheduler] Daily checks complete — ${totalAlerts} new alerts created`, {
      breakdown: results,
      duration_ms: Date.now() - startTime,
    });

    return results;
  } catch (err) {
    logger.error('[AI-Scheduler] Daily checks failed', { error: err.message });
    return {};
  }
}

/**
 * التحقق من دقة التنبؤات المنتهية
 */
async function validateExpiredPredictions() {
  logger.info('[AI-Scheduler] Validating expired predictions...');

  try {
    const AiPrediction = require('../../models/AiPrediction');
    const now = new Date();

    // جلب التنبؤات المنتهية التي لم يتم التحقق منها
    const expired = await AiPrediction.find({
      status: 'active',
      target_date: { $lte: now },
      actual_value: null,
      deleted_at: null,
    }).populate('beneficiary_id', 'branch_id');

    if (expired.length === 0) {
      logger.info('[AI-Scheduler] No expired predictions to validate');
      return 0;
    }

    let validated = 0;

    for (const prediction of expired) {
      try {
        // محاولة حساب القيمة الفعلية
        const actualValue = await calculateActualProgress(prediction);
        if (actualValue !== null) {
          await prediction.validatePrediction(actualValue);
          validated++;
        } else {
          // إذا لم نستطع حساب القيمة الفعلية، نعلّم التنبؤ كمنتهٍ فقط
          await AiPrediction.findByIdAndUpdate(prediction._id, { status: 'expired' });
        }
      } catch (err) {
        logger.warn(`[AI-Scheduler] Failed to validate prediction ${prediction._id}`, {
          error: err.message,
        });
      }
    }

    logger.info(`[AI-Scheduler] Validated ${validated}/${expired.length} expired predictions`);

    // تحديث دقة النموذج بعد التحقق
    if (validated > 0) {
      await updateModelAccuracy();
    }

    return validated;
  } catch (err) {
    logger.error('[AI-Scheduler] Prediction validation failed', { error: err.message });
    return 0;
  }
}

/**
 * حساب التقدم الفعلي لمستفيد
 */
async function calculateActualProgress(prediction) {
  try {
    if (prediction.prediction_type !== 'progress') return null;

    const mongoose = require('mongoose');

    // محاولة جلب بيانات الأهداف
    const Goal = mongoose.models.Goal || null;
    if (!Goal) return null;

    const goals = await Goal.find({
      plan_id: prediction.plan_id,
      deleted_at: null,
    });

    if (!goals || goals.length === 0) return null;

    const avgProgress =
      goals.reduce((sum, g) => sum + (g.progress_percentage || 0), 0) / goals.length;
    return Math.round((avgProgress / 100) * 10000) / 10000; // تقريب لـ 4 منازل عشرية
  } catch {
    return null;
  }
}

/**
 * تحديث دقة نموذج التنبؤ
 */
async function updateModelAccuracy() {
  try {
    const AiPrediction = require('../../models/AiPrediction');
    const AiModelConfig = require('../../models/AiModelConfig');

    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const recentValidated = await AiPrediction.find({
      prediction_type: 'progress',
      actual_value: { $ne: null },
      validated_at: { $gte: threeMonthsAgo },
      deleted_at: null,
    });

    if (recentValidated.length < 10) return;

    const tolerances = [0.1, 0.15, 0.2];
    const accuracyCounts = tolerances.map(
      tol =>
        recentValidated.filter(
          p => Math.abs((p.actual_value || 0) - (p.predicted_value || 0)) <= tol
        ).length
    );

    const accuracy = accuracyCounts[1] / recentValidated.length; // tolerance 0.15
    const mae =
      recentValidated.reduce(
        (sum, p) => sum + Math.abs((p.actual_value || 0) - (p.predicted_value || 0)),
        0
      ) / recentValidated.length;

    await AiModelConfig.findOneAndUpdate(
      { model_name: 'progress_predictor' },
      {
        accuracy_score: Math.round(accuracy * 10000) / 10000,
        last_evaluated_at: new Date(),
      },
      { upsert: false }
    );

    logger.info(
      `[AI-Scheduler] Model accuracy updated: ${(accuracy * 100).toFixed(1)}% (MAE: ${mae.toFixed(3)})`
    );
  } catch (err) {
    logger.warn('[AI-Scheduler] Failed to update model accuracy', { error: err.message });
  }
}

/**
 * توليد التقارير الشهرية (يُشغّل في اليوم الأول من كل شهر)
 */
async function generateMonthlyReports() {
  const today = new Date();
  if (today.getDate() !== 1) return; // فقط في اليوم الأول

  logger.info('[AI-Scheduler] Generating monthly AI reports (1st of month)...');

  try {
    const mongoose = require('mongoose');
    const Beneficiary = mongoose.models.Beneficiary || null;
    if (!Beneficiary) return;

    // الشهر الماضي
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const yearMonth = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;

    const { generateMonthlyParentReport } = require('./smartReport.service');

    // جلب المستفيدين النشطين الذين لديهم خطط علاجية
    const activeBeneficiaries = await Beneficiary.find({
      status: 'active',
      deleted_at: null,
    })
      .select('_id branch_id')
      .limit(100); // حد للمعالجة الدفعية

    let generated = 0;
    let failed = 0;

    for (const beneficiary of activeBeneficiaries) {
      try {
        await generateMonthlyParentReport(beneficiary, yearMonth, 'ar');
        generated++;

        // تأخير بسيط بين كل تقرير لتجنب الضغط على API
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (err) {
        failed++;
        logger.warn(`[AI-Scheduler] Failed to generate report for beneficiary ${beneficiary._id}`, {
          error: err.message,
        });
      }
    }

    logger.info(`[AI-Scheduler] Monthly reports: ${generated} generated, ${failed} failed`);
  } catch (err) {
    logger.error('[AI-Scheduler] Monthly report generation failed', { error: err.message });
  }
}

/**
 * تشغيل كل المهام الدورية
 */
async function runAllScheduledTasks() {
  const now = new Date();
  const hour = now.getHours();

  // الفحوصات اليومية الساعة 6 صباحاً
  if (hour === 6) {
    await runDailyChecks();
    await validateExpiredPredictions();
  }

  // توليد التقارير الشهرية الساعة 8 صباحاً في اليوم الأول
  if (hour === 8 && now.getDate() === 1) {
    await generateMonthlyReports();
  }
}

/**
 * بدء تشغيل الجدولة
 * يفحص كل ساعة ما إذا كان يجب تشغيل المهام
 */
let _schedulerInterval = null;

function startScheduler() {
  if (schedulerStarted) {
    logger.warn('[AI-Scheduler] Scheduler already running');
    return;
  }

  schedulerStarted = true;
  logger.info('[AI-Scheduler] AI Scheduler started (hourly check)');

  // تشغيل فوري عند البدء للتحقق
  runAllScheduledTasks().catch(err =>
    logger.error('[AI-Scheduler] Initial run failed', { error: err.message })
  );

  // فحص كل ساعة (3600000 ms)
  _schedulerInterval = setInterval(
    () => {
      runAllScheduledTasks().catch(err =>
        logger.error('[AI-Scheduler] Scheduled run failed', { error: err.message })
      );
    },
    60 * 60 * 1000
  );
}

/**
 * إيقاف الـ Scheduler — للاستخدام عند graceful shutdown
 */
function stopScheduler() {
  if (_schedulerInterval) {
    clearInterval(_schedulerInterval);
    _schedulerInterval = null;
    schedulerStarted = false;
    logger.info('[AI-Scheduler] Scheduler stopped');
  }
}

/**
 * تشغيل يدوي للفحوصات (من API endpoint)
 */
async function manualRun(branchId = null) {
  logger.info('[AI-Scheduler] Manual run triggered', { branchId });
  const [alertResults, validatedCount] = await Promise.all([
    runDailyChecks(branchId),
    validateExpiredPredictions(),
  ]);

  return {
    alerts: alertResults,
    validated_predictions: validatedCount,
    run_at: new Date().toISOString(),
  };
}

module.exports = {
  startScheduler,
  stopScheduler,
  manualRun,
  runDailyChecks,
  validateExpiredPredictions,
  generateMonthlyReports,
};
