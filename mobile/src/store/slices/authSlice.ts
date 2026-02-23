/**
 * Auth Redux Slice
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import * as SecureStore from 'expo-secure-store';
import ApiService from '../../services/ApiService';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

const initialState: AuthState = {
  user: null,
  token: null,
  isLoading: false,
  error: null,
  isAuthenticated: false,
};

// Async thunks
export const login = createAsyncThunk(
  'auth/login',
  async (
    credentials: { email: string; password: string },
    { rejectWithValue }
  ) => {
    try {
      const response: any = await ApiService.post('/auth/login', credentials);
      await SecureStore.setItemAsync('authToken', response.token);
      if (response.refreshToken) {
        await SecureStore.setItemAsync('refreshToken', response.refreshToken);
      }
      return { user: response.user, token: response.token };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Login failed');
    }
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async (
    userData: { email: string; password: string; name: string; company: string },
    { rejectWithValue }
  ) => {
    try {
      const response: any = await ApiService.post('/auth/register', userData);
      await SecureStore.setItemAsync('authToken', response.token);
      if (response.refreshToken) {
        await SecureStore.setItemAsync('refreshToken', response.refreshToken);
      }
      return { user: response.user, token: response.token };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Registration failed');
    }
  }
);

export const logout = createAsyncThunk('auth/logout', async () => {
  await SecureStore.deleteItemAsync('authToken');
  await SecureStore.deleteItemAsync('refreshToken');
  return null;
});

export const checkAuth = createAsyncThunk('auth/checkAuth', async (_, { rejectWithValue }) => {
  try {
    const token = await SecureStore.getItemAsync('authToken');
    if (!token) {
      return { user: null, token: null };
    }

    // Verify token with backend
    const response: any = await ApiService.get('/auth/me');
    return { user: response, token };
  } catch (error) {
    return rejectWithValue('Auth check failed');
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Login
    builder
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Register
    builder
      .addCase(register.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
      })
      .addCase(register.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Logout
    builder.addCase(logout.fulfilled, (state) => {
      state.isAuthenticated = false;
      state.user = null;
      state.token = null;
    });

    // Check Auth
    builder
      .addCase(checkAuth.fulfilled, (state, action) => {
        state.isAuthenticated = !!action.payload.token;
        state.user = action.payload.user;
        state.token = action.payload.token;
      })
      .addCase(checkAuth.rejected, (state) => {
        state.isAuthenticated = false;
      });
  },
});

export const { clearError } = authSlice.actions;
export default authSlice.reducer;
