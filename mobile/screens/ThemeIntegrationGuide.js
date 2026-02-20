/**
 * Phase 34: Theme Application Guide
 * Integration points for Dark Theme in existing screens
 * Example implementations and patterns
 */

/**
 * ================================================================
 * GUIDE: How to Apply Theme to Existing Screens
 * ================================================================
 */

/**
 * ================================================================
 * STEP 1: Wrap App with ThemeProvider
 * ================================================================
 * 
 * Location: App.js or index.js
 * 
 * BEFORE:
 * ```
 * export default function App() {
 *   return (
 *     <NavigationContainer>
 *       <DriverStack />
 *     </NavigationContainer>
 *   );
 * }
 * ```
 * 
 * AFTER:
 * ```
 * import { ThemeProvider } from './erp_new_system/mobile/services/ThemeService';
 * 
 * export default function App() {
 *   return (
 *     <ThemeProvider>
 *       <NavigationContainer>
 *         <DriverStack />
 *       </NavigationContainer>
 *     </ThemeProvider>
 *   );
 * }
 * ```
 */

/**
 * ================================================================
 * STEP 2: Update Individual Screens
 * ================================================================
 * 
 * PATTERN: LoginScreen Example
 * Location: erp_new_system/mobile/screens/LoginScreen.js
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, KeyboardAvoidingView } from 'react-native';
import { useTheme } from '../services/ThemeService';
import {
  ThemedContainer,
  ThemedTextInput,
  ThemedButton,
  ThemedText,
  ThemedAlert,
} from '../components/ThemedComponents';

export const ThemeAwareLoginScreen = ({ navigation }) => {
  const { colors, styles, isParkMode } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    try {
      setLoading(true);
      // Login logic here
      navigation.navigate('Dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <ThemedContainer padding={20}>
          {/* Header */}
          <View style={{ alignItems: 'center', marginVertical: 40 }}>
            <ThemedText variant="heading1" weight="bold">
              Welcome Back
            </ThemedText>
            <ThemedText variant="body2" color="secondary" style={{ marginTop: 8 }}>
              Sign in to your account
            </ThemedText>
          </View>

          {/* Alert */}
          {error && (
            <ThemedAlert
              type="danger"
              message={error}
              onClose={() => setError('')}
              style={{ marginBottom: 16 }}
            />
          )}

          {/* Email Input */}
          <View style={{ marginBottom: 16 }}>
            <ThemedText variant="subtitle2" style={{ marginBottom: 8 }}>
              Email Address
            </ThemedText>
            <ThemedTextInput
              placeholder="Enter your email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
            />
          </View>

          {/* Password Input */}
          <View style={{ marginBottom: 24 }}>
            <ThemedText variant="subtitle2" style={{ marginBottom: 8 }}>
              Password
            </ThemedText>
            <ThemedTextInput
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          {/* Login Button */}
          <ThemedButton
            label={loading ? 'Signing in...' : 'Sign In'}
            onPress={handleLogin}
            disabled={loading}
            loading={loading}
            style={{ marginBottom: 16 }}
          />

          {/* Forgot Password */}
          <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
            <ThemedText
              variant="body2"
              color="accent"
              align="center"
              style={{ marginBottom: 24 }}
            >
              Forgot Password?
            </ThemedText>
          </TouchableOpacity>

          {/* Sign Up */}
          <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
            <ThemedText variant="body2">Don't have an account? </ThemedText>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <ThemedText variant="body2" color="accent" weight="semibold">
                Sign Up
              </ThemedText>
            </TouchableOpacity>
          </View>
        </ThemedContainer>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

/**
 * ================================================================
 * STEP 3: Update Navigation Header Colors
 * ================================================================
 * 
 * Location: Navigation file (e.g., Navigation.js)
 * 
 * PATTERN:
 * ```
 * const linking = {
 *   prefixes: ['erp://', 'https://erp.app'],
 * };
 * 
 * export const DriverStack = () => {
 *   const { colors } = useTheme();
 *   
 *   return (
 *     <Stack.Navigator
 *       screenOptions={{
 *         headerStyle: {
 *           backgroundColor: colors.primary,
 *         },
 *         headerTintColor: colors.textInverse,
 *         headerTitleStyle: {
 *           fontWeight: '700',
 *         },
 *         cardStyle: {
 *           backgroundColor: colors.background,
 *         },
 *       }}
 *     >
 *       <Stack.Screen
 *         name="Dashboard"
 *         component={DashboardScreen}
 *         options={{ title: 'Driver Dashboard' }}
 *       />
 *     </Stack.Navigator>
 *   );
 * };
 * ```
 */

/**
 * ================================================================
 * STEP 4: Update Tab Navigator
 * ================================================================
 * 
 * Location: BottomTabNavigator
 * 
 * PATTERN:
 * ```
 * export const BottomTabs = () => {
 *   const { colors, styles } = useTheme();
 *   
 *   return (
 *     <Tab.Navigator
 *       screenOptions={({ route }) => ({
 *         tabBarStyle: {
 *           backgroundColor: colors.surface,
 *           borderTopColor: colors.border,
 *           paddingBottom: 8,
 *         },
 *         tabBarActiveTintColor: colors.primary,
 *         tabBarInactiveTintColor: colors.textSecondary,
 *         headerStyle: {
 *           backgroundColor: colors.primary,
 *         },
 *         headerTintColor: colors.textInverse,
 *       })}
 *     >
 *       <Tab.Screen name="Dashboard" component={DashboardScreen} />
 *       <Tab.Screen name="Map" component={MapScreen} />
 *       {/* more screens */}
 *     </Tab.Navigator>
 *   );
 * };
 * ```
 */

/**
 * ================================================================
 * STEP 5: Settings Screen - Theme Toggle
 * ================================================================
 * 
 * Location: erp_new_system/mobile/screens/SettingsScreen.js
 */

export const ThemeAwareSettingsScreen = ({ navigation }) => {
  const { colors, isDarkMode, toggleTheme, setTheme } = useTheme();

  return (
    <ThemedScrollView>
      {/* Theme Settings Section */}
      <View style={{ marginBottom: 24 }}>
        <ThemedText variant="heading3" weight="semibold" style={{ marginBottom: 16 }}>
          Display Settings
        </ThemedText>

        {/* Current Theme Info */}
        <ThemedCard style={{ marginBottom: 12 }}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <ThemedText variant="body1">Dark Mode</ThemedText>
            <TouchableOpacity
              onPress={toggleTheme}
              style={{
                width: 50,
                height: 28,
                borderRadius: 14,
                backgroundColor: isDarkMode ? colors.primary : colors.surfaceVariant,
                justifyContent: 'center',
                alignItems: isDarkMode ? 'flex-end' : 'flex-start',
                paddingHorizontal: 2,
              }}
            >
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: colors.textInverse,
                }}
              />
            </TouchableOpacity>
          </View>
        </ThemedCard>

        {/* Theme Options */}
        <ThemedCard
          onPress={() => setTheme('light')}
          style={{
            marginBottom: 12,
            borderColor: !isDarkMode ? colors.primary : colors.border,
            borderWidth: !isDarkMode ? 2 : 1,
          }}
        >
          <ThemedText variant="body1">☀️ Light Theme</ThemedText>
          <ThemedText variant="caption" color="secondary" style={{ marginTop: 4 }}>
            Use light colors for daytime
          </ThemedText>
        </ThemedCard>

        <ThemedCard
          onPress={() => setTheme('dark')}
          style={{
            marginBottom: 12,
            borderColor: isDarkMode ? colors.primary : colors.border,
            borderWidth: isDarkMode ? 2 : 1,
          }}
        >
          <ThemedText variant="body1">🌙 Dark Theme</ThemedText>
          <ThemedText variant="caption" color="secondary" style={{ marginTop: 4 }}>
            Use dark colors for nighttime
          </ThemedText>
        </ThemedCard>

        <ThemedCard
          onPress={() => setTheme('system')}
          style={{
            borderColor: colors.border,
            borderWidth: 1,
          }}
        >
          <ThemedText variant="body1">🔄 System Theme</ThemedText>
          <ThemedText variant="caption" color="secondary" style={{ marginTop: 4 }}>
            Follow device settings
          </ThemedText>
        </ThemedCard>
      </View>

      {/* Other Settings */}
      <View>
        <ThemedText variant="heading3" weight="semibold" style={{ marginBottom: 16 }}>
          Other Settings
        </ThemedText>
        {/* other settings items */}
      </View>
    </ThemedScrollView>
  );
};

/**
 * ================================================================
 * STEP 6: Dashboard Screen - Full Example
 * ================================================================
 */

export const ThemeAwareDashboardScreen = ({ navigation }) => {
  const { colors, styles, isDarkMode } = useTheme();
  const [trips, setTrips] = React.useState([]);
  const [loading, setLoading] = React.useState(false);

  return (
    <ThemedContainer backgroundColor="background">
      {/* Header Card */}
      <ThemedCard variant="elevated" style={{ marginBottom: 20 }}>
        <ThemedText variant="heading2" weight="bold">
          Welcome Driver! 👋
        </ThemedText>
        <ThemedText variant="body2" color="secondary" style={{ marginTop: 8 }}>
          Current Status: Active
        </ThemedText>

        {/* Quick Stats */}
        <View style={{ flexDirection: 'row', marginTop: 16, gap: 10 }}>
          <View style={{ flex: 1, backgroundColor: colors.primary + '20', borderRadius: 8, padding: 12 }}>
            <ThemedText variant="body3" color="secondary">
              Trips Today
            </ThemedText>
            <ThemedText variant="heading3" weight="bold" style={{ marginTop: 4 }}>
              5
            </ThemedText>
          </View>

          <View style={{ flex: 1, backgroundColor: colors.success + '20', borderRadius: 8, padding: 12 }}>
            <ThemedText variant="body3" color="secondary">
              Safety Score
            </ThemedText>
            <ThemedText variant="heading3" weight="bold" color="success" style={{ marginTop: 4 }}>
              95%
            </ThemedText>
          </View>

          <View style={{ flex: 1, backgroundColor: colors.warning + '20', borderRadius: 8, padding: 12 }}>
            <ThemedText variant="body3" color="secondary">
              Violations
            </ThemedText>
            <ThemedText variant="heading3" weight="bold" color="warning" style={{ marginTop: 4 }}>
              2
            </ThemedText>
          </View>
        </View>
      </ThemedCard>

      {/* Actions */}
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
        <ThemedButton
          label="Start Trip"
          onPress={() => navigation.navigate('Map')}
          size="medium"
          style={{ flex: 1 }}
        />
        <ThemedButton
          label="Analytics"
          onPress={() => navigation.navigate('Analytics')}
          variant="outlined"
          size="medium"
          style={{ flex: 1 }}
        />
      </View>

      {/* Trips List */}
      <ThemedText variant="heading3" weight="semibold" style={{ marginBottom: 12 }}>
        Recent Trips
      </ThemedText>

      {loading ? (
        <View style={{ padding: 20, alignItems: 'center' }}>
          <ThemedText color="secondary">Loading trips...</ThemedText>
        </View>
      ) : (
        trips.map((trip) => (
          <ThemedCard
            key={trip.id}
            onPress={() => navigation.navigate('TripDetails', { tripId: trip.id })}
            style={{ marginBottom: 12 }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <ThemedText variant="body1" weight="semibold">
                  {trip.destination}
                </ThemedText>
                <ThemedText variant="caption" color="secondary" style={{ marginTop: 4 }}>
                  {trip.distance} km • {trip.duration}
                </ThemedText>
              </View>
              <ThemedBadge variant={trip.safetyScore > 90 ? 'success' : 'warning'} label={`${trip.safetyScore}%`} />
            </View>
          </ThemedCard>
        ))
      )}
    </ThemedContainer>
  );
};

/**
 * ================================================================
 * STEP 7: Map Screen Integration
 * ================================================================
 * 
 * Pattern: Use colors from theme when rendering map overlays
 */

export const MapScreenThemeIntegration = () => {
  const { colors } = useTheme();

  const mapOverlayStyles = {
    markerIcon: {
      color: colors.primary,
      tintColor: colors.primary,
    },
    routeLine: {
      strokeColor: colors.primary,
      strokeWidth: 4,
    },
    infoWindow: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      textColor: colors.textPrimary,
    },
  };

  return mapOverlayStyles;
};

/**
 * ================================================================
 * STEP 8: Notification & Toast Integration
 * ================================================================
 */

export const ThemedToast = ({ message, type = 'info', duration = 2000 }) => {
  const { colors } = useTheme();

  const typeColors = {
    info: colors.info,
    success: colors.success,
    warning: colors.warning,
    danger: colors.danger,
  };

  return (
    <View
      style={{
        backgroundColor: typeColors[type],
        padding: 16,
        borderRadius: 8,
        marginHorizontal: 16,
        marginBottom: 20,
      }}
    >
      <ThemedText color="inverse">{message}</ThemedText>
    </View>
  );
};

/**
 * ================================================================
 * CHECKLIST: Screens to Update
 * ================================================================
 * 
 * Screens List:
 * [ ] LoginScreen.js
 * [ ] DashboardScreen.js
 * [ ] MapScreen.js
 * [ ] AnalyticsScreen.js
 * [ ] ProfileScreen.js
 * [ ] SettingsScreen.js
 * [ ] NotificationsScreen.js
 * [ ] TripDetailsScreen.js
 * [ ] VehicleDetailsScreen.js
 * [ ] MaintenanceScreen.js
 * [ ] ReportsScreen.js
 * [ ] HelpScreen.js
 * 
 * For Each Screen:
 * 1. Import { useTheme } from '../services/ThemeService'
 * 2. Import themed components
 * 3. Call const { colors, styles } = useTheme()
 * 4. Replace hardcoded colors with colors.xxx
 * 5. Replace View with ThemedContainer
 * 6. Replace TouchableOpacity buttons with ThemedButton
 * 7. Replace TextInput with ThemedTextInput
 * 8. Replace Text with ThemedText
 * 9. Test on both light and dark modes
 * 10. Verify readability and contrast
 */

/**
 * ================================================================
 * STEP 9: Testing Theme Changes
 * ================================================================
 * 
 * Test Cases:
 * 
 * 1. Theme Toggle
 *    - Toggle dark mode on
 *    - Verify all screens update colors
 *    - Toggle dark mode off
 *    - Verify colors revert to light
 * 
 * 2. Persistence
 *    - Change theme to dark
 *    - Close app
 *    - Reopen app
 *    - Verify dark theme is still active
 * 
 * 3. Contrast & Readability
 *    - Check text contrast ratios (WCAG AA minimum)
 *    - Verify all text is readable
 *    - Test with accessibility tools
 * 
 * 4. Component Integration
 *    - Verify all buttons have correct colors
 *    - Check input fields have proper styling
 *    - Test cards and overlays
 *    - Verify status indicators are visible
 * 
 * 5. Device Integration
 *    - Test on device with light mode
 *    - Test on device with dark mode
 *    - Test theme toggle on real device
 *    - Test settings screen theme selection
 */

/**
 * ================================================================
 * STEP 10: Performance Optimization
 * ================================================================
 * 
 * Optimization Tips:
 * 
 * 1. Avoid Theme Recreation
 *    - Use useTheme hook to get theme object
 *    - Don't create new color objects in render
 *    - Memoize component styles
 * 
 * 2. Batch Color Updates
 *    - Use theme context to update all colors at once
 *    - Avoid individual re-renders for color changes
 * 
 * 3. Optimize Re-renders
 *    - Components using useTheme will re-render on theme change
 *    - This is necessary for theme consistency
 *    - Use useMemo to optimize expensive computations
 * 
 * 4. Memory Management
 *    - AsyncStorage operations are async
 *    - Theme is cached after first load
 *    - No memory leaks from theme context
 */

export default {
  ThemeAwareLoginScreen,
  ThemeAwareSettingsScreen,
  ThemeAwareDashboardScreen,
  MapScreenThemeIntegration,
  ThemedToast,
};
