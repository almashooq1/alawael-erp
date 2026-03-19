/**
 * Phase 29: Advanced AI Integration Service
 * LLM Integration, Autonomous Workflows, Predictive BI, AI Automation, Recommendations
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api/phases-29-33';

const fetchAPI = async (endpoint, options = {}) => {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Phase 29 API Error on ${endpoint}:`, error);
    throw error;
  }
};

/**
 * Phase 29: Advanced AI Integration APIs
 */
export const phase29AI = {
  // LLM Integration Endpoints
  llm: {
    /**
     * Initialize LLM Provider
     * @param {string} provider - Provider name (gpt-4, claude, gemini)
     * @param {string} apiKey - Provider API key
     * @param {string} model - Model identifier
     */
    initializeProvider: async (provider, apiKey, model) => {
      return fetchAPI('/ai/llm/provider/init', {
        method: 'POST',
        body: JSON.stringify({ provider, apiKey, model }),
      });
    },

    /**
     * Query LLM
     * @param {string} providerId - Provider ID
     * @param {string} prompt - User prompt
     * @param {object} options - Additional options
     */
    queryLLM: async (providerId, prompt, options = {}) => {
      return fetchAPI('/ai/llm/query', {
        method: 'POST',
        body: JSON.stringify({ providerId, prompt, options }),
      });
    },

    /**
     * List available LLM providers
     */
    listProviders: async () => {
      return fetchAPI('/ai/llm/providers');
    },

    /**
     * Get conversation history
     * @param {string} conversationId - Conversation ID
     */
    getConversation: async conversationId => {
      return fetchAPI(`/ai/llm/conversation/${conversationId}`);
    },

    /**
     * Get LLM costs
     */
    getCosts: async () => {
      return fetchAPI('/ai/llm/costs');
    },
  },

  // Autonomous Workflow Orchestration
  workflows: {
    /**
     * Create autonomous agent
     * @param {string} agentId - Agent identifier
     * @param {object} config - Agent configuration
     */
    createAgent: async (agentId, config) => {
      return fetchAPI('/ai/workflow/agent', {
        method: 'POST',
        body: JSON.stringify({ agentId, config }),
      });
    },

    /**
     * List active workflows
     */
    listActive: async () => {
      return fetchAPI('/ai/workflows/active');
    },

    /**
     * Get workflow status
     * @param {string} workflowId - Workflow ID
     */
    getStatus: async workflowId => {
      return fetchAPI(`/ai/workflows/${workflowId}`);
    },

    /**
     * Execute workflow
     * @param {string} workflowId - Workflow ID
     * @param {object} params - Execution parameters
     */
    execute: async (workflowId, params) => {
      return fetchAPI(`/ai/workflows/${workflowId}/execute`, {
        method: 'POST',
        body: JSON.stringify(params),
      });
    },
  },

  // Predictive Business Intelligence
  bi: {
    /**
     * Generate predictions
     * @param {object} data - Historical data for prediction
     */
    predict: async data => {
      return fetchAPI('/bi/predict', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    /**
     * List predictions
     */
    listPredictions: async () => {
      return fetchAPI('/bi/predictions');
    },

    /**
     * Get specific prediction
     * @param {string} predictionId - Prediction ID
     */
    getPrediction: async predictionId => {
      return fetchAPI(`/bi/predictions/${predictionId}`);
    },
  },

  // AI-Powered Automation
  automation: {
    /**
     * Trigger automation rule
     * @param {string} ruleId - Automation rule ID
     * @param {object} data - Trigger data
     */
    trigger: async (ruleId, data) => {
      return fetchAPI('/automation/trigger', {
        method: 'POST',
        body: JSON.stringify({ ruleId, data }),
      });
    },

    /**
     * List automation rules
     */
    listRules: async () => {
      return fetchAPI('/automation/rules');
    },
  },

  // Intelligent Recommendations
  recommendations: {
    /**
     * Get recommendations for user
     * @param {string} userId - User ID
     */
    getForUser: async userId => {
      return fetchAPI(`/recommendations/${userId}`);
    },

    /**
     * Get recommendations by type
     * @param {string} type - Recommendation type
     */
    getByType: async type => {
      return fetchAPI(`/recommendations/type/${type}`);
    },
  },

  // System Health
  health: {
    /**
     * Get Phase 29 health status
     */
    getStatus: async () => {
      return fetchAPI('/health');
    },
  },
};

export default phase29AI;
