/**
 * validators/zatca.validator.js — ZATCA Invoice Validation
 * ═════════════════════════════════════════════════════════════════
 */

'use strict';

const Joi = require('joi');

const invoiceLine = Joi.object({
  lineNumber: Joi.number().integer().min(1).required(),
  description: Joi.string().min(1).max(500).required(),
  quantity: Joi.number().min(0).default(1),
  unitPrice: Joi.number().min(0).required(),
  vatRate: Joi.number().min(0).max(100).default(15),
  vatAmount: Joi.number().min(0).required(),
  totalAmount: Joi.number().min(0).required(),
});

exports.getInvoices = {
  query: Joi.object({
    status: Joi.string().valid('draft', 'submitted', 'cleared', 'rejected', 'reported').optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }),
};

exports.createInvoice = {
  body: Joi.object({
    invoiceNumber: Joi.string().min(1).max(100).required(),
    issueDate: Joi.date().iso().optional(),
    issueTime: Joi.string().optional(),
    sellerName: Joi.string().min(1).max(200).required(),
    sellerTaxNumber: Joi.string().min(1).max(50).required(),
    buyerName: Joi.string().max(200).optional(),
    buyerTaxNumber: Joi.string().max(50).optional(),
    subTotal: Joi.number().min(0).required(),
    vatTotal: Joi.number().min(0).required(),
    totalAmount: Joi.number().min(0).required(),
    lines: Joi.array().items(invoiceLine).min(1).required(),
    branch: Joi.string().optional(),
    notes: Joi.string().max(1000).optional(),
  }),
};

exports.getInvoice = {
  params: Joi.object({
    id: Joi.string().hex().length(24).required(),
  }),
};

exports.updateInvoice = {
  params: Joi.object({
    id: Joi.string().hex().length(24).required(),
  }),
  body: Joi.object({
    invoiceNumber: Joi.string().min(1).max(100).optional(),
    sellerName: Joi.string().min(1).max(200).optional(),
    sellerTaxNumber: Joi.string().min(1).max(50).optional(),
    buyerName: Joi.string().max(200).optional().allow(''),
    buyerTaxNumber: Joi.string().max(50).optional().allow(''),
    subTotal: Joi.number().min(0).optional(),
    vatTotal: Joi.number().min(0).optional(),
    totalAmount: Joi.number().min(0).optional(),
    lines: Joi.array().items(invoiceLine).optional(),
    branch: Joi.string().optional().allow(''),
    notes: Joi.string().max(1000).optional().allow(''),
  }).min(1),
};

exports.deleteInvoice = {
  params: Joi.object({
    id: Joi.string().hex().length(24).required(),
  }),
};

exports.getInvoiceStatus = {
  params: Joi.object({
    id: Joi.string().hex().length(24).required(),
  }),
};

exports.clearInvoice = {
  params: Joi.object({
    id: Joi.string().hex().length(24).required(),
  }),
};

exports.reportInvoice = {
  params: Joi.object({
    id: Joi.string().hex().length(24).required(),
  }),
};
