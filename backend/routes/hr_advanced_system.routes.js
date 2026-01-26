/**
 * ====================================================================
 * مسارات نظام الموارد البشرية المتقدم - Advanced HR Routes
 * ====================================================================
 * 
 * يوفر API كامل لنظام إدارة الموارد البشرية
 * @version 1.0.0
 * @date 2026-01-22
 */

const express = require('express');
const router = express.Router();
const AdvancedHRSystem = require('../lib/advanced_hr_system');

// إنشاء نظام الموارد البشرية
const hrSystem = new AdvancedHRSystem();

// دوال مساعدة للاستجابات الموحدة
const sendSuccess = (res, data, message = 'Success') => {
  res.status(200).json({
    success: true,
    message,
    data,
    timestamp: new Date(),
  });
};

const sendError = (res, error, statusCode = 500) => {
  res.status(statusCode).json({
    success: false,
    error: error.message || error,
    timestamp: new Date(),
  });
};

// =========================================================================
// 1. نقاط النهاية العامة - General Endpoints
// =========================================================================

/**
 * @route GET /api/hr/health
 * @desc فحص حالة النظام
 */
router.get('/health', (req, res) => {
  sendSuccess(res, {
    status: 'operational',
    system: 'Advanced HR Management System',
    version: '1.0.0',
    timestamp: new Date(),
  }, 'HR System is operational');
});

/**
 * @route GET /api/hr/stats
 * @desc الحصول على إحصائيات النظام
 */
router.get('/stats', (req, res) => {
  try {
    const result = hrSystem.getSystemStats();
    sendSuccess(res, result.stats, 'Statistics retrieved successfully');
  } catch (error) {
    sendError(res, error);
  }
});

// =========================================================================
// 2. إدارة الموظفين - Employee Management
// =========================================================================

/**
 * @route POST /api/hr/employees
 * @desc إضافة موظف جديد
 */
router.post('/employees', (req, res) => {
  try {
    const result = hrSystem.addEmployee(req.body);
    if (result.success) {
      sendSuccess(res, result, 'Employee added successfully');
    } else {
      sendError(res, result.message, 400);
    }
  } catch (error) {
    sendError(res, error);
  }
});

/**
 * @route GET /api/hr/employees/:id
 * @desc الحصول على موظف
 */
router.get('/employees/:id', (req, res) => {
  try {
    const result = hrSystem.getEmployee(req.params.id);
    if (result.success) {
      sendSuccess(res, result.employee, 'Employee retrieved successfully');
    } else {
      sendError(res, result.message, 404);
    }
  } catch (error) {
    sendError(res, error);
  }
});

/**
 * @route PUT /api/hr/employees/:id
 * @desc تحديث بيانات موظف
 */
router.put('/employees/:id', (req, res) => {
  try {
    const result = hrSystem.updateEmployee(req.params.id, req.body);
    if (result.success) {
      sendSuccess(res, result.employee, 'Employee updated successfully');
    } else {
      sendError(res, result.message, 404);
    }
  } catch (error) {
    sendError(res, error);
  }
});

/**
 * @route GET /api/hr/employees
 * @desc الحصول على جميع الموظفين مع الفلاتر
 */
router.get('/employees', (req, res) => {
  try {
    const filters = {
      department: req.query.department,
      position: req.query.position,
      employmentStatus: req.query.status,
      level: req.query.level,
      search: req.query.search,
    };
    const result = hrSystem.getAllEmployees(filters);
    sendSuccess(res, result, 'Employees retrieved successfully');
  } catch (error) {
    sendError(res, error);
  }
});

/**
 * @route DELETE /api/hr/employees/:id
 * @desc تعطيل موظف
 */
router.delete('/employees/:id', (req, res) => {
  try {
    const { reason } = req.body;
    const result = hrSystem.deactivateEmployee(req.params.id, reason);
    if (result.success) {
      sendSuccess(res, {}, result.message);
    } else {
      sendError(res, result.message, 404);
    }
  } catch (error) {
    sendError(res, error);
  }
});

/**
 * @route GET /api/hr/employees/:id/report
 * @desc تقرير شامل عن موظف
 */
router.get('/employees/:id/report', (req, res) => {
  try {
    const result = hrSystem.generateEmployeeReport(req.params.id);
    if (result.success) {
      sendSuccess(res, result.report, 'Employee report generated successfully');
    } else {
      sendError(res, result.message, 404);
    }
  } catch (error) {
    sendError(res, error);
  }
});

// =========================================================================
// 3. إدارة الأقسام - Department Management
// =========================================================================

/**
 * @route POST /api/hr/departments
 * @desc إضافة قسم جديد
 */
router.post('/departments', (req, res) => {
  try {
    const result = hrSystem.addDepartment(req.body);
    sendSuccess(res, result, 'Department added successfully');
  } catch (error) {
    sendError(res, error);
  }
});

/**
 * @route GET /api/hr/departments/:id
 * @desc الحصول على قسم
 */
router.get('/departments/:id', (req, res) => {
  try {
    const result = hrSystem.getDepartment(req.params.id);
    if (result.success) {
      sendSuccess(res, result.department, 'Department retrieved successfully');
    } else {
      sendError(res, result.message, 404);
    }
  } catch (error) {
    sendError(res, error);
  }
});

/**
 * @route GET /api/hr/departments
 * @desc الحصول على جميع الأقسام
 */
router.get('/departments', (req, res) => {
  try {
    const result = hrSystem.getAllDepartments();
    sendSuccess(res, result, 'Departments retrieved successfully');
  } catch (error) {
    sendError(res, error);
  }
});

// =========================================================================
// 4. إدارة الحضور - Attendance Management
// =========================================================================

/**
 * @route POST /api/hr/attendance
 * @desc تسجيل حضور
 */
router.post('/attendance', (req, res) => {
  try {
    const result = hrSystem.recordAttendance(req.body);
    sendSuccess(res, result, 'Attendance recorded successfully');
  } catch (error) {
    sendError(res, error);
  }
});

/**
 * @route PUT /api/hr/attendance/:id
 * @desc تحديث سجل الحضور (تسجيل الخروج)
 */
router.put('/attendance/:id', (req, res) => {
  try {
    const { checkOut } = req.body;
    const result = hrSystem.updateAttendance(req.params.id, checkOut);
    if (result.success) {
      sendSuccess(res, result.attendance, 'Attendance updated successfully');
    } else {
      sendError(res, result.message, 404);
    }
  } catch (error) {
    sendError(res, error);
  }
});

/**
 * @route GET /api/hr/attendance/employee/:employeeId
 * @desc الحصول على سجل حضور موظف
 */
router.get('/attendance/employee/:employeeId', (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const result = hrSystem.getEmployeeAttendance(req.params.employeeId, startDate, endDate);
    sendSuccess(res, result, 'Attendance retrieved successfully');
  } catch (error) {
    sendError(res, error);
  }
});

// =========================================================================
// 5. إدارة الإجازات - Leave Management
// =========================================================================

/**
 * @route POST /api/hr/leaves
 * @desc تقديم طلب إجازة
 */
router.post('/leaves', (req, res) => {
  try {
    const result = hrSystem.requestLeave(req.body);
    sendSuccess(res, result, 'Leave request submitted successfully');
  } catch (error) {
    sendError(res, error);
  }
});

/**
 * @route POST /api/hr/leaves/:id/approve
 * @desc الموافقة على طلب إجازة
 */
router.post('/leaves/:id/approve', (req, res) => {
  try {
    const { approverId } = req.body;
    const result = hrSystem.approveLeave(req.params.id, approverId);
    if (result.success) {
      sendSuccess(res, result.leave, 'Leave request approved successfully');
    } else {
      sendError(res, result.message, 404);
    }
  } catch (error) {
    sendError(res, error);
  }
});

/**
 * @route POST /api/hr/leaves/:id/reject
 * @desc رفض طلب إجازة
 */
router.post('/leaves/:id/reject', (req, res) => {
  try {
    const { approverId, reason } = req.body;
    const result = hrSystem.rejectLeave(req.params.id, approverId, reason);
    if (result.success) {
      sendSuccess(res, result.leave, 'Leave request rejected');
    } else {
      sendError(res, result.message, 404);
    }
  } catch (error) {
    sendError(res, error);
  }
});

/**
 * @route GET /api/hr/leaves/employee/:employeeId
 * @desc الحصول على طلبات إجازة موظف
 */
router.get('/leaves/employee/:employeeId', (req, res) => {
  try {
    const result = hrSystem.getEmployeeLeaves(req.params.employeeId);
    sendSuccess(res, result, 'Employee leaves retrieved successfully');
  } catch (error) {
    sendError(res, error);
  }
});

/**
 * @route GET /api/hr/leaves/employee/:employeeId/remaining
 * @desc الحصول على أيام الإجازة المتبقية
 */
router.get('/leaves/employee/:employeeId/remaining', (req, res) => {
  try {
    const result = hrSystem.getRemainingLeaveDays(req.params.employeeId);
    if (result.success) {
      sendSuccess(res, result, 'Remaining leave days retrieved successfully');
    } else {
      sendError(res, result.message, 404);
    }
  } catch (error) {
    sendError(res, error);
  }
});

// =========================================================================
// 6. إدارة الأداء - Performance Management
// =========================================================================

/**
 * @route POST /api/hr/performance
 * @desc إضافة تقييم أداء
 */
router.post('/performance', (req, res) => {
  try {
    const result = hrSystem.addPerformanceReview(req.body);
    sendSuccess(res, result, 'Performance review added successfully');
  } catch (error) {
    sendError(res, error);
  }
});

/**
 * @route GET /api/hr/performance/employee/:employeeId
 * @desc الحصول على تقييمات أداء موظف
 */
router.get('/performance/employee/:employeeId', (req, res) => {
  try {
    const result = hrSystem.getEmployeePerformanceReviews(req.params.employeeId);
    sendSuccess(res, result, 'Performance reviews retrieved successfully');
  } catch (error) {
    sendError(res, error);
  }
});

/**
 * @route POST /api/hr/performance/goals
 * @desc إضافة هدف لموظف
 */
router.post('/performance/goals', (req, res) => {
  try {
    const result = hrSystem.addEmployeeGoal(req.body);
    if (result.success) {
      sendSuccess(res, result.goal, 'Goal added successfully');
    } else {
      sendError(res, result.message, 404);
    }
  } catch (error) {
    sendError(res, error);
  }
});

/**
 * @route GET /api/hr/performance/report
 * @desc تقرير الأداء الشامل للمؤسسة
 */
router.get('/performance/report', (req, res) => {
  try {
    const result = hrSystem.generateOrganizationPerformanceReport();
    sendSuccess(res, result.report, 'Organization performance report generated successfully');
  } catch (error) {
    sendError(res, error);
  }
});

// =========================================================================
// 7. إدارة التدريب - Training Management
// =========================================================================

/**
 * @route POST /api/hr/trainings
 * @desc إضافة برنامج تدريبي
 */
router.post('/trainings', (req, res) => {
  try {
    const result = hrSystem.addTraining(req.body);
    sendSuccess(res, result, 'Training added successfully');
  } catch (error) {
    sendError(res, error);
  }
});

/**
 * @route POST /api/hr/trainings/:id/enroll
 * @desc تسجيل موظف في تدريب
 */
router.post('/trainings/:id/enroll', (req, res) => {
  try {
    const { employeeId } = req.body;
    const result = hrSystem.enrollEmployeeInTraining(req.params.id, employeeId);
    if (result.success) {
      sendSuccess(res, {}, result.message);
    } else {
      sendError(res, result.message, 400);
    }
  } catch (error) {
    sendError(res, error);
  }
});

/**
 * @route POST /api/hr/trainings/:id/complete
 * @desc إكمال تدريب موظف
 */
router.post('/trainings/:id/complete', (req, res) => {
  try {
    const { employeeId, grade, feedback } = req.body;
    const result = hrSystem.completeEmployeeTraining(req.params.id, employeeId, grade, feedback);
    if (result.success) {
      sendSuccess(res, {}, result.message);
    } else {
      sendError(res, result.message, 400);
    }
  } catch (error) {
    sendError(res, error);
  }
});

/**
 * @route GET /api/hr/trainings/employee/:employeeId
 * @desc الحصول على تدريبات موظف
 */
router.get('/trainings/employee/:employeeId', (req, res) => {
  try {
    const result = hrSystem.getEmployeeTrainings(req.params.employeeId);
    sendSuccess(res, result, 'Employee trainings retrieved successfully');
  } catch (error) {
    sendError(res, error);
  }
});

// =========================================================================
// 8. إدارة التوظيف - Recruitment Management
// =========================================================================

/**
 * @route POST /api/hr/recruitments
 * @desc إضافة طلب توظيف
 */
router.post('/recruitments', (req, res) => {
  try {
    const result = hrSystem.addRecruitmentRequest(req.body);
    sendSuccess(res, result, 'Recruitment request added successfully');
  } catch (error) {
    sendError(res, error);
  }
});

/**
 * @route POST /api/hr/recruitments/:id/candidates
 * @desc إضافة مرشح لوظيفة
 */
router.post('/recruitments/:id/candidates', (req, res) => {
  try {
    const result = hrSystem.addCandidate(req.params.id, req.body);
    if (result.success) {
      sendSuccess(res, result, 'Candidate added successfully');
    } else {
      sendError(res, result.message, 404);
    }
  } catch (error) {
    sendError(res, error);
  }
});

// =========================================================================
// 9. إدارة الرواتب - Payroll Management
// =========================================================================

/**
 * @route POST /api/hr/payroll/process
 * @desc معالجة رواتب الشهر
 */
router.post('/payroll/process', (req, res) => {
  try {
    const { month, year } = req.body;
    const result = hrSystem.processMonthlyPayroll(month, year);
    sendSuccess(res, result, 'Payroll processed successfully');
  } catch (error) {
    sendError(res, error);
  }
});

/**
 * @route GET /api/hr/payroll/employee/:employeeId
 * @desc الحصول على سجل راتب موظف
 */
router.get('/payroll/employee/:employeeId', (req, res) => {
  try {
    const { month, year } = req.query;
    const result = hrSystem.getEmployeePayroll(req.params.employeeId, month, year);
    if (result.success) {
      sendSuccess(res, result.payroll, 'Payroll retrieved successfully');
    } else {
      sendError(res, result.message, 404);
    }
  } catch (error) {
    sendError(res, error);
  }
});

// =========================================================================
// تصدير Router
// =========================================================================

module.exports = { router, hrSystem };
