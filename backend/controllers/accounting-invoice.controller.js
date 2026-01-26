/**
 * ===================================================================
 * ACCOUNTING INVOICE CONTROLLER - متحكم الفواتير المحاسبية
 * ===================================================================
 */

const AccountingInvoice = require('../models/AccountingInvoice');
const AccountingPayment = require('../models/AccountingPayment');

// @desc    Get all invoices
// @route   GET /api/accounting/invoices
// @access  Private
exports.getAllInvoices = async (req, res) => {
  try {
    const { status, type, search } = req.query;

    const query = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    if (type && type !== 'all') {
      query.type = type;
    }

    if (search) {
      query.$or = [
        { invoiceNumber: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
      ];
    }

    const invoices = await AccountingInvoice.find(query)
      .populate('payments')
      .sort({ invoiceDate: -1 });

    res.json({
      success: true,
      data: invoices,
    });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء جلب الفواتير',
      error: error.message,
    });
  }
};

// @desc    Get invoice statistics
// @route   GET /api/accounting/invoices/stats
// @access  Private
exports.getInvoiceStats = async (req, res) => {
  try {
    const total = await AccountingInvoice.countDocuments();

    const statusCounts = await AccountingInvoice.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' },
        },
      },
    ]);

    const stats = {
      total,
      draft: 0,
      sent: 0,
      paid: 0,
      partial: 0,
      overdue: 0,
      totalAmount: 0,
      paidAmount: 0,
      pendingAmount: 0,
    };

    statusCounts.forEach(item => {
      stats[item._id] = item.count;
      stats.totalAmount += item.totalAmount;

      if (item._id === 'paid') {
        stats.paidAmount += item.totalAmount;
      } else if (item._id === 'sent' || item._id === 'partial' || item._id === 'overdue') {
        stats.pendingAmount += item.totalAmount;
      }
    });

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Error fetching invoice stats:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء جلب الإحصائيات',
      error: error.message,
    });
  }
};

// @desc    Get single invoice
// @route   GET /api/accounting/invoices/:id
// @access  Private
exports.getInvoiceById = async (req, res) => {
  try {
    const invoice = await AccountingInvoice.findById(req.params.id)
      .populate('payments')
      .populate('createdBy', 'name email');

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'الفاتورة غير موجودة',
      });
    }

    res.json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء جلب الفاتورة',
      error: error.message,
    });
  }
};

// @desc    Create new invoice
// @route   POST /api/accounting/invoices
// @access  Private
exports.createInvoice = async (req, res) => {
  try {
    const invoiceData = {
      ...req.body,
      createdBy: req.user?._id,
      remainingAmount: req.body.totalAmount,
    };

    // إنشاء رقم فاتورة تلقائي إذا لم يتم تحديده
    if (!invoiceData.invoiceNumber) {
      invoiceData.invoiceNumber = await AccountingInvoice.generateInvoiceNumber();
    }

    const invoice = await AccountingInvoice.create(invoiceData);

    res.status(201).json({
      success: true,
      data: invoice,
      message: 'تم إنشاء الفاتورة بنجاح',
    });
  } catch (error) {
    console.error('Error creating invoice:', error);
    res.status(400).json({
      success: false,
      message: 'حدث خطأ أثناء إنشاء الفاتورة',
      error: error.message,
    });
  }
};

// @desc    Update invoice
// @route   PUT /api/accounting/invoices/:id
// @access  Private
exports.updateInvoice = async (req, res) => {
  try {
    const invoice = await AccountingInvoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'الفاتورة غير موجودة',
      });
    }

    // لا يمكن تعديل فاتورة مدفوعة أو ملغاة
    if (invoice.status === 'paid' || invoice.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'لا يمكن تعديل فاتورة مدفوعة أو ملغاة',
      });
    }

    const updatedInvoice = await AccountingInvoice.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedBy: req.user?._id },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      data: updatedInvoice,
      message: 'تم تحديث الفاتورة بنجاح',
    });
  } catch (error) {
    console.error('Error updating invoice:', error);
    res.status(400).json({
      success: false,
      message: 'حدث خطأ أثناء تحديث الفاتورة',
      error: error.message,
    });
  }
};

// @desc    Delete invoice
// @route   DELETE /api/accounting/invoices/:id
// @access  Private
exports.deleteInvoice = async (req, res) => {
  try {
    const invoice = await AccountingInvoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'الفاتورة غير موجودة',
      });
    }

    // يمكن حذف الفواتير المسودة فقط
    if (invoice.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'يمكن حذف الفواتير المسودة فقط',
      });
    }

    await invoice.remove();

    res.json({
      success: true,
      message: 'تم حذف الفاتورة بنجاح',
    });
  } catch (error) {
    console.error('Error deleting invoice:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء حذف الفاتورة',
      error: error.message,
    });
  }
};

// @desc    Record payment for invoice
// @route   POST /api/accounting/invoices/:id/payment
// @access  Private
exports.recordPayment = async (req, res) => {
  try {
    const invoice = await AccountingInvoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'الفاتورة غير موجودة',
      });
    }

    if (invoice.remainingAmount === 0) {
      return res.status(400).json({
        success: false,
        message: 'الفاتورة مدفوعة بالكامل',
      });
    }

    const { amount, paymentDate, paymentMethod, reference, notes, receivedBy } = req.body;

    // إنشاء الدفعة
    const payment = await AccountingPayment.create({
      invoice: invoice._id,
      amount,
      paymentDate,
      paymentMethod,
      reference,
      notes,
      receivedBy,
      createdBy: req.user?._id,
    });

    // تحديث الفاتورة سيتم تلقائياً من خلال middleware في Payment model

    // إعادة جلب الفاتورة المحدثة
    const updatedInvoice = await AccountingInvoice.findById(req.params.id);

    res.status(201).json({
      success: true,
      data: {
        payment,
        invoice: updatedInvoice,
      },
      message: 'تم تسجيل الدفعة بنجاح',
    });
  } catch (error) {
    console.error('Error recording payment:', error);
    res.status(400).json({
      success: false,
      message: 'حدث خطأ أثناء تسجيل الدفعة',
      error: error.message,
    });
  }
};

// @desc    Send invoice
// @route   POST /api/accounting/invoices/:id/send
// @access  Private
exports.sendInvoice = async (req, res) => {
  try {
    const invoice = await AccountingInvoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'الفاتورة غير موجودة',
      });
    }

    invoice.status = 'sent';
    invoice.sentDate = new Date();
    invoice.sentTo = invoice.customerEmail || req.body.email;
    invoice.updatedBy = req.user?._id;

    await invoice.save();

    // TODO: إضافة منطق إرسال البريد الإلكتروني هنا

    res.json({
      success: true,
      data: invoice,
      message: 'تم إرسال الفاتورة بنجاح',
    });
  } catch (error) {
    console.error('Error sending invoice:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء إرسال الفاتورة',
      error: error.message,
    });
  }
};

// @desc    Download invoice PDF
// @route   GET /api/accounting/invoices/:id/pdf
// @access  Private
exports.downloadInvoicePDF = async (req, res) => {
  try {
    const invoice = await AccountingInvoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'الفاتورة غير موجودة',
      });
    }

    // TODO: إضافة منطق إنشاء PDF هنا باستخدام pdfkit
    // مثال مبسط:

    res.json({
      success: true,
      message: 'PDF generation not implemented yet',
      data: invoice,
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء إنشاء PDF',
      error: error.message,
    });
  }
};
