import axios from 'axios';

/**
 * Admin Portal Service
 * Comprehensive API functions with complete mock data
 */

export const adminService = {
  // Get Admin Dashboard Data
  async getAdminDashboard(adminId) {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({
          totalUsers: 156,
          activeUsers: 142,
          totalTherapists: 28,
          activeTherapists: 26,
          totalPatients: 87,
          patientsInTreatment: 73,
          systemHealth: 98,
          services: [
            { id: 1, name: 'قاعدة البيانات', status: 'تعمل بكفاءة', uptime: 99.8 },
            { id: 2, name: 'خادم المصادقة', status: 'تعمل بكفاءة', uptime: 99.9 },
            { id: 3, name: 'خدمة الرسائل', status: 'تعمل بكفاءة', uptime: 98.5 },
            { id: 4, name: 'خدمة التقارير', status: 'تعمل بكفاءة', uptime: 97.2 },
          ],
          recentActivity: [
            { initials: 'أ م', action: 'تسجيل دخول جديد', timestamp: 'قبل 5 دقائق' },
            { initials: 'س ع', action: 'إضافة مريض جديد', timestamp: 'قبل 23 دقيقة' },
            { initials: 'ف ح', action: 'تعديل جدول الجلسات', timestamp: 'قبل 1 ساعة' },
            { initials: 'م ك', action: 'تحميل وثائق', timestamp: 'قبل 2 ساعة' },
          ],
          alerts: [
            {
              id: 1,
              type: 'تنبيه أمان',
              message: 'عدة محاولات دخول فاشلة من عنوان IP غير معروف',
              severity: 'عالية',
              timestamp: '2025-01-13 10:30',
            },
            {
              id: 2,
              type: 'تنبيه نظام',
              message: 'استخدام مساحة التخزين: 85% ممتلأة',
              severity: 'متوسطة',
              timestamp: '2025-01-13 10:15',
            },
            {
              id: 3,
              type: 'تنبيه صيانة',
              message: 'يتطلب النسخ الاحتياطي المجدول',
              severity: 'منخفضة',
              timestamp: '2025-01-13 09:45',
            },
          ],
        });
      }, 500);
    });
  },

  // Get Admin Users
  async getAdminUsers(adminId) {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve([
          {
            id: 'user001',
            name: 'أحمد محمد',
            email: 'ahmed.m@clinic.sa',
            phone: '0501234567',
            role: 'إدارة',
            status: 'نشط',
            createdDate: '2024-01-15',
          },
          {
            id: 'user002',
            name: 'فاطمة علي',
            email: 'fatima.a@clinic.sa',
            phone: '0502345678',
            role: 'معالج',
            status: 'نشط',
            createdDate: '2024-02-10',
          },
          {
            id: 'user003',
            name: 'محمود حسن',
            email: 'mahmoud.h@clinic.sa',
            phone: '0503456789',
            role: 'معالج',
            status: 'نشط',
            createdDate: '2024-01-20',
          },
          {
            id: 'user004',
            name: 'سارة عبدالله',
            email: 'sarah.a@clinic.sa',
            phone: '0504567890',
            role: 'ولي أمر',
            status: 'نشط',
            createdDate: '2024-03-05',
          },
          {
            id: 'user005',
            name: 'علي محمد',
            email: 'ali.m@clinic.sa',
            phone: '0505678901',
            role: 'طالب',
            status: 'نشط',
            createdDate: '2024-01-25',
          },
          {
            id: 'user006',
            name: 'نوال خالد',
            email: 'nwal.k@clinic.sa',
            phone: '0506789012',
            role: 'إدارة',
            status: 'معطل',
            createdDate: '2024-02-01',
          },
          {
            id: 'user007',
            name: 'عمر عبدالحكيم',
            email: 'omar.a@clinic.sa',
            phone: '0507890123',
            role: 'معالج',
            status: 'قيد الانتظار',
            createdDate: '2025-01-10',
          },
          {
            id: 'user008',
            name: 'ليلى حسن',
            email: 'layla.h@clinic.sa',
            phone: '0508901234',
            role: 'ولي أمر',
            status: 'نشط',
            createdDate: '2024-03-12',
          },
        ]);
      }, 500);
    });
  },

  // Get Admin Settings
  async getAdminSettings(adminId) {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({
          general: {
            systemName: 'نظام إدارة العيادات الشامل',
            systemVersion: 'v2.5.0',
            description: 'نظام متكامل لإدارة العيادات والمراكز التأهيلية',
            language: 'ar',
            supportLevel: 'premium',
          },
          security: {
            twoFactorAuth: true,
            encryptData: true,
            sessionTimeout: 30,
            maxLoginAttempts: 5,
            ipWhitelist: false,
          },
          notifications: {
            emailNotifications: true,
            smsNotifications: true,
            pushNotifications: true,
            notificationEmail: 'admin@clinic.sa',
            smsPhone: '+966501234567',
          },
          database: {
            serverName: 'mongodb.clinic.sa',
            port: 27017,
            databaseName: 'clinic_db',
            username: 'admin_user',
            autoBackup: true,
            backupFrequency: 24,
          },
          email: {
            smtpServer: 'smtp.gmail.com',
            smtpPort: 587,
            fromEmail: 'noreply@clinic.sa',
            fromName: 'نظام العيادة',
            enableSSL: true,
          },
        });
      }, 500);
    });
  },

  // Get Admin Reports
  async getAdminReports(adminId) {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({
          totalSessions: 487,
          completionRate: 89,
          averageRating: 4.6,
          improvementRate: 72,
          monthlyTrends: [
            { month: 'يناير', completed: 45, scheduled: 52, cancelled: 3 },
            { month: 'فبراير', completed: 52, scheduled: 48, cancelled: 2 },
            { month: 'مارس', completed: 58, scheduled: 45, cancelled: 4 },
            { month: 'أبريل', completed: 62, scheduled: 50, cancelled: 2 },
            { month: 'مايو', completed: 68, scheduled: 55, cancelled: 3 },
          ],
          userDistribution: [
            { role: 'معالجون', active: 26, inactive: 2 },
            { role: 'طلاب', active: 73, inactive: 14 },
            { role: 'آباء', active: 42, inactive: 8 },
            { role: 'إدارة', active: 3, inactive: 1 },
          ],
          sessionTypes: [
            { name: 'فردية', value: 245 },
            { name: 'جماعية', value: 156 },
            { name: 'متابعة', value: 86 },
          ],
          performanceMetrics: [
            { x: 1, y: 85 },
            { x: 2, y: 88 },
            { x: 3, y: 92 },
            { x: 4, y: 95 },
            { x: 5, y: 93 },
          ],
          summary: [
            { metric: 'إجمالي الجلسات', value: 487, change: '+23', percentage: 5 },
            { metric: 'معدل الرضا', value: '4.6/5', change: '+0.2', percentage: 4 },
            { metric: 'معدل الحضور', value: '89%', change: '+3%', percentage: 3 },
            { metric: 'المرضى النشطون', value: 73, change: '+8', percentage: 12 },
          ],
        });
      }, 500);
    });
  },

  // Get Audit Logs
  async getAdminAuditLogs(adminId) {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve([
          {
            id: 'log001',
            userId: 'user001',
            userName: 'أحمد محمد',
            action: 'دخول',
            description: 'تسجيل دخول ناجح إلى لوحة التحكم',
            details: 'دخول من المتصفح Chrome على Windows',
            ipAddress: '192.168.1.100',
            timestamp: '2025-01-13T10:30:00',
            status: 'نجاح',
          },
          {
            id: 'log002',
            userId: 'user002',
            userName: 'فاطمة علي',
            action: 'إنشاء',
            description: 'إنشاء حالة مريض جديد',
            details: 'اسم المريض: محمد علي - التشخيص: تأخر نطق',
            ipAddress: '192.168.1.101',
            timestamp: '2025-01-13T09:45:00',
            status: 'نجاح',
          },
          {
            id: 'log003',
            userId: 'user003',
            userName: 'محمود حسن',
            action: 'تعديل',
            description: 'تحديث خطة علاجية',
            details: 'تعديل عدد الجلسات الأسبوعية',
            ipAddress: '192.168.1.102',
            timestamp: '2025-01-13T08:20:00',
            status: 'نجاح',
          },
          {
            id: 'log004',
            userId: 'user001',
            userName: 'أحمد محمد',
            action: 'حذف',
            description: 'حذف حساب مستخدم غير نشط',
            details: 'حذف حساب المستخدم: ينسعد عوض',
            ipAddress: '192.168.1.100',
            timestamp: '2025-01-13T07:15:00',
            status: 'نجاح',
          },
          {
            id: 'log005',
            userId: 'user004',
            userName: 'سارة عبدالله',
            action: 'دخول',
            description: 'محاولة دخول فاشلة',
            details: 'كلمة المرور غير صحيحة',
            ipAddress: '192.168.1.103',
            timestamp: '2025-01-13T06:50:00',
            status: 'فشل',
          },
        ]);
      }, 500);
    });
  },

  // Get Clinics
  async getAdminClinics(adminId) {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve([
          {
            id: 'clinic001',
            name: 'عيادة الرياض الرئيسية',
            code: 'RYD-001',
            address: 'شارع الملك فهد، حي المربع',
            city: 'الرياض',
            phone: '0114234567',
            email: 'riyadh@clinic.sa',
            staffCount: 15,
            roomCount: 8,
            capacity: 120,
            status: 'نشطة',
            lastUpdate: '2025-01-10',
          },
          {
            id: 'clinic002',
            name: 'عيادة جدة الفرعية',
            code: 'JDD-001',
            address: 'شارع الملك عبدالعزيز، حي الزاهر',
            city: 'جدة',
            phone: '0125678901',
            email: 'jeddah@clinic.sa',
            staffCount: 12,
            roomCount: 6,
            capacity: 90,
            status: 'نشطة',
            lastUpdate: '2025-01-09',
          },
          {
            id: 'clinic003',
            name: 'عيادة الدمام',
            code: 'DAM-001',
            address: 'شارع الملك سعود، حي الدفان',
            city: 'الدمام',
            phone: '0138765432',
            email: 'dammam@clinic.sa',
            staffCount: 8,
            roomCount: 4,
            capacity: 60,
            status: 'نشطة',
            lastUpdate: '2025-01-08',
          },
        ]);
      }, 500);
    });
  },

  // Get Payments
  // Get Admin Payments (Real API with Mock Fallback)
  async getAdminPayments(adminId) {
    try {
      const response = await axios.get('/api/payments/all');
      if (response.data && response.data.success && response.data.data.length > 0) {
        // Map Backend Data to UI Format
        return response.data.data.map(p => ({
          id: p._id,
          invoiceNumber: p.transactionId ? `TRX-${p.transactionId.substring(0, 8)}` : 'N/A',
          patientName: p.userId ? p.userId.name || p.userId.email : 'Unknown User',
          service: p.description || p.paymentMethod,
          amount: p.amount,
          status:
            p.status === 'succeeded' || p.status === 'completed'
              ? 'مدفوعة'
              : p.status === 'pending' || p.status === 'processing'
                ? 'قيد الانتظار'
                : 'مرفوضة',
          date: p.createdAt,
          notes: p.metadata && p.metadata.get ? p.metadata.get('notes') : '',
        }));
      }
      throw new Error('No data or API failure');
    } catch (e) {
      console.warn('Using Mock Data for Admin Payments:', e.message);
      return new Promise(resolve => {
        setTimeout(() => {
          resolve([
            {
              id: 'pay001',
              invoiceNumber: 'INV-2025-001',
              patientName: 'محمد علي',
              service: 'جلسات علاجية (شهري)',
              amount: 1500,
              status: 'مدفوعة',
              date: '2025-01-05',
              notes: 'دفع كامل للشهر الأول',
            },
            {
              id: 'pay002',
              invoiceNumber: 'INV-2025-002',
              patientName: 'فاطمة أحمد',
              service: 'تقييم شامل',
              amount: 500,
              status: 'مدفوعة',
              date: '2025-01-08',
              notes: '',
            },
            {
              id: 'pay003',
              invoiceNumber: 'INV-2025-003',
              patientName: 'سارة محمود',
              service: 'جلسات جماعية',
              amount: 800,
              status: 'قيد الانتظار',
              date: '2025-01-10',
              notes: 'في انتظار التأكيد من المريض',
            },
            {
              id: 'pay004',
              invoiceNumber: 'INV-2025-004',
              patientName: 'عمر خالد',
              service: 'جلسات علاجية (شهري)',
              amount: 1500,
              status: 'متأخرة',
              date: '2024-12-10',
              notes: 'متأخر عن الموعد بـ 34 يوم',
            },
            {
              id: 'pay005',
              invoiceNumber: 'INV-2025-005',
              patientName: 'نور محمد',
              service: 'جلسات متابعة',
              amount: 300,
              status: 'مدفوعة',
              date: '2025-01-12',
              notes: '',
            },
          ]);
        }, 500);
      });
    }
  },

  // Get Notifications
  async getAdminNotifications(adminId) {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve([
          {
            id: 'notif001',
            title: 'تحديث الصيانة المخطط',
            message: 'سيتم إجراء صيانة دورية للنظام يوم الجمعة من الساعة 2 إلى 4 مساءً',
            type: 'معلومة',
            priority: 'متوسطة',
            status: 'مرسلة',
            recipientCount: 156,
            sendDate: '2025-01-12',
          },
          {
            id: 'notif002',
            title: 'تنبيه أمني مهم',
            message: 'تم اكتشاف نشاط مريب، يرجى التحقق من إعدادات الأمان',
            type: 'تحذير',
            priority: 'عالية',
            status: 'مرسلة',
            recipientCount: 28,
            sendDate: '2025-01-13',
          },
          {
            id: 'notif003',
            title: 'تذكير الجلسات الأسبوعية',
            message: 'تذكير بالجلسات المجدولة للأسبوع القادم',
            type: 'تذكير',
            priority: 'منخفضة',
            status: 'قيد الإرسال',
            recipientCount: 87,
            sendDate: '2025-01-13',
          },
          {
            id: 'notif004',
            title: 'تحديث سياسة الخصوصية',
            message: 'تم تحديث سياسة الخصوصية والشروط - يرجى المراجعة',
            type: 'معلومة',
            priority: 'متوسطة',
            status: 'مرسلة',
            recipientCount: 156,
            sendDate: '2025-01-11',
          },
        ]);
      }, 500);
    });
  },
};
