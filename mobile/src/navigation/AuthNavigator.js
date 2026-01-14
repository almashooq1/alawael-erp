/**
 * Authentication Navigator - Mobile App
 * متصفح المصادقة - تطبيق الهاتف الذكي
 *
 * Features:
 * ✅ Login Screen
 * ✅ Registration Screen
 * ✅ Biometric Authentication
 * ✅ OTP Verification
 * ✅ Password Reset
 * ✅ Nafath Integration
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../context/ThemeContext';

// Auth Screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import BiometricAuthScreen from '../screens/auth/BiometricAuthScreen';
import OTPVerificationScreen from '../screens/auth/OTPVerificationScreen';
import PasswordResetScreen from '../screens/auth/PasswordResetScreen';
import NafathAuthScreen from '../screens/auth/NafathAuthScreen';
import OnboardingScreen from '../screens/auth/OnboardingScreen';

const Stack = createNativeStackNavigator();

/**
 * Auth Stack Navigator
 */
const AuthNavigator = () => {
  const { theme } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: {
          backgroundColor: theme.colors.background,
        },
        animationEnabled: true,
        gestureEnabled: true,
      }}
    >
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{
          animationTypeForReplace: 'pop',
        }}
      />
      <Stack.Screen
        name="Register"
        component={RegisterScreen}
        options={{
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="BiometricAuth"
        component={BiometricAuthScreen}
        options={{
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="OTPVerification"
        component={OTPVerificationScreen}
        options={{
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="PasswordReset"
        component={PasswordResetScreen}
        options={{
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="NafathAuth"
        component={NafathAuthScreen}
        options={{
          presentation: 'modal',
        }}
      />
    </Stack.Navigator>
  );
};

export default AuthNavigator;
