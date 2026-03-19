/* eslint-disable no-unused-vars */
/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                    🎯 ZAKAT CONTROLLER - API HANDLERS                         ║
 * ║                        متحكمات نظام حساب الزكاة                              ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

const {
  ZakatCalculation,
  ZakatPayment,
  ZakatReminder,
  ZakatReport,
  ZAKAT_CONFIG,
} = require('../models/Zakat.model');

const { ZakatCalculationEngine, ZakatValidation } = require('../services/ZakatCalculationEngine');
const { sendNotification } = require('../services/notificationService');
const logger = require('../utils/logger');

// ============================================================================
// 📊 ZAKAT CONTROLLER
// ============================================================================

class ZakatController {
  /**
   * @POST /api/zakat/calculate
   * 🧮 حساب الزكاة الجديدة
   * Calculate new zakat
   */
  static async calculateNewZakat(req, res) {
    try {
      const { assets, jahriYear, notes } = req.body;
      const userId = req.user._id;

      // التحقق من صحة البيانات
      if (!assets || !Array.isArray(assets) || assets.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'يجب إضافة أصل واحد على الأقل',
        });
      }

      // التحقق من كل أصل
      for (const asset of assets) {
        const validation = ZakatValidation.validateAsset(asset);
        if (!validation.isValid) {
          return res.status(400).json({
            success: false,
            message: 'البيانات المدخلة غير صحيحة',
            errors: validation.errors,
          });
        }
      }

      // حساب الزكاة
      const zakatCalculation = ZakatCalculationEngine.calculateTotalZakat(assets);

      // حفظ في قاعدة البيانات
      const calculation = new ZakatCalculation({
        user_id: userId,
        hijriYear: jahriYear || new Date().getFullYear(),
        gregorianYear: new Date().getFullYear(),
        zakatDueDate: this.calculateZakatDueDate(jahriYear),
        assets: assets,
        calculations: {
          cash: zakatCalculation.cash,
          gold: zakatCalculation.gold,
          silver: zakatCalculation.silver,
          livestock: zakatCalculation.livestock,
          crops: zakatCalculation.crops,
          businessInventory: zakatCalculation.businessInventory,
          financialAssets: zakatCalculation.financialAssets,
        },
        summary: {
          totalAssetsValue: assets.reduce((sum, a) => sum + (a.amount || a.currentPrice || 0), 0),
          totalZakatDue: zakatCalculation.totalZakat,
          totalZakatPaid: 0,
          zakatBalance: zakatCalculation.totalZakat,
          percentage: 0,
        },
        status: 'PENDING',
        notes: notes,
      });

      await calculation.save();

      // إنشاء تذكير تلقائي
      await this.createAutoReminders(userId, calculation._id, zakatCalculation.totalZakat);

      // إرسال إخطار
      await sendNotification(userId, {
        type: 'ZAKAT_CALCULATED',
        title: 'تم حساب الزكاة بنجاح',
        message: `الزكاة المستحقة: ${zakatCalculation.totalZakat} SAR`,
        data: { calculationId: calculation._id },
      });

      return res.status(201).json({
        success: true,
        message: 'تم حساب الزكاة بنجاح',
        data: {
          calculation: calculation._id,
          zakatAmount: zakatCalculation.totalZakat,
          details: zakatCalculation,
          recommendations: zakatCalculation.recommendations,
        },
      });
    } catch (error) {
      logger.error('Error calculating zakat:', error);
      res.status(500).json({
        success: false,
        message: 'حدث خطأ في حساب الزكاة',
        error: 'حدث خطأ داخلي',
      });
    }
  }

  /**
   * @GET /api/zakat/calculations
   * 📋 الحصول على قائمة الحسابات
   */
  static async getCalculations(req, res) {
    try {
      const { status, year } = req.query;
      const userId = req.user._id;

      const query = { user_id: userId };
      if (status) query.status = status;
      if (year) query.gregorianYear = parseInt(year);

      const calculations = await ZakatCalculation.find(query).sort({ createdAt: -1 }).limit(50);

      const formattedData = calculations.map(calc => ({
        id: calc._id,
        zakatDueDate: calc.zakatDueDate,
        totalZakatDue: calc.summary.totalZakatDue,
        totalZakatPaid: calc.summary.totalZakatPaid,
        zakatBalance: calc.summary.zakatBalance,
        status: calc.status,
        percentage: calc.summary.percentage,
        assetCount: calc.assets.length,
      }));

      res.json({
        success: true,
        data: formattedData,
        count: calculations.length,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'خطأ في جلب الحسابات',
        error: 'حدث خطأ داخلي',
      });
    }
  }

  /**
   * @GET /api/zakat/calculations/:id
   * 📊 الحصول على تفاصيل حساب الزكاة
   */
  static async getCalculationDetails(req, res) {
    try {
      const calculation = await ZakatCalculation.findById(req.params.id).populate(
        'user_id',
        'name email'
      );

      if (!calculation) {
        return res.status(404).json({
          success: false,
          message: 'لم يتم العثور على الحساب',
        });
      }

      // التحقق من الصلاحيات
      if (
        calculation.user_id._id.toString() !== req.user._id.toString() &&
        req.user.role !== 'ADMIN'
      ) {
        return res.status(403).json({
          success: false,
          message: 'ليس لديك صلاحية للوصول إلى هذا الحساب',
        });
      }

      res.json({
        success: true,
        data: calculation,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'خطأ في جلب التفاصيل',
        error: 'حدث خطأ داخلي',
      });
    }
  }

  /**
   * @POST /api/zakat/payments
   * 💰 تسجيل دفعة زكاة جديدة
   */
  static async recordZakatPayment(req, res) {
    try {
      const {
        calculationId,
        amount,
        paymentMethod,
        recipientType,
        recipientName,
        recipientContact,
        notes,
      } = req.body;

      const userId = req.user._id;

      // التحقق من وجود الحساب
      const calculation = await ZakatCalculation.findById(calculationId);
      if (!calculation) {
        return res.status(404).json({
          success: false,
          message: 'لم يتم العثور على حساب الزكاة',
        });
      }

      // التحقق من المبلغ
      if (amount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'المبلغ يجب أن يكون أكبر من صفر',
        });
      }

      if (amount > calculation.summary.zakatBalance) {
        return res.status(400).json({
          success: false,
          message: `المبلغ المدفوع يتجاوز الزكاة المستحقة (${calculation.summary.zakatBalance})`,
        });
      }

      // إنشاء سجل الدفع
      const payment = new ZakatPayment({
        user_id: userId,
        calculation_id: calculationId,
        amount: amount,
        paymentDate: new Date(),
        paymentMethod: paymentMethod,
        recipientType: recipientType,
        recipientName: recipientName,
        recipientContact: recipientContact,
        notes: notes,
      });

      await payment.save();

      // تحديث حساب الزكاة
      calculation.summary.totalZakatPaid += amount;
      calculation.summary.zakatBalance =
        calculation.summary.totalZakatDue - calculation.summary.totalZakatPaid;
      calculation.summary.percentage =
        (calculation.summary.totalZakatPaid / calculation.summary.totalZakatDue) * 100;

      // تحديث الحالة
      if (calculation.summary.zakatBalance <= 0) {
        calculation.status = 'FULLY_PAID';
      } else if (calculation.summary.totalZakatPaid > 0) {
        calculation.status = 'PARTIALLY_PAID';
      }

      await calculation.save();

      // إرسال إخطار
      await sendNotification(userId, {
        type: 'ZAKAT_PAID',
        title: 'تم تسجيل دفعة الزكاة',
        message: `تم تسجيل دفعة بقيمة ${amount} SAR`,
        data: { paymentId: payment._id },
      });

      res.status(201).json({
        success: true,
        message: 'تم تسجيل الدفعة بنجاح',
        data: {
          paymentId: payment._id,
          totalPaid: calculation.summary.totalZakatPaid,
          remaining: calculation.summary.zakatBalance,
          status: calculation.status,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'خطأ في تسجيل الدفعة',
        error: 'حدث خطأ داخلي',
      });
    }
  }

  /**
   * @GET /api/zakat/payments/:calculationId
   * 📜 الحصول على سجل الدفعات
   */
  static async getPayments(req, res) {
    try {
      const payments = await ZakatPayment.find({
        calculation_id: req.params.calculationId,
      }).sort({ paymentDate: -1 });

      res.json({
        success: true,
        data: payments,
        count: payments.length,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'خطأ في جلب الدفعات',
        error: 'حدث خطأ داخلي',
      });
    }
  }

  /**
   * @GET /api/zakat/dashboard
   * 📈 لوحة تحكم الزكاة
   * Zakat Dashboard with comprehensive statistics
   */
  static async getZakatDashboard(req, res) {
    try {
      const userId = req.user._id;
      const currentYear = new Date().getFullYear();

      // جلب بيانات السنة الحالية
      const calculations = await ZakatCalculation.find({
        user_id: userId,
        gregorianYear: currentYear,
      });

      // حساب الإحصائيات
      const totalZakatDue = calculations.reduce((sum, c) => sum + c.summary.totalZakatDue, 0);
      const totalZakatPaid = calculations.reduce((sum, c) => sum + c.summary.totalZakatPaid, 0);
      const totalAssetsValue = calculations.reduce((sum, c) => sum + c.summary.totalAssetsValue, 0);

      // عد الحسابات حسب الحالة
      const statusCount = {
        PENDING: calculations.filter(c => c.status === 'PENDING').length,
        PARTIALLY_PAID: calculations.filter(c => c.status === 'PARTIALLY_PAID').length,
        FULLY_PAID: calculations.filter(c => c.status === 'FULLY_PAID').length,
        OVERDUE: calculations.filter(c => c.status === 'OVERDUE').length,
      };

      // جلب التذكيرات
      const reminders = await ZakatReminder.find({
        user_id: userId,
        isRead: false,
      }).limit(5);

      // جلب آخر الدفعات
      const recentPayments = await ZakatPayment.find({
        user_id: userId,
      })
        .sort({ paymentDate: -1 })
        .limit(10);

      res.json({
        success: true,
        data: {
          summary: {
            totalZakatDue: totalZakatDue,
            totalZakatPaid: totalZakatPaid,
            zakatBalance: totalZakatDue - totalZakatPaid,
            totalAssetsValue: totalAssetsValue,
            compliancePercentage:
              totalZakatDue > 0 ? ((totalZakatPaid / totalZakatDue) * 100).toFixed(2) : 0,
          },
          statusBreakdown: statusCount,
          recentReminders: reminders.length,
          reminders: reminders,
          recentPayments: recentPayments,
          year: currentYear,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'خطأ في تحميل لوحة التحكم',
        error: 'حدث خطأ داخلي',
      });
    }
  }

  /**
   * @GET /api/zakat/reminders
   * 🔔 الحصول على التذكيرات
   */
  static async getReminders(req, res) {
    try {
      const userId = req.user._id;
      const { isRead } = req.query;

      const query = { user_id: userId };
      if (isRead !== undefined) {
        query.isRead = isRead === 'true';
      }

      const reminders = await ZakatReminder.find(query).sort({ sentDate: -1 }).limit(100);

      res.json({
        success: true,
        data: reminders,
        count: reminders.length,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'خطأ في جلب التذكيرات',
        error: 'حدث خطأ داخلي',
      });
    }
  }

  /**
   * @PUT /api/zakat/reminders/:id/read
   * ✅ تحديد التذكير كمقروء
   */
  static async markReminderAsRead(req, res) {
    try {
      const reminder = await ZakatReminder.findByIdAndUpdate(
        req.params.id,
        { isRead: true },
        { new: true }
      );

      res.json({
        success: true,
        data: reminder,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'خطأ في تحديث التذكير',
        error: 'حدث خطأ داخلي',
      });
    }
  }

  /**
   * @POST /api/zakat/reports/generate
   * 📄 إنشاء تقرير الزكاة
   */
  static async generateZakatReport(req, res) {
    try {
      const userId = req.user._id;
      const { fromYear, toYear, reportType = 'ANNUAL' } = req.body;

      const query = {
        user_id: userId,
      };

      if (fromYear) {
        query.gregorianYear = { $gte: fromYear };
      }
      if (toYear) {
        query.gregorianYear = { ...query.gregorianYear, $lte: toYear };
      }

      const calculations = await ZakatCalculation.find(query);

      // حساب الإحصائيات
      const statistics = {
        totalZakatDue: calculations.reduce((sum, c) => sum + c.summary.totalZakatDue, 0),
        totalZakatPaid: calculations.reduce((sum, c) => sum + c.summary.totalZakatPaid, 0),
        totalDeductions: calculations.reduce(
          (sum, c) => sum + (c.deductions.debts + c.deductions.mortgages),
          0
        ),
        assetsValue: calculations.reduce((sum, c) => sum + c.summary.totalAssetsValue, 0),
      };

      statistics.compliancePercentage =
        statistics.totalZakatDue > 0
          ? Math.round((statistics.totalZakatPaid / statistics.totalZakatDue) * 100)
          : 0;

      const report = new ZakatReport({
        user_id: userId,
        fromYear: fromYear,
        toYear: toYear,
        reportType: reportType,
        statistics: statistics,
        generatedAt: new Date(),
      });

      await report.save();

      res.status(201).json({
        success: true,
        message: 'تم إنشاء التقرير بنجاح',
        data: {
          reportId: report._id,
          ...statistics,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'خطأ في إنشاء التقرير',
        error: 'حدث خطأ داخلي',
      });
    }
  }

  /**
   * 📅 حساب تاريخ استحقاق الزكاة
   */
  static calculateZakatDueDate(hijriYear) {
    // سيتم حساب التاريخ بناءً على التقويم الهجري
    // للآن، نستخدم نهاية السنة الميلادية
    return new Date(new Date().getFullYear(), 11, 31);
  }

  /**
   * 🔔 إنشاء تذكيرات تلقائية
   */
  static async createAutoReminders(userId, calculationId, zakatAmount) {
    const reminders = [];

    // تذكير عند وصول النصاب
    reminders.push(
      new ZakatReminder({
        user_id: userId,
        calculation_id: calculationId,
        reminderType: 'NISAB_REACHED',
        title: 'تم الوصول إلى النصاب',
        message: `لقد وصلت أموالك إلى نصاب الزكاة. الزكاة المستحقة: ${zakatAmount} SAR`,
        zakatAmount: zakatAmount,
        sentVia: ['IN_APP', 'EMAIL'],
      })
    );

    // تذكير قبل نهاية السنة بـ 30 يوم
    reminders.push(
      new ZakatReminder({
        user_id: userId,
        calculation_id: calculationId,
        reminderType: 'YEAR_APPROACHING',
        title: 'اقترب موعد استحقاق الزكاة',
        message: 'تبقى 30 يوماً على استحقاق الزكاة. يرجى التجهيز للدفع',
        zakatAmount: zakatAmount,
        daysUntilDue: 30,
        sentVia: ['IN_APP', 'EMAIL', 'SMS'],
      })
    );

    await ZakatReminder.insertMany(reminders);
  }
}

// ============================================================================
// 📤 EXPORT
// ============================================================================

module.exports = ZakatController;
