/**
 * MFA Setup Component
 * مكون إعداد المصادقة متعددة العوامل
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './MFASetup.css';

const MFASetup = () => {
  const [setupStage, setSetupStage] = useState('method-selection'); // method-selection, totp, email, sms, confirmation
  const [selectedMethods, setSelectedMethods] = useState([]);
  const [totpData, setTOTPData] = useState(null);
  const [totpToken, setTOTPToken] = useState('');
  const [emailOTP, setEmailOTP] = useState('');
  const [emailOTPCode, setEmailOTPCode] = useState('');
  const [smsOTP, setSMSOTP] = useState('');
  const [smsPhoneNumber, setSMSPhoneNumber] = useState('');
  const [smsCountryCode, setSMSCountryCode] = useState('+966'); // Default to Saudi Arabia
  const [smsOTPCode, setSMSOTPCode] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [copiedBackupCode, setCopiedBackupCode] = useState(null);

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
  const token = localStorage.getItem('authToken');

  /**
   * Initiate TOTP Setup
   */
  const handleInitiateTOTP = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/mfa/totp/initiate`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTOTPData(response.data.data);
      setSetupStage('totp');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to initiate TOTP setup');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Verify TOTP and Enable
   */
  const handleVerifyTOTP = async () => {
    if (!totpToken || totpToken.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/mfa/totp/verify`,
        {
          token: totpToken,
          secret: totpData.secret,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setBackupCodes(response.data.data.backupCodes);
      setSuccess('TOTP enabled successfully!');
      setShowBackupCodes(true);
      setSetupStage('confirmation');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to verify TOTP');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Initiate Email OTP
   */
  const handleInitiateEmailOTP = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/mfa/email/initiate`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setEmailOTP(response.data.data.recipient);
      setSuccess('OTP sent to your email');
      setSetupStage('email');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send email OTP');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Verify Email OTP
   */
  const handleVerifyEmailOTP = async () => {
    if (!emailOTPCode || emailOTPCode.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await axios.post(
        `${API_BASE_URL}/api/mfa/email/verify`,
        { code: emailOTPCode },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccess('Email OTP enabled successfully!');
      setSetupStage('confirmation');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to verify email OTP');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Initiate SMS OTP
   */
  const handleInitiateSMSOTP = async () => {
    if (!smsPhoneNumber) {
      setError('Please enter your phone number');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/mfa/sms/initiate`,
        {
          phoneNumber: smsPhoneNumber,
          countryCode: smsCountryCode,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSMSOTP(response.data.data.recipient);
      setSuccess('OTP sent to your phone');
      setSetupStage('sms');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send SMS OTP');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Verify SMS OTP
   */
  const handleVerifySMSOTP = async () => {
    if (!smsOTPCode || smsOTPCode.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await axios.post(
        `${API_BASE_URL}/api/mfa/sms/verify`,
        {
          code: smsOTPCode,
          phoneNumber: smsPhoneNumber,
          countryCode: smsCountryCode,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccess('SMS OTP enabled successfully!');
      setSetupStage('confirmation');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to verify SMS OTP');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Copy Backup Code to Clipboard
   */
  const copyBackupCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedBackupCode(code);
    setTimeout(() => setCopiedBackupCode(null), 2000);
  };

  // Render Method Selection
  const renderMethodSelection = () => (
    <div className="mfa-setup-container">
      <h2>Security: Multi-Factor Authentication</h2>
      <p>Add an extra layer of security to your account by enabling one or more authentication methods.</p>

      <div className="mfa-methods">
        {/* TOTP Method */}
        <div className="method-card">
          <div className="method-icon">🔐</div>
          <h3>Authenticator App</h3>
          <p>Use an app like Google Authenticator or Authy</p>
          <ul>
            <li>Works offline</li>
            <li>Most secure option</li>
            <li>Time-based codes</li>
          </ul>
          <button
            onClick={handleInitiateTOTP}
            disabled={loading}
            className="btn-primary"
          >
            Set Up Authenticator
          </button>
        </div>

        {/* Email OTP Method */}
        <div className="method-card">
          <div className="method-icon">📧</div>
          <h3>Email Verification</h3>
          <p>Receive verification codes via email</p>
          <ul>
            <li>No app required</li>
            <li>Easy to use</li>
            <li>Code expires in 5 minutes</li>
          </ul>
          <button
            onClick={handleInitiateEmailOTP}
            disabled={loading}
            className="btn-primary"
          >
            Set Up Email
          </button>
        </div>

        {/* SMS OTP Method */}
        <div className="method-card">
          <div className="method-icon">📱</div>
          <h3>SMS Verification</h3>
          <p>Receive verification codes via text message</p>
          <ul>
            <li>Works on any phone</li>
            <li>Fast delivery</li>
            <li>Code expires in 5 minutes</li>
          </ul>
          <button
            onClick={() => setSetupStage('sms-phone')}
            disabled={loading}
            className="btn-primary"
          >
            Set Up SMS
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}
    </div>
  );

  // Render TOTP Setup
  const renderTOTPSetup = () => (
    <div className="mfa-setup-container">
      <h2>Set Up Authenticator App</h2>

      {totpData && (
        <>
          <div className="totp-setup-steps">
            <h3>Step 1: Scan QR Code</h3>
            <p>Use your authenticator app to scan this QR code:</p>
            <div className="qr-code-container">
              <img src={totpData.qrCode} alt="QR Code" />
            </div>

            <p className="or-text">OR</p>

            <h3>Enter Manual Key</h3>
            <p>If you can't scan, enter this manual key:</p>
            <div className="manual-key">
              <code>{totpData.manualEntryKey}</code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(totpData.manualEntryKey);
                  setSuccess('Manual key copied!');
                }}
                className="btn-small"
              >
                Copy
              </button>
            </div>

            <h3>Step 2: Verify Code</h3>
            <p>Enter the 6-digit code from your authenticator app:</p>
            <input
              type="text"
              maxLength="6"
              placeholder="000000"
              value={totpToken}
              onChange={(e) => setTOTPToken(e.target.value.replace(/\D/g, ''))}
              className="code-input"
            />

            <button
              onClick={handleVerifyTOTP}
              disabled={loading || totpToken.length !== 6}
              className="btn-primary"
            >
              {loading ? 'Verifying...' : 'Verify & Enable'}
            </button>
          </div>
        </>
      )}

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <button
        onClick={() => setSetupStage('method-selection')}
        className="btn-secondary"
      >
        Back
      </button>
    </div>
  );

  // Render Email OTP Setup
  const renderEmailOTPSetup = () => (
    <div className="mfa-setup-container">
      <h2>Set Up Email Verification</h2>
      <p>We've sent a 6-digit code to your email at {emailOTP}</p>

      <div className="otp-input-group">
        <label>Enter the code:</label>
        <input
          type="text"
          maxLength="6"
          placeholder="000000"
          value={emailOTPCode}
          onChange={(e) => setEmailOTPCode(e.target.value.replace(/\D/g, ''))}
          className="code-input"
        />
        <p className="info-text">Code expires in 5 minutes</p>

        <button
          onClick={handleVerifyEmailOTP}
          disabled={loading || emailOTPCode.length !== 6}
          className="btn-primary"
        >
          {loading ? 'Verifying...' : 'Verify & Enable'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <button
        onClick={() => setSetupStage('method-selection')}
        className="btn-secondary"
      >
        Back
      </button>
    </div>
  );

  // Render SMS Setup - Phone Number
  const renderSMSPhoneSetup = () => (
    <div className="mfa-setup-container">
      <h2>Set Up SMS Verification</h2>

      <div className="phone-input-group">
        <label>Phone Number:</label>
        <div className="phone-input-wrapper">
          <select
            value={smsCountryCode}
            onChange={(e) => setSMSCountryCode(e.target.value)}
            className="country-code-select"
          >
            <option value="+966">🇸🇦 Saudi Arabia (+966)</option>
            <option value="+971">🇦🇪 UAE (+971)</option>
            <option value="+974">🇶🇦 Qatar (+974)</option>
            <option value="+968">🇴🇲 Oman (+968)</option>
            <option value="+965">🇰🇼 Kuwait (+965)</option>
            <option value="+973">🇧🇭 Bahrain (+973)</option>
            <option value="+1">🇺🇸 USA (+1)</option>
            <option value="+44">🇬🇧 UK (+44)</option>
          </select>
          <input
            type="tel"
            placeholder="5xxxxxxxx"
            value={smsPhoneNumber}
            onChange={(e) => setSMSPhoneNumber(e.target.value.replace(/\D/g, ''))}
            className="phone-input"
          />
        </div>

        <button
          onClick={handleInitiateSMSOTP}
          disabled={loading || !smsPhoneNumber}
          className="btn-primary"
        >
          {loading ? 'Sending...' : 'Send Code'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <button
        onClick={() => setSetupStage('method-selection')}
        className="btn-secondary"
      >
        Back
      </button>
    </div>
  );

  // Render SMS OTP Verification
  const renderSMSOTPVerification = () => (
    <div className="mfa-setup-container">
      <h2>Verify SMS Code</h2>
      <p>We've sent a 6-digit code to {smsCountryCode}{smsPhoneNumber}</p>

      <div className="otp-input-group">
        <label>Enter the code:</label>
        <input
          type="text"
          maxLength="6"
          placeholder="000000"
          value={smsOTPCode}
          onChange={(e) => setSMSOTPCode(e.target.value.replace(/\D/g, ''))}
          className="code-input"
        />
        <p className="info-text">Code expires in 5 minutes</p>

        <button
          onClick={handleVerifySMSOTP}
          disabled={loading || smsOTPCode.length !== 6}
          className="btn-primary"
        >
          {loading ? 'Verifying...' : 'Verify & Enable'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <button
        onClick={() => setSetupStage('sms-phone')}
        className="btn-secondary"
      >
        Back
      </button>
    </div>
  );

  // Render Confirmation - Backup Codes
  const renderConfirmation = () => (
    <div className="mfa-setup-container">
      <h2>✅ MFA Enabled Successfully!</h2>

      {showBackupCodes && (
        <div className="backup-codes-section">
          <h3>Save Your Backup Codes</h3>
          <p className="warning">
            ⚠️ Save these codes in a safe place. You can use them to regain access
            if you lose your authenticator device or phone number.
          </p>

          <div className="backup-codes-container">
            {backupCodes.map((code, index) => (
              <div key={index} className="backup-code">
                <code>{code}</code>
                <button
                  onClick={() => copyBackupCode(code)}
                  className={`copy-btn ${copiedBackupCode === code ? 'copied' : ''}`}
                >
                  {copiedBackupCode === code ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            ))}
          </div>

          <label className="backup-confirmation">
            <input type="checkbox" />
            <span>I've saved my backup codes in a safe place</span>
          </label>
        </div>
      )}

      <button
        onClick={() => window.location.href = '/settings'}
        className="btn-primary"
      >
        Go to Settings
      </button>
    </div>
  );

  // Render based on stage
  const renderContent = () => {
    switch (setupStage) {
      case 'method-selection':
        return renderMethodSelection();
      case 'totp':
        return renderTOTPSetup();
      case 'email':
        return renderEmailOTPSetup();
      case 'sms-phone':
        return renderSMSPhoneSetup();
      case 'sms':
        return renderSMSOTPVerification();
      case 'confirmation':
        return renderConfirmation();
      default:
        return renderMethodSelection();
    }
  };

  return <div className="mfa-setup-page">{renderContent()}</div>;
};

export default MFASetup;
