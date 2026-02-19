# 🔌 Complete Integration API Reference

## Base URL

```
http://localhost:3001/api/v1/integrations
```

## Authentication

All endpoints (except health) require:

```
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

---

## 💳 PAYMENT INTEGRATIONS (7 Endpoints)

### Stripe Payment Intent

```
POST /payments/stripe/intent

Request:
{
  "amount": 99.99,
  "currency": "USD",
  "description": "Product purchase",
  "metadata": {
    "orderId": "12345",
    "email": "user@example.com"
  }
}

Response:
{
  "success": true,
  "paymentIntentId": "pi_1234567890",
  "clientSecret": "pi_1234567890_secret_key",
  "amount": 99.99,
  "currency": "USD"
}
```

### Confirm Stripe Payment

```
POST /payments/stripe/confirm

Request:
{
  "paymentIntentId": "pi_1234567890",
  "paymentMethodId": "pm_1234567890"
}

Response:
{
  "success": true,
  "status": "succeeded",
  "paymentIntentId": "pi_1234567890"
}
```

### Create PayPal Payment

```
POST /payments/paypal/create

Request:
{
  "amount": 99.99,
  "currency": "USD",
  "description": "Product purchase"
}

Response:
{
  "success": true,
  "paymentId": "PAYID-123456",
  "approvalUrl": "https://www.paypal.com/checkoutnow?token=..."
}
```

### Execute PayPal Payment

```
POST /payments/paypal/execute

Request:
{
  "paymentId": "PAYID-123456",
  "payerId": "PAYER123"
}

Response:
{
  "success": true,
  "status": "approved",
  "paymentId": "PAYID-123456"
}
```

### Refund Payment

```
POST /payments/refund

Request:
{
  "paymentId": "507f1f77bcf86cd799439011",
  "reason": "Customer requested refund"
}

Response:
{
  "success": true,
  "refundId": "re_1234567890",
  "status": "refunded"
}
```

### Get Payment Status

```
GET /payments/:paymentId/status

Response:
{
  "success": true,
  "status": "succeeded",
  "provider": "stripe",
  "amount": 99.99,
  "currency": "USD"
}
```

### List User Payments

```
GET /payments/history?limit=20&page=1

Response:
{
  "success": true,
  "payments": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "amount": 99.99,
      "status": "completed",
      "provider": "stripe",
      "createdAt": "2025-02-01T10:00:00Z"
    }
  ],
  "pagination": {
    "total": 50,
    "page": 1,
    "limit": 20,
    "pages": 3
  }
}
```

---

## 📧 EMAIL INTEGRATIONS (7 Endpoints)

### Send Email

```
POST /email/send

Request:
{
  "to": "user@example.com",
  "subject": "Welcome to our platform",
  "html": "<h1>Welcome!</h1><p>Thank you for signing up</p>",
  "text": "Welcome to our platform",
  "cc": ["manager@example.com"],
  "bcc": ["archive@example.com"]
}

Response:
{
  "success": true,
  "provider": "sendgrid",
  "messageId": "message_123456",
  "status": "sent"
}
```

### Send Verification Email

```
POST /email/verify-send

Request:
{
  "verificationToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}

Response:
{
  "success": true,
  "messageId": "message_123456",
  "status": "sent"
}
```

### Send Password Reset Email

```
POST /email/password-reset

Request:
{
  "email": "user@example.com",
  "resetToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}

Response:
{
  "success": true,
  "messageId": "message_123456",
  "status": "sent"
}
```

### Send Invoice Email

```
POST /email/invoice

Request:
{
  "invoiceData": {
    "invoiceNumber": "INV-2025-001",
    "amount": 299.99,
    "dueDate": "2025-03-01",
    "items": [
      {
        "description": "Premium Plan",
        "quantity": 1,
        "price": 299.99
      }
    ]
  }
}

Response:
{
  "success": true,
  "messageId": "message_123456",
  "status": "sent"
}
```

### Send Notification Email

```
POST /email/notification

Request:
{
  "to": "user@example.com",
  "notificationData": {
    "title": "New Order",
    "message": "Your order #12345 has been shipped",
    "actionUrl": "https://yourdomain.com/orders/12345",
    "actionText": "Track Order"
  }
}

Response:
{
  "success": true,
  "messageId": "message_123456",
  "status": "sent"
}
```

### Send Bulk Email

```
POST /email/bulk

Request:
{
  "recipients": [
    { "email": "user1@example.com", "name": "User 1" },
    { "email": "user2@example.com", "name": "User 2" }
  ],
  "template": {
    "subject": "Monthly Newsletter",
    "html": "<p>Hello {{name}}, here's your newsletter</p>"
  }
}

Response:
{
  "success": true,
  "results": [...],
  "summary": {
    "total": 2,
    "successful": 2,
    "failed": 0
  }
}
```

---

## 📱 SMS & MESSAGING INTEGRATIONS (8 Endpoints)

### Send SMS

```
POST /sms/send

Request:
{
  "phoneNumber": "+1234567890",
  "message": "Your code: 123456"
}

Response:
{
  "success": true,
  "messageSid": "SM123456789",
  "status": "queued"
}
```

### Send WhatsApp

```
POST /whatsapp/send

Request:
{
  "phoneNumber": "+1234567890",
  "message": "Hello from WhatsApp!"
}

Response:
{
  "success": true,
  "messageSid": "WA123456789",
  "status": "queued"
}
```

---

## 🎥 VIDEO & CALENDAR INTEGRATIONS (7 Endpoints)

### Create Zoom Meeting

```
POST /zoom/create

Request:
{
  "topic": "Team Meeting",
  "startTime": "2025-02-15T10:00:00Z",
  "duration": 60
}

Response:
{
  "success": true,
  "meetingId": 85123456789,
  "joinUrl": "https://zoom.us/j/85123456789"
}
```

### Create Google Calendar Event

```
POST /calendar/google/event

Request:
{
  "summary": "Meeting",
  "startTime": "2025-02-20T14:00:00Z",
  "endTime": "2025-02-20T15:00:00Z",
  "attendees": ["user@example.com"]
}

Response:
{
  "success": true,
  "eventId": "abc123def456",
  "htmlLink": "https://calendar.google.com/..."
}
```

---

## 🏥 HEALTH & STATUS (1 Endpoint)

### Check Integration Health

```
GET /health

Response:
{
  "success": true,
  "status": "healthy",
  "integrations": {
    "stripe": "configured",
    "paypal": "configured",
    "sendgrid": "configured",
    "twilio": "configured",
    "zoom": "configured",
    "google": "configured"
  }
}
```

Last Updated: 2025-02-01
