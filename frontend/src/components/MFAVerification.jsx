/**
 * MFA Verification Component
 * مكون التحقق من المصادقة متعددة العوامل
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './MFAVerification.css';

const MFAVerification = ({ sessionId, onVerificationSuccess, onCancel }) => {
  const [verificationMethod, setVerificationMethod] = useState('totp'); // totp, email, sms, backup
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const [attemptsLeft, setAttemptsLeft] = useState(5);

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

  useEffect(() => {
    // Countdown timer
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleSessionExpired();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  /**
   * Handle Verification
   */
  const handleVerification = async (e) => {
    e.preventDefault();

    if (!verificationCode) {
      setError('Please enter a verification code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/mfa/login/verify`,
        {
          sessionId,
          token: verificationCode,
          method: verificationMethod,
        }
      );

      if (response.data.success) {
        onVerificationSuccess({
          sessionId,
          verified: true,
          userId: response.data.data.userId,
        });
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Verification failed';
      setError(errorMsg);
      
      // Update attempts left
      const remaining = err.response?.data?.attemptsRemaining;
      if (remaining !== undefined) {
        setAttemptsLeft(remaining);
      }

      if (remaining === 0) {
        setError('Maximum verification attempts exceeded. Please try login again.');
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle Session Expired
   */
  const handleSessionExpired = () => {
    setError('Verification session has expired. Please login again.');
    setTimeout(() => {
      onCancel();
    }, 3000);
  };

  /**
   * Format Time
   */
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="mfa-verification-container">
      <div className="verification-card">
        <h2>Two-Factor Authentication</h2>
        <p className="subtitle">Verify your identity to continue</p>

        {/* Method Selection */}
        <div className="method-tabs">
          <button
            className={`tab ${verificationMethod === 'totp' ? 'active' : ''}`}
            onClick={() => {
              setVerificationMethod('totp');
              setVerificationCode('');
              setError('');
            }}
          >
            🔐 Authenticator
          </button>
          <button
            className={`tab ${verificationMethod === 'email' ? 'active' : ''}`}
            onClick={() => {
              setVerificationMethod('email');
              setVerificationCode('');
              setError('');
            }}
          >
            📧 Email
          </button>
          <button
            className={`tab ${verificationMethod === 'sms' ? 'active' : ''}`}
            onClick={() => {
              setVerificationMethod('sms');
              setVerificationCode('');
              setError('');
            }}
          >
            📱 SMS
          </button>
          <button
            className={`tab ${verificationMethod === 'backup' ? 'active' : ''}`}
            onClick={() => {
              setVerificationMethod('backup');
              setVerificationCode('');
              setError('');
            }}
          >
            🔑 Backup Code
          </button>
        </div>

        {/* Verification Form */}
        <form onSubmit={handleVerification} className="verification-form">
          <div className="input-group">
            {verificationMethod === 'totp' && (
              <>
                <label>Enter 6-digit code from your authenticator app:</label>
                <input
                  type="text"
                  maxLength="6"
                  placeholder="000000"
                  value={verificationCode}
                  onChange={(e) =>
                    setVerificationCode(e.target.value.replace(/\D/g, ''))
                  }
                  disabled={loading}
                  autoFocus
                  className="verification-input"
                />
              </>
            )}

            {verificationMethod === 'email' && (
              <>
                <label>Enter 6-digit code sent to your email:</label>
                <input
                  type="text"
                  maxLength="6"
                  placeholder="000000"
                  value={verificationCode}
                  onChange={(e) =>
                    setVerificationCode(e.target.value.replace(/\D/g, ''))
                  }
                  disabled={loading}
                  autoFocus
                  className="verification-input"
                />
              </>
            )}

            {verificationMethod === 'sms' && (
              <>
                <label>Enter 6-digit code sent to your phone:</label>
                <input
                  type="text"
                  maxLength="6"
                  placeholder="000000"
                  value={verificationCode}
                  onChange={(e) =>
                    setVerificationCode(e.target.value.replace(/\D/g, ''))
                  }
                  disabled={loading}
                  autoFocus
                  className="verification-input"
                />
              </>
            )}

            {verificationMethod === 'backup' && (
              <>
                <label>Enter one of your backup codes:</label>
                <input
                  type="text"
                  placeholder="XXXX-XXXX"
                  value={verificationCode}
                  onChange={(e) =>
                    setVerificationCode(e.target.value.toUpperCase())
                  }
                  disabled={loading}
                  autoFocus
                  className="verification-input"
                />
                <p className="info-text">
                  Each backup code can only be used once.
                </p>
              </>
            )}
          </div>

          {error && <div className="error-message">{error}</div>}

          {/* Status Info */}
          <div className="status-info">
            <span className="time-left">
              ⏱️ {formatTime(timeLeft)}
            </span>
            <span className="attempts-left">
              {attemptsLeft} attempt{attemptsLeft !== 1 ? 's' : ''} left
            </span>
          </div>

          {/* Action Buttons */}
          <div className="button-group">
            <button
              type="submit"
              disabled={loading || !verificationCode || timeLeft === 0}
              className="btn-primary"
            >
              {loading ? 'Verifying...' : 'Verify'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="btn-secondary"
            >
              Cancel
            </button>
          </div>
        </form>

        {/* Help Text */}
        <div className="help-section">
          <p className="help-title">Don't have access to your authentication device?</p>
          <ul>
            <li>Use one of your backup codes (if you have them)</li>
            <li>Contact support for account recovery</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default MFAVerification;
