"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const crm_customer_model_1 = __importDefault(require("../models/crm.customer.model"));
const router = express_1.default.Router();
// Get all customers
router.get('/', async (req, res) => {
    try {
        const customers = await crm_customer_model_1.default.find();
        res.json(customers);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to fetch customers' });
    }
});
// Get single customer
router.get('/:id', async (req, res) => {
    try {
        const customer = await crm_customer_model_1.default.findById(req.params.id);
        if (!customer)
            return res.status(404).json({ error: 'Customer not found' });
        res.json(customer);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to fetch customer' });
    }
});
// Create customer
router.post('/', async (req, res) => {
    try {
        const customer = new crm_customer_model_1.default(req.body);
        await customer.save();
        res.status(201).json(customer);
    }
    catch (err) {
        console.error('Customer creation error:', err);
        res.status(400).json({ error: 'Failed to create customer', details: err?.message || err });
    }
});
// Update customer
router.put('/:id', async (req, res) => {
    try {
        const customer = await crm_customer_model_1.default.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!customer)
            return res.status(404).json({ error: 'Customer not found' });
        res.json(customer);
    }
    catch (err) {
        res.status(400).json({ error: 'Failed to update customer' });
    }
});
// Delete customer
router.delete('/:id', async (req, res) => {
    try {
        const customer = await crm_customer_model_1.default.findByIdAndDelete(req.params.id);
        if (!customer)
            return res.status(404).json({ error: 'Customer not found' });
        res.json({ message: 'Customer deleted' });
    }
    catch (err) {
        res.status(400).json({ error: 'Failed to delete customer' });
    }
});
exports.default = router;
