'use strict';

/**
 * change-control.registry.js — World-Class QMS Phase 29 Commit 10.
 *
 * ISO 9001:2015 §8.5.6 + FDA 21 CFR §820.30(i). Controls changes to
 * processes, products, software, equipment, or documents that could
 * affect quality or regulatory compliance.
 */

const CHANGE_STATUSES = Object.freeze([
  'draft',
  'submitted',
  'impact_assessment',
  'cab_review', // Change Advisory Board
  'approved',
  'rejected',
  'in_implementation',
  'verification',
  'closed',
  'cancelled',
]);

const TERMINAL = Object.freeze(['closed', 'rejected', 'cancelled']);

const ALLOWED_TRANSITIONS = Object.freeze({
  draft: ['submitted', 'cancelled'],
  submitted: ['impact_assessment', 'rejected', 'cancelled'],
  impact_assessment: ['cab_review', 'rejected', 'cancelled'],
  cab_review: ['approved', 'rejected'],
  approved: ['in_implementation', 'cancelled'],
  rejected: ['draft'],
  in_implementation: ['verification', 'cancelled'],
  verification: ['closed', 'in_implementation'],
  closed: [],
  cancelled: [],
});

const CHANGE_TYPES = Object.freeze([
  { code: 'process', nameAr: 'تغيير في عملية', nameEn: 'Process change' },
  { code: 'product', nameAr: 'تغيير في منتج/خدمة', nameEn: 'Product/service change' },
  { code: 'software', nameAr: 'تغيير في النظام', nameEn: 'Software / IT change' },
  { code: 'equipment', nameAr: 'تغيير في معدات', nameEn: 'Equipment change' },
  { code: 'document', nameAr: 'تغيير وثيقة', nameEn: 'Document change' },
  { code: 'supplier', nameAr: 'تغيير مورد', nameEn: 'Supplier change' },
  { code: 'organisational', nameAr: 'تغيير تنظيمي', nameEn: 'Organisational change' },
]);

const RISK_LEVELS = Object.freeze([
  { code: 'low', score: 1, nameAr: 'منخفض', nameEn: 'Low', cabRequired: false },
  { code: 'medium', score: 2, nameAr: 'متوسط', nameEn: 'Medium', cabRequired: true },
  { code: 'high', score: 3, nameAr: 'عالٍ', nameEn: 'High', cabRequired: true },
  { code: 'critical', score: 4, nameAr: 'حرج', nameEn: 'Critical', cabRequired: true },
]);

const IMPACT_AREAS = Object.freeze([
  'patient_safety',
  'quality',
  'compliance',
  'finance',
  'operations',
  'security',
  'privacy',
  'staff',
  'suppliers',
  'customers',
]);

function shouldGoToCab(riskLevel) {
  const spec = RISK_LEVELS.find(r => r.code === riskLevel);
  return spec ? spec.cabRequired : true;
}

module.exports = {
  CHANGE_STATUSES,
  TERMINAL,
  ALLOWED_TRANSITIONS,
  CHANGE_TYPES,
  RISK_LEVELS,
  IMPACT_AREAS,
  shouldGoToCab,
};
