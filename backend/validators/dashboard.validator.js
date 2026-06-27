/**
 * validators/dashboard.validator.js — Dashboard Validation Schemas
 * ═════════════════════════════════════════════════════════════════
 * Joi validation for dashboard routes.
 */

'use strict';

const Joi = require('joi');

const scope = Joi.string().valid('global', 'branch', 'user').default('global');
const scopeId = Joi.string().hex().length(24).optional();

exports.getStats = {
  query: Joi.object({
    scope,
    scopeId,
  }),
};

exports.refreshStats = {
  body: Joi.object({
    scope,
    scopeId: scopeId.optional(),
  }),
};

exports.getKPIs = {
  query: Joi.object({
    scope,
    scopeId,
  }),
};

exports.getActivity = {
  query: Joi.object({
    limit: Joi.number().integer().min(1).max(100).default(20),
    offset: Joi.number().integer().min(0).default(0),
  }),
};

exports.createWidget = {
  body: Joi.object({
    name: Joi.string().min(1).max(100).required(),
    widgets: Joi.array().items(
      Joi.object({
        id: Joi.string().required(),
        type: Joi.string().valid('stat', 'chart', 'table', 'list', 'alert', 'custom').required(),
        title: Joi.string().min(1).max(200).required(),
        position: Joi.object({
          x: Joi.number().integer().min(0).default(0),
          y: Joi.number().integer().min(0).default(0),
          w: Joi.number().integer().min(1).max(12).default(4),
          h: Joi.number().integer().min(1).max(12).default(4),
        }).optional(),
        config: Joi.object().optional(),
        dataSource: Joi.string().valid('beneficiaries', 'sessions', 'assessments', 'staff', 'financial', 'custom').default('custom'),
        refreshInterval: Joi.number().integer().min(30).default(300),
        isVisible: Joi.boolean().default(true),
      })
    ).optional(),
  }),
};

exports.updateWidget = {
  params: Joi.object({
    id: Joi.string().hex().length(24).required(),
  }),
  body: Joi.object({
    name: Joi.string().min(1).max(100).optional(),
    widgets: Joi.array().optional(),
    isDefault: Joi.boolean().optional(),
  }).min(1),
};

exports.deleteWidget = {
  params: Joi.object({
    id: Joi.string().hex().length(24).required(),
  }),
};
