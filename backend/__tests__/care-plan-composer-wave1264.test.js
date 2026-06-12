'use strict';

/**
 * W1264 — مؤلّف الخطة الذكي (smart plan composer).
 *
 * PURE composition tests over a realistic suggestForBeneficiary fixture:
 *   1. Goals come ONLY from GoalBank texts (refuse-to-fabricate), typed via
 *      faithful maps into UnifiedCarePlan's goalRef enums, with Arabic `why`.
 *   2. Programs are evidence-ranked from the REAL registry, deduped, mapped
 *      into intervention.domain enums, contraindications surfaced (never
 *      silently passed).
 *   3. Priority is NEVER inferred (always 'medium' — the therapist's call).
 *   4. Faithful-or-absent: empty libraries → empty sections + notes.
 *   5. Every mapped enum value is valid against the live UnifiedCarePlan
 *      schema (cross-file sync guard).
 */

jest.unmock('mongoose');

const composer = require('../services/carePlanComposer.service');
const { unifiedCarePlanSchema } = require('../domains/care-plans/models/UnifiedCarePlan');

function fixtureSuggestion() {
  return {
    bundleVersion: 3,
    beneficiary: { id: 'b1', disabilityType: 'autism', age: 5, branchId: 'br1' },
    bundle: {
      key: 'autism',
      titleAr: 'حزمة اضطراب طيف التوحد',
      titleEn: 'Autism pathway',
      pathwayType: 'AUTISM',
      guidanceAssessments: ['CARS-2', 'VB-MAPP'],
      interventionsAr: ['تدخل سلوكي مكثف'],
      defaultStages: [],
    },
    resolved: {
      measures: [
        { code: 'VBMAPP', name: 'VB-MAPP', name_ar: 'تقييم سلوك اللغة', category: 'speech' },
      ],
      goalTemplates: [
        {
          domain: 'SPEECH',
          category: 'Requesting',
          description: 'يطلب الطفل غرضاً مفضلاً باستخدام كلمة واحدة واضحة في 4 من 5 فرص منظمة',
          difficulty: 'BEGINNER',
          measurementCriteria: '4 من 5 فرص',
          targetAgeMin: 2,
          targetAgeMax: 6,
        },
        {
          domain: 'LIFE_SKILLS',
          category: 'Hand Washing',
          description: 'يغسل يديه متبعاً الخطوات الخمس باستقلالية في 4 من 5 مرات مرصودة',
          difficulty: 'BEGINNER',
          measurementCriteria: '4 من 5 مرات',
          targetAgeMin: 3,
          targetAgeMax: 9,
        },
        {
          domain: 'BEHAVIORAL',
          category: 'Waiting',
          description: 'ينتظر دوره لمدة دقيقتين باستخدام أداة انتظار مرئية دون سلوك اعتراضي',
          difficulty: 'INTERMEDIATE',
          measurementCriteria: 'دقيقتان × 4 من 5',
          targetAgeMin: 3,
          targetAgeMax: 10,
        },
      ],
    },
    existingPathwayId: null,
    notes: [],
  };
}

describe('W1264 composition — goals', () => {
  const out = composer.composeDraftFromSuggestion(fixtureSuggestion());

  test('every proposed goal is a GoalBank text with faithful type mapping + Arabic why', () => {
    expect(out.ok).toBe(true);
    const goals = out.proposal.globalGoals;
    expect(goals).toHaveLength(3);
    expect(goals[0].title).toContain('يطلب الطفل');
    expect(goals[0].type).toBe('speech');
    expect(goals[1].type).toBe('life_skill');
    expect(goals[2].type).toBe('behavioral');
    for (const g of goals) {
      expect(g.priority).toBe('medium'); // never inferred
      expect(g.why).toMatch(/مناسب للعمر 5/);
      expect(g.criteria).toBeTruthy();
    }
  });

  test('proposal carries the review disclaimer (never auto-adopted)', () => {
    expect(out.disclaimerAr).toContain('لا تُعتمد آلياً');
  });
});

describe('W1264 composition — programs (real registry)', () => {
  const out = composer.composeDraftFromSuggestion(fixtureSuggestion());

  test('interventions are evidence-ranked, deduped, and enum-mapped', () => {
    const ivs = out.proposal.globalInterventions;
    expect(ivs.length).toBeGreaterThan(0);
    const ids = ivs.map(i => i.title);
    expect(new Set(ids).size).toBe(ids.length); // dedupe
    for (const iv of ivs) {
      expect(iv.evidence).toMatch(/دليل|strong|moderate/);
      expect(iv.frequency).toMatch(/جلسة\/أسبوع/);
      expect(iv.why).toMatch(/موصى به لمجال/);
    }
  });

  test('contraindications are surfaced, never silently passed', () => {
    const withContra = out.proposal.globalInterventions.filter(iv => iv.why.includes('⚠ موانع'));
    const withoutContra = out.proposal.globalInterventions.filter(iv =>
      iv.why.includes('لا موانع مسجلة')
    );
    expect(withContra.length + withoutContra.length).toBe(out.proposal.globalInterventions.length);
  });
});

describe('W1264 enum sync with the live UnifiedCarePlan schema', () => {
  test('goalRef.type map targets only valid enum values', () => {
    const typeEnum = unifiedCarePlanSchema.path('globalGoals').schema.path('type').enumValues;
    for (const v of Object.values(composer.GOALBANK_TO_GOALREF_TYPE)) {
      expect(typeEnum).toContain(v);
    }
  });

  test('intervention.domain map targets only valid enum values', () => {
    const domainEnum = unifiedCarePlanSchema
      .path('globalInterventions')
      .schema.path('domain').enumValues;
    for (const v of Object.values(composer.MODALITY_TO_INTERVENTION_DOMAIN)) {
      expect(domainEnum).toContain(v);
    }
  });
});

describe('W1264 faithful-or-absent', () => {
  test('empty libraries → empty sections + explanatory note, no filler', () => {
    const empty = composer.composeDraftFromSuggestion({
      beneficiary: { id: 'b2', age: 4 },
      bundle: { key: 'other', titleAr: 'عام', guidanceAssessments: [], interventionsAr: [] },
      resolved: { measures: [], goalTemplates: [] },
      notes: [],
    });
    expect(empty.ok).toBe(true);
    expect(empty.proposal.globalGoals).toEqual([]);
    expect(empty.proposal.globalInterventions).toEqual([]);
    expect(empty.notes.some(n => n.includes('بنك الأهداف'))).toBe(true);
  });

  test('invalid input fails closed', () => {
    expect(composer.composeDraftFromSuggestion(null).ok).toBe(false);
  });
});
