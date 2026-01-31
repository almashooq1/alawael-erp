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
exports.AnomalyDetectionModel = void 0;
exports.createAnomalyDetectionModel = createAnomalyDetectionModel;
const math = __importStar(require("mathjs"));
class AnomalyDetectionModel {
    constructor(config = {}) {
        this.mean = [];
        this.std = [];
        this.q1 = [];
        this.q3 = [];
        this.config = {
            method: 'zscore',
            threshold: 2.5,
            windowSize: 10,
            ...config,
        };
    }
    /**
     * Fit Model on Training Data
     */
    fit(data) {
        if (data.length === 0) {
            throw new Error('No training data provided');
        }
        const numFeatures = data[0].length;
        // Calculate mean
        this.mean = [];
        for (let j = 0; j < numFeatures; j++) {
            const values = data.map(row => row[j]);
            const meanVal = math.mean(values);
            this.mean.push(typeof meanVal === 'number' ? meanVal : Number(meanVal));
        }
        // Calculate standard deviation
        this.std = [];
        for (let j = 0; j < numFeatures; j++) {
            const values = data.map(row => row[j]);
            const stdVal = math.std(values);
            this.std.push(typeof stdVal === 'number' ? stdVal : Number(stdVal));
        }
        // Calculate quartiles for IQR method
        this.q1 = [];
        this.q3 = [];
        for (let j = 0; j < numFeatures; j++) {
            const values = data.map(row => row[j]).sort((a, b) => a - b);
            const q1Idx = Math.floor(values.length * 0.25);
            const q3Idx = Math.floor(values.length * 0.75);
            this.q1.push(values[q1Idx]);
            this.q3.push(values[q3Idx]);
        }
        console.log('✓ Anomaly detection model fitted');
    }
    /**
     * Z-Score Method
     */
    detectZScore(data) {
        const anomalies = [];
        const scores = [];
        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            const zScores = row.map((val, j) => Math.abs((val - this.mean[j]) / (this.std[j] + 1e-10)));
            const maxZScore = Math.max(...zScores);
            scores.push(maxZScore);
            if (maxZScore > this.config.threshold) {
                anomalies.push(i);
            }
        }
        return { anomalies, scores };
    }
    /**
     * Interquartile Range (IQR) Method
     */
    detectIQR(data) {
        const anomalies = [];
        const scores = [];
        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            let anomalyScore = 0;
            let isAnomaly = false;
            for (let j = 0; j < row.length; j++) {
                const iqr = this.q3[j] - this.q1[j];
                const lowerBound = this.q1[j] - 1.5 * iqr;
                const upperBound = this.q3[j] + 1.5 * iqr;
                if (row[j] < lowerBound || row[j] > upperBound) {
                    isAnomaly = true;
                    anomalyScore += Math.abs(row[j] - this.q1[j]) / iqr;
                }
            }
            scores.push(anomalyScore);
            if (isAnomaly) {
                anomalies.push(i);
            }
        }
        return { anomalies, scores };
    }
    /**
     * Isolation Forest Method
     */
    detectIsolationForest(data) {
        const anomalies = [];
        const scores = [];
        // Simplified isolation forest using depth-based anomaly scoring
        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            let depth = 0;
            // Calculate average distance to k-nearest neighbors
            const distances = data
                .map((other, idx) => ({
                idx,
                dist: Math.sqrt(row.reduce((sum, val, j) => sum + Math.pow(val - other[j], 2), 0)),
            }))
                .sort((a, b) => a.dist - b.dist)
                .slice(0, 5);
            const avgDist = distances.reduce((sum, d) => sum + d.dist, 0) / distances.length;
            const anomalyScore = 1 / (1 + Math.exp(-avgDist + 1));
            scores.push(anomalyScore);
            if (anomalyScore > this.config.threshold / 3) {
                anomalies.push(i);
            }
        }
        return { anomalies, scores };
    }
    /**
     * Mahalanobis Distance Method
     */
    detectMahalanobis(data) {
        const anomalies = [];
        const scores = [];
        // Calculate covariance matrix
        const numFeatures = data[0].length;
        const covariance = Array(numFeatures)
            .fill(0)
            .map(() => Array(numFeatures).fill(0));
        for (let i = 0; i < numFeatures; i++) {
            for (let j = 0; j < numFeatures; j++) {
                let cov = 0;
                for (let k = 0; k < data.length; k++) {
                    cov += (data[k][i] - this.mean[i]) * (data[k][j] - this.mean[j]);
                }
                covariance[i][j] = cov / (data.length - 1);
            }
        }
        // Calculate mahalanobis distance
        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            const diff = row.map((val, j) => val - this.mean[j]);
            // Simplified mahalanobis (using diagonal approximation)
            let mahDist = 0;
            for (let j = 0; j < numFeatures; j++) {
                mahDist += Math.pow(diff[j], 2) / (covariance[j][j] + 1e-10);
            }
            mahDist = Math.sqrt(mahDist);
            scores.push(mahDist);
            if (mahDist > this.config.threshold) {
                anomalies.push(i);
            }
        }
        return { anomalies, scores };
    }
    /**
     * Detect Anomalies
     */
    detect(data) {
        if (this.mean.length === 0) {
            throw new Error('Model not fitted');
        }
        let result;
        switch (this.config.method) {
            case 'iqr':
                result = this.detectIQR(data);
                break;
            case 'isolation-forest':
                result = this.detectIsolationForest(data);
                break;
            case 'mahalanobis':
                result = this.detectMahalanobis(data);
                break;
            default:
                result = this.detectZScore(data);
        }
        // Calculate severity
        const severity = {};
        const maxScore = Math.max(...result.scores);
        for (const idx of result.anomalies) {
            const normalizedScore = result.scores[idx] / maxScore;
            if (normalizedScore > 0.9) {
                severity[idx] = 'critical';
            }
            else if (normalizedScore > 0.7) {
                severity[idx] = 'high';
            }
            else if (normalizedScore > 0.5) {
                severity[idx] = 'medium';
            }
            else {
                severity[idx] = 'low';
            }
        }
        return {
            anomalies: result.anomalies,
            scores: result.scores,
            method: this.config.method,
            detectionRate: result.anomalies.length / data.length,
            severity,
        };
    }
    /**
     * Real-Time Anomaly Detection
     */
    detectRealtimeAnomaly(dataPoint) {
        const result = this.detect([dataPoint]);
        const isAnomaly = result.anomalies.length > 0;
        const score = result.scores[0];
        let severity = 'normal';
        if (isAnomaly) {
            severity = result.severity[0] || 'low';
        }
        return { isAnomaly, score, severity };
    }
    /**
     * Seasonal Decomposition
     */
    seasonalDecomposition(data, seasonLength = 12) {
        const trend = [];
        const seasonal = [];
        const residual = [];
        // Calculate trend (moving average)
        const windowSize = Math.min(seasonLength, Math.floor(data.length / 3));
        for (let i = 0; i < data.length; i++) {
            const start = Math.max(0, i - Math.floor(windowSize / 2));
            const end = Math.min(data.length, i + Math.floor(windowSize / 2));
            const trendVal = data.slice(start, end).reduce((a, b) => a + b, 0) / (end - start);
            trend.push(trendVal);
        }
        // Calculate seasonal (deviation from trend)
        const detrended = data.map((val, i) => val - trend[i]);
        const seasonalPattern = Array(seasonLength).fill(0);
        for (let i = 0; i < seasonLength; i++) {
            const indices = Array.from({ length: Math.floor(data.length / seasonLength) }, (_, k) => i + k * seasonLength);
            const values = indices.map(idx => detrended[idx]).filter(v => !isNaN(v));
            if (values.length > 0) {
                seasonalPattern[i] = values.reduce((a, b) => a + b, 0) / values.length;
            }
        }
        for (let i = 0; i < data.length; i++) {
            seasonal.push(seasonalPattern[i % seasonLength]);
            residual.push(data[i] - trend[i] - seasonal[i]);
        }
        return {
            trend,
            seasonal,
            residual,
            seasonLength,
        };
    }
    /**
     * Get Statistics
     */
    getStats() {
        return {
            method: this.config.method,
            threshold: this.config.threshold,
            mean: this.mean,
            std: this.std,
            q1: this.q1,
            q3: this.q3,
        };
    }
}
exports.AnomalyDetectionModel = AnomalyDetectionModel;
// Export factory function
function createAnomalyDetectionModel(config) {
    return new AnomalyDetectionModel(config);
}
