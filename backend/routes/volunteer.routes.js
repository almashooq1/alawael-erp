/**
 * Volunteer Management Routes — مسارات إدارة المتطوعين
 *
 * Endpoints:
 *   /api/volunteers            — Volunteer profile CRUD
 *   /api/volunteers/programs   — Program management
 *   /api/volunteers/shifts     — Shift scheduling & attendance
 *   /api/volunteers/dashboard  — Volunteer dashboard
 */

const express = require('express');
const router = express.Router();
const { Volunteer, VolunteerProgram, VolunteerShift } = require('../models/volunteer.model');
const logger = require('../utils/logger');

// ═══════════════════════════════════════════════════════════════════════════
// VOLUNTEERS — المتطوعين
// ═══════════════════════════════════════════════════════════════════════════

router.get('/', async (req, res) => {
  try {
    const { status, center, skill, search, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (center) filter.center = center;
    if (skill) filter.skills = skill;
    if (search) {
      filter.$or = [
        { 'name.ar': { $regex: search, $options: 'i' } },
        { 'name.en': { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const [volunteers, total] = await Promise.all([
      Volunteer.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit, 10)).lean(),
      Volunteer.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: volunteers,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('[Volunteers] List error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const vol = await Volunteer.findById(req.params.id).populate('programs', 'name status').lean();
    if (!vol) return res.status(404).json({ success: false, error: 'المتطوع غير موجود' });
    res.json({ success: true, data: vol });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const vol = await Volunteer.create(req.body);
    res.status(201).json({ success: true, data: vol });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const vol = await Volunteer.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!vol) return res.status(404).json({ success: false, error: 'المتطوع غير موجود' });
    res.json({ success: true, data: vol });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.patch('/:id/approve', async (req, res) => {
  try {
    const vol = await Volunteer.findByIdAndUpdate(
      req.params.id,
      { status: 'approved', approvedBy: req.user?._id, approvedAt: new Date() },
      { new: true }
    );
    if (!vol) return res.status(404).json({ success: false, error: 'المتطوع غير موجود' });
    res.json({ success: true, data: vol, message: 'تمت الموافقة على المتطوع' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:id/hours', async (req, res) => {
  try {
    const shifts = await VolunteerShift.find({ volunteer: req.params.id, status: 'completed' })
      .populate('program', 'name')
      .sort({ date: -1 })
      .lean();
    const totalHours = shifts.reduce((sum, s) => sum + (s.hoursWorked || 0), 0);
    res.json({ success: true, data: { totalHours, shifts } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// PROGRAMS — البرامج التطوعية
// ═══════════════════════════════════════════════════════════════════════════

router.get('/programs/list', async (req, res) => {
  try {
    const { status, center, category, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (center) filter.center = center;
    if (category) filter.category = category;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const [programs, total] = await Promise.all([
      VolunteerProgram.find(filter)
        .populate('coordinator', 'name email')
        .sort({ startDate: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10))
        .lean(),
      VolunteerProgram.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: programs,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/programs', async (req, res) => {
  try {
    const program = await VolunteerProgram.create({ ...req.body, createdBy: req.user?._id });
    res.status(201).json({ success: true, data: program });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.put('/programs/:id', async (req, res) => {
  try {
    const program = await VolunteerProgram.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!program) return res.status(404).json({ success: false, error: 'البرنامج غير موجود' });
    res.json({ success: true, data: program });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.post('/programs/:id/enroll', async (req, res) => {
  try {
    const { volunteerId } = req.body;
    const program = await VolunteerProgram.findById(req.params.id);
    if (!program) return res.status(404).json({ success: false, error: 'البرنامج غير موجود' });

    if (program.maxVolunteers && program.currentVolunteers >= program.maxVolunteers) {
      return res.status(400).json({ success: false, error: 'البرنامج ممتلئ' });
    }

    const alreadyEnrolled = program.enrolledVolunteers.some(
      e => e.volunteer.toString() === volunteerId
    );
    if (alreadyEnrolled) {
      return res.status(400).json({ success: false, error: 'المتطوع مسجل بالفعل' });
    }

    program.enrolledVolunteers.push({ volunteer: volunteerId });
    program.currentVolunteers = program.enrolledVolunteers.length;
    if (program.currentVolunteers >= program.maxVolunteers) program.status = 'full';
    await program.save();

    await Volunteer.findByIdAndUpdate(volunteerId, { $addToSet: { programs: program._id } });

    res.json({ success: true, data: program, message: 'تم تسجيل المتطوع في البرنامج' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// SHIFTS — جداول الورديات والحضور
// ═══════════════════════════════════════════════════════════════════════════

router.get('/shifts/list', async (req, res) => {
  try {
    const { volunteer, program, status, startDate, endDate, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (volunteer) filter.volunteer = volunteer;
    if (program) filter.program = program;
    if (status) filter.status = status;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const [shifts, total] = await Promise.all([
      VolunteerShift.find(filter)
        .populate('volunteer', 'name phone')
        .populate('program', 'name')
        .sort({ date: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10))
        .lean(),
      VolunteerShift.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: shifts,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/shifts', async (req, res) => {
  try {
    const shift = await VolunteerShift.create(req.body);
    res.status(201).json({ success: true, data: shift });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.patch('/shifts/:id/check-in', async (req, res) => {
  try {
    const shift = await VolunteerShift.findByIdAndUpdate(
      req.params.id,
      { status: 'checked-in', checkIn: new Date() },
      { new: true }
    );
    if (!shift) return res.status(404).json({ success: false, error: 'الوردية غير موجودة' });
    res.json({ success: true, data: shift });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.patch('/shifts/:id/check-out', async (req, res) => {
  try {
    const shift = await VolunteerShift.findById(req.params.id);
    if (!shift) return res.status(404).json({ success: false, error: 'الوردية غير موجودة' });

    shift.checkOut = new Date();
    shift.status = 'completed';
    if (shift.checkIn) {
      shift.hoursWorked = Math.round(((shift.checkOut - shift.checkIn) / 3600000) * 100) / 100;
    }
    await shift.save();

    // Update volunteer total hours
    await Volunteer.findByIdAndUpdate(shift.volunteer, { $inc: { totalHours: shift.hoursWorked } });

    res.json({ success: true, data: shift });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD — لوحة تحكم المتطوعين
// ═══════════════════════════════════════════════════════════════════════════

router.get('/dashboard/stats', async (req, res) => {
  try {
    const [total, active, pendingApproval, programs, totalHoursAgg] = await Promise.all([
      Volunteer.countDocuments(),
      Volunteer.countDocuments({ status: 'active' }),
      Volunteer.countDocuments({ status: 'pending' }),
      VolunteerProgram.countDocuments({ status: { $in: ['open', 'in-progress'] } }),
      VolunteerShift.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, totalHours: { $sum: '$hoursWorked' } } },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        volunteers: { total, active, pendingApproval },
        activePrograms: programs,
        totalVolunteerHours: totalHoursAgg[0]?.totalHours || 0,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
