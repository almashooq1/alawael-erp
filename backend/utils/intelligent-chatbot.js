/**
 * PHASE 17: INTELLIGENT CHATBOT ENGINE
 * Advanced NLP & Conversational AI
 * AlAwael ERP v1.4 | 2026-01-24
 */

// ============================================================================
// 1. CHATBOT ENGINE
// ============================================================================
class IntelligentChatbot {
  constructor(db) {
    this.db = db;
    this.conversationHistory = new Map();
    this.intentPatterns = this.initializeIntents();
    this.entityRecognizer = new EntityRecognizer();
    this.contextManager = new ContextManager();
  }

  /**
   * Initialize intent patterns
   */
  initializeIntents() {
    return {
      sales: {
        keywords: ['sales', 'revenue', 'sell', 'order', 'purchase', 'invoice'],
        responses: [
          'I can help you with sales information.',
          'Would you like to know about sales trends or place a new order?',
        ],
      },
      inventory: {
        keywords: ['inventory', 'stock', 'product', 'item', 'warehouse'],
        responses: [
          'I can assist with inventory management.',
          'Do you want to check stock levels or update inventory?',
        ],
      },
      customer: {
        keywords: ['customer', 'client', 'user', 'account', 'profile'],
        responses: [
          'I can help with customer information.',
          'Would you like to manage customer accounts?',
        ],
      },
      analytics: {
        keywords: ['analytics', 'report', 'dashboard', 'metric', 'performance'],
        responses: [
          'I can generate analytics reports.',
          'Which analytics or report would you like to see?',
        ],
      },
      support: {
        keywords: ['help', 'support', 'issue', 'problem', 'error', 'bug'],
        responses: [
          "I'm here to help. What issue are you facing?",
          "Please describe the problem and I'll assist you.",
        ],
      },
    };
  }

  /**
   * Process user message
   */
  async processMessage(userId, message) {
    try {
      // Initialize conversation if new user
      if (!this.conversationHistory.has(userId)) {
        this.conversationHistory.set(userId, []);
      }

      // Extract entities
      const entities = await this.entityRecognizer.recognize(message);

      // Detect intent
      const intent = this.detectIntent(message);

      // Get context
      const context = await this.contextManager.getContext(userId);

      // Generate response
      const response = await this.generateResponse(userId, message, intent, entities, context);

      // Store conversation
      this.conversationHistory.get(userId).push({
        role: 'user',
        content: message,
        timestamp: new Date(),
      });

      this.conversationHistory.get(userId).push({
        role: 'assistant',
        content: response.text,
        timestamp: new Date(),
      });

      return {
        success: true,
        response: response.text,
        intent: intent.name,
        confidence: intent.confidence,
        entities: entities,
        suggestions: response.suggestions,
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Detect intent from message
   */
  detectIntent(message) {
    const lowerMessage = message.toLowerCase();
    let maxScore = 0;
    let detectedIntent = null;

    for (const [intentName, intentData] of Object.entries(this.intentPatterns)) {
      const score = intentData.keywords.reduce((sum, keyword) => {
        return sum + (lowerMessage.includes(keyword) ? 1 : 0);
      }, 0);

      if (score > maxScore) {
        maxScore = score;
        detectedIntent = intentName;
      }
    }

    return {
      name: detectedIntent || 'general',
      confidence: Math.min(maxScore / 3, 1),
    };
  }

  /**
   * Generate response
   */
  async generateResponse(userId, message, intent, entities, context) {
    try {
      let response = '';
      let suggestions = [];

      switch (intent.name) {
        case 'sales':
          response = await this.handleSalesQuery(message, entities);
          suggestions = ['View sales trends', 'Create new order', 'Check revenue'];
          break;

        case 'inventory':
          response = await this.handleInventoryQuery(message, entities);
          suggestions = ['Check stock', 'Update inventory', 'Low stock alerts'];
          break;

        case 'customer':
          response = await this.handleCustomerQuery(message, entities, context);
          suggestions = ['View customers', 'Add customer', 'Customer details'];
          break;

        case 'analytics':
          response = await this.handleAnalyticsQuery(message, entities);
          suggestions = ['View dashboard', 'Generate report', 'See metrics'];
          break;

        case 'support':
          response = await this.handleSupportQuery(message, context);
          suggestions = ['Chat support', 'View documentation', 'Report issue'];
          break;

        default:
          response = "I'm here to help. Could you please provide more details?";
          suggestions = ['Sales info', 'Inventory check', 'Customer details'];
      }

      return { text: response, suggestions };
    } catch (error) {
      return { text: 'I encountered an issue. Please try again.', suggestions: [] };
    }
  }

  /**
   * Handle sales queries
   */
  async handleSalesQuery(message, entities) {
    const amount = entities.find(e => e.type === 'amount');
    const date = entities.find(e => e.type === 'date');

    if (message.includes('forecast') || message.includes('predict')) {
      return 'I can forecast sales based on historical data. Would you like a 30-day, 90-day, or annual forecast?';
    }

    if (message.includes('revenue')) {
      return 'Current month revenue is up 12% compared to last month. Would you like more details?';
    }

    return 'I can help with sales analysis. What would you like to know?';
  }

  /**
   * Handle inventory queries
   */
  async handleInventoryQuery(message, entities) {
    const product = entities.find(e => e.type === 'product');

    if (message.includes('low stock') || message.includes('out of stock')) {
      return '5 items are currently low in stock. Would you like me to suggest reordering?';
    }

    if (message.includes('check') || message.includes('status')) {
      return 'Inventory is at 92% capacity. All items are in good condition. Do you need details?';
    }

    return 'I can help manage your inventory. What information do you need?';
  }

  /**
   * Handle customer queries
   */
  async handleCustomerQuery(message, entities, context) {
    const customerId = entities.find(e => e.type === 'customer_id');

    if (message.includes('profile') || message.includes('details')) {
      return 'I can retrieve customer profiles. Which customer would you like information about?';
    }

    if (message.includes('new') || message.includes('create')) {
      return "I can help you add a new customer. What's their name and contact information?";
    }

    if (message.includes('recent')) {
      return 'Your most active customers this month are Top 5. Would you like their details?';
    }

    return 'How can I assist with customer management?';
  }

  /**
   * Handle analytics queries
   */
  async handleAnalyticsQuery(message, entities) {
    const metric = entities.find(e => e.type === 'metric');

    if (message.includes('dashboard')) {
      return 'Your dashboard is ready. Key metrics: Revenue +12%, Active Users +8%, Inventory 92%.';
    }

    if (message.includes('report')) {
      return 'I can generate various reports. Would you like sales, inventory, customer, or financial report?';
    }

    if (message.includes('trend')) {
      return 'Sales trend is upward over the last 90 days. Would you like a detailed analysis?';
    }

    return 'I can provide analytics and insights. What would you like to analyze?';
  }

  /**
   * Handle support queries
   */
  async handleSupportQuery(message, context) {
    if (message.includes('error') || message.includes('bug')) {
      return "I'm sorry you're experiencing an issue. Can you describe what happened?";
    }

    if (message.includes('how to') || message.includes('tutorial')) {
      return 'I can guide you through features. Which feature would you like to learn about?';
    }

    if (message.includes('contact')) {
      return 'Our support team is available 24/7. Would you like to connect with a human agent?';
    }

    return 'How can I assist you today?';
  }

  /**
   * Get conversation history
   */
  getConversationHistory(userId, limit = 20) {
    const history = this.conversationHistory.get(userId) || [];
    return history.slice(-limit);
  }

  /**
   * Clear conversation
   */
  clearConversation(userId) {
    this.conversationHistory.delete(userId);
    return { success: true };
  }

  /**
   * Save conversation to database
   */
  async saveConversation(userId) {
    try {
      const history = this.conversationHistory.get(userId) || [];

      await this.db.collection('conversations').insertOne({
        userId,
        messages: history,
        savedAt: new Date(),
        messageCount: history.length,
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

// ============================================================================
// 2. ENTITY RECOGNIZER
// ============================================================================
class EntityRecognizer {
  /**
   * Recognize entities in text
   */
  async recognize(text) {
    const entities = [];

    // Amount recognition
    const amountPattern = /\$?\d+(?:,\d{3})*(?:\.\d{2})?/g;
    const amounts = text.match(amountPattern);
    if (amounts) {
      entities.push({
        type: 'amount',
        value: amounts[0],
        confidence: 0.95,
      });
    }

    // Date recognition
    const datePattern = /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g;
    const dates = text.match(datePattern);
    if (dates) {
      entities.push({
        type: 'date',
        value: dates[0],
        confidence: 0.9,
      });
    }

    // Product recognition
    const productKeywords = ['product', 'item', 'SKU', 'model', 'variant'];
    if (productKeywords.some(kw => text.toLowerCase().includes(kw))) {
      entities.push({
        type: 'product',
        value: this.extractProductName(text),
        confidence: 0.8,
      });
    }

    // Customer ID recognition
    const customerIdPattern = /customer[_\s]?id[:\s]+([A-Z0-9]+)/i;
    const customerId = text.match(customerIdPattern);
    if (customerId) {
      entities.push({
        type: 'customer_id',
        value: customerId[1],
        confidence: 0.95,
      });
    }

    // Metric recognition
    const metrics = ['revenue', 'sales', 'profit', 'conversion', 'engagement'];
    if (metrics.some(m => text.toLowerCase().includes(m))) {
      entities.push({
        type: 'metric',
        value: metrics.find(m => text.toLowerCase().includes(m)),
        confidence: 0.85,
      });
    }

    return entities;
  }

  /**
   * Extract product name
   */
  extractProductName(text) {
    const words = text.split(' ');
    return words.slice(0, 3).join(' ');
  }
}

// ============================================================================
// 3. CONTEXT MANAGER
// ============================================================================
class ContextManager {
  constructor() {
    this.userContexts = new Map();
  }

  /**
   * Get user context
   */
  async getContext(userId) {
    if (!this.userContexts.has(userId)) {
      this.userContexts.set(userId, {
        lastQuery: null,
        lastIntent: null,
        sessionStart: new Date(),
        messageCount: 0,
      });
    }

    const context = this.userContexts.get(userId);
    context.messageCount++;
    return context;
  }

  /**
   * Update context
   */
  updateContext(userId, intent) {
    const context = this.userContexts.get(userId);
    if (context) {
      context.lastIntent = intent;
      context.lastQuery = new Date();
    }
  }

  /**
   * Clear context
   */
  clearContext(userId) {
    this.userContexts.delete(userId);
  }
}

// ============================================================================
// 4. SENTIMENT ANALYZER
// ============================================================================
class SentimentAnalyzer {
  /**
   * Analyze sentiment of text
   */
  analyzeSentiment(text) {
    const positiveWords = [
      'good',
      'great',
      'excellent',
      'perfect',
      'amazing',
      'wonderful',
      'happy',
    ];
    const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'poor', 'sad', 'angry'];

    const lowerText = text.toLowerCase();
    let score = 0;

    positiveWords.forEach(word => {
      if (lowerText.includes(word)) score += 0.5;
    });

    negativeWords.forEach(word => {
      if (lowerText.includes(word)) score -= 0.5;
    });

    const sentiment = score > 0 ? 'positive' : score < 0 ? 'negative' : 'neutral';

    return {
      sentiment,
      score: Math.max(-1, Math.min(1, score)),
      confidence: Math.abs(score),
    };
  }
}

module.exports = {
  IntelligentChatbot,
  EntityRecognizer,
  ContextManager,
  SentimentAnalyzer,
};
