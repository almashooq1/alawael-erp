/**
 * Super Simple Test Server
 */
const express = require('express');
const app = express();

app.get('/test', (req, res) => {
  console.log('🔥 TEST ENDPOINT HIT!');
  res.json({ msg: 'Hello' });
});

app.listen(3010, () => {
  console.log('✅ Test server on port 3010');
});
