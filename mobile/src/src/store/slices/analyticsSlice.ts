/**
 * Analytics Redux Slice
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import ApiService from '../../services/ApiService';

interface Metric {
  name: string;
  value: number;
  trend: number;
  status: string;
}

interface Dashboard {
  id: string;
  name: string;
  type: string;
  widgets: any[];
}

interface AnalyticsState {
  metrics: Metric[];
  dashboards: Dashboard[];
  currentDashboard: Dashboard | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: AnalyticsState = {
  metrics: [],
  dashboards: [],
  currentDashboard: null,
  isLoading: false,
  error: null,
};

// Async thunks
export const fetchMetrics = createAsyncThunk(
  'analytics/fetchMetrics',
  async (params: { period?: string } = {}, { rejectWithValue }) => {
    try {
      const response: any = await ApiService.get('/analytics/metrics', params);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch metrics');
    }
  }
);

export const fetchDashboards = createAsyncThunk(
  'analytics/fetchDashboards',
  async (_, { rejectWithValue }) => {
    try {
      const response: any = await ApiService.get('/analytics/dashboards');
      return response.items || response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch dashboards');
    }
  }
);

export const fetchDashboard = createAsyncThunk(
  'analytics/fetchDashboard',
  async (dashboardId: string, { rejectWithValue }) => {
    try {
      const response = await ApiService.get(`/analytics/dashboards/${dashboardId}`);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch dashboard');
    }
  }
);

export const fetchTrends = createAsyncThunk(
  'analytics/fetchTrends',
  async (
    params: { metricName: string; period?: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await ApiService.get(`/analytics/trends/${params.metricName}`, {
        period: params.period,
      });
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch trends');
    }
  }
);

const analyticsSlice = createSlice({
  name: 'analytics',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch Metrics
    builder
      .addCase(fetchMetrics.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchMetrics.fulfilled, (state, action) => {
        state.isLoading = false;
        state.metrics = action.payload;
      })
      .addCase(fetchMetrics.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch Dashboards
    builder
      .addCase(fetchDashboards.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchDashboards.fulfilled, (state, action) => {
        state.isLoading = false;
        state.dashboards = action.payload;
      })
      .addCase(fetchDashboards.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch Dashboard
    builder
      .addCase(fetchDashboard.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchDashboard.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentDashboard = action.payload;
      })
      .addCase(fetchDashboard.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch Trends
    builder
      .addCase(fetchTrends.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchTrends.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(fetchTrends.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError } = analyticsSlice.actions;
export default analyticsSlice.reducer;
