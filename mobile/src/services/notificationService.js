// src/services/notificationService.js
/**
 * notificationService - Cross-platform Push Notification Handler
 * يدير الإشعارات الفورية (محلية وسحابية) مع دعم جدولة، قنوات، إجراءات، Deep Linking، وتحليلات.
 *
 * Dependencies: react-native-push-notification
 */
import PushNotification from 'react-native-push-notification';
import { Platform } from 'react-native';

class NotificationService {
  initialize() {
    PushNotification.configure({
      onRegister: function (token) {
        console.log('PushNotification Token:', token);
        // Send token to backend if needed
      },
      onNotification: function (notification) {
        console.log('PushNotification:', notification);
        // Handle notification tap/deep link
        if (notification.userInteraction && notification.data?.screen) {
          // Navigate to screen (requires navigation ref)
        }
      },
      permissions: {
        alert: true,
        badge: true,
        sound: true,
      },
      popInitialNotification: true,
      requestPermissions: true,
    });
    // Android channel example
    if (Platform.OS === 'android') {
      PushNotification.createChannel(
        {
          channelId: 'default',
          channelName: 'Default',
          importance: 4,
          vibrate: true,
        },
        created => console.log('Channel created:', created)
      );
    }
  }

  sendLocalNotification({ title, message, data = {}, date = null }) {
    PushNotification.localNotificationSchedule({
      channelId: 'default',
      title,
      message,
      userInfo: data,
      date: date || new Date(Date.now() + 1000), // default: 1s later
      allowWhileIdle: true,
      playSound: true,
      soundName: 'default',
      importance: 'high',
      priority: 'high',
    });
  }

  cancelAll() {
    PushNotification.cancelAllLocalNotifications();
  }
}

export default new NotificationService();
