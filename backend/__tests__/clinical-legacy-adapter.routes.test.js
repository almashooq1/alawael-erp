'use strict';

/**
 * clinical-legacy-adapter.routes.test.js
 *
 * Route-layer coverage for the clinical legacy adapter that bridges
 * legacy web-admin OpenAPI paths to the W210/W211/W229 clinical
 * services and models.
 *
 * Testing strategy mirrors measures-outcomes-routes-wave233.test.js:
 *   - Direct handler calls from the router stack (no supertest, no DB).
 *   - jest.resetModules() + jest.doMock(...) to stub services.
 *   - mongoose.model spied globally to return fake model classes.
 */

describe('Clinical Legacy Adapter routes', () => {
  const measuresLibrarySvc = {
    list: jest.fn().mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 }),
    getOne: jest.fn().mockResolvedValue(null),
    getScoringGuide: jest.fn().mockResolvedValue(null),
    suggest: jest.fn().mockResolvedValue([]),
  };
  const measureOutcomesAggregator = {
    aggregateBeneficiary: jest.fn().mockResolvedValue({ measures: [] }),
  };
  const measureClinicalReport = {
    generate: jest.fn().mockResolvedValue({ measures: [] }),
  };
  const measureTrendEngine = {
    analyze: jest.fn().mockResolvedValue({ classification: 'linear_improvement' }),
  };

  function makeChainable(value) {
    const chain = {
      sort: jest.fn(() => chain),
      select: jest.fn(() => chain),
      lean: jest.fn().mockResolvedValue(value),
    };
    return chain;
  }

  function makeModel(name) {
    class FakeModel {
      static instances = [];
      constructor(data) {
        Object.assign(this, data);
        FakeModel.instances.push(this);
      }
      async save() {
        return this;
      }
      toObject() {
        return { ...this, _id: this._id || `${name.toLowerCase()}-1` };
      }
    }
    FakeModel.find = jest.fn(() => makeChainable([]));
    FakeModel.findOne = jest.fn(() => makeChainable(null));
    FakeModel.findById = jest.fn(() => makeChainable(null));
    FakeModel.findByIdAndUpdate = jest.fn(() => makeChainable(null));
    return FakeModel;
  }

  const fakeModels = {
    Measure: makeModel('Measure'),
    MeasureApplication: makeModel('MeasureApplication'),
    TherapeuticGoal: makeModel('TherapeuticGoal'),
    Beneficiary: makeModel('Beneficiary'),
    EpisodeOfCare: makeModel('EpisodeOfCare'),
  };

  let mongoose;
  let router;

  beforeAll(() => {
    jest.resetModules();
    jest.doMock('../middleware/auth', () => ({
      authenticate: (_req, _res, next) => next(),
      authenticateToken: (_req, _res, next) => next(),
      requireRole: () => (_req, _res, next) => next(),
    }));
    jest.doMock('../services/measuresLibrary.service', () => measuresLibrarySvc);
    jest.doMock('../services/measureOutcomesAggregator.service', () => measureOutcomesAggregator);
    jest.doMock('../services/measureClinicalReport.service', () => measureClinicalReport);
    jest.doMock('../services/measureTrendEngine.service', () => measureTrendEngine);

    mongoose = require('mongoose');
    jest.spyOn(mongoose, 'model').mockImplementation(name => {
      if (fakeModels[name]) return fakeModels[name];
      throw new Error(`Model ${name} not registered`);
    });

    router = require('../routes/clinical-legacy-adapter.routes');
  });

  afterAll(() => {
    jest.dontMock('../middleware/auth');
    jest.dontMock('../services/measuresLibrary.service');
    jest.dontMock('../services/measureOutcomesAggregator.service');
    jest.dontMock('../services/measureClinicalReport.service');
    jest.dontMock('../services/measureTrendEngine.service');
    mongoose.model.mockRestore();
    jest.resetModules();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    measuresLibrarySvc.list.mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 });
    measuresLibrarySvc.getOne.mockResolvedValue(null);
    measuresLibrarySvc.getScoringGuide.mockResolvedValue(null);
    measuresLibrarySvc.suggest.mockResolvedValue([]);
    measureOutcomesAggregator.aggregateBeneficiary.mockResolvedValue({ measures: [] });
    measureClinicalReport.generate.mockResolvedValue({ measures: [] });
    measureTrendEngine.analyze.mockResolvedValue({ classification: 'linear_improvement' });

    Object.values(fakeModels).forEach(model => {
      model.find.mockReturnValue(makeChainable([]));
      model.findOne.mockReturnValue(makeChainable(null));
      model.findById.mockReturnValue(makeChainable(null));
      model.findByIdAndUpdate.mockReturnValue(makeChainable(null));
      model.instances = [];
    });
  });

  function getHandler(method, path) {
    const layer = router.stack.find(
      l => l.route && l.route.path === path && l.route.methods[method.toLowerCase()]
    );
    return layer && layer.route.stack[layer.route.stack.length - 1].handle;
  }

  function fakeRes() {
    const res = {};
    res.status = jest.fn(code => {
      res._status = code;
      return res;
    });
    res.json = jest.fn(body => {
      res._body = body;
      return res;
    });
    return res;
  }

  function setResult(model, method, value) {
    model[method].mockReturnValue(makeChainable(value));
  }

  describe('registration smoke', () => {
    test('module loads without throwing', () => {
      expect(router).toBeTruthy();
      expect(router.stack).toBeInstanceOf(Array);
    });

    test('all 14 endpoints are registered with correct method+path', () => {
      const paths = router.stack
        .filter(layer => layer.route)
        .map(layer => {
          const method = Object.keys(layer.route.methods)[0];
          return `${method.toUpperCase()} ${layer.route.path}`;
        });

      expect(paths).toEqual(
        expect.arrayContaining([
          'GET /measures',
          'GET /measure-categories',
          'GET /measures/:id',
          'GET /measures/:id/items',
          'GET /measures/:id/cutoffs',
          'GET /measure-recommendations',
          'GET /outcomes',
          'GET /outcomes/:id',
          'GET /outcomes/:id/timeline',
          'POST /outcomes',
          'PATCH /outcomes/:id/target',
          'POST /outcomes/:id/notes',
          'PATCH /outcomes/:id/archive',
          'PATCH /outcomes/:id/reactivate',
        ])
      );
      expect(paths).toHaveLength(14);
    });
  });

  describe('measures read endpoints', () => {
    test('GET /measures calls measuresLibrarySvc.list and returns envelope with mapped measures', async () => {
      measuresLibrarySvc.list.mockResolvedValue({
        items: [
          {
            _id: 'm1',
            code: 'BERG',
            name: 'Berg Balance Scale',
            name_ar: 'مقياس برغ للتوازن',
            category: 'motor',
            status: 'active',
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
      });

      const h = getHandler('GET', '/measures');
      const res = fakeRes();
      await h({ query: {} }, res);

      expect(measuresLibrarySvc.list).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, limit: 20, search: '', category: '', isActive: 'true' })
      );
      expect(res._body.success).toBe(true);
      expect(res._body.data).toHaveLength(1);
      expect(res._body.data[0]).toMatchObject({
        id: 'm1',
        code: 'BERG',
        nameAr: 'مقياس برغ للتوازن',
        nameEn: 'Berg Balance Scale',
        domain: 'motor',
      });
      expect(res._body.total).toBe(1);
      expect(res._body.page).toBe(1);
      expect(res._body.limit).toBe(20);
    });

    test('GET /measure-categories derives unique categories from list items', async () => {
      measuresLibrarySvc.list.mockResolvedValue({
        items: [{ category: 'motor' }, { category: 'cognitive' }, { category: 'motor' }, {}],
      });

      const h = getHandler('GET', '/measure-categories');
      const res = fakeRes();
      await h({}, res);

      expect(measuresLibrarySvc.list).toHaveBeenCalledWith({ limit: 1000 });
      expect(res._body.success).toBe(true);
      expect(res._body.data).toHaveLength(2);
      expect(res._body.data.map(c => c.id)).toEqual(['motor', 'cognitive']);
    });

    test('GET /measures/:id calls getOne and returns detail with subscales and cutoffs', async () => {
      measuresLibrarySvc.getOne.mockResolvedValue({
        _id: 'm1',
        code: 'GMFM',
        name: 'GMFM',
        name_ar: 'مقياس GMFM',
        domains: [
          { _id: 'd1', key: 'D1', name: 'Lying', name_ar: 'الاستلقاء' },
          { _id: 'd2', key: 'D2', name: 'Sitting', name_ar: 'الجلوس' },
        ],
        scoringRules: [
          { _id: 'r1', minScore: 0, maxScore: 20, severity: 'mild', rangeLabel: 'mild' },
        ],
      });

      const h = getHandler('GET', '/measures/:id');
      const res = fakeRes();
      await h({ params: { id: 'm1' } }, res);

      expect(measuresLibrarySvc.getOne).toHaveBeenCalledWith('m1');
      expect(res._body.success).toBe(true);
      expect(res._body.data.subscales).toHaveLength(2);
      expect(res._body.data.subscales[0]).toMatchObject({ id: 'd1', code: 'D1' });
      expect(res._body.data.cutoffs).toHaveLength(1);
      expect(res._body.data.cutoffs[0]).toMatchObject({ id: 'r1', scoreMin: 0, scoreMax: 20 });
    });

    test('GET /measures/:id/items flattens domains, supports subscaleId filter and paginates', async () => {
      measuresLibrarySvc.getScoringGuide.mockResolvedValue({
        _id: 'm1',
        domains: [
          {
            _id: 'd1',
            items: [
              {
                _id: 'i1',
                label: 'Item 1',
                label_ar: 'بند 1',
                scoringType: 'likert',
                options: [{ value: 0, label: 'No' }],
              },
              { _id: 'i2', label: 'Item 2', label_ar: 'بند 2' },
            ],
          },
          {
            _id: 'd2',
            items: [{ _id: 'i3', label: 'Item 3' }],
          },
        ],
      });

      const h = getHandler('GET', '/measures/:id/items');
      const res = fakeRes();
      await h({ params: { id: 'm1' }, query: { page: '1', limit: '2' } }, res);

      expect(res._body.data).toHaveLength(2);
      expect(res._body.total).toBe(3);
      expect(res._body.page).toBe(1);
      expect(res._body.limit).toBe(2);
      expect(res._body.data[0]).toMatchObject({ id: 'i1', subscaleId: 'd1', itemNumber: 1 });

      const res2 = fakeRes();
      await h({ params: { id: 'm1' }, query: { subscaleId: 'd2' } }, res2);
      expect(res2._body.data).toHaveLength(1);
      expect(res2._body.data[0].subscaleId).toBe('d2');
    });

    test('GET /measures/:id/cutoffs returns mapped scoringRules as plain array', async () => {
      measuresLibrarySvc.getScoringGuide.mockResolvedValue({
        _id: 'm1',
        scoringRules: [
          {
            _id: 'r1',
            minScore: 0,
            maxScore: 30,
            severity: 'severe',
            rangeLabel: 'severe',
            color: 'red',
          },
          { _id: 'r2', minScore: 31, maxScore: 60, severity: 'normal', rangeLabel: 'normal' },
        ],
      });

      const h = getHandler('GET', '/measures/:id/cutoffs');
      const res = fakeRes();
      await h({ params: { id: 'm1' } }, res);

      expect(Array.isArray(res._body)).toBe(true);
      expect(res._body).toHaveLength(2);
      expect(res._body[0]).toMatchObject({
        id: 'r1',
        measureId: 'm1',
        scoreMin: 0,
        scoreMax: 30,
        severityLevel: 'severe',
      });
      expect(res._body[1]).toMatchObject({ severityLevel: 'none' });
    });

    test('GET /measure-recommendations calls suggest and respects maxPriority', async () => {
      measuresLibrarySvc.suggest.mockResolvedValue([
        { _id: 'm1', code: 'M1', name: 'One' },
        { _id: 'm2', code: 'M2', name: 'Two' },
        { _id: 'm3', code: 'M3', name: 'Three' },
      ]);

      const h = getHandler('GET', '/measure-recommendations');
      const res = fakeRes();
      await h({ query: { beneficiaryId: 'b1', maxPriority: '2' } }, res);

      expect(measuresLibrarySvc.suggest).toHaveBeenCalledWith({ beneficiaryId: 'b1' });
      expect(res._body).toHaveLength(2);
      expect(res._body[0].priority).toBe(1);
      expect(res._body[1].priority).toBe(2);
      expect(res._body[0].measure.code).toBe('M1');
    });
  });

  describe('outcomes read endpoints', () => {
    test('GET /outcomes?beneficiaryId calls aggregateBeneficiary and returns composite ids', async () => {
      measureOutcomesAggregator.aggregateBeneficiary.mockResolvedValue({
        measures: [
          {
            measureId: 'm1',
            measureCode: 'BERG',
            measureName_ar: 'برغ',
            baselineScore: 10,
            latestScore: 20,
            adminCount: 2,
            trend: 'linear_improvement',
          },
        ],
      });

      const h = getHandler('GET', '/outcomes');
      const res = fakeRes();
      await h({ query: { beneficiaryId: 'b1' } }, res);

      expect(measureOutcomesAggregator.aggregateBeneficiary).toHaveBeenCalledWith('b1');
      expect(res._body.success).toBe(true);
      expect(res._body.data).toHaveLength(1);
      expect(res._body.data[0]).toMatchObject({
        id: 'b1:m1',
        beneficiaryId: 'b1',
        measureId: 'm1',
        measureCode: 'BERG',
        trend: 'improving',
      });
    });

    test('GET /outcomes?branchId queries MeasureApplication and returns branch-scoped rows', async () => {
      setResult(fakeModels.MeasureApplication, 'find', [
        {
          _id: 'a1',
          beneficiaryId: 'b1',
          measureId: 'm1',
          branchId: 'br1',
          status: 'completed',
          applicationDate: new Date('2026-01-01'),
          totalRawScore: 10,
        },
        {
          _id: 'a2',
          beneficiaryId: 'b1',
          measureId: 'm1',
          branchId: 'br1',
          status: 'completed',
          applicationDate: new Date('2026-02-01'),
          totalRawScore: 20,
        },
      ]);
      setResult(fakeModels.Measure, 'find', [
        { _id: 'm1', code: 'BERG', name: 'Berg', name_ar: 'برغ' },
      ]);
      setResult(fakeModels.Beneficiary, 'find', [
        { _id: 'b1', firstName_ar: 'أحمد', lastName_ar: 'علي' },
      ]);

      const h = getHandler('GET', '/outcomes');
      const res = fakeRes();
      await h({ query: { branchId: 'br1' }, user: {} }, res);

      expect(fakeModels.MeasureApplication.find).toHaveBeenCalledWith(
        expect.objectContaining({ branchId: 'br1', status: { $in: ['completed', 'locked'] } })
      );
      expect(res._body.success).toBe(true);
      expect(res._body.data).toHaveLength(1);
      expect(res._body.data[0]).toMatchObject({
        beneficiaryId: 'b1',
        measureId: 'm1',
        measureCode: 'BERG',
        baselineScore: 10,
        latestScore: 20,
        adminCount: 2,
      });
    });

    test('GET /outcomes/:id with composite id calls generate and returns detail', async () => {
      setResult(fakeModels.Measure, 'findById', { _id: 'm1', code: 'BERG' });
      measureClinicalReport.generate.mockResolvedValue({
        measures: [
          {
            measureId: 'm1',
            measureCode: 'BERG',
            measureName_ar: 'برغ',
            baselineScore: 5,
            latestScore: 15,
            adminHistory: [
              {
                applicationId: 'a1',
                applicationDate: new Date('2026-01-01'),
                totalRawScore: 5,
                changeFromBaseline: 0,
              },
              {
                applicationId: 'a2',
                applicationDate: new Date('2026-02-01'),
                totalRawScore: 15,
                changeFromBaseline: 10,
              },
            ],
          },
        ],
      });

      const h = getHandler('GET', '/outcomes/:id');
      const res = fakeRes();
      await h({ params: { id: 'b1:m1' } }, res);

      expect(measureClinicalReport.generate).toHaveBeenCalledWith('b1', {
        includeCorrections: false,
      });
      expect(res._body.success).toBe(true);
      expect(res._body.data).toMatchObject({
        id: 'b1:m1',
        beneficiaryId: 'b1',
        measureCode: 'BERG',
      });
      expect(res._body.data.assessments).toHaveLength(2);
      expect(res._body.data.assessments[1].changeFromBaseline).toBe(10);
    });

    test('GET /outcomes/:id/timeline returns mapped adminHistory', async () => {
      setResult(fakeModels.Measure, 'findById', { _id: 'm1', code: 'BERG' });
      measureClinicalReport.generate.mockResolvedValue({
        measures: [
          {
            measureCode: 'BERG',
            adminHistory: [
              {
                applicationId: 'a1',
                applicationDate: new Date('2026-01-01'),
                totalRawScore: 5,
                changeFromBaseline: 0,
              },
            ],
          },
        ],
      });

      const h = getHandler('GET', '/outcomes/:id/timeline');
      const res = fakeRes();
      await h({ params: { id: 'b1:m1' } }, res);

      expect(Array.isArray(res._body)).toBe(true);
      expect(res._body).toHaveLength(1);
      expect(res._body[0]).toMatchObject({
        assessmentId: 'a1',
        rawScore: 5,
        changeFromBaseline: 0,
      });
    });
  });

  describe('outcomes write endpoints', () => {
    test('POST /outcomes creates TherapeuticGoal and returns 201 with outcome shape', async () => {
      const measureId = '507f1f77bcf86cd799439011';
      const baselineAssessmentId = '507f1f77bcf86cd799439012';
      const beneficiaryId = '507f1f77bcf86cd799439013';

      setResult(fakeModels.Measure, 'findById', { _id: measureId, code: 'BERG', name_ar: 'برغ' });
      setResult(fakeModels.EpisodeOfCare, 'findOne', {
        _id: 'e1',
        beneficiaryId,
        branchId: 'br1',
        status: 'active',
      });
      setResult(fakeModels.MeasureApplication, 'findById', {
        _id: baselineAssessmentId,
        totalRawScore: 18,
        applicationDate: new Date('2026-01-15'),
      });

      const h = getHandler('POST', '/outcomes');
      const res = fakeRes();
      await h(
        {
          body: {
            beneficiaryId,
            measureId,
            baselineAssessmentId,
            targetScore: '30',
            targetDate: '2026-12-31',
          },
          user: { _id: 'u1', branchId: 'br1' },
        },
        res
      );

      expect(fakeModels.Measure.findById).toHaveBeenCalledWith(measureId);
      expect(fakeModels.EpisodeOfCare.findOne).toHaveBeenCalled();
      expect(fakeModels.MeasureApplication.findById).toHaveBeenCalledWith(
        expect.objectContaining({ toString: expect.any(Function) })
      );
      expect(fakeModels.MeasureApplication.findById.mock.calls[0][0].toString()).toBe(
        baselineAssessmentId
      );
      expect(res._status).toBe(201);
      expect(res._body.success).toBe(true);
      expect(res._body.data).toMatchObject({
        beneficiaryId,
        measureId,
        measureCode: 'BERG',
        baselineScore: 18,
        targetScore: 30,
        status: 'active',
      });

      const created = fakeModels.TherapeuticGoal.instances[0];
      expect(created).toBeTruthy();
      expect(created.baseline).toMatchObject({
        value: 18,
        date: new Date('2026-01-15'),
      });
      expect(created.measureApplicationId.toString()).toBe(baselineAssessmentId);
    });

    test('PATCH /outcomes/:id/target finds goal by measure link and updates target', async () => {
      const goal = {
        _id: 'g1',
        status: 'active',
        measureCode: 'BERG',
        beneficiaryId: 'b1',
        objectives: [{ measureLinks: [{ measureId: 'm1', measureCode: 'BERG' }] }],
      };
      const updated = { ...goal, target: { value: 40 }, targetDate: new Date('2026-12-31') };
      setResult(fakeModels.TherapeuticGoal, 'find', [goal]);
      setResult(fakeModels.TherapeuticGoal, 'findByIdAndUpdate', updated);

      const h = getHandler('PATCH', '/outcomes/:id/target');
      const res = fakeRes();
      await h(
        {
          params: { id: 'b1:m1' },
          body: { targetScore: '40', targetDate: '2026-12-31' },
          user: { _id: 'u1' },
        },
        res
      );

      expect(fakeModels.TherapeuticGoal.find).toHaveBeenCalledWith(
        expect.objectContaining({
          beneficiaryId: 'b1',
          isDeleted: { $ne: true },
        })
      );
      expect(fakeModels.TherapeuticGoal.findByIdAndUpdate).toHaveBeenCalledWith(
        'g1',
        expect.objectContaining({ $set: expect.objectContaining({ 'target.value': 40 }) }),
        {returnDocument: 'after'}
      );
      expect(res._body.success).toBe(true);
      expect(res._body.data.targetScore).toBe(40);
    });

    test('POST /outcomes/:id/notes pushes progressHistory and prepends to notes', async () => {
      const goal = {
        _id: 'g1',
        status: 'active',
        currentProgress: 25,
        notes: 'old note',
        objectives: [{ measureLinks: [{ measureId: 'm1' }] }],
      };
      const updated = {
        ...goal,
        progressHistory: [{ _id: 'ph1', date: new Date(), value: 25, notes: 'new note' }],
      };
      setResult(fakeModels.TherapeuticGoal, 'find', [goal]);
      setResult(fakeModels.TherapeuticGoal, 'findByIdAndUpdate', updated);

      const h = getHandler('POST', '/outcomes/:id/notes');
      const res = fakeRes();
      await h(
        {
          params: { id: 'b1:m1' },
          body: { noteAr: 'new note', assessmentId: 'a1' },
          user: { _id: 'u1' },
        },
        res
      );

      expect(fakeModels.TherapeuticGoal.findByIdAndUpdate).toHaveBeenCalledWith(
        'g1',
        expect.objectContaining({
          $push: expect.objectContaining({
            progressHistory: expect.objectContaining({ notes: 'new note' }),
          }),
          $set: expect.objectContaining({
            notes: expect.stringMatching(/^\[.*\] new note\nold note$/),
          }),
        }),
        {returnDocument: 'after'}
      );
      expect(res._status).toBe(201);
      expect(res._body.data.noteAr).toBe('new note');
      expect(res._body.data.assessmentId).toBe('a1');
    });

    test('PATCH /outcomes/:id/archive sets status to discontinued', async () => {
      const goal = {
        _id: 'g1',
        status: 'active',
        measureCode: 'BERG',
        objectives: [{ measureLinks: [{ measureId: 'm1' }] }],
      };
      const updated = { ...goal, status: 'discontinued' };
      setResult(fakeModels.TherapeuticGoal, 'find', [goal]);
      setResult(fakeModels.TherapeuticGoal, 'findByIdAndUpdate', updated);

      const h = getHandler('PATCH', '/outcomes/:id/archive');
      const res = fakeRes();
      await h({ params: { id: 'b1:m1' }, user: { _id: 'u1' } }, res);

      expect(fakeModels.TherapeuticGoal.findByIdAndUpdate).toHaveBeenCalledWith(
        'g1',
        expect.objectContaining({
          $set: expect.objectContaining({ status: 'discontinued' }),
        }),
        {returnDocument: 'after'}
      );
      expect(res._body.success).toBe(true);
      expect(res._body.data.status).toBe('discontinued');
      expect(res._body.data.isActive).toBe(false);
    });

    test('PATCH /outcomes/:id/reactivate sets status to active', async () => {
      const goal = {
        _id: 'g1',
        status: 'discontinued',
        measureCode: 'BERG',
        objectives: [{ measureLinks: [{ measureId: 'm1' }] }],
      };
      const updated = { ...goal, status: 'active' };
      setResult(fakeModels.TherapeuticGoal, 'find', [goal]);
      setResult(fakeModels.TherapeuticGoal, 'findByIdAndUpdate', updated);

      const h = getHandler('PATCH', '/outcomes/:id/reactivate');
      const res = fakeRes();
      await h({ params: { id: 'b1:m1' }, user: { _id: 'u1' } }, res);

      expect(fakeModels.TherapeuticGoal.findByIdAndUpdate).toHaveBeenCalledWith(
        'g1',
        expect.objectContaining({
          $set: expect.objectContaining({ status: 'active' }),
        }),
        {returnDocument: 'after'}
      );
      expect(res._body.success).toBe(true);
      expect(res._body.data.status).toBe('active');
      expect(res._body.data.isActive).toBe(true);
    });
  });
});
