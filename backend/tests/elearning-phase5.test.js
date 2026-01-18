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
      const savedCourse = { ...courseData, _id: 'course123' };

      Course.mockImplementation(() => ({
        save: jest.fn().mockResolvedValue(savedCourse),
      }));

      const result = await eLearningService.createCourse(courseData);
      expect(result).toEqual(savedCourse);
      expect(Course).toHaveBeenCalledWith(courseData);
    });
  });

  describe('getAllCourses', () => {
    it('should return all courses with populated instructor', async () => {
      const mockCourses = [{ title: 'Course 1' }, { title: 'Course 2' }];
      const mockFind = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(mockCourses),
      };
      Course.find.mockReturnValue(mockFind);

      const result = await eLearningService.getAllCourses();
      expect(result).toEqual(mockCourses);
      expect(Course.find).toHaveBeenCalled();
    });
  });

  describe('addLesson', () => {
    it('should add a lesson to a course', async () => {
      const lessonData = { title: 'Lesson 1', courseId: 'course123' };
      const savedLesson = { ...lessonData, _id: 'lesson123' };

      Lesson.mockImplementation(() => ({
        save: jest.fn().mockResolvedValue(savedLesson),
      }));

      const result = await eLearningService.addLesson(lessonData);
      expect(result).toEqual(savedLesson);
    });
  });

  describe('createQuiz', () => {
    it('should create a quiz', async () => {
      const quizData = { title: 'Quiz 1', courseId: 'course123' };
      const savedQuiz = { ...quizData, _id: 'quiz123' };

      Quiz.mockImplementation(() => ({
        save: jest.fn().mockResolvedValue(savedQuiz),
      }));

      const result = await eLearningService.createQuiz(quizData);
      expect(result).toEqual(savedQuiz);
    });
  });

  describe('getCourseById', () => {
    it('should return course with lessons and quizzes', async () => {
      const courseId = 'course123';
      const mockCourse = { _id: courseId, title: 'Test Course', toObject: () => ({ _id: courseId, title: 'Test Course' }) };
      const mockLessons = [{ title: 'Lesson 1' }];
      const mockQuizzes = [{ title: 'Quiz 1' }];

      const mockFindById = {
        populate: jest.fn().mockResolvedValue(mockCourse),
      };
      Course.findById.mockReturnValue(mockFindById);

      const mockFindLessons = {
        sort: jest.fn().mockResolvedValue(mockLessons),
      };
      Lesson.find.mockReturnValue(mockFindLessons);
      Quiz.find.mockResolvedValue(mockQuizzes);

      const result = await eLearningService.getCourseById(courseId);

      expect(result.title).toBe('Test Course');
      expect(result.lessons).toEqual(mockLessons);
      expect(result.quizzes).toEqual(mockQuizzes);
    });
  });
});
