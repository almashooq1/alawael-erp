/* eslint-disable no-unused-vars */
/**
 * ===================================================================
 * ACCOUNTING EXPENSE CONTROLLER - متحكم المصروفات المحاسبية
 * ===================================================================
 */

const AccountingExpense = require('../models/AccountingExpense');
const JournalEntry = require('../models/JournalEntry');
const logger = require('../utils/logger');
const { escapeRegex } = require('../utils/sanitize');

// @desc    Get all expenses
// @route   GET /api/accounting/expenses
// @access  Private
exports.getAllExpenses = async (req, res) => {
  try {
    const { category, status, search, dateFrom, dateTo } = req.query;

    const query = {};

    if (category && category !== 'all') {
      query.category = category;
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { description: { $regex: escapeRegex(search), $options: 'i' } },
        { vendor: { $regex: escapeRegex(search), $options: 'i' } },
        { reference: { $regex: escapeRegex(search), $options: 'i' } },
      ];
    }

    // Date range filter
    if (dateFrom || dateTo) {
      query.date = {};
      if (dateFrom) query.date.$gte = new Date(dateFrom);
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        query.date.$lte = endDate;
      }
    }

    const expenses = await AccountingExpense.find(query)
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email')
      .populate('rejectedBy', 'name email')
      .sort({ date: -1 });

    res.json({
      success: true,
      data: expenses,
    });
  } catch (error) {
    logger.error('Error fetching expenses:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء جلب المصروفات',
      error: 'حدث خطأ داخلي',
    });
  }
};

// @desc    Get expense statistics
// @route   GET /api/accounting/expenses/stats
// @access  Private
exports.getExpenseStats = async (req, res) => {
  try {
    const totalExpenses = await AccountingExpense.countDocuments();

    const aggregateStats = await AccountingExpense.aggregate([
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
        },
      },
    ]);

    const statusCounts = await AccountingExpense.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    // إحصائيات هذا الشهر
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const monthStats = await AccountingExpense.aggregate([
      {
        $match: {
          date: { $gte: startOfMonth },
        },
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          amount: { $sum: '$amount' },
        },
      },
    ]);

    const stats = {
      totalExpenses,
      totalAmount: aggregateStats[0]?.totalAmount || 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      thisMonth: monthStats[0]?.count || 0,
      thisMonthAmount: monthStats[0]?.amount || 0,
    };

    statusCounts.forEach(item => {
      if (item._id) {
        stats[item._id] = item.count;
      }
    });

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Error fetching expense stats:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء جلب الإحصائيات',
      error: 'حدث خطأ داخلي',
    });
  }
};

// @desc    Get single expense
// @route   GET /api/accounting/expenses/:id
// @access  Private
exports.getExpenseById = async (req, res) => {
  try {
    const expense = await AccountingExpense.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email')
      .populate('rejectedBy', 'name email');

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'المصروف غير موجود',
      });
    }

    res.json({
      success: true,
      data: expense,
    });
  } catch (error) {
    logger.error('Error fetching expense:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء جلب المصروف',
      error: 'حدث خطأ داخلي',
    });
  }
};

// @desc    Create new expense
// @route   POST /api/accounting/expenses
// @access  Private
exports.createExpense = async (req, res) => {
  try {
    const expenseData = {
      ...req.body,
      createdBy: req.user?._id,
    };

    const expense = await AccountingExpense.create(expenseData);

    await expense.populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      data: expense,
      message: 'تم إنشاء المصروف بنجاح',
    });
  } catch (error) {
    logger.error('Error creating expense:', error);
    res.status(400).json({
      success: false,
      message: 'حدث خطأ أثناء إنشاء المصروف',
      error: 'حدث خطأ داخلي',
    });
  }
};

// @desc    Update expense
// @route   PUT /api/accounting/expenses/:id
// @access  Private
exports.updateExpense = async (req, res) => {
  try {
    const expense = await AccountingExpense.findById(req.params.id);

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'المصروف غير موجود',
      });
    }

    // لا يمكن تعديل مصروف موافق عليه أو مرفوض
    if (expense.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'لا يمكن تعديل مصروف موافق عليه أو مرفوض',
      });
    }

    const updatedExpense = await AccountingExpense.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedBy: req.user?._id },
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email');

    res.json({
      success: true,
      data: updatedExpense,
      message: 'تم تحديث المصروف بنجاح',
    });
  } catch (error) {
    logger.error('Error updating expense:', error);
    res.status(400).json({
      success: false,
      message: 'حدث خطأ أثناء تحديث المصروف',
      error: 'حدث خطأ داخلي',
    });
  }
};

// @desc    Delete expense
// @route   DELETE /api/accounting/expenses/:id
// @access  Private
exports.deleteExpense = async (req, res) => {
  try {
    const expense = await AccountingExpense.findById(req.params.id);

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'المصروف غير موجود',
      });
    }

    // يمكن حذف المصروفات المعلقة فقط
    if (expense.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'يمكن حذف المصروفات المعلقة فقط',
      });
    }

    await expense.remove();

    res.json({
      success: true,
      message: 'تم حذف المصروف بنجاح',
    });
  } catch (error) {
    logger.error('Error deleting expense:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء حذف المصروف',
      error: 'حدث خطأ داخلي',
    });
  }
};

// @desc    Approve expense
// @route   POST /api/accounting/expenses/:id/approve
// @access  Private
exports.approveExpense = async (req, res) => {
  try {
    const expense = await AccountingExpense.findById(req.params.id);

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'المصروف غير موجود',
      });
    }

    if (expense.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'لا يمكن الموافقة على مصروف موافق عليه أو مرفوض مسبقاً',
      });
    }

    await expense.approve(req.user?._id);
    await expense.populate('approvedBy', 'name email');

    // إنشاء قيد يومية تلقائي عند الموافقة على المصروف (القيد المزدوج)
    try {
      // خريطة أكواد الحسابات حسب فئة المصروف
      const expenseAccountMap = {
        salaries: { code: '5100', name: 'مصروفات الرواتب والأجور' },
        rent: { code: '5200', name: 'مصروفات الإيجار' },
        utilities: { code: '5300', name: 'مصروفات المرافق' },
        supplies: { code: '5400', name: 'مصروفات المستلزمات' },
        marketing: { code: '5500', name: 'مصروفات التسويق' },
        transportation: { code: '5600', name: 'مصروفات المواصلات' },
        maintenance: { code: '5700', name: 'مصروفات الصيانة' },
        insurance: { code: '5800', name: 'مصروفات التأمينات' },
        professional: { code: '5900', name: 'مصروفات الخدمات المهنية' },
        training: { code: '6000', name: 'مصروفات التدريب' },
        travel: { code: '6100', name: 'مصروفات السفر' },
        meals: { code: '6200', name: 'مصروفات الوجبات' },
        depreciation: { code: '6300', name: 'مصروفات الاستهلاك' },
        other: { code: '6900', name: 'مصروفات أخرى' },
      };

      const paymentAccountMap = {
        cash: { code: '1100', name: 'الصندوق (النقدية)' },
        bank: { code: '1200', name: 'البنك' },
        credit: { code: '2100', name: 'بطاقات الائتمان' },
        cheque: { code: '1200', name: 'البنك' },
      };

      const expenseAccount = expenseAccountMap[expense.category] || expenseAccountMap.other;
      const paymentAccount = paymentAccountMap[expense.paymentMethod] || paymentAccountMap.cash;

      const journalEntry = new JournalEntry({
        date: expense.date || new Date(),
        description: `مصروف: ${expense.description} - ${expense.vendor || 'بدون مورد'}`,
        type: 'automatic',
        status: 'posted',
        postedBy: req.user?._id,
        postedAt: new Date(),
        sourceDocument: {
          type: 'expense',
          id: expense._id,
        },
        lines: [
          {
            accountCode: expenseAccount.code,
            account: expenseAccount.name,
            debit: expense.amount,
            credit: 0,
            description: expense.description,
          },
          {
            accountCode: paymentAccount.code,
            account: paymentAccount.name,
            debit: 0,
            credit: expense.amount,
            description: `سداد ${expense.description}`,
          },
        ],
        createdBy: req.user?._id,
        createdByName: req.user?.name || req.user?.fullName,
      });

      await journalEntry.save();

      // ربط القيد بالمصروف
      expense.journalEntry = journalEntry._id;
      await expense.save();

      logger.info(`Journal entry ${journalEntry.entryNumber} created for expense ${expense._id}`);
    } catch (jeError) {
      // لا نفشل الموافقة إذا فشل إنشاء القيد - نسجل التحذير فقط
      logger.error('Failed to create journal entry for expense approval:', jeError);
    }

    res.json({
      success: true,
      data: expense,
      message: 'تم الموافقة على المصروف بنجاح',
    });
  } catch (error) {
    logger.error('Error approving expense:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء الموافقة على المصروف',
      error: 'حدث خطأ داخلي',
    });
  }
};

// @desc    Reject expense
// @route   POST /api/accounting/expenses/:id/reject
// @access  Private
exports.rejectExpense = async (req, res) => {
  try {
    const expense = await AccountingExpense.findById(req.params.id);

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'المصروف غير موجود',
      });
    }

    if (expense.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'لا يمكن رفض مصروف موافق عليه أو مرفوض مسبقاً',
      });
    }

    const { rejectionReason } = req.body;

    if (!rejectionReason) {
      return res.status(400).json({
        success: false,
        message: 'يجب تحديد سبب الرفض',
      });
    }

    await expense.reject(req.user?._id, rejectionReason);
    await expense.populate('rejectedBy', 'name email');

    res.json({
      success: true,
      data: expense,
      message: 'تم رفض المصروف',
    });
  } catch (error) {
    logger.error('Error rejecting expense:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء رفض المصروف',
      error: 'حدث خطأ داخلي',
    });
  }
};
