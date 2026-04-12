/**
 * Unit tests for services/rehabilitation.service.js
 * Rehabilitation Services — Advanced Implementation
 */

/* ─── mock models ───────────────────────────────────────────────────── */

const mockAssessmentInstance = {
  _id: 'assess1',
  save: jest.fn().mockResolvedValue(undefined),
  generateAssessmentReport: jest.fn().mockReturnValue({ type: 'report' }),
  isReadyForRehabilitation: jest.fn().mockReturnValue(true),
  rehabilitation_readiness: {
    motivation_score: 8,
    cognitive_capacity: 7,
    physical_capacity: 6,
    family_support: 9,
    resource_availability: 7,
    overall_readiness: 'high',
  },
};

const mockProgramInstance = {
  _id: 'prog1',
  program_code: 'RP-001',
  beneficiary_name: 'Test Patient',
  program_status: 'active',
  program_duration: { enrollment_date: new Date('2025-01-01') },
  therapy_sessions: [{ session_number: 1 }],
  functional_independence_gain: { baseline_fim: 50 },
  client_satisfaction: { satisfaction_score: 8.5 },
  quality_indicators: { adverse_events_count: 0 },
  outcome_measures: {
    baseline_measures: [{ measure_type: 'FIM', current_score: 50 }],
    discharge_measures: [
      { measure_type: 'FIM', current_score: 75, minimal_clinically_important_difference: true },
    ],
  },
  save: jest.fn().mockResolvedValue(undefined),
  addTherapySession: jest.fn().mockResolvedValue(undefined),
  updateGoalProgress: jest.fn().mockResolvedValue(undefined),
  getGoalProgress: jest.fn().mockReturnValue({
    total_goals: 5,
    goals_achieved: 3,
    overall_progress: 60,
  }),
  calculateFIMGain: jest.fn().mockReturnValue(25),
  calculateComplianceRate: jest.fn().mockReturnValue(85),
  generateProgressReport: jest.fn().mockReturnValue({ progress: 60 }),
};

jest.mock('../../models/disability-assessment.model', () => {
  const MockModel = jest.fn(() => mockAssessmentInstance);
  MockModel.findById = jest.fn();
  MockModel.findByIdAndUpdate = jest.fn();
  MockModel.findByDisabilityType = jest.fn();
  MockModel.getAssessmentStatistics = jest.fn();
  MockModel.getReadyForRehabilitationCount = jest.fn();
  MockModel.find = jest.fn();
  return MockModel;
});

jest.mock('../../models/rehabilitation-program.model', () => {
  const MockModel = jest.fn(() => mockProgramInstance);
  MockModel.findById = jest.fn();
  MockModel.find = jest.fn();
  MockModel.countDocuments = jest.fn();
  MockModel.getProgramOutcomes = jest.fn();
  MockModel.getProgramsReadyForDischarge = jest.fn();
  MockModel.getDisabilityTypeStatistics = jest.fn();
  return MockModel;
});

jest.mock('../../utils/sanitize', () => ({
  escapeRegex: jest.fn(s => s),
}));

const DisabilityAssessment = require('../../models/disability-assessment.model');
const RehabilitationProgram = require('../../models/rehabilitation-program.model');
const RehabilitationService = require('../../services/rehabilitation.service');

/* ─── tests ─────────────────────────────────────────────────────────── */

describe('RehabilitationService', () => {
  let service;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new RehabilitationService();

    // Default happy-path stubs
    DisabilityAssessment.findById.mockResolvedValue(mockAssessmentInstance);
    RehabilitationProgram.findById.mockResolvedValue(mockProgramInstance);
  });

  // ── ASSESSMENT SERVICES ──────────────────────────────────────────

  describe('createAssessment', () => {
    it('saves and returns assessment', async () => {
      const result = await service.createAssessment({ name: 'A1' });

      expect(result.success).toBe(true);
      expect(result.assessment_id).toBe('assess1');
      expect(mockAssessmentInstance.save).toHaveBeenCalled();
    });

    it('throws on save error', async () => {
      mockAssessmentInstance.save.mockRejectedValueOnce(new Error('db'));
      await expect(service.createAssessment({})).rejects.toThrow('حدث خطأ داخلي');
    });
  });

  describe('getAssessment', () => {
    it('returns assessment by id', async () => {
      const result = await service.getAssessment('assess1');
      expect(result).toBe(mockAssessmentInstance);
    });

    it('throws when not found', async () => {
      DisabilityAssessment.findById.mockResolvedValue(null);
      await expect(service.getAssessment('bad')).rejects.toThrow('حدث خطأ داخلي');
    });
  });

  describe('updateAssessment', () => {
    it('updates and returns result', async () => {
      DisabilityAssessment.findByIdAndUpdate.mockResolvedValue(mockAssessmentInstance);

      const result = await service.updateAssessment('assess1', { name: 'Updated' });

      expect(result.success).toBe(true);
    });

    it('throws when assessment not found', async () => {
      DisabilityAssessment.findByIdAndUpdate.mockResolvedValue(null);
      await expect(service.updateAssessment('bad', {})).rejects.toThrow('حدث خطأ داخلي');
    });
  });

  describe('getAssessmentsByType', () => {
    it('returns filtered assessments', async () => {
      DisabilityAssessment.findByDisabilityType.mockResolvedValue([mockAssessmentInstance]);

      const result = await service.getAssessmentsByType('physical');

      expect(result.success).toBe(true);
      expect(result.count).toBe(1);
    });
  });

  describe('getAssessmentStatistics', () => {
    it('returns statistics', async () => {
      DisabilityAssessment.getAssessmentStatistics.mockResolvedValue({ total: 100 });

      const result = await service.getAssessmentStatistics();

      expect(result.success).toBe(true);
      expect(result.data.total).toBe(100);
    });
  });

  describe('generateAssessmentReport', () => {
    it('generates report from assessment', async () => {
      const result = await service.generateAssessmentReport('assess1');

      expect(result.success).toBe(true);
      expect(result.data.type).toBe('report');
    });
  });

  describe('checkRehabilitationReadiness', () => {
    it('returns readiness details when ready', async () => {
      const result = await service.checkRehabilitationReadiness('assess1');

      expect(result.success).toBe(true);
      expect(result.is_ready).toBe(true);
      expect(result.readiness_details.readiness_status).toBe('جاهز للتأهيل');
    });

    it('returns not-ready status', async () => {
      mockAssessmentInstance.isReadyForRehabilitation.mockReturnValueOnce(false);

      const result = await service.checkRehabilitationReadiness('assess1');

      expect(result.is_ready).toBe(false);
      expect(result.readiness_details.readiness_status).toBe('يحتاج إلى تحضيرات إضافية');
    });
  });

  // ── REHABILITATION PROGRAM SERVICES ──────────────────────────────

  describe('createRehabilitationProgram', () => {
    it('creates program with assessment reference', async () => {
      mockProgramInstance.save.mockResolvedValueOnce(undefined);
      const result = await service.createRehabilitationProgram({
        assessment_reference_id: 'assess1',
      });

      expect(result.success).toBe(true);
      expect(result.program_id).toBe('prog1');
    });

    it('throws when referenced assessment not found', async () => {
      DisabilityAssessment.findById.mockResolvedValue(null);

      await expect(
        service.createRehabilitationProgram({ assessment_reference_id: 'bad' })
      ).rejects.toThrow('حدث خطأ داخلي');
    });

    it('creates program without assessment reference', async () => {
      mockProgramInstance.save.mockResolvedValueOnce(undefined);
      const result = await service.createRehabilitationProgram({ name: 'P1' });

      expect(result.success).toBe(true);
    });
  });

  describe('getRehabilitationProgram', () => {
    it('returns program by id', async () => {
      const result = await service.getRehabilitationProgram('prog1');
      expect(result).toBe(mockProgramInstance);
    });

    it('throws when not found', async () => {
      RehabilitationProgram.findById.mockResolvedValue(null);
      await expect(service.getRehabilitationProgram('bad')).rejects.toThrow('حدث خطأ داخلي');
    });
  });

  describe('addTherapySession', () => {
    it('adds session with auto-incremented number', async () => {
      const result = await service.addTherapySession('prog1', {
        session_date: new Date(),
        therapist_id: 't1',
      });

      expect(result.success).toBe(true);
      expect(result.session_number).toBe(2); // existing length 1 + 1
    });

    it('throws when session data incomplete', async () => {
      await expect(service.addTherapySession('prog1', {})).rejects.toThrow('حدث خطأ داخلي');
    });
  });

  describe('updateGoalProgress', () => {
    it('updates goal and returns progress', async () => {
      const result = await service.updateGoalProgress('prog1', 'g1', 75);

      expect(result.success).toBe(true);
      expect(result.data.overall_progress).toBe(60);
    });

    it('throws on invalid percentage', async () => {
      await expect(service.updateGoalProgress('prog1', 'g1', 150)).rejects.toThrow('حدث خطأ داخلي');
    });

    it('throws on negative percentage', async () => {
      await expect(service.updateGoalProgress('prog1', 'g1', -5)).rejects.toThrow('حدث خطأ داخلي');
    });
  });

  describe('generateProgressReport', () => {
    it('returns progress report', async () => {
      const result = await service.generateProgressReport('prog1');

      expect(result.success).toBe(true);
      expect(result.data.progress).toBe(60);
    });
  });

  describe('getProgramOutcomes', () => {
    it('returns outcomes', async () => {
      RehabilitationProgram.getProgramOutcomes.mockResolvedValue({ outcomes: [] });

      const result = await service.getProgramOutcomes('prog1');

      expect(result.success).toBe(true);
    });
  });

  describe('dischargeProgram', () => {
    it('sets program to discharged with FIM gain', async () => {
      const result = await service.dischargeProgram('prog1', {
        discharge_reason: 'completed',
        discharge_summary: 'Full recovery',
        follow_up_plan: 'Monthly check',
        discharge_fim: 80,
      });

      expect(result.success).toBe(true);
      expect(mockProgramInstance.program_status).toBe('discharged');
      expect(mockProgramInstance.functional_independence_gain.discharge_fim).toBe(80);
      expect(mockProgramInstance.functional_independence_gain.fim_gain).toBe(30); // 80 - 50
    });
  });

  describe('getProgramsReadyForDischarge', () => {
    it('returns programs list', async () => {
      RehabilitationProgram.getProgramsReadyForDischarge.mockResolvedValue([mockProgramInstance]);

      const result = await service.getProgramsReadyForDischarge();

      expect(result.success).toBe(true);
      expect(result.count).toBe(1);
    });
  });

  describe('getActiveProgramsForBeneficiary', () => {
    it('returns active programs', async () => {
      RehabilitationProgram.find.mockResolvedValue([mockProgramInstance]);

      const result = await service.getActiveProgramsForBeneficiary('b1');

      expect(result.success).toBe(true);
      expect(result.count).toBe(1);
    });
  });

  // ── ANALYTICS & REPORTING ────────────────────────────────────────

  describe('getRehabilitationStatistics', () => {
    it('aggregates statistics', async () => {
      RehabilitationProgram.countDocuments
        .mockResolvedValueOnce(10) // active
        .mockResolvedValueOnce(5) // discharged
        .mockResolvedValueOnce(3); // completed
      RehabilitationProgram.getDisabilityTypeStatistics.mockResolvedValue([]);
      DisabilityAssessment.getReadyForRehabilitationCount.mockResolvedValue(7);

      const result = await service.getRehabilitationStatistics();

      expect(result.success).toBe(true);
      expect(result.data.total_programs).toBe(18);
      expect(result.data.ready_for_rehabilitation).toBe(7);
    });
  });

  describe('getProgramEffectivenessMetrics', () => {
    it('calculates effectiveness metrics', async () => {
      const result = await service.getProgramEffectivenessMetrics('prog1');

      expect(result.success).toBe(true);
      expect(result.data.goal_achievement_rate).toBe(60); // 3/5*100
      expect(result.data.fim_gain).toBe(25);
      expect(result.data.compliance_rate).toBe(85);
    });
  });

  describe('getTherapySessionDetails', () => {
    it('returns session by number', async () => {
      const result = await service.getTherapySessionDetails('prog1', 1);

      expect(result.success).toBe(true);
      expect(result.data.session_number).toBe(1);
    });

    it('throws when session not found', async () => {
      await expect(service.getTherapySessionDetails('prog1', 99)).rejects.toThrow('حدث خطأ داخلي');
    });
  });

  describe('compareOutcomeMeasures', () => {
    it('compares baseline vs discharge', async () => {
      const result = await service.compareOutcomeMeasures('prog1');

      expect(result.success).toBe(true);
      expect(result.data.improvements).toHaveLength(1);
      expect(result.data.improvements[0].improvement).toBe(25);
    });

    it('throws when measures missing', async () => {
      const noMeasures = {
        ...mockProgramInstance,
        outcome_measures: {},
      };
      RehabilitationProgram.findById.mockResolvedValue(noMeasures);

      await expect(service.compareOutcomeMeasures('prog1')).rejects.toThrow('حدث خطأ داخلي');
    });
  });

  describe('getTherapistCaseload', () => {
    it('returns caseload', async () => {
      RehabilitationProgram.find.mockResolvedValue([mockProgramInstance]);

      const result = await service.getTherapistCaseload('t1');

      expect(result.success).toBe(true);
      expect(result.caseload_size).toBe(1);
      expect(result.programs[0].program_code).toBe('RP-001');
    });
  });

  describe('searchRehabilitationData', () => {
    it('searches with keyword', async () => {
      const mockQuery = { limit: jest.fn().mockResolvedValue([]) };
      DisabilityAssessment.find.mockReturnValue(mockQuery);
      RehabilitationProgram.find.mockReturnValue(mockQuery);

      const result = await service.searchRehabilitationData({ keyword: 'test' });

      expect(result.success).toBe(true);
      expect(result.assessments_count).toBe(0);
      expect(result.programs_count).toBe(0);
    });

    it('searches with all filters', async () => {
      const mockQuery = { limit: jest.fn().mockResolvedValue([mockAssessmentInstance]) };
      DisabilityAssessment.find.mockReturnValue(mockQuery);
      RehabilitationProgram.find.mockReturnValue(mockQuery);

      const result = await service.searchRehabilitationData({
        keyword: 'test',
        disability_type: 'physical',
        program_status: 'active',
        date_from: '2025-01-01',
        date_to: '2025-12-31',
      });

      expect(result.success).toBe(true);
    });
  });
});
