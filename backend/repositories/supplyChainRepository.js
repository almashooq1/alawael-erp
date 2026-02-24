/**
 * Supply Chain Repository - Database Layer Abstraction
 * Handles all database operations for Supply Chain module
 */

const { Supplier, Product, PurchaseOrder, Shipment } = require('../models');
const logger = require('../utils/logger');

class SupplyChainRepository {
  // ==================== SUPPLIER OPERATIONS ====================

  /**
   * Create a new supplier
   */
  async createSupplier(supplierData) {
    try {
      const supplier = new Supplier(supplierData);
      await supplier.save();
      logger.info(`✅ Supplier created: ${supplier.name} (${supplier._id})`);
      return supplier;
    } catch (error) {
      logger.error(`❌ Failed to create supplier: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get supplier by ID
   */
  async getSupplier(supplierId) {
    try {
      const supplier = await Supplier.findById(supplierId);
      return supplier;
    } catch (error) {
      logger.error(`❌ Failed to get supplier: ${error.message}`);
      throw error;
    }
  }

  /**
   * List suppliers with filters
   */
  async listSuppliers(filters = {}) {
    try {
      const query = {};
      
      if (filters.category) query.category = filters.category;
      if (filters.status) query.status = filters.status;
      if (filters.minRating) query.rating = { $gte: filters.minRating };

      const limit = filters.limit ? parseInt(filters.limit) : 50;
      const offset = filters.offset ? parseInt(filters.offset) : 0;

      const suppliers = await Supplier.find(query)
        .limit(limit)
        .skip(offset)
        .sort({ createdAt: -1 });

      const total = await Supplier.countDocuments(query);

      return { suppliers, total };
    } catch (error) {
      logger.error(`❌ Failed to list suppliers: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update supplier
   */
  async updateSupplier(supplierId, updateData) {
    try {
      const supplier = await Supplier.findByIdAndUpdate(
        supplierId,
        updateData,
        { new: true, runValidators: true }
      );
      logger.info(`✅ Supplier updated: ${supplierId}`);
      return supplier;
    } catch (error) {
      logger.error(`❌ Failed to update supplier: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete supplier
   */
  async deleteSupplier(supplierId) {
    try {
      const supplier = await Supplier.findByIdAndDelete(supplierId);
      logger.info(`✅ Supplier deleted: ${supplierId}`);
      return supplier;
    } catch (error) {
      logger.error(`❌ Failed to delete supplier: ${error.message}`);
      throw error;
    }
  }

  // ==================== PRODUCT (INVENTORY) OPERATIONS ====================

  /**
   * Add product to inventory
   */
  async addProduct(productData) {
    try {
      const product = new Product(productData);
      await product.save();
      logger.info(`✅ Product added: ${product.sku} (${product._id})`);
      return product;
    } catch (error) {
      logger.error(`❌ Failed to add product: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get product by ID
   */
  async getProduct(productId) {
    try {
      const product = await Product.findById(productId).populate('supplierId');
      return product;
    } catch (error) {
      logger.error(`❌ Failed to get product: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get product by SKU
   */
  async getProductBySku(sku) {
    try {
      const product = await Product.findOne({ sku: sku.toUpperCase() });
      return product;
    } catch (error) {
      logger.error(`❌ Failed to get product by SKU: ${error.message}`);
      throw error;
    }
  }

  /**
   * List products with filters
   */
  async listProducts(filters = {}) {
    try {
      const query = {};
      
      if (filters.category) query.category = filters.category;
      if (filters.supplierId) query.supplierId = filters.supplierId;
      if (filters.lowStock) query.quantity = { $lt: '$minLevel' };

      const limit = filters.limit ? parseInt(filters.limit) : 100;
      const offset = filters.offset ? parseInt(filters.offset) : 0;

      const products = await Product.find(query)
        .populate('supplierId')
        .limit(limit)
        .skip(offset)
        .sort({ createdAt: -1 });

      const total = await Product.countDocuments(query);

      return { products, total };
    } catch (error) {
      logger.error(`❌ Failed to list products: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update product quantity
   */
  async updateProductQuantity(productId, quantityChange, reason = '') {
    try {
      const product = await Product.findById(productId);
      if (!product) throw new Error('Product not found');

      const oldQuantity = product.quantity;
      product.quantity += quantityChange;

      if (product.quantity < 0) {
        throw new Error('Cannot reduce quantity below 0');
      }

      if (quantityChange > 0) {
        product.lastRestockDate = new Date();
      }

      await product.save();

      logger.info(`✅ Product quantity updated: ${productId} (${oldQuantity} → ${product.quantity})`);
      return { product, oldQuantity, newQuantity: product.quantity };
    } catch (error) {
      logger.error(`❌ Failed to update product quantity: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get inventory status
   */
  async getInventoryStatus() {
    try {
      const products = await Product.find();
      
      const lowStockProducts = products.filter(p => p.quantity < p.minLevel);
      const outOfStockProducts = products.filter(p => p.quantity === 0);
      
      const totalValue = products.reduce((sum, p) => sum + (p.quantity * p.price), 0);
      const healthScore = products.length > 0 
        ? Math.round(((products.length - lowStockProducts.length) / products.length) * 100)
        : 100;

      return {
        totalProducts: products.length,
        totalValue,
        lowStock: {
          count: lowStockProducts.length,
          products: lowStockProducts
        },
        outOfStock: {
          count: outOfStockProducts.length,
          products: outOfStockProducts
        },
        healthScore
      };
    } catch (error) {
      logger.error(`❌ Failed to get inventory status: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete product
   */
  async deleteProduct(productId) {
    try {
      const product = await Product.findByIdAndDelete(productId);
      logger.info(`✅ Product deleted: ${productId}`);
      return product;
    } catch (error) {
      logger.error(`❌ Failed to delete product: ${error.message}`);
      throw error;
    }
  }

  // ==================== PURCHASE ORDER OPERATIONS ====================

  /**
   * Create purchase order
   */
  async createPurchaseOrder(orderData) {
    try {
      // Generate PO number
      const count = await PurchaseOrder.countDocuments();
      const poNumber = `PO-${Date.now()}-${count + 1}`;

      const order = new PurchaseOrder({
        ...orderData,
        poNumber,
        statusHistory: [{
          status: 'draft',
          timestamp: new Date(),
          note: 'Order created'
        }]
      });

      await order.save();
      await order.populate('supplierId items.productId');

      logger.info(`✅ Purchase order created: ${poNumber} (${order._id})`);
      return order;
    } catch (error) {
      logger.error(`❌ Failed to create purchase order: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get purchase order
   */
  async getPurchaseOrder(orderId) {
    try {
      const order = await PurchaseOrder.findById(orderId)
        .populate('supplierId')
        .populate('items.productId');
      return order;
    } catch (error) {
      logger.error(`❌ Failed to get purchase order: ${error.message}`);
      throw error;
    }
  }

  /**
   * List purchase orders
   */
  async listPurchaseOrders(filters = {}) {
    try {
      const query = {};
      
      if (filters.status) query.status = filters.status;
      if (filters.supplierId) query.supplierId = filters.supplierId;
      if (filters.priority) query.priority = filters.priority;

      const limit = filters.limit ? parseInt(filters.limit) : 50;
      const offset = filters.offset ? parseInt(filters.offset) : 0;

      const orders = await PurchaseOrder.find(query)
        .populate('supplierId')
        .limit(limit)
        .skip(offset)
        .sort({ createdAt: -1 });

      const total = await PurchaseOrder.countDocuments(query);

      return { orders, total };
    } catch (error) {
      logger.error(`❌ Failed to list purchase orders: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update order status
   */
  async updateOrderStatus(orderId, newStatus, note = '') {
    try {
      const order = await PurchaseOrder.findById(orderId);
      if (!order) throw new Error('Order not found');

      const oldStatus = order.status;
      order.status = newStatus;
      
      order.statusHistory.push({
        status: newStatus,
        timestamp: new Date(),
        note: note || `Status changed from ${oldStatus} to ${newStatus}`
      });

      if (newStatus === 'delivered') {
        order.deliveryDate = new Date();
      }

      await order.save();
      logger.info(`✅ Order status updated: ${orderId} (${oldStatus} → ${newStatus})`);
      return order;
    } catch (error) {
      logger.error(`❌ Failed to update order status: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete purchase order
   */
  async deletePurchaseOrder(orderId) {
    try {
      const order = await PurchaseOrder.findByIdAndDelete(orderId);
      logger.info(`✅ Purchase order deleted: ${orderId}`);
      return order;
    } catch (error) {
      logger.error(`❌ Failed to delete purchase order: ${error.message}`);
      throw error;
    }
  }

  // ==================== SHIPMENT OPERATIONS ====================

  /**
   * Create shipment
   */
  async createShipment(shipmentData) {
    try {
      const shipment = new Shipment({
        ...shipmentData,
        statusHistory: [{
          status: 'pending',
          location: 'Warehouse',
          timestamp: new Date(),
          note: 'Shipment created'
        }]
      });

      await shipment.save();
      await shipment.populate('orderId');

      logger.info(`✅ Shipment created: ${shipment.trackingNumber} (${shipment._id})`);
      return shipment;
    } catch (error) {
      logger.error(`❌ Failed to create shipment: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get shipment by ID
   */
  async getShipment(shipmentId) {
    try {
      const shipment = await Shipment.findById(shipmentId).populate('orderId');
      return shipment;
    } catch (error) {
      logger.error(`❌ Failed to get shipment: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get shipment by tracking number
   */
  async getShipmentByTracking(trackingNumber) {
    try {
      const shipment = await Shipment.findOne({ trackingNumber: trackingNumber.toUpperCase() });
      return shipment;
    } catch (error) {
      logger.error(`❌ Failed to get shipment by tracking: ${error.message}`);
      throw error;
    }
  }

  /**
   * List shipments
   */
  async listShipments(filters = {}) {
    try {
      const query = {};
      
      if (filters.status) query.status = filters.status;
      if (filters.carrier) query.carrier = filters.carrier;

      const limit = filters.limit ? parseInt(filters.limit) : 50;
      const offset = filters.offset ? parseInt(filters.offset) : 0;

      const shipments = await Shipment.find(query)
        .populate('orderId')
        .limit(limit)
        .skip(offset)
        .sort({ createdAt: -1 });

      const total = await Shipment.countDocuments(query);

      return { shipments, total };
    } catch (error) {
      logger.error(`❌ Failed to list shipments: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update shipment status
   */
  async updateShipmentStatus(shipmentId, newStatus, location = '', coordinates = null) {
    try {
      const shipment = await Shipment.findById(shipmentId);
      if (!shipment) throw new Error('Shipment not found');

      const oldStatus = shipment.status;
      shipment.status = newStatus;
      shipment.location = location || shipment.location;

      shipment.statusHistory.push({
        status: newStatus,
        location: location || shipment.location,
        timestamp: new Date(),
        coordinates,
        note: `Status updated to ${newStatus}`
      });

      if (newStatus === 'delivered') {
        shipment.actualDelivery = new Date();
      }

      await shipment.save();
      logger.info(`✅ Shipment status updated: ${shipmentId} (${oldStatus} → ${newStatus})`);
      return shipment;
    } catch (error) {
      logger.error(`❌ Failed to update shipment status: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete shipment
   */
  async deleteShipment(shipmentId) {
    try {
      const shipment = await Shipment.findByIdAndDelete(shipmentId);
      logger.info(`✅ Shipment deleted: ${shipmentId}`);
      return shipment;
    } catch (error) {
      logger.error(`❌ Failed to delete shipment: ${error.message}`);
      throw error;
    }
  }

  // ==================== ANALYTICS OPERATIONS ====================

  /**
   * Get supply chain analytics
   */
  async getAnalytics() {
    try {
      const [suppliers, products, orders, shipments] = await Promise.all([
        Supplier.find(),
        Product.find(),
        PurchaseOrder.find(),
        Shipment.find()
      ]);

      const deliveredOrders = orders.filter(o => o.status === 'delivered');
      const pendingOrders = orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled');
      const deliveredShipments = shipments.filter(s => s.status === 'delivered');

      return {
        summary: {
          totalSuppliers: suppliers.length,
          activeSuppliers: suppliers.filter(s => s.status === 'active').length,
          totalProducts: products.length,
          totalOrders: orders.length,
          completedOrders: deliveredOrders.length,
          pendingOrders: pendingOrders.length,
          totalShipments: shipments.length,
          deliveredShipments: deliveredShipments.length
        },
        suppliers: {
          topSuppliers: suppliers
            .sort((a, b) => b.totalSpent - a.totalSpent)
            .slice(0, 5),
          byCategory: suppliers.reduce((acc, s) => {
            acc[s.category] = (acc[s.category] || 0) + 1;
            return acc;
          }, {})
        },
        inventory: {
          totalValue: products.reduce((sum, p) => sum + (p.quantity * p.price), 0),
          lowStockCount: products.filter(p => p.quantity < p.minLevel).length,
          outOfStockCount: products.filter(p => p.quantity === 0).length,
          healthScore: products.length > 0
            ? Math.round(((products.length - products.filter(p => p.quantity < p.minLevel).length) / products.length) * 100)
            : 100
        },
        orders: {
          byStatus: orders.reduce((acc, o) => {
            acc[o.status] = (acc[o.status] || 0) + 1;
            return acc;
          }, {}),
          totalValue: orders.reduce((sum, o) => sum + o.totalAmount, 0),
          avgOrderValue: orders.length > 0 ? orders.reduce((sum, o) => sum + o.totalAmount, 0) / orders.length : 0
        },
        shipments: {
          byStatus: shipments.reduce((acc, s) => {
            acc[s.status] = (acc[s.status] || 0) + 1;
            return acc;
          }, {}),
          byCarrier: shipments.reduce((acc, s) => {
            acc[s.carrier] = (acc[s.carrier] || 0) + 1;
            return acc;
          }, {})
        }
      };
    } catch (error) {
      logger.error(`❌ Failed to get analytics: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new SupplyChainRepository();
