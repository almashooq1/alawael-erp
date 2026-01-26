/**
 * ===================================================================
 * ACCOUNTING PAYMENT CONTROLLER - متحكم المدفوعات المحاسبية
 * ===================================================================
 */

const AccountingPayment = require('../models/AccountingPayment');

// @desc    Get all payments
// @route   GET /api/accounting/payments
// @access  Private
exports.getAllPayments = async (req, res) => {
  try {
    const { paymentMethod, status, search } = req.query;

    const query = {};

    if (paymentMethod && paymentMethod !== 'all') {
      query.paymentMethod = paymentMethod;
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    if (search) {
      query.$or = [{ reference: { $regex: search, $options: 'i' } }];
    }

    const payments = await AccountingPayment.find(query)
      .populate('invoice', 'invoiceNumber customerName totalAmount')
      .sort({ paymentDate: -1 });

    res.json({
      success: true,
      data: payments,
    });
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء جلب المدفوعات',
      error: error.message,
    });
  }
};

// @desc    Get payment statistics
// @route   GET /api/accounting/payments/stats
// @access  Private
exports.getPaymentStats = async (req, res) => {
  try {
    const totalPayments = await AccountingPayment.countDocuments();

    const aggregateStats = await AccountingPayment.aggregate([
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
        },
      },
    ]);

    const methodCounts = await AccountingPayment.aggregate([
      {
        $group: {
          _id: '$paymentMethod',
          count: { $sum: 1 },
        },
      },
    ]);

    // إحصائيات اليوم
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayStats = await AccountingPayment.aggregate([
      {
        $match: {
          paymentDate: { $gte: today },
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
      totalPayments,
      totalAmount: aggregateStats[0]?.totalAmount || 0,
      cashPayments: 0,
      bankPayments: 0,
      creditPayments: 0,
      todayPayments: todayStats[0]?.count || 0,
      todayAmount: todayStats[0]?.amount || 0,
    };

    methodCounts.forEach(item => {
      if (item._id === 'cash') stats.cashPayments = item.count;
      if (item._id === 'bank') stats.bankPayments = item.count;
      if (item._id === 'credit') stats.creditPayments = item.count;
    });

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Error fetching payment stats:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء جلب الإحصائيات',
      error: error.message,
    });
  }
};

// @desc    Get single payment
// @route   GET /api/accounting/payments/:id
// @access  Private
exports.getPaymentById = async (req, res) => {
  try {
    const payment = await AccountingPayment.findById(req.params.id)
      .populate('invoice')
      .populate('createdBy', 'name email');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'الدفعة غير موجودة',
      });
    }

    res.json({
      success: true,
      data: payment,
    });
  } catch (error) {
    console.error('Error fetching payment:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء جلب الدفعة',
      error: error.message,
    });
  }
};

// @desc    Create new payment
// @route   POST /api/accounting/payments
// @access  Private
exports.createPayment = async (req, res) => {
  try {
    const paymentData = {
      ...req.body,
      createdBy: req.user?._id,
    };

    const payment = await AccountingPayment.create(paymentData);

    // Populate invoice info
    await payment.populate('invoice');

    res.status(201).json({
      success: true,
      data: payment,
      message: 'تم إنشاء الدفعة بنجاح',
    });
  } catch (error) {
    console.error('Error creating payment:', error);
    res.status(400).json({
      success: false,
      message: 'حدث خطأ أثناء إنشاء الدفعة',
      error: error.message,
    });
  }
};

// @desc    Update payment
// @route   PUT /api/accounting/payments/:id
// @access  Private
exports.updatePayment = async (req, res) => {
  try {
    const payment = await AccountingPayment.findById(req.params.id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'الدفعة غير موجودة',
      });
    }

    // لا يمكن تعديل دفعة مكتملة
    if (payment.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'لا يمكن تعديل دفعة مكتملة',
      });
    }

    const updatedPayment = await AccountingPayment.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedBy: req.user?._id },
      { new: true, runValidators: true }
    ).populate('invoice');

    res.json({
      success: true,
      data: updatedPayment,
      message: 'تم تحديث الدفعة بنجاح',
    });
  } catch (error) {
    console.error('Error updating payment:', error);
    res.status(400).json({
      success: false,
      message: 'حدث خطأ أثناء تحديث الدفعة',
      error: error.message,
    });
  }
};

// @desc    Delete payment
// @route   DELETE /api/accounting/payments/:id
// @access  Private
exports.deletePayment = async (req, res) => {
  try {
    const payment = await AccountingPayment.findById(req.params.id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'الدفعة غير موجودة',
      });
    }

    // لا يمكن حذف دفعة مكتملة
    if (payment.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'لا يمكن حذف دفعة مكتملة',
      });
    }

    await payment.remove();

    res.json({
      success: true,
      message: 'تم حذف الدفعة بنجاح',
    });
  } catch (error) {
    console.error('Error deleting payment:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء حذف الدفعة',
      error: error.message,
    });
  }
};

// @desc    Download payment receipt PDF
// @route   GET /api/accounting/payments/:id/receipt
// @access  Private
exports.downloadReceipt = async (req, res) => {
  try {
    const payment = await AccountingPayment.findById(req.params.id).populate('invoice');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'الدفعة غير موجودة',
      });
    }

    const receiptData = await payment.generateReceipt();

    // TODO: إضافة منطق إنشاء PDF للإيصال هنا

    res.json({
      success: true,
      message: 'Receipt PDF generation not implemented yet',
      data: receiptData,
    });
  } catch (error) {
    console.error('Error generating receipt:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء إنشاء الإيصال',
      error: error.message,
    });
  }
};
