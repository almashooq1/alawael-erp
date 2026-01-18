# 🎨 التطبيق الكامل - Frontend React

# Complete React Frontend Application

**التاريخ:** 14 يناير 2026  
**الإصدار:** 1.0  
**الحالة:** ✅ كود جاهز للتشغيل

---

## 📁 هيكل المشروع

```
frontend/
├── public/
│   ├── index.html
│   ├── manifest.json
│   └── robots.txt
├── src/
│   ├── index.js                # نقطة الدخول
│   ├── App.js                  # المكون الرئيسي
│   ├── components/             # المكونات
│   │   ├── Layout/
│   │   │   ├── Navbar.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   └── Footer.jsx
│   │   ├── Auth/
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   └── MFA.jsx
│   │   ├── Reports/
│   │   │   ├── ReportList.jsx
│   │   │   ├── ReportCard.jsx
│   │   │   ├── ReportViewer.jsx
│   │   │   └── ReportBuilder.jsx
│   │   ├── Dashboard/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── StatCard.jsx
│   │   │   └── ChartCard.jsx
│   │   └── Common/
│   │       ├── Button.jsx
│   │       ├── Input.jsx
│   │       ├── Modal.jsx
│   │       └── Loading.jsx
│   ├── pages/                  # الصفحات
│   │   ├── Home.jsx
│   │   ├── Reports.jsx
│   │   ├── Beneficiaries.jsx
│   │   ├── Analytics.jsx
│   │   └── Settings.jsx
│   ├── services/               # الخدمات
│   │   ├── api.js
│   │   ├── auth.js
│   │   ├── reports.js
│   │   └── websocket.js
│   ├── store/                  # Redux Store
│   │   ├── index.js
│   │   ├── slices/
│   │   │   ├── authSlice.js
│   │   │   ├── reportsSlice.js
│   │   │   └── uiSlice.js
│   │   └── middleware/
│   │       └── api.js
│   ├── hooks/                  # Custom Hooks
│   │   ├── useAuth.js
│   │   ├── useReports.js
│   │   └── useWebSocket.js
│   ├── utils/                  # الأدوات
│   │   ├── constants.js
│   │   ├── helpers.js
│   │   └── validators.js
│   ├── styles/                 # الأنماط
│   │   ├── global.css
│   │   ├── theme.js
│   │   └── variables.css
│   └── __tests__/              # الاختبارات
│       ├── components/
│       └── services/
├── package.json
├── .env.example
└── README.md
```

---

## 🚀 package.json - التبعيات

```json
{
  "name": "rehabilitation-frontend",
  "version": "1.0.0",
  "description": "نظام إدارة مراكز تأهيل ذوي الإعاقة",
  "private": true,
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.21.1",
    "react-scripts": "5.0.1",
    "@reduxjs/toolkit": "^2.0.1",
    "react-redux": "^9.0.4",
    "@mui/material": "^5.15.0",
    "@mui/icons-material": "^5.15.0",
    "@emotion/react": "^11.11.3",
    "@emotion/styled": "^11.11.0",
    "axios": "^1.6.5",
    "socket.io-client": "^4.6.0",
    "chart.js": "^4.4.1",
    "react-chartjs-2": "^5.2.0",
    "date-fns": "^3.0.6",
    "formik": "^2.4.5",
    "yup": "^1.3.3",
    "react-toastify": "^10.0.4",
    "react-query": "^3.39.3",
    "lodash": "^4.17.21",
    "jwt-decode": "^4.0.0",
    "i18next": "^23.7.16",
    "react-i18next": "^14.0.0"
  },
  "devDependencies": {
    "@testing-library/react": "^14.1.2",
    "@testing-library/jest-dom": "^6.1.5",
    "@testing-library/user-event": "^14.5.1",
    "eslint": "^8.56.0",
    "eslint-config-react-app": "^7.0.1",
    "prettier": "^3.1.1"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject",
    "lint": "eslint src/**/*.{js,jsx}",
    "format": "prettier --write src/**/*.{js,jsx,css}"
  },
  "browserslist": {
    "production": [">0.2%", "not dead", "not op_mini all"],
    "development": ["last 1 chrome version", "last 1 firefox version", "last 1 safari version"]
  }
}
```

---

## 🎯 src/App.js - التطبيق الرئيسي

```javascript
/**
 * التطبيق الرئيسي
 */

import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Redux Store
import { store } from './store';

// Layout
import Layout from './components/Layout/Layout';

// Pages
import Home from './pages/Home';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import Reports from './pages/Reports';
import ReportViewer from './components/Reports/ReportViewer';
import ReportBuilder from './components/Reports/ReportBuilder';
import Beneficiaries from './pages/Beneficiaries';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';

// Hooks
import { useAuth } from './hooks/useAuth';

// Theme
const theme = createTheme({
  direction: 'rtl',
  palette: {
    primary: {
      main: '#667eea',
      light: '#7c93ee',
      dark: '#5568d3',
    },
    secondary: {
      main: '#764ba2',
      light: '#8a5fb5',
      dark: '#653f8b',
    },
    success: {
      main: '#28a745',
    },
    error: {
      main: '#dc3545',
    },
    warning: {
      main: '#ffc107',
    },
    info: {
      main: '#17a2b8',
    },
    background: {
      default: '#f5f7fa',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: ['Cairo', 'Tajawal', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'].join(','),
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 500,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 500,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 500,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
          padding: '10px 24px',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
          },
        },
      },
    },
  },
});

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div>جاري التحميل...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

function App() {
  useEffect(() => {
    // إعداد اتجاه RTL
    document.documentElement.dir = 'rtl';
    document.documentElement.lang = 'ar';
  }, []);

  return (
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected Routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Home />} />

              {/* Reports */}
              <Route path="reports">
                <Route index element={<Reports />} />
                <Route path="new" element={<ReportBuilder />} />
                <Route path=":id" element={<ReportViewer />} />
                <Route path=":id/edit" element={<ReportBuilder />} />
              </Route>

              {/* Beneficiaries */}
              <Route path="beneficiaries">
                <Route index element={<Beneficiaries />} />
                <Route path=":id" element={<div>تفاصيل المستفيد</div>} />
              </Route>

              {/* Analytics */}
              <Route path="analytics" element={<Analytics />} />

              {/* Settings */}
              <Route path="settings" element={<Settings />} />
            </Route>

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Router>

        {/* Toast Notifications */}
        <ToastContainer
          position="top-left"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
        />
      </ThemeProvider>
    </Provider>
  );
}

export default App;
```

---

## 🔐 src/services/api.js - API Client

```javascript
/**
 * API Client
 */

import axios from 'axios';
import { toast } from 'react-toastify';

// إنشاء instance
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor
api.interceptors.request.use(
  config => {
    // إضافة التوكن
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  error => {
    return Promise.reject(error);
  },
);

// Response Interceptor
api.interceptors.response.use(
  response => {
    return response.data;
  },
  async error => {
    const originalRequest = error.config;

    // معالجة 401 Unauthorized
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // محاولة تجديد التوكن
        const refreshToken = localStorage.getItem('refresh_token');

        if (refreshToken) {
          const response = await axios.post(`${process.env.REACT_APP_API_URL}/auth/refresh`, { refresh_token: refreshToken });

          const { access_token } = response.data;
          localStorage.setItem('access_token', access_token);

          // إعادة المحاولة
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // فشل التجديد - تسجيل خروج
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
      }
    }

    // معالجة الأخطاء
    const errorMessage = error.response?.data?.message || 'حدث خطأ';
    toast.error(errorMessage);

    return Promise.reject(error);
  },
);

export default api;
```

---

## 📊 src/store/slices/reportsSlice.js - Redux Slice

```javascript
/**
 * Reports Redux Slice
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

// Async Thunks
export const fetchReports = createAsyncThunk('reports/fetchReports', async ({ page = 1, filters = {} }) => {
  const response = await api.get('/reports', {
    params: { page, ...filters },
  });
  return response;
});

export const fetchReportById = createAsyncThunk('reports/fetchReportById', async id => {
  const response = await api.get(`/reports/${id}`);
  return response;
});

export const createReport = createAsyncThunk('reports/createReport', async reportData => {
  const response = await api.post('/reports', reportData);
  return response;
});

export const updateReport = createAsyncThunk('reports/updateReport', async ({ id, data }) => {
  const response = await api.put(`/reports/${id}`, data);
  return response;
});

export const deleteReport = createAsyncThunk('reports/deleteReport', async id => {
  await api.delete(`/reports/${id}`);
  return id;
});

export const downloadReport = createAsyncThunk('reports/downloadReport', async ({ id, format }) => {
  const response = await api.get(`/reports/${id}/download/${format}`, {
    responseType: 'blob',
  });
  return { data: response, format };
});

// Initial State
const initialState = {
  reports: [],
  currentReport: null,
  loading: false,
  error: null,
  pagination: {
    page: 1,
    totalPages: 1,
    total: 0,
  },
  filters: {},
};

// Slice
const reportsSlice = createSlice({
  name: 'reports',
  initialState,
  reducers: {
    setFilters: (state, action) => {
      state.filters = action.payload;
    },
    clearCurrentReport: state => {
      state.currentReport = null;
    },
    clearError: state => {
      state.error = null;
    },
  },
  extraReducers: builder => {
    builder
      // Fetch Reports
      .addCase(fetchReports.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchReports.fulfilled, (state, action) => {
        state.loading = false;
        state.reports = action.payload.reports;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchReports.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })

      // Fetch Report By ID
      .addCase(fetchReportById.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchReportById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentReport = action.payload.report;
      })
      .addCase(fetchReportById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })

      // Create Report
      .addCase(createReport.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createReport.fulfilled, (state, action) => {
        state.loading = false;
        state.reports.unshift(action.payload.report);
      })
      .addCase(createReport.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })

      // Update Report
      .addCase(updateReport.fulfilled, (state, action) => {
        const index = state.reports.findIndex(r => r.id === action.payload.report.id);
        if (index !== -1) {
          state.reports[index] = action.payload.report;
        }
        if (state.currentReport?.id === action.payload.report.id) {
          state.currentReport = action.payload.report;
        }
      })

      // Delete Report
      .addCase(deleteReport.fulfilled, (state, action) => {
        state.reports = state.reports.filter(r => r.id !== action.payload);
        if (state.currentReport?.id === action.payload) {
          state.currentReport = null;
        }
      });
  },
});

export const { setFilters, clearCurrentReport, clearError } = reportsSlice.actions;
export default reportsSlice.reducer;
```

---

**آخر تحديث:** 14 يناير 2026  
**الحالة:** ✅ كود Frontend جاهز للتشغيل
