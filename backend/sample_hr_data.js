/**
 * ====================================================================
 * بيانات نموذجية وأمثلة - Sample Data & Examples
 * ====================================================================
 * نظام الموارد البشرية المتقدم
 * Advanced HR Management System
 *
 * يحتوي على:
 * - سيناريوهات استخدام كاملة
 * - أمثلة cURL لاختبار API
 * - بيانات نموذجية للاختبار
 * - دليل الاستخدام السريع
 *
 * @version 1.0.0
 * @date 2026-01-22
 */

// =========================================================================
// السيناريو 1: رحلة موظف كاملة - Complete Employee Journey
// =========================================================================

const SCENARIO_1_COMPLETE_EMPLOYEE_LIFECYCLE = {
  name: 'رحلة موظف كاملة من التوظيف حتى التطور الوظيفي',
  description: 'سيناريو يوضح جميع مراحل دورة حياة الموظف في النظام',
  steps: [
    {
      step: 1,
      action: 'إضافة موظف جديد',
      endpoint: 'POST /api/hr/employees',
      data: {
        firstName: 'سارة',
        lastName: 'العلي',
        fullNameArabic: 'سارة محمد العلي',
        fullNameEnglish: 'Sarah Mohammed Al-Ali',
        email: 'sarah.alali@company.com',
        personalEmail: 'sarah.m.alali@gmail.com',
        phone: '+966501234567',
        mobilePhone: '+966501234567',
        dateOfBirth: '1995-03-15',
        gender: 'female',
        nationality: 'Saudi',
        nationalId: '1234567890',
        passportNumber: 'P123456789',
        maritalStatus: 'single',
        numberOfDependents: 0,
        department: 'DEPT0001',
        position: 'Software Developer',
        level: 'junior',
        employmentType: 'full-time',
        hireDate: '2026-01-22',
        baseSalary: 12000,
        currency: 'SAR',
        allowances: [
          { name: 'Housing', amount: 2500, type: 'monthly' },
          { name: 'Transportation', amount: 800, type: 'monthly' },
        ],
        annualLeaveDays: 30,
        sickLeaveDays: 15,
        casualLeaveDays: 5,
        education: [
          {
            degree: 'Bachelor',
            field: 'Computer Science',
            institution: 'King Saud University',
            graduationYear: 2020,
            grade: 'Excellent',
          },
        ],
        skills: [
          { skill: 'JavaScript', level: 'advanced', yearsOfExperience: 3 },
          { skill: 'React', level: 'intermediate', yearsOfExperience: 2 },
          { skill: 'Node.js', level: 'intermediate', yearsOfExperience: 2 },
        ],
        languages: [
          { language: 'Arabic', level: 'native' },
          { language: 'English', level: 'advanced' },
        ],
      },
    },
    {
      step: 2,
      action: 'تسجيل حضور اليوم الأول',
      endpoint: 'POST /api/hr/attendance',
      data: {
        employeeId: 'EMP00003', // من الخطوة السابقة
        date: '2026-01-22',
        checkIn: '2026-01-22T08:00:00Z',
        status: 'present',
        location: 'office',
        notes: 'First day at work',
      },
    },
    {
      step: 3,
      action: 'تسجيل الموظف في تدريب تأهيلي',
      endpoint: 'POST /api/hr/trainings/TR000001/enroll',
      data: {
        employeeId: 'EMP00003',
      },
    },
    {
      step: 4,
      action: 'إضافة أهداف للموظف للربع الأول',
      endpoint: 'POST /api/hr/performance/goals',
      data: {
        employeeId: 'EMP00003',
        title: 'Complete Onboarding Program',
        description: 'Successfully complete all onboarding modules and initial training',
        category: 'learning',
        targetDate: '2026-04-22',
        milestones: [
          { title: 'Complete orientation', dueDate: '2026-01-25', status: 'completed' },
          { title: 'Finish technical training', dueDate: '2026-02-15', status: 'in-progress' },
          { title: 'First project assignment', dueDate: '2026-03-01', status: 'not-started' },
        ],
      },
    },
    {
      step: 5,
      action: 'تقديم طلب إجازة',
      endpoint: 'POST /api/hr/leaves',
      data: {
        employeeId: 'EMP00003',
        leaveType: 'annual',
        startDate: '2026-03-10',
        endDate: '2026-03-12',
        reason: 'Family visit',
        notes: 'Planned vacation',
      },
    },
    {
      step: 6,
      action: 'الموافقة على الإجازة',
      endpoint: 'POST /api/hr/leaves/LV000001/approve',
      data: {
        approverId: 'EMP00002', // HR Manager
      },
    },
    {
      step: 7,
      action: 'تقييم الأداء بعد 3 أشهر',
      endpoint: 'POST /api/hr/performance',
      data: {
        employeeId: 'EMP00003',
        reviewPeriod: 'quarterly',
        reviewDate: '2026-04-22',
        reviewerId: 'EMP00001',
        technicalRating: 4.0,
        communicationRating: 4.5,
        teamworkRating: 4.5,
        leadershipRating: 3.5,
        initiativeRating: 4.0,
        productivityRating: 4.0,
        qualityRating: 4.0,
        strengths: ['Quick learner', 'Good team player', 'Strong technical skills'],
        achievements: [
          'Completed onboarding ahead of schedule',
          'Delivered first feature successfully',
        ],
        goalsAchieved: ['Complete Onboarding Program'],
        developmentAreas: ['Leadership skills', 'Public speaking'],
        trainingRecommendations: ['Advanced React workshop', 'Leadership basics course'],
        comments: 'Excellent start! Shows great potential for growth',
      },
    },
    {
      step: 8,
      action: 'الحصول على تقرير شامل للموظف',
      endpoint: 'GET /api/hr/employees/EMP00003/report',
      expectedResult: {
        employee: '...',
        compensation: '...',
        attendance: '...',
        leaves: '...',
        performance: '...',
        trainings: '...',
      },
    },
  ],
};

// =========================================================================
// السيناريو 2: إدارة فريق - Team Management
// =========================================================================

const SCENARIO_2_TEAM_MANAGEMENT = {
  name: 'إدارة فريق تقني كامل',
  description: 'إضافة قسم جديد وتوظيف فريق وإدارة أدائهم',
  steps: [
    {
      step: 1,
      action: 'إنشاء قسم جديد',
      endpoint: 'POST /api/hr/departments',
      data: {
        nameArabic: 'تطوير المنتجات',
        nameEnglish: 'Product Development',
        code: 'PROD',
        description: 'فريق تطوير المنتجات والابتكار',
        location: 'Building C - Floor 4',
        budget: 800000,
      },
    },
    {
      step: 2,
      action: 'إضافة طلب توظيف لمدير المنتج',
      endpoint: 'POST /api/hr/recruitments',
      data: {
        position: 'Product Manager',
        department: 'DEPT0004',
        numberOfPositions: 1,
        employmentType: 'full-time',
        level: 'manager',
        requiredQualifications: [
          'Bachelor in Computer Science or related field',
          '5+ years experience in product management',
        ],
        requiredSkills: ['Product strategy', 'Agile', 'Stakeholder management'],
        requiredExperience: 5,
        salaryMin: 20000,
        salaryMax: 28000,
        jobDescription: 'Lead product development and strategy',
        deadline: '2026-03-01',
      },
    },
    {
      step: 3,
      action: 'إضافة مرشحين للوظيفة',
      endpoint: 'POST /api/hr/recruitments/REC000001/candidates',
      data: {
        name: 'أحمد خالد',
        email: 'ahmed.khaled@email.com',
        phone: '+966509876543',
        resumeUrl: 'https://example.com/resumes/ahmed-khaled.pdf',
      },
    },
    {
      step: 4,
      action: 'الحصول على إحصائيات القسم',
      endpoint: 'GET /api/hr/departments/DEPT0004',
    },
  ],
};

// =========================================================================
// السيناريو 3: معالجة الرواتب الشهرية - Monthly Payroll
// =========================================================================

const SCENARIO_3_MONTHLY_PAYROLL = {
  name: 'معالجة رواتب شهرية كاملة',
  description: 'حساب ومعالجة رواتب جميع الموظفين للشهر',
  steps: [
    {
      step: 1,
      action: 'معالجة رواتب شهر يناير 2026',
      endpoint: 'POST /api/hr/payroll/process',
      data: {
        month: 1,
        year: 2026,
      },
    },
    {
      step: 2,
      action: 'الحصول على سجل راتب موظف محدد',
      endpoint: 'GET /api/hr/payroll/employee/EMP00001?month=1&year=2026',
    },
    {
      step: 3,
      action: 'عرض إحصائيات الرواتب',
      endpoint: 'GET /api/hr/stats',
      note: 'يتضمن إجمالي الرواتب ومتوسطات الأقسام',
    },
  ],
};

// =========================================================================
// أمثلة cURL - cURL Examples
// =========================================================================

const CURL_EXAMPLES = {
  health: {
    title: 'فحص حالة النظام',
    command: 'curl http://localhost:3001/api/hr/health',
    expectedResponse: {
      success: true,
      message: 'HR System is operational',
      data: {
        status: 'operational',
        system: 'Advanced HR Management System',
        version: '1.0.0',
      },
    },
  },

  stats: {
    title: 'الحصول على إحصائيات النظام',
    command: 'curl http://localhost:3001/api/hr/stats',
    expectedResponse: {
      success: true,
      data: {
        employees: { total: 3, active: 3, byDepartment: {}, averageSalary: 15000 },
        attendance: { totalRecords: 5, totalWorkHours: 40 },
        leaves: { total: 2, pending: 1, approved: 1 },
      },
    },
  },

  addEmployee: {
    title: 'إضافة موظف جديد',
    command: `curl -X POST http://localhost:3001/api/hr/employees \\
  -H "Content-Type: application/json" \\
  -d '{
    "firstName": "علي",
    "lastName": "أحمد",
    "fullNameArabic": "علي أحمد محمد",
    "fullNameEnglish": "Ali Ahmed Mohammed",
    "email": "ali.ahmed@company.com",
    "phone": "+966501112233",
    "dateOfBirth": "1992-06-20",
    "gender": "male",
    "nationality": "Saudi",
    "nationalId": "1122334455",
    "department": "DEPT0001",
    "position": "Senior Developer",
    "level": "senior",
    "employmentType": "full-time",
    "hireDate": "2026-01-22",
    "baseSalary": 16000,
    "currency": "SAR",
    "allowances": [
      {"name": "Housing", "amount": 3200, "type": "monthly"},
      {"name": "Transportation", "amount": 1000, "type": "monthly"}
    ],
    "annualLeaveDays": 30,
    "sickLeaveDays": 15
  }'`,
    expectedResponse: {
      success: true,
      message: 'Employee added successfully',
      data: {
        employeeId: 'EMP00004',
        employee: '...',
      },
    },
  },

  getEmployee: {
    title: 'الحصول على بيانات موظف',
    command: 'curl http://localhost:3001/api/hr/employees/EMP00001',
    expectedResponse: {
      success: true,
      data: { employeeId: 'EMP00001', personalInfo: '...', employmentInfo: '...' },
    },
  },

  getAllEmployees: {
    title: 'الحصول على جميع الموظفين مع فلتر',
    command: 'curl "http://localhost:3001/api/hr/employees?department=DEPT0001&status=active"',
    expectedResponse: {
      success: true,
      data: {
        employees: [],
        count: 2,
      },
    },
  },

  recordAttendance: {
    title: 'تسجيل حضور موظف',
    command: `curl -X POST http://localhost:3001/api/hr/attendance \\
  -H "Content-Type: application/json" \\
  -d '{
    "employeeId": "EMP00001",
    "date": "2026-01-22",
    "checkIn": "2026-01-22T08:00:00Z",
    "status": "present",
    "location": "office"
  }'`,
    expectedResponse: {
      success: true,
      message: 'Attendance recorded successfully',
      data: { attendanceId: 'ATT000001' },
    },
  },

  updateAttendance: {
    title: 'تحديث سجل الحضور (تسجيل خروج)',
    command: `curl -X PUT http://localhost:3001/api/hr/attendance/ATT000001 \\
  -H "Content-Type: application/json" \\
  -d '{
    "checkOut": "2026-01-22T17:00:00Z"
  }'`,
    expectedResponse: {
      success: true,
      message: 'Attendance updated successfully',
      data: { workHours: 9, overtimeHours: 1 },
    },
  },

  requestLeave: {
    title: 'تقديم طلب إجازة',
    command: `curl -X POST http://localhost:3001/api/hr/leaves \\
  -H "Content-Type: application/json" \\
  -d '{
    "employeeId": "EMP00001",
    "leaveType": "annual",
    "startDate": "2026-02-10",
    "endDate": "2026-02-15",
    "reason": "Family vacation"
  }'`,
    expectedResponse: {
      success: true,
      message: 'Leave request submitted successfully',
      data: { leaveId: 'LV000001', numberOfDays: 6 },
    },
  },

  approveLeave: {
    title: 'الموافقة على طلب إجازة',
    command: `curl -X POST http://localhost:3001/api/hr/leaves/LV000001/approve \\
  -H "Content-Type: application/json" \\
  -d '{
    "approverId": "EMP00002"
  }'`,
    expectedResponse: {
      success: true,
      message: 'Leave request approved successfully',
    },
  },

  addPerformanceReview: {
    title: 'إضافة تقييم أداء',
    command: `curl -X POST http://localhost:3001/api/hr/performance \\
  -H "Content-Type: application/json" \\
  -d '{
    "employeeId": "EMP00001",
    "reviewPeriod": "quarterly",
    "reviewerId": "EMP00002",
    "technicalRating": 4.5,
    "communicationRating": 4.0,
    "teamworkRating": 5.0,
    "leadershipRating": 4.0,
    "initiativeRating": 4.5,
    "productivityRating": 4.5,
    "qualityRating": 4.5,
    "strengths": ["Excellent technical skills", "Great team player"],
    "achievements": ["Led successful project", "Mentored junior developers"],
    "comments": "Outstanding performance this quarter"
  }'`,
    expectedResponse: {
      success: true,
      message: 'Performance review added successfully',
      data: { reviewId: 'PR000001', ratings: { overall: 4.4 } },
    },
  },

  addTraining: {
    title: 'إضافة برنامج تدريبي',
    command: `curl -X POST http://localhost:3001/api/hr/trainings \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Advanced Leadership Skills",
    "description": "Comprehensive leadership training program",
    "category": "leadership",
    "trainer": "Dr. Mohammed Al-Salem",
    "startDate": "2026-03-01",
    "endDate": "2026-03-05",
    "duration": 40,
    "location": "onsite",
    "maxParticipants": 15,
    "cost": 8000
  }'`,
    expectedResponse: {
      success: true,
      message: 'Training added successfully',
      data: { trainingId: 'TR000002' },
    },
  },

  enrollInTraining: {
    title: 'تسجيل موظف في تدريب',
    command: `curl -X POST http://localhost:3001/api/hr/trainings/TR000001/enroll \\
  -H "Content-Type: application/json" \\
  -d '{
    "employeeId": "EMP00001"
  }'`,
    expectedResponse: {
      success: true,
      message: 'Employee enrolled successfully',
    },
  },

  processPayroll: {
    title: 'معالجة رواتب الشهر',
    command: `curl -X POST http://localhost:3001/api/hr/payroll/process \\
  -H "Content-Type: application/json" \\
  -d '{
    "month": 1,
    "year": 2026
  }'`,
    expectedResponse: {
      success: true,
      message: 'Payroll processed successfully',
      data: {
        payrollRecords: [],
        count: 3,
        totalAmount: 63000,
      },
    },
  },

  employeeReport: {
    title: 'تقرير موظف شامل',
    command: 'curl http://localhost:3001/api/hr/employees/EMP00001/report',
    expectedResponse: {
      success: true,
      data: {
        report: {
          employee: '...',
          compensation: '...',
          attendance: '...',
          leaves: '...',
          performance: '...',
          trainings: '...',
        },
      },
    },
  },

  performanceReport: {
    title: 'تقرير الأداء الشامل للمؤسسة',
    command: 'curl http://localhost:3001/api/hr/performance/report',
    expectedResponse: {
      success: true,
      data: {
        report: {
          totalEmployees: 3,
          totalReviews: 2,
          averageRating: 4.3,
          departmentRatings: {},
          topPerformers: [],
        },
      },
    },
  },
};

// =========================================================================
// بيانات نموذجية للاختبار - Sample Test Data
// =========================================================================

const SAMPLE_EMPLOYEES = [
  {
    firstName: 'محمد',
    lastName: 'السالم',
    fullNameArabic: 'محمد عبدالله السالم',
    fullNameEnglish: 'Mohammed Abdullah Al-Salem',
    email: 'mohammed.alsalem@company.com',
    phone: '+966502223344',
    dateOfBirth: '1988-12-10',
    gender: 'male',
    nationality: 'Saudi',
    nationalId: '2233445566',
    department: 'DEPT0002',
    position: 'HR Director',
    level: 'director',
    employmentType: 'full-time',
    hireDate: '2018-06-01',
    baseSalary: 25000,
    currency: 'SAR',
  },
  {
    firstName: 'نورة',
    lastName: 'الحربي',
    fullNameArabic: 'نورة محمد الحربي',
    fullNameEnglish: 'Noura Mohammed Al-Harbi',
    email: 'noura.alharbi@company.com',
    phone: '+966503334455',
    dateOfBirth: '1994-04-25',
    gender: 'female',
    nationality: 'Saudi',
    nationalId: '3344556677',
    department: 'DEPT0003',
    position: 'Financial Analyst',
    level: 'mid',
    employmentType: 'full-time',
    hireDate: '2021-09-15',
    baseSalary: 13000,
    currency: 'SAR',
  },
];

const SAMPLE_DEPARTMENTS = [
  {
    nameArabic: 'المبيعات',
    nameEnglish: 'Sales',
    code: 'SALES',
    description: 'قسم المبيعات وخدمة العملاء',
    location: 'Building A - Floor 1',
    budget: 600000,
  },
  {
    nameArabic: 'التسويق',
    nameEnglish: 'Marketing',
    code: 'MKT',
    description: 'قسم التسويق والعلاقات العامة',
    location: 'Building B - Floor 2',
    budget: 450000,
  },
];

const SAMPLE_TRAININGS = [
  {
    title: 'دورة الأمن السيبراني',
    description: 'تدريب شامل على أساسيات الأمن السيبراني',
    category: 'technical',
    trainer: 'م. خالد العتيبي',
    startDate: '2026-02-15',
    endDate: '2026-02-20',
    duration: 30,
    location: 'online',
    maxParticipants: 25,
    cost: 3000,
  },
  {
    title: 'مهارات التواصل الفعال',
    description: 'تطوير مهارات التواصل والعرض التقديمي',
    category: 'soft-skills',
    trainer: 'د. سارة المطيري',
    startDate: '2026-03-10',
    endDate: '2026-03-12',
    duration: 24,
    location: 'onsite',
    maxParticipants: 20,
    cost: 4500,
  },
];

// =========================================================================
// دليل الاختبار - Testing Guide
// =========================================================================

const TESTING_GUIDE = {
  title: 'دليل اختبار نظام الموارد البشرية المتقدم',
  prerequisites: [
    'تأكد من تشغيل الـ Backend على المنفذ 3001',
    'تأكد من تسجيل المسارات في server.js',
    'استخدم Postman أو cURL للاختبار',
  ],
  testingSteps: [
    {
      step: 1,
      title: 'اختبار حالة النظام',
      command: 'curl http://localhost:3001/api/hr/health',
      expectedStatus: 200,
      expectedResult: 'success: true, status: operational',
    },
    {
      step: 2,
      title: 'الحصول على الإحصائيات الأولية',
      command: 'curl http://localhost:3001/api/hr/stats',
      expectedStatus: 200,
      expectedResult: 'يجب أن تظهر 2 موظفين و 3 أقسام من البيانات الأولية',
    },
    {
      step: 3,
      title: 'إضافة موظف جديد',
      command: 'انظر CURL_EXAMPLES.addEmployee',
      expectedStatus: 200,
      expectedResult: 'employeeId جديد (EMP00003)',
    },
    {
      step: 4,
      title: 'تسجيل حضور',
      command: 'انظر CURL_EXAMPLES.recordAttendance',
      expectedStatus: 200,
      expectedResult: 'attendanceId جديد',
    },
    {
      step: 5,
      title: 'تقديم طلب إجازة',
      command: 'انظر CURL_EXAMPLES.requestLeave',
      expectedStatus: 200,
      expectedResult: 'leaveId جديد مع status: pending',
    },
    {
      step: 6,
      title: 'الموافقة على الإجازة',
      command: 'انظر CURL_EXAMPLES.approveLeave',
      expectedStatus: 200,
      expectedResult: 'status يتغير إلى approved',
    },
    {
      step: 7,
      title: 'إضافة تقييم أداء',
      command: 'انظر CURL_EXAMPLES.addPerformanceReview',
      expectedStatus: 200,
      expectedResult: 'reviewId جديد مع overall rating',
    },
    {
      step: 8,
      title: 'معالجة الرواتب',
      command: 'انظر CURL_EXAMPLES.processPayroll',
      expectedStatus: 200,
      expectedResult: 'قائمة بجميع سجلات الرواتب',
    },
    {
      step: 9,
      title: 'الحصول على تقرير موظف شامل',
      command: 'انظر CURL_EXAMPLES.employeeReport',
      expectedStatus: 200,
      expectedResult: 'تقرير كامل يشمل جميع بيانات الموظف',
    },
    {
      step: 10,
      title: 'تقرير الأداء الشامل',
      command: 'انظر CURL_EXAMPLES.performanceReport',
      expectedStatus: 200,
      expectedResult: 'تحليل شامل لأداء المؤسسة',
    },
  ],
  successCriteria: [
    'جميع الطلبات تعيد status 200',
    'جميع الاستجابات تحتوي على success: true',
    'البيانات المرتجعة متطابقة مع الهيكل المتوقع',
    'العلاقات بين البيانات صحيحة (مثل: الموظف - القسم)',
    'الحسابات صحيحة (الرواتب، أيام الإجازة، ساعات العمل)',
  ],
  troubleshooting: [
    {
      issue: 'Error: Cannot find module',
      solution: 'تأكد من تسجيل المسار في server.js',
    },
    {
      issue: 'Connection refused',
      solution: 'تأكد من تشغيل Backend على المنفذ 3001',
    },
    {
      issue: 'Employee not found',
      solution: 'تحقق من employeeId الصحيح من الاستجابة السابقة',
    },
  ],
};

// =========================================================================
// تصدير البيانات
// =========================================================================

module.exports = {
  SCENARIO_1_COMPLETE_EMPLOYEE_LIFECYCLE,
  SCENARIO_2_TEAM_MANAGEMENT,
  SCENARIO_3_MONTHLY_PAYROLL,
  CURL_EXAMPLES,
  SAMPLE_EMPLOYEES,
  SAMPLE_DEPARTMENTS,
  SAMPLE_TRAININGS,
  TESTING_GUIDE,
};
