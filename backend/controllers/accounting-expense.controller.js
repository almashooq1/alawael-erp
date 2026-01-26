/**
 * ===================================================================
 * ACCOUNTING EXPENSE CONTROLLER - متحكم المصروفات المحاسبية
 * ===================================================================
 */

const AccountingExpense = require('../models/AccountingExpense');

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
        { description: { $regex: search, $options: 'i' } },
        { vendor: { $regex: search, $options: 'i' } },
        { reference: { $regex: search, $options: 'i' } },
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
    console.error('Error fetching expenses:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء جلب المصروفات',
      error: error.message,
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
    console.error('Error fetching expense stats:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء جلب الإحصائيات',
      error: error.message,
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
    console.error('Error fetching expense:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء جلب المصروف',
      error: error.message,
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
    console.error('Error creating expense:', error);
    res.status(400).json({
      success: false,
      message: 'حدث خطأ أثناء إنشاء المصروف',
      error: error.message,
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
    console.error('Error updating expense:', error);
    res.status(400).json({
      success: false,
      message: 'حدث خطأ أثناء تحديث المصروف',
      error: error.message,
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
    console.error('Error deleting expense:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء حذف المصروف',
      error: error.message,
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

    // TODO: إنشاء قيد محاسبي تلقائياً

    res.json({
      success: true,
      data: expense,
      message: 'تم الموافقة على المصروف بنجاح',
    });
  } catch (error) {
    console.error('Error approving expense:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء الموافقة على المصروف',
      error: error.message,
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
    console.error('Error rejecting expense:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء رفض المصروف',
      error: error.message,
    });
  }
};
