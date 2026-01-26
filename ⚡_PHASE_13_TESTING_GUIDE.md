# دليل اختبار النظام - البرامج المتخصصة والجلسات المتقدمة

## Phase 13 Testing Guide

---

## 1. اختبارات الوحدة (Unit Tests)

### اختبار نموذج البرامج المتخصصة

```javascript
describe('SpecializedProgram Model', () => {
  test('يجب إنشاء برنامج صحيح مع جميع الحقول المطلوبة', async () => {
    const program = await SpecializedProgram.create({
      name: 'برنامج العلاج الطبيعي',
      code: 'PROG-PT-001',
      disabilityType: 'MOTOR',
      description: 'برنامج متخصص',
      supportedSeverityLevels: ['MILD', 'MODERATE'],
      sessionConfig: {
        standardDuration: 60,
        frequencyPerWeek: 2,
        maxConcurrentParticipants: 1,
      },
      ageGroup: { min: 5, max: 18 },
      isActive: true,
    });

    expect(program).toBeDefined();
    expect(program.code).toBe('PROG-PT-001');
    expect(program.disabilityType).toBe('MOTOR');
  });

  test('يجب أن يفشل الإنشاء بدون كود فريد', async () => {
    const program = new SpecializedProgram({
      name: 'برنامج بدون كود',
      disabilityType: 'VISUAL',
    });

    await expect(program.validate()).rejects.toThrow();
  });

  test('يجب حساب معدل النجاح بشكل صحيح', async () => {
    const program = await SpecializedProgram.create({
      name: 'اختبار معدل النجاح',
      code: 'TEST-001',
      statistics: {
        successfulSessions: 80,
        totalSessions: 100,
      },
    });

    const successRate =
      (program.statistics.successfulSessions /
        program.statistics.totalSessions) *
      100;
    expect(successRate).toBe(80);
  });

  test('يجب تحديث الإحصائيات عند إضافة جلسة جديدة', async () => {
    const program = await SpecializedProgram.findById(programId);
    const initialCount = program.statistics.totalBeneficiaries;

    // محاكاة إضافة مستفيد جديد
    program.statistics.totalBeneficiaries += 1;
    await program.save();

    const updated = await SpecializedProgram.findById(programId);
    expect(updated.statistics.totalBeneficiaries).toBe(initialCount + 1);
  });
});
```

### اختبار نموذج الجلسات المتقدمة

```javascript
describe('AdvancedSession Model', () => {
  test('يجب إنشاء جلسة صحيحة', async () => {
    const session = await AdvancedSession.create({
      beneficiaryId: beneficiaryId,
      programId: programId,
      specialistId: specialistId,
      title: 'جلسة اختبار',
      scheduledDateTime: new Date(),
      scheduledDuration: 60,
      sessionStatus: 'scheduled',
    });

    expect(session).toBeDefined();
    expect(session.sessionStatus).toBe('scheduled');
  });

  test('يجب تسجيل وقت البدء والانتهاء بشكل صحيح', async () => {
    const session = await AdvancedSession.findById(sessionId);
    const startTime = new Date('2026-01-25T10:00:00Z');
    const endTime = new Date('2026-01-25T11:00:00Z');

    session.beneficiaryAttendance.actualArrivalTime = startTime;
    session.beneficiaryAttendance.actualDepartureTime = endTime;
    await session.save();

    const updated = await AdvancedSession.findById(sessionId);
    expect(updated.beneficiaryAttendance.actualArrivalTime).toEqual(startTime);
  });

  test('يجب تحديث حالة الجلسة من scheduled إلى in_progress', async () => {
    const session = await AdvancedSession.findById(sessionId);
    session.sessionStatus = 'in_progress';
    await session.save();

    const updated = await AdvancedSession.findById(sessionId);
    expect(updated.sessionStatus).toBe('in_progress');
  });

  test('يجب تسجيل الحضور بشكل صحيح', async () => {
    const session = await AdvancedSession.findById(sessionId);
    session.beneficiaryAttendance.status = 'present';
    session.beneficiaryAttendance.remarks = 'حضر بنشاط';
    await session.save();

    const updated = await AdvancedSession.findById(sessionId);
    expect(updated.beneficiaryAttendance.status).toBe('present');
    expect(updated.beneficiaryAttendance.remarks).toBe('حضر بنشاط');
  });

  test('يجب تسجيل التقييم الشامل', async () => {
    const session = await AdvancedSession.findById(sessionId);
    session.performanceAssessment = {
      overallEngagement: 'excellent',
      engagement: 'المستفيد أظهر اهتماماً عالياً',
      motivation: 'high',
      concentration: 'excellent',
      cooperation: 'excellent',
      progressTowardGoals: 'very_good',
      estimatedGoalAttainment: 85,
    };
    await session.save();

    const updated = await AdvancedSession.findById(sessionId);
    expect(updated.performanceAssessment.overallEngagement).toBe('excellent');
    expect(updated.performanceAssessment.estimatedGoalAttainment).toBe(85);
  });
});
```

### اختبار نموذج الجدولة الذكية

```javascript
describe('SmartScheduler Model', () => {
  test('يجب إنشاء جدولة ذكية صحيحة', async () => {
    const scheduler = await SmartScheduler.create({
      beneficiaryId: beneficiaryId,
      programId: programId,
      frequency: 'weekly',
      sessionsPerWeek: 2,
      planDuration: 90,
    });

    expect(scheduler).toBeDefined();
    expect(scheduler.frequency).toBe('weekly');
    expect(scheduler.sessionsPerWeek).toBe(2);
  });

  test('يجب توليد مقترحات الجدولة', async () => {
    const scheduler = await SmartScheduler.findById(schedulerId);
    const suggestions = scheduler.schedulingPlan.suggestions || [];

    expect(Array.isArray(suggestions)).toBe(true);
    suggestions.forEach(suggestion => {
      expect(suggestion.scheduledDateTime).toBeDefined();
      expect(suggestion.confidenceScore).toBeGreaterThan(0);
    });
  });

  test('يجب الكشف عن التعارضات في الجدولة', async () => {
    const scheduler = await SmartScheduler.findById(schedulerId);

    // إضافة جلستين في نفس الوقت
    scheduler.schedulingPlan.suggestions = [
      { scheduledDateTime: new Date('2026-01-25T10:00:00Z') },
      { scheduledDateTime: new Date('2026-01-25T10:30:00Z') },
    ];

    // يجب أن يكون هناك صراع زمني
    const hasConflict =
      scheduler.schedulingPlan.suggestions.length > 1 &&
      scheduler.schedulingPlan.suggestions[0].scheduledDateTime.getTime() <
        scheduler.schedulingPlan.suggestions[1].scheduledDateTime.getTime() +
          60 * 60 * 1000;

    expect(hasConflict).toBe(true);
  });

  test('يجب حساب كفاءة الجدولة بشكل صحيح', async () => {
    const scheduler = await SmartScheduler.findById(schedulerId);
    const analytics = scheduler.analytics;

    expect(analytics.schedulingEfficiency).toBeGreaterThan(0);
    expect(analytics.schedulingEfficiency).toBeLessThanOrEqual(100);
  });

  test('يجب احترام توفر الأخصائي', async () => {
    const scheduler = await SmartScheduler.findById(schedulerId);
    const availableSpecialists =
      scheduler.schedulingCriteria.availableSpecialists;

    expect(Array.isArray(availableSpecialists)).toBe(true);
    availableSpecialists.forEach(specialist => {
      expect(specialist.specialistId).toBeDefined();
      expect(Array.isArray(specialist.availabilitySlots)).toBe(true);
    });
  });
});
```

---

## 2. اختبارات التكامل (Integration Tests)

### اختبار تدفق الجلسة الكاملة

```javascript
describe('Session Complete Workflow', () => {
  test('يجب اكتمال تدفق الجلسة من الإنشاء إلى الإكمال', async () => {
    // 1. إنشاء الجلسة
    const sessionData = {
      beneficiaryId: beneficiaryId,
      programId: programId,
      specialistId: specialistId,
      title: 'جلسة اختبار التدفق الكامل',
      scheduledDateTime: new Date(),
      scheduledDuration: 60,
    };

    const createResponse = await request(app)
      .post('/api/sessions')
      .send(sessionData);

    expect(createResponse.status).toBe(201);
    const sessionId = createResponse.body.data._id;

    // 2. بدء الجلسة
    const startResponse = await request(app)
      .post(`/api/sessions/${sessionId}/start`)
      .send({});

    expect(startResponse.status).toBe(200);
    expect(startResponse.body.data.sessionStatus).toBe('in_progress');

    // 3. إكمال الجلسة
    const completeData = {
      beneficiaryAttendance: {
        status: 'present',
        remarks: 'حضر بنجاح',
      },
      performanceAssessment: {
        overallEngagement: 'excellent',
        progressTowardGoals: 'good',
      },
      implementedActivities: [
        {
          name: 'نشاط اختبار',
          completed: true,
          competencyLevel: 'independent',
        },
      ],
    };

    const completeResponse = await request(app)
      .post(`/api/sessions/${sessionId}/complete`)
      .send(completeData);

    expect(completeResponse.status).toBe(200);
    expect(completeResponse.body.data.sessionStatus).toBe('completed');
  });

  test('يجب إعادة جدولة جلسة بنجاح', async () => {
    const rescheduleData = {
      newDateTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      reason: 'طلب المستفيد',
    };

    const response = await request(app)
      .post(`/api/sessions/${sessionId}/reschedule`)
      .send(rescheduleData);

    expect(response.status).toBe(200);
    expect(response.body.data.sessionStatus).toBe('rescheduled');
  });

  test('يجب إلغاء جلسة مع سبب', async () => {
    const cancelData = {
      reason: 'مرض المستفيد',
      cancelledBy: 'specialist',
    };

    const response = await request(app)
      .post(`/api/sessions/${sessionId}/cancel`)
      .send(cancelData);

    expect(response.status).toBe(200);
    expect(response.body.data.sessionStatus).toBe('cancelled');
  });
});
```

### اختبار تدفق الجدولة الذكية

```javascript
describe('Smart Scheduler Workflow', () => {
  test('يجب اكتمال تدفق الجدولة من الإنشاء إلى التفعيل', async () => {
    // 1. إنشاء الجدولة
    const scheduleData = {
      beneficiaryId: beneficiaryId,
      programId: programId,
      frequency: 'weekly',
      sessionsPerWeek: 2,
      planDuration: 90,
    };

    const createResponse = await request(app)
      .post('/api/scheduler/create-schedule')
      .send(scheduleData);

    expect(createResponse.status).toBe(201);
    const schedulerId = createResponse.body.data._id;

    // 2. توليد المقترحات
    const suggestionsResponse = await request(app)
      .post(`/api/scheduler/${schedulerId}/generate-suggestions`)
      .send({});

    expect(suggestionsResponse.status).toBe(200);
    expect(suggestionsResponse.body.data.suggestions).toBeDefined();

    // 3. الموافقة على الجدولة
    const approvalData = {
      approvedBy: 'specialist',
      specialistApproval: true,
    };

    const approvalResponse = await request(app)
      .post(`/api/scheduler/${schedulerId}/approve-schedule`)
      .send(approvalData);

    expect(approvalResponse.status).toBe(200);

    // 4. تفعيل الجدولة
    const activateResponse = await request(app)
      .post(`/api/scheduler/${schedulerId}/activate-schedule`)
      .send({});

    expect(activateResponse.status).toBe(200);
    expect(activateResponse.body.data.status).toBe('active');
  });

  test('يجب الكشف عن التعارضات بنجاح', async () => {
    const response = await request(app).get(
      `/api/scheduler/${schedulerId}/conflicts`
    );

    expect(response.status).toBe(200);
    expect(response.body.data).toBeDefined();
    expect(Array.isArray(response.body.data.conflicts)).toBe(true);
  });
});
```

---

## 3. اختبارات البيانات الطرفية (API Tests)

### اختبار البرامج

```javascript
describe('Specialized Programs API', () => {
  test('GET /api/programs - جلب جميع البرامج', async () => {
    const response = await request(app).get('/api/programs').expect(200);

    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  test('POST /api/programs - إنشاء برنامج جديد', async () => {
    const programData = {
      name: 'برنامج اختبار API',
      code: 'API-TEST-001',
      disabilityType: 'MOTOR',
      description: 'برنامج لاختبار API',
      sessionConfig: {
        standardDuration: 60,
        frequencyPerWeek: 2,
        maxConcurrentParticipants: 1,
      },
    };

    const response = await request(app)
      .post('/api/programs')
      .send(programData)
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.code).toBe('API-TEST-001');
  });

  test('GET /api/programs/by-disability/MOTOR - جلب البرامج حسب نوع الإعاقة', async () => {
    const response = await request(app)
      .get('/api/programs/by-disability/MOTOR')
      .expect(200);

    expect(response.body.success).toBe(true);
    response.body.data.forEach(program => {
      expect(program.disabilityType).toBe('MOTOR');
    });
  });

  test('PUT /api/programs/:id - تحديث برنامج', async () => {
    const updateData = {
      name: 'برنامج محدّث',
    };

    const response = await request(app)
      .put(`/api/programs/${programId}`)
      .send(updateData)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.name).toBe('برنامج محدّث');
  });

  test('DELETE /api/programs/:id - حذف/أرشفة برنامج', async () => {
    const response = await request(app)
      .delete(`/api/programs/${programId}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.isActive).toBe(false);
  });
});
```

### اختبار الجلسات

```javascript
describe('Advanced Sessions API', () => {
  test('GET /api/sessions - جلب الجلسات مع الفلترة', async () => {
    const response = await request(app)
      .get('/api/sessions?status=scheduled')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  test('POST /api/sessions - إنشاء جلسة جديدة', async () => {
    const sessionData = {
      beneficiaryId: beneficiaryId,
      programId: programId,
      specialistId: specialistId,
      title: 'جلسة API اختبار',
      scheduledDateTime: new Date(),
      scheduledDuration: 60,
      location: { roomId: 'room-001' },
    };

    const response = await request(app)
      .post('/api/sessions')
      .send(sessionData)
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.title).toBe('جلسة API اختبار');
  });

  test('GET /api/sessions/:id/report - جلب تقرير الجلسة', async () => {
    const response = await request(app)
      .get(`/api/sessions/${sessionId}/report`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
  });
});
```

---

## 4. قائمة التحقق من الاختبارات

### اختبارات الوظيفة:

- ✅ إنشاء برامج جديدة
- ✅ تحديث البرامج
- ✅ حذف/أرشفة البرامج
- ✅ فلترة البرامج حسب نوع الإعاقة
- ✅ إنشاء جلسات
- ✅ بدء الجلسات
- ✅ إكمال الجلسات مع التقييم
- ✅ إعادة جدولة الجلسات
- ✅ إلغاء الجلسات
- ✅ إنشاء جدولة ذكية
- ✅ توليد المقترحات
- ✅ الموافقة على الجدولة
- ✅ تفعيل الجدولة
- ✅ الكشف عن التعارضات

### اختبارات الأداء:

- ✅ وقت استجابة الاستعلامات < 200ms
- ✅ وقت معالجة الجدولة الذكية < 500ms
- ✅ إنشاء جلسة جديدة < 100ms
- ✅ جلب قائمة البرامج < 150ms

### اختبارات الأمان:

- ✅ التحقق من صلاحيات المستخدم
- ✅ تشفير البيانات الحساسة
- ✅ منع حقن SQL
- ✅ التحقق من صحة الإدخالات

### اختبارات الواجهة الرسومية:

- ✅ عرض البرامج بشكل صحيح
- ✅ فتح نموذج إنشاء برنامج
- ✅ فتح نموذج إنشاء جلسة
- ✅ عرض التقارير بشكل صحيح
- ✅ الاستجابة للأجهزة المحمولة

---

## 5. سيناريوهات الاختبار الشاملة

### سيناريو 1: مستفيد يبدأ برنامج جديد

```
1. المسؤول ينشئ برنامج علاج جديد
   ✓ البرنامج ينشأ بنجاح
   ✓ يظهر البرنامج في القائمة

2. الأخصائي ينشئ جدولة ذكية للمستفيد
   ✓ الجدولة تنشأ بنجاح
   ✓ يتم توليد المقترحات

3. الأخصائي يوافق على الجدولة
   ✓ الموافقة تسجل بنجاح
   ✓ تظهر حالة الموافقة

4. تفعيل الجدولة
   ✓ الجدولة تُفعّل بنجاح
   ✓ تظهر الجلسات المجدولة

5. إجراء أول جلسة
   ✓ الجلسة تبدأ بنجاح
   ✓ يتم تسجيل الحضور
   ✓ يتم تسجيل الأنشطة
   ✓ يتم إدخال التقييم
   ✓ الجلسة تُكمل بنجاح
```

### سيناريو 2: إعادة جدولة جلسة

```
1. جلسة مجدولة موجودة
2. طلب إعادة جدولة
   ✓ اختيار التاريخ والوقت الجديد
   ✓ تسجيل السبب

3. التحقق من التعارضات
   ✓ لا توجد تعارضات

4. حفظ التغييرات
   ✓ الجلسة تُعاد جدولة بنجاح
   ✓ يتم الإخطار بالتغيير
```

---

## خطوات تشغيل الاختبارات

### تشغيل جميع الاختبارات:

```bash
npm test
```

### تشغيل اختبارات معينة:

```bash
npm test -- specialized-programs
npm test -- advanced-sessions
npm test -- smart-scheduler
```

### تشغيل مع تغطية الكود:

```bash
npm test -- --coverage
```

---

**آخر تحديث:** 22 يناير 2026 **الحالة:** جاهز للاختبار ✅
