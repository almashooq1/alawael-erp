/**
 * خدمة الذكاء الاصطناعي لشؤون الموظفين (HR AI Service)
 * ─────────────────────────────────────────────────────
 * تحليلات تنبؤية، توصيات ذكية، كشف أنماط
 */
'use strict';

class HRAIService {
  /* ═══════════════════════════════════════════════════
   *  1) تنبؤ مخاطر استقالة الموظفين (Attrition Risk)
   * ═══════════════════════════════════════════════════ */
  static async predictAttritionRisk(
    employeeId,
    { Employee, Attendance, LeaveRequest, PerformanceEvaluation }
  ) {
    const emp = await Employee.findById(employeeId).lean();
    if (!emp) throw new Error('الموظف غير موجود');

    const now = new Date();
    const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);

    // جمع البيانات
    const [attendanceRecords, leaveRecords, perfRecords] = await Promise.all([
      Attendance.find({ employeeId, date: { $gte: sixMonthsAgo } }).lean(),
      LeaveRequest.find({ employeeId, createdAt: { $gte: sixMonthsAgo } }).lean(),
      PerformanceEvaluation
        ? PerformanceEvaluation.find({ employeeId }).sort({ createdAt: -1 }).limit(2).lean()
        : [],
    ]);

    // حساب المؤشرات
    const factors = {};
    let riskScore = 0;

    // 1. مدة الخدمة — أقل من سنة = خطر أعلى
    const joinDate = emp.jobInfo?.joinDate || emp.joinDate || emp.createdAt;
    const yearsOfService = joinDate
      ? (now - new Date(joinDate)) / (365.25 * 24 * 60 * 60 * 1000)
      : 0;
    if (yearsOfService < 1) {
      riskScore += 20;
      factors.tenure = 'أقل من سنة';
    } else if (yearsOfService < 2) {
      riskScore += 10;
      factors.tenure = 'سنة إلى سنتين';
    } else {
      factors.tenure = `${yearsOfService.toFixed(1)} سنوات`;
    }

    // 2. معدل الغياب
    const totalDays = attendanceRecords.length || 1;
    const absentDays = attendanceRecords.filter(a =>
      ['absent', 'غائب'].includes(a.status?.toLowerCase?.())
    ).length;
    const absenceRate = (absentDays / totalDays) * 100;
    if (absenceRate > 15) {
      riskScore += 25;
      factors.absence = 'غياب مرتفع جداً';
    } else if (absenceRate > 8) {
      riskScore += 15;
      factors.absence = 'غياب مرتفع';
    } else if (absenceRate > 4) {
      riskScore += 5;
      factors.absence = 'غياب متوسط';
    } else {
      factors.absence = 'غياب منخفض';
    }

    // 3. نمط الإجازات — طلبات كثيرة أو إجازات بدون راتب
    const unpaidLeaves = leaveRecords.filter(l =>
      ['بدون راتب', 'unpaid', 'استثنائية'].includes(l.leaveType?.toLowerCase?.())
    ).length;
    if (unpaidLeaves >= 3) {
      riskScore += 20;
      factors.unpaidLeave = 'إجازات بدون راتب متكررة';
    } else if (unpaidLeaves >= 1) {
      riskScore += 8;
      factors.unpaidLeave = 'إجازة بدون راتب';
    }

    // 4. انخفاض الأداء
    if (perfRecords.length >= 1) {
      const latestRating =
        perfRecords[0]?.overallRating || perfRecords[0]?.ratings?.overallPerformance || 0;
      if (latestRating <= 2) {
        riskScore += 25;
        factors.performance = 'أداء ضعيف';
      } else if (latestRating <= 3) {
        riskScore += 10;
        factors.performance = 'أداء متوسط';
      } else {
        factors.performance = 'أداء جيد';
      }

      // تراجع الأداء بين آخر تقييمين
      if (perfRecords.length >= 2) {
        const prev =
          perfRecords[1]?.overallRating || perfRecords[1]?.ratings?.overallPerformance || 0;
        if (prev > latestRating) {
          riskScore += 10;
          factors.performanceTrend = 'تراجع في الأداء';
        }
      }
    }

    // 5. عدم الترقية لفترة طويلة
    if (yearsOfService > 3 && !emp.lastPromotionDate) {
      riskScore += 15;
      factors.promotion = 'لم تتم ترقيته منذ أكثر من 3 سنوات';
    }

    // تطبيع النتيجة
    riskScore = Math.min(riskScore, 100);

    const riskLevel =
      riskScore >= 75 ? 'حرج' : riskScore >= 50 ? 'عالي' : riskScore >= 25 ? 'متوسط' : 'منخفض';

    // توصيات ذكية
    const recommendations = [];
    if (riskScore >= 50) {
      recommendations.push('عقد اجتماع مع الموظف لفهم التحديات');
      if (factors.performance === 'أداء ضعيف' || factors.performanceTrend) {
        recommendations.push('وضع خطة تطوير أداء فردية (PIP)');
      }
      if (factors.promotion) {
        recommendations.push('مراجعة فرص الترقية أو التحويل الداخلي');
      }
      if (factors.absence === 'غياب مرتفع جداً') {
        recommendations.push('التحقق من أسباب الغياب — صحية/عائلية/وظيفية');
      }
    }
    if (riskScore >= 25) {
      recommendations.push('تسجيل الموظف في برنامج تدريبي مناسب');
      recommendations.push('ربطه بمرشد (Mentor) في الوحدة');
    }

    return {
      employeeId,
      employeeName: emp.personalInfo?.firstName || emp.name || emp.fullName,
      riskScore,
      riskLevel,
      factors,
      recommendations,
      analyzedAt: new Date(),
    };
  }

  /* ═══════════════════════════════════════════════════
   *  2) توصيات التدريب الذكية
   * ═══════════════════════════════════════════════════ */
  static async suggestTraining(
    employeeId,
    { Employee, PerformanceEvaluation, CareerPath, TrainingPlan }
  ) {
    const emp = await Employee.findById(employeeId).lean();
    if (!emp) throw new Error('الموظف غير موجود');

    const suggestions = [];

    // فجوات المهارات من المسار الوظيفي
    if (CareerPath) {
      const cp = await CareerPath.findOne({ employeeId, status: 'نشط' }).lean();
      if (cp?.skillGaps) {
        for (const gap of cp.skillGaps.filter(g => g.gap > 2)) {
          suggestions.push({
            type: 'skill_gap',
            skill: gap.skillName,
            priority: gap.gap >= 5 ? 10 : gap.gap >= 3 ? 7 : 4,
            reason: `فجوة مهارة "${gap.skillName}": المستوى الحالي ${gap.currentLevel}/10، المطلوب ${gap.requiredLevel}/10`,
            suggestedCourses: gap.suggestedActions || [],
          });
        }
      }
    }

    // نقاط ضعف من آخر تقييم أداء
    if (PerformanceEvaluation) {
      const perf = await PerformanceEvaluation.findOne({ employeeId })
        .sort({ createdAt: -1 })
        .lean();
      if (perf?.weaknesses?.length) {
        for (const w of perf.weaknesses) {
          suggestions.push({
            type: 'performance_weakness',
            skill: w,
            priority: 6,
            reason: `نقطة ضعف في تقييم الأداء: ${w}`,
          });
        }
      }
      if (perf?.developmentPlan?.length) {
        for (const dp of perf.developmentPlan) {
          suggestions.push({
            type: 'development_plan',
            skill: dp.area || dp,
            priority: 8,
            reason: `خطة تطوير: ${dp.area || dp}`,
          });
        }
      }
    }

    // إزالة التكرار
    const uniqueSkills = new Set();
    const filtered = suggestions.filter(s => {
      const key = `${s.type}_${s.skill}`;
      if (uniqueSkills.has(key)) return false;
      uniqueSkills.add(key);
      return true;
    });

    // ترتيب حسب الأولوية
    filtered.sort((a, b) => b.priority - a.priority);

    // التحقق من الدورات المكتملة سابقاً
    if (TrainingPlan) {
      const completed = await TrainingPlan.find({
        employeeId,
        'items.status': 'مكتمل',
      }).lean();
      const completedSkills = new Set();
      for (const plan of completed) {
        for (const item of plan.items || []) {
          if (item.status === 'مكتمل') {
            (item.skillsCovered || []).forEach(s => completedSkills.add(s.toLowerCase()));
          }
        }
      }
      // تعليم المهارات المكتملة
      for (const s of filtered) {
        if (completedSkills.has(s.skill?.toLowerCase?.())) {
          s.alreadyTrained = true;
          s.note = 'تم التدريب سابقاً — يُقترح مراجعة المستوى';
        }
      }
    }

    return {
      employeeId,
      suggestions: filtered.slice(0, 15),
      totalSuggestions: filtered.length,
      analyzedAt: new Date(),
    };
  }

  /* ═══════════════════════════════════════════════════
   *  3) تحليل أنماط الحضور الذكي
   * ═══════════════════════════════════════════════════ */
  static async analyzeAttendancePatterns(departmentId, { Employee, Attendance }) {
    const threeMonthsAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    const query = departmentId ? { department: departmentId } : {};
    const employees = await Employee.find(query).select('_id personalInfo jobInfo name').lean();
    const empIds = employees.map(e => e._id);

    const records = await Attendance.find({
      employeeId: { $in: empIds },
      date: { $gte: threeMonthsAgo },
    }).lean();

    // تجميع حسب يوم الأسبوع
    const dayOfWeekStats = [0, 0, 0, 0, 0, 0, 0]; // Sun-Sat
    const dayOfWeekAbsent = [0, 0, 0, 0, 0, 0, 0];
    const dayNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

    // تجميع حسب الموظف
    const empStats = {};

    for (const r of records) {
      const d = new Date(r.date).getDay();
      dayOfWeekStats[d]++;
      if (['absent', 'غائب'].includes(r.status?.toLowerCase?.())) {
        dayOfWeekAbsent[d]++;
      }

      const eid = r.employeeId?.toString();
      if (!empStats[eid]) empStats[eid] = { total: 0, absent: 0, late: 0, overtime: 0 };
      empStats[eid].total++;
      if (['absent', 'غائب'].includes(r.status?.toLowerCase?.())) empStats[eid].absent++;
      if (['late', 'متأخر'].includes(r.status?.toLowerCase?.())) empStats[eid].late++;
      if (r.overtime > 0 || r.overtimeHours > 0) empStats[eid].overtime++;
    }

    // أنماط مكتشفة
    const patterns = [];

    // أيام بها غياب مرتفع
    for (let i = 0; i < 7; i++) {
      if (dayOfWeekStats[i] > 0) {
        const rate = (dayOfWeekAbsent[i] / dayOfWeekStats[i]) * 100;
        if (rate > 15) {
          patterns.push({
            type: 'high_absence_day',
            description: `نسبة غياب مرتفعة يوم ${dayNames[i]} (${rate.toFixed(1)}%)`,
            severity: rate > 25 ? 'عالي' : 'متوسط',
            dayOfWeek: dayNames[i],
            rate: Math.round(rate),
          });
        }
      }
    }

    // موظفون بأنماط مقلقة
    const flaggedEmployees = [];
    for (const [eid, stats] of Object.entries(empStats)) {
      const absenceRate = stats.total > 0 ? (stats.absent / stats.total) * 100 : 0;
      const lateRate = stats.total > 0 ? (stats.late / stats.total) * 100 : 0;

      if (absenceRate > 15 || lateRate > 20) {
        const empInfo = employees.find(e => e._id.toString() === eid);
        flaggedEmployees.push({
          employeeId: eid,
          name: empInfo?.personalInfo?.firstName || empInfo?.name || 'غير معروف',
          department: empInfo?.jobInfo?.department || empInfo?.department,
          absenceRate: Math.round(absenceRate),
          lateRate: Math.round(lateRate),
          flags: [
            absenceRate > 15 ? 'غياب مرتفع' : null,
            lateRate > 20 ? 'تأخر متكرر' : null,
          ].filter(Boolean),
        });
      }
    }

    flaggedEmployees.sort((a, b) => b.absenceRate - a.absenceRate);

    return {
      period: { from: threeMonthsAgo, to: new Date() },
      totalEmployees: employees.length,
      totalRecords: records.length,
      dayOfWeekAnalysis: dayNames.map((name, i) => ({
        day: name,
        total: dayOfWeekStats[i],
        absent: dayOfWeekAbsent[i],
        rate:
          dayOfWeekStats[i] > 0 ? Math.round((dayOfWeekAbsent[i] / dayOfWeekStats[i]) * 100) : 0,
      })),
      patterns,
      flaggedEmployees: flaggedEmployees.slice(0, 20),
      analyzedAt: new Date(),
    };
  }

  /* ═══════════════════════════════════════════════════
   *  4) تحليل فجوة المهارات على مستوى القسم
   * ═══════════════════════════════════════════════════ */
  static async departmentSkillGapAnalysis(departmentId, { Employee, CareerPath }) {
    const employees = await Employee.find({
      $or: [{ department: departmentId }, { 'jobInfo.department': departmentId }],
    })
      .select('_id personalInfo jobInfo name')
      .lean();

    const empIds = employees.map(e => e._id);
    const paths = await CareerPath.find({
      employeeId: { $in: empIds },
      status: 'نشط',
    }).lean();

    // تجميع فجوات المهارات
    const skillMap = {};
    for (const cp of paths) {
      for (const sg of cp.skillGaps || []) {
        if (!skillMap[sg.skillName]) {
          skillMap[sg.skillName] = { skill: sg.skillName, employees: 0, totalGap: 0, avgGap: 0 };
        }
        skillMap[sg.skillName].employees++;
        skillMap[sg.skillName].totalGap += sg.gap || 0;
      }
    }

    const skills = Object.values(skillMap);
    skills.forEach(s => {
      s.avgGap = s.employees > 0 ? +(s.totalGap / s.employees).toFixed(1) : 0;
    });
    skills.sort((a, b) => b.avgGap - a.avgGap || b.employees - a.employees);

    // توصيات
    const recommendations = [];
    const critical = skills.filter(s => s.avgGap >= 4);
    if (critical.length > 0) {
      recommendations.push(
        `يُوصى بتنظيم ${critical.length} دورة تدريبية عاجلة للمهارات الحرجة: ${critical.map(s => s.skill).join('، ')}`
      );
    }
    const widespread = skills.filter(s => s.employees >= Math.ceil(employees.length * 0.5));
    if (widespread.length > 0) {
      recommendations.push(
        `مهارات يحتاجها أكثر من نصف القسم: ${widespread.map(s => s.skill).join('، ')} — يُقترح ورش عمل جماعية`
      );
    }

    return {
      departmentId,
      totalEmployees: employees.length,
      employeesWithPaths: paths.length,
      topSkillGaps: skills.slice(0, 15),
      recommendations,
      analyzedAt: new Date(),
    };
  }

  /* ═══════════════════════════════════════════════════
   *  5) لوحة التحكم الذكية — مؤشرات HR الرئيسية
   * ═══════════════════════════════════════════════════ */
  static async smartDashboard({ Employee, Attendance, LeaveRequest, _Payroll, Onboarding }) {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const [
      totalEmployees,
      activeEmployees,
      newHiresThisMonth,
      terminatedThisYear,
      pendingLeaves,
      onboardingInProgress,
      attendanceToday,
    ] = await Promise.all([
      Employee.countDocuments(),
      Employee.countDocuments({ status: { $in: ['active', 'نشط'] } }),
      Employee.countDocuments({ createdAt: { $gte: thisMonth } }),
      Employee.countDocuments({
        status: { $in: ['terminated', 'منتهي'] },
        updatedAt: { $gte: startOfYear },
      }),
      LeaveRequest
        ? LeaveRequest.countDocuments({
            status: { $in: ['pending', 'معلق', 'مرسل', 'قيد المراجعة'] },
          })
        : 0,
      Onboarding ? Onboarding.countDocuments({ status: { $in: ['جاري', 'لم يبدأ'] } }) : 0,
      Attendance
        ? Attendance.countDocuments({
            date: {
              $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
              $lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
            },
          })
        : 0,
    ]);

    // معدل الدوران السنوي
    const turnoverRate =
      totalEmployees > 0 ? +((terminatedThisYear / totalEmployees) * 100).toFixed(1) : 0;

    // معدل الحضور اليوم
    const attendanceRate =
      activeEmployees > 0 ? +((attendanceToday / activeEmployees) * 100).toFixed(1) : 0;

    // تنبيهات ذكية
    const alerts = [];
    if (turnoverRate > 15)
      alerts.push({ level: 'حرج', message: `معدل الدوران (${turnoverRate}%) فوق الحد الآمن` });
    if (pendingLeaves > 10)
      alerts.push({ level: 'تحذير', message: `${pendingLeaves} طلب إجازة بانتظار الموافقة` });
    if (attendanceRate < 70)
      alerts.push({ level: 'تحذير', message: `نسبة الحضور اليوم ${attendanceRate}% — منخفضة` });
    if (onboardingInProgress > 5)
      alerts.push({
        level: 'معلومة',
        message: `${onboardingInProgress} موظف جديد في مرحلة التهيئة`,
      });

    return {
      kpis: {
        totalEmployees,
        activeEmployees,
        newHiresThisMonth,
        terminatedThisYear,
        turnoverRate,
        attendanceRate,
        pendingLeaves,
        onboardingInProgress,
      },
      alerts,
      generatedAt: now,
    };
  }

  /* ═══════════════════════════════════════════════════
   *  6) توصيات الترقية الذكية
   * ═══════════════════════════════════════════════════ */
  static async promotionRecommendations({ Employee, PerformanceEvaluation, CareerPath }) {
    // موظفون نشطون لأكثر من سنتين
    const twoYearsAgo = new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000);

    const candidates = await Employee.find({
      status: { $in: ['active', 'نشط'] },
      $or: [
        { 'jobInfo.joinDate': { $lte: twoYearsAgo } },
        { joinDate: { $lte: twoYearsAgo } },
        { createdAt: { $lte: twoYearsAgo } },
      ],
    })
      .select('_id personalInfo jobInfo name department')
      .lean();

    const results = [];

    for (const emp of candidates.slice(0, 100)) {
      // حد 100 لتجنب بطء
      let score = 0;
      const reasons = [];

      // تقييم الأداء
      if (PerformanceEvaluation) {
        const perfs = await PerformanceEvaluation.find({ employeeId: emp._id })
          .sort({ createdAt: -1 })
          .limit(3)
          .lean();

        if (perfs.length >= 2) {
          const avgRating =
            perfs.reduce((s, p) => s + (p.overallRating || p.ratings?.overallPerformance || 0), 0) /
            perfs.length;

          if (avgRating >= 4.5) {
            score += 40;
            reasons.push('أداء ممتاز متسق');
          } else if (avgRating >= 4) {
            score += 30;
            reasons.push('أداء جيد جداً');
          } else if (avgRating >= 3.5) {
            score += 15;
            reasons.push('أداء جيد');
          }

          // تحسّن مستمر
          if (perfs.length >= 2) {
            const latest = perfs[0]?.overallRating || perfs[0]?.ratings?.overallPerformance || 0;
            const prev = perfs[1]?.overallRating || perfs[1]?.ratings?.overallPerformance || 0;
            if (latest > prev) {
              score += 10;
              reasons.push('تحسّن مستمر في الأداء');
            }
          }
        }
      }

      // استعداد المسار الوظيفي
      if (CareerPath) {
        const cp = await CareerPath.findOne({ employeeId: emp._id, status: 'نشط' }).lean();
        if (cp?.aiAnalysis?.readinessScore >= 75) {
          score += 20;
          reasons.push(`جاهزية عالية (${cp.aiAnalysis.readinessScore}%)`);
        }
        if (cp?.skillGaps?.length === 0) {
          score += 10;
          reasons.push('لا توجد فجوات مهارات');
        }
      }

      // مدة الخدمة
      const join = emp.jobInfo?.joinDate || emp.joinDate || emp.createdAt;
      const years = join ? (Date.now() - new Date(join)) / (365.25 * 24 * 60 * 60 * 1000) : 0;
      if (years >= 5) {
        score += 10;
        reasons.push(`خبرة ${Math.floor(years)} سنوات`);
      }

      if (score >= 30) {
        results.push({
          employeeId: emp._id,
          name: emp.personalInfo?.firstName || emp.name,
          department: emp.jobInfo?.department || emp.department,
          position: emp.jobInfo?.position,
          score: Math.min(score, 100),
          reasons,
          recommendation:
            score >= 70 ? 'ترقية فورية' : score >= 50 ? 'ترقية مقترحة' : 'قيد المراقبة',
        });
      }
    }

    results.sort((a, b) => b.score - a.score);

    return {
      totalCandidates: candidates.length,
      recommendations: results.slice(0, 25),
      analyzedAt: new Date(),
    };
  }

  /* ═══════════════════════════════════════════════════
   *  7) تحليل تكلفة القوى العاملة
   * ═══════════════════════════════════════════════════ */
  static async workforceCostAnalysis({ _Employee, Payroll }) {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const payrolls = await Payroll.find({
      $or: [{ month: currentMonth }, { month: now.getMonth() + 1, year: now.getFullYear() }],
    }).lean();

    // تجميع حسب القسم
    const deptCosts = {};
    let totalGross = 0;
    let totalNet = 0;
    let totalDeductions = 0;

    for (const p of payrolls) {
      const dept = p.department || 'غير محدد';
      if (!deptCosts[dept]) deptCosts[dept] = { gross: 0, net: 0, deductions: 0, count: 0 };
      const gross = p.totalGross || p.baseSalary || 0;
      const net = p.totalNet || p.netSalary || 0;
      const ded = p.totalDeductions || 0;
      deptCosts[dept].gross += gross;
      deptCosts[dept].net += net;
      deptCosts[dept].deductions += ded;
      deptCosts[dept].count++;
      totalGross += gross;
      totalNet += net;
      totalDeductions += ded;
    }

    const departments = Object.entries(deptCosts).map(([dept, data]) => ({
      department: dept,
      employees: data.count,
      totalGross: data.gross,
      totalNet: data.net,
      totalDeductions: data.deductions,
      avgSalary: data.count > 0 ? Math.round(data.gross / data.count) : 0,
      percentOfTotal: totalGross > 0 ? +((data.gross / totalGross) * 100).toFixed(1) : 0,
    }));

    departments.sort((a, b) => b.totalGross - a.totalGross);

    return {
      month: currentMonth,
      totalEmployees: payrolls.length,
      totalGross,
      totalNet,
      totalDeductions,
      avgSalary: payrolls.length > 0 ? Math.round(totalGross / payrolls.length) : 0,
      departmentBreakdown: departments,
      insights: [
        totalDeductions > totalGross * 0.3
          ? 'نسبة الاستقطاعات مرتفعة — يُنصح بمراجعة بنود الخصومات'
          : 'نسبة الاستقطاعات ضمن الحدود الطبيعية',
        departments.length > 0
          ? `أعلى قسم تكلفة: ${departments[0].department} (${departments[0].percentOfTotal}% من الإجمالي)`
          : null,
      ].filter(Boolean),
      analyzedAt: new Date(),
    };
  }
}

module.exports = HRAIService;
