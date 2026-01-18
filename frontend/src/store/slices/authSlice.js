// Redux Slice للمصادقة - Auth Slice

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../utils/api';

// تسجيل الدخول
export const login = createAsyncThunk('auth/login', async (credentials, { rejectWithValue }) => {
  try {
    const response = await api.post('/auth/login', credentials);
    const { access_token, refresh_token, user } = response.data.data;

    // حفظ التوكنات
    localStorage.setItem('access_token', access_token);
    localStorage.setItem('refresh_token', refresh_token);
    localStorage.setItem('user', JSON.stringify(user));

    return response.data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || 'فشل تسجيل الدخول');
  }
});

// تسجيل الخروج
export const logout = createAsyncThunk('auth/logout', async (_, { rejectWithValue }) => {
  try {
    await api.post('/auth/logout');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    return true;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message);
  }
});

// جلب معلومات المستخدم الحالي
export const getCurrentUser = createAsyncThunk('auth/getCurrentUser', async (_, { rejectWithValue }) => {
  try {
    const response = await api.get('/auth/me');
    return response.data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message);
  }
});

// تحديث معلومات المستخدم
export const updateProfile = createAsyncThunk('auth/updateProfile', async (profileData, { rejectWithValue }) => {
  try {
    const response = await api.put('/auth/me', profileData);
    const user = response.data.data;
    localStorage.setItem('user', JSON.stringify(user));
    return response.data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message);
  }
});

// تغيير كلمة المرور
export const changePassword = createAsyncThunk('auth/changePassword', async (passwordData, { rejectWithValue }) => {
  try {
    const response = await api.post('/auth/change-password', passwordData);
    return response.data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message);
  }
});

const initialState = {
  user: JSON.parse(localStorage.getItem('user')) || null,
  isAuthenticated: !!localStorage.getItem('access_token'),
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: state => {
      state.error = null;
    },
    setUser: (state, action) => {
      state.user = action.payload;
      state.isAuthenticated = true;
    },
  },
  extraReducers: builder => {
    builder
      // Login
      .addCase(login.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload.data.user;
        state.error = null;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Logout
      .addCase(logout.fulfilled, state => {
        state.user = null;
        state.isAuthenticated = false;
        state.error = null;
      })

      // Get Current User
      .addCase(getCurrentUser.pending, state => {
        state.loading = true;
      })
      .addCase(getCurrentUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.data;
      })
      .addCase(getCurrentUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.isAuthenticated = false;
      })

      // Update Profile
      .addCase(updateProfile.pending, state => {
        state.loading = true;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.data;
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Change Password
      .addCase(changePassword.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(changePassword.fulfilled, state => {
        state.loading = false;
      })
      .addCase(changePassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearError, setUser } = authSlice.actions;
export default authSlice.reducer;
