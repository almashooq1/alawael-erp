/**
 * Maintenance Task Routes — مسارات مهام الصيانة
 * Task management, progress tracking, quality assurance
 */

const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const MaintenanceTask = require('../models/MaintenanceTask');
const logger = require('../utils/logger');
const { safeError } = require('../utils/safeError');
const { stripUpdateMeta } = require('../utils/sanitize');

/** GET /api/maintenance-tasks — list tasks */
router.get('/', requireAuth, async (req, res) => {
  try {
    const {
      vehicle,
      schedule,
      status,
      category,
      priority,
      assignedTechnician,
      page = 1,
      limit = 25,
    } = req.query;
    const filter = {};
    if (vehicle) filter.vehicle = vehicle;
    if (schedule) filter.schedule = schedule;
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (priority) filter.priority = priority;
    if (assignedTechnician) filter.assignedTechnician = assignedTechnician;

    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
      MaintenanceTask.find(filter)
        .populate('vehicle', 'plateNumber make model')
        .populate('schedule', 'title')
        .populate('assignedTechnician', 'name')
        .sort({ scheduledDate: -1 })
        .skip(skip)
        .limit(Number(limit)),
      MaintenanceTask.countDocuments(filter),
    ]);
    res.json({ success: true, data, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    logger.error('maintenanceTask list error:', err);
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

/** GET /api/maintenance-tasks/stats — task statistics */
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const stats = await MaintenanceTask.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          scheduled: { $sum: { $cond: [{ $eq: ['$status', 'مجدولة'] }, 1, 0] } },
          inProgress: { $sum: { $cond: [{ $eq: ['$status', 'جارية'] }, 1, 0] } },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'مكتملة'] }, 1, 0] } },
          overdue: {
            $sum: {
              $cond: [
                { $and: [{ $lt: ['$scheduledDate', new Date()] }, { $ne: ['$status', 'مكتملة'] }] },
                1,
                0,
              ],
            },
          },
          totalEstimatedCost: { $sum: '$estimatedCost' },
          totalActualCost: { $sum: '$actualCost' },
          avgQualityScore: { $avg: '$qualityScore' },
        },
      },
    ]);
    const byCategory = await MaintenanceTask.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    res.json({ success: true, data: { summary: stats[0] || {}, byCategory } });
  } catch (err) {
    logger.error('maintenanceTask stats error:', err);
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

/** GET /api/maintenance-tasks/overdue — overdue tasks */
router.get('/overdue', requireAuth, async (req, res) => {
  try {
    const data = await MaintenanceTask.find({
      scheduledDate: { $lt: new Date() },
      status: { $nin: ['مكتملة', 'ملغاة'] },
    })
      .populate('vehicle', 'plateNumber make model')
      .populate('assignedTechnician', 'name')
      .sort({ scheduledDate: 1 });
    res.json({ success: true, data, count: data.length });
  } catch (err) {
    logger.error('maintenanceTask overdue error:', err);
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

/** GET /api/maintenance-tasks/:id — get single task */
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const task = await MaintenanceTask.findById(req.params.id)
      .populate('vehicle')
      .populate('schedule')
      .populate('assignedTechnician', 'name email');
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    res.json({ success: true, data: task });
  } catch (err) {
    logger.error('maintenanceTask get error:', err);
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

/** POST /api/maintenance-tasks — create task */
router.post(
  '/',
  requireAuth,
  requireRole(['admin', 'supervisor', 'fleet_manager']),
  async (req, res) => {
    try {
      const task = await MaintenanceTask.create(stripUpdateMeta(req.body));
      res.status(201).json({ success: true, data: task });
    } catch (err) {
      logger.error('maintenanceTask create error:', err);
      res.status(400).json({ success: false, message: safeError(err) });
    }
  }
);

/** PUT /api/maintenance-tasks/:id — update task */
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const task = await MaintenanceTask.findByIdAndUpdate(req.params.id, stripUpdateMeta(req.body), {
      new: true,
      runValidators: true,
    });
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    res.json({ success: true, data: task });
  } catch (err) {
    logger.error('maintenanceTask update error:', err);
    res.status(400).json({ success: false, message: safeError(err) });
  }
});

/** DELETE /api/maintenance-tasks/:id — delete task (admin) */
router.delete('/:id', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const task = await MaintenanceTask.findByIdAndDelete(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    res.json({ success: true, message: 'Task deleted' });
  } catch (err) {
    logger.error('maintenanceTask delete error:', err);
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

/** PATCH /api/maintenance-tasks/:id/status — update task status */
router.patch('/:id/status', requireAuth, async (req, res) => {
  try {
    const { status, progress } = req.body;
    const update = { status };
    if (progress !== undefined) update.progress = progress;
    if (status === 'جارية') update.startedDate = new Date();
    if (status === 'مكتملة') {
      update.completedDate = new Date();
      update.progress = 100;
    }

    const task = await MaintenanceTask.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    });
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    task.activityLog.push({
      action: `Status → ${status}`,
      timestamp: new Date(),
      performedBy: req.user?.name || 'System',
    });
    await task.save();

    res.json({ success: true, data: task });
  } catch (err) {
    logger.error('maintenanceTask status error:', err);
    res.status(400).json({ success: false, message: safeError(err) });
  }
});

/** POST /api/maintenance-tasks/:id/quality-check — submit quality checklist */
router.post('/:id/quality-check', requireAuth, async (req, res) => {
  try {
    const { qualityChecklist, qualityScore } = req.body;
    const task = await MaintenanceTask.findByIdAndUpdate(
      req.params.id,
      { qualityChecklist, qualityScore },
      { new: true, runValidators: true }
    );
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    res.json({ success: true, data: task });
  } catch (err) {
    logger.error('maintenanceTask qualityCheck error:', err);
    res.status(400).json({ success: false, message: safeError(err) });
  }
});

module.exports = router;
