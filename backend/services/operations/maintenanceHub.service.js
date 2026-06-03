'use strict';

/**
 * maintenanceHub.service.js — W807.
 *
 * Unified snapshot for facility assets (W369 PPM) + maintenance work orders
 * (Phase-16 ops). Powers GET /api/v1/ops/maintenance-hub/snapshot and bulk
 * spawn of WOs for due-maintenance assets.
 */

const OPEN_WO_STATUSES = Object.freeze([
  'draft',
  'submitted',
  'pending',
  'triaged',
  'approved',
  'scheduled',
  'in_progress',
  'on_hold',
  'blocked',
  'reopened',
]);

const OVERDUE_WO_STATUSES = Object.freeze([
  'submitted',
  'pending',
  'triaged',
  'approved',
  'scheduled',
  'in_progress',
  'reopened',
]);

function createMaintenanceHubService(deps = {}) {
  const {
    workOrderModel,
    facilityAssetModel,
    workOrderStateMachine = null,
    now = () => new Date(),
  } = deps;

  if (!workOrderModel || !facilityAssetModel) {
    throw new Error('maintenanceHub: workOrderModel and facilityAssetModel required');
  }

  async function getSnapshot(branchFilter = {}) {
    const n = now();
    const woBase = { ...branchFilter };
    const faBase = { ...branchFilter, status: { $ne: 'retired' } };

    const openWoQuery = { ...woBase, status: { $in: OPEN_WO_STATUSES } };
    const overdueWoQuery = {
      ...woBase,
      status: { $in: OVERDUE_WO_STATUSES },
      scheduledDate: { $lt: n },
    };

    const dueMaintQuery = {
      ...faBase,
      nextMaintenanceDue: { $ne: null, $lt: n },
    };
    const dueInspQuery = {
      ...faBase,
      nextInspectionDue: { $ne: null, $lt: n },
    };
    const expiredCertQuery = {
      ...faBase,
      'certificates.expiresAt': { $lt: n },
    };
    const lifeSafetyOosQuery = {
      ...faBase,
      criticality: 'life_safety',
      status: { $in: ['out_of_service', 'inspection_failed'] },
    };

    const [
      openCount,
      overdueCount,
      criticalOpen,
      facilityAssetLinkedOpen,
      facilityLinkedOpen,
      dueMaintenance,
      dueInspection,
      expiredCertificates,
      lifeSafetyOutOfService,
      openWorkOrders,
      dueMaintenanceAssets,
    ] = await Promise.all([
      workOrderModel.countDocuments(openWoQuery),
      workOrderModel.countDocuments(overdueWoQuery),
      workOrderModel.countDocuments({ ...openWoQuery, priority: 'critical' }),
      workOrderModel.countDocuments({
        ...openWoQuery,
        facilityAssetId: { $ne: null },
      }),
      workOrderModel.countDocuments({
        ...openWoQuery,
        facilityId: { $ne: null },
      }),
      facilityAssetModel.countDocuments(dueMaintQuery),
      facilityAssetModel.countDocuments(dueInspQuery),
      facilityAssetModel.countDocuments(expiredCertQuery),
      facilityAssetModel.countDocuments(lifeSafetyOosQuery),
      workOrderModel
        .find(openWoQuery)
        .populate('facilityAssetId', 'name nameAr assetTag')
        .populate('facilityId', 'nameAr nameEn')
        .sort({ scheduledDate: 1 })
        .limit(20)
        .lean(),
      facilityAssetModel
        .find(dueMaintQuery)
        .select('assetTag name nameAr category criticality status nextMaintenanceDue branchId')
        .sort({ nextMaintenanceDue: 1 })
        .limit(20)
        .lean(),
    ]);

    return {
      generatedAt: n.toISOString(),
      workOrders: {
        open: openCount,
        overdue: overdueCount,
        criticalOpen,
        facilityAssetLinkedOpen,
        facilityLinkedOpen,
      },
      facilityAssets: {
        dueMaintenance,
        dueInspection,
        expiredCertificates,
        lifeSafetyOutOfService,
      },
      previews: {
        openWorkOrders,
        dueMaintenanceAssets,
      },
    };
  }

  /**
   * Idempotent bulk spawn: skips assets that already have an open WO on facilityAssetId.
   */
  async function spawnDueMaintenanceWorkOrders({
    branchFilter = {},
    actorId = null,
    limit = 25,
    markInMaintenance = false,
  } = {}) {
    if (!workOrderStateMachine) {
      throw new Error('WORK_ORDER_STATE_MACHINE_UNAVAILABLE');
    }

    const n = now();
    const assets = await facilityAssetModel
      .find({
        ...branchFilter,
        status: { $ne: 'retired' },
        nextMaintenanceDue: { $ne: null, $lt: n },
      })
      .sort({ criticality: -1, nextMaintenanceDue: 1 })
      .limit(Math.min(Math.max(limit, 1), 50));

    const created = [];
    const skipped = [];
    const errors = [];

    for (const row of assets) {
      const existing = await workOrderModel
        .findOne({
          facilityAssetId: row._id,
          status: { $in: OPEN_WO_STATUSES },
        })
        .select('_id workOrderNumber')
        .lean();

      if (existing) {
        skipped.push({
          assetId: String(row._id),
          assetTag: row.assetTag,
          reason: 'open_wo_exists',
          workOrderId: String(existing._id),
          workOrderNumber: existing.workOrderNumber,
        });
        continue;
      }

      const priority =
        row.criticality === 'life_safety'
          ? 'critical'
          : row.criticality === 'high'
            ? 'high'
            : row.criticality === 'low'
              ? 'low'
              : 'normal';

      try {
        const wo = await workOrderStateMachine.createWorkOrder(
          {
            workOrderNumber: `WO-PPM-${Date.now().toString(36).toUpperCase()}`,
            branchId: row.branchId,
            facilityAssetId: row._id,
            type: 'preventive',
            priority,
            title: `صيانة وقائية: ${row.nameAr || row.name || row.assetTag}`.slice(0, 120),
            description: `أمر وقائي تلقائي — أصل ${row.assetTag} (${row.category}) مستحق منذ ${row.nextMaintenanceDue?.toISOString?.() || 'n/a'}.`,
            scheduledDate: row.nextMaintenanceDue || n,
            createdBy: actorId,
          },
          { autoSubmit: true, actorId }
        );

        if (markInMaintenance && row.status === 'in_service') {
          row.status = 'maintenance';
          await row.save();
        }

        created.push({
          assetId: String(row._id),
          assetTag: row.assetTag,
          workOrderId: String(wo._id),
          workOrderNumber: wo.workOrderNumber,
        });
      } catch (err) {
        errors.push({
          assetId: String(row._id),
          assetTag: row.assetTag,
          message: err.message || String(err),
        });
      }
    }

    return {
      requestedLimit: limit,
      scanned: assets.length,
      created,
      skipped,
      errors,
    };
  }

  return {
    getSnapshot,
    spawnDueMaintenanceWorkOrders,
    OPEN_WO_STATUSES,
  };
}

module.exports = {
  createMaintenanceHubService,
  OPEN_WO_STATUSES,
  OVERDUE_WO_STATUSES,
};
