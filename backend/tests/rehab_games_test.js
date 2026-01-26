/**
 * ═══════════════════════════════════════════════════════════════════════
 * 
 *   Test Suite - نظام الألعاب التفاعلية لتأهيل ذوي الإعاقة
 *   Interactive Games Rehabilitation System - Comprehensive Tests
 * 
 *   مجموعة اختبارات شاملة للتحقق من جميع وظائف النظام
 * 
 * ═══════════════════════════════════════════════════════════════════════
 */

const InteractiveGamesRehabSystem = require('../lib/interactive_games_rehab_system');

class RehabSystemTest {
  constructor() {
    this.system = new InteractiveGamesRehabSystem();
    this.passedTests = 0;
    this.failedTests = 0;
    this.totalTests = 0;
    this.testResults = [];
  }

  /**
   * دوال مساعدة للاختبارات - Test Helper Functions
   */
  
  assertEqual(actual, expected, message) {
    this.totalTests++;
    if (actual === expected) {
      this.passedTests++;
      this.testResults.push({ status: 'PASS', message });
      return true;
    } else {
      this.failedTests++;
      this.testResults.push({ 
        status: 'FAIL', 
        message, 
        expected, 
        actual 
      });
      return false;
    }
  }

  assertNotNull(value, message) {
    this.totalTests++;
    if (value !== null && value !== undefined) {
      this.passedTests++;
      this.testResults.push({ status: 'PASS', message });
      return true;
    } else {
      this.failedTests++;
      this.testResults.push({ 
        status: 'FAIL', 
        message, 
        error: 'Value is null or undefined' 
      });
      return false;
    }
  }

  assertTrue(condition, message) {
    this.totalTests++;
    if (condition === true) {
      this.passedTests++;
      this.testResults.push({ status: 'PASS', message });
      return true;
    } else {
      this.failedTests++;
      this.testResults.push({ 
        status: 'FAIL', 
        message, 
        error: 'Condition is false' 
      });
      return false;
    }
  }

  assertGreaterThan(actual, minimum, message) {
    this.totalTests++;
    if (actual > minimum) {
      this.passedTests++;
      this.testResults.push({ status: 'PASS', message });
      return true;
    } else {
      this.failedTests++;
      this.testResults.push({ 
        status: 'FAIL', 
        message, 
        expected: `> ${minimum}`, 
        actual 
      });
      return false;
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════
   * اختبارات إدارة المرضى - Patient Management Tests
   * ═══════════════════════════════════════════════════════════════════
   */

  testPatientManagement() {
    console.log('\n🧪 اختبار 1: إدارة المرضى');
    
    // إضافة مريض
    const patient = this.system.addPatient({
      name: 'مريض تجريبي',
      age: 30,
      gender: 'male',
      disabilityType: 'physical',
      disabilityLevel: 'moderate',
      currentCondition: 'حالة اختبار',
      goals: ['هدف 1', 'هدف 2'],
      assignedTherapist: 'T0001',
      email: 'test@test.com',
      phone: '+201000000000',
      address: 'عنوان تجريبي',
      emergencyContact: '+201111111111'
    });

    this.assertNotNull(patient, 'يجب أن يتم إنشاء المريض بنجاح');
    this.assertNotNull(patient.id, 'يجب أن يحتوي المريض على معرف');
    this.assertEqual(patient.name, 'مريض تجريبي', 'يجب أن يكون اسم المريض صحيحاً');
    this.assertEqual(patient.status, 'active', 'يجب أن تكون حالة المريض نشطة');

    // الحصول على المريض
    const retrievedPatient = this.system.getPatient(patient.id);
    this.assertNotNull(retrievedPatient, 'يجب استرجاع المريض بنجاح');
    this.assertEqual(retrievedPatient.id, patient.id, 'يجب أن يطابق معرف المريض');

    // تحديث المريض
    const updatedPatient = this.system.updatePatient(patient.id, { age: 31 });
    this.assertEqual(updatedPatient.age, 31, 'يجب تحديث عمر المريض');
  }

  /**
   * ═══════════════════════════════════════════════════════════════════
   * اختبارات إدارة المعالجين - Therapist Management Tests
   * ═══════════════════════════════════════════════════════════════════
   */

  testTherapistManagement() {
    console.log('\n🧪 اختبار 2: إدارة المعالجين');
    
    const therapist = this.system.addTherapist({
      name: 'د. معالج تجريبي',
      specialization: 'physical',
      credentials: ['شهادة 1', 'شهادة 2'],
      experience: 5,
      email: 'therapist@test.com',
      phone: '+201222222222'
    });

    this.assertNotNull(therapist, 'يجب إنشاء المعالج بنجاح');
    this.assertNotNull(therapist.id, 'يجب أن يحتوي المعالج على معرف');
    this.assertEqual(therapist.name, 'د. معالج تجريبي', 'يجب أن يكون اسم المعالج صحيحاً');
    this.assertEqual(therapist.status, 'active', 'يجب أن تكون حالة المعالج نشطة');

    // الحصول على المعالج
    const retrievedTherapist = this.system.getTherapist(therapist.id);
    this.assertNotNull(retrievedTherapist, 'يجب استرجاع المعالج بنجاح');
    
    // الحصول على إحصائيات المعالج
    const stats = this.system.getTherapistStats(therapist.id);
    this.assertNotNull(stats, 'يجب الحصول على إحصائيات المعالج');
  }

  /**
   * ═══════════════════════════════════════════════════════════════════
   * اختبارات إدارة الألعاب - Games Management Tests
   * ═══════════════════════════════════════════════════════════════════
   */

  testGamesManagement() {
    console.log('\n🧪 اختبار 3: إدارة الألعاب');
    
    const game = this.system.addGame({
      title: 'لعبة تجريبية',
      titleEn: 'Test Game',
      description: 'وصف تجريبي للعبة',
      category: 'cognitive',
      targetDisability: 'cognitive',
      difficulty: 'beginner',
      duration: 10,
      minAge: 18,
      maxAge: 60,
      objectives: ['هدف 1', 'هدف 2'],
      instructions: 'تعليمات اللعبة',
      maxScore: 100,
      passingScore: 60,
      levels: [{ level: 1, description: 'مستوى 1', duration: 5 }]
    });

    this.assertNotNull(game, 'يجب إنشاء اللعبة بنجاح');
    this.assertNotNull(game.id, 'يجب أن تحتوي اللعبة على معرف');
    this.assertEqual(game.title, 'لعبة تجريبية', 'يجب أن يكون عنوان اللعبة صحيحاً');
    this.assertEqual(game.status, 'active', 'يجب أن تكون حالة اللعبة نشطة');

    // البحث عن الألعاب
    const games = this.system.searchGames({ category: 'cognitive' });
    this.assertTrue(games.length > 0, 'يجب العثور على ألعاب');
  }

  /**
   * ═══════════════════════════════════════════════════════════════════
   * اختبارات إدارة الجلسات - Session Management Tests
   * ═══════════════════════════════════════════════════════════════════
   */

  testSessionManagement() {
    console.log('\n🧪 اختبار 4: إدارة الجلسات');
    
    // الحصول على أول مريض ومعالج ولعبة من النظام
    const patients = this.system.getAllPatients();
    const therapists = Array.from(this.system.therapists.values());
    const games = Array.from(this.system.games.values());

    if (patients.length === 0 || therapists.length === 0 || games.length === 0) {
      console.log('⚠️ تخطي الاختبار: لا توجد بيانات كافية');
      return;
    }

    const session = this.system.createSession({
      patientId: patients[0].id,
      therapistId: therapists[0].id,
      gameId: games[0].id,
      type: 'training',
      scheduledDate: new Date().toISOString(),
      duration: 15,
      goals: ['هدف الجلسة']
    });

    this.assertNotNull(session, 'يجب إنشاء الجلسة بنجاح');
    this.assertEqual(session.status, 'scheduled', 'يجب أن تكون حالة الجلسة مجدولة');

    // بدء الجلسة
    const startedSession = this.system.startSession(session.id);
    this.assertEqual(startedSession.status, 'in-progress', 'يجب أن تكون الجلسة قيد التنفيذ');

    // إنهاء الجلسة
    const completedSession = this.system.completeSession(session.id, {
      score: 85,
      accuracy: 90,
      speed: 80,
      consistency: 85,
      independence: 90,
      engagement: 95
    });
    this.assertEqual(completedSession.status, 'completed', 'يجب أن تكون الجلسة مكتملة');
    this.assertEqual(completedSession.results.score, 85, 'يجب حفظ النتيجة بشكل صحيح');
  }

  /**
   * ═══════════════════════════════════════════════════════════════════
   * اختبارات التقدم - Progress Tests
   * ═══════════════════════════════════════════════════════════════════
   */

  testProgressTracking() {
    console.log('\n🧪 اختبار 5: تتبع التقدم');
    
    const patients = this.system.getAllPatients();
    if (patients.length === 0) {
      console.log('⚠️ تخطي الاختبار: لا يوجد مرضى');
      return;
    }

    const progress = this.system.getPatientProgress(patients[0].id);
    this.assertNotNull(progress, 'يجب الحصول على سجل التقدم');
    this.assertTrue(Array.isArray(progress), 'يجب أن يكون التقدم مصفوفة');
  }

  /**
   * ═══════════════════════════════════════════════════════════════════
   * اختبارات الإنجازات - Achievements Tests
   * ═══════════════════════════════════════════════════════════════════
   */

  testAchievements() {
    console.log('\n🧪 اختبار 6: الإنجازات');
    
    const patients = this.system.getAllPatients();
    if (patients.length === 0) {
      console.log('⚠️ تخطي الاختبار: لا يوجد مرضى');
      return;
    }

    // منح إنجاز
    const achievement = this.system.awardAchievement(patients[0].id, 'test_achievement', {
      title: 'إنجاز تجريبي',
      titleEn: 'Test Achievement',
      description: 'وصف الإنجاز',
      icon: '🏆',
      points: 50
    });

    this.assertNotNull(achievement, 'يجب إنشاء الإنجاز بنجاح');
    this.assertEqual(achievement.points, 50, 'يجب حفظ النقاط بشكل صحيح');

    // الحصول على إنجازات المريض
    const achievements = this.system.getPatientAchievements(patients[0].id);
    this.assertTrue(achievements.length > 0, 'يجب أن يكون للمريض إنجازات');
  }

  /**
   * ═══════════════════════════════════════════════════════════════════
   * اختبارات التقييم - Assessment Tests
   * ═══════════════════════════════════════════════════════════════════
   */

  testAssessments() {
    console.log('\n🧪 اختبار 7: التقييمات');
    
    const patients = this.system.getAllPatients();
    const therapists = Array.from(this.system.therapists.values());

    if (patients.length === 0 || therapists.length === 0) {
      console.log('⚠️ تخطي الاختبار: لا توجد بيانات كافية');
      return;
    }

    const assessment = this.system.createAssessment({
      patientId: patients[0].id,
      therapistId: therapists[0].id,
      type: 'progress',
      cognitive: { score: 85 },
      motor: { score: 80 },
      scores: { overall: 82 },
      observations: 'ملاحظات التقييم',
      recommendations: ['توصية 1', 'توصية 2']
    });

    this.assertNotNull(assessment, 'يجب إنشاء التقييم بنجاح');
    this.assertEqual(assessment.status, 'completed', 'يجب أن يكون التقييم مكتملاً');

    // الحصول على تقييمات المريض
    const assessments = this.system.getPatientAssessments(patients[0].id);
    this.assertTrue(assessments.length > 0, 'يجب أن يكون للمريض تقييمات');
  }

  /**
   * ═══════════════════════════════════════════════════════════════════
   * اختبارات التمارين - Exercise Tests
   * ═══════════════════════════════════════════════════════════════════
   */

  testExercises() {
    console.log('\n🧪 اختبار 8: التمارين المخصصة');
    
    const patients = this.system.getAllPatients();
    const therapists = Array.from(this.system.therapists.values());

    if (patients.length === 0 || therapists.length === 0) {
      console.log('⚠️ تخطي الاختبار: لا توجد بيانات كافية');
      return;
    }

    const exercise = this.system.createExercise({
      patientId: patients[0].id,
      therapistId: therapists[0].id,
      title: 'تمرين تجريبي',
      description: 'وصف التمرين',
      category: 'motor',
      difficulty: 'beginner',
      duration: 10,
      frequency: 'daily',
      instructions: ['خطوة 1', 'خطوة 2'],
      targetAreas: ['الذراعين', 'الساقين']
    });

    this.assertNotNull(exercise, 'يجب إنشاء التمرين بنجاح');
    this.assertEqual(exercise.status, 'active', 'يجب أن يكون التمرين نشطاً');

    // الحصول على تمارين المريض
    const exercises = this.system.getPatientExercises(patients[0].id);
    this.assertTrue(exercises.length > 0, 'يجب أن يكون للمريض تمارين');
  }

  /**
   * ═══════════════════════════════════════════════════════════════════
   * اختبارات التقارير - Report Tests
   * ═══════════════════════════════════════════════════════════════════
   */

  testReports() {
    console.log('\n🧪 اختبار 9: التقارير');
    
    const patients = this.system.getAllPatients();
    if (patients.length === 0) {
      console.log('⚠️ تخطي الاختبار: لا يوجد مرضى');
      return;
    }

    const report = this.system.generateReport(patients[0].id);
    this.assertNotNull(report, 'يجب إنشاء التقرير بنجاح');
    this.assertNotNull(report.summary, 'يجب أن يحتوي التقرير على ملخص');
    this.assertNotNull(report.performance, 'يجب أن يحتوي التقرير على أداء');
  }

  /**
   * ═══════════════════════════════════════════════════════════════════
   * اختبارات لوحة المعلومات - Dashboard Tests
   * ═══════════════════════════════════════════════════════════════════
   */

  testDashboard() {
    console.log('\n🧪 اختبار 10: لوحة المعلومات');
    
    const patients = this.system.getAllPatients();
    if (patients.length === 0) {
      console.log('⚠️ تخطي الاختبار: لا يوجد مرضى');
      return;
    }

    const dashboard = this.system.getPatientDashboard(patients[0].id);
    this.assertNotNull(dashboard, 'يجب الحصول على لوحة المعلومات');
    this.assertNotNull(dashboard.patient, 'يجب أن تحتوي لوحة المعلومات على بيانات المريض');
    this.assertNotNull(dashboard.statistics, 'يجب أن تحتوي على إحصائيات');
  }

  /**
   * ═══════════════════════════════════════════════════════════════════
   * اختبارات إحصائيات النظام - System Stats Tests
   * ═══════════════════════════════════════════════════════════════════
   */

  testSystemStats() {
    console.log('\n🧪 اختبار 11: إحصائيات النظام');
    
    const stats = this.system.getSystemStats();
    this.assertNotNull(stats, 'يجب الحصول على إحصائيات النظام');
    this.assertNotNull(stats.patients, 'يجب أن تحتوي على إحصائيات المرضى');
    this.assertNotNull(stats.therapists, 'يجب أن تحتوي على إحصائيات المعالجين');
    this.assertNotNull(stats.games, 'يجب أن تحتوي على إحصائيات الألعاب');
    this.assertNotNull(stats.sessions, 'يجب أن تحتوي على إحصائيات الجلسات');
  }

  /**
   * ═══════════════════════════════════════════════════════════════════
   * اختبارات البحث والفلترة - Search & Filter Tests
   * ═══════════════════════════════════════════════════════════════════
   */

  testSearchAndFilter() {
    console.log('\n🧪 اختبار 12: البحث والفلترة');
    
    // البحث عن الألعاب
    const cognitiveGames = this.system.searchGames({ category: 'cognitive' });
    this.assertNotNull(cognitiveGames, 'يجب الحصول على نتائج بحث');

    // فلترة المرضى
    const activePatients = this.system.getAllPatients({ status: 'active' });
    this.assertNotNull(activePatients, 'يجب الحصول على مرضى نشطين');

    // فلترة الجلسات
    const patients = this.system.getAllPatients();
    if (patients.length > 0) {
      const sessions = this.system.getPatientSessions(patients[0].id, { status: 'completed' });
      this.assertNotNull(sessions, 'يجب الحصول على الجلسات المكتملة');
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════
   * تشغيل جميع الاختبارات - Run All Tests
   * ═══════════════════════════════════════════════════════════════════
   */

  runAllTests() {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('   بدء تشغيل الاختبارات - Starting Test Suite');
    console.log('   نظام الألعاب التفاعلية لتأهيل ذوي الإعاقة');
    console.log('═══════════════════════════════════════════════════════════\n');

    const startTime = Date.now();

    // تشغيل جميع الاختبارات
    this.testPatientManagement();
    this.testTherapistManagement();
    this.testGamesManagement();
    this.testSessionManagement();
    this.testProgressTracking();
    this.testAchievements();
    this.testAssessments();
    this.testExercises();
    this.testReports();
    this.testDashboard();
    this.testSystemStats();
    this.testSearchAndFilter();

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    // طباعة النتائج
    this.printResults(duration);
  }

  /**
   * طباعة النتائج - Print Results
   */
  printResults(duration) {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('   نتائج الاختبارات - Test Results');
    console.log('═══════════════════════════════════════════════════════════\n');

    // طباعة كل نتيجة
    this.testResults.forEach((result, index) => {
      const icon = result.status === 'PASS' ? '✅' : '❌';
      console.log(`${icon} ${index + 1}. ${result.message}`);
      if (result.status === 'FAIL') {
        console.log(`   Expected: ${result.expected}`);
        console.log(`   Actual: ${result.actual}`);
        if (result.error) console.log(`   Error: ${result.error}`);
      }
    });

    // الملخص
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('   الملخص - Summary');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log(`إجمالي الاختبارات:    ${this.totalTests}`);
    console.log(`✅ نجح:               ${this.passedTests}`);
    console.log(`❌ فشل:               ${this.failedTests}`);
    console.log(`⏱️  المدة:             ${duration} ثانية`);
    console.log(`📊 معدل النجاح:       ${((this.passedTests / this.totalTests) * 100).toFixed(1)}%`);
    
    if (this.failedTests === 0) {
      console.log('\n🎉 جميع الاختبارات نجحت! النظام جاهز للاستخدام');
    } else {
      console.log('\n⚠️ بعض الاختبارات فشلت. يرجى مراجعة الأخطاء أعلاه');
    }
    
    console.log('\n═══════════════════════════════════════════════════════════\n');
  }
}

/**
 * تشغيل الاختبارات - Execute Tests
 */
if (require.main === module) {
  const tester = new RehabSystemTest();
  tester.runAllTests();
}

module.exports = RehabSystemTest;
