"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeepLearningModel = void 0;
exports.createDeepLearningModel = createDeepLearningModel;
const tf = __importStar(require("@tensorflow/tfjs"));
const math = __importStar(require("mathjs"));
class DeepLearningModel {
    constructor(config) {
        this.model = null;
        this.trainingHistory = [];
        this.normalizeParams = { mean: [], std: [] };
        this.config = {
            inputSize: 10,
            hiddenLayers: [64, 32, 16],
            outputSize: 1,
            learningRate: 0.001,
            epochs: 50,
            batchSize: 32,
            ...config,
        };
    }
    /**
     * Initialize Neural Network Architecture
     */
    initializeNetwork() {
        const inputs = tf.input({ shape: [this.config.inputSize] });
        let x = inputs;
        // Hidden Layers
        this.config.hiddenLayers.forEach((units, index) => {
            x = tf.layers.dense({
                units,
                activation: index === 0 ? 'relu' : 'elu',
                kernelRegularizer: tf.regularizers.l2({ l2: 0.001 }),
            }).apply(x);
            x = tf.layers.batchNormalization().apply(x);
            x = tf.layers.dropout({ rate: 0.3 }).apply(x);
        });
        // Output Layer
        const outputs = tf.layers.dense({
            units: this.config.outputSize,
            activation: 'sigmoid',
        }).apply(x);
        this.model = tf.model({ inputs, outputs });
        // Compile Model
        this.model.compile({
            optimizer: tf.train.adam(this.config.learningRate),
            loss: 'meanSquaredError',
            metrics: ['mae', 'mse'],
        });
        console.log('✓ Neural Network initialized');
        this.model.summary();
    }
    /**
     * Normalize Input Data
     */
    normalizeData(data) {
        const tensorData = tf.tensor2d(data);
        const { mean, variance } = tf.moments(tensorData, 0);
        const std = tf.sqrt(variance);
        const meanArray = Array.from(mean.dataSync());
        const stdArray = Array.from(std.dataSync());
        this.normalizeParams = { mean: meanArray, std: stdArray };
        const normalized = tensorData.sub(mean).div(std);
        const result = Array.from(normalized.dataSync());
        // Clean up tensors
        tensorData.dispose();
        mean.dispose();
        std.dispose();
        normalized.dispose();
        return Array(data.length)
            .fill(0)
            .map((_, i) => result.slice(i * this.config.inputSize, (i + 1) * this.config.inputSize));
    }
    /**
     * Train Neural Network
     */
    async trainNeuralNetwork(trainingData) {
        if (!this.model) {
            throw new Error('Model not initialized');
        }
        const normalizedInputs = this.normalizeData(trainingData.inputs);
        const xs = tf.tensor2d(normalizedInputs);
        const ys = tf.tensor2d(trainingData.outputs);
        try {
            const history = await this.model.fit(xs, ys, {
                epochs: this.config.epochs,
                batchSize: this.config.batchSize,
                validationSplit: 0.2,
                verbose: 1,
                callbacks: {
                    onEpochEnd: (epoch, logs) => {
                        this.trainingHistory.push({ epoch, ...logs });
                        if (epoch % 10 === 0) {
                            console.log(`Epoch ${epoch}: loss = ${logs?.loss?.toFixed(6)}`);
                        }
                    },
                },
            });
            console.log('✓ Model training completed');
            return history;
        }
        finally {
            xs.dispose();
            ys.dispose();
        }
    }
    /**
     * Predict Process Outcomes
     */
    async predictWithDL(input) {
        if (!this.model) {
            throw new Error('Model not trained');
        }
        // Normalize input
        const normalizedInput = input.map((val, idx) => (val - this.normalizeParams.mean[idx]) / this.normalizeParams.std[idx]);
        const inputTensor = tf.tensor2d([normalizedInput]);
        const output = this.model.predict(inputTensor);
        const predictions = Array.from(output.dataSync());
        // Calculate confidence
        const confidence = Math.min(1, Math.max(0, predictions[0]));
        // Extract patterns
        const patterns = this.extractPatterns(input);
        const recommendations = this.generateRecommendations(predictions[0], patterns);
        // Clean up
        inputTensor.dispose();
        output.dispose();
        return {
            predictions,
            confidence,
            patterns,
            recommendations,
        };
    }
    /**
     * Extract Patterns from Input Data
     */
    extractPatterns(input) {
        const patterns = [];
        // Trend Analysis
        if (input[0] > input[1]) {
            patterns.push('increasing_trend');
        }
        else if (input[0] < input[1]) {
            patterns.push('decreasing_trend');
        }
        // Volatility Analysis
        const variance = typeof math.variance(input) === 'number'
            ? math.variance(input)
            : math.variance(input)[0];
        if (variance > 0.5) {
            patterns.push('high_volatility');
        }
        else if (variance < 0.1) {
            patterns.push('stable_pattern');
        }
        // Peak Detection
        const max = Math.max(...input);
        const maxIndex = input.indexOf(max);
        if (maxIndex > 0 && maxIndex < input.length - 1) {
            patterns.push('peak_detected');
        }
        // Cycle Detection
        const autocorr = this.calculateAutocorrelation(input);
        if (autocorr > 0.7) {
            patterns.push('cyclic_pattern');
        }
        return patterns;
    }
    /**
     * Calculate Autocorrelation
     */
    calculateAutocorrelation(data, lag = 1) {
        const mean = math.mean(data);
        const c0 = math.sum(data.map(x => Math.pow(x - mean, 2))) / data.length;
        const c1 = math.sum(data.slice(lag).map((x, i) => (x - mean) * (data[i] - mean))) / data.length;
        return c1 / c0;
    }
    /**
     * Generate AI Recommendations
     */
    generateRecommendations(score, patterns) {
        const recommendations = [];
        if (score > 0.8) {
            recommendations.push('✓ Process performing excellently');
            recommendations.push('Continue current strategy');
        }
        else if (score > 0.6) {
            recommendations.push('⚠ Process performing well');
            recommendations.push('Monitor for potential issues');
        }
        else if (score > 0.4) {
            recommendations.push('⚡ Process needs improvement');
            recommendations.push('Review and optimize current approach');
        }
        else {
            recommendations.push('🔴 Process requires immediate action');
            recommendations.push('Implement corrective measures');
        }
        if (patterns.includes('high_volatility')) {
            recommendations.push('Reduce volatility through stabilization');
        }
        if (patterns.includes('decreasing_trend')) {
            recommendations.push('Reverse declining trend');
        }
        if (patterns.includes('cyclic_pattern')) {
            recommendations.push('Plan for predictable cycles');
        }
        return recommendations;
    }
    /**
     * Optimize Network Parameters
     */
    async optimizeNetwork(validationData) {
        if (!this.model) {
            throw new Error('Model not trained');
        }
        const xs = tf.tensor2d(validationData.inputs);
        const ys = tf.tensor2d(validationData.outputs);
        const evaluation = this.model.evaluate(xs, ys);
        const [loss, mae, mse] = evaluation.map(t => t.dataSync()[0]);
        xs.dispose();
        ys.dispose();
        evaluation.forEach(t => t.dispose());
        return {
            loss,
            mae,
            mse,
            optimized: true,
            timestamp: new Date(),
        };
    }
    /**
     * Analyze Complex Patterns
     */
    async analyzePatterns(processes) {
        const patterns = {
            totalPatterns: 0,
            commonPatterns: [],
            anomalies: [],
            clusters: {},
            insights: [],
        };
        for (let i = 0; i < processes.length; i++) {
            const processData = processes[i].steps.map((s) => s.duration);
            const patternList = this.extractPatterns(processData);
            patterns.commonPatterns.push(...patternList);
        }
        // Count pattern occurrences
        const patternCounts = patterns.commonPatterns.reduce((acc, p) => {
            acc[p] = (acc[p] || 0) + 1;
            return acc;
        }, {});
        patterns.totalPatterns = Object.keys(patternCounts).length;
        patterns.commonPatterns = Object.entries(patternCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map((p) => p[0]);
        // Generate insights
        patterns.insights = [
            `Found ${patterns.totalPatterns} unique patterns`,
            `Most common pattern: ${patterns.commonPatterns[0] || 'none'}`,
            `Analyzed ${processes.length} processes`,
        ];
        return patterns;
    }
    /**
     * Save Model
     */
    async saveModel(path) {
        if (!this.model) {
            throw new Error('Model not initialized');
        }
        await this.model.save(`file://${path}`);
        console.log(`✓ Model saved to ${path}`);
    }
    /**
     * Load Model
     */
    async loadModel(path) {
        this.model = await tf.loadLayersModel(`file://${path}/model.json`);
        console.log(`✓ Model loaded from ${path}`);
    }
    /**
     * Get Model Summary
     */
    getModelSummary() {
        if (!this.model) {
            return { error: 'Model not initialized' };
        }
        return {
            config: this.config,
            layers: this.model.layers.length,
            parameters: this.model.countParams(),
            training_history: this.trainingHistory.slice(-10),
        };
    }
}
exports.DeepLearningModel = DeepLearningModel;
// Export factory function
function createDeepLearningModel(config) {
    const model = new DeepLearningModel(config);
    model.initializeNetwork();
    return model;
}
