/**
 * validators/visualization.validator.js — Visualization Validation
 * ═════════════════════════════════════════════════════════════════
 */

'use strict';

const Joi = require('joi');

exports.getCharts = {
  query: Joi.object({
    type: Joi.string().valid('line', 'bar', 'pie', 'doughnut', 'radar', 'scatter', 'area', 'heatmap').optional(),
    dataSource: Joi.string().valid('beneficiaries', 'sessions', 'assessments', 'staff', 'financial', 'custom', 'api').optional(),
    isPublic: Joi.string().valid('true', 'false').optional(),
  }),
};

exports.createChart = {
  body: Joi.object({
    name: Joi.string().min(1).max(200).required(),
    type: Joi.string().valid('line', 'bar', 'pie', 'doughnut', 'radar', 'scatter', 'area', 'heatmap').required(),
    description: Joi.string().max(500).optional(),
    dataSource: Joi.string().valid('beneficiaries', 'sessions', 'assessments', 'staff', 'financial', 'custom', 'api').default('custom'),
    config: Joi.object().optional(),
    dataset: Joi.object({
      labels: Joi.array().items(Joi.string()).optional(),
      datasets: Joi.array().items(
        Joi.object({
          label: Joi.string().optional(),
          data: Joi.array().items(Joi.number()).optional(),
          backgroundColor: Joi.array().items(Joi.string()).optional(),
          borderColor: Joi.array().items(Joi.string()).optional(),
        })
      ).optional(),
    }).optional(),
    filters: Joi.object({
      dateRange: Joi.object({
        from: Joi.date().iso().optional(),
        to: Joi.date().iso().optional(),
      }).optional(),
      branch: Joi.string().optional(),
      department: Joi.string().optional(),
    }).optional(),
    isPublic: Joi.boolean().default(false),
  }),
};

exports.getChart = {
  params: Joi.object({
    id: Joi.string().hex().length(24).required(),
  }),
};

exports.updateChart = {
  params: Joi.object({
    id: Joi.string().hex().length(24).required(),
  }),
  body: Joi.object({
    name: Joi.string().min(1).max(200).optional(),
    type: Joi.string().valid('line', 'bar', 'pie', 'doughnut', 'radar', 'scatter', 'area', 'heatmap').optional(),
    description: Joi.string().max(500).optional(),
    config: Joi.object().optional(),
    dataset: Joi.object().optional(),
    filters: Joi.object().optional(),
    isPublic: Joi.boolean().optional(),
  }).min(1),
};

exports.deleteChart = {
  params: Joi.object({
    id: Joi.string().hex().length(24).required(),
  }),
};

exports.renderChart = {
  params: Joi.object({
    id: Joi.string().hex().length(24).required(),
  }),
  body: Joi.object({
    filters: Joi.object().optional(),
  }).optional(),
};

exports.exportChart = {
  params: Joi.object({
    id: Joi.string().hex().length(24).required(),
  }),
  query: Joi.object({
    format: Joi.string().valid('png', 'pdf', 'csv', 'json').default('png'),
  }),
};
