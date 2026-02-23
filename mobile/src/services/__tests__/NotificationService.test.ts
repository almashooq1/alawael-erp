import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NotificationService from '../../services/NotificationService';

jest.mock('expo-notifications');
jest.mock('expo-secure-store');
jest.mock('@react-native-async-storage/async-storage');
jest.mock('expo-device', () => ({
  isDevice: true,
}));

describe('NotificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('setupPushNotifications', () => {
    it('should request notification permissions', async () => {
      const mockGetPermissions = Notifications
        .getPermissionsAsync as jest.Mock;
      mockGetPermissions.mockResolvedValue({
        granted: true,
        ios: undefined,
        android: undefined,
      });

      await NotificationService.setupPushNotifications();

      expect(mockGetPermissions).toHaveBeenCalled();
    });

    it('should request permissions if not granted', async () => {
      const mockGetPermissions = Notifications
        .getPermissionsAsync as jest.Mock;
      const mockRequestPermissions = Notifications
        .requestPermissionsAsync as jest.Mock;

      mockGetPermissions.mockResolvedValue({
        granted: false,
        ios: undefined,
        android: undefined,
      });
      mockRequestPermissions.mockResolvedValue({
        granted: true,
        ios: undefined,
        android: undefined,
      });

      await NotificationService.setupPushNotifications();

      expect(mockRequestPermissions).toHaveBeenCalled();
    });

    it('should set up notification handlers', async () => {
      const mockAddReceivedListener = Notifications
        .addNotificationReceivedListener as jest.Mock;
      mockAddReceivedListener.mockReturnValue({
        remove: jest.fn(),
      });

      await NotificationService.setupPushNotifications();

      expect(mockAddReceivedListener).toHaveBeenCalled();
    });
  });

  describe('getPushToken', () => {
    it('should retrieve stored push token', async () => {
      const mockToken = 'ExponentPushToken[test-token-123]';
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(mockToken);

      const token = await NotificationService.getPushToken();

      expect(token).toBe(mockToken);
      expect(SecureStore.getItemAsync).toHaveBeenCalledWith('pushToken');
    });

    it('should return null if no token stored', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

      const token = await NotificationService.getPushToken();

      expect(token).toBeNull();
    });
  });

  describe('sendLocalNotification', () => {
    it('should send local notification immediately', async () => {
      const mockSchedule = Notifications.scheduleNotificationAsync as jest.Mock;
      mockSchedule.mockResolvedValue('notification-id');

      const result = await NotificationService.sendLocalNotification({
        title: 'Test',
        message: 'Test notification',
      });

      expect(result).toBe('notification-id');
      expect(mockSchedule).toHaveBeenCalled();
    });

    it('should include notification data', async () => {
      const mockSchedule = Notifications.scheduleNotificationAsync as jest.Mock;
      mockSchedule.mockResolvedValue('notification-id');

      await NotificationService.sendLocalNotification({
        title: 'Order Update',
        message: 'Your order has been processed',
        data: { type: 'order', orderId: '123' },
      });

      expect(mockSchedule).toHaveBeenCalled();
      const call = mockSchedule.mock.calls[0][0];
      expect(call.content.data).toEqual({ type: 'order', orderId: '123' });
    });
  });

  describe('scheduleNotification', () => {
    it('should schedule notification for future time', async () => {
      const mockSchedule = Notifications.scheduleNotificationAsync as jest.Mock;
      mockSchedule.mockResolvedValue('scheduled-notification-id');

      const futureDate = new Date();
      futureDate.setMinutes(futureDate.getMinutes() + 5);

      const result = await NotificationService.scheduleNotification({
        title: 'Scheduled',
        message: 'This is scheduled',
        trigger: futureDate,
      });

      expect(result).toBe('scheduled-notification-id');
      expect(mockSchedule).toHaveBeenCalled();
    });
  });

  describe('cancelNotification', () => {
    it('should cancel notification by id', async () => {
      const mockDismiss = Notifications.dismissNotificationAsync as jest.Mock;
      mockDismiss.mockResolvedValue(undefined);

      await NotificationService.cancelNotification('notification-id');

      expect(mockDismiss).toHaveBeenCalledWith('notification-id');
    });
  });

  describe('Notification preferences', () => {
    it('should get notification preferences', async () => {
      const mockPrefs = {
        pushEnabled: true,
        emailEnabled: false,
        notificationTypes: ['order', 'report'],
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(mockPrefs)
      );

      const prefs = await NotificationService.getNotificationPreferences();

      expect(prefs).toEqual(mockPrefs);
      expect(AsyncStorage.getItem).toHaveBeenCalledWith(
        'notificationPreferences'
      );
    });

    it('should return default preferences if none stored', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const prefs = await NotificationService.getNotificationPreferences();

      expect(prefs).toBeDefined();
      expect(prefs.pushEnabled).toBe(true);
    });

    it('should update notification preferences', async () => {
      const newPrefs = {
        pushEnabled: false,
        emailEnabled: true,
        notificationTypes: ['alert'],
      };

      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await NotificationService.updateNotificationPreferences(newPrefs);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'notificationPreferences',
        JSON.stringify(newPrefs)
      );
    });
  });

  describe('registerPushToken', () => {
    it('should register push token with backend', async () => {
      const token = 'ExponentPushToken[test-token]';
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(token);

      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        })
      );

      await NotificationService.registerPushToken(token, 'auth-token-123');

      expect(global.fetch).toHaveBeenCalled();
      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      expect(callArgs[0]).toContain('/notification-tokens');
      expect(callArgs[1].method).toBe('POST');
    });
  });

  describe('unregisterDevice', () => {
    it('should unregister device on logout', async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        })
      );

      await NotificationService.unregisterDevice('auth-token-123');

      expect(global.fetch).toHaveBeenCalled();
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('pushToken');
    });
  });

  describe('Notification listeners', () => {
    it('should set up notification received listener', async () => {
      const mockAddListener = Notifications
        .addNotificationReceivedListener as jest.Mock;

      const subscription = {
        remove: jest.fn(),
      };

      mockAddListener.mockReturnValue(subscription);

      await NotificationService.setupPushNotifications();

      expect(mockAddListener).toHaveBeenCalled();
    });

    it('should set up notification response listener', async () => {
      const mockAddResponseListener = Notifications
        .addNotificationResponseReceivedListener as jest.Mock;

      const subscription = {
        remove: jest.fn(),
      };

      mockAddResponseListener.mockReturnValue(subscription);

      await NotificationService.setupPushNotifications();

      expect(mockAddResponseListener).toHaveBeenCalled();
    });
  });
});
