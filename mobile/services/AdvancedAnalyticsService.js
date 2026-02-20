/**
 * Phase 34: Advanced Analytics Service
 * Real-time analytics, dashboards, and business intelligence
 * Aggregates and analyzes driver and fleet data
 */

import axios from 'axios';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

class AdvancedAnalyticsService {
  /**
   * Get comprehensive driver dashboard
   * Analysis period: customizable (today, week, month, custom)
   */
  static async getDriverDashboard(driverId, period = 'today') {
    try {
      const periodMap = {
        today: { days: 1 },
        week: { days: 7 },
        month: { days: 30 },
        quarter: { days: 90 },
        year: { days: 365 },
      };

      const params = periodMap[period] || { days: 1 };

      const response = await axios.get(
        `${API_BASE_URL}/api/analytics/driver/${driverId}/dashboard`,
        { params }
      );

      return {
        success: true,
        data: {
          // Safety Metrics
          safety: {
            score: response.data.safetyScore, // 0-100
            violations: response.data.violations,
            violations_breakdown: {
              speeding: response.data.speedingViolations,
              harsh_braking: response.data.harshBrakingEvents,
              harsh_acceleration: response.data.harshAccelerationEvents,
              seatbelt: response.data.seatbeltViolations,
              distraction: response.data.distractionEvents,
            },
            trend: response.data.safetyTrend, // up/down/stable
          },

          // Performance Metrics
          performance: {
            rating: response.data.performanceRating, // 0-100
            fuelEfficiency: response.data.fuelEconomy,
            avgSpeed: response.data.averageSpeed,
            speedingPercentage: response.data.speedingPercentage,
            idleTime: response.data.totalIdleTime,
          },

          // Trip Metrics
          trips: {
            total: response.data.totalTrips,
            totalDistance: response.data.totalDistance,
            totalDuration: response.data.totalDuration,
            averageTripDistance: response.data.avgTripDistance,
            averageTripDuration: response.data.avgTripDuration,
            nightDrives: response.data.nightDrives,
          },

          // Health Metrics
          health: {
            maintenanceStatus: response.data.maintenanceStatus,
            nextServiceDue: response.data.nextServiceDate,
            vehicleAlerts: response.data.vehicleAlerts,
          },

          // Comparison
          comparison: {
            vsTeamAverage: response.data.vsTeamComparison,
            vsCompanyAverage: response.data.vsCompanyComparison,
            rank: response.data.driverRank,
          },

          period,
          generatedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      console.error('❌ Failed to get driver dashboard:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get fleet-wide analytics and insights
   */
  static async getFleetAnalytics(period = 'week') {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/analytics/fleet`, {
        params: { period },
      });

      return {
        success: true,
        data: {
          // Fleet Overview
          overview: {
            totalDrivers: response.data.totalDrivers,
            totalVehicles: response.data.totalVehicles,
            activeNow: response.data.activeVehicles,
            fleetHealthScore: response.data.fleetHealthScore, // 0-100
            operational: response.data.operationalVehicles,
            inMaintenance: response.data.maintenanceVehicles,
          },

          // Safety Analytics
          safety: {
            totalViolations: response.data.totalViolations,
            avgSafetyScore: response.data.avgSafetyScore,
            highRiskDrivers: response.data.highRiskDrivers,
            criticalAlerts: response.data.criticalAlerts,
            violationsTrend: response.data.violationsTrend,
            safetyRanking: response.data.safetyRanking, // top 5
          },

          // Performance Analytics
          performance: {
            avgFuelEconomy: response.data.avgFuelEconomy,
            totalDistance: response.data.totalFleetDistance,
            totalFuel: response.data.totalFuelUsed,
            costPerKm: response.data.costPerKm,
            efficiency: response.data.efficiencyRating,
          },

          // Operational Metrics
          operations: {
            totalTrips: response.data.totalTrips,
            avgTripDistance: response.data.avgTripDistance,
            utilizationRate: response.data.utilizationRate, // %
            downtime: response.data.totalDowntime,
            onTimeDeliveryRate: response.data.onTimeDeliveryRate,
          },

          // Cost Analysis
          costs: {
            totalCost: response.data.totalCost,
            fuelCost: response.data.fuelCost,
            maintenanceCost: response.data.maintenanceCost,
            accidentCost: response.data.accidentCost,
            otheCost: response.data.otherCost,
            costPerTrip: response.data.costPerTrip,
          },

          // Risk Assessment
          risks: {
            highRiskDrivers: response.data.highRiskDrivers,
            maintenanceAlerts: response.data.maintenanceAlerts,
            securityIncidents: response.data.securityIncidents,
            riskScore: response.data.fleetRiskScore, // 0-100
          },

          period,
          generatedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      console.error('❌ Failed to get fleet analytics:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get detailed trip analysis
   */
  static async analyzeTip(driverId, tripId) {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/analytics/driver/${driverId}/trip/${tripId}`
      );

      return {
        success: true,
        data: {
          tripDetails: {
            id: tripId,
            startTime: response.data.startTime,
            endTime: response.data.endTime,
            duration: response.data.duration,
            distance: response.data.distance,
            fromLocation: response.data.fromLocation,
            toLocation: response.data.toLocation,
            averageSpeed: response.data.averageSpeed,
            maxSpeed: response.data.maxSpeed,
          },

          safetyAnalysis: {
            safetyScore: response.data.safetyScore,
            speedingIncidents: response.data.speedingIncidents,
            harshBrakingEvents: response.data.harshBrakingEvents,
            harshAccelerationEvents: response.data.harshAccelerationEvents,
            corneringEvents: response.data.corneringEvents,
            distractionEvents: response.data.distractionEvents,
            riskLevel: response.data.riskLevel, // low/medium/high/critical
          },

          efficiencyAnalysis: {
            fuelConsumption: response.data.fuelConsumption,
            fuelCost: response.data.fuelCost,
            idleTime: response.data.idleTime,
            idlePercentage: response.data.idlePercentage,
            efficiencyScore: response.data.efficiencyScore,
          },

          route: response.data.routePoints, // GPS coordinates
          speedProfile: response.data.speedProfile, // speed by time
          alerts: response.data.alerts, // all alerts during trip
        },
      };
    } catch (error) {
      console.error('❌ Failed to analyze trip:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get predictive analytics and recommendations
   */
  static async getPredictions(driverId) {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/analytics/driver/${driverId}/predictions`
      );

      return {
        success: true,
        data: {
          // Safety Predictions
          safetyPredictions: {
            riskLevel: response.data.predictedRiskLevel, // low/medium/high
            violation_probability: response.data.violationProbability,
            accident_risk: response.data.accidentRisk,
            recommendations: [
              {
                priority: 'high',
                title: 'Reduce Speeding',
                description: 'Your speeding incidents increased 15% last week',
                action: 'Complete defensive driving course',
              },
              {
                priority: 'medium',
                title: 'Improve Braking',
                description: 'Harsh braking events up by 8%',
                action: 'Practice smooth braking techniques',
              },
              // ... more recommendations from API
              ...response.data.safetyRecommendations,
            ],
          },

          // Maintenance Predictions
          maintenancePredictions: {
            nextServiceDue: response.data.nextServiceDate,
            estimatedCost: response.data.estimatedMaintenanceCost,
            urgentIssues: response.data.urgentIssues,
            scheduledMaintenance: response.data.scheduledMaintenance,
            partLifeRemaining: response.data.partConditions,
          },

          // Performance Predictions
          performancePredictions: {
            predictedFuelCost: response.data.forecastedFuelCost,
            efficiency_trend: response.data.efficiencyTrend, // up/down
            estimated_monthly_cost: response.data.monthlyForecast,
            optimization_opportunities: response.data.optimizations,
          },

          // Behavior Predictions
          behaviorPredictions: {
            likelyToLeaveCompany: response.data.churnRisk,
            safetyTrajectory: response.data.safetyTrajectory,
            performanceTrajectory: response.data.performanceTrajectory,
            recommendedActions: response.data.behavioralActions,
          },

          generatedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      console.error('❌ Failed to get predictions:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get compliance and regulatory reports
   */
  static async getComplianceReport(driverId, reportType = 'monthly') {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/analytics/compliance/${driverId}`,
        { params: { type: reportType } }
      );

      return {
        success: true,
        data: {
          driver: {
            id: driverId,
            name: response.data.driverName,
            licenseNumber: response.data.licenseNumber,
            licenseExpiry: response.data.licenseExpiry,
            licenseClass: response.data.licenseClass,
          },

          compliance: {
            overallScore: response.data.complianceScore, // 0-100
            hoursOfServiceCompliance: response.data.hosCompliance,
            maintenanceCompliance: response.data.maintenanceCompliance,
            safetyCompliance: response.data.safetyCompliance,
            documentationCompliance: response.data.documentsCompliance,
            violations: response.data.violations, // count
          },

          regulatoryRequirements: {
            lastInspection: response.data.lastInspectionDate,
            nextInspectionDue: response.data.nextInspectionDate,
            certifications: response.data.certifications,
            trainingRequired: response.data.requiredTraining,
            examsDue: response.data.upcomingExams,
          },

          violations: response.data.violationDetails,
          recommendations: response.data.complianceRecommendations,
          generatedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      console.error('❌ Failed to get compliance report:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Export analytics as PDF or CSV
   */
  static async exportAnalytics(format = 'pdf', driverId = null, type = 'dashboard') {
    try {
      const endpoint = driverId
        ? `${API_BASE_URL}/api/analytics/export?format=${format}&driverId=${driverId}&type=${type}`
        : `${API_BASE_URL}/api/analytics/export?format=${format}&type=${type}`;

      const response = await axios.get(endpoint, {
        responseType: format === 'pdf' ? 'blob' : 'text',
      });

      return {
        success: true,
        data: response.data,
        format,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('❌ Failed to export analytics:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get custom analytics with flexible queries
   */
  static async getCustomAnalytics(query) {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/analytics/custom`, {
        query,
        timestamp: new Date().toISOString(),
      });

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error('❌ Failed to get custom analytics:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Subscribe to real-time analytics updates
   */
  static subscribeToAnalytics(driverId, onUpdate) {
    try {
      // WebSocket or Server-Sent Events for real-time updates
      const eventSource = new EventSource(
        `${API_BASE_URL}/api/analytics/stream/${driverId}`
      );

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        onUpdate(data);
      };

      eventSource.onerror = (error) => {
        console.error('❌ Analytics stream error:', error);
        eventSource.close();
      };

      // Return unsubscribe function
      return () => {
        eventSource.close();
        console.log('✅ Unsubscribed from analytics');
      };
    } catch (error) {
      console.error('❌ Failed to subscribe:', error);
      return null;
    }
  }
}

export default AdvancedAnalyticsService;
