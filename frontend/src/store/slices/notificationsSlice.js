// Notifications Slice
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import notificationsService from '../../services/notificationsService';

export const fetchNotifications = createAsyncThunk('notifications/fetchAll', async () => {
  return await notificationsService.getNotifications();
});

export const markAsRead = createAsyncThunk('notifications/markAsRead', async notificationId => {
  return await notificationsService.markAsRead(notificationId);
});

export const deleteNotification = createAsyncThunk('notifications/delete', async notificationId => {
  await notificationsService.deleteNotification(notificationId);
  return notificationId;
});

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState: {
    notifications: [],
    unreadCount: 0,
    loading: false,
    error: null,
  },
  reducers: {
    clearError: state => {
      state.error = null;
    },
  },
  extraReducers: builder => {
    builder
      .addCase(fetchNotifications.pending, state => {
        state.loading = true;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.loading = false;
        state.notifications = action.payload;
        state.unreadCount = action.payload.filter(n => !n.read).length;
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(markAsRead.fulfilled, (state, action) => {
        const notification = state.notifications.find(n => n.id === action.payload.id);
        if (notification) {
          notification.read = true;
          state.unreadCount--;
        }
      })
      .addCase(deleteNotification.fulfilled, (state, action) => {
        const notification = state.notifications.find(n => n.id === action.payload);
        if (notification && !notification.read) {
          state.unreadCount--;
        }
        state.notifications = state.notifications.filter(n => n.id !== action.payload);
      });
  },
});

export const { clearError } = notificationsSlice.actions;
export default notificationsSlice.reducer;
