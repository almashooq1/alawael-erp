// ml.routes.ts
// 🤖 Enhanced Machine Learning API Routes
// Advanced ML endpoints for process prediction and analysis

import express, { Router, Request, Response } from 'express';
import { Process } from '../models/process.model';
import {
  classifyProcessRiskAdvanced,
  predictDelayAdvanced,
  trainProcessModel,
  mlService,
  EnhancedMLService,
} from '../models/process.ml.enhanced';
import MLFeedback from '../models/ml.feedback.model';
import MLDriftEvent from '../models/ml.drift.model';
import MLAlert from '../models/ml.alert.model';
import { mlWebSocketService } from '../websocket/ml-updates';
import {
  exportFeedbackCSV,
  exportDriftEventsCSV,
  exportAlertsCSV,
  exportComprehensiveReportPDF,
  exportComprehensiveReportExcel,
} from '../utils/ml.export';
import {
  aggregateAlerts,
  detectAlertPatterns,
  comparePerformance,
  generateIntelligentSummary,
} from '../utils/ml.aggregation';
import {
  shouldRetrain,
  executeRetraining,
  getRetrainingStatus,
} from '../utils/ml.auto-retrain';

const router: Router = express.Router();

/**
 * @route POST /api/ml/classify
 * @desc Enhanced risk classification with deep learning
 * @access Public
 */
router.post('/classify', async (req: Request, res: Response) => {
  try {
    const process: Process = req.body.process;

    if (!process || !process.steps || process.steps.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid process data',
      });
    }

    const classification = await classifyProcessRiskAdvanced(process);

    res.json({
      success: true,
      data: classification,
      message: 'Classification completed successfully',
    });
  } catch (error: any) {
    console.error('Classification error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Classification failed',
    });
  }
});

/**
 * @route POST /api/ml/predict/delay
 * @desc Advanced delay prediction with bottleneck analysis
 * @access Public
 */
router.post('/predict/delay', async (req: Request, res: Response) => {
  try {
    const process: Process = req.body.process;

    if (!process || !process.steps) {
      return res.status(400).json({
        success: false,
        error: 'Invalid process data',
      });
    }

    const prediction = await predictDelayAdvanced(process);

    res.json({
      success: true,
      data: prediction,
      message: 'Delay prediction completed',
    });
  } catch (error: any) {
    console.error('Prediction error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Prediction failed',
    });
  }
});

/**
 * @route POST /api/ml/predict/batch
 * @desc Batch prediction for multiple processes
 * @access Public
 */
router.post('/predict/batch', async (req: Request, res: Response) => {
  try {
    const processes: Process[] = req.body.processes;

    if (!processes || !Array.isArray(processes)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid processes array',
      });
    }

    const predictions = await mlService.batchPredict(processes);

    res.json({
      success: true,
      data: {
        count: predictions.length,
        predictions,
      },
      message: `Batch prediction completed for ${predictions.length} processes`,
    });
  } catch (error: any) {
    console.error('Batch prediction error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Batch prediction failed',
    });
  }
});

/**
 * @route POST /api/ml/train
 * @desc Train ML model with historical data
 * @access Public
 */
router.post('/train', async (req: Request, res: Response) => {
  try {
    const { historicalProcesses } = req.body;

    if (!historicalProcesses || !Array.isArray(historicalProcesses)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid training data',
      });
    }

    if (historicalProcesses.length < 10) {
      return res.status(400).json({
        success: false,
        error: 'Minimum 10 historical processes required for training',
      });
    }

    const result = await trainProcessModel(historicalProcesses);

    res.json({
      success: true,
      data: result,
      message: `Model trained successfully with ${historicalProcesses.length} samples`,
    });
  } catch (error: any) {
    console.error('Training error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Training failed',
    });
  }
});

/**
 * @route GET /api/ml/metrics
 * @desc Get model performance metrics
 * @access Public
 */
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    const limitParam = Number(req.query.limit || 1000);
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 10000) : 1000;

    const feedbackRecords = await MLFeedback.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const metrics = feedbackRecords.length
      ? {
          ...mlService.calculateDetailedMetricsFromRecords(
            feedbackRecords.map(record => ({
              predicted: record.predicted,
              actual: record.actual,
              timestamp: record.createdAt?.toISOString?.() || new Date().toISOString(),
              processId: record.processId,
            }))
          ),
          sampleCount: feedbackRecords.length,
        }
      : mlService.getModelMetrics();

    res.json({
      success: true,
      data: {
        ...metrics,
        source: feedbackRecords.length ? 'feedback' : 'default',
      },
      message: 'Metrics retrieved successfully',
    });
  } catch (error: any) {
    console.error('Metrics error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get metrics',
    });
  }
});

/**
 * @route POST /api/ml/feedback
 * @desc Submit actual outcomes for evaluation metrics
 * @access Public
 */
router.post('/feedback', async (req: Request, res: Response) => {
  try {
    const { process, processId, predictedRisk, actualRisk, metadata } = req.body;
    const validLabels = ['high', 'medium', 'low'];

    if (!actualRisk || !validLabels.includes(actualRisk)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid actualRisk value',
      });
    }

    let resolvedPredictedRisk = predictedRisk;

    if (!resolvedPredictedRisk && process) {
      const classification = await classifyProcessRiskAdvanced(process);
      resolvedPredictedRisk = classification.risk;
    }

    if (!resolvedPredictedRisk || !validLabels.includes(resolvedPredictedRisk)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid predictedRisk value',
      });
    }

    const resolvedProcessId = processId || process?._id;

    const metrics = mlService.recordFeedback({
      processId: resolvedProcessId,
      predicted: resolvedPredictedRisk,
      actual: actualRisk,
      timestamp: new Date().toISOString(),
    });

    await MLFeedback.create({
      processId: resolvedProcessId,
      predicted: resolvedPredictedRisk,
      actual: actualRisk,
      modelVersion: process.env.ML_MODEL_VERSION || 'v2',
      source: 'api',
      metadata,
    });

    if (actualRisk === 'high' && resolvedPredictedRisk !== 'high') {
      await MLAlert.create({
        processId: resolvedProcessId,
        processName: process?.name,
        severity: resolvedPredictedRisk === 'low' ? 'high' : 'medium',
        message: 'تباين خطير: المخاطر الفعلية عالية لكن التنبؤ كان أقل',
        details: {
          predictedRisk: resolvedPredictedRisk,
          actualRisk,
        },
        source: 'feedback-mismatch',
      });

      mlWebSocketService.broadcastAlert({
        processId: resolvedProcessId,
        processName: process?.name,
        severity: resolvedPredictedRisk === 'low' ? 'high' : 'medium',
        message: 'تباين خطير: المخاطر الفعلية عالية لكن التنبؤ كان أقل',
        details: {
          predictedRisk: resolvedPredictedRisk,
          actualRisk,
        },
      });
    }

    if (actualRisk === 'low' && resolvedPredictedRisk === 'high') {
      await MLAlert.create({
        processId: resolvedProcessId,
        processName: process?.name,
        severity: 'medium',
        message: 'تباين: التنبؤ عالي بينما المخاطر الفعلية منخفضة',
        details: {
          predictedRisk: resolvedPredictedRisk,
          actualRisk,
        },
        source: 'feedback-mismatch',
      });

      mlWebSocketService.broadcastAlert({
        processId: resolvedProcessId,
        processName: process?.name,
        severity: 'medium',
        message: 'تباين: التنبؤ عالي بينما المخاطر الفعلية منخفضة',
        details: {
          predictedRisk: resolvedPredictedRisk,
          actualRisk,
        },
      });
    }

    res.json({
      success: true,
      data: metrics,
      message: 'Feedback recorded successfully',
    });
  } catch (error: any) {
    console.error('Feedback error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Feedback recording failed',
    });
  }
});

/**
 * @route GET /api/ml/feedback
 * @desc List recent feedback records
 * @access Public
 */
router.get('/feedback', async (req: Request, res: Response) => {
  try {
    const limitParam = Number(req.query.limit || 50);
    const offsetParam = Number(req.query.offset || 0);
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 500) : 50;
    const offset = Number.isFinite(offsetParam) && offsetParam >= 0 ? offsetParam : 0;

    const records = await MLFeedback.find()
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .lean();

    res.json({
      success: true,
      data: {
        count: records.length,
        records,
        offset,
        limit,
      },
      message: 'Feedback records retrieved successfully',
    });
  } catch (error: any) {
    console.error('Feedback list error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to retrieve feedback records',
    });
  }
});

/**
 * @route GET /api/ml/drift
 * @desc Detect model drift based on recent vs baseline feedback
 * @access Public
 */
router.get('/drift', async (req: Request, res: Response) => {
  try {
    const windowParam = Number(req.query.window || 200);
    const baselineParam = Number(req.query.baseline || 1000);

    const windowSize = Number.isFinite(windowParam) && windowParam > 0 ? Math.min(windowParam, 1000) : 200;
    const baselineSize = Number.isFinite(baselineParam) && baselineParam > 0 ? Math.min(baselineParam, 5000) : 1000;

    const records = await MLFeedback.find()
      .sort({ createdAt: -1 })
      .limit(windowSize + baselineSize)
      .lean();

    const recent = records.slice(0, windowSize);
    const baseline = records.slice(windowSize, windowSize + baselineSize);

    if (recent.length < 20 || baseline.length < 50) {
      return res.json({
        success: true,
        data: {
          status: 'insufficient-data',
          recentCount: recent.length,
          baselineCount: baseline.length,
        },
        message: 'Not enough feedback data to assess drift',
      });
    }

    const recentMetrics = mlService.calculateDetailedMetricsFromRecords(
      recent.map(record => ({
        predicted: record.predicted,
        actual: record.actual,
        timestamp: record.createdAt?.toISOString?.() || new Date().toISOString(),
        processId: record.processId,
      }))
    );

    const baselineMetrics = mlService.calculateDetailedMetricsFromRecords(
      baseline.map(record => ({
        predicted: record.predicted,
        actual: record.actual,
        timestamp: record.createdAt?.toISOString?.() || new Date().toISOString(),
        processId: record.processId,
      }))
    );

    const accuracyDrop = baselineMetrics.accuracy - recentMetrics.accuracy;
    const f1Drop = baselineMetrics.f1Score - recentMetrics.f1Score;

    const thresholds = { accuracyDrop: 0.08, f1Drop: 0.08 };
    const driftDetected = accuracyDrop > thresholds.accuracyDrop || f1Drop > thresholds.f1Drop;

    const driftEvent = await MLDriftEvent.create({
      status: driftDetected ? 'drift-detected' : 'stable',
      windowSize: recent.length,
      baselineSize: baseline.length,
      accuracyDrop,
      f1Drop,
      recent: {
        accuracy: recentMetrics.accuracy,
        f1Score: recentMetrics.f1Score,
      },
      baseline: {
        accuracy: baselineMetrics.accuracy,
        f1Score: baselineMetrics.f1Score,
      },
      thresholds,
    });

    if (driftDetected) {
      await MLAlert.create({
        severity: 'high',
        message: 'Model drift detected based on recent feedback',
        details: {
          windowSize: recent.length,
          baselineSize: baseline.length,
          accuracyDrop,
          f1Drop,
        },
        source: 'drift',
      });

      mlWebSocketService.broadcastAlert({
        severity: 'high',
        message: 'Model drift detected based on recent feedback',
        details: {
          windowSize: recent.length,
          baselineSize: baseline.length,
          accuracyDrop,
          f1Drop,
          recent: {
            accuracy: recentMetrics.accuracy,
            f1Score: recentMetrics.f1Score,
          },
          baseline: {
            accuracy: baselineMetrics.accuracy,
            f1Score: baselineMetrics.f1Score,
          },
        },
      });
    }

    res.json({
      success: true,
      data: {
        status: driftDetected ? 'drift-detected' : 'stable',
        windowSize: recent.length,
        baselineSize: baseline.length,
        recent: recentMetrics,
        baseline: baselineMetrics,
        deltas: {
          accuracy: -accuracyDrop,
          f1Score: -f1Drop,
        },
        thresholds,
        eventId: driftEvent._id,
      },
      message: 'Drift analysis completed',
    });
  } catch (error: any) {
    console.error('Drift error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Drift analysis failed',
    });
  }
});

/**
 * @route GET /api/ml/drift/events
 * @desc List drift detection events
 * @access Public
 */
router.get('/drift/events', async (req: Request, res: Response) => {
  try {
    const limitParam = Number(req.query.limit || 50);
    const offsetParam = Number(req.query.offset || 0);
    const status = req.query.status as string | undefined;

    const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 500) : 50;
    const offset = Number.isFinite(offsetParam) && offsetParam >= 0 ? offsetParam : 0;

    const filter = status ? { status } : {};

    const events = await MLDriftEvent.find(filter)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .lean();

    res.json({
      success: true,
      data: {
        count: events.length,
        events,
        offset,
        limit,
      },
      message: 'Drift events retrieved successfully',
    });
  } catch (error: any) {
    console.error('Drift events error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to retrieve drift events',
    });
  }
});

/**
 * @route GET /api/ml/alerts
 * @desc List ML alerts
 * @access Public
 */
router.get('/alerts', async (req: Request, res: Response) => {
  try {
    const limitParam = Number(req.query.limit || 50);
    const offsetParam = Number(req.query.offset || 0);
    const severity = req.query.severity as string | undefined;
    const source = req.query.source as string | undefined;
    const unread = req.query.unread as string | undefined;

    const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 500) : 50;
    const offset = Number.isFinite(offsetParam) && offsetParam >= 0 ? offsetParam : 0;

    const filter: Record<string, any> = {};
    if (severity) filter.severity = severity;
    if (source) filter.source = source;
    if (unread === 'true') filter.read = false;

    const alerts = await MLAlert.find(filter)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .lean();

    const [totalCount, unreadCount, highCount, mediumCount, lowCount] = await Promise.all([
      MLAlert.countDocuments(),
      MLAlert.countDocuments({ read: false }),
      MLAlert.countDocuments({ severity: 'high' }),
      MLAlert.countDocuments({ severity: 'medium' }),
      MLAlert.countDocuments({ severity: 'low' }),
    ]);

    res.json({
      success: true,
      data: {
        count: alerts.length,
        total: totalCount,
        unread: unreadCount,
        bySeverity: {
          high: highCount,
          medium: mediumCount,
          low: lowCount,
        },
        alerts,
        offset,
        limit,
      },
      message: 'ML alerts retrieved successfully',
    });
  } catch (error: any) {
    console.error('ML alerts error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to retrieve ML alerts',
    });
  }
});

/**
 * @route PATCH /api/ml/alerts/:id/read
 * @desc Mark ML alert as read
 * @access Public
 */
router.patch('/alerts/:id/read', async (req: Request, res: Response) => {
  try {
    const alert = await MLAlert.findByIdAndUpdate(
      req.params.id,
      { read: true, readAt: new Date() },
      { new: true }
    ).lean();

    if (!alert) {
      return res.status(404).json({
        success: false,
        error: 'Alert not found',
      });
    }

    res.json({
      success: true,
      data: alert,
      message: 'Alert marked as read',
    });
  } catch (error: any) {
    console.error('ML alert read error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update alert',
    });
  }
});

/**
 * @route PATCH /api/ml/alerts/read-all
 * @desc Mark all ML alerts as read
 * @access Public
 */
router.patch('/alerts/read-all', async (req: Request, res: Response) => {
  try {
    const result = await MLAlert.updateMany(
      { read: false },
      { read: true, readAt: new Date() }
    );

    const matched = 'matchedCount' in result ? result.matchedCount : 0;
    const modified = 'modifiedCount' in result ? result.modifiedCount : 0;

    res.json({
      success: true,
      data: {
        matched,
        modified,
      },
      message: 'All alerts marked as read',
    });
  } catch (error: any) {
    console.error('ML alerts read-all error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update alerts',
    });
  }
});

/**
 * @route DELETE /api/ml/alerts/read
 * @desc Delete all read ML alerts
 * @access Public
 */
router.delete('/alerts/read', async (req: Request, res: Response) => {
  try {
    const result = await MLAlert.deleteMany({ read: true });

    res.json({
      success: true,
      data: {
        deleted: result.deletedCount ?? 0,
      },
      message: 'Read alerts deleted successfully',
    });
  } catch (error: any) {
    console.error('ML alerts delete error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete read alerts',
    });
  }
});

/**
 * @route DELETE /api/ml/alerts
 * @desc Delete all ML alerts
 * @access Public
 */
router.delete('/alerts', async (req: Request, res: Response) => {
  try {
    const result = await MLAlert.deleteMany({});

    res.json({
      success: true,
      data: {
        deleted: result.deletedCount ?? 0,
      },
      message: 'All alerts deleted successfully',
    });
  } catch (error: any) {
    console.error('ML alerts delete-all error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete alerts',
    });
  }
});

/**
 * @route POST /api/ml/analyze/complete
 * @desc Complete ML analysis with all features
 * @access Public
 */
router.post('/analyze/complete', async (req: Request, res: Response) => {
  try {
    const process: Process = req.body.process;

    if (!process || !process.steps) {
      return res.status(400).json({
        success: false,
        error: 'Invalid process data',
      });
    }

    // Run all analyses in parallel
    const [classification, delayPrediction] = await Promise.all([
      classifyProcessRiskAdvanced(process),
      predictDelayAdvanced(process),
    ]);

    res.json({
      success: true,
      data: {
        classification,
        delayPrediction,
        summary: {
          overallRisk: classification.risk,
          delayProbability: delayPrediction.delayProbability,
          confidence: classification.confidence,
          estimatedCompletion: delayPrediction.estimatedCompletionDate,
          criticalIssues: delayPrediction.bottlenecks.filter(b => b.severity === 'high').length,
          recommendations: classification.recommendations,
        },
      },
      message: 'Complete analysis finished',
    });
  } catch (error: any) {
    console.error('Analysis error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Analysis failed',
    });
  }
});

/**
 * @route GET /api/ml/health
 * @desc ML service health check
 * @access Public
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      service: 'ML Service',
      status: 'operational',
      version: '2.0.0',
      features: [
        'deep_learning',
        'risk_classification',
        'delay_prediction',
        'bottleneck_detection',
        'batch_processing',
        'model_training',
      ],
      timestamp: new Date().toISOString(),
    },
  });
});

/**
 * @route POST /api/ml/explain
 * @desc Get detailed explanation for a prediction
 * @access Public
 */
router.post('/explain', async (req: Request, res: Response) => {
  try {
    const process: Process = req.body.process;

    if (!process || !process.steps) {
      return res.status(400).json({
        success: false,
        error: 'Invalid process data',
      });
    }

    const classification = await classifyProcessRiskAdvanced(process);

    res.json({
      success: true,
      data: {
        prediction: classification.risk,
        confidence: classification.confidence,
        explanation: classification.explanation,
        features: classification.features,
        patterns: classification.patterns,
        recommendations: classification.recommendations,
        featureImportance: {
          completionRatio: classification.features.completionRatio * 0.3,
          delayedSteps: (classification.features.delayedSteps / classification.features.totalSteps) * 0.25,
          velocity: Math.min(classification.features.velocity / 10, 1) * 0.2,
          complexity: (classification.features.complexity / 10) * 0.15,
          criticalSteps: (classification.features.criticalSteps / classification.features.totalSteps) * 0.1,
        },
      },
      message: 'Explanation generated',
    });
  } catch (error: any) {
    console.error('Explain error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Explanation failed',
    });
  }
});

/**
 * @route POST /api/ml/compare
 * @desc Compare multiple processes
 * @access Public
 */
router.post('/compare', async (req: Request, res: Response) => {
  try {
    const processes: Process[] = req.body.processes;

    if (!processes || !Array.isArray(processes) || processes.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'At least 2 processes required for comparison',
      });
    }

    const analyses = await mlService.batchPredict(processes);

    // Sort by risk (high → medium → low)
    const sorted = analyses.sort((a, b) => {
      const riskOrder = { high: 3, medium: 2, low: 1 };
      return (riskOrder[b.risk] || 0) - (riskOrder[a.risk] || 0);
    });

    // Calculate statistics
    const stats = {
      totalProcesses: analyses.length,
      highRisk: analyses.filter(a => a.risk === 'high').length,
      mediumRisk: analyses.filter(a => a.risk === 'medium').length,
      lowRisk: analyses.filter(a => a.risk === 'low').length,
      avgConfidence: analyses.reduce((sum, a) => sum + a.confidence, 0) / analyses.length,
      avgCompletionRatio: analyses.reduce((sum, a) => sum + a.features.completionRatio, 0) / analyses.length,
    };

    res.json({
      success: true,
      data: {
        analyses: sorted,
        statistics: stats,
        recommendations: [
          stats.highRisk > 0 ? `⚠️ ${stats.highRisk} عمليات عالية الخطورة تحتاج اهتمام فوري` : null,
          stats.avgCompletionRatio < 0.5 ? '📊 متوسط الإنجاز منخفض - قد تحتاج لزيادة الموارد' : null,
          stats.avgConfidence > 0.85 ? '✅ ثقة عالية في التوقعات' : '⚠️ بيانات أكثر مطلوبة لتحسين الثقة',
        ].filter(Boolean),
      },
      message: `Compared ${analyses.length} processes`,
    });
  } catch (error: any) {
    console.error('Compare error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Comparison failed',
    });
  }
});

/**
 * @route POST /api/ml/optimize
 * @desc Get optimization recommendations
 * @access Public
 */
router.post('/optimize', async (req: Request, res: Response) => {
  try {
    const process: Process = req.body.process;

    if (!process || !process.steps) {
      return res.status(400).json({
        success: false,
        error: 'Invalid process data',
      });
    }

    const [classification, prediction] = await Promise.all([
      classifyProcessRiskAdvanced(process),
      predictDelayAdvanced(process),
    ]);

    // Generate optimization plan
    const optimizationPlan = {
      priority: classification.risk === 'high' ? 'urgent' : classification.risk === 'medium' ? 'high' : 'normal',
      actions: [
        ...classification.recommendations,
        ...prediction.risks.flatMap(r => r.mitigation),
      ],
      quickWins: [
        prediction.bottlenecks.length > 0 ? `حل ${prediction.bottlenecks.length} اختناقات محددة` : null,
        classification.features.criticalSteps > 0 ? `تسريع ${classification.features.criticalSteps} موافقات` : null,
        classification.features.velocity < 1 ? 'زيادة سرعة التنفيذ' : null,
      ].filter(Boolean),
      longTerm: [
        'تحسين عمليات الموافقات',
        'أتمتة المهام المتكررة',
        'بناء قاعدة معرفة',
        'تدريب الفريق',
      ],
      estimatedImpact: {
        timeReduction: `${Math.round(prediction.delayProbability * 30)}%`,
        riskReduction: classification.risk === 'high' ? 'high' : 'medium',
        costSavings: 'متوسطة إلى عالية',
      },
    };

    res.json({
      success: true,
      data: optimizationPlan,
      message: 'Optimization plan generated',
    });
  } catch (error: any) {
    console.error('Optimization error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Optimization failed',
    });
  }
});

/**
 * @route GET /api/ml/export/feedback/csv
 * @desc Export feedback data as CSV
 * @access Public
 */
router.get('/export/feedback/csv', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate as string) : undefined;
    const end = endDate ? new Date(endDate as string) : undefined;

    const csv = await exportFeedbackCSV(start, end);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=ml-feedback-${new Date().toISOString().split('T')[0]}.csv`
    );
    res.send(csv);
  } catch (error: any) {
    console.error('Export feedback error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Export failed',
    });
  }
});

/**
 * @route GET /api/ml/export/drift/csv
 * @desc Export drift events as CSV
 * @access Public
 */
router.get('/export/drift/csv', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate as string) : undefined;
    const end = endDate ? new Date(endDate as string) : undefined;

    const csv = await exportDriftEventsCSV(start, end);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=ml-drift-events-${new Date().toISOString().split('T')[0]}.csv`
    );
    res.send(csv);
  } catch (error: any) {
    console.error('Export drift error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Export failed',
    });
  }
});

/**
 * @route GET /api/ml/export/alerts/csv
 * @desc Export alerts as CSV
 * @access Public
 */
router.get('/export/alerts/csv', async (req: Request, res: Response) => {
  try {
    const { severity, source, unread } = req.query;
    const sev = severity as 'high' | 'medium' | 'low' | undefined;
    const src = source as 'feedback-mismatch' | 'drift' | undefined;
    const unr = unread === 'true' ? true : undefined;

    const csv = await exportAlertsCSV(sev, src, unr);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=ml-alerts-${new Date().toISOString().split('T')[0]}.csv`
    );
    res.send(csv);
  } catch (error: any) {
    console.error('Export alerts error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Export failed',
    });
  }
});

/**
 * @route GET /api/ml/export/report/pdf
 * @desc Export comprehensive report as PDF
 * @access Public
 */
router.get('/export/report/pdf', async (req: Request, res: Response) => {
  try {
    // Get latest metrics, drift status, and alerts
    const feedbackRecords = await MLFeedback.find()
      .sort({ createdAt: -1 })
      .limit(1000)
      .lean();

    const metrics = feedbackRecords.length
      ? mlService.calculateDetailedMetricsFromRecords(
          feedbackRecords.map(record => ({
            predicted: record.predicted,
            actual: record.actual,
            timestamp: record.createdAt?.toISOString?.() || new Date().toISOString(),
            processId: record.processId,
          }))
        )
      : mlService.getModelMetrics();

    const driftEvents = await MLDriftEvent.find()
      .sort({ createdAt: -1 })
      .limit(1)
      .lean();

    const driftStatus = driftEvents.length > 0 ? driftEvents[0] : { status: 'stable' };

    const alerts = await MLAlert.find().sort({ createdAt: -1 }).limit(20).lean();

    await exportComprehensiveReportPDF(res, metrics, driftStatus, alerts);
  } catch (error: any) {
    console.error('Export PDF error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Export failed',
    });
  }
});

/**
 * @route GET /api/ml/export/report/excel
 * @desc Export comprehensive report as Excel
 * @access Public
 */
router.get('/export/report/excel', async (req: Request, res: Response) => {
  try {
    // Get data for all sheets
    const feedbackRecords = await MLFeedback.find()
      .sort({ createdAt: -1 })
      .limit(1000)
      .lean();

    const metrics = feedbackRecords.length
      ? mlService.calculateDetailedMetricsFromRecords(
          feedbackRecords.map(record => ({
            predicted: record.predicted,
            actual: record.actual,
            timestamp: record.createdAt?.toISOString?.() || new Date().toISOString(),
            processId: record.processId,
          }))
        )
      : mlService.getModelMetrics();

    const [driftEvents, alerts, feedback] = await Promise.all([
      MLDriftEvent.find().sort({ createdAt: -1 }).limit(100).lean(),
      MLAlert.find().sort({ createdAt: -1 }).limit(500).lean(),
      MLFeedback.find().sort({ createdAt: -1 }).limit(1000).lean(),
    ]);

    await exportComprehensiveReportExcel(res, metrics, driftEvents, alerts, feedback);
  } catch (error: any) {
    console.error('Export Excel error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Export failed',
    });
  }
});

/**
 * @route GET /api/ml/aggregation/alerts
 * @desc Get aggregated alert statistics
 * @access Public
 */
router.get('/aggregation/alerts', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, period } = req.query;
    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();
    const per = (period as 'hour' | 'day' | 'week' | 'month') || 'day';

    const aggregations = await aggregateAlerts(start, end, per);

    res.json({
      success: true,
      data: aggregations,
      message: 'Alert aggregations retrieved',
    });
  } catch (error: any) {
    console.error('Aggregation error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Aggregation failed',
    });
  }
});

/**
 * @route GET /api/ml/patterns
 * @desc Detect alert patterns
 * @access Public
 */
router.get('/patterns', async (req: Request, res: Response) => {
  try {
    const { lookbackDays } = req.query;
    const days = lookbackDays ? parseInt(lookbackDays as string) : 30;

    const patterns = await detectAlertPatterns(days);

    res.json({
      success: true,
      data: patterns,
      message: 'Alert patterns detected',
    });
  } catch (error: any) {
    console.error('Pattern detection error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Pattern detection failed',
    });
  }
});

/**
 * @route GET /api/ml/performance/compare
 * @desc Compare performance between periods
 * @access Public
 */
router.get('/performance/compare', async (req: Request, res: Response) => {
  try {
    const { currentStart, currentEnd, previousStart, previousEnd } = req.query;

    const curStart = currentStart ? new Date(currentStart as string) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const curEnd = currentEnd ? new Date(currentEnd as string) : new Date();
    const prevStart = previousStart ? new Date(previousStart as string) : new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const prevEnd = previousEnd ? new Date(previousEnd as string) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const comparison = await comparePerformance(curStart, curEnd, prevStart, prevEnd);

    res.json({
      success: true,
      data: comparison,
      message: 'Performance comparison completed',
    });
  } catch (error: any) {
    console.error('Performance comparison error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Comparison failed',
    });
  }
});

/**
 * @route GET /api/ml/summary
 * @desc Get intelligent summary
 * @access Public
 */
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const { lookbackDays } = req.query;
    const days = lookbackDays ? parseInt(lookbackDays as string) : 7;

    const summary = await generateIntelligentSummary(days);

    res.json({
      success: true,
      data: summary,
      message: 'Intelligent summary generated',
    });
  } catch (error: any) {
    console.error('Summary generation error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Summary generation failed',
    });
  }
});

/**
 * @route GET /api/ml/retraining/status
 * @desc Get retraining status
 * @access Public
 */
router.get('/retraining/status', async (req: Request, res: Response) => {
  try {
    const status = getRetrainingStatus();

    res.json({
      success: true,
      data: status,
      message: 'Retraining status retrieved',
    });
  } catch (error: any) {
    console.error('Retraining status error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get status',
    });
  }
});

/**
 * @route POST /api/ml/retraining/check
 * @desc Check if retraining is needed
 * @access Public
 */
router.post('/retraining/check', async (req: Request, res: Response) => {
  try {
    const config = req.body.config || undefined;
    const check = await shouldRetrain(config);

    res.json({
      success: true,
      data: check,
      message: check.shouldRetrain ? 'Retraining recommended' : 'No retraining needed',
    });
  } catch (error: any) {
    console.error('Retraining check error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Check failed',
    });
  }
});

/**
 * @route POST /api/ml/retraining/execute
 * @desc Execute model retraining
 * @access Public
 */
router.post('/retraining/execute', async (req: Request, res: Response) => {
  try {
    const { config, triggeredBy } = req.body;
    const result = await executeRetraining(config, triggeredBy || 'manual');

    res.json({
      success: true,
      data: result,
      message: 'Retraining completed successfully',
    });
  } catch (error: any) {
    console.error('Retraining execution error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Retraining failed',
    });
  }
});

export default router;
