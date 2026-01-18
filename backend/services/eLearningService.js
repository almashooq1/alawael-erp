// Mock fallback
const useMock = process.env.USE_MOCK_DB === 'true';

// Lazy load models only when NOT in mock mode
let Course, Lesson, Quiz, Enrollment;
if (!useMock) {
  Course = require('../models/course.model');
  Lesson = require('../models/lesson.model');
  Quiz = require('../models/quiz.model');
  Enrollment = require('../models/enrollment.model');
}

class ELearningService {
  // --- Course Management ---

  async createCourse(courseData) {
    if (useMock) return { ...courseData, _id: 'course_' + Date.now() };
    const course = new Course(courseData);
    return await course.save();
  }

  async getAllCourses(filter = {}) {
    if (useMock) {
      return [
        { _id: 'course1', title: 'Intro to AI', category: 'technical', isPublished: true, instructor: { name: 'Dr. AI' } },
        { _id: 'course2', title: 'Communication Skills', category: 'soft-skills', isPublished: true, instructor: { name: 'Coach Sarah' } },
      ];
    }
    return await Course.find(filter).populate('instructor', 'name email').sort({ createdAt: -1 });
  }

  async getCourseById(courseId) {
    if (useMock) {
      return {
        _id: courseId,
        title: 'Mock Course',
        lessons: [{ _id: 'l1', title: 'Lesson 1' }],
        quizzes: [],
      };
    }
    const course = await Course.findById(courseId).populate('instructor', 'name');
    if (!course) throw new Error('Course not found');

    // Get Lessons
    const lessons = await Lesson.find({ courseId }).sort({ order: 1 });

    // Get Quizzes
    const quizzes = await Quiz.find({ courseId });

    return { ...course.toObject(), lessons, quizzes };
  }

  async updateCourse(courseId, updateData) {
    if (useMock) return { ...updateData, _id: courseId };
    return await Course.findByIdAndUpdate(courseId, updateData, { new: true });
  }

  async deleteCourse(courseId) {
    if (useMock) return { _id: courseId };
    await Lesson.deleteMany({ courseId });
    await Quiz.deleteMany({ courseId });
    return await Course.findByIdAndDelete(courseId);
  }

  // --- Lesson Management ---

  async addLesson(lessonData) {
    if (useMock) return { ...lessonData, _id: 'lesson_' + Date.now() };
    const lesson = new Lesson(lessonData);
    return await lesson.save();
  }

  async updateLesson(lessonId, updateData) {
    if (useMock) return { ...updateData, _id: lessonId };
    return await Lesson.findByIdAndUpdate(lessonId, updateData, { new: true });
  }

  async deleteLesson(lessonId) {
    if (useMock) return { _id: lessonId };
    return await Lesson.findByIdAndDelete(lessonId);
  }

  // --- Quiz Management ---

  async createQuiz(quizData) {
    if (useMock) return { ...quizData, _id: 'quiz_' + Date.now() };
    const quiz = new Quiz(quizData);
    return await quiz.save();
  }

  async getQuizById(quizId) {
    if (useMock) return { _id: quizId, title: 'Mock Quiz', questions: [] };
    return await Quiz.findById(quizId);
  }

  // --- Enrollment & Progress ---

  async enrollStudent(userId, courseId) {
    if (useMock) return { _id: 'enroll_' + Date.now(), student: userId, course: courseId, progress: 0 };

    // Check if already enrolled
    const existing = await Enrollment.findOne({ student: userId, course: courseId });
    if (existing) return existing;

    const enrollment = new Enrollment({ student: userId, course: courseId });
    // Update course stats
    await Course.findByIdAndUpdate(courseId, { $inc: { 'stats.studentsEnrolled': 1 } });

    return await enrollment.save();
  }

  async getStudentEnrollments(userId) {
    if (useMock) {
      return [
        {
          _id: 'enr1',
          course: { title: 'Intro to AI', _id: 'course1' },
          progress: 50,
        },
      ];
    }
    return await Enrollment.find({ student: userId }).populate('course', 'title thumbnailUrl category').sort('-enrolledAt');
  }

  async completeLesson(userId, courseId, lessonId) {
    if (useMock) return { progress: 10, completedLessons: [lessonId] };

    const enrollment = await Enrollment.findOne({ student: userId, course: courseId });
    if (!enrollment) throw new Error('Not enrolled in this course');

    // Add lesson if not already completed
    if (!enrollment.completedLessons.includes(lessonId)) {
      enrollment.completedLessons.push(lessonId);

      // Calculate Progress
      const totalLessons = await Lesson.countDocuments({ courseId });
      const completedCount = enrollment.completedLessons.length;
      enrollment.progress = totalLessons === 0 ? 0 : Math.round((completedCount / totalLessons) * 100);

      if (enrollment.progress === 100 && !enrollment.isCompleted) {
        enrollment.isCompleted = true;
        enrollment.completedAt = new Date();
      }

      await enrollment.save();
    }

    return enrollment;
  }
}

// Export both: instance for routes, class for tests
const instance = new ELearningService();
module.exports = instance;
module.exports.ELearningService = ELearningService;
module.exports.default = instance;
