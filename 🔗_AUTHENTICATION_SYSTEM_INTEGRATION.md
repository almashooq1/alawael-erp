# 🔗 تكامل نظام المصادقة مع التطبيق | System Integration Guide

## 📝 جدول المحتويات

1. [التكامل مع Backend](#التكامل-مع-backend)
2. [التكامل مع Frontend](#التكامل-مع-frontend)
3. [Middleware وحماية الطرق](#middleware-وحماية-الطرق)
4. [State Management](#state-management)
5. [Error Handling](#error-handling)
6. [أمثلة متقدمة](#أمثلة-متقدمة)

---

## 🔧 التكامل مع Backend

### 1️⃣ إضافة في server.js

```javascript
// backend/server.js

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const app = express();

// Middleware الأمان
app.use(helmet()); // حماية من الهجمات
app.use(cors()); // السماح بـ CORS
app.use(morgan('combined')); // تسجيل الطلبات

// Body Parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// الاتصال بـ MongoDB
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log('✅ تم الاتصال بـ MongoDB');
  })
  .catch(err => {
    console.error('❌ فشل الاتصال:', err);
  });

// ============================================
// 🔐 Routes المصادقة
// ============================================

const authenticationRoutes = require('./routes/authenticationRoutes');
app.use('/api/auth', authenticationRoutes);

// ============================================
// 🛡️ Middleware التحقق من الـ Token
// ============================================

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'بدون رمز توثيق',
    });
  }

  try {
    const decoded = require('jsonwebtoken').verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'رمز غير صحيح أو منتهي الصلاحية',
    });
  }
};

// ============================================
// 📋 Routes محمية
// ============================================

// مثال: الحصول على بيانات المستخدم
app.get('/api/user/profile', authMiddleware, async (req, res) => {
  try {
    const User = require('./models/User');
    const user = await User.findById(req.user.id);

    res.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: user.roles,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب البيانات',
    });
  }
});

// تحديث البيانات
app.put('/api/user/profile', authMiddleware, async (req, res) => {
  try {
    const User = require('./models/User');
    const { firstName, lastName, bio, avatar } = req.body;

    const user = await User.findByIdAndUpdate(req.user.id, { firstName, lastName, bio, avatar }, { new: true });

    res.json({
      success: true,
      message: 'تم تحديث البيانات',
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في التحديث',
    });
  }
});

// ============================================
// 🚀 بدء الخادم
// ============================================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 الخادم يعمل على: http://localhost:${PORT}`);
  console.log('🔐 نظام المصادقة متفعّل');
});
```

### 2️⃣ إضافة Middleware الأدوار

```javascript
// backend/middleware/roleMiddleware.js

const roleMiddleware = requiredRoles => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'غير مصرح',
      });
    }

    const userRoles = req.user.roles || [];
    const hasRequiredRole = requiredRoles.some(role => userRoles.includes(role));

    if (!hasRequiredRole) {
      return res.status(403).json({
        success: false,
        message: 'ليس لديك الصلاحيات المطلوبة',
      });
    }

    next();
  };
};

module.exports = roleMiddleware;

// الاستخدام:
// app.delete('/api/user/:id', authMiddleware, roleMiddleware(['admin']), deleteUser);
```

### 3️⃣ إضافة Rate Limiting

```javascript
// backend/middleware/rateLimitMiddleware.js

const rateLimit = require('express-rate-limit');

// حماية من Brute Force على المصادقة
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 دقيقة
  max: 5, // 5 محاولات فقط
  message: 'عدد محاولات الدخول كثير جداً، حاول لاحقاً',
  standardHeaders: true,
  legacyHeaders: false,
});

// حماية عامة
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 دقيقة
  max: 100, // 100 طلب
});

module.exports = {
  authLimiter,
  generalLimiter,
};

// الاستخدام في authenticationRoutes:
// const { authLimiter } = require('../middleware/rateLimitMiddleware');
// router.post('/login', authLimiter, loginHandler);
```

---

## 🎨 التكامل مع Frontend

### 1️⃣ Auth Context (React Context API)

```javascript
// frontend/src/context/AuthContext.js

import React, { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('authToken'));
  const [refreshToken, setRefreshToken] = useState(localStorage.getItem('refreshToken'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // تحميل بيانات المستخدم عند البدء
  useEffect(() => {
    const loadUser = async () => {
      if (token) {
        try {
          const response = await fetch('/api/user/profile', {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (response.ok) {
            const data = await response.json();
            setUser(data.user);
          } else {
            // محاولة تحديث الـ Token
            await refreshAccessToken();
          }
        } catch (error) {
          console.error('خطأ في تحميل المستخدم:', error);
          logout();
        }
      }
      setLoading(false);
    };

    loadUser();
  }, [token]);

  // تسجيل الدخول
  const login = async (credential, password) => {
    try {
      setError(null);
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential, password }),
      });

      const data = await response.json();

      if (data.success) {
        const newToken = data.token;
        const newRefreshToken = data.refreshToken;

        // حفظ في localStorage
        localStorage.setItem('authToken', newToken);
        localStorage.setItem('refreshToken', newRefreshToken);

        // تحديث الحالة
        setToken(newToken);
        setRefreshToken(newRefreshToken);
        setUser(data.user);

        return { success: true, user: data.user };
      } else {
        setError(data.message);
        return { success: false, message: data.message };
      }
    } catch (error) {
      setError('خطأ في الدخول');
      return { success: false, message: 'خطأ في الدخول' };
    }
  };

  // تسجيل الخروج
  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    setToken(null);
    setRefreshToken(null);
    setUser(null);
  };

  // تحديث الـ Token
  const refreshAccessToken = async () => {
    try {
      const response = await fetch('/api/auth/refresh-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      const data = await response.json();

      if (data.success) {
        const newToken = data.token;
        localStorage.setItem('authToken', newToken);
        setToken(newToken);
        return true;
      } else {
        logout();
        return false;
      }
    } catch (error) {
      logout();
      return false;
    }
  };

  // إنشاء حساب
  const register = async userData => {
    try {
      setError(null);
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (data.success) {
        return { success: true, message: 'تم إنشاء الحساب بنجاح' };
      } else {
        setError(data.message);
        return { success: false, message: data.message };
      }
    } catch (error) {
      setError('خطأ في التسجيل');
      return { success: false, message: 'خطأ في التسجيل' };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        error,
        login,
        logout,
        register,
        refreshAccessToken,
        isAuthenticated: !!token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
```

### 2️⃣ Custom Hook للمصادقة

```javascript
// frontend/src/hooks/useAuth.js

import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth يجب أن يُستخدم داخل AuthProvider');
  }

  return context;
};

// الاستخدام:
// const { user, login, logout, isAuthenticated } = useAuth();
```

### 3️⃣ Protected Route Component

```javascript
// frontend/src/components/ProtectedRoute.js

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export const ProtectedRoute = ({ children, requiredRoles = [] }) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return <div>جاري التحميل...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (requiredRoles.length > 0) {
    const hasRole = requiredRoles.some(role => user?.roles?.includes(role));

    if (!hasRole) {
      return <Navigate to="/unauthorized" />;
    }
  }

  return children;
};

// الاستخدام:
// <ProtectedRoute>
//   <DashboardComponent />
// </ProtectedRoute>

// أو مع أدوار محددة:
// <ProtectedRoute requiredRoles={['admin']}>
//   <AdminPanel />
// </ProtectedRoute>
```

### 4️⃣ تحديث App.js

```javascript
// frontend/src/App.js

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';
import { ProtectedRoute } from './components/ProtectedRoute';

// Components
import AdvancedLoginComponent from './components/AdvancedLoginComponent';
import DashboardComponent from './components/DashboardComponent';
import AdminPanelComponent from './components/AdminPanelComponent';
import ProfileComponent from './components/ProfileComponent';
import UnauthorizedComponent from './components/UnauthorizedComponent';

// Layout مع Navigation
const MainLayout = ({ children }) => {
  const { user, logout, isAuthenticated } = useAuth();

  return (
    <div className="main-layout">
      <nav className="navbar">
        <div className="navbar-brand">
          <h1>🚀 تطبيقي</h1>
        </div>

        <div className="navbar-menu">
          {isAuthenticated ? (
            <>
              <span>مرحباً: {user?.username}</span>
              <button onClick={logout}>تسجيل خروج</button>
            </>
          ) : (
            <a href="/login">تسجيل دخول</a>
          )}
        </div>
      </nav>

      <main className="main-content">{children}</main>
    </div>
  );
};

// App الرئيسي
function App() {
  return (
    <Router>
      <AuthProvider>
        <MainLayout>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<AdvancedLoginComponent />} />
            <Route path="/unauthorized" element={<UnauthorizedComponent />} />

            {/* Protected Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardComponent />
                </ProtectedRoute>
              }
            />

            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfileComponent />
                </ProtectedRoute>
              }
            />

            {/* Admin Only */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute requiredRoles={['admin']}>
                  <AdminPanelComponent />
                </ProtectedRoute>
              }
            />

            {/* Default */}
            <Route path="/" element={<Navigate to="/dashboard" />} />
          </Routes>
        </MainLayout>
      </AuthProvider>
    </Router>
  );
}

export default App;
```

---

## 🛡️ Middleware وحماية الطرق

### 1️⃣ Axios Interceptor للـ Tokens

```javascript
// frontend/src/api/axiosConfig.js

import axios from 'axios';
import { useAuth } from '../hooks/useAuth';

export const setupAxiosInterceptors = (getToken, refreshToken) => {
  // Request Interceptor
  axios.interceptors.request.use(
    config => {
      const token = getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    error => Promise.reject(error),
  );

  // Response Interceptor
  axios.interceptors.response.use(
    response => response,
    async error => {
      const originalRequest = error.config;

      // إذا كان الخطأ 401 و لم نحاول التحديث بعد
      if (error.response.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          const success = await refreshToken();
          if (success) {
            // إعادة محاولة الطلب الأصلي
            return axios(originalRequest);
          }
        } catch (refreshError) {
          return Promise.reject(refreshError);
        }
      }

      return Promise.reject(error);
    },
  );
};
```

### 2️⃣ Error Handling Middleware

```javascript
// backend/middleware/errorHandler.js

const errorHandler = (err, req, res, next) => {
  console.error('❌ خطأ:', err);

  // أخطاء التحقق
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'بيانات غير صحيحة',
      errors: Object.values(err.errors).map(e => e.message),
    });
  }

  // أخطاء التكرار
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(400).json({
      success: false,
      message: `${field} موجود بالفعل`,
    });
  }

  // أخطاء JWT
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'رمز غير صحيح',
    });
  }

  // أخطاء عامة
  res.status(500).json({
    success: false,
    message: 'خطأ في الخادم',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
};

module.exports = errorHandler;

// في server.js:
// app.use(errorHandler);
```

---

## 💾 State Management

### Redux Alternative

```javascript
// frontend/src/store/authSlice.js

import { createSlice } from '@reduxjs/toolkit';

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    token: localStorage.getItem('authToken'),
    loading: false,
    error: null,
  },
  reducers: {
    loginStart: state => {
      state.loading = true;
      state.error = null;
    },
    loginSuccess: (state, action) => {
      state.loading = false;
      state.user = action.payload.user;
      state.token = action.payload.token;
      localStorage.setItem('authToken', action.payload.token);
    },
    loginFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
    logout: state => {
      state.user = null;
      state.token = null;
      localStorage.removeItem('authToken');
    },
  },
});

export const { loginStart, loginSuccess, loginFailure, logout } = authSlice.actions;
export default authSlice.reducer;
```

---

## ⚠️ Error Handling

### معالجة الأخطاء الشاملة

```javascript
// frontend/src/utils/errorHandler.js

export const handleAuthError = error => {
  if (!error.response) {
    return 'خطأ في الاتصال بالخادم';
  }

  const status = error.response.status;
  const message = error.response.data?.message;

  switch (status) {
    case 400:
      return message || 'بيانات غير صحيحة';
    case 401:
      return 'بدون توثيق';
    case 403:
      return 'ليس لديك الصلاحيات';
    case 404:
      return 'غير موجود';
    case 429:
      return 'عدد محاولات كثير، حاول لاحقاً';
    case 500:
      return 'خطأ في الخادم';
    default:
      return message || 'حدث خطأ غير متوقع';
  }
};
```

---

## 🚀 أمثلة متقدمة

### مثال 1: تسجيل دخول متقدم مع إعادة المحاولة

```javascript
// frontend/src/components/LoginWithRetry.js

import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

export const LoginWithRetry = () => {
  const { login } = useAuth();
  const [credential, setCredential] = useState('');
  const [password, setPassword] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [loading, setLoading] = useState(false);

  const handleLogin = async e => {
    e.preventDefault();

    if (attempts >= 5) {
      alert('لقد تجاوزت الحد الأقصى من المحاولات');
      return;
    }

    setLoading(true);

    try {
      const result = await login(credential, password);

      if (result.success) {
        console.log('✅ تم الدخول');
      } else {
        setAttempts(attempts + 1);
        console.error('❌ فشل:', result.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin}>
      <input value={credential} onChange={e => setCredential(e.target.value)} placeholder="بريد/جوال/هوية/اسم" />
      <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="كلمة المرور" />
      <button type="submit" disabled={loading || attempts >= 5}>
        {attempts > 0 && `محاولة ${attempts}/5`}
        {loading ? 'جاري...' : 'دخول'}
      </button>
    </form>
  );
};
```

### مثال 2: Session Auto-Refresh

```javascript
// frontend/src/hooks/useSessionRefresh.js

import { useEffect } from 'react';
import { useAuth } from './useAuth';

export const useSessionRefresh = (refreshInterval = 5 * 60 * 1000) => {
  const { token, refreshAccessToken } = useAuth();

  useEffect(() => {
    if (!token) return;

    const interval = setInterval(() => {
      console.log('🔄 تحديث الـ Token...');
      refreshAccessToken();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [token, refreshAccessToken]);
};

// الاستخدام في App.js:
// useSessionRefresh(5 * 60 * 1000); // كل 5 دقائق
```

### مثال 3: API Wrapper مع التوثيق

```javascript
// frontend/src/api/authApi.js

import axios from 'axios';
import { useAuth } from '../hooks/useAuth';

export const createAuthenticatedApi = token => {
  return axios.create({
    baseURL: '/api',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
};

// استخدام:
export const getUserProfile = async token => {
  const api = createAuthenticatedApi(token);
  const response = await api.get('/user/profile');
  return response.data;
};

export const updateUserProfile = async (token, userData) => {
  const api = createAuthenticatedApi(token);
  const response = await api.put('/user/profile', userData);
  return response.data;
};
```

---

## ✅ قائمة التحقق من التكامل

- [ ] تثبيت المكتبات المطلوبة
- [ ] إضافة routes في server.js
- [ ] إضافة middleware الأمان
- [ ] إنشاء Auth Context في React
- [ ] إضافة Protected Routes
- [ ] تحديث App.js
- [ ] إضافة Interceptors
- [ ] تعيين Error Handling
- [ ] اختبار جميع الحالات
- [ ] نشر على الإنتاج

---

**آخر تحديث**: يناير 2026  
**الحالة**: ✅ جاهز للاستخدام
