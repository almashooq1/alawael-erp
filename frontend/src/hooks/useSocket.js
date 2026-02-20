// ===================================
// useSocket Hook - WebSocket Connection
// ===================================

import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useSelector } from 'react-redux';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:3005';

export const useSocket = () => {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const user = useSelector(state => state.auth.user);

  useEffect(() => {
    // Only connect if user is authenticated
    if (!user?.id) {
      return;
    }

    // Initialize socket connection
    socketRef.current = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000,
    });

    const socket = socketRef.current;

    // Connection handlers
    socket.on('connect', () => {
      console.log('✅ WebSocket connected:', socket.id);
      setIsConnected(true);
      setConnectionError(null);

      // Authenticate user
      socket.emit('authenticate', user.id);
    });

    socket.on('authenticated', data => {
      console.log('👤 WebSocket authenticated:', data);
    });

    socket.on('disconnect', reason => {
      console.log('❌ WebSocket disconnected:', reason);
      setIsConnected(false);
    });

    socket.on('connect_error', error => {
      console.error('🔴 WebSocket connection error:', error.message);
      setConnectionError(error.message);
      setIsConnected(false);
    });

    socket.on('reconnect', attemptNumber => {
      console.log(`🔄 WebSocket reconnected after ${attemptNumber} attempts`);
      setIsConnected(true);
      setConnectionError(null);
    });

    socket.on('reconnect_error', error => {
      console.error('🔴 WebSocket reconnection error:', error.message);
    });

    socket.on('reconnect_failed', () => {
      console.error('❌ WebSocket reconnection failed');
      setConnectionError('Failed to reconnect to server');
    });

    // Cleanup on unmount
    return () => {
      if (socket) {
        socket.disconnect();
        console.log('🔌 WebSocket disconnected');
      }
    };
  }, [user?.id]);

  // Helper functions
  const emit = (event, data) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit(event, data);
      return true;
    }
    console.warn('⚠️ Cannot emit: Socket not connected');
    return false;
  };

  const on = (event, handler) => {
    if (socketRef.current) {
      socketRef.current.on(event, handler);
    }
  };

  const off = (event, handler) => {
    if (socketRef.current) {
      socketRef.current.off(event, handler);
    }
  };

  const joinRoom = room => {
    return emit('join_room', room);
  };

  const leaveRoom = room => {
    return emit('leave_room', room);
  };

  return {
    socket: socketRef.current,
    isConnected,
    connectionError,
    emit,
    on,
    off,
    joinRoom,
    leaveRoom,
  };
};

export default useSocket;
