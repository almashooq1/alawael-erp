"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const crm_opportunity_model_1 = __importDefault(require("../models/crm.opportunity.model"));
const router = express_1.default.Router();
// Get all opportunities
router.get('/', async (req, res) => {
    try {
        const opportunities = await crm_opportunity_model_1.default.find().populate('customer');
        res.json(opportunities);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to fetch opportunities' });
    }
});
// Get single opportunity
router.get('/:id', async (req, res) => {
    try {
        const opportunity = await crm_opportunity_model_1.default.findById(req.params.id).populate('customer');
        if (!opportunity)
            return res.status(404).json({ error: 'Opportunity not found' });
        res.json(opportunity);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to fetch opportunity' });
    }
});
// Create opportunity
router.post('/', async (req, res) => {
    try {
        const opportunity = new crm_opportunity_model_1.default(req.body);
        await opportunity.save();
        res.status(201).json(opportunity);
    }
    catch (err) {
        res.status(400).json({ error: 'Failed to create opportunity' });
    }
});
// Update opportunity
router.put('/:id', async (req, res) => {
    try {
        const opportunity = await crm_opportunity_model_1.default.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!opportunity)
            return res.status(404).json({ error: 'Opportunity not found' });
        res.json(opportunity);
    }
    catch (err) {
        res.status(400).json({ error: 'Failed to update opportunity' });
    }
});
// Delete opportunity
router.delete('/:id', async (req, res) => {
    try {
        const opportunity = await crm_opportunity_model_1.default.findByIdAndDelete(req.params.id);
        if (!opportunity)
            return res.status(404).json({ error: 'Opportunity not found' });
        res.json({ message: 'Opportunity deleted' });
    }
    catch (err) {
        res.status(400).json({ error: 'Failed to delete opportunity' });
    }
});
exports.default = router;
