/**
 * NotificationService.test.ts — matches what the canonical service
 * actually exports (named functions, uses AsyncStorage + ApiService,
 * not SecureStore/fetch as the prior copy assumed).
 */

jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  dismissNotificationAsync: jest.fn(),
  addNotificationReceivedListener: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(),
  setNotificationHandler: jest.fn(),
}));
jest.mock('expo-device', () => ({ isDevice: true, osName: 'iOS', modelName: 'iPhone' }));
jest.mock('expo-constants', () => ({
  default: { expoConfig: { extra: { projectId: 'test-proj' } }, sessionId: 'test-session' },
  expoConfig: { extra: { projectId: 'test-proj' } },
  sessionId: 'test-session',
}));
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));
jest.mock('../ApiService', () => ({
  __esModule: true,
  default: {
    get: jest.fn().mockResolvedValue({}),
    post: jest.fn().mockResolvedValue({}),
    put: jest.fn().mockResolvedValue({}),
    delete: jest.fn().mockResolvedValue({}),
  },
}));

import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ApiService from '../ApiService';
import {
  setupPushNotifications,
  sendLocalNotification,
  cancelNotification,
  getNotificationPreferences,
  updateNotificationPreferences,
  getPushToken,
  unregisterDevice,
} from '../NotificationService';

const mockedAS = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockedApi = ApiService as jest.Mocked<typeof ApiService>;

describe('NotificationService', () => {
  beforeEach(() => {
    // reset implementations AND call history — each test sets its
    // own mockResolvedValue on the methods it cares about
    Object.values(Notifications).forEach((m: any) => {
      if (typeof m?.mockReset === 'function') m.mockReset();
    });
    Object.values(mockedAS).forEach((m: any) => {
      if (typeof m?.mockReset === 'function') m.mockReset();
    });
    Object.values(mockedApi).forEach((m: any) => {
      if (typeof m?.mockReset === 'function') m.mockReset();
    });
  });

  describe('setupPushNotifications', () => {
    it('requests permissions and stores the token when granted', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });
      (Notifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValue({
        data: 'ExponentPushToken[xyz]',
      });
      (Notifications.addNotificationReceivedListener as jest.Mock).mockReturnValue({
        remove: jest.fn(),
      });
      (Notifications.addNotificationResponseReceivedListener as jest.Mock).mockReturnValue({
        remove: jest.fn(),
      });

      const token = await setupPushNotifications();

      expect(Notifications.getPermissionsAsync).toHaveBeenCalled();
      expect(token).toBe('ExponentPushToken[xyz]');
      expect(mockedAS.setItem).toHaveBeenCalledWith(
        'push_notification_token',
        'ExponentPushToken[xyz]'
      );
    });

    it('requests permissions if not already granted', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'denied' });
      (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });
      (Notifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValue({ data: 't' });
      (Notifications.addNotificationReceivedListener as jest.Mock).mockReturnValue({
        remove: jest.fn(),
      });
      (Notifications.addNotificationResponseReceivedListener as jest.Mock).mockReturnValue({
        remove: jest.fn(),
      });

      await setupPushNotifications();

      expect(Notifications.requestPermissionsAsync).toHaveBeenCalled();
    });

    it('returns null and skips token flow if permission ultimately denied', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'denied' });
      (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'denied' });

      const token = await setupPushNotifications();
      expect(token).toBeNull();
      expect(Notifications.getExpoPushTokenAsync).not.toHaveBeenCalled();
    });
  });

  describe('sendLocalNotification', () => {
    it('schedules with the supplied content + data', async () => {
      (Notifications.scheduleNotificationAsync as jest.Mock).mockResolvedValue('local-1');
      await sendLocalNotification('Title', 'Body', { type: 'order' });
      const call = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls[0][0];
      expect(call.content.title).toBe('Title');
      expect(call.content.body).toBe('Body');
      expect(call.content.data).toEqual({ type: 'order' });
    });
  });

  describe('cancelNotification', () => {
    it('dismisses by id', async () => {
      await cancelNotification('abc');
      expect(Notifications.dismissNotificationAsync).toHaveBeenCalledWith('abc');
    });
  });

  describe('getNotificationPreferences', () => {
    it('returns parsed prefs when stored', async () => {
      mockedAS.getItem.mockResolvedValue(JSON.stringify({ enabled: false, pushEnabled: false }));
      const prefs = await getNotificationPreferences();
      expect(prefs.enabled).toBe(false);
    });

    it('returns defaults when nothing is stored', async () => {
      mockedAS.getItem.mockResolvedValue(null);
      const prefs = await getNotificationPreferences();
      expect(prefs.enabled).toBe(true);
      expect(prefs.pushEnabled).toBe(true);
    });
  });

  describe('updateNotificationPreferences', () => {
    it('merges with current and persists + syncs to backend', async () => {
      mockedAS.getItem.mockResolvedValue(JSON.stringify({ enabled: true, pushEnabled: true }));
      const result = await updateNotificationPreferences({ pushEnabled: false });
      expect(result).toMatchObject({ enabled: true, pushEnabled: false });
      expect(mockedAS.setItem).toHaveBeenCalledWith(
        'notification_preferences',
        expect.stringContaining('"pushEnabled":false')
      );
      expect(mockedApi.put).toHaveBeenCalledWith(
        '/user/notification-preferences',
        expect.objectContaining({ pushEnabled: false })
      );
    });
  });

  describe('getPushToken', () => {
    it('returns the stored token', async () => {
      mockedAS.getItem.mockResolvedValue('ExponentPushToken[stored]');
      expect(await getPushToken()).toBe('ExponentPushToken[stored]');
      expect(mockedAS.getItem).toHaveBeenCalledWith('push_notification_token');
    });

    it('returns null when AsyncStorage has nothing', async () => {
      mockedAS.getItem.mockResolvedValue(null);
      expect(await getPushToken()).toBeNull();
    });
  });

  describe('unregisterDevice', () => {
    it('posts to backend and clears the stored token', async () => {
      mockedAS.getItem.mockResolvedValue('ExponentPushToken[old]');
      await unregisterDevice();
      expect(mockedApi.post).toHaveBeenCalledWith(
        '/notifications/unregister-device',
        expect.objectContaining({ token: 'ExponentPushToken[old]' })
      );
      expect(mockedAS.removeItem).toHaveBeenCalledWith('push_notification_token');
    });

    it('no-ops when no token is stored', async () => {
      mockedAS.getItem.mockResolvedValue(null);
      await unregisterDevice();
      expect(mockedApi.post).not.toHaveBeenCalled();
      expect(mockedAS.removeItem).not.toHaveBeenCalled();
    });
  });
});
