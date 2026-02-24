import { configureStore } from '@reduxjs/toolkit';
import ordersReducer, {
  fetchOrders,
  fetchOrderById,
  createOrder,
  updateOrder,
  deleteOrder,
  setStatusFilter,
  clearFilters,
} from '../../store/slices/ordersSlice';

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
        status: 'all',
        dateRange: null,
      });
    });
  });

  describe('fetchOrders thunk', () => {
    it('should fetch orders successfully', async () => {
      const mockOrders = [
        {
          id: '1',
          orderNumber: 'ORD-001',
          customerId: 'cust-1',
          totalAmount: 1000,
          status: 'completed',
          items: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: '2',
          orderNumber: 'ORD-002',
          customerId: 'cust-2',
          totalAmount: 2000,
          status: 'pending',
          items: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              orders: mockOrders,
              total: 2,
            }),
        })
      );

      await store.dispatch(
        fetchOrders({ page: 1, limit: 10, status: 'all' }) as any
      );
      const state = store.getState().orders;

      expect(state.items).toEqual(mockOrders);
      expect(state.total).toBe(2);
      expect(state.isLoading).toBe(false);
    });

    it('should handle fetch error', async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ message: 'Server error' }),
        })
      );

      await store.dispatch(
        fetchOrders({ page: 1, limit: 10, status: 'all' }) as any
      );
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

      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockOrder),
        })
      );

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

      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        })
      );

      await store.dispatch(createOrder(newOrder) as any);
      const state = store.getState().orders;

      expect(state.items).toContainEqual(mockResponse);
      expect(state.currentOrder).toEqual(mockResponse);
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
          status: 'all',
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

      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        })
      );

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
          status: 'all',
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

      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        })
      );

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

      expect(state.filters.status).toBe('all');
      expect(state.filters.dateRange).toBeNull();
    });
  });
});
