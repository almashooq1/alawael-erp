/**
 * 🌐 Disability Rehabilitation Center AGI Routes
 *
 * API endpoints لنظام AGI الخاص بمراكز تأهيل ذوي الإعاقة
 */

import express, { Router, Request, Response } from 'express';
import DisabilityRehabAGI from './specialized/disability-rehab-agi';
import ERPIntegration from './specialized/erp-integration';

const router: Router = express.Router();

// Initialize AGI and ERP Integration
const rehabAGI = new DisabilityRehabAGI();
const erpIntegration = new ERPIntegration({
  apiBaseUrl: process.env.ERP_API_URL || 'http://localhost:5000/api',
  apiKey: process.env.ERP_API_KEY || 'dev-key',
  agi: rehabAGI
});

/**
 * POST /api/rehab-agi/beneficiary/analyze
 * تحليل شامل لحالة المستفيد
 */
router.post('/beneficiary/analyze', async (req: Request, res: Response) => {
  try {
    const { beneficiaryId } = req.body;

    if (!beneficiaryId) {
      return res.status(400).json({
        error: 'معرف المستفيد مطلوب'
      });
    }

    const analysis = await rehabAGI.analyzeBeneficiaryStatus(beneficiaryId);

    res.json({
      success: true,
      beneficiaryId,
      analysis,
      timestamp: new Date()
    });

  } catch (error: any) {
    console.error('خطأ في تحليل المستفيد:', error);
    res.status(500).json({
      error: 'حدث خطأ داخلي'
    });
  }
});

/**
 * POST /api/rehab-agi/beneficiary/suggest-program
 * اقتراح برنامج تأهيلي مخصص
 */
router.post('/beneficiary/suggest-program', async (req: Request, res: Response) => {
  try {
    const { beneficiaryId } = req.body;

    if (!beneficiaryId) {
      return res.status(400).json({
        error: 'معرف المستفيد مطلوب'
      });
    }

    const suggestions = await rehabAGI.suggestRehabProgram(beneficiaryId);

    res.json({
      success: true,
      beneficiaryId,
      suggestions,
      timestamp: new Date()
    });

  } catch (error: any) {
    console.error('خطأ في اقتراح البرنامج:', error);
    res.status(500).json({
      error: 'حدث خطأ داخلي'
    });
  }
});

/**
 * POST /api/rehab-agi/beneficiary/predict-progress
 * التنبؤ بتطور المستفيد
 */
router.post('/beneficiary/predict-progress', async (req: Request, res: Response) => {
  try {
    const { beneficiaryId, months } = req.body;

    if (!beneficiaryId || !months) {
      return res.status(400).json({
        error: 'معرف المستفيد وعدد الأشهر مطلوبان'
      });
    }

    const prediction = await rehabAGI.predictBeneficiaryProgress(beneficiaryId, months);

    res.json({
      success: true,
      beneficiaryId,
      months,
      prediction,
      timestamp: new Date()
    });

  } catch (error: any) {
    console.error('خطأ في التنبؤ:', error);
    res.status(500).json({
      error: 'حدث خطأ داخلي'
    });
  }
});

/**
 * POST /api/rehab-agi/program/analyze-effectiveness
 * تحليل فعالية البرنامج
 */
router.post('/program/analyze-effectiveness', async (req: Request, res: Response) => {
  try {
    const { programId } = req.body;

    if (!programId) {
      return res.status(400).json({
        error: 'معرف البرنامج مطلوب'
      });
    }

    const analysis = await rehabAGI.analyzeProgramEffectiveness(programId);

    res.json({
      success: true,
      programId,
      analysis,
      timestamp: new Date()
    });

  } catch (error: any) {
    console.error('خطأ في تحليل البرنامج:', error);
    res.status(500).json({
      error: 'حدث خطأ داخلي'
    });
  }
});

/**
 * POST /api/rehab-agi/schedule/optimize
 * تحسين جدولة الجلسات
 */
router.post('/schedule/optimize', async (req: Request, res: Response) => {
  try {
    const { date } = req.body;

    if (!date) {
      return res.status(400).json({
        error: 'التاريخ مطلوب'
      });
    }

    const optimization = await rehabAGI.optimizeScheduling(new Date(date));

    res.json({
      success: true,
      date,
      optimization,
      timestamp: new Date()
    });

  } catch (error: any) {
    console.error('خطأ في تحسين الجدولة:', error);
    res.status(500).json({
      error: 'حدث خطأ داخلي'
    });
  }
});

/**
 * POST /api/rehab-agi/report/comprehensive
 * توليد تقرير شامل
 */
router.post('/report/comprehensive', async (req: Request, res: Response) => {
  try {
    const { beneficiaryId } = req.body;

    if (!beneficiaryId) {
      return res.status(400).json({
        error: 'معرف المستفيد مطلوب'
      });
    }

    const report = await rehabAGI.generateComprehensiveReport(beneficiaryId);

    res.json({
      success: true,
      beneficiaryId,
      report,
      timestamp: new Date()
    });

  } catch (error: any) {
    console.error('خطأ في توليد التقرير:', error);
    res.status(500).json({
      error: 'حدث خطأ داخلي'
    });
  }
});

/**
 * POST /api/rehab-agi/erp/sync-beneficiary
 * مزامنة بيانات المستفيد مع ERP
 */
router.post('/erp/sync-beneficiary', async (req: Request, res: Response) => {
  try {
    const { beneficiary } = req.body;

    if (!beneficiary) {
      return res.status(400).json({
        error: 'بيانات المستفيد مطلوبة'
      });
    }

    const result = await erpIntegration.syncBeneficiary(beneficiary);

    res.json({
      success: result.success,
      syncedModules: result.syncedModules,
      errors: result.errors,
      timestamp: new Date()
    });

  } catch (error: any) {
    console.error('خطأ في المزامنة:', error);
    res.status(500).json({
      error: 'حدث خطأ داخلي'
    });
  }
});

/**
 * POST /api/rehab-agi/erp/create-invoice
 * إنشاء فاتورة في النظام المالي
 */
router.post('/erp/create-invoice', async (req: Request, res: Response) => {
  try {
    const invoiceData = req.body;

    const result = await erpIntegration.createInvoice(invoiceData);

    res.json({
      success: true,
      invoice: result,
      timestamp: new Date()
    });

  } catch (error: any) {
    console.error('خطأ في إنشاء الفاتورة:', error);
    res.status(500).json({
      error: 'حدث خطأ داخلي'
    });
  }
});

/**
 * POST /api/rehab-agi/erp/record-payment
 * تسجيل دفعة
 */
router.post('/erp/record-payment', async (req: Request, res: Response) => {
  try {
    const { payment, beneficiaryId } = req.body;

    const result = await erpIntegration.recordPayment(payment, beneficiaryId);

    res.json({
      success: true,
      receipt: result,
      timestamp: new Date()
    });

  } catch (error: any) {
    console.error('خطأ في تسجيل الدفعة:', error);
    res.status(500).json({
      error: 'حدث خطأ داخلي'
    });
  }
});

/**
 * POST /api/rehab-agi/erp/book-resource
 * حجز موارد
 */
router.post('/erp/book-resource', async (req: Request, res: Response) => {
  try {
    const bookingData = req.body;

    const result = await erpIntegration.bookResource(bookingData);

    res.json({
      success: result.confirmed,
      booking: result,
      timestamp: new Date()
    });

  } catch (error: any) {
    console.error('خطأ في حجز المورد:', error);
    res.status(500).json({
      error: 'حدث خطأ داخلي'
    });
  }
});

/**
 * GET /api/rehab-agi/erp/financial-summary/:beneficiaryId
 * الحصول على الملخص المالي
 */
router.get('/erp/financial-summary/:beneficiaryId', async (req: Request, res: Response) => {
  try {
    const { beneficiaryId } = req.params;

    const summary = await erpIntegration.getFinancialSummary(beneficiaryId);

    res.json({
      success: true,
      beneficiaryId,
      summary,
      timestamp: new Date()
    });

  } catch (error: any) {
    console.error('خطأ في الحصول على الملخص المالي:', error);
    res.status(500).json({
      error: 'حدث خطأ داخلي'
    });
  }
});

/**
 * GET /api/rehab-agi/erp/schedule
 * الحصول على جدول المواعيد
 */
router.get('/erp/schedule', async (req: Request, res: Response) => {
  try {
    const { date, therapistId, programType, location } = req.query;

    const schedule = await erpIntegration.getSchedule(
      new Date(date as string),
      {
        therapistId: therapistId as string,
        programType: programType as string,
        location: location as string
      }
    );

    res.json({
      success: true,
      schedule,
      timestamp: new Date()
    });

  } catch (error: any) {
    console.error('خطأ في الحصول على الجدول:', error);
    res.status(500).json({
      error: 'حدث خطأ داخلي'
    });
  }
});

/**
 * PUT /api/rehab-agi/erp/session/:sessionId/status
 * تحديث حالة الجلسة
 */
router.put('/erp/session/:sessionId/status', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const statusData = req.body;

    const result = await erpIntegration.updateSessionStatus(sessionId, statusData);

    res.json({
      success: result.success,
      session: result.updatedSession,
      timestamp: new Date()
    });

  } catch (error: any) {
    console.error('خطأ في تحديث حالة الجلسة:', error);
    res.status(500).json({
      error: 'حدث خطأ داخلي'
    });
  }
});

/**
 * POST /api/rehab-agi/erp/send-notification
 * إرسال إشعار
 */
router.post('/erp/send-notification', async (req: Request, res: Response) => {
  try {
    const notificationData = req.body;

    const result = await erpIntegration.sendNotification(notificationData);

    res.json({
      success: true,
      notification: result,
      timestamp: new Date()
    });

  } catch (error: any) {
    console.error('خطأ في إرسال الإشعار:', error);
    res.status(500).json({
      error: 'حدث خطأ داخلي'
    });
  }
});

/**
 * POST /api/rehab-agi/erp/analyze-data
 * تحليل البيانات من ERP باستخدام AGI
 */
router.post('/erp/analyze-data', async (req: Request, res: Response) => {
  try {
    const query = req.body;

    const analysis = await erpIntegration.analyzeERPDataWithAGI(query);

    res.json({
      success: true,
      analysis,
      timestamp: new Date()
    });

  } catch (error: any) {
    console.error('خطأ في تحليل البيانات:', error);
    res.status(500).json({
      error: 'حدث خطأ داخلي'
    });
  }
});

/**
 * POST /api/rehab-agi/erp/full-sync
 * مزامنة شاملة مع ERP
 */
router.post('/erp/full-sync', async (req: Request, res: Response) => {
  try {
    const result = await erpIntegration.fullSync();

    res.json({
      success: result.success,
      syncedEntities: result.syncedEntities,
      duration: result.duration,
      errors: result.errors,
      timestamp: new Date()
    });

  } catch (error: any) {
    console.error('خطأ في المزامنة الشاملة:', error);
    res.status(500).json({
      error: 'حدث خطأ داخلي'
    });
  }
});

/**
 * GET /api/rehab-agi/capabilities
 * الحصول على قدرات النظام
 */
router.get('/capabilities', (req: Request, res: Response) => {
  res.json({
    system: 'نظام AGI لمراكز تأهيل ذوي الإعاقة',
    version: '1.0.0',
    capabilities: {
      analysis: [
        'تحليل شامل لحالة المستفيد',
        'تحليل فعالية البرامج',
        'تحليل البيانات المالية والتشغيلية'
      ],
      prediction: [
        'التنبؤ بتطور المستفيد',
        'توقع الاحتياجات المستقبلية',
        'تحديد مستويات الخطر'
      ],
      recommendation: [
        'اقتراح برامج تأهيلية مخصصة',
        'توصيات علاجية',
        'تحسين الجدولة'
      ],
      integration: [
        'التكامل الكامل مع نظام ERP',
        'المزامنة التلقائية',
        'إدارة المواعيد والموارد',
        'النظام المالي والفوترة',
        'إرسال الإشعارات'
      ],
      reporting: [
        'تقارير شاملة للمستفيدين',
        'تقارير التطور والإنجاز',
        'تقارير مالية وإدارية'
      ]
    },
    supportedDisabilities: [
      'إعاقة جسدية',
      'إعاقة بصرية',
      'إعاقة سمعية',
      'إعاقة ذهنية',
      'صعوبات التعلم',
      'إعاقة النطق',
      'طيف التوحد',
      'إعاقات متعددة'
    ],
    rehabPrograms: [
      'علاج طبيعي',
      'علاج وظيفي',
      'علاج النطق',
      'علاج سلوكي',
      'تعليمي',
      'تدريب مهني',
      'تأهيل اجتماعي',
      'نفسي'
    ]
  });
});

/**
 * GET /api/rehab-agi/examples
 * أمثلة على الاستخدام
 */
router.get('/examples', (req: Request, res: Response) => {
  res.json({
    examples: [
      {
        title: 'تحليل حالة مستفيد',
        endpoint: '/api/rehab-agi/beneficiary/analyze',
        method: 'POST',
        body: {
          beneficiaryId: 'BEN001'
        },
        response: {
          overallStatus: 'مستقر ومتقدم',
          strengths: ['معدل حضور ممتاز: 95%', 'تحسن ملحوظ في الأداء'],
          concerns: [],
          recommendations: ['مواصلة البرامج الحالية'],
          riskLevel: 'low'
        }
      },
      {
        title: 'اقتراح برنامج تأهيلي',
        endpoint: '/api/rehab-agi/beneficiary/suggest-program',
        method: 'POST',
        body: {
          beneficiaryId: 'BEN001'
        },
        response: {
          recommendedPrograms: [
            {
              type: 'physiotherapy',
              priority: 'high',
              reason: 'ضروري لتحسين القدرات الحركية',
              expectedDuration: 6,
              sessionsPerWeek: 3
            }
          ],
          estimatedCost: 10800
        }
      },
      {
        title: 'إنشاء فاتورة',
        endpoint: '/api/rehab-agi/erp/create-invoice',
        method: 'POST',
        body: {
          beneficiaryId: 'BEN001',
          items: [
            {
              description: 'علاج طبيعي - شهر يناير',
              quantity: 12,
              unitPrice: 150,
              total: 1800
            }
          ],
          totalAmount: 1800,
          dueDate: '2026-02-15'
        }
      },
      {
        title: 'التنبؤ بالتطور',
        endpoint: '/api/rehab-agi/beneficiary/predict-progress',
        method: 'POST',
        body: {
          beneficiaryId: 'BEN001',
          months: 6
        }
      }
    ]
  });
});

export default router;
