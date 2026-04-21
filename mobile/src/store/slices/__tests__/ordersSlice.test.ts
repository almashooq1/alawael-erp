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
import ordersReducer, {
  fetchOrders,
  fetchOrderById,
  createOrder,
  updateOrder,
  deleteOrder,
  setStatusFilter,
  clearFilters,
} from '../ordersSlice';

const mockedApi = ApiService as jest.Mocked<typeof ApiService>;

describe('ordersSlice', () => {
  let store: any;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        orders: ordersReducer,
      },
    });
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = store.getState().orders;
      expect(state.items).toEqual([]);
      expect(state.currentOrder).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.total).toBe(0);
      expect(state.filters).toEqual({
        status: null,
        dateRange: null,
      });
    });
  });

  describe('fetchOrders thunk', () => {
    it('should fetch orders successfully', async () => {
      const mockOrders = [
        { id: '1', orderNumber: 'ORD-001', customerId: 'cust-1', totalAmount: 1000, status: 'completed', items: [], createdAt: '2026-04-21', updatedAt: '2026-04-21' },
        { id: '2', orderNumber: 'ORD-002', customerId: 'cust-2', totalAmount: 2000, status: 'pending', items: [], createdAt: '2026-04-21', updatedAt: '2026-04-21' },
      ];
      mockedApi.get.mockResolvedValue({ items: mockOrders, total: 2 });

      await store.dispatch(fetchOrders({ page: 1, limit: 10 }) as any);
      const state = store.getState().orders;

      expect(state.items).toEqual(mockOrders);
      expect(state.total).toBe(2);
      expect(state.isLoading).toBe(false);
    });

    it('should handle fetch error', async () => {
      mockedApi.get.mockRejectedValue(new Error('Server error'));
      await store.dispatch(fetchOrders({ page: 1, limit: 10 }) as any);
      const state = store.getState().orders;
      expect(state.error).not.toBeNull();
      expect(state.items).toEqual([]);
    });
  });

  describe('fetchOrderById thunk', () => {
    it('should fetch order by id', async () => {
      const mockOrder = {
        id: '1',
        orderNumber: 'ORD-001',
        customerId: 'cust-1',
        totalAmount: 1000,
        status: 'completed',
        items: [
          {
            productId: 'prod-1',
            quantity: 2,
            price: 500,
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockedApi.get.mockResolvedValue(mockOrder);

      await store.dispatch(fetchOrderById('1') as any);
      const state = store.getState().orders;

      expect(state.currentOrder).toEqual(mockOrder);
      expect(state.isLoading).toBe(false);
    });
  });

  describe('createOrder thunk', () => {
    it('should create order successfully', async () => {
      const newOrder = {
        customerId: 'cust-1',
        items: [
          {
            productId: 'prod-1',
            quantity: 2,
            price: 500,
          },
        ],
        totalAmount: 1000,
      };

      const mockResponse = {
        id: '1',
        orderNumber: 'ORD-001',
        ...newOrder,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockedApi.post.mockResolvedValue(mockResponse);

      await store.dispatch(createOrder(newOrder) as any);
      const state = store.getState().orders;

      expect(state.items).toContainEqual(mockResponse);
    });
  });

  describe('updateOrder thunk', () => {
    it('should update order successfully', async () => {
      const initialState = {
        items: [
          {
            id: '1',
            orderNumber: 'ORD-001',
            customerId: 'cust-1',
            totalAmount: 1000,
            status: 'pending',
            items: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        currentOrder: null,
        isLoading: false,
        error: null,
        total: 1,
        filters: {
          status: null,
          dateRange: null,
        },
      };

      store = configureStore({
        reducer: {
          orders: ordersReducer,
        },
        preloadedState: {
          orders: initialState,
        },
      });

      const updateData = {
        id: '1',
        status: 'processing',
      };

      const mockResponse = {
        ...initialState.items[0],
        status: 'processing',
      };

      mockedApi.put.mockResolvedValue(mockResponse);

      await store.dispatch(updateOrder(updateData) as any);
      const state = store.getState().orders;

      expect(state.items[0].status).toBe('processing');
    });
  });

  describe('deleteOrder thunk', () => {
    it('should delete order successfully', async () => {
      const initialState = {
        items: [
          {
            id: '1',
            orderNumber: 'ORD-001',
            customerId: 'cust-1',
            totalAmount: 1000,
            status: 'pending',
            items: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        currentOrder: null,
        isLoading: false,
        error: null,
        total: 1,
        filters: {
          status: null,
          dateRange: null,
        },
      };

      store = configureStore({
        reducer: {
          orders: ordersReducer,
        },
        preloadedState: {
          orders: initialState,
        },
      });

      mockedApi.delete.mockResolvedValue({});

      await store.dispatch(deleteOrder('1') as any);
      const state = store.getState().orders;

      expect(state.items).toEqual([]);
      expect(state.total).toBe(0);
    });
  });

  describe('filter actions', () => {
    it('should set status filter', () => {
      store.dispatch(setStatusFilter('completed'));
      const state = store.getState().orders;

      expect(state.filters.status).toBe('completed');
    });

    it('should clear filters', () => {
      store.dispatch(setStatusFilter('completed'));
      store.dispatch(
        clearFilters()
      );
      const state = store.getState().orders;

      expect(state.filters.status).toBeNull();
      expect(state.filters.dateRange).toBeNull();
    });
  });
});
