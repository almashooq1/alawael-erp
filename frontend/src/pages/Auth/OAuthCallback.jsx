import React, { useEffect, useContext } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AuthContext from '../../context/AuthContext';

/**
 * OAuthCallback Component
 * صفحة رد الاتصال OAuth
 */
const OAuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setAuth } = useContext(AuthContext);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');

        if (error) {
          console.error('OAuth error:', error);
          navigate('/login?error=' + error);
          return;
        }

        if (!code) {
          console.error('No authorization code received');
          navigate('/login?error=no_code');
          return;
        }

        // Exchange code for token
        const response = await fetch('http://localhost:3002/api/sso/oauth2/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            grant_type: 'authorization_code',
            code,
            client_id: process.env.REACT_APP_OAUTH_CLIENT_ID || 'sso-client',
            redirect_uri: `${window.location.origin}/auth/callback`
          })
        });

        if (!response.ok) {
          throw new Error('Token exchange failed');
        }

        const data = await response.json();

        // Store tokens
        const tokens = {
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          idToken: data.id_token,
          expiresIn: data.expires_in
        };

        localStorage.setItem('sso_tokens', JSON.stringify(tokens));

        // Get user info
        const userResponse = await fetch('http://localhost:3002/api/sso/oauth2/userinfo', {
          headers: {
            'Authorization': `Bearer ${tokens.accessToken}`
          }
        });

        if (userResponse.ok) {
          const user = await userResponse.json();
          tokens.user = user;
          localStorage.setItem('user', JSON.stringify(user));

          setAuth({
            isAuthenticated: true,
            user,
            accessToken: tokens.accessToken,
            sessionId: data.session_id,
            expiresAt: Date.now() + tokens.expiresIn
          });
        }

        navigate('/dashboard');
      } catch (error) {
        console.error('OAuth callback error:', error);
        navigate('/login?error=callback_failed');
      }
    };

    handleCallback();
  }, [searchParams, navigate, setAuth]);

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      backgroundColor: '#f7fafc',
      fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif'
    }}>
      <div style={{
        textAlign: 'center',
        backgroundColor: 'white',
        padding: '40px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <h2>Processing Login...</h2>
        <p>Please wait while we authenticate you.</p>
        <div style={{
          marginTop: '20px',
          display: 'flex',
          justifyContent: 'center',
          gap: '4px'
        }}>
          <div style={{
            width: '8px',
            height: '8px',
            backgroundColor: '#667eea',
            borderRadius: '50%',
            animation: 'pulse 1.4s ease-in-out infinite'
          }}></div>
          <div style={{
            width: '8px',
            height: '8px',
            backgroundColor: '#667eea',
            borderRadius: '50%',
            animation: 'pulse 1.4s ease-in-out infinite 0.2s'
          }}></div>
          <div style={{
            width: '8px',
            height: '8px',
            backgroundColor: '#667eea',
            borderRadius: '50%',
            animation: 'pulse 1.4s ease-in-out infinite 0.4s'
          }}></div>
        </div>
        <style>{`
          @keyframes pulse {
            0%, 80%, 100% {
              opacity: 0.3;
              transform: scale(1);
            }
            40% {
              opacity: 1;
              transform: scale(1.1);
            }
          }
        `}</style>
      </div>
    </div>
  );
};

export default OAuthCallback;
