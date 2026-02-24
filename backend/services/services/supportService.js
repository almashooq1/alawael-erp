// Technical Support System Service
// نظام الدعم الفني

class SupportService {
  constructor() {
    // In-memory storage for tickets
    this.tickets = [];
    this.ticketCounter = 1000;
  }

  // Create Support Ticket
  static createTicket(data) {
    const ticket = {
      id: `TICKET_${Date.now()}`,
      title: data.title,
      description: data.description,
      priority: data.priority || 'normal', // low, normal, high, critical
      category: data.category || 'general',
      status: 'open',
      createdBy: data.userId || 'user_123',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      assignedTo: null,
      comments: [],
      attachments: data.attachments || [],
    };

    return {
      success: true,
      ticket: ticket,
      message: 'Ticket created successfully',
    };
  }

  // Get All Tickets
  static getAllTickets(filters = {}) {
    const mockTickets = [
      {
        id: 'TICKET_001',
        title: 'Backend API Error',
        description: 'API returning 500 error',
        priority: 'high',
        category: 'technical',
        status: 'in_progress',
        createdBy: 'user_123',
        createdAt: new Date(Date.now() - 2 * 60000).toISOString(),
        assignedTo: 'support_001',
      },
      {
        id: 'TICKET_002',
        title: 'Feature Request: Export PDF',
        description: 'Add PDF export functionality',
        priority: 'normal',
        category: 'feature',
        status: 'open',
        createdBy: 'user_456',
        createdAt: new Date(Date.now() - 30 * 60000).toISOString(),
        assignedTo: null,
      },
      {
        id: 'TICKET_003',
        title: 'Report Generation Slow',
        description: 'Reports taking too long to generate',
        priority: 'high',
        category: 'performance',
        status: 'resolved',
        createdBy: 'user_789',
        createdAt: new Date(Date.now() - 24 * 60 * 60000).toISOString(),
        assignedTo: 'support_002',
      },
    ];

    let filtered = mockTickets;
    if (filters.status) {
      filtered = filtered.filter(t => t.status === filters.status);
    }
    if (filters.priority) {
      filtered = filtered.filter(t => t.priority === filters.priority);
    }

    return {
      success: true,
      tickets: filtered,
      totalCount: filtered.length,
      timestamp: new Date().toISOString(),
    };
  }

  // Update Ticket Status
  static updateTicketStatus(ticketId, newStatus) {
    const validStatuses = ['open', 'in_progress', 'on_hold', 'resolved', 'closed'];

    if (!validStatuses.includes(newStatus)) {
      return {
        success: false,
        error: 'Invalid status',
      };
    }

    return {
      success: true,
      ticket: {
        id: ticketId,
        status: newStatus,
        updatedAt: new Date().toISOString(),
      },
      message: `Ticket status updated to ${newStatus}`,
    };
  }

  // Add Comment to Ticket
  static addComment(ticketId, commentData) {
    const comment = {
      id: `COMMENT_${Date.now()}`,
      author: commentData.author,
      text: commentData.text,
      createdAt: new Date().toISOString(),
      attachments: commentData.attachments || [],
    };

    return {
      success: true,
      comment: comment,
      ticketId: ticketId,
      message: 'Comment added successfully',
    };
  }

  // Get Ticket Statistics
  static getTicketStats() {
    return {
      success: true,
      statistics: {
        totalTickets: 145,
        openTickets: 32,
        inProgressTickets: 18,
        resolvedTickets: 89,
        closedTickets: 6,
        averageResolutionTime: '4.5 hours',
        averageResponseTime: '15 minutes',
        satisfactionRating: 4.6,
        byPriority: {
          critical: 2,
          high: 8,
          normal: 15,
          low: 7,
        },
        byCategory: {
          technical: 28,
          feature: 12,
          performance: 8,
          general: 14,
        },
      },
      timestamp: new Date().toISOString(),
    };
  }

  // Get FAQ
  static getFAQ() {
    return {
      success: true,
      faq: [
        {
          id: 'faq_001',
          question: 'How do I reset my password?',
          answer:
            'Go to login page and click "Forgot Password". Follow the instructions sent to your email.',
          category: 'account',
          views: 234,
        },
        {
          id: 'faq_002',
          question: 'How do I generate a report?',
          answer:
            'Click on Reports tab, select filters, and click "Generate". You can export in CSV, JSON, or Excel format.',
          category: 'reports',
          views: 567,
        },
        {
          id: 'faq_003',
          question: 'What is the maximum file size for uploads?',
          answer: 'Maximum file size is 100MB. For larger files, please contact support.',
          category: 'technical',
          views: 123,
        },
        {
          id: 'faq_004',
          question: 'How often are backups performed?',
          answer: 'We perform daily backups at 2:00 AM UTC and weekly full backups on Sundays.',
          category: 'security',
          views: 89,
        },
      ],
      timestamp: new Date().toISOString(),
    };
  }

  // Get Support Team Status
  static getTeamStatus() {
    return {
      success: true,
      team: {
        totalAgents: 12,
        onlineAgents: 9,
        busyAgents: 5,
        availableAgents: 4,
        agents: [
          { id: 'support_001', name: 'Ahmed', status: 'available', handledTickets: 87 },
          { id: 'support_002', name: 'Fatima', status: 'busy', handledTickets: 156 },
          { id: 'support_003', name: 'Mohammed', status: 'available', handledTickets: 92 },
          { id: 'support_004', name: 'Noor', status: 'break', handledTickets: 45 },
        ],
        averageWaitTime: '3 minutes',
        totalHandledToday: 87,
      },
      timestamp: new Date().toISOString(),
    };
  }

  // Knowledge Base Search
  static searchKnowledgeBase(query) {
    const articles = [
      {
        id: 'kb_001',
        title: 'Getting Started with ERP System',
        content: 'This guide covers basic setup and configuration...',
        category: 'Getting Started',
        views: 890,
        rating: 4.8,
      },
      {
        id: 'kb_002',
        title: 'API Integration Guide',
        content: 'Complete documentation for API integrations...',
        category: 'Integration',
        views: 456,
        rating: 4.5,
      },
    ];

    return {
      success: true,
      results: articles.filter(
        a =>
          a.title.toLowerCase().includes(query.toLowerCase()) ||
          a.content.toLowerCase().includes(query.toLowerCase())
      ),
      timestamp: new Date().toISOString(),
    };
  }
}

module.exports = SupportService;
