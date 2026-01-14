/**
 * Theme Context - Mobile App
 * سياق الموضوع - تطبيق الهاتف الذكي
 *
 * يوفر دعم Dark Mode و Light Mode مع ألوان ديناميكية
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { setTheme } from '../redux/slices/documentsSlice';
import storageService from '../services/storageService';

/**
 * Color Schemes
 */
const lightTheme = {
  isDarkMode: false,
  colors: {
    primary: '#667eea',
    secondary: '#764ba2',
    success: '#4CAF50',
    warning: '#FF9800',
    danger: '#F44336',
    info: '#2196F3',

    // Semantic colors
    background: '#FFFFFF',
    surface: '#F5F5F5',
    card: '#FFFFFF',
    text: '#212121',
    textSecondary: '#757575',
    border: '#BDBDBD',
    divider: '#E0E0E0',

    // States
    disabled: '#E0E0E0',
    error: '#B00020',
    loading: '#667eea',

    // Gradient
    gradient: ['#667eea', '#764ba2'],
  },
};

const darkTheme = {
  isDarkMode: true,
  colors: {
    primary: '#667eea',
    secondary: '#764ba2',
    success: '#66BB6A',
    warning: '#FFA726',
    danger: '#EF5350',
    info: '#42A5F5',

    // Semantic colors
    background: '#121212',
    surface: '#1E1E1E',
    card: '#2C2C2C',
    text: '#FFFFFF',
    textSecondary: '#B3B3B3',
    border: '#424242',
    divider: '#373737',

    // States
    disabled: '#424242',
    error: '#CF6679',
    loading: '#667eea',

    // Gradient
    gradient: ['#667eea', '#764ba2'],
  },
};

/**
 * Theme Context
 */
const ThemeContext = createContext({});

/**
 * Theme Provider Component
 */
export const ThemeProvider = ({ children }) => {
  const dispatch = useDispatch();
  const systemColorScheme = useColorScheme();
  const [isDarkMode, setIsDarkMode] = useState(systemColorScheme === 'dark');
  const [theme, setThemeState] = useState(isDarkMode ? darkTheme : lightTheme);

  /**
   * Load saved theme preference
   */
  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        const savedTheme = await storageService.getItem('themePreference');
        if (savedTheme) {
          const isDark = savedTheme === 'dark';
          setIsDarkMode(isDark);
          setThemeState(isDark ? darkTheme : lightTheme);
          dispatch(setTheme(isDark ? 'dark' : 'light'));
        }
      } catch (error) {
        console.error('❌ Failed to load theme preference:', error);
      }
    };

    loadThemePreference();
  }, [dispatch]);

  /**
   * Toggle Theme
   */
  const toggleTheme = async () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    setThemeState(newDarkMode ? darkTheme : lightTheme);

    // Save preference
    try {
      await storageService.setItem('themePreference', newDarkMode ? 'dark' : 'light');
      dispatch(setTheme(newDarkMode ? 'dark' : 'light'));
    } catch (error) {
      console.error('❌ Failed to save theme preference:', error);
    }
  };

  /**
   * Set Theme by Mode
   */
  const setThemeMode = async mode => {
    const isDark = mode === 'dark';
    setIsDarkMode(isDark);
    setThemeState(isDark ? darkTheme : lightTheme);

    try {
      await storageService.setItem('themePreference', mode);
      dispatch(setTheme(mode));
    } catch (error) {
      console.error('❌ Failed to set theme mode:', error);
    }
  };

  const value = {
    theme,
    isDarkMode,
    toggleTheme,
    setThemeMode,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

/**
 * Custom Hook to use Theme Context
 */
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

export default ThemeContext;
