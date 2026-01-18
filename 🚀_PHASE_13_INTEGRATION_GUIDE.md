# 🚀 PHASE 13 INTEGRATION GUIDE

Quick Start: Mount All Services in 5 Minutes

📋 STEP 1: Mount Routes in Express App

Open your backend/app.js or backend/index.js and add these lines:

```javascript
// ============= PHASE 13 ROUTES =============

// User Profile Management
app.use('/api/user-profile', require('./routes/userProfileRoutes'));

// Two-Factor Authentication
app.use('/api/auth/2fa', require('./routes/twoFARoutes'));

// Advanced Search
app.use('/api/search', require('./routes/searchRoutes'));

// Payment Gateway
app.use('/api/payments', require('./routes/paymentRoutes'));

// Notifications
app.use('/api/notifications', require('./routes/notificationRoutes'));

// Chatbot AI
app.use('/api/chatbot', require('./routes/chatbotRoutes'));

// AI Predictions
app.use('/api/ai', require('./routes/aiRoutes'));

// Automation Engine
app.use('/api/automation', require('./routes/automationRoutes'));
```

🧪 STEP 2: Test Routes

After mounting, test with:

```bash
# Test User Profile
curl -X GET http://localhost:3001/api/user-profile/user123 \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test 2FA
curl -X POST http://localhost:3001/api/auth/2fa/send-otp-sms \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+966501234567"}'

# Test Search
curl -X GET "http://localhost:3001/api/search/search?query=test" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test Payment
curl -X POST http://localhost:3001/api/payments/initialize-stripe \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount": 100, "currency": "SAR"}'

# Test Notifications
curl -X GET http://localhost:3001/api/notifications \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test Chatbot
curl -X POST http://localhost:3001/api/chatbot/chat \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello"}'

# Test AI
curl -X POST http://localhost:3001/api/ai/predict-sales \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"month": 1}'

# Test Automation
curl -X GET http://localhost:3001/api/automation \
  -H "Authorization: Bearer YOUR_TOKEN"
```

🎨 STEP 3: Frontend Components

Create React components in frontend/src/pages/:

### UserProfilePage.jsx

```javascript
import React, { useState } from 'react';
import { Box, Card, CardContent, TextField, Button, Avatar } from '@mui/material';

export default function UserProfilePage() {
  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
  });

  const handleUpdate = async () => {
    const response = await fetch('/api/user-profile/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'user-id', ...profile }),
    });
    const data = await response.json();
    console.log(data);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Card>
        <CardContent>
          <Avatar sx={{ width: 100, height: 100, mb: 2 }} />
          <TextField
            label="First Name"
            value={profile.firstName}
            onChange={e => setProfile({ ...profile, firstName: e.target.value })}
            fullWidth
            margin="normal"
          />
          <TextField
            label="Last Name"
            value={profile.lastName}
            onChange={e => setProfile({ ...profile, lastName: e.target.value })}
            fullWidth
            margin="normal"
          />
          <TextField
            label="Email"
            value={profile.email}
            onChange={e => setProfile({ ...profile, email: e.target.value })}
            fullWidth
            margin="normal"
          />
          <Button variant="contained" onClick={handleUpdate} sx={{ mt: 2 }}>
            Update Profile
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
}
```

### TwoFASettings.jsx

```javascript
import React, { useState } from 'react';
import { Box, Card, CardContent, Button, Radio, FormControlLabel, Snackbar, Alert } from '@mui/material';

export default function TwoFASettings() {
  const [method, setMethod] = useState('sms');
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState('');

  const handleEnable = async () => {
    const response = await fetch('/api/auth/2fa/enable', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: method,
        phoneNumber: '+966501234567',
      }),
    });
    const data = await response.json();
    setMessage(data.success ? '2FA enabled!' : 'Error enabling 2FA');
    setEnabled(data.success);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Card>
        <CardContent>
          <h2>Two-Factor Authentication</h2>

          <FormControlLabel control={<Radio checked={method === 'sms'} onChange={() => setMethod('sms')} />} label="SMS OTP" />

          <FormControlLabel control={<Radio checked={method === 'email'} onChange={() => setMethod('email')} />} label="Email OTP" />

          <FormControlLabel
            control={<Radio checked={method === 'google'} onChange={() => setMethod('google')} />}
            label="Google Authenticator"
          />

          <Button variant="contained" onClick={handleEnable} sx={{ mt: 2 }}>
            Enable 2FA
          </Button>

          <Snackbar open={!!message} onClose={() => setMessage('')}>
            <Alert severity={enabled ? 'success' : 'error'}>{message}</Alert>
          </Snackbar>
        </CardContent>
      </Card>
    </Box>
  );
}
```

### ChatbotWidget.jsx

```javascript
import React, { useState } from 'react';
import { Box, Card, CardContent, TextField, Button, List, ListItem } from '@mui/material';

export default function ChatbotWidget() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');

  const handleSend = async () => {
    if (!input.trim()) return;

    setMessages([...messages, { role: 'user', content: input }]);

    const response = await fetch('/api/chatbot/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: input }),
    });
    const data = await response.json();

    if (data.success) {
      setMessages(prev => [...prev, { role: 'bot', content: data.response.message }]);
    }

    setInput('');
  };

  return (
    <Box sx={{ p: 3 }}>
      <Card>
        <CardContent>
          <h2>Chatbot</h2>
          <List sx={{ height: '400px', overflowY: 'auto', mb: 2 }}>
            {messages.map((msg, idx) => (
              <ListItem key={idx} sx={{ textAlign: msg.role === 'user' ? 'right' : 'left' }}>
                <strong>{msg.role === 'user' ? 'You' : 'Bot'}:</strong> {msg.content}
              </ListItem>
            ))}
          </List>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && handleSend()}
              placeholder="Type a message..."
              fullWidth
            />
            <Button variant="contained" onClick={handleSend}>
              Send
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
```

📊 STEP 4: Database Models (MongoDB)

Create models/userProfile.js:

```javascript
const mongoose = require('mongoose');

const userProfileSchema = new mongoose.Schema({
  userId: String,
  firstName: String,
  lastName: String,
  email: String,
  phoneNumber: String,
  profileImage: Buffer,
  preferences: {
    language: String,
    theme: String,
    notifications: Boolean,
  },
  activityLog: [
    {
      action: String,
      details: String,
      timestamp: Date,
    },
  ],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('UserProfile', userProfileSchema);
```

🔧 STEP 5: Environment Variables

Add to .env:

```
# Stripe
STRIPE_PUBLIC_KEY=pk_test_xxxxx
STRIPE_SECRET_KEY=sk_test_xxxxx

# PayPal
PAYPAL_CLIENT_ID=xxxxx
PAYPAL_SECRET=xxxxx

# KNET (Saudi)
KNET_MERCHANT_ID=xxxxx
KNET_TERMINAL_ID=xxxxx

# SMS Service
TWILIO_SID=xxxxx
TWILIO_TOKEN=xxxxx

# Email Service
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Firebase (for push notifications)
FIREBASE_PROJECT_ID=xxxxx
FIREBASE_PRIVATE_KEY=xxxxx
FIREBASE_CLIENT_EMAIL=xxxxx
```

✅ STEP 6: Test All Services

```bash
# Start backend
npm start

# In another terminal, test each service
npm test

# Or manually test endpoints
curl -X GET http://localhost:3001/api/user-profile/test-user \
  -H "Authorization: Bearer test-token"
```

📝 TROUBLESHOOTING

If services don't load:

1. Check all files exist in backend/services/
2. Check all routes exist in backend/routes/
3. Ensure authMiddleware.js exists
4. Check for typos in require() statements
5. Verify Express app is properly configured

Common Issues:

- 404 errors: Route not mounted
- 500 errors: Missing middleware or service
- Auth errors: Missing authorization header
- Type errors: Incorrect request body format

🎯 NEXT PHASE (Phase 14)

- Mobile app development (React Native)
- Real-time collaborative features
- Advanced reporting and dashboards
- Integration with external APIs
- Performance optimization
- Security hardening

🎉 PHASE 13 INTEGRATION READY!

All services are mounted and ready to use.
Start testing and integrating with your frontend!
