# 📚 Complete API Documentation - Alawael Enterprise Platform

**Version:** 1.0.0  
**Base URL:** `https://api.alawael.com/api` (Production)  
**Local Dev:** `http://localhost:3000/api`

---

## 🗂️ API Categories

1. **[Authentication](#authentication)** - User login, registration, 2FA
2. **[User Management](#user-management)** - User profiles, roles, permissions
3. **[E-Commerce](#e-commerce)** - Products, cart, checkout, payments
4. **[ML/Predictions](#mlpredictions)** - AI forecasts, recommendations
5. **[Orders & Inventory](#orders--inventory)** - Order management, stock
6. **[Analytics](#analytics)** - Reports, dashboards, metrics
7. **[Notifications](#notifications)** - Email, SMS, push notifications
8. **[Integration Hub](#integration-hub)** - Third-party integrations

---

## 🔐 Authentication

### Register User
**POST** `/auth/register`

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+1234567890"
  }'
```

**Response:**
```json
{
  "status": "success",
  "user": {
    "id": "670a1b2c3d4e5f6g7h8i9j0k",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "user",
    "createdAt": "2026-02-22T10:30:00Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Login
**POST** `/auth/login`

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!"
  }'
```

### Enable Two-Factor Authentication (2FA)
**POST** `/auth/2fa/enable`

```bash
curl -X POST http://localhost:3000/api/auth/2fa/enable \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:** QR code and backup codes

### Verify 2FA Token
**POST** `/auth/2fa/verify`

```bash
curl -X POST http://localhost:3000/api/auth/2fa/verify \
  -H "Content-Type: application/json" \
  -d '{
    "code": "123456"
  }'
```

---

## 👥 User Management

### Get User Profile
**GET** `/users/:userId`

```bash
curl -X GET http://localhost:3000/api/users/670a1b2c3d4e5f6g7h8i9j0k \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "id": "670a1b2c3d4e5f6g7h8i9j0k",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890",
  "role": "user",
  "avatar": "https://...",
  "createdAt": "2026-02-22T10:30:00Z",
  "updatedAt": "2026-02-22T10:30:00Z"
}
```

### Update User Profile
**PUT** `/users/:userId`

```bash
curl -X PUT http://localhost:3000/api/users/670a1b2c3d4e5f6g7h8i9j0k \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Jane",
    "phone": "+0987654321"
  }'
```

### Change Password
**POST** `/users/:userId/change-password`

```bash
curl -X POST http://localhost:3000/api/users/670a1b2c3d4e5f6g7h8i9j0k/change-password \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "oldPassword": "OldPassword123!",
    "newPassword": "NewPassword456!"
  }'
```

---

## 🛍️ E-Commerce

### List Products
**GET** `/ecommerce/products`

**Query Parameters:**
- `page` (default: 1) - Page number
- `limit` (default: 10) - Items per page
- `category` - Filter by category
- `sort` - Sort field (price, name, rating)
- `order` - asc or desc
- `minPrice` - Minimum price filter
- `maxPrice` - Maximum price filter

```bash
curl -X GET "http://localhost:3000/api/ecommerce/products?category=electronics&page=1&limit=20" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "status": "success",
  "page": 1,
  "limit": 20,
  "total": 150,
  "products": [
    {
      "id": "789xyz",
      "name": "Laptop Pro",
      "category": "electronics",
      "price": 1299.99,
      "rating": 4.8,
      "reviews": 250,
      "inventory": 45,
      "description": "High-performance laptop...",
      "images": ["https://..."],
      "variants": [
        {
          "size": "13-inch",
          "color": "Silver",
          "sku": "LP13S"
        }
      ]
    }
  ]
}
```

### Get Product Details
**GET** `/ecommerce/products/:productId`

```bash
curl -X GET http://localhost:3000/api/ecommerce/products/789xyz \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Search Products
**GET** `/ecommerce/products/search`

```bash
curl -X GET "http://localhost:3000/api/ecommerce/products/search?query=laptop&limit=10"
```

### Add to Cart
**POST** `/ecommerce/cart`

```bash
curl -X POST http://localhost:3000/api/ecommerce/cart \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "789xyz",
    "quantity": 2,
    "variant": {
      "size": "13-inch",
      "color": "Silver"
    }
  }'
```

### Get Cart
**GET** `/ecommerce/cart`

```bash
curl -X GET http://localhost:3000/api/ecommerce/cart \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "status": "success",
  "cart": {
    "id": "cart123",
    "userId": "670a1b2c3d4e5f6g7h8i9j0k",
    "items": [
      {
        "productId": "789xyz",
        "name": "Laptop Pro",
        "price": 1299.99,
        "quantity": 2,
        "subtotal": 2599.98
      }
    ],
    "subtotal": 2599.98,
    "tax": 259.99,
    "shipping": 10.00,
    "discount": 0,
    "total": 2869.97,
    "updatedAt": "2026-02-22T10:30:00Z"
  }
}
```

### Apply Coupon
**POST** `/ecommerce/cart/coupon`

```bash
curl -X POST http://localhost:3000/api/ecommerce/cart/coupon \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "couponCode": "SAVE2026"
  }'
```

### Create Checkout Session
**POST** `/ecommerce/checkout`

```bash
curl -X POST http://localhost:3000/api/ecommerce/checkout \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "shippingAddress": {
      "street": "123 Main St",
      "city": "New York",
      "state": "NY",
      "zipCode": "10001",
      "country": "USA"
    },
    "shippingMethod": "standard"
  }'
```

**Response:**
```json
{
  "status": "success",
  "checkoutSession": {
    "id": "checkout_abc123",
    "sessionId": "sess_xyz789",
    "cartTotal": 2869.97,
    "expiresAt": "2026-02-22T11:30:00Z",
    "paymentUrl": "https://stripe.example.com/pay/..."
  }
}
```

---

## 🤖 ML/Predictions

### Forecast Order Demand
**POST** `/ml/forecast/orders`

```bash
curl -X POST http://localhost:3000/api/ml/forecast/orders \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "789xyz",
    "months": 6
  }'
```

**Response:**
```json
{
  "status": "success",
  "forecast": {
    "productId": "789xyz",
    "productName": "Laptop Pro",
    "forecastMonths": 6,
    "predictions": [
      {
        "month": "2026-03",
        "predictedDemand": 150,
        "confidence": 0.92,
        "trend": "up"
      },
      {
        "month": "2026-04",
        "predictedDemand": 165,
        "confidence": 0.88,
        "trend": "up"
      }
    ],
    "generatedAt": "2026-02-22T10:30:00Z"
  }
}
```

### Predict Customer Churn
**POST** `/ml/churn/predict`

```bash
curl -X POST http://localhost:3000/api/ml/churn/predict \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "670a1b2c3d4e5f6g7h8i9j0k"
  }'
```

### Get Product Recommendations
**POST** `/ml/recommendations/products`

```bash
curl -X POST http://localhost:3000/api/ml/recommendations/products \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "customerPreferences": [
      "electronics",
      "premium"
    ],
    "limit": 10
  }'
```

### Optimize Inventory
**POST** `/ml/inventory/optimize`

```bash
curl -X POST http://localhost:3000/api/ml/inventory/optimize \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "status": "success",
  "optimization": {
    "recommendations": [
      {
        "productId": "789xyz",
        "productName": "Laptop Pro",
        "currentStock": 45,
        "optimalQuantity": 75,
        "eoq": 123,
        "recommendedAction": "reorder",
        "estimatedCost": 97425.00
      }
    ],
    "totalOptimizationSavings": 15000.00
  }
}
```

### Detect Anomalies
**POST** `/ml/anomalies/detect`

```bash
curl -X POST http://localhost:3000/api/ml/anomalies/detect \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 📦 Orders & Inventory

### Create Order
**POST** `/orders`

```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "cartId": "cart123",
    "paymentMethod": "credit_card",
    "shippingAddress": {
      "street": "123 Main St",
      "city": "New York",
      "state": "NY",
      "zipCode": "10001"
    }
  }'
```

### Get Orders
**GET** `/orders`

```bash
curl -X GET "http://localhost:3000/api/orders?status=pending&page=1" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Update Order Status
**PUT** `/orders/:orderId/status`

```bash
curl -X PUT http://localhost:3000/api/orders/order123/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "shipped",
    "trackingNumber": "1Z99912345678"
  }'
```

### Get Inventory
**GET** `/inventory`

```bash
curl -X GET http://localhost:3000/api/inventory \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Update Inventory
**PUT** `/inventory/:productId`

```bash
curl -X PUT http://localhost:3000/api/inventory/789xyz \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "quantity": 100,
    "reason": "restock"
  }'
```

---

## 📊 Analytics

### Get Dashboard Metrics
**GET** `/analytics/dashboard`

```bash
curl -X GET "http://localhost:3000/api/analytics/dashboard?period=month" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "status": "success",
  "metrics": {
    "totalRevenue": 125000.00,
    "totalOrders": 245,
    "averageOrderValue": 510.20,
    "conversionRate": 0.035,
    "customerCount": 1850,
    "topProducts": [...],
    "dailyRevenue": [...]
  }
}
```

### Generate Report
**POST** `/analytics/reports`

```bash
curl -X POST http://localhost:3000/api/analytics/reports \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reportType": "sales",
    "startDate": "2026-01-01",
    "endDate": "2026-02-22",
    "format": "pdf"
  }'
```

---

## 📬 Notifications

### Send Email Notification
**POST** `/notifications/email`

```bash
curl -X POST http://localhost:3000/api/notifications/email \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recipientEmail": "user@example.com",
    "subject": "Order Confirmation",
    "template": "order_confirmation",
    "data": {
      "orderNumber": "ORD-123456",
      "total": 2869.97
    }
  }'
```

### Subscribe to Push Notifications
**POST** `/notifications/push/subscribe`

```bash
curl -X POST http://localhost:3000/api/notifications/push/subscribe \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "pushToken": "ExponentPushToken[xxxxx]"
  }'
```

---

## 🔌 Integration Hub

### List Integrations
**GET** `/integrations`

```bash
curl -X GET http://localhost:3000/api/integrations \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Configure Integration
**POST** `/integrations/:integration/configure`

```bash
curl -X POST http://localhost:3000/api/integrations/shopify/configure \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "shppa_xxxxx",
    "accessToken": "shpat_xxxxx"
  }'
```

---

## 🔒 Error Handling

### Common Error Responses

**401 Unauthorized**
```json
{
  "status": "error",
  "code": "UNAUTHORIZED",
  "message": "Authentication token is missing or invalid"
}
```

**400 Bad Request**
```json
{
  "status": "error",
  "code": "VALIDATION_ERROR",
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

**404 Not Found**
```json
{
  "status": "error",
  "code": "NOT_FOUND",
  "message": "Resource not found"
}
```

**500 Server Error**
```json
{
  "status": "error",
  "code": "INTERNAL_ERROR",
  "message": "An unexpected error occurred"
}
```

---

## 📌 Authentication Headers

All protected endpoints require:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

## Rate Limiting

- **Limit:** 1000 requests per 15 minutes
- **Header:** `X-RateLimit-Remaining`

---

## ✅ API Health Check

**GET** `/health`

```bash
curl http://localhost:3000/api/health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-02-22T10:30:00Z",
  "version": "1.0.0",
  "uptime": 3600,
  "database": "connected",
  "redis": "connected"
}
```

---

**Last Updated:** February 22, 2026  
**API Version:** 1.0.0
