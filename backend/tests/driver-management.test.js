/**
 * Driver Management System - Comprehensive Test Suite
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3005/api';

// ============ Test Configuration ============
const testConfig = {
  baseURL: API_BASE,
  timeout: 10000,
  validateStatus: () => true,
};

// ============ Test Data ============
const testDriver = {
  userId: '507f1f77bcf86cd799439011', // معرف مستخدم وهمي
  firstName: 'محمد',
  lastName: 'الأحمد',
  email: 'driver@example.com',
  personalPhone: '+966501234567',
  employeeId: `EMP-${Date.now()}`,
  hireDate: '2023-01-15',
  licenseNumber: `LIC-${Date.now()}`,
  licenseType: 'B',
  licenseExpiryDate: '2026-12-31',
};

// ============ Test Functions ============

/**
 * اختبار إنشاء سائق جديد
 */
async function testCreateDriver() {
  console.log('\n🟦 اختبار: إنشاء سائق جديد');
  try {
    const response = await axios.post(`${API_BASE}/drivers`, testDriver, testConfig);

    if (response.status === 201) {
      console.log('✅ تم إنشاء السائق بنجاح');
      console.log('ملخص البيانات:', {
        الحالة: response.status,
        الرسالة: response.data.message,
        معرف_السائق: response.data.data?._id,
      });
      return response.data.data;
    } else {
      console.log('❌ فشل في إنشاء السائق');
      console.log('الخطأ:', response.data);
      return null;
    }
  } catch (error) {
    console.log('❌ خطأ في الاتصال:', error.message);
    return null;
  }
}

/**
 * اختبار جلب جميع السائقين
 */
async function testGetAllDrivers(page = 1, limit = 10) {
  console.log(`\n🟦 اختبار: جلب السائقين (الصفحة ${page})`);
  try {
    const response = await axios.get(`${API_BASE}/drivers`, {
      ...testConfig,
      params: { page, limit },
    });

    if (response.status === 200) {
      console.log('✅ تم جلب السائقين بنجاح');
      console.log('الملخص:', {
        عدد_السائقين: response.data.data?.drivers?.length || 0,
        الإجمالي: response.data.data?.total,
        الصفحات: response.data.data?.totalPages,
      });
      return response.data.data?.drivers || [];
    } else {
      console.log('❌ فشل في جلب السائقين');
      return [];
    }
  } catch (error) {
    console.log('❌ خطأ في الاتصال:', error.message);
    return [];
  }
}

/**
 * اختبار الحصول على تفاصيل سائق
 */
async function testGetDriver(driverId) {
  console.log(`\n🟦 اختبار: جلب تفاصيل السائق`);
  try {
    const response = await axios.get(`${API_BASE}/drivers/${driverId}`, testConfig);

    if (response.status === 200) {
      console.log('✅ تم جلب تفاصيل السائق بنجاح');
      console.log('البيانات الأساسية:', {
        الاسم: response.data.data?.fullName,
        رقم_الموظف: response.data.data?.employeeId,
        الحالة: response.data.data?.status,
      });
      return response.data.data;
    } else {
      console.log('❌ فشل في جلب التفاصيل');
      return null;
    }
  } catch (error) {
    console.log('❌ خطأ في الاتصال:', error.message);
    return null;
  }
}

/**
 * اختبار تحديث السائق
 */
async function testUpdateDriver(driverId) {
  console.log(`\n🟦 اختبار: تحديث بيانات السائق`);
  try {
    const updateData = {
      firstName: 'محمود',
      personalPhone: '+966502345678',
    };

    const response = await axios.put(
      `${API_BASE}/drivers/${driverId}`,
      updateData,
      testConfig
    );

    if (response.status === 200) {
      console.log('✅ تم تحديث السائق بنجاح');
      console.log('البيانات المحدثة:', {
        الاسم: response.data.data?.firstName,
        الهاتف: response.data.data?.personalPhone,
      });
      return response.data.data;
    } else {
      console.log('❌ فشل في التحديث');
      return null;
    }
  } catch (error) {
    console.log('❌ خطأ في الاتصال:', error.message);
    return null;
  }
}

/**
 * اختبار إضافة انتهاك
 */
async function testAddViolation(driverId) {
  console.log(`\n🟦 اختبار: إضافة انتهاك`);
  try {
    const violationData = {
      violationType: 'speedingIncidents',
      description: 'تجاوز السرعة المسموحة',
      severity: 'medium',
    };

    const response = await axios.post(
      `${API_BASE}/drivers/${driverId}/violations`,
      violationData,
      testConfig
    );

    if (response.status === 200) {
      console.log('✅ تم تسجيل الانتهاك بنجاح');
      console.log('البيانات:', {
        اسم_السائق: response.data.data?.driver,
        نوع_الانتهاك: response.data.data?.violationType,
        إجمالي_الانتهاكات: response.data.data?.totalViolations,
      });
      return true;
    } else {
      console.log('❌ فشل في تسجيل الانتهاك');
      return false;
    }
  } catch (error) {
    console.log('❌ خطأ في الاتصال:', error.message);
    return false;
  }
}

/**
 * اختبار جلب الانتهاكات
 */
async function testGetViolations(driverId) {
  console.log(`\n🟦 اختبار: جلب قائمة الانتهاكات`);
  try {
    const response = await axios.get(
      `${API_BASE}/drivers/${driverId}/violations`,
      testConfig
    );

    if (response.status === 200) {
      console.log('✅ تم جلب الانتهاكات بنجاح');
      console.log('ملخص الانتهاكات:', {
        الإجمالي: response.data.data?.violations?.totalViolations,
        تجاوز_السرعة: response.data.data?.violations?.speedingIncidents,
        الحوادث: response.data.data?.violations?.accidents,
      });
      return response.data.data?.violations;
    } else {
      console.log('❌ فشل في جلب الانتهاكات');
      return null;
    }
  } catch (error) {
    console.log('❌ خطأ في الاتصال:', error.message);
    return null;
  }
}

/**
 * اختبار جلب تقرير الأداء الشامل
 */
async function testGetPerformanceReport(driverId) {
  console.log(`\n🟦 اختبار: جلب تقرير الأداء الشامل`);
  try {
    const response = await axios.get(
      `${API_BASE}/drivers/${driverId}/performance`,
      testConfig
    );

    if (response.status === 200) {
      console.log('✅ تم جلب التقرير بنجاح');
      const report = response.data.data;
      console.log('ملخص الأداء:', {
        الاسم: report?.driverName,
        الدرجة_الكلية: report?.performance?.overallRating,
        درجة_الأمان: report?.performance?.safetyScore,
        الموثوقية: report?.performance?.reliabilityScore,
        خدمة_العملاء: report?.performance?.customerServiceScore,
      });
      return report;
    } else {
      console.log('❌ فشل في جلب التقرير');
      return null;
    }
  } catch (error) {
    console.log('❌ خطأ في الاتصال:', error.message);
    return null;
  }
}

/**
 * اختبار إضافة شهادة
 */
async function testAddCertification(driverId) {
  console.log(`\n🟦 اختبار: إضافة شهادة`);
  try {
    const certificationData = {
      name: 'Defensive Driving',
      issueDate: '2024-01-15',
      expiryDate: '2026-01-15',
      certificateNumber: 'CERT-12345',
      provider: 'Traffic Safety Institute',
    };

    const response = await axios.post(
      `${API_BASE}/drivers/${driverId}/certifications`,
      certificationData,
      testConfig
    );

    if (response.status === 200) {
      console.log('✅ تم إضافة الشهادة بنجاح');
      return true;
    } else {
      console.log('❌ فشل في إضافة الشهادة');
      return false;
    }
  } catch (error) {
    console.log('❌ خطأ في الاتصال:', error.message);
    return false;
  }
}

/**
 * اختبار جلب السائقين الذين يحتاجون تدريب
 */
async function testGetDriversNeedingTraining() {
  console.log(`\n🟦 اختبار: جلب السائقين الذين يحتاجون تدريب`);
  try {
    const response = await axios.get(
      `${API_BASE}/drivers/training/needs`,
      testConfig
    );

    if (response.status === 200) {
      console.log('✅ تم جلب قائمة التدريب بنجاح');
      console.log('ملخص:', {
        عدد_السائقين: response.data.data?.drivers?.length || 0,
      });
      return response.data.data?.drivers || [];
    } else {
      console.log('❌ فشل في جلب القائمة');
      return [];
    }
  } catch (error) {
    console.log('❌ خطأ في الاتصال:', error.message);
    return [];
  }
}

/**
 * اختبار جلب أفضل السائقين
 */
async function testGetTopPerformers() {
  console.log(`\n🟦 اختبار: جلب أفضل السائقين`);
  try {
    const response = await axios.get(
      `${API_BASE}/drivers/top/performers?limit=5`,
      testConfig
    );

    if (response.status === 200) {
      console.log('✅ تم جلب قائمة أفضل السائقين بنجاح');
      console.log('ملخص:', {
        عدد_السائقين: response.data.data?.drivers?.length || 0,
      });
      return response.data.data?.drivers || [];
    } else {
      console.log('❌ فشل في جلب القائمة');
      return [];
    }
  } catch (error) {
    console.log('❌ خطأ في الاتصال:', error.message);
    return [];
  }
}

/**
 * اختبار الإحصائيات العامة
 */
async function testGetAnalytics() {
  console.log(`\n🟦 اختبار: جلب الإحصائيات العامة`);
  try {
    const response = await axios.get(
      `${API_BASE}/drivers/analytics/overview`,
      testConfig
    );

    if (response.status === 200) {
      console.log('✅ تم جلب الإحصائيات بنجاح');
      console.log('الملخص:', {
        إجمالي_السائقين: response.data.data?.totalDrivers,
        النشطين: response.data.data?.activeDrivers,
        في_الإجازة: response.data.data?.onLeaveDrivers,
        الموقوفين: response.data.data?.suspendedDrivers,
        متوسط_الأمان: response.data.data?.performance?.avgSafety?.toFixed(1),
      });
      return response.data.data;
    } else {
      console.log('❌ فشل في جلب الإحصائيات');
      return null;
    }
  } catch (error) {
    console.log('❌ خطأ في الاتصال:', error.message);
    return null;
  }
}

// ============ Main Test Runner ============
async function runAllTests() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log(
    '🚀 اختبار شامل لنظام إدارة السائقين الذكي'
  );
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`⏰ وقت البدء: ${new Date().toLocaleString('ar-SA')}`);

  try {
    // 1. إنشاء سائق
    const driver = await testCreateDriver();
    if (!driver) {
      console.log('\n⚠️  تحذير: لم يتم إنشاء سائق جديد، سيتم اختبار مع سائق موجود');
      // جلب سائق موجود
      const drivers = await testGetAllDrivers();
      if (drivers.length === 0) {
        console.log('❌ لا توجد سائقين في النظام. يرجى إنشاء سائق أولاً');
        return;
      }
    }

    const driverId = driver?._id || (await testGetAllDrivers())[0]?._id;

    if (!driverId) {
      console.log('❌ فشل في الحصول على معرف السائق');
      return;
    }

    // 2. اختبارات القراءة
    await testGetAllDrivers();
    await testGetDriver(driverId);

    // 3. اختبارات التحديث
    await testUpdateDriver(driverId);

    // 4. اختبارات الانتهاكات
    await testAddViolation(driverId);
    await testGetViolations(driverId);

    // 5. اختبارات الشهادات
    await testAddCertification(driverId);

    // 6. اختبارات الأداء
    await testGetPerformanceReport(driverId);

    // 7. اختبارات البحث والفلترة
    await testGetDriversNeedingTraining();
    await testGetTopPerformers();

    // 8. اختبارات الإحصائيات
    await testGetAnalytics();

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('✅ اكتمل جميع الاختبارات');
    console.log(`⏰ وقت الانتهاء: ${new Date().toLocaleString('ar-SA')}`);
    console.log('═══════════════════════════════════════════════════════════\n');
  } catch (error) {
    console.log('\n❌ خطأ عام:', error.message);
  }
}

// ============ Export for CLI ============
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  testCreateDriver,
  testGetAllDrivers,
  testGetDriver,
  testUpdateDriver,
  testAddViolation,
  testGetViolations,
  testGetPerformanceReport,
  testAddCertification,
  testGetDriversNeedingTraining,
  testGetTopPerformers,
  testGetAnalytics,
  runAllTests,
};
