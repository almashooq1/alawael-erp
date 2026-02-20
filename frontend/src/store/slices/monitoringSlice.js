// Monitoring Slice
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import monitoringService from '../../services/monitoringService';

export const fetchSystemHealth = createAsyncThunk('monitoring/fetchHealth', async () => {
  return await monitoringService.getSystemHealth();
});

export const fetchMetrics = createAsyncThunk('monitoring/fetchMetrics', async () => {
  return await monitoringService.getPerformanceMetrics();
});

export const fetchAlerts = createAsyncThunk('monitoring/fetchAlerts', async () => {
  return await monitoringService.getAlerts();
});

const monitoringSlice = createSlice({
  name: 'monitoring',
  initialState: {
    health: null,
    metrics: null,
    alerts: [],
    logs: [],
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
      .addCase(fetchSystemHealth.pending, state => {
        state.loading = true;
      })
      .addCase(fetchSystemHealth.fulfilled, (state, action) => {
        state.loading = false;
        state.health = action.payload;
      })
      .addCase(fetchSystemHealth.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(fetchMetrics.fulfilled, (state, action) => {
        state.metrics = action.payload;
      })
      .addCase(fetchAlerts.fulfilled, (state, action) => {
        state.alerts = action.payload;
      });
  },
});

export const { clearError } = monitoringSlice.actions;
export default monitoringSlice.reducer;
