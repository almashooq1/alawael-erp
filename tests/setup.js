/**
 * tests/setup.js - Jest Setup & Global Configuration
 * Initializes test environment, database mocks, and utilities
 */

// Set test environment
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://localhost:27017/beneficiary-management-test';

// Increase timeout for database operations
jest.setTimeout(15000);

// Mock database connection
jest.mock('mongoose', () => {
  return {
    connect: jest.fn().mockResolvedValue(true),
    disconnect: jest.fn().mockResolvedValue(true),
    Schema: jest.fn(function (schema) {
      this.obj = schema;
      return this;
    }),
    model: jest.fn((name, schema) => {
      return {
        name,
        schema,
        find: jest.fn(),
        findOne: jest.fn(),
        findById: jest.fn(),
        save: jest.fn(),
        create: jest.fn(),
        updateOne: jest.fn(),
        deleteOne: jest.fn(),
        aggregate: jest.fn(),
      };
    }),
    Types: {
      ObjectId: jest.fn(id => id || new Date().getTime().toString()),
    },
    connection: {
      on: jest.fn(),
      once: jest.fn(),
    },
  };
});

// Global test utilities
global.testUtils = {
  /**
   * Create mock beneficiary data
   */
  createMockBeneficiary: () => ({
    _id: '507f1f77bcf86cd799439011',
    firstName: 'John',
    lastName: 'Doe',
    emailAddress: 'john.doe@test.com',
    nationalIdNumber: '123456789',
    phoneNumber: '+1234567890',
    dateOfBirth: new Date('2000-01-01'),
    gender: 'male',
    program: 'Tertiary Education',
    enrollmentDate: new Date(),
    academicStatus: 'active',
    currentLevel: 'Year 2',
    currentGPA: 3.5,
    totalPoints: 500,
    gamificationLevel: 'Contributor',
    beneficiaryType: 'scholarship_recipient',
    accountStatus: 'active',
  }),

  /**
   * Create mock attendance record
   */
  createMockAttendanceRecord: () => ({
    _id: '507f1f77bcf86cd799439012',
    beneficiaryId: '507f1f77bcf86cd799439011',
    attendanceDate: new Date(),
    status: 'present',
    courseId: '507f1f77bcf86cd799439013',
    courseCode: 'CS101',
    courseName: 'Introduction to Computer Science',
    recordedBy: 'system',
    attendanceAlert: false,
    alertReason: 'none',
  }),

  /**
   * Create mock scholarship
   */
  createMockScholarship: () => ({
    _id: '507f1f77bcf86cd799439014',
    beneficiaryId: '507f1f77bcf86cd799439011',
    applicationStatus: 'PENDING',
    programName: 'Merit Scholarship',
    scholarshipType: 'full_tuition',
    requestedAmount: 10000,
    academicYear: '2025-2026',
    semester: 'fall',
    applicationDate: new Date(),
  }),

  /**
   * Create mock achievement
   */
  createMockAchievement: () => ({
    _id: '507f1f77bcf86cd799439015',
    beneficiaryId: '507f1f77bcf86cd799439011',
    title: 'Academic Excellence',
    description: "Achieved Dean's List",
    type: 'academic',
    pointsAwarded: 50,
    achievedDate: new Date(),
    issuerName: 'Academic Affairs',
    issuerType: 'internal',
  }),

  /**
   * Create mock support plan
   */
  createMockSupportPlan: () => ({
    _id: '507f1f77bcf86cd799439016',
    beneficiaryId: '507f1f77bcf86cd799439011',
    planStatus: 'active',
    planType: 'academic',
    initialAssessment: {
      date: new Date(),
      academicConcern: true,
    },
    coordinatorId: 'COORD001',
    coordinatorName: 'Dr. Smith',
    goals: [],
    reviewSchedule: {
      nextReviewDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      reviewFrequency: 'monthly',
      reviewStatus: 'pending',
    },
  }),

  /**
   * Create mock API response
   */
  createMockResponse: () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    res.set = jest.fn().mockReturnValue(res);
    return res;
  },

  /**
   * Create mock request
   */
  createMockRequest: (overrides = {}) => ({
    params: {},
    query: {},
    body: {},
    headers: {
      authorization: 'Bearer test-token',
    },
    user: {
      id: '507f1f77bcf86cd799439011',
      role: 'admin',
    },
    ...overrides,
  }),

  /**
   * Verify response structure
   */
  verifyResponseStructure: response => {
    expect(response).toHaveProperty('status');
    expect(['success', 'error']).toContain(response.status);
    expect(response).toHaveProperty('message');
    expect(response).toHaveProperty('data');
    expect(response).toHaveProperty('timestamp');
  },

  /**
   * Compare dates (ignoring milliseconds)
   */
  datesEqual: (date1, date2) => {
    return new Date(date1).getTime() === new Date(date2).getTime();
  },
};

// Suppress console errors in tests (optional)
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (typeof args[0] === 'string' && args[0].includes('Warning: ReactDOM.render')) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
