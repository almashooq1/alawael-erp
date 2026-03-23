/* eslint-disable no-unused-vars */
/**
 * ===================================================================
 * FISCAL PERIOD SERVICE - خدمة إدارة الفترات المحاسبية
 * ===================================================================
 * النسخة: 1.0.0
 * الوصف: إدارة شاملة للسنوات والفترات المالية مع دعم عمليات الإقفال
 * ===================================================================
 */

const FiscalPeriod = require('../models/FiscalPeriod');
const JournalEntry = require('../models/JournalEntry');
const Account = require('../models/Account');
const logger = require('../utils/logger');

class FiscalPeriodService {
  // ===================================================================
  // 1. إدارة الفترات المحاسبية - CRUD
  // ===================================================================

  /**
   * إنشاء فترة محاسبية جديدة
   */
  static async createFiscalPeriod(data) {
    const {
      name,
      code,
      periodType,
      fiscalYear,
      startDate,
      endDate,
      createdBy,
    } = data;

    // التحقق من عدم وجود كود مكرر
    const existing = await FiscalPeriod.findOne({ code, isDeleted: false });
    if (existing) {
      throw new Error('كود الفترة المحاسبية موجود بالفعل');
    }

    // التحقق من عدم تداخل الفترات
    const overlap = await FiscalPeriod.findOne({
      fiscalYear,
      periodType,
      isDeleted: false,
      $or: [
        { startDate: { $lte: new Date(endDate) }, endDate: { $gte: new Date(startDate) } },
      ],
    });

    if (overlap) {
      throw new Error('توجد فترة محاسبية متداخلة مع هذه الفترة');
    }

    // التحقق من صحة التواريخ
    if (new Date(startDate) >= new Date(endDate)) {
      throw new Error('تاريخ البداية يجب أن يكون قبل تاريخ النهاية');
    }

    const period = await FiscalPeriod.create({
      name,
      code,
      periodType,
      fiscalYear,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      status: 'open',
      createdBy,
    });

    logger.info(`[FiscalPeriod] Created period: ${code} (${fiscalYear})`);

    return {
      success: true,
      period,
    };
  }

  /**
   * الحصول على جميع الفترات المحاسبية
   */
  static async getFiscalPeriods(filters = {}) {
    const query = { isDeleted: false };

    if (filters.fiscalYear) query.fiscalYear = filters.fiscalYear;
    if (filters.periodType) query.periodType = filters.periodType;
    if (filters.status) query.status = filters.status;

    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const skip = (page - 1) * limit;

    const [periods, total] = await Promise.all([
      FiscalPeriod.find(query)
        .sort({ fiscalYear: -1, startDate: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      FiscalPeriod.countDocuments(query),
    ]);

    return {
      success: true,
      periods,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * الحصول على فترة محاسبية بالمعرف
   */
  static async getFiscalPeriodById(periodId) {
    const period = await FiscalPeriod.findOne({
      _id: periodId,
      isDeleted: false,
    }).lean();

    if (!period) {
      throw new Error('الفترة المحاسبية غير موجودة');
    }

    return { success: true, period };
  }

  /**
   * تحديث فترة محاسبية
   */
  static async updateFiscalPeriod(periodId, updateData) {
    const period = await FiscalPeriod.findOne({
      _id: periodId,
      isDeleted: false,
    });

    if (!period) {
      throw new Error('الفترة المحاسبية غير موجودة');
    }

    // لا يمكن تعديل فترة مقفلة
    if (period.status === 'locked') {
      throw new Error('لا يمكن تعديل فترة مقفلة');
    }

    // لا يمكن تعديل فترة مغلقة إلا لإعادة فتحها
    if (period.status === 'closed' && updateData.status !== 'open') {
      throw new Error('الفترة مغلقة، يمكن فقط إعادة فتحها');
    }

    Object.assign(period, updateData);
    await period.save();

    logger.info(`[FiscalPeriod] Updated period: ${period.code}`);

    return { success: true, period };
  }

  /**
   * حذف فترة محاسبية (حذف ناعم)
   */
  static async deleteFiscalPeriod(periodId) {
    const period = await FiscalPeriod.findOne({
      _id: periodId,
      isDeleted: false,
    });

    if (!period) {
      throw new Error('الفترة المحاسبية غير موجودة');
    }

    if (['closed', 'locked'].includes(period.status)) {
      throw new Error('لا يمكن حذف فترة مغلقة أو مقفلة');
    }

    // التحقق من عدم وجود قيود مرتبطة
    const entries = await JournalEntry.countDocuments({
      date: { $gte: period.startDate, $lte: period.endDate },
      status: 'posted',
    });

    if (entries > 0) {
      throw new Error('لا يمكن حذف فترة تحتوي على قيود مرحلة');
    }

    period.isDeleted = true;
    await period.save();

    logger.info(`[FiscalPeriod] Deleted period: ${period.code}`);

    return { success: true, deletedId: periodId };
  }

  // ===================================================================
  // 2. عمليات إدارة الفترات
  // ===================================================================

  /**
   * الحصول على الفترة المحاسبية الحالية (المفتوحة)
   */
  static async getCurrentPeriod() {
    const now = new Date();

    const period = await FiscalPeriod.findOne({
      status: 'open',
      startDate: { $lte: now },
      endDate: { $gte: now },
      isDeleted: false,
    }).lean();

    if (!period) {
      throw new Error('لا توجد فترة محاسبية مفتوحة للتاريخ الحالي');
    }

    return { success: true, period };
  }

  /**
   * التحقق من إمكانية الترحيل في تاريخ معين
   */
  static async validatePostingDate(date) {
    const postingDate = new Date(date);

    const period = await FiscalPeriod.findOne({
      startDate: { $lte: postingDate },
      endDate: { $gte: postingDate },
      isDeleted: false,
    }).lean();

    if (!period) {
      return {
        valid: false,
        reason: 'لا توجد فترة محاسبية لهذا التاريخ',
      };
    }

    if (period.status !== 'open') {
      return {
        valid: false,
        reason: `الفترة المحاسبية ${period.code} بحالة: ${period.status}`,
        period,
      };
    }

    return { valid: true, period };
  }

  /**
   * إغلاق فترة محاسبية
   */
  static async closePeriod(periodId, userId) {
    const period = await FiscalPeriod.findOne({
      _id: periodId,
      isDeleted: false,
    });

    if (!period) {
      throw new Error('الفترة المحاسبية غير موجودة');
    }

    if (period.status !== 'open') {
      throw new Error('لا يمكن إغلاق فترة غير مفتوحة');
    }

    // التحقق من عدم وجود قيود مسودة
    const draftEntries = await JournalEntry.countDocuments({
      date: { $gte: period.startDate, $lte: period.endDate },
      status: 'draft',
    });

    if (draftEntries > 0) {
      throw new Error(`يوجد ${draftEntries} قيد مسودة يجب ترحيلها أو حذفها قبل الإغلاق`);
    }

    // حساب الأرصدة الختامية
    const closingBalances = await this._calculatePeriodBalances(period);

    // تحديث الفترة
    period.status = 'closing';
    period.closingBalances = closingBalances;
    period.closingSteps = [
      {
        step: 'validate_drafts',
        status: 'completed',
        completedAt: new Date(),
        completedBy: userId,
        notes: 'تم التحقق من عدم وجود مسودات',
      },
      {
        step: 'calculate_balances',
        status: 'completed',
        completedAt: new Date(),
        completedBy: userId,
        notes: 'تم حساب الأرصدة الختامية',
      },
    ];
    period.closedBy = userId;
    period.closedAt = new Date();
    period.status = 'closed';

    // حساب عدد القيود والمعاملات
    const journalCount = await JournalEntry.countDocuments({
      date: { $gte: period.startDate, $lte: period.endDate },
      status: 'posted',
    });
    period.journalEntryCount = journalCount;

    await period.save();

    logger.info(`[FiscalPeriod] Closed period: ${period.code} by user ${userId}`);

    return {
      success: true,
      period,
      closingBalances,
    };
  }

  /**
   * قفل فترة محاسبية (لا يمكن التراجع عنها بسهولة)
   */
  static async lockPeriod(periodId, userId) {
    const period = await FiscalPeriod.findOne({
      _id: periodId,
      isDeleted: false,
    });

    if (!period) {
      throw new Error('الفترة المحاسبية غير موجودة');
    }

    if (period.status !== 'closed') {
      throw new Error('يجب إغلاق الفترة قبل قفلها');
    }

    period.status = 'locked';
    period.closingSteps.push({
      step: 'lock_period',
      status: 'completed',
      completedAt: new Date(),
      completedBy: userId,
      notes: 'تم قفل الفترة نهائياً',
    });

    await period.save();

    logger.info(`[FiscalPeriod] Locked period: ${period.code}`);

    return { success: true, period };
  }

  /**
   * إعادة فتح فترة مغلقة
   */
  static async reopenPeriod(periodId, userId, reason) {
    const period = await FiscalPeriod.findOne({
      _id: periodId,
      isDeleted: false,
    });

    if (!period) {
      throw new Error('الفترة المحاسبية غير موجودة');
    }

    if (period.status === 'locked') {
      throw new Error('لا يمكن إعادة فتح فترة مقفلة');
    }

    if (period.status !== 'closed') {
      throw new Error('الفترة ليست مغلقة');
    }

    period.status = 'open';
    period.closingSteps.push({
      step: 'reopen_period',
      status: 'completed',
      completedAt: new Date(),
      completedBy: userId,
      notes: `إعادة فتح: ${reason || 'بدون سبب'}`,
    });

    await period.save();

    logger.info(`[FiscalPeriod] Reopened period: ${period.code} — reason: ${reason}`);

    return { success: true, period };
  }

  // ===================================================================
  // 3. قيود الإقفال والأرصدة الافتتاحية
  // ===================================================================

  /**
   * إنشاء قيود إقفال نهاية السنة
   * يقفل حسابات الإيرادات والمصروفات في حساب الأرباح المحتجزة
   */
  static async generateYearEndClosingEntries(fiscalYear, userId) {
    // الحصول على جميع فترات السنة
    const periods = await FiscalPeriod.find({
      fiscalYear,
      isDeleted: false,
    }).lean();

    if (periods.length === 0) {
      throw new Error('لا توجد فترات محاسبية لهذه السنة');
    }

    // التحقق من إغلاق جميع الفترات
    const openPeriods = periods.filter(p => p.status === 'open');
    if (openPeriods.length > 0) {
      throw new Error(`يوجد ${openPeriods.length} فترة مفتوحة يجب إغلاقها أولاً`);
    }

    // حساب إجمالي الإيرادات والمصروفات للسنة
    const yearStart = new Date(fiscalYear, 0, 1);
    const yearEnd = new Date(fiscalYear, 11, 31, 23, 59, 59);

    const revenueAccounts = await Account.find({
      type: 'revenue',
      isActive: true,
    }).lean();

    const expenseAccounts = await Account.find({
      type: 'expense',
      isActive: true,
    }).lean();

    const closingLines = [];
    let totalRevenue = 0;
    let totalExpenses = 0;

    // قيود إقفال الإيرادات (مدين الإيراد، دائن ملخص الدخل)
    for (const account of revenueAccounts) {
      const balance = await this._getAccountBalance(account._id, yearStart, yearEnd);
      if (Math.abs(balance) > 0.01) {
        totalRevenue += balance;
        closingLines.push({
          accountId: account._id,
          account: account.name,
          accountCode: account.code,
          debit: balance,
          credit: 0,
          description: `إقفال إيراد: ${account.name}`,
        });
      }
    }

    // قيود إقفال المصروفات (مدين ملخص الدخل، دائن المصروف)
    for (const account of expenseAccounts) {
      const balance = await this._getAccountBalance(account._id, yearStart, yearEnd);
      if (Math.abs(balance) > 0.01) {
        totalExpenses += balance;
        closingLines.push({
          accountId: account._id,
          account: account.name,
          accountCode: account.code,
          debit: 0,
          credit: balance,
          description: `إقفال مصروف: ${account.name}`,
        });
      }
    }

    const netIncome = totalRevenue - totalExpenses;

    // إضافة صافي الدخل إلى الأرباح المحتجزة
    const retainedEarnings = await Account.findOne({
      category: 'retained_earnings',
      isActive: true,
    });

    if (retainedEarnings && Math.abs(netIncome) > 0.01) {
      if (netIncome > 0) {
        closingLines.push({
          accountId: retainedEarnings._id,
          account: retainedEarnings.name,
          accountCode: retainedEarnings.code,
          debit: 0,
          credit: netIncome,
          description: 'ترحيل صافي الربح إلى الأرباح المحتجزة',
        });
      } else {
        closingLines.push({
          accountId: retainedEarnings._id,
          account: retainedEarnings.name,
          accountCode: retainedEarnings.code,
          debit: Math.abs(netIncome),
          credit: 0,
          description: 'ترحيل صافي الخسارة إلى الأرباح المحتجزة',
        });
      }
    }

    // إنشاء قيد الإقفال إذا كانت هناك سطور
    let closingEntry = null;
    if (closingLines.length > 0) {
      closingEntry = await JournalEntry.create({
        reference: `YEC-${fiscalYear}`,
        date: yearEnd,
        description: `قيد إقفال السنة المالية ${fiscalYear}`,
        type: 'closing',
        lines: closingLines,
        status: 'posted',
        postedBy: userId,
        postedAt: new Date(),
        createdBy: userId,
      });

      logger.info(`[FiscalPeriod] Year-end closing entry created: ${closingEntry._id}`);
    }

    return {
      success: true,
      fiscalYear,
      closingEntry,
      summary: {
        totalRevenue,
        totalExpenses,
        netIncome,
        closingLinesCount: closingLines.length,
      },
    };
  }

  /**
   * إنشاء أرصدة افتتاحية للسنة الجديدة
   */
  static async generateOpeningBalances(fiscalYear, userId) {
    const previousYear = fiscalYear - 1;
    const prevYearEnd = new Date(previousYear, 11, 31, 23, 59, 59);

    // الحصول على حسابات الميزانية العمومية (أصول، خصوم، حقوق ملكية)
    const balanceSheetAccounts = await Account.find({
      type: { $in: ['asset', 'liability', 'equity'] },
      isActive: true,
      isPostable: true,
    }).lean();

    const openingLines = [];

    for (const account of balanceSheetAccounts) {
      const balance = await this._getAccountBalance(account._id, null, prevYearEnd);

      if (Math.abs(balance) > 0.01) {
        if (['asset', 'expense'].includes(account.type)) {
          openingLines.push({
            accountId: account._id,
            account: account.name,
            accountCode: account.code,
            debit: Math.abs(balance),
            credit: 0,
            description: `رصيد افتتاحي: ${account.name}`,
          });
        } else {
          openingLines.push({
            accountId: account._id,
            account: account.name,
            accountCode: account.code,
            debit: 0,
            credit: Math.abs(balance),
            description: `رصيد افتتاحي: ${account.name}`,
          });
        }
      }
    }

    let openingEntry = null;
    if (openingLines.length > 0) {
      const yearStart = new Date(fiscalYear, 0, 1);
      openingEntry = await JournalEntry.create({
        reference: `OB-${fiscalYear}`,
        date: yearStart,
        description: `الأرصدة الافتتاحية للسنة المالية ${fiscalYear}`,
        type: 'opening',
        lines: openingLines,
        status: 'posted',
        postedBy: userId,
        postedAt: new Date(),
        createdBy: userId,
      });

      logger.info(`[FiscalPeriod] Opening balances created for ${fiscalYear}`);
    }

    return {
      success: true,
      fiscalYear,
      openingEntry,
      accountsCount: openingLines.length,
    };
  }

  /**
   * إنشاء فترات تلقائية لسنة مالية
   */
  static async generatePeriodsForYear(fiscalYear, periodType, createdBy) {
    const periods = [];
    const year = Number(fiscalYear);

    if (periodType === 'month') {
      for (let month = 0; month < 12; month++) {
        const startDate = new Date(year, month, 1);
        const endDate = new Date(year, month + 1, 0, 23, 59, 59);
        const monthNum = String(month + 1).padStart(2, '0');

        periods.push({
          name: `${year} - شهر ${monthNum}`,
          code: `FP-${year}-M${monthNum}`,
          periodType: 'month',
          fiscalYear: year,
          startDate,
          endDate,
          createdBy,
        });
      }
    } else if (periodType === 'quarter') {
      for (let q = 0; q < 4; q++) {
        const startDate = new Date(year, q * 3, 1);
        const endDate = new Date(year, (q + 1) * 3, 0, 23, 59, 59);

        periods.push({
          name: `${year} - الربع ${q + 1}`,
          code: `FP-${year}-Q${q + 1}`,
          periodType: 'quarter',
          fiscalYear: year,
          startDate,
          endDate,
          createdBy,
        });
      }
    } else if (periodType === 'semi_annual') {
      periods.push(
        {
          name: `${year} - النصف الأول`,
          code: `FP-${year}-H1`,
          periodType: 'semi_annual',
          fiscalYear: year,
          startDate: new Date(year, 0, 1),
          endDate: new Date(year, 5, 30, 23, 59, 59),
          createdBy,
        },
        {
          name: `${year} - النصف الثاني`,
          code: `FP-${year}-H2`,
          periodType: 'semi_annual',
          fiscalYear: year,
          startDate: new Date(year, 6, 1),
          endDate: new Date(year, 11, 31, 23, 59, 59),
          createdBy,
        },
      );
    } else if (periodType === 'annual') {
      periods.push({
        name: `السنة المالية ${year}`,
        code: `FP-${year}-A`,
        periodType: 'annual',
        fiscalYear: year,
        startDate: new Date(year, 0, 1),
        endDate: new Date(year, 11, 31, 23, 59, 59),
        createdBy,
      });
    } else {
      throw new Error('نوع الفترة غير مدعوم');
    }

    // التحقق من عدم وجود فترات مسبقة لهذه السنة بنفس النوع
    const existing = await FiscalPeriod.countDocuments({
      fiscalYear: year,
      periodType,
      isDeleted: false,
    });

    if (existing > 0) {
      throw new Error(`توجد فترات من نوع ${periodType} للسنة ${year} بالفعل`);
    }

    const created = await FiscalPeriod.insertMany(periods);

    logger.info(`[FiscalPeriod] Generated ${created.length} periods for ${year} (${periodType})`);

    return {
      success: true,
      fiscalYear: year,
      periodType,
      periodsCreated: created.length,
      periods: created,
    };
  }

  // ===================================================================
  // 4. وظائف مساعدة خاصة
  // ===================================================================

  /**
   * حساب رصيد حساب لفترة معينة
   */
  static async _getAccountBalance(accountId, startDate, endDate) {
    const query = {
      status: 'posted',
      'lines.accountId': accountId,
    };

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const entries = await JournalEntry.find(query).lean();

    let totalDebit = 0;
    let totalCredit = 0;

    entries.forEach(entry => {
      entry.lines.forEach(line => {
        if (line.accountId && line.accountId.toString() === accountId.toString()) {
          totalDebit += line.debit || 0;
          totalCredit += line.credit || 0;
        }
      });
    });

    return totalDebit - totalCredit;
  }

  /**
   * حساب أرصدة الفترة المحاسبية
   */
  static async _calculatePeriodBalances(period) {
    const accounts = await Account.find({ isActive: true }).lean();

    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalEquity = 0;
    let totalRevenue = 0;
    let totalExpenses = 0;

    for (const account of accounts) {
      const balance = await this._getAccountBalance(
        account._id,
        period.startDate,
        period.endDate,
      );

      const absBalance = Math.abs(balance);

      switch (account.type) {
        case 'asset':
          totalAssets += absBalance;
          break;
        case 'liability':
          totalLiabilities += absBalance;
          break;
        case 'equity':
          totalEquity += absBalance;
          break;
        case 'revenue':
          totalRevenue += absBalance;
          break;
        case 'expense':
          totalExpenses += absBalance;
          break;
      }
    }

    const netIncome = totalRevenue - totalExpenses;

    return {
      totalAssets,
      totalLiabilities,
      totalEquity,
      totalRevenue,
      totalExpenses,
      retainedEarnings: netIncome,
      netIncome,
    };
  }
}

module.exports = FiscalPeriodService;
