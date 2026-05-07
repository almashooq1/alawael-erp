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
import reportsReducer, { fetchReports, generateReport, downloadReport, clearError } from '../reportsSlice';

const mockedApi = ApiService as jest.Mocked<typeof ApiService>;

const makeStore = (preloaded?: any) =>
  configureStore({
    reducer: { reports: reportsReducer },
    preloadedState: preloaded,
  });

describe('reportsSlice', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('exposes default templates and empty collections', () => {
      const state = makeStore().getState().reports;
      expect(state.items).toEqual([]);
      expect(state.currentReport).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.isGenerating).toBe(false);
      expect(state.templates).toEqual(expect.arrayContaining(['Sales', 'Financial', 'Operational', 'Customer', 'Inventory', 'Executive']));
    });
  });

  describe('clearError', () => {
    it('resets error to null', () => {
      const store = makeStore({
        reports: {
          items: [],
          currentReport: null,
          isLoading: false,
          isGenerating: false,
          error: 'old',
          templates: [],
        },
      });
      store.dispatch(clearError());
      expect(store.getState().reports.error).toBeNull();
    });
  });

  describe('fetchReports', () => {
    it('stores items from response.items shape', async () => {
      mockedApi.get.mockResolvedValue({ items: [{ id: '1', name: 'r', type: 't', format: 'pdf', status: 'ready', createdAt: 'x' }] });
      const store = makeStore();
      await store.dispatch(fetchReports({}) as any);
      const state = store.getState().reports;
      expect(state.items).toHaveLength(1);
      expect(state.isLoading).toBe(false);
    });

    it('also accepts an array response', async () => {
      mockedApi.get.mockResolvedValue([{ id: '2', name: 'r', type: 't', format: 'pdf', status: 'ready', createdAt: 'x' }]);
      const store = makeStore();
      await store.dispatch(fetchReports({}) as any);
      expect(store.getState().reports.items[0].id).toBe('2');
    });

    it('records error on rejection', async () => {
      mockedApi.get.mockRejectedValue(new Error('boom'));
      const store = makeStore();
      await store.dispatch(fetchReports({}) as any);
      expect(store.getState().reports.error).toBe('boom');
    });
  });

  describe('generateReport', () => {
    it('toggles isGenerating, sets currentReport, and prepends to items on success', async () => {
      const created = { id: 'r1', name: 'X', type: 'Sales', format: 'pdf', status: 'ready', createdAt: 'x' };
      mockedApi.post.mockResolvedValue(created);
      const store = makeStore();
      await store.dispatch(generateReport({ type: 'Sales', template: 'Sales', format: 'pdf' }) as any);
      const state = store.getState().reports;
      expect(state.isGenerating).toBe(false);
      expect(state.currentReport).toEqual(created);
      expect(state.items[0]).toEqual(created);
    });

    it('captures generation error', async () => {
      mockedApi.post.mockRejectedValue(new Error('quota'));
      const store = makeStore();
      await store.dispatch(generateReport({ type: 'Sales', template: 'Sales', format: 'pdf' }) as any);
      const state = store.getState().reports;
      expect(state.isGenerating).toBe(false);
      expect(state.error).toBe('quota');
    });
  });

  describe('downloadReport', () => {
    it('stops loading on success', async () => {
      mockedApi.get.mockResolvedValue({ ok: true });
      const store = makeStore();
      await store.dispatch(downloadReport('r1') as any);
      expect(store.getState().reports.isLoading).toBe(false);
    });

    it('records error on failure', async () => {
      mockedApi.get.mockRejectedValue(new Error('404'));
      const store = makeStore();
      await store.dispatch(downloadReport('missing') as any);
      expect(store.getState().reports.error).toBe('404');
    });
  });
});
