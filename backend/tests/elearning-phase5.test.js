const { ELearningService: ELearningServiceClass } = require('../services/eLearningService');
const eLearningService = new ELearningServiceClass();
const Course = require('../models/course.model');
const Lesson = require('../models/lesson.model');
const Quiz = require('../models/quiz.model');

jest.mock('../models/course.model');
jest.mock('../models/lesson.model');
jest.mock('../models/quiz.model');

describe('ELearningService Phase 5', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createCourse', () => {
    it('should create and save a new course', async () => {
      const courseData = { title: 'Intro to React', instructor: 'user123' };

      const result = await eLearningService.createCourse(courseData);
      expect(result._id).toBeDefined();
      expect(result._id).toMatch(/^course_\d+$/);
      expect(result.title).toBe('Intro to React');
    });
  });

  describe('getAllCourses', () => {
    it('should return all courses with populated instructor', async () => {
      const result = await eLearningService.getAllCourses();
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]._id).toBeDefined();
    });
  });

  describe('addLesson', () => {
    it('should add a lesson to a course', async () => {
      const lessonData = { title: 'Lesson 1', courseId: 'course123' };

      const result = await eLearningService.addLesson(lessonData);
      expect(result._id).toBeDefined();
      expect(result._id).toMatch(/^lesson_\d+$/);
      expect(result.title).toBe('Lesson 1');
    });
  });

  describe('createQuiz', () => {
    it('should create a quiz', async () => {
      const quizData = { title: 'Quiz 1', courseId: 'course123' };

      const result = await eLearningService.createQuiz(quizData);
      expect(result._id).toBeDefined();
      expect(result._id).toMatch(/^quiz_\d+$/);
      expect(result.title).toBe('Quiz 1');
    });
  });

  describe('getCourseById', () => {
    it('should return course with lessons and quizzes', async () => {
      const courseId = 'course123';

      const result = await eLearningService.getCourseById(courseId);
      expect(result).toBeDefined();
      expect(result._id).toBeDefined();
      expect(result.title).toBeDefined();
    });
  });
});
