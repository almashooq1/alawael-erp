/**
 * Fleet KPI & Analytics Model - نموذج مؤشرات أداء الأسطول
 */

const mongoose = require('mongoose');

const fleetKPISchema = new mongoose.Schema(
  {
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    period: {
      type: {
        type: String,
        enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'],
        required: true,
      },
      startDate: { type: Date, required: true },
      endDate: { type: Date, required: true },
    },

    // Fleet Utilization
    utilization: {
      totalVehicles: { type: Number, default: 0 },
      activeVehicles: { type: Number, default: 0 },
      idleVehicles: { type: Number, default: 0 },
      inMaintenanceVehicles: { type: Number, default: 0 },
      utilizationRate: { type: Number, default: 0 },
      averageDailyUsageHours: { type: Number, default: 0 },
      averageDailyKm: { type: Number, default: 0 },
    },

    // Cost Metrics
    costs: {
      totalCost: { type: Number, default: 0 },
      fuelCost: { type: Number, default: 0 },
      maintenanceCost: { type: Number, default: 0 },
      insuranceCost: { type: Number, default: 0 },
      tireCost: { type: Number, default: 0 },
      laborCost: { type: Number, default: 0 },
      penaltyCost: { type: Number, default: 0 },
      otherCost: { type: Number, default: 0 },
      costPerKm: { type: Number, default: 0 },
      costPerVehicle: { type: Number, default: 0 },
      costPerTrip: { type: Number, default: 0 },
    },

    // Fuel Metrics
    fuel: {
      totalLiters: { type: Number, default: 0 },
      totalCost: { type: Number, default: 0 },
      averageConsumption: { type: Number, default: 0 },
      bestEfficiencyVehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
      worstEfficiencyVehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
      fuelWasteEstimate: { type: Number, default: 0 },
    },

    // Safety Metrics
    safety: {
      totalIncidents: { type: Number, default: 0 },
      criticalIncidents: { type: Number, default: 0 },
      speadingViolations: { type: Number, default: 0 },
      harshBrakingEvents: { type: Number, default: 0 },
      incidentRate: { type: Number, default: 0 },
      safetyScore: { type: Number, default: 100 },
      accidentFreeDays: { type: Number, default: 0 },
    },

    // Driver Metrics
    drivers: {
      totalDrivers: { type: Number, default: 0 },
      activeDrivers: { type: Number, default: 0 },
      averageSafetyScore: { type: Number, default: 0 },
      topDrivers: [
        { driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' }, score: Number },
      ],
      trainingCompletionRate: { type: Number, default: 0 },
      certificationComplianceRate: { type: Number, default: 0 },
    },

    // Maintenance Metrics
    maintenance: {
      totalWorkOrders: { type: Number, default: 0 },
      completedOnTime: { type: Number, default: 0 },
      averageRepairTime: { type: Number, default: 0 },
      preventiveRatio: { type: Number, default: 0 },
      breakdownCount: { type: Number, default: 0 },
      vehicleDowntimeHours: { type: Number, default: 0 },
      mtbf: { type: Number, default: 0 }, // Mean Time Between Failures
      mttr: { type: Number, default: 0 }, // Mean Time To Repair
    },

    // Compliance Metrics
    compliance: {
      inspectionPassRate: { type: Number, default: 0 },
      registrationCompliance: { type: Number, default: 0 },
      insuranceCompliance: { type: Number, default: 0 },
      licenseCompliance: { type: Number, default: 0 },
      overallComplianceScore: { type: Number, default: 0 },
    },

    // Dispatch / Delivery
    dispatch: {
      totalOrders: { type: Number, default: 0 },
      completedOrders: { type: Number, default: 0 },
      onTimeDeliveryRate: { type: Number, default: 0 },
      averageDeliveryTime: { type: Number, default: 0 },
      totalRevenue: { type: Number, default: 0 },
      customerSatisfaction: { type: Number, default: 0 },
    },

    // Fleet Health Index (0-100)
    fleetHealthIndex: { type: Number, default: 0 },
    healthBreakdown: {
      mechanical: { type: Number, default: 0 },
      safety: { type: Number, default: 0 },
      compliance: { type: Number, default: 0 },
      financial: { type: Number, default: 0 },
      operational: { type: Number, default: 0 },
    },

    // per-vehicle breakdown
    vehicleMetrics: [
      {
        vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
        totalKm: { type: Number, default: 0 },
        fuelConsumption: { type: Number, default: 0 },
        totalCost: { type: Number, default: 0 },
        costPerKm: { type: Number, default: 0 },
        utilizationRate: { type: Number, default: 0 },
        incidents: { type: Number, default: 0 },
        maintenanceEvents: { type: Number, default: 0 },
      },
    ],

    generatedAt: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

fleetKPISchema.index({ organization: 1, 'period.type': 1, 'period.startDate': -1 });
fleetKPISchema.index({ generatedAt: -1 });

module.exports = mongoose.model('FleetKPI', fleetKPISchema);
