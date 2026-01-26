/**
 * ====================================================================
 * اختبارات شاملة لنظام الموارد البشرية
 * Comprehensive Tests for HR Management System
 * ====================================================================
 * 
 * مجموعة اختبارات شاملة لجميع وظائف نظام الموارد البشرية
 * 
 * @version 1.0.0
 * @date 2026-01-22
 */

const AdvancedHRSystem = require('../lib/advanced_hr_system');

class HRSystemTest {
  constructor() {
    this.hrSystem = new AdvancedHRSystem();
    this.passedTests = 0;
    this.failedTests = 0;
    this.totalTests = 0;
    this.testResults = [];
  }

  // دوال مساعدة للاختبار
  assertEqual(actual, expected, message) {
    this.totalTests++;
    if (actual === expected) {
      this.passedTests++;
      this.testResults.push({ status: 'PASS', message });
      console.log(`✅ PASS: ${message}`);
    } else {
      this.failedTests++;
      this.testResults.push({ 
        status: 'FAIL', 
        message, 
        expected, 
        actual 
      });
      console.log(`❌ FAIL: ${message}`);
      console.log(`   Expected: ${expected}, Got: ${actual}`);
    }
  }

  assertNotNull(value, message) {
    this.totalTests++;
    if (value !== null && value !== undefined) {
      this.passedTests++;
      this.testResults.push({ status: 'PASS', message });
      console.log(`✅ PASS: ${message}`);
    } else {
      this.failedTests++;
      this.testResults.push({ status: 'FAIL', message, actual: value });
      console.log(`❌ FAIL: ${message} - Value is null or undefined`);
    }
  }

  assertTrue(condition, message) {
    this.totalTests++;
    if (condition) {
      this.passedTests++;
      this.testResults.push({ status: 'PASS', message });
      console.log(`✅ PASS: ${message}`);
    } else {
      this.failedTests++;
      this.testResults.push({ status: 'FAIL', message });
      console.log(`❌ FAIL: ${message}`);
    }
  }

  assertGreaterThan(actual, minimum, message) {
    this.totalTests++;
    if (actual > minimum) {
      this.passedTests++;
      this.testResults.push({ status: 'PASS', message });
      console.log(`✅ PASS: ${message}`);
    } else {
      this.failedTests++;
      this.testResults.push({ 
        status: 'FAIL', 
        message, 
        minimum, 
        actual 
      });
      console.log(`❌ FAIL: ${message} - Expected > ${minimum}, Got: ${actual}`);
    }
  }

  // =========================================================================
  // الاختبار 1: إدارة الموظفين
  // =========================================================================
  testEmployeeManagement() {
    console.log('\n📋 Test 1: Employee Management');
    console.log('================================');

    // إضافة موظف
    const employeeData = {
      firstName: 'Test',
      lastName: 'Employee',
      fullNameArabic: 'موظف اختبار',
      fullNameEnglish: 'Test Employee',
      email: 'test.employee@company.com',
      phone: '+966501234567',
      dateOfBirth: '1990-01-01',
      gender: 'male',
      nationality: 'Saudi',
      nationalId: '1234567890',
      department: 'DEPT0001',
      position: 'Test Position',
      level: 'junior',
      employmentType: 'full-time',
      hireDate: '2026-01-22',
      baseSalary: 10000,
      currency: 'SAR',
      annualLeaveDays: 30,
      sickLeaveDays: 15,
    };

    const addResult = this.hrSystem.addEmployee(employeeData);
    this.assertTrue(addResult.success, 'Should add employee successfully');
    this.assertNotNull(addResult.employeeId, 'Should return employee ID');

    // الحصول على الموظف
    const getResult = this.hrSystem.getEmployee(addResult.employeeId);
    this.assertTrue(getResult.success, 'Should retrieve employee');
    this.assertEqual(getResult.employee.personalInfo.firstName, 'Test', 'Should have correct first name');

    // تحديث الموظف
    const updateResult = this.hrSystem.updateEmployee(addResult.employeeId, {
      personalInfo: { firstName: 'Updated' }
    });
    this.assertTrue(updateResult.success, 'Should update employee');
    this.assertEqual(updateResult.employee.personalInfo.firstName, 'Updated', 'Should have updated name');

    // جلب جميع الموظفين
    const allEmployees = this.hrSystem.getAllEmployees();
    this.assertTrue(allEmployees.success, 'Should get all employees');
    this.assertGreaterThan(allEmployees.count, 0, 'Should have at least one employee');

    // تعطيل الموظف
    const deactivateResult = this.hrSystem.deactivateEmployee(addResult.employeeId, 'Test termination');
    this.assertTrue(deactivateResult.success, 'Should deactivate employee');
  }

  // =========================================================================
  // الاختبار 2: إدارة الأقسام
  // =========================================================================
  testDepartmentManagement() {
    console.log('\n🏢 Test 2: Department Management');
    console.log('================================');

    // إضافة قسم
    const deptData = {
      nameArabic: 'قسم اختبار',
      nameEnglish: 'Test Department',
      code: 'TEST',
      description: 'Test department description',
      location: 'Test Location',
      budget: 100000,
    };

    const addResult = this.hrSystem.addDepartment(deptData);
    this.assertTrue(addResult.success, 'Should add department successfully');
    this.assertNotNull(addResult.departmentId, 'Should return department ID');

    // الحصول على القسم
    const getResult = this.hrSystem.getDepartment(addResult.departmentId);
    this.assertTrue(getResult.success, 'Should retrieve department');
    this.assertEqual(getResult.department.code, 'TEST', 'Should have correct code');

    // جلب جميع الأقسام
    const allDepts = this.hrSystem.getAllDepartments();
    this.assertTrue(allDepts.success, 'Should get all departments');
    this.assertGreaterThan(allDepts.count, 0, 'Should have at least one department');
  }

  // =========================================================================
  // الاختبار 3: إدارة الحضور
  // =========================================================================
  testAttendanceManagement() {
    console.log('\n⏰ Test 3: Attendance Management');
    console.log('================================');

    // الحصول على أول موظف من البيانات الأولية
    const employees = this.hrSystem.getAllEmployees();
    const employeeId = employees.employees[0].employeeId;

    // تسجيل حضور
    const attendanceData = {
      employeeId: employeeId,
      date: new Date(),
      checkIn: new Date(new Date().setHours(8, 0, 0)),
      status: 'present',
      location: 'office',
    };

    const recordResult = this.hrSystem.recordAttendance(attendanceData);
    this.assertTrue(recordResult.success, 'Should record attendance');
    this.assertNotNull(recordResult.attendanceId, 'Should return attendance ID');

    // تحديث الحضور (تسجيل خروج)
    const checkOut = new Date(new Date().setHours(17, 0, 0));
    const updateResult = this.hrSystem.updateAttendance(recordResult.attendanceId, checkOut);
    this.assertTrue(updateResult.success, 'Should update attendance');
    this.assertEqual(updateResult.attendance.workHours, 9, 'Should calculate 9 work hours');

    // جلب سجل الحضور للموظف
    const getResult = this.hrSystem.getEmployeeAttendance(employeeId);
    this.assertTrue(getResult.success, 'Should get employee attendance');
    this.assertGreaterThan(getResult.attendance.length, 0, 'Should have attendance records');
  }

  // =========================================================================
  // الاختبار 4: إدارة الإجازات
  // =========================================================================
  testLeaveManagement() {
    console.log('\n🏖️ Test 4: Leave Management');
    console.log('================================');

    const employees = this.hrSystem.getAllEmployees();
    const employeeId = employees.employees[0].employeeId;

    // تقديم طلب إجازة
    const leaveData = {
      employeeId: employeeId,
      leaveType: 'annual',
      startDate: new Date('2026-03-01'),
      endDate: new Date('2026-03-05'),
      reason: 'Vacation',
    };

    const requestResult = this.hrSystem.requestLeave(leaveData);
    this.assertTrue(requestResult.success, 'Should request leave');
    this.assertNotNull(requestResult.leaveId, 'Should return leave ID');
    this.assertEqual(requestResult.leave.numberOfDays, 5, 'Should calculate 5 days');

    // الموافقة على الإجازة
    const approveResult = this.hrSystem.approveLeave(requestResult.leaveId, 'MANAGER001');
    this.assertTrue(approveResult.success, 'Should approve leave');
    this.assertEqual(approveResult.leave.status, 'approved', 'Leave should be approved');

    // جلب إجازات الموظف
    const getResult = this.hrSystem.getEmployeeLeaves(employeeId);
    this.assertTrue(getResult.success, 'Should get employee leaves');
    this.assertGreaterThan(getResult.count, 0, 'Should have leave records');

    // جلب أيام الإجازة المتبقية
    const remainingResult = this.hrSystem.getRemainingLeaveDays(employeeId);
    this.assertTrue(remainingResult.success, 'Should get remaining leave days');
    this.assertNotNull(remainingResult.remainingDays, 'Should have remaining days info');
  }

  // =========================================================================
  // الاختبار 5: إدارة الأداء
  // =========================================================================
  testPerformanceManagement() {
    console.log('\n📊 Test 5: Performance Management');
    console.log('================================');

    const employees = this.hrSystem.getAllEmployees();
    const employeeId = employees.employees[0].employeeId;

    // إضافة تقييم أداء
    const reviewData = {
      employeeId: employeeId,
      reviewPeriod: 'quarterly',
      reviewDate: new Date(),
      reviewerId: 'REVIEWER001',
      technicalRating: 4.5,
      communicationRating: 4.0,
      teamworkRating: 4.5,
      leadershipRating: 4.0,
      initiativeRating: 4.5,
      productivityRating: 4.5,
      qualityRating: 4.5,
      strengths: ['Technical skills', 'Team collaboration'],
      achievements: ['Completed project successfully'],
      comments: 'Excellent performance',
    };

    const addResult = this.hrSystem.addPerformanceReview(reviewData);
    this.assertTrue(addResult.success, 'Should add performance review');
    this.assertNotNull(addResult.reviewId, 'Should return review ID');
    this.assertGreaterThan(addResult.review.ratings.overall, 0, 'Should calculate overall rating');

    // جلب تقييمات الموظف
    const getResult = this.hrSystem.getEmployeePerformanceReviews(employeeId);
    this.assertTrue(getResult.success, 'Should get employee reviews');
    this.assertGreaterThan(getResult.count, 0, 'Should have review records');

    // إضافة هدف للموظف
    const goalData = {
      employeeId: employeeId,
      title: 'Complete Project',
      description: 'Finish Q1 project',
      category: 'performance',
      targetDate: new Date('2026-03-31'),
    };

    const goalResult = this.hrSystem.addEmployeeGoal(goalData);
    this.assertTrue(goalResult.success, 'Should add employee goal');
    this.assertNotNull(goalResult.goal, 'Should return goal object');

    // تقرير الأداء الشامل
    const reportResult = this.hrSystem.generateOrganizationPerformanceReport();
    this.assertTrue(reportResult.success, 'Should generate performance report');
    this.assertNotNull(reportResult.report, 'Should return report data');
  }

  // =========================================================================
  // الاختبار 6: إدارة التدريب
  // =========================================================================
  testTrainingManagement() {
    console.log('\n🎓 Test 6: Training Management');
    console.log('================================');

    // إضافة تدريب
    const trainingData = {
      title: 'Test Training',
      description: 'Training description',
      category: 'technical',
      trainer: 'Test Trainer',
      startDate: new Date('2026-02-01'),
      endDate: new Date('2026-02-05'),
      duration: 40,
      location: 'onsite',
      maxParticipants: 10,
      cost: 5000,
    };

    const addResult = this.hrSystem.addTraining(trainingData);
    this.assertTrue(addResult.success, 'Should add training');
    this.assertNotNull(addResult.trainingId, 'Should return training ID');

    // تسجيل موظف في التدريب
    const employees = this.hrSystem.getAllEmployees();
    const employeeId = employees.employees[0].employeeId;

    const enrollResult = this.hrSystem.enrollEmployeeInTraining(addResult.trainingId, employeeId);
    this.assertTrue(enrollResult.success, 'Should enroll employee in training');

    // إكمال التدريب
    const completeResult = this.hrSystem.completeEmployeeTraining(
      addResult.trainingId, 
      employeeId, 
      'A', 
      'Excellent participation'
    );
    this.assertTrue(completeResult.success, 'Should complete training');

    // جلب تدريبات الموظف
    const getResult = this.hrSystem.getEmployeeTrainings(employeeId);
    this.assertTrue(getResult.success, 'Should get employee trainings');
    this.assertGreaterThan(getResult.count, 0, 'Should have training records');
  }

  // =========================================================================
  // الاختبار 7: إدارة التوظيف
  // =========================================================================
  testRecruitmentManagement() {
    console.log('\n💼 Test 7: Recruitment Management');
    console.log('================================');

    // إضافة طلب توظيف
    const requestData = {
      position: 'Test Position',
      department: 'DEPT0001',
      numberOfPositions: 1,
      employmentType: 'full-time',
      level: 'junior',
      requiredQualifications: ['Bachelor degree'],
      requiredSkills: ['Skill 1', 'Skill 2'],
      requiredExperience: 2,
      salaryMin: 8000,
      salaryMax: 12000,
      jobDescription: 'Test job description',
      deadline: new Date('2026-03-01'),
      requestedBy: 'MANAGER001',
    };

    const addResult = this.hrSystem.addRecruitmentRequest(requestData);
    this.assertTrue(addResult.success, 'Should add recruitment request');
    this.assertNotNull(addResult.requestId, 'Should return request ID');

    // إضافة مرشح
    const candidateData = {
      name: 'Test Candidate',
      email: 'candidate@test.com',
      phone: '+966501234567',
      resumeUrl: 'http://example.com/resume.pdf',
    };

    const candidateResult = this.hrSystem.addCandidate(addResult.requestId, candidateData);
    this.assertTrue(candidateResult.success, 'Should add candidate');
    this.assertNotNull(candidateResult.candidateId, 'Should return candidate ID');
  }

  // =========================================================================
  // الاختبار 8: إدارة الرواتب
  // =========================================================================
  testPayrollManagement() {
    console.log('\n💰 Test 8: Payroll Management');
    console.log('================================');

    // معالجة رواتب الشهر
    const processResult = this.hrSystem.processMonthlyPayroll(1, 2026);
    this.assertTrue(processResult.success, 'Should process payroll');
    this.assertGreaterThan(processResult.count, 0, 'Should have payroll records');
    this.assertGreaterThan(processResult.totalAmount, 0, 'Should calculate total amount');

    // جلب راتب موظف محدد
    const employees = this.hrSystem.getAllEmployees();
    const employeeId = employees.employees[0].employeeId;

    const getResult = this.hrSystem.getEmployeePayroll(employeeId, 1, 2026);
    this.assertTrue(getResult.success, 'Should get employee payroll');
    this.assertNotNull(getResult.payroll, 'Should return payroll data');
  }

  // =========================================================================
  // الاختبار 9: التقارير والإحصائيات
  // =========================================================================
  testReportsAndAnalytics() {
    console.log('\n📈 Test 9: Reports & Analytics');
    console.log('================================');

    // إحصائيات النظام
    const statsResult = this.hrSystem.getSystemStats();
    this.assertTrue(statsResult.success, 'Should get system stats');
    this.assertNotNull(statsResult.stats, 'Should return stats data');
    this.assertGreaterThan(statsResult.stats.employees.total, 0, 'Should have employees');

    // تقرير موظف شامل
    const employees = this.hrSystem.getAllEmployees();
    const employeeId = employees.employees[0].employeeId;

    const reportResult = this.hrSystem.generateEmployeeReport(employeeId);
    this.assertTrue(reportResult.success, 'Should generate employee report');
    this.assertNotNull(reportResult.report, 'Should return report data');
    this.assertNotNull(reportResult.report.employee, 'Should have employee data');
    this.assertNotNull(reportResult.report.compensation, 'Should have compensation data');
  }

  // =========================================================================
  // الاختبار 10: الفلترة والبحث
  // =========================================================================
  testFilteringAndSearch() {
    console.log('\n🔍 Test 10: Filtering & Search');
    console.log('================================');

    // البحث بالقسم
    const deptFilter = this.hrSystem.getAllEmployees({ department: 'DEPT0001' });
    this.assertTrue(deptFilter.success, 'Should filter by department');

    // البحث بالحالة
    const statusFilter = this.hrSystem.getAllEmployees({ employmentStatus: 'active' });
    this.assertTrue(statusFilter.success, 'Should filter by status');

    // البحث بالنص
    const searchResult = this.hrSystem.getAllEmployees({ search: 'ahmed' });
    this.assertTrue(searchResult.success, 'Should search employees');
  }

  // =========================================================================
  // تشغيل جميع الاختبارات
  // =========================================================================
  runAllTests() {
    console.log('\n');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('         اختبارات نظام الموارد البشرية المتقدم         ');
    console.log('      Advanced HR Management System - Test Suite        ');
    console.log('═══════════════════════════════════════════════════════════');
    
    const startTime = Date.now();

    try {
      this.testEmployeeManagement();
      this.testDepartmentManagement();
      this.testAttendanceManagement();
      this.testLeaveManagement();
      this.testPerformanceManagement();
      this.testTrainingManagement();
      this.testRecruitmentManagement();
      this.testPayrollManagement();
      this.testReportsAndAnalytics();
      this.testFilteringAndSearch();
    } catch (error) {
      console.error('\n❌ Test Suite Error:', error.message);
      this.failedTests++;
    }

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    this.printResults(duration);
  }

  // =========================================================================
  // طباعة النتائج
  // =========================================================================
  printResults(duration) {
    console.log('\n');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('                    نتائج الاختبارات                      ');
    console.log('                      Test Results                         ');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`\n📊 إجمالي الاختبارات: ${this.totalTests}`);
    console.log(`✅ نجح: ${this.passedTests}`);
    console.log(`❌ فشل: ${this.failedTests}`);
    console.log(`⏱️  المدة: ${duration} ثانية`);
    
    const successRate = ((this.passedTests / this.totalTests) * 100).toFixed(2);
    console.log(`📈 نسبة النجاح: ${successRate}%`);

    if (this.failedTests > 0) {
      console.log('\n❌ الاختبارات الفاشلة:');
      this.testResults
        .filter(r => r.status === 'FAIL')
        .forEach((result, index) => {
          console.log(`\n${index + 1}. ${result.message}`);
          if (result.expected !== undefined) {
            console.log(`   Expected: ${result.expected}`);
            console.log(`   Got: ${result.actual}`);
          }
        });
    }

    console.log('\n═══════════════════════════════════════════════════════════\n');

    if (this.failedTests === 0) {
      console.log('🎉 تهانينا! جميع الاختبارات نجحت! 🎉');
      console.log('🎉 Congratulations! All tests passed! 🎉\n');
    } else {
      console.log('⚠️  بعض الاختبارات فشلت. يرجى مراجعة الأخطاء أعلاه.');
      console.log('⚠️  Some tests failed. Please review the errors above.\n');
    }
  }
}

// تشغيل الاختبارات
if (require.main === module) {
  const testSuite = new HRSystemTest();
  testSuite.runAllTests();
}

module.exports = HRSystemTest;
