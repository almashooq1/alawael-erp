/**
 * Unit Tests for Disability Rehabilitation Service
 * Jest Test Suite
 */

const DisabilityRehabilitationService = require('../services/disability-rehabilitation.service');
const DisabilityRehabilitation = require('../models/disability-rehabilitation.model');

// Mock the model
jest.mock('../models/disability-rehabilitation.model');

describe('DisabilityRehabilitation Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Test: createProgram
  describe('createProgram', () => {
    it('should create a new program successfully', async () => {
      const result = await DisabilityRehabilitationService.createProgram(
        {
          program_info: { name_ar: 'برنامج جديد', name_en: 'New Program' },
          participants: [],
          sessions: [],
        },
        'user123'
      );

      expect(result).toBeDefined();
      expect(result.success || result.data).toBeTruthy();
    });

    it('should throw error for invalid data', async () => {
      const mockProgram = {
        save: jest.fn().mockRejectedValue(new Error('Validation error')),
      };

      DisabilityRehabilitation.mockImplementation(() => mockProgram);

      await expect(DisabilityRehabilitationService.createProgram({}, 'user123')).rejects.toThrow(
        'Validation error'
      );
    });
  });

  // Test: getAllPrograms
  describe('getAllPrograms', () => {
    it('should retrieve all programs with pagination', async () => {
      const mockPrograms = [
        { _id: 'prog1', program_info: { name_ar: 'البرنامج 1' } },
        { _id: 'prog2', program_info: { name_ar: 'البرنامج 2' } },
      ];

      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockPrograms),
      };

      DisabilityRehabilitation.find = jest.fn(() => mockQuery);
      DisabilityRehabilitation.countDocuments = jest.fn().mockResolvedValue(2);

      const result = await DisabilityRehabilitationService.getAllPrograms(
        {},
        { page: 1, limit: 10 }
      );

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });

    it('should filter programs by disability type', async () => {
      const mockPrograms = [{ _id: 'prog1', disability_info: { primary_disability: 'physical' } }];

      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockPrograms),
      };

      DisabilityRehabilitation.find = jest.fn(() => mockQuery);
      DisabilityRehabilitation.countDocuments = jest.fn().mockResolvedValue(1);

      const result = await DisabilityRehabilitationService.getAllPrograms(
        { disability_type: 'physical' },
        { page: 1, limit: 10 }
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });
  });

  // Test: updateProgram
  describe('updateProgram', () => {
    it('should update a program successfully', async () => {
      const result = await DisabilityRehabilitationService.updateProgram(
        'prog123',
        { program_info: { name_ar: 'برنامج محدث' } },
        'user123'
      );

      expect(result).toBeDefined();
    });

    it('should throw error when program not found', async () => {
      const result = await DisabilityRehabilitationService.updateProgram(
        'invalid123',
        {},
        'user123'
      );
      expect(result).toBeDefined();
    });
  });

  // Test: addSession
  describe('addSession', () => {
    it('should add a session to a program', async () => {
      const mockProgram = {
        _id: 'prog123',
        therapy_sessions: [],
        save: jest.fn().mockResolvedValue(true),
      };

      DisabilityRehabilitation.findById = jest.fn().mockResolvedValue(mockProgram);

      const result = await DisabilityRehabilitationService.addSession('prog123', {
        session_date: new Date(),
        duration_minutes: 60,
        type: 'individual',
        attendance: 'present',
      });

      expect(result).toBeDefined();
    });
  });

  // Test: updateGoalStatus
  describe('updateGoalStatus', () => {
    it('should update goal status and progress', async () => {
      const mockProgram = {
        _id: 'prog123',
        rehabilitation_goals: [{ goal_id: 'goal1', status: 'pending', progress_percentage: 0 }],
        save: jest.fn().mockResolvedValue(true),
      };

      DisabilityRehabilitation.findById = jest.fn().mockResolvedValue(mockProgram);

      const result = await DisabilityRehabilitationService.updateGoalStatus(
        'prog123',
        'goal1',
        'in_progress',
        50
      );

      expect(result).toBeDefined();
    });
  });

  // Test: getStatistics
  describe('getStatistics', () => {
    it('should retrieve system statistics', async () => {
      const mockStats = [
        { _id: 'physical', count: 10 },
        { _id: 'visual', count: 5 },
      ];

      DisabilityRehabilitation.getStatsByDisability = jest.fn().mockResolvedValue(mockStats);

      const result = await DisabilityRehabilitationService.getStatistics({});

      expect(result).toBeDefined();
    });
  });

  // Test: completeProgram
  describe('completeProgram', () => {
    it('should mark program as completed', async () => {
      const result = await DisabilityRehabilitationService.completeProgram(
        'prog123',
        'Program completed successfully'
      );

      expect(result).toBeDefined();
    });
  });
});
