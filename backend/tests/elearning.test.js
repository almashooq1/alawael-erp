const mongoose = require('mongoose');

// Set env before require
process.env.USE_MOCK_DB = 'false';

const { ELearningService: ELearningServiceClass } = require('../services/eLearningService');
const eLearningService = new ELearningServiceClass();
const Course = require('../models/course.model');
const Lesson = require('../models/lesson.model');
const Enrollment = require('../models/enrollment.model');

// Mock Models
jest.mock('../models/course.model');
jest.mock('../models/lesson.model');
jest.mock('../models/enrollment.model');

describe('E-Learning Service', () => {
  let saveMock;

  beforeEach(() => {
    saveMock = jest.fn().mockResolvedValue({ _id: 'mockId', toObject: () => ({ _id: 'mockId' }) });

    // Setup Mocks
    Course.mockImplementation(() => ({
      save: saveMock,
    }));
    Course.find = jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue([]),
      }),
    });
    Course.findById = jest.fn().mockReturnValue({
      populate: jest.fn().mockResolvedValue({
        _id: 'course1',
        title: 'Test Course',
        toObject: () => ({ _id: 'course1', title: 'Test Course' }),
      }),
    });
    Course.findByIdAndUpdate = jest.fn().mockResolvedValue({});

    Lesson.mockImplementation(() => ({
      save: saveMock,
    }));
    Lesson.find = jest.fn().mockReturnValue({
      sort: jest.fn().mockResolvedValue([]),
    });
    Lesson.countDocuments = jest.fn().mockResolvedValue(1);

    Enrollment.mockImplementation(() => ({
      save: saveMock,
    }));
    Enrollment.findOne = jest.fn().mockResolvedValue(null);
    Enrollment.find = jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue([]),
      }),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Tests using Mock Logic in Service (if applicable) or Mocked Models
  // Since service uses process.env.USE_MOCK_DB toggle, we can test that path or the DB path.
  // The previous service test failed initially because it wasn't using the mocked models correctly or the service was using the mock toggle.
  // Let's set USE_MOCK_DB to false to test the logic that calls models.

  const originalEnv = process.env.USE_MOCK_DB;

  beforeAll(() => {
    process.env.USE_MOCK_DB = 'false';
  });

  afterAll(() => {
    process.env.USE_MOCK_DB = originalEnv;
  });

  describe('createCourse', () => {
    it('should create a course successfully', async () => {
      const data = { title: 'New Course', instructor: 'user1' };
      await eLearningService.createCourse(data);
      expect(Course).toHaveBeenCalledWith(data);
      expect(saveMock).toHaveBeenCalled();
    });
  });

  describe('addLesson', () => {
    it('should add a lesson successfully', async () => {
      const data = { title: 'New Lesson', order: 1 };
      await eLearningService.addLesson({ ...data, courseId: 'course1' });
      expect(Lesson).toHaveBeenCalledWith(expect.objectContaining({ ...data, courseId: 'course1' }));
      expect(saveMock).toHaveBeenCalled();
    });
  });

  describe('enrollStudent', () => {
    it('should enroll a student successfully', async () => {
      await eLearningService.enrollStudent('user1', 'course1');
      expect(Enrollment).toHaveBeenCalledWith({ student: 'user1', course: 'course1' });
      expect(Course.findByIdAndUpdate).toHaveBeenCalled();
      expect(saveMock).toHaveBeenCalled();
    });
  });

  describe('completeLesson', () => {
    it('should mark lesson as complete', async () => {
      Enrollment.findOne = jest.fn().mockResolvedValue({
        student: 'user1',
        course: 'course1',
        completedLessons: [],
        save: saveMock,
      });

      await eLearningService.completeLesson('user1', 'course1', 'lesson1');
      expect(saveMock).toHaveBeenCalled();
    });
  });
});
