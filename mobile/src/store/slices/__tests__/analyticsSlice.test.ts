jest.mock('../../../services/ApiService', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

import { configureStore } from '@reduxjs/toolkit';
import ApiService from '../../../services/ApiService';
import analyticsReducer, { fetchMetrics, fetchDashboards, fetchDashboard, fetchTrends, clearError } from '../analyticsSlice';

const mockedApi = ApiService as jest.Mocked<typeof ApiService>;

const makeStore = (preloaded?: any) =>
  configureStore({
    reducer: { analytics: analyticsReducer },
    preloadedState: preloaded,
  });

describe('analyticsSlice', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('has the documented initial state', () => {
    const state = makeStore().getState().analytics;
    expect(state.metrics).toEqual([]);
    expect(state.dashboards).toEqual([]);
    expect(state.currentDashboard).toBeNull();
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('clearError resets error to null', () => {
    const store = makeStore({
      analytics: {
        metrics: [],
        dashboards: [],
        currentDashboard: null,
        isLoading: false,
        error: 'old',
      },
    });
    store.dispatch(clearError());
    expect(store.getState().analytics.error).toBeNull();
  });

  describe('fetchMetrics', () => {
    it('stores returned metrics on success', async () => {
      const metrics = [{ name: 'orders', value: 10, trend: 5, status: 'up' }];
      mockedApi.get.mockResolvedValue(metrics);
      const store = makeStore();
      await store.dispatch(fetchMetrics({}) as any);
      const state = store.getState().analytics;
      expect(state.metrics).toEqual(metrics);
      expect(state.isLoading).toBe(false);
    });

    it('captures error on rejection', async () => {
      mockedApi.get.mockRejectedValue(new Error('metrics down'));
      const store = makeStore();
      await store.dispatch(fetchMetrics({}) as any);
      expect(store.getState().analytics.error).toBe('metrics down');
    });
  });

  describe('fetchDashboards', () => {
    it('reads response.items when present', async () => {
      mockedApi.get.mockResolvedValue({ items: [{ id: 'd1', name: 'D', type: 'sales', widgets: [] }] });
      const store = makeStore();
      await store.dispatch(fetchDashboards() as any);
      expect(store.getState().analytics.dashboards).toHaveLength(1);
    });

    it('falls back to array response shape', async () => {
      mockedApi.get.mockResolvedValue([{ id: 'd2', name: 'D2', type: 'ops', widgets: [] }]);
      const store = makeStore();
      await store.dispatch(fetchDashboards() as any);
      expect(store.getState().analytics.dashboards[0].id).toBe('d2');
    });

    it('records error on rejection', async () => {
      mockedApi.get.mockRejectedValue(new Error('nope'));
      const store = makeStore();
      await store.dispatch(fetchDashboards() as any);
      expect(store.getState().analytics.error).toBe('nope');
    });
  });

  describe('fetchDashboard', () => {
    it('sets currentDashboard on success', async () => {
      const dash = { id: 'd1', name: 'D', type: 'sales', widgets: [] };
      mockedApi.get.mockResolvedValue(dash);
      const store = makeStore();
      await store.dispatch(fetchDashboard('d1') as any);
      expect(store.getState().analytics.currentDashboard).toEqual(dash);
    });

    it('captures error on rejection', async () => {
      mockedApi.get.mockRejectedValue(new Error('forbidden'));
      const store = makeStore();
      await store.dispatch(fetchDashboard('d1') as any);
      expect(store.getState().analytics.error).toBe('forbidden');
    });
  });

  describe('fetchTrends', () => {
    it('clears loading on success', async () => {
      mockedApi.get.mockResolvedValue({ points: [] });
      const store = makeStore();
      await store.dispatch(fetchTrends({ metricName: 'orders' }) as any);
      expect(store.getState().analytics.isLoading).toBe(false);
    });

    it('captures error on rejection', async () => {
      mockedApi.get.mockRejectedValue(new Error('bad metric'));
      const store = makeStore();
      await store.dispatch(fetchTrends({ metricName: 'orders' }) as any);
      expect(store.getState().analytics.error).toBe('bad metric');
    });
  });
});
