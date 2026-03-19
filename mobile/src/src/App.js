/**
 * تطبيق إدارة الرخص السعودية - الهاتف الذكي
 * Saudi License Management System - Mobile App
 * ⭐ React Native v2.1.0 - Mobile First
 *
 * Features:
 * ✅ Dark/Light Theme Support
 * ✅ Biometric Authentication
 * ✅ Offline-First Architecture
 * ✅ Camera Document Scanning
 * ✅ Push Notifications
 * ✅ Multi-language Support (AR/EN)
 * ✅ Real-time Updates
 * ✅ Advanced Charts & Analytics
 */

import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Provider as ReduxProvider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'react-native';
import FlashMessage from 'react-native-flash-message';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import store, { persistor } from './src/redux/store';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import i18n from './src/i18n/config';

// Navigation Stacks
import AuthNavigator from './src/navigation/AuthNavigator';
import MainNavigator from './src/navigation/MainNavigator';
import SplashScreen from './src/screens/SplashScreen';

// Services
import notificationService from './src/services/notificationService';
import analyticsService from './src/services/analyticsService';
import storageService from './src/services/storageService';

/**
 * Main App Component
 * تطبيق الجوال الرئيسي
 */
const App = () => {
  const [isReady, setIsReady] = useState(false);
  const [isUserLoggedIn, setIsUserLoggedIn] = useState(false);
  const { theme, isDarkMode } = useTheme();

  /**
   * Initialize App Services
   * تهيئة خدمات التطبيق
   */
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize notifications
        await notificationService.initialize();

        // Initialize analytics
        await analyticsService.initialize();

        // Load stored user data
        const userToken = await storageService.getItem('userToken');
        const userData = await storageService.getItem('userData');

        if (userToken && userData) {
          setIsUserLoggedIn(true);
        }

        // Set language preference
        const language = await storageService.getItem('language');
        if (language) {
          i18n.changeLanguage(language);
        }

        // Load theme preference
        const savedTheme = await storageService.getItem('theme');
        if (savedTheme) {
          // Update theme context
        }

        setIsReady(true);
      } catch (error) {
        console.error('❌ App initialization error:', error);
        setIsReady(true);
      }
    };

    initializeApp();
  }, []);

  /**
   * Handle App State Changes
   * معالجة تغييرات حالة التطبيق
   */
  useEffect(() => {
    const subscription = require('react-native').AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, []);

  const handleAppStateChange = async state => {
    if (state === 'active') {
      // App has come to foreground
      await analyticsService.trackAppOpen();
      await notificationService.checkPendingNotifications();
    } else if (state === 'background') {
      // App has gone to background
      await analyticsService.trackAppClose();
    }
  };

  // Show splash screen while initializing
  if (!isReady) {
    return <SplashScreen />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ReduxProvider store={store}>
        <PersistGate loading={<SplashScreen />} persistor={persistor}>
          <ThemeProvider>
            <SafeAreaProvider>
              <StatusBar
                barStyle={isDarkMode ? 'light-content' : 'dark-content'}
                backgroundColor={theme.colors.background}
                translucent={true}
              />
              <NavigationContainer theme={theme}>{isUserLoggedIn ? <MainNavigator /> : <AuthNavigator />}</NavigationContainer>
              <FlashMessage position="top" />
            </SafeAreaProvider>
          </ThemeProvider>
        </PersistGate>
      </ReduxProvider>
    </GestureHandlerRootView>
  );
};

export default App;
