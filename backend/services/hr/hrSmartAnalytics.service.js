'use strict';

/**
 * hrSmartAnalytics.service.js — محرك التحليلات الذكية للموارد البشرية
 *
 * يوفر هذا المحرك تحليلات متكاملة وذكية تشمل:
 *
 *   1. لوحة الذكاء الوظيفي  — مؤشرات القوى العاملة الفورية
 *   2. تحليل دوران الموظفين — معدلات الاحتفاظ والمخاطر المتوقعة
 *   3. نقاط مخاطر الموظفين  — درجة مخاطرة لكل موظف بالمغادرة
 *   4. تحليل الرواتب         — التوزيع والفجوات والميزانية
 *   5. لوحة الامتثال        — GOSI / SCFHS / إقامة / عقود
 *   6. مسار التوظيف         — كفاءة الاستقطاب والإحصاءات
 *   7. فاعلية التدريب        — معدلات الإنجاز والعائد
 *   8. توزيع الأداء         — منحنى الجرس والشريحة المتميزة
 *   9. التوصيات الذكية       — إجراءات قابلة للتنفيذ مصنفة بالأولوية
 *
 * تصميم:
 *   - كل النماذج تُحقن عبر DI — لا require على مستوى الوحدة
 *   - كل دالة تتدهور بلطف عند غياب نموذج معين (ترجع null للقسم)
 *   - الأسماء العربية في الواجهة، منطق الأعمال مكتوب بالإنجليزية
 *   - مدة الكاش: 5 دقائق لبيانات الجلسة (عبر Cache المحقون)
 */

const MS_PER_DAY = 24 * 3600 * 1000;
const DAYS_UNTIL_EXPIRY_WARN = 60; // تحذير قبل 60 يوماً من الانتهاء
const TURNOVER_RISK_THRESHOLD_HIGH = 0.7;
const TURNOVER_RISK_THRESHOLD_MEDIUM = 0.4;

// ─── نموذج احتساب درجة مخاطرة الموظف بالمغادرة ─────────────────────────
// الدرجة بين 0 و 1، أعلى = مخاطرة أعلى بالمغادرة
function computeTurnoverRisk(employee, attendance, lastReview) {
  let score = 0;

  // عوامل زيادة المخاطرة
  const absenceRate = attendance ? attendance.absences / Math.max(attendance.workingDays, 1) : 0;
  if (absenceRate > 0.1) score += 0.2;
  else if (absenceRate > 0.05) score += 0.1;

  const lateRate = attendance ? attendance.lates / Math.max(attendance.workingDays, 1) : 0;
  if (lateRate > 0.15) score += 0.15;

  const today = new Date();
  const tenureMonths = employee.hire_date
    ? (today - new Date(employee.hire_date)) / (MS_PER_DAY * 30)
    : 0;
  if (tenureMonths < 6)
    score += 0.15; // موظف جديد — مخاطرة أعلى
  else if (tenureMonths > 36) score -= 0.1; // موظف قديم — مخاطرة أقل

  if (!lastReview || !lastReview.overall_score) score += 0.1;
  else if (lastReview.overall_score < 3) score += 0.2;
  else if (lastReview.overall_score >= 4.5) score -= 0.1;

  if (employee.contract_type === 'fixed') {
    const contractEnd = employee.contract_end_date
      ? (new Date(employee.contract_end_date) - today) / MS_PER_DAY
      : null;
    if (contractEnd !== null && contractEnd < 90) score += 0.25;
  }

  // تطبيع الدرجة بين 0 و 1
  return Math.max(0, Math.min(1, score));
}

// ─── وصف نصي لدرجة المخاطرة ─────────────────────────────────────────────
function riskLabel(score) {
  if (score >= TURNOVER_RISK_THRESHOLD_HIGH) return 'high';
  if (score >= TURNOVER_RISK_THRESHOLD_MEDIUM) return 'medium';
  return 'low';
}

// ─── الخدمة الرئيسية ─────────────────────────────────────────────────────

class HrSmartAnalyticsService {
  /**
   * @param {object} models - النماذج المحقونة
   *   .Employee .Attendance .Leave .LeaveBalance .PayrollRecord .PayrollRun
   *   .PerformanceReview .Certification .EmploymentContract .TrainingPlan
   *   .Recruitment (اختياري)
   * @param {object} options
   *   .cache     — اختياري: كاش Redis مع get(key)/set(key,val,ttl)
   *   .now       — اختياري: دالة () => Date (للاختبار)
   *   .logger    — اختياري
   */
  constructor({ models = {}, options = {} } = {}) {
    this.m = models;
    this.cache = options.cache || null;
    this.now = options.now || (() => new Date());
    this.log = options.logger || console;
  }

  // ───────────────────────────────────────────────────────────────────
  // 1. لوحة القيادة الذكية — نظرة شاملة فورية
  // ───────────────────────────────────────────────────────────────────
  async getIntelligenceDashboard({ branchId } = {}) {
    const scope = branchId ? { branch_id: branchId } : {};
    const today = this.now();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfYear = new Date(today.getFullYear(), 0, 1);
    const last30 = new Date(today - 30 * MS_PER_DAY);
    const last12Start = new Date(today.getFullYear() - 1, today.getMonth(), 1);

    const [
      workforce,
      hiresThisMonth,
      terminationsThisMonth,
      genderBreakdown,
      departmentBreakdown,
      contractTypes,
      salaryStats,
      leaveStats,
    ] = await Promise.all([
      this._safe(() => this.m.Employee.countDocuments({ ...scope, status: 'active' })),
      this._safe(() =>
        this.m.Employee.countDocuments({
          ...scope,
          hire_date: { $gte: startOfMonth },
          status: { $in: ['active', 'probation'] },
        })
      ),
      this._safe(() =>
        this.m.Employee.countDocuments({
          ...scope,
          termination_date: { $gte: startOfMonth },
          status: 'terminated',
        })
      ),
      this._safe(() =>
        this.m.Employee.aggregate([
          { $match: { ...scope, status: 'active' } },
          { $group: { _id: '$gender', count: { $sum: 1 } } },
        ])
      ),
      this._safe(() =>
        this.m.Employee.aggregate([
          { $match: { ...scope, status: 'active' } },
          { $group: { _id: '$department', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ])
      ),
      this._safe(() =>
        this.m.Employee.aggregate([
          { $match: { ...scope, status: 'active' } },
          { $group: { _id: '$contract_type', count: { $sum: 1 } } },
        ])
      ),
      this._safe(() =>
        this.m.Employee.aggregate([
          { $match: { ...scope, status: 'active' } },
          {
            $group: {
              _id: null,
              avg: { $avg: '$basic_salary' },
              min: { $min: '$basic_salary' },
              max: { $max: '$basic_salary' },
              total: {
                $sum: { $add: ['$basic_salary', '$housing_allowance', '$transport_allowance'] },
              },
            },
          },
        ])
      ),
      this._safe(() =>
        this.m.Leave
          ? this.m.Leave.countDocuments({
              ...scope,
              status: 'pending',
              created_at: { $gte: last30 },
            })
          : Promise.resolve(0)
      ),
    ]);

    // نسبة دوران الموظفين (trailing 12 months)
    const [hiresLast12, terminationsLast12] = await Promise.all([
      this._safe(() =>
        this.m.Employee.countDocuments({
          ...scope,
          hire_date: { $gte: last12Start },
        })
      ),
      this._safe(() =>
        this.m.Employee.countDocuments({
          ...scope,
          termination_date: { $gte: last12Start },
          status: 'terminated',
        })
      ),
    ]);

    const avgWorkforce = Math.max(workforce || 1, 1);
    const turnoverRate =
      terminationsLast12 !== null && terminationsLast12 > 0
        ? Math.round((terminationsLast12 / avgWorkforce) * 100 * 10) / 10
        : 0;

    const retentionRate = Math.max(0, 100 - turnoverRate);

    const salaryData = Array.isArray(salaryStats) && salaryStats.length > 0 ? salaryStats[0] : null;

    return {
      workforce: {
        total: workforce ?? 0,
        hiresThisMonth: hiresThisMonth ?? 0,
        terminationsThisMonth: terminationsThisMonth ?? 0,
        genderBreakdown: _groupBy(genderBreakdown),
        departmentBreakdown: departmentBreakdown ?? [],
        contractTypes: _groupBy(contractTypes),
      },
      turnover: {
        rate12m: turnoverRate,
        hires12m: hiresLast12 ?? 0,
        terminations12m: terminationsLast12 ?? 0,
        retentionRate,
      },
      payroll: {
        avgBasicSalary: salaryData ? Math.round(salaryData.avg) : null,
        minSalary: salaryData ? salaryData.min : null,
        maxSalary: salaryData ? salaryData.max : null,
        totalMonthlyBurden: salaryData ? Math.round(salaryData.total) : null,
      },
      leaves: {
        pendingLast30: leaveStats ?? 0,
      },
    };
  }

  // ───────────────────────────────────────────────────────────────────
  // 2. درجات مخاطرة الموظفين (Turnover Risk Scoring)
  // ───────────────────────────────────────────────────────────────────
  async getTurnoverRiskScores({ branchId, department, limit = 20 } = {}) {
    const scope = { status: 'active' };
    if (branchId) scope.branch_id = branchId;
    if (department) scope.department = department;

    const employees = await this._safe(() =>
      this.m.Employee.find(scope)
        .select(
          '_id name_ar name_en department job_title_ar hire_date contract_type contract_end_date basic_salary'
        )
        .lean()
        .limit(200)
    );

    if (!employees || employees.length === 0) return [];

    const today = this.now();
    const since90 = new Date(today - 90 * MS_PER_DAY);

    const [attendanceSummary, reviewSummary] = await Promise.all([
      this._safe(() =>
        this.m.Attendance
          ? this.m.Attendance.aggregate([
              {
                $match: {
                  employee_id: { $in: employees.map(e => e._id) },
                  date: { $gte: since90 },
                },
              },
              {
                $group: {
                  _id: '$employee_id',
                  absences: { $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] } },
                  lates: { $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] } },
                  workingDays: { $sum: 1 },
                },
              },
            ])
          : Promise.resolve([])
      ),
      this._safe(() =>
        this.m.PerformanceReview
          ? this.m.PerformanceReview.aggregate([
              {
                $match: {
                  employee_id: { $in: employees.map(e => e._id) },
                  status: 'completed',
                },
              },
              { $sort: { review_date: -1 } },
              {
                $group: {
                  _id: '$employee_id',
                  overall_score: { $first: '$overall_score' },
                  review_date: { $first: '$review_date' },
                },
              },
            ])
          : Promise.resolve([])
      ),
    ]);

    const attMap = new Map((attendanceSummary || []).map(a => [String(a._id), a]));
    const revMap = new Map((reviewSummary || []).map(r => [String(r._id), r]));

    const scored = employees.map(emp => {
      const att = attMap.get(String(emp._id));
      const rev = revMap.get(String(emp._id));
      const riskScore = computeTurnoverRisk(emp, att, rev);
      return {
        employeeId: emp._id,
        name_ar: emp.name_ar,
        name_en: emp.name_en,
        department: emp.department,
        job_title_ar: emp.job_title_ar,
        riskScore: Math.round(riskScore * 100) / 100,
        riskLevel: riskLabel(riskScore),
        factors: {
          absenceRate: att ? Math.round((att.absences / Math.max(att.workingDays, 1)) * 100) : 0,
          lateRate: att ? Math.round((att.lates / Math.max(att.workingDays, 1)) * 100) : 0,
          lastReviewScore: rev ? rev.overall_score : null,
          tenureMonths: emp.hire_date
            ? Math.round((today - new Date(emp.hire_date)) / (MS_PER_DAY * 30))
            : null,
          contractDaysLeft:
            emp.contract_type === 'fixed' && emp.contract_end_date
              ? Math.round((new Date(emp.contract_end_date) - today) / MS_PER_DAY)
              : null,
        },
      };
    });

    // ترتيب بالمخاطرة الأعلى أولاً
    return scored.sort((a, b) => b.riskScore - a.riskScore).slice(0, limit);
  }

  // ───────────────────────────────────────────────────────────────────
  // 3. لوحة الامتثال — GOSI / SCFHS / إقامة / عقود
  // ───────────────────────────────────────────────────────────────────
  async getComplianceDashboard({ branchId } = {}) {
    const scope = branchId ? { branch_id: branchId, status: 'active' } : { status: 'active' };
    const today = this.now();
    const warn = new Date(today.getTime() + DAYS_UNTIL_EXPIRY_WARN * MS_PER_DAY);

    const [
      totalActive,
      gosiUnregistered,
      scfhsExpiring,
      scfhsExpired,
      iqamaExpiring,
      iqamaExpired,
      contractsExpiring,
      noContractActive,
      certExpiring,
    ] = await Promise.all([
      this._safe(() => this.m.Employee.countDocuments(scope)),
      this._safe(() => this.m.Employee.countDocuments({ ...scope, gosi_registered: false })),
      this._safe(() =>
        this.m.Employee.countDocuments({
          ...scope,
          scfhs_expiry: { $gte: today, $lte: warn },
        })
      ),
      this._safe(() =>
        this.m.Employee.countDocuments({
          ...scope,
          scfhs_expiry: { $lt: today },
        })
      ),
      this._safe(() =>
        this.m.Employee.countDocuments({
          ...scope,
          iqama_expiry: { $gte: today, $lte: warn },
          nationality: { $ne: 'SA' },
        })
      ),
      this._safe(() =>
        this.m.Employee.countDocuments({
          ...scope,
          iqama_expiry: { $lt: today },
          nationality: { $ne: 'SA' },
        })
      ),
      this._safe(() =>
        this.m.EmploymentContract
          ? this.m.EmploymentContract.countDocuments({
              status: 'active',
              end_date: { $gte: today, $lte: warn },
            })
          : Promise.resolve(null)
      ),
      this._safe(() =>
        this.m.EmploymentContract
          ? this.m.EmploymentContract.countDocuments({
              status: 'active',
              end_date: { $lt: today },
            })
          : Promise.resolve(null)
      ),
      this._safe(() =>
        this.m.Certification
          ? this.m.Certification.countDocuments({
              status: 'active',
              expiry_date: { $gte: today, $lte: warn },
            })
          : Promise.resolve(null)
      ),
    ]);

    const total = totalActive ?? 0;
    const complianceScore =
      total > 0
        ? Math.round(
            (1 -
              ((gosiUnregistered ?? 0) + (scfhsExpired ?? 0) + (iqamaExpired ?? 0)) / (total * 3)) *
              100
          )
        : 100;

    const alerts = [];
    if ((gosiUnregistered ?? 0) > 0)
      alerts.push({
        type: 'gosi',
        severity: 'high',
        count: gosiUnregistered,
        label: 'موظفون غير مسجلون في GOSI',
      });
    if ((scfhsExpired ?? 0) > 0)
      alerts.push({
        type: 'scfhs_expired',
        severity: 'critical',
        count: scfhsExpired,
        label: 'تراخيص SCFHS منتهية',
      });
    if ((scfhsExpiring ?? 0) > 0)
      alerts.push({
        type: 'scfhs_expiring',
        severity: 'warning',
        count: scfhsExpiring,
        label: 'تراخيص SCFHS تنتهي قريباً',
      });
    if ((iqamaExpired ?? 0) > 0)
      alerts.push({
        type: 'iqama_expired',
        severity: 'critical',
        count: iqamaExpired,
        label: 'إقامات منتهية',
      });
    if ((iqamaExpiring ?? 0) > 0)
      alerts.push({
        type: 'iqama_expiring',
        severity: 'warning',
        count: iqamaExpiring,
        label: 'إقامات تنتهي قريباً',
      });
    if ((contractsExpiring ?? 0) > 0)
      alerts.push({
        type: 'contracts_expiring',
        severity: 'warning',
        count: contractsExpiring,
        label: 'عقود تنتهي خلال 60 يوماً',
      });
    if ((noContractActive ?? 0) > 0)
      alerts.push({
        type: 'contracts_expired',
        severity: 'high',
        count: noContractActive,
        label: 'عقود منتهية',
      });
    if ((certExpiring ?? 0) > 0)
      alerts.push({
        type: 'certs_expiring',
        severity: 'warning',
        count: certExpiring,
        label: 'شهادات تنتهي قريباً',
      });

    return {
      complianceScore: Math.max(0, Math.min(100, complianceScore)),
      totalActive: total,
      gosi: { unregistered: gosiUnregistered ?? 0 },
      scfhs: { expired: scfhsExpired ?? 0, expiring: scfhsExpiring ?? 0 },
      iqama: { expired: iqamaExpired ?? 0, expiring: iqamaExpiring ?? 0 },
      contracts: { expiring: contractsExpiring ?? null, expired: noContractActive ?? null },
      certifications: { expiring: certExpiring ?? null },
      alerts: alerts.sort((a, b) => {
        const order = { critical: 0, high: 1, warning: 2 };
        return (order[a.severity] ?? 3) - (order[b.severity] ?? 3);
      }),
    };
  }

  // ───────────────────────────────────────────────────────────────────
  // 4. تحليلات الرواتب — التوزيع والفجوات والاتجاهات
  // ───────────────────────────────────────────────────────────────────
  async getPayrollAnalytics({ branchId, month, year } = {}) {
    const today = this.now();
    const m = month ?? today.getMonth() + 1;
    const y = year ?? today.getFullYear();
    const scope = branchId ? { branch_id: branchId } : {};

    const [salaryByDept, payrollRun, genderGap, tenureBands] = await Promise.all([
      this._safe(() =>
        this.m.Employee.aggregate([
          { $match: { ...scope, status: 'active' } },
          {
            $group: {
              _id: '$department',
              avgSalary: { $avg: '$basic_salary' },
              totalBurden: {
                $sum: {
                  $add: [
                    '$basic_salary',
                    { $ifNull: ['$housing_allowance', 0] },
                    { $ifNull: ['$transport_allowance', 0] },
                  ],
                },
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { totalBurden: -1 } },
        ])
      ),
      this._safe(() =>
        this.m.PayrollRun
          ? this.m.PayrollRun.findOne({ month: m, year: y }).lean()
          : Promise.resolve(null)
      ),
      this._safe(() =>
        this.m.Employee.aggregate([
          { $match: { ...scope, status: 'active' } },
          {
            $group: {
              _id: '$gender',
              avgSalary: { $avg: '$basic_salary' },
              count: { $sum: 1 },
            },
          },
        ])
      ),
      this._safe(() =>
        this.m.Employee.aggregate([
          { $match: { ...scope, status: 'active', hire_date: { $exists: true } } },
          {
            $addFields: {
              tenureYears: {
                $divide: [{ $subtract: [today, '$hire_date'] }, MS_PER_DAY * 365],
              },
            },
          },
          {
            $bucket: {
              groupBy: '$tenureYears',
              boundaries: [0, 1, 3, 5, 10, 9999],
              default: 'other',
              output: {
                count: { $sum: 1 },
                avgSalary: { $avg: '$basic_salary' },
              },
            },
          },
        ])
      ),
    ]);

    // فجوة الراتب بين الجنسين
    const gapData = Array.isArray(genderGap) ? genderGap : [];
    const maleData = gapData.find(g => g._id === 'male');
    const femaleData = gapData.find(g => g._id === 'female');
    const genderPayGap =
      maleData && femaleData && maleData.avgSalary > 0
        ? Math.round(
            ((maleData.avgSalary - femaleData.avgSalary) / maleData.avgSalary) * 100 * 10
          ) / 10
        : null;

    return {
      period: { month: m, year: y },
      salaryByDepartment: (salaryByDept ?? []).map(d => ({
        department: d._id,
        avgSalary: Math.round(d.avgSalary),
        totalBurden: Math.round(d.totalBurden),
        headcount: d.count,
      })),
      payrollRun: payrollRun
        ? {
            status: payrollRun.status,
            totalNet: payrollRun.total_net_pay,
            totalDeductions: payrollRun.total_deductions,
            employeeCount: payrollRun.employee_count,
            processedAt: payrollRun.processed_at,
          }
        : null,
      genderPayGap:
        genderPayGap !== null
          ? { gapPercent: genderPayGap, male: maleData, female: femaleData }
          : null,
      tenureBands: (tenureBands ?? []).map(b => ({
        band: b._id,
        count: b.count,
        avgSalary: Math.round(b.avgSalary),
        label:
          b._id === 0
            ? 'أقل من سنة'
            : b._id === 1
              ? '1-3 سنوات'
              : b._id === 3
                ? '3-5 سنوات'
                : b._id === 5
                  ? '5-10 سنوات'
                  : b._id === 10
                    ? 'أكثر من 10 سنوات'
                    : 'أخرى',
      })),
    };
  }

  // ───────────────────────────────────────────────────────────────────
  // 5. توزيع الأداء — منحنى الجرس والشريحة المتميزة
  // ───────────────────────────────────────────────────────────────────
  async getPerformanceDistribution({ branchId, year } = {}) {
    const today = this.now();
    const y = year ?? today.getFullYear();
    const yearStart = new Date(y, 0, 1);
    const yearEnd = new Date(y, 11, 31);
    const scope = branchId ? { branch_id: branchId } : {};

    if (!this.m.PerformanceReview) return null;

    const [distribution, topPerformers, underPerformers, byDept] = await Promise.all([
      this._safe(() =>
        this.m.PerformanceReview.aggregate([
          {
            $match: {
              status: 'completed',
              review_date: { $gte: yearStart, $lte: yearEnd },
            },
          },
          {
            $bucket: {
              groupBy: '$overall_score',
              boundaries: [0, 2, 3, 4, 4.5, 5.01],
              default: 'other',
              output: { count: { $sum: 1 } },
            },
          },
        ])
      ),
      this._safe(() =>
        this.m.PerformanceReview.find({
          status: 'completed',
          review_date: { $gte: yearStart, $lte: yearEnd },
          overall_score: { $gte: 4.5 },
        })
          .populate('employee_id', 'name_ar department job_title_ar', 'Employee')
          .sort({ overall_score: -1 })
          .limit(10)
          .lean()
      ),
      this._safe(() =>
        this.m.PerformanceReview.find({
          status: 'completed',
          review_date: { $gte: yearStart, $lte: yearEnd },
          overall_score: { $lt: 2.5 },
        })
          .populate('employee_id', 'name_ar department', 'Employee')
          .limit(10)
          .lean()
      ),
      this._safe(() =>
        this.m.PerformanceReview.aggregate([
          {
            $match: {
              status: 'completed',
              review_date: { $gte: yearStart, $lte: yearEnd },
            },
          },
          {
            $lookup: {
              from: 'employees',
              localField: 'employee_id',
              foreignField: '_id',
              as: 'emp',
            },
          },
          { $unwind: { path: '$emp', preserveNullAndEmptyArrays: true } },
          {
            $group: {
              _id: '$emp.department',
              avgScore: { $avg: '$overall_score' },
              count: { $sum: 1 },
            },
          },
          { $sort: { avgScore: -1 } },
        ])
      ),
    ]);

    return {
      year: y,
      distribution: (distribution ?? []).map(d => ({
        range:
          d._id === 0
            ? 'ضعيف (0-2)'
            : d._id === 2
              ? 'مقبول (2-3)'
              : d._id === 3
                ? 'جيد (3-4)'
                : d._id === 4
                  ? 'ممتاز (4-4.5)'
                  : d._id === 4.5
                    ? 'متميز (4.5-5)'
                    : 'أخرى',
        count: d.count,
      })),
      topPerformers: (topPerformers ?? []).slice(0, 10),
      underPerformers: (underPerformers ?? []).slice(0, 10),
      byDepartment: byDept ?? [],
    };
  }

  // ───────────────────────────────────────────────────────────────────
  // 6. فاعلية التدريب
  // ───────────────────────────────────────────────────────────────────
  async getTrainingEffectiveness({ branchId, year } = {}) {
    const today = this.now();
    const y = year ?? today.getFullYear();
    const yearStart = new Date(y, 0, 1);
    const yearEnd = new Date(y, 11, 31);

    if (!this.m.TrainingPlan) return null;

    const [stats, byType, completionTrend] = await Promise.all([
      this._safe(() =>
        this.m.TrainingPlan.aggregate([
          {
            $match: {
              start_date: { $gte: yearStart, $lte: yearEnd },
            },
          },
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 },
              totalCost: { $sum: { $ifNull: ['$cost', 0] } },
              totalHours: { $sum: { $ifNull: ['$hours', 0] } },
            },
          },
        ])
      ),
      this._safe(() =>
        this.m.TrainingPlan.aggregate([
          {
            $match: {
              start_date: { $gte: yearStart, $lte: yearEnd },
              status: 'completed',
            },
          },
          {
            $group: {
              _id: '$type',
              count: { $sum: 1 },
              totalHours: { $sum: { $ifNull: ['$hours', 0] } },
            },
          },
          { $sort: { count: -1 } },
        ])
      ),
      this._safe(() =>
        this.m.TrainingPlan.aggregate([
          {
            $match: {
              start_date: { $gte: yearStart, $lte: yearEnd },
            },
          },
          {
            $group: {
              _id: { $month: '$start_date' },
              total: { $sum: 1 },
              completed: {
                $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
              },
            },
          },
          { $sort: { _id: 1 } },
        ])
      ),
    ]);

    const statusSummary = _groupBy(stats);
    const completed = statusSummary.completed || 0;
    const total = Object.values(statusSummary).reduce((s, v) => s + v, 0);

    return {
      year: y,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      totalTrainings: total,
      completedTrainings: completed,
      byStatus: statusSummary,
      byType: byType ?? [],
      monthlyTrend: (completionTrend ?? []).map(t => ({
        month: t._id,
        total: t.total,
        completed: t.completed,
        rate: t.total > 0 ? Math.round((t.completed / t.total) * 100) : 0,
      })),
    };
  }

  // ───────────────────────────────────────────────────────────────────
  // 7. التوصيات الذكية — إجراءات قابلة للتنفيذ
  // ───────────────────────────────────────────────────────────────────
  async getSmartRecommendations({ branchId } = {}) {
    const [compliance, intelligence, riskScores] = await Promise.all([
      this.getComplianceDashboard({ branchId }),
      this.getIntelligenceDashboard({ branchId }),
      this.getTurnoverRiskScores({ branchId, limit: 5 }),
    ]);

    const recommendations = [];

    // توصيات الامتثال
    if (compliance && compliance.gosi.unregistered > 0) {
      recommendations.push({
        id: 'gosi_registration',
        priority: 'critical',
        category: 'compliance',
        title: 'تسجيل موظفين في GOSI',
        description: `${compliance.gosi.unregistered} موظف غير مسجل في نظام GOSI — مطلوب تسجيلهم فوراً لتجنب الغرامات`,
        action: 'navigate',
        target: '/hr/employees?filter=gosi_unregistered',
        count: compliance.gosi.unregistered,
      });
    }

    if (compliance && (compliance.scfhs.expired ?? 0) > 0) {
      recommendations.push({
        id: 'scfhs_renewal',
        priority: 'critical',
        category: 'compliance',
        title: 'تجديد تراخيص SCFHS المنتهية',
        description: `${compliance.scfhs.expired} ترخيص SCFHS منتهٍ — يجب تجديدها فوراً`,
        action: 'navigate',
        target: '/hr/credential-expiry',
        count: compliance.scfhs.expired,
      });
    }

    if (compliance && (compliance.iqama.expired ?? 0) > 0) {
      recommendations.push({
        id: 'iqama_renewal',
        priority: 'critical',
        category: 'compliance',
        title: 'تجديد الإقامات المنتهية',
        description: `${compliance.iqama.expired} إقامة منتهية — يجب التجديد فوراً لتجنب مخالفات نظام العمل`,
        action: 'navigate',
        target: '/hr/work-permits',
        count: compliance.iqama.expired,
      });
    }

    // توصيات دوران الموظفين
    const highRisk = (riskScores ?? []).filter(e => e.riskLevel === 'high');
    if (highRisk.length > 0) {
      recommendations.push({
        id: 'retention_at_risk',
        priority: 'high',
        category: 'retention',
        title: 'موظفون في خطر المغادرة',
        description: `${highRisk.length} موظف بدرجة مخاطرة عالية — يُنصح بمقابلة استبقاء فورية`,
        action: 'navigate',
        target: '/hr/analytics?tab=risk',
        count: highRisk.length,
        employees: highRisk.map(e => ({ name: e.name_ar, score: e.riskScore })),
      });
    }

    // توصيات الأداء
    if (intelligence?.turnover?.rate12m > 15) {
      recommendations.push({
        id: 'high_turnover',
        priority: 'high',
        category: 'workforce',
        title: 'معدل دوران مرتفع',
        description: `معدل دوران ${intelligence.turnover.rate12m}% خلال 12 شهراً — يتجاوز المعيار الصناعي (15%)`,
        action: 'navigate',
        target: '/hr/analytics?tab=turnover',
        count: null,
      });
    }

    // ترتيب بالأولوية
    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    return recommendations.sort((a, b) => (order[a.priority] ?? 4) - (order[b.priority] ?? 4));
  }

  // ───────────────────────────────────────────────────────────────────
  // 8. الحزمة الكاملة — نقطة دخول واحدة للوحة القيادة
  // ───────────────────────────────────────────────────────────────────
  async getFullDashboard({ branchId } = {}) {
    const [intelligence, compliance, payroll, performance, training, riskScores, recommendations] =
      await Promise.all([
        this._safe(() => this.getIntelligenceDashboard({ branchId })),
        this._safe(() => this.getComplianceDashboard({ branchId })),
        this._safe(() => this.getPayrollAnalytics({ branchId })),
        this._safe(() => this.getPerformanceDistribution({ branchId })),
        this._safe(() => this.getTrainingEffectiveness({ branchId })),
        this._safe(() => this.getTurnoverRiskScores({ branchId, limit: 10 })),
        this._safe(() => this.getSmartRecommendations({ branchId })),
      ]);

    return {
      generatedAt: this.now().toISOString(),
      intelligence,
      compliance,
      payroll,
      performance,
      training,
      riskScores,
      recommendations,
    };
  }

  // ─── مساعد: تجاهل الأخطاء وإرجاع null ──────────────────────────────
  async _safe(fn) {
    try {
      return await fn();
    } catch (err) {
      this.log.warn && this.log.warn('[HrSmartAnalytics]', err.message || err);
      return null;
    }
  }
}

// ─── مساعد: تحويل مصفوفة { _id, count } إلى كائن ───────────────────────
function _groupBy(arr) {
  if (!Array.isArray(arr)) return {};
  return arr.reduce((acc, item) => {
    acc[item._id ?? 'unknown'] = item.count ?? item.total ?? 0;
    return acc;
  }, {});
}

module.exports = { HrSmartAnalyticsService };
