// Reports Slice
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import reportsService from '../../services/reportsService';

export const fetchReports = createAsyncThunk('reports/fetchAll', async () => {
  return await reportsService.getReports();
});

export const generateReport = createAsyncThunk('reports/generate', async reportConfig => {
  return await reportsService.generateReport(reportConfig);
});

export const scheduleReport = createAsyncThunk('reports/schedule', async scheduleConfig => {
  return await reportsService.scheduleReport(scheduleConfig);
});

export const deleteReport = createAsyncThunk('reports/delete', async reportId => {
  await reportsService.deleteReport(reportId);
  return reportId;
});

const reportsSlice = createSlice({
  name: 'reports',
  initialState: {
    reports: [],
    scheduled: [],
    selectedReport: null,
    loading: false,
    error: null,
  },
  reducers: {
    setSelectedReport: (state, action) => {
      state.selectedReport = action.payload;
    },
    clearError: state => {
      state.error = null;
    },
  },
  extraReducers: builder => {
    builder
      .addCase(fetchReports.pending, state => {
        state.loading = true;
      })
      .addCase(fetchReports.fulfilled, (state, action) => {
        state.loading = false;
        state.reports = action.payload;
      })
      .addCase(fetchReports.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(generateReport.fulfilled, (state, action) => {
        state.reports.push(action.payload);
      })
      .addCase(scheduleReport.fulfilled, (state, action) => {
        state.scheduled.push(action.payload);
      })
      .addCase(deleteReport.fulfilled, (state, action) => {
        state.reports = state.reports.filter(r => r.id !== action.payload);
      });
  },
});

export const { setSelectedReport, clearError } = reportsSlice.actions;
export default reportsSlice.reducer;
