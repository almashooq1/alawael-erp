/**
 * Phase 34: Dark Theme Implementation
 * Complete theming system with light and dark modes
 * Persistent theme preference storage
 */

import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useContext, createContext, useState, useEffect } from 'react';

/**
 * Color Palette - Light Theme
 */
export const lightColors = {
  // Primary
  primary: '#4ECDC4', // Teal
  primaryDark: '#2A8B7E',
  primaryLight: '#7FE5DC',

  // Secondary
  secondary: '#FF6B6B', // Coral Red
  secondaryDark: '#E63946',
  secondaryLight: '#FF8787',

  // Status Colors
  success: '#2ECC71', // Green
  warning: '#F39C12', // Orange
  danger: '#E74C3C', // Red
  info: '#3498DB', // Blue

  // Neutral Colors
  background: '#FFFFFF',
  surface: '#F5F5F5',
  surfaceVariant: '#EEEEEE',
  onBackground: '#212121',
  onSurface: '#424242',

  // Text Colors
  textPrimary: '#212121',
  textSecondary: '#757575',
  textHint: '#BDBDBD',
  textInverse: '#FFFFFF',

  // Border & Divider
  border: '#E0E0E0',
  divider: '#EEEEEE',

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.1)',
};

/**
 * Color Palette - Dark Theme
 */
export const darkColors = {
  // Primary
  primary: '#00BFA5', // Cyan-Teal
  primaryDark: '#00897B',
  primaryLight: '#26C6DA',

  // Secondary
  secondary: '#FF6B6B', // Coral (same as light)
  secondaryDark: '#FF5252',
  secondaryLight: '#FF8A80',

  // Status Colors
  success: '#4CAF50', // Green (lighter)
  warning: '#FF9800', // Orange (lighter)
  danger: '#F44336', // Red (lighter)
  info: '#2196F3', // Blue (lighter)

  // Neutral Colors
  background: '#121212', // Almost black
  surface: '#1E1E1E', // Dark gray
  surfaceVariant: '#2A2A2A',
  onBackground: '#FFFFFF',
  onSurface: '#E0E0E0',

  // Text Colors
  textPrimary: '#FFFFFF',
  textSecondary: '#B0B0B0',
  textHint: '#808080',
  textInverse: '#121212',

  // Border & Divider
  border: '#373737',
  divider: '#2A2A2A',

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.7)',
  overlayLight: 'rgba(255, 255, 255, 0.1)',
};

/**
 * Typography Styles
 */
export const typography = {
  // Headings
  heading1: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 36,
  },
  heading2: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 32,
  },
  heading3: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 28,
  },

  // Subtitles
  subtitle1: {
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 24,
  },
  subtitle2: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 22,
  },

  // Body
  body1: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
  },
  body2: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
  body3: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 18,
  },

  // Buttons
  button: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },

  // Captions
  caption: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
  },
  overline: {
    fontSize: 10,
    fontWeight: '600',
    lineHeight: 14,
  },
};

/**
 * Component-specific Styles
 */
export const getComponentStyles = (isDark) => {
  const colors = isDark ? darkColors : lightColors;

  return {
    button: {
      primary: {
        backgroundColor: colors.primary,
        color: colors.textInverse,
        borderRadius: 8,
        paddingVertical: 12,
        paddingHorizontal: 24,
      },
      secondary: {
        backgroundColor: colors.secondary,
        color: colors.textInverse,
        borderRadius: 8,
        paddingVertical: 12,
        paddingHorizontal: 24,
      },
      outlined: {
        borderWidth: 1,
        borderColor: colors.primary,
        color: colors.primary,
        borderRadius: 8,
        paddingVertical: 12,
        paddingHorizontal: 24,
      },
      text: {
        color: colors.primary,
        paddingVertical: 8,
        paddingHorizontal: 16,
      },
      danger: {
        backgroundColor: colors.danger,
        color: colors.textInverse,
        borderRadius: 8,
        paddingVertical: 12,
        paddingHorizontal: 24,
      },
    },

    card: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      borderColor: colors.border,
      borderWidth: 1,
      shadowColor: colors.onBackground,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.3 : 0.1,
      shadowRadius: 4,
      elevation: 3,
    },

    input: {
      backgroundColor: colors.surfaceVariant,
      color: colors.textPrimary,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 8,
      paddingVertical: 12,
      paddingHorizontal: 16,
      fontSize: 14,
    },

    inputFocused: {
      borderColor: colors.primary,
      borderWidth: 2,
    },

    header: {
      backgroundColor: colors.primary,
      color: colors.textInverse,
      paddingTop: 24,
      paddingBottom: 16,
      paddingHorizontal: 16,
    },

    tab: {
      activeColor: colors.primary,
      inactiveColor: colors.textSecondary,
      backgroundColor: colors.surface,
      borderColor: colors.divider,
    },

    modal: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 16,
      borderWidth: 1,
    },

    bottomSheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
    },

    divider: {
      backgroundColor: colors.divider,
      height: 1,
    },

    badge: {
      backgroundColor: colors.danger,
      color: colors.textInverse,
      borderRadius: 10,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },

    chip: {
      backgroundColor: colors.surfaceVariant,
      borderRadius: 16,
      paddingHorizontal: 12,
      paddingVertical: 6,
      color: colors.textPrimary,
    },

    skeleton: {
      backgroundColor: colors.surfaceVariant,
      borderRadius: 8,
      opacity: 0.6,
    },
  };
};

/**
 * Theme Context
 */
export const ThemeContext = createContext();

/**
 * Theme Provider Component
 */
export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const deviceColorScheme = useColorScheme(); // 'light' or 'dark'

  // Initialize theme from storage
  useEffect(() => {
    initializeTheme();
  }, []);

  const initializeTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('theme');

      if (savedTheme) {
        // Use saved preference
        setIsDarkMode(savedTheme === 'dark');
      } else {
        // Use device preference
        setIsDarkMode(deviceColorScheme === 'dark');
      }

      console.log('✅ Theme initialized');
    } catch (error) {
      console.error('❌ Failed to initialize theme:', error);
      setIsDarkMode(deviceColorScheme === 'dark');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTheme = async () => {
    try {
      const newTheme = !isDarkMode;
      setIsDarkMode(newTheme);

      // Save preference
      await AsyncStorage.setItem('theme', newTheme ? 'dark' : 'light');
      console.log(`✅ Theme changed to: ${newTheme ? 'dark' : 'light'}`);
    } catch (error) {
      console.error('❌ Failed to toggle theme:', error);
    }
  };

  const setTheme = async (theme) => {
    try {
      if (theme !== 'light' && theme !== 'dark' && theme !== 'system') {
        console.warn('⚠️ Invalid theme:', theme);
        return;
      }

      let newIsDark = isDarkMode;

      if (theme === 'dark') {
        newIsDark = true;
      } else if (theme === 'light') {
        newIsDark = false;
      } else if (theme === 'system') {
        newIsDark = deviceColorScheme === 'dark';
      }

      setIsDarkMode(newIsDark);
      await AsyncStorage.setItem('theme', theme);
      console.log(`✅ Theme set to: ${theme}`);
    } catch (error) {
      console.error('❌ Failed to set theme:', error);
    }
  };

  const colors = isDarkMode ? darkColors : lightColors;
  const styles = getComponentStyles(isDarkMode);

  const value = {
    isDarkMode,
    toggleTheme,
    setTheme,
    colors,
    styles,
    typography,
    isLoading,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

/**
 * Custom Hook: useTheme
 */
export const useTheme = () => {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }

  return context;
};

/**
 * Theme Service for non-component contexts
 */
class ThemeService {
  constructor() {
    this.theme = 'light';
    this.listeners = [];
  }

  async initialize() {
    try {
      const savedTheme = await AsyncStorage.getItem('theme');
      if (savedTheme) {
        this.theme = savedTheme;
      }
      console.log(`✅ Theme service initialized: ${this.theme}`);
    } catch (error) {
      console.error('❌ Failed to initialize theme service:', error);
    }
  }

  getColors() {
    return this.theme === 'dark' ? darkColors : lightColors;
  }

  getStyles() {
    return getComponentStyles(this.theme === 'dark');
  }

  getTypography() {
    return typography;
  }

  async setTheme(theme) {
    try {
      this.theme = theme;
      await AsyncStorage.setItem('theme', theme);
      this.notifyListeners();
      console.log(`✅ Theme changed to: ${theme}`);
    } catch (error) {
      console.error('❌ Failed to set theme:', error);
    }
  }

  toggleTheme() {
    const newTheme = this.theme === 'dark' ? 'light' : 'dark';
    this.setTheme(newTheme);
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  notifyListeners() {
    this.listeners.forEach((listener) => listener(this.theme));
  }
}

export const themeService = new ThemeService();
