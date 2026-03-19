import { useState, useEffect, useRef, useCallback } from 'react';

const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:3001';

export function useWebSocket() {
  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const [subscriptions, setSubscriptions] = useState([]);
  const ws = useRef(null);
  const reconnectTimeout = useRef(null);

  const connect = useCallback(() => {
    try {
      ws.current = new WebSocket(WS_URL);

      ws.current.onopen = () => {
        console.log('WebSocket connected');
        setConnected(true);

        // Resubscribe to previous subscriptions
        subscriptions.forEach(service => {
          ws.current.send(
            JSON.stringify({
              type: 'subscribe',
              service,
            })
          );
        });
      };

      ws.current.onmessage = event => {
        try {
          const message = JSON.parse(event.data);
          setLastMessage(message);
          console.log('WebSocket message:', message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.current.onerror = error => {
        console.error('WebSocket error:', error);
      };

      ws.current.onclose = () => {
        console.log('WebSocket disconnected');
        setConnected(false);

        // Attempt to reconnect after 5 seconds
        reconnectTimeout.current = setTimeout(() => {
          console.log('Attempting to reconnect...');
          connect();
        }, 5000);
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      setConnected(false);
    }
  }, [subscriptions]);

  const subscribe = useCallback(service => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(
        JSON.stringify({
          type: 'subscribe',
          service,
        })
      );
      setSubscriptions(prev => [...new Set([...prev, service])]);
    }
  }, []);

  const unsubscribe = useCallback(service => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(
        JSON.stringify({
          type: 'unsubscribe',
          service,
        })
      );
      setSubscriptions(prev => prev.filter(s => s !== service));
    }
  }, []);

  const send = useCallback(message => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    }
  }, []);

  useEffect(() => {
    connect();

    // Heartbeat - send ping every 25 seconds
    const heartbeat = setInterval(() => {
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 25000);

    return () => {
      clearInterval(heartbeat);
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [connect]);

  return {
    connected,
    lastMessage,
    subscribe,
    unsubscribe,
    send,
  };
}
