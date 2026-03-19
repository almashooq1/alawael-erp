/**
 * IntegrationSettings Component
 * مكون إعدادات التكامل الخارجي
 * 
 * إدارة تكاملات Slack و Email و Webhooks
 */

import React, { useState, useEffect } from 'react';
import './IntegrationSettings.css';

const IntegrationSettings = () => {
  const [activeTab, setActiveTab] = useState('slack');
  const [slackConfig, setSlackConfig] = useState({
    webhookUrl: '',
    channelId: '',
    botToken: '',
    isEnabled: false,
    testStatus: 'untested'
  });

  const [emailConfig, setEmailConfig] = useState({
    smtpServer: '',
    smtpPort: 587,
    senderEmail: '',
    senderPassword: '',
    isEnabled: false,
    testStatus: 'untested'
  });

  const [webhookConfig, setWebhookConfig] = useState({
    webhookUrl: '',
    secretKey: '',
    eventTypes: [],
    isActive: false,
    retryPolicy: 'exponential',
    testStatus: 'untested'
  });

  const [integrations, setIntegrations] = useState([]);
  const [eventLogs, setEventLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Fetch all integrations on component mount
  useEffect(() => {
    fetchIntegrations();
    fetchEventLogs();
  }, []);

  // Fetch integrations
  const fetchIntegrations = async () => {
    try {
      const response = await fetch('/api/integrations/list');
      const data = await response.json();
      setIntegrations(data.integrations || []);
    } catch (error) {
      console.error('Error fetching integrations:', error);
    }
  };

  // Fetch event logs
  const fetchEventLogs = async () => {
    try {
      const response = await fetch('/api/integrations/logs');
      const data = await response.json();
      setEventLogs(data.logs || []);
    } catch (error) {
      console.error('Error fetching logs:', error);
    }
  };

  // Test Slack Connection
  const testSlackConnection = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/integrations/slack/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(slackConfig)
      });
      
      const data = await response.json();
      if (data.success) {
        setSlackConfig(prev => ({ ...prev, testStatus: 'connected' }));
        setSuccessMessage('Slack connection successful! ✅');
      } else {
        setSlackConfig(prev => ({ ...prev, testStatus: 'failed' }));
        setErrorMessage('Slack connection failed! ❌');
      }
    } catch (error) {
      setErrorMessage('Error testing connection: ' + error.message);
      setSlackConfig(prev => ({ ...prev, testStatus: 'error' }));
    } finally {
      setLoading(false);
    }
  };

  // Save Slack Configuration
  const saveSlackConfig = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/integrations/slack/configure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(slackConfig)
      });
      
      const data = await response.json();
      if (data.success) {
        setSuccessMessage('Slack configuration saved successfully! ✅');
        fetchIntegrations();
      } else {
        setErrorMessage('Failed to save configuration!');
      }
    } catch (error) {
      setErrorMessage('Error saving configuration: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Test Email Connection
  const testEmailConnection = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/integrations/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailConfig)
      });
      
      const data = await response.json();
      if (data.success) {
        setEmailConfig(prev => ({ ...prev, testStatus: 'connected' }));
        setSuccessMessage('Email connection successful! ✅');
      } else {
        setEmailConfig(prev => ({ ...prev, testStatus: 'failed' }));
        setErrorMessage('Email connection failed! ❌');
      }
    } catch (error) {
      setErrorMessage('Error testing connection: ' + error.message);
      setEmailConfig(prev => ({ ...prev, testStatus: 'error' }));
    } finally {
      setLoading(false);
    }
  };

  // Save Email Configuration
  const saveEmailConfig = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/integrations/email/configure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailConfig)
      });
      
      const data = await response.json();
      if (data.success) {
        setSuccessMessage('Email configuration saved successfully! ✅');
        fetchIntegrations();
      } else {
        setErrorMessage('Failed to save configuration!');
      }
    } catch (error) {
      setErrorMessage('Error saving configuration: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Register Webhook
  const registerWebhook = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/integrations/webhook/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookConfig)
      });
      
      const data = await response.json();
      if (data.success) {
        setSuccessMessage('Webhook registered successfully! ✅');
        setWebhookConfig(prev => ({ ...prev, testStatus: 'registered' }));
        fetchIntegrations();
      } else {
        setErrorMessage('Failed to register webhook!');
      }
    } catch (error) {
      setErrorMessage('Error registering webhook: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Test Webhook
  const testWebhook = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/integrations/webhook/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl: webhookConfig.webhookUrl })
      });
      
      const data = await response.json();
      if (data.success) {
        setWebhookConfig(prev => ({ ...prev, testStatus: 'working' }));
        setSuccessMessage('Webhook is working! ✅');
      } else {
        setWebhookConfig(prev => ({ ...prev, testStatus: 'failed' }));
        setErrorMessage('Webhook test failed!');
      }
    } catch (error) {
      setErrorMessage('Error testing webhook: ' + error.message);
      setWebhookConfig(prev => ({ ...prev, testStatus: 'error' }));
    } finally {
      setLoading(false);
    }
  };

  // Disable integration
  const disableIntegration = async (integrationId) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/integrations/${integrationId}/disable`, {
        method: 'POST'
      });
      
      if (response.ok) {
        setSuccessMessage('Integration disabled! ✅');
        fetchIntegrations();
      } else {
        setErrorMessage('Failed to disable integration!');
      }
    } catch (error) {
      setErrorMessage('Error disabling integration: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Clear event logs
  const clearLogs = async () => {
    if (window.confirm('Are you sure you want to clear all logs?')) {
      try {
        const response = await fetch('/api/integrations/logs/clear', {
          method: 'POST'
        });
        
        if (response.ok) {
          setEventLogs([]);
          setSuccessMessage('Logs cleared! ✅');
        }
      } catch (error) {
        setErrorMessage('Error clearing logs: ' + error.message);
      }
    }
  };

  // Export logs
  const exportLogs = async () => {
    try {
      const response = await fetch('/api/integrations/logs/export');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'integration-logs.csv';
      a.click();
      setSuccessMessage('Logs exported! ✅');
    } catch (error) {
      setErrorMessage('Error exporting logs: ' + error.message);
    }
  };

  // Get status badge
  const getStatusBadge = (status) => {
    const statusMap = {
      'connected': '🟢 Connected',
      'failed': '🔴 Failed',
      'untested': '⚪ Untested',
      'error': '🟠 Error',
      'registered': '🟢 Registered',
      'working': '🟢 Working'
    };
    return statusMap[status] || status;
  };

  return (
    <div className="integration-settings">
      <h1>🔗 Integration Settings</h1>
      
      {successMessage && (
        <div className="alert alert-success">
          {successMessage}
          <button onClick={() => setSuccessMessage('')}>✕</button>
        </div>
      )}
      
      {errorMessage && (
        <div className="alert alert-error">
          {errorMessage}
          <button onClick={() => setErrorMessage('')}>✕</button>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'slack' ? 'active' : ''}`}
          onClick={() => setActiveTab('slack')}
        >
          💬 Slack
        </button>
        <button
          className={`tab ${activeTab === 'email' ? 'active' : ''}`}
          onClick={() => setActiveTab('email')}
        >
          📧 Email
        </button>
        <button
          className={`tab ${activeTab === 'webhook' ? 'active' : ''}`}
          onClick={() => setActiveTab('webhook')}
        >
          🪝 Webhooks
        </button>
        <button
          className={`tab ${activeTab === 'status' ? 'active' : ''}`}
          onClick={() => setActiveTab('status')}
        >
          📊 Status
        </button>
        <button
          className={`tab ${activeTab === 'logs' ? 'active' : ''}`}
          onClick={() => setActiveTab('logs')}
        >
          📋 Logs
        </button>
      </div>

      {/* Slack Configuration */}
      {activeTab === 'slack' && (
        <div className="tab-content">
          <div className="config-panel">
            <h2>Slack Integration</h2>
            <p className="status-indicator">
              Status: {getStatusBadge(slackConfig.testStatus)}
            </p>

            <div className="form-group">
              <label>Webhook URL:</label>
              <input
                type="text"
                placeholder="https://hooks.slack.com/services/..."
                value={slackConfig.webhookUrl}
                onChange={(e) =>
                  setSlackConfig(prev => ({ ...prev, webhookUrl: e.target.value }))
                }
              />
            </div>

            <div className="form-group">
              <label>Bot Token:</label>
              <input
                type="password"
                placeholder="xoxb-..."
                value={slackConfig.botToken}
                onChange={(e) =>
                  setSlackConfig(prev => ({ ...prev, botToken: e.target.value }))
                }
              />
            </div>

            <div className="form-group">
              <label>Channel ID:</label>
              <input
                type="text"
                placeholder="C123ABC"
                value={slackConfig.channelId}
                onChange={(e) =>
                  setSlackConfig(prev => ({ ...prev, channelId: e.target.value }))
                }
              />
            </div>

            <div className="form-group checkbox">
              <input
                type="checkbox"
                id="slack-enabled"
                checked={slackConfig.isEnabled}
                onChange={(e) =>
                  setSlackConfig(prev => ({ ...prev, isEnabled: e.target.checked }))
                }
              />
              <label htmlFor="slack-enabled">Enable Slack Integration</label>
            </div>

            <div className="button-group">
              <button
                onClick={testSlackConnection}
                className="btn btn-secondary"
                disabled={loading}
              >
                🧪 Test Connection
              </button>
              <button
                onClick={saveSlackConfig}
                className="btn btn-primary"
                disabled={loading}
              >
                💾 Save Configuration
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Configuration */}
      {activeTab === 'email' && (
        <div className="tab-content">
          <div className="config-panel">
            <h2>Email Integration</h2>
            <p className="status-indicator">
              Status: {getStatusBadge(emailConfig.testStatus)}
            </p>

            <div className="form-group">
              <label>SMTP Server:</label>
              <input
                type="text"
                placeholder="smtp.gmail.com"
                value={emailConfig.smtpServer}
                onChange={(e) =>
                  setEmailConfig(prev => ({ ...prev, smtpServer: e.target.value }))
                }
              />
            </div>

            <div className="form-group">
              <label>SMTP Port:</label>
              <input
                type="number"
                placeholder="587"
                value={emailConfig.smtpPort}
                onChange={(e) =>
                  setEmailConfig(prev => ({ ...prev, smtpPort: parseInt(e.target.value) }))
                }
              />
            </div>

            <div className="form-group">
              <label>Sender Email:</label>
              <input
                type="email"
                placeholder="noreply@example.com"
                value={emailConfig.senderEmail}
                onChange={(e) =>
                  setEmailConfig(prev => ({ ...prev, senderEmail: e.target.value }))
                }
              />
            </div>

            <div className="form-group">
              <label>Password / App Token:</label>
              <input
                type="password"
                placeholder="••••••••"
                value={emailConfig.senderPassword}
                onChange={(e) =>
                  setEmailConfig(prev => ({ ...prev, senderPassword: e.target.value }))
                }
              />
            </div>

            <div className="form-group checkbox">
              <input
                type="checkbox"
                id="email-enabled"
                checked={emailConfig.isEnabled}
                onChange={(e) =>
                  setEmailConfig(prev => ({ ...prev, isEnabled: e.target.checked }))
                }
              />
              <label htmlFor="email-enabled">Enable Email Integration</label>
            </div>

            <div className="button-group">
              <button
                onClick={testEmailConnection}
                className="btn btn-secondary"
                disabled={loading}
              >
                🧪 Test Connection
              </button>
              <button
                onClick={saveEmailConfig}
                className="btn btn-primary"
                disabled={loading}
              >
                💾 Save Configuration
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Webhook Configuration */}
      {activeTab === 'webhook' && (
        <div className="tab-content">
          <div className="config-panel">
            <h2>Webhook Management</h2>
            <p className="status-indicator">
              Status: {getStatusBadge(webhookConfig.testStatus)}
            </p>

            <div className="form-group">
              <label>Webhook URL:</label>
              <input
                type="url"
                placeholder="https://your-server.com/webhook"
                value={webhookConfig.webhookUrl}
                onChange={(e) =>
                  setWebhookConfig(prev => ({ ...prev, webhookUrl: e.target.value }))
                }
              />
            </div>

            <div className="form-group">
              <label>Secret Key:</label>
              <input
                type="password"
                placeholder="secret-key-for-verification"
                value={webhookConfig.secretKey}
                onChange={(e) =>
                  setWebhookConfig(prev => ({ ...prev, secretKey: e.target.value }))
                }
              />
            </div>

            <div className="form-group">
              <label>Retry Policy:</label>
              <select
                value={webhookConfig.retryPolicy}
                onChange={(e) =>
                  setWebhookConfig(prev => ({ ...prev, retryPolicy: e.target.value }))
                }
              >
                <option value="exponential">Exponential Backoff</option>
                <option value="linear">Linear Backoff</option>
                <option value="fixed">Fixed Interval</option>
              </select>
            </div>

            <div className="form-group">
              <label>Event Types:</label>
              <div className="event-types">
                {['user.created', 'user.updated', 'report.generated', 'project.completed'].map(event => (
                  <label key={event} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={webhookConfig.eventTypes.includes(event)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setWebhookConfig(prev => ({
                            ...prev,
                            eventTypes: [...prev.eventTypes, event]
                          }));
                        } else {
                          setWebhookConfig(prev => ({
                            ...prev,
                            eventTypes: prev.eventTypes.filter(t => t !== event)
                          }));
                        }
                      }}
                    />
                    {event}
                  </label>
                ))}
              </div>
            </div>

            <div className="button-group">
              <button
                onClick={testWebhook}
                className="btn btn-secondary"
                disabled={loading}
              >
                🧪 Test Webhook
              </button>
              <button
                onClick={registerWebhook}
                className="btn btn-primary"
                disabled={loading}
              >
                📝 Register Webhook
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Tab */}
      {activeTab === 'status' && (
        <div className="tab-content">
          <div className="status-panel">
            <h2>Integration Status</h2>
            <div className="integrations-list">
              {integrations.length > 0 ? (
                integrations.map(integration => (
                  <div key={integration.id} className="integration-card">
                    <div className="integration-header">
                      <h3>{integration.name}</h3>
                      <span className={`status ${integration.status}`}>
                        {integration.status === 'active' ? '🟢' : '🔴'} {integration.status}
                      </span>
                    </div>
                    <p>Type: {integration.type}</p>
                    <p>Last checked: {new Date(integration.lastChecked).toLocaleString()}</p>
                    <p>Health: {integration.health}%</p>
                    {integration.lastError && (
                      <p className="error">Error: {integration.lastError}</p>
                    )}
                    <button
                      onClick={() => disableIntegration(integration.id)}
                      className="btn btn-danger btn-sm"
                    >
                      Disable
                    </button>
                  </div>
                ))
              ) : (
                <p className="empty-state">No integrations configured yet.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Logs Tab */}
      {activeTab === 'logs' && (
        <div className="tab-content">
          <div className="logs-panel">
            <h2>Event Logs</h2>
            <div className="logs-controls">
              <button onClick={exportLogs} className="btn btn-secondary">
                📥 Export Logs
              </button>
              <button onClick={clearLogs} className="btn btn-danger">
                🗑️ Clear Logs
              </button>
            </div>

            <div className="logs-table">
              {eventLogs.length > 0 ? (
                <table>
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Event Type</th>
                      <th>Integration</th>
                      <th>Status</th>
                      <th>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eventLogs.map((log, index) => (
                      <tr key={index}>
                        <td>{new Date(log.timestamp).toLocaleString()}</td>
                        <td>{log.eventType}</td>
                        <td>{log.integration}</td>
                        <td>
                          <span className={`badge ${log.status}`}>
                            {log.status}
                          </span>
                        </td>
                        <td>{log.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="empty-state">No events logged yet.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IntegrationSettings;
