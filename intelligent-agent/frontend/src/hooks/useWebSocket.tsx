import React, { useEffect, useState, useCallback } from 'react';
import io, { Socket } from 'socket.io-client';

interface WebSocketContextValue {
  socket: Socket | null;
  connected: boolean;
  joinProject: (projectId: string) => void;
  leaveProject: (projectId: string) => void;
  sendMessage: (projectId: string, message: string) => void;
  onEvent: (event: string, callback: (...args: any[]) => void) => () => void;
}

const WebSocketContext = React.createContext<WebSocketContextValue>({
  socket: null,
  connected: false,
  joinProject: () => {},
  leaveProject: () => {},
  sendMessage: () => {},
  onEvent: () => () => {}
});

export const useWebSocket = () => React.useContext(WebSocketContext);

interface Props {
  children: React.ReactNode;
  token: string;
  url?: string;
}

export const WebSocketProvider: React.FC<Props> = ({ 
  children, 
  token, 
  url = 'http://localhost:3001' 
}) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!token) return;

    const newSocket = io(url, {
      auth: { token },
      path: '/ws',
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('✅ WebSocket connected');
      setConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('❌ WebSocket disconnected');
      setConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      setConnected(false);
    });

    newSocket.on('connected', (data) => {
      console.log('Connected to server:', data);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [token, url]);

  const joinProject = useCallback((projectId: string) => {
    if (socket) {
      socket.emit('project:join', projectId);
      console.log(`Joined project: ${projectId}`);
    }
  }, [socket]);

  const leaveProject = useCallback((projectId: string) => {
    if (socket) {
      socket.emit('project:leave', projectId);
      console.log(`Left project: ${projectId}`);
    }
  }, [socket]);

  const sendMessage = useCallback((projectId: string, message: string) => {
    if (socket) {
      socket.emit('chat:message', { projectId, message });
    }
  }, [socket]);

  const onEvent = useCallback((event: string, callback: (...args: any[]) => void) => {
    if (socket) {
      socket.on(event, callback);
      return () => {
        socket.off(event, callback);
      };
    }
    return () => {};
  }, [socket]);

  const value: WebSocketContextValue = {
    socket,
    connected,
    joinProject,
    leaveProject,
    sendMessage,
    onEvent
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};

// Custom hooks for specific features

export const useProjectUpdates = (projectId: string) => {
  const { onEvent, connected } = useWebSocket();
  const [updates, setUpdates] = useState<any[]>([]);

  useEffect(() => {
    if (!connected || !projectId) return;

    const unsubscribe = onEvent('project:updated', (data: any) => {
      if (data.projectId === projectId) {
        setUpdates(prev => [...prev, data]);
      }
    });

    return unsubscribe;
  }, [projectId, connected, onEvent]);

  return updates;
};

export const useModelTraining = (projectId: string) => {
  const { onEvent, connected } = useWebSocket();
  const [progress, setProgress] = useState<any>(null);
  const [status, setStatus] = useState<any>(null);

  useEffect(() => {
    if (!connected || !projectId) return;

    const unsubProgress = onEvent('model:training-progress', (data: any) => {
      setProgress(data);
    });

    const unsubStatus = onEvent('model:status-changed', (data: any) => {
      setStatus(data);
    });

    return () => {
      unsubProgress();
      unsubStatus();
    };
  }, [projectId, connected, onEvent]);

  return { progress, status };
};

export const useChatMessages = (projectId: string) => {
  const { onEvent, connected, sendMessage } = useWebSocket();
  const [messages, setMessages] = useState<any[]>([]);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!connected || !projectId) return;

    const unsubMessage = onEvent('chat:new-message', (data: any) => {
      if (data.projectId === projectId) {
        setMessages(prev => [...prev, data]);
      }
    });

    const unsubTyping = onEvent('chat:user-typing', (data: any) => {
      if (data.projectId === projectId) {
        setTypingUsers(prev => new Set(prev).add(data.username));
      }
    });

    const unsubStopTyping = onEvent('chat:user-stopped-typing', (data: any) => {
      if (data.projectId === projectId) {
        setTypingUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(data.username);
          return newSet;
        });
      }
    });

    return () => {
      unsubMessage();
      unsubTyping();
      unsubStopTyping();
    };
  }, [projectId, connected, onEvent]);

  const send = useCallback((message: string) => {
    sendMessage(projectId, message);
  }, [projectId, sendMessage]);

  return { messages, typingUsers, send };
};

export const useOnlineUsers = () => {
  const { onEvent, connected } = useWebSocket();
  const [onlineUsers, setOnlineUsers] = useState<Map<string, any>>(new Map());

  useEffect(() => {
    if (!connected) return;

    const unsubscribe = onEvent('user:status', (data: any) => {
      setOnlineUsers(prev => {
        const newMap = new Map(prev);
        if (data.status === 'online') {
          newMap.set(data.userId, data);
        } else {
          newMap.delete(data.userId);
        }
        return newMap;
      });
    });

    return unsubscribe;
  }, [connected, onEvent]);

  return Array.from(onlineUsers.values());
};

// Example usage component
export const ProjectChatExample: React.FC<{ projectId: string }> = ({ projectId }) => {
  const { joinProject, leaveProject } = useWebSocket();
  const { messages, typingUsers, send } = useChatMessages(projectId);
  const [input, setInput] = useState('');

  useEffect(() => {
    joinProject(projectId);
    return () => leaveProject(projectId);
  }, [projectId, joinProject, leaveProject]);

  const handleSend = () => {
    if (input.trim()) {
      send(input);
      setInput('');
    }
  };

  return (
    <div className="chat-container">
      <div className="messages">
        {messages.map((msg, i) => (
          <div key={i} className="message">
            <strong>{msg.username}:</strong> {msg.message}
            <span className="timestamp">{new Date(msg.timestamp).toLocaleTimeString()}</span>
          </div>
        ))}
      </div>
      
      {typingUsers.size > 0 && (
        <div className="typing-indicator">
          {Array.from(typingUsers).join(', ')} is typing...
        </div>
      )}
      
      <div className="input-area">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Type a message..."
        />
        <button onClick={handleSend}>Send</button>
      </div>
    </div>
  );
};
