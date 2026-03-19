/**
 * AI/ML Analytics Routes
 * Provides ML predictions and insights
 */

const express = require('express');
const router = express.Router();
const MLService = require('../services/MLService');
const authenticate = require('../middleware/authenticate');
const Order = require('../models/Order');
const Customer = require('../models/Customer');
const Product = require('../models/Product');

// Middleware
router.use(authenticate);

/**
 * POST /api/ml/forecast/orders
 * Forecast order demand for next 30 days
 */
router.post('/forecast/orders', async (req, res) => {
  try {
    const { days = 30 } = req.body;

    // Get historical orders
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 90);

    const orders = await Order.find({
      createdAt: { $gte: thirtyDaysAgo },
    })
      .select('createdAt totalAmount')
      .sort({ createdAt: 1 });

    if (orders.length < 7) {
      return res.status(400).json({
        error: 'Insufficient historical data (need at least 7 orders)',
      });
    }

    const historicalOrders = orders.map(o => ({
      date: o.createdAt.toISOString().split('T')[0],
      quantity: 1,
      revenue: o.totalAmount,
    }));

    const forecast = await MLService.predictOrderDemand(
      historicalOrders,
      days
    );

    res.json({
      success: true,
      data: forecast,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/ml/forecast/revenue
 * Forecast revenue for next 6 months
 */
router.post('/forecast/revenue', async (req, res) => {
  try {
    const { months = 6 } = req.body;

    // Get historical orders
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const orders = await Order.find({
      createdAt: { $gte: oneYearAgo },
      status: { $in: ['completed', 'delivered'] },
    })
      .select('createdAt totalAmount')
      .sort({ createdAt: 1 });

    if (orders.length < 12) {
      return res.status(400).json({
        error: 'Insufficient historical data (need at least 12 months of data)',
      });
    }

    const orderData = orders.map(o => ({
      date: o.createdAt.toISOString(),
      amount: o.totalAmount,
    }));

    const forecast = await MLService.forecastRevenue(orderData, months);

    res.json({
      success: true,
      data: forecast,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/ml/churn/predict
 * Predict customer churn risk
 */
router.post('/churn/predict', async (req, res) => {
  try {
    // Get all customers with activity data
    const customers = await Customer.find()
      .select('_id lastOrderDate totalOrders totalSpent')
      .lean();

    if (customers.length === 0) {
      return res.status(400).json({ error: 'No customers found' });
    }

    // Enhance with calculated fields
    const customersWithMetrics = customers.map(customer => {
      const lastOrderDate = customer.lastOrderDate
        ? new Date(customer.lastOrderDate)
        : new Date(0);
      const daysInactive = Math.floor(
        (new Date() - lastOrderDate) / (1000 * 60 * 60 * 24)
      );

      return {
        id: customer._id.toString(),
        lastOrderDate: customer.lastOrderDate?.toISOString().split('T')[0],
        orderCount: customer.totalOrders || 0,
        totalSpent: customer.totalSpent || 0,
        daysInactive,
        avgOrderValue:
          customer.totalOrders > 0
            ? customer.totalSpent / customer.totalOrders
            : 0,
      };
    });

    const prediction = await MLService.predictCustomerChurn(
      customersWithMetrics
    );

    // Sort by risk descending
    const sorted = {
      ...prediction,
      riskAssessment: prediction.riskAssessment.sort(
        (a, b) => b.churnRisk - a.churnRisk
      ),
    };

    res.json({
      success: true,
      data: sorted,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/ml/recommendations/products
 * Get product recommendations for a customer
 */
router.post('/recommendations/products', async (req, res) => {
  try {
    const { customerId, limit = 5 } = req.body;

    if (!customerId) {
      return res.status(400).json({ error: 'customerId is required' });
    }

    // Get customer purchase history
    const orders = await Order.find({ customerId }).populate({
      path: 'items.productId',
      select: '_id category price',
    });

    const customerHistory = [];
    orders.forEach(order => {
      order.items.forEach(item => {
        if (item.productId) {
          customerHistory.push({
            productId: item.productId._id.toString(),
            category: item.productId.category,
            price: item.productId.price,
          });
        }
      });
    });

    if (customerHistory.length === 0) {
      return res.status(400).json({
        error: 'Customer has no purchase history',
      });
    }

    // Get all available products
    const allProducts = await Product.find()
      .select('_id category price name')
      .lean();

    const productsWithMetrics = allProducts.map(product => ({
      id: product._id.toString(),
      category: product.category,
      price: product.price,
      popularity: Math.random() * 0.8 + 0.2, // Simplified popularity
    }));

    const recommendations = await MLService.recommendProducts(
      customerId,
      customerHistory,
      productsWithMetrics,
      limit
    );

    // Fetch product details for recommendations
    const enrichedRecommendations = await Promise.all(
      recommendations.recommendations.map(async rec => {
        const product = await Product.findById(rec.productId).select(
          '_id name category price image'
        );
        return {
          ...rec,
          product,
        };
      })
    );

    res.json({
      success: true,
      data: {
        ...recommendations,
        recommendations: enrichedRecommendations,
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/ml/inventory/optimize
 * Optimize inventory levels
 */
router.post('/inventory/optimize', async (req, res) => {
  try {
    // Get all products with inventory
    const products = await Product.find()
      .select('_id currentStock unitCost')
      .lean();

    if (products.length === 0) {
      return res.status(400).json({ error: 'No products found' });
    }

    // Get demand history for products (last 90 days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const productsWithDemand = await Promise.all(
      products.map(async product => {
        const orders = await Order.find({
          'items.productId': product._id,
          createdAt: { $gte: ninetyDaysAgo },
        });

        let dailyDemand = Array(90).fill(0);
        orders.forEach(order => {
          const dayIndex = Math.floor(
            (new Date() - new Date(order.createdAt)) / (1000 * 60 * 60 * 24)
          );
          if (dayIndex < 90) {
            const item = order.items.find(
              i => i.productId.toString() === product._id.toString()
            );
            if (item) {
              dailyDemand[dayIndex] += item.quantity;
            }
          }
        });

        return {
          id: product._id.toString(),
          currentStock: product.currentStock || 0,
          demandHistory: dailyDemand,
          leadTime: 5, // Default 5 days
          unitCost: product.price,
          holdingCost: 25, // 25% per year
        };
      })
    );

    const optimization = await MLService.optimizeInventory(
      productsWithDemand
    );

    res.json({
      success: true,
      data: optimization,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/ml/anomalies/detect
 * Detect anomalies in orders or revenue
 */
router.post('/anomalies/detect', async (req, res) => {
  try {
    const { type = 'revenue', threshold = 2.5 } = req.body;

    // Get data for last 90 days
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    let data = [];

    if (type === 'revenue') {
      // Daily revenue
      const orders = await Order.find({
        createdAt: { $gte: ninetyDaysAgo },
      })
        .select('createdAt totalAmount')
        .sort({ createdAt: 1 });

      const dailyRevenue = new Map();
      orders.forEach(order => {
        const date = order.createdAt.toISOString().split('T')[0];
        const current = dailyRevenue.get(date) || 0;
        dailyRevenue.set(date, current + order.totalAmount);
      });

      data = Array.from(dailyRevenue.entries()).map(([date, revenue]) => ({
        timestamp: date,
        value: revenue,
      }));
    } else if (type === 'orders') {
      // Daily order count
      const orders = await Order.find({
        createdAt: { $gte: ninetyDaysAgo },
      })
        .select('createdAt')
        .sort({ createdAt: 1 });

      const dailyOrders = new Map();
      orders.forEach(order => {
        const date = order.createdAt.toISOString().split('T')[0];
        const current = dailyOrders.get(date) || 0;
        dailyOrders.set(date, current + 1);
      });

      data = Array.from(dailyOrders.entries()).map(([date, count]) => ({
        timestamp: date,
        value: count,
      }));
    }

    if (data.length < 7) {
      return res.status(400).json({
        error: 'Insufficient data for anomaly detection (need at least 7 days)',
      });
    }

    const anomalies = await MLService.detectAnomalies(data, threshold);

    res.json({
      success: true,
      data: anomalies,
      dataPoints: data.length,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/ml/insights/summary
 * Get comprehensive AI insights summary
 */
router.get('/insights/summary', async (req, res) => {
  try {
    // Gather all insights in parallel
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [ordersData, customersData, productsData] = await Promise.all([
      Order.find({ createdAt: { $gte: thirtyDaysAgo } }).select(
        'createdAt totalAmount'
      ),
      Customer.countDocuments(),
      Product.countDocuments(),
    ]);

    // Calculate metrics
    const totalRevenue = ordersData.reduce((sum, o) => sum + o.totalAmount, 0);
    const avgOrderValue =
      ordersData.length > 0 ? totalRevenue / ordersData.length : 0;
    const orderCount = ordersData.length;

    const insights = {
      revenue: {
        last30Days: totalRevenue,
        avgOrderValue: Math.round(avgOrderValue),
        orderCount,
      },
      customers: {
        total: customersData,
        insight: `${customersData} total customers`,
      },
      products: {
        total: productsData,
        insight: `${productsData} products in catalog`,
      },
      recommendations: [
        {
          title: 'Review Churn Risk',
          description: 'Analyze at-risk customers and take retention actions',
          action: '/ml/churn/predict',
        },
        {
          title: 'Optimize Inventory',
          description: 'Reduce holding costs with AI-powered stock levels',
          action: '/ml/inventory/optimize',
        },
        {
          title: 'Forecast Demand',
          description: 'Plan for next 30 days with demand forecasting',
          action: '/ml/forecast/orders',
        },
        {
          title: 'Generate Recommendations',
          description: 'Increase sales with personalized product suggestions',
          action: '/ml/recommendations/products',
        },
      ],
    };

    res.json({
      success: true,
      data: insights,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
