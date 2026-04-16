const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const logger = require('../utils/logger');

router.use(authenticate);
router.use(requireBranchAccess);
// GET /incentives
router.get('/incentives', async (req, res) => {
  try {
    const { IndividualIncentive } = require('../models/compensation.model');
    const { page = 1, limit = 20, status } = req.query;
    const filter = {};
    if (status) filter.status = status;
    const skip = (Math.max(1, +page) - 1) * +limit;
    const [data, total] = await Promise.all([
      IndividualIncentive.find(filter).sort({ createdAt: -1 }).skip(skip).limit(+limit).lean(),
      IndividualIncentive.countDocuments(filter),
    ]);
    res.json({ success: true, data, pagination: { page: +page, limit: +limit, total } });
  } catch (err) {
    safeError(res, err, 'Compensation incentives error');
  }
});

// ── Allowed fields for incentive creation (prevent mass-assignment) ──
const INCENTIVE_FIELDS = [
  'employeeId',
  'type',
  'amount',
  'currency',
  'reason',
  'description',
  'department',
  'period',
  'effectiveDate',
];

function pickFields(src, allowedFields) {
  const out = {};
  for (const f of allowedFields) if (src[f] !== undefined) out[f] = src[f];
  return out;
}

// POST /incentives — with field whitelist & basic validation
router.post('/incentives', authorize(['admin', 'manager']), async (req, res) => {
  try {
    const { IndividualIncentive } = require('../models/compensation.model');
const safeError = require('../utils/safeError');
    const fields = pickFields(req.body, INCENTIVE_FIELDS);
    if (fields.amount !== undefined) {
      const amt = Number(fields.amount);
      if (isNaN(amt) || amt <= 0) {
        return res.status(400).json({ success: false, message: 'المبلغ يجب أن يكون رقماً موجباً' });
      }
    }
    const incentive = await IndividualIncentive.create({
      ...fields,
      status: 'pending',
      createdBy: req.user?.id,
    });
    res.status(201).json({ success: true, data: incentive, message: 'تم إنشاء الحافز' });
  } catch (err) {
    safeError(res, err, 'Compensation create error');
  }
});

// PUT /incentives/:id/approve
router.put('/incentives/:id/approve', authorize(['admin', 'manager']), async (req, res) => {
  try {
    const { IndividualIncentive } = require('../models/compensation.model');
    const item = await IndividualIncentive.findByIdAndUpdate(
      req.params.id,
      { status: 'approved', approvedBy: req.user?.id, approvedAt: new Date() },
      { new: true }
    ).lean();
    if (!item) return res.status(404).json({ success: false, message: 'الحافز غير موجود' });
    res.json({ success: true, data: item, message: 'تم اعتماد الحافز' });
  } catch (err) {
    safeError(res, err, 'Compensation approve error');
  }
});

// PUT /incentives/:id/mark-paid
router.put('/incentives/:id/mark-paid', authorize(['admin']), async (req, res) => {
  try {
    const { IndividualIncentive } = require('../models/compensation.model');
    const item = await IndividualIncentive.findByIdAndUpdate(
      req.params.id,
      { status: 'paid', paidAt: new Date() },
      { new: true }
    ).lean();
    if (!item) return res.status(404).json({ success: false, message: 'الحافز غير موجود' });
    res.json({ success: true, data: item, message: 'تم صرف الحافز' });
  } catch (err) {
    safeError(res, err, 'Compensation mark-paid error');
  }
});

module.exports = router;
