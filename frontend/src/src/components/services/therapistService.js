// Mock Data Service for Therapist Portal

export const therapistService = {
  // الحصول على بيانات لوحة المعلومات
  async getTherapistDashboard(therapistId) {
    return {
      therapist: {
        id: therapistId,
        name: 'أحمد محمد',
        specialization: 'متخصص في العلاج الحركي',
        clinic: 'عيادة النور المتخصصة',
      },
      stats: {
        totalPatients: 24,
        activePatients: 18,
        weeklySessions: 15,
        completedSessions: 13,
        improvementRate: 78,
        improvementTrend: 12,
        patientSatisfaction: 95,
        totalRatings: 96,
      },
      todaySessions: [
        {
          id: 1,
          time: '09:00',
          patient: { name: 'محمد علي', age: 8 },
          type: 'جلسة فردية',
          status: 'محدد',
        },
        {
          id: 2,
          time: '10:00',
          patient: { name: 'فاطمة أحمد', age: 7 },
          type: 'جلسة فردية',
          status: 'محدد',
        },
        {
          id: 3,
          time: '11:00',
          patient: { name: 'سارة محمود', age: 9 },
          type: 'متابعة',
          status: 'جاري',
        },
        {
          id: 4,
          time: '14:00',
          patient: { name: 'عمر خالد', age: 10 },
          type: 'جلسة جماعية',
          status: 'محدد',
        },
        {
          id: 5,
          time: '15:30',
          patient: { name: 'ليلى يوسف', age: 8 },
          type: 'جلسة فردية',
          status: 'محدد',
        },
      ],
      urgentCases: [
        {
          id: 1,
          patientName: 'محمد علي',
          issue: 'تأخر في النطق - بحاجة لتقييم إضافي',
          priority: 'عاجل',
        },
        {
          id: 2,
          patientName: 'خديجة محمود',
          issue: 'تحسن بطيء - قد تحتاج لتعديل الخطة',
          priority: 'عالي',
        },
      ],
      monthlyStats: {
        totalSessions: 127,
        completedSessions: 119,
        cancelledSessions: 8,
        attendanceRate: 89,
      },
    };
  },

  // الحصول على قائمة المرضى
  async getTherapistPatients(therapistId) {
    return [
      {
        id: 'P001',
        name: 'محمد علي',
        phone: '0534445566',
        email: 'mohammad@email.com',
        address: 'الرياض - حي العليا',
        diagnosis: 'تأخر نطق',
        startDate: '2025-08-15',
        sessionCount: 12,
        progress: 65,
        status: 'نشط',
      },
      {
        id: 'P002',
        name: 'فاطمة أحمد',
        phone: '0545667788',
        email: 'fatima@email.com',
        address: 'الرياض - حي الملز',
        diagnosis: 'صعوبات تعلم',
        startDate: '2025-07-20',
        sessionCount: 18,
        progress: 78,
        status: 'نشط',
      },
      {
        id: 'P003',
        name: 'سارة محمود',
        phone: '0567889900',
        email: 'sara@email.com',
        address: 'الرياض - حي السفارات',
        diagnosis: 'تأخر نمو حركي',
        startDate: '2025-09-01',
        sessionCount: 8,
        progress: 52,
        status: 'نشط',
      },
      {
        id: 'P004',
        name: 'عمر خالد',
        phone: '0512334455',
        email: 'omar@email.com',
        address: 'الرياض - حي الرمال',
        diagnosis: 'فرط الحركة',
        startDate: '2025-06-10',
        sessionCount: 25,
        progress: 85,
        status: 'متوقف مؤقتاً',
      },
      {
        id: 'P005',
        name: 'ليلى يوسف',
        phone: '0523445566',
        email: 'layla@email.com',
        address: 'الرياض - حي الرصيفة',
        diagnosis: 'توحد - درجة خفيفة',
        startDate: '2025-05-05',
        sessionCount: 32,
        progress: 92,
        status: 'مكتمل',
      },
      {
        id: 'P006',
        name: 'خديجة محمود',
        phone: '0556677889',
        email: 'khadija@email.com',
        address: 'الرياض - حي الروضة',
        diagnosis: 'صعوبات في المهارات الحركية الدقيقة',
        startDate: '2025-08-01',
        sessionCount: 10,
        progress: 48,
        status: 'نشط',
      },
    ];
  },

  // الحصول على جدول المواعيد
  async getTherapistSchedule(therapistId) {
    return [
      {
        day: 'الأحد',
        sessions: [
          { id: 1, time: '08:00', patientName: 'محمد علي', type: 'فردية', notes: 'متابعة النطق' },
          { id: 2, time: '09:30', patientName: 'فاطمة أحمد', type: 'فردية', notes: 'تقييم التقدم' },
          { id: 3, time: '11:00', patientName: 'سارة محمود', type: 'متابعة', notes: '' },
        ],
      },
      {
        day: 'الاثنين',
        sessions: [
          { id: 4, time: '09:00', patientName: 'عمر خالد', type: 'جماعية', notes: 'جلسة مع مجموعة' },
          { id: 5, time: '14:00', patientName: 'ليلى يوسف', type: 'فردية', notes: 'جلسة تقوية' },
        ],
      },
      {
        day: 'الثلاثاء',
        sessions: [
          { id: 6, time: '10:00', patientName: 'خديجة محمود', type: 'فردية', notes: 'مهارات حركية' },
          { id: 7, time: '15:30', patientName: 'محمد علي', type: 'استشارة', notes: 'استشارة أولياء الأمور' },
        ],
      },
      {
        day: 'الأربعاء',
        sessions: [
          { id: 8, time: '08:30', patientName: 'فاطمة أحمد', type: 'جماعية', notes: 'جلسة جماعية' },
          { id: 9, time: '11:00', patientName: 'سارة محمود', type: 'فردية', notes: '' },
        ],
      },
      {
        day: 'الخميس',
        sessions: [
          { id: 10, time: '09:00', patientName: 'عمر خالد', type: 'متابعة', notes: 'متابعة التقدم' },
          { id: 11, time: '14:00', patientName: 'ليلى يوسف', type: 'فردية', notes: '' },
          { id: 12, time: '16:00', patientName: 'خديجة محمود', type: 'استشارة', notes: '' },
        ],
      },
    ];
  },

  // الحصول على تقارير الجلسات
  async getTherapistSessions(therapistId) {
    return [
      {
        id: 'S001',
        patientName: 'محمد علي',
        date: '2025-01-10',
        duration: '60',
        rating: 4,
        notes: 'جلسة ناجحة جداً، أظهر المريض تحسناً في النطق الواضح',
        achievements: 'تم نطق 5 كلمات جديدة بشكل صحيح، تحسن في الوعي الصوتي',
        nextGoals: 'العمل على جمل بسيطة، تحسين الوضوح الصوتي',
      },
      {
        id: 'S002',
        patientName: 'فاطمة أحمد',
        date: '2025-01-09',
        duration: '45',
        rating: 5,
        notes: 'جلسة ممتازة جداً، المريضة متعاونة جداً',
        achievements: 'إتقان مهارة جديدة في القراءة، تحسن في التركيز',
        nextGoals: 'تطبيق المهارات في بيئة طبيعية',
      },
      {
        id: 'S003',
        patientName: 'سارة محمود',
        date: '2025-01-08',
        duration: '50',
        rating: 3,
        notes: 'جلسة معتادة، المريضة تحتاج تشجيع أكثر',
        achievements: 'تحسن طفيف في المهارات الحركية',
        nextGoals: 'زيادة التحديات، استخدام أدوات تحفيزية',
      },
      {
        id: 'S004',
        patientName: 'عمر خالد',
        date: '2025-01-07',
        duration: '60',
        rating: 4,
        notes: 'جلسة جماعية فعالة، أظهر تفاعلاً جيداً مع الآخرين',
        achievements: 'تحسن في التفاعل الاجتماعي، انخفاض الحركة الزائدة',
        nextGoals: 'العمل على الانتباه والتركيز',
      },
      {
        id: 'S005',
        patientName: 'ليلى يوسف',
        date: '2025-01-06',
        duration: '55',
        rating: 5,
        notes: 'جلسة رائعة، تقدم ملحوظ جداً',
        achievements: 'تحسن كبير في التواصل الاجتماعي والتفاعل',
        nextGoals: 'تعميم المهارات في بيئات مختلفة',
      },
    ];
  },

  // الحصول على الحالات
  async getTherapistCases(therapistId) {
    return [
      {
        id: 'C001',
        patientName: 'محمد علي',
        diagnosis: 'تأخر نطق',
        age: 8,
        status: 'نشط',
        progress: 65,
        sessionCount: 12,
        startDate: '2025-08-15',
        treatmentPlan: 'العمل على تحسين النطق من خلال تمارين صوتية وتحفيز صوتي',
      },
      {
        id: 'C002',
        patientName: 'فاطمة أحمد',
        diagnosis: 'صعوبات تعلم',
        age: 7,
        status: 'نشط',
        progress: 78,
        sessionCount: 18,
        startDate: '2025-07-20',
        treatmentPlan: 'استراتيجيات تعليمية مخصصة لتحسين القراءة والكتابة',
      },
      {
        id: 'C003',
        patientName: 'سارة محمود',
        diagnosis: 'تأخر نمو حركي',
        age: 9,
        status: 'نشط',
        progress: 52,
        sessionCount: 8,
        startDate: '2025-09-01',
        treatmentPlan: 'تمارين حركية تدريجية لتحسين التوازن والتنسيق',
      },
      {
        id: 'C004',
        patientName: 'عمر خالد',
        diagnosis: 'فرط الحركة',
        age: 10,
        status: 'متوقف مؤقتاً',
        progress: 85,
        sessionCount: 25,
        startDate: '2025-06-10',
        treatmentPlan: 'أنشطة تركيز وتنظيم سلوكي',
      },
      {
        id: 'C005',
        patientName: 'ليلى يوسف',
        diagnosis: 'توحد - درجة خفيفة',
        age: 8,
        status: 'مكتمل',
        progress: 92,
        sessionCount: 32,
        startDate: '2025-05-05',
        treatmentPlan: 'تمارين تواصل اجتماعي وتفاعلي',
      },
    ];
  },

  // الحصول على المستندات
  async getTherapistDocuments(therapistId) {
    return [
      {
        id: 'D001',
        name: 'تقرير تقييم محمد علي',
        patientName: 'محمد علي',
        type: 'PDF',
        size: 2.5,
        date: '2025-01-10',
        access: 'خاص',
      },
      {
        id: 'D002',
        name: 'صور من الجلسات',
        patientName: 'فاطمة أحمد',
        type: 'Image',
        size: 15,
        date: '2025-01-09',
        access: 'خاص',
      },
      {
        id: 'D003',
        name: 'تسجيل صوتي للجلسة',
        patientName: 'سارة محمود',
        type: 'Audio',
        size: 8,
        date: '2025-01-08',
        access: 'خاص',
      },
      {
        id: 'D004',
        name: 'فيديو تمارين علاجية',
        patientName: 'عمر خالد',
        type: 'Video',
        size: 45,
        date: '2025-01-07',
        access: 'خاص',
      },
      {
        id: 'D005',
        name: 'خطة العلاج - ليلى يوسف',
        patientName: 'ليلى يوسف',
        type: 'PDF',
        size: 1.8,
        date: '2025-01-06',
        access: 'خاص',
      },
      {
        id: 'D006',
        name: 'صور التقدم الشهري',
        patientName: 'خديجة محمود',
        type: 'Image',
        size: 12,
        date: '2025-01-05',
        access: 'خاص',
      },
    ];
  },

  // الحصول على التقارير
  async getTherapistReports(therapistId) {
    return {
      summary: {
        totalSessions: 127,
        completedSessions: 119,
        cancelledSessions: 8,
        averageRating: 4.6,
        patientImprovement: 72,
        attendanceRate: 89,
      },
      progressData: [
        { month: 'يناير', improvement: 45 },
        { month: 'فبراير', improvement: 52 },
        { month: 'مارس', improvement: 61 },
        { month: 'أبريل', improvement: 68 },
        { month: 'مايو', improvement: 75 },
      ],
    };
  },

  // الحصول على الرسائل
  async getTherapistMessages(therapistId) {
    return [
      {
        id: '1',
        name: 'د. محمد أحمد',
        type: 'teacher',
        lastMessage: 'كيف حالة محمد في آخر جلسة؟',
        time: 'منذ 5 دقائق',
        unread: 1,
        starred: true,
        messages: [
          { id: 1, sender: 'other', senderName: 'د. محمد أحمد', text: 'السلام عليكم ورحمة الله', time: '10:00' },
          { id: 2, sender: 'me', text: 'وعليكم السلام ورحمة الله وبركاته', time: '10:01' },
          { id: 3, sender: 'other', senderName: 'د. محمد أحمد', text: 'كيف حالة محمد في آخر جلسة؟', time: '10:05' },
          { id: 4, sender: 'me', text: 'تحسن ملحوظ جداً، نطق كلمات جديدة بشكل صحيح', time: '10:06' },
        ],
      },
      {
        id: '2',
        name: 'مجموعة الدراسة',
        type: 'group',
        lastMessage: 'الاجتماع غداً الساعة 3 مساءً',
        time: 'منذ ساعة',
        unread: 0,
        starred: false,
        messages: [
          { id: 1, sender: 'other', senderName: 'أحمد', text: 'مرحباً بالجميع', time: '09:00' },
          { id: 2, sender: 'me', text: 'أهلا', time: '09:01' },
          { id: 3, sender: 'other', senderName: 'فاطمة', text: 'الاجتماع غداً الساعة 3 مساءً', time: '09:05' },
        ],
      },
      {
        id: '3',
        name: 'الإدارة المدرسية',
        type: 'admin',
        lastMessage: 'يرجى تقديم التقارير قبل نهاية الأسبوع',
        time: 'منذ يومين',
        unread: 2,
        starred: true,
        messages: [
          { id: 1, sender: 'other', senderName: 'الإدارة', text: 'السلام عليكم', time: 'أمس' },
          { id: 2, sender: 'me', text: 'وعليكم السلام', time: 'أمس' },
          { id: 3, sender: 'other', senderName: 'الإدارة', text: 'يرجى تقديم التقارير قبل نهاية الأسبوع', time: 'الآن' },
        ],
      },
      {
        id: '4',
        name: 'والدة محمد علي',
        type: 'parent',
        lastMessage: 'شكراً على الجهود، لاحظنا تحسن كبير',
        time: 'منذ 3 أيام',
        unread: 0,
        starred: false,
        messages: [
          { id: 1, sender: 'other', senderName: 'أم محمد', text: 'السلام عليكم', time: 'قبل 3 أيام' },
          { id: 2, sender: 'me', text: 'وعليكم السلام', time: 'قبل 3 أيام' },
        ],
      },
      {
        id: '5',
        name: 'زميل - خالد محمود',
        type: 'colleague',
        lastMessage: 'هل تريد أن نتعاون في حالة معقدة؟',
        time: 'منذ أسبوع',
        unread: 0,
        starred: false,
        messages: [{ id: 1, sender: 'other', senderName: 'خالد', text: 'مرحباً', time: 'الأسبوع الماضي' }],
      },
    ];
  },
};
