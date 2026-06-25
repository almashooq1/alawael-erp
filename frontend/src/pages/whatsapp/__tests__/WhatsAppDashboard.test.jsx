/**
 * WhatsAppDashboard — real-time socket integration tests
 *
 * Covers:
 *   1. Subscribes to WhatsApp events on mount using the current user's branch/org.
 *   2. Applies incoming message updates to the conversation list and selected conversation.
 *   3. Applies status updates to existing messages.
 *   4. Applies conversation metadata updates.
 *   5. Shows a snackbar notification on escalation events.
 *   6. Unsubscribes on unmount.
 */

import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor, act } from '@testing-library/react';
import WhatsAppDashboard from '../WhatsAppDashboard';
import { useAuth } from 'contexts/AuthContext';
import { useSocket } from 'contexts/SocketContext';
import apiClient from 'services/api.client';

jest.mock('contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('contexts/SocketContext', () => ({
  useSocket: jest.fn(),
}));

jest.mock('services/api.client', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

describe('WhatsAppDashboard — real-time sockets', () => {
  let eventHandlers;
  let socketMock;

  function createSocketMock() {
    eventHandlers = {};
    return {
      emit: jest.fn(),
      on: jest.fn((event, cb) => {
        eventHandlers[event] = cb;
      }),
      off: jest.fn((event, cb) => {
        if (eventHandlers[event] === cb) {
          delete eventHandlers[event];
        }
      }),
    };
  }

  function setupMocks({ user = null, conversations = [] } = {}) {
    socketMock = createSocketMock();
    useAuth.mockReturnValue({ currentUser: user });
    useSocket.mockReturnValue({ socket: socketMock, isConnected: true });
    apiClient.get.mockImplementation(url => {
      if (url === '/whatsapp/status') return Promise.resolve({ data: { data: { enabled: true } } });
      if (url === '/whatsapp/conversations')
        return Promise.resolve({ data: { data: conversations } });
      return Promise.resolve({ data: { data: null } });
    });
    apiClient.post.mockResolvedValue({ data: { success: true } });
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('subscribes to branch and org rooms on mount', async () => {
    setupMocks({
      user: { _id: 'user-1', branchId: 'branch-1', organizationId: 'org-1' },
      conversations: [],
    });

    render(<WhatsAppDashboard />);

    await waitFor(() => {
      expect(socketMock.emit).toHaveBeenCalledWith('whatsapp:subscribe', {
        branchId: 'branch-1',
        organizationId: 'org-1',
      });
    });
  });

  test('adds incoming message to conversation list and selected conversation', async () => {
    const existingConv = {
      _id: 'conv-1',
      phone: '+966500000001',
      senderName: 'ولي أمر',
      unreadCount: 0,
      messages: [],
    };
    setupMocks({
      user: { _id: 'user-1', branchId: 'branch-1' },
      conversations: [existingConv],
    });

    render(<WhatsAppDashboard />);

    await waitFor(() =>
      expect(apiClient.get).toHaveBeenCalledWith('/whatsapp/conversations', { params: {} })
    );

    const incomingMessage = {
      _id: 'msg-1',
      direction: 'incoming',
      type: 'text',
      text: 'مرحبا',
      timestamp: new Date().toISOString(),
    };

    act(() => {
      eventHandlers['whatsapp:message']({
        conversationId: 'conv-1',
        message: incomingMessage,
      });
    });

    expect(await screen.findByText('مرحبا')).toBeInTheDocument();
  });

  test('updates delivery status on whatsapp:status event', async () => {
    const existingConv = {
      _id: 'conv-1',
      phone: '+966500000001',
      senderName: 'ولي أمر',
      messages: [
        {
          _id: 'msg-1',
          direction: 'outgoing',
          text: 'تمام',
          providerMessageId: 'prov-1',
          deliveryStatus: 'sent',
        },
      ],
    };
    setupMocks({
      user: { _id: 'user-1', branchId: 'branch-1' },
      conversations: [existingConv],
    });

    render(<WhatsAppDashboard />);
    await waitFor(() =>
      expect(apiClient.get).toHaveBeenCalledWith('/whatsapp/conversations', { params: {} })
    );

    act(() => {
      eventHandlers['whatsapp:status']({
        conversationId: 'conv-1',
        providerMessageId: 'prov-1',
        status: 'delivered',
      });
    });

    // The dashboard does not render the status text directly, but the state update should not throw.
    expect(screen.getByText('تمام')).toBeInTheDocument();
  });

  test('updates conversation metadata on whatsapp:conversation event', async () => {
    const existingConv = {
      _id: 'conv-1',
      phone: '+966500000001',
      senderName: 'ولي أمر',
      unreadCount: 5,
      messages: [],
    };
    setupMocks({
      user: { _id: 'user-1', branchId: 'branch-1' },
      conversations: [existingConv],
    });

    render(<WhatsAppDashboard />);
    await waitFor(() =>
      expect(apiClient.get).toHaveBeenCalledWith('/whatsapp/conversations', { params: {} })
    );

    act(() => {
      eventHandlers['whatsapp:conversation']({
        conversationId: 'conv-1',
        changes: { unreadCount: 0 },
      });
    });

    // Ensure no errors; further assertions can inspect list state once exposed.
    expect(screen.getByText('ولي أمر')).toBeInTheDocument();
  });

  test('shows snackbar notification on escalation event', async () => {
    const existingConv = {
      _id: 'conv-1',
      phone: '+966500000001',
      senderName: 'ولي أمر',
      messages: [],
    };
    setupMocks({
      user: { _id: 'user-1', branchId: 'branch-1' },
      conversations: [existingConv],
    });

    render(<WhatsAppDashboard />);
    await waitFor(() =>
      expect(apiClient.get).toHaveBeenCalledWith('/whatsapp/conversations', { params: {} })
    );

    act(() => {
      eventHandlers['whatsapp:escalation']({
        conversationId: 'conv-1',
        reason: 'critical_emergency',
        conversation: { senderName: 'ولي أمر', phone: '+966500000001' },
      });
    });

    expect(await screen.findByText(/محادثة واتساب مصعّدة/)).toBeInTheDocument();
  });

  test('unsubscribes and removes listeners on unmount', async () => {
    setupMocks({
      user: { _id: 'user-1', branchId: 'branch-1' },
      conversations: [],
    });

    const { unmount } = render(<WhatsAppDashboard />);
    await waitFor(() =>
      expect(socketMock.emit).toHaveBeenCalledWith('whatsapp:subscribe', expect.any(Object))
    );

    unmount();

    expect(socketMock.emit).toHaveBeenCalledWith('whatsapp:unsubscribe');
    expect(socketMock.off).toHaveBeenCalledWith('whatsapp:message', expect.any(Function));
    expect(socketMock.off).toHaveBeenCalledWith('whatsapp:status', expect.any(Function));
    expect(socketMock.off).toHaveBeenCalledWith('whatsapp:conversation', expect.any(Function));
    expect(socketMock.off).toHaveBeenCalledWith('whatsapp:escalation', expect.any(Function));
  });

  test('updates document title with unread badge and restores on unmount', async () => {
    const originalTitle = 'Original Test Title';
    document.title = originalTitle;
    setupMocks({
      user: { _id: 'user-1', branchId: 'branch-1' },
      conversations: [
        { _id: 'conv-1', phone: '1', senderName: 'A', unreadCount: 2, messages: [] },
        { _id: 'conv-2', phone: '2', senderName: 'B', unreadCount: 3, messages: [] },
      ],
    });

    const { unmount } = render(<WhatsAppDashboard />);
    await waitFor(() =>
      expect(apiClient.get).toHaveBeenCalledWith('/whatsapp/conversations', { params: {} })
    );
    await waitFor(() => expect(document.title).toBe('(5) واتساب — مركز التواصل الذكي'));

    unmount();
    expect(document.title).toBe(originalTitle);
  });

  test('plays escalation beep using Web Audio API', async () => {
    const stop = jest.fn();
    const start = jest.fn();
    const connect = jest.fn();
    const mockCtx = {
      currentTime: 0,
      destination: {},
      createOscillator: jest.fn(() => ({
        type: '',
        frequency: { setValueAtTime: jest.fn() },
        connect,
        start,
        stop,
      })),
      createGain: jest.fn(() => ({
        gain: { setValueAtTime: jest.fn(), exponentialRampToValueAtTime: jest.fn() },
        connect,
      })),
    };
    window.AudioContext = jest.fn(() => mockCtx);

    const existingConv = {
      _id: 'conv-1',
      phone: '+966500000001',
      senderName: 'ولي أمر',
      messages: [],
    };
    setupMocks({
      user: { _id: 'user-1', branchId: 'branch-1' },
      conversations: [existingConv],
    });

    render(<WhatsAppDashboard />);
    await waitFor(() =>
      expect(apiClient.get).toHaveBeenCalledWith('/whatsapp/conversations', { params: {} })
    );

    act(() => {
      eventHandlers['whatsapp:escalation']({
        conversationId: 'conv-1',
        reason: 'critical_emergency',
        conversation: { senderName: 'ولي أمر', phone: '+966500000001' },
      });
    });

    expect(window.AudioContext).toHaveBeenCalledTimes(1);
    expect(mockCtx.createOscillator).toHaveBeenCalled();
    expect(start).toHaveBeenCalled();
    expect(stop).toHaveBeenCalled();

    delete window.AudioContext;
  });
});
