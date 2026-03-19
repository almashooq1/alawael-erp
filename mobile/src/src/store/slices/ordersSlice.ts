/**
 * Orders Redux Slice
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import ApiService from '../../services/ApiService';

interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  totalAmount: number;
  status: string;
  items: any[];
  createdAt: string;
  updatedAt: string;
}

interface OrdersState {
  items: Order[];
  currentOrder: Order | null;
  isLoading: boolean;
  error: string | null;
  total: number;
  filters: {
    status: string | null;
    dateRange: { start: string; end: string } | null;
  };
}

const initialState: OrdersState = {
  items: [],
  currentOrder: null,
  isLoading: false,
  error: null,
  total: 0,
  filters: {
    status: null,
    dateRange: null,
  },
};

// Async thunks
export const fetchOrders = createAsyncThunk(
  'orders/fetchOrders',
  async (
    params: { page?: number; limit?: number; status?: string },
    { rejectWithValue }
  ) => {
    try {
      const response: any = await ApiService.get('/orders', params);
      return { items: response.items, total: response.total };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch orders');
    }
  }
);

export const fetchOrderById = createAsyncThunk(
  'orders/fetchOrderById',
  async (orderId: string, { rejectWithValue }) => {
    try {
      const response = await ApiService.get(`/orders/${orderId}`);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch order');
    }
  }
);

export const createOrder = createAsyncThunk(
  'orders/createOrder',
  async (orderData: any, { rejectWithValue }) => {
    try {
      const response = await ApiService.post('/orders', orderData);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to create order');
    }
  }
);

export const updateOrder = createAsyncThunk(
  'orders/updateOrder',
  async (
    { orderId, data }: { orderId: string; data: any },
    { rejectWithValue }
  ) => {
    try {
      const response = await ApiService.put(`/orders/${orderId}`, data);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update order');
    }
  }
);

export const deleteOrder = createAsyncThunk(
  'orders/deleteOrder',
  async (orderId: string, { rejectWithValue }) => {
    try {
      await ApiService.delete(`/orders/${orderId}`);
      return orderId;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to delete order');
    }
  }
);

const ordersSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    setStatusFilter: (state, action) => {
      state.filters.status = action.payload;
    },
    setDateRangeFilter: (state, action) => {
      state.filters.dateRange = action.payload;
    },
    clearFilters: (state) => {
      state.filters = { status: null, dateRange: null };
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch Orders
    builder
      .addCase(fetchOrders.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchOrders.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload.items;
        state.total = action.payload.total;
      })
      .addCase(fetchOrders.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch Order by ID
    builder
      .addCase(fetchOrderById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchOrderById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentOrder = action.payload;
      })
      .addCase(fetchOrderById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Create Order
    builder
      .addCase(createOrder.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createOrder.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items.unshift(action.payload);
        state.total += 1;
      })
      .addCase(createOrder.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Update Order
    builder
      .addCase(updateOrder.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateOrder.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.items.findIndex((o) => o.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        if (state.currentOrder?.id === action.payload.id) {
          state.currentOrder = action.payload;
        }
      })
      .addCase(updateOrder.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Delete Order
    builder
      .addCase(deleteOrder.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteOrder.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = state.items.filter((o) => o.id !== action.payload);
        state.total -= 1;
      })
      .addCase(deleteOrder.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setStatusFilter, setDateRangeFilter, clearFilters, clearError } = ordersSlice.actions;
export default ordersSlice.reducer;
