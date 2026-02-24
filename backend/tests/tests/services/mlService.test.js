/**
 * ML Service Tests
 * Comprehensive test suite for all ML models
 * NOTE: @tensorflow/tfjs now installed
 */

let MLService;
try {
  MLService = require('../../services/MLService');
} catch (error) {
  console.warn('⚠️  MLService import failed:', error.message);
}

describe('MLService', () => {
  describe('predictOrderDemand', () => {
    it('should forecast order demand for specified days', async () => {
      const orders = [
        { date: '2025-01-01', quantity: 100, revenue: 5000 },
        { date: '2025-01-02', quantity: 120, revenue: 6000 },
        { date: '2025-01-03', quantity: 110, revenue: 5500 },
        { date: '2025-01-04', quantity: 130, revenue: 6500 },
        { date: '2025-01-05', quantity: 125, revenue: 6250 },
        { date: '2025-01-06', quantity: 135, revenue: 6750 },
        { date: '2025-01-07', quantity: 140, revenue: 7000 },
      ];

      const result = await MLService.predictOrderDemand(orders, 30);

      expect(result).toBeDefined();
      expect(result.predictions).toHaveLength(30);
      expect(result.trend).toBeDefined();
      expect(result.accuracy).toBeGreaterThan(0);

      result.predictions.forEach(pred => {
        expect(pred.date).toBeDefined();
        expect(pred.predictedQuantity).toBeGreaterThan(0);
        expect(pred.confidence).toBeGreaterThanOrEqual(0);
        expect(pred.confidence).toBeLessThanOrEqual(1);
      });
    });

    it('should handle different forecast horizons', async () => {
      const orders = [
        { date: '2025-01-01', quantity: 100, revenue: 5000 },
        { date: '2025-01-02', quantity: 120, revenue: 6000 },
        { date: '2025-01-03', quantity: 110, revenue: 5500 },
        { date: '2025-01-04', quantity: 130, revenue: 6500 },
        { date: '2025-01-05', quantity: 125, revenue: 6250 },
        { date: '2025-01-06', quantity: 135, revenue: 6750 },
        { date: '2025-01-07', quantity: 140, revenue: 7000 },
      ];

      const result7 = await MLService.predictOrderDemand(orders, 7);
      const result30 = await MLService.predictOrderDemand(orders, 30);

      expect(result7.predictions).toHaveLength(7);
      expect(result30.predictions).toHaveLength(30);
    });

    it('should throw error for insufficient data', async () => {
      const orders = [{ date: '2025-01-01', quantity: 100, revenue: 5000 }];

      await expect(
        MLService.predictOrderDemand(orders, 30)
      ).rejects.toThrow();
    });
  });

  describe('predictCustomerChurn', () => {
    it('should predict churn risk for customers', async () => {
      const customers = [
        {
          id: 'cust1',
          lastOrderDate: '2025-01-01',
          orderCount: 10,
          totalSpent: 5000,
          daysInactive: 5,
          avgOrderValue: 500,
        },
        {
          id: 'cust2',
          lastOrderDate: '2024-11-01',
          orderCount: 5,
          totalSpent: 1000,
          daysInactive: 62,
          avgOrderValue: 200,
        },
        {
          id: 'cust3',
          lastOrderDate: '2025-01-10',
          orderCount: 20,
          totalSpent: 10000,
          daysInactive: 1,
          avgOrderValue: 500,
        },
      ];

      const result = await MLService.predictCustomerChurn(customers);

      expect(result).toBeDefined();
      expect(result.riskAssessment).toHaveLength(3);
      expect(result.averageRisk).toBeGreaterThanOrEqual(0);
      expect(result.averageRisk).toBeLessThanOrEqual(1);
      expect(result.highRiskCount).toBeGreaterThanOrEqual(0);

      result.riskAssessment.forEach(assessment => {
        expect(assessment.customerId).toBeDefined();
        expect(assessment.churnRisk).toBeGreaterThanOrEqual(0);
        expect(assessment.churnRisk).toBeLessThanOrEqual(1);
        expect(assessment.riskFactors).toBeDefined();
        expect(Array.isArray(assessment.recommendations)).toBe(true);
      });
    });

    it('should identify high risk customers', async () => {
      const customers = [
        {
          id: 'inactive',
          lastOrderDate: '2024-09-01',
          orderCount: 1,
          totalSpent: 50,
          daysInactive: 120,
          avgOrderValue: 50,
        },
      ];

      const result = await MLService.predictCustomerChurn(customers);

      expect(result.riskAssessment[0].churnRisk).toBeGreaterThan(0.7);
    });

    it('should give recommendations for at-risk customers', async () => {
      const customers = [
        {
          id: 'cust_risk',
          lastOrderDate: '2024-10-01',
          orderCount: 3,
          totalSpent: 500,
          daysInactive: 90,
          avgOrderValue: 166,
        },
      ];

      const result = await MLService.predictCustomerChurn(customers);
      const riskAssessment = result.riskAssessment[0];

      expect(riskAssessment.recommendations.length).toBeGreaterThan(0);
      expect(
        riskAssessment.recommendations.some(rec => rec.includes('offer'))
      ).toBe(true);
    });
  });

  describe('forecastRevenue', () => {
    it('should forecast revenue for specified months', async () => {
      const orders = [
        { date: '2024-10-01', amount: 5000 },
        { date: '2024-10-05', amount: 5500 },
        { date: '2024-11-01', amount: 6000 },
        { date: '2024-11-15', amount: 6500 },
        { date: '2024-12-01', amount: 7000 },
        { date: '2024-12-20', amount: 7500 },
        { date: '2025-01-05', amount: 6000 },
        { date: '2025-01-15', amount: 6500 },
      ];

      const result = await MLService.forecastRevenue(orders, 6);

      expect(result).toBeDefined();
      expect(result.forecast).toBeDefined();
      expect(result.trend).toBeDefined();
      expect(result.seasonality).toBeDefined();

      result.forecast.forEach(entry => {
        expect(entry.month).toBeDefined();
        expect(entry.projectedRevenue).toBeGreaterThan(0);
        expect(entry.confidence).toBeGreaterThanOrEqual(0);
      });
    });

    it('should detect seasonality in revenue', async () => {
      const orders = [
        // Simulate seasonal pattern: higher in months 11, 12
        { date: '2024-01-01', amount: 5000 },
        { date: '2024-02-01', amount: 5200 },
        { date: '2024-10-01', amount: 5100 },
        { date: '2024-11-01', amount: 8000 },
        { date: '2024-12-01', amount: 9000 },
        { date: '2025-01-01', amount: 5500 },
      ];

      const result = await MLService.forecastRevenue(orders, 3);

      expect(result.seasonality).toBeDefined();
      expect(Object.keys(result.seasonality).length).toBeGreaterThan(0);
    });

    it('should throw error for insufficient data', async () => {
      const orders = [{ date: '2024-01-01', amount: 5000 }];

      await expect(MLService.forecastRevenue(orders, 6)).rejects.toThrow();
    });
  });

  describe('recommendProducts', () => {
    it('should recommend products based on customer history', async () => {
      const customerHistory = [
        { productId: 'prod1', category: 'Electronics', price: 500 },
        { productId: 'prod2', category: 'Electronics', price: 600 },
      ];

      const allProducts = [
        { id: 'prod3', category: 'Electronics', price: 550, popularity: 0.8 },
        { id: 'prod4', category: 'Clothing', price: 50, popularity: 0.6 },
        { id: 'prod5', category: 'Electronics', price: 700, popularity: 0.9 },
        { id: 'prod6', category: 'Books', price: 20, popularity: 0.4 },
      ];

      const result = await MLService.recommendProducts(
        'cust123',
        customerHistory,
        allProducts,
        3
      );

      expect(result).toBeDefined();
      expect(result.recommendations).toBeDefined();
      expect(result.recommendations.length).toBeLessThanOrEqual(3);
      expect(result.diversityScore).toBeGreaterThanOrEqual(0);

      result.recommendations.forEach(rec => {
        expect(rec.productId).toBeDefined();
        expect(rec.relevanceScore).toBeGreaterThanOrEqual(0);
        expect(rec.relevanceScore).toBeLessThanOrEqual(1);
      });
    });

    it('should prefer same category products', async () => {
      const customerHistory = [
        { productId: 'prod1', category: 'Electronics', price: 500 },
      ];

      const allProducts = [
        { id: 'prod2', category: 'Electronics', price: 550, popularity: 0.5 },
        { id: 'prod3', category: 'Clothing', price: 50, popularity: 0.9 },
      ];

      const result = await MLService.recommendProducts(
        'cust123',
        customerHistory,
        allProducts,
        2
      );

      const electronicsRec = result.recommendations.find(
        r => r.productId === 'prod2'
      );
      const clothingRec = result.recommendations.find(
        r => r.productId === 'prod3'
      );

      if (electronicsRec && clothingRec) {
        expect(electronicsRec.relevanceScore).toBeGreaterThanOrEqual(
          clothingRec.relevanceScore * 0.8
        );
      }
    });

    it('should limit recommendations to requested count', async () => {
      const customerHistory = [
        { productId: 'prod1', category: 'Electronics', price: 500 },
      ];

      const allProducts = Array.from({ length: 20 }, (_, i) => ({
        id: `prod${i}`,
        category: 'Electronics',
        price: 500,
        popularity: Math.random(),
      }));

      const result = await MLService.recommendProducts(
        'cust123',
        customerHistory,
        allProducts,
        5
      );

      expect(result.recommendations.length).toBeLessThanOrEqual(5);
    });
  });

  describe('optimizeInventory', () => {
    it('should optimize inventory levels', async () => {
      const products = [
        {
          id: 'prod1',
          currentStock: 500,
          demandHistory: Array(90).fill(10),
          leadTime: 5,
          unitCost: 50,
          holdingCost: 25,
        },
      ];

      const result = await MLService.optimizeInventory(products);

      expect(result).toBeDefined();
      expect(result.recommendations).toBeDefined();
      expect(result.totalPotentialSavings).toBeGreaterThanOrEqual(0);

      result.recommendations.forEach(rec => {
        expect(rec.productId).toBeDefined();
        expect(rec.recommendedStock).toBeDefined();
        expect(rec.reorderPoint).toBeDefined();
        expect(rec.EOQ).toBeDefined();
        expect(rec.estimatedSavings).toBeDefined();
      });
    });

    it('should recommend lower stock for overstocked items', async () => {
      const products = [
        {
          id: 'prod1',
          currentStock: 1000,
          demandHistory: Array(90).fill(2), // Low demand
          leadTime: 5,
          unitCost: 50,
          holdingCost: 25,
        },
      ];

      const result = await MLService.optimizeInventory(products);
      const recommendation = result.recommendations[0];

      expect(recommendation.recommendedStock).toBeLessThan(
        recommendation.currentStock
      );
      expect(recommendation.estimatedSavings).toBeGreaterThan(0);
    });

    it('should calculate EOQ correctly', async () => {
      const products = [
        {
          id: 'prod1',
          currentStock: 100,
          demandHistory: Array(90).fill(10),
          leadTime: 5,
          unitCost: 100,
          holdingCost: 20,
        },
      ];

      const result = await MLService.optimizeInventory(products);
      const recommendation = result.recommendations[0];

      // EOQ should be calculated based on demand and costs
      expect(recommendation.EOQ).toBeGreaterThan(0);
    });
  });

  describe('detectAnomalies', () => {
    it('should detect anomalies in time series data', async () => {
      const data = [
        { timestamp: '2025-01-01', value: 100 },
        { timestamp: '2025-01-02', value: 105 },
        { timestamp: '2025-01-03', value: 102 },
        { timestamp: '2025-01-04', value: 500 }, // Anomaly
        { timestamp: '2025-01-05', value: 103 },
        { timestamp: '2025-01-06', value: 104 },
        { timestamp: '2025-01-07', value: 101 },
      ];

      const result = await MLService.detectAnomalies(data, 2);

      expect(result).toBeDefined();
      expect(result.anomalies).toBeDefined();
      expect(result.anomalyCount).toBeGreaterThan(0);
      expect(result.anomalies[0].timestamp).toBe('2025-01-04');
    });

    it('should classify anomaly severity', async () => {
      const data = [
        { timestamp: '2025-01-01', value: 100 },
        { timestamp: '2025-01-02', value: 102 },
        { timestamp: '2025-01-03', value: 101 },
        { timestamp: '2025-01-04', value: 200 }, // High anomaly
        { timestamp: '2025-01-05', value: 103 },
      ];

      const result = await MLService.detectAnomalies(data, 1.5);

      expect(result.anomalies.length).toBeGreaterThan(0);
      result.anomalies.forEach(anomaly => {
        expect(['LOW', 'MEDIUM', 'HIGH']).toContain(anomaly.severity);
      });
    });

    it('should handle custom threshold', async () => {
      const data = [
        { timestamp: '2025-01-01', value: 100 },
        { timestamp: '2025-01-02', value: 102 },
        { timestamp: '2025-01-03', value: 101 },
        { timestamp: '2025-01-04', value: 115 },
        { timestamp: '2025-01-05', value: 103 },
      ];

      const result1 = await MLService.detectAnomalies(data, 1);
      const result2 = await MLService.detectAnomalies(data, 3);

      // Lower threshold should detect more anomalies
      expect(result1.anomalyCount).toBeGreaterThanOrEqual(result2.anomalyCount);
    });

    it('should throw error for insufficient data', async () => {
      const data = [{ timestamp: '2025-01-01', value: 100 }];

      await expect(MLService.detectAnomalies(data, 2)).rejects.toThrow();
    });
  });

  describe('Helper methods', () => {
    it('should aggregate data by month', () => {
      const data = [
        { date: '2024-01-05', value: 100 },
        { date: '2024-01-15', value: 200 },
        { date: '2024-02-05', value: 150 },
      ];

      const result = MLService.aggregateByMonth(data);

      expect(result['2024-01']).toBe(300);
      expect(result['2024-02']).toBe(150);
    });

    it('should calculate trend correctly', () => {
      const data = [
        { x: 1, y: 10 },
        { x: 2, y: 20 },
        { x: 3, y: 30 },
        { x: 4, y: 40 },
      ];

      const trend = MLService.calculateTrend(data);

      expect(trend.slope).toBeGreaterThan(0); // Increasing trend
      expect(trend.intercept).toBeDefined();
    });

    it('should detect seasonality', () => {
      const data = {
        '2024-01': 100,
        '2024-02': 100,
        '2024-12': 500,
      };

      const seasonality = MLService.detectSeasonality(data);

      expect(seasonality['12']).toBeGreaterThan(1); // December has higher seasonality factor
    });

    it('should extract customer preferences', () => {
      const history = [
        { category: 'Electronics', price: 500 },
        { category: 'Electronics', price: 600 },
        { category: 'Clothing', price: 50 },
      ];

      const preferences = MLService.extractPreferences(history);

      expect(preferences.categories).toBeDefined();
      expect(preferences.avgPrice).toBeDefined();
      expect(Array.isArray(preferences.categories)).toBe(true);
    });

    it('should find most frequent items', () => {
      const items = ['A', 'B', 'A', 'C', 'A', 'B'];

      const frequent = MLService.getMostFrequent(items, 2);

      expect(frequent).toContain('A');
      expect(frequent.length).toBeLessThanOrEqual(2);
    });

    it('should check price ranges', () => {
      const result1 = MLService.isPriceInRange(550, 500, 100);
      const result2 = MLService.isPriceInRange(700, 500, 100);

      expect(result1).toBe(true);
      expect(result2).toBe(false);
    });
  });

  describe('Error handling', () => {
    it('should handle invalid input types', async () => {
      const invalidOrders = 'not an array';

      await expect(
        MLService.predictOrderDemand(invalidOrders, 30)
      ).rejects.toThrow();
    });

    it('should handle empty datasets', async () => {
      const emptyOrders = [];

      await expect(
        MLService.predictOrderDemand(emptyOrders, 30)
      ).rejects.toThrow();
    });

    it('should handle null values gracefully', async () => {
      const ordersWithNulls = [
        { date: '2025-01-01', quantity: null, revenue: 5000 },
        { date: '2025-01-02', quantity: 120, revenue: 6000 },
      ];

      // Should normalize or handle null values
      const result = await MLService.predictOrderDemand(ordersWithNulls, 30);
      expect(result).toBeDefined();
    });
  });
});
