// Redux Slice للتقييمات - assessmentsSlice.js

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../utils/api';

export const fetchAssessments = createAsyncThunk('assessments/fetchAssessments', async (params, { rejectWithValue }) => {
  try {
    const response = await api.get('/assessments', { params });
    return response.data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message);
  }
});

export const fetchAssessmentById = createAsyncThunk('assessments/fetchAssessmentById', async (id, { rejectWithValue }) => {
  try {
    const response = await api.get(`/assessments/${id}`);
    return response.data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message);
  }
});

export const createAssessment = createAsyncThunk('assessments/createAssessment', async (assessmentData, { rejectWithValue }) => {
  try {
    const response = await api.post('/assessments', assessmentData);
    return response.data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message);
  }
});

export const updateAssessment = createAsyncThunk('assessments/updateAssessment', async ({ id, data }, { rejectWithValue }) => {
  try {
    const response = await api.put(`/assessments/${id}`, data);
    return response.data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message);
  }
});

const initialState = {
  assessments: [],
  currentAssessment: null,
  pagination: {
    page: 1,
    per_page: 20,
    total: 0,
    pages: 0,
  },
  loading: false,
  error: null,
};

const assessmentsSlice = createSlice({
  name: 'assessments',
  initialState,
  reducers: {
    clearError: state => {
      state.error = null;
    },
    clearCurrentAssessment: state => {
      state.currentAssessment = null;
    },
  },
  extraReducers: builder => {
    builder
      .addCase(fetchAssessments.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAssessments.fulfilled, (state, action) => {
        state.loading = false;
        state.assessments = action.payload.data;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchAssessments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(fetchAssessmentById.pending, state => {
        state.loading = true;
      })
      .addCase(fetchAssessmentById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentAssessment = action.payload.data;
      })
      .addCase(fetchAssessmentById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(createAssessment.fulfilled, (state, action) => {
        state.assessments.unshift(action.payload.data);
      })

      .addCase(updateAssessment.fulfilled, (state, action) => {
        const index = state.assessments.findIndex(a => a.id === action.payload.data.id);
        if (index !== -1) {
          state.assessments[index] = action.payload.data;
        }
        state.currentAssessment = action.payload.data;
      });
  },
});

export const { clearError, clearCurrentAssessment } = assessmentsSlice.actions;
export default assessmentsSlice.reducer;
