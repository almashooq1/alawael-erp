// Redux Slice للجلسات - sessionsSlice.js

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api';

export const fetchSessions = createAsyncThunk(
  'sessions/fetchSessions',
  async (params, { rejectWithValue }) => {
    try {
      const response = await api.get('/sessions', { params });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  }
);

export const fetchSessionById = createAsyncThunk(
  'sessions/fetchSessionById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.get(`/sessions/${id}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  }
);

export const createSession = createAsyncThunk(
  'sessions/createSession',
  async (sessionData, { rejectWithValue }) => {
    try {
      const response = await api.post('/sessions', sessionData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  }
);

export const updateSession = createAsyncThunk(
  'sessions/updateSession',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/sessions/${id}`, data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  }
);

export const deleteSession = createAsyncThunk(
  'sessions/deleteSession',
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/sessions/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  }
);

export const completeSession = createAsyncThunk(
  'sessions/completeSession',
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.post(`/sessions/${id}/complete`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  }
);

const initialState = {
  sessions: [],
  currentSession: null,
  pagination: {
    page: 1,
    per_page: 20,
    total: 0,
    pages: 0,
  },
  loading: false,
  error: null,
};

const sessionsSlice = createSlice({
  name: 'sessions',
  initialState,
  reducers: {
    clearError: state => {
      state.error = null;
    },
    clearCurrentSession: state => {
      state.currentSession = null;
    },
  },
  extraReducers: builder => {
    builder
      .addCase(fetchSessions.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSessions.fulfilled, (state, action) => {
        state.loading = false;
        state.sessions = action.payload.data;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchSessions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(fetchSessionById.pending, state => {
        state.loading = true;
      })
      .addCase(fetchSessionById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentSession = action.payload.data;
      })
      .addCase(fetchSessionById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(createSession.fulfilled, (state, action) => {
        state.sessions.unshift(action.payload.data);
      })

      .addCase(updateSession.fulfilled, (state, action) => {
        const index = state.sessions.findIndex(s => s.id === action.payload.data.id);
        if (index !== -1) {
          state.sessions[index] = action.payload.data;
        }
        state.currentSession = action.payload.data;
      })

      .addCase(deleteSession.fulfilled, (state, action) => {
        state.sessions = state.sessions.filter(s => s.id !== action.payload);
      })

      .addCase(completeSession.fulfilled, (state, action) => {
        const index = state.sessions.findIndex(s => s.id === action.payload.data.id);
        if (index !== -1) {
          state.sessions[index] = action.payload.data;
        }
      });
  },
});

export const { clearError, clearCurrentSession } = sessionsSlice.actions;
export default sessionsSlice.reducer;
