import express from 'express';
import Ticket from '../models/crm.ticket.model';

const router = express.Router();

// Get all tickets
router.get('/', async (req, res) => {
  try {
    const tickets = await Ticket.find().populate('customer');
    res.json(tickets);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

// Get single ticket
router.get('/:id', async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id).populate('customer');
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    res.json(ticket);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch ticket' });
  }
});

// Create ticket
router.post('/', async (req, res) => {
  try {
    const ticket = new Ticket(req.body);
    await ticket.save();
    res.status(201).json(ticket);
  } catch (err) {
    res.status(400).json({ error: 'Failed to create ticket' });
  }
});

// Update ticket
router.put('/:id', async (req, res) => {
  try {
    const ticket = await Ticket.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    res.json(ticket);
  } catch (err) {
    res.status(400).json({ error: 'Failed to update ticket' });
  }
});

// Delete ticket
router.delete('/:id', async (req, res) => {
  try {
    const ticket = await Ticket.findByIdAndDelete(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    res.json({ message: 'Ticket deleted' });
  } catch (err) {
    res.status(400).json({ error: 'Failed to delete ticket' });
  }
});

export default router;
