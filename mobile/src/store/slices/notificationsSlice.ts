/**
 * Notifications Redux Slice
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import ApiService from '../../services/ApiService';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
  data?: any;
}

interface NotificationsState {
  items: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  settings: {
    pushEnabled: boolean;
    emailEnabled: boolean;
    notificationTypes: string[];
  };
}

const initialState: NotificationsState = {
  items: [],
  unreadCount: 0,
  isLoading: false,
  error: null,
  settings: {
    pushEnabled: true,
    emailEnabled: true,
    notificationTypes: ['order', 'report', 'alert', 'system'],
  },
};

// Async thunks
export const fetchNotifications = createAsyncThunk(
  'notifications/fetchNotifications',
  async (params: { limit?: number; unreadOnly?: boolean } = {}, { rejectWithValue }) => {
    try {
      const response: any = await ApiService.get('/notifications', params);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch notifications');
    }
  }
);

export const markAsRead = createAsyncThunk(
  'notifications/markAsRead',
  async (notificationId: string, { rejectWithValue }) => {
    try {
      await ApiService.put(`/notifications/${notificationId}`, { read: true });
      return notificationId;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to mark as read');
    }
  }
);

export const markAllAsRead = createAsyncThunk(
  'notifications/markAllAsRead',
  async (_, { rejectWithValue }) => {
    try {
      await ApiService.put('/notifications/mark-all-read', {});
      return true;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to mark all as read');
    }
  }
);

export const deleteNotification = createAsyncThunk(
  'notifications/deleteNotification',
  async (notificationId: string, { rejectWithValue }) => {
    try {
      await ApiService.delete(`/notifications/${notificationId}`);
      return notificationId;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to delete notification');
    }
  }
);

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    addNotification: (state, action) => {
      state.items.unshift(action.payload);
      if (!action.payload.read) {
        state.unreadCount += 1;
      }
    },
    clearError: (state) => {
      state.error = null;
    },
    updateSettings: (state, action) => {
      state.settings = { ...state.settings, ...action.payload };
    },
  },
  extraReducers: (builder) => {
    // Fetch Notifications
    builder
      .addCase(fetchNotifications.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload.items || action.payload;
        state.unreadCount =
          state.items.filter((n) => !n.read).length || action.payload.unreadCount || 0;
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Mark as Read
    builder
      .addCase(markAsRead.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(markAsRead.fulfilled, (state, action) => {
        state.isLoading = false;
        const notification = state.items.find((n) => n.id === action.payload);
        if (notification && !notification.read) {
          notification.read = true;
          state.unreadCount -= 1;
        }
      })
      .addCase(markAsRead.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Mark All as Read
    builder
      .addCase(markAllAsRead.fulfilled, (state) => {
        state.items.forEach((n) => {
          n.read = true;
        });
        state.unreadCount = 0;
      });

    // Delete Notification
    builder
      .addCase(deleteNotification.fulfilled, (state, action) => {
        const notification = state.items.find((n) => n.id === action.payload);
        if (notification && !notification.read) {
          state.unreadCount -= 1;
        }
        state.items = state.items.filter((n) => n.id !== action.payload);
      });
  },
});

export const { addNotification, clearError, updateSettings } = notificationsSlice.actions;
export default notificationsSlice.reducer;
