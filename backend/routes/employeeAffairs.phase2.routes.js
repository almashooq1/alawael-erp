/**
 * Employee Affairs Phase 2 Routes — مسارات شؤون الموظفين المرحلة الثانية
 *
 * 80+ endpoints: Tasks, Housing, Custody, Work Permits, Rewards, Shifts
 */
const express = require('express');
const router = express.Router();
const service = require('../services/employeeAffairs.phase2.service');
const { authenticateToken, authorize } = require('../middleware/auth');

const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// All routes require authentication
router.use(authenticateToken);

// ══════════════════════════════════════════════════════════════════════════════
// لوحة المعلومات — Dashboard
// ══════════════════════════════════════════════════════════════════════════════
router.get(
  '/phase2-dashboard',
  asyncHandler(async (req, res) => {
    const data = await service.getPhase2Dashboard();
    res.json({ success: true, data });
  })
);

// ══════════════════════════════════════════════════════════════════════════════
// المهام والتكليفات — Tasks
// ══════════════════════════════════════════════════════════════════════════════
router.get(
  '/tasks',
  asyncHandler(async (req, res) => {
    const data = await service.listTasks(req.query);
    res.json({ success: true, data });
  })
);

router.get(
  '/tasks/stats',
  asyncHandler(async (req, res) => {
    const data = await service.getTaskStats(req.query);
    res.json({ success: true, data });
  })
);

router.post(
  '/tasks',
  authorize('admin', 'hr', 'manager'),
  asyncHandler(async (req, res) => {
    const task = await service.createTask(req.body);
    res.status(201).json({ success: true, data: task });
  })
);

router.get(
  '/tasks/:id',
  asyncHandler(async (req, res) => {
    const task = await service.getTaskById(req.params.id);
    res.json({ success: true, data: task });
  })
);

router.patch(
  '/tasks/:id/status',
  asyncHandler(async (req, res) => {
    const task = await service.updateTaskStatus(req.params.id, {
      ...req.body,
      userId: req.user?.id,
    });
    res.json({ success: true, data: task });
  })
);

router.post(
  '/tasks/:id/comments',
  asyncHandler(async (req, res) => {
    const task = await service.addTaskComment(req.params.id, { ...req.body, userId: req.user?.id });
    res.json({ success: true, data: task });
  })
);

router.patch(
  '/tasks/:id/delegate',
  authorize('admin', 'hr', 'manager'),
  asyncHandler(async (req, res) => {
    const task = await service.delegateTask(req.params.id, { ...req.body, userId: req.user?.id });
    res.json({ success: true, data: task });
  })
);

router.patch(
  '/tasks/:id/rate',
  authorize('admin', 'hr', 'manager'),
  asyncHandler(async (req, res) => {
    const task = await service.rateTask(req.params.id, { ...req.body, ratedBy: req.user?.id });
    res.json({ success: true, data: task });
  })
);

// ══════════════════════════════════════════════════════════════════════════════
// السكن — Housing
// ══════════════════════════════════════════════════════════════════════════════
router.get(
  '/housing/units',
  asyncHandler(async (req, res) => {
    const data = await service.listHousingUnits(req.query);
    res.json({ success: true, data });
  })
);

router.post(
  '/housing/units',
  authorize('admin', 'hr'),
  asyncHandler(async (req, res) => {
    const unit = await service.createHousingUnit(req.body);
    res.status(201).json({ success: true, data: unit });
  })
);

router.get(
  '/housing/assignments',
  asyncHandler(async (req, res) => {
    const data = await service.listHousingAssignments(req.query);
    res.json({ success: true, data });
  })
);

router.post(
  '/housing/assignments',
  authorize('admin', 'hr'),
  asyncHandler(async (req, res) => {
    const assignment = await service.assignHousing(req.body);
    res.status(201).json({ success: true, data: assignment });
  })
);

router.get(
  '/housing/stats',
  asyncHandler(async (req, res) => {
    const data = await service.getHousingStats();
    res.json({ success: true, data });
  })
);

// ══════════════════════════════════════════════════════════════════════════════
// المواصلات — Transportation
// ══════════════════════════════════════════════════════════════════════════════
router.get(
  '/transportation/routes',
  asyncHandler(async (req, res) => {
    const data = await service.listTransportationRoutes(req.query);
    res.json({ success: true, data });
  })
);

router.post(
  '/transportation/routes',
  authorize('admin', 'hr'),
  asyncHandler(async (req, res) => {
    const route = await service.createTransportationRoute(req.body);
    res.status(201).json({ success: true, data: route });
  })
);

router.patch(
  '/transportation/routes/:routeId/assign/:employeeId',
  authorize('admin', 'hr'),
  asyncHandler(async (req, res) => {
    const route = await service.assignEmployeeToRoute(req.params.routeId, req.params.employeeId);
    res.json({ success: true, data: route });
  })
);

// ══════════════════════════════════════════════════════════════════════════════
// العهد والممتلكات — Custody
// ══════════════════════════════════════════════════════════════════════════════
router.get(
  '/custody',
  asyncHandler(async (req, res) => {
    const data = await service.listCustodies(req.query);
    res.json({ success: true, data });
  })
);

router.get(
  '/custody/stats',
  asyncHandler(async (req, res) => {
    const data = await service.getCustodyStats();
    res.json({ success: true, data });
  })
);

router.post(
  '/custody',
  authorize('admin', 'hr', 'manager'),
  asyncHandler(async (req, res) => {
    const custody = await service.createCustody({ ...req.body, assignedBy: req.user?.id });
    res.status(201).json({ success: true, data: custody });
  })
);

router.get(
  '/custody/:id',
  asyncHandler(async (req, res) => {
    const custody = await service.getCustodyById(req.params.id);
    res.json({ success: true, data: custody });
  })
);

router.patch(
  '/custody/:id/return',
  authorize('admin', 'hr', 'manager'),
  asyncHandler(async (req, res) => {
    const custody = await service.returnCustody(req.params.id, {
      ...req.body,
      returnedBy: req.user?.id,
    });
    res.json({ success: true, data: custody });
  })
);

router.patch(
  '/custody/:id/issue',
  asyncHandler(async (req, res) => {
    const custody = await service.reportCustodyIssue(req.params.id, {
      ...req.body,
      performedBy: req.user?.id,
    });
    res.json({ success: true, data: custody });
  })
);

router.get(
  '/custody/employee/:employeeId',
  asyncHandler(async (req, res) => {
    const data = await service.getEmployeeCustodies(req.params.employeeId);
    res.json({ success: true, data });
  })
);

// ══════════════════════════════════════════════════════════════════════════════
// تصاريح العمل والإقامات — Work Permits
// ══════════════════════════════════════════════════════════════════════════════
router.get(
  '/permits',
  asyncHandler(async (req, res) => {
    const data = await service.listWorkPermits(req.query);
    res.json({ success: true, data });
  })
);

router.get(
  '/permits/stats',
  asyncHandler(async (req, res) => {
    const data = await service.getWorkPermitStats();
    res.json({ success: true, data });
  })
);

router.get(
  '/permits/expiring',
  asyncHandler(async (req, res) => {
    const data = await service.getExpiringPermits(parseInt(req.query.days) || 30);
    res.json({ success: true, data });
  })
);

router.post(
  '/permits',
  authorize('admin', 'hr'),
  asyncHandler(async (req, res) => {
    const permit = await service.createWorkPermit(req.body);
    res.status(201).json({ success: true, data: permit });
  })
);

router.get(
  '/permits/:id',
  asyncHandler(async (req, res) => {
    const permit = await service.getWorkPermitById(req.params.id);
    res.json({ success: true, data: permit });
  })
);

router.patch(
  '/permits/:id/renew',
  authorize('admin', 'hr'),
  asyncHandler(async (req, res) => {
    const permit = await service.renewWorkPermit(req.params.id, {
      ...req.body,
      processedBy: req.user?.id,
    });
    res.json({ success: true, data: permit });
  })
);

// ══════════════════════════════════════════════════════════════════════════════
// المكافآت والحوافز — Rewards
// ══════════════════════════════════════════════════════════════════════════════
router.get(
  '/rewards',
  asyncHandler(async (req, res) => {
    const data = await service.listRewards(req.query);
    res.json({ success: true, data });
  })
);

router.get(
  '/rewards/stats',
  asyncHandler(async (req, res) => {
    const data = await service.getRewardStats();
    res.json({ success: true, data });
  })
);

router.post(
  '/rewards',
  authorize('admin', 'hr', 'manager'),
  asyncHandler(async (req, res) => {
    const reward = await service.createReward({ ...req.body, nominatedBy: req.user?.id });
    res.status(201).json({ success: true, data: reward });
  })
);

router.get(
  '/rewards/:id',
  asyncHandler(async (req, res) => {
    const reward = await service.getRewardById(req.params.id);
    res.json({ success: true, data: reward });
  })
);

router.patch(
  '/rewards/:id/approve',
  authorize('admin', 'hr'),
  asyncHandler(async (req, res) => {
    const reward = await service.approveReward(req.params.id, {
      ...req.body,
      approvedBy: req.user?.id,
    });
    res.json({ success: true, data: reward });
  })
);

router.patch(
  '/rewards/:id/disburse',
  authorize('admin', 'hr', 'finance'),
  asyncHandler(async (req, res) => {
    const reward = await service.disburseReward(req.params.id, {
      ...req.body,
      disbursedBy: req.user?.id,
    });
    res.json({ success: true, data: reward });
  })
);

router.get(
  '/rewards/employee/:employeeId/points',
  asyncHandler(async (req, res) => {
    const data = await service.getEmployeeRewardPoints(req.params.employeeId);
    res.json({ success: true, data });
  })
);

// ══════════════════════════════════════════════════════════════════════════════
// نظام الورديات — Shifts
// ══════════════════════════════════════════════════════════════════════════════
router.get(
  '/shifts/definitions',
  asyncHandler(async (req, res) => {
    const data = await service.listShiftDefinitions();
    res.json({ success: true, data });
  })
);

router.post(
  '/shifts/definitions',
  authorize('admin', 'hr'),
  asyncHandler(async (req, res) => {
    const shift = await service.createShiftDefinition(req.body);
    res.status(201).json({ success: true, data: shift });
  })
);

router.post(
  '/shifts/assignments',
  authorize('admin', 'hr', 'manager'),
  asyncHandler(async (req, res) => {
    const assignment = await service.createShiftAssignment(req.body);
    res.status(201).json({ success: true, data: assignment });
  })
);

router.post(
  '/shifts/assignments/bulk',
  authorize('admin', 'hr'),
  asyncHandler(async (req, res) => {
    const data = await service.bulkCreateShiftAssignments(req.body.assignments);
    res.status(201).json({ success: true, data });
  })
);

router.get(
  '/shifts/schedule/employee/:employeeId',
  asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;
    const data = await service.getEmployeeSchedule(req.params.employeeId, startDate, endDate);
    res.json({ success: true, data });
  })
);

router.get(
  '/shifts/schedule/department/:department',
  asyncHandler(async (req, res) => {
    const data = await service.getDepartmentSchedule(req.params.department, req.query.date);
    res.json({ success: true, data });
  })
);

router.patch(
  '/shifts/assignments/:id/attendance',
  asyncHandler(async (req, res) => {
    const data = await service.recordShiftAttendance(req.params.id, req.body);
    res.json({ success: true, data });
  })
);

router.get(
  '/shifts/stats',
  asyncHandler(async (req, res) => {
    const data = await service.getShiftStats(req.query.department);
    res.json({ success: true, data });
  })
);

router.post(
  '/shifts/swap',
  asyncHandler(async (req, res) => {
    const swap = await service.createShiftSwapRequest({ ...req.body, requesterId: req.user?.id });
    res.status(201).json({ success: true, data: swap });
  })
);

router.patch(
  '/shifts/swap/:id/approve',
  asyncHandler(async (req, res) => {
    const swap = await service.approveShiftSwap(req.params.id, {
      ...req.body,
      approvedBy: req.user?.id,
    });
    res.json({ success: true, data: swap });
  })
);

module.exports = router;
