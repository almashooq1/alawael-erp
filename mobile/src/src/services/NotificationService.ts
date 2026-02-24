/**
 * Push Notifications Service
 * Handles Expo push notifications and local storage
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ApiService from './ApiService';

const PUSH_TOKEN_KEY = 'push_notification_token';
const NOTIFICATION_PREFERENCES_KEY = 'notification_preferences';

/**
 * Setup push notifications
 */
export async function setupPushNotifications() {
  try {
    if (!Device.isDevice) {
      console.log('Push notifications require a physical device');
      return null;
    }

    // Request notification permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Failed to get push notification permissions');
      return null;
    }

    // Get push token
    const token = await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig?.extra?.projectId,
    });

    // Store token locally
    await AsyncStorage.setItem(PUSH_TOKEN_KEY, token.data);

    // Register token with backend
    await registerPushToken(token.data);

    // Setup notification listeners
    setupNotificationListeners();

    console.log('Push notifications setup complete');
    return token.data;
  } catch (error) {
    console.error('Error setting up push notifications:', error);
    return null;
  }
}

/**
 * Register push token with backend
 */
async function registerPushToken(token: string) {
  try {
    await ApiService.post('/notifications/register-device', {
      token,
      platform: Device.osName,
      deviceId: Device.deviceId,
    });
  } catch (error) {
    console.error('Error registering push token:', error);
  }
}

/**
 * Setup notification listeners
 */
function setupNotificationListeners() {
  // Listener for notifications received while app is foreground
  const foregroundSubscription = Notifications.addNotificationReceivedListener((notification) => {
    console.log('Notification received (foreground):', notification);
    handleNotificationReceived(notification);
  });

  // Listener for notifications tapped while app is background
  const backgroundSubscription = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      console.log('Notification tapped:', response);
      handleNotificationTapped(response.notification);
    }
  );

  return () => {
    foregroundSubscription.remove();
    backgroundSubscription.remove();
  };
}

/**
 * Handle notification received
 */
async function handleNotificationReceived(notification: Notifications.Notification) {
  const { data } = notification.request.content;

  // Save locally
  if (data) {
    const preferences = await getNotificationPreferences();
    if (preferences.enabled) {
      // Dispatch Redux action or emit event
      console.log('Processing notification:', data);
    }
  }
}

/**
 * Handle notification tapped
 */
async function handleNotificationTapped(notification: Notifications.Notification) {
  const { data } = notification.request.content;

  // Navigate based on notification type
  if (data?.type === 'order') {
    // Navigate to order detail
    console.log('Navigate to order:', data.orderId);
  } else if (data?.type === 'report') {
    // Navigate to report
    console.log('Navigate to report:', data.reportId);
  } else if (data?.type === 'alert') {
    // Navigate to notifications
    console.log('Navigate to alerts');
  }
}

/**
 * Send local notification
 */
export async function sendLocalNotification(
  title: string,
  body: string,
  data?: Record<string, any>
) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
        sound: true,
        badge: 1,
      },
      trigger: {
        seconds: 1,
      },
    });
  } catch (error) {
    console.error('Error sending local notification:', error);
  }
}

/**
 * Schedule notification
 */
export async function scheduleNotification(
  title: string,
  body: string,
  delay: number,
  data?: Record<string, any>
) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
        sound: true,
      },
      trigger: {
        seconds: delay,
      },
    });
  } catch (error) {
    console.error('Error scheduling notification:', error);
  }
}

/**
 * Cancel notification
 */
export async function cancelNotification(notificationId: string) {
  try {
    await Notifications.dismissNotificationAsync(notificationId);
  } catch (error) {
    console.error('Error canceling notification:', error);
  }
}

/**
 * Get notification preferences
 */
export async function getNotificationPreferences() {
  try {
    const prefs = await AsyncStorage.getItem(NOTIFICATION_PREFERENCES_KEY);
    return prefs
      ? JSON.parse(prefs)
      : {
          enabled: true,
          pushEnabled: true,
          emailEnabled: true,
          ordersNotifications: true,
          reportNotifications: true,
          alertNotifications: true,
        };
  } catch (error) {
    console.error('Error getting notification preferences:', error);
    return {
      enabled: true,
      pushEnabled: true,
      emailEnabled: true,
      ordersNotifications: true,
      reportNotifications: true,
      alertNotifications: true,
    };
  }
}

/**
 * Update notification preferences
 */
export async function updateNotificationPreferences(preferences: Record<string, any>) {
  try {
    const current = await getNotificationPreferences();
    const updated = { ...current, ...preferences };
    await AsyncStorage.setItem(NOTIFICATION_PREFERENCES_KEY, JSON.stringify(updated));

    // Sync with backend
    await ApiService.put('/user/notification-preferences', updated);

    return updated;
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    return null;
  }
}

/**
 * Get push token
 */
export async function getPushToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(PUSH_TOKEN_KEY);
  } catch (error) {
    console.error('Error getting push token:', error);
    return null;
  }
}

/**
 * Unregister device
 */
export async function unregisterDevice() {
  try {
    const token = await getPushToken();
    if (token) {
      await ApiService.post('/notifications/unregister-device', { token });
      await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
    }
  } catch (error) {
    console.error('Error unregistering device:', error);
  }
}
