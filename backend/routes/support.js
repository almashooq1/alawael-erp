// Support Routes
const express = require('express');
const SupportService = require('../services/supportService');

const router = express.Router();

// Create ticket
router.post('/tickets/create', (req, res) => {
  try {
    const ticket = SupportService.createTicket(req.body);
    res.status(201).json(ticket);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all tickets
router.get('/tickets', (req, res) => {
  try {
    const tickets = SupportService.getAllTickets(req.query);
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update ticket status
router.put('/tickets/:id/status', (req, res) => {
  try {
    const result = SupportService.updateTicketStatus(req.params.id, req.body.status);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add comment to ticket
router.post('/tickets/:id/comments', (req, res) => {
  try {
    const comment = SupportService.addComment(req.params.id, req.body);
    res.status(201).json(comment);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get ticket statistics
router.get('/statistics', (req, res) => {
  try {
    const stats = SupportService.getTicketStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get FAQ
router.get('/faq', (req, res) => {
  try {
    const faq = SupportService.getFAQ();
    res.json(faq);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get team status
router.get('/team/status', (req, res) => {
  try {
    const teamStatus = SupportService.getTeamStatus();
    res.json(teamStatus);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Search knowledge base
router.get('/kb/search', (req, res) => {
  try {
    const results = SupportService.searchKnowledgeBase(req.query.q || '');
    res.json(results);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
