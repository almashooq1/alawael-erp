/**
 * Supply Chain Management Routes
 * مسارات إدارة سلسلة التوريد
 */

const express = require('express');
const router = express.Router();
const supplyChainService = require('../services/supplyChain.service');
const logger = require('../utils/logger');

// Helper function for error handling
const handleError = (error, res, defaultStatus = 500) => {
  const status = error.statusCode || defaultStatus;
  const message = error.message || 'Internal server error';
  
  res.status(status).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
};

// ============================================
// SUPPLIER ENDPOINTS
// ============================================

/**
 * POST /api/supply-chain/suppliers
 * Create new supplier
 */
router.post('/suppliers', async (req, res) => {
  try {
    // Validate required fields
    const { name, email, phone, address } = req.body;
    if (!name || !email || !phone || !address) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, email, phone, address'
      });
    }

    const supplier = await supplyChainService.createSupplier(req.body);
    res.status(201).json({
      success: true,
      message: 'Supplier created successfully',
      data: supplier
    });
  } catch (error) {
    logger.error('Failed to create supplier:', error);
    handleError(error, res, 400);
  }
});

/**
 * GET /api/supply-chain/suppliers
 * List all suppliers with filters
 */
router.get('/suppliers', async (req, res) => {
  try {
    // In mock mode, return sample data instead of querying database
    if (process.env.USE_MOCK_DB === 'true') {
      const mockSuppliers = [
        { _id: '1', name: 'Supplier 1', email: 'supplier1@test.com', status: 'active', rating: 4.5 },
        { _id: '2', name: 'Supplier 2', email: 'supplier2@test.com', status: 'active', rating: 4.0 }
      ];
      return res.json({
        success: true,
        data: { suppliers: mockSuppliers, total: mockSuppliers.length }
      });
    }

    const filters = {
      category: req.query.category,
      status: req.query.status || 'active',
      minRating: parseFloat(req.query.minRating) || 0,
      limit: parseInt(req.query.limit) || 100,
      offset: parseInt(req.query.offset) || 0
    };

    const result = await supplyChainService.listSuppliers(filters);
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Failed to list suppliers:', error);
    handleError(error, res);
  }
});

/**
 * GET /api/supply-chain/suppliers/:id
 * Get supplier details
 */
router.get('/suppliers/:id', async (req, res) => {
  try {
    // Validate ID format
    if (!req.params.id || req.params.id.length < 3) {
      return res.status(400).json({
        success: false,
        error: 'Invalid supplier ID format'
      });
    }

    const supplier = await supplyChainService.getSupplier(req.params.id);
    res.json({
      success: true,
      data: supplier
    });
  } catch (error) {
    logger.error('Failed to get supplier:', error);
    if (error.message && error.message.includes('not found')) {
      return res.status(404).json({ success: false, error: 'Supplier not found' });
    }
    handleError(error, res, error.statusCode === 404 ? 404 : 400);
  }
});

/**
 * PUT /api/supply-chain/suppliers/:id
 * Update supplier
 */
router.put('/suppliers/:id', async (req, res) => {
  try {
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Request body cannot be empty'
      });
    }

    const supplier = await supplyChainService.updateSupplier(req.params.id, req.body);
    res.json({
      success: true,
      message: 'Supplier updated successfully',
      data: supplier
    });
  } catch (error) {
    logger.error('Failed to update supplier:', error);
    handleError(error, res, error.statusCode === 404 ? 404 : 500);
  }
});

/**
 * DELETE /api/supply-chain/suppliers/:id
 * Delete supplier
 */
router.delete('/suppliers/:id', async (req, res) => {
  try {
    // Validate ID format
    if (!req.params.id || req.params.id.length < 3) {
      return res.status(400).json({
        success: false,
        error: 'Invalid supplier ID format'
      });
    }

    const supplier = await supplyChainService.deleteSupplier(req.params.id);
    res.json({
      success: true,
      message: 'Supplier deleted successfully',
      data: supplier
    });
  } catch (error) {
    logger.error('Failed to delete supplier:', error);
    if (error.message && error.message.includes('not found')) {
      return res.status(404).json({ success: false, error: 'Supplier not found' });
    }
    handleError(error, res, error.statusCode === 404 ? 404 : 400);
  }
});

// ============================================
// INVENTORY ENDPOINTS
// ============================================

/**
 * POST /api/supply-chain/inventory
 * Add product to inventory
 */
router.post('/inventory', async (req, res) => {
  try {
    // Validate required fields
    const { sku, name, category, price, supplierId } = req.body;
    if (!sku || !name || !category || !price || !supplierId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: sku, name, category, price, supplierId'
      });
    }

    const product = await supplyChainService.addToInventory(req.body);
    res.status(201).json({
      success: true,
      message: 'Product added to inventory',
      data: product
    });
  } catch (error) {
    logger.error('Failed to add to inventory:', error);
    handleError(error, res, 400);
  }
});

/**
 * PATCH /api/supply-chain/inventory/:id
 * Update inventory quantity
 */
router.patch('/inventory/:id', async (req, res) => {
  try {
    const { quantityChange, reason } = req.body;
    
    if (quantityChange === undefined || quantityChange === null) {
      return res.status(400).json({
        success: false,
        error: 'quantityChange is required'
      });
    }

    if (typeof quantityChange !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'quantityChange must be a number'
      });
    }

    const result = await supplyChainService.updateInventory(
      req.params.id,
      quantityChange,
      reason
    );

    res.json({
      success: true,
      message: 'Inventory updated',
      data: result
    });
  } catch (error) {
    logger.error('Failed to update inventory:', error);
    handleError(error, res, error.statusCode === 404 ? 404 : 400);
  }
});

/**
 * GET /api/supply-chain/inventory
 * List all inventory items
 */
router.get('/inventory', async (req, res) => {
  try {
    // In mock mode, return sample data instead of querying database
    if (process.env.USE_MOCK_DB === 'true') {
      const mockInventory = [
        { _id: '1', sku: 'SKU001', name: 'Product 1', category: 'Electronics', quantity: 100, price: 50 },
        { _id: '2', sku: 'SKU002', name: 'Product 2', category: 'Accessories', quantity: 50, price: 25 }
      ];
      return res.json({
        success: true,
        data: mockInventory
      });
    }

    const items = await supplyChainService.listInventory({
      limit: parseInt(req.query.limit) || 100,
      offset: parseInt(req.query.offset) || 0
    });
    res.json({
      success: true,
      data: items || []
    });
  } catch (error) {
    logger.error('Failed to list inventory:', error);
    handleError(error, res);
  }
});

/**
 * GET /api/supply-chain/inventory/status
 * Get inventory status report
 */
router.get('/inventory/status', async (req, res) => {
  try {
    // In mock mode, return sample status
    if (process.env.USE_MOCK_DB === 'true') {
      return res.json({
        success: true,
        data: {
          totalItems: 150,
          lowStockItems: 5,
          outOfStockItems: 0,
          totalValue: 10500
        }
      });
    }

    const status = await supplyChainService.getInventoryStatus();
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    logger.error('Failed to get inventory status:', error);
    handleError(error, res);
  }
});

// ============================================
// PURCHASE ORDER ENDPOINTS
// ============================================

/**
 * POST /api/supply-chain/orders
 * Create purchase order
 */
router.post('/orders', async (req, res) => {
  try {
    // Validate required fields
    const { supplierId, items, totalAmount } = req.body;
    if (!supplierId || !items || !Array.isArray(items) || items.length === 0 || totalAmount === undefined || totalAmount === null) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: supplierId, items (non-empty array), totalAmount'
      });
    }

    // Validate totalAmount is positive
    if (totalAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Total amount must be greater than 0'
      });
    }

    // In mock mode, return sample order
    if (process.env.USE_MOCK_DB === 'true') {
      return res.status(201).json({
        success: true,
        message: 'Purchase order created',
        data: {
          _id: 'mock-order-' + Date.now(),
          orderNumber: `PO-${Date.now()}`,
          supplierId,
          items,
          totalAmount,
          status: 'pending',
          createdAt: new Date()
        }
      });
    }

    const order = await supplyChainService.createPurchaseOrder(req.body);
    res.status(201).json({
      success: true,
      message: 'Purchase order created',
      data: order
    });
  } catch (error) {
    logger.error('Failed to create purchase order:', error);
    handleError(error, res, 400);
  }
});

/**
 * GET /api/supply-chain/orders
 * List purchase orders
 */
router.get('/orders', async (req, res) => {
  try {
    // In mock mode, return sample data
    if (process.env.USE_MOCK_DB === 'true') {
      const mockOrders = [
        { _id: '1', orderNumber: 'PO001', status: 'pending', total: 5000, dueDate: new Date() },
        { _id: '2', orderNumber: 'PO002', status: 'approved', total: 3500, dueDate: new Date() }
      ];
      return res.json({
        success: true,
        data: { orders: mockOrders, total: mockOrders.length }
      });
    }

    const filters = {
      status: req.query.status,
      supplierId: req.query.supplierId,
      priority: req.query.priority,
      limit: parseInt(req.query.limit) || 100,
      offset: parseInt(req.query.offset) || 0
    };

    const result = await supplyChainService.listPurchaseOrders(filters);
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Failed to list purchase orders:', error);
    handleError(error, res);
  }
});

/**
 * GET /api/supply-chain/orders/:id
 * Get purchase order details
 */
router.get('/orders/:id', async (req, res) => {
  try {
    // Validate ID format
    if (!req.params.id || req.params.id.length < 3) {
      return res.status(400).json({
        success: false,
        error: 'Invalid order ID format'
      });
    }

    const order = await supplyChainService.getPurchaseOrder(req.params.id);
    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    logger.error('Failed to get purchase order:', error);
    if (error.message && error.message.includes('not found')) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    handleError(error, res, 400);
  }
});

/**
 * PATCH /api/supply-chain/orders/:id/status
 * Update order status
 */
router.patch('/orders/:id/status', async (req, res) => {
  try {
    const { status, note } = req.body;
    
    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'status is required'
      });
    }

    const validStatuses = ['draft', 'confirmed', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const order = await supplyChainService.updateOrderStatus(req.params.id, status, note);
    res.json({
      success: true,
      message: 'Order status updated',
      data: order
    });
  } catch (error) {
    logger.error('Failed to update order status:', error);
    handleError(error, res, error.statusCode === 404 ? 404 : 400);
  }
});

/**
 * DELETE /api/supply-chain/orders/:id
 * Delete purchase order
 */
router.delete('/orders/:id', async (req, res) => {
  try {
    // Validate ID format
    if (!req.params.id || req.params.id.length < 3) {
      return res.status(400).json({
        success: false,
        error: 'Invalid order ID format'
      });
    }

    const order = await supplyChainService.deletePurchaseOrder(req.params.id);
    res.json({
      success: true,
      message: 'Purchase order deleted',
      data: order
    });
  } catch (error) {
    logger.error('Failed to delete purchase order:', error);
    if (error.message && error.message.includes('not found')) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    handleError(error, res, error.statusCode === 404 ? 404 : 400);
  }
});

// ============================================
// SHIPMENT ENDPOINTS
// ============================================

/**
 * GET /api/supply-chain/shipments
 * List all shipments
 */
router.get('/shipments', async (req, res) => {
  try {
    // In mock mode, return sample data
    if (process.env.USE_MOCK_DB === 'true') {
      const mockShipments = [
        { _id: '1', trackingNumber: 'TRACK001', status: 'in_transit', origin: 'Warehouse A', destination: 'Client B' },
        { _id: '2', trackingNumber: 'TRACK002', status: 'delivered', origin: 'Warehouse A', destination: 'Client C' }
      ];
      return res.json({
        success: true,
        data: mockShipments
      });
    }

    const shipments = await supplyChainService.listShipments({
      status: req.query.status,
      limit: parseInt(req.query.limit) || 100,
      offset: parseInt(req.query.offset) || 0
    });
    res.json({
      success: true,
      data: shipments || []
    });
  } catch (error) {
    logger.error('Failed to list shipments:', error);
    handleError(error, res);
  }
});

/**
 * POST /api/supply-chain/shipments
 * Create shipment
 */
router.post('/shipments', async (req, res) => {
  try {
    // Validate required fields
    const { orderId, carrier, estimatedDelivery } = req.body;
    if (!orderId || !carrier || !estimatedDelivery) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: orderId, carrier, estimatedDelivery'
      });
    }

    const shipment = await supplyChainService.createShipment(req.body);
    res.status(201).json({
      success: true,
      message: 'Shipment created',
      data: shipment
    });
  } catch (error) {
    logger.error('Failed to create shipment:', error);
    handleError(error, res, 400);
  }
});

/**
 * PATCH /api/supply-chain/shipments/:id/status
 * Update shipment status
 */
router.patch('/shipments/:id/status', async (req, res) => {
  try {
    const { status, location, coordinates } = req.body;
    
    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'status is required'
      });
    }

    const validStatuses = ['pending', 'in-transit', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const shipment = await supplyChainService.updateShipmentStatus(
      req.params.id,
      status,
      location,
      coordinates
    );

    res.json({
      success: true,
      message: 'Shipment status updated',
      data: shipment
    });
  } catch (error) {
    logger.error('Failed to update shipment status:', error);
    handleError(error, res, error.statusCode === 404 ? 404 : 400);
  }
});

/**
 * GET /api/supply-chain/shipments/track/:trackingNumber
 * Track shipment by tracking number
 */
router.get('/shipments/track/:trackingNumber', async (req, res) => {
  try {
    const shipment = await supplyChainService.trackShipment(req.params.trackingNumber);
    if (!shipment) {
      return res.status(404).json({
        success: false,
        error: 'Shipment not found'
      });
    }

    res.json({
      success: true,
      data: shipment
    });
  } catch (error) {
    logger.error('Failed to track shipment:', error);
    handleError(error, res);
  }
});

/**
 * DELETE /api/supply-chain/shipments/:id
 * Delete shipment
 */
router.delete('/shipments/:id', async (req, res) => {
  try {
    const shipment = await supplyChainService.deleteShipment(req.params.id);
    res.json({
      success: true,
      message: 'Shipment deleted',
      data: shipment
    });
  } catch (error) {
    logger.error('Failed to delete shipment:', error);
    handleError(error, res, error.statusCode === 404 ? 404 : 500);
  }
});

// ============================================
// ANALYTICS ENDPOINTS
// ============================================

/**
 * GET /api/supply-chain/analytics
 * Get supply chain analytics
 */
router.get('/analytics', async (req, res) => {
  try {
    // In mock mode, return sample analytics
    if (process.env.USE_MOCK_DB === 'true') {
      return res.json({
        success: true,
        data: {
          totalOrders: 45,
          pendingOrders: 12,
          totalInventoryValue: 125000,
          shipmentsMade: 38,
          shippingCosts: 4500,
          supplierCount: 15
        }
      });
    }

    const analytics = await supplyChainService.getSupplyChainAnalytics();
    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    logger.error('Failed to get analytics:', error);
    handleError(error, res);
  }
});

/**
 * GET /api/supply-chain/status
 * Health check
 */
router.get('/status', (req, res) => {
  res.json({
    success: true,
    status: 'operational',
    message: 'Supply Chain Management system is operational',
    features: {
      suppliers: true,
      inventory: true,
      orders: true,
      shipments: true,
      analytics: true
    }
  });
});

module.exports = router;
