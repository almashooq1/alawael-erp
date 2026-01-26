/**
 * ═══════════════════════════════════════════════════════════════════════
 *
 *   بيانات عينة وأمثلة - نظام الألعاب التفاعلية لتأهيل ذوي الإعاقة
 *   Sample Data & Examples - Interactive Games Rehabilitation System
 *
 * ═══════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════
// سيناريوهات تجريبية - Test Scenarios
// ═══════════════════════════════════════════════════════════════════

const SCENARIO_1_COMPLETE_REHAB_JOURNEY = `
════════════════════════════════════════════════════════════════════
السيناريو 1: رحلة تأهيل كاملة
Complete Rehabilitation Journey
════════════════════════════════════════════════════════════════════

الخطوة 1: إضافة معالج جديد
POST /api/rehab-games/therapists
Content-Type: application/json

{
  "name": "د. أمل السيد",
  "specialization": "physical",
  "credentials": ["دكتوراه علاج طبيعي", "خبير تأهيل حركي"],
  "experience": 10,
  "email": "dr.amal@rehab.com",
  "phone": "+201234567890"
}

────────────────────────────────────────────────────────────────────

الخطوة 2: إضافة مريض جديد
POST /api/rehab-games/patients
Content-Type: application/json

{
  "name": "خالد محمد",
  "age": 32,
  "gender": "male",
  "disabilityType": "physical",
  "disabilityLevel": "moderate",
  "currentCondition": "إصابة في الحبل الشوكي - C5-C6",
  "goals": [
    "تحسين قوة العضلات العلوية",
    "زيادة مدى الحركة",
    "تحسين التوازن والتنسيق"
  ],
  "assignedTherapist": "T0001",
  "email": "khaled@email.com",
  "phone": "+201111111111",
  "address": "القاهرة، مصر",
  "emergencyContact": "+201222222222",
  "difficultyLevel": "beginner"
}

────────────────────────────────────────────────────────────────────

الخطوة 3: إنشاء جلسة تأهيل
POST /api/rehab-games/sessions
Content-Type: application/json

{
  "patientId": "P0001",
  "therapistId": "T0001",
  "gameId": "G0001",
  "type": "training",
  "scheduledDate": "2026-01-22T10:00:00Z",
  "duration": 20,
  "goals": [
    "تحسين التوازن الأساسي",
    "زيادة الثقة في الحركة"
  ],
  "difficulty": "beginner"
}

────────────────────────────────────────────────────────────────────

الخطوة 4: بدء الجلسة
POST /api/rehab-games/sessions/S000001/start

────────────────────────────────────────────────────────────────────

الخطوة 5: إنهاء الجلسة وتسجيل النتائج
POST /api/rehab-games/sessions/S000001/complete
Content-Type: application/json

{
  "score": 78,
  "accuracy": 85,
  "speed": 75,
  "consistency": 80,
  "independence": 82,
  "engagement": 90,
  "attempts": 3,
  "errors": [],
  "feedback": "أداء جيد جداً للجلسة الأولى. يظهر تحسن واضح في التوازن"
}

────────────────────────────────────────────────────────────────────

الخطوة 6: عرض لوحة معلومات المريض
GET /api/rehab-games/patients/P0001/dashboard

────────────────────────────────────────────────────────────────────

الخطوة 7: توليد تقرير شامل
POST /api/rehab-games/reports/generate
Content-Type: application/json

{
  "patientId": "P0001",
  "dateFrom": "2026-01-01",
  "dateTo": "2026-01-31",
  "therapistId": "T0001"
}

════════════════════════════════════════════════════════════════════
`;

const SCENARIO_2_COGNITIVE_REHABILITATION = `
════════════════════════════════════════════════════════════════════
السيناريو 2: تأهيل معرفي
Cognitive Rehabilitation
════════════════════════════════════════════════════════════════════

الخطوة 1: إضافة مريض بإعاقة معرفية
POST /api/rehab-games/patients
Content-Type: application/json

{
  "name": "مريم أحمد",
  "age": 28,
  "gender": "female",
  "disabilityType": "cognitive",
  "disabilityLevel": "mild",
  "currentCondition": "إصابة دماغية - تحتاج لتحسين الذاكرة والتركيز",
  "goals": [
    "تحسين الذاكرة قصيرة المدى",
    "زيادة مدة التركيز",
    "تطوير مهارات حل المشكلات"
  ],
  "assignedTherapist": "T0002",
  "email": "mariam@email.com",
  "phone": "+201333333333"
}

────────────────────────────────────────────────────────────────────

الخطوة 2: البحث عن ألعاب معرفية
GET /api/rehab-games/games?category=cognitive&difficulty=beginner

────────────────────────────────────────────────────────────────────

الخطوة 3: إنشاء تقييم أولي
POST /api/rehab-games/assessments
Content-Type: application/json

{
  "patientId": "P0002",
  "therapistId": "T0002",
  "type": "initial",
  "cognitive": {
    "memory": 65,
    "attention": 70,
    "problemSolving": 60,
    "executiveFunction": 62
  },
  "scores": {
    "overall": 64
  },
  "observations": "المريضة تظهر صعوبة في الذاكرة قصيرة المدى. التركيز جيد نسبياً",
  "recommendations": [
    "البدء بألعاب الذاكرة البسيطة",
    "زيادة مدة الجلسات تدريجياً",
    "استخدام تقنيات التكرار المتباعد"
  ]
}

────────────────────────────────────────────────────────────────────

الخطوة 4: إنشاء تمرين مخصص
POST /api/rehab-games/exercises
Content-Type: application/json

{
  "patientId": "P0002",
  "therapistId": "T0002",
  "title": "تمرين الذاكرة اليومي",
  "description": "تمرين يومي لتحسين الذاكرة قصيرة المدى",
  "category": "cognitive",
  "difficulty": "beginner",
  "duration": 15,
  "frequency": "daily",
  "instructions": [
    "انظر إلى القائمة لمدة دقيقة",
    "حاول تذكر جميع العناصر",
    "اكتب ما تتذكره"
  ],
  "targetAreas": ["الذاكرة", "التركيز"]
}

════════════════════════════════════════════════════════════════════
`;

// ═══════════════════════════════════════════════════════════════════
// أمثلة cURL - cURL Examples
// ═══════════════════════════════════════════════════════════════════

const CURL_EXAMPLES = `
════════════════════════════════════════════════════════════════════
أمثلة cURL للاختبار - cURL Testing Examples
════════════════════════════════════════════════════════════════════

1. فحص صحة النظام
   Check System Health
   ────────────────────────────────────────────────────────────────
   curl http://localhost:3001/api/rehab-games/health

────────────────────────────────────────────────────────────────────

2. الحصول على إحصائيات النظام
   Get System Statistics
   ────────────────────────────────────────────────────────────────
   curl http://localhost:3001/api/rehab-games/stats

────────────────────────────────────────────────────────────────────

3. إضافة مريض جديد
   Add New Patient
   ────────────────────────────────────────────────────────────────
   curl -X POST http://localhost:3001/api/rehab-games/patients \\
     -H "Content-Type: application/json" \\
     -d '{
       "name": "علي حسن",
       "age": 35,
       "gender": "male",
       "disabilityType": "physical",
       "disabilityLevel": "moderate",
       "currentCondition": "إصابة في الركبة",
       "goals": ["تحسين الحركة", "تقليل الألم"],
       "assignedTherapist": "T0001",
       "email": "ali@email.com",
       "phone": "+201444444444"
     }'

────────────────────────────────────────────────────────────────────

4. الحصول على قائمة المرضى
   Get All Patients
   ────────────────────────────────────────────────────────────────
   curl http://localhost:3001/api/rehab-games/patients

────────────────────────────────────────────────────────────────────

5. الحصول على لوحة معلومات مريض
   Get Patient Dashboard
   ────────────────────────────────────────────────────────────────
   curl http://localhost:3001/api/rehab-games/patients/P0001/dashboard

────────────────────────────────────────────────────────────────────

6. البحث عن الألعاب حسب الفئة
   Search Games by Category
   ────────────────────────────────────────────────────────────────
   curl "http://localhost:3001/api/rehab-games/games?category=motor&difficulty=beginner"

────────────────────────────────────────────────────────────────────

7. إنشاء جلسة تأهيل
   Create Rehabilitation Session
   ────────────────────────────────────────────────────────────────
   curl -X POST http://localhost:3001/api/rehab-games/sessions \\
     -H "Content-Type: application/json" \\
     -d '{
       "patientId": "P0001",
       "therapistId": "T0001",
       "gameId": "G0001",
       "type": "training",
       "scheduledDate": "2026-01-22T14:00:00Z",
       "duration": 20,
       "goals": ["تحسين التوازن"]
     }'

────────────────────────────────────────────────────────────────────

8. بدء جلسة
   Start Session
   ────────────────────────────────────────────────────────────────
   curl -X POST http://localhost:3001/api/rehab-games/sessions/S000001/start

────────────────────────────────────────────────────────────────────

9. إنهاء جلسة مع النتائج
   Complete Session with Results
   ────────────────────────────────────────────────────────────────
   curl -X POST http://localhost:3001/api/rehab-games/sessions/S000001/complete \\
     -H "Content-Type: application/json" \\
     -d '{
       "score": 85,
       "accuracy": 90,
       "speed": 80,
       "consistency": 88,
       "independence": 85,
       "engagement": 92,
       "feedback": "أداء ممتاز"
     }'

────────────────────────────────────────────────────────────────────

10. الحصول على تقدم المريض
    Get Patient Progress
    ────────────────────────────────────────────────────────────────
    curl http://localhost:3001/api/rehab-games/patients/P0001/progress

────────────────────────────────────────────────────────────────────

11. الحصول على إنجازات المريض
    Get Patient Achievements
    ────────────────────────────────────────────────────────────────
    curl http://localhost:3001/api/rehab-games/patients/P0001/achievements

────────────────────────────────────────────────────────────────────

12. إنشاء تقييم
    Create Assessment
    ────────────────────────────────────────────────────────────────
    curl -X POST http://localhost:3001/api/rehab-games/assessments \\
      -H "Content-Type: application/json" \\
      -d '{
        "patientId": "P0001",
        "therapistId": "T0001",
        "type": "progress",
        "cognitive": {"score": 85},
        "motor": {"score": 80},
        "scores": {"overall": 82},
        "observations": "تحسن ملحوظ",
        "recommendations": ["الاستمرار في البرنامج الحالي"]
      }'

────────────────────────────────────────────────────────────────────

13. توليد تقرير شامل
    Generate Comprehensive Report
    ────────────────────────────────────────────────────────────────
    curl -X POST http://localhost:3001/api/rehab-games/reports/generate \\
      -H "Content-Type: application/json" \\
      -d '{
        "patientId": "P0001",
        "dateFrom": "2026-01-01",
        "dateTo": "2026-01-31"
      }'

────────────────────────────────────────────────────────────────────

14. الحصول على إحصائيات معالج
    Get Therapist Statistics
    ────────────────────────────────────────────────────────────────
    curl http://localhost:3001/api/rehab-games/therapists/T0001/stats

────────────────────────────────────────────────────────────────────

15. الحصول على جلسات مريض
    Get Patient Sessions
    ────────────────────────────────────────────────────────────────
    curl "http://localhost:3001/api/rehab-games/sessions/patient/P0001?status=completed"

════════════════════════════════════════════════════════════════════
`;

// ═══════════════════════════════════════════════════════════════════
// بيانات عينة للألعاب - Sample Game Data
// ═══════════════════════════════════════════════════════════════════

const SAMPLE_GAMES = [
  {
    title: 'تمرين التوازن المتقدم',
    titleEn: 'Advanced Balance Exercise',
    description: 'لعبة متقدمة لتحسين التوازن والاستقرار من خلال تحديات متنوعة',
    category: 'motor',
    targetDisability: 'physical',
    difficulty: 'advanced',
    duration: 25,
    minAge: 25,
    maxAge: 65,
    objectives: ['تحسين التوازن الديناميكي', 'تقوية عضلات الجذع', 'زيادة الثقة'],
    instructions: 'قف على المنصة واتبع التعليمات المرئية. حافظ على توازنك',
    equipment: ['منصة توازن ذكية', 'حصيرة آمنة'],
    maxScore: 100,
    passingScore: 70,
  },
  {
    title: 'لعبة الذاكرة البصرية',
    titleEn: 'Visual Memory Game',
    description: 'تطوير الذاكرة البصرية من خلال تذكر الأنماط والصور',
    category: 'cognitive',
    targetDisability: 'cognitive',
    difficulty: 'intermediate',
    duration: 15,
    minAge: 18,
    maxAge: 75,
    objectives: ['تقوية الذاكرة البصرية', 'زيادة مدة الانتباه', 'تحسين التركيز'],
    instructions: 'انظر للصور، ثم حاول تذكر موقعها بعد اختفائها',
    equipment: ['شاشة لمس'],
    maxScore: 100,
    passingScore: 65,
  },
  {
    title: 'تمرين التنسيق اليدوي',
    titleEn: 'Hand Coordination Exercise',
    description: 'تحسين التنسيق بين اليدين والأصابع',
    category: 'coordination',
    targetDisability: 'physical',
    difficulty: 'beginner',
    duration: 12,
    minAge: 15,
    maxAge: 70,
    objectives: ['تحسين المهارات الحركية الدقيقة', 'زيادة سرعة الاستجابة'],
    instructions: 'استخدم أصابعك للضغط على الأهداف المتحركة',
    equipment: ['شاشة لمس أو لوحة مفاتيح'],
    maxScore: 100,
    passingScore: 60,
  },
];

// ═══════════════════════════════════════════════════════════════════
// بيانات عينة للمرضى - Sample Patient Data
// ═══════════════════════════════════════════════════════════════════

const SAMPLE_PATIENTS = [
  {
    name: 'سارة أحمد',
    age: 29,
    gender: 'female',
    disabilityType: 'sensory',
    disabilityLevel: 'mild',
    currentCondition: 'ضعف في السمع - تحتاج لتأهيل تواصلي',
    goals: ['تحسين مهارات القراءة الشفوية', 'تطوير التواصل البديل'],
  },
  {
    name: 'عمر محمود',
    age: 42,
    gender: 'male',
    disabilityType: 'multiple',
    disabilityLevel: 'severe',
    currentCondition: 'إعاقات متعددة - حركية ومعرفية',
    goals: ['تحسين الاستقلالية', 'تطوير المهارات الحياتية'],
  },
  {
    name: 'نور فاطمة',
    age: 25,
    gender: 'female',
    disabilityType: 'cognitive',
    disabilityLevel: 'moderate',
    currentCondition: 'متلازمة داون - تحتاج لتحفيز معرفي',
    goals: ['تحسين الذاكرة', 'تطوير مهارات التواصل'],
  },
];

// ═══════════════════════════════════════════════════════════════════
// دليل اختبار النظام - System Testing Guide
// ═══════════════════════════════════════════════════════════════════

const TESTING_GUIDE = `
════════════════════════════════════════════════════════════════════
دليل اختبار نظام الألعاب التفاعلية لتأهيل ذوي الإعاقة
Interactive Games Rehabilitation System - Testing Guide
════════════════════════════════════════════════════════════════════

المتطلبات الأساسية:
───────────────────────────────────────────────────────────────────
✓ Node.js مثبت (v14+)
✓ Backend يعمل على المنفذ 3001
✓ أداة اختبار API (Postman, curl, أو متصفح)

════════════════════════════════════════════════════════════════════

خطوات الاختبار:
───────────────────────────────────────────────────────────────────

الخطوة 1: تشغيل الاختبارات التلقائية
   $ cd backend
   $ node tests/rehab_games_test.js
   
   النتيجة المتوقعة: جميع الاختبارات تنجح ✅

────────────────────────────────────────────────────────────────────

الخطوة 2: اختبار صحة النظام
   $ curl http://localhost:3001/api/rehab-games/health
   
   النتيجة المتوقعة:
   {
     "success": true,
     "message": "System is healthy",
     "data": {
       "status": "operational",
       "service": "Interactive Games Rehabilitation System"
     }
   }

────────────────────────────────────────────────────────────────────

الخطوة 3: اختبار الإحصائيات
   $ curl http://localhost:3001/api/rehab-games/stats
   
   النتيجة المتوقعة: إحصائيات شاملة عن النظام

────────────────────────────────────────────────────────────────────

الخطوة 4: اختبار إضافة مريض
   استخدم أحد أمثلة cURL أعلاه لإضافة مريض جديد
   
   النتيجة المتوقعة: المريض يُضاف بنجاح مع معرف فريد

────────────────────────────────────────────────────────────────────

الخطوة 5: اختبار دورة كاملة للجلسة
   1. إنشاء جلسة
   2. بدء الجلسة
   3. إنهاء الجلسة بنتائج
   4. عرض التقدم
   
   النتيجة المتوقعة: جميع العمليات تتم بنجاح

────────────────────────────────────────────────────────────────────

الخطوة 6: اختبار لوحة المعلومات
   $ curl http://localhost:3001/api/rehab-games/patients/P0001/dashboard
   
   النتيجة المتوقعة: لوحة معلومات شاملة مع إحصائيات

────────────────────────────────────────────────────────────────────

الخطوة 7: اختبار التقارير
   استخدم endpoint توليد التقرير
   
   النتيجة المتوقعة: تقرير شامل بجميع البيانات

════════════════════════════════════════════════════════════════════

معايير النجاح:
───────────────────────────────────────────────────────────────────
✅ جميع endpoints تستجيب بشكل صحيح
✅ البيانات تُحفظ وتُسترجع بشكل صحيح
✅ النتائج تُحسب بدقة
✅ الإنجازات تُمنح تلقائياً
✅ التقارير تُولّد بشكل صحيح

════════════════════════════════════════════════════════════════════

نصائح الاستكشاف:
───────────────────────────────────────────────────────────────────
• تحقق من سجلات الخادم (console logs) لتتبع العمليات
• استخدم Postman لاختبار أسهل مع واجهة مرئية
• راجع التوثيق الكامل في ملف REHAB_GAMES_SYSTEM.md
• جرب سيناريوهات مختلفة للتأكد من المرونة

════════════════════════════════════════════════════════════════════
`;

// ═══════════════════════════════════════════════════════════════════
// تصدير جميع البيانات - Export All Data
// ═══════════════════════════════════════════════════════════════════

module.exports = {
  scenarios: {
    completeRehabJourney: SCENARIO_1_COMPLETE_REHAB_JOURNEY,
    cognitiveRehabilitation: SCENARIO_2_COGNITIVE_REHABILITATION,
  },
  curlExamples: CURL_EXAMPLES,
  sampleGames: SAMPLE_GAMES,
  samplePatients: SAMPLE_PATIENTS,
  testingGuide: TESTING_GUIDE,
};

// ═══════════════════════════════════════════════════════════════════
// طباعة البيانات عند التشغيل المباشر
// ═══════════════════════════════════════════════════════════════════

if (require.main === module) {
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('  بيانات عينة وأمثلة - نظام الألعاب التفاعلية لتأهيل ذوي الإعاقة');
  console.log('═══════════════════════════════════════════════════════════════════\n');

  console.log(SCENARIO_1_COMPLETE_REHAB_JOURNEY);
  console.log(SCENARIO_2_COGNITIVE_REHABILITATION);
  console.log(CURL_EXAMPLES);
  console.log(TESTING_GUIDE);

  console.log('\n════════════════════════════════════════════════════════════════════');
  console.log('  البيانات العينة متاحة للاستخدام');
  console.log('════════════════════════════════════════════════════════════════════\n');
}
