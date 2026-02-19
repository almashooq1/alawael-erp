// backend/scripts/seedIncidents.js
// سرت البيانات التجريبية للحوادث
// Seed Test Data for Incidents

const mongoose = require('mongoose');
const Incident = require('../models/Incident');
require('dotenv').config();

// بيانات حوادث تجريبية
const sampleIncidents = [
  {
    title: 'انقطاع الخدمة في قاعدة البيانات الرئيسية',
    description: 'حدث انقطاع مفاجئ في خدمة قاعدة البيانات الرئيسية مما أدى إلى عدم قدرة المستخدمين من الوصول إلى البيانات. الخدمة كانت معطلة لمدة 30 دقيقة تقريباً.',
    category: 'DATABASE_FAILURE',
    severity: 'CRITICAL',
    priority: 'P1',
    discoveryInfo: {
      discoveredAt: new Date(Date.now() - 3600000),
      detectionMethod: 'MONITORING'
    },
    organizationInfo: {
      location: 'مركز البيانات - الرياض',
      environment: 'PRODUCTION'
    },
    status: 'RESOLVED',
    resolution: {
      rootCause: 'ارتفاع درجة حرارة خادم قاعدة البيانات',
      solution: 'تم إعادة تشغيل الخادم وتثبيت نظام تبريد إضافي',
      permanentFix: true,
      resolvedAt: new Date(Date.now() - 1800000),
      verificationMethod: 'اختبار الاتصال الناجح',
      verifiedAt: new Date(Date.now() - 1200000)
    },
    timeline: [
      {
        timestamp: new Date(Date.now() - 3600000),
        eventType: 'REPORTED',
        description: 'تم الإبلاغ عن الحادثة من قبل فريق الرصد'
      },
      {
        timestamp: new Date(Date.now() - 3500000),
        eventType: 'ACKNOWLEDGED',
        description: 'تم تأكيد استقبال الحادثة من قبل فريق الدعم'
      },
      {
        timestamp: new Date(Date.now() - 3300000),
        eventType: 'INVESTIGATING',
        description: 'بدء التحقيق في سبب الانقطاع'
      },
      {
        timestamp: new Date(Date.now() - 2800000),
        eventType: 'IDENTIFIED',
        description: 'تم تحديد السبب: ارتفاع درجة حرارة الخادم'
      }
    ],
    metrics: {
      timeToAcknowledge: 5,
      timeToIdentify: 30,
      numberOfEscalations: 0,
      numberOfResponders: 3
    },
    sla: {
      responseTimeTarget: 15,
      resolutionTimeTarget: 120,
      responseTimeActual: 5,
      resolutionTimeActual: 60,
      slaStatus: 'MET'
    }
  },

  {
    title: 'انتهاك أمني في نظام المصادقة',
    description: 'تم اكتشاف محاولات دخول غير مصرح بها على نظام المصادقة. تم رصد أكثر من 10000 محاولة دخول فاشلة من عناوين IP متعددة.',
    category: 'SECURITY_BREACH',
    severity: 'CRITICAL',
    priority: 'P1',
    discoveryInfo: {
      discoveredAt: new Date(Date.now() - 7200000),
      detectionMethod: 'AUTOMATED'
    },
    organizationInfo: {
      location: 'نظام الأمان',
      environment: 'PRODUCTION'
    },
    status: 'IN_RESOLUTION',
    timeline: [
      {
        timestamp: new Date(Date.now() - 7200000),
        eventType: 'REPORTED',
        description: 'تم رصد محاولات دخول غير طبيعية'
      },
      {
        timestamp: new Date(Date.now() - 7100000),
        eventType: 'ACKNOWLEDGED',
        description: 'تم تنبيه فريق الأمان والبدء بالتحقيق الفوري'
      }
    ],
    metrics: {
      timeToAcknowledge: 2,
      numberOfEscalations: 1,
      numberOfResponders: 5
    },
    sla: {
      responseTimeTarget: 15,
      resolutionTimeTarget: 60,
      responseTimeActual: 2,
      slaStatus: 'MET'
    }
  },

  {
    title: 'بطء في أداء التطبيق الرئيسي',
    description: 'لاحظ المستخدمون بطئاً ملحوظاً في استجابة التطبيق. وقت تحميل الصفحات زاد من 2 ثانية إلى 15 ثانية.',
    category: 'PERFORMANCE_ISSUE',
    severity: 'HIGH',
    priority: 'P2',
    discoveryInfo: {
      discoveredAt: new Date(Date.now() - 14400000),
      detectionMethod: 'CUSTOMER_COMPLAINT'
    },
    organizationInfo: {
      location: 'التطبيق الويب',
      environment: 'PRODUCTION'
    },
    status: 'INVESTIGATING',
    timeline: [
      {
        timestamp: new Date(Date.now() - 14400000),
        eventType: 'REPORTED',
        description: 'تقرير من عدد من المستخدمين'
      },
      {
        timestamp: new Date(Date.now() - 14200000),
        eventType: 'ACKNOWLEDGED',
        description: 'تم الاعتراف بالمشكلة وبدء التحقيق'
      }
    ],
    metrics: {
      timeToAcknowledge: 3,
      numberOfResponders: 2
    },
    sla: {
      responseTimeTarget: 30,
      resolutionTimeTarget: 240
    }
  },

  {
    title: 'فشل في معالجة الدفع',
    description: 'عدد من العملاء لا يستطيعون إكمال عملية الدفع. رسالة خطأ: \"خطأ في معالجة البطاقة\".',
    category: 'APPLICATION_ERROR',
    severity: 'CRITICAL',
    priority: 'P1',
    discoveryInfo: {
      discoveredAt: new Date(Date.now() - 3600000),
      detectionMethod: 'CUSTOMER_COMPLAINT'
    },
    organizationInfo: {
      location: 'نظام الدفع',
      environment: 'PRODUCTION'
    },
    status: 'RESOLVED',
    resolution: {
      rootCause: 'انقطاع الاتصال مع خدمة معالجة الدفع الخارجية',
      solution: 'تم استعادة الاتصال وتطبيق آلية إعادة محاولة',
      permanentFix: true,
      resolvedAt: new Date(Date.now() - 1800000)
    },
    metrics: {
      timeToAcknowledge: 2,
      timeToResolve: 30,
      numberOfResponders: 4
    },
    sla: {
      responseTimeTarget: 15,
      resolutionTimeTarget: 60,
      responseTimeActual: 2,
      resolutionTimeActual: 30,
      slaStatus: 'MET'
    }
  },

  {
    title: 'مشكلة في مزامنة البيانات',
    description: 'البيانات في قاعدة البيانات الثانوية لا تتزامن مع الرئيسية. التأخير يصل إلى 2 ساعة.',
    category: 'DATABASE_FAILURE',
    severity: 'HIGH',
    priority: 'P3',
    discoveryInfo: {
      discoveredAt: new Date(Date.now() - 28800000),
      detectionMethod: 'AUTOMATED'
    },
    organizationInfo: {
      location: 'نظام المزامنة',
      environment: 'PRODUCTION'
    },
    status: 'CLOSED',
    resolution: {
      rootCause: 'ازدحام الشبكة أثناء نقل البيانات الكبيرة',
      solution: 'تم تقسيم عملية النقل إلى دفعات صغيرة وتوزيعها على مدار الوقت',
      permanentFix: true,
      resolvedAt: new Date(Date.now() - 18000000)
    },
    closure: {
      closureReason: 'RESOLVED',
      closureNotes: 'تم التحقق من نجاح الحل والمزامنة تعمل بشكل طبيعي',
      closedAt: new Date(Date.now() - 14400000)
    },
    metrics: {
      timeToResolve: 600,
      numberOfResponders: 2
    },
    sla: {
      responseTimeTarget: 30,
      resolutionTimeTarget: 480,
      resolutionTimeActual: 600,
      slaStatus: 'BREACHED'
    }
  }
];

// موظفون بتريبيين (معرفات MongoDB وهمية)
const getDummyUserId = () => new mongoose.Types.ObjectId();

// إضافة بيانات إضافية
const enrichIncidents = () => {
  return sampleIncidents.map((incident, index) => ({
    ...incident,
    discoveryInfo: {
      ...incident.discoveryInfo,
      discoveredBy: getDummyUserId()
    },
    auditInfo: {
      createdBy: getDummyUserId(),
      createdAt: incident.discoveryInfo.discoveredAt,
      ipAddress: `192.168.1.${100 + index}`
    },
    assignedTo: [getDummyUserId(), getDummyUserId()],
    tags: [incident.category.toLowerCase(), incident.severity.toLowerCase()],
    comments: [
      {
        userId: getDummyUserId(),
        userName: 'مدير النظام',
        comment: 'الحادثة قيد المراجعة',
        isInternal: true,
        timestamp: new Date(incident.discoveryInfo.discoveredAt.getTime() + 600000)
      }
    ]
  }));
};

// دالة البذر
async function seedIncidents() {
  try {
    // الاتصال بـ MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/scm_system';

    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('✅ Connected to MongoDB');

    // حذف البيانات السابقة (اختياري)
    // await Incident.deleteMany({});
    // console.log('🗑️  Cleared previous incidents');

    // إضافة الحوادث الجديدة
    const enrichedIncidents = enrichIncidents();
    const createdIncidents = await Incident.insertMany(enrichedIncidents);

    console.log('✅ مم الحوادث التجريبية تم إضافتها بنجاح');
    console.log(`   📊 عدد الحوادث: ${createdIncidents.length}`);

    // طباعة الأرقام
    createdIncidents.forEach((incident, index) => {
      console.log(`   ${index + 1}. ${incident.incidentNumber} - ${incident.title}`);
    });

    // الإحصائيات
    console.log('\n📈 الإحصائيات:');
    const stats = await Incident.aggregate([
      {
        $group: {
          _id: '$severity',
          count: { $sum: 1 }
        }
      }
    ]);

    stats.forEach(stat => {
      console.log(`   ${stat._id}: ${stat.count}`);
    });

    console.log('\n✅ البذر اكتمل بنجاح!');

  } catch (error) {
    console.error('❌ خطأ في البذر:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 تم قطع الاتصال بـ MongoDB');
  }
}

// تشغيل البذر
seedIncidents();
