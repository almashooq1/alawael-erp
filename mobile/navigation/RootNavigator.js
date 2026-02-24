/**
 * Navigation Stack for React Native
 * إعداد التنقل بين الشاشات
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';

import DashboardScreen from '../screens/app/DashboardScreen';
import MapScreen from '../screens/app/MapScreen';
import NotificationsScreen from '../screens/app/NotificationsScreen';
import ProfileScreen from '../screens/app/ProfileScreen';
import SettingsScreen from '../screens/app/SettingsScreen';

import SplashScreen from '../screens/SplashScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// ===== AUTH STACK =====
export const AuthStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animationEnabled: true,
      }}
    >
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ animationTypeForReplace: 'pop' }}
      />
      <Stack.Screen
        name="Register"
        component={RegisterScreen}
        options={{
          title: 'تسجيل جديد',
          headerShown: true,
          headerBackTitle: 'رجوع',
        }}
      />
      <Stack.Screen
        name="ForgotPassword"
        component={ForgotPasswordScreen}
        options={{
          title: 'استعادة كلمة المرور',
          headerShown: true,
          headerBackTitle: 'رجوع',
        }}
      />
    </Stack.Navigator>
  );
};

// ===== APP BOTTOM TABS =====
export const AppTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: '#4ECDC4',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          backgroundColor: '#FFF',
          borderTopColor: '#EEE',
          borderTopWidth: 1,
          paddingBottom: 5,
          paddingTop: 5,
        },
        headerStyle: {
          backgroundColor: '#FFF',
          elevation: 3,
        },
        headerTintColor: '#333',
        headerTitleAlign: 'center',
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 18,
        },
      }}
    >
      {/* لوحة التحكم */}
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: 'لوحة التحكم',
          tabBarLabel: 'الرئيسية',
          tabBarIcon: ({ color, size }) => (
            <Icon name="view-dashboard" color={color} size={size} />
          ),
        }}
      />

      {/* الخريطة */}
      <Tab.Screen
        name="Map"
        component={MapScreen}
        options={{
          title: 'الخريطة',
          tabBarLabel: 'الموقع',
          tabBarIcon: ({ color, size }) => (
            <Icon name="map-marker" color={color} size={size} />
          ),
        }}
      />

      {/* الإشعارات */}
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          title: 'الإشعارات',
          tabBarLabel: 'الإشعارات',
          tabBarIcon: ({ color, size }) => (
            <Icon name="bell" color={color} size={size} />
          ),
          tabBarBadge: null, // سيتم تحديثه ديناميكياً
        }}
      />

      {/* الملف الشخصي */}
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'الملف الشخصي',
          tabBarLabel: 'حسابي',
          tabBarIcon: ({ color, size }) => (
            <Icon name="account" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

// ===== APP STACK (مع Tabs وشاشات إضافية) =====
export const AppStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animationEnabled: true,
      }}
    >
      {/* Tabs الرئيسية */}
      <Stack.Screen
        name="AppTabs"
        component={AppTabs}
      />

      {/* الإعدادات (modal) */}
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          presentation: 'modal',
          animationEnabled: true,
        }}
      />
    </Stack.Navigator>
  );
};

// ===== ROOT NAVIGATOR =====
export const RootNavigator = ({ isLoading, isSignedIn }) => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animationEnabled: false,
        }}
      >
        {isLoading && (
          <Stack.Screen
            name="Splash"
            component={SplashScreen}
            options={{
              animationTypeForReplace: 'fade',
            }}
          />
        )}

        {isSignedIn ? (
          // المستخدم مسجل دخول
          <Stack.Screen
            name="App"
            component={AppStack}
            options={{
              animationTypeForReplace: 'pop',
            }}
          />
        ) : (
          // المستخدم لم يسجل دخول
          <Stack.Screen
            name="Auth"
            component={AuthStack}
            options={{
              animationTypeForReplace: 'pop',
            }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default RootNavigator;
