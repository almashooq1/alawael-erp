const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance.memory');
const Employee = require('../models/Employee.memory');
const { protect, authorize } = require('../middleware/auth');
const { validateAttendance } = require('../middleware/validator.middleware');
const logger = require('../utils/logger');

// Middleware للحماية
router.use(protect);

// ==================== ATTENDANCE ====================

// تسجيل الحضور
router.post('/attendance', validateAttendance, async (req, res) => {
  try {
    const employee = await Employee.findById(req.body.employeeId);
    if (!employee) {
      return res.error('Employee not found', 404);
    }

    const attendance = await Attendance.create(req.body);
    logger.info(`Attendance recorded for ${req.body.employeeId}`);

    return res.success(attendance, 'Attendance recorded successfully', 201);
  } catch (error) {
    logger.error('Error recording attendance:', error);
    return res.error('Failed to record attendance', 500);
  }
});

// جلب حضور الموظف
router.get('/attendance/:employeeId', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.error('startDate and endDate are required', 400);
    }

    const attendance = await Attendance.findByEmployeeRange(req.params.employeeId, startDate, endDate);

    const stats = await Attendance.getStatsByEmployee(req.params.employeeId, new Date(startDate).getMonth());

    return res.success({ attendance, stats }, 'Attendance retrieved successfully');
  } catch (error) {
    logger.error('Error retrieving attendance:', error);
    return res.error('Failed to retrieve attendance', 500);
  }
});

// ==================== LEAVES ====================

const Leave = require('../models/Leave.memory');
const { validateLeave } = require('../middleware/validator.middleware');

// طلب إجازة جديدة
router.post('/leaves', validateLeave, async (req, res) => {
  try {
    const employee = await Employee.findById(req.body.employeeId);
    if (!employee) {
      return res.error('Employee not found', 404);
    }

    const leave = await Leave.create(req.body);
    logger.info(`Leave request created: ${leave._id}`);

    return res.success(leave, 'Leave request created successfully', 201);
  } catch (error) {
    logger.error('Error creating leave request:', error);
    return res.error('Failed to create leave request', 500);
  }
});

// جلب طلبات الإجازة
router.get('/leaves', async (req, res) => {
  try {
    const { status, employeeId } = req.query;
    const filters = {};

    if (status) filters.status = status;
    if (employeeId) filters.employeeId = employeeId;

    const leaves = await Leave.findAll(filters);

    return res.success(leaves, 'Leave requests retrieved successfully');
  } catch (error) {
    logger.error('Error retrieving leaves:', error);
    return res.error('Failed to retrieve leaves', 500);
  }
});

// جلب إجازات الموظف
router.get('/leaves/:employeeId', async (req, res) => {
  try {
    const leaves = await Leave.findByEmployeeId(req.params.employeeId);
    return res.success(leaves, 'Employee leaves retrieved successfully');
  } catch (error) {
    logger.error('Error retrieving leaves:', error);
    return res.error('Failed to retrieve leaves', 500);
  }
});

// الموافقة على الإجازة أو رفضها
router.patch('/leaves/:id/status', async (req, res) => {
  try {
    const { status } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.error('Invalid status', 400);
    }

    const leave = await Leave.updateStatus(req.params.id, status);

    if (!leave) {
      return res.error('Leave request not found', 404);
    }

    logger.info(`Leave ${req.params.id} ${status}`);

    return res.success(leave, `Leave ${status} successfully`);
  } catch (error) {
    logger.error('Error updating leave status:', error);
    return res.error('Failed to update leave status', 500);
  }
});

// حذف طلب الإجازة
router.delete('/leaves/:id', async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.id);

    if (!leave) {
      return res.error('Leave request not found', 404);
    }

    if (leave.status === 'approved') {
      return res.error('Cannot delete approved leave requests', 400);
    }

    await Leave.deleteById(req.params.id);
    logger.info(`Leave deleted: ${req.params.id}`);

    return res.success(null, 'Leave request deleted successfully');
  } catch (error) {
    logger.error('Error deleting leave:', error);
    return res.error('Failed to delete leave', 500);
  }
});

module.exports = router;

