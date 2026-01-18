import { useState, useEffect, createContext, useContext } from 'react';
import { io } from 'socket.io-client';
import { toast } from 'react-toastify';

const SocketContext = createContext(null);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
};

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Connect to Socket.IO server
    const newSocket = io('http://localhost:3001', {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    newSocket.on('connect', () => {
      console.log('✅ Connected to Socket.IO server');
      setConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('❌ Disconnected from Socket.IO server');
      setConnected(false);
    });

    // Listen for general notifications
    newSocket.on('notification', (data) => {
      toast.info(data.message, {
        position: 'top-left',
        autoClose: 5000,
      });
    });

    // Listen for KPI updates
    newSocket.on('kpi:update', (data) => {
      console.log('📊 KPI Update:', data);
      toast.success(`تحديث: ${data.title} = ${data.value}`, {
        position: 'top-left',
        autoClose: 3000,
      });
    });

    // Listen for new employee notifications
    newSocket.on('employee:new', (data) => {
      toast.info(`موظف جديد: ${data.name} تم إضافته`, {
        position: 'top-left',
        autoClose: 4000,
      });
    });

    // Listen for new lead notifications
    newSocket.on('lead:new', (data) => {
      toast.info(`عميل محتمل جديد: ${data.name}`, {
        position: 'top-left',
        autoClose: 4000,
      });
    });

    // Listen for course enrollment notifications
    newSocket.on('course:enrolled', (data) => {
      toast.success(`تم التسجيل في الدورة: ${data.courseName}`, {
        position: 'top-left',
        autoClose: 4000,
      });
    });

    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      newSocket.close();
    };
  }, []);

  const emit = (event, data) => {
    if (socket && connected) {
      socket.emit(event, data);
    } else {
      console.warn('Socket not connected, cannot emit event:', event);
    }
  };

  const on = (event, callback) => {
    if (socket) {
      socket.on(event, callback);
      return () => socket.off(event, callback);
    }
  };

  return (
    <SocketContext.Provider value={{ socket, connected, emit, on }}>
      {children}
    </SocketContext.Provider>
  );
}
