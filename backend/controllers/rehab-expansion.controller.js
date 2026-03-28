const { safeError } = require('../utils/safeError');
/**
 * Rehabilitation Expansion Controller — متحكمات التوسعة في خدمات تأهيل ذوي الإعاقة
 *
 * 10 أنظمة × CRUD + إحصائيات + خدمات متخصصة = 200+ نقطة وصول
 */

const {
  AssistiveDevice,
  VocationalRehab,
  DisabilityRights,
  IntegrativeHealthcare,
  CommunityIntegration,
  CaregiverSupport,
  AccessibilityAudit,
  EarlyDetection,
  OutcomeMeasurement,
  AdaptiveHousing,
} = require('../models/rehab-expansion.model');

// ─── Helper: Build query from request ────────────────────────────────────────
const buildQuery = (req, extraFilters = {}) => {
  const query = { ...extraFilters };
  if (req.query.status) query.status = req.query.status;
  if (req.query.beneficiary) query.beneficiary = req.query.beneficiary;
  if (req.query.category) query.category = req.query.category;
  if (req.query.priority) query.priority = req.query.priority;
  if (req.query.search) {
    query.$or = [
      { beneficiaryName: { $regex: req.query.search, $options: 'i' } },
      { notes: { $regex: req.query.search, $options: 'i' } },
    ];
  }
  return query;
};

const paginate = req => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  return { skip: (page - 1) * limit, limit, page };
};

const getUserId = req => req.user?.userId || req.user?._id || req.user?.id;

// ═══════════════════════════════════════════════════════════════════════════════
// 1. الأجهزة التعويضية والمساعدة — Assistive Devices
// ═══════════════════════════════════════════════════════════════════════════════

const assistiveDevices = {
  // CRUD
  async create(req, res) {
    try {
      const device = new AssistiveDevice({ ...req.body, createdBy: getUserId(req) });
      await device.save();
      res
        .status(201)
        .json({ success: true, data: device, message: 'تم إضافة الجهاز التعويضي بنجاح' });
    } catch (err) {
      res.status(400).json({ success: false, message: safeError(err) });
    }
  },

  async getAll(req, res) {
    try {
      const query = buildQuery(req);
      const { skip, limit, page } = paginate(req);
      const [data, total] = await Promise.all([
        AssistiveDevice.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate('beneficiary', 'name email'),
        AssistiveDevice.countDocuments(query),
      ]);
      res.json({
        success: true,
        data,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      });
    } catch (err) {
      res.status(500).json({ success: false, message: safeError(err) });
    }
  },

  async getById(req, res) {
    try {
      const device = await AssistiveDevice.findById(req.params.id).populate(
        'beneficiary',
        'name email'
      );
      if (!device) return res.status(404).json({ success: false, message: 'الجهاز غير موجود' });
      res.json({ success: true, data: device });
    } catch (err) {
      res.status(500).json({ success: false, message: safeError(err) });
    }
  },

  async update(req, res) {
    try {
      const device = await AssistiveDevice.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
      });
      if (!device) return res.status(404).json({ success: false, message: 'الجهاز غير موجود' });
      res.json({ success: true, data: device, message: 'تم تحديث الجهاز بنجاح' });
    } catch (err) {
      res.status(400).json({ success: false, message: safeError(err) });
    }
  },

  async delete(req, res) {
    try {
      const device = await AssistiveDevice.findByIdAndDelete(req.params.id);
      if (!device) return res.status(404).json({ success: false, message: 'الجهاز غير موجود' });
      res.json({ success: true, message: 'تم حذف الجهاز بنجاح' });
    } catch (err) {
      res.status(500).json({ success: false, message: safeError(err) });
    }
  },

  // Specialized
  async getByBeneficiary(req, res) {
    try {
      const devices = await AssistiveDevice.find({ beneficiary: req.params.beneficiaryId }).sort({
        createdAt: -1,
      });
      res.json({ success: true, data: devices });
    } catch (err) {
      res.status(500).json({ success: false, message: safeError(err) });
    }
  },

  async addMaintenance(req, res) {
    try {
      const device = await AssistiveDevice.findById(req.params.id).lean();
      if (!device) return res.status(404).json({ success: false, message: 'الجهاز غير موجود' });
      device.maintenance.history.push(req.body);
      device.maintenance.lastServiceDate = new Date();
      await device.save();
      res.json({ success: true, data: device, message: 'تم إضافة سجل الصيانة' });
    } catch (err) {
      res.status(400).json({ success: false, message: safeError(err) });
    }
  },

  async addTrainingSession(req, res) {
    try {
      const device = await AssistiveDevice.findById(req.params.id).lean();
      if (!device) return res.status(404).json({ success: false, message: 'الجهاز غير موجود' });
      device.training.sessions.push(req.body);
      await device.save();
      res.json({ success: true, data: device, message: 'تم إضافة جلسة التدريب' });
    } catch (err) {
      res.status(400).json({ success: false, message: safeError(err) });
    }
  },

  async getWarrantyExpiring(req, res) {
    try {
      const daysAhead = parseInt(req.query.days) || 30;
      const future = new Date();
      future.setDate(future.getDate() + daysAhead);
      const devices = await AssistiveDevice.find({
        'warranty.endDate': { $lte: future, $gte: new Date() },
        status: { $in: ['active', 'needs_repair'] },
      }).sort({ 'warranty.endDate': 1 });
      res.json({ success: true, data: devices, count: devices.length });
    } catch (err) {
      res.status(500).json({ success: false, message: safeError(err) });
    }
  },

  async getMaintenanceDue(req, res) {
    try {
      const daysAhead = parseInt(req.query.days) || 30;
      const future = new Date();
      future.setDate(future.getDate() + daysAhead);
      const devices = await AssistiveDevice.find({
        'maintenance.nextServiceDate': { $lte: future },
        status: 'active',
      }).sort({ 'maintenance.nextServiceDate': 1 });
      res.json({ success: true, data: devices, count: devices.length });
    } catch (err) {
      res.status(500).json({ success: false, message: safeError(err) });
    }
  },

  async getStatistics(req, res) {
    try {
      const [total, byCategory, byStatus, avgCost] = await Promise.all([
        AssistiveDevice.countDocuments(),
        AssistiveDevice.aggregate([
          { $group: { _id: '$category', count: { $sum: 1 } } },
          { $sort: { count: -1 } }, { $limit: 1000 }
        ]),
        AssistiveDevice.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }, { $limit: 1000 }]),
        AssistiveDevice.aggregate([
          {
            $group: {
              _id: null,
              avgCost: { $avg: '$cost.purchasePrice' },
              totalCost: { $sum: '$cost.purchasePrice' },
            },
          }, { $limit: 1000 }
        ]),
      ]);
      res.json({
        success: true,
        data: {
          total,
          byCategory,
          byStatus,
          financials: avgCost[0] || { avgCost: 0, totalCost: 0 },
        },
      });
    } catch (err) {
      res.status(500).json({ success: false, message: safeError(err) });
    }
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 2. التأهيل المهني والتوظيف — Vocational Rehabilitation
// ═══════════════════════════════════════════════════════════════════════════════

const vocationalRehab = {
  async create(req, res) {
    try {
      const record = new VocationalRehab({ ...req.body, createdBy: getUserId(req) });
      await record.save();
      res
        .status(201)
        .json({ success: true, data: record, message: 'تم إنشاء سجل التأهيل المهني بنجاح' });
    } catch (err) {
      res.status(400).json({ success: false, message: safeError(err) });
    }
  },

  async getAll(req, res) {
    try {
      const query = buildQuery(req);
      if (req.query.placementStatus) query['jobPlacement.status'] = req.query.placementStatus;
      const { skip, limit, page } = paginate(req);
      const [data, total] = await Promise.all([
        VocationalRehab.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate('beneficiary', 'name email'),
        VocationalRehab.countDocuments(query),
      ]);
      res.json({
        success: true,
        data,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      });
    } catch (err) {
      res.status(500).json({ success: false, message: safeError(err) });
    }
  },

  async getById(req, res) {
    try {
      const record = await VocationalRehab.findById(req.params.id).populate(
        'beneficiary',
        'name email'
      );
      if (!record) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
      res.json({ success: true, data: record });
    } catch (err) {
      res.status(500).json({ success: false, message: safeError(err) });
    }
  },

  async update(req, res) {
    try {
      const record = await VocationalRehab.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
      });
      if (!record) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
      res.json({ success: true, data: record, message: 'تم التحديث بنجاح' });
    } catch (err) {
      res.status(400).json({ success: false, message: safeError(err) });
    }
  },

  async delete(req, res) {
    try {
      const record = await VocationalRehab.findByIdAndDelete(req.params.id);
      if (!record) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
      res.json({ success: true, message: 'تم الحذف بنجاح' });
    } catch (err) {
      res.status(500).json({ success: false, message: safeError(err) });
    }
  },

  async addSkillTraining(req, res) {
    try {
      const record = await VocationalRehab.findById(req.params.id).lean();
      if (!record) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
      record.skillsTraining.push(req.body);
      await record.save();
      res.json({ success: true, data: record, message: 'تم إضافة برنامج التدريب' });
    } catch (err) {
      res.status(400).json({ success: false, message: safeError(err) });
    }
  },

  async addJobApplication(req, res) {
    try {
      const record = await VocationalRehab.findById(req.params.id).lean();
      if (!record) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
      record.jobPlacement.applications.push(req.body);
      await record.save();
      res.json({ success: true, data: record, message: 'تم إضافة طلب التوظيف' });
    } catch (err) {
      res.status(400).json({ success: false, message: safeError(err) });
    }
  },

  async updateEmployment(req, res) {
    try {
      const record = await VocationalRehab.findById(req.params.id).lean();
      if (!record) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
      record.jobPlacement.currentEmployment = req.body;
      record.jobPlacement.status = 'employed';
      await record.save();
      res.json({ success: true, data: record, message: 'تم تحديث بيانات التوظيف' });
    } catch (err) {
      res.status(400).json({ success: false, message: safeError(err) });
    }
  },

  async addWorkplaceAccommodation(req, res) {
    try {
      const record = await VocationalRehab.findById(req.params.id).lean();
      if (!record) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
      record.workplaceAccommodations.push(req.body);
      await record.save();
      res.json({ success: true, data: record, message: 'تم إضافة التسهيلات المطلوبة' });
    } catch (err) {
      res.status(400).json({ success: false, message: safeError(err) });
    }
  },

  async addFollowUp(req, res) {
    try {
      const record = await VocationalRehab.findById(req.params.id).lean();
      if (!record) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
      record.followUps.push({ ...req.body, conductedBy: getUserId(req), date: new Date() });
      await record.save();
      res.json({ success: true, data: record, message: 'تم إضافة المتابعة' });
    } catch (err) {
      res.status(400).json({ success: false, message: safeError(err) });
    }
  },

  async getEmployedBeneficiaries(req, res) {
    try {
      const data = await VocationalRehab.find({
        'jobPlacement.status': { $in: ['employed', 'self_employed'] },
      })
        .populate('beneficiary', 'name email')
        .sort({ updatedAt: -1 });
      res.json({ success: true, data, count: data.length });
    } catch (err) {
      res.status(500).json({ success: false, message: safeError(err) });
    }
  },

  async getStatistics(req, res) {
    try {
      const [total, byPlacement, byTraining, employmentRate] = await Promise.all([
        VocationalRehab.countDocuments(),
        VocationalRehab.aggregate([
          { $group: { _id: '$jobPlacement.status', count: { $sum: 1 } } }, { $limit: 1000 }
        ]),
        VocationalRehab.aggregate([
          { $unwind: '$skillsTraining' },
          { $group: { _id: '$skillsTraining.type', count: { $sum: 1 } } },
          { $sort: { count: -1 } }, { $limit: 1000 }
        ]),
        VocationalRehab.aggregate([
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              employed: {
                $sum: {
                  $cond: [{ $in: ['$jobPlacement.status', ['employed', 'self_employed']] }, 1, 0],
                },
              },
            },
          },
          {
            $project: {
              rate: { $multiply: [{ $divide: ['$employed', { $max: ['$total', 1] }] }, 100] },
              total: 1,
              employed: 1,
            },
          }, { $limit: 1000 }
        ]),
      ]);
      res.json({
        success: true,
        data: { total, byPlacement, byTraining, employmentRate: employmentRate[0] || { rate: 0 } },
      });
    } catch (err) {
      res.status(500).json({ success: false, message: safeError(err) });
    }
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 3. حقوق ذوي الإعاقة والمناصرة — Disability Rights
// ═══════════════════════════════════════════════════════════════════════════════

const disabilityRights = {
  async create(req, res) {
    try {
      const caseNum = `DR-${Date.now().toString(36).toUpperCase()}`;
      const record = new DisabilityRights({
        ...req.body,
        caseNumber: caseNum,
        createdBy: getUserId(req),
      });
      await record.save();
      res.status(201).json({ success: true, data: record, message: 'تم تسجيل القضية بنجاح' });
    } catch (err) {
      res.status(400).json({ success: false, message: safeError(err) });
    }
  },

  async getAll(req, res) {
    try {
      const query = {};
      if (req.query.status) query.status = req.query.status;
      if (req.query.priority) query.priority = req.query.priority;
      if (req.query.caseType) query.caseType = req.query.caseType;
      if (req.query.search) {
        query.$or = [
          { caseNumber: { $regex: req.query.search, $options: 'i' } },
          { description: { $regex: req.query.search, $options: 'i' } },
          { 'complainant.name': { $regex: req.query.search, $options: 'i' } },
        ];
      }
      const { skip, limit, page } = paginate(req);
      const [data, total] = await Promise.all([
        DisabilityRights.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
        DisabilityRights.countDocuments(query),
      ]);
      res.json({
        success: true,
        data,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      });
    } catch (err) {
      res.status(500).json({ success: false, message: safeError(err) });
    }
  },

  async getById(req, res) {
    try {
      const record = await DisabilityRights.findById(req.params.id).lean();
      if (!record) return res.status(404).json({ success: false, message: 'القضية غير موجودة' });
      res.json({ success: true, data: record });
    } catch (err) {
      res.status(500).json({ success: false, message: safeError(err) });
    }
  },

  async update(req, res) {
    try {
      const record = await DisabilityRights.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
      });
      if (!record) return res.status(404).json({ success: false, message: 'القضية غير موجودة' });
      res.json({ success: true, data: record, message: 'تم تحديث القضية' });
    } catch (err) {
      res.status(400).json({ success: false, message: safeError(err) });
    }
  },

  async delete(req, res) {
    try {
      const record = await DisabilityRights.findByIdAndDelete(req.params.id);
      if (!record) return res.status(404).json({ success: false, message: 'القضية غير موجودة' });
      res.json({ success: true, message: 'تم حذف القضية' });
    } catch (err) {
      res.status(500).json({ success: false, message: safeError(err) });
    }
  },

  async addTimelineEntry(req, res) {
    try {
      const record = await DisabilityRights.findById(req.params.id).lean();
      if (!record) return res.status(404).json({ success: false, message: 'القضية غير موجودة' });
      record.timeline.push({ ...req.body, performedBy: getUserId(req), date: new Date() });
      await record.save();
      res.json({ success: true, data: record, message: 'تم إضافة إجراء للقضية' });
    } catch (err) {
      res.status(400).json({ success: false, message: safeError(err) });
    }
  },

  async addEvidence(req, res) {
    try {
      const record = await DisabilityRights.findById(req.params.id).lean();
      if (!record) return res.status(404).json({ success: false, message: 'القضية غير موجودة' });
      record.evidence.push(req.body);
      await record.save();
      res.json({ success: true, data: record, message: 'تم إضافة الدليل' });
    } catch (err) {
      res.status(400).json({ success: false, message: safeError(err) });
    }
  },

  async resolveCase(req, res) {
    try {
      const record = await DisabilityRights.findById(req.params.id).lean();
      if (!record) return res.status(404).json({ success: false, message: 'القضية غير موجودة' });
      record.resolution = { ...req.body, date: new Date() };
      record.status = 'resolved';
      await record.save();
      res.json({ success: true, data: record, message: 'تم حل القضية' });
    } catch (err) {
      res.status(400).json({ success: false, message: safeError(err) });
    }
  },

  async escalateCase(req, res) {
    try {
      const record = await DisabilityRights.findById(req.params.id).lean();
      if (!record) return res.status(404).json({ success: false, message: 'القضية غير موجودة' });
      record.status = 'escalated';
      record.timeline.push({
        action: 'تصعيد القضية',
        performedBy: getUserId(req),
        notes: req.body.reason,
        date: new Date(),
      });
      await record.save();
      res.json({ success: true, data: record, message: 'تم تصعيد القضية' });
    } catch (err) {
      res.status(400).json({ success: false, message: safeError(err) });
    }
  },

  async getStatistics(req, res) {
    try {
      const [total, byStatus, byType, byPriority, resolutionRate] = await Promise.all([
        DisabilityRights.countDocuments(),
        DisabilityRights.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }, { $limit: 1000 }]),
        DisabilityRights.aggregate([
          { $group: { _id: '$caseType', count: { $sum: 1 } } },
          { $sort: { count: -1 } }, { $limit: 1000 }
        ]),
        DisabilityRights.aggregate([{ $group: { _id: '$priority', count: { $sum: 1 } } }, { $limit: 1000 }]),
        DisabilityRights.aggregate([
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
            },
          },
          {
            $project: {
              rate: { $multiply: [{ $divide: ['$resolved', { $max: ['$total', 1] }] }, 100] },
            },
          }, { $limit: 1000 }
        ]),
      ]);
      res.json({
        success: true,
        data: { total, byStatus, byType, byPriority, resolutionRate: resolutionRate[0]?.rate || 0 },
      });
    } catch (err) {
      res.status(500).json({ success: false, message: safeError(err) });
    }
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 4. الرعاية الصحية التكاملية — Integrative Healthcare
// ═══════════════════════════════════════════════════════════════════════════════

const integrativeHealthcare = {
  async create(req, res) {
    try {
      const record = new IntegrativeHealthcare({ ...req.body, createdBy: getUserId(req) });
      await record.save();
      res.status(201).json({ success: true, data: record, message: 'تم إنشاء سجل الرعاية الصحية' });
    } catch (err) {
      res.status(400).json({ success: false, message: safeError(err) });
    }
  },

  async getAll(req, res) {
    try {
      const query = buildQuery(req);
      const { skip, limit, page } = paginate(req);
      const [data, total] = await Promise.all([
        IntegrativeHealthcare.find(query)
          .sort({ updatedAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate('beneficiary', 'name email'),
        IntegrativeHealthcare.countDocuments(query),
      ]);
      res.json({
        success: true,
        data,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      });
    } catch (err) {
      res.status(500).json({ success: false, message: safeError(err) });
    }
  },

  async getById(req, res) {
    try {
      const record = await IntegrativeHealthcare.findById(req.params.id).populate(
        'beneficiary',
        'name email'
      );
      if (!record) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
      res.json({ success: true, data: record });
    } catch (err) {
      res.status(500).json({ success: false, message: safeError(err) });
    }
  },

  async update(req, res) {
    try {
      const record = await IntegrativeHealthcare.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
      });
      if (!record) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
      res.json({ success: true, data: record, message: 'تم التحديث بنجاح' });
    } catch (err) {
      res.status(400).json({ success: false, message: safeError(err) });
    }
  },

  async delete(req, res) {
    try {
      const record = await IntegrativeHealthcare.findByIdAndDelete(req.params.id);
      if (!record) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
      res.json({ success: true, message: 'تم الحذف بنجاح' });
    } catch (err) {
      res.status(500).json({ success: false, message: safeError(err) });
    }
  },

  async getByBeneficiary(req, res) {
    try {
      const record = await IntegrativeHealthcare.findOne({
        beneficiary: req.params.beneficiaryId,
      }).populate('beneficiary', 'name email');
      if (!record) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
      res.json({ success: true, data: record });
    } catch (err) {
      res.status(500).json({ success: false, message: safeError(err) });
    }
  },

  async addDentalVisit(req, res) {
    try {
      const record = await IntegrativeHealthcare.findById(req.params.id).lean();
      if (!record) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
      record.dentalCare.push(req.body);
      await record.save();
      res.json({ success: true, data: record, message: 'تم إضافة زيارة الأسنان' });
    } catch (err) {
      res.status(400).json({ success: false, message: safeError(err) });
    }
  },

  async updateNutritionPlan(req, res) {
    try {
      const record = await IntegrativeHealthcare.findById(req.params.id).lean();
      if (!record) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
      record.nutritionPlan = { ...record.nutritionPlan?.toObject(), ...req.body };
      await record.save();
      res.json({ success: true, data: record, message: 'تم تحديث خطة التغذية' });
    } catch (err) {
      res.status(400).json({ success: false, message: safeError(err) });
    }
  },

  async addImmunization(req, res) {
    try {
      const record = await IntegrativeHealthcare.findById(req.params.id).lean();
      if (!record) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
      record.preventiveCare.immunizations.push(req.body);
      await record.save();
      res.json({ success: true, data: record, message: 'تم إضافة سجل التطعيم' });
    } catch (err) {
      res.status(400).json({ success: false, message: safeError(err) });
    }
  },

  async addMedication(req, res) {
    try {
      const record = await IntegrativeHealthcare.findById(req.params.id).lean();
      if (!record) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
      record.medications.push(req.body);
      await record.save();
      res.json({ success: true, data: record, message: 'تم إضافة الدواء' });
    } catch (err) {
      res.status(400).json({ success: false, message: safeError(err) });
    }
  },

  async addSpecialistVisit(req, res) {
    try {
      const record = await IntegrativeHealthcare.findById(req.params.id).lean();
      if (!record) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
      record.specialistVisits.push(req.body);
      await record.save();
      res.json({ success: true, data: record, message: 'تم إضافة زيارة المتخصص' });
    } catch (err) {
      res.status(400).json({ success: false, message: safeError(err) });
    }
  },

  async getOverdueImmunizations(req, res) {
    try {
      const records = await IntegrativeHealthcare.find({
        'preventiveCare.immunizations': {
          $elemMatch: { status: 'overdue' },
        },
      }).populate('beneficiary', 'name email');
      res.json({ success: true, data: records, count: records.length });
    } catch (err) {
      res.status(500).json({ success: false, message: safeError(err) });
    }
  },

  async getStatistics(req, res) {
    try {
      const [total, mentalHealthStatus, medications] = await Promise.all([
        IntegrativeHealthcare.countDocuments(),
        IntegrativeHealthcare.aggregate([
          { $group: { _id: '$mentalHealth.currentStatus', count: { $sum: 1 } } }, { $limit: 1000 }
        ]),
        IntegrativeHealthcare.aggregate([
          { $project: { medCount: { $size: { $ifNull: ['$medications', []] } } } },
          { $group: { _id: null, avg: { $avg: '$medCount' }, total: { $sum: '$medCount' } } }, { $limit: 1000 }
        ]),
      ]);
      res.json({
        success: true,
        data: { total, mentalHealthStatus, medications: medications[0] || { avg: 0, total: 0 } },
      });
    } catch (err) {
      res.status(500).json({ success: false, message: safeError(err) });
    }
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 5. الدمج المجتمعي — Community Integration
// ═══════════════════════════════════════════════════════════════════════════════

const communityIntegration = {
  async create(req, res) {
    try {
      const record = new CommunityIntegration({ ...req.body, createdBy: getUserId(req) });
      await record.save();
      res.status(201).json({ success: true, data: record, message: 'تم إنشاء سجل الدمج المجتمعي' });
    } catch (err) {
      res.status(400).json({ success: false, message: safeError(err) });
    }
  },

  async getAll(req, res) {
    try {
      const query = buildQuery(req);
      const { skip, limit, page } = paginate(req);
      const [data, total] = await Promise.all([
        CommunityIntegration.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate('beneficiary', 'name email'),
        CommunityIntegration.countDocuments(query),
      ]);
      res.json({
        success: true,
        data,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      });
    } catch (err) {
      res.status(500).json({ success: false, message: safeError(err) });
    }
  },

  async getById(req, res) {
    try {
      const record = await CommunityIntegration.findById(req.params.id).populate(
        'beneficiary',
        'name email'
      );
      if (!record) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
      res.json({ success: true, data: record });
    } catch (err) {
      res.status(500).json({ success: false, message: safeError(err) });
    }
  },

  async update(req, res) {
    try {
      const record = await CommunityIntegration.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
      });
      if (!record) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
      res.json({ success: true, data: record, message: 'تم التحديث بنجاح' });
    } catch (err) {
      res.status(400).json({ success: false, message: safeError(err) });
    }
  },

  async delete(req, res) {
    try {
      const record = await CommunityIntegration.findByIdAndDelete(req.params.id);
      if (!record) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
      res.json({ success: true, message: 'تم الحذف بنجاح' });
    } catch (err) {
      res.status(500).json({ success: false, message: safeError(err) });
    }
  },

  async addLifeSkill(req, res) {
    try {
      const record = await CommunityIntegration.findById(req.params.id).lean();
      if (!record) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
      record.lifeSkillsTraining.push(req.body);
      await record.save();
      res.json({ success: true, data: record, message: 'تم إضافة مهارة حياتية' });
    } catch (err) {
      res.status(400).json({ success: false, message: safeError(err) });
    }
  },

  async addActivity(req, res) {
    try {
      const record = await CommunityIntegration.findById(req.params.id).lean();
      if (!record) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
      record.communityActivities.push(req.body);
      await record.save();
      res.json({ success: true, data: record, message: 'تم إضافة النشاط المجتمعي' });
    } catch (err) {
      res.status(400).json({ success: false, message: safeError(err) });
    }
  },

  async updateSocialNetwork(req, res) {
    try {
      const record = await CommunityIntegration.findById(req.params.id).lean();
      if (!record) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
      record.socialNetwork = { ...record.socialNetwork?.toObject(), ...req.body };
      await record.save();
      res.json({ success: true, data: record, message: 'تم تحديث الشبكة الاجتماعية' });
    } catch (err) {
      res.status(400).json({ success: false, message: safeError(err) });
    }
  },

  async addTravelTraining(req, res) {
    try {
      const record = await CommunityIntegration.findById(req.params.id).lean();
      if (!record) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
      record.transportationIndependence.travelTraining.push(req.body);
      await record.save();
      res.json({ success: true, data: record, message: 'تم إضافة تدريب التنقل' });
    } catch (err) {
      res.status(400).json({ success: false, message: safeError(err) });
    }
  },

  async getStatistics(req, res) {
    try {
      const [total, byActivityCategory, avgSocialSatisfaction] = await Promise.all([
        CommunityIntegration.countDocuments(),
        CommunityIntegration.aggregate([
          { $unwind: '$communityActivities' },
          { $group: { _id: '$communityActivities.category', count: { $sum: 1 } } },
          { $sort: { count: -1 } }, { $limit: 1000 }
        ]),
        CommunityIntegration.aggregate([
          { $group: { _id: null, avg: { $avg: '$socialNetwork.socialSatisfaction' } } }, { $limit: 1000 }
        ]),
      ]);
      res.json({
        success: true,
        data: {
          total,
          byActivityCategory,
          avgSocialSatisfaction: avgSocialSatisfaction[0]?.avg || 0,
        },
      });
    } catch (err) {
      res.status(500).json({ success: false, message: safeError(err) });
    }
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 6. دعم مقدمي الرعاية — Caregiver Support
// ═══════════════════════════════════════════════════════════════════════════════

const caregiverSupport = {
  async create(req, res) {
    try {
      const record = new CaregiverSupport({ ...req.body, createdBy: getUserId(req) });
      await record.save();
      res
        .status(201)
        .json({ success: true, data: record, message: 'تم إنشاء سجل دعم مقدم الرعاية' });
    } catch (err) {
      res.status(400).json({ success: false, message: safeError(err) });
    }
  },

  async getAll(req, res) {
    try {
      const query = buildQuery(req);
      if (req.query.relationship) query.relationship = req.query.relationship;
      const { skip, limit, page } = paginate(req);
      const [data, total] = await Promise.all([
        CaregiverSupport.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate('beneficiary', 'name email'),
        CaregiverSupport.countDocuments(query),
      ]);
      res.json({
        success: true,
        data,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      });
    } catch (err) {
      res.status(500).json({ success: false, message: safeError(err) });
    }
  },

  async getById(req, res) {
    try {
      const record = await CaregiverSupport.findById(req.params.id).populate(
        'beneficiary',
        'name email'
      );
      if (!record) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
      res.json({ success: true, data: record });
    } catch (err) {
      res.status(500).json({ success: false, message: safeError(err) });
    }
  },

  async update(req, res) {
    try {
      const record = await CaregiverSupport.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
      });
      if (!record) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
      res.json({ success: true, data: record, message: 'تم التحديث بنجاح' });
    } catch (err) {
      res.status(400).json({ success: false, message: safeError(err) });
    }
  },

  async delete(req, res) {
    try {
      const record = await CaregiverSupport.findByIdAndDelete(req.params.id);
      if (!record) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
      res.json({ success: true, message: 'تم الحذف بنجاح' });
    } catch (err) {
      res.status(500).json({ success: false, message: safeError(err) });
    }
  },

  async addTraining(req, res) {
    try {
      const record = await CaregiverSupport.findById(req.params.id).lean();
      if (!record) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
      record.trainingPrograms.push(req.body);
      await record.save();
      res.json({ success: true, data: record, message: 'تم إضافة برنامج التدريب' });
    } catch (err) {
      res.status(400).json({ success: false, message: safeError(err) });
    }
  },

  async addRespiteCare(req, res) {
    try {
      const record = await CaregiverSupport.findById(req.params.id).lean();
      if (!record) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
      record.respiteCare.push(req.body);
      await record.save();
      res.json({ success: true, data: record, message: 'تم إضافة خدمة الراحة المؤقتة' });
    } catch (err) {
      res.status(400).json({ success: false, message: safeError(err) });
    }
  },

  async addCounseling(req, res) {
    try {
      const record = await CaregiverSupport.findById(req.params.id).lean();
      if (!record) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
      record.counseling.push(req.body);
      await record.save();
      res.json({ success: true, data: record, message: 'تم إضافة جلسة الإرشاد' });
    } catch (err) {
      res.status(400).json({ success: false, message: safeError(err) });
    }
  },

  async getHighBurden(req, res) {
    try {
      const records = await CaregiverSupport.find({
        'caregiverAssessment.burdenScale.level': { $in: ['moderate', 'severe'] },
      })
        .populate('beneficiary', 'name email')
        .sort({ 'caregiverAssessment.burdenScale.score': -1 });
      res.json({ success: true, data: records, count: records.length });
    } catch (err) {
      res.status(500).json({ success: false, message: safeError(err) });
    }
  },

  async getStatistics(req, res) {
    try {
      const [total, byRelationship, burdenLevels, respiteUsage] = await Promise.all([
        CaregiverSupport.countDocuments(),
        CaregiverSupport.aggregate([{ $group: { _id: '$relationship', count: { $sum: 1 } } }, { $limit: 1000 }]),
        CaregiverSupport.aggregate([
          { $group: { _id: '$caregiverAssessment.burdenScale.level', count: { $sum: 1 } } }, { $limit: 1000 }
        ]),
        CaregiverSupport.aggregate([
          { $project: { respiteCount: { $size: { $ifNull: ['$respiteCare', []] } } } },
          {
            $group: { _id: null, total: { $sum: '$respiteCount' }, avg: { $avg: '$respiteCount' } },
          }, { $limit: 1000 }
        ]),
      ]);
      res.json({
        success: true,
        data: {
          total,
          byRelationship,
          burdenLevels,
          respiteUsage: respiteUsage[0] || { total: 0, avg: 0 },
        },
      });
    } catch (err) {
      res.status(500).json({ success: false, message: safeError(err) });
    }
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 7. الوصول الشامل — Accessibility Audit
// ═══════════════════════════════════════════════════════════════════════════════

const accessibilityAudit = {
  async create(req, res) {
    try {
      const record = new AccessibilityAudit({ ...req.body, createdBy: getUserId(req) });
      // Calculate overall score
      const domains = [
        'physicalAccessibility',
        'sensoryAccessibility',
        'digitalAccessibility',
        'serviceAccessibility',
      ];
      const scores = [];
      for (const d of domains) {
        if (record[d]) {
          const subScores = Object.values(record[d])
            .filter(v => v && typeof v === 'object' && typeof v.score === 'number')
            .map(v => v.score);
          if (subScores.length) scores.push(...subScores);
        }
      }
      if (scores.length)
        record.overallScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
      await record.save();
      res
        .status(201)
        .json({ success: true, data: record, message: 'تم إنشاء تقرير التدقيق بنجاح' });
    } catch (err) {
      res.status(400).json({ success: false, message: safeError(err) });
    }
  },

  async getAll(req, res) {
    try {
      const query = {};
      if (req.query.facilityType) query.facilityType = req.query.facilityType;
      if (req.query.grade) query.grade = req.query.grade;
      if (req.query.complianceLevel) query.complianceLevel = req.query.complianceLevel;
      if (req.query.search) {
        query.$or = [
          { facilityName: { $regex: req.query.search, $options: 'i' } },
          { facilityNameAr: { $regex: req.query.search, $options: 'i' } },
        ];
      }
      const { skip, limit, page } = paginate(req);
      const [data, total] = await Promise.all([
        AccessibilityAudit.find(query).sort({ auditDate: -1 }).skip(skip).limit(limit),
        AccessibilityAudit.countDocuments(query),
      ]);
      res.json({
        success: true,
        data,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      });
    } catch (err) {
      res.status(500).json({ success: false, message: safeError(err) });
    }
  },

  async getById(req, res) {
    try {
      const record = await AccessibilityAudit.findById(req.params.id).lean();
      if (!record) return res.status(404).json({ success: false, message: 'التقرير غير موجود' });
      res.json({ success: true, data: record });
    } catch (err) {
      res.status(500).json({ success: false, message: safeError(err) });
    }
  },

  async update(req, res) {
    try {
      const record = await AccessibilityAudit.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
      });
      if (!record) return res.status(404).json({ success: false, message: 'التقرير غير موجود' });
      res.json({ success: true, data: record, message: 'تم تحديث التقرير' });
    } catch (err) {
      res.status(400).json({ success: false, message: safeError(err) });
    }
  },

  async delete(req, res) {
    try {
      const record = await AccessibilityAudit.findByIdAndDelete(req.params.id);
      if (!record) return res.status(404).json({ success: false, message: 'التقرير غير موجود' });
      res.json({ success: true, message: 'تم حذف التقرير' });
    } catch (err) {
      res.status(500).json({ success: false, message: safeError(err) });
    }
  },

  async addFinding(req, res) {
    try {
      const record = await AccessibilityAudit.findById(req.params.id).lean();
      if (!record) return res.status(404).json({ success: false, message: 'التقرير غير موجود' });
      record.findings.push(req.body);
      await record.save();
      res.json({ success: true, data: record, message: 'تم إضافة الملاحظة' });
    } catch (err) {
      res.status(400).json({ success: false, message: safeError(err) });
    }
  },

  async updateFindingStatus(req, res) {
    try {
      const record = await AccessibilityAudit.findById(req.params.id).lean();
      if (!record) return res.status(404).json({ success: false, message: 'التقرير غير موجود' });
      const finding = record.findings.id(req.params.findingId);
      if (!finding) return res.status(404).json({ success: false, message: 'الملاحظة غير موجودة' });
      finding.status = req.body.status;
      await record.save();
      res.json({ success: true, data: record, message: 'تم تحديث حالة الملاحظة' });
    } catch (err) {
      res.status(400).json({ success: false, message: safeError(err) });
    }
  },

  async getNonCompliant(req, res) {
    try {
      const data = await AccessibilityAudit.find({
        complianceLevel: { $in: ['non_compliant', 'partially_compliant'] },
      }).sort({ overallScore: 1 });
      res.json({ success: true, data, count: data.length });
    } catch (err) {
      res.status(500).json({ success: false, message: safeError(err) });
    }
  },

  async getStatistics(req, res) {
    try {
      const [total, byFacilityType, byGrade, avgScore, certifications] = await Promise.all([
        AccessibilityAudit.countDocuments(),
        AccessibilityAudit.aggregate([
          {
            $group: {
              _id: '$facilityType',
              count: { $sum: 1 },
              avgScore: { $avg: '$overallScore' },
            },
          },
          { $sort: { avgScore: -1 } }, { $limit: 1000 }
        ]),
        AccessibilityAudit.aggregate([{ $group: { _id: '$grade', count: { $sum: 1 } } }, { $limit: 1000 }]),
        AccessibilityAudit.aggregate([{ $group: { _id: null, avg: { $avg: '$overallScore' } } }, { $limit: 1000 }]),
        AccessibilityAudit.aggregate([
          { $match: { 'certification.eligible': true } },
          { $group: { _id: '$certification.certificationLevel', count: { $sum: 1 } } }, { $limit: 1000 }
        ]),
      ]);
      res.json({
        success: true,
        data: { total, byFacilityType, byGrade, avgScore: avgScore[0]?.avg || 0, certifications },
      });
    } catch (err) {
      res.status(500).json({ success: false, message: safeError(err) });
    }
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 8. الكشف والتدخل المبكر — Early Detection
// ═══════════════════════════════════════════════════════════════════════════════

const earlyDetection = {
  async create(req, res) {
    try {
      const record = new EarlyDetection({ ...req.body, createdBy: getUserId(req) });
      await record.save();
      res.status(201).json({ success: true, data: record, message: 'تم إنشاء سجل الكشف المبكر' });
    } catch (err) {
      res.status(400).json({ success: false, message: safeError(err) });
    }
  },

  async getAll(req, res) {
    try {
      const query = {};
      if (req.query.status) query.status = req.query.status;
      if (req.query.riskLevel) query['riskFactors.overallRiskLevel'] = req.query.riskLevel;
      if (req.query.search) {
        query.$or = [
          { 'child.name': { $regex: req.query.search, $options: 'i' } },
          { 'child.nameAr': { $regex: req.query.search, $options: 'i' } },
          { 'child.parentName': { $regex: req.query.search, $options: 'i' } },
        ];
      }
      const { skip, limit, page } = paginate(req);
      const [data, total] = await Promise.all([
        EarlyDetection.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
        EarlyDetection.countDocuments(query),
      ]);
      res.json({
        success: true,
        data,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      });
    } catch (err) {
      res.status(500).json({ success: false, message: safeError(err) });
    }
  },

  async getById(req, res) {
    try {
      const record = await EarlyDetection.findById(req.params.id).lean();
      if (!record) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
      res.json({ success: true, data: record });
    } catch (err) {
      res.status(500).json({ success: false, message: safeError(err) });
    }
  },

  async update(req, res) {
    try {
      const record = await EarlyDetection.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
      });
      if (!record) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
      res.json({ success: true, data: record, message: 'تم التحديث بنجاح' });
    } catch (err) {
      res.status(400).json({ success: false, message: safeError(err) });
    }
  },

  async delete(req, res) {
    try {
      const record = await EarlyDetection.findByIdAndDelete(req.params.id);
      if (!record) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
      res.json({ success: true, message: 'تم الحذف بنجاح' });
    } catch (err) {
      res.status(500).json({ success: false, message: safeError(err) });
    }
  },

  async addScreening(req, res) {
    try {
      const record = await EarlyDetection.findById(req.params.id).lean();
      if (!record) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
      record.developmentalScreening.push(req.body);
      await record.save();
      res.json({ success: true, data: record, message: 'تم إضافة نتيجة الفحص' });
    } catch (err) {
      res.status(400).json({ success: false, message: safeError(err) });
    }
  },

  async addMilestone(req, res) {
    try {
      const record = await EarlyDetection.findById(req.params.id).lean();
      if (!record) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
      record.milestones.push({ ...req.body, dateRecorded: new Date() });
      await record.save();
      res.json({ success: true, data: record, message: 'تم تسجيل المعلم التطوري' });
    } catch (err) {
      res.status(400).json({ success: false, message: safeError(err) });
    }
  },

  async addDiagnosis(req, res) {
    try {
      const record = await EarlyDetection.findById(req.params.id).lean();
      if (!record) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
      record.diagnosticEvaluation.diagnosis.push(req.body);
      await record.save();
      res.json({ success: true, data: record, message: 'تم إضافة التشخيص' });
    } catch (err) {
      res.status(400).json({ success: false, message: safeError(err) });
    }
  },

  async updateInterventionPlan(req, res) {
    try {
      const record = await EarlyDetection.findById(req.params.id).lean();
      if (!record) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
      record.earlyInterventionPlan = { ...record.earlyInterventionPlan?.toObject(), ...req.body };
      await record.save();
      res.json({ success: true, data: record, message: 'تم تحديث خطة التدخل المبكر' });
    } catch (err) {
      res.status(400).json({ success: false, message: safeError(err) });
    }
  },

  async getHighRisk(req, res) {
    try {
      const data = await EarlyDetection.find({
        'riskFactors.overallRiskLevel': 'high',
        status: { $nin: ['graduated', 'closed'] },
      }).sort({ createdAt: -1 });
      res.json({ success: true, data, count: data.length });
    } catch (err) {
      res.status(500).json({ success: false, message: safeError(err) });
    }
  },

  async getOverdueScreenings(req, res) {
    try {
      const data = await EarlyDetection.find({
        'developmentalScreening.nextScreeningDate': { $lt: new Date() },
        status: { $nin: ['graduated', 'closed'] },
      }).sort({ 'developmentalScreening.nextScreeningDate': 1 });
      res.json({ success: true, data, count: data.length });
    } catch (err) {
      res.status(500).json({ success: false, message: safeError(err) });
    }
  },

  async getStatistics(req, res) {
    try {
      const [total, byStatus, byRisk, byReferralSource, screeningTools] = await Promise.all([
        EarlyDetection.countDocuments(),
        EarlyDetection.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }, { $limit: 1000 }]),
        EarlyDetection.aggregate([
          { $group: { _id: '$riskFactors.overallRiskLevel', count: { $sum: 1 } } }, { $limit: 1000 }
        ]),
        EarlyDetection.aggregate([
          { $group: { _id: '$referral.source', count: { $sum: 1 } } },
          { $sort: { count: -1 } }, { $limit: 1000 }
        ]),
        EarlyDetection.aggregate([
          { $unwind: '$developmentalScreening' },
          { $group: { _id: '$developmentalScreening.tool', count: { $sum: 1 } } },
          { $sort: { count: -1 } }, { $limit: 1000 }
        ]),
      ]);
      res.json({
        success: true,
        data: { total, byStatus, byRisk, byReferralSource, screeningTools },
      });
    } catch (err) {
      res.status(500).json({ success: false, message: safeError(err) });
    }
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 9. قياس النتائج والأثر — Outcome Measurement
// ═══════════════════════════════════════════════════════════════════════════════

const outcomeMeasurement = {
  async create(req, res) {
    try {
      const record = new OutcomeMeasurement({ ...req.body, createdBy: getUserId(req) });
      await record.save();
      res.status(201).json({ success: true, data: record, message: 'تم إنشاء سجل قياس النتائج' });
    } catch (err) {
      res.status(400).json({ success: false, message: safeError(err) });
    }
  },

  async getAll(req, res) {
    try {
      const query = buildQuery(req);
      if (req.query.periodType) query['period.type'] = req.query.periodType;
      if (req.query.overallProgress) query.overallProgress = req.query.overallProgress;
      const { skip, limit, page } = paginate(req);
      const [data, total] = await Promise.all([
        OutcomeMeasurement.find(query)
          .sort({ 'period.startDate': -1 })
          .skip(skip)
          .limit(limit)
          .populate('beneficiary', 'name email'),
        OutcomeMeasurement.countDocuments(query),
      ]);
      res.json({
        success: true,
        data,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      });
    } catch (err) {
      res.status(500).json({ success: false, message: safeError(err) });
    }
  },

  async getById(req, res) {
    try {
      const record = await OutcomeMeasurement.findById(req.params.id).populate(
        'beneficiary',
        'name email'
      );
      if (!record) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
      res.json({ success: true, data: record });
    } catch (err) {
      res.status(500).json({ success: false, message: safeError(err) });
    }
  },

  async update(req, res) {
    try {
      const record = await OutcomeMeasurement.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
      });
      if (!record) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
      res.json({ success: true, data: record, message: 'تم التحديث بنجاح' });
    } catch (err) {
      res.status(400).json({ success: false, message: safeError(err) });
    }
  },

  async delete(req, res) {
    try {
      const record = await OutcomeMeasurement.findByIdAndDelete(req.params.id);
      if (!record) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
      res.json({ success: true, message: 'تم الحذف بنجاح' });
    } catch (err) {
      res.status(500).json({ success: false, message: safeError(err) });
    }
  },

  async getByBeneficiary(req, res) {
    try {
      const data = await OutcomeMeasurement.find({ beneficiary: req.params.beneficiaryId })
        .sort({ 'period.startDate': -1 })
        .populate('beneficiary', 'name email').lean();
      res.json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, message: safeError(err) });
    }
  },

  async getProgressTrend(req, res) {
    try {
      const data = await OutcomeMeasurement.find({ beneficiary: req.params.beneficiaryId })
        .select(
          'period qualityOfLife.overallQoL functionalIndependence.totalScore gasScore overallProgress'
        )
        .sort({ 'period.startDate': 1 });
      res.json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, message: safeError(err) });
    }
  },

  async getBenchmarkComparison(req, res) {
    try {
      const data = await OutcomeMeasurement.aggregate([
        {
          $group: {
            _id: null,
            avgQoL: { $avg: '$qualityOfLife.overallQoL' },
            avgFIM: { $avg: '$functionalIndependence.totalScore' },
            avgGAS: { $avg: '$gasScore' },
            avgSatisfaction: { $avg: '$satisfaction.overallSatisfaction' },
            avgROI: { $avg: '$costEffectiveness.returnOnInvestment' },
            count: { $sum: 1 },
          },
        }, { $limit: 1000 }
      ]);
      res.json({ success: true, data: data[0] || {} });
    } catch (err) {
      res.status(500).json({ success: false, message: safeError(err) });
    }
  },

  async getStatistics(req, res) {
    try {
      const [total, byProgress, avgScores, satisfactionOverview] = await Promise.all([
        OutcomeMeasurement.countDocuments(),
        OutcomeMeasurement.aggregate([{ $group: { _id: '$overallProgress', count: { $sum: 1 } } }, { $limit: 1000 }]),
        OutcomeMeasurement.aggregate([
          {
            $group: {
              _id: null,
              avgQoL: { $avg: '$qualityOfLife.overallQoL' },
              avgFIM: { $avg: '$functionalIndependence.totalScore' },
              avgGAS: { $avg: '$gasScore' },
            },
          }, { $limit: 1000 }
        ]),
        OutcomeMeasurement.aggregate([
          {
            $group: {
              _id: null,
              avgSatisfaction: { $avg: '$satisfaction.overallSatisfaction' },
              wouldRecommend: { $sum: { $cond: ['$satisfaction.wouldRecommend', 1, 0] } },
              total: { $sum: 1 },
            },
          }, { $limit: 1000 }
        ]),
      ]);
      res.json({
        success: true,
        data: {
          total,
          byProgress,
          avgScores: avgScores[0] || {},
          satisfaction: satisfactionOverview[0] || {},
        },
      });
    } catch (err) {
      res.status(500).json({ success: false, message: safeError(err) });
    }
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 10. الإسكان التكيفي — Adaptive Housing
// ═══════════════════════════════════════════════════════════════════════════════

const adaptiveHousing = {
  async create(req, res) {
    try {
      const record = new AdaptiveHousing({ ...req.body, createdBy: getUserId(req) });
      await record.save();
      res
        .status(201)
        .json({ success: true, data: record, message: 'تم إنشاء سجل الإسكان التكيفي' });
    } catch (err) {
      res.status(400).json({ success: false, message: safeError(err) });
    }
  },

  async getAll(req, res) {
    try {
      const query = buildQuery(req);
      const { skip, limit, page } = paginate(req);
      const [data, total] = await Promise.all([
        AdaptiveHousing.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate('beneficiary', 'name email'),
        AdaptiveHousing.countDocuments(query),
      ]);
      res.json({
        success: true,
        data,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      });
    } catch (err) {
      res.status(500).json({ success: false, message: safeError(err) });
    }
  },

  async getById(req, res) {
    try {
      const record = await AdaptiveHousing.findById(req.params.id).populate(
        'beneficiary',
        'name email'
      );
      if (!record) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
      res.json({ success: true, data: record });
    } catch (err) {
      res.status(500).json({ success: false, message: safeError(err) });
    }
  },

  async update(req, res) {
    try {
      const record = await AdaptiveHousing.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
      });
      if (!record) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
      res.json({ success: true, data: record, message: 'تم التحديث بنجاح' });
    } catch (err) {
      res.status(400).json({ success: false, message: safeError(err) });
    }
  },

  async delete(req, res) {
    try {
      const record = await AdaptiveHousing.findByIdAndDelete(req.params.id);
      if (!record) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
      res.json({ success: true, message: 'تم الحذف بنجاح' });
    } catch (err) {
      res.status(500).json({ success: false, message: safeError(err) });
    }
  },

  async addModification(req, res) {
    try {
      const record = await AdaptiveHousing.findById(req.params.id).lean();
      if (!record) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
      record.modifications.push(req.body);
      await record.save();
      res.json({ success: true, data: record, message: 'تم إضافة التعديل المطلوب' });
    } catch (err) {
      res.status(400).json({ success: false, message: safeError(err) });
    }
  },

  async updateModificationStatus(req, res) {
    try {
      const record = await AdaptiveHousing.findById(req.params.id).lean();
      if (!record) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
      const mod = record.modifications.id(req.params.modId);
      if (!mod) return res.status(404).json({ success: false, message: 'التعديل غير موجود' });
      Object.assign(mod, req.body);
      await record.save();
      res.json({ success: true, data: record, message: 'تم تحديث حالة التعديل' });
    } catch (err) {
      res.status(400).json({ success: false, message: safeError(err) });
    }
  },

  async updateSmartHome(req, res) {
    try {
      const record = await AdaptiveHousing.findById(req.params.id).lean();
      if (!record) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
      record.smartHome = { ...record.smartHome?.toObject(), ...req.body };
      await record.save();
      res.json({ success: true, data: record, message: 'تم تحديث بيانات المنزل الذكي' });
    } catch (err) {
      res.status(400).json({ success: false, message: safeError(err) });
    }
  },

  async addFunding(req, res) {
    try {
      const record = await AdaptiveHousing.findById(req.params.id).lean();
      if (!record) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
      record.funding.sources.push(req.body);
      // Recalculate totals
      record.funding.totalFunded = record.funding.sources
        .filter(s => s.status === 'disbursed' || s.status === 'approved')
        .reduce((sum, s) => sum + (s.amount || 0), 0);
      record.funding.gap = (record.funding.totalEstimate || 0) - record.funding.totalFunded;
      await record.save();
      res.json({ success: true, data: record, message: 'تم إضافة مصدر التمويل' });
    } catch (err) {
      res.status(400).json({ success: false, message: safeError(err) });
    }
  },

  async getPendingModifications(req, res) {
    try {
      const data = await AdaptiveHousing.find({
        'modifications.status': { $in: ['recommended', 'approved', 'funded', 'scheduled'] },
      })
        .populate('beneficiary', 'name email')
        .sort({ updatedAt: -1 });
      res.json({ success: true, data, count: data.length });
    } catch (err) {
      res.status(500).json({ success: false, message: safeError(err) });
    }
  },

  async getFundingGaps(req, res) {
    try {
      const data = await AdaptiveHousing.find({
        'funding.gap': { $gt: 0 },
        status: { $nin: ['completed', 'closed'] },
      })
        .sort({ 'funding.gap': -1 })
        .populate('beneficiary', 'name email');
      res.json({ success: true, data, count: data.length });
    } catch (err) {
      res.status(500).json({ success: false, message: safeError(err) });
    }
  },

  async getStatistics(req, res) {
    try {
      const [total, byStatus, modificationStats, fundingStats, smartHomeStats] = await Promise.all([
        AdaptiveHousing.countDocuments(),
        AdaptiveHousing.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }, { $limit: 1000 }]),
        AdaptiveHousing.aggregate([
          { $unwind: '$modifications' },
          {
            $group: {
              _id: '$modifications.category',
              count: { $sum: 1 },
              avgCost: { $avg: '$modifications.estimatedCost' },
            },
          },
          { $sort: { count: -1 } }, { $limit: 1000 }
        ]),
        AdaptiveHousing.aggregate([
          {
            $group: {
              _id: null,
              totalEstimate: { $sum: '$funding.totalEstimate' },
              totalFunded: { $sum: '$funding.totalFunded' },
              totalGap: { $sum: '$funding.gap' },
            },
          }, { $limit: 1000 }
        ]),
        AdaptiveHousing.aggregate([
          { $match: { 'smartHome.enabled': true } },
          { $count: 'smartHomeCount' }, { $limit: 1000 }
        ]),
      ]);
      res.json({
        success: true,
        data: {
          total,
          byStatus,
          modificationStats,
          funding: fundingStats[0] || { totalEstimate: 0, totalFunded: 0, totalGap: 0 },
          smartHomeCount: smartHomeStats[0]?.smartHomeCount || 0,
        },
      });
    } catch (err) {
      res.status(500).json({ success: false, message: safeError(err) });
    }
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// Dashboard — لوحة القيادة الشاملة
// ═══════════════════════════════════════════════════════════════════════════════

const dashboard = {
  async getOverview(req, res) {
    try {
      const [
        devicesCount,
        vocationalCount,
        rightsCount,
        healthcareCount,
        communityCount,
        caregiverCount,
        accessibilityCount,
        earlyDetectionCount,
        outcomeCount,
        housingCount,
      ] = await Promise.all([
        AssistiveDevice.countDocuments(),
        VocationalRehab.countDocuments(),
        DisabilityRights.countDocuments(),
        IntegrativeHealthcare.countDocuments(),
        CommunityIntegration.countDocuments(),
        CaregiverSupport.countDocuments(),
        AccessibilityAudit.countDocuments(),
        EarlyDetection.countDocuments(),
        OutcomeMeasurement.countDocuments(),
        AdaptiveHousing.countDocuments(),
      ]);

      res.json({
        success: true,
        data: {
          assistiveDevices: devicesCount,
          vocationalRehab: vocationalCount,
          disabilityRights: rightsCount,
          integrativeHealthcare: healthcareCount,
          communityIntegration: communityCount,
          caregiverSupport: caregiverCount,
          accessibilityAudit: accessibilityCount,
          earlyDetection: earlyDetectionCount,
          outcomeMeasurement: outcomeCount,
          adaptiveHousing: housingCount,
          totalRecords:
            devicesCount +
            vocationalCount +
            rightsCount +
            healthcareCount +
            communityCount +
            caregiverCount +
            accessibilityCount +
            earlyDetectionCount +
            outcomeCount +
            housingCount,
        },
      });
    } catch (err) {
      res.status(500).json({ success: false, message: safeError(err) });
    }
  },

  async getAlerts(req, res) {
    try {
      const now = new Date();
      const thirtyDaysAhead = new Date();
      thirtyDaysAhead.setDate(now.getDate() + 30);

      const [
        warrantyExpiring,
        maintenanceDue,
        highRiskChildren,
        highBurdenCaregivers,
        pendingModifications,
        openRightsCases,
      ] = await Promise.all([
        AssistiveDevice.countDocuments({
          'warranty.endDate': { $lte: thirtyDaysAhead, $gte: now },
          status: 'active',
        }),
        AssistiveDevice.countDocuments({
          'maintenance.nextServiceDate': { $lte: thirtyDaysAhead },
          status: 'active',
        }),
        EarlyDetection.countDocuments({
          'riskFactors.overallRiskLevel': 'high',
          status: { $nin: ['graduated', 'closed'] },
        }),
        CaregiverSupport.countDocuments({
          'caregiverAssessment.burdenScale.level': { $in: ['moderate', 'severe'] },
        }),
        AdaptiveHousing.countDocuments({
          'modifications.status': { $in: ['recommended', 'approved'] },
        }),
        DisabilityRights.countDocuments({
          status: { $in: ['submitted', 'under_review', 'investigation'] },
        }),
      ]);

      res.json({
        success: true,
        data: {
          warrantyExpiring,
          maintenanceDue,
          highRiskChildren,
          highBurdenCaregivers,
          pendingModifications,
          openRightsCases,
          totalAlerts:
            warrantyExpiring +
            maintenanceDue +
            highRiskChildren +
            highBurdenCaregivers +
            pendingModifications +
            openRightsCases,
        },
      });
    } catch (err) {
      res.status(500).json({ success: false, message: safeError(err) });
    }
  },
};

module.exports = {
  assistiveDevices,
  vocationalRehab,
  disabilityRights,
  integrativeHealthcare,
  communityIntegration,
  caregiverSupport,
  accessibilityAudit,
  earlyDetection,
  outcomeMeasurement,
  adaptiveHousing,
  dashboard,
};
