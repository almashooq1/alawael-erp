# SSO System - Frontend Integration Guide

## 🎯 Overview

Complete Single Sign-On (SSO) system frontend implementation with authentication, token management, and OAuth2 support.

---

## 📋 Table of Contents

1. [Installation & Setup](#installation--setup)
2. [Components](#components)
3. [Context & State Management](#context--state-management)
4. [API Integration](#api-integration)
5. [Usage Examples](#usage-examples)
6. [Error Handling](#error-handling)
7. [Best Practices](#best-practices)

---

## 🚀 Installation & Setup

### 1. Install Dependencies

```bash
npm install react-router-dom axios
```

### 2. Configure Environment Variables

Create `.env` file in frontend root:

```env
REACT_APP_API_URL=http://localhost:3002
REACT_APP_OAUTH_CLIENT_ID=sso-client
REACT_APP_OAUTH_REDIRECT_URI=http://localhost:3000/auth/callback
```

### 3. Setup App.jsx with AuthProvider

```jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import LoginForm from './components/Auth/LoginForm';
import OAuthCallback from './pages/Auth/OAuthCallback';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import Dashboard from './pages/Dashboard';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginForm />} />
          <Route path="/auth/callback" element={<OAuthCallback />} />
          
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
```

---

## 📦 Components

### LoginForm Component

**Location:** `src/components/Auth/LoginForm.jsx`

**Features:**
- Email/password authentication
- Form validation
- OAuth2 social login (Google, Microsoft)
- Password visibility toggle
- Error handling with user feedback
- Loading states
- Remember me checkbox
- Forgot password link

**Props:**
```jsx
<LoginForm 
  onSuccess={(user) => console.log('Login successful', user)}
  onError={(error) => console.error('Login failed', error)}
/>
```

**Example Usage:**
```jsx
import LoginForm from './components/Auth/LoginForm';

export default function LoginPage() {
  return (
    <LoginForm
      onSuccess={(user) => {
        console.log('User logged in:', user);
        // Navigate to dashboard
      }}
      onError={(error) => {
        console.error('Login error:', error);
      }}
    />
  );
}
```

### ProtectedRoute Component

**Location:** `src/components/Auth/ProtectedRoute.jsx`

**Features:**
- Blocks unauthenticated users
- Role-based access control
- Permission-based access control
- Automatic token refresh
- Redirect to login on expiration

**Props:**
```jsx
<ProtectedRoute 
  requiredRole="admin"
  requiredPermission="read:users"
>
  <AdminPanel />
</ProtectedRoute>
```

**Example Usage:**
```jsx
// Basic protection
<ProtectedRoute>
  <Dashboard />
</ProtectedRoute>

// With role requirement
<ProtectedRoute requiredRole="admin">
  <AdminPanel />
</ProtectedRoute>

// With permission requirement
<ProtectedRoute requiredPermission="write:documents">
  <DocumentEditor />
</ProtectedRoute>
```

### OAuthCallback Component

**Location:** `src/pages/Auth/OAuthCallback.jsx`

**Features:**
- Handles OAuth2 authorization code
- Exchanges code for tokens
- Fetches user info
- Stores tokens in localStorage
- Redirects to dashboard on success

---

## 🔐 Context & State Management

### AuthContext

**Location:** `src/context/AuthContext.jsx`

**Provides:**
```jsx
{
  isAuthenticated: boolean,
  user: {
    userId: string,
    email: string,
    name: string,
    role: string,
    permissions: string[]
  },
  accessToken: string,
  sessionId: string,
  expiresAt: number,
  
  // Methods
  login(email, password): Promise<tokens>,
  logout(): Promise<void>,
  refreshToken(): Promise<tokens>,
  isTokenExpired(): boolean,
  setAuth(auth): void
}
```

**Example Usage:**
```jsx
import { useContext } from 'react';
import AuthContext from '../context/AuthContext';

function MyComponent() {
  const { user, logout, isAuthenticated } = useContext(AuthContext);

  if (!isAuthenticated) {
    return <div>Please login first</div>;
  }

  return (
    <>
      <p>Hello, {user.name}!</p>
      <button onClick={logout}>Logout</button>
    </>
  );
}
```

---

## 🔗 API Integration

### SSO Server Configuration

Base URL: `http://localhost:3002`
Base Path: `/api/sso`

### Authentication Endpoints

#### Login
```http
POST /api/sso/login

Request:
{
  "email": "user@example.com",
  "password": "password123",
  "deviceId": "device_1",
  "userAgent": "Mozilla/5.0..."
}

Response:
{
  "success": true,
  "data": {
    "sessionId": "session_123",
    "accessToken": "jwt_token",
    "refreshToken": "refresh_token",
    "idToken": "id_token",
    "expiresIn": 3600000,
    "user": { ... }
  }
}
```

#### Logout
```http
POST /api/sso/logout
Authorization: Bearer {accessToken}

Response:
{
  "success": true,
  "message": "Logged out successfully"
}
```

#### Refresh Token
```http
POST /api/sso/refresh-token

Request:
{
  "refreshToken": "refresh_token"
}

Response:
{
  "success": true,
  "data": {
    "accessToken": "new_jwt_token",
    "refreshToken": "new_refresh_token",
    "expiresIn": 3600000
  }
}
```

#### Verify Token
```http
POST /api/sso/verify-token

Request:
{
  "token": "access_token"
}

Response:
{
  "success": true,
  "valid": true,
  "user": { ... }
}
```

#### Get User Info
```http
GET /api/sso/userinfo
Authorization: Bearer {accessToken}

Response:
{
  "success": true,
  "data": {
    "userId": "user_123",
    "email": "user@example.com",
    "name": "User Name",
    "role": "user",
    "permissions": ["read"]
  }
}
```

---

## 💡 Usage Examples

### Example 1: Simple Login

```jsx
import LoginForm from './components/Auth/LoginForm';
import { useNavigate } from 'react-router-dom';

function LoginPage() {
  const navigate = useNavigate();

  return (
    <LoginForm
      onSuccess={(user) => {
        console.log('Successfully logged in:', user);
        navigate('/dashboard');
      }}
      onError={(error) => {
        console.error('Login failed:', error);
        // Show error toast/notification
      }}
    />
  );
}

export default LoginPage;
```

### Example 2: Protected Dashboard

```jsx
import { useContext } from 'react';
import AuthContext from '../context/AuthContext';
import ProtectedRoute from '../components/Auth/ProtectedRoute';

function Dashboard() {
  const { user, logout } = useContext(AuthContext);

  return (
    <div>
      <h1>Welcome, {user?.name}</h1>
      <p>Email: {user?.email}</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  );
}
```

### Example 3: Admin Panel (Role-Based)

```jsx
import ProtectedRoute from '../components/Auth/ProtectedRoute';

function AdminPanel() {
  return (
    <div>
      <h1>Admin Panel</h1>
      <p>Only admins can see this</p>
    </div>
  );
}

export default function Admin() {
  return (
    <ProtectedRoute requiredRole="admin">
      <AdminPanel />
    </ProtectedRoute>
  );
}
```

### Example 4: Custom Hook for Authentication

```jsx
import { useContext, useCallback } from 'react';
import AuthContext from '../context/AuthContext';

function useAuth() {
  const auth = useContext(AuthContext);

  const loginWithCredentials = useCallback(async (email, password) => {
    return await auth.login(email, password);
  }, [auth]);

  const hasPermission = useCallback((permission) => {
    return auth.user?.permissions?.includes(permission) ?? false;
  }, [auth.user]);

  const hasRole = useCallback((role) => {
    return auth.user?.role === role;
  }, [auth.user]);

  return {
    ...auth,
    loginWithCredentials,
    hasPermission,
    hasRole
  };
}

export default useAuth;
```

---

## ⚠️ Error Handling

### Common Error Scenarios

#### 1. Invalid Credentials
```javascript
try {
  await auth.login('user@example.com', 'wrongpassword');
} catch (error) {
  console.error('Invalid credentials:', error.message);
  // Display: "Invalid email or password"
}
```

#### 2. Token Expiration
```javascript
const { isTokenExpired, refreshToken, logout } = useContext(AuthContext);

// Check and refresh if needed
if (isTokenExpired()) {
  try {
    await refreshToken();
  } catch {
    await logout();
    // Redirect to login
  }
}
```

#### 3. Network Errors
```javascript
try {
  await auth.login(email, password);
} catch (error) {
  if (error.message.includes('fetch')) {
    // Network error
    console.error('Network unavailable');
  }
}
```

### Error Handling in Components

```jsx
function LoginForm() {
  const [errors, setErrors] = useState({});
  const { login } = useContext(AuthContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      await login(email, password);
    } catch (error) {
      setErrors({
        submit: error.message
      });
    }
  };

  return (
    <>
      {errors.submit && <div className="error">{errors.submit}</div>}
      {/* Form */}
    </>
  );
}
```

---

## 📚 Best Practices

### 1. Token Storage & Security

✅ **DO:**
```javascript
// Store in localStorage with expiration
localStorage.setItem('sso_tokens', JSON.stringify({
  accessToken: token,
  expiresAt: Date.now() + expiresIn
}));
```

❌ **DON'T:**
```javascript
// Don't store in global variable or window
window.accessToken = token;

// Don't use sessionStorage for long-lived sessions
sessionStorage.setItem('token', token);
```

### 2. Token Refresh Strategy

```javascript
// Refresh before expiration (5 minutes before)
const shouldRefresh = () => {
  const expiresAt = auth.expiresAt;
  return expiresAt - Date.now() < 5 * 60 * 1000;
};

// Set up interval check
useEffect(() => {
  const interval = setInterval(() => {
    if (shouldRefresh()) {
      refreshToken();
    }
  }, 60000); // Check every minute

  return () => clearInterval(interval);
}, []);
```

### 3. Secure API Calls

```javascript
// Always include auth header
const apiCall = async (endpoint, options = {}) => {
  const { accessToken } = useContext(AuthContext);

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  return fetch(`${process.env.REACT_APP_API_URL}${endpoint}`, {
    ...options,
    headers
  });
};
```

### 4. Handle Session Timeouts

```javascript
// Monitor user activity
useEffect(() => {
  let timeout;

  const resetTimeout = () => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      logout(); // Auto-logout after 30 minutes
    }, 30 * 60 * 1000);
  };

  // Reset on user activity
  window.addEventListener('mousedown', resetTimeout);
  window.addEventListener('keydown', resetTimeout);

  resetTimeout();

  return () => {
    clearTimeout(timeout);
    window.removeEventListener('mousedown', resetTimeout);
    window.removeEventListener('keydown', resetTimeout);
  };
}, [logout]);
```

### 5. OAuth State Management

```javascript
// Generate and validate state parameter
function generateState() {
  return Math.random().toString(36).substring(7);
}

function validateState() {
  const stored = sessionStorage.getItem('oauth_state');
  const returned = new URLSearchParams(window.location.search).get('state');
  return stored === returned;
}

// On OAuth authorize
const state = generateState();
sessionStorage.setItem('oauth_state', state);
// Pass state to authorization endpoint
```

---

## 🔗 Related Files

- Backend SSO Server: `erp_new_system/backend/sso-server.js`
- SSO Routes: `erp_new_system/backend/routes/sso.routes.js`
- Backend Docs: `SSO_INTEGRATION_GUIDE.md`
- E2E Tests: `erp_new_system/backend/tests/sso-e2e-fixed.test.js`

---

## 📞 Support

For issues or questions:
1. Check [SSO_INTEGRATION_GUIDE.md](./SSO_INTEGRATION_GUIDE.md) for backend details
2. Review E2E test examples
3. Check browser console for error details
4. Verify SSO server is running: `npm run start:sso`

---

## ✅ Checklist

- [ ] SSO server running on port 3002
- [ ] Environment variables configured
- [ ] AuthProvider wraps app
- [ ] LoginForm component imported
- [ ] Protected routes setup
- [ ] Token refresh implemented
- [ ] Error handling in place
- [ ] OAuth callback configured
- [ ] API endpoints verified
- [ ] Tests passing

---

**Last Updated:** 2026-02-18  
**Version:** 1.0.0  
**Status:** ✅ Production Ready
