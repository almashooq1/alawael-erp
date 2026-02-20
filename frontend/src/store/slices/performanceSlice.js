// Performance Slice
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import performanceService from '../../services/performanceService';

export const fetchCacheStats = createAsyncThunk('performance/fetchCacheStats', async () => {
  return await performanceService.getCacheStats();
});

export const fetchMetrics = createAsyncThunk('performance/fetchMetrics', async () => {
  return await performanceService.getDatabasePerformance();
});

export const runLoadTest = createAsyncThunk('performance/runLoadTest', async testConfig => {
  return await performanceService.runLoadTest(testConfig);
});

const performanceSlice = createSlice({
  name: 'performance',
  initialState: {
    cacheStats: null,
    metrics: null,
    loadTestResults: null,
    loading: false,
    testing: false,
    error: null,
  },
  reducers: {
    clearError: state => {
      state.error = null;
    },
  },
  extraReducers: builder => {
    builder
      .addCase(fetchCacheStats.pending, state => {
        state.loading = true;
      })
      .addCase(fetchCacheStats.fulfilled, (state, action) => {
        state.loading = false;
        state.cacheStats = action.payload;
      })
      .addCase(fetchCacheStats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(fetchMetrics.fulfilled, (state, action) => {
        state.metrics = action.payload;
      })
      .addCase(runLoadTest.pending, state => {
        state.testing = true;
      })
      .addCase(runLoadTest.fulfilled, (state, action) => {
        state.testing = false;
        state.loadTestResults = action.payload;
      })
      .addCase(runLoadTest.rejected, (state, action) => {
        state.testing = false;
        state.error = action.error.message;
      });
  },
});

export const { clearError } = performanceSlice.actions;
export default performanceSlice.reducer;
