"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const crm_ticket_model_1 = __importDefault(require("../models/crm.ticket.model"));
const router = express_1.default.Router();
// Get all tickets
router.get('/', async (req, res) => {
    try {
        const tickets = await crm_ticket_model_1.default.find().populate('customer');
        res.json(tickets);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to fetch tickets' });
    }
});
// Get single ticket
router.get('/:id', async (req, res) => {
    try {
        const ticket = await crm_ticket_model_1.default.findById(req.params.id).populate('customer');
        if (!ticket)
            return res.status(404).json({ error: 'Ticket not found' });
        res.json(ticket);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to fetch ticket' });
    }
});
// Create ticket
router.post('/', async (req, res) => {
    try {
        const ticket = new crm_ticket_model_1.default(req.body);
        await ticket.save();
        res.status(201).json(ticket);
    }
    catch (err) {
        res.status(400).json({ error: 'Failed to create ticket' });
    }
});
// Update ticket
router.put('/:id', async (req, res) => {
    try {
        const ticket = await crm_ticket_model_1.default.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!ticket)
            return res.status(404).json({ error: 'Ticket not found' });
        res.json(ticket);
    }
    catch (err) {
        res.status(400).json({ error: 'Failed to update ticket' });
    }
});
// Delete ticket
router.delete('/:id', async (req, res) => {
    try {
        const ticket = await crm_ticket_model_1.default.findByIdAndDelete(req.params.id);
        if (!ticket)
            return res.status(404).json({ error: 'Ticket not found' });
        res.json({ message: 'Ticket deleted' });
    }
    catch (err) {
        res.status(400).json({ error: 'Failed to delete ticket' });
    }
});
exports.default = router;
