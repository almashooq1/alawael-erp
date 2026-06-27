'use strict';

const { SmartAssessmentEngine } = require('../rehabilitation-services/smart-assessment-engine');

describe('SmartAssessmentEngine — behavioral', () => {
  let engine;

  beforeEach(() => {
    engine = new SmartAssessmentEngine();
  });

  describe('measure existence', () => {
    it('scores a known measure', () => {
      const result = engine.score('GMFCS', { level: 2 });
      expect(result.measureKey).toBe('GMFCS');
      expect(result.error).toBeUndefined();
    });

    it('returns error for unknown measure', () => {
      const result = engine.score('UNKNOWN', {});
      expect(result.error).toMatch(/غير موجود/);
    });
  });

  describe('ordinal classification measures', () => {
    it('classifies GMFCS level 1', () => {
      const result = engine.score('GMFCS', { level: 1 });
      expect(result.rawScore).toBe(1);
      expect(result.classification.level).toBe(1);
      expect(result.isValid).toBe(true);
    });

    it('marks invalid GMFCS level', () => {
      const result = engine.score('GMFCS', { level: 99 });
      expect(result.isValid).toBe(false);
      expect(result.classification).toBeNull();
    });

    it('sets null interpretation for ordinal classification', () => {
      const result = engine.score('GMFCS', { level: 3 });
      expect(result.interpretation).toBeNull();
    });
  });

  describe('rating scale measures', () => {
    it('sums FIM item ratings', () => {
      const responses = {
        FC_EAT: 7,
        FC_GROOM: 6,
        FC_BATH: 5,
        FC_DRESS_UP: 6,
        FC_DRESS_LO: 5,
        FC_TOILET: 6,
        FC_BLADDER: 6,
        FC_BOWEL: 5,
        FC_TR_BED: 6,
        FC_TR_TOILET: 5,
        FC_TR_TUB: 4,
        FC_WALK: 5,
        FC_STAIRS: 4,
        FC_COMP: 6,
        FC_EXPR: 5,
        FC_SOCIAL: 5,
        FC_PROBLEM: 4,
        FC_MEMORY: 5,
      };
      const result = engine.score('FIM', responses);
      expect(result.rawScore).toBe(95);
      expect(result.domainScores).toBeDefined();
    });

    it('interprets FIM total score', () => {
      const responses = Object.fromEntries(
        [
          'FC_EAT',
          'FC_GROOM',
          'FC_BATH',
          'FC_DRESS_UP',
          'FC_DRESS_LO',
          'FC_TOILET',
          'FC_BLADDER',
          'FC_BOWEL',
          'FC_TR_BED',
          'FC_TR_TOILET',
          'FC_TR_TUB',
          'FC_WALK',
          'FC_STAIRS',
          'FC_COMP',
          'FC_EXPR',
          'FC_SOCIAL',
          'FC_PROBLEM',
          'FC_MEMORY',
        ].map(id => [id, 7])
      );
      const result = engine.score('FIM', responses);
      expect(result.rawScore).toBe(126);
      expect(result.interpretation.tier).toBe('independent');
    });
  });

  describe('CARS2 special handling', () => {
    it('sums CARS2 ST item ratings', () => {
      const responses = {
        C_RELATIONSHIP: 2,
        C_IMITATION: 2,
        C_AFFECT: 2,
        C_BODY: 2,
        C_OBJECT: 2,
        C_ADAPT: 2,
        C_VIS_RESPONSE: 2,
        C_AUD_RESPONSE: 2,
        C_TASTE_SMELL: 2,
        C_FEAR: 2,
        C_VERBAL: 2,
        C_NONVERBAL: 2,
        C_COGNITIVE: 2,
        C_GENERAL: 2,
        C_ACTIVITY: 2,
      };
      const result = engine.score('CARS2', responses, { form: 'ST' });
      expect(result.rawScore).toBe(30);
    });

    it('uses provided total when responses.total is present', () => {
      const result = engine.score('CARS2', { total: 42 }, { form: 'ST' });
      expect(result.rawScore).toBe(42);
    });

    it('interprets CARS2 ST total as mild-moderate', () => {
      const result = engine.score('CARS2', { total: 33 }, { form: 'ST' });
      expect(result.interpretation.tier).toBe('mild_moderate');
    });

    it('interprets CARS2 ST total as severe', () => {
      const result = engine.score('CARS2', { total: 40 }, { form: 'ST' });
      expect(result.interpretation.tier).toBe('severe');
    });

    it('defaults CARS2 form to ST', () => {
      const result = engine.score('CARS2', { total: 20 });
      expect(result.rawScore).toBe(20);
      expect(result.interpretation.tier).toBe('minimal');
    });
  });

  describe('binary measures', () => {
    it('counts CSI yes responses', () => {
      const responses = {
        CS_SLEEP: 1,
        CS_INCONVENIENT: 0,
        CS_PHYSICAL: 1,
        CS_CONFINED: 1,
        CS_FAMILY: 0,
        CS_EMOTIONAL: 1,
        CS_UPSET: 0,
        CS_WORK: 1,
      };
      const result = engine.score('CSI', responses);
      expect(result.rawScore).toBe(5);
    });

    it('interprets CSI score above cutoff', () => {
      const responses = Object.fromEntries(
        [
          'CS_SLEEP',
          'CS_INCONVENIENT',
          'CS_PHYSICAL',
          'CS_CONFINED',
          'CS_FAMILY',
          'CS_EMOTIONAL',
          'CS_UPSET',
          'CS_WORK',
          'CS_FINANCIAL',
          'CS_OVERWHELMED',
          'CS_ISOLATION',
          'CS_TIME',
          'CS_OTHER',
        ].map(id => [id, 1])
      );
      const result = engine.score('CSI', responses);
      expect(result.rawScore).toBe(13);
      expect(result.interpretation.tier).toBe('high');
    });
  });

  describe('battery scoring', () => {
    it('scores multiple measures in a battery', () => {
      const battery = [
        { measureKey: 'GMFCS', responses: { level: 2 } },
        {
          measureKey: 'FIM',
          responses: {
            FC_EAT: 7,
            FC_GROOM: 7,
            FC_BATH: 7,
            FC_DRESS_UP: 7,
            FC_DRESS_LO: 7,
            FC_TOILET: 7,
            FC_BLADDER: 7,
            FC_BOWEL: 7,
            FC_TR_BED: 7,
            FC_TR_TOILET: 7,
            FC_TR_TUB: 7,
            FC_WALK: 7,
            FC_STAIRS: 7,
            FC_COMP: 7,
            FC_EXPR: 7,
            FC_SOCIAL: 7,
            FC_PROBLEM: 7,
            FC_MEMORY: 7,
          },
        },
      ];
      const result = engine.scoreBattery(battery);
      expect(result.batteryResults.length).toBe(2);
      expect(result.crossAnalysis).toBeDefined();
    });

    it('returns overall recommendations and priority goals from battery', () => {
      const result = engine.scoreBattery([{ measureKey: 'GMFCS', responses: { level: 3 } }]);
      expect(result.overallRecommendations).toBeDefined();
      expect(result.priorityGoals).toBeDefined();
    });
  });

  describe('recommendations and goals', () => {
    it('returns smart recommendations for GMFCS level 5', () => {
      const result = engine.score('GMFCS', { level: 5 });
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('returns SMART goals for FIM independent tier', () => {
      const responses = Object.fromEntries(
        [
          'FC_EAT',
          'FC_GROOM',
          'FC_BATH',
          'FC_DRESS_UP',
          'FC_DRESS_LO',
          'FC_TOILET',
          'FC_BLADDER',
          'FC_BOWEL',
          'FC_TR_BED',
          'FC_TR_TOILET',
          'FC_TR_TUB',
          'FC_WALK',
          'FC_STAIRS',
          'FC_COMP',
          'FC_EXPR',
          'FC_SOCIAL',
          'FC_PROBLEM',
          'FC_MEMORY',
        ].map(id => [id, 7])
      );
      const result = engine.score('FIM', responses);
      expect(result.smartGoals.length).toBeGreaterThan(0);
    });

    it('computes clinical flags', () => {
      const result = engine.score('FIM', {
        FC_EAT: 1,
        FC_GROOM: 1,
        FC_BATH: 1,
        FC_DRESS_UP: 1,
        FC_DRESS_LO: 1,
        FC_TOILET: 1,
        FC_BLADDER: 1,
        FC_BOWEL: 1,
        FC_TR_BED: 1,
        FC_TR_TOILET: 1,
        FC_TR_TUB: 1,
        FC_WALK: 1,
        FC_STAIRS: 1,
        FC_COMP: 1,
        FC_EXPR: 1,
        FC_SOCIAL: 1,
        FC_PROBLEM: 1,
        FC_MEMORY: 1,
      });
      expect(result.flags).toBeDefined();
    });
  });
});
