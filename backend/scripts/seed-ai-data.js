/* eslint-disable no-unused-vars */
const axios = require('axios');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const JWT_SECRET = process.env.JWT_SECRET || 'alawael-erp-secret-key-2026-change-in-production';
const API_URL = 'http://127.0.0.1:3001/api/ai-predictions';

// Generate a valid token
const userId = 'user-123'; // Mock user ID
const token = jwt.sign({ userId: userId, email: 'demo@alawael.com', role: 'admin' }, JWT_SECRET, {
  expiresIn: '1h',
});

const seedData = async () => {
  try {
    console.log(`🔑 Using Token for User ID: ${userId}`);

    // Data to be predicted (which will trigger storage in mock DB)
    const payload = {
      data: {
        recentScores: '95,88,92,90',
        attendance: '98',
        participation: 'high',
        completedAssignments: '10',
      },
    };

    console.log('🚀 Sending prediction request to ' + API_URL + '/predict-performance');
    const response = await axios.post(`${API_URL}/predict-performance`, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.data.success) {
      console.log('✅ Prediction created successfully!');
      console.log('📊 Prediction:', response.data.data.prediction);
      console.log(`\n👉 You can now check the dashboard for user ID: ${userId}`);
    } else {
      console.log('❌ Failed to create prediction:', response.data.message);
    }
  } catch (error) {
    if (error.response) {
      console.error('❌ API Error:', error.response.status, error.response.data);
    } else if (error.code === 'ECONNREFUSED') {
      console.error('❌ Connection refused! Is the backend server running on port 3001?');
    } else {
      console.error('❌ Error:', error.message);
    }
  }
};

seedData();
