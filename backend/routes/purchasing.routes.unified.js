/**
 * 🛒 نظام المشتريات الموحد - Purchasing System
 * AlAwael ERP - Unified Purchasing Routes
 * الأولوية: ⭐⭐⭐⭐
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// ============================================
// نماذج المشتريات
// ============================================

// الموردين
const VendorSchema = new mongoose.Schema({
  vendorNumber: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  nameEn: String,
  type: { type: String, enum: ['individual', 'company'], default: 'company' },
  taxNumber: String,
  crNumber: String,
  email: String,
  phone: String,
  mobile: String,
  website: String,
  address: {
    street: String,
    city: String,
    region: String,
    country: { type: String, default: 'السعودية' },
    postalCode: String
  },
  contactPerson: {
    name: String,
    phone: String,
    email: String
  },
  bankInfo: {
    bankName: String,
    accountNumber: String,
    iban: String
  },
  paymentTerms: { type: String, default: 'net30' },
  creditLimit: { type: Number, default: 0 },
  currency: { type: String, default: 'SAR' },
  rating: { type: Number, default: 5, min: 1, max: 5 },
  isActive: { type: Boolean, default: true },
  notes: String,
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// طلبات الشراء
const PurchaseRequestSchema = new mongoose.Schema({
  requestNumber: { type: String, required: true, unique: true },
  date: { type: Date, required: true },
  requiredDate: Date,
  department: String,
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    description: String,
    quantity: { type: Number, required: true },
    unit: String,
    estimatedPrice: { type: Number, default: 0 },
    notes: String
  }],
  totalEstimated: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['draft', 'submitted', 'approved', 'rejected', 'ordered'],
    default: 'draft'
  },
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: Date,
  purchaseOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseOrder' },
  notes: String,
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

// أوامر الشراء
const PurchaseOrderSchema = new mongoose.Schema({
  orderNumber: { type: String, required: true, unique: true },
  date: { type: Date, required: true },
  expectedDate: Date,
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  quotationNumber: String,
  quotationDate: Date,
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    description: String,
    quantity: { type: Number, required: true },
    unit: String,
    unitPrice: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    taxRate: { type: Number, default: 15 },
    taxAmount: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    receivedQuantity: { type: Number, default: 0 },
    notes: String
  }],
  subtotal: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  taxAmount: { type: Number, default: 0 },
  shippingCost: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['draft', 'sent', 'confirmed', 'partial', 'received', 'cancelled'],
    default: 'draft'
  },
  paymentStatus: {
    type: String,
    enum: ['unpaid', 'partial', 'paid'],
    default: 'unpaid'
  },
  paymentTerms: String,
  terms: String,
  notes: String,
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

// استلام المشتريات
const PurchaseReceiptSchema = new mongoose.Schema({
  receiptNumber: { type: String, required: true, unique: true },
  date: { type: Date, required: true },
  purchaseOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseOrder', required: true },
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
  warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse' },
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    orderedQuantity: { type: Number, required: true },
    receivedQuantity: { type: Number, required: true },
    rejectedQuantity: { type: Number, default: 0 },
    unitCost: { type: Number, required: true },
    batchNumber: String,
    expiryDate: Date,
    notes: String
  }],
  totalReceived: { type: Number, default: 0 },
  totalRejected: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['draft', 'received', 'partial', 'cancelled'],
    default: 'draft'
  },
  notes: String,
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

// فواتير الموردين
const VendorInvoiceSchema = new mongoose.Schema({
  invoiceNumber: { type: String, required: true, unique: true },
  vendorInvoiceNumber: { type: String, required: true },
  date: { type: Date, required: true },
  dueDate: Date,
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  purchaseOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseOrder' },
  purchaseReceipt: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseReceipt' },
  items: [{
    description: String,
    quantity: { type: Number, default: 1 },
    unitPrice: { type: Number, default: 0 },
    taxRate: { type: Number, default: 15 },
    total: { type: Number, default: 0 }
  }],
  subtotal: { type: Number, default: 0 },
  taxAmount: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  paid: { type: Number, default: 0 },
  balance: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['draft', 'verified', 'approved', 'paid', 'cancelled'],
    default: 'draft'
  },
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

// عقود الموردين
const VendorContractSchema = new mongoose.Schema({
  contractNumber: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  type: { type: String, enum: ['supply', 'service', 'maintenance', 'other'] },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  value: { type: Number, required: true },
  currency: { type: String, default: 'SAR' },
  terms: String,
  documents: [String],
  status: {
    type: String,
    enum: ['draft', 'active', 'expired', 'cancelled'],
    default: 'draft'
  },
  renewalReminder: { type: Boolean, default: true },
  reminderDays: { type: Number, default: 30 },
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

// إنشاء النماذج
const Vendor = mongoose.model('Vendor', VendorSchema);
const PurchaseRequest = mongoose.model('PurchaseRequest', PurchaseRequestSchema);
const PurchaseOrder = mongoose.model('PurchaseOrder', PurchaseOrderSchema);
const PurchaseReceipt = mongoose.model('PurchaseReceipt', PurchaseReceiptSchema);
const VendorInvoice = mongoose.model('VendorInvoice', VendorInvoiceSchema);
const VendorContract = mongoose.model('VendorContract', VendorContractSchema);

// ============================================
// API: الموردين
// ============================================

router.get('/vendors', async (req, res) => {
  try {
    const { isActive, search, rating } = req.query;
    const filter = { organization: req.user.organization };

    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (rating) filter.rating = { $gte: parseInt(rating) };
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { vendorNumber: { $regex: search, $options: 'i' } },
        { taxNumber: { $regex: search, $options: 'i' } }
      ];
    }

    const vendors = await Vendor.find(filter).sort({ name: 1 });
    res.json({ success: true, data: vendors, count: vendors.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/vendors', async (req, res) => {
  try {
    const lastVendor = await Vendor.findOne({
      organization: req.user.organization
    }).sort({ createdAt: -1 });
    const vendorNumber = lastVendor
      ? `VND-${String(parseInt(lastVendor.vendorNumber.split('-')[1]) + 1).padStart(6, '0')}`
      : 'VND-000001';

    const vendor = new Vendor({
      ...req.body,
      vendorNumber,
      organization: req.user.organization,
      createdBy: req.user._id
    });
    await vendor.save();

    res.status(201).json({
      success: true,
      data: vendor,
      message: 'تم إنشاء المورد بنجاح'
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.put('/vendors/:id', async (req, res) => {
  try {
    const vendor = await Vendor.findOneAndUpdate(
      { _id: req.params.id, organization: req.user.organization },
      { ...req.body, updatedAt: Date.now() },
      { new: true }
    );

    if (!vendor) {
      return res.status(404).json({ success: false, message: 'المورد غير موجود' });
    }

    res.json({ success: true, data: vendor, message: 'تم تحديث المورد' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// تقييم المورد
router.post('/vendors/:id/rate', async (req, res) => {
  try {
    const { rating, notes } = req.body;
    const vendor = await Vendor.findOne({
      _id: req.params.id,
      organization: req.user.organization
    });

    if (!vendor) {
      return res.status(404).json({ success: false, message: 'المورد غير موجود' });
    }

    vendor.rating = rating;
    if (notes) vendor.notes = notes;
    await vendor.save();

    res.json({ success: true, data: vendor, message: 'تم تحديث تقييم المورد' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ============================================
// API: طلبات الشراء
// ============================================

router.get('/requests', async (req, res) => {
  try {
    const { status, department, startDate, endDate } = req.query;
    const filter = { organization: req.user.organization };

    if (status) filter.status = status;
    if (department) filter.department = department;
    if (startDate && endDate) {
      filter.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    const requests = await PurchaseRequest.find(filter)
      .populate('requestedBy', 'name')
      .populate('approvedBy', 'name')
      .sort({ date: -1 });

    res.json({ success: true, data: requests, count: requests.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/requests', async (req, res) => {
  try {
    const { items, ...rest } = req.body;
    const totalEstimated = items.reduce((sum, i) => sum + (i.quantity * (i.estimatedPrice || 0)), 0);

    const lastRequest = await PurchaseRequest.findOne({
      organization: req.user.organization
    }).sort({ createdAt: -1 });
    const requestNumber = lastRequest
      ? `PR-${String(parseInt(lastRequest.requestNumber.split('-')[1]) + 1).padStart(6, '0')}`
      : 'PR-000001';

    const request = new PurchaseRequest({
      ...rest,
      requestNumber,
      items,
      totalEstimated,
      organization: req.user.organization,
      createdBy: req.user._id
    });

    await request.save();

    res.status(201).json({
      success: true,
      data: request,
      message: 'تم إنشاء طلب الشراء بنجاح'
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// اعتماد طلب الشراء
router.post('/requests/:id/approve', async (req, res) => {
  try {
    const request = await PurchaseRequest.findOne({
      _id: req.params.id,
      organization: req.user.organization
    });

    if (!request) {
      return res.status(404).json({ success: false, message: 'طلب الشراء غير موجود' });
    }

    if (request.status !== 'submitted') {
      return res.status(400).json({ success: false, message: 'لا يمكن اعتماد هذا الطلب' });
    }

    request.status = 'approved';
    request.approvedBy = req.user._id;
    request.approvedAt = new Date();
    await request.save();

    res.json({ success: true, data: request, message: 'تم اعتماد طلب الشراء' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// تقديم طلب الشراء
router.post('/requests/:id/submit', async (req, res) => {
  try {
    const request = await PurchaseRequest.findOne({
      _id: req.params.id,
      organization: req.user.organization
    });

    if (!request) {
      return res.status(404).json({ success: false, message: 'طلب الشراء غير موجود' });
    }

    request.status = 'submitted';
    await request.save();

    res.json({ success: true, data: request, message: 'تم تقديم طلب الشراء للموافقة' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// API: أوامر الشراء
// ============================================

router.get('/orders', async (req, res) => {
  try {
    const { status, vendor, startDate, endDate } = req.query;
    const filter = { organization: req.user.organization };

    if (status) filter.status = status;
    if (vendor) filter.vendor = vendor;
    if (startDate && endDate) {
      filter.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    const orders = await PurchaseOrder.find(filter)
      .populate('vendor', 'name')
      .sort({ date: -1 });

    res.json({ success: true, data: orders, count: orders.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/orders', async (req, res) => {
  try {
    const { items, ...rest } = req.body;

    // حساب المجاميع
    let subtotal = 0;
    let totalTax = 0;

    const calculatedItems = items.map(item => {
      const itemTotal = (item.quantity * item.unitPrice) - (item.discount || 0);
      const itemTax = itemTotal * ((item.taxRate || 15) / 100);
      subtotal += itemTotal;
      totalTax += itemTax;
      return {
        ...item,
        taxAmount: itemTax,
        total: itemTotal + itemTax
      };
    });

    const total = subtotal + totalTax + (rest.shippingCost || 0);

    const lastOrder = await PurchaseOrder.findOne({
      organization: req.user.organization
    }).sort({ createdAt: -1 });
    const orderNumber = lastOrder
      ? `PO-${String(parseInt(lastOrder.orderNumber.split('-')[1]) + 1).padStart(6, '0')}`
      : 'PO-000001';

    const order = new PurchaseOrder({
      ...rest,
      orderNumber,
      items: calculatedItems,
      subtotal,
      taxAmount: totalTax,
      total,
      organization: req.user.organization,
      createdBy: req.user._id
    });

    await order.save();

    // إذا كان من طلب شراء، حدث حالته
    if (rest.purchaseRequest) {
      await PurchaseRequest.findByIdAndUpdate(rest.purchaseRequest, {
        status: 'ordered',
        purchaseOrder: order._id
      });
    }

    res.status(201).json({
      success: true,
      data: order,
      message: 'تم إنشاء أمر الشراء بنجاح'
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// إرسال أمر الشراء للمورد
router.post('/orders/:id/send', async (req, res) => {
  try {
    const order = await PurchaseOrder.findOne({
      _id: req.params.id,
      organization: req.user.organization
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'أمر الشراء غير موجود' });
    }

    order.status = 'sent';
    await order.save();

    res.json({ success: true, data: order, message: 'تم إرسال أمر الشراء للمورد' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// تأكيد أمر الشراء
router.post('/orders/:id/confirm', async (req, res) => {
  try {
    const order = await PurchaseOrder.findOne({
      _id: req.params.id,
      organization: req.user.organization
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'أمر الشراء غير موجود' });
    }

    order.status = 'confirmed';
    await order.save();

    res.json({ success: true, data: order, message: 'تم تأكيد أمر الشراء' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// API: استلام المشتريات
// ============================================

router.get('/receipts', async (req, res) => {
  try {
    const { purchaseOrder, vendor, startDate, endDate } = req.query;
    const filter = { organization: req.user.organization };

    if (purchaseOrder) filter.purchaseOrder = purchaseOrder;
    if (vendor) filter.vendor = vendor;
    if (startDate && endDate) {
      filter.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    const receipts = await PurchaseReceipt.find(filter)
      .populate('purchaseOrder', 'orderNumber')
      .populate('vendor', 'name')
      .populate('warehouse', 'name')
      .sort({ date: -1 });

    res.json({ success: true, data: receipts, count: receipts.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/receipts', async (req, res) => {
  try {
    const { purchaseOrderId, warehouseId, items } = req.body;

    const order = await PurchaseOrder.findOne({
      _id: purchaseOrderId,
      organization: req.user.organization
    }).populate('vendor');

    if (!order) {
      return res.status(404).json({ success: false, message: 'أمر الشراء غير موجود' });
    }

    const lastReceipt = await PurchaseReceipt.findOne({
      organization: req.user.organization
    }).sort({ createdAt: -1 });
    const receiptNumber = lastReceipt
      ? `RCPT-${String(parseInt(lastReceipt.receiptNumber.split('-')[1]) + 1).padStart(6, '0')}`
      : 'RCPT-000001';

    const receiptItems = items.map(item => {
      const orderItem = order.items.find(i => String(i.product) === String(item.productId));
      return {
        product: item.productId,
        orderedQuantity: orderItem ? orderItem.quantity : 0,
        receivedQuantity: item.receivedQuantity,
        rejectedQuantity: item.rejectedQuantity || 0,
        unitCost: orderItem ? orderItem.unitPrice : 0,
        batchNumber: item.batchNumber,
        expiryDate: item.expiryDate,
        notes: item.notes
      };
    });

    const receipt = new PurchaseReceipt({
      receiptNumber,
      date: new Date(),
      purchaseOrder: purchaseOrderId,
      vendor: order.vendor._id,
      warehouse: warehouseId,
      items: receiptItems,
      totalReceived: receiptItems.reduce((sum, i) => sum + i.receivedQuantity, 0),
      totalRejected: receiptItems.reduce((sum, i) => sum + i.rejectedQuantity, 0),
      organization: req.user.organization,
      createdBy: req.user._id
    });

    await receipt.save();

    // تحديث الكميات المستلمة في أمر الشراء
    for (const item of receiptItems) {
      const orderItem = order.items.find(i => String(i.product) === String(item.product));
      if (orderItem) {
        orderItem.receivedQuantity += item.receivedQuantity;
      }
    }

    // تحديث حالة أمر الشراء
    const allReceived = order.items.every(i => i.receivedQuantity >= i.quantity);
    const someReceived = order.items.some(i => i.receivedQuantity > 0);
    order.status = allReceived ? 'received' : (someReceived ? 'partial' : order.status);
    await order.save();

    res.status(201).json({
      success: true,
      data: receipt,
      message: 'تم تسجيل الاستلام بنجاح'
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ============================================
// API: فواتير الموردين
// ============================================

router.get('/vendor-invoices', async (req, res) => {
  try {
    const { status, vendor, startDate, endDate } = req.query;
    const filter = { organization: req.user.organization };

    if (status) filter.status = status;
    if (vendor) filter.vendor = vendor;
    if (startDate && endDate) {
      filter.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    const invoices = await VendorInvoice.find(filter)
      .populate('vendor', 'name')
      .populate('purchaseOrder', 'orderNumber')
      .sort({ date: -1 });

    res.json({ success: true, data: invoices, count: invoices.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/vendor-invoices', async (req, res) => {
  try {
    const { items, ...rest } = req.body;

    let subtotal = 0;
    let taxAmount = 0;

    const calculatedItems = items.map(item => {
      const itemTotal = (item.quantity || 1) * (item.unitPrice || 0);
      const itemTax = itemTotal * ((item.taxRate || 15) / 100);
      subtotal += itemTotal;
      taxAmount += itemTax;
      return { ...item, total: itemTotal + itemTax };
    });

    const total = subtotal + taxAmount;

    const lastInvoice = await VendorInvoice.findOne({
      organization: req.user.organization
    }).sort({ createdAt: -1 });
    const invoiceNumber = lastInvoice
      ? `VI-${String(parseInt(lastInvoice.invoiceNumber.split('-')[1]) + 1).padStart(6, '0')}`
      : 'VI-000001';

    const invoice = new VendorInvoice({
      ...rest,
      invoiceNumber,
      items: calculatedItems,
      subtotal,
      taxAmount,
      total,
      balance: total,
      organization: req.user.organization,
      createdBy: req.user._id
    });

    await invoice.save();

    res.status(201).json({
      success: true,
      data: invoice,
      message: 'تم إنشاء فاتورة المورد بنجاح'
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// اعتماد فاتورة المورد
router.post('/vendor-invoices/:id/approve', async (req, res) => {
  try {
    const invoice = await VendorInvoice.findOne({
      _id: req.params.id,
      organization: req.user.organization
    });

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'الفاتورة غير موجودة' });
    }

    invoice.status = 'approved';
    await invoice.save();

    res.json({ success: true, data: invoice, message: 'تم اعتماد الفاتورة' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// API: عقود الموردين
// ============================================

router.get('/contracts', async (req, res) => {
  try {
    const { status, vendor } = req.query;
    const filter = { organization: req.user.organization };

    if (status) filter.status = status;
    if (vendor) filter.vendor = vendor;

    const contracts = await VendorContract.find(filter)
      .populate('vendor', 'name')
      .sort({ endDate: 1 });

    res.json({ success: true, data: contracts, count: contracts.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/contracts', async (req, res) => {
  try {
    const lastContract = await VendorContract.findOne({
      organization: req.user.organization
    }).sort({ createdAt: -1 });
    const contractNumber = lastContract
      ? `CTR-${String(parseInt(lastContract.contractNumber.split('-')[1]) + 1).padStart(6, '0')}`
      : 'CTR-000001';

    const contract = new VendorContract({
      ...req.body,
      contractNumber,
      organization: req.user.organization,
      createdBy: req.user._id
    });

    await contract.save();

    res.status(201).json({
      success: true,
      data: contract,
      message: 'تم إنشاء العقد بنجاح'
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// العقود المنتهية قريباً
router.get('/contracts/expiring', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + days);

    const contracts = await VendorContract.find({
      organization: req.user.organization,
      status: 'active',
      endDate: { $lte: targetDate, $gt: new Date() }
    }).populate('vendor', 'name');

    res.json({ success: true, data: contracts, count: contracts.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// لوحة تحكم المشتريات
// ============================================

router.get('/dashboard', async (req, res) => {
  try {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // إحصائيات الموردين
    const vendors = await Vendor.find({ organization: req.user.organization });
    const activeVendors = vendors.filter(v => v.isActive).length;

    // إحصائيات الطلبات
    const requests = await PurchaseRequest.find({ organization: req.user.organization });
    const pendingRequests = requests.filter(r => r.status === 'submitted').length;

    // إحصائيات الأوامر
    const orders = await PurchaseOrder.find({ organization: req.user.organization });
    const totalPurchases = orders.reduce((sum, o) => sum + o.total, 0);
    const pendingOrders = orders.filter(o => ['sent', 'confirmed'].includes(o.status)).length;

    // إحصائيط الفواتير
    const invoices = await VendorInvoice.find({ organization: req.user.organization });
    const unpaidInvoices = invoices.filter(i => i.status !== 'paid').length;
    const totalPayable = invoices.filter(i => i.status !== 'paid').reduce((sum, i) => sum + i.balance, 0);

    // أوامر الشراء الأخيرة
    const recentOrders = await PurchaseOrder.find({ organization: req.user.organization })
      .populate('vendor', 'name')
      .sort({ createdAt: -1 })
      .limit(5);

    // العقود المنتهية قريباً
    const expiringContracts = await VendorContract.find({
      organization: req.user.organization,
      status: 'active',
      endDate: { $lte: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000) }
    }).populate('vendor', 'name');

    res.json({
      success: true,
      data: {
        summary: {
          totalVendors: vendors.length,
          activeVendors,
          pendingRequests,
          pendingOrders,
          totalPurchases,
          unpaidInvoices,
          totalPayable,
          expiringContracts: expiringContracts.length
        },
        recentOrders,
        expiringContracts,
        monthlyPurchases: await PurchaseOrder.aggregate([
          { $match: { organization: req.user.organization, date: { $gte: startOfMonth } } },
          { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } }
        ]).then(r => r[0] || { total: 0, count: 0 })
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// تصدير
// ============================================

module.exports = {
  router,
  Vendor,
  PurchaseRequest,
  PurchaseOrder,
  PurchaseReceipt,
  VendorInvoice,
  VendorContract
};
