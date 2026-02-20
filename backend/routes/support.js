// Support Routes
const express = require('express');
const SupportService = require('../services/supportService');
const { ApiResponse, ApiError } = require('../utils/apiResponse');

const router = express.Router();

// Create ticket
router.post('/tickets/create', (req, res, next) => {
  try {
    const ticket = SupportService.createTicket(req.body);
    return res.status(201).json(new ApiResponse(201, ticket, 'Support ticket created'));
  } catch (error) {
    return next(new ApiError(500, 'Failed to create support ticket', [error.message]));
  }
});

// Get all tickets
router.get('/tickets', (req, res, next) => {
  try {
    const tickets = SupportService.getAllTickets(req.query);
    return res.json(new ApiResponse(200, tickets, 'Support tickets fetched'));
  } catch (error) {
    return next(new ApiError(500, 'Failed to fetch support tickets', [error.message]));
  }
});

// Update ticket status
router.put('/tickets/:id/status', (req, res, next) => {
  try {
    const result = SupportService.updateTicketStatus(req.params.id, req.body.status);
    return res.json(new ApiResponse(200, result, 'Ticket status updated'));
  } catch (error) {
    return next(new ApiError(500, 'Failed to update ticket status', [error.message]));
  }
});

// Add comment to ticket
router.post('/tickets/:id/comments', (req, res, next) => {
  try {
    const comment = SupportService.addComment(req.params.id, req.body);
    return res.status(201).json(new ApiResponse(201, comment, 'Comment added'));
  } catch (error) {
    return next(new ApiError(500, 'Failed to add comment', [error.message]));
  }
});

// Get ticket statistics
router.get('/statistics', (req, res, next) => {
  try {
    const stats = SupportService.getTicketStats();
    return res.json(new ApiResponse(200, stats, 'Ticket statistics fetched'));
  } catch (error) {
    return next(new ApiError(500, 'Failed to fetch ticket statistics', [error.message]));
  }
});

// Get FAQ
router.get('/faq', (req, res, next) => {
  try {
    const faq = SupportService.getFAQ();
    return res.json(new ApiResponse(200, faq, 'FAQ fetched'));
  } catch (error) {
    return next(new ApiError(500, 'Failed to fetch FAQ', [error.message]));
  }
});

// Get team status
router.get('/team/status', (req, res, next) => {
  try {
    const teamStatus = SupportService.getTeamStatus();
    return res.json(new ApiResponse(200, teamStatus, 'Team status fetched'));
  } catch (error) {
    return next(new ApiError(500, 'Failed to fetch team status', [error.message]));
  }
});

// Search knowledge base
router.get('/kb/search', (req, res, next) => {
  try {
    const results = SupportService.searchKnowledgeBase(req.query.q || '');
    return res.json(new ApiResponse(200, results, 'Knowledge base search results'));
  } catch (error) {
    return next(new ApiError(500, 'Failed to search knowledge base', [error.message]));
  }
});

module.exports = router;
