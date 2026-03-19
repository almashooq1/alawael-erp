/**
 * Socket Context - Phase 3
 * Context للاتصال بـ Socket.IO
 *
 * Features:
 * - إدارة الاتصال بـ Socket.IO
 * - استقبال وإرسال الرسائل
 * - حالة الاتصال
 * - معالجة الأحداث
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { getToken } from '../utils/tokenStorage';

const SocketContext = createContext(null);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers] = useState([]); // eslint-disable-line no-unused-vars

  useEffect(() => {
    // الحصول على التوكن من localStorage
    const token = getToken();

    if (!token) {
      return;
    }

    // إنشاء اتصال Socket.IO
    const newSocket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
      auth: {
        token,
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    // معالجة الاتصال
    newSocket.on('connect', () => {
      setIsConnected(true);
    });

    // معالجة قطع الاتصال
    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    // معالجة أخطاء الاتصال
    newSocket.on('connect_error', error => {
      console.error('❌ Socket.IO connection error:', error.message);
      setIsConnected(false);
    });

    // معالجة تغيير حالة المستخدمين
    newSocket.on('user_status_change', _data => {
      // يمكن إضافة منطق لتحديث قائمة المستخدمين المتصلين
    });

    setSocket(newSocket);

    // تنظيف الاتصال عند إلغاء التركيب
    return () => {
      newSocket.disconnect();
    };
  }, []);

  // إرسال رسالة
  const sendMessage = useCallback(
    (conversationId, content, attachments = [], replyTo = null) => {
      if (!socket) {
        console.error('❌ Socket not initialized');
        return;
      }

      socket.emit('send_message', {
        conversationId,
        content,
        attachments,
        replyTo,
      });
    },
    [socket]
  );

  // بدء الكتابة
  const startTyping = useCallback(
    conversationId => {
      if (!socket) return;
      socket.emit('typing', { conversationId });
    },
    [socket]
  );

  // إيقاف الكتابة
  const stopTyping = useCallback(
    conversationId => {
      if (!socket) return;
      socket.emit('stop_typing', { conversationId });
    },
    [socket]
  );

  // تحديد رسالة كمقروءة
  const markMessageAsRead = useCallback(
    (messageId, conversationId) => {
      if (!socket) return;
      socket.emit('message_read', { messageId, conversationId });
    },
    [socket]
  );

  // تحديد رسالة كمسلّمة
  const markMessageAsDelivered = useCallback(
    messageId => {
      if (!socket) return;
      socket.emit('message_delivered', { messageId });
    },
    [socket]
  );

  // الانضمام لمحادثة
  const joinConversation = useCallback(
    conversationId => {
      if (!socket) return;
      socket.emit('join_conversation', { conversationId });
    },
    [socket]
  );

  // مغادرة محادثة
  const leaveConversation = useCallback(
    conversationId => {
      if (!socket) return;
      socket.emit('leave_conversation', { conversationId });
    },
    [socket]
  );

  // الاستماع لحدث
  const on = useCallback(
    (event, callback) => {
      if (!socket) return;
      socket.on(event, callback);
    },
    [socket]
  );

  // إلغاء الاستماع لحدث
  const off = useCallback(
    (event, callback) => {
      if (!socket) return;
      socket.off(event, callback);
    },
    [socket]
  );

  const value = {
    socket,
    isConnected,
    onlineUsers,
    sendMessage,
    startTyping,
    stopTyping,
    markMessageAsRead,
    markMessageAsDelivered,
    joinConversation,
    leaveConversation,
    on,
    off,
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};
