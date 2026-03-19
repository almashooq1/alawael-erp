/**
 * Inventory Validation Rules
 * قواعد التحقق لوحدة المخزون
 */

const { body } = require('express-validator');
const {
  mongoId,
  requiredString,
  optionalString,
  optionalDate,
  optionalEnum,
  optionalFloat,
  optionalInt,
  requiredArray,
  optionalBool,
  optionalAmount,
  bodyMongoId,
  queryEnum,
  queryString,
  paginationRules,
} = require('./common.validators');

// ═══ PRODUCTS ════════════════════════════════════════════════════════════════

const createProduct = [
  requiredString('name', 'اسم المنتج', { max: 300 }),
  optionalString('nameEn', 'الاسم بالإنجليزية', { max: 300 }),
  optionalString('description', 'الوصف', { max: 2000 }),
  bodyMongoId('category', 'الفئة', false),
  optionalString('brand', 'العلامة التجارية', { max: 100 }),
  optionalString('unit', 'الوحدة', { max: 50 }),
  optionalAmount('costPrice', 'سعر التكلفة'),
  optionalAmount('sellingPrice', 'سعر البيع'),
  optionalAmount('minPrice', 'الحد الأدنى للسعر'),
  optionalFloat('taxRate', 'نسبة الضريبة', { min: 0, max: 100 }),
  optionalInt('minStock', 'الحد الأدنى للمخزون', { min: 0 }),
  optionalInt('maxStock', 'الحد الأعلى للمخزون', { min: 0 }),
  optionalInt('currentStock', 'المخزون الحالي', { min: 0 }),
  optionalInt('reorderPoint', 'نقطة إعادة الطلب', { min: 0 }),
  optionalString('location', 'الموقع', { max: 100 }),
  bodyMongoId('warehouse', 'المستودع', false),
  optionalBool('isActive', 'الحالة'),
  optionalBool('isTracked', 'تتبع المخزون'),
  optionalBool('hasExpiry', 'تاريخ انتهاء'),
  optionalBool('hasSerial', 'رقم تسلسلي'),
  optionalString('barcode', 'الباركود', { max: 50 }),
];

const updateProduct = [mongoId('id'), ...createProduct];

const listProducts = [
  ...paginationRules,
  queryString('search', 'البحث'),
  queryEnum('isActive', 'الحالة', ['true', 'false']),
  queryString('category', 'الفئة'),
  queryString('warehouse', 'المستودع'),
];

// ═══ CATEGORIES ══════════════════════════════════════════════════════════════

const createCategory = [
  optionalString('code', 'الرمز', { max: 50 }),
  requiredString('name', 'اسم الفئة', { max: 200 }),
  optionalString('nameEn', 'الاسم بالإنجليزية', { max: 200 }),
  bodyMongoId('parent', 'الفئة الأم', false),
  optionalString('description', 'الوصف', { max: 1000 }),
  optionalBool('isActive', 'الحالة'),
];

const updateCategory = [mongoId('id'), ...createCategory];

// ═══ WAREHOUSES ══════════════════════════════════════════════════════════════

const createWarehouse = [
  optionalString('code', 'الرمز', { max: 50 }),
  requiredString('name', 'اسم المستودع', { max: 200 }),
  optionalEnum('type', 'نوع المستودع', ['main', 'branch', 'temporary', 'transit']),
  optionalString('address.street', 'الشارع', { max: 200 }),
  optionalString('address.city', 'المدينة', { max: 100 }),
  optionalString('address.region', 'المنطقة', { max: 100 }),
  optionalString('address.country', 'الدولة', { max: 100 }),
  optionalString('phone', 'الهاتف', { max: 20 }),
  body('email').optional().isEmail().withMessage('البريد الإلكتروني غير صالح'),
  bodyMongoId('manager', 'المدير', false),
  optionalInt('capacity', 'السعة', { min: 0 }),
  optionalBool('isActive', 'الحالة'),
];

const updateWarehouse = [mongoId('id'), ...createWarehouse];

// ═══ STOCK MOVEMENTS ═════════════════════════════════════════════════════════

const movementIn = [
  bodyMongoId('productId', 'المنتج'),
  bodyMongoId('warehouseId', 'المستودع'),
  body('quantity')
    .notEmpty()
    .withMessage('الكمية مطلوبة')
    .isFloat({ min: 0.01 })
    .withMessage('الكمية يجب أن تكون أكبر من صفر'),
  optionalAmount('unitCost', 'تكلفة الوحدة'),
  optionalString('reference', 'المرجع', { max: 100 }),
  optionalString('batchNumber', 'رقم الدفعة', { max: 100 }),
  optionalDate('expiryDate', 'تاريخ الانتهاء'),
];

const movementOut = [
  bodyMongoId('productId', 'المنتج'),
  bodyMongoId('warehouseId', 'المستودع'),
  body('quantity')
    .notEmpty()
    .withMessage('الكمية مطلوبة')
    .isFloat({ min: 0.01 })
    .withMessage('الكمية يجب أن تكون أكبر من صفر'),
  optionalString('reference', 'المرجع', { max: 100 }),
  optionalString('notes', 'ملاحظات', { max: 1000 }),
];

const movementAdjustment = [
  bodyMongoId('productId', 'المنتج'),
  bodyMongoId('warehouseId', 'المستودع'),
  body('newQuantity')
    .notEmpty()
    .withMessage('الكمية الجديدة مطلوبة')
    .isFloat({ min: 0 })
    .withMessage('الكمية يجب أن تكون صفر أو أكبر'),
  optionalString('notes', 'ملاحظات', { max: 1000 }),
];

// ═══ STOCK TAKES ═════════════════════════════════════════════════════════════

const createStockTake = [bodyMongoId('warehouseId', 'المستودع')];

const countStockTake = [
  mongoId('id'),
  bodyMongoId('productId', 'المنتج'),
  body('countedQuantity')
    .notEmpty()
    .withMessage('الكمية المحسوبة مطلوبة')
    .isFloat({ min: 0 })
    .withMessage('الكمية يجب أن تكون صفر أو أكبر'),
  optionalString('notes', 'ملاحظات', { max: 1000 }),
];

// ═══ TRANSFERS ═══════════════════════════════════════════════════════════════

const createTransfer = [
  bodyMongoId('fromWarehouseId', 'المستودع المصدر'),
  bodyMongoId('toWarehouseId', 'المستودع الوجهة'),
  requiredArray('items', 'العناصر'),
  body('items.*.productId')
    .notEmpty()
    .withMessage('المنتج مطلوب')
    .isMongoId()
    .withMessage('معرف المنتج غير صالح'),
  body('items.*.quantity')
    .notEmpty()
    .withMessage('الكمية مطلوبة')
    .isFloat({ min: 0.01 })
    .withMessage('الكمية غير صالحة'),
  optionalString('notes', 'ملاحظات', { max: 1000 }),
];

const receiveTransfer = [
  mongoId('id'),
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
];

module.exports = {
  createProduct,
  updateProduct,
  listProducts,
  createCategory,
  updateCategory,
  createWarehouse,
  updateWarehouse,
  movementIn,
  movementOut,
  movementAdjustment,
  createStockTake,
  countStockTake,
  createTransfer,
  receiveTransfer,
};
