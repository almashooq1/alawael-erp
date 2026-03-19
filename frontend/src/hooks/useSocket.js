import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { SOCKET_URL } from 'config/apiConfig';
import logger from 'utils/logger';

/**
 * useSocket — Real-time WebSocket subscription hook.
 *
 * @param {string}   [namespace]  — Socket.IO namespace (e.g., '/therapist')
 * @param {object}   [options]
 * @param {boolean}  [options.autoConnect=true] — Connect on mount
 * @param {object}   [options.auth]     — Authentication payload
 * @param {function} [options.onConnect] — Connection callback
 * @param {function} [options.onDisconnect] — Disconnection callback
 * @param {function} [options.onError]  — Error callback
 *
 * @returns {object} { socket, isConnected, emit, on, off, connect, disconnect }
 */
const useSocket = (namespace = '', options = {}) => {
  const socketRef = useRef(null);
  const listenersRef = useRef(new Map());
  const connectedRef = useRef(false);

  const { autoConnect = true, auth, onConnect, onDisconnect, onError } = options;

  useEffect(() => {
    if (!autoConnect) return;

    const url = namespace ? `${SOCKET_URL}${namespace}` : SOCKET_URL;
    const socket = io(url, {
      auth,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      connectedRef.current = true;
      logger.log(`Socket connected: ${socket.id}`);
      onConnect?.();
    });

    socket.on('disconnect', reason => {
      connectedRef.current = false;
      logger.log(`Socket disconnected: ${reason}`);
      onDisconnect?.(reason);
    });

    socket.on('connect_error', err => {
      logger.error('Socket connection error:', err.message);
      onError?.(err);
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
      connectedRef.current = false;
    };
  }, [namespace, autoConnect]); // eslint-disable-line react-hooks/exhaustive-deps

  const emit = useCallback((event, data, ack) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data, ack);
    } else {
      logger.warn(`Cannot emit "${event}": socket not connected`);
    }
  }, []);

  const on = useCallback((event, handler) => {
    if (socketRef.current) {
      socketRef.current.on(event, handler);
      listenersRef.current.set(`${event}:${handler.toString().slice(0, 50)}`, { event, handler });
    }
  }, []);

  const off = useCallback((event, handler) => {
    if (socketRef.current) {
      socketRef.current.off(event, handler);
    }
  }, []);

  const connect = useCallback(() => {
    socketRef.current?.connect();
  }, []);

  const disconnect = useCallback(() => {
    socketRef.current?.disconnect();
  }, []);

  return {
    socket: socketRef.current,
    isConnected: connectedRef.current,
    emit,
    on,
    off,
    connect,
    disconnect,
  };
};

export default useSocket;
