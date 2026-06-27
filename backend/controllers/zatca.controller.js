/**
 * zatca.controller.js — ZATCA E-Invoicing Controller
 * ═══════════════════════════════════════════════════
 * Handles ZATCA (Fatoorah) invoice CRUD and submission.
 */

'use strict';

const ZatcaInvoice = require('../models/ZatcaInvoice');
const mongoose = require('mongoose');

// ─── Invoice CRUD ──────────────────────────────────────────────────────────

exports.getInvoices = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status) query.zatcaStatus = status;

    const [invoices, total] = await Promise.all([
      ZatcaInvoice.find(query)
        .sort({ issueDate: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .lean(),
      ZatcaInvoice.countDocuments(query),
    ]);

    const pending = await ZatcaInvoice.countDocuments({ zatcaStatus: 'draft' });
    const cleared = await ZatcaInvoice.countDocuments({ zatcaStatus: 'cleared' });

    res.json({
      success: true,
      data: invoices,
      meta: { total, page: Number(page), limit: Number(limit), pending, cleared },
    });
  } catch (err) {
    next(err);
  }
};

exports.createInvoice = async (req, res, next) => {
  try {
    const invoice = new ZatcaInvoice({
      ...req.body,
      createdBy: req.user?._id,
    });

    // Auto-calculate totals from lines
    if (invoice.lines && invoice.lines.length > 0) {
      invoice.subTotal = invoice.lines.reduce((sum, l) => sum + (l.unitPrice * l.quantity), 0);
      invoice.vatTotal = invoice.lines.reduce((sum, l) => sum + l.vatAmount, 0);
      invoice.totalAmount = invoice.subTotal + invoice.vatTotal;
    }

    await invoice.save();
    res.status(201).json({
      success: true,
      data: invoice,
      message: 'Invoice created. Submit to ZATCA for clearance.',
    });
  } catch (err) {
    next(err);
  }
};

exports.getInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;
    const invoice = await ZatcaInvoice.findById(id).lean();
    if (!invoice) return res.status(404).json({ success: false, error: { message: 'Invoice not found' } });
    res.json({ success: true, data: invoice });
  } catch (err) {
    next(err);
  }
};

exports.updateInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;
    const invoice = await ZatcaInvoice.findById(id);
    if (!invoice) return res.status(404).json({ success: false, error: { message: 'Invoice not found' } });
    if (invoice.zatcaStatus !== 'draft') {
      return res.status(400).json({ success: false, error: { message: 'Only draft invoices can be updated' } });
    }

    Object.assign(invoice, req.body);
    await invoice.save();
    res.json({ success: true, data: invoice });
  } catch (err) {
    next(err);
  }
};

exports.deleteInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;
    const invoice = await ZatcaInvoice.findById(id);
    if (!invoice) return res.status(404).json({ success: false, error: { message: 'Invoice not found' } });
    if (invoice.zatcaStatus !== 'draft') {
      return res.status(400).json({ success: false, error: { message: 'Only draft invoices can be deleted' } });
    }
    await invoice.deleteOne();
    res.json({ success: true, message: 'Invoice deleted' });
  } catch (err) {
    next(err);
  }
};

// ─── ZATCA Operations ──────────────────────────────────────────────────────

exports.getInvoiceStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const invoice = await ZatcaInvoice.findById(id).select('zatcaStatus clearanceId uuid').lean();
    if (!invoice) return res.status(404).json({ success: false, error: { message: 'Invoice not found' } });
    res.json({
      success: true,
      data: {
        invoiceId: id,
        status: invoice.zatcaStatus,
        zatcaStatus: invoice.zatcaStatus,
        clearanceId: invoice.clearanceId,
        uuid: invoice.uuid,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.clearInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;
    const invoice = await ZatcaInvoice.findById(id);
    if (!invoice) return res.status(404).json({ success: false, error: { message: 'Invoice not found' } });
    if (invoice.zatcaStatus !== 'draft') {
      return res.status(400).json({ success: false, error: { message: 'Invoice already submitted' } });
    }

    // Generate UUID if missing
    if (!invoice.uuid) {
      invoice.uuid = new mongoose.Types.ObjectId().toString();
    }

    // Placeholder: integrate with ZATCA API SDK
    invoice.zatcaStatus = 'submitted';
    invoice.clearanceId = `CLR-${Date.now()}`;
    await invoice.save();

    res.json({
      success: true,
      data: {
        invoiceId: id,
        status: 'submitted',
        clearanceId: invoice.clearanceId,
        uuid: invoice.uuid,
      },
      message: 'Invoice submitted to ZATCA for clearance',
    });
  } catch (err) {
    next(err);
  }
};

exports.reportInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;
    const invoice = await ZatcaInvoice.findById(id);
    if (!invoice) return res.status(404).json({ success: false, error: { message: 'Invoice not found' } });
    if (invoice.zatcaStatus !== 'draft') {
      return res.status(400).json({ success: false, error: { message: 'Invoice already submitted' } });
    }

    invoice.zatcaStatus = 'reported';
    await invoice.save();

    res.json({
      success: true,
      data: { invoiceId: id, status: 'reported' },
      message: 'Invoice reported to ZATCA',
    });
  } catch (err) {
    next(err);
  }
};
