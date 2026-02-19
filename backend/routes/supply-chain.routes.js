/**
 * ALAWAEL ERP - SUPPLY CHAIN & LOGISTICS ROUTES
 * Phase 17 - Supply Chain & Logistics API
 *
 * Endpoints for supplier management, inventory, orders, shipments, warehouses,
 * returns, and supply chain analytics
 */

const express = require('express');
const router = express.Router();
const supplyChainService = require('../services/supply-chain.service');
const { authenticateToken } = require('../middleware/auth');

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * SUPPLIER MANAGEMENT ENDPOINTS
 */

/**
 * POST /api/v1/supply-chain/suppliers
 * Create a new supplier
 */
router.post('/suppliers', async (req, res) => {
  try {
    const { name, country, city, contact, email, phone, paymentTerms, leadTime, rating, category } =
      req.body;

    if (!name || !country || !contact) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: name, country, contact',
      });
    }

    const supplier = await supplyChainService.createSupplier({
      name,
      country,
      city,
      contact,
      email,
      phone,
      paymentTerms,
      leadTime,
      rating,
      category,
    });

    res.status(201).json({
      success: true,
      message: 'Supplier created successfully',
      data: supplier,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/v1/supply-chain/suppliers
 * Get all suppliers with optional filtering
 */
router.get('/suppliers', async (req, res) => {
  try {
    const { category, status, minRating, country } = req.query;

    const suppliers = await supplyChainService.getSuppliers({
      category,
      status,
      minRating: minRating ? parseFloat(minRating) : undefined,
      country,
    });

    res.json({
      success: true,
      data: suppliers,
      count: suppliers.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /api/v1/supply-chain/suppliers/:supplierId/rating
 * Rate a supplier
 */
router.post('/suppliers/:supplierId/rating', async (req, res) => {
  try {
    const { supplierId } = req.params;
    const { rating } = req.body;

    if (rating === undefined || rating < 0 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 0 and 5',
      });
    }

    const supplier = await supplyChainService.rateSupplier(supplierId, rating);

    res.json({
      success: true,
      message: 'Supplier rated successfully',
      data: supplier,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * INVENTORY MANAGEMENT ENDPOINTS
 */

/**
 * POST /api/v1/supply-chain/inventory
 * Create a new inventory item
 */
router.post('/inventory', async (req, res) => {
  try {
    const { sku, productName, category, quantity, minQuantity, maxQuantity, unitCost, supplierId } =
      req.body;

    if (!sku || !productName || quantity === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: sku, productName, quantity',
      });
    }

    const item = await supplyChainService.createInventoryItem({
      sku,
      productName,
      category,
      quantity,
      minQuantity,
      maxQuantity,
      unitCost,
      supplierId,
    });

    res.status(201).json({
      success: true,
      message: 'Inventory item created successfully',
      data: item,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/v1/supply-chain/inventory
 * Get all inventory items with optional filtering
 */
router.get('/inventory', async (req, res) => {
  try {
    const { category, status, supplierId } = req.query;

    const inventory = await supplyChainService.getInventory({
      category,
      status,
      supplierId,
    });

    res.json({
      success: true,
      data: inventory,
      count: inventory.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * PUT /api/v1/supply-chain/inventory/:itemId
 * Update inventory quantity
 */
router.put('/inventory/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;
    const { quantityChange } = req.body;

    if (quantityChange === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Missing required field: quantityChange',
      });
    }

    const item = await supplyChainService.updateInventory(itemId, quantityChange);

    res.json({
      success: true,
      message: 'Inventory updated successfully',
      data: item,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/v1/supply-chain/inventory/low-stock
 * Get all low stock items
 */
router.get('/inventory/low-stock', async (req, res) => {
  try {
    const lowStockItems = await supplyChainService.getLowStockItems();

    res.json({
      success: true,
      data: lowStockItems,
      count: lowStockItems.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * PURCHASE ORDER ENDPOINTS
 */

/**
 * POST /api/v1/supply-chain/orders
 * Create a new purchase order
 */
router.post('/orders', async (req, res) => {
  try {
    const { supplierId, items, totalCost, expectedDelivery, priority } = req.body;

    if (!supplierId || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: supplierId, items',
      });
    }

    const order = await supplyChainService.createPurchaseOrder({
      supplierId,
      items,
      totalCost,
      expectedDelivery,
      priority,
    });

    res.status(201).json({
      success: true,
      message: 'Purchase order created successfully',
      data: order,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * PUT /api/v1/supply-chain/orders/:orderId/status
 * Update purchase order status
 */
router.put('/orders/:orderId/status', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Missing required field: status',
      });
    }

    const order = await supplyChainService.updateOrderStatus(orderId, status);

    res.json({
      success: true,
      message: 'Order status updated successfully',
      data: order,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/v1/supply-chain/orders/supplier/:supplierId
 * Get all orders from a supplier
 */
router.get('/orders/supplier/:supplierId', async (req, res) => {
  try {
    const { supplierId } = req.params;

    const orders = await supplyChainService.getOrdersBySupplier(supplierId);

    res.json({
      success: true,
      data: orders,
      count: orders.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * SHIPMENT & DELIVERY ENDPOINTS
 */

/**
 * POST /api/v1/supply-chain/shipments
 * Create a new shipment
 */
router.post('/shipments', async (req, res) => {
  try {
    const { orderId, items, weight, dimensions, carrier, destination, estimatedDelivery } =
      req.body;

    if (!orderId || !carrier) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: orderId, carrier',
      });
    }

    const shipment = await supplyChainService.createShipment({
      orderId,
      items,
      weight,
      dimensions,
      carrier,
      destination,
      estimatedDelivery,
    });

    res.status(201).json({
      success: true,
      message: 'Shipment created successfully',
      data: shipment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/v1/supply-chain/shipments/:shipmentId/track
 * Track a shipment
 */
router.get('/shipments/:shipmentId/track', async (req, res) => {
  try {
    const { shipmentId } = req.params;

    const tracking = await supplyChainService.trackShipment(shipmentId);

    res.json({
      success: true,
      data: tracking,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * PUT /api/v1/supply-chain/shipments/:shipmentId/status
 * Update shipment status
 */
router.put('/shipments/:shipmentId/status', async (req, res) => {
  try {
    const { shipmentId } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Missing required field: status',
      });
    }

    const shipment = await supplyChainService.updateShipmentStatus(shipmentId, status);

    res.json({
      success: true,
      message: 'Shipment status updated successfully',
      data: shipment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * WAREHOUSE MANAGEMENT ENDPOINTS
 */

/**
 * POST /api/v1/supply-chain/warehouses
 * Create a new warehouse
 */
router.post('/warehouses', async (req, res) => {
  try {
    const { name, location, capacity, manager, shelves } = req.body;

    if (!name || !location) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: name, location',
      });
    }

    const warehouse = await supplyChainService.createWarehouse({
      name,
      location,
      capacity,
      manager,
      shelves,
    });

    res.status(201).json({
      success: true,
      message: 'Warehouse created successfully',
      data: warehouse,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/v1/supply-chain/warehouses
 * Get all warehouses
 */
router.get('/warehouses', async (req, res) => {
  try {
    const warehouses = await supplyChainService.getWarehouses();

    res.json({
      success: true,
      data: warehouses,
      count: warehouses.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/v1/supply-chain/warehouses/:warehouseId/inventory
 * Get inventory in a specific warehouse
 */
router.get('/warehouses/:warehouseId/inventory', async (req, res) => {
  try {
    const { warehouseId } = req.params;

    const inventory = await supplyChainService.getWarehouseInventory(warehouseId);

    res.json({
      success: true,
      data: inventory,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * RETURN & WARRANTY ENDPOINTS
 */

/**
 * POST /api/v1/supply-chain/returns
 * Create a return request
 */
router.post('/returns', async (req, res) => {
  try {
    const { orderId, items, reason, status } = req.body;

    if (!orderId || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: orderId, items',
      });
    }

    const returnRequest = await supplyChainService.createReturnRequest({
      orderId,
      items,
      reason,
      status,
    });

    res.status(201).json({
      success: true,
      message: 'Return request created successfully',
      data: returnRequest,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * PUT /api/v1/supply-chain/returns/:returnId/approve
 * Approve a return request
 */
router.put('/returns/:returnId/approve', async (req, res) => {
  try {
    const { returnId } = req.params;

    const returnRequest = await supplyChainService.approveReturn(returnId);

    res.json({
      success: true,
      message: 'Return request approved successfully',
      data: returnRequest,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * PUT /api/v1/supply-chain/returns/:returnId/refund
 * Process refund for return
 */
router.put('/returns/:returnId/refund', async (req, res) => {
  try {
    const { returnId } = req.params;
    const { refundAmount } = req.body;

    if (refundAmount === undefined || refundAmount < 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid refund amount',
      });
    }

    const returnRequest = await supplyChainService.processRefund(returnId, refundAmount);

    res.json({
      success: true,
      message: 'Refund processed successfully',
      data: returnRequest,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * SUPPLY CHAIN ANALYTICS ENDPOINTS
 */

/**
 * GET /api/v1/supply-chain/analytics
 * Get comprehensive supply chain analytics
 */
router.get('/analytics', async (req, res) => {
  try {
    const analytics = await supplyChainService.getSupplyChainAnalytics();

    res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/v1/supply-chain/suppliers/:supplierId/performance
 * Get supplier performance metrics
 */
router.get('/suppliers/:supplierId/performance', async (req, res) => {
  try {
    const { supplierId } = req.params;

    const performance = await supplyChainService.getSupplierPerformance(supplierId);

    res.json({
      success: true,
      data: performance,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/v1/supply-chain/optimization
 * Get logistics optimization recommendations
 */
router.get('/optimization', async (req, res) => {
  try {
    const optimization = await supplyChainService.getLogisticsOptimization();

    res.json({
      success: true,
      data: optimization,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * HEALTH CHECK
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Supply Chain & Logistics',
    timestamp: new Date(),
  });
});

module.exports = router;
