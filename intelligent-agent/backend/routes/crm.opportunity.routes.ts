import express from 'express';
import Opportunity from '../models/crm.opportunity.model';

const router = express.Router();

// Get all opportunities
router.get('/', async (req, res) => {
  try {
    const opportunities = await Opportunity.find().populate('customer');
    res.json(opportunities);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch opportunities' });
  }
});

// Get single opportunity
router.get('/:id', async (req, res) => {
  try {
    const opportunity = await Opportunity.findById(req.params.id).populate('customer');
    if (!opportunity) return res.status(404).json({ error: 'Opportunity not found' });
    res.json(opportunity);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch opportunity' });
  }
});

// Create opportunity
router.post('/', async (req, res) => {
  try {
    const opportunity = new Opportunity(req.body);
    await opportunity.save();
    res.status(201).json(opportunity);
  } catch (err) {
    res.status(400).json({ error: 'Failed to create opportunity' });
  }
});

// Update opportunity
router.put('/:id', async (req, res) => {
  try {
    const opportunity = await Opportunity.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!opportunity) return res.status(404).json({ error: 'Opportunity not found' });
    res.json(opportunity);
  } catch (err) {
    res.status(400).json({ error: 'Failed to update opportunity' });
  }
});

// Delete opportunity
router.delete('/:id', async (req, res) => {
  try {
    const opportunity = await Opportunity.findByIdAndDelete(req.params.id);
    if (!opportunity) return res.status(404).json({ error: 'Opportunity not found' });
    res.json({ message: 'Opportunity deleted' });
  } catch (err) {
    res.status(400).json({ error: 'Failed to delete opportunity' });
  }
});

export default router;
