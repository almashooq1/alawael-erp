const express = require('express');
const router = express.Router();
const TherapyProgram = require('../models/TherapyProgram');
const TherapeuticPlan = require('../models/TherapeuticPlan');
const TherapySession = require('../models/TherapySession');
const Invoice = require('../models/Invoice'); // Import Invoice Model
const Employee = require('../models/Employee');
const { authenticateToken } = require('../middleware/auth.middleware');
const AuditService = require('../services/audit.service');
const AIService = require('../services/ai.service'); // Import AI Service

router.use(authenticateToken);

// ================= PROGRAMS (Catalog) =================

router.get('/programs', async (req, res) => {
  try {
    const programs = await TherapyProgram.find({ isActive: true });
    res.json({ success: true, data: programs });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/programs', async (req, res) => {
  try {
    const program = new TherapyProgram(req.body);
    await program.save();
    res.status(201).json({ success: true, data: program });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// ================= PLANS (Enrollment) =================

router.get('/plans', async (req, res) => {
  try {
    const { beneficiaryId } = req.query;
    const query = beneficiaryId ? { beneficiary: beneficiaryId } : {};

    const plans = await TherapeuticPlan.find(query)
      .populate('program')
      .populate('beneficiary', 'firstName lastName fileNumber')
      .populate('assignedTherapists', 'firstName lastName');

    res.json({ success: true, data: plans });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/plans', async (req, res) => {
  try {
    const plan = new TherapeuticPlan(req.body);
    await plan.save();
    await AuditService.log(req, 'ENROLL_PATIENT', 'REHAB', { id: plan.id, type: 'Plan' });
    res.status(201).json({ success: true, data: plan });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// ================= SESSIONS (Scheduling) =================

router.get('/sessions', async (req, res) => {
  try {
    const { date, therapistId, beneficiaryId } = req.query;
    const query = {};

    if (date) {
      // Simple day range query
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      query.date = { $gte: startOfDay, $lte: endOfDay };
    }
    if (therapistId) query.therapist = therapistId;
    if (beneficiaryId) query.beneficiary = beneficiaryId;

    const sessions = await TherapySession.find(query)
      .populate('beneficiary', 'firstName lastName')
      .populate('therapist', 'firstName lastName')
      .populate('plan', 'status')
      .sort({ startTime: 1 });

    res.json({ success: true, data: sessions });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/sessions', async (req, res) => {
  try {
    const { therapist, date, startTime, endTime } = req.body;

    // 1. Conflict Check (Basic) - Therapist
    const conflict = await TherapySession.findOne({
      therapist,
      date: new Date(date), // Check exact date matching logic in production
      status: { $nin: ['CANCELLED_BY_PATIENT', 'CANCELLED_BY_CENTER'] },
      $or: [{ startTime: { $lt: endTime, $gte: startTime } }, { endTime: { $gt: startTime, $lte: endTime } }],
    });

    if (conflict) {
      return res.status(409).json({
        success: false,
        message: 'Therapist is already booked for this time slot.',
      });
    }

    const session = new TherapySession(req.body);
    await session.save();

    await AuditService.log(req, 'SCHEDULE_SESSION', 'REHAB', { id: session.id, date: date, time: startTime });

    res.status(201).json({ success: true, data: session });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Complete Session (Clinical Notes + AI + Auto-Billing)
router.put('/sessions/:id/complete', async (req, res) => {
  try {
    const { notes, rating, attendance, billNow } = req.body;

    // 1. AI Analysis of Notes (Smart Feature)
    let aiAnalysis = {};
    if (notes && notes.assessment) {
      aiAnalysis = await AIService.summarizeNotes(notes.assessment);
    }

    const session = await TherapySession.findByIdAndUpdate(
      req.params.id,
      {
        status: 'COMPLETED',
        notes: { ...notes, aiAnalysis }, // Store AI analysis
        rating,
        attendance: { isPresent: true, ...attendance },
      },
      { new: true },
    )
      .populate('plan')
      .populate('beneficiary');

    if (!session) return res.status(404).json({ message: 'Session not found' });

    // 2. Auto-Billing (Smart Workflow)
    let invoice = null;
    if (billNow && !session.isBilled && session.plan) {
      // In a real app, fetch price from Program attached to Plan
      const amount = 150; // Default or fetched from DB

      // Create Invoice Draft
      const invoiceNumber = `INV-AUTO-${Date.now().toString().slice(-6)}`;

      invoice = new Invoice({
        invoiceNumber,
        beneficiary: session.beneficiary._id,
        issuer: req.user ? req.user.id : null,
        subTotal: amount,
        totalAmount: amount,
        status: 'DRAFT',
        items: [
          {
            description: `Therapy Session (${session.date ? session.date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0]})`,
            unitPrice: amount,
            total: amount,
          },
        ],
      });
      await invoice.save();

      // Link back
      session.isBilled = true;
      session.invoiceId = invoice._id;
      await session.save();
    }

    await AuditService.log(req, 'COMPLETE_SESSION', 'REHAB', { id: session.id }, null, 'SUCCESS');

    res.json({ success: true, data: session, invoice, aiAnalysis });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
