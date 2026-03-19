// Parent Portal Service with Mock Data
export const parentService = {
  async getParentDashboard(parentId) {
    return {
      children: [
        {
          id: 'child001',
          name: 'أحمد محمد',
          age: 8,
          overallProgress: 75,
          attendance: 95,
          sessionsCompleted: 24,
          nextSessionDays: 3,
          skills: [
            {
              id: 1,
              name: 'النطق الواضح',
              progress: 85,
              status: 'محسّن',
              lastUpdate: '2025-01-15',
            },
            {
              id: 2,
              name: 'الفهم السمعي',
              progress: 72,
              status: 'مستقر',
              lastUpdate: '2025-01-14',
            },
            {
              id: 3,
              name: 'التواصل الاجتماعي',
              progress: 68,
              status: 'يحتاج تحسين',
              lastUpdate: '2025-01-13',
            },
          ],
          upcomingSessions: [
            {
              id: 1,
              date: '2025-01-20',
              time: '02:00 PM',
              therapist: 'فاطمة علي',
              type: 'جلسة فردية',
            },
            {
              id: 2,
              date: '2025-01-22',
              time: '03:30 PM',
              therapist: 'محمد إبراهيم',
              type: 'جلسة متابعة',
            },
          ],
          therapists: [
            {
              id: 1,
              name: 'فاطمة علي',
              specialization: 'متخصصة نطق وتخاطب',
              phone: '050-1234567',
              email: 'fatima@clinic.com',
            },
            {
              id: 2,
              name: 'محمد إبراهيم',
              specialization: 'متخصص سلوك وتطور',
              phone: '050-7654321',
              email: 'mohammad@clinic.com',
            },
          ],
          documents: [
            {
              id: 1,
              title: 'تقرير التقييم الأولي',
              type: 'PDF',
              date: '2025-01-10',
            },
            {
              id: 2,
              title: 'خطة العلاج',
              type: 'PDF',
              date: '2025-01-12',
            },
          ],
        },
        {
          id: 'child002',
          name: 'فاطمة محمد',
          age: 6,
          overallProgress: 82,
          attendance: 92,
          sessionsCompleted: 18,
          nextSessionDays: 5,
          skills: [
            {
              id: 1,
              name: 'المهارات الحركية الدقيقة',
              progress: 90,
              status: 'محسّن',
              lastUpdate: '2025-01-15',
            },
          ],
          upcomingSessions: [],
          therapists: [],
          documents: [],
        },
      ],
      alerts: [
        {
          id: 1,
          message: 'الرجاء تأكيد الجلسة المقررة يوم الاثنين',
          date: '2025-01-16',
        },
        {
          id: 2,
          message: 'تقرير المتابعة الشهرية متاح الآن',
          date: '2025-01-14',
        },
      ],
    };
  },

  async getChildrenProgress(parentId) {
    return {
      children: [
        {
          id: 'child001',
          name: 'أحمد محمد',
          skillsImproved: 5,
          averageProgress: 75,
          milestonesReached: 8,
          coreSkills: [
            {
              id: 1,
              name: 'النطق والتلفظ',
              progress: 85,
              target: '100%',
              therapist: 'فاطمة علي',
              lastUpdate: '2025-01-15',
            },
            {
              id: 2,
              name: 'الفهم اللغوي',
              progress: 72,
              target: '80%',
              therapist: 'فاطمة علي',
              lastUpdate: '2025-01-14',
            },
            {
              id: 3,
              name: 'المرونة الحركية',
              progress: 65,
              target: '85%',
              therapist: 'محمد إبراهيم',
              lastUpdate: '2025-01-13',
            },
            {
              id: 4,
              name: 'التفاعل الاجتماعي',
              progress: 68,
              target: '75%',
              therapist: 'محمد إبراهيم',
              lastUpdate: '2025-01-15',
            },
          ],
          monthlyProgress: [
            {
              id: 1,
              month: 'نوفمبر',
              progress: 55,
              sessions: 4,
              notes: 'بداية جيدة',
            },
            {
              id: 2,
              month: 'ديسمبر',
              progress: 68,
              sessions: 5,
              notes: 'تحسن ملحوظ',
            },
            {
              id: 3,
              month: 'يناير',
              progress: 75,
              sessions: 6,
              notes: 'استمرار التقدم',
            },
          ],
          achievements: [
            {
              id: 1,
              title: 'إتقان الأصوات الصعبة',
              date: '2025-01-10',
              color1: '#43e97b',
              color2: '#38f9d7',
            },
            {
              id: 2,
              title: 'شهادة المثابرة',
              date: '2025-01-05',
              color1: '#fa709a',
              color2: '#fee140',
            },
          ],
          improvedAreas: [
            {
              id: 1,
              name: 'النطق الواضح',
              description: 'تحسن ملحوظ في التلفظ الصحيح للأصوات',
              improvement: 30,
              date: '2025-01-15',
            },
            {
              id: 2,
              name: 'التواصل',
              description: 'زيادة ثقة الطفل في التحدث',
              improvement: 25,
              date: '2025-01-10',
            },
          ],
        },
      ],
    };
  },

  async getAttendanceReports(parentId) {
    return {
      summaryStats: [
        { id: 1, value: '24', label: 'الجلسات المكتملة', color: '#4CAF50' },
        { id: 2, value: '95%', label: 'نسبة الحضور', color: '#2196F3' },
        { id: 3, value: '1', label: 'جلسات منقطعة', color: '#F44336' },
        { id: 4, value: '2', label: 'جلسات متأخرة', color: '#FF9800' },
      ],
      attendanceRecords: [
        {
          id: 1,
          date: '2025-01-15',
          time: '02:00 PM',
          therapist: 'فاطمة علي',
          status: 'حاضر',
          notes: 'جلسة منتجة جداً',
        },
        {
          id: 2,
          date: '2025-01-13',
          time: '03:30 PM',
          therapist: 'محمد إبراهيم',
          status: 'حاضر',
          notes: 'أداء جيد',
        },
        {
          id: 3,
          date: '2025-01-10',
          time: '02:00 PM',
          therapist: 'فاطمة علي',
          status: 'حاضر',
          notes: 'تحسن في الأداء',
        },
        {
          id: 4,
          date: '2025-01-08',
          time: '03:30 PM',
          therapist: 'محمد إبراهيم',
          status: 'متأخر',
          notes: 'متأخر 10 دقائق',
        },
        {
          id: 5,
          date: '2025-01-05',
          time: '02:00 PM',
          therapist: 'فاطمة علي',
          status: 'متأخر',
          notes: 'متأخر 15 دقيقة',
        },
      ],
      behaviorReports: [
        {
          id: 1,
          date: '2025-01-15',
          therapist: 'فاطمة علي',
          positiveTraits: ['التركيز', 'الاستيعاب السريع', 'التعاون'],
          areasToImprove: ['الصبر', 'الجلوس الهادئ'],
          summary: 'أظهر الطفل تحسناً ملحوظاً في مستوى التركيز والفهم',
        },
        {
          id: 2,
          date: '2025-01-10',
          therapist: 'محمد إبراهيم',
          positiveTraits: ['اللطف', 'المرونة'],
          areasToImprove: ['التحكم في الانفعالات'],
          summary: 'جلسة جيدة مع تحسن في المهارات الاجتماعية',
        },
      ],
      performanceMetrics: [
        {
          id: 1,
          name: 'مستوى الاستيعاب',
          score: 8.5,
          color: '#4CAF50',
          notes: 'تحسن ملحوظ',
        },
        {
          id: 2,
          name: 'التواصل والتفاعل',
          score: 7.2,
          color: '#2196F3',
          notes: 'جيد وفي تحسن',
        },
        {
          id: 3,
          name: 'الالتزام والانضباط',
          score: 7.8,
          color: '#FF9800',
          notes: 'مقبول',
        },
        {
          id: 4,
          name: 'المهارات الحركية',
          score: 8.0,
          color: '#9C27B0',
          notes: 'جيد جداً',
        },
      ],
    };
  },

  async getTherapistCommunications(parentId) {
    return {
      therapists: [
        {
          id: 'therapist001',
          name: 'فاطمة علي',
          specialization: 'متخصصة نطق وتخاطب',
          unreadCount: 2,
          lastMessage: 'الطفل أظهر تحسناً جيداً في الجلسة الأخيرة',
          messages: [
            {
              id: 1,
              sender: 'فاطمة علي',
              senderType: 'therapist',
              text: 'السلام عليكم، كيف حال أحمد؟',
              timestamp: '10:30 AM',
              date: '2025-01-15',
            },
            {
              id: 2,
              sender: 'أنت',
              senderType: 'parent',
              text: 'عليكم السلام، الحمد لله بخير. كيف الجلسة؟',
              timestamp: '10:35 AM',
              date: '2025-01-15',
            },
          ],
        },
        {
          id: 'therapist002',
          name: 'محمد إبراهيم',
          specialization: 'متخصص سلوك وتطور',
          unreadCount: 1,
          lastMessage: 'موعد الجلسة القادمة الخميس الساعة 3:30',
          messages: [
            {
              id: 1,
              sender: 'محمد إبراهيم',
              senderType: 'therapist',
              text: 'موعد الجلسة القادمة الخميس',
              timestamp: '02:15 PM',
              date: '2025-01-14',
            },
          ],
        },
      ],
    };
  },

  async getPaymentsHistory(parentId) {
    return {
      summaryCards: [
        { id: 1, amount: '15,000 ر.س', label: 'إجمالي المدفوع', color: '#4CAF50' },
        { id: 2, amount: '3,000 ر.س', label: 'قيد الانتظار', color: '#FF9800' },
        { id: 3, amount: '500 ر.س', label: 'متأخر', color: '#F44336' },
        { id: 4, amount: '24', label: 'عدد الفواتير', color: '#2196F3' },
      ],
      payments: [
        {
          id: 1,
          invoiceNumber: 'INV-001',
          date: '2025-01-15',
          description: 'جلسات علاج نطق (5 جلسات)',
          amount: '5,000',
          status: 'مدفوعة',
        },
        {
          id: 2,
          invoiceNumber: 'INV-002',
          date: '2025-01-10',
          description: 'جلسات تطور السلوك (3 جلسات)',
          amount: '3,000',
          status: 'مدفوعة',
        },
        {
          id: 3,
          invoiceNumber: 'INV-003',
          date: '2025-01-05',
          description: 'جلسات تقييم وتشخيص',
          amount: '2,000',
          status: 'مدفوعة',
        },
        {
          id: 4,
          invoiceNumber: 'INV-004',
          date: '2025-01-01',
          description: 'رسوم الاشتراك الشهري',
          amount: '1,500',
          status: 'قيد الانتظار',
        },
        {
          id: 5,
          invoiceNumber: 'INV-005',
          date: '2024-12-20',
          description: 'جلسات إضافية',
          amount: '1,500',
          status: 'متأخرة',
        },
      ],
      paymentMethods: [
        {
          id: 1,
          type: 'بطاقة ائتمان',
          details: 'Visa ending in 4242',
          isDefault: true,
        },
        {
          id: 2,
          type: 'تحويل بنكي',
          details: 'البنك الأهلي - SA1234567890',
          isDefault: false,
        },
      ],
    };
  },

  async getDocumentsReports(parentId) {
    return {
      stats: [
        { id: 1, value: '32', label: 'إجمالي المستندات', color: '#667eea' },
        { id: 2, value: '12', label: 'التقارير الطبية', color: '#43e97b' },
        { id: 3, value: '15', label: 'الفحوصات', color: '#f5af19' },
        { id: 4, value: '5', label: 'شهادات الإنجاز', color: '#fa709a' },
      ],
      folders: [
        { id: 'all', name: 'جميع المستندات', count: 32 },
        { id: 'reports', name: 'التقارير الطبية', count: 12 },
        { id: 'assessments', name: 'الفحوصات والاختبارات', count: 15 },
        { id: 'achievements', name: 'الإنجازات والشهادات', count: 5 },
      ],
      documents: [
        {
          id: 1,
          name: 'تقرير التقييم الأولي',
          type: 'PDF',
          size: '2.5 MB',
          date: '2025-01-15',
          category: 'reports',
          description: 'تقرير التقييم الشامل الأولي',
          therapist: 'فاطمة علي',
          lastUpdated: '2025-01-15',
          status: 'مكتمل',
        },
        {
          id: 2,
          name: 'خطة العلاج',
          type: 'PDF',
          size: '1.8 MB',
          date: '2025-01-12',
          category: 'reports',
          description: 'خطة العلاج الفردية',
          therapist: 'محمد إبراهيم',
          lastUpdated: '2025-01-15',
          status: 'مكتمل',
        },
        {
          id: 3,
          name: 'اختبار النطق',
          type: 'صورة',
          size: '3.2 MB',
          date: '2025-01-10',
          category: 'assessments',
          description: 'نتائج اختبار النطق والتلفظ',
          therapist: 'فاطمة علي',
          lastUpdated: '2025-01-10',
          status: 'مكتمل',
        },
        {
          id: 4,
          name: 'شهادة الإنجاز الأولى',
          type: 'PDF',
          size: '0.9 MB',
          date: '2025-01-05',
          category: 'achievements',
          description: 'شهادة إتقان الأصوات الأساسية',
          therapist: 'فاطمة علي',
          lastUpdated: '2025-01-05',
          status: 'مكتمل',
        },
        {
          id: 5,
          name: 'تقرير المتابعة الشهرية',
          type: 'PDF',
          size: '2.1 MB',
          date: '2025-01-01',
          category: 'reports',
          description: 'تقرير المتابعة والتقدم الشهري',
          therapist: 'محمد إبراهيم',
          lastUpdated: '2025-01-01',
          status: 'مكتمل',
        },
      ],
    };
  },

  async getAppointmentsScheduling(parentId) {
    return {
      stats: [
        { id: 1, value: '3', label: 'جلسات قادمة', color: '#667eea' },
        { id: 2, value: '24', label: 'جلسات مكتملة', color: '#4CAF50' },
        { id: 3, value: '95%', label: 'نسبة الحضور', color: '#2196F3' },
        { id: 4, value: '8.5/10', label: 'متوسط الرضا', color: '#FF9800' },
      ],
      therapists: [
        { id: 1, name: 'فاطمة علي', specialization: 'نطق وتخاطب' },
        { id: 2, name: 'محمد إبراهيم', specialization: 'سلوك وتطور' },
      ],
      upcomingAppointments: [
        {
          id: 1,
          date: '2025-01-20',
          time: '02:00 PM',
          childName: 'أحمد محمد',
          therapist: 'فاطمة علي',
          type: 'جلسة فردية',
          status: 'مؤكدة',
        },
        {
          id: 2,
          date: '2025-01-22',
          time: '03:30 PM',
          childName: 'أحمد محمد',
          therapist: 'محمد إبراهيم',
          type: 'جلسة متابعة',
          status: 'قيد المعالجة',
        },
        {
          id: 3,
          date: '2025-01-25',
          time: '02:00 PM',
          childName: 'فاطمة محمد',
          therapist: 'فاطمة علي',
          type: 'جلسة فردية',
          status: 'مؤكدة',
        },
      ],
      completedSessions: [
        {
          id: 1,
          date: '2025-01-15',
          childName: 'أحمد محمد',
          therapist: 'فاطمة علي',
          notes: 'جلسة منتجة جداً، تحسن في النطق الواضح',
        },
        {
          id: 2,
          date: '2025-01-13',
          childName: 'أحمد محمد',
          therapist: 'محمد إبراهيم',
          notes: 'عمل على المهارات الاجتماعية',
        },
      ],
    };
  },

  async getParentMessages(parentId) {
    return {
      stats: [
        { id: 1, value: '12', label: 'رسائل جديدة', color: '#667eea' },
        { id: 2, value: '45', label: 'إجمالي الرسائل', color: '#4CAF50' },
        { id: 3, value: '8', label: 'إعلانات مهمة', color: '#FF9800' },
        { id: 4, value: '15', label: 'نقاشات فعالة', color: '#2196F3' },
      ],
      inbox: [
        {
          id: 1,
          sender: 'فاطمة علي',
          date: '2025-01-15',
          lastMessage: 'الطفل أظهر تحسناً جيداً في الجلسة الأخيرة',
          subject: 'تقرير الجلسة',
          content: 'السلام عليكم، أحمد أظهر تحسناً ملحوظاً في النطق الواضح. استمروا على نفس النهج في المنزل.',
          unread: true,
        },
        {
          id: 2,
          sender: 'محمد إبراهيم',
          date: '2025-01-13',
          lastMessage: 'موعد الجلسة القادمة الخميس الساعة 3:30',
          subject: 'تأكيد الموعد',
          content: 'الجلسة القادمة تم تأكيدها يوم الخميس الساعة 3:30 مساءً. الرجاء التأكد من الحضور في الوقت المحدد.',
          unread: true,
        },
      ],
      announcements: [
        {
          id: 1,
          title: 'إجازة العيد',
          from: 'إدارة المركز',
          date: '2025-01-10',
          content: 'سيتم إغلاق المركز من 15 إلى 20 يناير بمناسبة عطلة العيد. يرجى ملاحظة ذلك.',
          tags: ['مهم', 'إجازة'],
        },
        {
          id: 2,
          title: 'تحديثات البرنامج',
          from: 'الدعم الفني',
          date: '2025-01-05',
          content: 'تم تحديث تطبيق البوابة. يرجى تحديث التطبيق من متجر التطبيقات.',
          tags: ['تحديث'],
        },
      ],
      forums: [
        {
          id: 1,
          author: 'سارة أحمد',
          date: '2025-01-14',
          topic: 'نصائح لتحسين النطق في المنزل',
          message: 'السلام عليكم، هل لديكم نصائح للعمل على النطق في البيت؟',
          replies: 5,
        },
        {
          id: 2,
          author: 'علي محمد',
          date: '2025-01-12',
          topic: 'تجربتي مع المركز',
          message: 'الخدمات في المركز رائعة والمعالجون محترفون جداً',
          replies: 8,
        },
      ],
    };
  },
};
