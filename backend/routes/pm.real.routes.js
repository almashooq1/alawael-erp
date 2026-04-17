const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const logger = require('../utils/logger');
const safeError = require('../utils/safeError');

router.use(authenticate);
router.use(requireBranchAccess);
const getProject = () => require('../models/project.model');
const getTask = () => require('../models/task.model');

// GET /projects
router.get('/projects', async (req, res) => {
  try {
    const Project = getProject();
    const { page = 1, limit = 20, status } = req.query;
    const filter = {};
    if (status) filter.status = status;
    const skip = (Math.max(1, +page) - 1) * +limit;
    const [data, total] = await Promise.all([
      Project.find(filter).sort({ createdAt: -1 }).skip(skip).limit(+limit).lean(),
      Project.countDocuments(filter),
    ]);
    res.json({ success: true, data, pagination: { page: +page, limit: +limit, total } });
  } catch (err) {
    safeError(res, err, 'PM projects error');
  }
});

// GET /projects/:id
router.get('/projects/:id', async (req, res) => {
  try {
    const Project = getProject();
    const project = await Project.findById(req.params.id).lean();
    if (!project) return res.status(404).json({ success: false, message: 'المشروع غير موجود' });
    res.json({ success: true, data: project });
  } catch (err) {
    safeError(res, err, 'PM project detail error');
  }
});

// GET /projects/:pid/tasks
router.get('/projects/:pid/tasks', async (req, res) => {
  try {
    const Task = getTask();
    const data = await Task.find({ projectId: req.params.pid }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data });
  } catch (err) {
    safeError(res, err, 'PM project tasks error');
  }
});

// POST /projects
router.post('/projects', authorize(['admin', 'manager']), async (req, res) => {
  try {
    const Project = getProject();
    const project = await Project.create({ ...req.body, createdBy: req.user?.id });
    res.status(201).json({ success: true, data: project, message: 'تم إنشاء المشروع' });
  } catch (err) {
    safeError(res, err, 'PM project create error');
  }
});

// POST /tasks
router.post('/tasks', async (req, res) => {
  try {
    const Task = getTask();
    const task = await Task.create({ ...req.body, assignedBy: req.user?.id });
    res.status(201).json({ success: true, data: task, message: 'تم إنشاء المهمة' });
  } catch (err) {
    safeError(res, err, 'PM task create error');
  }
});

// PUT /projects/:id
router.put('/projects/:id', authorize(['admin', 'manager']), async (req, res) => {
  try {
    const Project = getProject();
    const {
      name,
      description,
      department,
      status,
      priority,
      startDate,
      endDate,
      budget,
      team,
      milestones,
    } = req.body;
    const project = await Project.findByIdAndUpdate(
      req.params.id,
      {
        name,
        description,
        department,
        status,
        priority,
        startDate,
        endDate,
        budget,
        team,
        milestones,
      },
      { new: true, runValidators: true }
    ).lean();
    if (!project) return res.status(404).json({ success: false, message: 'المشروع غير موجود' });
    res.json({ success: true, data: project, message: 'تم تحديث المشروع' });
  } catch (err) {
    safeError(res, err, 'PM project update error');
  }
});

// PATCH /tasks/:id
router.patch('/tasks/:id', async (req, res) => {
  try {
    const Task = getTask();
    const { title, description, project, assignedTo, status, priority, dueDate, progress } =
      req.body;
    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { title, description, project, assignedTo, status, priority, dueDate, progress },
      { new: true }
    ).lean();
    if (!task) return res.status(404).json({ success: false, message: 'المهمة غير موجودة' });
    res.json({ success: true, data: task, message: 'تم تحديث المهمة' });
  } catch (err) {
    safeError(res, err, 'PM task update error');
  }
});

// DELETE /tasks/:id
router.delete('/tasks/:id', async (req, res) => {
  try {
    const Task = getTask();
    await Task.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'تم حذف المهمة' });
  } catch (err) {
    safeError(res, err, 'PM task delete error');
  }
});

module.exports = router;
