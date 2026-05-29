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

import store, { useAppSelector } from './src/store';
import { checkAuth } from './src/store/slices/authSlice';
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
import { OrderDetailScreen, CreateOrderScreen, DashboardViewScreen, NotificationsScreen, ProfileScreen } from './src/screens/stubs';

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
      screenOptions={({ route }: { route: { name: string } }) => ({
        tabBarIcon: ({ focused, color, size }: { focused: boolean; color: string; size: number }) => {
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

          return <MaterialCommunityIcons name={iconName as any} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#1673e6',
        tabBarInactiveTintColor: 'gray',
        headerShown: true,
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="Orders" component={OrdersScreen} options={{ title: 'Orders' }} />
      <Tab.Screen name="Reports" component={ReportsScreen} options={{ title: 'Reports' }} />
      <Tab.Screen name="Analytics" component={AnalyticsScreen} options={{ title: 'Analytics' }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
    </Tab.Navigator>
  );
};

// ============================================
// ROOT NAVIGATOR
// ============================================
//
// Lives INSIDE <Provider> and gates on the live Redux auth flag. Previously
// the navigator gated on a boot-time-only local `isSignedIn` that never
// updated after the login/register thunks set `auth.isAuthenticated` — so a
// successful login left the user stranded on the Auth screen until an app
// restart. Reading the selector makes login AND logout navigate immediately.

const RootNavigator = () => {
  const isAuthenticated = useAppSelector(state => state.auth.isAuthenticated);

  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <>
            <Stack.Screen name="MainApp" component={MainTabNavigator} options={{ animation: 'none' }} />
            <Stack.Group screenOptions={{ presentation: 'modal' }}>
              <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
              <Stack.Screen name="CreateOrder" component={CreateOrderScreen} />
              <Stack.Screen name="DashboardView" component={DashboardViewScreen} />
              <Stack.Screen name="Notifications" component={NotificationsScreen} />
              <Stack.Screen name="Profile" component={ProfileScreen} />
            </Stack.Group>
          </>
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} options={{ animation: 'none' }} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

// ============================================
// MAIN APP COMPONENT
// ============================================

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);

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

        // Validate any stored token against the backend (/auth/me) and seed
        // Redux auth state BEFORE the first render. Replaces the old
        // "token present === signed in" check — an expired or revoked token
        // no longer renders the authenticated UI. A failed/absent check
        // leaves the user signed out, the safe default.
        await store
          .dispatch(checkAuth())
          .unwrap()
          .catch(() => {});
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
      <RootNavigator />
    </Provider>
  );
}
