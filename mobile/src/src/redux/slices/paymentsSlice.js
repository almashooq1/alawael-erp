/**
 * Payments Redux Slice - Mobile App
 * شريحة المدفوعات Redux - تطبيق الهاتف الذكي
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import mobileApiService from '../../services/mobileApiService';

export const fetchPayments = createAsyncThunk('payments/fetchPayments', async (_, { rejectWithValue }) => {
  try {
    const response = await mobileApiService.get('/payments', { cache: true });
    return response;
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

export const initiatePayment = createAsyncThunk('payments/initiatePayment', async (paymentData, { rejectWithValue }) => {
  try {
    const response = await mobileApiService.post('/payments/initiate', paymentData);
    return response;
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

export const checkPaymentStatus = createAsyncThunk('payments/checkStatus', async (transactionId, { rejectWithValue }) => {
  try {
    const response = await mobileApiService.get(`/payments/${transactionId}/status`);
    return response;
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

const initialState = {
  data: [],
  currentPayment: null,
  loading: false,
  error: null,
  stats: {
    totalPaid: 0,
    pendingPayments: 0,
    failedPayments: 0,
  },
};

const paymentsSlice = createSlice({
  name: 'payments',
  initialState,
  reducers: {
    setCurrentPayment: (state, action) => {
      state.currentPayment = action.payload;
    },
    clearCurrentPayment: state => {
      state.currentPayment = null;
    },
    clearError: state => {
      state.error = null;
    },
  },
  extraReducers: builder => {
    builder
      .addCase(fetchPayments.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPayments.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
        // Calculate stats
        state.stats.totalPaid = action.payload.filter(p => p.status === 'completed').reduce((sum, p) => sum + p.amount, 0);
        state.stats.pendingPayments = action.payload.filter(p => p.status === 'pending').length;
        state.stats.failedPayments = action.payload.filter(p => p.status === 'failed').length;
      })
      .addCase(fetchPayments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(initiatePayment.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(initiatePayment.fulfilled, (state, action) => {
        state.loading = false;
        state.currentPayment = action.payload;
      })
      .addCase(initiatePayment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(checkPaymentStatus.fulfilled, (state, action) => {
        state.currentPayment = action.payload;
        // Update in data array if exists
        const index = state.data.findIndex(p => p.id === action.payload.id);
        if (index !== -1) {
          state.data[index] = action.payload;
        }
      });
  },
});

export const { setCurrentPayment, clearCurrentPayment, clearError } = paymentsSlice.actions;
export default paymentsSlice.reducer;
