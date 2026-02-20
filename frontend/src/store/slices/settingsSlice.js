// ===================================
// Settings Slice - Theme & Language
// ===================================

import { createSlice } from '@reduxjs/toolkit';
import i18n from '../../i18n/config';

const initialState = {
  theme: localStorage.getItem('theme') || 'light', // 'light' or 'dark'
  language: localStorage.getItem('language') || 'en', // 'en' or 'ar'
  direction: localStorage.getItem('language') === 'ar' ? 'rtl' : 'ltr',
  notifications: {
    enabled: true,
    sound: true,
    desktop: false,
  },
  preferences: {
    sidebarCollapsed: false,
    compactMode: false,
    animationsEnabled: true,
  },
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    // Toggle theme between light and dark
    toggleTheme: state => {
      state.theme = state.theme === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme', state.theme);
    },

    // Set specific theme
    setTheme: (state, action) => {
      state.theme = action.payload;
      localStorage.setItem('theme', action.payload);
    },

    // Change language
    setLanguage: (state, action) => {
      const language = action.payload;
      state.language = language;
      state.direction = language === 'ar' ? 'rtl' : 'ltr';

      // Update localStorage
      localStorage.setItem('language', language);

      // Update i18n
      i18n.changeLanguage(language);

      // Update document direction
      document.documentElement.dir = state.direction;
      document.documentElement.lang = language;
    },

    // Toggle sidebar
    toggleSidebar: state => {
      state.preferences.sidebarCollapsed = !state.preferences.sidebarCollapsed;
      localStorage.setItem('sidebarCollapsed', state.preferences.sidebarCollapsed);
    },

    // Update notification settings
    updateNotificationSettings: (state, action) => {
      state.notifications = {
        ...state.notifications,
        ...action.payload,
      };
      localStorage.setItem('notificationSettings', JSON.stringify(state.notifications));
    },

    // Update preferences
    updatePreferences: (state, action) => {
      state.preferences = {
        ...state.preferences,
        ...action.payload,
      };
      localStorage.setItem('preferences', JSON.stringify(state.preferences));
    },

    // Reset to defaults
    resetSettings: state => {
      state.theme = 'light';
      state.language = 'en';
      state.direction = 'ltr';
      state.notifications = {
        enabled: true,
        sound: true,
        desktop: false,
      };
      state.preferences = {
        sidebarCollapsed: false,
        compactMode: false,
        animationsEnabled: true,
      };

      // Clear localStorage
      localStorage.removeItem('theme');
      localStorage.removeItem('language');
      localStorage.removeItem('sidebarCollapsed');
      localStorage.removeItem('notificationSettings');
      localStorage.removeItem('preferences');

      // Reset i18n
      i18n.changeLanguage('en');
      document.documentElement.dir = 'ltr';
      document.documentElement.lang = 'en';
    },
  },
});

export const {
  toggleTheme,
  setTheme,
  setLanguage,
  toggleSidebar,
  updateNotificationSettings,
  updatePreferences,
  resetSettings,
} = settingsSlice.actions;

export default settingsSlice.reducer;
