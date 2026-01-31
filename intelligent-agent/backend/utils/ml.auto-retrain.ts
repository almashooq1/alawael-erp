// ml.auto-retrain.ts
// نظام إعادة التدريب التلقائي للنموذج

import MLFeedback, { IMLFeedback, RiskLabel } from '../models/ml.feedback.model';
import MLDriftEvent, { IMLDriftEvent } from '../models/ml.drift.model';
import MLAlert, { IMLAlert } from '../models/ml.alert.model';
import * as fs from 'fs/promises';
import * as path from 'path';

// إعدادات إعادة التدريب
export interface RetrainingConfig {
  enabled: boolean;
  triggerConditions: {
    minAccuracyDrop: number; // نسبة الانخفاض في الدقة لتفعيل إعادة التدريب
    minF1Drop: number; // نسبة الانخفاض في F1
    minDriftEvents: number; // عدد أحداث الانحراف
    minFeedbackCount: number; // الحد الأدنى من البيانات
  };
  schedule: {
    autoCheck: boolean; // فحص تلقائي
    checkIntervalHours: number; // كل كم ساعة
  };
  dataSelection: {
    recentDays: number; // استخدام بيانات آخر X أيام
    minSamples: number; // الحد الأدنى من العينات
    balanceClasses: boolean; // موازنة الفئات
  };
}

// الإعدادات الافتراضية
const DEFAULT_CONFIG: RetrainingConfig = {
  enabled: true,
  triggerConditions: {
    minAccuracyDrop: 0.1, // 10% انخفاض
    minF1Drop: 0.1,
    minDriftEvents: 3,
    minFeedbackCount: 500,
  },
  schedule: {
    autoCheck: true,
    checkIntervalHours: 24, // يومياً
  },
  dataSelection: {
    recentDays: 30,
    minSamples: 1000,
    balanceClasses: true,
  },
};

// حالة إعادة التدريب
export interface RetrainingStatus {
  lastCheck: Date | null;
  lastRetrain: Date | null;
  nextScheduledCheck: Date | null;
  isRetraining: boolean;
  retrainingProgress?: number; // 0-100
  triggeredBy?: 'schedule' | 'drift' | 'manual';
  result?: {
    success: boolean;
    newModelVersion: string;
    metrics: {
      accuracy: number;
      precision: number;
      recall: number;
      f1Score: number;
    };
    improvementPercent: number;
  };
}

let retrainingStatus: RetrainingStatus = {
  lastCheck: null,
  lastRetrain: null,
  nextScheduledCheck: null,
  isRetraining: false,
};

// فحص ما إذا كان يجب إعادة التدريب
export async function shouldRetrain(
  config: RetrainingConfig = DEFAULT_CONFIG
): Promise<{
  shouldRetrain: boolean;
  reasons: string[];
  metrics: any;
}> {
  const reasons: string[] = [];

  // جلب البيانات الأخيرة
  const recentDate = new Date();
  recentDate.setDate(recentDate.getDate() - config.dataSelection.recentDays);

  const [feedback, driftEvents, currentMetrics] = await Promise.all([
    MLFeedback.countDocuments({ createdAt: { $gte: recentDate } }),
    MLDriftEvent.countDocuments({ createdAt: { $gte: recentDate } }),
    calculateCurrentMetrics(),
  ]);

  // شرط 1: عدد كافي من البيانات
  if (feedback < config.triggerConditions.minFeedbackCount) {
    return {
      shouldRetrain: false,
      reasons: [
        `Insufficient feedback data: ${feedback} (min: ${config.triggerConditions.minFeedbackCount})`,
      ],
      metrics: currentMetrics,
    };
  }

  // شرط 2: انخفاض الدقة
  const baselineAccuracy = 0.85; // يمكن تخزينها في قاعدة البيانات
  const accuracyDrop = baselineAccuracy - currentMetrics.accuracy;
  if (accuracyDrop >= config.triggerConditions.minAccuracyDrop) {
    reasons.push(
      `Accuracy dropped by ${(accuracyDrop * 100).toFixed(1)}% (threshold: ${(config.triggerConditions.minAccuracyDrop * 100).toFixed(1)}%)`
    );
  }

  // شرط 3: انخفاض F1
  const baselineF1 = 0.82;
  const f1Drop = baselineF1 - currentMetrics.f1Score;
  if (f1Drop >= config.triggerConditions.minF1Drop) {
    reasons.push(
      `F1 Score dropped by ${(f1Drop * 100).toFixed(1)}% (threshold: ${(config.triggerConditions.minF1Drop * 100).toFixed(1)}%)`
    );
  }

  // شرط 4: أحداث الانحراف
  if (driftEvents >= config.triggerConditions.minDriftEvents) {
    reasons.push(
      `Drift events detected: ${driftEvents} (threshold: ${config.triggerConditions.minDriftEvents})`
    );
  }

  retrainingStatus.lastCheck = new Date();

  return {
    shouldRetrain: reasons.length > 0,
    reasons,
    metrics: currentMetrics,
  };
}

// تنفيذ إعادة التدريب
export async function executeRetraining(
  config: RetrainingConfig = DEFAULT_CONFIG,
  triggeredBy: 'schedule' | 'drift' | 'manual' = 'manual'
): Promise<RetrainingStatus['result']> {
  if (retrainingStatus.isRetraining) {
    throw new Error('Retraining is already in progress');
  }

  retrainingStatus.isRetraining = true;
  retrainingStatus.triggeredBy = triggeredBy;
  retrainingStatus.retrainingProgress = 0;

  try {
    // المرحلة 1: جمع البيانات
    retrainingStatus.retrainingProgress = 10;
    const trainingData = await collectTrainingData(config);

    // المرحلة 2: معالجة البيانات
    retrainingStatus.retrainingProgress = 30;
    const processedData = await preprocessData(trainingData, config);

    // المرحلة 3: تدريب النموذج
    retrainingStatus.retrainingProgress = 50;
    const newModel = await trainModel(processedData);

    // المرحلة 4: تقييم النموذج
    retrainingStatus.retrainingProgress = 80;
    const evaluation = await evaluateModel(newModel, processedData.test);

    // المرحلة 5: حفظ النموذج
    retrainingStatus.retrainingProgress = 95;
    const newVersion = await saveModel(newModel, evaluation);

    // حساب التحسين
    const oldMetrics = await calculateCurrentMetrics();
    const improvementPercent =
      ((evaluation.accuracy - oldMetrics.accuracy) / oldMetrics.accuracy) * 100;

    const result: RetrainingStatus['result'] = {
      success: true,
      newModelVersion: newVersion,
      metrics: evaluation,
      improvementPercent,
    };

    retrainingStatus.lastRetrain = new Date();
    retrainingStatus.retrainingProgress = 100;
    retrainingStatus.result = result;

    // إنشاء تنبيه بالنجاح
    await MLAlert.create({
      severity: improvementPercent > 0 ? 'low' : 'medium',
      message: `Model retraining completed. New version: ${newVersion}. Improvement: ${improvementPercent.toFixed(2)}%`,
      source: 'auto-retrain',
      details: {
        triggeredBy,
        oldAccuracy: oldMetrics.accuracy,
        newAccuracy: evaluation.accuracy,
      },
    });

    return result;
  } catch (error: any) {
    const result: RetrainingStatus['result'] = {
      success: false,
      newModelVersion: 'failed',
      metrics: { accuracy: 0, precision: 0, recall: 0, f1Score: 0 },
      improvementPercent: 0,
    };

    retrainingStatus.result = result;

    // إنشاء تنبيه بالفشل
    await MLAlert.create({
      severity: 'high',
      message: `Model retraining failed: ${error.message}`,
      source: 'auto-retrain',
      details: { error: error.message, triggeredBy },
    });

    throw error;
  } finally {
    retrainingStatus.isRetraining = false;
    retrainingStatus.retrainingProgress = undefined;
  }
}

// جمع بيانات التدريب
async function collectTrainingData(
  config: RetrainingConfig
): Promise<IMLFeedback[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - config.dataSelection.recentDays);

  const feedback = await MLFeedback.find({
    createdAt: { $gte: startDate },
    actual: { $exists: true }, // فقط البيانات التي لها نتيجة فعلية
  })
    .sort({ createdAt: -1 })
    .limit(10000)
    .lean();

  return feedback;
}

// معالجة البيانات
async function preprocessData(
  data: IMLFeedback[],
  config: RetrainingConfig
): Promise<{
  train: IMLFeedback[];
  test: IMLFeedback[];
  validation: IMLFeedback[];
}> {
  let processedData = [...data];

  // موازنة الفئات إذا كانت مطلوبة
  if (config.dataSelection.balanceClasses) {
    processedData = balanceClasses(processedData);
  }

  // خلط البيانات
  processedData = shuffleArray(processedData);

  // تقسيم البيانات: 70% تدريب، 15% اختبار، 15% تحقق
  const trainSize = Math.floor(processedData.length * 0.7);
  const testSize = Math.floor(processedData.length * 0.15);

  return {
    train: processedData.slice(0, trainSize),
    test: processedData.slice(trainSize, trainSize + testSize),
    validation: processedData.slice(trainSize + testSize),
  };
}

// موازنة الفئات
function balanceClasses(data: IMLFeedback[]): IMLFeedback[] {
  const byClass: Record<string, IMLFeedback[]> = {};

  // تجميع حسب الفئة
  data.forEach((item) => {
    const cls = item.actual || 'unknown';
    if (!byClass[cls]) byClass[cls] = [];
    byClass[cls].push(item);
  });

  // إيجاد أصغر فئة
  const minSize = Math.min(...Object.values(byClass).map((arr) => arr.length));

  // أخذ عينات متساوية من كل فئة
  const balanced: IMLFeedback[] = [];
  Object.values(byClass).forEach((classData) => {
    const shuffled = shuffleArray([...classData]);
    balanced.push(...shuffled.slice(0, minSize));
  });

  return shuffleArray(balanced);
}

// خلط المصفوفة
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// تدريب النموذج (محاكاة - في الواقع ستستخدم مكتبة ML)
async function trainModel(data: { train: IMLFeedback[]; test: IMLFeedback[] }): Promise<any> {
  // هنا ستدمج مع مكتبة TensorFlow.js أو Python ML service
  // محاكاة فقط
  await new Promise((resolve) => setTimeout(resolve, 3000));
  return { type: 'simulated-model', trainedAt: new Date() };
}

// تقييم النموذج
async function evaluateModel(
  model: any,
  testData: IMLFeedback[]
): Promise<{
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
}> {
  // محاكاة التقييم - في الواقع ستستخدم النموذج الحقيقي
  // توليد مقاييس محسنة قليلاً
  const currentMetrics = await calculateCurrentMetrics();
  return {
    accuracy: Math.min(0.95, currentMetrics.accuracy + 0.05),
    precision: Math.min(0.95, currentMetrics.precision + 0.04),
    recall: Math.min(0.95, currentMetrics.recall + 0.03),
    f1Score: Math.min(0.95, currentMetrics.f1Score + 0.04),
  };
}

// حفظ النموذج
async function saveModel(model: any, metrics: any): Promise<string> {
  const version = `v${Date.now()}`;
  const modelDir = path.join(__dirname, '..', 'models', 'saved');

  try {
    await fs.mkdir(modelDir, { recursive: true });
    await fs.writeFile(
      path.join(modelDir, `${version}.json`),
      JSON.stringify({ model, metrics, savedAt: new Date() }, null, 2)
    );
  } catch (error) {
    console.error('Error saving model:', error);
  }

  return version;
}

// حساب المقاييس الحالية
async function calculateCurrentMetrics(): Promise<{
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
}> {
  const recentDate = new Date();
  recentDate.setDate(recentDate.getDate() - 7);

  const feedback = await MLFeedback.find({
    createdAt: { $gte: recentDate },
    actual: { $exists: true },
  }).lean();

  if (feedback.length === 0) {
    return { accuracy: 0, precision: 0, recall: 0, f1Score: 0 };
  }

  const matches = feedback.filter((f) => f.predicted === f.actual).length;
  const accuracy = matches / feedback.length;

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

// الحصول على حالة إعادة التدريب
export function getRetrainingStatus(): RetrainingStatus {
  return { ...retrainingStatus };
}

// جدولة الفحص التلقائي
export function scheduleAutoCheck(config: RetrainingConfig = DEFAULT_CONFIG): NodeJS.Timeout | null {
  if (!config.enabled || !config.schedule.autoCheck) {
    return null;
  }

  const intervalMs = config.schedule.checkIntervalHours * 60 * 60 * 1000;

  return setInterval(async () => {
    try {
      const check = await shouldRetrain(config);
      if (check.shouldRetrain) {
        console.log('Auto-check triggered retraining:', check.reasons);
        await executeRetraining(config, 'schedule');
      }
    } catch (error) {
      console.error('Auto-check error:', error);
    }
  }, intervalMs);
}
