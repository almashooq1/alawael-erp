/**
 * E-Learning System Test Suite
 * اختبارات شاملة لنظام التعلم عن بعد
 */

const ELearningSystem = require('../lib/elearning_system');

class ELearningTest {
  constructor() {
    this.system = new ELearningSystem();
    this.testsRun = 0;
    this.testsPassed = 0;
    this.testsFailed = 0;
  }

  /**
   * Assert equality
   */
  assertEqual(actual, expected, message) {
    if (actual === expected) {
      this.testsPassed++;
      console.log(`✓ ${message}`);
      return true;
    } else {
      this.testsFailed++;
      console.log(`✗ ${message}`);
      console.log(`  Expected: ${expected}, Got: ${actual}`);
      return false;
    }
  }

  /**
   * Assert not null
   */
  assertNotNull(value, message) {
    if (value !== null && value !== undefined) {
      this.testsPassed++;
      console.log(`✓ ${message}`);
      return true;
    } else {
      this.testsFailed++;
      console.log(`✗ ${message}`);
      return false;
    }
  }

  /**
   * Assert array length
   */
  assertLength(arr, length, message) {
    if (arr && arr.length === length) {
      this.testsPassed++;
      console.log(`✓ ${message}`);
      return true;
    } else {
      this.testsFailed++;
      console.log(`✗ ${message}`);
      console.log(`  Expected length: ${length}, Got: ${arr?.length || 0}`);
      return false;
    }
  }

  /**
   * Test 1: Instructor Management
   */
  testInstructorManagement() {
    console.log('\n=== Test 1: Instructor Management ===');

    const instructor = this.system.instructors.get('INST001');
    this.assertNotNull(instructor, 'Instructor exists');
    this.assertEqual(instructor.name, 'د. أحمد محمد', 'Instructor name is correct');
    this.assertEqual(
      instructor.specialization,
      'Computer Science',
      'Instructor specialization is correct'
    );
    this.assertLength(this.system.instructors, 2, 'System has 2 instructors');
  }

  /**
   * Test 2: Student Management
   */
  testStudentManagement() {
    console.log('\n=== Test 2: Student Management ===');

    const student = this.system.students.get('STU001');
    this.assertNotNull(student, 'Student exists');
    this.assertEqual(student.name, 'محمد حسين', 'Student name is correct');
    this.assertEqual(student.status, 'active', 'Student is active');
    this.assertLength(this.system.students, 3, 'System has 3 students');
  }

  /**
   * Test 3: Course Creation
   */
  testCourseCreation() {
    console.log('\n=== Test 3: Course Creation ===');

    const course = this.system.courses.get('COURSE001');
    this.assertNotNull(course, 'Course exists');
    this.assertEqual(course.title, 'أساسيات البرمجة بلغة Python', 'Course title is correct');
    this.assertEqual(course.level, 'beginner', 'Course level is correct');
    this.assertEqual(course.status, 'active', 'Course is active');
    this.assertLength(this.system.courses, 2, 'System has 2 courses');
  }

  /**
   * Test 4: Student Enrollment
   */
  testStudentEnrollment() {
    console.log('\n=== Test 4: Student Enrollment ===');

    const enrollments = Array.from(this.system.enrollments.values()).filter(
      e => e.studentId === 'STU001'
    );

    this.assertLength(enrollments, 1, 'Student is enrolled in 1 course');
    this.assertEqual(enrollments[0].courseId, 'COURSE001', 'Enrollment course is correct');
    this.assertEqual(enrollments[0].status, 'active', 'Enrollment is active');
  }

  /**
   * Test 5: Course Details
   */
  testCourseDetails() {
    console.log('\n=== Test 5: Course Details ===');

    const course = this.system.getCourseDetails('COURSE001');
    this.assertNotNull(course, 'Course details retrieved');
    this.assertNotNull(course.instructor, 'Instructor is included');
    this.assertLength(course.lessons, 2, 'Course has 2 lessons');
    this.assertLength(course.assignments, 1, 'Course has 1 assignment');
    this.assertLength(course.assessments, 1, 'Course has 1 assessment');
  }

  /**
   * Test 6: Lesson Management
   */
  testLessonManagement() {
    console.log('\n=== Test 6: Lesson Management ===');

    const lesson = this.system.lessons.get('LESSON001');
    this.assertNotNull(lesson, 'Lesson exists');
    this.assertEqual(lesson.type, 'video', 'Lesson type is correct');
    this.assertEqual(lesson.status, 'published', 'Lesson is published');
    this.assertEqual(lesson.courseId, 'COURSE001', 'Lesson is in correct course');
  }

  /**
   * Test 7: Assignment Submission
   */
  testAssignmentSubmission() {
    console.log('\n=== Test 7: Assignment Submission ===');

    const submission = this.system.submitAssignment(
      'STU001',
      'ASSIGN001',
      'Here is my calculator program code...',
      ['calculator.py']
    );

    this.assertNotNull(submission, 'Submission created');
    this.assertEqual(submission.status, 'submitted', 'Submission status is correct');
    this.assertEqual(submission.studentId, 'STU001', 'Submission student is correct');
  }

  /**
   * Test 8: Assignment Grading
   */
  testAssignmentGrading() {
    console.log('\n=== Test 8: Assignment Grading ===');

    // Create and grade submission
    const submission = this.system.submitAssignment('STU002', 'ASSIGN001', 'My code here');
    const result = this.system.gradeSubmission(submission.id, 85, 'Good work!', 100);

    this.assertEqual(result.success, true, 'Grading successful');
    this.assertEqual(result.submission.status, 'graded', 'Submission is graded');
    this.assertEqual(result.submission.grade, 85, 'Grade is correct');
  }

  /**
   * Test 9: Assessment Submission
   */
  testAssessmentSubmission() {
    console.log('\n=== Test 9: Assessment Submission ===');

    const answers = [0, 1, 2, 3, 0, 1, 2, 3, 0, 1];
    const result = this.system.submitAssessment('STU001', 'QUIZ001', answers);

    this.assertEqual(result.success, true, 'Assessment submission successful');
    this.assertNotNull(result.submission, 'Submission created');
    this.assertEqual(result.submission.totalQuestions, 10, 'Total questions correct');
  }

  /**
   * Test 10: Student Progress
   */
  testStudentProgress() {
    console.log('\n=== Test 10: Student Progress ===');

    const progress = this.system.getStudentProgress('STU001', 'COURSE001');
    this.assertNotNull(progress, 'Progress retrieved');
    this.assertEqual(progress.studentId, 'STU001', 'Progress student is correct');
    this.assertEqual(progress.courseId, 'COURSE001', 'Progress course is correct');
  }

  /**
   * Test 11: Course Leaderboard
   */
  testCourseLeaderboard() {
    console.log('\n=== Test 11: Course Leaderboard ===');

    const leaderboard = this.system.getCourseLeaderboard('COURSE001');
    this.assertNotNull(leaderboard, 'Leaderboard retrieved');
    this.assertLength(leaderboard, 2, 'Leaderboard has correct entries');
  }

  /**
   * Test 12: Search Courses
   */
  testSearchCourses() {
    console.log('\n=== Test 12: Search Courses ===');

    const results = this.system.searchCourses('Python');
    this.assertLength(results, 1, 'Search returns correct results');
    this.assertEqual(results[0].title, 'أساسيات البرمجة بلغة Python', 'Search result is correct');
  }

  /**
   * Test 13: Get All Courses with Filters
   */
  testGetCoursesWithFilters() {
    console.log('\n=== Test 13: Get Courses with Filters ===');

    const courses = this.system.getAllCourses({ level: 'beginner' });
    this.assertLength(courses, 1, 'Filter returns correct courses');

    const advanced = this.system.getAllCourses({ level: 'advanced' });
    this.assertLength(advanced, 1, 'Advanced filter works');
  }

  /**
   * Test 14: Messages and Communications
   */
  testMessaging() {
    console.log('\n=== Test 14: Messages and Communications ===');

    const message = this.system.sendMessage(
      'INST001',
      'STU001',
      'Assignment Feedback',
      'Great work on your assignment!'
    );

    this.assertNotNull(message, 'Message created');
    this.assertEqual(message.read, false, 'Message is unread');
  }

  /**
   * Test 15: Announcements
   */
  testAnnouncements() {
    console.log('\n=== Test 15: Announcements ===');

    const announcement = this.system.addAnnouncement(
      'COURSE001',
      'Important Update',
      'The exam date has been changed to next week'
    );

    this.assertNotNull(announcement, 'Announcement created');
    const course = this.system.courses.get('COURSE001');
    this.assertLength(course.announcements, 1, 'Announcement added to course');
  }

  /**
   * Test 16: Certificate Generation
   */
  testCertificateGeneration() {
    console.log('\n=== Test 16: Certificate Generation ===');

    const certificate = this.system.generateCertificate('STU001', 'COURSE001');
    this.assertNotNull(certificate, 'Certificate generated');
    this.assertNotNull(certificate.certificateUrl, 'Certificate URL provided');
    this.assertNotNull(certificate.verificationCode, 'Verification code provided');
  }

  /**
   * Test 17: Instructor Statistics
   */
  testInstructorStatistics() {
    console.log('\n=== Test 17: Instructor Statistics ===');

    const stats = this.system.getInstructorStats('INST001');
    this.assertNotNull(stats, 'Statistics retrieved');
    this.assertEqual(stats.coursesCount, 1, 'Course count is correct');
  }

  /**
   * Test 18: System Statistics
   */
  testSystemStatistics() {
    console.log('\n=== Test 18: System Statistics ===');

    const stats = this.system.getSystemStats();
    this.assertNotNull(stats, 'System stats retrieved');
    this.assertEqual(stats.totalCourses, 2, 'Total courses count');
    this.assertEqual(stats.totalStudents, 3, 'Total students count');
    this.assertEqual(stats.totalInstructors, 2, 'Total instructors count');
  }

  /**
   * Test 19: Dashboard Data
   */
  testDashboardData() {
    console.log('\n=== Test 19: Dashboard Data ===');

    const studentDash = this.system.getDashboardData('STU001', 'student');
    this.assertNotNull(studentDash, 'Student dashboard retrieved');
    this.assertLength(studentDash.enrolledCourses, 1, 'Student enrolled courses');

    const instructorDash = this.system.getDashboardData('INST001', 'instructor');
    this.assertNotNull(instructorDash, 'Instructor dashboard retrieved');
    this.assertEqual(instructorDash.coursesCount, 1, 'Instructor courses count');
  }

  /**
   * Run all tests
   */
  runAllTests() {
    console.log('\n');
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║     E-Learning System - Comprehensive Test Suite       ║');
    console.log('║     نظام التعلم عن بعد - مجموعة اختبارات شاملة        ║');
    console.log('╚════════════════════════════════════════════════════════╝');

    this.testInstructorManagement();
    this.testStudentManagement();
    this.testCourseCreation();
    this.testStudentEnrollment();
    this.testCourseDetails();
    this.testLessonManagement();
    this.testAssignmentSubmission();
    this.testAssignmentGrading();
    this.testAssessmentSubmission();
    this.testStudentProgress();
    this.testCourseLeaderboard();
    this.testSearchCourses();
    this.testGetCoursesWithFilters();
    this.testMessaging();
    this.testAnnouncements();
    this.testCertificateGeneration();
    this.testInstructorStatistics();
    this.testSystemStatistics();
    this.testDashboardData();

    this.printResults();
  }

  /**
   * Print test results
   */
  printResults() {
    const total = this.testsPassed + this.testsFailed;
    const percentage = Math.round((this.testsPassed / total) * 100);

    console.log('\n');
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║                    TEST RESULTS                        ║');
    console.log('╚════════════════════════════════════════════════════════╝');
    console.log('\n');
    console.log(`Total Tests: ${total}`);
    console.log(`✓ Passed: ${this.testsPassed}`);
    console.log(`✗ Failed: ${this.testsFailed}`);
    console.log(`Success Rate: ${percentage}%`);
    console.log('\n');

    if (this.testsFailed === 0) {
      console.log('🎉 All tests passed! System is operational.');
    } else {
      console.log(`⚠️  ${this.testsFailed} test(s) failed. Please review.`);
    }

    console.log('\n');
  }
}

// Run tests if executed directly
if (require.main === module) {
  const tester = new ELearningTest();
  tester.runAllTests();
}

module.exports = ELearningTest;
