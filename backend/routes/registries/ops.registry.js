'use strict';

/**
 * ops.registry.js — W801.
 *
 * Mounts the Phase-16 Ops Control Tower HTTP surface. Routes were built
 * under routes/operations/*.routes.js but were never registered in
 * mountAllRoutes — web-admin /ops/* pages returned 404 in production.
 *
 * Each router carries its own authenticate/authorize middleware.
 */

module.exports = function registerOpsRoutes(app, { safeMount, logger }) {
  const mounts = [
    ['/api/ops/work-orders', '/api/v1/ops/work-orders', '../routes/operations/workOrder.routes'],
    ['/api/ops/facilities', '/api/v1/ops/facilities', '../routes/operations/facility.routes'],
    ['/api/ops/sla', '/api/v1/ops/sla', '../routes/operations/slaEngine.routes'],
    ['/api/ops/dashboard', '/api/v1/ops/dashboard', '../routes/operations/opsDashboard.routes'],
    [
      '/api/ops/purchase-requests',
      '/api/v1/ops/purchase-requests',
      '../routes/operations/purchaseRequest.routes',
    ],
    [
      '/api/ops/meeting-governance',
      '/api/v1/ops/meeting-governance',
      '../routes/operations/meetingGovernance.routes',
    ],
    [
      '/api/ops/route-optimization',
      '/api/v1/ops/route-optimization',
      '../routes/operations/routeOptimization.routes',
    ],
    [
      '/api/ops/notification-dispatch',
      '/api/v1/ops/notification-dispatch',
      '../routes/operations/notificationDispatch.routes',
    ],
    [
      '/api/ops/maintenance-hub',
      '/api/v1/ops/maintenance-hub',
      '../routes/operations/maintenanceHub.routes',
    ],
  ];

  for (const [a, b, mod] of mounts) {
    safeMount(app, [a, b], mod);
  }

  logger.info(
    '✅ W801/W807 Ops Control Tower mounted (9 modules): work-orders, facilities+inspections, sla, dashboard, purchase-requests, meeting-governance, route-optimization, notification-dispatch, maintenance-hub'
  );
};
