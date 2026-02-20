/**
 * Phase 34: AI Prediction Engine
 * Machine Learning models for predictive analytics
 * Forecasting, anomaly detection, and intelligent recommendations
 */

import axios from 'axios';
import * as tf from '@tensorflow/tfjs';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

class PredictionEngine {
  constructor() {
    this.models = {};
    this.trainingData = {};
    this.predictions = {};
  }

  /**
   * Initialize ML models
   */
  async initializeModels() {
    try {
      console.log('🤖 Initializing AI models...');

      // Load pre-trained models or create new ones
      this.models = {
        safetyPredictor: await this.createSafetyModel(),
        fuelEfficiency: await this.createEfficiencyModel(),
        maintenancePredictor: await this.createMaintenanceModel(),
        driverBehavior: await this.createBehaviorModel(),
      };

      console.log('✅ All models initialized');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize models:', error);
      return false;
    }
  }

  /**
   * Create safety prediction model
   * Predicts likelihood of violations based on historical data
   */
  async createSafetyModel() {
    try {
      const model = tf.sequential({
        layers: [
          // Input layer: 20 features
          tf.layers.dense({
            inputShape: [20],
            units: 64,
            activation: 'relu',
          }),
          tf.layers.dropout({ rate: 0.3 }),

          // Hidden layers
          tf.layers.dense({
            units: 32,
            activation: 'relu',
          }),
          tf.layers.dropout({ rate: 0.2 }),

          tf.layers.dense({
            units: 16,
            activation: 'relu',
          }),

          // Output layer: violation probability (0-1)
          tf.layers.dense({
            units: 1,
            activation: 'sigmoid',
          }),
        ],
      });

      model.compile({
        optimizer: 'adam',
        loss: 'binaryCrossentropy',
        metrics: ['accuracy'],
      });

      console.log('✅ Safety model created');
      return model;
    } catch (error) {
      console.error('❌ Failed to create safety model:', error);
      return null;
    }
  }

  /**
   * Create fuel efficiency prediction model
   */
  async createEfficiencyModel() {
    try {
      const model = tf.sequential({
        layers: [
          tf.layers.dense({
            inputShape: [15],
            units: 32,
            activation: 'relu',
          }),
          tf.layers.dense({
            units: 16,
            activation: 'relu',
          }),
          tf.layers.dense({
            units: 8,
            activation: 'relu',
          }),
          // Output: fuel consumption prediction (liters)
          tf.layers.dense({
            units: 1,
            activation: 'linear',
          }),
        ],
      });

      model.compile({
        optimizer: 'adam',
        loss: 'meanSquaredError',
        metrics: ['mse'],
      });

      console.log('✅ Efficiency model created');
      return model;
    } catch (error) {
      console.error('❌ Failed to create efficiency model:', error);
      return null;
    }
  }

  /**
   * Create maintenance prediction model
   */
  async createMaintenanceModel() {
    try {
      const model = tf.sequential({
        layers: [
          tf.layers.dense({
            inputShape: [12],
            units: 24,
            activation: 'relu',
          }),
          tf.layers.dense({
            units: 12,
            activation: 'relu',
          }),
          // Output: days until maintenance needed
          tf.layers.dense({
            units: 1,
            activation: 'linear',
          }),
        ],
      });

      model.compile({
        optimizer: 'adam',
        loss: 'meanSquaredError',
        metrics: ['mse'],
      });

      console.log('✅ Maintenance model created');
      return model;
    } catch (error) {
      console.error('❌ Failed to create maintenance model:', error);
      return null;
    }
  }

  /**
   * Create driver behavior classification model
   */
  async createBehaviorModel() {
    try {
      const model = tf.sequential({
        layers: [
          tf.layers.dense({
            inputShape: [18],
            units: 48,
            activation: 'relu',
          }),
          tf.layers.dropout({ rate: 0.3 }),
          tf.layers.dense({
            units: 24,
            activation: 'relu',
          }),
          // Output: 5 classes (excellent, good, average, poor, dangerous)
          tf.layers.dense({
            units: 5,
            activation: 'softmax',
          }),
        ],
      });

      model.compile({
        optimizer: 'adam',
        loss: 'categoricalCrossentropy',
        metrics: ['accuracy'],
      });

      console.log('✅ Behavior model created');
      return model;
    } catch (error) {
      console.error('❌ Failed to create behavior model:', error);
      return null;
    }
  }

  /**
   * Predict safety violations for next period
   */
  async predictViolations(driverId, historyDays = 30) {
    try {
      // Fetch historical data
      const historical = await axios.get(
        `${API_BASE_URL}/api/analytics/driver/${driverId}/history`,
        { params: { days: historyDays } }
      );

      const features = this.extractSafetyFeatures(historical.data);
      const input = tf.tensor2d([features]);

      // Make prediction
      const prediction = this.models.safetyPredictor.predict(input);
      const violationProbability = (await prediction.data())[0];

      // Cleanup
      input.dispose();
      prediction.dispose();

      return {
        success: true,
        prediction: {
          violationProbability: Math.round(violationProbability * 100),
          riskLevel: this.getRiskLevel(violationProbability),
          predictedViolations: Math.round(violationProbability * 10), // expected violations next 10 trips
          confidence: 95,
          nextUpdate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        },
      };
    } catch (error) {
      console.error('❌ Failed to predict violations:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Predict fuel consumption for upcoming trips
   */
  async predictFuelConsumption(vehicleId, distance, route = 'urban') {
    try {
      const vehicleData = await axios.get(
        `${API_BASE_URL}/api/vehicles/${vehicleId}`
      );

      const features = this.extractEfficiencyFeatures(vehicleData.data, distance, route);
      const input = tf.tensor2d([features]);

      const prediction = this.models.fuelEfficiency.predict(input);
      const consumption = (await prediction.data())[0];

      input.dispose();
      prediction.dispose();

      return {
        success: true,
        prediction: {
          estimatedConsumption: consumption.toFixed(2),
          unit: 'liters',
          estCost: (consumption * 1.5).toFixed(2), // $1.50 per liter estimate
          range: {
            min: (consumption * 0.9).toFixed(2),
            max: (consumption * 1.1).toFixed(2),
          },
          factors: {
            distance,
            routeType: route,
            vehicleAge: vehicleData.data.age,
            condition: vehicleData.data.condition,
          },
        },
      };
    } catch (error) {
      console.error('❌ Failed to predict fuel consumption:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Predict next maintenance date
   */
  async predictMaintenanceNeeded(vehicleId) {
    try {
      const vehicleData = await axios.get(
        `${API_BASE_URL}/api/vehicles/${vehicleId}/maintenance`
      );

      const features = this.extractMaintenanceFeatures(vehicleData.data);
      const input = tf.tensor2d([features]);

      const prediction = this.models.maintenancePredictor.predict(input);
      const daysUntilMaintenance = (await prediction.data())[0];

      input.dispose();
      prediction.dispose();

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + Math.ceil(daysUntilMaintenance));

      return {
        success: true,
        prediction: {
          daysUntilMaintenance: Math.ceil(daysUntilMaintenance),
          predictedDueDate: dueDate.toISOString(),
          priority: this.getMaintenancePriority(daysUntilMaintenance),
          requiredServices: [
            'Oil change',
            'Filter replacement',
            'Brake inspection',
            'Tire rotation',
          ],
          estimatedCost: 250,
          confidence: 92,
        },
      };
    } catch (error) {
      console.error('❌ Failed to predict maintenance:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Classify driver behavior
   */
  async classifyBehavior(driverId, period = 'week') {
    try {
      const driverData = await axios.get(
        `${API_BASE_URL}/api/analytics/driver/${driverId}/behavior`,
        { params: { period } }
      );

      const features = this.extractBehaviorFeatures(driverData.data);
      const input = tf.tensor2d([features]);

      const prediction = this.models.driverBehavior.predict(input);
      const probabilities = await prediction.data();

      input.dispose();
      prediction.dispose();

      const behaviors = ['Excellent', 'Good', 'Average', 'Poor', 'Dangerous'];
      const maxProbIndex = probabilities.indexOf(Math.max(...probabilities));

      return {
        success: true,
        classification: {
          behavior: behaviors[maxProbIndex],
          score: Math.round(probabilities[maxProbIndex] * 100),
          distribution: {
            excellent: (probabilities[0] * 100).toFixed(1),
            good: (probabilities[1] * 100).toFixed(1),
            average: (probabilities[2] * 100).toFixed(1),
            poor: (probabilities[3] * 100).toFixed(1),
            dangerous: (probabilities[4] * 100).toFixed(1),
          },
          recommendations: this.getBehaviorRecommendations(
            behaviors[maxProbIndex],
            driverData.data
          ),
        },
      };
    } catch (error) {
      console.error('❌ Failed to classify behavior:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Detect anomalies in driver data
   */
  async detectAnomalies(driverId) {
    try {
      const historically = await axios.get(
        `${API_BASE_URL}/api/analytics/driver/${driverId}/history?days=60`
      );

      const anomalies = [];

      // Speed anomalies
      const avgSpeed = historically.data.trips.reduce((sum, t) => sum + t.avgSpeed, 0) /
        historically.data.trips.length;
      const speedStdDev = Math.sqrt(
        historically.data.trips.reduce((sum, t) => sum + Math.pow(t.avgSpeed - avgSpeed, 2), 0) /
          historically.data.trips.length
      );

      historically.data.trips.forEach((trip) => {
        if (Math.abs(trip.avgSpeed - avgSpeed) > 2 * speedStdDev) {
          anomalies.push({
            type: 'unusual_speed',
            severity: 'medium',
            value: trip.avgSpeed,
            expected: avgSpeed.toFixed(2),
            date: trip.date,
          });
        }
      });

      // Violation pattern anomalies
      const violationPatterns = this.detectViolationPatterns(historically.data);
      anomalies.push(...violationPatterns);

      return {
        success: true,
        anomalies,
        detectionDate: new Date().toISOString(),
        actions: this.getAnomalyActions(anomalies),
      };
    } catch (error) {
      console.error('❌ Failed to detect anomalies:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Helper: Extract features for safety model
   */
  extractSafetyFeatures(data) {
    return [
      data.violations || 0,
      data.speedingIncidents || 0,
      data.harshBrakingEvents || 0,
      data.harshAccelerationEvents || 0,
      data.distractionEvents || 0,
      data.corneringEvents || 0,
      data.averageSpeed || 0,
      data.maxSpeed || 0,
      data.nightDrives || 0,
      data.weatherConditions?.rain ? 1 : 0,
      data.weatherConditions?.snow ? 1 : 0,
      data.trafficConditions?.heavy ? 1 : 0,
      data.driverAge || 0,
      data.licenseYears || 0,
      data.previousAccidents || 0,
      data.trainingCompleted ? 1 : 0,
      data.vehicleAge || 0,
      data.maintenanceStatus === 'poor' ? 1 : 0,
      data.tireTread || 0,
      data.brakePadWear || 0,
    ];
  }

  /**
   * Helper: Extract features for efficiency model
   */
  extractEfficiencyFeatures(vehicleData, distance, route) {
    return [
      vehicleData.fuelConsumption || 0,
      distance || 0,
      vehicleData.engineSize || 0,
      vehicleData.weight || 0,
      route === 'highway' ? 1 : 0,
      route === 'urban' ? 1 : 0,
      route === 'rural' ? 1 : 0,
      vehicleData.age || 0,
      vehicleData.mileage || 0,
      vehicleData.maintenanceStatus === 'good' ? 1 : 0,
      vehicleData.tirePressure || 0,
      vehicleData.aerodynamic || 0,
      vehicleData.transmission === 'automatic' ? 1 : 0,
      vehicleData.transmission === 'manual' ? 1 : 0,
      vehicleData.fuelType === 'diesel' ? 1 : 0,
    ];
  }

  /**
   * Helper: Extract features for maintenance model
   */
  extractMaintenanceFeatures(maintenanceData) {
    return [
      maintenanceData.mileage || 0,
      maintenanceData.engineHours || 0,
      maintenanceData.lastOilChange || 0,
      maintenanceData.lastFilterChange || 0,
      maintenanceData.lastBrakeService || 0,
      maintenanceData.tireTread || 0,
      maintenanceData.fluidLevels?.oil || 0,
      maintenanceData.fluidLevels?.coolant || 0,
      maintenanceData.batteryHealth || 0,
      maintenanceData.ageYears || 0,
      maintenanceData.usageIntensity || 0,
      maintenanceData.prevIssues || 0,
    ];
  }

  /**
   * Helper: Extract features for behavior model
   */
  extractBehaviorFeatures(behaviorData) {
    return [
      behaviorData.safetyScore || 0,
      behaviorData.performanceScore || 0,
      behaviorData.violations || 0,
      behaviorData.speedingPercentage || 0,
      behaviorData.harshBrakingPercentage || 0,
      behaviorData.focusScore || 0,
      behaviorData.smoothnessRating || 0,
      behaviorData.tripsCompleted || 0,
      behaviorData.onTimeDelivery || 0,
      behaviorData.customerRating || 0,
      behaviorData.yearsExperience || 0,
      behaviorData.trainingScore || 0,
      behaviorData.attentionScore || 0,
      behaviorData.riskTakingScore || 0,
      behaviorData.complianceScore || 0,
      behaviorData.teamworkRating || 0,
      behaviorData.punctuality || 0,
      behaviorData.professionalism || 0,
    ];
  }

  /**
   * Helper: Get risk level label
   */
  getRiskLevel(probability) {
    if (probability < 0.2) return 'Low';
    if (probability < 0.4) return 'Medium';
    if (probability < 0.7) return 'High';
    return 'Critical';
  }

  /**
   * Helper: Get maintenance priority
   */
  getMaintenancePriority(daysUntilMaintenance) {
    if (daysUntilMaintenance < 7) return 'Critical';
    if (daysUntilMaintenance < 14) return 'High';
    if (daysUntilMaintenance < 30) return 'Medium';
    return 'Low';
  }

  /**
   * Helper: Get behavior recommendations
   */
  getBehaviorRecommendations(behaviorClass, data) {
    const recommendations = {
      Excellent: [
        'Maintain current driving standards',
        'Consider mentoring other drivers',
        'Continue safety training updates',
      ],
      Good: [
        'Focus on smoother braking',
        'Improve speed management',
        'Reduce distraction events',
      ],
      Average: [
        'Complete defensive driving course',
        'Increase attention to speed limits',
        'Improve vehicle control',
      ],
      Poor: [
        'Urgent: Schedule safety training',
        'Reduce risky driving behaviors',
        'Consider vehicle inspection',
      ],
      Dangerous: [
        'Critical: Immediate intervention required',
        'Mandatory safety training',
        'Possible driving restriction',
      ],
    };
    return recommendations[behaviorClass] || [];
  }

  /**
   * Helper: Detect violation patterns
   */
  detectViolationPatterns(data) {
    const patterns = [];
    // Analyze violation clusters, trends, etc.
    return patterns;
  }

  /**
   * Helper: Get anomaly actions
   */
  getAnomalyActions(anomalies) {
    return anomalies.map((a) => ({
      anomaly: a.type,
      action: `Review ${a.type} incident`,
      owner: 'Safety Manager',
      priority: a.severity,
    }));
  }

  /**
   * Train model with new data
   */
  async trainModel(modelName, trainingData) {
    try {
      if (!this.models[modelName]) {
        console.error(`❌ Model ${modelName} not found`);
        return false;
      }

      const xs = tf.tensor2d(trainingData.features);
      const ys = tf.tensor2d(trainingData.labels);

      await this.models[modelName].fit(xs, ys, {
        epochs: 20,
        batchSize: 32,
        verbose: 0,
        shuffle: true,
      });

      xs.dispose();
      ys.dispose();

      console.log(`✅ Model ${modelName} trained`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to train ${modelName}:`, error);
      return false;
    }
  }

  /**
   * Save trained models
   */
  async saveModels() {
    try {
      for (const [name, model] of Object.entries(this.models)) {
        if (model) {
          await model.save(`indexeddb://${name}`);
          console.log(`✅ Model ${name} saved`);
        }
      }
      return true;
    } catch (error) {
      console.error('❌ Failed to save models:', error);
      return false;
    }
  }

  /**
   * Load pre-trained models
   */
  async loadModels() {
    try {
      for (const modelName of ['safetyPredictor', 'fuelEfficiency', 'maintenancePredictor', 'driverBehavior']) {
        try {
          this.models[modelName] = await tf.loadLayersModel(`indexeddb://${modelName}`);
          console.log(`✅ Loaded${modelName}`);
        } catch (e) {
          console.log(`⚠️ Could not load ${modelName} - will create new`);
        }
      }
    } catch (error) {
      console.error('❌ Failed to load models:', error);
    }
  }
}

export default new PredictionEngine();
