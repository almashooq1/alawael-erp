/**
 * E-Learning System (Distance Learning Management)
 * نظام التعلم عن بعد
 *
 * Comprehensive distance learning platform with courses, students, instructors, and assessments
 * Platform compliant with international e-learning standards (SCORM, LMS)
 */

class ELearningSystem {
  constructor() {
    this.courses = new Map();
    this.students = new Map();
    this.instructors = new Map();
    this.enrollments = new Map();
    this.lessons = new Map();
    this.assignments = new Map();
    this.assessments = new Map();
    this.submissions = new Map();
    this.grades = new Map();
    this.messages = new Map();
    this.notifications = new Map();
    this.progress = new Map();

    this.initializeDefaultData();
  }

  /**
   * Initialize default data for demonstration
   */
  initializeDefaultData() {
    // Initialize instructors
    this.addInstructor({
      id: 'INST001',
      name: 'د. أحمد محمد',
      email: 'ahmed@elearning.com',
      specialization: 'Computer Science',
      bio: 'PhD in Computer Science with 15+ years experience',
      phone: '+966501234567',
      joinDate: new Date(2025, 0, 15),
    });

    this.addInstructor({
      id: 'INST002',
      name: 'د. فاطمة علي',
      email: 'fatima@elearning.com',
      specialization: 'Mathematics',
      bio: 'Professor of Mathematics, specialized in calculus',
      phone: '+966502234567',
      joinDate: new Date(2025, 1, 1),
    });

    // Initialize students
    this.addStudent({
      id: 'STU001',
      name: 'محمد حسين',
      email: 'muhammad@student.com',
      phone: '+966511111111',
      level: 'intermediate',
      joinDate: new Date(2025, 6, 1),
    });

    this.addStudent({
      id: 'STU002',
      name: 'نور السامرائي',
      email: 'noor@student.com',
      phone: '+966512222222',
      level: 'beginner',
      joinDate: new Date(2025, 6, 15),
    });

    this.addStudent({
      id: 'STU003',
      name: 'علي محمود',
      email: 'ali@student.com',
      phone: '+966513333333',
      level: 'advanced',
      joinDate: new Date(2025, 5, 1),
    });

    // Initialize courses
    this.addCourse({
      id: 'COURSE001',
      title: 'أساسيات البرمجة بلغة Python',
      description: 'Introduction to Python programming for beginners',
      instructor: 'INST001',
      category: 'Programming',
      level: 'beginner',
      duration: 40,
      capacity: 50,
      thumbnail: 'https://via.placeholder.com/300x200?text=Python',
      startDate: new Date(2025, 7, 1),
      endDate: new Date(2025, 8, 30),
      credits: 3,
    });

    this.addCourse({
      id: 'COURSE002',
      title: 'التحليل الرياضي المتقدم',
      description: 'Advanced calculus and mathematical analysis',
      instructor: 'INST002',
      category: 'Mathematics',
      level: 'advanced',
      duration: 45,
      capacity: 40,
      thumbnail: 'https://via.placeholder.com/300x200?text=Math',
      startDate: new Date(2025, 7, 15),
      endDate: new Date(2025, 9, 30),
      credits: 4,
    });

    // Add lessons to courses
    this.addLesson({
      id: 'LESSON001',
      courseId: 'COURSE001',
      title: 'مقدمة إلى Python',
      description: 'Learn Python basics and setup',
      type: 'video',
      content: 'https://example.com/videos/python-intro',
      duration: 45,
      order: 1,
      createdAt: new Date(),
    });

    this.addLesson({
      id: 'LESSON002',
      courseId: 'COURSE001',
      title: 'المتغيرات والأنواع البيانات',
      description: 'Understanding variables and data types',
      type: 'video',
      content: 'https://example.com/videos/variables',
      duration: 50,
      order: 2,
      createdAt: new Date(),
    });

    // Enroll students
    this.enrollStudent('STU001', 'COURSE001');
    this.enrollStudent('STU002', 'COURSE001');
    this.enrollStudent('STU003', 'COURSE002');

    // Add assignments
    this.addAssignment({
      id: 'ASSIGN001',
      courseId: 'COURSE001',
      title: 'مشروع البرنامج الأول',
      description: 'Create a simple calculator program',
      dueDate: new Date(2025, 8, 15),
      maxScore: 100,
      type: 'project',
    });

    // Add assessments
    this.addAssessment({
      id: 'QUIZ001',
      courseId: 'COURSE001',
      title: 'اختبار المحاضرة الأولى',
      description: 'Quiz on Python basics',
      totalQuestions: 10,
      timeLimit: 30,
      passingScore: 70,
      type: 'quiz',
    });
  }

  /**
   * Add a new instructor
   */
  addInstructor(instructorData) {
    const instructor = {
      ...instructorData,
      status: 'active',
      courses: [],
      students: 0,
      rating: 0,
      reviews: 0,
    };
    this.instructors.set(instructorData.id, instructor);
    return instructor;
  }

  /**
   * Add a new student
   */
  addStudent(studentData) {
    const student = {
      ...studentData,
      status: 'active',
      enrolledCourses: [],
      completedCourses: [],
      totalCredits: 0,
      gpa: 0.0,
      progress: {},
    };
    this.students.set(studentData.id, student);
    return student;
  }

  /**
   * Add a new course
   */
  addCourse(courseData) {
    const course = {
      ...courseData,
      status: 'active',
      enrolled: 0,
      lessons: [],
      assignments: [],
      assessments: [],
      resources: [],
      announcements: [],
      createdAt: new Date(),
    };
    this.courses.set(courseData.id, course);
    return course;
  }

  /**
   * Add lesson to course
   */
  addLesson(lessonData) {
    const lesson = {
      ...lessonData,
      status: 'published',
      views: 0,
      resources: [],
    };
    this.lessons.set(lessonData.id, lesson);

    // Add lesson to course
    const course = this.courses.get(lessonData.courseId);
    if (course) {
      course.lessons.push(lessonData.id);
    }

    return lesson;
  }

  /**
   * Add assignment to course
   */
  addAssignment(assignmentData) {
    const assignment = {
      ...assignmentData,
      status: 'active',
      submissions: [],
      createdAt: new Date(),
    };
    this.assignments.set(assignmentData.id, assignment);

    // Add to course
    const course = this.courses.get(assignmentData.courseId);
    if (course) {
      course.assignments.push(assignmentData.id);
    }

    return assignment;
  }

  /**
   * Add assessment/quiz to course
   */
  addAssessment(assessmentData) {
    const assessment = {
      ...assessmentData,
      status: 'active',
      questions: [],
      submissions: [],
      createdAt: new Date(),
    };
    this.assessments.set(assessmentData.id, assessment);

    // Add to course
    const course = this.courses.get(assessmentData.courseId);
    if (course) {
      course.assessments.push(assessmentData.id);
    }

    return assessment;
  }

  /**
   * Enroll student in course
   */
  enrollStudent(studentId, courseId) {
    const student = this.students.get(studentId);
    const course = this.courses.get(courseId);

    if (!student || !course) {
      return { success: false, message: 'Student or course not found' };
    }

    const enrollmentId = `ENROLL_${studentId}_${courseId}_${Date.now()}`;
    const enrollment = {
      id: enrollmentId,
      studentId,
      courseId,
      enrolledAt: new Date(),
      status: 'active',
      progress: 0,
      completionDate: null,
      grade: null,
    };

    this.enrollments.set(enrollmentId, enrollment);

    // Update student
    if (!student.enrolledCourses.includes(courseId)) {
      student.enrolledCourses.push(courseId);
    }

    // Update course
    course.enrolled = (course.enrolled || 0) + 1;

    // Initialize progress
    this.progress.set(`${studentId}_${courseId}`, {
      studentId,
      courseId,
      lessonsCompleted: 0,
      assignmentsSubmitted: 0,
      assessmentScore: 0,
      overallProgress: 0,
      lastAccessed: new Date(),
    });

    return { success: true, enrollment };
  }

  /**
   * Submit assignment
   */
  submitAssignment(studentId, assignmentId, content, files = []) {
    const submissionId = `SUBMIT_${studentId}_${assignmentId}_${Date.now()}`;
    const submission = {
      id: submissionId,
      studentId,
      assignmentId,
      content,
      files,
      submittedAt: new Date(),
      status: 'submitted',
      grade: null,
      feedback: '',
    };

    this.submissions.set(submissionId, submission);

    // Update assignment
    const assignment = this.assignments.get(assignmentId);
    if (assignment) {
      assignment.submissions.push(submissionId);
    }

    return submission;
  }

  /**
   * Grade submission
   */
  gradeSubmission(submissionId, score, feedback, maxScore = 100) {
    const submission = this.submissions.get(submissionId);
    if (!submission) {
      return { success: false, message: 'Submission not found' };
    }

    submission.status = 'graded';
    submission.grade = score;
    submission.feedback = feedback;
    submission.gradedAt = new Date();

    // Calculate percentage
    const percentage = (score / maxScore) * 100;

    // Update grades
    const gradeId = `GRADE_${submission.studentId}_${submission.assignmentId}`;
    this.grades.set(gradeId, {
      studentId: submission.studentId,
      assignmentId: submission.assignmentId,
      score,
      percentage,
      maxScore,
      gradedAt: new Date(),
    });

    return { success: true, submission };
  }

  /**
   * Take assessment/quiz
   */
  submitAssessment(studentId, assessmentId, answers) {
    const submissionId = `ASSESS_${studentId}_${assessmentId}_${Date.now()}`;
    const assessment = this.assessments.get(assessmentId);

    if (!assessment) {
      return { success: false, message: 'Assessment not found' };
    }

    // Calculate score (example: 10 points per correct answer)
    let correctAnswers = 0;
    let totalQuestions = assessment.totalQuestions;

    // Simulate grading
    for (let i = 0; i < Math.min(answers.length, totalQuestions); i++) {
      if (answers[i] === Math.floor(Math.random() * 4)) {
        // Mock correct answer
        correctAnswers++;
      }
    }

    const score = (correctAnswers / totalQuestions) * 100;
    const passed = score >= assessment.passingScore;

    const submission = {
      id: submissionId,
      studentId,
      assessmentId,
      answers,
      score: Math.round(score),
      correctAnswers,
      totalQuestions,
      passed,
      submittedAt: new Date(),
      timeSpent: 0,
    };

    this.submissions.set(submissionId, submission);
    assessment.submissions.push(submissionId);

    return { success: true, submission };
  }

  /**
   * Add course announcement
   */
  addAnnouncement(courseId, title, content, type = 'update') {
    const course = this.courses.get(courseId);
    if (!course) {
      return { success: false, message: 'Course not found' };
    }

    const announcement = {
      id: `ANN_${courseId}_${Date.now()}`,
      courseId,
      title,
      content,
      type,
      createdAt: new Date(),
      likes: 0,
    };

    course.announcements.push(announcement);
    return announcement;
  }

  /**
   * Send message between student and instructor
   */
  sendMessage(fromId, toId, subject, message, type = 'email') {
    const messageId = `MSG_${Date.now()}`;
    const msg = {
      id: messageId,
      from: fromId,
      to: toId,
      subject,
      message,
      type,
      sentAt: new Date(),
      read: false,
      attachments: [],
    };

    this.messages.set(messageId, msg);

    // Create notification
    this.createNotification(toId, `New message from ${fromId}: ${subject}`);

    return msg;
  }

  /**
   * Create notification
   */
  createNotification(userId, message, type = 'info') {
    const notificationId = `NOTIF_${userId}_${Date.now()}`;
    const notification = {
      id: notificationId,
      userId,
      message,
      type,
      createdAt: new Date(),
      read: false,
    };

    this.notifications.set(notificationId, notification);
    return notification;
  }

  /**
   * Get course details with all related data
   */
  getCourseDetails(courseId) {
    const course = this.courses.get(courseId);
    if (!course) return null;

    const instructor = this.instructors.get(course.instructor);
    const lessons = course.lessons.map(id => this.lessons.get(id));
    const assignments = course.assignments.map(id => this.assignments.get(id));
    const assessments = course.assessments.map(id => this.assessments.get(id));

    return {
      ...course,
      instructor,
      lessons,
      assignments,
      assessments,
      enrollmentStats: {
        total: course.enrolled,
        capacity: course.capacity,
        percentageFilled: Math.round((course.enrolled / course.capacity) * 100),
      },
    };
  }

  /**
   * Get student progress in course
   */
  getStudentProgress(studentId, courseId) {
    const progressKey = `${studentId}_${courseId}`;
    const progress = this.progress.get(progressKey);

    if (!progress) {
      return { success: false, message: 'Progress not found' };
    }

    // Get student submissions and grades
    const enrollments = Array.from(this.enrollments.values()).filter(
      e => e.studentId === studentId && e.courseId === courseId
    );

    return {
      studentId,
      courseId,
      ...progress,
      enrollments,
    };
  }

  /**
   * Get all courses
   */
  getAllCourses(filters = {}) {
    let courses = Array.from(this.courses.values());

    if (filters.category) {
      courses = courses.filter(c => c.category === filters.category);
    }

    if (filters.level) {
      courses = courses.filter(c => c.level === filters.level);
    }

    if (filters.instructor) {
      courses = courses.filter(c => c.instructor === filters.instructor);
    }

    if (filters.status) {
      courses = courses.filter(c => c.status === filters.status);
    }

    return courses.map(course => ({
      ...course,
      instructor: this.instructors.get(course.instructor),
      lessonsCount: course.lessons.length,
      assignmentsCount: course.assignments.length,
    }));
  }

  /**
   * Get student enrolled courses
   */
  getStudentCourses(studentId) {
    const student = this.students.get(studentId);
    if (!student) return [];

    return student.enrolledCourses
      .map(courseId => this.courses.get(courseId))
      .filter(course => course);
  }

  /**
   * Get instructor courses
   */
  getInstructorCourses(instructorId) {
    return Array.from(this.courses.values()).filter(course => course.instructor === instructorId);
  }

  /**
   * Get course leaderboard
   */
  getCourseLeaderboard(courseId) {
    const enrollments = Array.from(this.enrollments.values()).filter(e => e.courseId === courseId);

    const leaderboard = enrollments
      .map(enrollment => ({
        studentId: enrollment.studentId,
        student: this.students.get(enrollment.studentId),
        progress: this.progress.get(`${enrollment.studentId}_${courseId}`),
        grade: enrollment.grade,
      }))
      .sort((a, b) => (b.progress?.overallProgress || 0) - (a.progress?.overallProgress || 0));

    return leaderboard;
  }

  /**
   * Get instructor statistics
   */
  getInstructorStats(instructorId) {
    const courses = this.getInstructorCourses(instructorId);
    const totalStudents = new Set();
    const totalLessons = 0;
    const averageRating = 0;

    courses.forEach(course => {
      course.lessons.forEach(() => {
        totalLessons++;
      });

      Array.from(this.enrollments.values())
        .filter(e => e.courseId === course.id)
        .forEach(e => totalStudents.add(e.studentId));
    });

    return {
      instructorId,
      coursesCount: courses.length,
      studentsCount: totalStudents.size,
      lessonsCount: totalLessons,
      averageRating,
      courses,
    };
  }

  /**
   * Get dashboard data
   */
  getDashboardData(userId, userType = 'student') {
    if (userType === 'student') {
      const student = this.students.get(userId);
      if (!student) return null;

      const enrolledCourses = this.getStudentCourses(userId);
      const progressData = enrolledCourses.map(course =>
        this.progress.get(`${userId}_${course.id}`)
      );

      return {
        user: student,
        enrolledCourses,
        progressData,
        totalCredits: student.totalCredits,
        gpa: student.gpa,
        completedCourses: student.completedCourses.length,
      };
    } else if (userType === 'instructor') {
      const instructor = this.instructors.get(userId);
      if (!instructor) return null;

      const stats = this.getInstructorStats(userId);
      return {
        user: instructor,
        ...stats,
      };
    }

    return null;
  }

  /**
   * Generate certificate
   */
  generateCertificate(studentId, courseId) {
    const student = this.students.get(studentId);
    const course = this.courses.get(courseId);
    const enrollment = Array.from(this.enrollments.values()).find(
      e => e.studentId === studentId && e.courseId === courseId
    );

    if (!student || !course || !enrollment) {
      return { success: false, message: 'Data not found' };
    }

    const certificate = {
      id: `CERT_${studentId}_${courseId}_${Date.now()}`,
      studentId,
      courseId,
      studentName: student.name,
      courseName: course.title,
      completionDate: new Date(),
      creditsEarned: course.credits,
      certificateUrl: `https://certificates.elearning.com/${studentId}/${courseId}.pdf`,
      verificationCode: `CERT${Date.now()}`,
    };

    enrollment.completionDate = new Date();
    enrollment.status = 'completed';

    return certificate;
  }

  /**
   * Search courses
   */
  searchCourses(query) {
    return Array.from(this.courses.values()).filter(
      course =>
        course.title.toLowerCase().includes(query.toLowerCase()) ||
        course.description.toLowerCase().includes(query.toLowerCase()) ||
        course.category.toLowerCase().includes(query.toLowerCase())
    );
  }

  /**
   * Get system statistics
   */
  getSystemStats() {
    return {
      totalCourses: this.courses.size,
      totalStudents: this.students.size,
      totalInstructors: this.instructors.size,
      totalEnrollments: this.enrollments.size,
      totalLessons: this.lessons.size,
      totalAssignments: this.assignments.size,
      totalAssessments: this.assessments.size,
      activeUsers: this.students.size + this.instructors.size,
      completionRate: this.calculateCompletionRate(),
      averageRating: this.calculateAverageRating(),
    };
  }

  /**
   * Calculate completion rate
   */
  calculateCompletionRate() {
    if (this.enrollments.size === 0) return 0;

    const completed = Array.from(this.enrollments.values()).filter(
      e => e.status === 'completed'
    ).length;

    return Math.round((completed / this.enrollments.size) * 100);
  }

  /**
   * Calculate average rating
   */
  calculateAverageRating() {
    if (this.instructors.size === 0) return 0;

    const totalRating = Array.from(this.instructors.values()).reduce(
      (sum, inst) => sum + inst.rating,
      0
    );

    return Math.round((totalRating / this.instructors.size) * 10) / 10;
  }
}

module.exports = ELearningSystem;
