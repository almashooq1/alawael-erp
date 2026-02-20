/**
 * اختبار E2E - End-to-End Testing
 * اختبارات شاملة تغطي سيناريوهات العمل الكاملة
 */

const axios = require('axios');
const assert = require('assert');
const { performance } = require('perf_hooks');

class E2ETest {
  constructor(baseURL = 'http://localhost:5000/api/v1') {
    this.baseURL = baseURL;
    this.client = axios.create({ baseURL, timeout: 15000 });
    this.testData = {
      userId: null,
      vehicleId: null,
      routeId: null,
      accessToken: null
    };
    this.results = {
      scenarios: [],
      passed: 0,
      failed: 0,
      duration: 0
    };
  }

  /**
   * 1️⃣ السيناريو: تسجيل مستخدم جديد ويكمل رحلة
   */
  async scenarioNewUserCompleteTrip() {
    console.log('\n🚀 السيناريو 1: مستخدم جديد ينهي رحلة...');
    const startTime = performance.now();
    const steps = [];

    try {
      // الخطوة 1: تسجيل جديد
      let response = await this.client.post('/auth/register', {
        email: `driver-${Date.now()}@example.com`,
        password: 'SecurePass123!',
        phone: '+966501234567',
        firstName: 'أحمد',
        lastName: 'علي',
        userType: 'driver'
      });

      assert(response.status === 201, 'Registration failed');
      this.testData.userId = response.data.data.userId;
      this.testData.accessToken = response.data.data.accessToken;
      steps.push('✓ التسجيل');

      // الخطوة 2: تحديث البيانات الشخصية
      response = await this.client.patch(`/drivers/${this.testData.userId}`, {
        licenseNumber: 'DL123456789',
        licenseExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        experience: 5
      }, {
        headers: { Authorization: `Bearer ${this.testData.accessToken}` }
      });

      assert(response.status === 200, 'Profile update failed');
      steps.push('✓ تحديث البيانات الشخصية');

      // الخطوة 3: بدء رحلة
      response = await this.client.post('/trips/start', {
        vehicleId: 'VHL-001',
        startLocation: { latitude: 24.7136, longitude: 46.6753 },
        destination: { latitude: 24.7245, longitude: 46.6881 }
      }, {
        headers: { Authorization: `Bearer ${this.testData.accessToken}` }
      });

      assert(response.status === 201, 'Trip start failed');
      this.testData.tripId = response.data.data.tripId;
      steps.push('✓ بدء الرحلة');

      // الخطوة 4: تحديث الموقع بشكل متكرر
      for (let i = 0; i < 5; i++) {
        await this.client.post('/gps/location/update', {
          tripId: this.testData.tripId,
          latitude: 24.7136 + (i * 0.001),
          longitude: 46.6753 + (i * 0.001),
          speed: 40 + (i * 5),
          accuracy: 5
        }, {
          headers: { Authorization: `Bearer ${this.testData.accessToken}` }
        });
      }
      steps.push('✓ تحديثات الموقع (5 نقاط)');

      // الخطوة 5: إنهاء الرحلة
      response = await this.client.post('/trips/end', {
        tripId: this.testData.tripId,
        endLocation: { latitude: 24.7245, longitude: 46.6881 },
        totalDistance: 2.5,
        totalDuration: 600
      }, {
        headers: { Authorization: `Bearer ${this.testData.accessToken}` }
      });

      assert(response.status === 200, 'Trip end failed');
      steps.push('✓ إنهاء الرحلة');

      // الخطوة 6: عرض إحصائيات الرحلة
      response = await this.client.get(`/trips/${this.testData.tripId}/statistics`, {
        headers: { Authorization: `Bearer ${this.testData.accessToken}` }
      });

      assert(response.status === 200, 'Statistics fetch failed');
      assert(response.data.data.distance > 0, 'Invalid distance');
      steps.push('✓ عرض الإحصائيات');

      const duration = performance.now() - startTime;
      this.results.scenarios.push({
        name: 'مستخدم جديد ينهي رحلة',
        steps,
        duration: duration.toFixed(2),
        status: 'PASSED'
      });
      this.results.passed++;

    } catch (error) {
      const duration = performance.now() - startTime;
      this.results.scenarios.push({
        name: 'مستخدم جديد ينهي رحلة',
        steps,
        error: error.message,
        duration: duration.toFixed(2),
        status: 'FAILED'
      });
      this.results.failed++;
    }
  }

  /**
   * 2️⃣ السيناريو: مدير أسطول يراقب المركبات
   */
  async scenarioFleetManagerMonitoring() {
    console.log('\n📊 السيناريو 2: مدير أسطول يراقب المركبات...');
    const startTime = performance.now();
    const steps = [];

    try {
      // الخطوة 1: تسجيل مدير أسطول
      let response = await this.client.post('/auth/login', {
        email: 'manager@example.com',
        password: 'SecurePass123!'
      });

      const managerToken = response.data.data?.accessToken || 'test_token';
      steps.push('✓ تسجيل الدخول');

      // الخطوة 2: عرض لوحة التحكم
      response = await this.client.get('/dashboard/fleet-summary', {
        headers: { Authorization: `Bearer ${managerToken}` }
      });

      assert(response.status === 200, 'Dashboard fetch failed');
      assert(response.data.data.totalVehicles > 0, 'No vehicles');
      steps.push('✓ عرض لوحة التحكم');

      // الخطوة 3: عرض المركبات النشطة
      response = await this.client.get('/vehicles/active', {
        headers: { Authorization: `Bearer ${managerToken}` }
      });

      assert(response.status === 200, 'Active vehicles fetch failed');
      steps.push('✓ عرض المركبات النشطة');

      // الخطوة 4: عرض الخريطة الحية
      response = await this.client.get('/map/live-view', {
        headers: { Authorization: `Bearer ${managerToken}` }
      });

      assert(response.status === 200, 'Map view failed');
      steps.push('✓ عرض الخريطة الحية');

      // الخطوة 5: تصفية التقارير
      response = await this.client.get('/reports/summary', {
        params: {
          from: new Date(Date.now() - 24 * 60 * 60 * 1000),
          to: new Date(),
          type: 'daily'
        },
        headers: { Authorization: `Bearer ${managerToken}` }
      });

      assert(response.status === 200, 'Reports fetch failed');
      steps.push('✓ عرض التقارير');

      // الخطوة 6: تنبيهات الأمان
      response = await this.client.get('/alerts/active', {
        headers: { Authorization: `Bearer ${managerToken}` }
      });

      assert(response.status === 200, 'Alerts fetch failed');
      steps.push('✓ عرض التنبيهات');

      const duration = performance.now() - startTime;
      this.results.scenarios.push({
        name: 'مدير أسطول يراقب المركبات',
        steps,
        duration: duration.toFixed(2),
        status: 'PASSED'
      });
      this.results.passed++;

    } catch (error) {
      const duration = performance.now() - startTime;
      this.results.scenarios.push({
        name: 'مدير أسطول يراقب المركبات',
        steps,
        error: error.message,
        duration: duration.toFixed(2),
        status: 'FAILED'
      });
      this.results.failed++;
    }
  }

  /**
   * 3️⃣ السيناريو: المسؤول يدير النظام
   */
  async scenarioAdminSystemManagement() {
    console.log('\n⚙️ السيناريو 3: مسؤول يدير النظام...');
    const startTime = performance.now();
    const steps = [];

    try {
      // الخطوة 1: تسجيل الدخول كمسؤول
      let response = await this.client.post('/auth/login', {
        email: 'admin@example.com',
        password: 'SecurePass123!'
      });

      const adminToken = response.data.data?.accessToken || 'test_token';
      steps.push('✓ تسجيل دخول المسؤول');

      // الخطوة 2: عرض جميع المستخدمين
      response = await this.client.get('/admin/users', {
        headers: { Authorization: `Bearer ${adminToken}` }
      });

      assert(response.status === 200, 'Users list fetch failed');
      steps.push('✓ عرض المستخدمين');

      // الخطوة 3: إنشاء مستخدم جديد
      response = await this.client.post('/admin/users', {
        email: `newuser-${Date.now()}@example.com`,
        fullName: 'مستخدم جديد',
        userType: 'driver',
        status: 'active'
      }, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });

      steps.push('✓ إنشاء مستخدم جديد');

      // الخطوة 4: عرض الأنشطة والسجلات
      response = await this.client.get('/admin/activity-logs', {
        params: { limit: 100 },
        headers: { Authorization: `Bearer ${adminToken}` }
      });

      assert(response.status === 200, 'Activity logs fetch failed');
      steps.push('✓ عرض السجلات');

      // الخطوة 5: تكوين الإعدادات
      response = await this.client.patch('/admin/settings', {
        maxVehicلesPerFleet: 1000,
        maintenanceCheckInterval: 10000,
        alertThresholds: { speedLimit: 120 }
      }, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });

      steps.push('✓ تحديث الإعدادات');

      // الخطوة 6: عرض صحة النظام
      response = await this.client.get('/admin/system-health', {
        headers: { Authorization: `Bearer ${adminToken}` }
      });

      assert(response.status === 200, 'System health check failed');
      steps.push('✓ فحص صحة النظام');

      const duration = performance.now() - startTime;
      this.results.scenarios.push({
        name: 'مسؤول يدير النظام',
        steps,
        duration: duration.toFixed(2),
        status: 'PASSED'
      });
      this.results.passed++;

    } catch (error) {
      const duration = performance.now() - startTime;
      this.results.scenarios.push({
        name: 'مسؤول يدير النظام',
        steps,
        error: error.message,
        duration: duration.toFixed(2),
        status: 'FAILED'
      });
      this.results.failed++;
    }
  }

  /**
   * 4️⃣ السيناريو: التعامل مع حالات الطوارئ
   */
  async scenarioEmergencyHandling() {
    console.log('\n🚨 السيناريو 4: التعامل مع حالات الطوارئ...');
    const startTime = performance.now();
    const steps = [];

    try {
      // الخطوة 1: برفع تنبيه حادث
      let response = await this.client.post('/alerts/incident', {
        type: 'accident',
        severity: 'critical',
        vehicleId: 'VHL-001',
        location: { latitude: 24.7136, longitude: 46.6753 },
        description: 'حادث تصادم'
      }, {
        headers: { Authorization: `Bearer ${this.testData.accessToken || 'test_token'}` }
      });

      assert(response.status === 201, 'Incident alert failed');
      steps.push('✓ برفع إنذار حادث');

      // الخطوة 2: إخطار المدير
      response = await this.client.post('/notifications/send', {
        userId: 'manager-1',
        type: 'alert',
        priority: 'critical',
        title: 'حادث طريق',
        message: 'تم التبليغ عن حادث'
      });

      steps.push('✓ إرسال تنبيه للمدير');

      // الخطوة 3: طلب سيارة إسعاف
      response = await this.client.post('/emergency/ambulance', {
        location: { latitude: 24.7136, longitude: 46.6753 },
        reason: 'حادث طريق'
      });

      steps.push('✓ طلب سيارة إسعاف');

      // الخطوة 4: تقديم تقرير الحادث
      response = await this.client.post('/incidents/report', {
        incidentType: 'accident',
        severity: 'high',
        description: 'تفاصيل الحادث',
        involvedPersons: 2,
        attachments: []
      });

      steps.push('✓ تقديم تقرير');

      // الخطوة 5: متابعة الحالة
      response = await this.client.get('/incidents/status', {
        params: { limit: 10 }
      });

      assert(response.status === 200, 'Incidents status fetch failed');
      steps.push('✓ متابعة حالة الحوادث');

      const duration = performance.now() - startTime;
      this.results.scenarios.push({
        name: 'التعامل مع حالات الطوارئ',
        steps,
        duration: duration.toFixed(2),
        status: 'PASSED'
      });
      this.results.passed++;

    } catch (error) {
      const duration = performance.now() - startTime;
      this.results.scenarios.push({
        name: 'التعامل مع حالات الطوارئ',
        steps,
        error: error.message,
        duration: duration.toFixed(2),
        status: 'FAILED'
      });
      this.results.failed++;
    }
  }

  /**
   * 5️⃣ السيناريو: الصيانة الدورية والتنبؤات
   */
  async scenarioMaintenanceAndPrediction() {
    console.log('\n🔧 السيناريو 5: الصيانة الدورية والتنبؤات...');
    const startTime = performance.now();
    const steps = [];

    try {
      // الخطوة 1: جدولة صيانة
      let response = await this.client.post('/maintenance/schedule', {
        vehicleId: 'VHL-001',
        maintenanceType: 'oil_change',
        estimatedCost: 150,
        notes: 'تغيير الزيت والفلاتر'
      });

      steps.push('✓ جدولة صيانة');

      // الخطوة 2: التنبؤ بالصيانة المطلوبة
      response = await this.client.get('/ml/predict-maintenance', {
        params: { vehicleId: 'VHL-001' }
      });

      assert(response.status === 200, 'Maintenance prediction failed');
      steps.push('✓ التنبؤ بالصيانة');

      // الخطوة 3: حساب تكاليف الصيانة
      response = await this.client.get('/maintenance/cost-estimate', {
        params: { vehicleId: 'VHL-001' }
      });

      steps.push('✓ حساب التكاليف');

      // الخطوة 4: موارد الميكانيكيين
      response = await this.client.get('/maintenance/mechanics/availability', {
        params: { date: new Date().toISOString() }
      });

      steps.push('✓ توفر الميكانيكيين');

      // الخطوة 5: إنشاء أوامر عمل
      response = await this.client.post('/maintenance/work-orders', {
        vehicleId: 'VHL-001',
        type: 'preventive',
        mechanic: 'mech-001'
      });

      steps.push('✓ إنشاء أوامر عمل');

      const duration = performance.now() - startTime;
      this.results.scenarios.push({
        name: 'الصيانة الدورية والتنبؤات',
        steps,
        duration: duration.toFixed(2),
        status: 'PASSED'
      });
      this.results.passed++;

    } catch (error) {
      const duration = performance.now() - startTime;
      this.results.scenarios.push({
        name: 'الصيانة الدورية والتنبؤات',
        steps,
        error: error.message,
        duration: duration.toFixed(2),
        status: 'FAILED'
      });
      this.results.failed++;
    }
  }

  /**
   * تشغيل جميع السيناريوهات
   */
  async runAllScenarios() {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║         🧪 اختبارات E2E - End-to-End Testing              ║');
    console.log('╚════════════════════════════════════════════════════════════╝');

    const overallStart = performance.now();

    await this.scenarioNewUserCompleteTrip();
    await this.scenarioFleetManagerMonitoring();
    await this.scenarioAdminSystemManagement();
    await this.scenarioEmergencyHandling();
    await this.scenarioMaintenanceAndPrediction();

    this.results.duration = performance.now() - overallStart;

    this.printReport();
  }

  /**
   * طباعة التقرير
   */
  printReport() {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                   📋 تقرير النتائج E2E                    ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    this.results.scenarios.forEach((scenario, idx) => {
      console.log(`${idx + 1}. ${scenario.name}`);
      console.log(`   الحالة: ${scenario.status}`);
      console.log(`   المدة: ${scenario.duration}ms`);
      
      if (scenario.steps) {
        scenario.steps.forEach(step => {
          console.log(`   ${step}`);
        });
      }
      
      if (scenario.error) {
        console.log(`   ❌ خطأ: ${scenario.error}`);
      }
      console.log('');
    });

    console.log('════════════════════════════════════════════════════════════');
    console.log(`📊 الملخص:`);
    console.log(`   نجح: ${this.results.passed}`);
    console.log(`   فشل: ${this.results.failed}`);
    console.log(`   الإجمالي: ${this.results.scenarios.length}`);
    console.log(`   الوقت الإجمالي: ${(this.results.duration / 1000).toFixed(2)}s`);
    console.log('════════════════════════════════════════════════════════════\n');
  }
}

module.exports = { E2ETest };

// التشغيل المباشر
if (require.main === module) {
  const e2e = new E2ETest();
  e2e.runAllScenarios();
}
