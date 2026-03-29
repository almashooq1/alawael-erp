/**
 * Common MongoDB Aggregation Pipelines - Al-Awael ERP
 * خطوط تجميع MongoDB المشتركة
 *
 * Reusable aggregation pipeline stages and complete pipelines for:
 *  - Beneficiary statistics
 *  - HR & employee reports
 *  - Financial summaries
 *  - Rehabilitation program analytics
 *  - Dashboard KPIs
 */

'use strict';

// ══════════════════════════════════════════════════════════════════
// PIPELINE STAGE BUILDERS (reusable stages)
// ══════════════════════════════════════════════════════════════════

const stages = {
  /**
   * Standard match stage with soft-delete filter
   */
  activeOnly: () => ({ $match: { isDeleted: { $ne: true } } }),

  /**
   * Match by branch
   */
  byBranch: branchId => ({
    $match: { branch: { $eq: require('mongoose').Types.ObjectId(branchId) } },
  }),

  /**
   * Date range filter
   */
  dateRange: (field, from, to) => {
    const condition = {};
    if (from) condition.$gte = new Date(from);
    if (to) condition.$lte = new Date(to);
    return { $match: { [field]: condition } };
  },

  /**
   * Paginate: skip + limit
   */
  paginate: (page = 1, limit = 20) => [{ $skip: (page - 1) * limit }, { $limit: limit }],

  /**
   * Sort stage
   */
  sort: (field = 'createdAt', order = -1) => ({
    $sort: { [field]: order },
  }),

  /**
   * Lookup with foreign key
   */
  lookup: (from, localField, foreignField, as) => ({
    $lookup: { from, localField, foreignField, as },
  }),

  /**
   * Unwind with preserveNull
   */
  unwind: (path, preserveNull = true) => ({
    $unwind: { path: `$${path}`, preserveNullAndEmptyArrays: preserveNull },
  }),

  /**
   * Add computed fields
   */
  addFields: fields => ({ $addFields: fields }),

  /**
   * Project only needed fields
   */
  project: fields => ({ $project: fields }),

  /**
   * Facet for parallel aggregations (count + data)
   */
  facetWithCount: (dataPipeline, countPipeline = []) => ({
    $facet: {
      data: dataPipeline,
      total: [...countPipeline, { $count: 'count' }],
    },
  }),
};

// ══════════════════════════════════════════════════════════════════
// BENEFICIARY PIPELINES
// ══════════════════════════════════════════════════════════════════

const beneficiaryPipelines = {
  /**
   * Beneficiary statistics by status
   * Returns: { status, count, percentage }[]
   */
  statusDistribution: (branchId = null) => {
    const match = { isDeleted: { $ne: true } };
    if (branchId) match.branch = branchId;

    return [
      { $match: match },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: null,
          statuses: { $push: { status: '$_id', count: '$count' } },
          total: { $sum: '$count' },
        },
      },
      { $unwind: '$statuses' },
      {
        $project: {
          _id: 0,
          status: '$statuses.status',
          count: '$statuses.count',
          percentage: {
            $round: [{ $multiply: [{ $divide: ['$statuses.count', '$total'] }, 100] }, 1],
          },
        },
      },
      { $sort: { count: -1 } },
    ];
  },

  /**
   * Beneficiary intake trend (monthly)
   * Returns: { year, month, count }[]
   */
  intakeTrend: (months = 12) => {
    const since = new Date();
    since.setMonth(since.getMonth() - months);

    return [
      { $match: { isDeleted: { $ne: true }, createdAt: { $gte: since } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          year: '$_id.year',
          month: '$_id.month',
          count: 1,
        },
      },
      { $sort: { year: 1, month: 1 } },
    ];
  },

  /**
   * Age distribution of beneficiaries
   */
  ageDistribution: () => [
    { $match: { isDeleted: { $ne: true }, dateOfBirth: { $exists: true } } },
    {
      $addFields: {
        ageInYears: {
          $divide: [{ $subtract: [new Date(), '$dateOfBirth'] }, 31536000000],
        },
      },
    },
    {
      $bucket: {
        groupBy: '$ageInYears',
        boundaries: [0, 3, 6, 12, 18, 25, 40, 60, 100],
        default: 'Unknown',
        output: {
          count: { $sum: 1 },
          beneficiaries: { $push: '$_id' },
        },
      },
    },
    {
      $project: {
        _id: 0,
        ageGroup: {
          $switch: {
            branches: [
              { case: { $eq: ['$_id', 0] }, then: '0-3 سنوات' },
              { case: { $eq: ['$_id', 3] }, then: '3-6 سنوات' },
              { case: { $eq: ['$_id', 6] }, then: '6-12 سنة' },
              { case: { $eq: ['$_id', 12] }, then: '12-18 سنة' },
              { case: { $eq: ['$_id', 18] }, then: '18-25 سنة' },
              { case: { $eq: ['$_id', 25] }, then: '25-40 سنة' },
              { case: { $eq: ['$_id', 40] }, then: '40-60 سنة' },
              { case: { $eq: ['$_id', 60] }, then: '60+ سنة' },
            ],
            default: 'غير محدد',
          },
        },
        count: 1,
      },
    },
  ],

  /**
   * Disability type distribution
   */
  disabilityDistribution: () => [
    { $match: { isDeleted: { $ne: true } } },
    {
      $group: {
        _id: '$disabilityType',
        count: { $sum: 1 },
      },
    },
    {
      $lookup: {
        from: 'disabilitytypes',
        localField: '_id',
        foreignField: '_id',
        as: 'disabilityInfo',
      },
    },
    { $unwind: { path: '$disabilityInfo', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 0,
        disabilityType: '$_id',
        nameAr: '$disabilityInfo.name.ar',
        nameEn: '$disabilityInfo.name.en',
        count: 1,
      },
    },
    { $sort: { count: -1 } },
  ],

  /**
   * Waitlist summary
   */
  waitlistSummary: () => [
    {
      $match: {
        isDeleted: { $ne: true },
        status: 'waitlist',
      },
    },
    {
      $addFields: {
        waitDays: {
          $divide: [{ $subtract: [new Date(), '$waitlistDate'] }, 86400000],
        },
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        avgWaitDays: { $avg: '$waitDays' },
        maxWaitDays: { $max: '$waitDays' },
        urgent: {
          $sum: { $cond: [{ $gt: ['$waitDays', 30] }, 1, 0] },
        },
      },
    },
    {
      $project: {
        _id: 0,
        total: 1,
        avgWaitDays: { $round: ['$avgWaitDays', 0] },
        maxWaitDays: { $round: ['$maxWaitDays', 0] },
        urgent: 1,
      },
    },
  ],
};

// ══════════════════════════════════════════════════════════════════
// HR PIPELINES
// ══════════════════════════════════════════════════════════════════

const hrPipelines = {
  /**
   * Headcount by department
   */
  headcountByDepartment: (branchId = null) => {
    const match = { isDeleted: { $ne: true }, status: 'active' };
    if (branchId) match.branch = branchId;

    return [
      { $match: match },
      {
        $group: {
          _id: '$department',
          count: { $sum: 1 },
          avgSalary: { $avg: '$salary.basic' },
        },
      },
      {
        $lookup: {
          from: 'departments',
          localField: '_id',
          foreignField: '_id',
          as: 'deptInfo',
        },
      },
      { $unwind: { path: '$deptInfo', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          department: '$_id',
          nameAr: '$deptInfo.name.ar',
          nameEn: '$deptInfo.name.en',
          headcount: '$count',
          avgSalary: { $round: ['$avgSalary', 2] },
        },
      },
      { $sort: { headcount: -1 } },
    ];
  },

  /**
   * Nationality distribution (Saudization compliance)
   */
  saudizationStats: (branchId = null) => {
    const match = { isDeleted: { $ne: true }, status: 'active' };
    if (branchId) match.branch = branchId;

    return [
      { $match: match },
      {
        $group: {
          _id: '$nationality',
          count: { $sum: 1 },
          totalSalary: { $sum: '$salary.basic' },
        },
      },
      {
        $group: {
          _id: null,
          nationalities: {
            $push: { nationality: '$_id', count: '$count', totalSalary: '$totalSalary' },
          },
          total: { $sum: '$count' },
        },
      },
      { $unwind: '$nationalities' },
      {
        $project: {
          _id: 0,
          nationality: '$nationalities.nationality',
          count: '$nationalities.count',
          totalSalary: '$nationalities.totalSalary',
          percentage: {
            $round: [{ $multiply: [{ $divide: ['$nationalities.count', '$total'] }, 100] }, 1],
          },
          isSaudi: { $eq: ['$nationalities.nationality', 'SA'] },
        },
      },
      { $sort: { count: -1 } },
    ];
  },

  /**
   * Leave utilization report
   */
  leaveUtilization: (year = new Date().getFullYear()) => {
    const start = new Date(`${year}-01-01`);
    const end = new Date(`${year}-12-31`);

    return [
      {
        $match: {
          isDeleted: { $ne: true },
          status: 'approved',
          startDate: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: {
            employee: '$employee',
            leaveType: '$leaveType',
          },
          totalDays: { $sum: '$daysCount' },
          requests: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: '$_id.employee',
          leaves: {
            $push: {
              leaveType: '$_id.leaveType',
              totalDays: '$totalDays',
              requests: '$requests',
            },
          },
          totalLeaveDays: { $sum: '$totalDays' },
        },
      },
      {
        $lookup: {
          from: 'employees',
          localField: '_id',
          foreignField: '_id',
          as: 'employeeInfo',
        },
      },
      { $unwind: { path: '$employeeInfo', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          employeeId: '$_id',
          employeeName: '$employeeInfo.name.ar',
          employeeNumber: '$employeeInfo.employeeNumber',
          leaves: 1,
          totalLeaveDays: 1,
        },
      },
      { $sort: { totalLeaveDays: -1 } },
    ];
  },

  /**
   * Attendance summary (late arrivals, absences)
   */
  attendanceSummary: (from, to, branchId = null) => {
    const match = {
      date: { $gte: new Date(from), $lte: new Date(to) },
    };
    if (branchId) match.branch = branchId;

    return [
      { $match: match },
      {
        $group: {
          _id: '$employee',
          totalDays: { $sum: 1 },
          present: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } },
          absent: { $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] } },
          late: { $sum: { $cond: ['$isLate', 1, 0] } },
          totalLateMinutes: { $sum: { $ifNull: ['$lateMinutes', 0] } },
          totalOvertimeHours: { $sum: { $ifNull: ['$overtimeHours', 0] } },
        },
      },
      {
        $addFields: {
          attendanceRate: {
            $round: [{ $multiply: [{ $divide: ['$present', '$totalDays'] }, 100] }, 1],
          },
        },
      },
      {
        $lookup: {
          from: 'employees',
          localField: '_id',
          foreignField: '_id',
          as: 'emp',
        },
      },
      { $unwind: { path: '$emp', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          employee: '$_id',
          employeeName: '$emp.name.ar',
          employeeNumber: '$emp.employeeNumber',
          department: '$emp.department',
          totalDays: 1,
          present: 1,
          absent: 1,
          late: 1,
          totalLateMinutes: 1,
          totalOvertimeHours: 1,
          attendanceRate: 1,
        },
      },
      { $sort: { attendanceRate: 1 } },
    ];
  },
};

// ══════════════════════════════════════════════════════════════════
// FINANCIAL PIPELINES
// ══════════════════════════════════════════════════════════════════

const financialPipelines = {
  /**
   * Revenue vs Expense summary by period
   */
  incomeStatement: (from, to, branchId = null) => {
    const match = {
      isDeleted: { $ne: true },
      date: { $gte: new Date(from), $lte: new Date(to) },
      status: 'posted',
    };
    if (branchId) match.branch = branchId;

    return [
      { $match: match },
      { $unwind: '$lines' },
      {
        $lookup: {
          from: 'chartofaccounts',
          localField: 'lines.account',
          foreignField: '_id',
          as: 'accountInfo',
        },
      },
      { $unwind: '$accountInfo' },
      {
        $group: {
          _id: {
            accountType: '$accountInfo.accountType',
            accountCode: '$accountInfo.code',
            accountName: '$accountInfo.name',
          },
          totalDebit: { $sum: '$lines.debit' },
          totalCredit: { $sum: '$lines.credit' },
        },
      },
      {
        $group: {
          _id: '$_id.accountType',
          accounts: {
            $push: {
              code: '$_id.accountCode',
              name: '$_id.accountName',
              debit: '$totalDebit',
              credit: '$totalCredit',
              net: { $subtract: ['$totalCredit', '$totalDebit'] },
            },
          },
          totalNet: { $sum: { $subtract: ['$totalCredit', '$totalDebit'] } },
        },
      },
      {
        $project: {
          _id: 0,
          accountType: '$_id',
          accounts: 1,
          totalNet: { $round: ['$totalNet', 2] },
        },
      },
    ];
  },

  /**
   * Accounts receivable aging
   */
  arAging: (asOfDate = new Date()) => [
    {
      $match: {
        isDeleted: { $ne: true },
        type: 'invoice',
        status: { $in: ['posted', 'partial'] },
        dueDate: { $exists: true },
      },
    },
    {
      $addFields: {
        overdueDays: {
          $divide: [{ $subtract: [asOfDate, '$dueDate'] }, 86400000],
        },
        balance: { $subtract: ['$totalAmount', { $ifNull: ['$paidAmount', 0] }] },
      },
    },
    { $match: { balance: { $gt: 0 } } },
    {
      $addFields: {
        agingBucket: {
          $switch: {
            branches: [
              { case: { $lte: ['$overdueDays', 0] }, then: 'current' },
              { case: { $lte: ['$overdueDays', 30] }, then: '1-30' },
              { case: { $lte: ['$overdueDays', 60] }, then: '31-60' },
              { case: { $lte: ['$overdueDays', 90] }, then: '61-90' },
              { case: { $lte: ['$overdueDays', 180] }, then: '91-180' },
            ],
            default: '180+',
          },
        },
      },
    },
    {
      $group: {
        _id: '$agingBucket',
        count: { $sum: 1 },
        totalBalance: { $sum: '$balance' },
      },
    },
    {
      $project: {
        _id: 0,
        bucket: '$_id',
        invoiceCount: '$count',
        totalBalance: { $round: ['$totalBalance', 2] },
      },
    },
    {
      $sort: {
        bucket: 1,
      },
    },
  ],

  /**
   * Monthly revenue breakdown
   */
  revenueByMonth: (year = new Date().getFullYear(), branchId = null) => {
    const match = {
      isDeleted: { $ne: true },
      type: 'invoice',
      status: { $in: ['posted', 'paid', 'partial'] },
      date: {
        $gte: new Date(`${year}-01-01`),
        $lte: new Date(`${year}-12-31`),
      },
    };
    if (branchId) match.branch = branchId;

    return [
      { $match: match },
      {
        $group: {
          _id: { $month: '$date' },
          invoiceCount: { $sum: 1 },
          totalRevenue: { $sum: '$totalAmount' },
          totalCollected: { $sum: { $ifNull: ['$paidAmount', 0] } },
          totalVAT: { $sum: { $ifNull: ['$vatAmount', 0] } },
        },
      },
      {
        $project: {
          _id: 0,
          month: '$_id',
          invoiceCount: 1,
          totalRevenue: { $round: ['$totalRevenue', 2] },
          totalCollected: { $round: ['$totalCollected', 2] },
          totalVAT: { $round: ['$totalVAT', 2] },
          collectionRate: {
            $round: [
              {
                $multiply: [{ $divide: ['$totalCollected', { $max: ['$totalRevenue', 1] }] }, 100],
              },
              1,
            ],
          },
        },
      },
      { $sort: { month: 1 } },
    ];
  },

  /**
   * Payroll summary by department
   */
  payrollSummary: (month, year, branchId = null) => {
    const match = {
      isDeleted: { $ne: true },
      month,
      year,
      status: { $in: ['approved', 'paid'] },
    };
    if (branchId) match.branch = branchId;

    return [
      { $match: match },
      {
        $group: {
          _id: '$department',
          employeeCount: { $sum: 1 },
          basicSalary: { $sum: '$basicSalary' },
          totalAllowances: { $sum: '$totalAllowances' },
          totalDeductions: { $sum: '$totalDeductions' },
          netSalary: { $sum: '$netSalary' },
          gosiEmployee: { $sum: { $ifNull: ['$gosiEmployee', 0] } },
          gosiEmployer: { $sum: { $ifNull: ['$gosiEmployer', 0] } },
        },
      },
      {
        $lookup: {
          from: 'departments',
          localField: '_id',
          foreignField: '_id',
          as: 'dept',
        },
      },
      { $unwind: { path: '$dept', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          department: '$_id',
          deptName: '$dept.name.ar',
          employeeCount: 1,
          basicSalary: { $round: ['$basicSalary', 2] },
          totalAllowances: { $round: ['$totalAllowances', 2] },
          totalDeductions: { $round: ['$totalDeductions', 2] },
          netSalary: { $round: ['$netSalary', 2] },
          gosiEmployee: { $round: ['$gosiEmployee', 2] },
          gosiEmployer: { $round: ['$gosiEmployer', 2] },
          totalCost: {
            $round: [{ $add: ['$netSalary', '$gosiEmployer'] }, 2],
          },
        },
      },
      { $sort: { netSalary: -1 } },
    ];
  },
};

// ══════════════════════════════════════════════════════════════════
// REHABILITATION PIPELINES
// ══════════════════════════════════════════════════════════════════

const rehabPipelines = {
  /**
   * Session completion rate by program
   */
  sessionCompletionByProgram: (from, to, branchId = null) => {
    const match = {
      isDeleted: { $ne: true },
      date: { $gte: new Date(from), $lte: new Date(to) },
    };
    if (branchId) match.branch = branchId;

    return [
      { $match: match },
      {
        $group: {
          _id: '$program',
          total: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
          noShow: { $sum: { $cond: [{ $eq: ['$status', 'no_show'] }, 1, 0] } },
        },
      },
      {
        $addFields: {
          completionRate: {
            $round: [{ $multiply: [{ $divide: ['$completed', { $max: ['$total', 1] }] }, 100] }, 1],
          },
        },
      },
      {
        $lookup: {
          from: 'programs',
          localField: '_id',
          foreignField: '_id',
          as: 'programInfo',
        },
      },
      { $unwind: { path: '$programInfo', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          program: '$_id',
          programName: '$programInfo.name.ar',
          total: 1,
          completed: 1,
          cancelled: 1,
          noShow: 1,
          completionRate: 1,
        },
      },
      { $sort: { total: -1 } },
    ];
  },

  /**
   * Therapist workload (sessions per therapist)
   */
  therapistWorkload: (from, to, branchId = null) => {
    const match = {
      isDeleted: { $ne: true },
      date: { $gte: new Date(from), $lte: new Date(to) },
      status: 'completed',
    };
    if (branchId) match.branch = branchId;

    return [
      { $match: match },
      {
        $group: {
          _id: '$therapist',
          sessionsCount: { $sum: 1 },
          totalMinutes: { $sum: { $ifNull: ['$durationMinutes', 0] } },
          beneficiaries: { $addToSet: '$beneficiary' },
        },
      },
      {
        $addFields: {
          uniqueBeneficiaries: { $size: '$beneficiaries' },
          avgSessionDuration: {
            $round: [{ $divide: ['$totalMinutes', { $max: ['$sessionsCount', 1] }] }, 0],
          },
        },
      },
      {
        $lookup: {
          from: 'employees',
          localField: '_id',
          foreignField: '_id',
          as: 'therapistInfo',
        },
      },
      { $unwind: { path: '$therapistInfo', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          therapist: '$_id',
          therapistName: '$therapistInfo.name.ar',
          specialization: '$therapistInfo.specialization',
          sessionsCount: 1,
          totalMinutes: 1,
          uniqueBeneficiaries: 1,
          avgSessionDuration: 1,
        },
      },
      { $sort: { sessionsCount: -1 } },
    ];
  },

  /**
   * Goal achievement rate per beneficiary
   */
  goalAchievement: (branchId = null) => {
    const match = { isDeleted: { $ne: true } };
    if (branchId) match.branch = branchId;

    return [
      { $match: match },
      { $unwind: '$goals' },
      {
        $group: {
          _id: '$_id',
          totalGoals: { $sum: 1 },
          achieved: {
            $sum: { $cond: [{ $eq: ['$goals.status', 'achieved'] }, 1, 0] },
          },
          inProgress: {
            $sum: { $cond: [{ $eq: ['$goals.status', 'in_progress'] }, 1, 0] },
          },
        },
      },
      {
        $addFields: {
          achievementRate: {
            $round: [
              { $multiply: [{ $divide: ['$achieved', { $max: ['$totalGoals', 1] }] }, 100] },
              1,
            ],
          },
        },
      },
      {
        $lookup: {
          from: 'beneficiaries',
          localField: '_id',
          foreignField: '_id',
          as: 'beneficiaryInfo',
        },
      },
      { $unwind: { path: '$beneficiaryInfo', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          beneficiary: '$_id',
          beneficiaryName: '$beneficiaryInfo.name.ar',
          beneficiaryNumber: '$beneficiaryInfo.beneficiaryNumber',
          totalGoals: 1,
          achieved: 1,
          inProgress: 1,
          achievementRate: 1,
        },
      },
      { $sort: { achievementRate: -1 } },
    ];
  },
};

// ══════════════════════════════════════════════════════════════════
// DASHBOARD KPI PIPELINE
// ══════════════════════════════════════════════════════════════════

const dashboardPipelines = {
  /**
   * System-wide KPIs (multi-collection, must be run separately)
   * Returns individual pipeline configurations
   */
  kpiConfigs: (branchId = null) => {
    const branchMatch = branchId ? { branch: branchId } : {};

    return {
      activeBeneficiaries: {
        collection: 'beneficiaries',
        pipeline: [
          { $match: { ...branchMatch, isDeleted: { $ne: true }, status: 'active' } },
          { $count: 'count' },
        ],
      },
      waitlistCount: {
        collection: 'beneficiaries',
        pipeline: [
          { $match: { ...branchMatch, isDeleted: { $ne: true }, status: 'waitlist' } },
          { $count: 'count' },
        ],
      },
      activeEmployees: {
        collection: 'employees',
        pipeline: [
          { $match: { ...branchMatch, isDeleted: { $ne: true }, status: 'active' } },
          { $count: 'count' },
        ],
      },
      todaySessions: {
        collection: 'sessions',
        pipeline: [
          {
            $match: {
              ...branchMatch,
              isDeleted: { $ne: true },
              date: {
                $gte: new Date(new Date().setHours(0, 0, 0, 0)),
                $lte: new Date(new Date().setHours(23, 59, 59, 999)),
              },
            },
          },
          { $count: 'count' },
        ],
      },
      monthlyRevenue: {
        collection: 'invoices',
        pipeline: [
          {
            $match: {
              ...branchMatch,
              isDeleted: { $ne: true },
              status: { $in: ['posted', 'paid', 'partial'] },
              date: {
                $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                $lte: new Date(),
              },
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: '$totalAmount' },
              collected: { $sum: { $ifNull: ['$paidAmount', 0] } },
            },
          },
        ],
      },
    };
  },
};

// ══════════════════════════════════════════════════════════════════
// PIPELINE FACTORY
// ══════════════════════════════════════════════════════════════════

/**
 * Build a paginated aggregation pipeline with total count
 *
 * @param {Array} basePipeline - Base aggregation stages
 * @param {Object} options - { page, limit, sortField, sortOrder }
 * @returns {Array} Pipeline with $facet for data + total
 */
function buildPaginatedPipeline(basePipeline, options = {}) {
  const { page = 1, limit = 20, sortField = 'createdAt', sortOrder = -1 } = options;

  return [
    ...basePipeline,
    {
      $facet: {
        data: [
          { $sort: { [sortField]: sortOrder } },
          { $skip: (page - 1) * limit },
          { $limit: limit },
        ],
        metadata: [
          { $count: 'total' },
          {
            $addFields: {
              page,
              limit,
              pages: { $ceil: { $divide: ['$total', limit] } },
            },
          },
        ],
      },
    },
    {
      $project: {
        data: 1,
        metadata: { $arrayElemAt: ['$metadata', 0] },
      },
    },
  ];
}

/**
 * Flatten $facet pagination result
 */
function flattenPaginationResult(result) {
  if (!result || !result[0]) return { data: [], metadata: { total: 0, page: 1, pages: 0 } };

  return {
    data: result[0].data || [],
    metadata: result[0].metadata || { total: 0, page: 1, pages: 0 },
  };
}

module.exports = {
  stages,
  beneficiaryPipelines,
  hrPipelines,
  financialPipelines,
  rehabPipelines,
  dashboardPipelines,
  buildPaginatedPipeline,
  flattenPaginationResult,
};
