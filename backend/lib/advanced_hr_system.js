/**
 * ====================================================================
 * نظام الموارد البشرية المتقدم - Advanced HR Management System
 * ====================================================================
 *
 * نظام شامل لإدارة الموظفين يشمل:
 * - إدارة الموظفين والبيانات الشخصية
 * - نظام تقييم الأداء Performance Management
 * - إدارة الحضور والإجازات Attendance & Leave
 * - نظام الرواتب والمزايا Payroll & Benefits
 * - التدريب والتطوير Training & Development
 * - إدارة المواهب Talent Management
 * - التوظيف والاستقطاب Recruitment
 * - إدارة الأداء Goal Setting & KPIs
 * - الترقيات والتطور الوظيفي Career Development
 * - التقارير والتحليلات HR Analytics
 *
 * @version 1.0.0
 * @author Advanced HR System
 * @date 2026-01-22
 */

class AdvancedHRSystem {
  constructor() {
    // مخازن البيانات الرئيسية
    this.employees = new Map(); // الموظفون
    this.departments = new Map(); // الأقسام
    this.positions = new Map(); // المناصب/الوظائف
    this.attendance = new Map(); // سجل الحضور
    this.leaves = new Map(); // طلبات الإجازات
    this.performance = new Map(); // تقييمات الأداء
    this.trainings = new Map(); // التدريبات
    this.recruitments = new Map(); // طلبات التوظيف
    this.payroll = new Map(); // سجل الرواتب
    this.benefits = new Map(); // المزايا
    this.goals = new Map(); // الأهداف والـ KPIs
    this.promotions = new Map(); // الترقيات
    this.disciplinary = new Map(); // الإجراءات التأديبية
    this.documents = new Map(); // المستندات
    this.announcements = new Map(); // الإعلانات
    this.surveys = new Map(); // استبيانات الرضا الوظيفي

    // الإحصائيات والعدادات
    this.counters = {
      employees: 0,
      departments: 0,
      attendance: 0,
      leaves: 0,
      performance: 0,
      trainings: 0,
      recruitments: 0,
    };

    // تهيئة بيانات نموذجية
    this.initializeDefaultData();
  }

  // =========================================================================
  // 1. إدارة الموظفين - Employee Management
  // =========================================================================

  /**
   * إضافة موظف جديد
   */
  addEmployee(employeeData) {
    const hireDate = employeeData.hireDate ? new Date(employeeData.hireDate) : new Date();
    this.counters.employees++;
    const employeeId = `EMP${String(this.counters.employees).padStart(5, '0')}`;

    const employee = {
      employeeId,
      personalInfo: {
        firstName: employeeData.firstName,
        lastName: employeeData.lastName,
        fullNameArabic: employeeData.fullNameArabic,
        fullNameEnglish: employeeData.fullNameEnglish,
        dateOfBirth: employeeData.dateOfBirth,
        gender: employeeData.gender, // male, female
        nationality: employeeData.nationality,
        nationalId: employeeData.nationalId,
        passportNumber: employeeData.passportNumber,
        maritalStatus: employeeData.maritalStatus, // single, married, divorced, widowed
        numberOfDependents: employeeData.numberOfDependents || 0,
        religion: employeeData.religion,
        militaryStatus: employeeData.militaryStatus, // exempt, completed, postponed
      },
      contactInfo: {
        email: employeeData.email,
        personalEmail: employeeData.personalEmail,
        phone: employeeData.phone,
        mobilePhone: employeeData.mobilePhone,
        emergencyContact: {
          name: employeeData.emergencyContactName,
          relationship: employeeData.emergencyContactRelationship,
          phone: employeeData.emergencyContactPhone,
        },
        address: {
          street: employeeData.street,
          city: employeeData.city,
          state: employeeData.state,
          country: employeeData.country,
          postalCode: employeeData.postalCode,
        },
      },
      employmentInfo: {
        hireDate,
        probationEndDate: this.calculateProbationEndDate(hireDate),
        employmentType: employeeData.employmentType, // full-time, part-time, contract, temporary, intern
        employmentStatus: 'active', // active, on-leave, suspended, terminated, retired
        department: employeeData.department,
        position: employeeData.position,
        level: employeeData.level, // junior, mid, senior, lead, manager, director
        reportingTo: employeeData.reportingTo, // Manager ID
        workLocation: employeeData.workLocation,
        workSchedule: employeeData.workSchedule || 'standard', // standard, shift, flexible, remote
        contractType: employeeData.contractType, // permanent, fixed-term, project-based
        contractStartDate: employeeData.contractStartDate,
        contractEndDate: employeeData.contractEndDate,
      },
      compensation: {
        baseSalary: employeeData.baseSalary,
        currency: employeeData.currency || 'SAR',
        paymentFrequency: employeeData.paymentFrequency || 'monthly', // monthly, bi-weekly, weekly
        allowances: employeeData.allowances || [],
        bonuses: employeeData.bonuses || [],
        deductions: employeeData.deductions || [],
        lastSalaryReview: employeeData.lastSalaryReview,
        nextSalaryReview: this.calculateNextSalaryReview(employeeData.lastSalaryReview),
        bankAccount: {
          bankName: employeeData.bankName,
          accountNumber: employeeData.accountNumber,
          iban: employeeData.iban,
          swiftCode: employeeData.swiftCode,
        },
      },
      benefits: {
        healthInsurance: employeeData.healthInsurance || false,
        lifeInsurance: employeeData.lifeInsurance || false,
        socialInsurance: employeeData.socialInsurance || true,
        pensionPlan: employeeData.pensionPlan || false,
        annualLeaveDays: employeeData.annualLeaveDays || 30,
        sickLeaveDays: employeeData.sickLeaveDays || 15,
        casualLeaveDays: employeeData.casualLeaveDays || 5,
        usedAnnualLeave: 0,
        usedSickLeave: 0,
        usedCasualLeave: 0,
        otherBenefits: employeeData.otherBenefits || [],
      },
      qualifications: {
        education: employeeData.education || [],
        certifications: employeeData.certifications || [],
        languages: employeeData.languages || [],
        skills: employeeData.skills || [],
      },
      performance: {
        currentRating: null,
        lastReviewDate: null,
        nextReviewDate: null,
        goals: [],
        achievements: [],
        strengths: [],
        areasForImprovement: [],
        reviews: [],
      },
      attendance: {
        totalDaysWorked: 0,
        totalAbsences: 0,
        lateArrivals: 0,
        earlyDepartures: 0,
        overtimeHours: 0,
        lastAttendanceUpdate: new Date(),
      },
      documents: {
        resume: employeeData.resumeUrl,
        nationalIdCopy: employeeData.nationalIdUrl,
        passportCopy: employeeData.passportUrl,
        educationCertificates: employeeData.educationCertificatesUrls || [],
        contract: employeeData.contractUrl,
        otherDocuments: employeeData.otherDocumentsUrls || [],
      },
      notes: [],
      createdAt: new Date(),
      createdBy: employeeData.createdBy || 'system',
      updatedAt: new Date(),
      isActive: true,
    };

    this.employees.set(employeeId, employee);
    return { success: true, employeeId, employee };
  }

  /**
   * الحصول على موظف
   */
  getEmployee(employeeId) {
    const employee = this.employees.get(employeeId);
    if (!employee) {
      return { success: false, message: 'Employee not found' };
    }
    return { success: true, employee };
  }

  /**
   * تحديث بيانات موظف
   */
  updateEmployee(employeeId, updates) {
    const employee = this.employees.get(employeeId);
    if (!employee) {
      return { success: false, message: 'Employee not found' };
    }

    // دمج التحديثات
    Object.keys(updates).forEach(key => {
      if (typeof updates[key] === 'object' && !Array.isArray(updates[key])) {
        employee[key] = { ...employee[key], ...updates[key] };
      } else {
        employee[key] = updates[key];
      }
    });

    employee.updatedAt = new Date();
    this.employees.set(employeeId, employee);

    return { success: true, employee };
  }

  /**
   * الحصول على جميع الموظفين
   */
  getAllEmployees(filters = {}) {
    let employees = Array.from(this.employees.values());

    // تطبيق الفلاتر
    if (filters.department) {
      employees = employees.filter(emp => emp.employmentInfo.department === filters.department);
    }
    if (filters.position) {
      employees = employees.filter(emp => emp.employmentInfo.position === filters.position);
    }
    if (filters.employmentStatus) {
      employees = employees.filter(
        emp => emp.employmentInfo.employmentStatus === filters.employmentStatus
      );
    }
    if (filters.level) {
      employees = employees.filter(emp => emp.employmentInfo.level === filters.level);
    }
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      employees = employees.filter(
        emp =>
          emp.personalInfo.firstName.toLowerCase().includes(searchLower) ||
          emp.personalInfo.lastName.toLowerCase().includes(searchLower) ||
          emp.contactInfo.email.toLowerCase().includes(searchLower) ||
          emp.employeeId.toLowerCase().includes(searchLower)
      );
    }

    return { success: true, employees, count: employees.length };
  }

  /**
   * حذف موظف (تعطيل)
   */
  deactivateEmployee(employeeId, reason) {
    const employee = this.employees.get(employeeId);
    if (!employee) {
      return { success: false, message: 'Employee not found' };
    }

    employee.isActive = false;
    employee.employmentInfo.employmentStatus = 'terminated';
    employee.notes.push({
      date: new Date(),
      type: 'termination',
      content: reason,
      author: 'system',
    });
    employee.updatedAt = new Date();

    this.employees.set(employeeId, employee);
    return { success: true, message: 'Employee deactivated successfully' };
  }

  // =========================================================================
  // 2. إدارة الأقسام - Department Management
  // =========================================================================

  /**
   * إضافة قسم جديد
   */
  addDepartment(departmentData) {
    this.counters.departments++;
    const deptId = `DEPT${String(this.counters.departments).padStart(4, '0')}`;

    const department = {
      departmentId: deptId,
      nameArabic: departmentData.nameArabic,
      nameEnglish: departmentData.nameEnglish,
      code: departmentData.code,
      description: departmentData.description,
      managerId: departmentData.managerId,
      parentDepartment: departmentData.parentDepartment || null,
      location: departmentData.location,
      budget: departmentData.budget || 0,
      employeeCount: 0,
      isActive: true,
      createdAt: new Date(),
    };

    this.departments.set(deptId, department);
    return { success: true, departmentId: deptId, department };
  }

  /**
   * الحصول على قسم
   */
  getDepartment(departmentId) {
    const department = this.departments.get(departmentId);
    if (!department) {
      return { success: false, message: 'Department not found' };
    }

    // إضافة عدد الموظفين الحالي
    const employees = Array.from(this.employees.values()).filter(
      emp => emp.employmentInfo.department === departmentId && emp.isActive
    );
    department.employeeCount = employees.length;
    department.employees = employees.map(emp => ({
      employeeId: emp.employeeId,
      name: `${emp.personalInfo.firstName} ${emp.personalInfo.lastName}`,
      position: emp.employmentInfo.position,
    }));

    return { success: true, department };
  }

  /**
   * الحصول على جميع الأقسام
   */
  getAllDepartments() {
    const departments = Array.from(this.departments.values());
    return { success: true, departments, count: departments.length };
  }

  // =========================================================================
  // 3. إدارة الحضور - Attendance Management
  // =========================================================================

  /**
   * تسجيل حضور
   */
  recordAttendance(attendanceData) {
    this.counters.attendance++;
    const attendanceId = `ATT${String(this.counters.attendance).padStart(6, '0')}`;

    const attendance = {
      attendanceId,
      employeeId: attendanceData.employeeId,
      date: attendanceData.date || new Date(),
      checkIn: attendanceData.checkIn,
      checkOut: attendanceData.checkOut || null,
      status: attendanceData.status || 'present', // present, absent, late, half-day, leave
      workHours: 0,
      overtimeHours: 0,
      notes: attendanceData.notes || '',
      location: attendanceData.location || 'office',
      ipAddress: attendanceData.ipAddress,
      device: attendanceData.device,
      createdAt: new Date(),
    };

    // حساب ساعات العمل إذا تم تسجيل الخروج
    if (attendance.checkOut) {
      const checkInTime = new Date(attendance.checkIn);
      const checkOutTime = new Date(attendance.checkOut);
      const diffMs = checkOutTime - checkInTime;
      const diffHours = diffMs / (1000 * 60 * 60);
      attendance.workHours = Math.round(diffHours * 100) / 100;

      // حساب الساعات الإضافية (إذا كانت أكثر من 8 ساعات)
      if (attendance.workHours > 8) {
        attendance.overtimeHours = attendance.workHours - 8;
      }
    }

    this.attendance.set(attendanceId, attendance);

    // تحديث سجل حضور الموظف
    const employee = this.employees.get(attendanceData.employeeId);
    if (employee) {
      if (attendance.status === 'present') {
        employee.attendance.totalDaysWorked++;
      } else if (attendance.status === 'absent') {
        employee.attendance.totalAbsences++;
      } else if (attendance.status === 'late') {
        employee.attendance.lateArrivals++;
      }
      employee.attendance.overtimeHours += attendance.overtimeHours;
      employee.attendance.lastAttendanceUpdate = new Date();
      this.employees.set(attendanceData.employeeId, employee);
    }

    return { success: true, attendanceId, attendance };
  }

  /**
   * تحديث سجل الحضور (تسجيل الخروج)
   */
  updateAttendance(attendanceId, checkOut) {
    const attendance = this.attendance.get(attendanceId);
    if (!attendance) {
      return { success: false, message: 'Attendance record not found' };
    }

    attendance.checkOut = checkOut;

    // حساب ساعات العمل
    const checkInTime = new Date(attendance.checkIn);
    const checkOutTime = new Date(checkOut);
    const diffMs = checkOutTime - checkInTime;
    const diffHours = diffMs / (1000 * 60 * 60);
    attendance.workHours = Math.round(diffHours * 100) / 100;

    // حساب الساعات الإضافية
    if (attendance.workHours > 8) {
      attendance.overtimeHours = attendance.workHours - 8;

      // تحديث الساعات الإضافية للموظف
      const employee = this.employees.get(attendance.employeeId);
      if (employee) {
        employee.attendance.overtimeHours += attendance.overtimeHours;
        this.employees.set(attendance.employeeId, employee);
      }
    }

    this.attendance.set(attendanceId, attendance);
    return { success: true, attendance };
  }

  /**
   * الحصول على سجل حضور موظف
   */
  getEmployeeAttendance(employeeId, startDate, endDate) {
    const allAttendance = Array.from(this.attendance.values());
    let employeeAttendance = allAttendance.filter(att => att.employeeId === employeeId);

    // فلترة حسب التاريخ
    if (startDate) {
      employeeAttendance = employeeAttendance.filter(
        att => new Date(att.date) >= new Date(startDate)
      );
    }
    if (endDate) {
      employeeAttendance = employeeAttendance.filter(
        att => new Date(att.date) <= new Date(endDate)
      );
    }

    // حساب الإحصائيات
    const stats = {
      totalDays: employeeAttendance.length,
      presentDays: employeeAttendance.filter(att => att.status === 'present').length,
      absentDays: employeeAttendance.filter(att => att.status === 'absent').length,
      lateDays: employeeAttendance.filter(att => att.status === 'late').length,
      totalWorkHours: employeeAttendance.reduce((sum, att) => sum + att.workHours, 0),
      totalOvertimeHours: employeeAttendance.reduce((sum, att) => sum + att.overtimeHours, 0),
    };

    return {
      success: true,
      attendance: employeeAttendance,
      stats,
    };
  }

  // =========================================================================
  // 4. إدارة الإجازات - Leave Management
  // =========================================================================

  /**
   * تقديم طلب إجازة
   */
  requestLeave(leaveData) {
    this.counters.leaves++;
    const leaveId = `LV${String(this.counters.leaves).padStart(6, '0')}`;

    const leave = {
      leaveId,
      employeeId: leaveData.employeeId,
      leaveType: leaveData.leaveType, // annual, sick, casual, maternity, paternity, unpaid, emergency
      startDate: leaveData.startDate,
      endDate: leaveData.endDate,
      numberOfDays: this.calculateLeaveDays(leaveData.startDate, leaveData.endDate),
      reason: leaveData.reason,
      status: 'pending', // pending, approved, rejected, cancelled
      appliedDate: new Date(),
      approvedBy: null,
      approvedDate: null,
      rejectionReason: null,
      documents: leaveData.documents || [],
      notes: leaveData.notes || '',
    };

    this.leaves.set(leaveId, leave);
    return { success: true, leaveId, leave };
  }

  /**
   * الموافقة على طلب إجازة
   */
  approveLeave(leaveId, approverId) {
    const leave = this.leaves.get(leaveId);
    if (!leave) {
      return { success: false, message: 'Leave request not found' };
    }

    leave.status = 'approved';
    leave.approvedBy = approverId;
    leave.approvedDate = new Date();

    // تحديث أيام الإجازة المستخدمة للموظف
    const employee = this.employees.get(leave.employeeId);
    if (employee) {
      if (leave.leaveType === 'annual') {
        employee.benefits.usedAnnualLeave += leave.numberOfDays;
      } else if (leave.leaveType === 'sick') {
        employee.benefits.usedSickLeave += leave.numberOfDays;
      } else if (leave.leaveType === 'casual') {
        employee.benefits.usedCasualLeave += leave.numberOfDays;
      }
      this.employees.set(leave.employeeId, employee);
    }

    this.leaves.set(leaveId, leave);
    return { success: true, leave };
  }

  /**
   * رفض طلب إجازة
   */
  rejectLeave(leaveId, approverId, reason) {
    const leave = this.leaves.get(leaveId);
    if (!leave) {
      return { success: false, message: 'Leave request not found' };
    }

    leave.status = 'rejected';
    leave.approvedBy = approverId;
    leave.approvedDate = new Date();
    leave.rejectionReason = reason;

    this.leaves.set(leaveId, leave);
    return { success: true, leave };
  }

  /**
   * الحصول على طلبات إجازة موظف
   */
  getEmployeeLeaves(employeeId) {
    const allLeaves = Array.from(this.leaves.values());
    const employeeLeaves = allLeaves.filter(lv => lv.employeeId === employeeId);

    return {
      success: true,
      leaves: employeeLeaves,
      count: employeeLeaves.length,
    };
  }

  /**
   * الحصول على أيام الإجازة المتبقية
   */
  getRemainingLeaveDays(employeeId) {
    const employee = this.employees.get(employeeId);
    if (!employee) {
      return { success: false, message: 'Employee not found' };
    }

    return {
      success: true,
      remainingDays: {
        annual: employee.benefits.annualLeaveDays - employee.benefits.usedAnnualLeave,
        sick: employee.benefits.sickLeaveDays - employee.benefits.usedSickLeave,
        casual: employee.benefits.casualLeaveDays - employee.benefits.usedCasualLeave,
      },
      usedDays: {
        annual: employee.benefits.usedAnnualLeave,
        sick: employee.benefits.usedSickLeave,
        casual: employee.benefits.usedCasualLeave,
      },
    };
  }

  // =========================================================================
  // 5. إدارة الأداء - Performance Management
  // =========================================================================

  /**
   * إضافة تقييم أداء
   */
  addPerformanceReview(reviewData) {
    this.counters.performance++;
    const reviewId = `PR${String(this.counters.performance).padStart(6, '0')}`;

    const review = {
      reviewId,
      employeeId: reviewData.employeeId,
      reviewPeriod: reviewData.reviewPeriod, // quarterly, semi-annual, annual
      reviewDate: reviewData.reviewDate || new Date(),
      reviewerId: reviewData.reviewerId,
      ratings: {
        technical: reviewData.technicalRating || 0, // 1-5
        communication: reviewData.communicationRating || 0,
        teamwork: reviewData.teamworkRating || 0,
        leadership: reviewData.leadershipRating || 0,
        initiative: reviewData.initiativeRating || 0,
        productivity: reviewData.productivityRating || 0,
        quality: reviewData.qualityRating || 0,
        overall: 0,
      },
      strengths: reviewData.strengths || [],
      weaknesses: reviewData.weaknesses || [],
      achievements: reviewData.achievements || [],
      goalsAchieved: reviewData.goalsAchieved || [],
      goalsNotAchieved: reviewData.goalsNotAchieved || [],
      developmentAreas: reviewData.developmentAreas || [],
      trainingRecommendations: reviewData.trainingRecommendations || [],
      nextReviewDate: this.calculateNextReviewDate(reviewData.reviewPeriod),
      comments: reviewData.comments || '',
      employeeComments: reviewData.employeeComments || '',
      status: 'completed',
      createdAt: new Date(),
    };

    // حساب التقييم الإجمالي
    const ratingsArray = [
      review.ratings.technical,
      review.ratings.communication,
      review.ratings.teamwork,
      review.ratings.leadership,
      review.ratings.initiative,
      review.ratings.productivity,
      review.ratings.quality,
    ];
    review.ratings.overall = ratingsArray.reduce((sum, r) => sum + r, 0) / ratingsArray.length;
    review.ratings.overall = Math.round(review.ratings.overall * 10) / 10;

    this.performance.set(reviewId, review);

    // تحديث بيانات الأداء للموظف
    const employee = this.employees.get(reviewData.employeeId);
    if (employee) {
      employee.performance.currentRating = review.ratings.overall;
      employee.performance.lastReviewDate = review.reviewDate;
      employee.performance.nextReviewDate = review.nextReviewDate;
      employee.performance.reviews.push({
        reviewId,
        date: review.reviewDate,
        rating: review.ratings.overall,
        reviewer: review.reviewerId,
      });
      this.employees.set(reviewData.employeeId, employee);
    }

    return { success: true, reviewId, review };
  }

  /**
   * الحصول على تقييمات الأداء لموظف
   */
  getEmployeePerformanceReviews(employeeId) {
    const allReviews = Array.from(this.performance.values());
    const employeeReviews = allReviews.filter(pr => pr.employeeId === employeeId);

    return {
      success: true,
      reviews: employeeReviews,
      count: employeeReviews.length,
    };
  }

  /**
   * إضافة هدف للموظف
   */
  addEmployeeGoal(goalData) {
    const employee = this.employees.get(goalData.employeeId);
    if (!employee) {
      return { success: false, message: 'Employee not found' };
    }

    const goal = {
      goalId: `G${Date.now()}`,
      title: goalData.title,
      description: goalData.description,
      category: goalData.category, // performance, learning, project, personal
      targetDate: goalData.targetDate,
      status: 'in-progress', // not-started, in-progress, completed, cancelled
      progress: 0,
      milestones: goalData.milestones || [],
      createdAt: new Date(),
    };

    employee.performance.goals.push(goal);
    this.employees.set(goalData.employeeId, employee);

    return { success: true, goal };
  }

  // =========================================================================
  // 6. إدارة التدريب - Training Management
  // =========================================================================

  /**
   * إضافة برنامج تدريبي
   */
  addTraining(trainingData) {
    this.counters.trainings++;
    const trainingId = `TR${String(this.counters.trainings).padStart(6, '0')}`;

    const training = {
      trainingId,
      title: trainingData.title,
      description: trainingData.description,
      category: trainingData.category, // technical, soft-skills, leadership, compliance, safety
      trainer: trainingData.trainer,
      startDate: trainingData.startDate,
      endDate: trainingData.endDate,
      duration: trainingData.duration, // in hours
      location: trainingData.location, // online, onsite, hybrid
      maxParticipants: trainingData.maxParticipants || 0,
      cost: trainingData.cost || 0,
      targetAudience: trainingData.targetAudience || [],
      prerequisites: trainingData.prerequisites || [],
      learningObjectives: trainingData.learningObjectives || [],
      materials: trainingData.materials || [],
      participants: [],
      status: 'scheduled', // scheduled, in-progress, completed, cancelled
      createdAt: new Date(),
    };

    this.trainings.set(trainingId, training);
    return { success: true, trainingId, training };
  }

  /**
   * تسجيل موظف في تدريب
   */
  enrollEmployeeInTraining(trainingId, employeeId) {
    const training = this.trainings.get(trainingId);
    if (!training) {
      return { success: false, message: 'Training not found' };
    }

    const employee = this.employees.get(employeeId);
    if (!employee) {
      return { success: false, message: 'Employee not found' };
    }

    // التحقق من عدم تجاوز الحد الأقصى للمشاركين
    if (training.maxParticipants > 0 && training.participants.length >= training.maxParticipants) {
      return { success: false, message: 'Training is full' };
    }

    // إضافة الموظف للتدريب
    training.participants.push({
      employeeId,
      enrollmentDate: new Date(),
      status: 'enrolled', // enrolled, completed, cancelled
      completionDate: null,
      grade: null,
      feedback: null,
    });

    this.trainings.set(trainingId, training);
    return { success: true, message: 'Employee enrolled successfully' };
  }

  /**
   * إكمال تدريب موظف
   */
  completeEmployeeTraining(trainingId, employeeId, grade, feedback) {
    const training = this.trainings.get(trainingId);
    if (!training) {
      return { success: false, message: 'Training not found' };
    }

    const participant = training.participants.find(p => p.employeeId === employeeId);
    if (!participant) {
      return { success: false, message: 'Employee not enrolled in this training' };
    }

    participant.status = 'completed';
    participant.completionDate = new Date();
    participant.grade = grade;
    participant.feedback = feedback;

    this.trainings.set(trainingId, training);

    // إضافة التدريب لسجل الموظف
    const employee = this.employees.get(employeeId);
    if (employee) {
      employee.qualifications.certifications.push({
        name: training.title,
        issuer: training.trainer,
        dateObtained: new Date(),
        type: 'training',
        grade,
      });
      this.employees.set(employeeId, employee);
    }

    return { success: true, message: 'Training completed successfully' };
  }

  /**
   * الحصول على تدريبات موظف
   */
  getEmployeeTrainings(employeeId) {
    const allTrainings = Array.from(this.trainings.values());
    const employeeTrainings = allTrainings.filter(tr =>
      tr.participants.some(p => p.employeeId === employeeId)
    );

    return {
      success: true,
      trainings: employeeTrainings,
      count: employeeTrainings.length,
    };
  }

  // =========================================================================
  // 7. إدارة التوظيف - Recruitment Management
  // =========================================================================

  /**
   * إضافة طلب توظيف
   */
  addRecruitmentRequest(requestData) {
    this.counters.recruitments++;
    const requestId = `REC${String(this.counters.recruitments).padStart(6, '0')}`;

    const request = {
      requestId,
      position: requestData.position,
      department: requestData.department,
      numberOfPositions: requestData.numberOfPositions || 1,
      employmentType: requestData.employmentType,
      level: requestData.level,
      requiredQualifications: requestData.requiredQualifications || [],
      requiredSkills: requestData.requiredSkills || [],
      requiredExperience: requestData.requiredExperience || 0,
      salaryRange: {
        min: requestData.salaryMin,
        max: requestData.salaryMax,
      },
      jobDescription: requestData.jobDescription,
      benefits: requestData.benefits || [],
      deadline: requestData.deadline,
      status: 'open', // open, in-progress, closed, on-hold
      candidates: [],
      requestedBy: requestData.requestedBy,
      requestDate: new Date(),
      createdAt: new Date(),
    };

    this.recruitments.set(requestId, request);
    return { success: true, requestId, request };
  }

  /**
   * إضافة مرشح لوظيفة
   */
  addCandidate(recruitmentId, candidateData) {
    const recruitment = this.recruitments.get(recruitmentId);
    if (!recruitment) {
      return { success: false, message: 'Recruitment request not found' };
    }

    const candidate = {
      candidateId: `CAN${Date.now()}`,
      name: candidateData.name,
      email: candidateData.email,
      phone: candidateData.phone,
      resumeUrl: candidateData.resumeUrl,
      applicationDate: new Date(),
      status: 'applied', // applied, screening, interview, offer, hired, rejected
      interviews: [],
      notes: [],
      rating: null,
    };

    recruitment.candidates.push(candidate);
    this.recruitments.set(recruitmentId, recruitment);

    return { success: true, candidateId: candidate.candidateId, candidate };
  }

  // =========================================================================
  // 8. إدارة الرواتب - Payroll Management
  // =========================================================================

  /**
   * معالجة رواتب الشهر
   */
  processMonthlyPayroll(month, year) {
    const employees = Array.from(this.employees.values()).filter(emp => emp.isActive);
    const payrollRecords = [];

    employees.forEach(employee => {
      const baseSalary = employee.compensation.baseSalary;
      let totalAllowances = 0;
      let totalDeductions = 0;

      // حساب العلاوات
      if (employee.compensation.allowances) {
        totalAllowances = employee.compensation.allowances
          .filter(a => a.type === 'monthly')
          .reduce((sum, a) => sum + a.amount, 0);
      }

      // حساب الخصومات
      if (employee.compensation.deductions) {
        totalDeductions = employee.compensation.deductions
          .filter(d => d.type === 'monthly')
          .reduce((sum, d) => sum + d.amount, 0);
      }

      // حساب الراتب الإجمالي
      const grossSalary = baseSalary + totalAllowances;
      const netSalary = grossSalary - totalDeductions;

      const payrollRecord = {
        employeeId: employee.employeeId,
        employeeName: `${employee.personalInfo.firstName} ${employee.personalInfo.lastName}`,
        month,
        year,
        baseSalary,
        allowances: employee.compensation.allowances,
        totalAllowances,
        deductions: employee.compensation.deductions,
        totalDeductions,
        grossSalary,
        netSalary,
        paymentDate: new Date(),
        paymentStatus: 'pending',
        paymentMethod: employee.compensation.bankAccount ? 'bank-transfer' : 'cash',
      };

      payrollRecords.push(payrollRecord);
      this.payroll.set(`${employee.employeeId}_${month}_${year}`, payrollRecord);
    });

    return {
      success: true,
      payrollRecords,
      count: payrollRecords.length,
      totalAmount: payrollRecords.reduce((sum, pr) => sum + pr.netSalary, 0),
    };
  }

  /**
   * الحصول على سجل راتب موظف
   */
  getEmployeePayroll(employeeId, month, year) {
    const payrollKey = `${employeeId}_${month}_${year}`;
    const payroll = this.payroll.get(payrollKey);

    if (!payroll) {
      return { success: false, message: 'Payroll record not found' };
    }

    return { success: true, payroll };
  }

  // =========================================================================
  // 9. التقارير والتحليلات - Reports & Analytics
  // =========================================================================

  /**
   * الحصول على إحصائيات النظام
   */
  getSystemStats() {
    const employees = Array.from(this.employees.values());
    const activeEmployees = employees.filter(emp => emp.isActive);

    // إحصائيات الأقسام
    const departmentStats = {};
    activeEmployees.forEach(emp => {
      const dept = emp.employmentInfo.department;
      if (!departmentStats[dept]) {
        departmentStats[dept] = 0;
      }
      departmentStats[dept]++;
    });

    // إحصائيات المناصب
    const positionStats = {};
    activeEmployees.forEach(emp => {
      const pos = emp.employmentInfo.position;
      if (!positionStats[pos]) {
        positionStats[pos] = 0;
      }
      positionStats[pos]++;
    });

    // متوسط الرواتب
    const totalSalaries = activeEmployees.reduce(
      (sum, emp) => sum + emp.compensation.baseSalary,
      0
    );
    const avgSalary = totalSalaries / activeEmployees.length;

    // إحصائيات الحضور
    const attendanceRecords = Array.from(this.attendance.values());
    const totalWorkHours = attendanceRecords.reduce((sum, att) => sum + att.workHours, 0);
    const totalOvertimeHours = attendanceRecords.reduce((sum, att) => sum + att.overtimeHours, 0);

    // إحصائيات الإجازات
    const leaveRequests = Array.from(this.leaves.values());
    const pendingLeaves = leaveRequests.filter(lv => lv.status === 'pending').length;
    const approvedLeaves = leaveRequests.filter(lv => lv.status === 'approved').length;

    // إحصائيات التدريب
    const trainings = Array.from(this.trainings.values());
    const completedTrainings = trainings.filter(tr => tr.status === 'completed').length;

    return {
      success: true,
      stats: {
        employees: {
          total: employees.length,
          active: activeEmployees.length,
          inactive: employees.length - activeEmployees.length,
          byDepartment: departmentStats,
          byPosition: positionStats,
          averageSalary: Math.round(avgSalary),
        },
        attendance: {
          totalRecords: attendanceRecords.length,
          totalWorkHours: Math.round(totalWorkHours),
          totalOvertimeHours: Math.round(totalOvertimeHours),
        },
        leaves: {
          total: leaveRequests.length,
          pending: pendingLeaves,
          approved: approvedLeaves,
          rejected: leaveRequests.filter(lv => lv.status === 'rejected').length,
        },
        trainings: {
          total: trainings.length,
          scheduled: trainings.filter(tr => tr.status === 'scheduled').length,
          inProgress: trainings.filter(tr => tr.status === 'in-progress').length,
          completed: completedTrainings,
        },
        departments: this.departments.size,
        performanceReviews: this.performance.size,
        recruitments: this.recruitments.size,
      },
    };
  }

  /**
   * تقرير الموظف الشامل
   */
  generateEmployeeReport(employeeId) {
    const employee = this.employees.get(employeeId);
    if (!employee) {
      return { success: false, message: 'Employee not found' };
    }

    // جمع كل بيانات الموظف
    const attendance = this.getEmployeeAttendance(employeeId);
    const leaves = this.getEmployeeLeaves(employeeId);
    const remainingLeave = this.getRemainingLeaveDays(employeeId);
    const performance = this.getEmployeePerformanceReviews(employeeId);
    const trainings = this.getEmployeeTrainings(employeeId);

    // حساب الراتب الإجمالي
    const totalSalary =
      employee.compensation.baseSalary +
      (employee.compensation.allowances || [])
        .filter(a => a.type === 'monthly')
        .reduce((sum, a) => sum + a.amount, 0);

    return {
      success: true,
      report: {
        employee: {
          id: employee.employeeId,
          name: `${employee.personalInfo.firstName} ${employee.personalInfo.lastName}`,
          email: employee.contactInfo.email,
          department: employee.employmentInfo.department,
          position: employee.employmentInfo.position,
          hireDate: employee.employmentInfo.hireDate,
          status: employee.employmentInfo.employmentStatus,
        },
        compensation: {
          baseSalary: employee.compensation.baseSalary,
          totalSalary,
          currency: employee.compensation.currency,
        },
        attendance: attendance.data || attendance,
        leaves: leaves.data || leaves,
        remainingLeave: remainingLeave.data || remainingLeave,
        performance: performance.data || performance,
        trainings: trainings.data || trainings,
        generatedAt: new Date(),
      },
    };
  }

  /**
   * تقرير الأداء الشامل للمؤسسة
   */
  generateOrganizationPerformanceReport() {
    const employees = Array.from(this.employees.values()).filter(emp => emp.isActive);
    const performanceReviews = Array.from(this.performance.values());

    // متوسط التقييمات
    const avgRating =
      performanceReviews.reduce((sum, pr) => sum + pr.ratings.overall, 0) /
      performanceReviews.length;

    // التقييمات حسب القسم
    const departmentRatings = {};
    performanceReviews.forEach(pr => {
      const employee = this.employees.get(pr.employeeId);
      if (employee) {
        const dept = employee.employmentInfo.department;
        if (!departmentRatings[dept]) {
          departmentRatings[dept] = { total: 0, count: 0 };
        }
        departmentRatings[dept].total += pr.ratings.overall;
        departmentRatings[dept].count++;
      }
    });

    Object.keys(departmentRatings).forEach(dept => {
      departmentRatings[dept].average =
        departmentRatings[dept].total / departmentRatings[dept].count;
    });

    // أفضل الموظفين أداءً
    const topPerformers = performanceReviews
      .sort((a, b) => b.ratings.overall - a.ratings.overall)
      .slice(0, 10)
      .map(pr => {
        const emp = this.employees.get(pr.employeeId);
        return {
          employeeId: pr.employeeId,
          name: emp ? `${emp.personalInfo.firstName} ${emp.personalInfo.lastName}` : 'Unknown',
          rating: pr.ratings.overall,
          department: emp ? emp.employmentInfo.department : 'Unknown',
        };
      });

    return {
      success: true,
      report: {
        totalEmployees: employees.length,
        totalReviews: performanceReviews.length,
        averageRating: Math.round(avgRating * 100) / 100,
        departmentRatings,
        topPerformers,
        generatedAt: new Date(),
      },
    };
  }

  // =========================================================================
  // 10. دوال مساعدة - Helper Functions
  // =========================================================================

  /**
   * حساب تاريخ انتهاء فترة التجربة
   */
  calculateProbationEndDate(hireDate) {
    if (!hireDate) return null;
    const date = new Date(hireDate);
    if (Number.isNaN(date.getTime())) return null;
    date.setMonth(date.getMonth() + 3); // 3 أشهر
    return date;
  }

  /**
   * حساب تاريخ المراجعة التالية للراتب
   */
  calculateNextSalaryReview(lastReviewDate) {
    if (!lastReviewDate) return null;
    const date = new Date(lastReviewDate);
    date.setFullYear(date.getFullYear() + 1); // سنة واحدة
    return date;
  }

  /**
   * حساب تاريخ التقييم التالي
   */
  calculateNextReviewDate(reviewPeriod) {
    const date = new Date();
    switch (reviewPeriod) {
      case 'quarterly':
        date.setMonth(date.getMonth() + 3);
        break;
      case 'semi-annual':
        date.setMonth(date.getMonth() + 6);
        break;
      case 'annual':
        date.setFullYear(date.getFullYear() + 1);
        break;
      default:
        date.setFullYear(date.getFullYear() + 1);
    }
    return date;
  }

  /**
   * حساب عدد أيام الإجازة
   */
  calculateLeaveDays(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays + 1; // شامل اليوم الأول والأخير
  }

  // =========================================================================
  // 11. تهيئة البيانات النموذجية - Initialize Default Data
  // =========================================================================

  initializeDefaultData() {
    // إضافة أقسام نموذجية
    this.addDepartment({
      nameArabic: 'تقنية المعلومات',
      nameEnglish: 'Information Technology',
      code: 'IT',
      description: 'قسم تقنية المعلومات والبرمجيات',
      location: 'مبنى أ - الطابق الثالث',
      budget: 500000,
    });

    this.addDepartment({
      nameArabic: 'الموارد البشرية',
      nameEnglish: 'Human Resources',
      code: 'HR',
      description: 'قسم الموارد البشرية والتوظيف',
      location: 'مبنى أ - الطابق الثاني',
      budget: 300000,
    });

    this.addDepartment({
      nameArabic: 'المالية',
      nameEnglish: 'Finance',
      code: 'FIN',
      description: 'قسم المالية والمحاسبة',
      location: 'مبنى ب - الطابق الأول',
      budget: 400000,
    });

    // إضافة موظفين نموذجيين
    const emp1 = this.addEmployee({
      firstName: 'أحمد',
      lastName: 'محمد',
      fullNameArabic: 'أحمد محمد علي',
      fullNameEnglish: 'Ahmed Mohamed Ali',
      email: 'ahmed.mohamed@company.com',
      phone: '+966501234567',
      dateOfBirth: '1990-05-15',
      gender: 'male',
      nationality: 'Saudi',
      nationalId: '1234567890',
      department: 'DEPT0001',
      position: 'Senior Software Engineer',
      level: 'senior',
      employmentType: 'full-time',
      hireDate: '2020-01-15',
      baseSalary: 15000,
      currency: 'SAR',
      allowances: [
        { name: 'Housing Allowance', amount: 3000, type: 'monthly' },
        { name: 'Transportation', amount: 1000, type: 'monthly' },
      ],
      annualLeaveDays: 30,
      sickLeaveDays: 15,
    });

    const emp2 = this.addEmployee({
      firstName: 'فاطمة',
      lastName: 'أحمد',
      fullNameArabic: 'فاطمة أحمد حسن',
      fullNameEnglish: 'Fatima Ahmed Hassan',
      email: 'fatima.ahmed@company.com',
      phone: '+966507654321',
      dateOfBirth: '1992-08-20',
      gender: 'female',
      nationality: 'Saudi',
      nationalId: '9876543210',
      department: 'DEPT0002',
      position: 'HR Manager',
      level: 'manager',
      employmentType: 'full-time',
      hireDate: '2019-03-01',
      baseSalary: 18000,
      currency: 'SAR',
      allowances: [
        { name: 'Housing Allowance', amount: 3500, type: 'monthly' },
        { name: 'Transportation', amount: 1200, type: 'monthly' },
      ],
      annualLeaveDays: 30,
      sickLeaveDays: 15,
    });

    // إضافة سجلات حضور نموذجية
    this.recordAttendance({
      employeeId: emp1.employeeId,
      date: new Date(),
      checkIn: new Date(new Date().setHours(8, 0, 0)),
      checkOut: new Date(new Date().setHours(17, 0, 0)),
      status: 'present',
    });

    this.recordAttendance({
      employeeId: emp2.employeeId,
      date: new Date(),
      checkIn: new Date(new Date().setHours(8, 30, 0)),
      checkOut: new Date(new Date().setHours(17, 30, 0)),
      status: 'present',
    });

    // إضافة تدريب نموذجي
    const training = this.addTraining({
      title: 'دورة القيادة الفعالة',
      description: 'تطوير المهارات القيادية والإدارية',
      category: 'leadership',
      trainer: 'د. محمد السعيد',
      startDate: new Date('2026-02-01'),
      endDate: new Date('2026-02-05'),
      duration: 40,
      location: 'onsite',
      maxParticipants: 20,
      cost: 5000,
    });

    // إضافة تقييم أداء نموذجي
    this.addPerformanceReview({
      employeeId: emp1.employeeId,
      reviewPeriod: 'annual',
      reviewDate: new Date('2025-12-31'),
      reviewerId: emp2.employeeId,
      technicalRating: 4.5,
      communicationRating: 4.0,
      teamworkRating: 4.5,
      leadershipRating: 4.0,
      initiativeRating: 4.5,
      productivityRating: 5.0,
      qualityRating: 4.5,
      strengths: ['Technical expertise', 'Problem solving', 'Team collaboration'],
      achievements: ['Led successful project delivery', 'Mentored junior developers'],
      comments: 'Excellent performance throughout the year',
    });

    console.log('✅ تم تهيئة بيانات نظام الموارد البشرية النموذجية');
  }
}

// تصدير الفئة
module.exports = AdvancedHRSystem;
