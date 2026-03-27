/**
 * خدمة التقارير والتحليلات المتقدمة لشؤون الموظفين
 * ─────────────────────────────────────────────────────
 */
'use strict';

class HRAnalyticsService {
  /* ═══════ تقرير القوى العاملة الشامل ═══════ */
  static async workforceReport({ Employee, Department: _Department }) {
    const [byStatus, byDepartment, byType, byNationality, genderDist] = await Promise.all([
      Employee.aggregate([
        { $group: { _id: { $ifNull: ['$status', '$jobInfo.status'] }, count: { $sum: 1 } } },
      ]),
      Employee.aggregate([
        {
          $group: { _id: { $ifNull: ['$department', '$jobInfo.department'] }, count: { $sum: 1 } },
        },
        { $sort: { count: -1 } },
        { $limit: 20 },
      ]),
      Employee.aggregate([
        {
          $group: {
            _id: { $ifNull: ['$employmentType', '$jobInfo.employmentType'] },
            count: { $sum: 1 },
          },
        },
      ]),
      Employee.aggregate([
        {
          $group: {
            _id: { $ifNull: ['$nationality', '$personalInfo.nationality'] },
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      Employee.aggregate([
        { $group: { _id: { $ifNull: ['$gender', '$personalInfo.gender'] }, count: { $sum: 1 } } },
      ]),
    ]);

    const total = byStatus.reduce((s, r) => s + r.count, 0);

    return {
      total,
      distribution: {
        byStatus: byStatus.map(r => ({ status: r._id || 'غير محدد', count: r.count })),
        byDepartment: byDepartment.map(r => ({ department: r._id || 'غير محدد', count: r.count })),
        byType: byType.map(r => ({ type: r._id || 'غير محدد', count: r.count })),
        byNationality: byNationality.map(r => ({
          nationality: r._id || 'غير محدد',
          count: r.count,
        })),
        byGender: genderDist.map(r => ({ gender: r._id || 'غير محدد', count: r.count })),
      },
      generatedAt: new Date(),
    };
  }

  /* ═══════ تقرير الإجازات ═══════ */
  static async leaveReport(filters, { Employee: _Employee, LeaveRequest }) {
    const { startDate, endDate, department: _dept } = filters || {};
    const match = {};
    if (startDate) match.startDate = { $gte: new Date(startDate) };
    if (endDate) match.endDate = { ...(match.endDate || {}), $lte: new Date(endDate) };

    const [byType, byStatus, byMonth] = await Promise.all([
      LeaveRequest.aggregate([
        { $match: match },
        { $group: { _id: '$leaveType', count: { $sum: 1 }, totalDays: { $sum: '$duration' } } },
        { $sort: { count: -1 } },
      ]),
      LeaveRequest.aggregate([
        { $match: match },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      LeaveRequest.aggregate([
        { $match: match },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$startDate' } },
            count: { $sum: 1 },
            totalDays: { $sum: '$duration' },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    return {
      filters,
      summary: {
        totalRequests: byStatus.reduce((s, r) => s + r.count, 0),
        approved:
          byStatus.find(r => ['approved', 'موافق عليه', 'موافق'].includes(r._id))?.count || 0,
        rejected: byStatus.find(r => ['rejected', 'مرفوض'].includes(r._id))?.count || 0,
        pending:
          byStatus.find(r => ['pending', 'معلق', 'مرسل', 'قيد المراجعة'].includes(r._id))?.count ||
          0,
      },
      byType: byType.map(r => ({ type: r._id, count: r.count, totalDays: r.totalDays || 0 })),
      byStatus: byStatus.map(r => ({ status: r._id, count: r.count })),
      trend: byMonth.map(r => ({ month: r._id, count: r.count, totalDays: r.totalDays || 0 })),
      generatedAt: new Date(),
    };
  }

  /* ═══════ تقرير الحضور والانصراف ═══════ */
  static async attendanceReport(filters, { Employee: _Employee2, Attendance }) {
    const { startDate, endDate, department: _dept2 } = filters || {};
    const match = {};
    if (startDate) match.date = { $gte: new Date(startDate) };
    if (endDate) match.date = { ...(match.date || {}), $lte: new Date(endDate) };

    const [byStatus, byMonth, overtime] = await Promise.all([
      Attendance.aggregate([{ $match: match }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      Attendance.aggregate([
        { $match: match },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$date' } },
            total: { $sum: 1 },
            present: { $sum: { $cond: [{ $in: ['$status', ['present', 'حاضر']] }, 1, 0] } },
            absent: { $sum: { $cond: [{ $in: ['$status', ['absent', 'غائب']] }, 1, 0] } },
            late: { $sum: { $cond: [{ $in: ['$status', ['late', 'متأخر']] }, 1, 0] } },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Attendance.aggregate([
        { $match: { ...match, $or: [{ overtime: { $gt: 0 } }, { overtimeHours: { $gt: 0 } }] } },
        {
          $group: {
            _id: null,
            totalOvertimeHours: { $sum: { $ifNull: ['$overtimeHours', '$overtime'] } },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const total = byStatus.reduce((s, r) => s + r.count, 0);

    return {
      filters,
      summary: {
        totalRecords: total,
        present: byStatus.find(r => ['present', 'حاضر'].includes(r._id))?.count || 0,
        absent: byStatus.find(r => ['absent', 'غائب'].includes(r._id))?.count || 0,
        late: byStatus.find(r => ['late', 'متأخر'].includes(r._id))?.count || 0,
        attendanceRate:
          total > 0
            ? +(
                ((byStatus.find(r => ['present', 'حاضر'].includes(r._id))?.count || 0) / total) *
                100
              ).toFixed(1)
            : 0,
        totalOvertimeHours: overtime[0]?.totalOvertimeHours || 0,
      },
      byStatus: byStatus.map(r => ({ status: r._id, count: r.count })),
      trend: byMonth,
      generatedAt: new Date(),
    };
  }

  /* ═══════ تقرير الرواتب ═══════ */
  static async payrollReport(filters, { Payroll }) {
    const { month, year } = filters || {};
    const match = {};
    if (month) match.month = month;
    if (year) match.year = parseInt(year);

    const [summary, byDept] = await Promise.all([
      Payroll.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            totalGross: { $sum: { $ifNull: ['$totalGross', '$baseSalary'] } },
            totalNet: { $sum: { $ifNull: ['$totalNet', '$netSalary'] } },
            totalDeductions: { $sum: '$totalDeductions' },
            count: { $sum: 1 },
            avgSalary: { $avg: { $ifNull: ['$totalGross', '$baseSalary'] } },
            maxSalary: { $max: { $ifNull: ['$totalGross', '$baseSalary'] } },
            minSalary: { $min: { $ifNull: ['$totalGross', '$baseSalary'] } },
          },
        },
      ]),
      Payroll.aggregate([
        { $match: match },
        {
          $group: {
            _id: '$department',
            totalGross: { $sum: { $ifNull: ['$totalGross', '$baseSalary'] } },
            count: { $sum: 1 },
            avgSalary: { $avg: { $ifNull: ['$totalGross', '$baseSalary'] } },
          },
        },
        { $sort: { totalGross: -1 } },
      ]),
    ]);

    return {
      filters,
      summary: summary[0] || { totalGross: 0, totalNet: 0, totalDeductions: 0, count: 0 },
      byDepartment: byDept.map(r => ({
        department: r._id || 'غير محدد',
        employees: r.count,
        totalGross: r.totalGross,
        avgSalary: Math.round(r.avgSalary || 0),
      })),
      generatedAt: new Date(),
    };
  }

  /* ═══════ تقرير الأداء ═══════ */
  static async performanceReport(filters, { PerformanceEvaluation }) {
    const match = {};
    if (filters?.year) match.year = parseInt(filters.year);

    const [distribution, trend] = await Promise.all([
      PerformanceEvaluation.aggregate([
        { $match: match },
        {
          $group: {
            _id: {
              $switch: {
                branches: [
                  {
                    case: {
                      $gte: [{ $ifNull: ['$overallRating', '$ratings.overallPerformance'] }, 4.5],
                    },
                    then: 'ممتاز',
                  },
                  {
                    case: {
                      $gte: [{ $ifNull: ['$overallRating', '$ratings.overallPerformance'] }, 3.5],
                    },
                    then: 'جيد جداً',
                  },
                  {
                    case: {
                      $gte: [{ $ifNull: ['$overallRating', '$ratings.overallPerformance'] }, 2.5],
                    },
                    then: 'جيد',
                  },
                  {
                    case: {
                      $gte: [{ $ifNull: ['$overallRating', '$ratings.overallPerformance'] }, 1.5],
                    },
                    then: 'مقبول',
                  },
                ],
                default: 'ضعيف',
              },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ]),
      PerformanceEvaluation.aggregate([
        {
          $group: {
            _id: { $dateToString: { format: '%Y', date: '$createdAt' } },
            avgRating: { $avg: { $ifNull: ['$overallRating', '$ratings.overallPerformance'] } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    return {
      filters,
      distribution: distribution.map(r => ({ rating: r._id, count: r.count })),
      trend: trend.map(r => ({
        year: r._id,
        avgRating: +(r.avgRating || 0).toFixed(2),
        evaluations: r.count,
      })),
      generatedAt: new Date(),
    };
  }

  /* ═══════ مؤشرات السعودة ═══════ */
  static async saudizationReport({ Employee }) {
    const [byNationality, byDept] = await Promise.all([
      Employee.aggregate([
        { $match: { status: { $in: ['active', 'نشط'] } } },
        {
          $group: {
            _id: {
              $cond: [
                {
                  $in: [
                    { $ifNull: ['$nationality', '$personalInfo.nationality'] },
                    ['سعودي', 'سعودية', 'Saudi'],
                  ],
                },
                'سعودي',
                'غير سعودي',
              ],
            },
            count: { $sum: 1 },
          },
        },
      ]),
      Employee.aggregate([
        { $match: { status: { $in: ['active', 'نشط'] } } },
        {
          $group: {
            _id: { $ifNull: ['$department', '$jobInfo.department'] },
            total: { $sum: 1 },
            saudi: {
              $sum: {
                $cond: [
                  {
                    $in: [
                      { $ifNull: ['$nationality', '$personalInfo.nationality'] },
                      ['سعودي', 'سعودية', 'Saudi'],
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
        { $sort: { total: -1 } },
      ]),
    ]);

    const totalSaudi = byNationality.find(r => r._id === 'سعودي')?.count || 0;
    const totalNonSaudi = byNationality.find(r => r._id === 'غير سعودي')?.count || 0;
    const total = totalSaudi + totalNonSaudi;
    const saudizationRate = total > 0 ? +((totalSaudi / total) * 100).toFixed(1) : 0;

    // تحديد فئة نطاقات
    let nitaqatCategory = 'أحمر';
    if (saudizationRate >= 80) nitaqatCategory = 'بلاتيني';
    else if (saudizationRate >= 60) nitaqatCategory = 'أخضر مرتفع';
    else if (saudizationRate >= 40) nitaqatCategory = 'أخضر';
    else if (saudizationRate >= 25) nitaqatCategory = 'أصفر';

    return {
      overall: {
        total,
        saudi: totalSaudi,
        nonSaudi: totalNonSaudi,
        saudizationRate,
        nitaqatCategory,
      },
      byDepartment: byDept.map(r => ({
        department: r._id || 'غير محدد',
        total: r.total,
        saudi: r.saudi,
        rate: r.total > 0 ? +((r.saudi / r.total) * 100).toFixed(1) : 0,
      })),
      generatedAt: new Date(),
    };
  }
}

module.exports = HRAnalyticsService;
