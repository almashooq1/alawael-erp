const express = require('express');
const app = express();
const port = 5000;

app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running!' });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (email === 'admin@example.com' && password === 'Admin@123') {
    res.json({ 
      success: true, 
      token: 'test-token-12345',
      user: { email, role: 'admin' }
    });
  } else {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
});

app.listen(port, () => {
  console.log('Test server running on port ' + port);
});
