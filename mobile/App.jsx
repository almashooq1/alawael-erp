/**
 * 📱 React Native Mobile App Setup
 * تطبيق الهاتف الذكي لمراكز تأهيل ذوي الإعاقة
 * 
 * Includes:
 * - Navigation Setup
 * - API Client
 * - Storage Management
 * - Offline Support
 * - Push Notifications
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Import screens
import LoginScreen from './screens/auth/LoginScreen';
import DashboardScreen from './screens/dashboard/DashboardScreen';
import CaseListScreen from './screens/cases/CaseListScreen';
import CaseDetailsScreen from './screens/cases/CaseDetailsScreen';
import AssessmentScreen from './screens/assessments/AssessmentScreen';
import ProgressScreen from './screens/progress/ProgressScreen';
import ProfileScreen from './screens/profile/ProfileScreen';
import SettingsScreen from './screens/settings/SettingsScreen';
import NotificationsScreen from './screens/notifications/NotificationsScreen';

// Import utilities
import { AuthContext } from './context/AuthContext';
import { apiClient } from './services/apiClient';
import { StorageManager } from './services/storageManager';
import { SyncManager } from './services/syncManager';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

/**
 * 1️⃣ Auth Context Provider
 */
export const useAuth = () => {
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
          };
        case 'SIGN_OUT':
          return {
            ...prevState,
            isSignout: true,
            userToken: null,
          };
        case 'SIGN_UP':
          return {
            ...prevState,
            isSignout: false,
            userToken: action.token,
          };
      }
    },
    {
      isLoading: true,
      isSignout: false,
      userToken: null,
    }
  );

  React.useEffect(() => {
    const bootstrapAsync = async () => {
      let userToken;
      try {
        userToken = await AsyncStorage.getItem('userToken');
      } catch (e) {
        // Handle error
      }

      dispatch({ type: 'RESTORE_TOKEN', token: userToken });
    };

    bootstrapAsync();
  }, []);

  const authContext = React.useMemo(
    () => ({
      signIn: async (email, password) => {
        try {
          const response = await apiClient.post('/api/auth/login', { email, password });
          const { token } = response.data;
          await AsyncStorage.setItem('userToken', token);
          dispatch({ type: 'SIGN_IN', token });
          return true;
        } catch (error) {
          console.error('Login error:', error);
          return false;
        }
      },

      signUp: async (email, password, name) => {
        try {
          const response = await apiClient.post('/api/auth/register', {
            email,
            password,
            name,
          });
          const { token } = response.data;
          await AsyncStorage.setItem('userToken', token);
          dispatch({ type: 'SIGN_UP', token });
          return true;
        } catch (error) {
          console.error('Signup error:', error);
          return false;
        }
      },

      signOut: async () => {
        try {
          await apiClient.post('/api/auth/logout');
          await AsyncStorage.removeItem('userToken');
          dispatch({ type: 'SIGN_OUT' });
        } catch (error) {
          console.error('Logout error:', error);
        }
      },

      signUp: async (email, password) => {
        try {
          const response = await apiClient.post('/api/auth/register', { email, password });
          const { token } = response.data;
          await AsyncStorage.setItem('userToken', token);
          dispatch({ type: 'SIGN_UP', token });
        } catch (e) {
          throw e;
        }
      },
    }),
    []
  );

  return { state, authContext };
};

/**
 * 2️⃣ Navigation Structure
 */
const AuthStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: 'white' },
      }}
    >
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{
          animationEnabled: false,
        }}
      />
    </Stack.Navigator>
  );
};

const AppStack = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: '#2196F3',
        tabBarInactiveTintColor: '#999',
      }}
    >
      <Tab.Screen
        name="Home"
        component={DashboardScreen}
        options={{
          title: 'Dashboard',
          tabBarLabel: 'Home',
          headerTitle: 'Rehabilitation Center',
        }}
      />
      <Tab.Screen
        name="Cases"
        component={CaseListScreen}
        options={{
          title: 'Cases',
          tabBarLabel: 'Cases',
          headerTitle: 'Case Management',
        }}
      />
      <Tab.Screen
        name="Assessments"
        component={AssessmentScreen}
        options={{
          title: 'Assessments',
          tabBarLabel: 'Assessments',
          headerTitle: 'Assessments',
        }}
      />
      <Tab.Screen
        name="Progress"
        component={ProgressScreen}
        options={{
          title: 'Progress',
          tabBarLabel: 'Progress',
          headerTitle: 'Progress Tracking',
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Profile',
          tabBarLabel: 'Profile',
          headerTitle: 'User Profile',
        }}
      />
    </Tab.Navigator>
  );
};

/**
 * 3️⃣ Main App Component
 */
const App = () => {
  const { state, authContext } = useAuth();

  React.useEffect(() => {
    // Initialize app
    const initializeApp = async () => {
      try {
        // Load cached data
        await StorageManager.load();

        // Start sync manager
        await SyncManager.start();

        // Setup notifications
        // await notificationManager.setup();
      } catch (error) {
        console.error('App initialization error:', error);
      }
    };

    initializeApp();
  }, []);

  if (state.isLoading) {
    return null; // Show splash screen
  }

  return (
    <AuthContext.Provider value={authContext}>
      <NavigationContainer>
        {state.userToken == null ? <AuthStack /> : <AppStack />}
      </NavigationContainer>
    </AuthContext.Provider>
  );
};

export default App;

/**
 * 4️⃣ API Client Service
 */
export const createApiClient = (baseURL) => {
  return {
    async get(endpoint) {
      try {
        const token = await AsyncStorage.getItem('userToken');
        const response = await fetch(`${baseURL}${endpoint}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });
        return await response.json();
      } catch (error) {
        console.error('API GET error:', error);
        throw error;
      }
    },

    async post(endpoint, data) {
      try {
        const token = await AsyncStorage.getItem('userToken');
        const response = await fetch(`${baseURL}${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(data),
        });
        return await response.json();
      } catch (error) {
        console.error('API POST error:', error);
        throw error;
      }
    },

    async put(endpoint, data) {
      try {
        const token = await AsyncStorage.getItem('userToken');
        const response = await fetch(`${baseURL}${endpoint}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(data),
        });
        return await response.json();
      } catch (error) {
        console.error('API PUT error:', error);
        throw error;
      }
    },

    async delete(endpoint) {
      try {
        const token = await AsyncStorage.getItem('userToken');
        const response = await fetch(`${baseURL}${endpoint}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });
        return await response.json();
      } catch (error) {
        console.error('API DELETE error:', error);
        throw error;
      }
    },
  };
};

/**
 * 5️⃣ Offline Data Storage
 */
export class StorageManager {
  static async save(key, data) {
    try {
      const serialized = JSON.stringify(data);
      await AsyncStorage.setItem(key, serialized);
      console.log(`✅ Data saved: ${key}`);
    } catch (error) {
      console.error('Storage error:', error);
    }
  }

  static async load(key) {
    try {
      const data = await AsyncStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Load error:', error);
      return null;
    }
  }

  static async remove(key) {
    try {
      await AsyncStorage.removeItem(key);
      console.log(`✅ Data removed: ${key}`);
    } catch (error) {
      console.error('Remove error:', error);
    }
  }

  static async clear() {
    try {
      await AsyncStorage.clear();
      console.log('✅ All data cleared');
    } catch (error) {
      console.error('Clear error:', error);
    }
  }
}

/**
 * 6️⃣ Sync Manager for Offline Support
 */
export class SyncManager {
  static syncQueue = [];

  static async start() {
    // Periodic sync
    setInterval(async () => {
      await this.syncPendingChanges();
    }, 30000); // Every 30 seconds
  }

  static async addToQueue(operation) {
    this.syncQueue.push({
      ...operation,
      timestamp: Date.now(),
    });
    await StorageManager.save('syncQueue', this.syncQueue);
  }

  static async syncPendingChanges() {
    if (this.syncQueue.length === 0) return;

    console.log(`Syncing ${this.syncQueue.length} pending changes...`);

    for (const operation of this.syncQueue) {
      try {
        // Execute operation
        await apiClient[operation.method](operation.endpoint, operation.data);
        
        // Remove from queue
        this.syncQueue = this.syncQueue.filter((op) => op.timestamp !== operation.timestamp);
      } catch (error) {
        console.error('Sync error:', error);
      }
    }

    await StorageManager.save('syncQueue', this.syncQueue);
  }
}
