// Redux Slice للبرامج والأهداف - programsSlice.js

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api';

export const fetchPrograms = createAsyncThunk(
  'programs/fetchPrograms',
  async (params, { rejectWithValue }) => {
    try {
      const response = await api.get('/programs', { params });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  }
);

export const createProgram = createAsyncThunk(
  'programs/createProgram',
  async (programData, { rejectWithValue }) => {
    try {
      const response = await api.post('/programs', programData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  }
);

export const enrollBeneficiary = createAsyncThunk(
  'programs/enrollBeneficiary',
  async ({ programId, beneficiaryId }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/programs/${programId}/enroll`, {
        beneficiary_id: beneficiaryId,
        start_date: new Date().toISOString().split('T')[0],
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  }
);

const initialState = {
  programs: [],
  currentProgram: null,
  pagination: {
    page: 1,
    per_page: 20,
    total: 0,
    pages: 0,
  },
  loading: false,
  error: null,
};

const programsSlice = createSlice({
  name: 'programs',
  initialState,
  reducers: {
    clearError: state => {
      state.error = null;
    },
  },
  extraReducers: builder => {
    builder
      .addCase(fetchPrograms.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPrograms.fulfilled, (state, action) => {
        state.loading = false;
        state.programs = action.payload.data;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchPrograms.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(createProgram.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createProgram.fulfilled, (state, action) => {
        state.loading = false;
        state.programs.unshift(action.payload.data);
      })
      .addCase(createProgram.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(enrollBeneficiary.fulfilled, state => {
        state.error = null;
      });
  },
});

export const { clearError } = programsSlice.actions;
export default programsSlice.reducer;
