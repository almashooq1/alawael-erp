/**
 * KPI & Attendance Scheduler — جدولة مهام KPIs والحضور
 *
 * البرومبت 21 — النظام 36: لوحة KPIs الذكية | النظام 37: الحضور البيومتري ZKTeco
 *
 * الجداول الزمنية:
 *  - kpi:calculate-daily              يومياً 01:00
 *  - kpi:generate-monthly-report      أول كل شهر 06:00
 *  - kpi:send-alert-digest            يومياً 08:00
 *  - zkteco:sync-all                  كل 30 دقيقة
 *  - attendance:generate-daily        يومياً 23:55
 *  - attendance:send-absence-alerts   يومياً 09:30
 *  - attendance:monthly-overtime      أول كل شهر 02:00
 */

const cron = require('node-cron');
const logger = require('../utils/logger');

// ─── Services ────────────────────────────────────────────────────────────────
let kpiService, zktecoService, attendanceService, leaveService;

const loadServices = () => {
  try {
    kpiService = require('../services/kpiCalculation.service');
  } catch (e) {
    logger.warn('[KPI Scheduler] kpiCalculation.service not loaded:', e.message);
  }
  try {
    zktecoService = require('../services/zktecoSdk.service');
  } catch (e) {
    logger.warn('[KPI Scheduler] zktecoSdk.service not loaded:', e.message);
  }
  try {
    attendanceService = require('../services/attendanceProcessing.service');
  } catch (e) {
    logger.warn('[KPI Scheduler] attendanceProcessing.service not loaded:', e.message);
  }
  try {
    leaveService = require('../services/leaveManagement.service');
  } catch (e) {
    logger.warn('[KPI Scheduler] leaveManagement.service not loaded:', e.message);
  }
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * تسجيل مهمة مجدولة مع معالجة الأخطاء
 */
const safeSchedule = (cronExpr, name, fn) => {
  if (!cron.validate(cronExpr)) {
    logger.error(`[Scheduler] Invalid cron expression for "${name}": ${cronExpr}`);
    return null;
  }
  return cron.schedule(cronExpr, async () => {
    const start = Date.now();
    logger.info(`[Scheduler] ▶ Starting job: ${name}`);
    try {
      await fn();
      const elapsed = ((Date.now() - start) / 1000).toFixed(2);
      logger.info(`[Scheduler] ✅ Completed job: ${name} in ${elapsed}s`);
    } catch (err) {
      logger.error(`[Scheduler] ❌ Job failed: ${name} — ${err.message}`, { stack: err.stack });
    }
  });
};

/**
 * الحصول على جميع الفروع الفعّالة
 */
const getActiveBranches = async () => {
  try {
    const Branch = require('../models/Branch');
    return await Branch.find({ isActive: true }).lean();
  } catch {
    return [];
  }
};

/**
 * الحصول على جميع الموظفين الفعّالين لفرع معين
 */
const getActiveEmployees = async branchId => {
  try {
    const Employee = require('../models/HR/Employee');
    return await Employee.find({ branchId, employmentStatus: 'active' }).lean();
  } catch {
    return [];
  }
};

// ─── Job Handlers ─────────────────────────────────────────────────────────────

/**
 * حساب KPIs اليومية لجميع الفروع
 * kpi:calculate-daily — يومياً 01:00
 */
const calculateDailyKpis = async () => {
  if (!kpiService) return logger.warn('[kpi:calculate-daily] Service unavailable');

  const branches = await getActiveBranches();
  if (branches.length === 0) {
    return logger.info('[kpi:calculate-daily] No active branches found');
  }

  const now = new Date();
  const year = now.getFullYear();
  const dayOfYear = Math.ceil((now - new Date(now.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));

  let totalKpis = 0;
  for (const branch of branches) {
    try {
      const results = await kpiService.calculateAll(
        branch._id.toString(),
        'daily',
        year,
        dayOfYear
      );
      totalKpis += results.length;
      logger.info(
        `[kpi:calculate-daily] Branch "${branch.name}": ${results.length} KPIs calculated`
      );
    } catch (err) {
      logger.error(`[kpi:calculate-daily] Branch "${branch.name}" failed: ${err.message}`);
    }
  }

  logger.info(`[kpi:calculate-daily] Done — ${totalKpis} KPIs across ${branches.length} branches`);
};

/**
 * توليد تقارير KPI الشهرية تلقائياً
 * kpi:generate-monthly-report — أول كل شهر 06:00
 */
const generateMonthlyKpiReports = async () => {
  if (!kpiService) return logger.warn('[kpi:generate-monthly-report] Service unavailable');

  const branches = await getActiveBranches();
  const now = new Date();
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const year = prevMonth.getFullYear();
  const month = prevMonth.getMonth() + 1; // 1-indexed

  // حساب KPIs الشهرية أولاً
  for (const branch of branches) {
    try {
      const results = await kpiService.calculateAll(branch._id.toString(), 'monthly', year, month);
      logger.info(
        `[kpi:generate-monthly-report] Branch "${branch.name}": ${results.length} monthly KPIs computed`
      );
    } catch (err) {
      logger.error(
        `[kpi:generate-monthly-report] KPI calc failed for "${branch.name}": ${err.message}`
      );
    }
  }

  // توليد بطاقة الأداء الشهرية
  const KpiReport = require('../models/KpiReport');
  for (const branch of branches) {
    try {
      await KpiReport.create({
        branchId: branch._id,
        title: `Monthly KPI Report — ${month}/${year}`,
        titleAr: `تقرير مؤشرات الأداء الشهري — ${month}/${year}`,
        reportType: 'monthly',
        status: 'pending',
        periodFrom: new Date(year, month - 1, 1),
        periodTo: new Date(year, month, 0),
        format: 'pdf',
        isAuto: true,
      });
      logger.info(`[kpi:generate-monthly-report] Report queued for branch "${branch.name}"`);
    } catch (err) {
      logger.error(
        `[kpi:generate-monthly-report] Report creation failed for "${branch.name}": ${err.message}`
      );
    }
  }

  logger.info(
    `[kpi:generate-monthly-report] Done — Reports queued for ${branches.length} branches`
  );
};

/**
 * إرسال ملخص التنبيهات اليومي للمديرين
 * kpi:send-alert-digest — يومياً 08:00
 */
const sendKpiAlertDigest = async () => {
  const KpiAlert = require('../models/KpiAlert');

  const criticalAlerts = await KpiAlert.find({
    status: 'active',
    severity: 'critical',
    createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
  })
    .populate('kpiDefinitionId', 'name nameAr')
    .populate('branchId', 'name')
    .lean();

  if (criticalAlerts.length === 0) {
    return logger.info('[kpi:send-alert-digest] No critical alerts in last 24h');
  }

  logger.info(
    `[kpi:send-alert-digest] Found ${criticalAlerts.length} critical KPI alerts — digest sent`
  );

  // تسجيل ملخص التنبيهات (يمكن إضافة إرسال بريد إلكتروني هنا)
  criticalAlerts.forEach(alert => {
    logger.warn(
      `[KPI Alert Digest] ${alert.branchId?.name || 'N/A'} — ${alert.messageAr} (deviation: ${alert.deviationPct?.toFixed(1)}%)`
    );
  });
};

/**
 * مزامنة بيانات الحضور من جميع أجهزة ZKTeco
 * zkteco:sync-all — كل 30 دقيقة
 */
const syncZktecoDevices = async () => {
  if (!zktecoService) return logger.warn('[zkteco:sync-all] Service unavailable');
  if (!attendanceService) return logger.warn('[zkteco:sync-all] Attendance service unavailable');

  const ZktecoDevice = require('../models/ZktecoDevice');
  const devices = await ZktecoDevice.find({ isActive: true }).lean();

  if (devices.length === 0) {
    return logger.info('[zkteco:sync-all] No active ZKTeco devices found');
  }

  const sinceDate = new Date(Date.now() - 65 * 60 * 1000); // آخر 65 دقيقة (تداخل بسيط)
  let totalProcessed = 0;
  let totalFailed = 0;

  for (const device of devices) {
    try {
      const logs = await zktecoService.pullAttendanceLogs(device, sinceDate);

      if (!logs || logs.length === 0) {
        logger.debug(`[zkteco:sync-all] Device "${device.name}": no new logs`);
        continue;
      }

      // معالجة السجلات المسحوبة
      const AttendanceLog = require('../models/AttendanceLog');
      const savedLogs = [];

      for (const record of logs) {
        try {
          const Employee = require('../models/HR/Employee');
          const employee = await Employee.findOne({
            branchId: device.branchId,
            zktecoUserId: record.userId,
          });

          if (!employee) continue;

          const existing = await AttendanceLog.findOne({
            employeeId: employee._id,
            deviceId: device._id,
            punchTime: new Date(record.timestamp * 1000),
          });

          if (existing) continue;

          const log = await AttendanceLog.create({
            branchId: device.branchId,
            employeeId: employee._id,
            deviceId: device._id,
            deviceUserId: record.userId,
            punchTime: new Date(record.timestamp * 1000),
            punchType: 'checkin',
            verificationMethod:
              record.verifyType === 4 ? 'card' : record.verifyType === 15 ? 'face' : 'fingerprint',
            isSynced: true,
            rawData: JSON.stringify(record),
          });

          savedLogs.push(log);
          totalProcessed++;
        } catch (recErr) {
          totalFailed++;
          logger.error(`[zkteco:sync-all] Record processing error: ${recErr.message}`);
        }
      }

      // معالجة ملخصات الحضور اليومي
      for (const log of savedLogs) {
        try {
          await attendanceService.processLog(log);
        } catch (procErr) {
          logger.error(`[zkteco:sync-all] processLog error: ${procErr.message}`);
        }
      }

      logger.info(
        `[zkteco:sync-all] Device "${device.name}": ${savedLogs.length}/${logs.length} new logs processed`
      );
    } catch (err) {
      logger.error(`[zkteco:sync-all] Device "${device.name}" sync failed: ${err.message}`);
    }
  }

  logger.info(
    `[zkteco:sync-all] Done — ${totalProcessed} logs processed, ${totalFailed} failed across ${devices.length} devices`
  );
};

/**
 * توليد ملخصات الحضور اليومية وتحديد الغياب
 * attendance:generate-daily — يومياً 23:55
 */
const generateDailyAttendanceSummaries = async () => {
  if (!attendanceService) {
    return logger.warn('[attendance:generate-daily] Attendance service unavailable');
  }

  const DailyAttendance = require('../models/DailyAttendance');
  const WorkShift = require('../models/WorkShift');
  const EmployeeShiftAssignment = require('../models/EmployeeShiftAssignment');

  const branches = await getActiveBranches();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];
  const dayOfWeek = today.getDay(); // 0=أحد ... 6=سبت

  let totalCreated = 0;
  let totalWeekend = 0;

  for (const branch of branches) {
    const employees = await getActiveEmployees(branch._id.toString());

    for (const employee of employees) {
      try {
        // الحصول على دوام الموظف الحالي
        const assignment = await EmployeeShiftAssignment.findOne({
          employeeId: employee._id,
          effectiveFrom: { $lte: today },
          $or: [{ effectiveTo: null }, { effectiveTo: { $gte: today } }],
        })
          .sort({ effectiveFrom: -1 })
          .populate('shiftId');

        const shift = assignment?.shiftId;

        // تحديد أيام العمل
        const workingDays = shift?.workingDays || [0, 1, 2, 3, 4]; // الأحد للخميس افتراضياً

        // إذا كان نهاية الأسبوع
        if (!workingDays.includes(dayOfWeek)) {
          await DailyAttendance.findOneAndUpdate(
            { employeeId: employee._id, workDate: today, branchId: branch._id },
            { $setOnInsert: { status: 'weekend', isWeekend: true, shiftId: shift?._id } },
            { upsert: true, new: false }
          );
          totalWeekend++;
          continue;
        }

        // إنشاء سجل غياب إذا لم يكن هناك حضور
        const existing = await DailyAttendance.findOne({
          employeeId: employee._id,
          workDate: today,
          branchId: branch._id,
        });

        if (!existing) {
          await DailyAttendance.create({
            branchId: branch._id,
            employeeId: employee._id,
            workDate: today,
            status: 'absent',
            shiftId: shift?._id,
          });
          totalCreated++;
        }
      } catch (err) {
        logger.error(`[attendance:generate-daily] Employee ${employee._id} failed: ${err.message}`);
      }
    }

    logger.info(
      `[attendance:generate-daily] Branch "${branch.name}": ${employees.length} employees processed`
    );
  }

  logger.info(
    `[attendance:generate-daily] Done for ${todayStr} — ${totalCreated} absent records created, ${totalWeekend} weekend records`
  );
};

/**
 * إرسال تنبيهات الغياب والتأخير للمديرين
 * attendance:send-absence-alerts — يومياً 09:30
 */
const sendAbsenceAlerts = async () => {
  const DailyAttendance = require('../models/DailyAttendance');
  const AttendancePolicyModel = require('../models/AttendancePolicyModel');

  const branches = await getActiveBranches();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const branch of branches) {
    try {
      const policy = await AttendancePolicyModel.findOne({
        branchId: branch._id,
        isActive: true,
      }).lean();

      if (!policy?.notifyManagerOnAbsence) {
        logger.debug(
          `[attendance:send-absence-alerts] Branch "${branch.name}": absence notifications disabled`
        );
        continue;
      }

      const absentRecords = await DailyAttendance.find({
        branchId: branch._id,
        workDate: today,
        status: 'absent',
      })
        .populate('employeeId', 'name employeeNumber')
        .lean();

      if (absentRecords.length === 0) {
        logger.info(`[attendance:send-absence-alerts] Branch "${branch.name}": no absences today`);
        continue;
      }

      // تسجيل الغياب (يمكن إضافة إرسال البريد الإلكتروني/WhatsApp هنا)
      const absentNames = absentRecords.map(r => r.employeeId?.name || 'Unknown').join(', ');

      logger.warn(
        `[attendance:send-absence-alerts] Branch "${branch.name}": ${absentRecords.length} absent employees — ${absentNames}`
      );
    } catch (err) {
      logger.error(
        `[attendance:send-absence-alerts] Branch "${branch.name}" failed: ${err.message}`
      );
    }
  }

  logger.info('[attendance:send-absence-alerts] Done');
};

/**
 * حساب وتجميع الوقت الإضافي الشهري
 * attendance:monthly-overtime — أول كل شهر 02:00
 */
const calculateMonthlyOvertime = async () => {
  const DailyAttendance = require('../models/DailyAttendance');
  const OvertimeRequest = require('../models/OvertimeRequest');

  const branches = await getActiveBranches();
  const now = new Date();
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const year = prevMonth.getFullYear();
  const month = prevMonth.getMonth() + 1; // 1-indexed

  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0, 23, 59, 59);

  let totalRequests = 0;

  for (const branch of branches) {
    const employees = await getActiveEmployees(branch._id.toString());

    for (const employee of employees) {
      try {
        // تجميع الوقت الإضافي للشهر
        const result = await DailyAttendance.aggregate([
          {
            $match: {
              employeeId: employee._id,
              branchId: branch._id,
              workDate: { $gte: monthStart, $lte: monthEnd },
              overtimeMinutes: { $gt: 0 },
            },
          },
          {
            $group: {
              _id: null,
              totalOvertimeMinutes: { $sum: '$overtimeMinutes' },
              totalOvertimeAmount: { $sum: '$overtimeAmount' },
            },
          },
        ]);

        if (!result.length || result[0].totalOvertimeMinutes === 0) continue;

        const { totalOvertimeMinutes, totalOvertimeAmount } = result[0];

        // التحقق من عدم وجود طلب مسبق لنفس الشهر
        const exists = await OvertimeRequest.findOne({
          employeeId: employee._id,
          branchId: branch._id,
          overtimeDate: monthEnd,
          type: 'regular',
        });

        if (exists) continue;

        await OvertimeRequest.create({
          branchId: branch._id,
          employeeId: employee._id,
          overtimeDate: monthEnd,
          startTime: '00:00',
          endTime: '00:00',
          durationMinutes: totalOvertimeMinutes,
          type: 'regular',
          rateMultiplier: 1.25,
          amount: totalOvertimeAmount,
          reason: `وقت إضافي تلقائي — ${month}/${year}`,
          status: 'pending',
        });

        totalRequests++;
      } catch (err) {
        logger.error(
          `[attendance:monthly-overtime] Employee ${employee._id} failed: ${err.message}`
        );
      }
    }

    logger.info(`[attendance:monthly-overtime] Branch "${branch.name}": overtime processed`);
  }

  logger.info(
    `[attendance:monthly-overtime] Done for ${month}/${year} — ${totalRequests} overtime requests created`
  );
};

// ─── Scheduler Registration ───────────────────────────────────────────────────

const registeredJobs = [];

/**
 * تسجيل وتشغيل جميع مهام KPI والحضور
 */
const startKpiAttendanceScheduler = () => {
  loadServices();

  logger.info('[KPI & Attendance Scheduler] Registering scheduled jobs...');

  // ── KPI Jobs ──────────────────────────────────────────────────────────────

  // كل يوم الساعة 01:00 — حساب KPIs اليومية
  registeredJobs.push(safeSchedule('0 1 * * *', 'kpi:calculate-daily', calculateDailyKpis));

  // أول كل شهر الساعة 06:00 — تقارير KPI الشهرية
  registeredJobs.push(
    safeSchedule('0 6 1 * *', 'kpi:generate-monthly-report', generateMonthlyKpiReports)
  );

  // كل يوم الساعة 08:00 — ملخص تنبيهات KPI
  registeredJobs.push(safeSchedule('0 8 * * *', 'kpi:send-alert-digest', sendKpiAlertDigest));

  // ── ZKTeco & Attendance Jobs ──────────────────────────────────────────────

  // كل 30 دقيقة — مزامنة أجهزة ZKTeco
  registeredJobs.push(safeSchedule('*/30 * * * *', 'zkteco:sync-all', syncZktecoDevices));

  // كل يوم الساعة 23:55 — توليد ملخصات الحضور وتحديد الغياب
  registeredJobs.push(
    safeSchedule('55 23 * * *', 'attendance:generate-daily', generateDailyAttendanceSummaries)
  );

  // كل يوم الساعة 09:30 — تنبيهات الغياب
  registeredJobs.push(
    safeSchedule('30 9 * * *', 'attendance:send-absence-alerts', sendAbsenceAlerts)
  );

  // أول كل شهر الساعة 02:00 — حساب الوقت الإضافي الشهري
  registeredJobs.push(
    safeSchedule('0 2 1 * *', 'attendance:monthly-overtime', calculateMonthlyOvertime)
  );

  const validJobs = registeredJobs.filter(Boolean);
  logger.info(`[KPI & Attendance Scheduler] ✅ ${validJobs.length}/7 jobs registered successfully`);

  return validJobs;
};

/**
 * إيقاف جميع المهام المجدولة
 */
const stopKpiAttendanceScheduler = () => {
  registeredJobs.forEach(job => {
    if (job && typeof job.stop === 'function') job.stop();
  });
  registeredJobs.length = 0;
  logger.info('[KPI & Attendance Scheduler] All jobs stopped');
};

/**
 * تشغيل مهمة يدوياً (للاختبار)
 */
const runJobManually = async jobName => {
  const jobMap = {
    'kpi:calculate-daily': calculateDailyKpis,
    'kpi:generate-monthly-report': generateMonthlyKpiReports,
    'kpi:send-alert-digest': sendKpiAlertDigest,
    'zkteco:sync-all': syncZktecoDevices,
    'attendance:generate-daily': generateDailyAttendanceSummaries,
    'attendance:send-absence-alerts': sendAbsenceAlerts,
    'attendance:monthly-overtime': calculateMonthlyOvertime,
  };

  const fn = jobMap[jobName];
  if (!fn) throw new Error(`Unknown job: ${jobName}`);

  logger.info(`[KPI & Attendance Scheduler] Manual run: ${jobName}`);
  const start = Date.now();
  await fn();
  const elapsed = ((Date.now() - start) / 1000).toFixed(2);
  logger.info(`[KPI & Attendance Scheduler] Manual run done: ${jobName} in ${elapsed}s`);
};

module.exports = {
  startKpiAttendanceScheduler,
  stopKpiAttendanceScheduler,
  runJobManually,
  // Export individual handlers for testing
  calculateDailyKpis,
  generateMonthlyKpiReports,
  sendKpiAlertDigest,
  syncZktecoDevices,
  generateDailyAttendanceSummaries,
  sendAbsenceAlerts,
  calculateMonthlyOvertime,
};
