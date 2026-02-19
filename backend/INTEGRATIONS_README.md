# 🔧 External Integration Systems - Complete Guide

## Overview

This system integrates with major external services for:

- **Payments**: Stripe & PayPal
- **Email**: SendGrid & SMTP
- **SMS & WhatsApp**: Twilio
- **Video Conferencing**: Zoom
- **Calendar**: Google Calendar

## Status

| Integration     | Status   | Priority | Setup Time |
| --------------- | -------- | -------- | ---------- |
| Stripe          | ✅ READY | CRITICAL | 15 min     |
| PayPal          | ✅ READY | HIGH     | 20 min     |
| SendGrid        | ✅ READY | CRITICAL | 10 min     |
| Twilio          | ✅ READY | CRITICAL | 15 min     |
| Zoom            | ✅ READY | HIGH     | 20 min     |
| Google Calendar | ✅ READY | MEDIUM   | 25 min     |

## Quick Start

### 1. Run Setup Script

**Windows (PowerShell):**

```powershell
cd backend
.\setup-integrations.ps1
```

**Linux/Mac (Bash):**

```bash
cd backend
chmod +x setup-integrations.sh
./setup-integrations.sh
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your credentials:

```env
# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

# PayPal
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
PAYPAL_MODE=sandbox

# SendGrid
SENDGRID_API_KEY=SG....
SENDGRID_FROM_EMAIL=noreply@yourdomain.com

# Twilio
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_WHATSAPP_NUMBER=+1234567890

# Zoom
ZOOM_CLIENT_ID=...
ZOOM_CLIENT_SECRET=...
ZOOM_ACCOUNT_ID=...

# Google
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:3001/auth/google/callback
```

### 3. Start Server

```bash
npm start
```

### 4. Verify Setup

```bash
# Check integration health
curl http://localhost:3001/api/v1/integrations/health
```

## Integration Details

### 💳 Payment Integrations

#### Stripe

- **API Endpoints**:
  - `POST /api/v1/integrations/payments/stripe/intent` - Create payment intent
  - `POST /api/v1/integrations/payments/stripe/confirm` - Confirm payment
  - `GET /api/v1/integrations/payments/:paymentId/status` - Get status

- **Features**:
  - ✅ Payment intents
  - ✅ Subscription management
  - ✅ Refunds
  - ✅ Invoice generation
  - ✅ Webhook support

- **Setup**: See `INTEGRATION_SETUP_GUIDE.js` -> `stripe.steps`

#### PayPal

- **API Endpoints**:
  - `POST /api/v1/integrations/payments/paypal/create` - Create payment
  - `POST /api/v1/integrations/payments/paypal/execute` - Execute payment
  - `POST /api/v1/integrations/payments/refund` - Refund

- **Features**:
  - ✅ Payment creation
  - ✅ Payment execution
  - ✅ Subscription support
  - ✅ Refund management

### 📧 Email Integrations

#### SendGrid

- **API Endpoints**:
  - `POST /api/v1/integrations/email/send` - Send email
  - `POST /api/v1/integrations/email/verify-send` - Send verification
  - `POST /api/v1/integrations/email/password-reset` - Send reset link
  - `POST /api/v1/integrations/email/invoice` - Send invoice
  - `POST /api/v1/integrations/email/bulk` - Send bulk emails

- **Features**:
  - ✅ Single email sending
  - ✅ Bulk email campaigns
  - ✅ Email templates
  - ✅ Delivery tracking
  - ✅ SMTP fallback support

- **Example**:

```javascript
const result = await emailService.sendEmail({
  to: 'user@example.com',
  subject: 'Welcome!',
  html: '<p>Welcome to our system</p>',
  text: 'Welcome to our system',
});
```

### 📱 SMS & WhatsApp (Twilio)

#### SMS

- **API Endpoints**:
  - `POST /api/v1/integrations/sms/send` - Send SMS
  - `POST /api/v1/integrations/sms/verification-code` - Send code
  - `POST /api/v1/integrations/sms/otp` - Send OTP
  - `POST /api/v1/integrations/sms/alert` - Send alert
  - `POST /api/v1/integrations/sms/bulk` - Send bulk SMS
  - `GET /api/v1/integrations/sms/:messageSid/status` - Get status

- **Features**:
  - ✅ SMS sending
  - ✅ Bulk SMS
  - ✅ Delivery tracking
  - ✅ Verification codes
  - ✅ OTP support

#### WhatsApp

- **API Endpoints**:
  - `POST /api/v1/integrations/whatsapp/send` - Send message

- **Features**:
  - ✅ WhatsApp messages
  - ✅ Media support
  - ✅ Template messages

- **Example**:

```javascript
const result = await smsService.sendSMS(
  '+1234567890',
  'Your verification code is: 123456'
);

const waResult = await smsService.sendWhatsApp(
  '+1234567890',
  'Hello from WhatsApp!'
);
```

### 🎥 Video Conferencing (Zoom)

#### Zoom Meetings

- **API Endpoints**:
  - `POST /api/v1/integrations/zoom/create` - Create meeting
  - `GET /api/v1/integrations/zoom/:meetingId` - Get details
  - `DELETE /api/v1/integrations/zoom/:meetingId` - Delete meeting
  - `GET /api/v1/integrations/zoom/:meetingId/recordings` - Get recordings

- **Features**:
  - ✅ Meeting creation
  - ✅ Recurring meetings
  - ✅ Attendee management
  - ✅ Recording management
  - ✅ Authentication

- **Example**:

```javascript
const meeting = await videoService.createZoomMeeting({
  topic: 'Team Meeting',
  startTime: '2025-02-15T10:00:00Z',
  duration: 60,
  settings: {
    host_video: true,
    participant_video: true,
  },
});

console.log(meeting.joinUrl); // Share with participants
```

### 📅 Calendar (Google Calendar)

#### Google Calendar

- **API Endpoints**:
  - `POST /api/v1/integrations/calendar/google/event` - Create event
  - `GET /api/v1/integrations/calendar/google/events` - List events
  - `PUT /api/v1/integrations/calendar/google/event/:eventId` - Update event
  - `DELETE /api/v1/integrations/calendar/google/event/:eventId` - Delete event

- **Features**:
  - ✅ Event creation
  - ✅ Event management
  - ✅ Attendee management
  - ✅ Reminders
  - ✅ Calendar sharing

- **Example**:

```javascript
const event = await calendarService.createGoogleCalendarEvent(
  {
    summary: 'Team Meeting',
    description: 'Quarterly planning',
    startTime: '2025-02-15T10:00:00Z',
    endTime: '2025-02-15T11:00:00Z',
    attendees: ['john@example.com', 'jane@example.com'],
    reminders: [{ method: 'email', minutes: 30 }],
  },
  userTokens
);
```

## API Usage Examples

### Create Stripe Payment

```bash
curl -X POST http://localhost:3001/api/v1/integrations/payments/stripe/intent \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 99.99,
    "currency": "USD",
    "description": "Product purchase",
    "metadata": {"orderId": "12345"}
  }'
```

### Send Email

```bash
curl -X POST http://localhost:3001/api/v1/integrations/email/send \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "user@example.com",
    "subject": "Welcome!",
    "html": "<h1>Welcome</h1>",
    "text": "Welcome to our system"
  }'
```

### Send SMS

```bash
curl -X POST http://localhost:3001/api/v1/integrations/sms/send \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+1234567890",
    "message": "Your verification code is: 123456"
  }'
```

### Create Zoom Meeting

```bash
curl -X POST http://localhost:3001/api/v1/integrations/zoom/create \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "Team Meeting",
    "startTime": "2025-02-15T10:00:00Z",
    "duration": 60
  }'
```

## Service Files

| Service        | Location                                          | Functions             |
| -------------- | ------------------------------------------------- | --------------------- |
| Payment        | `services/payment-integrations.service.js`        | Stripe, PayPal        |
| Email          | `services/email-integrations.service.js`          | SendGrid, SMTP        |
| SMS            | `services/sms-integrations.service.js`            | Twilio SMS, WhatsApp  |
| Video/Calendar | `services/video-calendar-integrations.service.js` | Zoom, Google Calendar |
| Routes         | `routes/integrations.v1.js`                       | All endpoints         |

## Troubleshooting

### Issue: API keys not working

**Solution**:

1. Verify credentials are correct
2. Check environment variables are loaded
3. Verify API keys are active (not revoked)
4. For development, use test keys (sk*test*, pk*test*)

### Issue: Emails not sending

**Solution**:

1. Check SendGrid API key is valid
2. Verify sender email is verified
3. Check spam folder
4. Enable "Less secure apps" if using Gmail SMTP

### Issue: SMS not delivering

**Solution**:

1. Verify phone number format (+1234567890)
2. Check Twilio account balance
3. Ensure number supports SMS
4. Verify SID and Auth Token

### Issue: Zoom meeting creation failing

**Solution**:

1. Verify OAuth credentials
2. Check scopes are enabled
3. Ensure Account ID is correct
4. Check rate limiting

## Mock Mode

For development and testing without real API keys, the system supports mock
mode:

```javascript
// Mock mode automatically activates when:
// - API key environment variables are not set
// - NODE_ENV=test
// - MOCK_EXTERNAL_APIS=true

// Mock responses are realistic and follow actual API formats
const mockResult = await stripeService.createStripePaymentIntent({...});
// Returns: { success: true, paymentIntentId: 'MOCK-...', ... }
```

## Webhook Support

### Stripe Webhooks

Set up in Stripe Dashboard:

- Endpoint: `https://yourdomain.com/webhooks/stripe`
- Events: `payment_intent.succeeded`, `payment_intent.payment_failed`

### PayPal Webhooks

Set up in PayPal Developer:

- Endpoint: `https://yourdomain.com/webhooks/paypal`
- Events: `PAYMENT.SALE.COMPLETED`, `PAYMENT.SALE.DENIED`

## Rate Limiting

- Stripe: 100 req/s (per account)
- SendGrid: 600 req/min (free tier)
- Twilio: Based on account type
- Zoom: 100 req/sec (per account)
- Google: 1000 req/sec (default)

## Security Considerations

1. **Never commit .env file** with real credentials
2. **Rotate API keys** regularly
3. **Use HTTPS only** in production
4. **Validate input** before sending to APIs
5. **Monitor webhook signatures** for authenticity
6. **Store secrets** securely (not in code)
7. **Enable 2FA** on all integration accounts

## Support & Documentation

- **Stripe**: https://stripe.com/docs
- **PayPal**: https://developer.paypal.com/docs/
- **SendGrid**: https://docs.sendgrid.com/
- **Twilio**: https://www.twilio.com/docs/
- **Zoom**: https://developers.zoom.us/docs/
- **Google Calendar**: https://developers.google.com/calendar/

## Next Steps

1. ✅ Setup all integrations using the setup script
2. ✅ Configure environment variables
3. ✅ Test each integration endpoint
4. ✅ Setup webhooks (optional)
5. ✅ Monitor in production
6. ✅ Handle errors and edge cases
7. ✅ Implement retry logic
8. ✅ Add monitoring and alerting

## Version Info

- **Integration Framework**: v1.0.0
- **Last Updated**: 2025-02-01
- **Status**: Production Ready ✅
