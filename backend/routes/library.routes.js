/**
 * Library & Resources Routes — مسارات المكتبة والموارد
 *
 * 35 API endpoints:
 *   📊 Dashboard:      KPIs, statistics, resource overview
 *   📚 Resources:      CRUD + search + barcode + bulk import
 *   📂 Categories:     CRUD for resource categories
 *   🔄 Loans:          Checkout, return, renew, history
 *   📅 Reservations:   Create, cancel, list
 *   👥 Members:        CRUD for library members
 *   ⭐ Reviews:        Add, list reviews per resource
 *   🔧 Maintenance:    Create, list maintenance records
 *   📦 Suppliers:      List, create suppliers
 *   📈 Reports:        Statistics, utilization, overdue
 *   📋 Types:          Resource type definitions
 *
 * Base path: /api/library  (dual-mounted with /api/v1/library)
 */

const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const { authenticateToken: authenticate, authorize } = require('../middleware/auth');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const _logger = require('../utils/logger');

// ── Service ──
const library = require('../services/library.service');
const { safeError } = require('../utils/safeError');

// ── Validation helper ──
function handleValidation(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, errors: errors.array() });
    return true;
  }
  return false;
}

// ══════════════════════════════════════════════════════════════════════════════
// DASHBOARD — لوحة المعلومات
// ══════════════════════════════════════════════════════════════════════════════

router.get('/dashboard', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const data = library.getDashboard();
    res.json({ success: true, data });
  } catch (err) {
    safeError(res, err, 'library');
  }
});

router.get('/statistics', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const data = library.getStatistics();
    res.json({ success: true, data });
  } catch (err) {
    safeError(res, err, 'library');
  }
});

router.get('/resource-types', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const data = library.getResourceTypes();
    res.json({ success: true, data });
  } catch (err) {
    safeError(res, err, 'library');
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// CATEGORIES — الفئات
// ══════════════════════════════════════════════════════════════════════════════

router.get('/categories', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const data = library.getCategories();
    res.json({ success: true, data, total: data.length });
  } catch (err) {
    safeError(res, err, 'library');
  }
});

router.get(
  '/categories/:id',
  authenticate, requireBranchAccess, requireBranchAccess,
  [param('id').notEmpty().withMessage('معرّف الفئة مطلوب')],
  async (req, res) => {
    if (handleValidation(req, res)) return;
    try {
      const data = library.getCategoryById(req.params.id);
      res.json({ success: true, data });
    } catch (err) {
      res.status(err.statusCode || 500).json({ success: false, error: safeError(err) });
    }
  }
);

router.post(
  '/categories',
  authenticate, requireBranchAccess, requireBranchAccess,
  authorize(['admin', 'manager', 'librarian']),
  [
    body('name').notEmpty().withMessage('اسم الفئة مطلوب'),
    body('type').notEmpty().withMessage('نوع الفئة مطلوب'),
  ],
  async (req, res) => {
    if (handleValidation(req, res)) return;
    try {
      const data = library.createCategory(req.body);
      res.status(201).json({ success: true, data });
    } catch (err) {
      res.status(err.statusCode || 500).json({ success: false, error: safeError(err) });
    }
  }
);

router.put(
  '/categories/:id',
  authenticate, requireBranchAccess, requireBranchAccess,
  authorize(['admin', 'manager', 'librarian']),
  [param('id').notEmpty().withMessage('معرّف الفئة مطلوب')],
  async (req, res) => {
    if (handleValidation(req, res)) return;
    try {
      const data = library.updateCategory(req.params.id, req.body);
      res.json({ success: true, data });
    } catch (err) {
      res.status(err.statusCode || 500).json({ success: false, error: safeError(err) });
    }
  }
);

router.delete(
  '/categories/:id',
  authenticate, requireBranchAccess, requireBranchAccess,
  authorize(['admin', 'manager']),
  [param('id').notEmpty().withMessage('معرّف الفئة مطلوب')],
  async (req, res) => {
    if (handleValidation(req, res)) return;
    try {
      const data = library.deleteCategory(req.params.id);
      res.json({ success: true, data });
    } catch (err) {
      res.status(err.statusCode || 500).json({ success: false, error: safeError(err) });
    }
  }
);

// ══════════════════════════════════════════════════════════════════════════════
// RESOURCES — الموارد
// ══════════════════════════════════════════════════════════════════════════════

router.get('/resources', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const result = library.getResources(req.query);
    res.json({ success: true, ...result });
  } catch (err) {
    safeError(res, err, 'library');
  }
});

router.get(
  '/resources/search',
  authenticate, requireBranchAccess, requireBranchAccess,
  [query('q').notEmpty().withMessage('نص البحث مطلوب')],
  async (req, res) => {
    if (handleValidation(req, res)) return;
    try {
      const data = library.searchResources(req.query.q);
      res.json({ success: true, data, total: data.length });
    } catch (err) {
      res.status(err.statusCode || 500).json({ success: false, error: safeError(err) });
    }
  }
);

router.get(
  '/resources/barcode/:barcode',
  authenticate, requireBranchAccess, requireBranchAccess,
  [param('barcode').notEmpty().withMessage('الباركود مطلوب')],
  async (req, res) => {
    if (handleValidation(req, res)) return;
    try {
      const data = library.findByBarcode(req.params.barcode);
      res.json({ success: true, data });
    } catch (err) {
      res.status(err.statusCode || 500).json({ success: false, error: safeError(err) });
    }
  }
);

router.get(
  '/resources/:id',
  authenticate, requireBranchAccess, requireBranchAccess,
  [param('id').notEmpty().withMessage('معرّف المورد مطلوب')],
  async (req, res) => {
    if (handleValidation(req, res)) return;
    try {
      const data = library.getResourceById(req.params.id);
      res.json({ success: true, data });
    } catch (err) {
      res.status(err.statusCode || 500).json({ success: false, error: safeError(err) });
    }
  }
);

router.post(
  '/resources',
  authenticate, requireBranchAccess, requireBranchAccess,
  authorize(['admin', 'manager', 'librarian']),
  [
    body('name').notEmpty().withMessage('اسم المورد مطلوب'),
    body('categoryId').notEmpty().withMessage('الفئة مطلوبة'),
    body('type').notEmpty().withMessage('نوع المورد مطلوب'),
  ],
  async (req, res) => {
    if (handleValidation(req, res)) return;
    try {
      const data = library.createResource(req.body);
      res.status(201).json({ success: true, data });
    } catch (err) {
      res.status(err.statusCode || 500).json({ success: false, error: safeError(err) });
    }
  }
);

router.put(
  '/resources/:id',
  authenticate, requireBranchAccess, requireBranchAccess,
  authorize(['admin', 'manager', 'librarian']),
  [param('id').notEmpty().withMessage('معرّف المورد مطلوب')],
  async (req, res) => {
    if (handleValidation(req, res)) return;
    try {
      const data = library.updateResource(req.params.id, req.body);
      res.json({ success: true, data });
    } catch (err) {
      res.status(err.statusCode || 500).json({ success: false, error: safeError(err) });
    }
  }
);

router.delete(
  '/resources/:id',
  authenticate, requireBranchAccess, requireBranchAccess,
  authorize(['admin', 'manager']),
  [param('id').notEmpty().withMessage('معرّف المورد مطلوب')],
  async (req, res) => {
    if (handleValidation(req, res)) return;
    try {
      const data = library.deleteResource(req.params.id);
      res.json({ success: true, data });
    } catch (err) {
      res.status(err.statusCode || 500).json({ success: false, error: safeError(err) });
    }
  }
);

router.post(
  '/resources/bulk-import',
  authenticate, requireBranchAccess, requireBranchAccess,
  authorize(['admin', 'manager']),
  [body('items').isArray({ min: 1, max: 200 }).withMessage('يجب تقديم قائمة موارد (بحد أقصى 200)')],
  async (req, res) => {
    if (handleValidation(req, res)) return;
    try {
      const data = library.bulkImport(req.body.items);
      res.json({ success: true, data });
    } catch (err) {
      res.status(err.statusCode || 500).json({ success: false, error: safeError(err) });
    }
  }
);

// ══════════════════════════════════════════════════════════════════════════════
// LOANS — الإعارة
// ══════════════════════════════════════════════════════════════════════════════

router.get('/loans', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const result = library.getLoans(req.query);
    res.json({ success: true, ...result });
  } catch (err) {
    safeError(res, err, 'library');
  }
});

router.get('/loans/overdue', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const result = library.getLoans({ ...req.query, overdue: 'true' });
    res.json({ success: true, ...result });
  } catch (err) {
    safeError(res, err, 'library');
  }
});

router.get(
  '/loans/:id',
  authenticate, requireBranchAccess, requireBranchAccess,
  [param('id').notEmpty().withMessage('معرّف الإعارة مطلوب')],
  async (req, res) => {
    if (handleValidation(req, res)) return;
    try {
      const data = library.getLoanById(req.params.id);
      res.json({ success: true, data });
    } catch (err) {
      res.status(err.statusCode || 500).json({ success: false, error: safeError(err) });
    }
  }
);

router.post(
  '/loans',
  authenticate, requireBranchAccess, requireBranchAccess,
  authorize(['admin', 'manager', 'librarian', 'staff']),
  [
    body('resourceId').notEmpty().withMessage('المورد مطلوب'),
    body('memberId').notEmpty().withMessage('العضو مطلوب'),
  ],
  async (req, res) => {
    if (handleValidation(req, res)) return;
    try {
      const data = library.createLoan(req.body);
      res.status(201).json({ success: true, data });
    } catch (err) {
      res.status(err.statusCode || 500).json({ success: false, error: safeError(err) });
    }
  }
);

router.post(
  '/loans/:id/return',
  authenticate, requireBranchAccess, requireBranchAccess,
  authorize(['admin', 'manager', 'librarian', 'staff']),
  [param('id').notEmpty().withMessage('معرّف الإعارة مطلوب')],
  async (req, res) => {
    if (handleValidation(req, res)) return;
    try {
      const data = library.returnLoan(req.params.id);
      res.json({ success: true, data });
    } catch (err) {
      res.status(err.statusCode || 500).json({ success: false, error: safeError(err) });
    }
  }
);

router.post(
  '/loans/:id/renew',
  authenticate, requireBranchAccess, requireBranchAccess,
  authorize(['admin', 'manager', 'librarian', 'staff']),
  [param('id').notEmpty().withMessage('معرّف الإعارة مطلوب')],
  async (req, res) => {
    if (handleValidation(req, res)) return;
    try {
      const data = library.renewLoan(req.params.id);
      res.json({ success: true, data });
    } catch (err) {
      res.status(err.statusCode || 500).json({ success: false, error: safeError(err) });
    }
  }
);

// ══════════════════════════════════════════════════════════════════════════════
// RESERVATIONS — الحجوزات
// ══════════════════════════════════════════════════════════════════════════════

router.get('/reservations', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const data = library.getReservations(req.query);
    res.json({ success: true, data, total: data.length });
  } catch (err) {
    safeError(res, err, 'library');
  }
});

router.post(
  '/reservations',
  authenticate, requireBranchAccess, requireBranchAccess,
  authorize(['admin', 'manager', 'librarian', 'staff']),
  [
    body('resourceId').notEmpty().withMessage('المورد مطلوب'),
    body('memberId').notEmpty().withMessage('العضو مطلوب'),
  ],
  async (req, res) => {
    if (handleValidation(req, res)) return;
    try {
      const data = library.createReservation(req.body);
      res.status(201).json({ success: true, data });
    } catch (err) {
      res.status(err.statusCode || 500).json({ success: false, error: safeError(err) });
    }
  }
);

router.post(
  '/reservations/:id/cancel',
  authenticate, requireBranchAccess, requireBranchAccess,
  authorize(['admin', 'manager', 'librarian', 'staff']),
  [param('id').notEmpty().withMessage('معرّف الحجز مطلوب')],
  async (req, res) => {
    if (handleValidation(req, res)) return;
    try {
      const data = library.cancelReservation(req.params.id);
      res.json({ success: true, data });
    } catch (err) {
      res.status(err.statusCode || 500).json({ success: false, error: safeError(err) });
    }
  }
);

// ══════════════════════════════════════════════════════════════════════════════
// MEMBERS — الأعضاء
// ══════════════════════════════════════════════════════════════════════════════

router.get('/members', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const data = library.getMembers(req.query);
    res.json({ success: true, data, total: data.length });
  } catch (err) {
    safeError(res, err, 'library');
  }
});

router.get(
  '/members/:id',
  authenticate, requireBranchAccess, requireBranchAccess,
  [param('id').notEmpty().withMessage('معرّف العضو مطلوب')],
  async (req, res) => {
    if (handleValidation(req, res)) return;
    try {
      const data = library.getMemberById(req.params.id);
      res.json({ success: true, data });
    } catch (err) {
      res.status(err.statusCode || 500).json({ success: false, error: safeError(err) });
    }
  }
);

router.post(
  '/members',
  authenticate, requireBranchAccess, requireBranchAccess,
  authorize(['admin', 'manager', 'librarian']),
  [
    body('name').notEmpty().withMessage('اسم العضو مطلوب'),
    body('email').isEmail().withMessage('بريد إلكتروني صالح مطلوب'),
  ],
  async (req, res) => {
    if (handleValidation(req, res)) return;
    try {
      const data = library.createMember(req.body);
      res.status(201).json({ success: true, data });
    } catch (err) {
      res.status(err.statusCode || 500).json({ success: false, error: safeError(err) });
    }
  }
);

router.put(
  '/members/:id',
  authenticate, requireBranchAccess, requireBranchAccess,
  authorize(['admin', 'manager', 'librarian']),
  [param('id').notEmpty().withMessage('معرّف العضو مطلوب')],
  async (req, res) => {
    if (handleValidation(req, res)) return;
    try {
      const data = library.updateMember(req.params.id, req.body);
      res.json({ success: true, data });
    } catch (err) {
      res.status(err.statusCode || 500).json({ success: false, error: safeError(err) });
    }
  }
);

// ══════════════════════════════════════════════════════════════════════════════
// REVIEWS — التقييمات
// ══════════════════════════════════════════════════════════════════════════════

router.get(
  '/resources/:id/reviews',
  authenticate, requireBranchAccess, requireBranchAccess,
  [param('id').notEmpty().withMessage('معرّف المورد مطلوب')],
  async (req, res) => {
    if (handleValidation(req, res)) return;
    try {
      const data = library.getResourceReviews(req.params.id);
      res.json({ success: true, data, total: data.length });
    } catch (err) {
      res.status(err.statusCode || 500).json({ success: false, error: safeError(err) });
    }
  }
);

router.post(
  '/resources/:id/reviews',
  authenticate, requireBranchAccess, requireBranchAccess,
  [
    param('id').notEmpty().withMessage('معرّف المورد مطلوب'),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('التقييم يجب أن يكون بين 1 و 5'),
  ],
  async (req, res) => {
    if (handleValidation(req, res)) return;
    try {
      const data = library.addReview(req.params.id, {
        ...req.body,
        userId: req.user?.id,
        userName: req.user?.name || req.user?.username,
      });
      res.status(201).json({ success: true, data });
    } catch (err) {
      res.status(err.statusCode || 500).json({ success: false, error: safeError(err) });
    }
  }
);

// ══════════════════════════════════════════════════════════════════════════════
// SUPPLIERS — الموردون
// ══════════════════════════════════════════════════════════════════════════════

router.get('/suppliers', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const data = library.getSuppliers();
    res.json({ success: true, data, total: data.length });
  } catch (err) {
    safeError(res, err, 'library');
  }
});

router.post(
  '/suppliers',
  authenticate, requireBranchAccess, requireBranchAccess,
  authorize(['admin', 'manager']),
  [body('name').notEmpty().withMessage('اسم المورّد مطلوب')],
  async (req, res) => {
    if (handleValidation(req, res)) return;
    try {
      const data = library.createSupplier(req.body);
      res.status(201).json({ success: true, data });
    } catch (err) {
      res.status(err.statusCode || 500).json({ success: false, error: safeError(err) });
    }
  }
);

// ══════════════════════════════════════════════════════════════════════════════
// MAINTENANCE — صيانة الموارد
// ══════════════════════════════════════════════════════════════════════════════

router.get('/maintenance', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const data = library.getMaintenanceRecords(req.query.resourceId);
    res.json({ success: true, data, total: data.length });
  } catch (err) {
    safeError(res, err, 'library');
  }
});

router.post(
  '/maintenance',
  authenticate, requireBranchAccess, requireBranchAccess,
  authorize(['admin', 'manager', 'librarian']),
  [
    body('resourceId').notEmpty().withMessage('المورد مطلوب'),
    body('type').notEmpty().withMessage('نوع الصيانة مطلوب'),
  ],
  async (req, res) => {
    if (handleValidation(req, res)) return;
    try {
      const data = library.createMaintenanceRecord(req.body);
      res.status(201).json({ success: true, data });
    } catch (err) {
      res.status(err.statusCode || 500).json({ success: false, error: safeError(err) });
    }
  }
);

module.exports = router;
