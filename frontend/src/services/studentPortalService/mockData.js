import { statusColors, surfaceColors } from 'theme/palette';

/**
 * Mock data fallback functions for Student Portal Service
 * Extracted from studentPortalService.js for maintainability
 */

export function getMockDashboardData() {
  return {
    student: {
      id: 'STU001',
      name: 'أحمد محمد علي',
      grade: 'الصف الخامس',
      section: 'أ',
      avatar: null,
      studentId: '2024001',
      email: 'ahmad.mohammed@alawael.edu.sa',
      phone: '0501234567',
    },
    stats: {
      gpa: 4.5,
      attendance: 95,
      completedAssignments: 28,
      totalAssignments: 30,
      upcomingExams: 3,
    },
    quickActions: [
      { id: 1, title: 'الجدول الدراسي', icon: 'schedule', path: '/student-portal/schedule' },
      { id: 2, title: 'الدرجات', icon: 'grades', path: '/student-portal/grades' },
      { id: 3, title: 'الواجبات', icon: 'assignments', path: '/student-portal/assignments' },
      { id: 4, title: 'الحضور', icon: 'attendance', path: '/student-portal/attendance' },
      { id: 5, title: 'التقارير المتقدمة', icon: 'reports', path: '/student-portal/reports' },
    ],
  };
}

export function getMockScheduleData() {
  const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];
  const subjects = [
    { name: 'الرياضيات', teacher: 'أ. محمد أحمد', room: '201', color: statusColors.success },
    { name: 'اللغة العربية', teacher: 'أ. فاطمة علي', room: '105', color: statusColors.info },
    { name: 'العلوم', teacher: 'أ. خالد حسن', room: '302', color: statusColors.warning },
    {
      name: 'اللغة الإنجليزية',
      teacher: 'أ. سارة محمود',
      room: '210',
      color: statusColors.purple,
    },
    {
      name: 'التربية الإسلامية',
      teacher: 'أ. عبدالله يوسف',
      room: '108',
      color: statusColors.cyan,
    },
    {
      name: 'التربية البدنية',
      teacher: 'أ. عمر إبراهيم',
      room: 'الملعب',
      color: statusColors.deepOrange,
    },
  ];

  const schedule = days.map((day, dayIndex) => ({
    day,
    classes: [
      { time: '07:30 - 08:15', subject: subjects[dayIndex % 6] },
      { time: '08:15 - 09:00', subject: subjects[(dayIndex + 1) % 6] },
      { time: '09:00 - 09:45', subject: subjects[(dayIndex + 2) % 6] },
      {
        time: '09:45 - 10:00',
        subject: { name: 'استراحة', teacher: '', room: '', color: surfaceColors.divider },
      },
      { time: '10:00 - 10:45', subject: subjects[(dayIndex + 3) % 6] },
      { time: '10:45 - 11:30', subject: subjects[(dayIndex + 4) % 6] },
      { time: '11:30 - 12:15', subject: subjects[(dayIndex + 5) % 6] },
    ],
  }));

  return { schedule, subjects };
}

export function getMockGradesData() {
  return {
    currentSemester: 'الفصل الدراسي الأول 2024/2025',
    subjects: [
      {
        id: 1,
        name: 'الرياضيات',
        teacher: 'أ. محمد أحمد',
        grades: [
          { type: 'اختبار قصير 1', score: 18, total: 20, percentage: 90, date: '2024-09-15' },
          { type: 'واجب', score: 9, total: 10, percentage: 90, date: '2024-09-20' },
          { type: 'اختبار قصير 2', score: 19, total: 20, percentage: 95, date: '2024-10-05' },
          {
            type: 'اختبار منتصف الفصل',
            score: 45,
            total: 50,
            percentage: 90,
            date: '2024-10-20',
          },
        ],
        average: 91.25,
        letterGrade: 'A',
      },
      {
        id: 2,
        name: 'اللغة العربية',
        teacher: 'أ. فاطمة علي',
        grades: [
          { type: 'اختبار قصير 1', score: 17, total: 20, percentage: 85, date: '2024-09-18' },
          { type: 'مشاركة صفية', score: 8, total: 10, percentage: 80, date: '2024-09-25' },
          { type: 'اختبار قصير 2', score: 18, total: 20, percentage: 90, date: '2024-10-10' },
          {
            type: 'اختبار منتصف الفصل',
            score: 43,
            total: 50,
            percentage: 86,
            date: '2024-10-25',
          },
        ],
        average: 85.25,
        letterGrade: 'B+',
      },
      {
        id: 3,
        name: 'العلوم',
        teacher: 'أ. خالد حسن',
        grades: [
          { type: 'اختبار قصير 1', score: 19, total: 20, percentage: 95, date: '2024-09-16' },
          { type: 'تجربة عملية', score: 10, total: 10, percentage: 100, date: '2024-09-22' },
          { type: 'اختبار قصير 2', score: 18, total: 20, percentage: 90, date: '2024-10-08' },
          {
            type: 'اختبار منتصف الفصل',
            score: 47,
            total: 50,
            percentage: 94,
            date: '2024-10-22',
          },
        ],
        average: 94.75,
        letterGrade: 'A',
      },
      {
        id: 4,
        name: 'اللغة الإنجليزية',
        teacher: 'أ. سارة محمود',
        grades: [
          { type: 'اختبار قصير 1', score: 16, total: 20, percentage: 80, date: '2024-09-19' },
          { type: 'واجب', score: 9, total: 10, percentage: 90, date: '2024-09-26' },
          { type: 'اختبار قصير 2', score: 17, total: 20, percentage: 85, date: '2024-10-12' },
          {
            type: 'اختبار منتصف الفصل',
            score: 40,
            total: 50,
            percentage: 80,
            date: '2024-10-28',
          },
        ],
        average: 83.75,
        letterGrade: 'B+',
      },
    ],
    overallGPA: 88.75,
    overallLetterGrade: 'B+',
  };
}

export function getMockAnnouncementsData() {
  return getMockOldAnnouncementsData();
}

export function getMockOldAnnouncementsData() {
  const generateAttendance = () => {
    const attendance = [];
    const today = new Date();
    for (let i = 30; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      if (date.getDay() !== 5 && date.getDay() !== 6) {
        // Skip Friday and Saturday
        attendance.push({
          date: date.toISOString().split('T')[0],
          status: Math.random() > 0.1 ? 'حاضر' : Math.random() > 0.5 ? 'غائب' : 'متأخر',
          arrivalTime: Math.random() > 0.1 ? '07:25' : '07:45',
        });
      }
    }
    return attendance;
  };

  const attendance = generateAttendance();
  const presentCount = attendance.filter(a => a.status === 'حاضر').length;
  const absentCount = attendance.filter(a => a.status === 'غائب').length;
  const lateCount = attendance.filter(a => a.status === 'متأخر').length;

  return {
    attendance,
    summary: {
      total: attendance.length,
      present: presentCount,
      absent: absentCount,
      late: lateCount,
      percentage: (((presentCount + lateCount) / attendance.length) * 100).toFixed(1),
    },
  };
}

export function getMockOldAssignmentsData2() {
  return {
    pending: [
      {
        id: 1,
        title: 'حل تمارين الرياضيات - الوحدة 3',
        subject: 'الرياضيات',
        dueDate: '2024-11-20',
        priority: 'عالي',
        description: 'حل التمارين من صفحة 45 إلى 52',
        submissionType: 'ورقي',
      },
      {
        id: 2,
        title: 'كتابة موضوع تعبير عن الوطن',
        subject: 'اللغة العربية',
        dueDate: '2024-11-22',
        priority: 'متوسط',
        description: 'موضوع تعبير لا يقل عن 250 كلمة',
        submissionType: 'إلكتروني',
      },
      {
        id: 3,
        title: 'تجربة علمية - التفاعلات الكيميائية',
        subject: 'العلوم',
        dueDate: '2024-11-25',
        priority: 'عالي',
        description: 'إجراء التجربة وكتابة تقرير مفصل',
        submissionType: 'عملي',
      },
    ],
    completed: [
      {
        id: 4,
        title: 'قراءة قصة قصيرة وتلخيصها',
        subject: 'اللغة العربية',
        dueDate: '2024-11-10',
        submittedDate: '2024-11-08',
        grade: 18,
        totalGrade: 20,
        feedback: 'أحسنت! تلخيص ممتاز',
      },
      {
        id: 5,
        title: 'حل مسائل الجبر',
        subject: 'الرياضيات',
        dueDate: '2024-11-12',
        submittedDate: '2024-11-11',
        grade: 19,
        totalGrade: 20,
        feedback: 'عمل رائع، استمر',
      },
    ],
  };
}

export function getMockOldAssignmentsData() {
  return [
    {
      id: 1,
      title: 'اختبارات نهاية الفصل الدراسي الأول',
      content:
        'تبدأ اختبارات نهاية الفصل الدراسي الأول يوم الأحد 15/12/2024. يرجى المراجعة والاستعداد الجيد.',
      date: '2024-11-13',
      priority: 'عالي',
      type: 'اختبارات',
      icon: '📝',
      author: 'الإدارة الأكاديمية',
      location: 'جميع القاعات',
    },
    {
      id: 2,
      title: 'الاحتفال باليوم الوطني',
      content: 'يسر المدرسة دعوتكم للمشاركة في فعاليات اليوم الوطني يوم الخميس القادم.',
      date: '2024-11-12',
      priority: 'متوسط',
      type: 'فعاليات',
      icon: '🎉',
      author: 'قسم الأنشطة الطلابية',
      location: 'الساحة الرئيسية',
    },
    {
      id: 3,
      title: 'تحديث جدول الحصص',
      content: 'تم تحديث جدول الحصص للأسبوع القادم. يرجى مراجعة التطبيق للاطلاع على التغييرات.',
      date: '2024-11-10',
      priority: 'منخفض',
      type: 'عام',
      icon: '📅',
      author: 'شؤون الطلاب',
    },
    {
      id: 4,
      title: 'ورشة عمل عن التفكير الإبداعي',
      content: 'ندعو جميع الطلاب للمشاركة في ورشة عمل عن التفكير الإبداعي يوم الأربعاء.',
      date: '2024-11-08',
      priority: 'متوسط',
      type: 'ورش عمل',
      icon: '💡',
      author: 'المرشد الأكاديمي',
      location: 'قاعة المؤتمرات',
    },
    {
      id: 5,
      title: 'مسابقة الرياضيات السنوية',
      content: 'انضموا إلينا في مسابقة الرياضيات السنوية. التسجيل متاح حتى نهاية الأسبوع.',
      date: '2024-11-15',
      priority: 'عالي',
      type: 'أكاديمي',
      icon: '🎓',
      author: 'قسم الرياضيات',
      location: 'معمل الحاسوب',
    },
    {
      id: 6,
      title: 'بطولة كرة القدم المدرسية',
      content: 'تبدأ بطولة كرة القدم للمرحلة الابتدائية يوم السبت القادم الساعة 3 عصراً.',
      date: '2024-11-14',
      priority: 'متوسط',
      type: 'رياضة',
      icon: '⚽',
      author: 'قسم التربية البدنية',
      location: 'الملعب الرياضي',
    },
    {
      id: 7,
      title: 'محاضرة عن الأمن السيبراني',
      content: 'محاضرة توعوية عن الأمن السيبراني وحماية البيانات الشخصية على الإنترنت.',
      date: '2024-11-11',
      priority: 'عالي',
      type: 'ورش عمل',
      icon: '💻',
      author: 'قسم تقنية المعلومات',
      location: 'قاعة 201',
    },
    {
      id: 8,
      title: 'اجتماع أولياء الأمور',
      content: 'يسرنا دعوتكم لاجتماع أولياء الأمور لمناقشة تطور أداء الطلاب.',
      date: '2024-11-09',
      priority: 'عاجل',
      type: 'عام',
      icon: '👥',
      author: 'الإدارة المدرسية',
      location: 'القاعة الكبرى',
    },
  ];
}

export function getMockAttendanceData() {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  // Generate monthly pattern
  const monthlyPattern = [];
  const statuses = ['حاضر', 'حاضر', 'حاضر', 'حاضر', 'متأخر', 'حاضر', 'عذر'];

  for (let i = 1; i <= daysInMonth; i++) {
    const date = new Date(currentYear, currentMonth, i);
    const dayOfWeek = date.getDay();

    // Skip Fridays and Saturdays (weekend)
    if (dayOfWeek !== 5 && dayOfWeek !== 6) {
      monthlyPattern.push({
        date: date.toISOString().split('T')[0],
        status: statuses[Math.floor(Math.random() * statuses.length)],
      });
    } else {
      monthlyPattern.push({
        date: date.toISOString().split('T')[0],
        status: null, // Weekend
      });
    }
  }

  // Generate detailed records
  const records = [];
  const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];

  for (let i = 0; i < 15; i++) {
    const date = new Date(currentYear, currentMonth, daysInMonth - i);
    const dayOfWeek = date.getDay();

    if (dayOfWeek !== 5 && dayOfWeek !== 6) {
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const isLate = status === 'متأخر';

      records.push({
        date: date.toISOString().split('T')[0],
        day: days[dayOfWeek],
        status: status,
        checkIn: status !== 'غائب' ? (isLate ? '07:15' : '07:00') : null,
        checkOut: status !== 'غائب' ? '13:00' : null,
        isLate: isLate,
        notes: status === 'عذر' ? 'عذر طبي' : isLate ? 'تأخر في المواصلات' : '',
      });
    }
  }

  return {
    stats: {
      totalDays: 90,
      presentDays: 80,
      absentDays: 5,
      excusedDays: 3,
      lateDays: 7,
      averageLateness: 12,
    },
    monthlyPattern: monthlyPattern,
    records: records,
    warnings: [
      'تم تسجيل 7 أيام تأخير هذا الشهر',
      'يرجى الالتزام بمواعيد الحضور لتحسين السجل الدراسي',
    ],
  };
}

export function getMockAssignmentsData() {
  return {
    stats: {
      total: 24,
      pending: 6,
      completed: 15,
      overdue: 3,
    },
    assignments: [
      {
        id: 1,
        title: 'بحث عن الطاقة المتجددة',
        subject: 'العلوم',
        teacher: 'أ. خالد حسن',
        description: 'إعداد بحث شامل عن مصادر الطاقة المتجددة وأهميتها للبيئة',
        dueDate: '2024-11-20',
        status: 'قيد التنفيذ',
        priority: 'عالي',
        attachments: true,
      },
      {
        id: 2,
        title: 'حل تمارين الجبر - الوحدة 5',
        subject: 'الرياضيات',
        teacher: 'أ. محمد أحمد',
        description: 'حل جميع تمارين الوحدة الخامسة من كتاب الرياضيات',
        dueDate: '2024-11-18',
        status: 'قيد التنفيذ',
        priority: 'متوسط',
        attachments: false,
      },
      {
        id: 3,
        title: 'تلخيص قصة "الأمير الصغير"',
        subject: 'اللغة العربية',
        teacher: 'أ. فاطمة علي',
        description: 'كتابة تلخيص شامل لقصة الأمير الصغير مع تحليل الشخصيات',
        dueDate: '2024-11-15',
        status: 'متأخر',
        priority: 'عاجل',
        attachments: true,
      },
      {
        id: 4,
        title: 'مشروع عن التاريخ الإسلامي',
        subject: 'التاريخ',
        teacher: 'أ. أحمد سالم',
        description: 'إعداد عرض تقديمي عن أهم الأحداث في العصر الإسلامي الذهبي',
        dueDate: '2024-11-25',
        status: 'قيد التنفيذ',
        priority: 'متوسط',
        attachments: false,
      },
      {
        id: 5,
        title: 'واجب اللغة الإنجليزية - Grammar',
        subject: 'اللغة الإنجليزية',
        teacher: 'Ms. Sarah',
        description: 'Complete exercises 1-5 on pages 45-50',
        dueDate: '2024-11-10',
        status: 'مكتمل',
        priority: 'منخفض',
        grade: 18,
        totalGrade: 20,
      },
      {
        id: 6,
        title: 'تجربة عملية - الكهرباء الساكنة',
        subject: 'العلوم',
        teacher: 'أ. خالد حسن',
        description: 'إجراء تجربة عملية وكتابة تقرير مفصل عن النتائج',
        dueDate: '2024-11-22',
        status: 'قيد التنفيذ',
        priority: 'عالي',
        attachments: true,
      },
    ],
  };
}

export function getMockStudentAdvancedReport(filters = {}) {
  return {
    generatedAt: new Date().toLocaleString('ar-SA'),
    filtersApplied: filters,
    student: {
      id: 'STU001',
      name: 'أحمد محمد علي',
      grade: 'الصف الخامس',
      section: 'أ',
      studentId: '2024001',
      tags: ['متفوق', 'منضبط', 'موهوب في العلوم'],
    },
    summary: {
      predictedGpa: 4.6,
      attendanceRate: 96,
      behaviorScore: 88,
      riskLevel: 'low',
      riskLevelLabel: 'منخفض',
    },
    trends: {
      gpaTrend: [
        { label: 'سبتمبر', value: 4.2 },
        { label: 'أكتوبر', value: 4.3 },
        { label: 'نوفمبر', value: 4.4 },
        { label: 'ديسمبر', value: 4.5 },
        { label: 'يناير', value: 4.6 },
      ],
      attendanceTrend: [
        { label: 'سبتمبر', value: 93 },
        { label: 'أكتوبر', value: 94 },
        { label: 'نوفمبر', value: 95 },
        { label: 'ديسمبر', value: 96 },
        { label: 'يناير', value: 96 },
      ],
    },
    subjects: [
      { subject: 'الرياضيات', average: 92, trend: 'up', trendLabel: 'تحسن مستمر' },
      { subject: 'العلوم', average: 95, trend: 'up', trendLabel: 'أداء ممتاز' },
      { subject: 'اللغة العربية', average: 87, trend: 'stable', trendLabel: 'ثابت' },
      { subject: 'اللغة الإنجليزية', average: 84, trend: 'down', trendLabel: 'يحتاج دعم' },
    ],
    skills: [
      { skill: 'التركيز', value: 86 },
      { skill: 'التعاون', value: 78 },
      { skill: 'حل المشكلات', value: 90 },
      { skill: 'المبادرة', value: 82 },
      { skill: 'إدارة الوقت', value: 75 },
    ],
    insights: [
      {
        type: 'success',
        title: 'تحسن ملحوظ في العلوم والرياضيات',
        details: 'متوسط الأداء ارتفع بنسبة 6% خلال 8 أسابيع.',
      },
      {
        type: 'warning',
        title: 'اللغة الإنجليزية تحتاج خطة دعم',
        details: 'التراجع مرتبط بالاختبارات القصيرة ونسب المشاركة.',
      },
      {
        type: 'info',
        title: 'الحضور منتظم جدًا مع تأخرات محدودة',
        details: 'سجل التأخر أقل من 3% خلال الفصل.',
      },
    ],
    riskSignals: [
      { label: 'مخاطر الحضور', level: 'low', levelLabel: 'منخفض', score: 20 },
      { label: 'مخاطر الواجبات', level: 'medium', levelLabel: 'متوسط', score: 45 },
      { label: 'مخاطر السلوك', level: 'low', levelLabel: 'منخفض', score: 18 },
    ],
    recommendations: [
      {
        title: 'خطة دعم اللغة الإنجليزية',
        priority: 'عالية',
        actions: [
          'جلسات مراجعة أسبوعية مع المعلمة.',
          'تحديد أهداف قصيرة المدى للقراءة والكتابة.',
          'تكليف تدريبات إضافية تفاعلية في المنزل.',
        ],
      },
      {
        title: 'تعزيز مهارات إدارة الوقت',
        priority: 'متوسطة',
        actions: [
          'استخدام مخطط أسبوعي للواجبات.',
          'تقسيم المهام إلى أجزاء يومية صغيرة.',
          'متابعة الالتزام عبر تطبيق التذكير.',
        ],
      },
    ],
    comparison: {
      current: {
        label: 'الفصل الحالي',
        summary: 'معدل 4.6 مع تحسن واضح في العلوم والرياضيات.',
      },
      previous: {
        label: 'الفصل السابق',
        summary: 'معدل 4.3 مع تذبذب في اللغة الإنجليزية.',
      },
      delta: [
        { label: 'المعدل', value: '+0.3', type: 'positive' },
        { label: 'الحضور', value: '+2%', type: 'positive' },
        { label: 'الواجبات المتأخرة', value: '+1', type: 'warning' },
      ],
    },
  };
}
