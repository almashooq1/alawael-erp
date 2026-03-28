/**
 * Rehabilitation Specialized Routes — مسارات التأهيل التخصصي
 * CRUD APIs for: Transportation, InsuranceClaim, BillingRecord, Volunteer,
 * Donation, ResidentialUnit, Activity, Document, Event, ClinicalNote
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const logger = require('../utils/logger');
const { safeError } = require('../utils/safeError');
const {
  Transportation,
  InsuranceClaim,
  BillingRecord,
  Volunteer,
  Donation,
  ResidentialUnit,
  Activity,
  Document,
  Event,
  ClinicalNote,
} = require('../models/rehabilitation-specialized.model');

/* ================================================================
   Helper: generic CRUD factory
   ================================================================ */
function buildCrud(Model, modelName, opts = {}) {
  const sub = express.Router();
  const { filterFields = [], searchFields = [], defaultSort = { createdAt: -1 } } = opts;

  // GET /
  sub.get('/', requireAuth, async (req, res) => {
    try {
      const { page = 1, limit = 25, search, beneficiary_id, status, ...rest } = req.query;
      const filter = {};
      if (beneficiary_id) filter.beneficiary_id = beneficiary_id;
      if (status) filter.status = status;
      filterFields.forEach(f => {
        if (rest[f]) filter[f] = rest[f];
      });
      if (search && searchFields.length) {
        filter.$or = searchFields.map(sf => ({ [sf]: { $regex: search, $options: 'i' } }));
      }
      const skip = (Number(page) - 1) * Number(limit);
      const [data, total] = await Promise.all([
        Model.find(filter).sort(defaultSort).skip(skip).limit(Number(limit)).lean(),
        Model.countDocuments(filter),
      ]);
      res.json({
        success: true,
        data,
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
      });
    } catch (err) {
      logger.error(`${modelName} GET / error:`, err);
      res.status(500).json({ success: false, message: safeError(err) });
    }
  });

  // GET /stats
  sub.get('/stats', requireAuth, async (req, res) => {
    try {
      const total = await Model.countDocuments();
      const byStatus = await Model.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]);
      res.json({ success: true, data: { total, byStatus } });
    } catch (err) {
      logger.error(`${modelName} GET /stats error:`, err);
      res.status(500).json({ success: false, message: safeError(err) });
    }
  });

  // GET /:id
  sub.get('/:id', requireAuth, async (req, res) => {
    try {
      const doc = await Model.findById(req.params.id);
      if (!doc) return res.status(404).json({ success: false, message: `${modelName} not found` });
      res.json({ success: true, data: doc });
    } catch (err) {
      logger.error(`${modelName} GET /:id error:`, err);
      res.status(500).json({ success: false, message: safeError(err) });
    }
  });

  // POST /
  sub.post('/', requireAuth, async (req, res) => {
    try {
      const doc = await Model.create(req.body);
      res.status(201).json({ success: true, data: doc });
    } catch (err) {
      logger.error(`${modelName} POST / error:`, err);
      res.status(400).json({ success: false, message: err.message });
    }
  });

  // PUT /:id
  sub.put('/:id', requireAuth, async (req, res) => {
    try {
      const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
      });
      if (!doc) return res.status(404).json({ success: false, message: `${modelName} not found` });
      res.json({ success: true, data: doc });
    } catch (err) {
      logger.error(`${modelName} PUT /:id error:`, err);
      res.status(400).json({ success: false, message: err.message });
    }
  });

  // DELETE /:id
  sub.delete('/:id', requireAuth, async (req, res) => {
    try {
      const doc = await Model.findByIdAndDelete(req.params.id);
      if (!doc) return res.status(404).json({ success: false, message: `${modelName} not found` });
      res.json({ success: true, message: `${modelName} deleted` });
    } catch (err) {
      logger.error(`${modelName} DELETE /:id error:`, err);
      res.status(500).json({ success: false, message: safeError(err) });
    }
  });

  return sub;
}

/* ================================================================
   Mount sub-routers
   ================================================================ */

// 1. Transportation — النقل
router.use(
  '/transportation',
  buildCrud(Transportation, 'Transportation', {
    filterFields: ['vehicle_info.vehicle_type', 'status'],
    searchFields: ['vehicle_info.plate_number'],
  })
);

// 2. Insurance Claims — مطالبات التأمين
router.use(
  '/insurance-claims',
  buildCrud(InsuranceClaim, 'InsuranceClaim', {
    filterFields: ['status', 'claim_type'],
    defaultSort: { submission_date: -1 },
  })
);

// 3. Billing Records — سجلات الفوترة
router.use(
  '/billing-records',
  buildCrud(BillingRecord, 'BillingRecord', {
    filterFields: ['payment_status', 'billing_type'],
    defaultSort: { invoice_date: -1 },
  })
);

// 4. Volunteers — المتطوعون
router.use(
  '/volunteers',
  buildCrud(Volunteer, 'Volunteer', {
    filterFields: ['status'],
    searchFields: ['name', 'email'],
  })
);

// 5. Donations — التبرعات
router.use(
  '/donations',
  buildCrud(Donation, 'Donation', {
    filterFields: ['donation_type', 'status'],
    defaultSort: { donation_date: -1 },
  })
);

// 6. Residential Units — الوحدات السكنية
router.use(
  '/residential-units',
  buildCrud(ResidentialUnit, 'ResidentialUnit', {
    filterFields: ['unit_type', 'is_available'],
    searchFields: ['unit_name'],
  })
);

// 7. Activities — الأنشطة
router.use(
  '/activities',
  buildCrud(Activity, 'Activity', {
    filterFields: ['activity_type', 'status'],
    searchFields: ['activity_name'],
  })
);

// 8. Documents — المستندات
router.use(
  '/documents',
  buildCrud(Document, 'Document', {
    filterFields: ['document_type', 'status'],
    searchFields: ['title'],
  })
);

// 9. Events — الفعاليات
router.use(
  '/events',
  buildCrud(Event, 'Event', {
    filterFields: ['event_type', 'status'],
    searchFields: ['event_name'],
    defaultSort: { start_date: -1 },
  })
);

// 10. Clinical Notes — الملاحظات السريرية
router.use(
  '/clinical-notes',
  buildCrud(ClinicalNote, 'ClinicalNote', {
    filterFields: ['note_type', 'provider_id'],
    defaultSort: { note_date: -1 },
  })
);

/* ── Index endpoint ─────────────────────────────────────────────── */
router.get('/', requireAuth, (_req, res) => {
  res.json({
    success: true,
    modules: [
      'transportation',
      'insurance-claims',
      'billing-records',
      'volunteers',
      'donations',
      'residential-units',
      'activities',
      'documents',
      'events',
      'clinical-notes',
    ],
  });
});

module.exports = router;
