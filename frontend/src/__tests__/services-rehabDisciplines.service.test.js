/**
 * Phase 9 C13 — frontend service contract test.
 *
 * Confirms rehabDisciplines.service.js + rehabGoalSuggestions.service.js
 * hit the exact /api/v1/rehab/* paths exposed by C5 + C8 on the backend.
 * Uses a mocked api.client so no network is touched.
 */

jest.mock('../services/api.client', () => {
  const calls = [];
  const record = method => (url, opts) => {
    calls.push({ method, url, opts: opts || null });
    return Promise.resolve({ data: {} });
  };
  return {
    __esModule: true,
    default: {
      get: record('get'),
      post: (url, body, opts) => {
        calls.push({ method: 'post', url, body: body || null, opts: opts || null });
        return Promise.resolve({ data: {} });
      },
      put: record('put'),
      delete: record('delete'),
      __calls: calls,
      __reset: () => (calls.length = 0),
    },
  };
});

const api = require('../services/api.client').default;
const rehabDisciplines = require('../services/rehabDisciplines.service').default;
const rehabGoalSuggestions = require('../services/rehabGoalSuggestions.service').default;

describe('Phase 9 C13 — rehab frontend services', () => {
  beforeEach(() => api.__reset());

  describe('rehabDisciplines.service', () => {
    test('has the full C5 surface', () => {
      expect(typeof rehabDisciplines.getTaxonomy).toBe('function');
      expect(typeof rehabDisciplines.getHealth).toBe('function');
      expect(typeof rehabDisciplines.suggest).toBe('function');
      expect(typeof rehabDisciplines.list).toBe('function');
      expect(typeof rehabDisciplines.get).toBe('function');
      expect(typeof rehabDisciplines.getPrograms).toBe('function');
      expect(typeof rehabDisciplines.getInterventions).toBe('function');
      expect(typeof rehabDisciplines.getMeasures).toBe('function');
      expect(typeof rehabDisciplines.getGoalTemplates).toBe('function');
    });

    test('hits /rehab/disciplines/taxonomy', async () => {
      await rehabDisciplines.getTaxonomy();
      expect(api.__calls[0]).toMatchObject({ method: 'get', url: '/rehab/disciplines/taxonomy' });
    });

    test('hits /rehab/disciplines/health', async () => {
      await rehabDisciplines.getHealth();
      expect(api.__calls[0].url).toBe('/rehab/disciplines/health');
    });

    test('forwards query params on /suggest', async () => {
      await rehabDisciplines.suggest({ age: 6, icf: 'b1' });
      expect(api.__calls[0]).toMatchObject({
        method: 'get',
        url: '/rehab/disciplines/suggest',
        opts: { params: { age: 6, icf: 'b1' } },
      });
    });

    test('hits /rehab/disciplines (list)', async () => {
      await rehabDisciplines.list({ active: true });
      expect(api.__calls[0]).toMatchObject({
        url: '/rehab/disciplines',
        opts: { params: { active: true } },
      });
    });

    test('interpolates discipline id into sub-paths', async () => {
      await rehabDisciplines.get('PT');
      await rehabDisciplines.getPrograms('PT');
      await rehabDisciplines.getInterventions('PT');
      await rehabDisciplines.getMeasures('PT');
      await rehabDisciplines.getGoalTemplates('PT');
      expect(api.__calls.map(c => c.url)).toEqual([
        '/rehab/disciplines/PT',
        '/rehab/disciplines/PT/programs',
        '/rehab/disciplines/PT/interventions',
        '/rehab/disciplines/PT/measures',
        '/rehab/disciplines/PT/goal-templates',
      ]);
    });
  });

  describe('rehabGoalSuggestions.service', () => {
    test('has the full C8 surface', () => {
      expect(typeof rehabGoalSuggestions.listGoals).toBe('function');
      expect(typeof rehabGoalSuggestions.scoreGoals).toBe('function');
      expect(typeof rehabGoalSuggestions.listInterventions).toBe('function');
      expect(typeof rehabGoalSuggestions.draft).toBe('function');
    });

    test('listGoals uses GET /goals with params', async () => {
      await rehabGoalSuggestions.listGoals({ disciplineId: 'PT' });
      expect(api.__calls[0]).toMatchObject({
        method: 'get',
        url: '/rehab/goal-suggestions/goals',
        opts: { params: { disciplineId: 'PT' } },
      });
    });

    test('scoreGoals uses POST /goals with body', async () => {
      await rehabGoalSuggestions.scoreGoals({ disciplines: ['PT'], ageBand: '5-12' });
      expect(api.__calls[0]).toMatchObject({
        method: 'post',
        url: '/rehab/goal-suggestions/goals',
        body: { disciplines: ['PT'], ageBand: '5-12' },
      });
    });

    test('listInterventions hits the right path', async () => {
      await rehabGoalSuggestions.listInterventions({ disciplineId: 'OT' });
      expect(api.__calls[0].url).toBe('/rehab/goal-suggestions/interventions');
    });

    test('draft forwards templateCode as a query param', async () => {
      await rehabGoalSuggestions.draft({ templateCode: 'PT.GAIT.001' });
      expect(api.__calls[0]).toMatchObject({
        url: '/rehab/goal-suggestions/draft',
        opts: { params: { templateCode: 'PT.GAIT.001' } },
      });
    });
  });
});
