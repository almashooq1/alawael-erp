/**
 * Research & Evidence-Based Practice — Integration Tests
 * نظام البحث العلمي وقياس الأثر — اختبارات التكامل
 *
 * Tests all 7 sub-modules + authorization:
 *  1. Research Studies
 *  2. Outcome Measures (including seed)
 *  3. Anonymized Datasets
 *  4. Program Effectiveness Reports
 *  5. Benchmarking Reports
 *  6. Research Data Exports (approve / revoke)
 *  7. Dashboard
 *  8. Authorization (role-based access)
 */
const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');

// ─── Models (mocked via jest.setup.js global mock) ─────────────────────────
const ResearchStudy = require('../../models/ResearchStudy');
const OutcomeMeasure = require('../../models/OutcomeMeasure');
const AnonymizedDataset = require('../../models/AnonymizedDataset');
const ProgramEffectiveness = require('../../models/ProgramEffectiveness');
const BenchmarkingReport = require('../../models/BenchmarkingReport');
const ResearchDataExport = require('../../models/ResearchDataExport');

// ─── Build a minimal Express app for testing ───────────────────────────────
const researchRoutes = require('../../routes/research.routes');

const createApp = (userOverrides = {}) => {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = {
      _id: new mongoose.Types.ObjectId(),
      id: new mongoose.Types.ObjectId().toString(),
      role: 'admin',
      email: 'researcher@test.com',
      fullName: 'Test Researcher',
      ...userOverrides,
    };
    next();
  });
  app.use('/api/research', researchRoutes);
  return app;
};

// ─── Helpers ───────────────────────────────────────────────────────────────
const mockId = () => new mongoose.Types.ObjectId().toString();

// Build a chainable query mock (populate, sort, skip, limit, select, lean, exec)
const chainable = resolvedValue => {
  const chain = {
    populate: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    lean: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(resolvedValue),
    then: jest.fn(cb => Promise.resolve(cb(resolvedValue))),
  };
  // Make lean() the terminal — returns the same chain whose .then works
  chain.lean.mockReturnValue(chain);
  return chain;
};

// ─── Sample Data ───────────────────────────────────────────────────────────
const sampleStudy = {
  title: 'Effectiveness of Early Intervention for CP',
  abstract: 'A longitudinal study examining outcomes of early intervention programs.',
  studyType: 'longitudinal',
  principalInvestigator: mockId(),
  methodology: { targetSampleSize: 120 },
  targetPopulation: { disabilityTypes: ['physical'], ageRange: { min: 0, max: 6 } },
};

const sampleMeasure = {
  name: 'Test Functional Scale',
  abbreviation: 'TFS-TEST',
  description: 'A test measure for unit tests',
  category: 'functional-independence',
  domain: 'activities-participation',
  scoringType: 'numeric',
  scoreRange: { min: 0, max: 100 },
  higherScoreMeaning: 'better',
  administrationMethod: 'clinician-rated',
};

const sampleDataset = {
  datasetName: 'CP Early Intervention — Anonymized 2025',
  description: 'Anonymized dataset from 2025 longitudinal study',
  sourceModule: 'early-intervention',
  dateRange: { from: '2025-01-01', to: '2025-12-31' },
  anonymization: { method: 'k-anonymity', kValue: 5, fieldsRemoved: ['name', 'nationalId'] },
  recordCount: 85,
  studyId: mockId(),
};

const sampleEffectiveness = {
  title: 'Early Intervention PT Effectiveness Q4 2025',
  programType: 'physical-therapy',
  evaluationPeriod: { from: '2025-10-01', to: '2025-12-31' },
  sample: { totalParticipants: 60, completedParticipants: 52 },
};

const sampleBenchmark = {
  title: 'National Rehab Benchmarking 2025',
  reportType: 'national',
  period: { from: '2025-01-01', to: '2025-12-31', periodType: 'annual' },
};

// ─── Test Suite ────────────────────────────────────────────────────────────
describe('Research & Evidence-Based Practice API', () => {
  let app;

  beforeAll(() => {
    app = createApp();
  });

  // ── §1 Research Studies ──────────────────────────────────────────────────
  describe('Research Studies — /api/research/studies', () => {
    const studyDoc = { _id: mockId(), ...sampleStudy, isActive: true, createdAt: new Date() };

    beforeEach(() => {
      ResearchStudy.find = jest.fn().mockReturnValue(chainable([studyDoc]));
      ResearchStudy.countDocuments = jest.fn().mockResolvedValue(1);
      ResearchStudy.findById = jest.fn().mockReturnValue(chainable(studyDoc));
      ResearchStudy.create = jest.fn().mockResolvedValue(studyDoc);
      ResearchStudy.findByIdAndUpdate = jest.fn().mockReturnValue(chainable(studyDoc));
    });

    it('POST / — should create a study', async () => {
      const res = await request(app).post('/api/research/studies').send(sampleStudy);
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });

    it('GET / — should list studies', async () => {
      const res = await request(app).get('/api/research/studies');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.pagination).toBeDefined();
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('GET / — should support search query', async () => {
      const res = await request(app).get('/api/research/studies?search=cerebral');
      expect(res.status).toBe(200);
      expect(ResearchStudy.find).toHaveBeenCalled();
    });

    it('GET / — should support status filter', async () => {
      const res = await request(app).get('/api/research/studies?status=draft');
      expect(res.status).toBe(200);
    });

    it('GET / — should support studyType filter', async () => {
      const res = await request(app).get('/api/research/studies?studyType=longitudinal');
      expect(res.status).toBe(200);
    });

    it('GET /:id — should return a study', async () => {
      const res = await request(app).get(`/api/research/studies/${studyDoc._id}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
    });

    it('GET /:id — 404 for non-existent', async () => {
      ResearchStudy.findById = jest.fn().mockReturnValue(chainable(null));
      const res = await request(app).get(`/api/research/studies/${mockId()}`);
      expect(res.status).toBe(404);
    });

    it('PUT /:id — should update a study', async () => {
      const res = await request(app)
        .put(`/api/research/studies/${studyDoc._id}`)
        .send({ status: 'data-collection' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('DELETE /:id — should soft-delete a study', async () => {
      const res = await request(app).delete(`/api/research/studies/${studyDoc._id}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ── §2 Outcome Measures ─────────────────────────────────────────────────
  describe('Outcome Measures — /api/research/outcome-measures', () => {
    const measureDoc = { _id: mockId(), ...sampleMeasure, isActive: true };

    beforeEach(() => {
      OutcomeMeasure.find = jest.fn().mockReturnValue(chainable([measureDoc]));
      OutcomeMeasure.countDocuments = jest.fn().mockResolvedValue(1);
      OutcomeMeasure.findById = jest.fn().mockReturnValue(chainable(measureDoc));
      OutcomeMeasure.create = jest.fn().mockResolvedValue(measureDoc);
      OutcomeMeasure.findByIdAndUpdate = jest.fn().mockReturnValue(chainable(measureDoc));
      OutcomeMeasure.findOne = jest.fn().mockReturnValue(chainable(null));
    });

    it('POST / — should create a measure', async () => {
      const res = await request(app).post('/api/research/outcome-measures').send(sampleMeasure);
      expect(res.status).toBe(201);
      expect(res.body.data).toBeDefined();
    });

    it('GET / — should list measures', async () => {
      const res = await request(app).get('/api/research/outcome-measures');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('GET / — filter by category', async () => {
      const res = await request(app).get(
        '/api/research/outcome-measures?category=functional-independence'
      );
      expect(res.status).toBe(200);
    });

    it('GET / — filter by internationallyRecognized', async () => {
      const res = await request(app).get(
        '/api/research/outcome-measures?internationallyRecognized=true'
      );
      expect(res.status).toBe(200);
    });

    it('GET / — search', async () => {
      const res = await request(app).get('/api/research/outcome-measures?search=functional');
      expect(res.status).toBe(200);
    });

    it('GET /:id — should return a measure', async () => {
      const res = await request(app).get(`/api/research/outcome-measures/${measureDoc._id}`);
      expect(res.status).toBe(200);
    });

    it('PUT /:id — should update a measure', async () => {
      const res = await request(app)
        .put(`/api/research/outcome-measures/${measureDoc._id}`)
        .send({ description: 'Updated' });
      expect(res.status).toBe(200);
    });

    it('POST /seed — should seed standard measures', async () => {
      const res = await request(app).post('/api/research/outcome-measures/seed');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.total).toBeGreaterThan(0);
    });

    it('DELETE /:id — should soft-delete a measure', async () => {
      const res = await request(app).delete(`/api/research/outcome-measures/${measureDoc._id}`);
      expect(res.status).toBe(200);
    });
  });

  // ── §3 Anonymized Datasets ──────────────────────────────────────────────
  describe('Anonymized Datasets — /api/research/datasets', () => {
    const datasetDoc = { _id: mockId(), ...sampleDataset, isActive: true };

    beforeEach(() => {
      AnonymizedDataset.find = jest.fn().mockReturnValue(chainable([datasetDoc]));
      AnonymizedDataset.countDocuments = jest.fn().mockResolvedValue(1);
      AnonymizedDataset.findById = jest.fn().mockReturnValue(chainable(datasetDoc));
      AnonymizedDataset.create = jest.fn().mockResolvedValue(datasetDoc);
      AnonymizedDataset.findByIdAndUpdate = jest.fn().mockReturnValue(chainable(datasetDoc));
    });

    it('POST / — should create a dataset', async () => {
      const res = await request(app).post('/api/research/datasets').send(sampleDataset);
      expect(res.status).toBe(201);
      expect(res.body.data).toBeDefined();
    });

    it('GET / — should list datasets', async () => {
      const res = await request(app).get('/api/research/datasets');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('GET / — filter by sourceModule', async () => {
      const res = await request(app).get('/api/research/datasets?sourceModule=early-intervention');
      expect(res.status).toBe(200);
    });

    it('GET /:id — should return a dataset', async () => {
      const res = await request(app).get(`/api/research/datasets/${datasetDoc._id}`);
      expect(res.status).toBe(200);
    });

    it('PUT /:id — should update a dataset', async () => {
      const res = await request(app)
        .put(`/api/research/datasets/${datasetDoc._id}`)
        .send({ status: 'ready', recordCount: 90 });
      expect(res.status).toBe(200);
    });

    it('DELETE /:id — should soft-delete', async () => {
      const res = await request(app).delete(`/api/research/datasets/${datasetDoc._id}`);
      expect(res.status).toBe(200);
    });
  });

  // ── §4 Program Effectiveness ────────────────────────────────────────────
  describe('Program Effectiveness — /api/research/effectiveness', () => {
    const effectDoc = { _id: mockId(), ...sampleEffectiveness, isActive: true };

    beforeEach(() => {
      ProgramEffectiveness.find = jest.fn().mockReturnValue(chainable([effectDoc]));
      ProgramEffectiveness.countDocuments = jest.fn().mockResolvedValue(1);
      ProgramEffectiveness.findById = jest.fn().mockReturnValue(chainable(effectDoc));
      ProgramEffectiveness.create = jest.fn().mockResolvedValue(effectDoc);
      ProgramEffectiveness.findByIdAndUpdate = jest.fn().mockReturnValue(chainable(effectDoc));
    });

    it('POST / — should create an effectiveness report', async () => {
      const res = await request(app).post('/api/research/effectiveness').send(sampleEffectiveness);
      expect(res.status).toBe(201);
      expect(res.body.data).toBeDefined();
    });

    it('GET / — should list reports', async () => {
      const res = await request(app).get('/api/research/effectiveness');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('GET / — filter by programType', async () => {
      const res = await request(app).get(
        '/api/research/effectiveness?programType=physical-therapy'
      );
      expect(res.status).toBe(200);
    });

    it('GET /:id — should return a report', async () => {
      const res = await request(app).get(`/api/research/effectiveness/${effectDoc._id}`);
      expect(res.status).toBe(200);
    });

    it('PUT /:id — should update a report', async () => {
      const res = await request(app)
        .put(`/api/research/effectiveness/${effectDoc._id}`)
        .send({ status: 'in-review' });
      expect(res.status).toBe(200);
    });

    it('DELETE /:id — should soft-delete', async () => {
      const res = await request(app).delete(`/api/research/effectiveness/${effectDoc._id}`);
      expect(res.status).toBe(200);
    });
  });

  // ── §5 Benchmarking Reports ─────────────────────────────────────────────
  describe('Benchmarking Reports — /api/research/benchmarking', () => {
    const benchDoc = { _id: mockId(), ...sampleBenchmark, isActive: true };

    beforeEach(() => {
      BenchmarkingReport.find = jest.fn().mockReturnValue(chainable([benchDoc]));
      BenchmarkingReport.countDocuments = jest.fn().mockResolvedValue(1);
      BenchmarkingReport.findById = jest.fn().mockReturnValue(chainable(benchDoc));
      BenchmarkingReport.create = jest.fn().mockResolvedValue(benchDoc);
      BenchmarkingReport.findByIdAndUpdate = jest.fn().mockReturnValue(chainable(benchDoc));
    });

    it('POST / — should create a benchmarking report', async () => {
      const res = await request(app).post('/api/research/benchmarking').send(sampleBenchmark);
      expect(res.status).toBe(201);
      expect(res.body.data).toBeDefined();
    });

    it('GET / — should list benchmarking reports', async () => {
      const res = await request(app).get('/api/research/benchmarking');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('GET /:id — should return a report', async () => {
      const res = await request(app).get(`/api/research/benchmarking/${benchDoc._id}`);
      expect(res.status).toBe(200);
    });

    it('PUT /:id — should update', async () => {
      const res = await request(app)
        .put(`/api/research/benchmarking/${benchDoc._id}`)
        .send({ status: 'approved' });
      expect(res.status).toBe(200);
    });

    it('DELETE /:id — should soft-delete', async () => {
      const res = await request(app).delete(`/api/research/benchmarking/${benchDoc._id}`);
      expect(res.status).toBe(200);
    });
  });

  // ── §6 Data Exports ─────────────────────────────────────────────────────
  describe('Research Data Exports — /api/research/exports', () => {
    const exportDoc = {
      _id: mockId(),
      studyId: mockId(),
      exportName: 'SPSS Export Q4 2025',
      targetPlatform: 'spss',
      status: 'pending',
      auditTrail: [{ action: 'created', details: 'Export request created' }],
      isActive: true,
    };

    beforeEach(() => {
      ResearchDataExport.find = jest.fn().mockReturnValue(chainable([exportDoc]));
      ResearchDataExport.countDocuments = jest.fn().mockResolvedValue(1);
      ResearchDataExport.findById = jest.fn().mockReturnValue(chainable(exportDoc));
      ResearchDataExport.create = jest.fn().mockResolvedValue(exportDoc);
      ResearchDataExport.findByIdAndUpdate = jest
        .fn()
        .mockReturnValue(chainable({ ...exportDoc, status: 'approved' }));
    });

    it('POST / — should create an export request', async () => {
      const res = await request(app)
        .post('/api/research/exports')
        .send({
          studyId: mockId(),
          exportName: 'SPSS Export Q4 2025',
          targetPlatform: 'spss',
          configuration: { variables: ['age_range', 'disability_type', 'fim_score'] },
        });
      expect(res.status).toBe(201);
      expect(res.body.data).toBeDefined();
    });

    it('GET / — should list exports', async () => {
      const res = await request(app).get('/api/research/exports');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('GET / — filter by targetPlatform', async () => {
      const res = await request(app).get('/api/research/exports?targetPlatform=spss');
      expect(res.status).toBe(200);
    });

    it('GET /:id — should return export details', async () => {
      const res = await request(app).get(`/api/research/exports/${exportDoc._id}`);
      expect(res.status).toBe(200);
    });

    it('POST /:id/approve — should approve an export', async () => {
      ResearchDataExport.findByIdAndUpdate = jest
        .fn()
        .mockReturnValue(chainable({ ...exportDoc, status: 'approved' }));
      const res = await request(app).post(`/api/research/exports/${exportDoc._id}/approve`);
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('approved');
    });

    it('POST /:id/revoke — should revoke an export', async () => {
      ResearchDataExport.findByIdAndUpdate = jest
        .fn()
        .mockReturnValue(chainable({ ...exportDoc, status: 'revoked' }));
      const res = await request(app)
        .post(`/api/research/exports/${exportDoc._id}/revoke`)
        .send({ reason: 'Ethics approval expired' });
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('revoked');
    });

    it('DELETE /:id — should soft-delete', async () => {
      const res = await request(app).delete(`/api/research/exports/${exportDoc._id}`);
      expect(res.status).toBe(200);
    });
  });

  // ── §7 Dashboard ────────────────────────────────────────────────────────
  describe('Dashboard — /api/research/dashboard', () => {
    beforeEach(() => {
      // aggregate returns array of { _id, count } objects
      ResearchStudy.aggregate = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([{ _id: 'draft', count: 3 }]),
        then: jest.fn(cb => Promise.resolve(cb([{ _id: 'draft', count: 3 }]))),
      });

      // countDocuments for each model
      ResearchStudy.countDocuments = jest.fn().mockResolvedValue(5);
      OutcomeMeasure.countDocuments = jest.fn().mockResolvedValue(12);
      AnonymizedDataset.countDocuments = jest.fn().mockResolvedValue(4);
      ProgramEffectiveness.countDocuments = jest.fn().mockResolvedValue(3);
      BenchmarkingReport.countDocuments = jest.fn().mockResolvedValue(2);
      ResearchDataExport.countDocuments = jest.fn().mockResolvedValue(6);

      // find() for recent studies
      ResearchStudy.find = jest
        .fn()
        .mockReturnValue(
          chainable([
            {
              _id: mockId(),
              title: 'Recent study',
              status: 'draft',
              studyType: 'rct',
              createdAt: new Date(),
            },
          ])
        );
    });

    it('GET /dashboard — should return aggregated stats', async () => {
      const res = await request(app).get('/api/research/dashboard');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.studies).toBeDefined();
      expect(res.body.data.studies.byStatus).toBeDefined();
      expect(res.body.data.outcomeMeasures).toBeDefined();
      expect(res.body.data.anonymizedDatasets).toBeDefined();
      expect(res.body.data.effectivenessReports).toBeDefined();
      expect(res.body.data.benchmarkingReports).toBeDefined();
      expect(res.body.data.dataExports).toBeDefined();
      expect(res.body.data.recentStudies).toBeDefined();
    });
  });

  // ── §8 Authorization ───────────────────────────────────────────────────
  describe('Authorization checks', () => {
    let restrictedApp;

    beforeAll(() => {
      restrictedApp = createApp({ role: 'user' });
    });

    beforeEach(() => {
      // Set up mocks so authorized read requests succeed
      ResearchStudy.find = jest.fn().mockReturnValue(chainable([]));
      ResearchStudy.countDocuments = jest.fn().mockResolvedValue(0);
      OutcomeMeasure.find = jest.fn().mockReturnValue(chainable([]));
      OutcomeMeasure.countDocuments = jest.fn().mockResolvedValue(0);

      // Dashboard mocks
      ResearchStudy.aggregate = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
        then: jest.fn(cb => Promise.resolve(cb([]))),
      });
      OutcomeMeasure.countDocuments = jest.fn().mockResolvedValue(0);
      AnonymizedDataset.countDocuments = jest.fn().mockResolvedValue(0);
      ProgramEffectiveness.countDocuments = jest.fn().mockResolvedValue(0);
      BenchmarkingReport.countDocuments = jest.fn().mockResolvedValue(0);
      ResearchDataExport.countDocuments = jest.fn().mockResolvedValue(0);
    });

    it('should deny user role from creating a study', async () => {
      const res = await request(restrictedApp).post('/api/research/studies').send(sampleStudy);
      expect(res.status).toBe(403);
    });

    it('should deny user role from creating benchmarking reports', async () => {
      const res = await request(restrictedApp)
        .post('/api/research/benchmarking')
        .send(sampleBenchmark);
      expect(res.status).toBe(403);
    });

    it('should allow user role to list studies (read-only)', async () => {
      const res = await request(restrictedApp).get('/api/research/studies');
      expect(res.status).toBe(200);
    });

    it('should allow user role to list outcome measures (read-only)', async () => {
      const res = await request(restrictedApp).get('/api/research/outcome-measures');
      expect(res.status).toBe(200);
    });

    it('should deny user role from seeding measures', async () => {
      const res = await request(restrictedApp).post('/api/research/outcome-measures/seed');
      expect(res.status).toBe(403);
    });

    it('should deny user role from approving exports', async () => {
      const res = await request(restrictedApp).post(`/api/research/exports/${mockId()}/approve`);
      expect(res.status).toBe(403);
    });

    it('should deny user role from revoking exports', async () => {
      const res = await request(restrictedApp).post(`/api/research/exports/${mockId()}/revoke`);
      expect(res.status).toBe(403);
    });

    it('should deny user role from creating datasets', async () => {
      const res = await request(restrictedApp).post('/api/research/datasets').send(sampleDataset);
      expect(res.status).toBe(403);
    });

    it('should allow user role to view dashboard', async () => {
      const res = await request(restrictedApp).get('/api/research/dashboard');
      expect(res.status).toBe(200);
    });
  });
});
