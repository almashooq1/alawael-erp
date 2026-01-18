#!/usr/bin/env node
/**
 * Phase 13 API Integration Examples
 * Complete examples for frontend integration with Auth, Error Handling, and Types
 */

// ============================================================================
// 1. AUTHENTICATION & TOKEN MANAGEMENT
// ============================================================================

/**
 * Login and store JWT token
 * @example
 * const { token, user } = await loginUser('user@example.com', 'password');
 * localStorage.setItem('authToken', token);
 */
async function loginUser(email, password) {
  const response = await fetch('http://localhost:3001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) throw new Error('Login failed');
  const { token, user } = await response.json();
  return { token, user };
}

/**
 * Get authorization header with stored token
 */
function getAuthHeader() {
  const token = localStorage.getItem('authToken');
  if (!token) throw new Error('No auth token found');
  return { Authorization: `Bearer ${token}` };
}

/**
 * Refresh token on expiry
 */
async function refreshToken() {
  const response = await fetch('http://localhost:3001/api/auth/refresh', {
    method: 'POST',
    headers: getAuthHeader(),
  });

  if (!response.ok) {
    localStorage.removeItem('authToken');
    window.location.href = '/login';
    return;
  }

  const { token } = await response.json();
  localStorage.setItem('authToken', token);
  return token;
}

// ============================================================================
// 2. PHASE 13 API CALLS - USER PROFILE
// ============================================================================

/**
 * Fetch user profile statistics
 * @example
 * const stats = await getUserProfileStats();
 * console.log(stats.totalSessions, stats.completedActivities);
 */
async function getUserProfileStats() {
  const response = await fetch('http://localhost:3001/api/user-profile/statistics', {
    method: 'GET',
    headers: getAuthHeader(),
  });

  if (!response.ok) throw new Error('Failed to fetch profile stats');
  return response.json();
}

/**
 * Update user profile
 */
async function updateUserProfile(data) {
  const response = await fetch('http://localhost:3001/api/user-profile/update', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) throw new Error('Profile update failed');
  return response.json();
}

// ============================================================================
// 3. PHASE 13 API CALLS - TWO-FACTOR AUTHENTICATION
// ============================================================================

/**
 * Enable 2FA via SMS
 */
async function enable2FASms(phoneNumber) {
  const response = await fetch('http://localhost:3001/api/2fa/send-otp-sms', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
    body: JSON.stringify({ phoneNumber }),
  });

  if (!response.ok) throw new Error('2FA SMS sending failed');
  return response.json();
}

/**
 * Verify 2FA OTP code
 */
async function verify2FACode(code) {
  const response = await fetch('http://localhost:3001/api/2fa/verify-otp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
    body: JSON.stringify({ code }),
  });

  if (!response.ok) throw new Error('2FA verification failed');
  return response.json();
}

// ============================================================================
// 4. PHASE 13 API CALLS - ADVANCED SEARCH
// ============================================================================

/**
 * Perform full-text search with query
 * @example
 * const results = await searchAdvanced('rehabilitation', { limit: 20 });
 */
async function searchAdvanced(query, options = {}) {
  const params = new URLSearchParams({
    query,
    limit: options.limit || 20,
    offset: options.offset || 0,
  });

  const response = await fetch(`http://localhost:3001/api/search-advanced/search?${params}`, {
    method: 'GET',
    headers: getAuthHeader(),
  });

  if (!response.ok) throw new Error('Search failed');
  return response.json();
}

/**
 * Advanced search with filters
 */
async function searchWithFilters(query, filters) {
  const response = await fetch('http://localhost:3001/api/search-advanced/advanced', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
    body: JSON.stringify({ query, filters }),
  });

  if (!response.ok) throw new Error('Filtered search failed');
  return response.json();
}

// ============================================================================
// 5. PHASE 13 API CALLS - PAYMENTS
// ============================================================================

/**
 * Get payment statistics
 */
async function getPaymentStats() {
  const response = await fetch('http://localhost:3001/api/payments-advanced/statistics', {
    method: 'GET',
    headers: getAuthHeader(),
  });

  if (!response.ok) throw new Error('Failed to fetch payment stats');
  return response.json();
}

/**
 * Process a payment
 * @example
 * const result = await processPayment({
 *   amount: 100,
 *   currency: 'SAR',
 *   method: 'stripe',
 * });
 */
async function processPayment(paymentData) {
  const response = await fetch('http://localhost:3001/api/payments-advanced/process', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
    body: JSON.stringify(paymentData),
  });

  if (!response.ok) throw new Error('Payment processing failed');
  return response.json();
}

// ============================================================================
// 6. PHASE 13 API CALLS - NOTIFICATIONS
// ============================================================================

/**
 * Get notification statistics
 */
async function getNotificationStats() {
  const response = await fetch('http://localhost:3001/api/notifications-advanced/statistics', {
    method: 'GET',
    headers: getAuthHeader(),
  });

  if (!response.ok) throw new Error('Failed to fetch notification stats');
  return response.json();
}

/**
 * Send a notification
 */
async function sendNotification(recipient, message, options = {}) {
  const response = await fetch('http://localhost:3001/api/notifications-advanced/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
    body: JSON.stringify({
      recipient,
      message,
      type: options.type || 'info',
      channels: options.channels || ['email'],
    }),
  });

  if (!response.ok) throw new Error('Notification sending failed');
  return response.json();
}

// ============================================================================
// 7. PHASE 13 API CALLS - CHATBOT
// ============================================================================

/**
 * Send message to chatbot
 * @example
 * const response = await sendChatMessage('What are my available sessions?');
 */
async function sendChatMessage(message) {
  const response = await fetch('http://localhost:3001/api/chatbot/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
    body: JSON.stringify({ message }),
  });

  if (!response.ok) throw new Error('Chat message failed');
  return response.json();
}

/**
 * Get chatbot conversation history
 */
async function getChatHistory() {
  const response = await fetch('http://localhost:3001/api/chatbot/conversations', {
    method: 'GET',
    headers: getAuthHeader(),
  });

  if (!response.ok) throw new Error('Failed to fetch chat history');
  return response.json();
}

// ============================================================================
// 8. PHASE 13 API CALLS - AI PREDICTIONS
// ============================================================================

/**
 * Get AI predictions for user
 * @example
 * const predictions = await getAIPredictions();
 * console.log(predictions.nextAppointment, predictions.recommendations);
 */
async function getAIPredictions() {
  const response = await fetch('http://localhost:3001/api/ai-advanced/predictions', {
    method: 'GET',
    headers: getAuthHeader(),
  });

  if (!response.ok) throw new Error('Failed to fetch AI predictions');
  return response.json();
}

/**
 * Train AI model with feedback
 */
async function submitAIFeedback(predictionId, feedback) {
  const response = await fetch('http://localhost:3001/api/ai-advanced/feedback', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
    body: JSON.stringify({ predictionId, feedback }),
  });

  if (!response.ok) throw new Error('Feedback submission failed');
  return response.json();
}

// ============================================================================
// 9. PHASE 13 API CALLS - AUTOMATION
// ============================================================================

/**
 * Get list of automation workflows
 */
async function getAutomationWorkflows() {
  const response = await fetch('http://localhost:3001/api/automation/workflows', {
    method: 'GET',
    headers: getAuthHeader(),
  });

  if (!response.ok) throw new Error('Failed to fetch workflows');
  return response.json();
}

/**
 * Execute automation workflow
 * @example
 * const result = await executeWorkflow('daily-reminder', { userID: '123' });
 */
async function executeWorkflow(workflowId, params = {}) {
  const response = await fetch('http://localhost:3001/api/automation/execute', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
    body: JSON.stringify({ workflowId, params }),
  });

  if (!response.ok) throw new Error('Workflow execution failed');
  return response.json();
}

// ============================================================================
// 10. ERROR HANDLING & RETRY LOGIC
// ============================================================================

/**
 * Fetch with automatic retry on 401 (token expiry)
 */
async function fetchWithAuth(url, options = {}) {
  let response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      ...getAuthHeader(),
    },
  });

  // If unauthorized, try to refresh token and retry
  if (response.status === 401) {
    try {
      await refreshToken();
      response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          ...getAuthHeader(),
        },
      });
    } catch (err) {
      // Refresh failed, redirect to login
      localStorage.removeItem('authToken');
      window.location.href = '/login';
      throw err;
    }
  }

  return response;
}

// ============================================================================
// 11. REACT HOOKS EXAMPLES
// ============================================================================

/**
 * useAuth Hook
 * @example
 * const { user, token, loading, error, login, logout } = useAuth();
 */
function useAuth() {
  const [user, setUser] = React.useState(null);
  const [token, setToken] = React.useState(localStorage.getItem('authToken'));
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const { token: newToken, user: newUser } = await loginUser(email, password);
      setToken(newToken);
      setUser(newUser);
      localStorage.setItem('authToken', newToken);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('authToken');
  };

  return { user, token, loading, error, login, logout };
}

/**
 * usePhase13API Hook
 * @example
 * const { stats, loading, error, refetch } = usePhase13API(
 *   'user-profile',
 *   'statistics'
 * );
 */
function usePhase13API(module, endpoint) {
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetchWithAuth(`http://localhost:3001/api/${module}/${endpoint}`, { method: 'GET' });
      const json = await response.json();
      setData(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchData();
  }, [module, endpoint]);

  return { data, loading, error, refetch: fetchData };
}

// ============================================================================
// 12. EXPORTS FOR MODULE USAGE
// ============================================================================

module.exports = {
  // Auth
  loginUser,
  refreshToken,
  getAuthHeader,

  // User Profile
  getUserProfileStats,
  updateUserProfile,

  // 2FA
  enable2FASms,
  verify2FACode,

  // Search
  searchAdvanced,
  searchWithFilters,

  // Payments
  getPaymentStats,
  processPayment,

  // Notifications
  getNotificationStats,
  sendNotification,

  // Chatbot
  sendChatMessage,
  getChatHistory,

  // AI
  getAIPredictions,
  submitAIFeedback,

  // Automation
  getAutomationWorkflows,
  executeWorkflow,

  // Utils
  fetchWithAuth,

  // React Hooks
  useAuth,
  usePhase13API,
};
