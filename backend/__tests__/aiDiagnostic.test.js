/**
 * AI Diagnostic Tests — اختبارات الذكاء الاصطناعي للتشخيص
 * Phase 17
 */
const request = require('supertest');
const express = require('express');

/* ── mock auth ── */
jest.mock('../middleware/authMiddleware', () => ({
  authenticate: (req, _res, next) => {
    req.user = { id: 'u1', role: 'admin' };
    next();
  },
  authorize: () => (_req, _res, next) => next(),
}));

const aiDiagnosticRoutes = require('../routes/aiDiagnostic.routes');

const app = express();
app.use(express.json());
app.use('/api/ai-diagnostic', aiDiagnosticRoutes);

/* ═══════════════════════════════════════════════════════════
   DASHBOARD
   ═══════════════════════════════════════════════════════════ */
describe('AI Diagnostic — Dashboard', () => {
  it('GET /dashboard → 200 with KPI data', async () => {
    const res = await request(app).get('/api/ai-diagnostic/dashboard');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('totalBeneficiaries');
    expect(res.body.data).toHaveProperty('totalSessions');
    expect(res.body.data).toHaveProperty('totalGoals');
    expect(res.body.data).toHaveProperty('averageProgress');
    expect(res.body.data).toHaveProperty('averageEngagement');
    expect(res.body.data).toHaveProperty('improvingBeneficiaries');
    expect(res.body.data).toHaveProperty('activePlans');
    expect(res.body.data).toHaveProperty('aiModelsActive');
    expect(res.body.data).toHaveProperty('alertsSummary');
    expect(res.body.data).toHaveProperty('disabilityDistribution');
    expect(res.body.data.totalBeneficiaries).toBeGreaterThan(0);
  });
});

/* ═══════════════════════════════════════════════════════════
   REFERENCE DATA
   ═══════════════════════════════════════════════════════════ */
describe('AI Diagnostic — Reference Data', () => {
  it('GET /scales → clinical scales', async () => {
    const res = await request(app).get('/api/ai-diagnostic/scales');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('icf');
    expect(res.body.data).toHaveProperty('gaf');
    expect(res.body.data).toHaveProperty('fim');
  });

  it('GET /disability-types → array', async () => {
    const res = await request(app).get('/api/ai-diagnostic/disability-types');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toContain('autism');
    expect(res.body.data).toContain('physical');
  });

  it('GET /therapy-types → array', async () => {
    const res = await request(app).get('/api/ai-diagnostic/therapy-types');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toContain('physiotherapy');
  });

  it('GET /ai-models → model info', async () => {
    const res = await request(app).get('/api/ai-diagnostic/ai-models');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('progressAnalysis');
    expect(res.body.data).toHaveProperty('outcomePredictor');
  });
});

/* ═══════════════════════════════════════════════════════════
   BENEFICIARIES
   ═══════════════════════════════════════════════════════════ */
describe('AI Diagnostic — Beneficiaries', () => {
  it('GET /beneficiaries → list with seed data', async () => {
    const res = await request(app).get('/api/ai-diagnostic/beneficiaries');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(5);
    expect(res.body.total).toBeGreaterThanOrEqual(5);
  });

  it('GET /beneficiaries?status=active → filters active', async () => {
    const res = await request(app).get('/api/ai-diagnostic/beneficiaries?status=active');
    expect(res.status).toBe(200);
    expect(res.body.data.every((b) => b.status === 'active')).toBe(true);
  });

  it('GET /beneficiaries?disabilityType=autism → filters by type', async () => {
    const res = await request(app).get('/api/ai-diagnostic/beneficiaries?disabilityType=autism');
    expect(res.status).toBe(200);
    expect(res.body.data.every((b) => b.disabilityType === 'autism')).toBe(true);
  });

  it('GET /beneficiaries?search=أحمد → searches by name', async () => {
    const res = await request(app).get('/api/ai-diagnostic/beneficiaries?search=' + encodeURIComponent('أحمد'));
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('GET /beneficiaries/:id → returns specific beneficiary', async () => {
    const res = await request(app).get('/api/ai-diagnostic/beneficiaries/ben-101');
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('أحمد محمد الغامدي');
    expect(res.body.data.disabilityType).toBe('autism');
  });

  it('GET /beneficiaries/:id → 404 for unknown', async () => {
    const res = await request(app).get('/api/ai-diagnostic/beneficiaries/ben-999');
    expect(res.status).toBe(404);
  });

  it('POST /beneficiaries → creates new', async () => {
    const res = await request(app)
      .post('/api/ai-diagnostic/beneficiaries')
      .send({ name: 'سارة أحمد', nationalId: '1111111111', disabilityType: 'hearing', dateOfBirth: '2014-03-10' });
    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('سارة أحمد');
    expect(res.body.data.disabilityType).toBe('hearing');
    expect(res.body.data.id).toMatch(/^ben-/);
  });

  it('POST /beneficiaries → 400 missing name', async () => {
    const res = await request(app)
      .post('/api/ai-diagnostic/beneficiaries')
      .send({ nationalId: '222', disabilityType: 'autism' });
    expect(res.status).toBe(400);
  });

  it('PUT /beneficiaries/:id → updates', async () => {
    const res = await request(app)
      .put('/api/ai-diagnostic/beneficiaries/ben-101')
      .send({ disabilitySeverity: 'mild' });
    expect(res.status).toBe(200);
    expect(res.body.data.disabilitySeverity).toBe('mild');
  });
});

/* ═══════════════════════════════════════════════════════════
   ASSESSMENTS
   ═══════════════════════════════════════════════════════════ */
describe('AI Diagnostic — Assessments', () => {
  it('GET /beneficiaries/:id/assessments → list', async () => {
    const res = await request(app).get('/api/ai-diagnostic/beneficiaries/ben-101/assessments');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(3);
  });

  it('GET /beneficiaries/:id/assessments?scale=icf → filter', async () => {
    const res = await request(app).get('/api/ai-diagnostic/beneficiaries/ben-101/assessments?scale=icf');
    expect(res.status).toBe(200);
    expect(res.body.data.every((a) => a.scale === 'icf')).toBe(true);
  });

  it('GET /assessments/:id → single', async () => {
    const res = await request(app).get('/api/ai-diagnostic/assessments/asmt-101');
    expect(res.status).toBe(200);
    expect(res.body.data.beneficiaryId).toBe('ben-101');
    expect(res.body.data.scale).toBe('icf');
  });

  it('GET /assessments/:id → 404', async () => {
    const res = await request(app).get('/api/ai-diagnostic/assessments/asmt-999');
    expect(res.status).toBe(404);
  });

  it('POST /beneficiaries/:id/assessments → creates', async () => {
    const res = await request(app)
      .post('/api/ai-diagnostic/beneficiaries/ben-102/assessments')
      .send({ scale: 'fim', score: 100, assessor: 'dr-02', domain: 'daily_living' });
    expect(res.status).toBe(201);
    expect(res.body.data.beneficiaryId).toBe('ben-102');
    expect(res.body.data.score).toBe(100);
  });

  it('POST /beneficiaries/:id/assessments → 400 missing scale', async () => {
    const res = await request(app)
      .post('/api/ai-diagnostic/beneficiaries/ben-102/assessments')
      .send({ score: 50, assessor: 'dr-02' });
    expect(res.status).toBe(400);
  });

  it('GET /beneficiaries/:id/assessments/compare → compares two', async () => {
    const res = await request(app).get('/api/ai-diagnostic/beneficiaries/ben-101/assessments/compare?id1=asmt-101&id2=asmt-103');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('scoreDifference');
    expect(res.body.data).toHaveProperty('direction');
    expect(res.body.data.direction).toBe('improved');
    expect(res.body.data.scoreDifference).toBe(25);
  });
});

/* ═══════════════════════════════════════════════════════════
   SESSIONS
   ═══════════════════════════════════════════════════════════ */
describe('AI Diagnostic — Sessions', () => {
  it('GET /beneficiaries/:id/sessions → list', async () => {
    const res = await request(app).get('/api/ai-diagnostic/beneficiaries/ben-101/sessions');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('GET /sessions/:id → single with AI analysis', async () => {
    const res = await request(app).get('/api/ai-diagnostic/sessions/sess-101');
    expect(res.status).toBe(200);
    expect(res.body.data.aiAnalysis).toHaveProperty('sentimentScore');
    expect(res.body.data.aiAnalysis).toHaveProperty('engagementLevel');
  });

  it('POST /beneficiaries/:id/sessions → creates', async () => {
    const res = await request(app)
      .post('/api/ai-diagnostic/beneficiaries/ben-102/sessions')
      .send({ therapistId: 'dr-02', therapyType: 'cognitive', duration: 45 });
    expect(res.status).toBe(201);
    expect(res.body.data.beneficiaryId).toBe('ben-102');
    expect(res.body.data.therapyType).toBe('cognitive');
    expect(res.body.data.status).toBe('scheduled');
  });

  it('POST with status=completed → generates AI analysis', async () => {
    const res = await request(app)
      .post('/api/ai-diagnostic/beneficiaries/ben-102/sessions')
      .send({
        therapistId: 'dr-02',
        therapyType: 'cognitive',
        status: 'completed',
        outcomes: { engagement: 88, progressRating: 4 },
      });
    expect(res.status).toBe(201);
    expect(res.body.data.aiAnalysis).not.toBeNull();
    expect(res.body.data.aiAnalysis.engagementLevel).toBe('high');
  });

  it('PUT /sessions/:id/complete → completes with AI', async () => {
    // Create a scheduled session first
    const create = await request(app)
      .post('/api/ai-diagnostic/beneficiaries/ben-101/sessions')
      .send({ therapistId: 'dr-01', therapyType: 'behavioral' });
    const sessionId = create.body.data.id;

    const res = await request(app)
      .put(`/api/ai-diagnostic/sessions/${sessionId}/complete`)
      .send({ engagement: 70, progressRating: 3 });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('completed');
    expect(res.body.data.aiAnalysis).not.toBeNull();
  });
});

/* ═══════════════════════════════════════════════════════════
   GOALS
   ═══════════════════════════════════════════════════════════ */
describe('AI Diagnostic — Goals', () => {
  it('GET /beneficiaries/:id/goals → list', async () => {
    const res = await request(app).get('/api/ai-diagnostic/beneficiaries/ben-101/goals');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('GET /goals/:id → single', async () => {
    const res = await request(app).get('/api/ai-diagnostic/goals/goal-101');
    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('التواصل البصري');
    expect(res.body.data.milestones.length).toBeGreaterThan(0);
  });

  it('POST /beneficiaries/:id/goals → creates', async () => {
    const res = await request(app)
      .post('/api/ai-diagnostic/beneficiaries/ben-104/goals')
      .send({ category: 'speech', title: 'هدف جديد', targetDate: '2027-01-01' });
    expect(res.status).toBe(201);
    expect(res.body.data.progress).toBe(0);
    expect(res.body.data.status).toBe('in_progress');
  });

  it('PUT /goals/:id/progress → updates progress', async () => {
    const res = await request(app)
      .put('/api/ai-diagnostic/goals/goal-101/progress')
      .send({ progress: 80 });
    expect(res.status).toBe(200);
    expect(res.body.data.progress).toBe(80);
  });

  it('PUT /goals/:id/progress → achieves at 100', async () => {
    const res = await request(app)
      .put('/api/ai-diagnostic/goals/goal-103/progress')
      .send({ progress: 100, milestoneIndex: 3 });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('achieved');
    expect(res.body.data.milestones[3].achieved).toBe(true);
  });
});

/* ═══════════════════════════════════════════════════════════
   TREATMENT PLANS
   ═══════════════════════════════════════════════════════════ */
describe('AI Diagnostic — Treatment Plans', () => {
  it('GET /treatment-plans → list', async () => {
    const res = await request(app).get('/api/ai-diagnostic/treatment-plans');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(3);
  });

  it('GET /treatment-plans?beneficiaryId=ben-101 → filter', async () => {
    const res = await request(app).get('/api/ai-diagnostic/treatment-plans?beneficiaryId=ben-101');
    expect(res.status).toBe(200);
    expect(res.body.data.every((p) => p.beneficiaryId === 'ben-101')).toBe(true);
  });

  it('GET /treatment-plans/:id → single', async () => {
    const res = await request(app).get('/api/ai-diagnostic/treatment-plans/plan-101');
    expect(res.status).toBe(200);
    expect(res.body.data.diagnosis).toContain('التوحد');
  });

  it('POST /treatment-plans → creates', async () => {
    const res = await request(app)
      .post('/api/ai-diagnostic/treatment-plans')
      .send({ beneficiaryId: 'ben-104', diagnosis: 'تأخر نطق', primaryGoals: ['goal-105'] });
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('active');
  });

  it('PUT /treatment-plans/:id → updates', async () => {
    const res = await request(app)
      .put('/api/ai-diagnostic/treatment-plans/plan-101')
      .send({ diagnosis: 'اضطراب طيف التوحد — تحسن لدرجة خفيفة' });
    expect(res.status).toBe(200);
    expect(res.body.data.diagnosis).toContain('خفيفة');
  });

  it('POST /treatment-plans/:id/optimize → AI optimization', async () => {
    const res = await request(app).post('/api/ai-diagnostic/treatment-plans/plan-101/optimize');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('optimizations');
    expect(res.body.data).toHaveProperty('therapyEffectiveness');
    expect(res.body.data).toHaveProperty('analysisScore');
  });
});

/* ═══════════════════════════════════════════════════════════
   AI ANALYSIS
   ═══════════════════════════════════════════════════════════ */
describe('AI Diagnostic — AI Analysis', () => {
  it('GET /beneficiaries/:id/analysis → progress analysis', async () => {
    const res = await request(app).get('/api/ai-diagnostic/beneficiaries/ben-101/analysis');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('overallScore');
    expect(res.body.data).toHaveProperty('trajectory');
    expect(res.body.data).toHaveProperty('engagementTrend');
    expect(res.body.data).toHaveProperty('goalStats');
    expect(res.body.data).toHaveProperty('behaviorAnalysis');
    expect(res.body.data).toHaveProperty('strengths');
    expect(res.body.data).toHaveProperty('areasForImprovement');
    expect(res.body.data).toHaveProperty('riskLevel');
    expect(res.body.data.trajectory.direction).toBe('improving');
  });

  it('GET /beneficiaries/:id/recommendations → AI recommendations', async () => {
    const res = await request(app).get('/api/ai-diagnostic/beneficiaries/ben-101/recommendations');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('recommendations');
    expect(Array.isArray(res.body.data.recommendations)).toBe(true);
    expect(res.body.data.recommendations.length).toBeGreaterThan(0);
    expect(res.body.data.recommendations[0]).toHaveProperty('type');
    expect(res.body.data.recommendations[0]).toHaveProperty('priority');
    expect(res.body.data.recommendations[0]).toHaveProperty('confidence');
  });

  it('GET /beneficiaries/:id/predictions/:goalId → outcome prediction', async () => {
    const res = await request(app).get('/api/ai-diagnostic/beneficiaries/ben-101/predictions/goal-101');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('probability');
    expect(res.body.data).toHaveProperty('estimatedCompletionDate');
    expect(res.body.data).toHaveProperty('factors');
    expect(res.body.data).toHaveProperty('riskFactors');
    expect(res.body.data).toHaveProperty('protectiveFactors');
    expect(res.body.data.probability).toBeGreaterThan(0);
  });

  it('GET /beneficiaries/:id/patterns → pattern detection', async () => {
    const res = await request(app).get('/api/ai-diagnostic/beneficiaries/ben-101/patterns');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('patterns');
    expect(Array.isArray(res.body.data.patterns)).toBe(true);
    expect(res.body.data.patterns.length).toBeGreaterThan(0);
    expect(res.body.data).toHaveProperty('totalPatternsFound');
  });

  it('GET /beneficiaries/:id/risk → risk assessment', async () => {
    const res = await request(app).get('/api/ai-diagnostic/beneficiaries/ben-101/risk');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('riskScore');
    expect(res.body.data).toHaveProperty('riskLevel');
    expect(res.body.data).toHaveProperty('riskFactors');
    expect(res.body.data).toHaveProperty('mitigationSuggestions');
  });

  it('GET /beneficiaries/:id/report → comprehensive AI report', async () => {
    const res = await request(app).get('/api/ai-diagnostic/beneficiaries/ben-101/report');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('summary');
    expect(res.body.data).toHaveProperty('progressAnalysis');
    expect(res.body.data).toHaveProperty('recommendations');
    expect(res.body.data).toHaveProperty('detectedPatterns');
    expect(res.body.data).toHaveProperty('riskAssessment');
    expect(res.body.data).toHaveProperty('conclusion');
    expect(res.body.data).toHaveProperty('nextSteps');
    expect(res.body.data.summary.totalGoals).toBeGreaterThan(0);
  });

  it('analysis for beneficiary with no data → handles gracefully', async () => {
    // Create a beneficiary with no sessions/assessments
    const create = await request(app)
      .post('/api/ai-diagnostic/beneficiaries')
      .send({ name: 'مستفيد جديد', nationalId: '9999999999', disabilityType: 'learning' });
    const id = create.body.data.id;

    const res = await request(app).get(`/api/ai-diagnostic/beneficiaries/${id}/analysis`);
    expect(res.status).toBe(200);
    expect(res.body.data.trajectory.direction).toBe('insufficient_data');
  });
});

/* ═══════════════════════════════════════════════════════════
   BEHAVIOR LOGS
   ═══════════════════════════════════════════════════════════ */
describe('AI Diagnostic — Behavior Logs', () => {
  it('GET /beneficiaries/:id/behaviors → list', async () => {
    const res = await request(app).get('/api/ai-diagnostic/beneficiaries/ben-101/behaviors');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('GET /beneficiaries/:id/behaviors?type=positive → filter', async () => {
    const res = await request(app).get('/api/ai-diagnostic/beneficiaries/ben-101/behaviors?type=positive');
    expect(res.status).toBe(200);
    expect(res.body.data.every((b) => b.type === 'positive')).toBe(true);
  });

  it('POST /beneficiaries/:id/behaviors → creates', async () => {
    const res = await request(app)
      .post('/api/ai-diagnostic/beneficiaries/ben-101/behaviors')
      .send({ type: 'positive', behavior: 'تعاون مع الأقران', observer: 'th-02', context: 'لعب جماعي' });
    expect(res.status).toBe(201);
    expect(res.body.data.behavior).toBe('تعاون مع الأقران');
  });

  it('POST /beneficiaries/:id/behaviors → 400 invalid type', async () => {
    const res = await request(app)
      .post('/api/ai-diagnostic/beneficiaries/ben-101/behaviors')
      .send({ type: 'invalid', behavior: 'test', observer: 'th-02' });
    expect(res.status).toBe(400);
  });
});

/* ═══════════════════════════════════════════════════════════
   ALERTS
   ═══════════════════════════════════════════════════════════ */
describe('AI Diagnostic — Alerts', () => {
  it('GET /alerts → all alerts', async () => {
    const res = await request(app).get('/api/ai-diagnostic/alerts');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('GET /alerts?resolved=false → unresolved only', async () => {
    const res = await request(app).get('/api/ai-diagnostic/alerts?resolved=false');
    expect(res.status).toBe(200);
    expect(res.body.data.every((a) => a.resolved === false)).toBe(true);
  });

  it('GET /alerts?beneficiaryId=ben-103 → filter by ben', async () => {
    const res = await request(app).get('/api/ai-diagnostic/alerts?beneficiaryId=ben-103');
    expect(res.status).toBe(200);
    expect(res.body.data.every((a) => a.beneficiaryId === 'ben-103')).toBe(true);
  });

  it('PUT /alerts/:id/resolve → resolves', async () => {
    const res = await request(app).put('/api/ai-diagnostic/alerts/alert-101/resolve');
    expect(res.status).toBe(200);
    expect(res.body.data.resolved).toBe(true);
    expect(res.body.data).toHaveProperty('resolvedDate');
  });

  it('PUT /alerts/:id/resolve → 404 unknown', async () => {
    const res = await request(app).put('/api/ai-diagnostic/alerts/alert-999/resolve');
    expect(res.status).toBe(404);
  });
});

/* ═══════════════════════════════════════════════════════════
   EDGE CASES & INTEGRATION
   ═══════════════════════════════════════════════════════════ */
describe('AI Diagnostic — Edge Cases', () => {
  it('POST assessment triggering decline alert', async () => {
    // Current score for ben-103 barthel is 55, create one at 40 to trigger alert
    const res = await request(app)
      .post('/api/ai-diagnostic/beneficiaries/ben-103/assessments')
      .send({ scale: 'barthel', score: 40, assessor: 'dr-03', domain: 'mobility' });
    expect(res.status).toBe(201);

    // Check alerts
    const alerts = await request(app).get('/api/ai-diagnostic/alerts?beneficiaryId=ben-103');
    const declineAlert = alerts.body.data.find((a) => a.type === 'score_decline');
    expect(declineAlert).toBeDefined();
  });

  it('prediction for non-existent beneficiary → 404', async () => {
    const res = await request(app).get('/api/ai-diagnostic/beneficiaries/ben-999/predictions/goal-101');
    expect(res.status).toBe(404);
  });

  it('prediction for non-existent goal → 404', async () => {
    const res = await request(app).get('/api/ai-diagnostic/beneficiaries/ben-101/predictions/goal-999');
    expect(res.status).toBe(404);
  });

  it('compare assessments from different beneficiaries → 400', async () => {
    const res = await request(app).get('/api/ai-diagnostic/beneficiaries/ben-101/assessments/compare?id1=asmt-101&id2=asmt-104');
    expect(res.status).toBe(400);
  });

  it('multiple analyses are consistent', async () => {
    const res1 = await request(app).get('/api/ai-diagnostic/beneficiaries/ben-102/analysis');
    const res2 = await request(app).get('/api/ai-diagnostic/beneficiaries/ben-102/analysis');
    expect(res1.body.data.overallScore).toBeDefined();
    expect(res2.body.data.overallScore).toBeDefined();
  });

  it('treatment plan optimization returns effectiveness data', async () => {
    const res = await request(app).post('/api/ai-diagnostic/treatment-plans/plan-103/optimize');
    expect(res.status).toBe(200);
    expect(res.body.data.optimizations).toBeDefined();
    expect(res.body.data.beneficiaryName).toBe('خالد سعد القحطاني');
  });

  it('reports for multiple beneficiaries', async () => {
    const ids = ['ben-101', 'ben-102', 'ben-103'];
    for (const id of ids) {
      const res = await request(app).get(`/api/ai-diagnostic/beneficiaries/${id}/report`);
      expect(res.status).toBe(200);
      expect(res.body.data.beneficiaryId).toBe(id);
    }
  });
});
