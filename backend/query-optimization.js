/**
 * Query Optimization Guide & Implementation
 * تحسين استعلامات قاعدة البيانات
 */
/* eslint-disable no-undef */

// ============================================
// 1. LEAN QUERIES - استعلامات محسّنة
// ============================================

/**
 * ❌ البطيء: استعلام كامل مع Mongoose Document
 */
async function getVehiclesSlowWay() {
  const vehicles = await Vehicle.find({ status: 'active' });
  // النتيجة: Mongoose Documents كاملة مع methods و getters
  // الحجم: ~5KB لكل سيارة
  // الوقت: ~150-300ms
  return vehicles;
}

/**
 * ✅ السريع: استعلام مع Lean() - Plain JavaScript Objects
 */
async function getVehiclesFastWay() {
  const vehicles = await Vehicle.find({ status: 'active' })
    .lean() // ⭐ المفتاح
    .select('registrationNumber plateNumber owner assignedDriver status')
    .limit(50);
  // النتيجة: Plain JS objects بدون overhead
  // الحجم: ~500 bytes لكل سيارة (10x أصغر)
  // الوقت: ~20-50ms (5x أسرع)
  return vehicles;
}

// ============================================
// 2. PROJECTION - اختيار الحقول المطلوبة
// ============================================

/**
 * ❌ بطيء: جلب جميع الحقول
 */
async function getAllFieldsSlowWay() {
  return await Employee.find({ department: 'HR' });
  // يجلب: name, email, password, salary, ssn, medical_history, etc.
  // الحجم: ~2KB لكل موظف
}

/**
 * ✅ سريع: جلب الحقول المطلوبة فقط
 */
async function getMinimalFieldsFastWay() {
  return await Employee.find({ department: 'HR' }).select('name email department').lean();
  // يجلب: فقط الحقول المطلوبة
  // الحجم: ~200 bytes لكل موظف
}

// ============================================
// 3. PAGINATION - تقسيم النتائج
// ============================================

/**
 * ❌ بطيء: جلب 10000 نتيجة دفعة واحدة
 */
async function getAllRecordsAtOnceSlowWay() {
  const records = await User.find({});
  // النتيجة: مصفوفة ضخمة جداً
  // الذاكرة: ~100MB
  // الوقت: >5 ثواني
  return records;
}

/**
 * ✅ سريع: جلب البيانات على دفعات
 */
async function getPaginatedRecordsFastWay(page = 1, pageSize = 50) {
  const skip = (page - 1) * pageSize;

  const [records, total] = await Promise.all([
    User.find({}).skip(skip).limit(pageSize).lean().select('id name email'),
    User.countDocuments({}),
  ]);

  return {
    data: records,
    pagination: {
      page,
      pageSize,
      total,
      pages: Math.ceil(total / pageSize),
    },
  };
  // النتيجة: 50 نتيجة فقط في الذاكرة
  // الذاكرة: ~25KB
  // الوقت: ~20-50ms
}

// ============================================
// 4. INDEX OPTIMIZATION - استخدام الفهارس
// ============================================

/**
 * ❌ بطيء: استعلام بدون index مناسب
 */
async function searchWithoutIndexSlowWay() {
  // بدون index على status + createdAt
  return await Vehicle.find({
    status: 'active',
    createdAt: { $gte: new Date('2026-01-01') },
  });
  // الوقت: ~2-5 ثواني (collection scan)
}

/**
 * ✅ سريع: استعلام مع compound index
 */
async function searchWithIndexFastWay() {
  // مع index: { status: 1, createdAt: 1 }
  return await Vehicle.find({
    status: 'active',
    createdAt: { $gte: new Date('2026-01-01') },
  })
    .lean()
    .select('registrationNumber plateNumber')
    .limit(100);
  // الوقت: ~10-20ms (index scan)
  // تحسن: 100-300x أسرع
}

// ============================================
// 5. AGGREGATION OPTIMIZATION
// ============================================

/**
 * ❌ بطيء: معالجة في التطبيق
 */
async function aggregateInAppSlowWay() {
  const vehicles = await Vehicle.find({ status: 'active' });

  // معالجة في الذاكرة
  const countByDriver = {};
  vehicles.forEach(v => {
    if (!countByDriver[v.assignedDriver]) {
      countByDriver[v.assignedDriver] = 0;
    }
    countByDriver[v.assignedDriver]++;
  });

  return countByDriver;
  // الوقت: ~500-1000ms (كل البيانات في الذاكرة)
}

/**
 * ✅ سريع: معالجة في قاعدة البيانات
 */
async function aggregateInDBFastWay() {
  return await Vehicle.aggregate([
    { $match: { status: 'active' } },
    {
      $group: {
        _id: '$assignedDriver',
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
    { $limit: 100 },
  ]);
  // الوقت: ~10-50ms (معالجة في DB)
  // تحسن: 50-100x أسرع
}

// ============================================
// 6. BATCH OPERATIONS - عمليات دفعية
// ============================================

/**
 * ❌ بطيء: update واحد تلو الآخر
 */
async function updateOneByOneSlowWay(ids) {
  for (const id of ids) {
    await Vehicle.updateOne({ _id: id }, { status: 'archived' });
  }
  // الوقت: 1000ms (1000 request)
}

/**
 * ✅ سريع: bulk update
 */
async function bulkUpdateFastWay(ids) {
  await Vehicle.updateMany({ _id: { $in: ids } }, { status: 'archived' });
  // الوقت: ~20-50ms (1 request)
  // تحسن: 20-50x أسرع
}

// ============================================
// 7. CACHING - تخزين مؤقت
// ============================================

/**
 * ❌ بطيء: جلب من DB في كل request
 */
async function noCachingSlowWay() {
  const drivers = await Driver.find({ status: 'active' });
  return drivers;
  // الوقت: ~100-200ms في كل request
  // الحمل على DB: عالي جداً
}

/**
 * ✅ سريع: مع caching
 */
const driverCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 دقائق

async function withCachingFastWay() {
  const cacheKey = 'active_drivers';

  // تحقق من الـ cache
  const cached = driverCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  // جلب من DB
  const drivers = await Driver.find({ status: 'active' }).lean().select('id name phone');

  // حفظ في الـ cache
  driverCache.set(cacheKey, {
    data: drivers,
    timestamp: Date.now(),
  });

  return drivers;
  // الوقت: <1ms للـ cached requests
  // الحمل على DB: منخفض جداً
}

// ============================================
// 8. IMPLEMENTATION GUIDE
// ============================================

const queryOptimizationPatterns = {
  'Pattern 1: Simple Find': {
    before: `
      Vehicle.find({ status: 'active' })
    `,
    after: `
      Vehicle.find({ status: 'active' })
        .lean()
        .select('registrationNumber plateNumber owner')
        .limit(50)
    `,
    improvement: '5-10x faster',
  },

  'Pattern 2: Pagination': {
    before: `
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;
      const records = await Vehicle.find({});
      return records.slice((page-1)*limit, page*limit);
    `,
    after: `
      const skip = (page - 1) * limit;
      const [records, total] = await Promise.all([
        Vehicle.find({})
          .skip(skip)
          .limit(limit)
          .lean(),
        Vehicle.countDocuments({})
      ]);
    `,
    improvement: '100x faster (database handles pagination)',
  },

  'Pattern 3: Aggregation': {
    before: `
      const vehicles = await Vehicle.find({});
      const byStatus = {};
      vehicles.forEach(v => {
        byStatus[v.status] = (byStatus[v.status] || 0) + 1;
      });
    `,
    after: `
      const result = await Vehicle.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]);
    `,
    improvement: '50-100x faster',
  },

  'Pattern 4: Bulk Operations': {
    before: `
      const ids = [1, 2, 3, 4, 5];
      for (const id of ids) {
        await Vehicle.updateOne({ _id: id }, { status: 'archived' });
      }
    `,
    after: `
      await Vehicle.updateMany(
        { _id: { $in: ids } },
        { status: 'archived' }
      );
    `,
    improvement: '20-50x faster',
  },
};

// ============================================
// 9. MONITORING & PROFILING
// ============================================

/**
 * تتبع الاستعلامات البطيئة
 */
function enableSlowQueryLogging(mongoose) {
  // تسجيل الاستعلامات > 100ms
  mongoose.set('debug', (coll, method, query) => {
    const start = Date.now();
    return (err, result) => {
      const duration = Date.now() - start;
      if (duration > 100) {
        console.warn(`[SLOW QUERY] ${coll}.${method}() took ${duration}ms`, query);
      }
    };
  });
}

// ============================================
// 10. QUICK CHECKLIST FOR OPTIMIZATION
// ============================================

const optimizationChecklist = `
✅ LEAN QUERIES
   - استخدم .lean() عند عدم الحاجة لـ Mongoose methods
   - توفير: 5-10x أسرع

✅ PROJECTION
   - استخدم .select() لجلب الحقول المطلوبة فقط
   - توفير: 50-80% من الحجم

✅ PAGINATION
   - استخدم .skip() و .limit()
   - توفير: 100x أسرع في الاستعلامات الكبيرة

✅ INDEXES
   - تأكد من index على حقول WHERE و SORT
   - توفير: 100-300x أسرع

✅ AGGREGATION
   - استخدم .aggregate() بدلاً من معالجة في الـ app
   - توفير: 50-100x أسرع

✅ BATCH OPERATIONS
   - استخدم updateMany/deleteMany بدلاً من حلقة
   - توفير: 20-50x أسرع

✅ CACHING
   - قم بـ cache للبيانات التي لا تتغير كثيراً
   - توفير: <1ms للـ cached requests

✅ MONITORING
   - سجل الاستعلامات البطيئة
   - حدد الاختناقات قبل أن تصبح مشكلة
`;

module.exports = {
  getVehiclesFastWay,
  getMinimalFieldsFastWay,
  getPaginatedRecordsFastWay,
  searchWithIndexFastWay,
  aggregateInDBFastWay,
  bulkUpdateFastWay,
  withCachingFastWay,
  enableSlowQueryLogging,
  queryOptimizationPatterns,
  optimizationChecklist,
};
