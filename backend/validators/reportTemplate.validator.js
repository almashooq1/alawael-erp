/**
 * validators/reportTemplate.validator.js — Report Template Validation
 * ═════════════════════════════════════════════════════════════════
 */

'use strict';

const Joi = require('joi');

const fieldSchema = Joi.object({
  id: Joi.string().required(),
  label: Joi.string().min(1).max(200).required(),
  type: Joi.string().valid('text', 'number', 'date', 'select', 'multiselect', 'textarea', 'checkbox', 'signature', 'image', 'table').required(),
  required: Joi.boolean().default(false),
  defaultValue: Joi.any().optional(),
  options: Joi.array().items(Joi.string()).optional(),
  validation: Joi.object({
    min: Joi.number().optional(),
    max: Joi.number().optional(),
    pattern: Joi.string().optional(),
    message: Joi.string().optional(),
  }).optional(),
  order: Joi.number().integer().default(0),
});

const sectionSchema = Joi.object({
  id: Joi.string().required(),
  title: Joi.string().min(1).max(200).required(),
  description: Joi.string().max(500).optional(),
  order: Joi.number().integer().default(0),
  fields: Joi.array().items(fieldSchema).optional(),
  collapsible: Joi.boolean().default(false),
  collapsed: Joi.boolean().default(false),
});

exports.getTemplates = {
  query: Joi.object({
    category: Joi.string().valid('clinical', 'hr', 'financial', 'operational', 'quality', 'custom').optional(),
    isActive: Joi.string().valid('true', 'false').optional(),
    tags: Joi.string().optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }),
};

exports.createTemplate = {
  body: Joi.object({
    name: Joi.string().min(1).max(200).required(),
    description: Joi.string().max(500).optional(),
    category: Joi.string().valid('clinical', 'hr', 'financial', 'operational', 'quality', 'custom').required(),
    sections: Joi.array().items(sectionSchema).optional(),
    tags: Joi.array().items(Joi.string().trim()).optional(),
    isActive: Joi.boolean().default(true),
    isPublic: Joi.boolean().default(false),
  }),
};

exports.getTemplate = {
  params: Joi.object({
    id: Joi.string().hex().length(24).required(),
  }),
};

exports.updateTemplate = {
  params: Joi.object({
    id: Joi.string().hex().length(24).required(),
  }),
  body: Joi.object({
    name: Joi.string().min(1).max(200).optional(),
    description: Joi.string().max(500).optional().allow(''),
    category: Joi.string().valid('clinical', 'hr', 'financial', 'operational', 'quality', 'custom').optional(),
    sections: Joi.array().items(sectionSchema).optional(),
    tags: Joi.array().items(Joi.string().trim()).optional(),
    isActive: Joi.boolean().optional(),
    isPublic: Joi.boolean().optional(),
  }).min(1),
};

exports.deleteTemplate = {
  params: Joi.object({
    id: Joi.string().hex().length(24).required(),
  }),
};

exports.cloneTemplate = {
  params: Joi.object({
    id: Joi.string().hex().length(24).required(),
  }),
};
