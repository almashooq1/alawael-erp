/**
 * Input Validation Schemas and Middleware
 */

import { body, param, query, validationResult } from 'express-validator';

/**
 * Validation results handler
 */
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: 'error',
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.param,
        message: err.msg,
        value: err.value,
      })),
    });
  }
  next();
};

/**
 * Auth validation rules
 */
export const validateLogin = [
  body('email').isEmail().trim().normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

export const validateRegister = [
  body('email').isEmail().trim().normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('name').notEmpty().trim().isLength({ min: 2 }),
];

/**
 * Product validation rules
 */
export const validateProduct = [
  body('name')
    .notEmpty()
    .trim()
    .isLength({ min: 3 })
    .withMessage('Product name must be at least 3 characters'),
  body('sku').notEmpty().trim().isAlphanumeric().withMessage('SKU must be alphanumeric'),
  body('description').optional().trim().isLength({ max: 1000 }),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('category').notEmpty().trim(),
  body('stock').isInt({ min: 0 }).withMessage('Stock must be a non-negative integer'),
];

/**
 * Supplier validation rules
 */
export const validateSupplier = [
  body('name').notEmpty().trim().isLength({ min: 2 }),
  body('email').isEmail().trim().normalizeEmail(),
  body('phone').optional().isMobilePhone().withMessage('Invalid phone number format'),
  body('address').notEmpty().trim().isLength({ min: 5 }),
  body('city').notEmpty().trim(),
  body('country').notEmpty().trim(),
];

/**
 * Order validation rules
 */
export const validateOrder = [
  body('supplier').isMongoId().withMessage('Invalid supplier ID'),
  body('products').isArray({ min: 1 }).withMessage('Products array must contain at least one item'),
  body('products.*.product').isMongoId().withMessage('Invalid product ID'),
  body('products.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('products.*.price').isFloat({ min: 0 }).withMessage('Price must be positive'),
  body('notes').optional().trim().isLength({ max: 500 }),
];

/**
 * Inventory validation rules
 */
export const validateInventory = [
  body('product').isMongoId().withMessage('Invalid product ID'),
  body('quantity').isInt({ min: 0 }).withMessage('Quantity must be non-negative'),
  body('warehouseLocation').optional().trim(),
];

/**
 * Shipment validation rules
 */
export const validateShipment = [
  body('order').isMongoId().withMessage('Invalid order ID'),
  body('carrier').notEmpty().trim().isLength({ min: 2 }),
  body('trackingNumber').optional().trim(),
  body('estimatedDelivery').optional().isISO8601().withMessage('Invalid date format'),
  body('address').notEmpty().trim(),
];

/**
 * MongoDB ID parameter validation
 */
export const validateMongoId = param('id').isMongoId().withMessage('Invalid ID format');

/**
 * Pagination validation
 */
export const validatePagination = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('sort').optional().trim(),
];
