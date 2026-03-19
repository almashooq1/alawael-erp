/**
 * Purchasing Validation Rules
 * قواعد التحقق لوحدة المشتريات
 */

const { body } = require('express-validator');
const {
  mongoId,
  dateRangeRules,
  requiredString,
  optionalString,
  optionalDate,
  optionalEnum,
  optionalFloat,
  requiredArray,
  optionalBool,
  optionalInt,
  optionalAmount,
  phoneField,
  bodyMongoId,
  queryEnum,
  queryString,
} = require('./common.validators');

// ═══ VENDORS ═════════════════════════════════════════════════════════════════

const createVendor = [
  requiredString('name', 'اسم المورد', { max: 200 }),
  optionalString('nameEn', 'الاسم بالإنجليزية', { max: 200 }),
  optionalEnum('type', 'نوع المورد', [
    'supplier',
    'manufacturer',
    'distributor',
    'contractor',
    'service_provider',
  ]),
  optionalString('taxNumber', 'الرقم الضريبي', { max: 50 }),
  optionalString('crNumber', 'رقم السجل التجاري', { max: 50 }),
  body('email').optional().isEmail().withMessage('البريد الإلكتروني غير صالح'),
  phoneField('phone', false),
  phoneField('mobile', false),
  optionalString('website', 'الموقع', { max: 200 }),
  // Address
  optionalString('address.street', 'الشارع', { max: 200 }),
  optionalString('address.city', 'المدينة', { max: 100 }),
  optionalString('address.region', 'المنطقة', { max: 100 }),
  optionalString('address.country', 'الدولة', { max: 100 }),
  optionalString('address.postalCode', 'الرمز البريدي', { max: 20 }),
  // Contact Person
  optionalString('contactPerson.name', 'اسم جهة الاتصال', { max: 200 }),
  body('contactPerson.email').optional().isEmail().withMessage('بريد جهة الاتصال غير صالح'),
  // Bank Info
  optionalString('bankInfo.bankName', 'اسم البنك', { max: 100 }),
  optionalString('bankInfo.accountNumber', 'رقم الحساب', { max: 50 }),
  optionalString('bankInfo.iban', 'الآيبان', { max: 50 }),
  // Other
  optionalString('paymentTerms', 'شروط الدفع', { max: 200 }),
  optionalAmount('creditLimit', 'حد الائتمان'),
  optionalEnum('currency', 'العملة', ['SAR', 'USD', 'EUR', 'GBP']),
  optionalFloat('rating', 'التقييم', { min: 0 }),
  optionalBool('isActive', 'الحالة'),
  optionalString('notes', 'ملاحظات', { max: 2000 }),
];

const updateVendor = [mongoId('id'), ...createVendor.slice(0)]; // same fields, id required

const rateVendor = [
  mongoId('id'),
  body('rating')
    .notEmpty()
    .withMessage('التقييم مطلوب')
    .isFloat({ min: 0, max: 5 })
    .withMessage('التقييم يجب أن يكون بين 0 و 5'),
  optionalString('notes', 'ملاحظات', { max: 1000 }),
];

const listVendors = [
  queryEnum('isActive', 'الحالة', ['true', 'false']),
  queryString('search', 'البحث'),
  queryString('rating', 'التقييم'),
];

// ═══ PURCHASE REQUESTS ═══════════════════════════════════════════════════════

const createPurchaseRequest = [
  optionalDate('date', 'التاريخ'),
  optionalDate('requiredDate', 'التاريخ المطلوب'),
  optionalString('department', 'القسم', { max: 100 }),
  requiredArray('items', 'العناصر'),
  body('items.*.description')
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage('وصف العنصر طويل جداً'),
  body('items.*.quantity')
    .notEmpty()
    .withMessage('الكمية مطلوبة')
    .isFloat({ min: 0.01 })
    .withMessage('الكمية غير صالحة'),
  body('items.*.unit').optional().isString().isLength({ max: 50 }).withMessage('الوحدة غير صالحة'),
  body('items.*.estimatedPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('السعر التقديري غير صالح'),
  optionalEnum('priority', 'الأولوية', ['low', 'medium', 'high', 'urgent']),
  optionalString('notes', 'ملاحظات', { max: 2000 }),
];

// ═══ PURCHASE ORDERS ═════════════════════════════════════════════════════════

const createPurchaseOrder = [
  optionalDate('date', 'التاريخ'),
  optionalDate('expectedDate', 'التاريخ المتوقع'),
  bodyMongoId('vendor', 'المورد'),
  optionalString('quotationNumber', 'رقم عرض السعر', { max: 100 }),
  optionalDate('quotationDate', 'تاريخ عرض السعر'),
  optionalString('paymentTerms', 'شروط الدفع', { max: 200 }),
  optionalString('terms', 'الشروط', { max: 2000 }),
  optionalString('notes', 'ملاحظات', { max: 2000 }),
  optionalAmount('shippingCost', 'تكلفة الشحن'),
  requiredArray('items', 'العناصر'),
  body('items.*.description').optional().isString().isLength({ max: 500 }),
  body('items.*.quantity').notEmpty().withMessage('الكمية مطلوبة').isFloat({ min: 0.01 }),
  body('items.*.unitPrice').notEmpty().withMessage('سعر الوحدة مطلوب').isFloat({ min: 0 }),
  body('items.*.discount')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('الخصم يجب أن يكون بين 0 و 100'),
  body('items.*.taxRate')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('نسبة الضريبة يجب أن تكون بين 0 و 100'),
];

// ═══ PURCHASE RECEIPTS ═══════════════════════════════════════════════════════

const createPurchaseReceipt = [
  bodyMongoId('purchaseOrderId', 'أمر الشراء'),
  bodyMongoId('warehouseId', 'المستودع'),
  requiredArray('items', 'العناصر'),
  body('items.*.productId')
    .notEmpty()
    .withMessage('المنتج مطلوب')
    .isMongoId()
    .withMessage('معرف المنتج غير صالح'),
  body('items.*.receivedQuantity')
    .notEmpty()
    .withMessage('الكمية المستلمة مطلوبة')
    .isFloat({ min: 0 }),
  body('items.*.rejectedQuantity').optional().isFloat({ min: 0 }),
  optionalString('items.*.batchNumber', 'رقم الدفعة', { max: 100 }),
];

// ═══ VENDOR INVOICES ═════════════════════════════════════════════════════════

const createVendorInvoice = [
  optionalString('vendorInvoiceNumber', 'رقم فاتورة المورد', { max: 100 }),
  optionalDate('date', 'التاريخ'),
  optionalDate('dueDate', 'تاريخ الاستحقاق'),
  bodyMongoId('vendor', 'المورد'),
  requiredArray('items', 'العناصر'),
  body('items.*.description').optional().isString().isLength({ max: 500 }),
  body('items.*.quantity').notEmpty().withMessage('الكمية مطلوبة').isFloat({ min: 0.01 }),
  body('items.*.unitPrice').notEmpty().withMessage('سعر الوحدة مطلوب').isFloat({ min: 0 }),
  body('items.*.taxRate').optional().isFloat({ min: 0, max: 100 }),
];

// ═══ VENDOR CONTRACTS ════════════════════════════════════════════════════════

const createVendorContract = [
  requiredString('name', 'اسم العقد', { max: 200 }),
  bodyMongoId('vendor', 'المورد'),
  optionalEnum('type', 'نوع العقد', ['supply', 'service', 'maintenance', 'rental', 'other']),
  optionalDate('startDate', 'تاريخ البداية'),
  optionalDate('endDate', 'تاريخ النهاية'),
  optionalAmount('value', 'القيمة'),
  optionalEnum('currency', 'العملة', ['SAR', 'USD', 'EUR', 'GBP']),
  optionalString('terms', 'الشروط', { max: 5000 }),
  optionalEnum('status', 'الحالة', ['draft', 'active', 'expired', 'terminated', 'renewed']),
  optionalBool('renewalReminder', 'تذكير التجديد'),
  optionalInt('reminderDays', 'أيام التذكير', { min: 1, max: 365 }),
];

// ═══ List Queries ════════════════════════════════════════════════════════════

const listOrders = [
  queryEnum('status', 'الحالة', ['draft', 'sent', 'confirmed', 'received', 'cancelled']),
  queryString('vendor', 'المورد'),
  ...dateRangeRules,
];

const listRequests = [
  queryEnum('status', 'الحالة', ['draft', 'submitted', 'approved', 'rejected', 'ordered']),
  queryString('department', 'القسم'),
  ...dateRangeRules,
];

module.exports = {
  createVendor,
  updateVendor,
  rateVendor,
  listVendors,
  createPurchaseRequest,
  createPurchaseOrder,
  createPurchaseReceipt,
  createVendorInvoice,
  createVendorContract,
  listOrders,
  listRequests,
};
