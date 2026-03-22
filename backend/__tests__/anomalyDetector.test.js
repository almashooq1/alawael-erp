/**
 * Tests for anomalyDetector.js
 * Anomaly detection engine — rules, analysis, baselines, risk scoring, middleware
 */

/* eslint-disable no-unused-vars */

jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
}));

const { AnomalyDetector, anomalyDetectionMiddleware } = require('../utils/anomalyDetector');

describe('AnomalyDetector', () => {
  let detector;

  beforeEach(() => {
    detector = new AnomalyDetector();
  });

  // ──────── Constructor ────────
  describe('constructor', () => {
    it('should initialize with default config', () => {
      expect(detector.config.minDataPoints).toBe(100);
      expect(detector.config.stdDevThreshold).toBe(3);
      expect(detector.config.windowSize).toBe(3600000);
      expect(detector.config.alertThreshold).toBe(0.8);
    });

    it('should accept custom config options', () => {
      const custom = new AnomalyDetector({
        minDataPoints: 50,
        stdDevThreshold: 2,
        alertThreshold: 0.5,
      });
      expect(custom.config.minDataPoints).toBe(50);
      expect(custom.config.stdDevThreshold).toBe(2);
      expect(custom.config.alertThreshold).toBe(0.5);
    });

    it('should have default detection rules initialized', () => {
      expect(detector.detectionRules.length).toBeGreaterThanOrEqual(5);
    });
  });

  // ──────── Detection Rules ────────
  describe('brute-force rule', () => {
    it('should detect brute force with >5 failed attempts', () => {
      const result = detector.analyze('user1', {
        userId: 'user1',
        failedAttempts: 8,
        timestamp: Date.now(),
      });
      const bruteForce = result.anomalies.find(a => a.rule === 'brute-force');
      expect(bruteForce).toBeDefined();
      expect(bruteForce.severity).toBe('high');
      expect(bruteForce.confidence).toBeGreaterThan(0);
    });

    it('should NOT trigger with <=5 failed attempts', () => {
      const result = detector.analyze('user2', {
        userId: 'user2',
        failedAttempts: 3,
        timestamp: Date.now(),
      });
      const bruteForce = result.anomalies.find(a => a.rule === 'brute-force');
      expect(bruteForce).toBeUndefined();
    });
  });

  describe('volume-anomaly rule', () => {
    it('should detect unusual volume (>5x average)', () => {
      const result = detector.analyze('user3', {
        userId: 'user3',
        requestCount: 200,
        avgRequestCount: 10,
        timestamp: Date.now(),
      });
      const vol = result.anomalies.find(a => a.rule === 'volume-anomaly');
      expect(vol).toBeDefined();
      expect(vol.severity).toBe('medium');
    });

    it('should NOT trigger for normal volume', () => {
      const result = detector.analyze('user4', {
        userId: 'user4',
        requestCount: 15,
        avgRequestCount: 10,
        timestamp: Date.now(),
      });
      const vol = result.anomalies.find(a => a.rule === 'volume-anomaly');
      expect(vol).toBeUndefined();
    });
  });

  describe('time-anomaly rule', () => {
    it('should detect access at unusual time', () => {
      // Create a timestamp at 3 AM
      const ts = new Date();
      ts.setHours(3, 0, 0, 0);
      const result = detector.analyze('user5', {
        userId: 'user5',
        timestamp: ts.getTime(),
        usualAccessHours: [9, 10, 11, 14, 15],
      });
      const time = result.anomalies.find(a => a.rule === 'time-anomaly');
      expect(time).toBeDefined();
      expect(time.severity).toBe('low');
    });
  });

  describe('statistical-anomaly rule', () => {
    it('should detect metric far from baseline (direct rule test)', () => {
      const rule = detector.detectionRules.find(r => r.name === 'statistical-anomaly');
      const result = rule.execute({
        metric: 500,
        baseline: { mean: 100, stdDev: 20 },
      });
      expect(result).toBeDefined();
      expect(result.type).toBe('statistical-anomaly');
      expect(result.severity).toBe('medium');
    });

    it('should NOT trigger within normal range (direct rule test)', () => {
      const rule = detector.detectionRules.find(r => r.name === 'statistical-anomaly');
      const result = rule.execute({
        metric: 110,
        baseline: { mean: 100, stdDev: 20 },
      });
      expect(result).toBeNull();
    });
  });

  // ──────── addRule ────────
  describe('addRule', () => {
    it('should register custom detection rule', () => {
      const before = detector.detectionRules.length;
      detector.addRule('custom-rule', () => null);
      expect(detector.detectionRules.length).toBe(before + 1);
    });
  });

  // ──────── calculateRiskScore ────────
  describe('calculateRiskScore', () => {
    it('should return 0 for empty anomalies', () => {
      expect(detector.calculateRiskScore([])).toBe(0);
    });

    it('should return score between 0 and 1', () => {
      const score = detector.calculateRiskScore([
        { severity: 'high', confidence: 0.9 },
        { severity: 'low', confidence: 0.5 },
      ]);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(1);
    });
  });

  // ──────── Baseline management ────────
  describe('getOrCreateBaseline', () => {
    it('should create new baseline for unknown user', () => {
      const bl = detector.getOrCreateBaseline('newUser');
      expect(bl.requestCount.mean).toBe(10);
      expect(bl.dataPoints).toBe(0);
    });

    it('should return existing baseline for known user', () => {
      detector.getOrCreateBaseline('known');
      const bl = detector.getOrCreateBaseline('known');
      expect(bl).toBeDefined();
    });
  });

  describe('updateBaseline', () => {
    it('should increment dataPoints', () => {
      const bl = detector.getOrCreateBaseline('upUser');
      detector.updateBaseline('upUser', { requestCount: 20, timestamp: Date.now() });
      expect(bl.dataPoints).toBe(1);
    });
  });

  // ──────── getStats ────────
  describe('getStats', () => {
    it('should return detection statistics', () => {
      const stats = detector.getStats();
      expect(stats).toHaveProperty('anomaliesDetected');
      expect(stats).toHaveProperty('alertsRaised');
      expect(stats).toHaveProperty('usersMonitored');
      expect(stats).toHaveProperty('detectionRules');
    });
  });

  // ──────── getRecentAnomalies ────────
  describe('getRecentAnomalies', () => {
    it('should return empty array initially', () => {
      expect(detector.getRecentAnomalies()).toEqual([]);
    });

    it('should return anomalies after detection', () => {
      detector.analyze('u', { userId: 'u', failedAttempts: 20, timestamp: Date.now() });
      expect(detector.getRecentAnomalies().length).toBeGreaterThan(0);
    });
  });

  // ──────── getHighRiskUsers ────────
  describe('getHighRiskUsers', () => {
    it('should return users with high confidence anomalies', () => {
      detector.analyze('risky', {
        userId: 'risky',
        failedAttempts: 10,
        timestamp: Date.now(),
      });
      const users = detector.getHighRiskUsers(0.5);
      expect(users.length).toBeGreaterThanOrEqual(1);
      expect(users[0].userId).toBe('risky');
    });
  });

  // ──────── resetStats ────────
  describe('resetStats', () => {
    it('should reset all statistics to zero', () => {
      detector.stats.anomaliesDetected = 42;
      detector.resetStats();
      expect(detector.stats.anomaliesDetected).toBe(0);
    });
  });

  // ──────── calculateDistance ────────
  describe('calculateDistance', () => {
    it('should return 0 for null locations', () => {
      expect(detector.calculateDistance(null, null)).toBe(0);
    });

    it('should calculate distance between two points', () => {
      const d = detector.calculateDistance({ lat: 0, lon: 0 }, { lat: 0, lon: 1 });
      expect(d).toBeGreaterThan(0);
      expect(d).toBeLessThan(200); // ~111 km
    });
  });
});

// ──────── anomalyDetectionMiddleware ────────
describe('anomalyDetectionMiddleware', () => {
  it('should call next() for low-risk requests', () => {
    const detector = new AnomalyDetector();
    const mw = anomalyDetectionMiddleware(detector);

    const req = {
      method: 'GET',
      path: '/api/test',
      ip: '1.2.3.4',
      user: { id: 'u1' },
      get: jest.fn().mockReturnValue('test-agent'),
    };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    mw(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.anomalyAnalysis).toBeDefined();
  });

  it('should block high-risk requests (riskScore > 0.9)', () => {
    const detector = new AnomalyDetector();
    // Override analyze to return very high risk
    detector.analyze = jest.fn().mockReturnValue({
      riskScore: 0.95,
      anomalies: [{ type: 'test', severity: 'high', confidence: 1 }],
      alerts: [],
    });
    const mw = anomalyDetectionMiddleware(detector);

    const req = {
      method: 'POST',
      path: '/api/login',
      ip: '5.5.5.5',
      user: { id: 'attacker' },
      get: jest.fn(),
    };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    mw(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, riskScore: 0.95 })
    );
  });
});
