/**
 * Reports Redux Slice
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import ApiService from '../../services/ApiService';

interface Report {
  id: string;
  name: string;
  type: string;
  format: string;
  status: string;
  fileUrl?: string;
  createdAt: string;
}

interface ReportsState {
  items: Report[];
  currentReport: Report | null;
  isLoading: boolean;
  isGenerating: boolean;
  error: string | null;
  templates: string[];
}

const initialState: ReportsState = {
  items: [],
  currentReport: null,
  isLoading: false,
  isGenerating: false,
  error: null,
  templates: ['Sales', 'Financial', 'Operational', 'Customer', 'Inventory', 'Executive'],
};

// Async thunks
export const fetchReports = createAsyncThunk(
  'reports/fetchReports',
  async (params: { type?: string; limit?: number } = {}, { rejectWithValue }) => {
    try {
      const response: any = await ApiService.get('/reports', params);
      return response.items || response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch reports');
    }
  }
);

export const generateReport = createAsyncThunk(
  'reports/generateReport',
  async (
    reportData: {
      type: string;
      template: string;
      format: string;
      filters?: any;
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await ApiService.post('/reports/generate', reportData);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to generate report');
    }
  }
);

export const downloadReport = createAsyncThunk(
  'reports/downloadReport',
  async (reportId: string, { rejectWithValue }) => {
    try {
      const response = await ApiService.get(`/reports/${reportId}/download`);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to download report');
    }
  }
);

const reportsSlice = createSlice({
  name: 'reports',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch Reports
    builder
      .addCase(fetchReports.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchReports.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload;
      })
      .addCase(fetchReports.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Generate Report
    builder
      .addCase(generateReport.pending, (state) => {
        state.isGenerating = true;
        state.error = null;
      })
      .addCase(generateReport.fulfilled, (state, action) => {
        state.isGenerating = false;
        state.currentReport = action.payload;
        state.items.unshift(action.payload);
      })
      .addCase(generateReport.rejected, (state, action) => {
        state.isGenerating = false;
        state.error = action.payload as string;
      });

    // Download Report
    builder
      .addCase(downloadReport.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(downloadReport.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(downloadReport.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError } = reportsSlice.actions;
export default reportsSlice.reducer;
