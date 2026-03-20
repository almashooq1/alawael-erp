/**
 * Machine Learning Models - Advanced Predictions
 * نماذج التعلم الآلي للتنبؤات المتقدمة
 * يستخدم TensorFlow.js لنماذج في الوقت الفعلي
 */

const tf = require('@tensorflow/tfjs');
const fs = require('fs');
const path = require('path');

class AdvancedMLModels {
  constructor() {
    this.models = {};
    this.trainingData = {
      accidents: [],
      maintenance: [],
      routes: [],
      fuelConsumption: [],
    };
  }

  // ====== 1. نموذج التنبؤ بالحوادث ======
  async buildAccidentPredictionModel() {
    /**
     * مدخلات النموذج:
     * - السرعة (0-120 كم/س)
     * - حالة الطريق (0-5)
     * - الوقت من اليوم (0-24)
     * - ظروف الطقس (0-5)
     * - تاريخ السائق (عدد الحوادث السابقة)
     * - التعب (0-10)
     */

    console.log('🤖 بناء نموذج التنبؤ بالحوادث...');

    const model = tf.sequential({
      layers: [
        // Input layer: 6 inputs
        tf.layers.dense({
          units: 128,
          activation: 'relu',
          inputShape: [6],
        }),
        tf.layers.dropout({ rate: 0.3 }),

        // Hidden layers
        tf.layers.dense({
          units: 64,
          activation: 'relu',
        }),
        tf.layers.dropout({ rate: 0.3 }),

        tf.layers.dense({
          units: 32,
          activation: 'relu',
        }),
        tf.layers.dropout({ rate: 0.2 }),

        // Output layer: probability of accident (0-1)
        tf.layers.dense({
          units: 1,
          activation: 'sigmoid',
        }),
      ],
    });

    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'binaryCrossentropy',
      metrics: ['accuracy', 'auc'],
    });

    this.models.accidentPrediction = model;
    return model;
  }

  // ====== 2. نموذج التنبؤ بالصيانة ======
  async buildMaintenancePredictionModel() {
    /**
     * مدخلات النموذج:
     * - المسافة المقطوعة (كم)
     * - عمر المحرك (ساعات)
     * - درجة الحرارة (°C)
     * - عدد مرات الكبح
     * - آخر صيانة (أيام)
     * - استهلاك الوقود غير الطبيعي (%)
     */

    console.log('🤖 بناء نموذج التنبؤ بالصيانة...');

    const model = tf.sequential({
      layers: [
        tf.layers.dense({
          units: 64,
          activation: 'relu',
          inputShape: [6],
        }),
        tf.layers.batchNormalization(),
        tf.layers.dropout({ rate: 0.2 }),

        tf.layers.dense({
          units: 32,
          activation: 'relu',
        }),
        tf.layers.batchNormalization(),
        tf.layers.dropout({ rate: 0.2 }),

        tf.layers.dense({
          units: 16,
          activation: 'relu',
        }),

        // Output: نسبة احتمالية الحاجة للصيانة (0-1)
        tf.layers.dense({
          units: 1,
          activation: 'sigmoid',
        }),
      ],
    });

    model.compile({
      optimizer: tf.train.adam(0.0005),
      loss: 'meanSquaredError',
      metrics: ['mae'],
    });

    this.models.maintenancePrediction = model;
    return model;
  }

  // ====== 3. نموذج استهلاك الوقود ======
  async buildFuelConsumptionModel() {
    /**
     * مدخلات النموذج:
     * - السرعة الحالية (كم/س)
     * - المسافة المتبقية (كم)
     * - نوع الطريق (0=مدينة, 1=سريع, 2=جبل)
     * - ظروف الطقس (0-5)
     * - عمر المحرك (سنوات)
     * - وزن الحمل (كج)
     * - درجة حرارة المحرك (°C)
     * - معدل الكبح (نسبة مئوية)
     */

    console.log('🤖 بناء نموذج استهلاك الوقود...');

    const model = tf.sequential({
      layers: [
        tf.layers.dense({
          units: 64,
          activation: 'elu',
          inputShape: [8],
        }),
        tf.layers.dropout({ rate: 0.25 }),

        tf.layers.dense({
          units: 32,
          activation: 'elu',
        }),
        tf.layers.dropout({ rate: 0.25 }),

        tf.layers.dense({
          units: 16,
          activation: 'relu',
        }),

        // Output: استهلاك الوقود بـ لتر/100كم
        tf.layers.dense({
          units: 1,
          activation: 'relu',
        }),
      ],
    });

    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'meanAbsoluteError',
      metrics: ['mae', 'mse'],
    });

    this.models.fuelConsumption = model;
    return model;
  }

  // ====== 4. نموذج تحسين المسارات ======
  async buildRouteOptimizationModel() {
    /**
     * مدخلات النموذج:
     * - عدد المحطات
     * - المسافة الكلية (كم)
     * - الوقت المتاح (دقيقة)
     * - نوع الطريق
     * - الوقت من اليوم
     * - يوم الأسبوع
     * - احتقان المدينة (0-100)
     */

    console.log('🤖 بناء نموذج تحسين المسارات...');

    const model = tf.sequential({
      layers: [
        tf.layers.dense({
          units: 128,
          activation: 'relu',
          inputShape: [7],
        }),
        tf.layers.dropout({ rate: 0.3 }),

        tf.layers.dense({
          units: 64,
          activation: 'relu',
        }),

        tf.layers.dense({
          units: 32,
          activation: 'relu',
        }),

        // Output: أفضل مؤشر مسار (0-100)
        tf.layers.dense({
          units: 1,
          activation: 'sigmoid',
        }),
      ],
    });

    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'meanSquaredError',
      metrics: ['mae'],
    });

    this.models.routeOptimization = model;
    return model;
  }

  // ====== دالة التدريب ======
  async trainModel(modelName, trainingData, epochs = 50, batchSize = 32) {
    if (!this.models[modelName]) {
      throw new Error(`النموذج ${modelName} غير متوفر`);
    }

    console.log(`🎯 بدء تدريب النموذج: ${modelName}`);

    const model = this.models[modelName];
    const { inputs, outputs } = this.normalizeData(trainingData);

    const xs = tf.tensor2d(inputs);
    const ys = tf.tensor2d(outputs);

    try {
      await model.fit(xs, ys, {
        epochs,
        batchSize,
        validationSplit: 0.2,
        shuffle: true,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            console.log(
              `Epoch ${epoch + 1}/${epochs} - Loss: ${logs.loss.toFixed(4)}, Accuracy: ${logs.acc?.toFixed(4) || 'N/A'}`
            );
          },
        },
      });

      console.log(`✅ تم التدريب بنجاح`);
    } finally {
      xs.dispose();
      ys.dispose();
    }
  }

  // ====== دالة التنبؤ للحوادث ======
  predictAccidentRisk(input) {
    /**
     * input = {
     *   speed: 0-120,
     *   roadCondition: 0-5,
     *   timeOfDay: 0-24,
     *   weather: 0-5,
     *   driverHistory: 0-10,
     *   fatigue: 0-10
     * }
     */

    if (!this.models.accidentPrediction) {
      throw new Error('نموذج التنبؤ بالحوادث لم يتم تحميله');
    }

    const normalized = [
      input.speed / 120,
      input.roadCondition / 5,
      input.timeOfDay / 24,
      input.weather / 5,
      input.driverHistory / 10,
      input.fatigue / 10,
    ];

    const tensor = tf.tensor2d([normalized]);
    const prediction = this.models.accidentPrediction.predict(tensor);
    const riskScore = prediction.dataSync()[0];

    tensor.dispose();
    prediction.dispose();

    return {
      riskScore: Math.round(riskScore * 100),
      riskLevel: riskScore > 0.7 ? 'عالي' : riskScore > 0.4 ? 'متوسط' : 'منخفض',
      recommendations: this.getAccidentRecommendations(riskScore, input),
    };
  }

  // ====== دالة التنبؤ بالصيانة ======
  predictMaintenanceNeed(input) {
    /**
     * input = {
     *   distance: 0-500000,
     *   engineHours: 0-50000,
     *   temperature: 0-120,
     *   brakingFrequency: 0-100,
     *   lastMaintenance: 0-1000,
     *   fuelAnomalies: 0-100
     * }
     */

    if (!this.models.maintenancePrediction) {
      throw new Error('نموذج التنبؤ بالصيانة لم يتم تحميله');
    }

    const normalized = [
      Math.min(input.distance / 100000, 1),
      Math.min(input.engineHours / 10000, 1),
      input.temperature / 120,
      input.brakingFrequency / 100,
      Math.min(input.lastMaintenance / 365, 1),
      input.fuelAnomalies / 100,
    ];

    const tensor = tf.tensor2d([normalized]);
    const prediction = this.models.maintenancePrediction.predict(tensor);
    const needScore = prediction.dataSync()[0];

    tensor.dispose();
    prediction.dispose();

    return {
      needScore: Math.round(needScore * 100),
      priority: needScore > 0.7 ? 'عالية' : needScore > 0.4 ? 'متوسطة' : 'منخفضة',
      estimatedDaysUntilMaintenance: Math.max(1, Math.round((1 - needScore) * 30)),
      requiredServices: this.getMaintenanceServices(needScore, input),
    };
  }

  // ====== دالة التنبؤ باستهلاك الوقود ======
  predictFuelConsumption(input) {
    /**
     * input = {
     *   speed: 0-120,
     *   distance: 0-500,
     *   roadType: 0-2,
     *   weather: 0-5,
     *   engineAge: 0-20,
     *   load: 0-5000,
     *   engineTemp: 0-120,
     *   brakingRate: 0-100
     * }
     */

    if (!this.models.fuelConsumption) {
      throw new Error('نموذج استهلاك الوقود لم يتم تحميله');
    }

    const normalized = [
      input.speed / 120,
      Math.min(input.distance / 500, 1),
      input.roadType / 2,
      input.weather / 5,
      Math.min(input.engineAge / 20, 1),
      Math.min(input.load / 5000, 1),
      input.engineTemp / 120,
      input.brakingRate / 100,
    ];

    const tensor = tf.tensor2d([normalized]);
    const prediction = this.models.fuelConsumption.predict(tensor);
    const consumption = prediction.dataSync()[0];

    tensor.dispose();
    prediction.dispose();

    // حساب الوقود المتبقي
    const remainingFuel = input.fuel || 100;
    const estimatedRange = Math.round((remainingFuel / consumption) * 100);

    return {
      consumptionPerKm: consumption.toFixed(2),
      consumationPer100km: (consumption * 100).toFixed(2),
      estimatedRange,
      fuelWarning: estimatedRange < 50,
      optimizations: this.getFuelOptimizations(input, consumption),
    };
  }

  // ====== دالة تحسين المسارات ======
  optimizeRoute(input) {
    /**
     * input = {
     *   stops: 0-50,
     *   totalDistance: 0-500,
     *   timeAvailable: 0-600,
     *   roadType: 0-2,
     *   timeOfDay: 0-24,
     *   dayOfWeek: 0-6,
     *   congestion: 0-100
     * }
     */

    if (!this.models.routeOptimization) {
      throw new Error('نموذج تحسين المسارات لم يتم تحميله');
    }

    const normalized = [
      Math.min(input.stops / 50, 1),
      Math.min(input.totalDistance / 500, 1),
      Math.min(input.timeAvailable / 600, 1),
      input.roadType / 2,
      input.timeOfDay / 24,
      input.dayOfWeek / 6,
      input.congestion / 100,
    ];

    const tensor = tf.tensor2d([normalized]);
    const prediction = this.models.routeOptimization.predict(tensor);
    const routeScore = prediction.dataSync()[0];

    tensor.dispose();
    prediction.dispose();

    return {
      routeEfficiency: Math.round(routeScore * 100),
      estimatedTime: Math.round((input.totalDistance / 60) * (1 - routeScore * 0.3)),
      estimatedFuel: (input.totalDistance * 0.08 * (1 + (1 - routeScore) * 0.2)).toFixed(2),
      suggestedAlternatives: this.getRouteAlternatives(input, routeScore),
    };
  }

  // ====== دوال مساعدة ======

  normalizeData(data) {
    const inputs = data.features || [];
    const outputs = data.labels || [];

    // Normalize inputs to 0-1 range
    const minInputs = this.getMinValues(inputs);
    const maxInputs = this.getMaxValues(inputs);

    const normalizedInputs = inputs.map(row =>
      row.map((val, idx) => {
        const min = minInputs[idx];
        const max = maxInputs[idx];
        return (val - min) / (max - min || 1);
      })
    );

    return {
      inputs: normalizedInputs,
      outputs: outputs.map(o => [o]),
    };
  }

  getMinValues(matrix) {
    return matrix[0].map((_, col) => Math.min(...matrix.map(row => row[col])));
  }

  getMaxValues(matrix) {
    return matrix[0].map((_, col) => Math.max(...matrix.map(row => row[col])));
  }

  getAccidentRecommendations(riskScore, input) {
    const recommendations = [];

    if (input.speed > 80) {
      recommendations.push('قللل السرعة - أنت تسير بسرعة عالية');
    }

    if (input.fatigue > 7) {
      recommendations.push('خذ فترة راحة - قد تكون متعباً');
    }

    if (input.weather > 3) {
      recommendations.push('كن حذراً - ظروف الطقس سيئة');
    }

    if (input.roadCondition > 3) {
      recommendations.push('زد المسافة الآمنة بينك وبين المركبات الأخرى');
    }

    return recommendations.slice(0, 3);
  }

  getMaintenanceServices(needScore, input) {
    const services = [];

    if (input.brakingFrequency > 70) {
      services.push('فحص المكابح والوسائد الفرملية');
    }

    if (input.temperature > 100) {
      services.push('فحص نظام التبريد والراديتير');
    }

    if (input.fuelAnomalies > 50) {
      services.push('فحص حاقن الوقود والمرشحات');
    }

    if (input.engineHours > 5000) {
      services.push('تغيير زيت المحرك والفلاتر');
    }

    return services;
  }

  getFuelOptimizations(input, _consumption) {
    const optimizations = [];

    if (input.speed > 100) {
      optimizations.push('تقليل السرعة يوفر الوقود');
    }

    if (input.brakingRate > 60) {
      optimizations.push('قيادة أكثر سلاسة عندما يكون ذلك آمناً');
    }

    if (input.engineTemp > 110) {
      optimizations.push('فحص نظام التبريد');
    }

    if (input.load > 4000) {
      optimizations.push('قلل وزن الحمولة إن أمكن');
    }

    return optimizations;
  }

  getRouteAlternatives(input, routeScore) {
    const alternatives = [];

    if (input.congestion > 70) {
      alternatives.push({
        description: 'تجنب الطرق السريعة الرئيسية',
        efficiency: routeScore + 0.15,
        timeEstimate: input.totalDistance / 40,
      });
    }

    if (input.timeOfDay > 8 && input.timeOfDay < 10) {
      alternatives.push({
        description: 'اختر وقت سفر مختلف لتجنب ذروة الاختناق',
        efficiency: routeScore + 0.25,
        timeEstimate: input.totalDistance / 70,
      });
    }

    return alternatives;
  }

  // ====== حفظ وتحميل النماذج ======
  async saveModels(directory) {
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
    }

    for (const [modelName, model] of Object.entries(this.models)) {
      const path_url = `file://${path.join(directory, modelName)}`;
      await model.save(path_url);
      console.log(`✅ تم حفظ النموذج: ${modelName}`);
    }
  }

  async loadModels(directory) {
    const modelNames = [
      'accidentPrediction',
      'maintenancePrediction',
      'fuelConsumption',
      'routeOptimization',
    ];

    for (const modelName of modelNames) {
      try {
        const path_url = `file://${path.join(directory, modelName)}`;
        this.models[modelName] = await tf.loadLayersModel(`${path_url}/model.json`);
        console.log(`✅ تم تحميل النموذج: ${modelName}`);
      } catch (error) {
        console.error(`❌ خطأ في تحميل ${modelName}:`, error.message);
      }
    }
  }
}

module.exports = AdvancedMLModels;
