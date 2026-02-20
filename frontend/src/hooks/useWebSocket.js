/**
 * WebSocket Hook for React
 * Provides real-time communication with backend
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import io from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:3001';

export const useWebSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const socketRef = useRef(null);
  const listenersRef = useRef(new Map());

  useEffect(() => {
    // Get auth token
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('No auth token found for WebSocket connection');
      return;
    }

    // Initialize socket connection
    socketRef.current = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    const socket = socketRef.current;

    // Connection event handlers
    socket.on('connect', () => {
      console.log('✅ WebSocket connected:', socket.id);
      setIsConnected(true);
      setError(null);
    });

    socket.on('disconnect', () => {
      console.log('❌ WebSocket disconnected');
      setIsConnected(false);
    });

    socket.on('connect_error', err => {
      console.error('WebSocket connection error:', err.message);
      setError(err.message);
    });

    socket.on('error', err => {
      console.error('WebSocket error:', err.message);
      setError(err.message);
    });

    socket.on('connected', data => {
      console.log('WebSocket welcome:', data.message);
    });

    // Cleanup on unmount
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  /**
   * Subscribe to vehicle updates
   */
  const subscribeToVehicle = useCallback((vehicleId, callback) => {
    if (!socketRef.current) return;

    const socket = socketRef.current;

    // Subscribe
    socket.emit('subscribe:vehicle', vehicleId);

    // Listen for updates
    socket.on('vehicle:updated', data => {
      if (data.vehicleId === vehicleId) {
        callback(data.data);
      }
    });

    // Listen for location updates
    socket.on('vehicle:location', data => {
      if (data.vehicleId === vehicleId) {
        callback({ location: data.location });
      }
    });

    // Listen for low fuel
    socket.on('vehicle:low-fuel', data => {
      if (data.vehicleId === vehicleId) {
        callback({ lowFuel: true, fuelLevel: data.fuelLevel });
      }
    });

    // Store listeners
    listenersRef.current.set(`vehicle:${vehicleId}`, {
      updated: 'vehicle:updated',
      location: 'vehicle:location',
      lowFuel: 'vehicle:low-fuel',
    });

    console.log(`📡 Subscribed to vehicle ${vehicleId}`);

    // Return unsubscribe function
    return () => {
      socket.emit('unsubscribe:vehicle', vehicleId);
      socket.off('vehicle:updated');
      socket.off('vehicle:location');
      socket.off('vehicle:low-fuel');
      listenersRef.current.delete(`vehicle:${vehicleId}`);
      console.log(`📡 Unsubscribed from vehicle ${vehicleId}`);
    };
  }, []);

  /**
   * Subscribe to trip updates
   */
  const subscribeToTrip = useCallback((tripId, callback) => {
    if (!socketRef.current) return;

    const socket = socketRef.current;

    // Subscribe
    socket.emit('subscribe:trip', tripId);

    // Listen for updates
    socket.on('trip:updated', data => {
      if (data.tripId === tripId) {
        callback(data.data);
      }
    });

    socket.on('trip:started', data => {
      if (data.tripId === tripId) {
        callback({ status: 'started', ...data.data });
      }
    });

    socket.on('trip:completed', data => {
      if (data.tripId === tripId) {
        callback({ status: 'completed', ...data.data });
      }
    });

    socket.on('trip:cancelled', data => {
      if (data.tripId === tripId) {
        callback({ status: 'cancelled', reason: data.reason });
      }
    });

    listenersRef.current.set(`trip:${tripId}`, {
      updated: 'trip:updated',
      started: 'trip:started',
      completed: 'trip:completed',
      cancelled: 'trip:cancelled',
    });

    console.log(`📡 Subscribed to trip ${tripId}`);

    // Return unsubscribe function
    return () => {
      socket.emit('unsubscribe:trip', tripId);
      socket.off('trip:updated');
      socket.off('trip:started');
      socket.off('trip:completed');
      socket.off('trip:cancelled');
      listenersRef.current.delete(`trip:${tripId}`);
      console.log(`📡 Unsubscribed from trip ${tripId}`);
    };
  }, []);

  /**
   * Subscribe to all vehicle tracking
   */
  const subscribeToTracking = useCallback(callback => {
    if (!socketRef.current) return;

    const socket = socketRef.current;

    // Subscribe
    socket.emit('subscribe:tracking');

    // Listen for tracking updates
    socket.on('tracking:update', data => {
      callback(data);
    });

    console.log('📡 Subscribed to vehicle tracking');

    // Return unsubscribe function
    return () => {
      socket.emit('unsubscribe:tracking');
      socket.off('tracking:update');
      console.log('📡 Unsubscribed from tracking');
    };
  }, []);

  /**
   * Request vehicle status
   */
  const requestVehicleStatus = useCallback(vehicleId => {
    if (!socketRef.current) return;

    return new Promise((resolve, reject) => {
      const socket = socketRef.current;
      const timeout = setTimeout(() => {
        reject(new Error('Request timeout'));
      }, 5000);

      socket.emit('request:vehicle-status', vehicleId);

      socket.once('vehicle:status', data => {
        clearTimeout(timeout);
        resolve(data);
      });

      socket.once('error', err => {
        clearTimeout(timeout);
        reject(err);
      });
    });
  }, []);

  /**
   * Request trip status
   */
  const requestTripStatus = useCallback(tripId => {
    if (!socketRef.current) return;

    return new Promise((resolve, reject) => {
      const socket = socketRef.current;
      const timeout = setTimeout(() => {
        reject(new Error('Request timeout'));
      }, 5000);

      socket.emit('request:trip-status', tripId);

      socket.once('trip:status', data => {
        clearTimeout(timeout);
        resolve(data);
      });

      socket.once('error', err => {
        clearTimeout(timeout);
        reject(err);
      });
    });
  }, []);

  /**
   * Request active vehicles
   */
  const requestActiveVehicles = useCallback(() => {
    if (!socketRef.current) return;

    return new Promise((resolve, reject) => {
      const socket = socketRef.current;
      const timeout = setTimeout(() => {
        reject(new Error('Request timeout'));
      }, 5000);

      socket.emit('request:active-vehicles');

      socket.once('active-vehicles', data => {
        clearTimeout(timeout);
        resolve(data);
      });

      socket.once('error', err => {
        clearTimeout(timeout);
        reject(err);
      });
    });
  }, []);

  /**
   * Listen for emergency alerts
   */
  const onEmergencyAlert = useCallback(callback => {
    if (!socketRef.current) return;

    const socket = socketRef.current;
    socket.on('emergency:alert', callback);

    return () => {
      socket.off('emergency:alert', callback);
    };
  }, []);

  /**
   * Listen for notifications
   */
  const onNotification = useCallback(callback => {
    if (!socketRef.current) return;

    const socket = socketRef.current;
    socket.on('notification', callback);

    return () => {
      socket.off('notification', callback);
    };
  }, []);

  return {
    isConnected,
    error,
    subscribeToVehicle,
    subscribeToTrip,
    subscribeToTracking,
    requestVehicleStatus,
    requestTripStatus,
    requestActiveVehicles,
    onEmergencyAlert,
    onNotification,
  };
};

export default useWebSocket;
