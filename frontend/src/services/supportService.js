// Support Service
import apiClient from './apiClient';

const supportService = {
  // Create ticket
  createTicket: async ticketData => {
    return await apiClient.post('/support/tickets', ticketData);
  },

  // Get all tickets
  getTickets: async (params = {}) => {
    return await apiClient.get('/support/tickets', { params });
  },

  // Get ticket by ID
  getTicketById: async ticketId => {
    return await apiClient.get(`/support/tickets/${ticketId}`);
  },

  // Update ticket
  updateTicket: async (ticketId, updateData) => {
    return await apiClient.patch(`/support/tickets/${ticketId}`, updateData);
  },

  // Add comment to ticket
  addComment: async (ticketId, comment) => {
    return await apiClient.post(`/support/tickets/${ticketId}/comments`, {
      comment,
    });
  },

  // Close ticket
  closeTicket: async ticketId => {
    return await apiClient.patch(`/support/tickets/${ticketId}/close`);
  },

  // Search knowledge base
  searchKnowledgeBase: async query => {
    return await apiClient.get('/support/kb/search', { params: { q: query } });
  },

  // Get FAQs
  getFAQs: async () => {
    return await apiClient.get('/support/faqs');
  },
};

export default supportService;
