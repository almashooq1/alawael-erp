/**
 * Supply Chain Management Service
 * نظام إدارة سلسلة التوريد
 * 
 * Features:
 * - Supplier management
 * - Inventory tracking
 * - Purchase orders
 * - Shipments
 * - Analytics
 */

const logger = require('../utils/logger');
const SupplyChainRepository = require('../repositories/supplyChainRepository');

class SupplyChainService {
  constructor() {
    this.repository = SupplyChainRepository;
    logger.info('SupplyChainService initialized with MongoDB repository');
  }

  // ============================================
  // SUPPLIER MANAGEMENT
  // ============================================

  async createSupplier(supplierData) {
    try {
      const supplier = await this.repository.createSupplier(supplierData);
      return supplier;
    } catch (error) {
      logger.error('Failed to create supplier:', error);
      throw error;
    }
  }

  async getSupplier(supplierId) {
    try {
      const supplier = await this.repository.getSupplier(supplierId);
      if (!supplier) {
        const err = new Error('Supplier not found');
        err.statusCode = 404;
        throw err;
      }
      return supplier;
    } catch (error) {
      logger.error('Failed to get supplier:', error);
      throw error;
    }
  }

  async listSuppliers(filters = {}) {
    try {
      const result = await this.repository.listSuppliers(filters);
      return {
        total: result.total,
        suppliers: result.suppliers
      };
    } catch (error) {
      logger.error('Failed to list suppliers:', error);
      throw error;
    }
  }

  async updateSupplier(supplierId, updateData) {
    try {
      const supplier = await this.repository.updateSupplier(supplierId, updateData);
      if (!supplier) {
        const err = new Error('Supplier not found');
        err.statusCode = 404;
        throw err;
      }
      return supplier;
    } catch (error) {
      logger.error('Failed to update supplier:', error);
      throw error;
    }
  }

  async deleteSupplier(supplierId) {
    try {
      const supplier = await this.repository.deleteSupplier(supplierId);
      if (!supplier) {
        const err = new Error('Supplier not found');
        err.statusCode = 404;
        throw err;
      }
      return supplier;
    } catch (error) {
      logger.error('Failed to delete supplier:', error);
      throw error;
    }
  }

  // ============================================
  // INVENTORY MANAGEMENT
  // ============================================

  async addToInventory(productData) {
    try {
      const product = await this.repository.addProduct(productData);
      return product;
    } catch (error) {
      logger.error('Failed to add to inventory:', error);
      throw error;
    }
  }

  async updateInventory(productId, quantityChange, reason = 'manual') {
    try {
      const result = await this.repository.updateProductQuantity(productId, quantityChange, reason);
      return {
        product: result.product,
        oldQuantity: result.oldQuantity,
        newQuantity: result.newQuantity,
        change: quantityChange,
        reason
      };
    } catch (error) {
      logger.error('Failed to update inventory:', error);
      throw error;
    }
  }

  async listInventory(filters = {}) {
    try {
      const result = await this.repository.listProducts(filters);
      return Array.isArray(result) ? result : result.products || [];
    } catch (error) {
      logger.error('Failed to list inventory:', error);
      throw error;
    }
  }

  async getInventoryStatus() {
    try {
      const status = await this.repository.getInventoryStatus();
      return status;
    } catch (error) {
      logger.error('Failed to get inventory status:', error);
      throw error;
    }
  }

  // ============================================
  // PURCHASE ORDERS
  // ============================================

  async createPurchaseOrder(orderData) {
    try {
      const order = await this.repository.createPurchaseOrder(orderData);
      return order;
    } catch (error) {
      logger.error('Failed to create purchase order:', error);
      throw error;
    }
  }

  async updateOrderStatus(orderId, status, note = '') {
    try {
      const order = await this.repository.updateOrderStatus(orderId, status, note);
      if (!order) {
        const err = new Error('Order not found');
        err.statusCode = 404;
        throw err;
      }
      return order;
    } catch (error) {
      logger.error('Failed to update order status:', error);
      throw error;
    }
  }

  async getPurchaseOrder(orderId) {
    try {
      const order = await this.repository.getPurchaseOrder(orderId);
      if (!order) {
        const err = new Error('Order not found');
        err.statusCode = 404;
        throw err;
      }
      return order;
    } catch (error) {
      logger.error('Failed to get purchase order:', error);
      throw error;
    }
  }

  async listPurchaseOrders(filters = {}) {
    try {
      const result = await this.repository.listPurchaseOrders(filters);
      return {
        total: result.total,
        orders: result.orders
      };
    } catch (error) {
      logger.error('Failed to list purchase orders:', error);
      throw error;
    }
  }

  // ============================================
  // SHIPMENT TRACKING
  // ============================================

  async createShipment(shipmentData) {
    try {
      const shipment = await this.repository.createShipment(shipmentData);
      return shipment;
    } catch (error) {
      logger.error('Failed to create shipment:', error);
      throw error;
    }
  }

  async updateShipmentStatus(shipmentId, status, location = '', coordinates = null) {
    try {
      const shipment = await this.repository.updateShipmentStatus(shipmentId, status, location, coordinates);
      if (!shipment) {
        const err = new Error('Shipment not found');
        err.statusCode = 404;
        throw err;
      }
      return shipment;
    } catch (error) {
      logger.error('Failed to update shipment status:', error);
      throw error;
    }
  }

  async trackShipment(trackingNumber) {
    try {
      const shipment = await this.repository.getShipmentByTracking(trackingNumber);
      return shipment;
    } catch (error) {
      logger.error('Failed to track shipment:', error);
      throw error;
    }
  }

  async listShipments(filters = {}) {
    try {
      const result = await this.repository.listShipments(filters);
      return Array.isArray(result) ? result : result.shipments || [];
    } catch (error) {
      logger.error('Failed to list shipments:', error);
      throw error;
    }
  }

  async deleteShipment(shipmentId) {
    try {
      const shipment = await this.repository.deleteShipment(shipmentId);
      if (!shipment) {
        const err = new Error('Shipment not found');
        err.statusCode = 404;
        throw err;
      }
      return shipment;
    } catch (error) {
      logger.error('Failed to delete shipment:', error);
      throw error;
    }
  }

  // ============================================
  // PURCHASE ORDER DELETION
  // ============================================

  async deletePurchaseOrder(orderId) {
    try {
      const order = await this.repository.deletePurchaseOrder(orderId);
      if (!order) {
        const err = new Error('Order not found');
        err.statusCode = 404;
        throw err;
      }
      return order;
    } catch (error) {
      logger.error('Failed to delete purchase order:', error);
      throw error;
    }
  }

  async getSupplyChainAnalytics() {
    try {
      const analytics = await this.repository.getAnalytics();
      return analytics;
    } catch (error) {
      logger.error('Failed to get supply chain analytics:', error);
      throw error;
    }
  }
}

module.exports = new SupplyChainService();
