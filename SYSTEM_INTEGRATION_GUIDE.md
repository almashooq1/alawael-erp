# 🔗 System Integration Guide

**Version:** 1.0.0  
**Last Updated:** 2026-02-18  
**Status:** ✅ Complete

---

## 📑 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Server Configuration](#server-configuration)
3. [SSO Integration](#sso-integration)
4. [Supply Chain Integration](#supply-chain-integration)
5. [Frontend Integration](#frontend-integration)
6. [Database Layer](#database-layer)
7. [Security Considerations](#security-considerations)
8. [Deployment Checklist](#deployment-checklist)

---

## 🏗️ Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React)                         │
│            - Login Component                                │
│            - AuthContext                                    │
│            - Protected Routes                               │
└────────────────┬──────────────────────────────────────────┘
                 │
        ┌────────┴───────────┐
        │                    │
        ▼                    ▼
┌──────────────────┐  ┌──────────────────────────┐
│  SSO Server      │  │  Main Server             │
│  (Port 3002)     │  │  (Port 3001)             │
│                  │  │                          │
│ - User Auth      │  │ - API Gateway            │
│ - Token Mgmt     │  │ - Supply Chain           │
│ - Sessions       │  │ - AI Services            │
│ - OAuth2         │  │ - Other Modules          │
└────────┬─────────┘  └────────┬─────────────────┘
         │                     │
         ▼                     ▼
    ┌────────────────────────────────┐
    │   Database Layer (Mock/Real)   │
    │   - Users                      │
    │   - Sessions                   │
    │   - Suppliers                  │
    │   - Inventory                  │
    │   - Orders                     │
    └────────────────────────────────┘
```

### Data Flow

#### Authentication Flow (SSO → Main Server)
1. User logs in at http://localhost:3001 (Frontend)
2. Frontend calls `/api/sso/login` on SSO server
3. SSO returns `accessToken` + `refreshToken`
4. Frontend stores tokens in localStorage
5. Frontend includes token in Authorization header for subsequent requests
6. Main server validates token with SSO server
7. Protected routes accessible in Frontend + Backend

#### Supply Chain Flow
1. Authenticated user requests `/api/supply-chain/*`
2. Main server validates Authorization header
3. Supply Chain service processes request
4. Response with data or error

---

## ⚙️ Server Configuration

### SSO Server (Port 3002)

```javascript
// sso-server.js - Standalone configuration
const express = require('express');
const cors = require('cors');
const app = express();

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));

// Routes
const ssoRouter = safeRequire('./routes/sso.routes');
app.use('/api/sso', ssoRouter);

// Start
const port = process.env.SSO_PORT || 3002;
app.listen(port, () => {
  console.log(`✅ SSO Server running on port ${port}`);
});
```

### Main Server (Port 3001)

```javascript
// app.js - Main server with all modules
const express = require('express');
const cors = require('cors');
const app = express();

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000'
}));

// SSO Integration
const ssoRouter = safeRequire('./routes/sso.routes');
app.use('/api/sso', ssoRouter);

// Supply Chain Integration
const supplyChainRouter = safeRequire('./routes/supplyChain.routes');
app.use('/api/supply-chain', supplyChainRouter);

// Other modules...
// app.use('/api/other', otherRouter);

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`✅ Main Server running on port ${port}`);
});
```

### Environment Variables

```bash
# .env file
NODE_ENV=development

# Server Ports
PORT=3001
SSO_PORT=3002
FRONTEND_PORT=3000

# CORS
CORS_ORIGIN=http://localhost:3000

# Database
USE_MOCK_DB=true
DB_USERNAME=admin
DB_PASSWORD=password
DB_NAME=erp_system

# Cache
USE_MOCK_CACHE=true
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your_secret_key_here
JWT_EXPIRY=3600000

# OAuth
OAUTH_CLIENT_ID=sso-client
OAUTH_CLIENT_SECRET=secret
OAUTH_REDIRECT_URI=http://localhost:3000/callback

# Logging
LOG_LEVEL=info
```

---

## 🔐 SSO Integration

### SSO Service Integration Points

#### 1. User Authentication
```javascript
// When user logs in, SSO provides:
{
  sessionId: "session_hash",
  accessToken: "jwt_token",
  refreshToken: "jwt_token",
  idToken: "jwt_token",
  user: {
    userId: "user_123",
    email: "user@example.com",
    role: "user",
    permissions: ["read"]
  }
}
```

#### 2. Token Verification (Main Server)
```javascript
// In middleware - verify token with SSO
const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ 
      success: false, 
      error: 'unauthorized',
      message: 'No token provided' 
    });
  }
  
  try {
    // Option 1: Direct verification (if SSO on same server)
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    // Option 2: Verify with SSO server
    const result = await fetch('http://localhost:3002/api/sso/verify-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    });
    
    if (result.ok) {
      const { data } = await result.json();
      req.user = data.user;
      next();
    } else {
      res.status(401).json({ 
        success: false, 
        error: 'invalid_token',
        message: 'Token verification failed' 
      });
    }
  }
};
```

#### 3. Role-Based Access Control
```javascript
// Middleware for role checking
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Forbidden',
        message: 'Insufficient permissions'
      });
    }
    
    next();
  };
};

// Usage
app.get('/api/admin', requireRole(['admin']), (req, res) => {
  res.json({ message: 'Admin panel' });
});
```

---

## 🚚 Supply Chain Integration

### 1. Module Structure

```
/services/supplyChain.service.js
├── Supplier Management
│   ├── createSupplier()
│   ├── getSupplier()
│   ├── listSuppliers()
│   ├── updateSupplier()
│
├── Inventory Management
│   ├── addToInventory()
│   ├── updateInventory()
│   ├── getInventoryStatus()
│
├── Purchase Orders
│   ├── createPurchaseOrder()
│   ├── listOrders()
│   ├── updateOrderStatus()
│
├── Shipments
│   ├── createShipment()
│   ├── updateShipmentStatus()
│   ├── trackShipment()
│
└── Analytics
    └── getSupplyChainAnalytics()

/routes/supplyChain.routes.js
├── Supplier Routes (5 endpoints)
├── Inventory Routes (3 endpoints)
├── Order Routes (4 endpoints)
├── Shipment Routes (3 endpoints)
└── Analytics Routes (2 endpoints)
```

### 2. Data Models

#### Supplier Model
```javascript
{
  id: "supplier_1",
  name: "Supplier Name",
  email: "contact@supplier.com",
  phone: "+966-500-000-000",
  address: "Address",
  category: "electronics",
  status: "active",
  rating: 4.5,
  createdAt: "2026-02-18T15:00:00Z",
  updatedAt: "2026-02-18T15:00:00Z"
}
```

#### Product Model
```javascript
{
  id: "product_1",
  sku: "SKU-001",
  name: "Product Name",
  category: "electronics",
  quantity: 100,
  minLevel: 10,
  price: 299.99,
  unit: "piece",
  supplierId: "supplier_1",
  createdAt: "2026-02-18T15:00:00Z"
}
```

#### Purchase Order Model
```javascript
{
  id: "po_123",
  supplierId: "supplier_1",
  items: [
    {
      productId: "product_1",
      quantity: 50,
      unitPrice: 299.99
    }
  ],
  totalAmount: 14999.50,
  status: "confirmed",
  priority: "high",
  dueDate: "2026-02-25T00:00:00Z",
  createdAt: "2026-02-18T15:00:00Z"
}
```

#### Shipment Model
```javascript
{
  id: "shipment_1",
  orderId: "po_123",
  trackingNumber: "DHL123456789",
  carrier: "DHL",
  status: "in-transit",
  location: "Regional Hub",
  estimatedDelivery: "2026-02-23T00:00:00Z",
  statusHistory: [
    {
      status: "pending",
      timestamp: "2026-02-18T15:00:00Z",
      location: "Warehouse"
    }
  ],
  createdAt: "2026-02-18T15:00:00Z"
}
```

### 3. API Endpoint Integration

```javascript
// Supply Chain Router
const express = require('express');
const router = express.Router();
const supplyChainService = require('../services/supplyChain.service');

// Suppliers
router.post('/suppliers', async (req, res) => {
  try {
    const supplier = await supplyChainService.createSupplier(req.body);
    res.status(201).json({ success: true, data: supplier });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Similar for other endpoints...
```

---

## 🎨 Frontend Integration

### 1. React Setup

```javascript
// src/index.js
import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';

ReactDOM.render(
  <AuthProvider>
    <App />
  </AuthProvider>,
  document.getElementById('root')
);
```

### 2. Auth Context

```javascript
// src/contexts/AuthContext.jsx
import React, { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('accessToken'));

  useEffect(() => {
    if (token) {
      // Verify token with backend
      verifyToken(token);
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const response = await fetch('http://localhost:3002/api/sso/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const { data } = await response.json();
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    setToken(data.accessToken);
    setUser(data.user);
    return data;
  };

  const logout = async () => {
    await fetch('http://localhost:3002/api/sso/logout', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
```

### 3. Protected Routes

```javascript
// src/components/ProtectedRoute.jsx
import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

export const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) return <div>Loading...</div>;

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/unauthorized" />;
  }

  return children;
};
```

### 4. API Service

```javascript
// src/services/api.js
import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

export const useApi = () => {
  const { token } = useContext(AuthContext);

  const request = async (endpoint, options = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(endpoint, {
      ...options,
      headers
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    return response.json();
  };

  return { request };
};
```

### 5. Supply Chain Dashboard

```javascript
// src/pages/SupplyChainDashboard.jsx
import React, { useEffect, useState } from 'react';
import { useApi } from '../services/api';

export const SupplyChainDashboard = () => {
  const { request } = useApi();
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const data = await request('http://localhost:3001/api/supply-chain/analytics');
        setAnalytics(data.data);
      } catch (error) {
        console.error('Failed to fetch analytics:', error);
      }
    };

    fetchAnalytics();
  }, [request]);

  if (!analytics) return <div>Loading...</div>;

  return (
    <div>
      <h1>Supply Chain Dashboard</h1>
      <div className="summary">
        <div className="card">
          <h3>Total Suppliers</h3>
          <p>{analytics.summary.totalSuppliers}</p>
        </div>
        <div className="card">
          <h3>Pending Orders</h3>
          <p>{analytics.summary.pendingOrders}</p>
        </div>
      </div>
    </div>
  );
};
```

---

## 💾 Database Layer

### 1. Current Mock Implementation

```javascript
// services/supplyChain.service.js uses Map storage
const suppliers = new Map();
const inventory = new Map();
const orders = new Map();
const shipments = new Map();

// Methods add/retrieve from Maps
```

### 2. Migration Path to Real Database

```javascript
// Example: MongoDB migration

// Create models
const supplierModel = {
  name: String,
  email: String,
  phone: String,
  address: String,
  category: String,
  status: String,
  rating: Number,
  createdAt: Date,
  updatedAt: Date
};

// Replace Map with Model
class SupplyChainService {
  async createSupplier(data) {
    const supplier = new Supplier(data);
    return await supplier.save();
  }

  async getSupplier(id) {
    return await Supplier.findById(id);
  }

  async listSuppliers(filters) {
    return await Supplier.find(filters);
  }
}
```

### 3. Environment-Based Switching

```javascript
// services/database.js
const USE_MOCK_DB = process.env.USE_MOCK_DB === 'true';

if (USE_MOCK_DB) {
  module.exports = require('./mock-db');
} else {
  module.exports = require('./mongodb');
}
```

---

## 🔒 Security Considerations

### 1. Token Security

```javascript
// Production configuration
{
  // Use HTTPS only
  "https": true,

  // Secure cookie settings
  "cookie": {
    "secure": true,
    "httpOnly": true,
    "sameSite": "Strict"
  },

  // Token settings
  "jwt": {
    "expiryHours": 1,
    "refreshExpiryDays": 7
  },

  // CORS settings
  "cors": {
    "origins": ["https://yourdomain.com"],
    "credentials": true
  }
}
```

### 2. Rate Limiting

```javascript
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many login attempts'
});

app.post('/api/sso/login', loginLimiter, async (req, res) => {
  // Login logic
});
```

### 3. Input Validation

```javascript
const validateSupplier = (data) => {
  const errors = [];

  if (!data.name || data.name.length < 3) {
    errors.push('Name must be at least 3 characters');
  }

  if (!data.email || !isValidEmail(data.email)) {
    errors.push('Invalid email format');
  }

  if (!data.phone || !isValidPhone(data.phone)) {
    errors.push('Invalid phone format');
  }

  return {
    valid: errors.length === 0,
    errors
  };
};
```

### 4. Data Sanitization

```javascript
const sanitize = (input) => {
  return input
    .trim()
    .replace(/<script>/g, '')
    .replace(/<\/script>/g, '')
    .substring(0, 255);
};
```

---

## ✅ Deployment Checklist

### Pre-Deployment

- [ ] All tests passing (14 SSO + 16 Supply Chain = 30+)
- [ ] Code reviewed and approved
- [ ] Environment variables configured
- [ ] Database schema applied
- [ ] CORS origins configured
- [ ] JWT secrets changed from defaults
- [ ] Rate limiting configured
- [ ] Error handling verified
- [ ] Logging enabled
- [ ] Documentation updated

### Deployment Steps

#### 1. Install Dependencies
```bash
cd erp_new_system/backend
npm install
```

#### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with production values
```

#### 3. Run Tests
```bash
npm test
```

#### 4. Start Servers
```bash
# Terminal 1: SSO Server
npm run start:sso

# Terminal 2: Main Server
npm start
```

#### 5. Verify Endpoints
```bash
# Check SSO
curl http://localhost:3002/api/sso/health

# Check Main Server
curl http://localhost:3001/api/supply-chain/status
```

### Post-Deployment

- [ ] Monitor error logs
- [ ] Verify all endpoints accessible
- [ ] Test login workflow
- [ ] Test supply chain operations
- [ ] Check database backups
- [ ] Enable monitoring/alerting
- [ ] Document deployment notes
- [ ] Schedule follow-up review

---

## 🧪 Testing Integration

### Unit Tests
```bash
npm test -- tests/sso-e2e-fixed.test.js
npm test -- tests/supply-chain.test.js
```

### Integration Tests
```bash
npm test -- tests/integration/
```

### Load Testing
```bash
npm run load-test
```

---

**System Integration Guide v1.0.0**  
**Last Updated:** 2026-02-18  
**Status:** Production Ready
