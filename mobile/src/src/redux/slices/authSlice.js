/**
 * Auth Redux Slice - Mobile App
 * شريحة المصادقة Redux - تطبيق الهاتف الذكي
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import mobileApiService from '../../services/mobileApiService';
import storageService from '../../services/storageService';

/**
 * Async Thunks
 */
export const loginUser = createAsyncThunk('auth/loginUser', async ({ email, password }, { rejectWithValue }) => {
  try {
    const response = await mobileApiService.post('/auth/login', {
      email,
      password,
      deviceId: await storageService.getItem('deviceId'),
    });

    // Save tokens
    await storageService.setSecureItem('accessToken', response.accessToken);
    await storageService.setSecureItem('refreshToken', response.refreshToken);

    return response;
  } catch (error) {
    return rejectWithValue(error.response?.data || error.message);
  }
});

export const registerUser = createAsyncThunk('auth/registerUser', async (userData, { rejectWithValue }) => {
  try {
    const response = await mobileApiService.post('/auth/register', userData);
    return response;
  } catch (error) {
    return rejectWithValue(error.response?.data || error.message);
  }
});

export const loginWithNafath = createAsyncThunk('auth/loginWithNafath', async (nafathCode, { rejectWithValue }) => {
  try {
    const response = await mobileApiService.post('/auth/nafath-login', {
      code: nafathCode,
    });

    await storageService.setSecureItem('accessToken', response.accessToken);
    await storageService.setSecureItem('refreshToken', response.refreshToken);

    return response;
  } catch (error) {
    return rejectWithValue(error.response?.data || error.message);
  }
});

export const refreshToken = createAsyncThunk('auth/refreshToken', async (_, { rejectWithValue }) => {
  try {
    const oldRefreshToken = await storageService.getSecureItem('refreshToken');
    const response = await mobileApiService.post('/auth/refresh', {
      refreshToken: oldRefreshToken,
    });

    await storageService.setSecureItem('accessToken', response.accessToken);
    await storageService.setSecureItem('refreshToken', response.refreshToken);

    return response;
  } catch (error) {
    return rejectWithValue(error.response?.data || error.message);
  }
});

export const logoutUser = createAsyncThunk('auth/logoutUser', async (_, { rejectWithValue }) => {
  try {
    await mobileApiService.post('/auth/logout', {});
    await storageService.removeSecureItem('accessToken');
    await storageService.removeSecureItem('refreshToken');
    return null;
  } catch (error) {
    return rejectWithValue(error.response?.data || error.message);
  }
});

/**
 * Auth Slice
 */
const initialState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  loading: false,
  error: null,
  lastLogin: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action) => {
      state.user = action.payload;
    },
    clearError: state => {
      state.error = null;
    },
    resetAuth: state => {
      return initialState;
    },
  },
  extraReducers: builder => {
    // Login
    builder
      .addCase(loginUser.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
        state.isAuthenticated = true;
        state.lastLogin = new Date().toISOString();
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.isAuthenticated = false;
      });

    // Register
    builder
      .addCase(registerUser.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.isAuthenticated = true;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Nafath Login
    builder
      .addCase(loginWithNafath.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginWithNafath.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
        state.isAuthenticated = true;
        state.lastLogin = new Date().toISOString();
      })
      .addCase(loginWithNafath.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Token Refresh
    builder
      .addCase(refreshToken.fulfilled, (state, action) => {
        state.accessToken = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
      })
      .addCase(refreshToken.rejected, state => {
        state.isAuthenticated = false;
        state.user = null;
      });

    // Logout
    builder.addCase(logoutUser.fulfilled, state => {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
    });
  },
});

export const { setUser, clearError, resetAuth } = authSlice.actions;
export default authSlice.reducer;
