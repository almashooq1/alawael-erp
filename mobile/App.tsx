/**
 * Therapeutic Session Mobile App
 * تطبيق إدارة الجلسات العلاجية - الهاتف المحمول
 *
 * React Native application for patient and therapist access
 */

import React, { useEffect, useState } from 'react';
import {
  NavigationContainer,
  DarkTheme,
  DefaultTheme,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  MD3LightTheme,
  MD3DarkTheme,
  PaperProvider,
  ActivityIndicator,
  useTheme,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

// Auth & Context
import { AuthContext } from './src/context/AuthContext';
import { ThemeContext } from './src/context/ThemeContext';

// Screens
import LoginScreen from './src/screens/auth/LoginScreen';
import RegisterScreen from './src/screens/auth/RegisterScreen';
import SplashScreen from './src/screens/auth/SplashScreen';

// Patient Screens
import PatientDashboardScreen from './src/screens/patient/PatientDashboardScreen';
import UpcomingSessionsScreen from './src/screens/patient/UpcomingSessionsScreen';
import SessionDetailScreen from './src/screens/patient/SessionDetailScreen';
import GoalProgressScreen from './src/screens/patient/GoalProgressScreen';
import FeedbackScreen from './src/screens/patient/FeedbackScreen';
import PatientProfileScreen from './src/screens/patient/PatientProfileScreen';

// Therapist Screens
import TherapistDashboardScreen from './src/screens/therapist/TherapistDashboardScreen';
import MyScheduleScreen from './src/screens/therapist/MyScheduleScreen';
import SessionDocumentationScreen from './src/screens/therapist/SessionDocumentationScreen';
import MyPatientScreen from './src/screens/therapist/MyPatientScreen';
import TherapistProfileScreen from './src/screens/therapist/TherapistProfileScreen';

// Common Screens
import NotificationsScreen from './src/screens/common/NotificationsScreen';
import ChatScreen from './src/screens/common/ChatScreen';
import SettingsScreen from './src/screens/common/SettingsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// ============================================
// AUTH NAVIGATOR
// ============================================

const AuthNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animationEnabled: true,
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
};

// ============================================
// PATIENT NAVIGATOR
// ============================================

const PatientTabNavigator = () => {
  const theme = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'PatientDashboard') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'UpcomingSessions') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'GoalProgress') {
            iconName = focused ? 'chart-line' : 'chart-line';
          } else if (route.name === 'PatientChat') {
            iconName = focused ? 'chat' : 'chat-outline';
          } else if (route.name === 'PatientProfile') {
            iconName = focused ? 'account' : 'account-outline';
          }

          return (
            <MaterialCommunityIcons name={iconName} size={size} color={color} />
          );
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: 'gray',
        headerShown: true,
      })}
    >
      <Tab.Screen
        name="PatientDashboard"
        component={PatientDashboardScreen}
        options={{ title: 'Home' }}
      />
      <Tab.Screen
        name="UpcomingSessions"
        component={UpcomingSessionsScreen}
        options={{ title: 'Sessions' }}
      />
      <Tab.Screen
        name="GoalProgress"
        component={GoalProgressScreen}
        options={{ title: 'Progress' }}
      />
      <Tab.Screen
        name="PatientChat"
        component={ChatScreen}
        options={{ title: 'Messages' }}
      />
      <Tab.Screen
        name="PatientProfile"
        component={PatientProfileScreen}
        options={{ title: 'Profile' }}
      />
    </Tab.Navigator>
  );
};

// ============================================
// THERAPIST NAVIGATOR
// ============================================

const TherapistTabNavigator = () => {
  const theme = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'TherapistDashboard') {
            iconName = focused ? 'briefcase' : 'briefcase-outline';
          } else if (route.name === 'MySchedule') {
            iconName = focused ? 'calendar-week' : 'calendar-week';
          } else if (route.name === 'MyPatients') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Documentation') {
            iconName = focused ? 'file-document' : 'file-document-outline';
          } else if (route.name === 'TherapistChat') {
            iconName = focused ? 'chat' : 'chat-outline';
          } else if (route.name === 'TherapistProfile') {
            iconName = focused ? 'account' : 'account-outline';
          }

          return (
            <MaterialCommunityIcons name={iconName} size={size} color={color} />
          );
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: 'gray',
        headerShown: true,
      })}
    >
      <Tab.Screen
        name="TherapistDashboard"
        component={TherapistDashboardScreen}
        options={{ title: 'Dashboard' }}
      />
      <Tab.Screen
        name="MySchedule"
        component={MyScheduleScreen}
        options={{ title: 'Schedule' }}
      />
      <Tab.Screen
        name="MyPatients"
        component={MyPatientScreen}
        options={{ title: 'Patients' }}
      />
      <Tab.Screen
        name="Documentation"
        component={SessionDocumentationScreen}
        options={{ title: 'Documentation' }}
      />
      <Tab.Screen
        name="TherapistChat"
        component={ChatScreen}
        options={{ title: 'Messages' }}
      />
      <Tab.Screen
        name="TherapistProfile"
        component={TherapistProfileScreen}
        options={{ title: 'Profile' }}
      />
    </Tab.Navigator>
  );
};

// ============================================
// ROOT NAVIGATOR
// ============================================

const RootNavigator = ({ user }) => {
  if (user?.role === 'patient') {
    return <PatientTabNavigator />;
  } else if (user?.role === 'therapist') {
    return <TherapistTabNavigator />;
  }
  return null;
};

// ============================================
// MAIN APP COMPONENT
// ============================================

export default function App() {
  const [state, dispatch] = React.useReducer(
    (prevState, action) => {
      switch (action.type) {
        case 'RESTORE_TOKEN':
          return {
            ...prevState,
            userToken: action.token,
            isLoading: false,
          };
        case 'SIGN_IN':
          return {
            ...prevState,
            isSignout: false,
            userToken: action.token,
            user: action.user,
          };
        case 'SIGN_OUT':
          return {
            ...prevState,
            isSignout: true,
            userToken: null,
            user: null,
          };
        case 'SIGN_UP':
          return {
            ...prevState,
            isSignout: false,
            userToken: action.token,
            user: action.user,
          };
      }
    },
    {
      isLoading: true,
      isSignout: false,
      userToken: null,
      user: null,
    }
  );

  const [isDarkTheme, setIsDarkTheme] = useState(false);

  useEffect(() => {
    const bootstrapAsync = async () => {
      let userToken;
      try {
        // Restore token stored application.
        userToken = await SecureStore.getItemAsync('userToken');
        if (userToken) {
          // Verify token is still valid
          const isValid = await verifyToken(userToken);
          if (!isValid) {
            userToken = null;
            await SecureStore.deleteItemAsync('userToken');
          }
        }
      } catch (e) {
        // Restoring token failed
        console.log('Failed to restore token', e);
      }

      dispatch({ type: 'RESTORE_TOKEN', token: userToken });
    };

    bootstrapAsync();
  }, []);

  const authContext = React.useMemo(
    () => ({
      signIn: async (credentials) => {
        try {
          const response = await loginUser(credentials);
          await SecureStore.setItemAsync('userToken', response.token);
          dispatch({
            type: 'SIGN_IN',
            token: response.token,
            user: response.user,
          });
          return { success: true };
        } catch (error) {
          return { success: false, error: error.message };
        }
      },
      signOut: async () => {
        try {
          await SecureStore.deleteItemAsync('userToken');
          dispatch({ type: 'SIGN_OUT' });
        } catch (error) {
          console.log('Sign out error:', error);
        }
      },
      signUp: async (userData) => {
        try {
          const response = await registerUser(userData);
          await SecureStore.setItemAsync('userToken', response.token);
          dispatch({
            type: 'SIGN_UP',
            token: response.token,
            user: response.user,
          });
          return { success: true };
        } catch (error) {
          return { success: false, error: error.message };
        }
      },
    }),
    []
  );

  const themeContext = React.useMemo(
    () => ({
      toggleTheme: () => {
        setIsDarkTheme((prev) => !prev);
      },
    }),
    []
  );

  const theme = isDarkTheme ? MD3DarkTheme : MD3LightTheme;

  if (state.isLoading) {
    return (
      <PaperProvider theme={theme}>
        <SplashScreen />
      </PaperProvider>
    );
  }

  return (
    <ThemeContext.Provider value={themeContext}>
      <AuthContext.Provider value={authContext}>
        <PaperProvider theme={theme}>
          <NavigationContainer theme={isDarkTheme ? DarkTheme : DefaultTheme}>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
              {state.userToken == null ? (
                <Stack.Group>
                  <Stack.Screen
                    name="Auth"
                    component={AuthNavigator}
                    options={{
                      animationEnabled: false,
                    }}
                  />
                </Stack.Group>
              ) : (
                <Stack.Group>
                  <Stack.Screen
                    name="Root"
                    component={() => (
                      <RootNavigator user={state.user} />
                    )}
                    options={{
                      animationEnabled: false,
                    }}
                  />
                  <Stack.Group screenOptions={{ presentation: 'modal' }}>
                    <Stack.Screen
                      name="SessionDetail"
                      component={SessionDetailScreen}
                    />
                    <Stack.Screen
                      name="Feedback"
                      component={FeedbackScreen}
                    />
                    <Stack.Screen
                      name="Notifications"
                      component={NotificationsScreen}
                    />
                    <Stack.Screen
                      name="Settings"
                      component={SettingsScreen}
                    />
                  </Stack.Group>
                </Stack.Group>
              )}
            </Stack.Navigator>
          </NavigationContainer>
        </PaperProvider>
      </AuthContext.Provider>
    </ThemeContext.Provider>
  );
}

// ============================================
// API HELPERS
// ============================================

const verifyToken = async (token) => {
  try {
    const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/auth/verify`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.ok;
  } catch (error) {
    return false;
  }
};

const loginUser = async (credentials) => {
  const response = await fetch(
    `${process.env.EXPO_PUBLIC_API_URL}/auth/login`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    }
  );

  if (!response.ok) {
    throw new Error('Login failed');
  }

  return response.json();
};

const registerUser = async (userData) => {
  const response = await fetch(
    `${process.env.EXPO_PUBLIC_API_URL}/auth/register`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    }
  );

  if (!response.ok) {
    throw new Error('Registration failed');
  }

  return response.json();
};
