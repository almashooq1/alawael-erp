/**
 * MFA Settings Component
 * مكون إدارة إعدادات المصادقة متعددة العوامل
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './MFASettings.css';

const MFASettings = () => {
  const [mfaSettings, setMFASettings] = useState(null);
  const [trustedDevices, setTrustedDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [deviceName, setDeviceName] = useState('');
  const [trustingDevice, setTrustingDevice] = useState(false);

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
  const token = localStorage.getItem('authToken');

  useEffect(() => {
    fetchMFASettings();
    fetchTrustedDevices();
  }, []);

  /**
   * Fetch MFA Settings
   */
  const fetchMFASettings = async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/mfa/settings`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMFASettings(response.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load MFA settings');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetch Trusted Devices
   */
  const fetchTrustedDevices = async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/mfa/device/list`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTrustedDevices(response.data.data);
    } catch (err) {
      console.error('Failed to load trusted devices:', err);
    }
  };

  /**
   * Disable MFA Method
   */
  const handleDisableMFA = async (method) => {
    if (
      !window.confirm(
        `Are you sure you want to disable ${method}? You'll need another MFA method enabled.`
      )
    ) {
      return;
    }

    try {
      setLoading(true);
      await axios.post(
        `${API_BASE_URL}/api/mfa/settings/disable-method`,
        { method },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccess(`${method} MFA method disabled successfully`);
      await fetchMFASettings();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to disable MFA method');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Trust Current Device
   */
  const handleTrustDevice = async () => {
    if (!deviceName.trim()) {
      setError('Please enter a device name');
      return;
    }

    try {
      setTrustingDevice(true);
      const fingerprint = await generateDeviceFingerprint();
      
      await axios.post(
        `${API_BASE_URL}/api/mfa/device/trust`,
        {
          deviceName: deviceName.trim(),
          deviceFingerprint: fingerprint,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccess('Device marked as trusted. MFA will be skipped on this device.');
      setShowDeviceModal(false);
      setDeviceName('');
      await fetchTrustedDevices();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to trust device');
    } finally {
      setTrustingDevice(false);
    }
  };

  /**
   * Generate Device Fingerprint
   */
  const generateDeviceFingerprint = async () => {
    // Simple device fingerprint generation
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px "Arial"';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('Browser Fingerprint', 2, 15);
    
    const fingerprint =
      navigator.userAgent +
      navigator.language +
      new Date().getTimezoneOffset() +
      canvas.toDataURL();
    
    return require('crypto')
      .createHash('sha256')
      .update(fingerprint)
      .digest('hex');
  };

  /**
   * Revoke Device
   */
  const handleRevokeDevice = async (deviceId) => {
    if (!window.confirm('Are you sure you want to revoke trust for this device?')) {
      return;
    }

    try {
      await axios.delete(
        `${API_BASE_URL}/api/mfa/device/${deviceId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccess('Device trust revoked');
      await fetchTrustedDevices();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to revoke device');
    }
  };

  /**
   * Calculate Security Score
   */
  const calculateSecurityScore = () => {
    if (!mfaSettings) return 0;
    
    let score = 0;
    if (mfaSettings.totp?.enabled) score += 40;
    if (mfaSettings.emailOTP?.enabled) score += 30;
    if (mfaSettings.smsOTP?.enabled) score += 20;
    if (mfaSettings.backupCodes?.length > 0) score += 10;
    
    return Math.min(score, 100);
  };

  /**
   * Format Date
   */
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return <div className="loading">Loading MFA settings...</div>;
  }

  const securityScore = calculateSecurityScore();

  return (
    <div className="mfa-settings-container">
      <div className="settings-header">
        <h1>Security Settings</h1>
        <p>Manage your multi-factor authentication and trusted devices</p>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {/* Security Score */}
      <div className="security-score-card">
        <h2>Account Security Score</h2>
        <div className="score-display">
          <div className="score-circle">
            <span className="score-value">{securityScore}%</span>
          </div>
          <div className="score-details">
            <p className="score-description">
              {securityScore >= 80
                ? '✅ Excellent security'
                : securityScore >= 60
                ? '⚠️ Good security'
                : '❌ Needs improvement'}
            </p>
            <div className="score-bar">
              <div
                className="score-fill"
                style={{ width: `${securityScore}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* MFA Methods */}
      <div className="mfa-methods-section">
        <h2>Authentication Methods</h2>

        {/* TOTP Method */}
        <div className="method-card">
          <div className="method-header">
            <div className="method-icon">🔐</div>
            <div className="method-info">
              <h3>Authenticator App</h3>
              <p>Google Authenticator, Microsoft Authenticator, or Authy</p>
            </div>
            <div className="method-status">
              {mfaSettings?.totp?.enabled ? (
                <span className="status-badge enabled">✓ Enabled</span>
              ) : (
                <span className="status-badge disabled">Disabled</span>
              )}
            </div>
          </div>

          {mfaSettings?.totp?.enabled && (
            <>
              <div className="method-details">
                <p>
                  <strong>Verified:</strong>{' '}
                  {formatDate(mfaSettings.totp.verifiedAt)}
                </p>
                <p>
                  <strong>Backup Codes:</strong>{' '}
                  {mfaSettings.backupCodes?.filter((bc) => !bc.used).length || 0}{' '}
                  remaining
                </p>
              </div>
              <button
                onClick={() => handleDisableMFA('totp')}
                disabled={loading}
                className="btn-danger"
              >
                Disable
              </button>
            </>
          )}
        </div>

        {/* Email OTP Method */}
        <div className="method-card">
          <div className="method-header">
            <div className="method-icon">📧</div>
            <div className="method-info">
              <h3>Email Verification</h3>
              <p>Receive verification codes via email</p>
            </div>
            <div className="method-status">
              {mfaSettings?.emailOTP?.enabled ? (
                <span className="status-badge enabled">✓ Enabled</span>
              ) : (
                <span className="status-badge disabled">Disabled</span>
              )}
            </div>
          </div>

          {mfaSettings?.emailOTP?.enabled && (
            <>
              <div className="method-details">
                <p>
                  <strong>Verified:</strong>{' '}
                  {formatDate(mfaSettings.emailOTP.verifiedAt)}
                </p>
              </div>
              <button
                onClick={() => handleDisableMFA('email')}
                disabled={loading}
                className="btn-danger"
              >
                Disable
              </button>
            </>
          )}
        </div>

        {/* SMS OTP Method */}
        <div className="method-card">
          <div className="method-header">
            <div className="method-icon">📱</div>
            <div className="method-info">
              <h3>SMS Verification</h3>
              <p>Receive verification codes via text message</p>
            </div>
            <div className="method-status">
              {mfaSettings?.smsOTP?.enabled ? (
                <span className="status-badge enabled">✓ Enabled</span>
              ) : (
                <span className="status-badge disabled">Disabled</span>
              )}
            </div>
          </div>

          {mfaSettings?.smsOTP?.enabled && (
            <>
              <div className="method-details">
                <p>
                  <strong>Phone:</strong> {mfaSettings.smsOTP.phoneNumber}
                </p>
                <p>
                  <strong>Country:</strong> {mfaSettings.smsOTP.countryCode}
                </p>
                <p>
                  <strong>Verified:</strong>{' '}
                  {formatDate(mfaSettings.smsOTP.verifiedAt)}
                </p>
              </div>
              <button
                onClick={() => handleDisableMFA('sms')}
                disabled={loading}
                className="btn-danger"
              >
                Disable
              </button>
            </>
          )}
        </div>
      </div>

      {/* Trusted Devices */}
      <div className="trusted-devices-section">
        <div className="section-header">
          <h2>Trusted Devices</h2>
          <button
            onClick={() => setShowDeviceModal(true)}
            className="btn-primary"
          >
            + Trust This Device
          </button>
        </div>

        {trustedDevices.length === 0 ? (
          <p className="empty-state">No trusted devices yet</p>
        ) : (
          <div className="devices-list">
            {trustedDevices.map((device) => (
              <div key={device._id} className="device-card">
                <div className="device-info">
                  <h3>{device.deviceName}</h3>
                  <p>
                    <strong>Type:</strong> {device.deviceType || 'Unknown'}
                  </p>
                  <p>
                    <strong>Added:</strong> {formatDate(device.createdAt)}
                  </p>
                  <p>
                    <strong>Last Used:</strong>{' '}
                    {device.lastUsedAt ? formatDate(device.lastUsedAt) : 'Never'}
                  </p>
                  {device.ipAddress && (
                    <p>
                      <strong>IP Address:</strong> {device.ipAddress}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleRevokeDevice(device._id)}
                  disabled={loading}
                  className="btn-secondary"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Trust Device Modal */}
      {showDeviceModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Trust This Device</h2>
            <p>
              Trusted devices won't require MFA verification for {mfaSettings?.security?.rememberDeviceFor || 30} days.
            </p>

            <div className="form-group">
              <label>Device Name</label>
              <input
                type="text"
                placeholder="e.g., My Laptop"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                disabled={trustingDevice}
              />
            </div>

            <div className="modal-buttons">
              <button
                onClick={handleTrustDevice}
                disabled={trustingDevice || !deviceName.trim()}
                className="btn-primary"
              >
                {trustingDevice ? 'Trusting...' : 'Trust Device'}
              </button>
              <button
                onClick={() => {
                  setShowDeviceModal(false);
                  setDeviceName('');
                }}
                disabled={trustingDevice}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MFASettings;
