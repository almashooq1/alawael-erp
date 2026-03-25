// Support Routes
const express = require('express');
const SupportService = require('../services/supportService');
const { ApiResponse, ApiError } = require('../utils/apiResponse');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// All support routes require authentication
router.use(authenticate);

// Create ticket
router.post('/tickets/create', (req, res, next) => {
  try {
    const ticket = SupportService.createTicket(req.body);
    return res.status(201).json(new ApiResponse(201, ticket, 'Support ticket created'));
  } catch (error) {
    return next(new ApiError(500, 'Failed to create support ticket', ['حدث خطأ داخلي']));
  }
});

// Get all tickets
router.get('/tickets', (req, res, next) => {
  try {
    const tickets = SupportService.getAllTickets(req.query);
    return res.json(new ApiResponse(200, tickets, 'Support tickets fetched'));
  } catch (error) {
    return next(new ApiError(500, 'Failed to fetch support tickets', ['حدث خطأ داخلي']));
  }
});

// Get single ticket
router.get('/tickets/:id', (req, res, next) => {
  try {
    const ticket = SupportService.getTicketById
      ? SupportService.getTicketById(req.params.id)
      : null;
    if (!ticket) {
      return next(new ApiError(404, 'Support ticket not found'));
    }
    return res.json(new ApiResponse(200, ticket, 'Support ticket fetched'));
  } catch (error) {
    return next(new ApiError(500, 'Failed to fetch support ticket', ['حدث خطأ داخلي']));
  }
});

// Update ticket status
router.put('/tickets/:id/status', (req, res, next) => {
  try {
    const result = SupportService.updateTicketStatus(req.params.id, req.body.status);
    return res.json(new ApiResponse(200, result, 'Ticket status updated'));
  } catch (error) {
    return next(new ApiError(500, 'Failed to update ticket status', ['حدث خطأ داخلي']));
  }
});

// Add comment to ticket
router.post('/tickets/:id/comments', (req, res, next) => {
  try {
    const comment = SupportService.addComment(req.params.id, req.body);
    return res.status(201).json(new ApiResponse(201, comment, 'Comment added'));
  } catch (error) {
    return next(new ApiError(500, 'Failed to add comment', ['حدث خطأ داخلي']));
  }
});

// Delete ticket
router.delete('/tickets/:id', authorize(['admin']), (req, res, next) => {
  try {
    const result = SupportService.deleteTicket ? SupportService.deleteTicket(req.params.id) : null;
    if (!result) {
      return next(new ApiError(404, 'Support ticket not found'));
    }
    return res.json(new ApiResponse(200, result, 'Support ticket deleted'));
  } catch (error) {
    return next(new ApiError(500, 'Failed to delete support ticket', ['حدث خطأ داخلي']));
  }
});

// Get ticket statistics
router.get('/statistics', (_req, res, next) => {
  try {
    const stats = SupportService.getTicketStats();
    return res.json(new ApiResponse(200, stats, 'Ticket statistics fetched'));
  } catch (error) {
    return next(new ApiError(500, 'Failed to fetch ticket statistics', ['حدث خطأ داخلي']));
  }
});

// Get FAQ
router.get('/faq', (_req, res, next) => {
  try {
    const faq = SupportService.getFAQ();
    return res.json(new ApiResponse(200, faq, 'FAQ fetched'));
  } catch (error) {
    return next(new ApiError(500, 'Failed to fetch FAQ', ['حدث خطأ داخلي']));
  }
});

// Get team status
router.get('/team/status', (_req, res, next) => {
  try {
    const teamStatus = SupportService.getTeamStatus();
    return res.json(new ApiResponse(200, teamStatus, 'Team status fetched'));
  } catch (error) {
    return next(new ApiError(500, 'Failed to fetch team status', ['حدث خطأ داخلي']));
  }
});

// Search knowledge base
router.get('/kb/search', (req, res, next) => {
  try {
    const results = SupportService.searchKnowledgeBase(req.query.q || '');
    return res.json(new ApiResponse(200, results, 'Knowledge base search results'));
  } catch (error) {
    return next(new ApiError(500, 'Failed to search knowledge base', ['حدث خطأ داخلي']));
  }
});

module.exports = router;
