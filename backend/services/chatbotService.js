/**
 * AI Chatbot Service
 * Natural Language Processing, Intent Recognition, and Conversational AI
 */

// In-memory storage
let conversations = new Map();
let chatbotKB = new Map(); // Knowledge Base
let userSessions = new Map();

class ChatbotService {
  constructor() {
    this.initializeKnowledgeBase();
  }

  /**
   * Initialize Knowledge Base
   */
  initializeKnowledgeBase() {
    // HR Module Q&A
    chatbotKB.set('hr-salary', {
      keywords: ['salary', 'pay', 'wages', 'compensation'],
      response: 'Your salary is available in the HR module. You can view detailed breakdown including base, allowances, and deductions.',
      actions: ['navigate_hr'],
    });

    chatbotKB.set('hr-leave', {
      keywords: ['leave', 'vacation', 'absent', 'time-off'],
      response: 'You can manage leave through the HR module. Request leave, view balance, and track approvals.',
      actions: ['navigate_hr'],
    });

    // CRM Module Q&A
    chatbotKB.set('crm-clients', {
      keywords: ['client', 'customer', 'contact', 'lead'],
      response: 'Manage your clients in the CRM module. View details, track interactions, and manage relationships.',
      actions: ['navigate_crm'],
    });

    chatbotKB.set('crm-opportunities', {
      keywords: ['opportunity', 'deal', 'opportunity', 'sales'],
      response: 'Track sales opportunities in the CRM module. Monitor deals, manage pipelines, and forecast revenue.',
      actions: ['navigate_crm'],
    });

    // E-Learning Module Q&A
    chatbotKB.set('elearning-courses', {
      keywords: ['course', 'training', 'learning', 'learn'],
      response: 'Browse and enroll in courses through the E-Learning module. Track your progress and earn certificates.',
      actions: ['navigate_elearning'],
    });

    // Documents Module Q&A
    chatbotKB.set('documents-files', {
      keywords: ['document', 'file', 'folder', 'upload'],
      response: 'Manage documents in the Documents module. Upload, organize, and share files securely.',
      actions: ['navigate_documents'],
    });

    // Reports Module Q&A
    chatbotKB.set('reports-analytics', {
      keywords: ['report', 'analytics', 'dashboard', 'statistics'],
      response: 'View comprehensive reports and analytics in the Reports module. Analyze performance and trends.',
      actions: ['navigate_reports'],
    });

    // General Q&A
    chatbotKB.set('help-general', {
      keywords: ['help', 'support', 'how', 'guide'],
      response: 'How can I assist you? You can ask me about HR, CRM, E-Learning, Documents, or Reports.',
      actions: [],
    });

    chatbotKB.set('greeting', {
      keywords: ['hello', 'hi', 'greetings', 'hey'],
      response: 'مرحبا! Hello! 👋 How can I help you today?',
      actions: [],
    });

    chatbotKB.set('thank-you', {
      keywords: ['thanks', 'thank', 'appreciate', 'grateful'],
      response: "You're welcome! Feel free to ask me anything.",
      actions: [],
    });
  }

  /**
   * Process user message and generate response
   */
  async chat(userId, message, conversationId = null) {
    try {
      // Create or get conversation
      let conversation;
      if (!conversationId) {
        conversationId = `conv_${Date.now()}`;
        conversation = {
          id: conversationId,
          userId,
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      } else {
        conversation = conversations.get(conversationId) || {
          id: conversationId,
          userId,
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }

      // Add user message
      conversation.messages.push({
        role: 'user',
        content: message,
        timestamp: new Date(),
      });

      // Analyze intent and generate response
      const response = await this.analyzeAndRespond(message);

      // Add bot response
      conversation.messages.push({
        role: 'bot',
        content: response.message,
        actions: response.actions,
        timestamp: new Date(),
      });

      // Update conversation
      conversation.updatedAt = new Date();
      conversations.set(conversationId, conversation);

      return {
        success: true,
        conversationId,
        response: {
          message: response.message,
          actions: response.actions,
          intent: response.intent,
          confidence: response.confidence,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Analyze message and generate response
   */
  async analyzeAndRespond(message) {
    try {
      const lowerMessage = message.toLowerCase();

      // Find matching intent from knowledge base
      let bestMatch = null;
      let highestScore = 0;

      chatbotKB.forEach((kb, key) => {
        kb.keywords.forEach(keyword => {
          if (lowerMessage.includes(keyword.toLowerCase())) {
            const score = this.calculateScore(message, keyword);
            if (score > highestScore) {
              highestScore = score;
              bestMatch = kb;
            }
          }
        });
      });

      if (bestMatch && highestScore > 0.3) {
        return {
          message: bestMatch.response,
          actions: bestMatch.actions,
          intent: Array.from(chatbotKB.entries()).find(([_, v]) => v === bestMatch)?.[0],
          confidence: Math.min(highestScore, 1.0),
        };
      }

      // Fallback response
      return {
        message:
          'I understand you\'re asking about "' +
          message +
          '". Could you rephrase that or ask me about HR, CRM, E-Learning, Documents, or Reports?',
        actions: [],
        intent: 'unknown',
        confidence: 0.0,
      };
    } catch (error) {
      return {
        message: 'I encountered an error processing your message. Please try again.',
        actions: [],
        intent: 'error',
        confidence: 0.0,
      };
    }
  }

  /**
   * Calculate relevance score
   */
  calculateScore(message, keyword) {
    const messageWords = message.toLowerCase().split(' ');
    const keywordWords = keyword.toLowerCase().split(' ');

    const matches = messageWords.filter(word => keywordWords.some(kw => kw.includes(word) || word.includes(kw))).length;

    return matches / keywordWords.length;
  }

  /**
   * Get conversation history
   */
  async getConversation(conversationId) {
    try {
      const conversation = conversations.get(conversationId);

      if (!conversation) {
        return {
          success: false,
          error: 'Conversation not found',
        };
      }

      return {
        success: true,
        conversation,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get user conversations
   */
  async getUserConversations(userId, limit = 50) {
    try {
      const userConversations = Array.from(conversations.values())
        .filter(c => c.userId === userId)
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
        .slice(0, limit)
        .map(c => ({
          id: c.id,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
          messageCount: c.messages.length,
          preview: c.messages[0]?.content || '',
        }));

      return {
        success: true,
        conversations: userConversations,
        total: Array.from(conversations.values()).filter(c => c.userId === userId).length,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Clear conversation
   */
  async clearConversation(conversationId) {
    try {
      conversations.delete(conversationId);

      return {
        success: true,
        message: 'Conversation cleared',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get chatbot suggestions
   */
  async getSuggestions() {
    try {
      const suggestions = [
        'Tell me about HR features',
        'How do I manage clients?',
        'What courses are available?',
        'How to upload documents?',
        'Show me reports and analytics',
      ];

      return {
        success: true,
        suggestions,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Train chatbot with new patterns
   */
  async trainChatbot(intent, keywords, response, actions = []) {
    try {
      chatbotKB.set(intent, {
        keywords,
        response,
        actions,
      });

      return {
        success: true,
        message: 'Chatbot trained successfully',
        intent,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get chatbot statistics
   */
  async getChatbotStats() {
    try {
      const stats = {
        totalConversations: conversations.size,
        totalMessages: Array.from(conversations.values()).reduce((sum, c) => sum + c.messages.length, 0),
        knowledgeBaseSize: chatbotKB.size,
        averageMessagesPerConversation: 0,
      };

      if (conversations.size > 0) {
        stats.averageMessagesPerConversation = stats.totalMessages / conversations.size;
      }

      return {
        success: true,
        stats,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send automated response based on trigger
   */
  async sendAutomatedMessage(userId, trigger, data = {}) {
    try {
      let message = '';
      let actions = [];

      switch (trigger) {
        case 'welcome':
          message = 'مرحبا بك! Welcome to our system. How can I help you?';
          break;
        case 'new-course':
          message = `A new course "${data.courseName}" is available! Would you like to enroll?`;
          actions = ['view_course'];
          break;
        case 'leave-approved':
          message = `Your leave request for ${data.dates} has been approved!`;
          actions = ['view_leave'];
          break;
        case 'document-shared':
          message = `A new document "${data.documentName}" has been shared with you.`;
          actions = ['view_document'];
          break;
        default:
          message = 'You have a new update.';
      }

      const conversationId = `conv_${Date.now()}`;
      const conversation = {
        id: conversationId,
        userId,
        messages: [
          {
            role: 'bot',
            content: message,
            actions,
            timestamp: new Date(),
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
        automated: true,
      };

      conversations.set(conversationId, conversation);

      return {
        success: true,
        message: 'Automated message sent',
        conversationId,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

module.exports = ChatbotService;
