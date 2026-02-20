// Analytics Slice
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import analyticsService from '../../services/analyticsService';

export const fetchDashboard = createAsyncThunk('analytics/fetchDashboard', async () => {
  return await analyticsService.getDashboardOverview();
});

export const fetchMetrics = createAsyncThunk('analytics/fetchMetrics', async period => {
  return await analyticsService.getSystemMetrics(period);
});

export const fetchRealTimeStats = createAsyncThunk('analytics/fetchRealTime', async () => {
  return await analyticsService.getRealTimeStats();
});

const analyticsSlice = createSlice({
  name: 'analytics',
  initialState: {
    dashboard: null,
    metrics: null,
    realTimeStats: null,
    loading: false,
    error: null,
  },
  reducers: {
    clearError: state => {
      state.error = null;
    },
  },
  extraReducers: builder => {
    builder
      .addCase(fetchDashboard.pending, state => {
        state.loading = true;
      })
      .addCase(fetchDashboard.fulfilled, (state, action) => {
        state.loading = false;
        state.dashboard = action.payload;
      })
      .addCase(fetchDashboard.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(fetchMetrics.fulfilled, (state, action) => {
        state.metrics = action.payload;
      })
      .addCase(fetchRealTimeStats.fulfilled, (state, action) => {
        state.realTimeStats = action.payload;
      });
  },
});

export const { clearError } = analyticsSlice.actions;
export default analyticsSlice.reducer;
