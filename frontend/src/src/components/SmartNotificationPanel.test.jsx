import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NotificationProvider } from '../context/NotificationContext';
import SmartNotificationPanel from '../components/SmartNotificationPanel';

// Mock notifications data
const mockNotifications = [
  {
    id: '1',
    message: 'Test notification 1',
    channel: 'email',
    readAt: null,
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    message: 'Test notification 2',
    channel: 'sms',
    readAt: null,
    createdAt: new Date().toISOString(),
  },
];

// Mock NotificationContext to provide test data
jest.mock('../context/NotificationContext', () => {
  const actual = jest.requireActual('../context/NotificationContext');
  return {
    ...actual,
    useNotifications: jest.fn(),
    NotificationProvider: function NotificationProvider(props) { return props.children; },
  };
});

describe('SmartNotificationPanel UI', () => {
  it('renders notifications and allows marking as read', async () => {
    const { useNotifications } = require('../context/NotificationContext');
    useNotifications.mockReturnValue({
      notifications: [
        { id: '1', title: 'عنوان 1', message: 'Test notification 1', type: 'attendance', isRead: false, priority: 2 },
        { id: '2', title: 'عنوان 2', message: 'Test notification 2', type: 'urgent', isRead: false, priority: 4 },
      ],
      markAsRead: jest.fn(),
      markAllAsRead: jest.fn(),
      loading: false,
      error: null,
      fetchNotifications: jest.fn(),
      hasMore: false,
      loadMore: jest.fn(),
      notify: jest.fn(),
    });
    render(
      <NotificationProvider>
        <SmartNotificationPanel />
      </NotificationProvider>
    );
    // Open the notification panel by clicking the icon
    const iconBtn = screen.getByRole('button');
    fireEvent.click(iconBtn);
    // Check for notification titles (primary)
    expect(screen.getByText('عنوان 1')).toBeInTheDocument();
    expect(screen.getByText('عنوان 2')).toBeInTheDocument();
    // Check for notification messages (secondary)
    expect(screen.getByText('Test notification 1')).toBeInTheDocument();
    expect(screen.getByText('Test notification 2')).toBeInTheDocument();
    // Find the mark all as read button by title
    const markAllBtn = screen.getAllByTitle('تعليم الكل كمقروء')[0];
    expect(markAllBtn).toBeTruthy();
    fireEvent.click(markAllBtn);
  });

  it('shows loading state if loading', () => {
    const { useNotifications } = require('../context/NotificationContext');
    useNotifications.mockReturnValue({
      notifications: [],
      markAsRead: jest.fn(),
      markAllAsRead: jest.fn(),
      loading: true,
      error: null,
      fetchNotifications: jest.fn(),
      hasMore: false,
      loadMore: jest.fn(),
      notify: jest.fn(),
    });
    render(
      <NotificationProvider>
        <SmartNotificationPanel />
      </NotificationProvider>
    );
    // Open the notification panel by clicking the icon
    const iconBtn = screen.getByRole('button');
    fireEvent.click(iconBtn);
    // Should show 'Loading...'
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('shows error state if error', () => {
    const { useNotifications } = require('../context/NotificationContext');
    useNotifications.mockReturnValue({
      notifications: [],
      markAsRead: jest.fn(),
      markAllAsRead: jest.fn(),
      loading: false,
      error: 'Failed to load',
      fetchNotifications: jest.fn(),
      hasMore: false,
      loadMore: jest.fn(),
      notify: jest.fn(),
    });
    render(
      <NotificationProvider>
        <SmartNotificationPanel />
      </NotificationProvider>
    );
    // Open the notification panel by clicking the icon
    const iconBtn = screen.getByRole('button');
    fireEvent.click(iconBtn);
    // Should show the error string
    expect(screen.getByText('Failed to load')).toBeInTheDocument();
  });
});

it('shows empty state if no notifications', () => {
  const { useNotifications } = require('../context/NotificationContext');
  useNotifications.mockReturnValue({
    notifications: [],
    markAsRead: jest.fn(),
    markAllAsRead: jest.fn(),
    loading: false,
    error: null,
    fetchNotifications: jest.fn(),
    hasMore: false,
    loadMore: jest.fn(),
    notify: jest.fn(),
  });
  render(
    <NotificationProvider>
      <SmartNotificationPanel />
    </NotificationProvider>
  );
  // Open the notification panel by clicking the icon
  const iconBtn = screen.getByRole('button');
  fireEvent.click(iconBtn);
  expect(screen.getByText('لا توجد إشعارات')).toBeInTheDocument();
});
