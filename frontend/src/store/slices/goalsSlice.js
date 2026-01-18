// Redux Slice للأهداف - goalsSlice.js

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../utils/api';

export const fetchGoals = createAsyncThunk('goals/fetchGoals', async (params, { rejectWithValue }) => {
  try {
    const response = await api.get('/goals', { params });
    return response.data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message);
  }
});

export const fetchGoalById = createAsyncThunk('goals/fetchGoalById', async (id, { rejectWithValue }) => {
  try {
    const response = await api.get(`/goals/${id}`);
    return response.data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message);
  }
});

export const createGoal = createAsyncThunk('goals/createGoal', async (goalData, { rejectWithValue }) => {
  try {
    const response = await api.post('/goals', goalData);
    return response.data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message);
  }
});

export const updateGoalProgress = createAsyncThunk(
  'goals/updateGoalProgress',
  async ({ id, progress_percentage, notes }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/goals/${id}/progress`, {
        progress_percentage,
        notes,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  },
);

const initialState = {
  goals: [],
  currentGoal: null,
  progressHistory: [],
  pagination: {
    page: 1,
    per_page: 20,
    total: 0,
    pages: 0,
  },
  loading: false,
  error: null,
};

const goalsSlice = createSlice({
  name: 'goals',
  initialState,
  reducers: {
    clearError: state => {
      state.error = null;
    },
  },
  extraReducers: builder => {
    builder
      .addCase(fetchGoals.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchGoals.fulfilled, (state, action) => {
        state.loading = false;
        state.goals = action.payload.data;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchGoals.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(fetchGoalById.pending, state => {
        state.loading = true;
      })
      .addCase(fetchGoalById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentGoal = action.payload.data;
      })
      .addCase(fetchGoalById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(createGoal.pending, state => {
        state.loading = true;
      })
      .addCase(createGoal.fulfilled, (state, action) => {
        state.loading = false;
        state.goals.unshift(action.payload.data);
      })
      .addCase(createGoal.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(updateGoalProgress.fulfilled, (state, action) => {
        const index = state.goals.findIndex(g => g.id === action.payload.data.id);
        if (index !== -1) {
          state.goals[index] = action.payload.data;
        }
        if (state.currentGoal?.id === action.payload.data.id) {
          state.currentGoal = action.payload.data;
        }
      });
  },
});

export const { clearError } = goalsSlice.actions;
export default goalsSlice.reducer;
