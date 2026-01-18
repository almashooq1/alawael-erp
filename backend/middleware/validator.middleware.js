const logger = require('../utils/logger');

// التحقق من بيانات الموظف
const validateEmployee = (req, res, next) => {
  try {
    const { fullName, email, nationalId, department, position, salary, phone } = req.body;

    // الحقول المطلوبة
    if (!fullName || !email || !department || !position) {
      return res.error('Missing required fields: fullName, email, department, position', 400);
    }

    // التحقق من صيغة البريد
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.error('Invalid email format', 400);
    }

    // التحقق من الراتب
    if (salary && (isNaN(salary) || salary < 0)) {
      return res.error('Salary must be a positive number', 400);
    }

    // التحقق من الهاتف
    if (phone && /^[\d\s\-+()]+$/.test(phone)) {
      return res.error('Invalid phone format', 400);
    }

    next();
  } catch (error) {
    logger.error('Validation error:', error);
    res.error('Validation failed', 400);
  }
};

// التحقق من بيانات الحضور
const validateAttendance = (req, res, next) => {
  try {
    const { employeeId, date, checkIn, checkOut, status } = req.body;

    if (!employeeId || !date || !status) {
      return res.error('Missing required fields: employeeId, date, status', 400);
    }

    if (!['present', 'absent', 'late', 'half_day'].includes(status)) {
      return res.error('Invalid attendance status', 400);
    }

    // التحقق من التواريخ
    if (checkIn && isNaN(new Date(checkIn).getTime())) {
      return res.error('Invalid checkIn date', 400);
    }

    if (checkOut && isNaN(new Date(checkOut).getTime())) {
      return res.error('Invalid checkOut date', 400);
    }

    next();
  } catch (error) {
    logger.error('Validation error:', error);
    res.error('Validation failed', 400);
  }
};

// التحقق من بيانات الإجازة
const validateLeave = (req, res, next) => {
  try {
    const { employeeId, startDate, endDate, leaveType, reason } = req.body;

    if (!employeeId || !startDate || !endDate || !leaveType) {
      return res.error('Missing required fields', 400);
    }

    const validLeaveTypes = ['sick', 'vacation', 'emergency', 'unpaid', 'maternity'];
    if (!validLeaveTypes.includes(leaveType)) {
      return res.error(`Invalid leave type. Must be one of: ${validLeaveTypes.join(', ')}`, 400);
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.error('Invalid date format', 400);
    }

    if (end <= start) {
      return res.error('End date must be after start date', 400);
    }

    next();
  } catch (error) {
    logger.error('Validation error:', error);
    res.error('Validation failed', 400);
  }
};

module.exports = {
  validateEmployee,
  validateAttendance,
  validateLeave,
};
