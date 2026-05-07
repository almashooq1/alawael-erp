jest.mock('../../../services/ApiService', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

import { configureStore } from '@reduxjs/toolkit';
import ApiService from '../../../services/ApiService';
import notificationsReducer, {
  fetchNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  addNotification,
  clearError,
  updateSettings,
} from '../notificationsSlice';

const mockedApi = ApiService as jest.Mocked<typeof ApiService>;

const makeStore = (preloaded?: any) =>
  configureStore({
    reducer: { notifications: notificationsReducer },
    preloadedState: preloaded,
  });

describe('notificationsSlice', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('exposes the documented defaults', () => {
      const state = makeStore().getState().notifications;
      expect(state.items).toEqual([]);
      expect(state.unreadCount).toBe(0);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.settings.pushEnabled).toBe(true);
      expect(state.settings.notificationTypes).toContain('order');
    });
  });

  describe('synchronous reducers', () => {
    it('addNotification prepends and increments unreadCount when unread', () => {
      const store = makeStore();
      store.dispatch(addNotification({ id: 'n1', title: 't', message: 'm', type: 'alert', read: false, createdAt: 'now' }));
      const state = store.getState().notifications;
      expect(state.items).toHaveLength(1);
      expect(state.items[0].id).toBe('n1');
      expect(state.unreadCount).toBe(1);
    });

    it('addNotification does not bump unreadCount when already read', () => {
      const store = makeStore();
      store.dispatch(addNotification({ id: 'n1', title: 't', message: 'm', type: 'alert', read: true, createdAt: 'now' }));
      expect(store.getState().notifications.unreadCount).toBe(0);
    });

    it('clearError resets the error field', () => {
      const store = makeStore({
        notifications: {
          items: [],
          unreadCount: 0,
          isLoading: false,
          error: 'boom',
          settings: { pushEnabled: true, emailEnabled: true, notificationTypes: [] },
        },
      });
      store.dispatch(clearError());
      expect(store.getState().notifications.error).toBeNull();
    });

    it('updateSettings merges provided keys into settings', () => {
      const store = makeStore();
      store.dispatch(updateSettings({ pushEnabled: false }));
      const settings = store.getState().notifications.settings;
      expect(settings.pushEnabled).toBe(false);
      expect(settings.emailEnabled).toBe(true);
    });
  });

  describe('fetchNotifications', () => {
    it('stores items and recomputes unreadCount on success', async () => {
      mockedApi.get.mockResolvedValue({
        items: [
          { id: '1', title: 'a', message: '', type: 'order', read: false, createdAt: 'x' },
          { id: '2', title: 'b', message: '', type: 'order', read: true, createdAt: 'x' },
        ],
      });
      const store = makeStore();
      await store.dispatch(fetchNotifications({}) as any);
      const state = store.getState().notifications;
      expect(state.items).toHaveLength(2);
      expect(state.unreadCount).toBe(1);
      expect(state.isLoading).toBe(false);
    });

    it('captures error message on rejection', async () => {
      mockedApi.get.mockRejectedValue(new Error('net down'));
      const store = makeStore();
      await store.dispatch(fetchNotifications({}) as any);
      expect(store.getState().notifications.error).toBe('net down');
    });
  });

  describe('markAsRead', () => {
    it('flips the matching notification and decrements unreadCount', async () => {
      mockedApi.put.mockResolvedValue({});
      const store = makeStore({
        notifications: {
          items: [{ id: '1', title: '', message: '', type: 't', read: false, createdAt: 'x' }],
          unreadCount: 1,
          isLoading: false,
          error: null,
          settings: { pushEnabled: true, emailEnabled: true, notificationTypes: [] },
        },
      });
      await store.dispatch(markAsRead('1') as any);
      const state = store.getState().notifications;
      expect(state.items[0].read).toBe(true);
      expect(state.unreadCount).toBe(0);
    });

    it('records error on failure', async () => {
      mockedApi.put.mockRejectedValue(new Error('forbidden'));
      const store = makeStore();
      await store.dispatch(markAsRead('1') as any);
      expect(store.getState().notifications.error).toBe('forbidden');
    });
  });

  describe('markAllAsRead', () => {
    it('clears unreadCount and marks every item read', async () => {
      mockedApi.put.mockResolvedValue({});
      const store = makeStore({
        notifications: {
          items: [
            { id: '1', title: '', message: '', type: 't', read: false, createdAt: 'x' },
            { id: '2', title: '', message: '', type: 't', read: false, createdAt: 'x' },
          ],
          unreadCount: 2,
          isLoading: false,
          error: null,
          settings: { pushEnabled: true, emailEnabled: true, notificationTypes: [] },
        },
      });
      await store.dispatch(markAllAsRead() as any);
      const state = store.getState().notifications;
      expect(state.unreadCount).toBe(0);
      expect(state.items.every(i => i.read)).toBe(true);
    });
  });

  describe('deleteNotification', () => {
    it('removes the item and decrements unreadCount when it was unread', async () => {
      mockedApi.delete.mockResolvedValue({});
      const store = makeStore({
        notifications: {
          items: [{ id: '1', title: '', message: '', type: 't', read: false, createdAt: 'x' }],
          unreadCount: 1,
          isLoading: false,
          error: null,
          settings: { pushEnabled: true, emailEnabled: true, notificationTypes: [] },
        },
      });
      await store.dispatch(deleteNotification('1') as any);
      const state = store.getState().notifications;
      expect(state.items).toHaveLength(0);
      expect(state.unreadCount).toBe(0);
    });
  });
});
