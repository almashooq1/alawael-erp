/**
 * INTEGRATION SETUP & CONFIGURATION GUIDE
 *
 * This file contains all the necessary setup instructions for integrating
 * external services with the system.
 */

const setupGuide = {
  title: '🔧 External Integration Setup Guide',
  version: '1.0.0',
  lastUpdated: new Date().toISOString(),

  // ============================================================================
  // 1. STRIPE SETUP
  // ============================================================================
  stripe: {
    name: 'Stripe Payment Processing',
    status: 'REQUIRED',
    priority: 'CRITICAL',
    setupTime: '15 minutes',

    steps: [
      {
        step: 1,
        title: 'Create Stripe Account',
        details: 'Visit https://stripe.com and create a free account',
      },
      {
        step: 2,
        title: 'Get API Keys',
        details: `
          1. Go to Dashboard > Developers > API keys
          2. Copy "Publishable key" and "Secret key"
          3. For production, use live keys (not test keys)
        `,
      },
      {
        step: 3,
        title: 'Configure Environment Variables',
        code: `
          STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx
          STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx
        `,
      },
      {
        step: 4,
        title: 'Setup Webhook (Optional)',
        details: `
          1. Go to Developers > Webhooks
          2. Add endpoint: https://yourdomain.com/webhooks/stripe
          3. Select events: payment_intent.succeeded, payment_intent.payment_failed
        `,
      },
    ],

    testing: {
      cardNumber: '4242 4242 4242 4242',
      expiry: 'Any future date',
      cvc: 'Any 3 digits',
    },

    documentation: 'https://stripe.com/docs/payments',
  },

  // ============================================================================
  // 2. PAYPAL SETUP
  // ============================================================================
  paypal: {
    name: 'PayPal Payment Processing',
    status: 'RECOMMENDED',
    priority: 'HIGH',
    setupTime: '20 minutes',

    steps: [
      {
        step: 1,
        title: 'Create PayPal Developer Account',
        details: 'Visit https://developer.paypal.com and sign up',
      },
      {
        step: 2,
        title: 'Create Application',
        details: `
          1. Go to Apps & Credentials
          2. Click "Create App"
          3. Select "Merchant"
          4. Name your app
        `,
      },
      {
        step: 3,
        title: 'Get Credentials',
        code: `
          PAYPAL_CLIENT_ID=your_client_id_from_sandbox
          PAYPAL_CLIENT_SECRET=your_client_secret_from_sandbox
          PAYPAL_MODE=sandbox (use 'live' for production)
        `,
      },
      {
        step: 4,
        title: 'Configure Return URLs',
        details: `
          Set in your application:
          - Return URL: https://yourdomain.com/payments/success
          - Cancel URL: https://yourdomain.com/payments/cancel
        `,
      },
    ],

    testing: {
      businessAccount: 'sb-xxxxx@business.example.com',
      personalAccount: 'sb-xxxxx@personal.example.com',
    },

    documentation: 'https://developer.paypal.com/docs/',
  },

  // ============================================================================
  // 3. SENDGRID SETUP
  // ============================================================================
  sendgrid: {
    name: 'Email Service (SendGrid)',
    status: 'REQUIRED',
    priority: 'CRITICAL',
    setupTime: '10 minutes',

    steps: [
      {
        step: 1,
        title: 'Create SendGrid Account',
        details: 'Visit https://sendgrid.com and create a free account',
      },
      {
        step: 2,
        title: 'Create API Key',
        details: `
          1. Go to Settings > API Keys
          2. Click "Create API Key"
          3. Give it permissions for sending emails
          4. Copy the key (you can only see it once!)
        `,
      },
      {
        step: 3,
        title: 'Configure Environment Variables',
        code: `
          SENDGRID_API_KEY=SG.your_api_key_here
          SENDGRID_FROM_EMAIL=noreply@yourdomain.com
        `,
      },
      {
        step: 4,
        title: 'Verify Sender Identity',
        details: `
          1. Go to Settings > Sender Authentication
          2. Add your domain or verify single sender email
          3. Follow the verification steps
        `,
      },
      {
        step: 5,
        title: 'Setup SMTP (Alternative)',
        details: `
          If using SMTP instead of API:
          - Host: smtp.sendgrid.net
          - Port: 587
          - Username: apikey
          - Password: Your SendGrid API Key
        `,
      },
    ],

    documentation: 'https://docs.sendgrid.com/',
  },

  // ============================================================================
  // 4. TWILIO SETUP
  // ============================================================================
  twilio: {
    name: 'SMS & WhatsApp Service (Twilio)',
    status: 'REQUIRED',
    priority: 'CRITICAL',
    setupTime: '15 minutes',

    steps: [
      {
        step: 1,
        title: 'Create Twilio Account',
        details: 'Visit https://www.twilio.com and create a free account',
      },
      {
        step: 2,
        title: 'Get Phone Number',
        details: `
          1. Go to Console > Phone Numbers
          2. Click "Get a Phone Number"
          3. Choose SMS capability
          4. Select country and buy number
        `,
      },
      {
        step: 3,
        title: 'Get API Credentials',
        details: `
          1. Go to Console > Settings > Account SID and Auth Token
          2. Copy both values
        `,
      },
      {
        step: 4,
        title: 'Configure Environment Variables',
        code: `
          TWILIO_ACCOUNT_SID=your_account_sid
          TWILIO_AUTH_TOKEN=your_auth_token
          TWILIO_PHONE_NUMBER=+1234567890 (your purchased number)
          TWILIO_WHATSAPP_NUMBER=+1234567890 (same or different)
        `,
      },
      {
        step: 5,
        title: 'Setup WhatsApp (Optional)',
        details: `
          1. Go to Messaging > WhatsApp
          2. Follow sandbox setup if not ready for production
          3. Update TWILIO_WHATSAPP_NUMBER
        `,
      },
    ],

    testing: {
      sandboxNumber: '+1 415-523-8886',
      testMessages: 'Use sandbox number for testing',
    },

    documentation: 'https://www.twilio.com/docs/',
  },

  // ============================================================================
  // 5. ZOOM SETUP
  // ============================================================================
  zoom: {
    name: 'Video Conferencing (Zoom)',
    status: 'REQUIRED',
    priority: 'HIGH',
    setupTime: '20 minutes',

    steps: [
      {
        step: 1,
        title: 'Create Zoom Account',
        details: 'Visit https://zoom.us and create an account',
      },
      {
        step: 2,
        title: 'Create OAuth Application',
        details: `
          1. Go to Develop > Build App
          2. Choose "Server-to-Server OAuth"
          3. Fill in application details
        `,
      },
      {
        step: 3,
        title: 'Get Credentials',
        details: `
          Copy these from your app credentials page:
          - Account ID (Client ID of type "Server to Server")
          - Client ID
          - Client Secret
        `,
      },
      {
        step: 4,
        title: 'Configure Environment Variables',
        code: `
          ZOOM_CLIENT_ID=your_client_id
          ZOOM_CLIENT_SECRET=your_client_secret
          ZOOM_ACCOUNT_ID=your_account_id
        `,
      },
      {
        step: 5,
        title: 'Setup Scopes',
        details: `
          In your app settings, enable these scopes:
          - meeting:write
          - meeting:read
          - recording:read
        `,
      },
    ],

    documentation: 'https://developers.zoom.us/docs/',
  },

  // ============================================================================
  // 6. GOOGLE CALENDAR SETUP
  // ============================================================================
  googleCalendar: {
    name: 'Calendar Integration (Google Calendar)',
    status: 'RECOMMENDED',
    priority: 'MEDIUM',
    setupTime: '25 minutes',

    steps: [
      {
        step: 1,
        title: 'Create Google Cloud Project',
        details: `
          1. Visit https://console.cloud.google.com
          2. Create a new project
          3. Enable Google Calendar API
        `,
      },
      {
        step: 2,
        title: 'Create OAuth 2.0 Credentials',
        details: `
          1. Go to Credentials
          2. Create OAuth 2.0 Client ID
          3. Choose "Web application"
          4. Add authorized redirect URIs:
             - http://localhost:3001/auth/google/callback
             - https://yourdomain.com/auth/google/callback
        `,
      },
      {
        step: 3,
        title: 'Get Credentials',
        details: `
          Copy:
          - Client ID
          - Client Secret
        `,
      },
      {
        step: 4,
        title: 'Configure Environment Variables',
        code: `
          GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
          GOOGLE_CLIENT_SECRET=your_client_secret
          GOOGLE_REDIRECT_URI=http://localhost:3001/auth/google/callback
          GOOGLE_CLOUD_PROJECT=your-project-id
        `,
      },
    ],

    documentation: 'https://developers.google.com/calendar/api/guides/overview',
  },

  // ============================================================================
  // QUICK VERIFICATION CHECKLIST
  // ============================================================================
  verification: {
    stripe: {
      test: `
        curl -X POST http://localhost:3001/api/v1/integrations/payments/stripe/intent \\
          -H "Authorization: Bearer YOUR_TOKEN" \\
          -H "Content-Type: application/json" \\
          -d '{
            "amount": 100,
            "currency": "USD",
            "description": "Test payment"
          }'
      `,
    },

    sendgrid: {
      test: `
        curl -X POST http://localhost:3001/api/v1/integrations/email/send \\
          -H "Authorization: Bearer YOUR_TOKEN" \\
          -H "Content-Type: application/json" \\
          -d '{
            "to": "test@example.com",
            "subject": "Test Email",
            "html": "<p>Test</p>",
            "text": "Test"
          }'
      `,
    },

    twilio: {
      test: `
        curl -X POST http://localhost:3001/api/v1/integrations/sms/send \\
          -H "Authorization: Bearer YOUR_TOKEN" \\
          -H "Content-Type: application/json" \\
          -d '{
            "phoneNumber": "+1234567890",
            "message": "Test SMS"
          }'
      `,
    },

    zoom: {
      test: `
        curl -X POST http://localhost:3001/api/v1/integrations/zoom/create \\
          -H "Authorization: Bearer YOUR_TOKEN" \\
          -H "Content-Type: application/json" \\
          -d '{
            "topic": "Test Meeting",
            "startTime": "2025-02-15T10:00:00Z",
            "duration": 60
          }'
      `,
    },
  },

  // ============================================================================
  // TROUBLESHOOTING
  // ============================================================================
  troubleshooting: [
    {
      issue: 'Stripe API Key not working',
      solution: `
        1. Verify you're using the correct key (Secret, not Publishable)
        2. Check that it's a valid test key (starts with sk_test_)
        3. Ensure the key is active in Stripe dashboard
        4. For production, use live keys (sk_live_)
      `,
    },
    {
      issue: 'SendGrid emails not sending',
      solution: `
        1. Verify API key is correct and active
        2. Check sender email is verified
        3. Check spam folder
        4. Review SendGrid logs for delivery status
        5. Ensure FROM_EMAIL matches verified sender
      `,
    },
    {
      issue: 'Twilio SMS not delivering',
      solution: `
        1. Verify phone number is in E.164 format (+1234567890)
        2. Check account balance in Twilio console
        3. For sandbox, only test numbers work
        4. Verify SID and Auth Token
        5. Check if number supports SMS (not all do)
      `,
    },
    {
      issue: 'Zoom meeting creation failing',
      solution: `
        1. Verify OAuth credentials are correct
        2. Check that Server-to-Server OAuth is enabled
        3. Verify scopes are enabled (meeting:write, meeting:read)
        4. Check for rate limiting
        5. Ensure account ID matches your Zoom account
      `,
    },
  ],

  // ============================================================================
  // ENVIRONMENT FILE TEMPLATE
  // ============================================================================
  envTemplate: `
# Copy this to .env and fill in your values

# Stripe
STRIPE_SECRET_KEY=sk_test_your_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here

# PayPal
PAYPAL_CLIENT_ID=your_client_id
PAYPAL_CLIENT_SECRET=your_secret
PAYPAL_MODE=sandbox

# SendGrid
SENDGRID_API_KEY=SG.your_key_here
SENDGRID_FROM_EMAIL=noreply@yourdomain.com

# Twilio
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_WHATSAPP_NUMBER=+1234567890

# Zoom
ZOOM_CLIENT_ID=your_id
ZOOM_CLIENT_SECRET=your_secret
ZOOM_ACCOUNT_ID=your_account_id

# Google
GOOGLE_CLIENT_ID=your_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_secret
GOOGLE_REDIRECT_URI=http://localhost:3001/auth/google/callback
  `,
};

module.exports = setupGuide;
