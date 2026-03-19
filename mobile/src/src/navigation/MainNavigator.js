/**
 * Main Navigation Structure - Mobile App
 * هيكل التنقل الرئيسي - تطبيق الهاتف الذكي
 *
 * Features:
 * ✅ Bottom Tab Navigation (5 tabs)
 * ✅ Stack Navigation per Tab
 * ✅ Deep Linking Support
 * ✅ Modal Navigation
 * ✅ Dynamic Route Parameters
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTheme } from '../context/ThemeContext';
import MaterialCommunityIcons from '@react-native-vector-icons/material-community';

// Screens
import HomeScreen from '../screens/home/HomeScreen';
import LicenseDetailScreen from '../screens/licenses/LicenseDetailScreen';
import LicenseListScreen from '../screens/licenses/LicenseListScreen';
import RenewalScreen from '../screens/licenses/RenewalScreen';
import DocumentsScreen from '../screens/documents/DocumentsScreen';
import DocumentDetailScreen from '../screens/documents/DocumentDetailScreen';
import PaymentsScreen from '../screens/payments/PaymentsScreen';
import PaymentDetailScreen from '../screens/payments/PaymentDetailScreen';
import NotificationsScreen from '../screens/notifications/NotificationsScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import SettingsScreen from '../screens/profile/SettingsScreen';
import GovernmentServicesScreen from '../screens/services/GovernmentServicesScreen';
import ScanDocumentScreen from '../screens/documents/ScanDocumentScreen';
import ReportsScreen from '../screens/reports/ReportsScreen';
import HelpScreen from '../screens/help/HelpScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

/**
 * Home Stack Navigator
 */
const HomeStack = () => {
  const { theme } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.primary,
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 16,
        },
        headerShadowVisible: true,
        cardStyle: {
          backgroundColor: theme.colors.background,
        },
      }}
    >
      <Stack.Screen
        name="HomeMain"
        component={HomeScreen}
        options={{
          headerTitle: 'نظام إدارة الرخص',
          headerTitleAlign: 'center',
        }}
      />
      <Stack.Screen
        name="LicenseDetail"
        component={LicenseDetailScreen}
        options={({ route }) => ({
          headerTitle: route.params?.licenseType || 'تفاصيل الرخصة',
        })}
      />
      <Stack.Screen
        name="GovernmentServices"
        component={GovernmentServicesScreen}
        options={{
          headerTitle: 'الخدمات الحكومية',
        }}
      />
      <Stack.Screen
        name="Reports"
        component={ReportsScreen}
        options={{
          headerTitle: 'التقارير والإحصائيات',
        }}
      />
    </Stack.Navigator>
  );
};

/**
 * Licenses Stack Navigator
 */
const LicensesStack = () => {
  const { theme } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.primary,
        },
        headerTintColor: '#fff',
        cardStyle: {
          backgroundColor: theme.colors.background,
        },
      }}
    >
      <Stack.Screen
        name="LicensesList"
        component={LicenseListScreen}
        options={{
          headerTitle: 'رخصي',
          headerTitleAlign: 'center',
        }}
      />
      <Stack.Screen
        name="LicenseInfo"
        component={LicenseDetailScreen}
        options={({ route }) => ({
          headerTitle: route.params?.licenseType || 'تفاصيل الرخصة',
        })}
      />
      <Stack.Screen
        name="RenewalProcess"
        component={RenewalScreen}
        options={{
          headerTitle: 'تجديد الرخصة',
          presentation: 'modal',
        }}
      />
    </Stack.Navigator>
  );
};

/**
 * Documents Stack Navigator
 */
const DocumentsStack = () => {
  const { theme } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.primary,
        },
        headerTintColor: '#fff',
        cardStyle: {
          backgroundColor: theme.colors.background,
        },
      }}
    >
      <Stack.Screen
        name="DocumentsList"
        component={DocumentsScreen}
        options={{
          headerTitle: 'المستندات',
          headerTitleAlign: 'center',
        }}
      />
      <Stack.Screen
        name="DocumentDetail"
        component={DocumentDetailScreen}
        options={({ route }) => ({
          headerTitle: route.params?.documentName || 'تفاصيل المستند',
        })}
      />
      <Stack.Screen
        name="ScanDocument"
        component={ScanDocumentScreen}
        options={{
          headerTitle: 'مسح المستند',
          presentation: 'modal',
        }}
      />
    </Stack.Navigator>
  );
};

/**
 * Payments Stack Navigator
 */
const PaymentsStack = () => {
  const { theme } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.primary,
        },
        headerTintColor: '#fff',
        cardStyle: {
          backgroundColor: theme.colors.background,
        },
      }}
    >
      <Stack.Screen
        name="PaymentsList"
        component={PaymentsScreen}
        options={{
          headerTitle: 'المدفوعات',
          headerTitleAlign: 'center',
        }}
      />
      <Stack.Screen
        name="PaymentDetail"
        component={PaymentDetailScreen}
        options={({ route }) => ({
          headerTitle: route.params?.paymentId || 'تفاصيل الدفع',
        })}
      />
    </Stack.Navigator>
  );
};

/**
 * Profile Stack Navigator
 */
const ProfileStack = () => {
  const { theme } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.primary,
        },
        headerTintColor: '#fff',
        cardStyle: {
          backgroundColor: theme.colors.background,
        },
      }}
    >
      <Stack.Screen
        name="ProfileMain"
        component={ProfileScreen}
        options={{
          headerTitle: 'الملف الشخصي',
          headerTitleAlign: 'center',
        }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          headerTitle: 'الإعدادات',
        }}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          headerTitle: 'الإشعارات',
        }}
      />
      <Stack.Screen
        name="Help"
        component={HelpScreen}
        options={{
          headerTitle: 'المساعدة والدعم',
        }}
      />
    </Stack.Navigator>
  );
};

/**
 * Main Tab Navigator
 * المتصفح الرئيسي بالتبويبات
 */
const MainNavigator = () => {
  const { theme } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.text + '80',
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          borderTopWidth: 1,
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginTop: 4,
        },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStack}
        options={{
          tabBarLabel: 'الرئيسية',
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="home" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="LicensesTab"
        component={LicensesStack}
        options={{
          tabBarLabel: 'الرخص',
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="card-account-details" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="DocumentsTab"
        component={DocumentsStack}
        options={{
          tabBarLabel: 'المستندات',
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="file-document-multiple" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="PaymentsTab"
        component={PaymentsStack}
        options={{
          tabBarLabel: 'المدفوعات',
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="credit-card" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStack}
        options={{
          tabBarLabel: 'الملف',
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="account" size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
};

export default MainNavigator;
