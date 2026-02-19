/**
 * ADVANCED INTELLIGENT CHATBOT SERVICE
 * متقدم - معالجة لغة طبيعية، تعلم ذاتي، توقعات ذكية
 * Version: 2.0
 */

const EventEmitter = require('events');
const { v4: uuidv4 } = require('uuid');

class AdvancedChatbotService extends EventEmitter {
  constructor(config = {}) {
    super();
    this.conversations = new Map();
    this.knowledgeBase = new Map();
    this.userProfiles = new Map();
    this.intents = new Map();
    this.entities = new Map();
    this.learningData = [];
    this.metrics = {
      totalMessages: 0,
      totalUsers: 0,
      averageResponseTime: 0,
      successRate: 0,
      userSatisfaction: [],
    };
    this.config = {
      maxConversationLength: config.maxConversationLength || 100,
      conversationTimeout: config.conversationTimeout || 3600000, // 1 hour
      confidenceThreshold: config.confidenceThreshold || 0.6,
      learningEnabled: config.learningEnabled !== false,
      multiLanguageSupport: config.multiLanguageSupport !== false,
    };
    this.initializeCore();
  }

  /**
   * Initialize Core Systems
   */
  initializeCore() {
    this.initializeIntents();
    this.initializeKnowledgeBase();
    this.initializeEntityRecognizers();
  }

  /**
   * Initialize Intent Patterns
   */
  initializeIntents() {
    const intents = {
      // HR Intent
      'hr.salary': {
        patterns: ['salary', 'pay', 'compensation', 'راتب', 'رواتب'],
        responses: [
          'إليك معلومات الراتب الخاصة بك',
          'Your salary information is available in the HR module',
        ],
        priority: 1,
        category: 'hr',
        requiresContext: true,
      },
      'hr.leave': {
        patterns: ['leave', 'vacation', 'absent', 'absence', 'إجازة'],
        responses: [
          'يمكنك إدارة الإجازات من خلال وحدة الموارد البشرية',
          'You can manage leaves through the HR module',
        ],
        priority: 1,
        category: 'hr',
      },
      'hr.attendance': {
        patterns: ['attendance', 'present', 'check-in', 'check-out', 'حضور'],
        responses: [
          'معلومات الحضور متاحة في نظام الموارد البشرية',
          'Your attendance record is tracked in the system',
        ],
        priority: 1,
        category: 'hr',
      },
      // CRM Intent
      'crm.clients': {
        patterns: ['client', 'customer', 'contact', 'lead', 'عميل', 'عملاء'],
        responses: [
          'يمكنك إدارة العملاء من خلال نظام CRM',
          'Manage your clients in the CRM system',
        ],
        priority: 1,
        category: 'crm',
      },
      'crm.opportunities': {
        patterns: ['opportunity', 'deal', 'sales', 'revenue', 'فرصة'],
        responses: [
          'تتبع فرص المبيعات والعقود',
          'Track sales opportunities and deals',
        ],
        priority: 1,
        category: 'crm',
      },
      // Financial Intent
      'finance.budget': {
        patterns: ['budget', 'cost', 'expense', 'spending', 'ميزانية'],
        responses: [
          'معلومات الميزانية والمصروفات متاحة',
          'Budget and expense information available',
        ],
        priority: 1,
        category: 'finance',
      },
      'finance.reports': {
        patterns: ['financial report', 'balance', 'statement', 'تقرير مالي'],
        responses: [
          'التقارير المالية متاحة في نظام المحاسبة',
          'Financial reports available in accounting system',
        ],
        priority: 1,
        category: 'finance',
      },
      // General Intent
      'general.greeting': {
        patterns: ['hello', 'hi', 'hey', 'greetings', 'مرحبا', 'السلام عليكم'],
        responses: [
          'مرحبا! كيف يمكنني مساعدتك؟',
          'Hello! How can I assist you today?',
        ],
        priority: 0,
        category: 'general',
      },
      'general.help': {
        patterns: ['help', 'support', 'assist', 'guide', 'help me', 'ساعدني'],
        responses: [
          'أنا هنا لمساعدتك. ما الذي تحتاج إليه؟',
          "I'm here to help. What do you need?",
        ],
        priority: 1,
        category: 'general',
      },
      'general.faq': {
        patterns: ['faq', 'frequently asked', 'common questions', 'الأسئلة الشائعة'],
        responses: [
          'إليك الأسئلة الشائعة والإجابات عليها',
          'Here are frequently asked questions',
        ],
        priority: 0,
        category: 'general',
      },
    };

    intents.forEach((intent, key) => {
      this.intents.set(key, intent);
    });
  }

  /**
   * Initialize Knowledge Base
   */
  initializeKnowledgeBase() {
    const kb = {
      // HR Module
      'kb.hr.salary': {
        title: 'نظام الرواتب',
        description: 'معلومات عن الراتب والبدلات والخصومات',
        keywords: ['salary', 'الراتب', 'بدلات', 'allowances'],
        responses: {
          en: 'Access your salary details, view payslips, and track payment history.',
          ar: 'اعرض تفاصيل راتبك والمستلزمات والخصومات.',
        },
        relatedTopics: ['hr.leave', 'hr.attendance'],
        icon: 'salary',
      },
      'kb.hr.leave': {
        title: 'إدارة الإجازات',
        description: 'طلب الإجازات وإدارتها',
        keywords: ['leave', 'vacation', 'إجازة', 'عطلة'],
        responses: {
          en: 'Request leaves, view balance, track approvals',
          ar: 'اطلب إجازات، شاهد الرصيد، تتبع الموافقات',
        },
        relatedTopics: ['hr.attendance', 'hr.salary'],
        icon: 'calendar',
      },
      'kb.hr.attendance': {
        title: 'نظام الحضور',
        description: 'تتبع الحضور والغياب',
        keywords: ['attendance', 'present', 'حضور', 'غياب'],
        responses: {
          en: 'Track attendance records, check-in/out times',
          ar: 'تتبع سجلات الحضور وأوقات الدخول والخروج',
        },
        relatedTopics: ['hr.salary', 'hr.leave'],
        icon: 'checkin',
      },
      // CRM Module
      'kb.crm.clients': {
        title: 'إدارة العملاء',
        description: 'إدارة علاقات العملاء',
        keywords: ['client', 'customer', 'عميل', 'contact'],
        responses: {
          en: 'Manage customer profiles, interactions, and relationships',
          ar: 'إدارة ملفات العملاء والتفاعلات والعلاقات',
        },
        relatedTopics: ['crm.opportunities', 'crm.communications'],
        icon: 'users',
      },
      'kb.crm.opportunities': {
        title: 'فرص المبيعات',
        description: 'تتبع وإدارة فرص البيع',
        keywords: ['opportunity', 'deal', 'فرصة', 'عقد'],
        responses: {
          en: 'Track sales opportunities, manage pipeline, forecast revenue',
          ar: 'تتبع فرص المبيعات، إدارة المشروع، توقع الإيرادات',
        },
        relatedTopics: ['crm.clients', 'finance.reports'],
        icon: 'trends',
      },
      // Finance Module
      'kb.finance.budget': {
        title: 'إدارة الميزانية',
        description: 'التحكم في المصروفات والميزانيات',
        keywords: ['budget', 'cost', 'expense', 'ميزانية'],
        responses: {
          en: 'Monitor budgets, track expenses, and forecast costs',
          ar: 'مراقبة الميزانيات وتتبع المصروفات',
        },
        relatedTopics: ['finance.reports', 'finance.payment'],
        icon: 'chart',
      },
      'kb.finance.reports': {
        title: 'التقارير المالية',
        description: 'التقارير المالية الشاملة',
        keywords: ['report', 'financial', 'balance', 'تقرير'],
        responses: {
          en: 'Generate financial reports and view balance sheets',
          ar: 'إنشاء تقارير مالية وعرض الميزانيات العمومية',
        },
        relatedTopics: ['finance.budget', 'finance.audit'],
        icon: 'document',
      },
    };

    Object.entries(kb).forEach(([key, value]) => {
      this.knowledgeBase.set(key, value);
    });
  }

  /**
   * Initialize Entity Recognizers
   */
  initializeEntityRecognizers() {
    this.entities.set('module', {
      patterns: ['hr', 'crm', 'finance', 'elearning', 'documents', 'reports'],
      type: 'module',
      extractor: (text) => {
        const modules = ['hr', 'crm', 'finance', 'elearning', 'documents', 'reports'];
        return modules.find(m => text.toLowerCase().includes(m));
      },
    });

    this.entities.set('date', {
      patterns: [/(today|tomorrow|yesterday|this week|next week|next month)/i],
      type: 'date',
      extractor: (text) => {
        const dateMatch = text.match(/(today|tomorrow|yesterday|this week|next week)/i);
        return dateMatch ? dateMatch[1] : null;
      },
    });

    this.entities.set('action', {
      patterns: ['create', 'update', 'delete', 'view', 'search', 'export', 'import'],
      type: 'action',
      extractor: (text) => {
        const actions = ['create', 'update', 'delete', 'view', 'search', 'export', 'import'];
        return actions.find(a => text.toLowerCase().includes(a));
      },
    });
  }

  /**
   * Process User Message
   */
  async processMessage(userId, message, conversationId = null) {
    const startTime = Date.now();

    try {
      // Create or retrieve conversation
      if (!conversationId) {
        conversationId = this.createConversation(userId);
      }
      
      const conversation = this.conversations.get(conversationId);
      if (!conversation) {
        throw new Error('Conversation not found');
      }

      // Update user profile
      this.updateUserProfile(userId, message);

      // Analyze message
      const analysis = this.analyzeMessage(message);

      // Detect intent
      const intent = this.detectIntent(analysis);

      // Extract entities
      const extractedEntities = this.extractEntities(message);

      // Get context
      const context = this.getContext(userId, conversationId, extractedEntities);

      // Generate response
      const response = await this.generateResponse(
        userId,
        message,
        intent,
        extractedEntities,
        context
      );

      // Store in conversation
      conversation.messages.push({
        id: uuidv4(),
        role: 'user',
        content: message,
        timestamp: new Date(),
        analysis,
      });

      conversation.messages.push({
        id: uuidv4(),
        role: 'assistant',
        content: response.text,
        timestamp: new Date(),
        intent: intent.name,
        confidence: intent.confidence,
        entities: extractedEntities,
      });

      // Learn from interaction
      if (this.config.learningEnabled) {
        this.learnFromInteraction(userId, message, response, intent);
      }

      // Update metrics
      this.updateMetrics(startTime, response.success);

      return {
        success: true,
        conversationId,
        message: response.text,
        suggestions: response.suggestions,
        intent: intent.name,
        confidence: intent.confidence,
        entities: extractedEntities,
        actions: response.actions,
        metadata: {
          responseTime: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      console.error('Error processing message:', error);
      return {
        success: false,
        conversationId,
        error: error.message,
        fallbackResponse: 'عذراً، حدث خطأ في معالجة طلبك. سيتم تحويله لفريق الدعم.',
      };
    }
  }

  /**
   * Create New Conversation
   */
  createConversation(userId) {
    const conversationId = `conv_${userId}_${Date.now()}`;
    this.conversations.set(conversationId, {
      id: conversationId,
      userId,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      sentiment: 'neutral',
      satisfaction: null,
      status: 'active',
    });
    return conversationId;
  }

  /**
   * Analyze Message
   */
  analyzeMessage(message) {
    return {
      length: message.length,
      wordCount: message.split(/\s+/).length,
      language: this.detectLanguage(message),
      sentiment: this.analyzeSentiment(message),
      hasQuestionMark: message.includes('?'),
      hasExclamation: message.includes('!'),
      lowercase: message === message.toLowerCase(),
      containsNumbers: /\d+/.test(message),
    };
  }

  /**
   * Detect Message Language
   */
  detectLanguage(message) {
    const arabicRegex = /[\u0600-\u06FF]/g;
    const englishRegex = /[a-zA-Z]/g;
    
    const arabicMatches = message.match(arabicRegex) || [];
    const englishMatches = message.match(englishRegex) || [];

    if (arabicMatches.length > englishMatches.length) {
      return 'ar';
    }
    return 'en';
  }

  /**
   * Analyze Sentiment
   */
  analyzeSentiment(message) {
    const positiveWords = ['great', 'excellent', 'good', 'thanks', 'جميل', 'رائع', 'شكراً'];
    const negativeWords = ['bad', 'terrible', 'poor', 'hate', 'سيء', 'فظيع', 'كره'];

    const lowerMessage = message.toLowerCase();
    let sentiment = 'neutral';

    if (positiveWords.some(word => lowerMessage.includes(word))) {
      sentiment = 'positive';
    } else if (negativeWords.some(word => lowerMessage.includes(word))) {
      sentiment = 'negative';
    }

    return sentiment;
  }

  /**
   * Detect Intent
   */
  detectIntent(analysis) {
    // Priority-based intent detection
    let maxScore = 0;
    let detectedIntent = null;
    let maxConfidence = 0;

    for (const [intentId, intent] of this.intents.entries()) {
      const score = intent.patterns.length;
      const confidence = (score * intent.priority) / 10;

      if (confidence > maxScore) {
        maxScore = confidence;
        detectedIntent = intentId;
        maxConfidence = Math.min(confidence, 1);
      }
    }

    return {
      name: detectedIntent || 'general.help',
      confidence: maxConfidence || 0.5,
      category: this.intents.get(detectedIntent)?.category || 'general',
    };
  }

  /**
   * Extract Entities
   */
  extractEntities(message) {
    const extracted = [];

    for (const [entityType, entityConfig] of this.entities.entries()) {
      const result = entityConfig.extractor(message);
      if (result) {
        extracted.push({
          type: entityType,
          value: result,
          confidence: 0.9,
        });
      }
    }

    return extracted;
  }

  /**
   * Get Context
   */
  getContext(userId, conversationId, entities) {
    const userProfile = this.userProfiles.get(userId) || {};
    const conversation = this.conversations.get(conversationId) || { messages: [] };

    return {
      userId,
      conversationId,
      userRole: userProfile.role || 'user',
      userDepartment: userProfile.department || 'general',
      conversationLength: conversation.messages.length,
      previousEntities: conversation.messages
        .filter(m => m.entities)
        .flatMap(m => m.entities)
        .slice(-5),
      entities,
    };
  }

  /**
   * Generate Response
   */
  async generateResponse(userId, message, intent, entities, context) {
    try {
      const intentData = this.intents.get(intent.name);
      const response = {
        text: intentData?.responses[0] || 'كيف يمكنني مساعدتك؟',
        suggestions: [],
        actions: [],
        success: true,
      };

      // Get suggestions from knowledge base
      const kbEntry = Array.from(this.knowledgeBase.values()).find(
        kb => kb.keywords.some(kw => message.toLowerCase().includes(kw))
      );

      if (kbEntry) {
        response.suggestions = kbEntry.relatedTopics || [];
      }

      // Add contextual actions
      if (intent.category === 'hr') {
        response.actions = ['navigate_hr', 'view_hr_dashboard'];
      } else if (intent.category === 'crm') {
        response.actions = ['navigate_crm', 'view_crm_dashboard'];
      } else if (intent.category === 'finance') {
        response.actions = ['navigate_finance', 'view_finance_reports'];
      }

      return response;
    } catch (error) {
      return {
        text: 'عذراً، حدث خطأ في معالجة طلبك.',
        suggestions: [],
        actions: [],
        success: false,
      };
    }
  }

  /**
   * Update User Profile
   */
  updateUserProfile(userId, message) {
    if (!this.userProfiles.has(userId)) {
      this.userProfiles.set(userId, {
        totalMessages: 0,
        lastMessage: null,
        language: 'en',
        sentiments: [],
      });
    }

    const profile = this.userProfiles.get(userId);
    profile.totalMessages++;
    profile.lastMessage = new Date();
    profile.language = this.detectLanguage(message);
  }

  /**
   * Learn From Interaction
   */
  learnFromInteraction(userId, message, response, intent) {
    this.learningData.push({
      userId,
      message,
      response: response.text,
      intent: intent.name,
      timestamp: new Date(),
      satisfaction: null, // To be set later through feedback
    });
  }

  /**
   * Update Metrics
   */
  updateMetrics(startTime, success) {
    this.metrics.totalMessages++;
    const responseTime = Date.now() - startTime;
    this.metrics.averageResponseTime =
      (this.metrics.averageResponseTime + responseTime) / 2;

    if (success) {
      this.metrics.successRate = (this.metrics.totalMessages - 1) / this.metrics.totalMessages;
    }
  }

  /**
   * Get Conversation History
   */
  getConversationHistory(conversationId, limit = 50) {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      return null;
    }

    const messages = conversation.messages.slice(-limit);
    return {
      conversationId,
      messages,
      metadata: {
        totalMessages: conversation.messages.length,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        sentiment: conversation.sentiment,
      },
    };
  }

  /**
   * Get User Conversations
   */
  getUserConversations(userId, limit = 20) {
    const userConversations = Array.from(this.conversations.values()).filter(
      conv => conv.userId === userId
    );

    return userConversations
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, limit)
      .map(conv => ({
        id: conv.id,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
        messageCount: conv.messages.length,
        sentiment: conv.sentiment,
        status: conv.status,
      }));
  }

  /**
   * Rate Conversation
   */
  rateConversation(conversationId, rating, feedback = '') {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      return { success: false, error: 'Conversation not found' };
    }

    conversation.satisfaction = rating;
    conversation.feedback = feedback;
    this.metrics.userSatisfaction.push(rating);

    return {
      success: true,
      message: 'شكراً على تقييمك',
    };
  }

  /**
   * Get Chatbot Statistics
   */
  getStatistics() {
    const avgSatisfaction = this.metrics.userSatisfaction.length > 0
      ? (this.metrics.userSatisfaction.reduce((a, b) => a + b, 0) /
        this.metrics.userSatisfaction.length)
      : 0;

    return {
      totalMessages: this.metrics.totalMessages,
      totalUsers: this.userProfiles.size,
      totalConversations: this.conversations.size,
      averageResponseTime: Math.round(this.metrics.averageResponseTime),
      successRate: (this.metrics.successRate * 100).toFixed(2) + '%',
      userSatisfaction: avgSatisfaction.toFixed(2),
      knowledgeBaseSize: this.knowledgeBase.size,
      intentsCount: this.intents.size,
    };
  }

  /**
   * Get Recommendations
   */
  getRecommendations(userId) {
    const userProfile = this.userProfiles.get(userId);
    const userConversations = Array.from(this.conversations.values()).filter(
      conv => conv.userId === userId
    );

    const usedCategories = new Set();
    userConversations.forEach(conv => {
      conv.messages.forEach(msg => {
        if (msg.intent) {
          const category = this.intents.get(msg.intent)?.category;
          if (category) usedCategories.add(category);
        }
      });
    });

    const recommendations = [];
    for (const [id, intent] of this.intents.entries()) {
      if (!usedCategories.has(intent.category)) {
        recommendations.push({
          intentId: id,
          title: intent.patterns[0],
          description: `Learn more about ${intent.category}`,
        });
      }
    }

    return recommendations;
  }

  /**
   * Clear Conversation
   */
  clearConversation(conversationId) {
    if (this.conversations.has(conversationId)) {
      this.conversations.delete(conversationId);
      return { success: true, message: 'Conversation cleared' };
    }
    return { success: false, error: 'Conversation not found' };
  }

  /**
   * Export Learning Data
   */
  exportLearningData() {
    return {
      learningDataPoints: this.learningData.length,
      data: this.learningData,
      timestamp: new Date().toISOString(),
    };
  }
}

module.exports = AdvancedChatbotService;
