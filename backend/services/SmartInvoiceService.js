/**
 * ===================================================================
 * SMART INVOICE SERVICE - خدمة الفوترة الذكية
 * ===================================================================
 * 
 * خدمة شاملة تتعامل مع:
 * - إنشاء وتحديث الفواتير
 * - معالجة المدفوعات
 * - التنبؤات والتنبيهات الذكية
 * - التكاملات والتقارير
 */

const SmartInvoice = require('../models/SmartInvoice');
const logger = require('../utils/logger');

class SmartInvoiceService {
  /**
   * إنشاء فاتورة جديدة
   */
  async createInvoice(invoiceData, userId) {
    try {
      // توليد رقم الفاتورة
      const invoiceNumber = await SmartInvoice.generateInvoiceNumber(
        invoiceData.invoiceNumberPrefix || 'INV',
        invoiceData.companyId
      );

      // إنشاء الفاتورة
      const invoice = new SmartInvoice({
        ...invoiceData,
        invoiceNumber,
        createdBy: userId,
      });

      // حساب الإجماليات
      invoice.calculateTotals();

      // حفظ الفاتورة
      await invoice.save();

      // تسجيل سجل التدقيق
      await this.addAuditTrail(invoice._id, 'CREATE', userId, {
        invoiceNumber: invoice.invoiceNumber,
        amount: invoice.totalAmount,
      });

      logger.info(`تم إنشاء فاتورة جديدة: ${invoiceNumber}`);

      return {
        success: true,
        message: 'تم إنشاء الفاتورة بنجاح',
        invoice,
      };
    } catch (error) {
      logger.error('خطأ في إنشاء الفاتورة:', error);
      throw error;
    }
  }

  /**
   * تحديث الفاتورة
   */
  async updateInvoice(invoiceId, updateData, userId) {
    try {
      const invoice = await SmartInvoice.findById(invoiceId);

      if (!invoice) {
        throw new Error('الفاتورة غير موجودة');
      }

      // التحقق من أن الفاتورة يمكن تعديلها
      if (['paid', 'cancelled'].includes(invoice.status)) {
        throw new Error('لا يمكن تعديل فاتورة مدفوعة أو ملغاة');
      }

      const previousData = JSON.parse(JSON.stringify(invoice.toObject()));

      // تحديث البيانات
      Object.keys(updateData).forEach(key => {
        if (key !== 'invoiceNumber' && key !== '_id') {
          invoice[key] = updateData[key];
        }
      });

      // إعادة حساب الإجماليات
      invoice.calculateTotals();

      // حفظ الفاتورة
      await invoice.save();

      // تسجيل سجل التدقيق
      const changes = this._detectChanges(previousData, invoice.toObject());
      await this.addAuditTrail(
        invoice._id,
        'UPDATE',
        userId,
        changes
      );

      logger.info(`تم تحديث الفاتورة: ${invoice.invoiceNumber}`);

      return {
        success: true,
        message: 'تم تحديث الفاتورة بنجاح',
        invoice,
      };
    } catch (error) {
      logger.error('خطأ في تحديث الفاتورة:', error);
      throw error;
    }
  }

  /**
   * الحصول على الفاتورة
   */
  async getInvoice(invoiceId) {
    try {
      const invoice = await SmartInvoice.findById(invoiceId)
        .populate('createdBy', 'name email')
        .populate('customer.customerId');

      if (!invoice) {
        throw new Error('الفاتورة غير موجودة');
      }

      // زيادة عدد مرات الفحص
      invoice.analytics.viewCount += 1;
      await invoice.save();

      return {
        success: true,
        invoice,
      };
    } catch (error) {
      logger.error('خطأ في الحصول على الفاتورة:', error);
      throw error;
    }
  }

  /**
   * الحصول على قائمة الفواتير مع التصفية والفرز
   */
  async listInvoices(filters = {}, pagination = {}) {
    try {
      const {
        status,
        customerId,
        dateFrom,
        dateTo,
        minAmount,
        maxAmount,
        searchText,
        sortBy = 'invoiceDate',
        sortOrder = -1,
      } = filters;

      const {
        page = 1,
        limit = 20,
      } = pagination;

      // بناء كائن البحث
      const query = {};

      if (status) {
        query.status = status;
      }

      if (customerId) {
        query['customer.customerId'] = customerId;
      }

      if (dateFrom || dateTo) {
        query.invoiceDate = {};
        if (dateFrom) query.invoiceDate.$gte = new Date(dateFrom);
        if (dateTo) query.invoiceDate.$lte = new Date(dateTo);
      }

      if (minAmount || maxAmount) {
        query.totalAmount = {};
        if (minAmount) query.totalAmount.$gte = minAmount;
        if (maxAmount) query.totalAmount.$lte = maxAmount;
      }

      if (searchText) {
        query.$or = [
          { invoiceNumber: new RegExp(searchText, 'i') },
          { 'customer.name': new RegExp(searchText, 'i') },
          { 'customer.email': new RegExp(searchText, 'i') },
        ];
      }

      // السؤال
      const skip = (page - 1) * limit;
      const invoices = await SmartInvoice.find(query)
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit)
        .populate('createdBy', 'name email');

      const total = await SmartInvoice.countDocuments(query);

      return {
        success: true,
        invoices,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('خطأ في قائمة الفواتير:', error);
      throw error;
    }
  }

  /**
   * تسجيل دفعة على الفاتورة
   */
  async recordPayment(invoiceId, paymentData, userId) {
    try {
      const invoice = await SmartInvoice.findById(invoiceId);

      if (!invoice) {
        throw new Error('الفاتورة غير موجودة');
      }

      const {
        amount,
        method,
        reference,
        discount = 0,
      } = paymentData;

      // التحقق من المبلغ
      if (amount <= 0) {
        throw new Error('مبلغ الدفعة يجب أن يكون أكثر من صفر');
      }

      if (amount + invoice.paidAmount > invoice.totalAmount) {
        throw new Error(`مبلغ الدفعة أكثر من المبلغ المتبقي: ${invoice.remainingAmount}`);
      }

      // تسجيل الدفعة
      invoice.recordPayment(amount, method, reference, discount);

      // تسجيل سجل التدقيق
      await this.addAuditTrail(invoiceId, 'PAYMENT_RECORDED', userId, {
        amount,
        method,
        reference,
        discount,
      });

      logger.info(`تم تسجيل دفعة على الفاتورة: ${invoice.invoiceNumber}`);

      return {
        success: true,
        message: 'تم تسجيل الدفعة بنجاح',
        invoice,
      };
    } catch (error) {
      logger.error('خطأ في تسجيل الدفعة:', error);
      throw error;
    }
  }

  /**
   * إرسال الفاتورة عبر البريد الإلكتروني
   */
  async sendInvoice(invoiceId, recipientEmail, userId) {
    try {
      const invoice = await SmartInvoice.findById(invoiceId);

      if (!invoice) {
        throw new Error('الفاتورة غير موجودة');
      }

      // هنا يتم التكامل مع خدمة البريد الإلكتروني
      // للآن نقوم بتسجيل البيانات فقط
      invoice.sentTo = {
        email: recipientEmail,
        sentDate: new Date(),
        status: 'sent',
      };

      invoice.status = 'sent';
      await invoice.save();

      // تسجيل سجل التدقيق
      await this.addAuditTrail(invoiceId, 'INVOICE_SENT', userId, {
        recipientEmail,
        sentDate: new Date(),
      });

      logger.info(`تم إرسال الفاتورة ${invoice.invoiceNumber} إلى ${recipientEmail}`);

      return {
        success: true,
        message: 'تم إرسال الفاتورة بنجاح',
        invoice,
      };
    } catch (error) {
      logger.error('خطأ في إرسال الفاتورة:', error);
      throw error;
    }
  }

  /**
   * إلغاء الفاتورة
   */
  async cancelInvoice(invoiceId, reason, userId) {
    try {
      const invoice = await SmartInvoice.findById(invoiceId);

      if (!invoice) {
        throw new Error('الفاتورة غير موجودة');
      }

      if (invoice.status === 'cancelled') {
        throw new Error('الفاتورة ملغاة بالفعل');
      }

      if (invoice.paidAmount > 0) {
        throw new Error('لا يمكن إلغاء فاتورة يوجد دفعات عليها');
      }

      invoice.status = 'cancelled';
      invoice.statusHistory.push({
        status: 'cancelled',
        changedAt: new Date(),
        changedBy: userId,
        reason,
      });

      await invoice.save();

      // تسجيل سجل التدقيق
      await this.addAuditTrail(invoiceId, 'CANCELLED', userId, { reason });

      logger.info(`تم إلغاء الفاتورة: ${invoice.invoiceNumber}`);

      return {
        success: true,
        message: 'تم إلغاء الفاتورة بنجاح',
        invoice,
      };
    } catch (error) {
      logger.error('خطأ في إلغاء الفاتورة:', error);
      throw error;
    }
  }

  /**
   * الفواتير المتأخرة
   */
  async getOverdueInvoices(pageSize = 50) {
    try {
      const overdueInvoices = await SmartInvoice.findOverdue();

      return {
        success: true,
        count: overdueInvoices.length,
        invoices: overdueInvoices.slice(0, pageSize),
      };
    } catch (error) {
      logger.error('خطأ في الحصول على الفواتير المتأخرة:', error);
      throw error;
    }
  }

  /**
   * الفواتير القريبة من الاستحقاق
   */
  async getAlmostOverdueInvoices(daysThreshold = 3) {
    try {
      const almostOverdueInvoices = await SmartInvoice.findAlmostOverdue(
        daysThreshold
      );

      return {
        success: true,
        count: almostOverdueInvoices.length,
        invoices: almostOverdueInvoices,
      };
    } catch (error) {
      logger.error('خطأ في الحصول على الفواتير القريبة من الاستحقاق:', error);
      throw error;
    }
  }

  /**
   * الحصول على الإحصائيات
   */
  async getStatistics(filters = {}) {
    try {
      const stats = await SmartInvoice.getStatistics(filters);

      if (!stats || stats.length === 0) {
        return {
          success: true,
          statistics: {
            totalInvoices: 0,
            totalAmount: 0,
            totalPaid: 0,
            totalPending: 0,
            totalOverdue: 0,
            averageInvoiceAmount: 0,
            collectionRate: 0,
          },
        };
      }

      const stat = stats[0];

      return {
        success: true,
        statistics: {
          totalInvoices: stat.totalInvoices,
          totalAmount: stat.totalAmount,
          totalPaid: stat.totalPaid,
          totalPending: stat.totalAmount - stat.totalPaid,
          totalOverdue: stat.totalOverdue,
          averageInvoiceAmount: stat.totalAmount / stat.totalInvoices,
          collectionRate: ((stat.totalPaid / stat.totalAmount) * 100).toFixed(2),
        },
      };
    } catch (error) {
      logger.error('خطأ في الحصول على الإحصائيات:', error);
      throw error;
    }
  }

  /**
   * التنبؤ بالدفع (AI/ML)
   */
  async predictPayment(invoiceId) {
    try {
      const invoice = await SmartInvoice.findById(invoiceId);

      if (!invoice) {
        throw new Error('الفاتورة غير موجودة');
      }

      // خوارزمية بسيطة للتنبؤ
      // يمكن استبدالها بنموذج ML متقدم لاحقاً
      const daysUntilDue = invoice.daysUntilDue;
      const customerCreditRating = invoice.customer.creditRating;
      const customerRiskLevel = invoice.customer.riskLevel;

      let confidence = 0.5;
      let predictedPaymentDays = daysUntilDue;
      let riskScore = 0;

      // تحسين التنبؤ بناءً على البيانات التاريخية
      if (customerCreditRating >= 4) {
        confidence = 0.85;
        riskScore = 0.1;
      } else if (customerCreditRating >= 3) {
        confidence = 0.7;
        riskScore = 0.3;
      } else {
        confidence = 0.5;
        riskScore = 0.6;
      }

      const predictedPaymentDate = new Date(
        invoice.dueDate.getTime() + predictedPaymentDays * 24 * 60 * 60 * 1000
      );

      invoice.smartData.paymentPrediction = {
        predictedPaymentDate,
        confidence: parseFloat((confidence * 100).toFixed(2)),
        riskScore: parseFloat((riskScore * 100).toFixed(2)),
      };

      await invoice.save();

      return {
        success: true,
        prediction: invoice.smartData.paymentPrediction,
      };
    } catch (error) {
      logger.error('خطأ في التنبؤ بالدفع:', error);
      throw error;
    }
  }

  /**
   * التوصيات الذكية
   */
  async getSmartRecommendations(invoiceId) {
    try {
      const invoice = await SmartInvoice.findById(invoiceId);

      if (!invoice) {
        throw new Error('الفاتورة غير موجودة');
      }

      const recommendations = [];

      // توصيات بناءً على حالة الفاتورة
      if (invoice.isOverdue) {
        recommendations.push(
          'الفاتورة متأخرة - يُنصح بإرسال تنبيه فوري للعميل'
        );
        recommendations.push(
          'فكر في تطبيق رسوم التأخير حسب شروط الدفع'
        );
      }

      if (invoice.daysUntilDue <= 3 && invoice.daysUntilDue > 0) {
        recommendations.push(
          'الفاتورة قريبة من الاستحقاق - يُنصح بإرسال تذكير ودي'
        );
      }

      // توصيات بناءً على حالة العميل
      if (invoice.customer.riskLevel === 'high') {
        recommendations.push(
          'هذا العميل له مستوى خطر عالي - يُنصح بمتابعة دقيقة'
        );
      }

      // توصيات بناءً على نسبة الدفع
      if (invoice.paymentPercentage >= 50 && invoice.paymentPercentage < 100) {
        recommendations.push(
          'الفاتورة لديها دفعة جزئية - يُنصح بمتابعة الرصيد المتبقي'
        );
      }

      // توصيات مالية
      if (invoice.totalAmount < 1000) {
        recommendations.push(
          'الفاتورة صغيرة - فكر في دمج عدة فواتير صغيرة معاً'
        );
      }

      invoice.smartData.aiRecommendations = recommendations;
      await invoice.save();

      return {
        success: true,
        recommendations,
      };
    } catch (error) {
      logger.error('خطأ في الحصول على التوصيات الذكية:', error);
      throw error;
    }
  }

  /**
   * إضافة تنبيه مخصص
   */
  async addAlert(invoiceId, message, severity, userId) {
    try {
      const invoice = await SmartInvoice.findById(invoiceId);

      if (!invoice) {
        throw new Error('الفاتورة غير موجودة');
      }

      invoice.addCustomAlert(message, severity);

      // تسجيل سجل التدقيق
      await this.addAuditTrail(invoiceId, 'ALERT_ADDED', userId, {
        message,
        severity,
      });

      return {
        success: true,
        message: 'تم إضافة التنبيه بنجاح',
      };
    } catch (error) {
      logger.error('خطأ في إضافة التنبيه:', error);
      throw error;
    }
  }

  /**
   * الحصول على سجل التدقيق
   */
  async getAuditTrail(invoiceId) {
    try {
      const invoice = await SmartInvoice.findById(invoiceId);

      if (!invoice) {
        throw new Error('الفاتورة غير موجودة');
      }

      return {
        success: true,
        auditTrail: invoice.auditTrail,
      };
    } catch (error) {
      logger.error('خطأ في الحصول على سجل التدقيق:', error);
      throw error;
    }
  }

  /**
   * إضافة إدخال لسجل التدقيق
   */
  async addAuditTrail(invoiceId, action, userId, details) {
    try {
      const invoice = await SmartInvoice.findById(invoiceId);

      if (invoice) {
        invoice.auditTrail.push({
          action,
          performedBy: userId,
          timestamp: new Date(),
          details,
        });

        await invoice.save();
      }
    } catch (error) {
      logger.error('خطأ في إضافة سجل التدقيق:', error);
    }
  }

  /**
   * كشف التغييرات بين نسختين
   */
  _detectChanges(previousData, currentData) {
    const changes = {};

    Object.keys(currentData).forEach(key => {
      if (
        JSON.stringify(previousData[key]) !==
        JSON.stringify(currentData[key])
      ) {
        changes[key] = {
          old: previousData[key],
          new: currentData[key],
        };
      }
    });

    return changes;
  }

  /**
   * تصدير الفواتير كـ CSV
   */
  async exportToCSV(filters = {}) {
    try {
      const invoices = await SmartInvoice.find(filters);

      let csv =
        'رقم الفاتورة,اسم العميل,المبلغ,الحالة,تاريخ الاستحقاق,المبلغ المدفوع\n';

      invoices.forEach(invoice => {
        csv += `"${invoice.invoiceNumber}","${invoice.customer.name}","${invoice.totalAmount}","${invoice.status}","${invoice.dueDate.toLocaleDateString('ar-SA')}","${invoice.paidAmount}"\n`;
      });

      return {
        success: true,
        csv,
      };
    } catch (error) {
      logger.error('خطأ في تصدير CSV:', error);
      throw error;
    }
  }

  /**
   * تصدير الفواتير كـ JSON
   */
  async exportToJSON(filters = {}) {
    try {
      const invoices = await SmartInvoice.find(filters).lean();

      return {
        success: true,
        data: invoices,
        count: invoices.length,
      };
    } catch (error) {
      logger.error('خطأ في تصدير JSON:', error);
      throw error;
    }
  }
}

module.exports = new SmartInvoiceService();
