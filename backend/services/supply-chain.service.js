/**
 * ALAWAEL ERP - SUPPLY CHAIN & LOGISTICS MANAGEMENT SERVICE
 * Supplier Management, Inventory Tracking, Order Fulfillment, Logistics
 * Phase 17 - Supply Chain & Logistics Management
 *
 * Features:
 * - Supplier management and vendor relationships
 * - Inventory and warehouse management
 * - Order fulfillment and tracking
 * - Shipment and delivery management
 * - Supply chain analytics
 * - Logistics optimization
 * - Return and warranty management
 */

class SupplyChainService {
  constructor() {
    this.suppliers = [];
    this.inventory = [];
    this.orders = [];
    this.shipments = [];
    this.warehouses = [];
    this.returnRequests = [];
    this.logistics = [];
  }

  /**
   * SUPPLIER MANAGEMENT
   */

  createSupplier(supplierData) {
    try {
      const {
        name,
        country,
        city,
        contact,
        email,
        phone,
        paymentTerms,
        leadTime = 7,
        rating = 0,
        category,
      } = supplierData;

      if (!name || !country || !contact) {
        throw new Error('Missing required fields: name, country, contact');
      }

      const supplier = {
        id: `SUP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name,
        country,
        city,
        contact,
        email,
        phone,
        paymentTerms,
        leadTime,
        rating: Math.min(rating, 5),
        category,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
        totalOrders: 0,
        totalSpent: 0,
        performance: { onTimeRate: 0, defectRate: 0, responseTime: 0 },
        certifications: [],
        products: [],
      };

      this.suppliers.push(supplier);
      return supplier;
    } catch (error) {
      throw new Error(`Failed to create supplier: ${error.message}`);
    }
  }

  getSuppliers(filters = {}) {
    try {
      let results = [...this.suppliers];

      if (filters.category) {
        results = results.filter(s => s.category === filters.category);
      }
      if (filters.status) {
        results = results.filter(s => s.status === filters.status);
      }
      if (filters.minRating) {
        results = results.filter(s => s.rating >= filters.minRating);
      }
      if (filters.country) {
        results = results.filter(s => s.country === filters.country);
      }

      return results.sort((a, b) => b.rating - a.rating);
    } catch (error) {
      throw new Error(`Failed to get suppliers: ${error.message}`);
    }
  }

  rateSupplier(supplierId, rating) {
    try {
      const supplier = this.suppliers.find(s => s.id === supplierId);
      if (!supplier) {
        throw new Error(`Supplier ${supplierId} not found`);
      }

      supplier.rating = Math.min(Math.max(rating, 0), 5);
      supplier.updatedAt = new Date();

      // Initialize performanceMetrics if not present
      if (!supplier.performanceMetrics) {
        supplier.performanceMetrics = { ratingUpdates: 0 };
      }
      supplier.performanceMetrics.ratingUpdates =
        (supplier.performanceMetrics.ratingUpdates || 0) + 1;
      supplier.performanceMetrics.onTimeRate = supplier.performance?.onTimeRate || 0;

      return supplier;
    } catch (error) {
      throw new Error(`Failed to rate supplier: ${error.message}`);
    }
  }

  /**
   * INVENTORY MANAGEMENT
   */

  createInventoryItem(itemData) {
    try {
      const {
        sku,
        productName,
        category,
        quantity,
        minQuantity = 10,
        maxQuantity = 1000,
        unitCost,
        supplierId,
      } = itemData;

      if (!sku || !productName || quantity === undefined) {
        throw new Error('Missing required fields: sku, productName, quantity');
      }

      const item = {
        id: `INV_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        sku,
        productName,
        category,
        quantity,
        minQuantity,
        maxQuantity,
        unitCost,
        supplierId,
        status: this.getInventoryStatus(quantity, minQuantity, maxQuantity),
        createdAt: new Date(),
        updatedAt: new Date(),
        lastUpdated: new Date(),
        lastRestockDate: null,
        historicalCost: [],
        costHistory: [],
        totalValue: quantity * unitCost,
        locations: [],
      };

      this.inventory.push(item);
      return item;
    } catch (error) {
      throw new Error(`Failed to create inventory item: ${error.message}`);
    }
  }

  updateInventory(itemId, quantityChange) {
    try {
      const item = this.inventory.find(i => i.id === itemId);
      if (!item) {
        throw new Error(`Inventory item ${itemId} not found`);
      }

      item.quantity += quantityChange;
      item.status = this.getInventoryStatus(item.quantity, item.minQuantity, item.maxQuantity);
      item.updatedAt = new Date();
      item.lastUpdated = new Date();

      if (quantityChange > 0) {
        item.lastRestockDate = new Date();
      }

      return item;
    } catch (error) {
      throw new Error(`Failed to update inventory: ${error.message}`);
    }
  }

  getInventory(filters = {}) {
    try {
      let results = [...this.inventory];

      if (filters.category) {
        results = results.filter(i => i.category === filters.category);
      }
      if (filters.status) {
        results = results.filter(i => i.status === filters.status);
      }
      if (filters.supplierId) {
        results = results.filter(i => i.supplierId === filters.supplierId);
      }

      return results;
    } catch (error) {
      throw new Error(`Failed to get inventory: ${error.message}`);
    }
  }

  getLowStockItems() {
    try {
      return this.inventory.filter(i => i.quantity <= i.minQuantity);
    } catch (error) {
      throw new Error(`Failed to get low stock items: ${error.message}`);
    }
  }

  getInventoryStatus(quantity, minQty, maxQty) {
    if (quantity <= minQty) return 'low_stock';
    if (quantity >= maxQty) return 'overstock';
    return 'optimal';
  }

  generateTrackingNumber() {
    // Generate format: ABC1234567890 (3 letters + 10 digits)
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let result = '';
    for (let i = 0; i < 3; i++) {
      result += letters.charAt(Math.floor(Math.random() * letters.length));
    }
    result += Math.floor(Math.random() * 10000000000)
      .toString()
      .padStart(10, '0');
    return result;
  }

  /**
   * ORDER FULFILLMENT MANAGEMENT
   */

  createPurchaseOrder(orderData) {
    try {
      const { supplierId, items, totalCost, expectedDelivery, priority = 'normal' } = orderData;

      if (!supplierId || !items || items.length === 0) {
        throw new Error('Missing required fields: supplierId, items');
      }

      const order = {
        id: `PO_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        supplierId,
        items,
        totalCost,
        expectedDelivery,
        priority,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
        confirmedAt: null,
        receivedAt: null,
        invoiceNumber: null,
        trackingNumber: null,
      };

      this.orders.push(order);
      return order;
    } catch (error) {
      throw new Error(`Failed to create purchase order: ${error.message}`);
    }
  }

  updateOrderStatus(orderId, newStatus) {
    try {
      const order = this.orders.find(o => o.id === orderId);
      if (!order) {
        throw new Error(`Order ${orderId} not found`);
      }

      const validStatuses = ['pending', 'confirmed', 'shipped', 'received', 'cancelled'];
      if (!validStatuses.includes(newStatus)) {
        throw new Error(`Invalid status: ${newStatus}`);
      }

      order.status = newStatus;
      order.updatedAt = new Date();

      if (newStatus === 'confirmed') {
        order.confirmedAt = new Date();
      } else if (newStatus === 'received') {
        order.receivedAt = new Date();
      }

      return order;
    } catch (error) {
      throw new Error(`Failed to update order status: ${error.message}`);
    }
  }

  getOrdersBySupplier(supplierId) {
    try {
      return this.orders.filter(o => o.supplierId === supplierId);
    } catch (error) {
      throw new Error(`Failed to get orders: ${error.message}`);
    }
  }

  /**
   * SHIPMENT & DELIVERY MANAGEMENT
   */

  createShipment(shipmentData) {
    try {
      const { orderId, items, weight, dimensions, carrier, destination, estimatedDelivery } =
        shipmentData;

      if (!orderId || !carrier) {
        throw new Error('Missing required fields: orderId, carrier');
      }

      const shipment = {
        id: `SHIP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        orderId,
        items,
        weight,
        dimensions,
        carrier,
        destination,
        estimatedDelivery,
        status: 'pending',
        trackingNumber: this.generateTrackingNumber(),
        createdAt: new Date(),
        updatedAt: new Date(),
        shippedAt: null,
        deliveredAt: null,
        events: [{ timestamp: new Date(), status: 'created', description: 'Shipment created' }],
        timeline: [{ timestamp: new Date(), status: 'created', description: 'Shipment created' }],
        signature: null,
      };

      this.shipments.push(shipment);
      return shipment;
    } catch (error) {
      throw new Error(`Failed to create shipment: ${error.message}`);
    }
  }

  trackShipment(shipmentId) {
    try {
      const shipment = this.shipments.find(s => s.id === shipmentId);
      if (!shipment) {
        throw new Error(`Shipment ${shipmentId} not found`);
      }

      return {
        shipmentId: shipment.id,
        orderId: shipment.orderId,
        currentStatus: shipment.status,
        trackingStatus: shipment.status,
        trackingNumber: shipment.trackingNumber,
        carrier: shipment.carrier,
        origin: shipment.origin,
        destination: shipment.destination,
        shippedAt: shipment.shippedAt,
        estimatedDelivery: shipment.estimatedDelivery,
        deliveredAt: shipment.deliveredAt,
        location: shipment.currentLocation || shipment.origin,
        events: shipment.events || shipment.timeline || [],
        eta: shipment.estimatedDelivery,
        lastUpdate: shipment.updatedAt,
      };
    } catch (error) {
      throw new Error(`Failed to track shipment: ${error.message}`);
    }
  }

  updateShipmentStatus(shipmentId, newStatus) {
    try {
      const shipment = this.shipments.find(s => s.id === shipmentId);
      if (!shipment) {
        throw new Error(`Shipment ${shipmentId} not found`);
      }

      const validStatuses = [
        'pending',
        'shipped',
        'in_transit',
        'delivered',
        'delayed',
        'cancelled',
      ];
      if (!validStatuses.includes(newStatus)) {
        throw new Error(`Invalid status: ${newStatus}`);
      }

      shipment.status = newStatus;
      shipment.updatedAt = new Date();

      shipment.events.push({
        status: newStatus,
        timestamp: new Date(),
        location: null,
      });

      if (newStatus === 'shipped') {
        shipment.shippedAt = new Date();
      } else if (newStatus === 'delivered') {
        shipment.deliveredAt = new Date();
      }

      return shipment;
    } catch (error) {
      throw new Error(`Failed to update shipment: ${error.message}`);
    }
  }

  /**
   * WAREHOUSE MANAGEMENT
   */

  createWarehouse(warehouseData) {
    try {
      const { name, location, capacity, manager, shelves = 0 } = warehouseData;

      if (!name || !location) {
        throw new Error('Missing required fields: name, location');
      }

      const warehouse = {
        id: `WH_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name,
        location,
        capacity,
        manager,
        shelves,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
        currentLoad: 0,
        utilizationRate: 0,
        items: [],
      };

      this.warehouses.push(warehouse);
      return warehouse;
    } catch (error) {
      throw new Error(`Failed to create warehouse: ${error.message}`);
    }
  }

  getWarehouses() {
    try {
      return this.warehouses.map(w => ({
        ...w,
        utilizationRate: w.capacity > 0 ? (w.currentLoad / w.capacity) * 100 : 0,
      }));
    } catch (error) {
      throw new Error(`Failed to get warehouses: ${error.message}`);
    }
  }

  getWarehouseInventory(warehouseId) {
    try {
      const warehouse = this.warehouses.find(w => w.id === warehouseId);
      if (!warehouse) {
        throw new Error(`Warehouse ${warehouseId} not found`);
      }

      const items = this.inventory.filter(i => i.locations && i.locations.includes(warehouseId));

      return items;
    } catch (error) {
      throw new Error(`Failed to get warehouse inventory: ${error.message}`);
    }
  }

  /**
   * RETURN & WARRANTY MANAGEMENT
   */

  createReturnRequest(returnData) {
    try {
      const { orderId, items, reason, status = 'pending' } = returnData;

      if (!orderId || !items || items.length === 0) {
        throw new Error('Missing required fields: orderId, items');
      }

      const returnRequest = {
        id: `RET_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        orderId,
        items,
        reason,
        status,
        createdAt: new Date(),
        updatedAt: new Date(),
        approvedAt: null,
        refundedAt: null,
        refundAmount: 0,
        notes: [],
      };

      this.returnRequests.push(returnRequest);
      return returnRequest;
    } catch (error) {
      throw new Error(`Failed to create return request: ${error.message}`);
    }
  }

  approveReturn(returnId) {
    try {
      const ret = this.returnRequests.find(r => r.id === returnId);
      if (!ret) {
        throw new Error(`Return request ${returnId} not found`);
      }

      ret.status = 'approved';
      ret.approvedAt = new Date();
      ret.updatedAt = new Date();
      return ret;
    } catch (error) {
      throw new Error(`Failed to approve return: ${error.message}`);
    }
  }

  processRefund(returnId, refundAmount) {
    try {
      const ret = this.returnRequests.find(r => r.id === returnId);
      if (!ret) {
        throw new Error(`Return request ${returnId} not found`);
      }

      ret.status = 'refunded';
      ret.refundAmount = refundAmount;
      ret.refundedAt = new Date();
      ret.updatedAt = new Date();
      return ret;
    } catch (error) {
      throw new Error(`Failed to process refund: ${error.message}`);
    }
  }

  /**
   * SUPPLY CHAIN ANALYTICS
   */

  getSupplyChainAnalytics() {
    try {
      const totalSuppliers = this.suppliers.length;
      const activeSuppliers = this.suppliers.filter(s => s.status === 'active').length;
      const averageRating =
        totalSuppliers > 0
          ? this.suppliers.reduce((sum, s) => sum + s.rating, 0) / totalSuppliers
          : 0;

      const totalInventoryValue = this.inventory.reduce(
        (sum, i) => sum + i.quantity * (i.unitCost || 0),
        0
      );
      const lowStockItems = this.getLowStockItems();

      const totalOrders = this.orders.length;
      const pendingOrders = this.orders.filter(o => o.status === 'pending').length;
      const totalSpent = this.orders.reduce((sum, o) => sum + (o.totalCost || 0), 0);

      const totalShipments = this.shipments.length;
      const deliveredShipments = this.shipments.filter(s => s.status === 'delivered').length;
      const deliveryRate = totalShipments > 0 ? (deliveredShipments / totalShipments) * 100 : 0;

      const topSuppliers = this.suppliers
        .map(s => ({
          ...s,
          orders: this.orders.filter(o => o.supplierId === s.id).length,
        }))
        .sort((a, b) => b.orders - a.orders)
        .slice(0, 5);

      return {
        totalSuppliers,
        totalInventoryItems: this.inventory.length,
        totalInventoryValue,
        totalOrders,
        totalShipments,
        totalWarehouses: this.warehouses.length,
        totalReturns: this.returnRequests.length,
        activeSuppliers,
        lowStockCount: lowStockItems.length,
        averageRating: parseFloat(averageRating.toFixed(2)),
        deliveryRate: parseFloat(deliveryRate.toFixed(2)),
        systemMetrics: {
          suppliers: {
            total: totalSuppliers,
            active: activeSuppliers,
            averageRating: parseFloat(averageRating.toFixed(2)),
            topSuppliers,
          },
          inventory: {
            totalItems: this.inventory.length,
            totalValue: totalInventoryValue,
            lowStockCount: lowStockItems.length,
            overstockCount: this.inventory.filter(i => i.status === 'overstock').length,
          },
          orders: {
            total: totalOrders,
            pending: pendingOrders,
            totalSpent,
            averageOrderValue: totalOrders > 0 ? totalSpent / totalOrders : 0,
          },
          shipments: {
            total: totalShipments,
            delivered: deliveredShipments,
            inTransit: this.shipments.filter(s => s.status === 'in_transit').length,
            deliveryRate: parseFloat(deliveryRate.toFixed(2)),
          },
          returns: {
            total: this.returnRequests.length,
            approved: this.returnRequests.filter(r => r.status === 'approved').length,
            refunded: this.returnRequests.filter(r => r.status === 'refunded').length,
            totalRefunded: this.returnRequests.reduce((sum, r) => sum + r.refundAmount, 0),
          },
        },
      };
    } catch (error) {
      throw new Error(`Failed to get supply chain analytics: ${error.message}`);
    }
  }

  getSupplierPerformance(supplierId) {
    try {
      const supplier = this.suppliers.find(s => s.id === supplierId);
      if (!supplier) {
        throw new Error(`Supplier ${supplierId} not found`);
      }

      const supplierOrders = this.orders.filter(o => o.supplierId === supplierId);
      const deliveredOrders = supplierOrders.filter(o => o.status === 'received');

      const onTimeDeliveries = deliveredOrders.filter(o => {
        const deliveredDate = o.receivedAt;
        const expectedDate = o.expectedDelivery;
        return deliveredDate <= expectedDate;
      }).length;

      const onTimeRate =
        deliveredOrders.length > 0 ? (onTimeDeliveries / deliveredOrders.length) * 100 : 0;

      const totalCost = supplierOrders.reduce((sum, o) => sum + (o.totalCost || 0), 0);
      const averageLeadTime = supplier.leadTime;

      return {
        supplierId: supplier.id,
        name: supplier.name,
        rating: supplier.rating,
        performanceMetrics: {
          totalOrders: supplierOrders.length,
          deliveredOrders: deliveredOrders.length,
          onTimeRate: parseFloat(onTimeRate.toFixed(2)),
          totalCost,
          averageLeadTime,
          qualityRating: supplier.rating,
          recommendedForOrders: supplier.rating >= 4 && onTimeRate >= 90,
        },
        supplier,
      };
    } catch (error) {
      throw new Error(`Failed to get supplier performance: ${error.message}`);
    }
  }

  getLogisticsOptimization() {
    try {
      const warehouses = this.getWarehouses();
      const shipments = this.shipments;

      const warehouseUtilization = warehouses.map(w => ({
        warehouse: w.name,
        utilizationRate: w.utilizationRate,
        availableCapacity: w.capacity - w.currentLoad,
      }));

      const averageDeliveryTime =
        shipments
          .filter(s => s.deliveredAt && s.shippedAt)
          .reduce((sum, s) => {
            const deliveryTime = (s.deliveredAt - s.shippedAt) / (1000 * 60 * 60); // in hours
            return sum + deliveryTime;
          }, 0) / Math.max(shipments.filter(s => s.deliveredAt).length, 1);

      const carrierEfficiency = {};
      shipments.forEach(s => {
        if (!carrierEfficiency[s.carrier]) {
          carrierEfficiency[s.carrier] = { count: 0, delivered: 0 };
        }
        carrierEfficiency[s.carrier].count++;
        if (s.status === 'delivered') {
          carrierEfficiency[s.carrier].delivered++;
        }
      });

      const recommendations = this.generateOptimizationRecommendations();

      return {
        warehouseUtilization,
        averageDeliveryTime: parseFloat(averageDeliveryTime.toFixed(2)),
        carrierEfficiency,
        recommendations,
      };
    } catch (error) {
      throw new Error(`Failed to get logistics optimization: ${error.message}`);
    }
  }

  generateOptimizationRecommendations() {
    const recommendations = [];

    const lowStockItems = this.getLowStockItems();
    if (lowStockItems.length > 0) {
      recommendations.push(`Restock ${lowStockItems.length} items with low inventory levels`);
    }

    const pendingOrders = this.orders.filter(o => o.status === 'pending');
    if (pendingOrders.length > 5) {
      recommendations.push('Process pending purchase orders to maintain inventory flow');
    }

    const delayedShipments = this.shipments.filter(s => s.status === 'delayed');
    if (delayedShipments.length > 0) {
      recommendations.push(`Investigate ${delayedShipments.length} delayed shipments`);
    }

    const underperformingSuppliers = this.suppliers.filter(s => s.rating < 3);
    if (underperformingSuppliers.length > 0) {
      recommendations.push(
        `Review relationship with ${underperformingSuppliers.length} low-rated suppliers`
      );
    }

    return recommendations;
  }
}

module.exports = SupplyChainService;
