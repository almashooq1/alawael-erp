import React, { useState, useContext } from 'react';
import './LoginForm.css';
import { AuthContext } from '../../context/AuthContext';

/**
 * LoginForm Component
 * نموذج تسجيل الدخول
 * 
 * Features:
 * - Email/password authentication
 * - OAuth2 login options
 * - Token storage
 * - Error handling
 */
const LoginForm = ({ onSuccess, onError }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const { setAuth } = useContext(AuthContext);

  // Form validation
  const validateForm = () => {
    const newErrors = {};
    if (!email) newErrors.email = 'البريد الإلكتروني مطلوب';
    if (!password) newErrors.password = 'كلمة المرور مطلوبة';
    if (email && !email.includes('@')) newErrors.email = 'بريد إلكتروني غير صحيح';
    return newErrors;
  };

  // Handle standard login
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate
    const formErrors = validateForm();
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const response = await fetch('http://localhost:3002/api/sso/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          deviceId: `device_${Date.now()}`,
          userAgent: navigator.userAgent
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Login failed: ${response.status}`);
      }

      const data = await response.json();

      // Store tokens
      const tokens = {
        accessToken: data.data.accessToken,
        refreshToken: data.data.refreshToken,
        idToken: data.data.idToken,
        user: data.data.user,
        sessionId: data.data.sessionId,
        expiresIn: data.data.expiresIn
      };

      localStorage.setItem('sso_tokens', JSON.stringify(tokens));
      localStorage.setItem('user', JSON.stringify(data.data.user));

      // Update auth context
      setAuth({
        isAuthenticated: true,
        user: data.data.user,
        accessToken: tokens.accessToken,
        sessionId: tokens.sessionId
      });

      // Callback
      if (onSuccess) onSuccess(data.data.user);

    } catch (error) {
      console.error('Login error:', error);
      setErrors({ submit: error.message });
      if (onError) onError(error);
    } finally {
      setLoading(false);
    }
  };

  // Handle OAuth login
  const handleOAuthLogin = (provider) => {
    const redirectUri = `${window.location.origin}/auth/callback`;
    const clientId = process.env.REACT_APP_OAUTH_CLIENT_ID || 'sso-client';
    
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid profile email',
      state: Math.random().toString(36).substring(7)
    });

    window.location.href = `http://localhost:3002/api/sso/oauth2/authorize?${params.toString()}`;
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>تسجيل الدخول</h1>
          <p>نظام تسجيل الدخول الموحد</p>
        </div>

        {errors.submit && (
          <div className="alert alert-danger">
            <i className="icon-error"></i>
            {errors.submit}
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          {/* Email Field */}
          <div className="form-group">
            <label htmlFor="email">البريد الإلكتروني</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="أدخل بريدك الإلكتروني"
              disabled={loading}
              className={errors.email ? 'input-error' : ''}
            />
            {errors.email && <span className="error-message">{errors.email}</span>}
          </div>

          {/* Password Field */}
          <div className="form-group">
            <label htmlFor="password">كلمة المرور</label>
            <div className="password-input-wrapper">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="أدخل كلمة مرورك"
                disabled={loading}
                className={errors.password ? 'input-error' : ''}
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex="-1"
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
            {errors.password && <span className="error-message">{errors.password}</span>}
          </div>

          {/* Remember Me & Forgot Password */}
          <div className="form-actions">
            <label className="checkbox">
              <input type="checkbox" />
              تذكرني
            </label>
            <a href="/forgot-password" className="forgot-password-link">
              هل نسيت كلمة المرور؟
            </a>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="btn btn-primary btn-login"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                جاري التحقق...
              </>
            ) : (
              'دخول'
            )}
          </button>
        </form>

        {/* OAuth Options */}
        <div className="oauth-divider">
          <span>أو</span>
        </div>

        <div className="oauth-buttons">
          <button
            className="btn btn-oauth btn-google"
            onClick={() => handleOAuthLogin('google')}
            disabled={loading}
            type="button"
          >
            <img src="/icons/google.svg" alt="Google" />
            Google
          </button>
          <button
            className="btn btn-oauth btn-microsoft"
            onClick={() => handleOAuthLogin('microsoft')}
            disabled={loading}
            type="button"
          >
            <img src="/icons/microsoft.svg" alt="Microsoft" />
            Microsoft
          </button>
        </div>

        {/* Sign Up Link */}
        <div className="login-footer">
          <p>
            ليس لديك حساب؟{' '}
            <a href="/signup" className="signup-link">
              إنشاء حساب جديد
            </a>
          </p>
        </div>
      </div>

      {/* Background Elements */}
      <div className="login-background">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
      </div>
    </div>
  );
};

export default LoginForm;
