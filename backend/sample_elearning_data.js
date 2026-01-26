/**
 * E-Learning Sample Data & Complete Testing Guide
 * بيانات العينة والدليل الكامل للاختبار
 */

// ==================== COMPLETE TESTING SCENARIOS ====================

// Scenario 1: Complete Learning Path
const scenario1_CompleteCoursePath = {
  title: 'Student Complete Learning Journey',
  steps: [
    {
      step: 1,
      action: 'Student enrolls in course',
      endpoint: 'POST /api/elearning/enroll',
      payload: {
        studentId: 'STU001',
        courseId: 'COURSE001',
      },
      expectedResponse: {
        success: true,
        data: {
          id: 'ENROLL_*',
          studentId: 'STU001',
          courseId: 'COURSE001',
          status: 'active',
        },
      },
    },
    {
      step: 2,
      action: 'Student views course',
      endpoint: 'GET /api/elearning/courses/COURSE001',
      expectedResponse: {
        success: true,
        data: {
          title: 'أساسيات البرمجة بلغة Python',
          lessons: [],
          assignments: [],
          assessments: [],
        },
      },
    },
    {
      step: 3,
      action: 'Student completes lessons',
      endpoint: 'GET /api/elearning/courses/COURSE001/leaderboard',
      expectedResponse: {
        success: true,
        data: {
          leaderboard: [],
        },
      },
    },
    {
      step: 4,
      action: 'Student submits assignment',
      endpoint: 'POST /api/elearning/submit-assignment',
      payload: {
        studentId: 'STU001',
        assignmentId: 'ASSIGN001',
        content: 'Source code here',
        files: ['solution.py'],
      },
      expectedResponse: {
        success: true,
        data: {
          id: 'SUBMIT_*',
          status: 'submitted',
        },
      },
    },
    {
      step: 5,
      action: 'Instructor grades assignment',
      endpoint: 'POST /api/elearning/grade-assignment',
      payload: {
        submissionId: 'SUBMIT_*',
        score: 95,
        feedback: 'Excellent work!',
      },
      expectedResponse: {
        success: true,
        data: {
          status: 'graded',
          grade: 95,
        },
      },
    },
    {
      step: 6,
      action: 'Student takes quiz',
      endpoint: 'POST /api/elearning/submit-assessment',
      payload: {
        studentId: 'STU001',
        assessmentId: 'QUIZ001',
        answers: [0, 1, 2, 3, 0, 1, 2, 3, 0, 1],
      },
      expectedResponse: {
        success: true,
        data: {
          passed: true,
          score: '>=70',
        },
      },
    },
    {
      step: 7,
      action: 'Student receives certificate',
      endpoint: 'POST /api/elearning/certificates',
      payload: {
        studentId: 'STU001',
        courseId: 'COURSE001',
      },
      expectedResponse: {
        success: true,
        data: {
          certificateUrl: '*',
          verificationCode: '*',
        },
      },
    },
  ],
};

// Scenario 2: Instructor Course Management
const scenario2_InstructorManagement = {
  title: 'Instructor Course Management',
  steps: [
    {
      step: 1,
      action: 'Instructor creates new course',
      endpoint: 'POST /api/elearning/courses',
      payload: {
        title: 'Advanced Web Development',
        description: 'Learn React, Node.js, and MongoDB',
        instructor: 'INST001',
        category: 'Programming',
        level: 'advanced',
        duration: 60,
        capacity: 30,
        startDate: '2025-09-01',
        endDate: '2025-11-30',
        credits: 4,
      },
    },
    {
      step: 2,
      action: 'Instructor adds lessons',
      endpoint: 'POST /api/elearning/lessons',
      payload: {
        courseId: 'COURSE_NEW',
        title: 'React Fundamentals',
        type: 'video',
        duration: 45,
        order: 1,
      },
    },
    {
      step: 3,
      action: 'Instructor creates assignment',
      endpoint: 'POST /api/elearning/assignments',
      payload: {
        courseId: 'COURSE_NEW',
        title: 'Build a Todo App',
        dueDate: '2025-09-15',
        maxScore: 100,
      },
    },
    {
      step: 4,
      action: 'Instructor creates quiz',
      endpoint: 'POST /api/elearning/assessments',
      payload: {
        courseId: 'COURSE_NEW',
        title: 'React Basics Quiz',
        totalQuestions: 15,
        passingScore: 75,
      },
    },
    {
      step: 5,
      action: 'Instructor views statistics',
      endpoint: 'GET /api/elearning/instructors/INST001/stats',
      expectedResponse: {
        success: true,
        data: {
          coursesCount: 2,
          studentsCount: 5,
          lessonsCount: 10,
        },
      },
    },
  ],
};

// Scenario 3: Student Search and Discovery
const scenario3_CourseDiscovery = {
  title: 'Student Course Discovery',
  steps: [
    {
      step: 1,
      action: 'Search for courses',
      endpoint: 'GET /api/elearning/search?query=Python',
      expectedResponse: {
        success: true,
        data: {
          query: 'Python',
          count: 1,
          results: [],
        },
      },
    },
    {
      step: 2,
      action: 'Browse all courses',
      endpoint: 'GET /api/elearning/courses',
      expectedResponse: {
        success: true,
        data: {
          count: 2,
          courses: [],
        },
      },
    },
    {
      step: 3,
      action: 'Filter by level',
      endpoint: 'GET /api/elearning/courses?level=beginner',
      expectedResponse: {
        success: true,
        data: {
          count: 1,
          courses: [],
        },
      },
    },
    {
      step: 4,
      action: 'View course details',
      endpoint: 'GET /api/elearning/courses/COURSE001',
      expectedResponse: {
        success: true,
        data: {
          title: 'أساسيات البرمجة بلغة Python',
          instructor: {},
          lessons: [],
          enrollmentStats: {},
        },
      },
    },
  ],
};

// ==================== CURL EXAMPLES ====================

const curlExamples = {
  enrollStudent: `curl -X POST http://localhost:3001/api/elearning/enroll \\
  -H "Content-Type: application/json" \\
  -d '{
    "studentId": "STU001",
    "courseId": "COURSE001"
  }'`,

  getCourses: `curl http://localhost:3001/api/elearning/courses`,

  getCourseDetails: `curl http://localhost:3001/api/elearning/courses/COURSE001`,

  submitAssignment: `curl -X POST http://localhost:3001/api/elearning/submit-assignment \\
  -H "Content-Type: application/json" \\
  -d '{
    "studentId": "STU001",
    "assignmentId": "ASSIGN001",
    "content": "My solution code",
    "files": ["solution.py"]
  }'`,

  gradeSubmission: `curl -X POST http://localhost:3001/api/elearning/grade-assignment \\
  -H "Content-Type: application/json" \\
  -d '{
    "submissionId": "SUBMIT_STU001_ASSIGN001",
    "score": 95,
    "feedback": "Excellent work!",
    "maxScore": 100
  }'`,

  submitQuiz: `curl -X POST http://localhost:3001/api/elearning/submit-assessment \\
  -H "Content-Type: application/json" \\
  -d '{
    "studentId": "STU001",
    "assessmentId": "QUIZ001",
    "answers": [0, 1, 2, 3, 0, 1, 2, 3, 0, 1]
  }'`,

  searchCourses: `curl 'http://localhost:3001/api/elearning/search?query=Python'`,

  getCourseLeaderboard: `curl http://localhost:3001/api/elearning/courses/COURSE001/leaderboard`,

  getStudentProgress: `curl http://localhost:3001/api/elearning/students/STU001/progress/COURSE001`,

  generateCertificate: `curl -X POST http://localhost:3001/api/elearning/certificates \\
  -H "Content-Type: application/json" \\
  -d '{
    "studentId": "STU001",
    "courseId": "COURSE001"
  }'`,

  sendMessage: `curl -X POST http://localhost:3001/api/elearning/messages \\
  -H "Content-Type: application/json" \\
  -d '{
    "from": "INST001",
    "to": "STU001",
    "subject": "Assignment Feedback",
    "message": "Great work on your project!"
  }'`,

  createAnnouncement: `curl -X POST http://localhost:3001/api/elearning/announcements \\
  -H "Content-Type: application/json" \\
  -d '{
    "courseId": "COURSE001",
    "title": "Important Update",
    "content": "Exam date has been moved to next week",
    "type": "update"
  }'`,

  getSystemStats: `curl http://localhost:3001/api/elearning/stats`,

  getSystemStatus: `curl http://localhost:3001/api/elearning/status`,

  getInstructorStats: `curl http://localhost:3001/api/elearning/instructors/INST001/stats`,

  getStudentDashboard: `curl http://localhost:3001/api/elearning/dashboard/STU001/student`,

  getInstructorDashboard: `curl http://localhost:3001/api/elearning/dashboard/INST001/instructor`,
};

// ==================== SAMPLE DATA RECORDS ====================

const sampleCourses = [
  {
    id: 'COURSE001',
    title: 'أساسيات البرمجة بلغة Python',
    description: 'Introduction to Python programming for beginners',
    category: 'Programming',
    level: 'beginner',
    instructor: 'INST001',
    credits: 3,
    duration: 40,
    capacity: 50,
  },
  {
    id: 'COURSE002',
    title: 'التحليل الرياضي المتقدم',
    description: 'Advanced calculus and mathematical analysis',
    category: 'Mathematics',
    level: 'advanced',
    instructor: 'INST002',
    credits: 4,
    duration: 45,
    capacity: 40,
  },
  {
    id: 'COURSE003',
    title: 'تطوير تطبيقات الويب',
    description: 'Full-stack web development with React and Node.js',
    category: 'Programming',
    level: 'intermediate',
    instructor: 'INST001',
    credits: 4,
    duration: 60,
    capacity: 35,
  },
  {
    id: 'COURSE004',
    title: 'الجبر الخطي',
    description: 'Linear algebra fundamentals and applications',
    category: 'Mathematics',
    level: 'intermediate',
    instructor: 'INST002',
    credits: 3,
    duration: 50,
    capacity: 40,
  },
];

const sampleAssignments = [
  {
    id: 'ASSIGN001',
    courseId: 'COURSE001',
    title: 'مشروع البرنامج الأول',
    description: 'Create a simple calculator program',
    type: 'project',
    dueDate: new Date(2025, 8, 15),
  },
  {
    id: 'ASSIGN002',
    courseId: 'COURSE001',
    title: 'تمرين على الدوال',
    description: 'Write functions for common operations',
    type: 'exercise',
    dueDate: new Date(2025, 8, 22),
  },
  {
    id: 'ASSIGN003',
    courseId: 'COURSE002',
    title: 'مسائل التفاضل والتكامل',
    description: 'Solve 20 calculus problems',
    type: 'homework',
    dueDate: new Date(2025, 9, 5),
  },
];

const sampleQuizzes = [
  {
    id: 'QUIZ001',
    courseId: 'COURSE001',
    title: 'اختبار المحاضرة الأولى',
    description: 'Quiz on Python basics',
    totalQuestions: 10,
    passingScore: 70,
  },
  {
    id: 'QUIZ002',
    courseId: 'COURSE001',
    title: 'اختبار منتصف المقرر',
    description: 'Midterm quiz covering lessons 1-5',
    totalQuestions: 20,
    passingScore: 75,
  },
  {
    id: 'QUIZ003',
    courseId: 'COURSE002',
    title: 'اختبار التفاضل',
    description: 'Differential calculus quiz',
    totalQuestions: 15,
    passingScore: 70,
  },
];

const sampleLessons = [
  {
    id: 'LESSON001',
    courseId: 'COURSE001',
    title: 'مقدمة إلى Python',
    type: 'video',
    duration: 45,
    order: 1,
  },
  {
    id: 'LESSON002',
    courseId: 'COURSE001',
    title: 'المتغيرات والأنواع البيانات',
    type: 'video',
    duration: 50,
    order: 2,
  },
  {
    id: 'LESSON003',
    courseId: 'COURSE001',
    title: 'البيانات والقوائم',
    type: 'interactive',
    duration: 60,
    order: 3,
  },
  {
    id: 'LESSON004',
    courseId: 'COURSE002',
    title: 'الدوال والحدود',
    type: 'video',
    duration: 55,
    order: 1,
  },
];

const sampleStudents = [
  {
    id: 'STU001',
    name: 'محمد حسين',
    email: 'muhammad@student.com',
    level: 'intermediate',
  },
  {
    id: 'STU002',
    name: 'نور السامرائي',
    email: 'noor@student.com',
    level: 'beginner',
  },
  {
    id: 'STU003',
    name: 'علي محمود',
    email: 'ali@student.com',
    level: 'advanced',
  },
  {
    id: 'STU004',
    name: 'هند الهاشمي',
    email: 'hind@student.com',
    level: 'beginner',
  },
  {
    id: 'STU005',
    name: 'خالد إبراهيم',
    email: 'khalid@student.com',
    level: 'intermediate',
  },
];

// ==================== TEST EXECUTION GUIDE ====================

const testExecutionGuide = `
# E-Learning System - Test Execution Guide
# دليل تنفيذ اختبارات نظام التعلم عن بعد

## Quick Start
1. Open terminal and navigate to backend folder:
   cd backend

2. Run the test suite:
   node tests/elearning_test.js

3. Expected output:
   ✓ All 19 tests should pass
   ✓ 100% success rate
   ✓ System operational status confirmed

## Testing Scenarios

### Scenario 1: Complete Course Path (7 steps)
- Student enrollment
- Course viewing
- Lesson completion
- Assignment submission
- Grading
- Quiz taking
- Certificate generation

### Scenario 2: Instructor Management (5 steps)
- Course creation
- Lesson addition
- Assignment creation
- Quiz creation
- Statistics viewing

### Scenario 3: Course Discovery (4 steps)
- Course search
- Course browsing
- Filtering
- Detail viewing

## API Testing with cURL

### Test Health
\`\`\`bash
curl http://localhost:3001/api/elearning/health
\`\`\`

### Enroll Student
\`\`\`bash
curl -X POST http://localhost:3001/api/elearning/enroll \\
  -H "Content-Type: application/json" \\
  -d '{"studentId": "STU001", "courseId": "COURSE001"}'
\`\`\`

### View Courses
\`\`\`bash
curl http://localhost:3001/api/elearning/courses
\`\`\`

### Search Courses
\`\`\`bash
curl 'http://localhost:3001/api/elearning/search?query=Python'
\`\`\`

### Get Student Progress
\`\`\`bash
curl http://localhost:3001/api/elearning/students/STU001/progress/COURSE001
\`\`\`

### Submit Assignment
\`\`\`bash
curl -X POST http://localhost:3001/api/elearning/submit-assignment \\
  -H "Content-Type: application/json" \\
  -d '{
    "studentId": "STU001",
    "assignmentId": "ASSIGN001",
    "content": "My solution code"
  }'
\`\`\`

### Grade Assignment
\`\`\`bash
curl -X POST http://localhost:3001/api/elearning/grade-assignment \\
  -H "Content-Type: application/json" \\
  -d '{
    "submissionId": "SUBMIT_*",
    "score": 95,
    "feedback": "Excellent work!"
  }'
\`\`\`

### Take Quiz
\`\`\`bash
curl -X POST http://localhost:3001/api/elearning/submit-assessment \\
  -H "Content-Type: application/json" \\
  -d '{
    "studentId": "STU001",
    "assessmentId": "QUIZ001",
    "answers": [0, 1, 2, 3, 0, 1, 2, 3, 0, 1]
  }'
\`\`\`

### Generate Certificate
\`\`\`bash
curl -X POST http://localhost:3001/api/elearning/certificates \\
  -H "Content-Type: application/json" \\
  -d '{
    "studentId": "STU001",
    "courseId": "COURSE001"
  }'
\`\`\`

## Using Postman

1. Import API endpoints
2. Set up environment variables:
   - API_URL: http://localhost:3001/api
   - STUDENT_ID: STU001
   - COURSE_ID: COURSE001

3. Run collections in order:
   - Enrollment Tests
   - Course Interaction Tests
   - Assignment/Quiz Tests
   - Certification Tests

## Expected Results

- All 19 tests pass successfully
- Response times < 200ms
- System handles concurrent requests
- Data integrity maintained
- Error handling proper

## Troubleshooting

### Port 3001 already in use?
\`\`\`bash
# Kill existing process
taskkill /F /IM node.exe
# Or use: pkill node (Mac/Linux)

# Then restart
npm start
\`\`\`

### Tests failing?
- Check backend is running on port 3001
- Verify all route files are in correct locations
- Check console for error messages
- Ensure Node.js version >= 14

### Need more data?
- Sample data is generated on system initialization
- Modify sampleCourses, sampleStudents arrays to add more
- Re-initialize system to load new data
`;

module.exports = {
  scenario1_CompleteCoursePath,
  scenario2_InstructorManagement,
  scenario3_CourseDiscovery,
  curlExamples,
  sampleCourses,
  sampleAssignments,
  sampleQuizzes,
  sampleLessons,
  sampleStudents,
  testExecutionGuide,
};
