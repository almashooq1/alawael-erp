/**
 * validators/scheduledReport.validator.js — Scheduled Report Validation
 * ═════════════════════════════════════════════════════════════════
 */

'use strict';

const Joi = require('joi');

exports.getSchedules = {
  query: Joi.object({
    status: Joi.string().valid('pending', 'running', 'paused', 'completed', 'error').optional(),
    isActive: Joi.string().valid('true', 'false').optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }),
};

exports.createSchedule = {
  body: Joi.object({
    name: Joi.string().min(1).max(200).required(),
    description: Joi.string().max(500).optional(),
    templateId: Joi.string().hex().length(24).required(),
    frequency: Joi.string().valid('hourly', 'daily', 'weekly', 'monthly', 'quarterly', 'custom').required(),
    cronExpression: Joi.string().optional(),
    dayOfWeek: Joi.number().integer().min(0).max(6).optional(),
    dayOfMonth: Joi.number().integer().min(1).max(31).optional(),
    hour: Joi.number().integer().min(0).max(23).default(0),
    minute: Joi.number().integer().min(0).max(59).default(0),
    timezone: Joi.string().default('Asia/Riyadh'),
    filters: Joi.object({
      dateRange: Joi.object({
        from: Joi.date().iso().optional(),
        to: Joi.date().iso().optional(),
      }).optional(),
      branch: Joi.string().optional(),
      department: Joi.string().optional(),
      beneficiary: Joi.string().optional(),
    }).optional(),
    format: Joi.string().valid('pdf', 'excel', 'csv', 'json').default('pdf'),
    recipients: Joi.array().items(Joi.string().email()).optional(),
    deliveryMethod: Joi.string().valid('email', 'download', 'both').default('email'),
  }),
};

exports.getSchedule = {
  params: Joi.object({
    id: Joi.string().hex().length(24).required(),
  }),
};

exports.updateSchedule = {
  params: Joi.object({
    id: Joi.string().hex().length(24).required(),
  }),
  body: Joi.object({
    name: Joi.string().min(1).max(200).optional(),
    description: Joi.string().max(500).optional().allow(''),
    frequency: Joi.string().valid('hourly', 'daily', 'weekly', 'monthly', 'quarterly', 'custom').optional(),
    cronExpression: Joi.string().optional().allow(''),
    dayOfWeek: Joi.number().integer().min(0).max(6).optional(),
    dayOfMonth: Joi.number().integer().min(1).max(31).optional(),
    hour: Joi.number().integer().min(0).max(23).optional(),
    minute: Joi.number().integer().min(0).max(59).optional(),
    timezone: Joi.string().optional(),
    filters: Joi.object().optional(),
    format: Joi.string().valid('pdf', 'excel', 'csv', 'json').optional(),
    recipients: Joi.array().items(Joi.string().email()).optional(),
    deliveryMethod: Joi.string().valid('email', 'download', 'both').optional(),
    isActive: Joi.boolean().optional(),
  }).min(1),
};

exports.deleteSchedule = {
  params: Joi.object({
    id: Joi.string().hex().length(24).required(),
  }),
};

exports.runSchedule = {
  params: Joi.object({
    id: Joi.string().hex().length(24).required(),
  }),
};
