/**
 * SettingsPanel.js - User Settings and Preferences Component
 * Manage user preferences, notifications, and system settings
 */

import React, { useState, useEffect } from 'react';
import './SettingsPanel.css';

const SettingsPanel = ({ userId, userRole = 'user' }) => {
  const [settings, setSettings] = useState({
    profile: {
      email: '',
      phone: '',
      language: 'en',
      timezone: 'UTC'
    },
    notifications: {
      emailAcademicAlerts: true,
      emailAttendanceAlerts: true,
      emailFinancialAlerts: true,
      emailAchievements: true,
      smsAlerts: false,
      pushNotifications: true
    },
    privacy: {
      profileVisibility: 'private',
      showAchievements: true,
      allowMessages: true,
      dataCollection: false
    },
    theme: {
      darkMode: false,
      compactView: false,
      fontSize: 'normal'
    }
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [activeTab, setActiveTab] = useState('profile');
  const [unsavedChanges, setUnsavedChanges] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, [userId]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/settings?userId=${userId}`);

      if (!response.ok) throw new Error('Failed to fetch settings');

      const data = await response.json();
      setSettings(data.data.settings || settings);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      const response = await fetch(`/api/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          settings
        })
      });

      if (!response.ok) throw new Error('Failed to save settings');

      setUnsavedChanges(false);
      setSuccess('Settings saved successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSettingChange = (category, field, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value
      }
    }));
    setUnsavedChanges(true);
  };

  if (loading) return <div className="loading">Loading settings...</div>;

  return (
    <div className="settings-panel">
      <div className="settings-header">
        <h2>Settings & Preferences</h2>
        {unsavedChanges && (
          <button
            className="btn-save"
            onClick={handleSaveSettings}
          >
            💾 Save Changes
          </button>
        )}
      </div>

      {error && <div className="error-banner">{error}</div>}
      {success && <div className="success-banner">{success}</div>}

      {/* Tabs Navigation */}
      <div className="settings-tabs">
        <button
          className={`tab ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          👤 Profile
        </button>
        <button
          className={`tab ${activeTab === 'notifications' ? 'active' : ''}`}
          onClick={() => setActiveTab('notifications')}
        >
          🔔 Notifications
        </button>
        <button
          className={`tab ${activeTab === 'privacy' ? 'active' : ''}`}
          onClick={() => setActiveTab('privacy')}
        >
          🔒 Privacy
        </button>
        <button
          className={`tab ${activeTab === 'theme' ? 'active' : ''}`}
          onClick={() => setActiveTab('theme')}
        >
          🎨 Theme
        </button>
      </div>

      {/* Tab Content */}
      <div className="settings-content">
        {/* Profile Settings */}
        {activeTab === 'profile' && (
          <div className="settings-section">
            <h3>Profile Settings</h3>

            <div className="settings-group">
              <label>Email Address</label>
              <input
                type="email"
                value={settings.profile.email}
                onChange={(e) => handleSettingChange('profile', 'email', e.target.value)}
              />
              <p className="help-text">Used for account recovery and notifications</p>
            </div>

            <div className="settings-group">
              <label>Phone Number</label>
              <input
                type="tel"
                value={settings.profile.phone}
                onChange={(e) => handleSettingChange('profile', 'phone', e.target.value)}
              />
              <p className="help-text">Optional - used for SMS notifications</p>
            </div>

            <div className="settings-group">
              <label>Language</label>
              <select
                value={settings.profile.language}
                onChange={(e) => handleSettingChange('profile', 'language', e.target.value)}
              >
                <option value="en">English</option>
                <option value="ar">العربية</option>
                <option value="fr">Français</option>
                <option value="es">Español</option>
              </select>
            </div>

            <div className="settings-group">
              <label>Timezone</label>
              <select
                value={settings.profile.timezone}
                onChange={(e) => handleSettingChange('profile', 'timezone', e.target.value)}
              >
                <option value="UTC">UTC</option>
                <option value="EST">Eastern Standard Time</option>
                <option value="CST">Central Standard Time</option>
                <option value="PST">Pacific Standard Time</option>
                <option value="GST">Gulf Standard Time</option>
              </select>
            </div>
          </div>
        )}

        {/* Notification Settings */}
        {activeTab === 'notifications' && (
          <div className="settings-section">
            <h3>Notification Preferences</h3>

            <div className="settings-group">
              <h4 className="group-title">Email Notifications</h4>

              <label className="checkbox-item">
                <input
                  type="checkbox"
                  checked={settings.notifications.emailAcademicAlerts}
                  onChange={(e) => handleSettingChange('notifications', 'emailAcademicAlerts', e.target.checked)}
                />
                <span>Academic Alerts (GPA, Grades)</span>
              </label>

              <label className="checkbox-item">
                <input
                  type="checkbox"
                  checked={settings.notifications.emailAttendanceAlerts}
                  onChange={(e) => handleSettingChange('notifications', 'emailAttendanceAlerts', e.target.checked)}
                />
                <span>Attendance Alerts</span>
              </label>

              <label className="checkbox-item">
                <input
                  type="checkbox"
                  checked={settings.notifications.emailFinancialAlerts}
                  onChange={(e) => handleSettingChange('notifications', 'emailFinancialAlerts', e.target.checked)}
                />
                <span>Financial Alerts (Scholarships, Payments)</span>
              </label>

              <label className="checkbox-item">
                <input
                  type="checkbox"
                  checked={settings.notifications.emailAchievements}
                  onChange={(e) => handleSettingChange('notifications', 'emailAchievements', e.target.checked)}
                />
                <span>Achievements & Milestones</span>
              </label>
            </div>

            <div className="settings-group">
              <h4 className="group-title">Other Notifications</h4>

              <label className="checkbox-item">
                <input
                  type="checkbox"
                  checked={settings.notifications.smsAlerts}
                  onChange={(e) => handleSettingChange('notifications', 'smsAlerts', e.target.checked)}
                />
                <span>SMS Alerts (Critical Only)</span>
              </label>

              <label className="checkbox-item">
                <input
                  type="checkbox"
                  checked={settings.notifications.pushNotifications}
                  onChange={(e) => handleSettingChange('notifications', 'pushNotifications', e.target.checked)}
                />
                <span>Push Notifications</span>
              </label>
            </div>
          </div>
        )}

        {/* Privacy Settings */}
        {activeTab === 'privacy' && (
          <div className="settings-section">
            <h3>Privacy & Sharing</h3>

            <div className="settings-group">
              <label>Profile Visibility</label>
              <select
                value={settings.privacy.profileVisibility}
                onChange={(e) => handleSettingChange('privacy', 'profileVisibility', e.target.value)}
              >
                <option value="public">Public</option>
                <option value="private">Private</option>
                <option value="advisors">Visible to Advisors Only</option>
              </select>
              <p className="help-text">Control who can view your profile</p>
            </div>

            <div className="settings-group">
              <label className="checkbox-item">
                <input
                  type="checkbox"
                  checked={settings.privacy.showAchievements}
                  onChange={(e) => handleSettingChange('privacy', 'showAchievements', e.target.checked)}
                />
                <span>Display my achievements publicly</span>
              </label>
            </div>

            <div className="settings-group">
              <label className="checkbox-item">
                <input
                  type="checkbox"
                  checked={settings.privacy.allowMessages}
                  onChange={(e) => handleSettingChange('privacy', 'allowMessages', e.target.checked)}
                />
                <span>Allow other users to message me</span>
              </label>
            </div>

            <div className="settings-group">
              <label className="checkbox-item">
                <input
                  type="checkbox"
                  checked={settings.privacy.dataCollection}
                  onChange={(e) => handleSettingChange('privacy', 'dataCollection', e.target.checked)}
                />
                <span>Allow analytics data collection for system improvement</span>
              </label>
            </div>

            <div className="danger-zone">
              <h4>Danger Zone</h4>
              <button className="btn-danger">🗑️ Delete My Account</button>
            </div>
          </div>
        )}

        {/* Theme Settings */}
        {activeTab === 'theme' && (
          <div className="settings-section">
            <h3>Theme & Display</h3>

            <div className="settings-group">
              <label className="checkbox-item">
                <input
                  type="checkbox"
                  checked={settings.theme.darkMode}
                  onChange={(e) => handleSettingChange('theme', 'darkMode', e.target.checked)}
                />
                <span>Dark Mode</span>
              </label>
              <p className="help-text">Enable dark theme for easier viewing</p>
            </div>

            <div className="settings-group">
              <label className="checkbox-item">
                <input
                  type="checkbox"
                  checked={settings.theme.compactView}
                  onChange={(e) => handleSettingChange('theme', 'compactView', e.target.checked)}
                />
                <span>Compact View</span>
              </label>
              <p className="help-text">Show more information with smaller spacing</p>
            </div>

            <div className="settings-group">
              <label>Font Size</label>
              <div className="font-size-selector">
                {['small', 'normal', 'large'].map(size => (
                  <button
                    key={size}
                    className={`size-btn ${settings.theme.fontSize === size ? 'active' : ''}`}
                    onClick={() => handleSettingChange('theme', 'fontSize', size)}
                    style={{ fontSize: size === 'small' ? '12px' : size === 'large' ? '16px' : '14px' }}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      {unsavedChanges && (
        <div className="settings-footer">
          <p>⚠️ You have unsaved changes</p>
          <button
            className="btn-save-footer"
            onClick={handleSaveSettings}
          >
            Save All Changes
          </button>
        </div>
      )}
    </div>
  );
};

export default SettingsPanel;
