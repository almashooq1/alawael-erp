'use strict';

module.exports = [
  // ═══════════ Phase 5 Services (3300-3440) ═══════════
  { prefix: '/api/hr', target: 'http://hr-payroll-service:3300', name: 'hr-payroll' },
  { prefix: '/api/crm', target: 'http://crm-service:3310', name: 'crm' },
  { prefix: '/api/attendance', target: 'http://attendance-biometric-service:3320', name: 'attendance-biometric' },
  { prefix: '/api/fleet', target: 'http://fleet-transport-service:3330', name: 'fleet-transport' },
  { prefix: '/api/documents', target: 'http://document-management-service:3340', name: 'document-management' },
  { prefix: '/api/workflow', target: 'http://workflow-engine-service:3350', name: 'workflow-engine' },
  { prefix: '/api/identity', target: 'http://identity-service:3360', name: 'identity' },
  { prefix: '/api/analytics', target: 'http://analytics-bi-service:3370', name: 'analytics-bi' },
  { prefix: '/api/elearning', target: 'http://e-learning-service:3380', name: 'e-learning' },
  { prefix: '/api/parent-portal', target: 'http://parent-portal-service:3390', name: 'parent-portal' },
  { prefix: '/api/rehabilitation', target: 'http://rehabilitation-care-service:3400', name: 'rehabilitation-care' },
  { prefix: '/api/billing', target: 'http://fee-billing-service:3410', name: 'fee-billing' },
  { prefix: '/api/tenants', target: 'http://multi-tenant-service:3420', name: 'multi-tenant' },
  { prefix: '/api/collab', target: 'http://realtime-collaboration-service:3430', name: 'realtime-collaboration' },
  { prefix: '/api/kitchen', target: 'http://kitchen-laundry-facility-service:3440', name: 'kitchen-laundry-facility' },

  // ═══════════ Phase 6 Services (3450-3590) ═══════════
  { prefix: '/api/inventory', target: 'http://inventory-warehouse-service:3450', name: 'inventory-warehouse' },
  { prefix: '/api/academic', target: 'http://academic-curriculum-service:3460', name: 'academic-curriculum' },
  { prefix: '/api/health', target: 'http://student-health-medical-service:3470', name: 'student-health' },
  { prefix: '/api/security', target: 'http://visitor-campus-security-service:3480', name: 'visitor-security' },
  { prefix: '/api/crisis', target: 'http://crisis-safety-service:3490', name: 'crisis-safety' },
  { prefix: '/api/compliance', target: 'http://compliance-accreditation-service:3500', name: 'compliance' },
  { prefix: '/api/events', target: 'http://events-activities-service:3510', name: 'events-activities' },
  { prefix: '/api/assets', target: 'http://asset-equipment-service:3520', name: 'asset-equipment' },
  { prefix: '/api/training', target: 'http://staff-training-development-service:3530', name: 'staff-training' },
  { prefix: '/api/cms', target: 'http://cms-announcements-service:3540', name: 'cms-announcements' },
  { prefix: '/api/forms', target: 'http://forms-survey-service:3550', name: 'forms-survey' },
  { prefix: '/api/budget', target: 'http://budget-financial-planning-service:3560', name: 'budget-financial' },
  { prefix: '/api/lifecycle', target: 'http://student-lifecycle-service:3570', name: 'student-lifecycle' },
  { prefix: '/api/integrations', target: 'http://external-integration-hub-service:3580', name: 'integration-hub' },
  { prefix: '/api/facilities', target: 'http://facility-space-management-service:3590', name: 'facility-space' },

  // ═══════════ Phase 7 Services ═══════════
  { prefix: '/api/auth', target: 'http://security-auth-service:3610', name: 'security-auth' },
  { prefix: '/api/reports', target: 'http://smart-reports-service:3620', name: 'smart-reports' },
  { prefix: '/api/mesh', target: 'http://service-mesh-monitor:3630', name: 'service-mesh' },

  // ═══════════ Phase 8 Services (3640-3690) ═══════════
  { prefix: '/api/notifications', target: 'http://notification-center:3640', name: 'notification-center' },
  { prefix: '/api/backup', target: 'http://backup-recovery:3650', name: 'backup-recovery' },
  { prefix: '/api/ai', target: 'http://ai-engine:3660', name: 'ai-engine' },
  { prefix: '/api/audit', target: 'http://advanced-audit:3670', name: 'advanced-audit' },
  { prefix: '/api/i18n', target: 'http://multilingual:3680', name: 'multilingual' },
  { prefix: '/api/payments', target: 'http://payment-gateway:3690', name: 'payment-gateway' },

  // ═══════════ Phase 9 Services (3700-3750) ═══════════
  { prefix: '/api/projects', target: 'http://task-project:3700', name: 'task-project' },
  { prefix: '/api/files', target: 'http://file-storage:3710', name: 'file-storage' },
  { prefix: '/api/chat', target: 'http://chat-messaging:3720', name: 'chat-messaging' },
  { prefix: '/api/report-scheduler', target: 'http://report-scheduler:3730', name: 'report-scheduler' },
  { prefix: '/api/config', target: 'http://system-config:3740', name: 'system-config' },
  { prefix: '/api/migration', target: 'http://data-migration:3750', name: 'data-migration' },

  // ═══════════ Backend Core ═══════════
  { prefix: '/api', target: `http://backend:${process.env.BACKEND_PORT || 3001}`, name: 'backend-core', isDefault: true },
];
