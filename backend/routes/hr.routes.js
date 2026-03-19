/**
 * نظام الأصول ERP - مسار الموارد البشرية
 */
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

// RBAC Integration (Role-Based Access Control)
let createRBACMiddleware;
try {
  const rbacModule = require('../rbac');
  createRBACMiddleware = rbacModule.createRBACMiddleware;
} catch (err) {
  logger.warn('[HR Routes] RBAC module not available, using fallback');
  createRBACMiddleware = _permission => (_req, _res, _next) => {
    logger.warn(`RBAC middleware unavailable, blocking request`);
    return _res
      .status(503)
      .json({ success: false, message: 'Authorization service temporarily unavailable' });
  };
}

// Apply authentication to all routes
router.use(authenticateToken);

// قائمة الموظفين
router.get('/employees', createRBACMiddleware(['hr:read']), (_req, res) => {
  res.json({ success: true, data: [], message: 'قائمة الموظفين' });
});

// بيانات موظف
router.get('/employees/:id', createRBACMiddleware(['hr:read']), (req, res) => {
  res.json({ success: true, data: { id: req.params.id }, message: 'بيانات الموظف' });
});

// إضافة موظف
router.post(
  '/employees',
  createRBACMiddleware(['hr:create']),
  validate([
    body('name').trim().notEmpty().withMessage('اسم الموظف مطلوب'),
    body('email').isEmail().withMessage('البريد الإلكتروني غير صالح'),
  ]),
  (req, res) => {
    res.status(201).json({ success: true, message: 'تم إضافة الموظف', data: req.body });
  }
);

// تحديث موظف
router.put('/employees/:id', createRBACMiddleware(['hr:update']), (_req, res) => {
  res.json({ success: true, message: 'تم تحديث بيانات الموظف' });
});

// حذف موظف
router.delete('/employees/:id', createRBACMiddleware(['hr:delete']), (_req, res) => {
  res.json({ success: true, message: 'تم حذف الموظف' });
});

// الحضور والانصراف
router.get('/attendance', createRBACMiddleware(['hr:read']), (_req, res) => {
  res.json({ success: true, data: [], message: 'سجل الحضور والانصراف' });
});

router.post(
  '/attendance/check-in',
  createRBACMiddleware(['hr:checkin']),
  validate([body('employeeId').trim().notEmpty().withMessage('معرف الموظف مطلوب')]),
  (_req, res) => {
    res.json({ success: true, message: 'تم تسجيل الحضور' });
  }
);

router.post(
  '/attendance/check-out',
  createRBACMiddleware(['hr:checkout']),
  validate([body('employeeId').trim().notEmpty().withMessage('معرف الموظف مطلوب')]),
  (_req, res) => {
    res.json({ success: true, message: 'تم تسجيل الانصراف' });
  }
);

// الإجازات
router.get('/leaves', createRBACMiddleware(['hr:read']), (_req, res) => {
  res.json({ success: true, data: [], message: 'سجل الإجازات' });
});

router.post(
  '/leaves/request',
  createRBACMiddleware(['hr:leave_request']),
  validate([
    body('employeeId').trim().notEmpty().withMessage('معرف الموظف مطلوب'),
    body('type').trim().notEmpty().withMessage('نوع الإجازة مطلوب'),
    body('startDate').notEmpty().withMessage('تاريخ البداية مطلوب'),
    body('endDate').notEmpty().withMessage('تاريخ النهاية مطلوب'),
  ]),
  (_req, res) => {
    res.status(201).json({ success: true, message: 'تم تقديم طلب الإجازة' });
  }
);

router.put('/leaves/:id/approve', createRBACMiddleware(['hr:approve_leave']), (_req, res) => {
  res.json({ success: true, message: 'تم الموافقة على الإجازة' });
});

router.put('/leaves/:id/reject', createRBACMiddleware(['hr:approve_leave']), (_req, res) => {
  res.json({ success: true, message: 'تم رفض الإجازة' });
});

// الرواتب
router.get('/payroll', createRBACMiddleware(['hr:read']), (_req, res) => {
  res.json({ success: true, data: [], message: 'سجل الرواتب' });
});

router.post(
  '/payroll/calculate',
  createRBACMiddleware(['hr:payroll']),
  validate([body('month').notEmpty().withMessage('الشهر مطلوب')]),
  (_req, res) => {
    res.json({ success: true, message: 'تم حساب الرواتب' });
  }
);

router.post(
  '/payroll/disburse',
  createRBACMiddleware(['hr:payroll']),
  validate([body('month').notEmpty().withMessage('الشهر مطلوب')]),
  (_req, res) => {
    res.json({ success: true, message: 'تم صرف الرواتب' });
  }
);

// الأداء
router.get('/performance', createRBACMiddleware(['hr:read']), (_req, res) => {
  res.json({ success: true, data: [], message: 'تقييمات الأداء' });
});

router.post(
  '/performance/evaluate',
  createRBACMiddleware(['hr:performance']),
  validate([
    body('employeeId').trim().notEmpty().withMessage('معرف الموظف مطلوب'),
    body('rating').isNumeric().withMessage('التقييم يجب أن يكون رقماً'),
  ]),
  (_req, res) => {
    res.status(201).json({ success: true, message: 'تم إضافة تقييم الأداء' });
  }
);

module.exports = router;
