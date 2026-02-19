import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, Info, XCircle, X, Bell } from 'lucide-react';

/**
 * Alert Panel Component
 * Real-time alert display with priority handling
 */

interface Alert {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  dismissable: boolean;
  autoClose?: number;
}

interface AlertPanelProps {
  maxAlerts?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  onAlertDismiss?: (alertId: string) => void;
}

export const AlertPanel: React.FC<AlertPanelProps> = ({
  maxAlerts = 5,
  position = 'top-right',
  onAlertDismiss,
}) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  // Position styles
  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
  };

  // Add alert
  const addAlert = (alert: Omit<Alert, 'id' | 'timestamp'>) => {
    const newAlert: Alert = {
      ...alert,
      id: `alert_${Date.now()}_${Math.random()}`,
      timestamp: new Date(),
    };

    setAlerts(prev => {
      const updated = [newAlert, ...prev];
      return updated.slice(0, maxAlerts);
    });

    // Auto-close if specified
    if (alert.autoClose) {
      setTimeout(() => {
        dismissAlert(newAlert.id);
      }, alert.autoClose);
    }
  };

  // Dismiss alert
  const dismissAlert = (alertId: string) => {
    setAlerts(prev => prev.filter(a => a.id !== alertId));
    onAlertDismiss?.(alertId);
  };

  // Listen for custom events
  useEffect(() => {
    const handleAlert = (event: any) => {
      addAlert(event.detail);
    };

    window.addEventListener('show-alert', handleAlert);
    return () => window.removeEventListener('show-alert', handleAlert);
  }, []);

  // Get icon based on type
  const getIcon = (type: string) => {
    const iconClasses = 'w-5 h-5';

    switch (type) {
      case 'success':
        return <CheckCircle className={`${iconClasses} text-green-600`} />;
      case 'warning':
        return <AlertTriangle className={`${iconClasses} text-yellow-600`} />;
      case 'error':
        return <XCircle className={`${iconClasses} text-red-600`} />;
      default:
        return <Info className={`${iconClasses} text-blue-600`} />;
    }
  };

  // Get background color based on type
  const getBgColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  // Get priority badge color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-600 text-white';
      case 'high':
        return 'bg-orange-500 text-white';
      case 'medium':
        return 'bg-yellow-500 text-white';
      default:
        return 'bg-gray-400 text-white';
    }
  };

  // Format time
  const formatTime = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);

    if (seconds < 60) return `${seconds}s ago`;
    if (minutes < 60) return `${minutes}m ago`;
    return date.toLocaleTimeString();
  };

  if (alerts.length === 0) return null;

  return (
    <div className={`fixed ${positionClasses[position]} z-50 space-y-2 max-w-md w-full px-4`}>
      {alerts.map((alert, index) => (
        <div
          key={alert.id}
          className={`${getBgColor(alert.type)} border-2 rounded-lg shadow-lg p-4 transition-all duration-300 ease-in-out transform animate-slide-in`}
          style={{
            animation: `slideIn 0.3s ease-out ${index * 0.1}s both`,
          }}
        >
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className="flex-shrink-0 mt-0.5">{getIcon(alert.type)}</div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {/* Header */}
              <div className="flex items-center justify-between gap-2 mb-1">
                <h4 className="font-semibold text-gray-900 text-sm truncate">{alert.title}</h4>
                <span
                  className={`${getPriorityColor(alert.priority)} px-2 py-0.5 rounded-full text-xs font-medium`}
                >
                  {alert.priority}
                </span>
              </div>

              {/* Message */}
              <p className="text-sm text-gray-700 mb-2">{alert.message}</p>

              {/* Timestamp */}
              <p className="text-xs text-gray-500">{formatTime(alert.timestamp)}</p>
            </div>

            {/* Dismiss Button */}
            {alert.dismissable && (
              <button
                onClick={() => dismissAlert(alert.id)}
                className="flex-shrink-0 p-1 hover:bg-gray-200 rounded transition-colors"
                title="Dismiss"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
            )}
          </div>
        </div>
      ))}

      {/* Clear All Button */}
      {alerts.length > 1 && (
        <button
          onClick={() => setAlerts([])}
          className="w-full mt-2 px-3 py-2 bg-gray-800 text-white rounded text-sm font-medium hover:bg-gray-700 transition-colors"
        >
          Clear All ({alerts.length})
        </button>
      )}

      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
};

// Helper function to show alerts programmatically
export const showAlert = (
  type: Alert['type'],
  title: string,
  message: string,
  priority: Alert['priority'] = 'medium',
  autoClose?: number
) => {
  const event = new CustomEvent('show-alert', {
    detail: {
      type,
      title,
      message,
      priority,
      dismissable: true,
      autoClose,
    },
  });
  window.dispatchEvent(event);
};

export default AlertPanel;
