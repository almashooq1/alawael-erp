const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const logger = require('../utils/logger');

// Unified email service
let emailManager;
try {
  const { emailManager: em } = require('../services/email');
  emailManager = em;
} catch {
  emailManager = null;
}

// User model for lookups
let User;
try {
  User = require('../models/User');
} catch {
  User = null;
}

/* ── Field whitelists (prevent mass-assignment) ──────────────────────── */
const PERF_REVIEW_FIELDS = [
  'employeeId',
  'period',
  'department',
  'rating',
  'score',
  'strengths',
  'improvements',
  'goals',
  'comments',
  'reviewDate',
];
const LEAVE_FIELDS = ['type', 'startDate', 'endDate', 'reason', 'department', 'attachments'];

function pick(src, fields) {
  const out = {};
  for (const f of fields) if (src[f] !== undefined) out[f] = src[f];
  return out;
}

router.use(authenticate);
router.use(requireBranchAccess);
// GET /attendance
router.get('/attendance', async (req, res) => {
  try {
    const Attendance = require('../models/HR/Attendance');
const safeError = require('../utils/safeError');
    const { page = 1, limit = 20, date } = req.query;
    const filter = {};
    if (date) filter.date = new Date(date);
    const skip = (Math.max(1, +page) - 1) * +limit;
    const [data, total] = await Promise.all([
      Attendance.find(filter).sort({ createdAt: -1 }).skip(skip).limit(+limit).lean(),
      Attendance.countDocuments(filter),
    ]);
    res.json({ success: true, data, pagination: { page: +page, limit: +limit, total } });
  } catch (err) {
    safeError(res, err, 'HR attendance error');
  }
});

// GET /payroll — restricted to HR/finance/admin roles with minimal projection
router.get('/payroll', authorize(['admin', 'hr_manager', 'finance']), async (req, res) => {
  try {
    const Payroll = require('../models/HR/Payroll');
    const { month, year } = req.query;
    const filter = {};
    if (month) filter.month = +month;
    if (year) filter.year = +year;
    const data = await Payroll.find(filter)
      .select('employeeId month year paymentStatus totalGross totalNet attendance createdAt')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, data });
  } catch (err) {
    safeError(res, err, 'HR payroll error');
  }
});

// GET /leaves
router.get('/leaves', async (req, res) => {
  try {
    const Leave = require('../models/HR/Leave');
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;
    const data = await Leave.find(filter).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data });
  } catch (err) {
    safeError(res, err, 'HR leaves error');
  }
});

// POST /attendance/checkin
router.post('/attendance/checkin', async (req, res) => {
  try {
    const Attendance = require('../models/HR/Attendance');
    const record = await Attendance.create({
      ...req.body,
      employeeId: req.user?.id,
      checkIn: new Date(),
    });

    // Check for late arrival and send alert (non-blocking)
    if (emailManager && req.user?.email) {
      const checkInTime = new Date();
      const workStartHour = parseInt(process.env.WORK_START_HOUR, 10) || 8;
      if (
        checkInTime.getHours() > workStartHour ||
        (checkInTime.getHours() === workStartHour && checkInTime.getMinutes() > 15)
      ) {
        emailManager
          .sendAttendanceAlert(req.user.email, {
            fullName: req.user.fullName || req.user.email,
            type: 'تأخر في الحضور',
            date: checkInTime.toLocaleDateString('ar-SA'),
            time: checkInTime.toLocaleTimeString('ar-SA'),
            details: `وقت الحضور: ${checkInTime.toLocaleTimeString('ar-SA')} - الوقت المحدد: ${workStartHour}:00`,
          })
          .catch(err => logger.error('Failed to send attendance alert:', err.message));
      }
    }

    res.status(201).json({ success: true, data: record, message: 'تم تسجيل الحضور' });
  } catch (err) {
    safeError(res, err, 'HR checkin error');
  }
});

// POST /attendance/checkout — IDOR fix: non-admin users can only checkout themselves
router.post('/attendance/checkout', async (req, res) => {
  try {
    const Attendance = require('../models/HR/Attendance');
    const userRole = req.user?.role;
    const isPrivileged = ['admin', 'super_admin', 'hr_manager'].includes(userRole);
    // Only privileged users may check out other employees
    const targetEmpId = isPrivileged && req.body.employeeId ? req.body.employeeId : req.user?.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const record = await Attendance.findOneAndUpdate(
      { employeeId: targetEmpId, checkIn: { $gte: today }, checkOut: null },
      { checkOut: new Date() },
      { new: true, sort: { checkIn: -1 } }
    );
    if (!record) {
      return res
        .status(404)
        .json({ success: false, message: 'لا يوجد سجل حضور مفتوح لهذا الموظف' });
    }
    res.json({ success: true, data: record, message: 'تم تسجيل الانصراف' });
  } catch (err) {
    safeError(res, err, 'HR checkout error');
  }
});

// GET /performance-reviews
router.get('/performance-reviews', async (req, res) => {
  try {
    const PerformanceEvaluation = require('../models/HR/PerformanceEvaluation');
    const { department, period } = req.query;
    const filter = {};
    if (department) filter.department = department;
    if (period) filter.period = period;
    const data = await PerformanceEvaluation.find(filter).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data });
  } catch (err) {
    safeError(res, err, 'HR performance-reviews error');
  }
});

// POST /performance-reviews — require manager+ & whitelist fields
router.post(
  '/performance-reviews',
  authorize(['admin', 'hr_manager', 'manager']),
  async (req, res) => {
    try {
      const PerformanceEvaluation = require('../models/HR/PerformanceEvaluation');
      const fields = pick(req.body, PERF_REVIEW_FIELDS);
      const review = await PerformanceEvaluation.create({ ...fields, evaluator: req.user?.id });

      // Notify the evaluated employee via email (non-blocking)
      if (emailManager && fields.employeeId && User) {
        User.findById(fields.employeeId)
          .select('email fullName')
          .lean()
          .then(emp => {
            if (emp && emp.email) {
              emailManager
                .sendNotification(emp.email, {
                  title: 'تقييم أداء جديد',
                  message: `تم إنشاء تقييم أداء جديد للفترة: ${fields.period || 'غير محدد'}. التقييم: ${fields.rating || fields.score || '-'}`,
                  fullName: emp.fullName,
                })
                .catch(err =>
                  logger.error('Failed to send performance review email:', err.message)
                );
            }
          })
          .catch(() => {});
      }

      res.status(201).json({ success: true, data: review, message: 'تم إنشاء تقييم الأداء' });
    } catch (err) {
      safeError(res, err, 'HR create performance-review error');
    }
  }
);

// POST /leaves
router.post('/leaves', async (req, res) => {
  try {
    const Leave = require('../models/HR/Leave');
    const fields = pick(req.body, LEAVE_FIELDS);
    const leave = await Leave.create({ ...fields, requestedBy: req.user?.id, status: 'pending' });

    // Send leave request notification email to HR (non-blocking)
    if (emailManager) {
      const hrEmail = process.env.HR_MANAGER_EMAIL;
      if (hrEmail) {
        emailManager
          .sendLeaveRequest(hrEmail, {
            employeeName: req.user?.fullName || req.user?.email || 'موظف',
            type: fields.type || 'إجازة',
            startDate: fields.startDate,
            endDate: fields.endDate,
            reason: fields.reason || 'غير محدد',
            leaveId: leave._id?.toString(),
          })
          .catch(err => logger.error('Failed to send leave request email:', err.message));
      }
      // Also confirm to the requesting employee
      if (req.user?.email) {
        emailManager
          .sendNotification(req.user.email, {
            title: 'تم تقديم طلب الإجازة',
            message: `تم تقديم طلب إجازة (${fields.type || 'إجازة'}) من ${fields.startDate} إلى ${fields.endDate}. سيتم مراجعة طلبك قريباً.`,
            fullName: req.user.fullName,
          })
          .catch(err => logger.error('Failed to send leave confirmation email:', err.message));
      }
    }

    res.status(201).json({ success: true, data: leave, message: 'تم تقديم طلب الإجازة' });
  } catch (err) {
    safeError(res, err, 'HR create leave error');
  }
});

// ─── Leave Approval/Rejection ─────────────────────────────────────────────
// PATCH /leaves/:id/status — approve or reject a leave request
router.patch(
  '/leaves/:id/status',
  authorize(['admin', 'hr_manager', 'manager']),
  async (req, res) => {
    try {
      const Leave = require('../models/HR/Leave');
      const { status, rejectionReason } = req.body;

      if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'الحالة يجب أن تكون approved أو rejected',
        });
      }

      const leave = await Leave.findById(req.params.id);
      if (!leave) {
        return res.status(404).json({ success: false, message: 'طلب الإجازة غير موجود' });
      }

      if (leave.status !== 'pending') {
        return res.status(400).json({
          success: false,
          message: 'لا يمكن تعديل طلب تمت معالجته مسبقاً',
        });
      }

      leave.status = status;
      leave.reviewedBy = req.user?.id;
      leave.reviewedAt = new Date();
      if (rejectionReason) leave.rejectionReason = rejectionReason;
      await leave.save();

      // Notify the employee about the decision via email (non-blocking)
      if (emailManager && User && leave.requestedBy) {
        User.findById(leave.requestedBy)
          .select('email fullName')
          .lean()
          .then(emp => {
            if (emp && emp.email) {
              const statusAr = status === 'approved' ? 'تمت الموافقة على' : 'تم رفض';
              emailManager
                .sendLeaveStatus(emp.email, {
                  fullName: emp.fullName,
                  status: statusAr,
                  type: leave.type || 'إجازة',
                  startDate: leave.startDate,
                  endDate: leave.endDate,
                  reason: rejectionReason || '',
                  reviewedBy: req.user?.fullName || 'الإدارة',
                })
                .catch(err => logger.error('Failed to send leave status email:', err.message));
            }
          })
          .catch(() => {});
      }

      const msg = status === 'approved' ? 'تمت الموافقة على الإجازة' : 'تم رفض طلب الإجازة';
      res.json({ success: true, data: leave, message: msg });
    } catch (err) {
      safeError(res, err, 'HR leave status update error');
    }
  }
);

// ─── Salary Notification ─────────────────────────────────────────────────
// POST /payroll/notify — send salary notifications to employees
router.post('/payroll/notify', authorize(['admin', 'hr_manager', 'finance']), async (req, res) => {
  try {
    const Payroll = require('../models/HR/Payroll');
    const { month, year } = req.body;

    if (!month || !year) {
      return res.status(400).json({ success: false, message: 'الشهر والسنة مطلوبان' });
    }

    const payrolls = await Payroll.find({ month: +month, year: +year }).lean();
    if (!payrolls.length) {
      return res.status(404).json({ success: false, message: 'لا توجد رواتب لهذا الشهر' });
    }

    let sent = 0;
    if (emailManager && User) {
      for (const payroll of payrolls) {
        try {
          const emp = await User.findById(payroll.employeeId).select('email fullName').lean();
          if (emp && emp.email) {
            await emailManager.sendSalaryNotification(emp.email, {
              fullName: emp.fullName,
              month: `${month}/${year}`,
              totalGross: payroll.totalGross,
              totalNet: payroll.totalNet,
              deductions: payroll.totalGross - payroll.totalNet,
              paymentDate: payroll.paymentDate || new Date().toLocaleDateString('ar-SA'),
            });
            sent++;
          }
        } catch (err) {
          logger.error(
            `Failed to send salary notification to employee ${payroll.employeeId}:`,
            err.message
          );
        }
      }
    }

    res.json({
      success: true,
      message: `تم إرسال ${sent} إشعار راتب من أصل ${payrolls.length}`,
      data: { total: payrolls.length, sent },
    });
  } catch (err) {
    safeError(res, err, 'HR payroll notify error');
  }
});

module.exports = router;
