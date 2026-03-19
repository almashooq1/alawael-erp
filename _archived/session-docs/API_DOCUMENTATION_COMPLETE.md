# 📚 Complete API Documentation

**Version:** 1.0.0  
**Last Updated:** 2026-02-18  
**Status:** ✅ Complete

---

## 📑 Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [SSO API](#sso-api)
4. [Supply Chain API](#supply-chain-api)
5. [Common Responses](#common-responses)
6. [Error Handling](#error-handling)
7. [Rate Limiting](#rate-limiting)
8. [Best Practices](#best-practices)

---

## 🎯 Overview

### Base URLs

**Main Server**
```
http://localhost:3001
```

**Standalone SSO Server**
```
http://localhost:3002
```

### Environment Configuration

```env
NODE_ENV=development
PORT=3001
SSO_PORT=3002
USE_MOCK_CACHE=true
USE_MOCK_DB=true
CORS_ORIGIN=http://localhost:3000
```

### API Versioning

Current version: **v1.0.0**  
All endpoints are currently on v1 (implicit)

---

## 🔐 Authentication

### JWT Token Format

Tokens are JWT (JSON Web Tokens) with the following claims:

```javascript
{
  "userId": "user_123",           // Unique user ID
  "email": "user@example.com",    // User email
  "role": "user",                 // User role
  "permissions": ["read"],        // Permissions array
  "organizationId": "org_1",      // Organization ID
  "sessionId": "session_hash",    // Session identifier
  "type": "access",               // Token type (access/refresh)
  "iat": 1771429095013,          // Issued at timestamp
  "exp": 1771432695013           // Expiration timestamp
}
```

### Token Types

- **Access Token** - Used for API requests (3 hours TTL)
- **Refresh Token** - Used to get new access token (7 days TTL)
- **ID Token** - OpenID Connect token (3 hours TTL)

### Using Tokens

```javascript
// In HTTP headers
fetch('http://localhost:3001/api/protected-endpoint', {
  headers: {
    'Authorization': 'Bearer {accessToken}'
  }
});

// In query parameters (not recommended)
GET /api/endpoint?token={accessToken}
```

---

## 🔑 SSO API

Base: `http://localhost:3002/api/sso`

### 1. User Authentication

#### Login - Standard
```http
POST /login

Request Headers:
- Content-Type: application/json

Request Body:
{
  "email": "user@example.com",
  "password": "password123",
  "deviceId": "device_uuid",
  "userAgent": "Mozilla/5.0..."
}

Response: 200 OK
{
  "success": true,
  "data": {
    "sessionId": "session_hash",
    "accessToken": "jwt_token",
    "refreshToken": "jwt_token",
    "idToken": "jwt_token",
    "expiresIn": 3600000,
    "user": {
      "userId": "user_123",
      "email": "user@example.com",
      "name": "User Name",
      "role": "user",
      "permissions": ["read"]
    }
  }
}
```

#### Logout
```http
POST /logout

Request Headers:
- Content-Type: application/json
- Authorization: Bearer {accessToken}

Response: 200 OK
{
  "success": true,
  "message": "Logged out successfully"
}
```

#### Logout All Sessions
```http
POST /logout-all

Request Headers:
- Authorization: Bearer {accessToken}

Response: 200 OK
{
  "success": true,
  "message": "All sessions terminated"
}
```

### 2. Token Management

#### Verify Token
```http
POST /verify-token

Request Body:
{
  "token": "jwt_token"
}

Response: 200 OK
{
  "success": true,
  "valid": true,
  "user": { user object }
}
```

#### Refresh Token
```http
POST /refresh-token

Request Body:
{
  "refreshToken": "jwt_token"
}

Response: 200 OK
{
  "success": true,
  "data": {
    "accessToken": "new_jwt_token",
    "refreshToken": "new_jwt_token",
    "expiresIn": 3600000
  }
}
```

#### Introspect Token
```http
POST /introspect

Request Body:
{
  "token": "jwt_token"
}

Response: 200 OK
{
  "success": true,
  "active": true,
  "scope": "openid profile email",
  "clientId": "sso-client",
  "exp": 1771432695013
}
```

### 3. Session Management

#### List Sessions
```http
GET /sessions

Request Headers:
- Authorization: Bearer {accessToken}

Response: 200 OK
{
  "success": true,
  "data": {
    "total": 3,
    "sessions": [
      {
        "sessionId": "session_hash",
        "deviceId": "device_uuid",
        "createdAt": "2026-02-18T15:00:00Z",
        "lastActivity": "2026-02-18T15:30:00Z",
        "ipAddress": "192.168.1.1"
      }
    ]
  }
}
```

#### Get User Info
```http
GET /userinfo

Request Headers:
- Authorization: Bearer {accessToken}

Response: 200 OK
{
  "success": true,
  "data": {
    "userId": "user_123",
    "email": "user@example.com",
    "name": "User Name",
    "role": "user",
    "permissions": ["read"],
    "organizationId": "org_1"
  }
}
```

### 4. OAuth 2.0

#### Authorize
```http
GET /oauth2/authorize

Query Parameters:
- client_id: string (required)
- redirect_uri: URL (required)
- response_type: "code" (required)
- scope: "openid profile email" (optional)
- state: string (recommended)

Response: 302 Redirect
Location: {redirect_uri}?code={auth_code}&state={state}
```

#### Token Exchange
```http
POST /oauth2/token

Request Body:
{
  "grant_type": "authorization_code",
  "code": "auth_code",
  "client_id": "sso-client",
  "client_secret": "secret",
  "redirect_uri": "http://localhost:3000/callback"
}

Response: 200 OK
{
  "access_token": "jwt_token",
  "refresh_token": "jwt_token",
  "id_token": "jwt_token",
  "expires_in": 3600,
  "token_type": "Bearer"
}
```

#### User Info (OAuth)
```http
GET /oauth2/userinfo

Request Headers:
- Authorization: Bearer {accessToken}

Response: 200 OK
{
  "sub": "user_123",
  "email": "user@example.com",
  "email_verified": true,
  "name": "User Name",
  "picture": "https://...",
  "locale": "en"
}
```

### 5. Health & Status

#### Health Check
```http
GET /health

Response: 200 OK
{
  "status": "healthy",
  "service": "SSO",
  "timestamp": "2026-02-18T15:35:00Z",
  "uptime": 564.387
}
```

#### Status
```http
GET /status

Response: 200 OK
{
  "success": true,
  "status": "operational",
  "message": "SSO system is operational",
  "features": {
    "sessions": true,
    "oauth2": true,
    "openid_connect": true,
    "mfa": false,
    "audit_logging": true
  }
}
```

---

## 🚚 Supply Chain API

Base: `http://localhost:3001/api/supply-chain`

### 1. Suppliers

#### Create Supplier
```http
POST /suppliers

Request:
{
  "name": "Supplier Name",
  "email": "contact@supplier.com",
  "phone": "+966-500-000-000",
  "address": "Address",
  "category": "electronics"
}

Response: 201 Created
{
  "success": true,
  "data": { supplier }
}
```

#### List Suppliers
```http
GET /suppliers?category=electronics&status=active&minRating=3&limit=50

Response: 200 OK
{
  "success": true,
  "data": {
    "total": 10,
    "suppliers": [ ... ]
  }
}
```

#### Get Supplier
```http
GET /suppliers/{id}

Response: 200 OK
{
  "success": true,
  "data": { supplier }
}
```

#### Update Supplier
```http
PUT /suppliers/{id}

Request:
{
  "status": "active",
  "rating": 4.5
}

Response: 200 OK
{
  "success": true,
  "data": { supplier }
}
```

### 2. Inventory

#### Add Product
```http
POST /inventory

Request:
{
  "sku": "SKU-001",
  "name": "Product Name",
  "category": "electronics",
  "quantity": 100,
  "minLevel": 10,
  "price": 299.99,
  "unit": "piece",
  "supplierId": "supplier_1"
}

Response: 201 Created
{
  "success": true,
  "data": { product }
}
```

#### Update Stock
```http
PATCH /inventory/{id}

Request:
{
  "quantityChange": 50,
  "reason": "Restock"
}

Response: 200 OK
{
  "success": true,
  "data": {
    "product": { ... },
    "oldQuantity": 100,
    "newQuantity": 150,
    "change": 50
  }
}
```

#### Get Inventory Status
```http
GET /inventory/status

Response: 200 OK
{
  "success": true,
  "data": {
    "totalProducts": 50,
    "totalValue": 150000,
    "lowStock": {
      "count": 5,
      "products": [ ... ]
    },
    "outOfStock": {
      "count": 2,
      "products": [ ... ]
    },
    "healthScore": 85
  }
}
```

### 3. Purchase Orders

#### Create Order
```http
POST /orders

Request:
{
  "supplierId": "supplier_1",
  "items": [
    {
      "productId": "product_1",
      "quantity": 50,
      "unitPrice": 299.99
    }
  ],
  "totalAmount": 14999.50,
  "priority": "high",
  "dueDate": "2026-02-25T00:00:00Z"
}

Response: 201 Created
{
  "success": true,
  "data": { order }
}
```

#### List Orders
```http
GET /orders?status=confirmed&supplierId=supplier_1&limit=50

Response: 200 OK
{
  "success": true,
  "data": {
    "total": 20,
    "orders": [ ... ]
  }
}
```

#### Update Order Status
```http
PATCH /orders/{id}/status

Request:
{
  "status": "delivered"
}

Response: 200 OK
{
  "success": true,
  "data": { order }
}
```

### 4. Shipments

#### Create Shipment
```http
POST /shipments

Request:
{
  "orderId": "po_123",
  "carrier": "DHL",
  "estimatedDelivery": "2026-02-23T00:00:00Z"
}

Response: 201 Created
{
  "success": true,
  "data": { shipment }
}
```

#### Update Shipment Status
```http
PATCH /shipments/{id}/status

Request:
{
  "status": "in-transit",
  "location": "Regional Hub"
}

Response: 200 OK
{
  "success": true,
  "data": { shipment }
}
```

#### Track Shipment
```http
GET /shipments/track/{trackingNumber}

Response: 200 OK
{
  "success": true,
  "data": { shipment with history }
}
```

### 5. Analytics

#### Get Dashboard
```http
GET /analytics

Response: 200 OK
{
  "success": true,
  "data": {
    "summary": {
      "totalSuppliers": 10,
      "totalOrders": 150,
      "completedOrders": 120,
      "pendingOrders": 30
    },
    "suppliers": { ... },
    "orders": { ... },
    "shipments": { ... }
  }
}
```

---

## 📋 Common Responses

### Success Response (2xx)
```javascript
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { /* actual data */ }
}
```

### Error Response (4xx, 5xx)
```javascript
{
  "success": false,
  "error": "error_code",
  "message": "Human-readable error message",
  "details": { /* additional details if available */ }
}
```

---

## ⚠️ Error Handling

### Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `400` | Bad Request | Invalid request format |
| `401` | Unauthorized | Missing/invalid token |
| `403` | Forbidden | Insufficient permissions |
| `404` | Not Found | Resource not found |
| `409` | Conflict | Resource already exists |
| `429` | Too Many Requests | Rate limited |
| `500` | Server Error | Internal server error |

### Error Examples

#### Invalid Credentials
```javascript
// Status: 400
{
  "success": false,
  "error": "validation_error",
  "message": "Email and password are required"
}
```

#### Unauthorized
```javascript
// Status: 401
{
  "success": false,
  "error": "unauthorized",
  "message": "Invalid or expired token"
}
```

#### Not Found
```javascript
// Status: 404
{
  "success": false,
  "error": "not_found",
  "message": "Supplier not found"
}
```

---

## 🚦 Rate Limiting

### Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/login` | 5 | 15 minutes |
| `/api/*` | 100 | 1 minute |
| `/oauth2/*` | 20 | 1 minute |

### Rate Limit Headers

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1645155600
```

### Handling Rate Limits

```javascript
if (response.status === 429) {
  const resetTime = parseInt(response.headers['X-RateLimit-Reset']);
  const waitTime = resetTime - Math.floor(Date.now() / 1000);
  console.log(`Please wait ${waitTime} seconds before retrying`);
}
```

---

## 💡 Best Practices

### 1. Authentication Flow
```javascript
// 1. Login to get tokens
const auth = await fetch('http://localhost:3002/api/sso/login', {
  method: 'POST',
  body: JSON.stringify({ email, password })
});

const { accessToken, refreshToken } = await auth.json();

// 2. Store tokens securely
localStorage.setItem('accessToken', accessToken);
localStorage.setItem('refreshToken', refreshToken);

// 3. Use access token for requests
const response = await fetch('http://localhost:3001/api/*', {
  headers: { 'Authorization': `Bearer ${accessToken}` }
});

// 4. Refresh when expired
if (response.status === 401) {
  const refresh = await fetch('http://localhost:3002/api/sso/refresh-token', {
    method: 'POST',
    body: JSON.stringify({ refreshToken })
  });
  const { accessToken: newToken } = await refresh.json();
  localStorage.setItem('accessToken', newToken);
  // Retry original request
}
```

### 2. Error Handling
```javascript
async function apiCall(endpoint, options = {}) {
  try {
    const response = await fetch(endpoint, options);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'API Error');
    }
    
    return await response.json();
  } catch (error) {
    console.error('API Error:', error.message);
    // Show user-friendly message
    showError(error.message);
  }
}
```

### 3. Request Timeout
```javascript
async function fetchWithTimeout(url, options = {}, timeout = 10000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeoutId);
  }
}
```

### 4. Pagination
```javascript
// For large result sets
const suppliers = await fetch(
  'http://localhost:3001/api/supply-chain/suppliers?limit=50&offset=0'
);

const { data } = await suppliers.json();
if (data.total > 50) {
  // Load more...
}
```

---

## 🧪 Testing Endpoints

### Using cURL

```bash
# Health check
curl http://localhost:3002/api/sso/health

# Login
curl -X POST http://localhost:3002/api/sso/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'

# Supply Chain Status
curl http://localhost:3001/api/supply-chain/status
```

### Using JavaScript

```javascript
// Check SSO server
fetch('http://localhost:3002/api/sso/status')
  .then(r => r.json())
  .then(d => console.log('SSO:', d))
  .catch(e => console.error('SSO Error:', e));

// Check Main server + Supply Chain
fetch('http://localhost:3001/api/supply-chain/status')
  .then(r => r.json())
  .then(d => console.log('Supply Chain:', d))
  .catch(e => console.error('Supply Chain Error:', e));
```

---

## 📞 Support

For API issues:
1. Check server is running
2. Verify endpoint URL
3. Check request format matches documentation
4. Review error message from server
5. Check Rate Limit Headers

---

**API Documentation v1.0.0**  
**Last Updated:** 2026-02-18  
**Maintained by:** Development Team
