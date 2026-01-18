# Phase 13 API Authentication Flow Guide

## Overview

The AlAwael ERP backend uses **JWT (JSON Web Tokens)** for secure API authentication. This guide explains how authentication works and how to implement it in your frontend.

---

## Authentication Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Client Application                         │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                    1. Send Credentials
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    /api/auth/login                              │
│  Validates email/password → Returns JWT Token                   │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                    2. Store Token
                    (localStorage)
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Secured API Endpoints                          │
│  All requests include: Authorization: Bearer <TOKEN>            │
│  Examples:                                                      │
│  - /api/user-profile/statistics                                │
│  - /api/payments-advanced/statistics                           │
│  - /api/notifications-advanced/send                            │
└──────────────────────────┬──────────────────────────────────────┘
                           │
               3. Backend Validates Token
               (via authMiddleware)
                           │
                           ▼
        ┌───────────────────────────────────┐
        │  Valid Token?                     │
        └───────────┬───────────┬───────────┘
                    │           │
              Yes   │           │   No
                    ▼           ▼
            ┌────────────┐  ┌─────────────┐
            │ Allow      │  │ Reject 403  │
            │ Request    │  │ (Forbidden) │
            └────────────┘  └─────────────┘
```

---

## Step 1: User Login

### Request

```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure-password"
}
```

### Response (Success - 200)

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-123",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user"
  }
}
```

### Response (Failure - 401)

```json
{
  "success": false,
  "error": "Invalid email or password"
}
```

---

## Step 2: Store JWT Token

After successful login, store the token in **localStorage** (or sessionStorage for temporary sessions):

```javascript
// In your frontend after login
const response = await fetch('http://localhost:3001/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password',
  }),
});

const { token } = await response.json();

// Store token
localStorage.setItem('authToken', token);

// Also store expiration time (JWT tokens expire)
const expiresIn = 3600; // 1 hour
localStorage.setItem('tokenExpiry', Date.now() + expiresIn * 1000);
```

---

## Step 3: Include Token in API Requests

For **all secured endpoints**, include the token in the `Authorization` header:

### Format

```
Authorization: Bearer <TOKEN>
```

### Example Fetch Call

```javascript
const token = localStorage.getItem('authToken');

const response = await fetch('http://localhost:3001/api/user-profile/statistics', {
  method: 'GET',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
});

const data = await response.json();
```

### Example with Axios

```javascript
import axios from 'axios';

const token = localStorage.getItem('authToken');

const response = await axios.get('http://localhost:3001/api/user-profile/statistics', {
  headers: {
    Authorization: `Bearer ${token}`,
  },
});
```

---

## Step 4: Handle Token Expiry & Refresh

JWTs have an expiration time. When expired, you'll get a **401 Unauthorized** response.

### Automatic Token Refresh

```javascript
async function fetchWithTokenRefresh(url, options = {}) {
  let response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${localStorage.getItem('authToken')}`,
    },
  });

  // If token expired (401), try to refresh
  if (response.status === 401) {
    const refreshResponse = await fetch('http://localhost:3001/api/auth/refresh', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('authToken')}`,
      },
    });

    if (refreshResponse.ok) {
      const { token } = await refreshResponse.json();
      localStorage.setItem('authToken', token);

      // Retry original request with new token
      response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${token}`,
        },
      });
    } else {
      // Refresh failed, redirect to login
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
  }

  return response;
}

// Usage
const data = await fetchWithTokenRefresh('http://localhost:3001/api/user-profile/statistics').then(r => r.json());
```

---

## Step 5: Logout

Clear the token from localStorage:

```javascript
function logout() {
  localStorage.removeItem('authToken');
  localStorage.removeItem('tokenExpiry');
  window.location.href = '/login';
}
```

---

## Token Structure

A JWT token has 3 parts (separated by dots):

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9 . eyJpZCI6IjEyMyIsInJvbGUiOiJhZG1pbiJ9 . TJVA95OrM7E2cBab30RMHrHDcEfxjoYZgeFONFh7HgQ
│                                       │ │                                     │ │                                                 │
├────── Header (Algorithm & Type) ─────┤ ├────── Payload (Data) ──────────────┤ ├────── Signature (Verification) ─────────────────┤
```

**Header:**

```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

**Payload:**

```json
{
  "id": "user-123",
  "role": "admin",
  "iat": 1705405800,
  "exp": 1705409400
}
```

---

## Error Responses

### 400 Bad Request

```json
{
  "success": false,
  "error": "Email and password required"
}
```

### 401 Unauthorized

```json
{
  "success": false,
  "error": "Invalid credentials"
}
```

### 403 Forbidden (Invalid/Expired Token)

```json
{
  "success": false,
  "error": "Token invalid or expired"
}
```

### 500 Server Error

```json
{
  "success": false,
  "error": "Internal server error"
}
```

---

## Testing Authentication

### Generate a Test Token (in Terminal)

```bash
cd backend
npm run token:gen
```

This outputs a valid JWT token you can use for testing.

### Test with cURL

```bash
TOKEN=$(npm -C backend run token:gen 2>/dev/null | tail -n1)

curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/user-profile/statistics
```

---

## Security Best Practices

### ✅ DO

- **Store token securely**: Use `localStorage` for persistent login, or `sessionStorage` for temporary sessions
- **Always use HTTPS**: In production, use SSL/TLS encryption
- **Include token in every request**: All secured endpoints require the `Authorization` header
- **Handle token expiry**: Implement token refresh logic
- **Validate token on server**: Backend validates signature and expiration
- **Use secure cookies**: Consider `httpOnly` cookies instead of localStorage for sensitive apps
- **Implement logout**: Clear token when user logs out

### ❌ DON'T

- **Don't store token in plain text**: Use secure storage methods
- **Don't expose token in URLs**: Always use headers for token transmission
- **Don't use weak passwords**: Enforce strong password policies
- **Don't ignore CORS**: Configure CORS headers properly
- **Don't skip HTTPS**: Never transmit tokens over unencrypted connections
- **Don't hardcode tokens**: Always fetch from secure authentication endpoints

---

## React Implementation Example

### Authentication Context

```javascript
import React, { createContext, useState, useCallback } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('authToken'));
  const [loading, setLoading] = useState(false);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) throw new Error('Login failed');

      const { token: newToken, user: userData } = await response.json();
      setToken(newToken);
      setUser(userData);
      localStorage.setItem('authToken', newToken);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('authToken');
  }, []);

  return <AuthContext.Provider value={{ user, token, loading, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return React.useContext(AuthContext);
}
```

### Usage in Component

```javascript
function LoginForm() {
  const { login, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async e => {
    e.preventDefault();
    await login(email, password);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" />
      <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" />
      <button disabled={loading}>{loading ? 'Logging in...' : 'Login'}</button>
    </form>
  );
}
```

---

## Troubleshooting

### Issue: "Token invalid or expired"

**Solution:** Generate a new token using `npm run token:gen` and try again.

### Issue: 401 on every request

**Solution:** Ensure token is being sent in `Authorization: Bearer <TOKEN>` format.

### Issue: CORS errors

**Solution:** Backend must have CORS enabled. Check `server.js` for `cors()` middleware.

### Issue: Token not stored after login

**Solution:** Check browser DevTools → Application → LocalStorage to verify token is there.

### Issue: Logout doesn't work

**Solution:** Ensure you're clearing both the token and refreshing the page/redirecting.

---

## Summary

| Step | Action                  | Example                                    |
| ---- | ----------------------- | ------------------------------------------ |
| 1    | **Login**               | POST `/api/auth/login` with email/password |
| 2    | **Store Token**         | `localStorage.setItem('authToken', token)` |
| 3    | **Include in Requests** | Header: `Authorization: Bearer <TOKEN>`    |
| 4    | **Handle Expiry**       | Check for 401 and refresh token            |
| 5    | **Logout**              | Remove token and redirect to login         |

---

**Last Updated:** January 16, 2026  
**Backend Status:** ✅ Operational  
**API Version:** Phase 13+
