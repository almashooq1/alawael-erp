/**
 * AlAwael ERP Mobile App
 * تطبيق إدارة المشاريع - الهاتف المحمول
 *
 * React Native application for iOS/Android
 * Cross-platform ERP System with offline support
 */

import React, { useEffect, useState } from 'react';
import * as Font from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import * as Notifications from 'expo-notifications';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

import store from './src/store';
import { initializeOfflineStorage } from './src/services/OfflineStorageService';
import { setupPushNotifications } from './src/services/NotificationService';

// Screens - Auth
import AuthNavigator from './src/navigation/AuthNavigator';

// Screens - Dashboard & Orders
import DashboardScreen from './src/screens/dashboard/DashboardScreen';
import OrdersScreen from './src/screens/orders/OrdersScreen';

// Screens - Reports & Analytics
import ReportsScreen from './src/screens/reports/ReportsScreen';
import AnalyticsScreen from './src/screens/analytics/AnalyticsScreen';

// Screens - Settings
import SettingsScreen from './src/screens/settings/SettingsScreen';

// Modal Screens (Stubs)
import {
  OrderDetailScreen,
  CreateOrderScreen,
  DashboardViewScreen,
  NotificationsScreen,
  ProfileScreen,
} from './src/screens/stubs';

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// ============================================
// MAIN TAB NAVIGATOR
// ============================================

const MainTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Dashboard') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Orders') {
            iconName = focused ? 'package-variant-closed' : 'package-variant-closed';
          } else if (route.name === 'Reports') {
            iconName = focused ? 'file-chart' : 'file-chart-outline';
          } else if (route.name === 'Analytics') {
            iconName = focused ? 'chart-box-outline' : 'chart-box-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'cog' : 'cog-outline';
          }

          return (
            <MaterialCommunityIcons name={iconName} size={size} color={color} />
          );
        },
        tabBarActiveTintColor: '#1673e6',
        tabBarInactiveTintColor: 'gray',
        headerShown: true,
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ title: 'Home' }}
      />
      <Tab.Screen
        name="Orders"
        component={OrdersScreen}
        options={{ title: 'Orders' }}
      />
      <Tab.Screen
        name="Reports"
        component={ReportsScreen}
        options={{ title: 'Reports' }}
      />
      <Tab.Screen
        name="Analytics"
        component={AnalyticsScreen}
        options={{ title: 'Analytics' }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
    </Tab.Navigator>
  );
};

// ============================================
// MAIN APP COMPONENT
// ============================================

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        // Load custom fonts
        await Font.loadAsync({
          'Roboto-Regular': require('./assets/fonts/Roboto-Regular.ttf'),
          'Roboto-Bold': require('./assets/fonts/Roboto-Bold.ttf'),
          'Roboto-Medium': require('./assets/fonts/Roboto-Medium.ttf'),
        });

        // Initialize offline storage (SQLite)
        await initializeOfflineStorage();

        // Setup push notifications
        await setupPushNotifications();

        // Check if user is authenticated
        const token = await SecureStore.getItemAsync('authToken');
        setIsSignedIn(!!token);
      } catch (error) {
        console.error('App initialization error:', error);
      } finally {
        setAppIsReady(true);
        // Hide splash screen
        await SplashScreen.hideAsync();
      }
    }

    prepare();
  }, []);

  if (!appIsReady) {
    return null;
  }

  return (
    <Provider store={store}>
      <NavigationContainer>
        <StatusBar barStyle="dark-content" />
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {isSignedIn ? (
            <>
              <Stack.Screen
                name="MainApp"
                component={MainTabNavigator}
                options={{ animationEnabled: false }}
              />
              <Stack.Group screenOptions={{ presentation: 'modal' }}>
                <Stack.Screen
                  name="OrderDetail"
                  component={OrderDetailScreen}
                />
                <Stack.Screen
                  name="CreateOrder"
                  component={CreateOrderScreen}
                />
                <Stack.Screen
                  name="DashboardView"
                  component={DashboardViewScreen}
                />
                <Stack.Screen
                  name="Notifications"
                  component={NotificationsScreen}
                />
                <Stack.Screen
                  name="Profile"
                  component={ProfileScreen}
                />
              </Stack.Group>
            </>
          ) : (
            <Stack.Screen
              name="Auth"
              component={AuthNavigator}
              options={{ animationEnabled: false }}
            />
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </Provider>
  );
}
