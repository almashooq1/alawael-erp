/**
 * Phase 10 React Components
 * Real-time, integrations, and i18n UI components
 */

import React, { useState, useEffect } from 'react';
import {
  Wifi,
  Zap,
  Globe,
  PlugIcon,
  Clock,
  AlertTriangle
} from 'lucide-react';

// ==================== REAL-TIME COMPONENTS ====================

export const RealtimeStatusComponent = () => {
  const [status, status.setStatus] = useState('disconnected');
  const [connectionTime, setConnectionTime] = useState(null);
  const [messageCount, setMessageCount] = useState(0);

  useEffect(() => {
    // WebSocket connection logic
    const connectWebSocket = () => {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

        ws.onopen = () => {
          setStatus('connected');
          setConnectionTime(new Date());
        };

        ws.onmessage = (event) => {
          setMessageCount((prev) => prev + 1);
        };

        ws.onclose = () => {
          setStatus('disconnected');
        };

        ws.onerror = () => {
          setStatus('error');
        };
      } catch (error) {
        setStatus('error');
      }
    };

    connectWebSocket();
  }, []);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center gap-2 mb-4">
        <Wifi
          className={`w-6 h-6 ${
            status === 'connected'
              ? 'text-green-600'
              : status === 'error'
              ? 'text-red-600'
              : 'text-gray-400'
          }`}
        />
        <h2 className="text-xl font-bold">Real-time Connection</h2>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-50 rounded p-4">
          <p className="text-gray-600 text-sm">Status</p>
          <p
            className={`text-2xl font-bold mt-2 ${
              status === 'connected'
                ? 'text-green-600'
                : status === 'error'
                ? 'text-red-600'
                : 'text-yellow-600'
            }`}
          >
            {status.toUpperCase()}
          </p>
        </div>

        <div className="bg-gray-50 rounded p-4">
          <p className="text-gray-600 text-sm">Messages</p>
          <p className="text-2xl font-bold mt-2 text-blue-600">
            {messageCount}
          </p>
        </div>

        <div className="bg-gray-50 rounded p-4 col-span-2">
          <p className="text-gray-600 text-sm">Connected Since</p>
          <p className="text-sm mt-2">
            {connectionTime
              ? connectionTime.toLocaleString()
              : 'Not connected'}
          </p>
        </div>
      </div>
    </div>
  );
};

// ==================== INTEGRATION COMPONENTS ====================

export const IntegrationManagementComponent = () => {
  const [integrations, setIntegrations] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const fetchIntegrations = async () => {
    try {
      const response = await fetch('/api/integrations/stats');
      const data = await response.json();
      setIntegrations(data.data.integrationsList || []);
    } catch (error) {
      console.error('Failed to fetch integrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async (integrationName) => {
    try {
      const response = await fetch(
        `/api/integrations/${integrationName}/test`
      );
      const data = await response.json();
      alert(
        `Connection ${data.data.connected ? 'successful' : 'failed'}`
      );
    } catch (error) {
      alert('Connection test failed');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <PlugIcon className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-bold">Integration Management</h2>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
        >
          Add Integration
        </button>
      </div>

      {loading ? (
        <p className="text-center py-8">Loading integrations...</p>
      ) : integrations.length === 0 ? (
        <p className="text-center py-8 text-gray-500">
          No integrations configured
        </p>
      ) : (
        <div className="space-y-4">
          {integrations.map((integration) => (
            <div
              key={integration.name}
              className="border rounded-lg p-4 hover:shadow-md transition"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-lg">
                    {integration.name}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Last sync:{' '}
                    {integration.lastSync
                      ? new Date(
                          integration.lastSync
                        ).toLocaleString()
                      : 'Never'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      integration.status === 'active'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {integration.status}
                  </span>

                  {integration.errorCount > 0 && (
                    <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-semibold">
                      {integration.errorCount} errors
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => testConnection(integration.name)}
                  className="bg-blue-100 text-blue-700 px-3 py-1 rounded text-sm hover:bg-blue-200 transition"
                >
                  Test Connection
                </button>
                <button className="bg-gray-100 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-200 transition">
                  Configure
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ==================== I18N COMPONENTS ====================

export const LanguageSelectorComponent = ({
  onLanguageChange,
  currentLanguage = 'en'
}) => {
  const [languages, setLanguages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLanguages();
  }, []);

  const fetchLanguages = async () => {
    try {
      const response = await fetch('/api/i18n/languages');
      const data = await response.json();
      setLanguages(data.data.supported);
    } catch (error) {
      console.error('Failed to fetch languages:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Globe className="w-5 h-5 text-gray-600" />
      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : (
        <select
          value={currentLanguage}
          onChange={(e) => onLanguageChange(e.target.value)}
          className="border rounded px-3 py-2 text-sm font-medium"
        >
          {languages.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.flag} {lang.nativeName}
            </option>
          ))}
        </select>
      )}
    </div>
  );
};

export const LocaleFormatterComponent = () => {
  const [language, setLanguage] = useState('en');
  const [formatType, setFormatType] = useState('currency');
  const [value, setValue] = useState('1234.56');
  const [formatted, setFormatted] = useState('');
  const [textDirection, setTextDirection] = useState('ltr');

  const handleFormat = async () => {
    try {
      const response = await fetch('/api/i18n/format', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language,
          type: formatType,
          value
        })
      });

      const data = await response.json();
      setFormatted(data.data.formatted);

      // Get text direction
      const dirResponse = await fetch(
        `/api/i18n/text-direction/${language}`
      );
      const dirData = await dirResponse.json();
      setTextDirection(dirData.data.direction);
    } catch (error) {
      console.error('Formatting failed:', error);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center gap-2 mb-6">
        <Globe className="w-6 h-6 text-purple-600" />
        <h2 className="text-xl font-bold">Locale Formatter</h2>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Language
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
            >
              <option value="en">English</option>
              <option value="ar">العربية</option>
              <option value="es">Español</option>
              <option value="fr">Français</option>
              <option value="de">Deutsch</option>
              <option value="ja">日本語</option>
              <option value="zh">中文</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Format Type
            </label>
            <select
              value={formatType}
              onChange={(e) => setFormatType(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
            >
              <option value="currency">Currency</option>
              <option value="number">Number</option>
              <option value="date">Date</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Value
            </label>
            <input
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
              placeholder="Enter value"
            />
          </div>
        </div>

        <button
          onClick={handleFormat}
          className="w-full bg-purple-600 text-white py-2 rounded hover:bg-purple-700 transition"
        >
          Format
        </button>

        {formatted && (
          <div
            className="bg-gray-50 rounded p-4 border border-gray-200"
            dir={textDirection}
          >
            <p className="text-sm text-gray-600">Formatted Result:</p>
            <p className="text-2xl font-bold mt-2">{formatted}</p>
            <p className="text-xs text-gray-500 mt-2">
              Direction: {textDirection === 'rtl' ? 'Right-to-Left' : 'Left-to-Right'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// ==================== NOTIFICATIONS COMPONENT ====================

export const NotificationCenterComponent = () => {
  const [notifications, setNotifications] = useState([]);
  const [ws, setWs] = useState(null);

  useEffect(() => {
    const connectWebSocket = () => {
      try {
        const protocol =
          window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const socket = new WebSocket(
          `${protocol}//${window.location.host}/ws`
        );

        socket.onmessage = (event) => {
          const message = JSON.parse(event.data);
          if (message.type === 'notification') {
            setNotifications((prev) => [message.data, ...prev].slice(0, 10));
          }
        };

        setWs(socket);

        return () => {
          socket.close();
        };
      } catch (error) {
        console.error('WebSocket connection failed:', error);
      }
    };

    return connectWebSocket();
  }, []);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center gap-2 mb-6">
        <Zap className="w-6 h-6 text-yellow-600" />
        <h2 className="text-xl font-bold">Notifications</h2>
        {ws && ws.readyState === WebSocket.OPEN && (
          <span className="ml-auto text-xs text-green-600 font-semibold">
            Live
          </span>
        )}
      </div>

      {notifications.length === 0 ? (
        <p className="text-center py-8 text-gray-500">
          No notifications
        </p>
      ) : (
        <div className="space-y-3">
          {notifications.map((notif, idx) => (
            <div
              key={idx}
              className={`border-l-4 rounded p-3 ${
                notif.type === 'error'
                  ? 'border-red-500 bg-red-50'
                  : notif.type === 'success'
                  ? 'border-green-500 bg-green-50'
                  : 'border-blue-500 bg-blue-50'
              }`}
            >
              <p className="font-semibold text-sm">
                {notif.message}
              </p>
              {notif.timestamp && (
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(notif.timestamp).toLocaleTimeString()}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default {
  RealtimeStatusComponent,
  IntegrationManagementComponent,
  LanguageSelectorComponent,
  LocaleFormatterComponent,
  NotificationCenterComponent
};
