/**
 * ALAWAEL ERP - SUPPLY CHAIN & LOGISTICS TESTS
 * Phase 17 - Supply Chain & Logistics Test Suite
 *
 * 45+ comprehensive tests covering:
 * - Supplier Management (8 tests)
 * - Inventory Management (8 tests)
 * - Purchase Orders (6 tests)
 * - Shipments & Delivery (7 tests)
 * - Warehouse Management (5 tests)
 * - Returns & Warranty (5 tests)
 * - Supply Chain Analytics (4 tests)
 * - Integration Tests (5 tests)
 */

const SupplyChainService = require('../services/supply-chain.service');

describe('Phase 17: Supply Chain & Logistics', () => {
  let service;

  beforeEach(() => {
    service = new SupplyChainService();
  });

  describe('SUPPLIER MANAGEMENT TESTS', () => {
    test('Should create a supplier with all details', () => {
      const supplier = service.createSupplier({
        name: 'Premium Parts Ltd',
        country: 'USA',
        city: 'New York',
        contact: 'John Smith',
        email: 'john@premiumparts.com',
        phone: '+1-555-0101',
        paymentTerms: 'Net 30',
        leadTime: 14,
        rating: 4.5,
        category: 'Electronics',
      });

      expect(supplier).toBeDefined();
      expect(supplier.id).toBeDefined();
      expect(supplier.name).toBe('Premium Parts Ltd');
      expect(supplier.country).toBe('USA');
      expect(supplier.rating).toBe(4.5);
      expect(supplier.createdAt).toBeDefined();
    });

    test('Should retrieve all suppliers', () => {
      service.createSupplier({
        name: 'Supplier 1',
        country: 'USA',
        contact: 'Contact 1',
      });
      service.createSupplier({
        name: 'Supplier 2',
        country: 'Canada',
        contact: 'Contact 2',
      });

      const suppliers = service.getSuppliers({});

      expect(suppliers).toHaveLength(2);
      expect(suppliers[0].name).toBe('Supplier 1');
      expect(suppliers[1].name).toBe('Supplier 2');
    });

    test('Should filter suppliers by country', () => {
      service.createSupplier({
        name: 'US Supplier',
        country: 'USA',
        contact: 'Contact',
      });
      service.createSupplier({
        name: 'Canada Supplier',
        country: 'Canada',
        contact: 'Contact',
      });

      const filtered = service.getSuppliers({ country: 'USA' });

      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('US Supplier');
    });

    test('Should filter suppliers by minimum rating', () => {
      service.createSupplier({
        name: 'High Rated',
        country: 'USA',
        contact: 'Contact',
        rating: 4.5,
      });
      service.createSupplier({
        name: 'Low Rated',
        country: 'USA',
        contact: 'Contact',
        rating: 2.5,
      });

      const filtered = service.getSuppliers({ minRating: 4 });

      expect(filtered).toHaveLength(1);
      expect(filtered[0].rating).toBe(4.5);
    });

    test('Should rate a supplier', () => {
      const supplier = service.createSupplier({
        name: 'Test Supplier',
        country: 'USA',
        contact: 'Contact',
        rating: 3.0,
      });

      const updated = service.rateSupplier(supplier.id, 4.8);

      expect(updated.rating).toBe(4.8);
      expect(updated.performanceMetrics).toBeDefined();
    });

    test('Should track supplier performance metrics', () => {
      const supplier = service.createSupplier({
        name: 'Performance Supplier',
        country: 'USA',
        contact: 'Contact',
      });

      service.rateSupplier(supplier.id, 4.5);
      const updated = service.rateSupplier(supplier.id, 4.7);

      expect(updated.performanceMetrics.ratingUpdates).toBeGreaterThan(0);
      expect(updated.performanceMetrics.onTimeRate).toBeDefined();
    });

    test('Should store supplier certifications', () => {
      const supplier = service.createSupplier({
        name: 'Certified Supplier',
        country: 'USA',
        contact: 'Contact',
        category: 'Manufacturing',
      });

      expect(supplier.certifications).toBeDefined();
      expect(Array.isArray(supplier.certifications)).toBe(true);
    });

    test('Should handle supplier with all optional fields', () => {
      const supplier = service.createSupplier({
        name: 'Full Details Supplier',
        country: 'Germany',
        city: 'Berlin',
        contact: 'Max Müller',
        email: 'max@supplier.de',
        phone: '+49-30-123456',
        paymentTerms: 'Net 45',
        leadTime: 21,
        rating: 4.9,
        category: 'Raw Materials',
      });

      expect(supplier.city).toBe('Berlin');
      expect(supplier.email).toBe('max@supplier.de');
      expect(supplier.paymentTerms).toBe('Net 45');
      expect(supplier.leadTime).toBe(21);
    });
  });

  describe('INVENTORY MANAGEMENT TESTS', () => {
    test('Should create an inventory item', () => {
      const item = service.createInventoryItem({
        sku: 'LAPTOP-001',
        productName: 'Laptop Pro 15',
        category: 'Electronics',
        quantity: 50,
        minQuantity: 10,
        maxQuantity: 200,
        unitCost: 999.99,
      });

      expect(item).toBeDefined();
      expect(item.id).toBeDefined();
      expect(item.sku).toBe('LAPTOP-001');
      expect(item.quantity).toBe(50);
      expect(item.status).toBe('optimal');
    });

    test('Should retrieve all inventory items', () => {
      service.createInventoryItem({
        sku: 'ITEM-001',
        productName: 'Item 1',
        quantity: 50,
        minQuantity: 10,
      });
      service.createInventoryItem({
        sku: 'ITEM-002',
        productName: 'Item 2',
        quantity: 100,
        minQuantity: 20,
      });

      const inventory = service.getInventory({});

      expect(inventory).toHaveLength(2);
    });

    test('Should filter inventory by category', () => {
      service.createInventoryItem({
        sku: 'ELEC-001',
        productName: 'Electronic Item',
        category: 'Electronics',
        quantity: 50,
        minQuantity: 10,
      });
      service.createInventoryItem({
        sku: 'FURN-001',
        productName: 'Furniture Item',
        category: 'Furniture',
        quantity: 30,
        minQuantity: 5,
      });

      const filtered = service.getInventory({ category: 'Electronics' });

      expect(filtered).toHaveLength(1);
      expect(filtered[0].productName).toBe('Electronic Item');
    });

    test('Should update inventory quantity', () => {
      const item = service.createInventoryItem({
        sku: 'TEST-001',
        productName: 'Test Item',
        quantity: 100,
        minQuantity: 10,
      });

      const updated = service.updateInventory(item.id, 25);

      expect(updated.quantity).toBe(125);
      expect(updated.lastUpdated).toBeDefined();
    });

    test('Should detect low stock items', () => {
      const item1 = service.createInventoryItem({
        sku: 'LOW-001',
        productName: 'Low Stock Item',
        quantity: 5,
        minQuantity: 10,
      });
      const item2 = service.createInventoryItem({
        sku: 'OK-001',
        productName: 'Normal Stock Item',
        quantity: 50,
        minQuantity: 10,
      });

      const lowStockItems = service.getLowStockItems();

      expect(lowStockItems.length).toBeGreaterThan(0);
      expect(lowStockItems.some((item) => item.sku === 'LOW-001')).toBe(true);
    });

    test('Should set item status as overstock when quantity exceeds maximum', () => {
      const item = service.createInventoryItem({
        sku: 'OVER-001',
        productName: 'Overstock Item',
        quantity: 250,
        minQuantity: 10,
        maxQuantity: 200,
      });

      expect(item.status).toBe('overstock');
    });

    test('Should track inventory cost history', () => {
      const item = service.createInventoryItem({
        sku: 'COST-001',
        productName: 'Cost Tracking Item',
        quantity: 100,
        unitCost: 50,
      });

      expect(item.costHistory).toBeDefined();
      expect(item.totalValue).toBe(5000); // 100 * 50
    });

    test('Should handle negative quantity adjustment (removal)', () => {
      const item = service.createInventoryItem({
        sku: 'REMOVE-001',
        productName: 'Remove Test',
        quantity: 100,
        minQuantity: 10,
      });

      const updated = service.updateInventory(item.id, -30);

      expect(updated.quantity).toBe(70);
    });
  });

  describe('PURCHASE ORDER MANAGEMENT TESTS', () => {
    test('Should create a purchase order', () => {
      const supplier = service.createSupplier({
        name: 'Test Supplier',
        country: 'USA',
        contact: 'Contact',
      });

      const order = service.createPurchaseOrder({
        supplierId: supplier.id,
        items: [{ sku: 'ITEM-001', quantity: 50, unitPrice: 100 }],
        totalCost: 5000,
        priority: 'normal',
      });

      expect(order).toBeDefined();
      expect(order.id).toBeDefined();
      expect(order.supplierId).toBe(supplier.id);
      expect(order.status).toBe('pending');
    });

    test('Should update purchase order status', () => {
      const supplier = service.createSupplier({
        name: 'Supplier',
        country: 'USA',
        contact: 'Contact',
      });
      const order = service.createPurchaseOrder({
        supplierId: supplier.id,
        items: [{ sku: 'ITEM-001', quantity: 50, unitPrice: 100 }],
      });

      const updated = service.updateOrderStatus(order.id, 'confirmed');

      expect(updated.status).toBe('confirmed');
    });

    test('Should track order through full lifecycle', async () => {
      const supplier = service.createSupplier({
        name: 'Supplier',
        country: 'USA',
        contact: 'Contact',
      });
      const order = service.createPurchaseOrder({
        supplierId: supplier.id,
        items: [{ sku: 'ITEM-001', quantity: 50, unitPrice: 100 }],
      });

      await new Promise((resolve) => setTimeout(resolve, 5));
      let current = service.updateOrderStatus(order.id, 'confirmed');
      expect(current.status).toBe('confirmed');

      await new Promise((resolve) => setTimeout(resolve, 5));
      current = service.updateOrderStatus(order.id, 'shipped');
      expect(current.status).toBe('shipped');

      await new Promise((resolve) => setTimeout(resolve, 5));
      current = service.updateOrderStatus(order.id, 'received');
      expect(current.status).toBe('received');
    });

    test('Should retrieve orders by supplier', () => {
      const supplier = service.createSupplier({
        name: 'Supplier A',
        country: 'USA',
        contact: 'Contact',
      });
      const other = service.createSupplier({
        name: 'Supplier B',
        country: 'USA',
        contact: 'Contact',
      });

      service.createPurchaseOrder({
        supplierId: supplier.id,
        items: [{ sku: 'ITEM-001', quantity: 50, unitPrice: 100 }],
      });
      service.createPurchaseOrder({
        supplierId: other.id,
        items: [{ sku: 'ITEM-002', quantity: 30, unitPrice: 80 }],
      });

      const supplierOrders = service.getOrdersBySupplier(supplier.id);

      expect(supplierOrders).toHaveLength(1);
      expect(supplierOrders[0].supplierId).toBe(supplier.id);
    });

    test('Should store priority level on order', () => {
      const supplier = service.createSupplier({
        name: 'Supplier',
        country: 'USA',
        contact: 'Contact',
      });

      const order = service.createPurchaseOrder({
        supplierId: supplier.id,
        items: [{ sku: 'ITEM-001', quantity: 50, unitPrice: 100 }],
        priority: 'urgent',
      });

      expect(order.priority).toBe('urgent');
    });
  });

  describe('SHIPMENT & DELIVERY MANAGEMENT TESTS', () => {
    test('Should create a shipment', () => {
      const shipment = service.createShipment({
        orderId: 'ORDER-001',
        items: [{ sku: 'ITEM-001', quantity: 50 }],
        carrier: 'FedEx',
        destination: 'New York, USA',
        weight: 25.5,
      });

      expect(shipment).toBeDefined();
      expect(shipment.id).toBeDefined();
      expect(shipment.carrier).toBe('FedEx');
      expect(shipment.status).toBe('pending');
    });

    test('Should track shipment with tracking number', () => {
      const shipment = service.createShipment({
        orderId: 'ORDER-001',
        items: [{ sku: 'ITEM-001', quantity: 50 }],
        carrier: 'DHL',
        destination: 'London, UK',
      });

      expect(shipment.trackingNumber).toBeDefined();
      expect(shipment.trackingNumber).toMatch(/^[A-Z]{3}\d{10}$/);
    });

    test('Should update shipment status', async () => {
      const shipment = service.createShipment({
        orderId: 'ORDER-001',
        items: [{ sku: 'ITEM-001', quantity: 50 }],
        carrier: 'UPS',
        destination: 'Boston, USA',
      });

      await new Promise((resolve) => setTimeout(resolve, 5));
      const updated = service.updateShipmentStatus(shipment.id, 'shipped');
      expect(updated.status).toBe('shipped');
    });

    test('Should track shipment events with timestamps', async () => {
      const shipment = service.createShipment({
        orderId: 'ORDER-001',
        items: [{ sku: 'ITEM-001', quantity: 50 }],
        carrier: 'FedEx',
        destination: 'Chicago, USA',
      });

      const tracking = service.trackShipment(shipment.id);

      expect(tracking.events).toBeDefined();
      expect(Array.isArray(tracking.events)).toBe(true);
      expect(tracking.events[0].timestamp).toBeDefined();
    });

    test('Should track shipment through full lifecycle', async () => {
      const shipment = service.createShipment({
        orderId: 'ORDER-001',
        items: [{ sku: 'ITEM-001', quantity: 50 }],
        carrier: 'FedEx',
        destination: 'Miami, USA',
      });

      const shipmentId = shipment.id;

      await new Promise((resolve) => setTimeout(resolve, 5));
      service.updateShipmentStatus(shipmentId, 'shipped');

      await new Promise((resolve) => setTimeout(resolve, 5));
      service.updateShipmentStatus(shipmentId, 'in_transit');

      await new Promise((resolve) => setTimeout(resolve, 5));
      const final = service.updateShipmentStatus(shipmentId, 'delivered');

      expect(final.status).toBe('delivered');
      const tracking = service.trackShipment(shipmentId);
      expect(tracking.events.length).toBeGreaterThan(0);
    });

    test('Should include weight and dimensions in shipment', () => {
      const shipment = service.createShipment({
        orderId: 'ORDER-001',
        items: [{ sku: 'ITEM-001', quantity: 50 }],
        carrier: 'FedEx',
        destination: 'Seattle, USA',
        weight: 15.5,
        dimensions: '50x30x20 cm',
      });

      expect(shipment.weight).toBe(15.5);
      expect(shipment.dimensions).toBe('50x30x20 cm');
    });
  });

  describe('WAREHOUSE MANAGEMENT TESTS', () => {
    test('Should create a warehouse', () => {
      const warehouse = service.createWarehouse({
        name: 'Main Warehouse',
        location: 'Los Angeles, USA',
        capacity: 10000,
        manager: 'John Manager',
      });

      expect(warehouse).toBeDefined();
      expect(warehouse.id).toBeDefined();
      expect(warehouse.name).toBe('Main Warehouse');
      expect(warehouse.location).toBe('Los Angeles, USA');
    });

    test('Should retrieve all warehouses', () => {
      service.createWarehouse({
        name: 'Warehouse 1',
        location: 'Location 1',
        capacity: 5000,
      });
      service.createWarehouse({
        name: 'Warehouse 2',
        location: 'Location 2',
        capacity: 8000,
      });

      const warehouses = service.getWarehouses();

      expect(warehouses).toHaveLength(2);
    });

    test('Should calculate warehouse utilization rate', () => {
      const warehouse = service.createWarehouse({
        name: 'Test Warehouse',
        location: 'Test Location',
        capacity: 1000,
      });

      const warehouses = service.getWarehouses();
      const found = warehouses.find((w) => w.id === warehouse.id);

      expect(found.utilizationRate).toBeDefined();
      expect(found.utilizationRate).toBeGreaterThanOrEqual(0);
      expect(found.utilizationRate).toBeLessThanOrEqual(100);
    });

    test('Should retrieve warehouse inventory', () => {
      const warehouse = service.createWarehouse({
        name: 'Inventory Warehouse',
        location: 'Location',
        capacity: 5000,
      });

      const inventory = service.getWarehouseInventory(warehouse.id);

      expect(Array.isArray(inventory)).toBe(true);
      expect(inventory).toBeDefined();
    });

    test('Should support multiple warehouses', () => {
      const w1 = service.createWarehouse({
        name: 'East Warehouse',
        location: 'East Coast',
        capacity: 10000,
      });
      const w2 = service.createWarehouse({
        name: 'West Warehouse',
        location: 'West Coast',
        capacity: 15000,
      });
      const w3 = service.createWarehouse({
        name: 'Central Warehouse',
        location: 'Central USA',
        capacity: 12000,
      });

      const all = service.getWarehouses();

      expect(all.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('RETURN & WARRANTY MANAGEMENT TESTS', () => {
    test('Should create a return request', () => {
      const returnRequest = service.createReturnRequest({
        orderId: 'ORDER-001',
        items: [{ sku: 'ITEM-001', quantity: 5, reason: 'Defective' }],
        reason: 'Product defect',
      });

      expect(returnRequest).toBeDefined();
      expect(returnRequest.id).toBeDefined();
      expect(returnRequest.status).toBe('pending');
    });

    test('Should approve a return request', async () => {
      const returnRequest = service.createReturnRequest({
        orderId: 'ORDER-001',
        items: [{ sku: 'ITEM-001', quantity: 5 }],
        reason: 'Wrong size',
      });

      await new Promise((resolve) => setTimeout(resolve, 5));
      const approved = service.approveReturn(returnRequest.id);

      expect(approved.status).toBe('approved');
    });

    test('Should process refund for return', async () => {
      const returnRequest = service.createReturnRequest({
        orderId: 'ORDER-001',
        items: [{ sku: 'ITEM-001', quantity: 5, unitPrice: 100 }],
        reason: 'Not satisfied',
      });

      await new Promise((resolve) => setTimeout(resolve, 5));
      service.approveReturn(returnRequest.id);

      await new Promise((resolve) => setTimeout(resolve, 5));
      const refunded = service.processRefund(returnRequest.id, 500);

      expect(refunded.status).toBe('refunded');
      expect(refunded.refundAmount).toBe(500);
    });

    test('Should track return reason', () => {
      const returnRequest = service.createReturnRequest({
        orderId: 'ORDER-001',
        items: [{ sku: 'ITEM-001', quantity: 2 }],
        reason: 'Broken upon delivery',
      });

      expect(returnRequest.reason).toBe('Broken upon delivery');
    });

    test('Should track return through full lifecycle', async () => {
      const returnRequest = service.createReturnRequest({
        orderId: 'ORDER-001',
        items: [{ sku: 'ITEM-001', quantity: 3, unitPrice: 150 }],
        reason: 'Quality issue',
      });

      expect(returnRequest.status).toBe('pending');

      await new Promise((resolve) => setTimeout(resolve, 5));
      let current = service.approveReturn(returnRequest.id);
      expect(current.status).toBe('approved');

      await new Promise((resolve) => setTimeout(resolve, 5));
      current = service.processRefund(returnRequest.id, 450);
      expect(current.status).toBe('refunded');
      expect(current.refundAmount).toBe(450);
    });
  });

  describe('SUPPLY CHAIN ANALYTICS TESTS', () => {
    test('Should generate supply chain analytics', () => {
      service.createInventoryItem({
        sku: 'ITEM-001',
        productName: 'Item 1',
        quantity: 100,
        minQuantity: 10,
      });

      const analytics = service.getSupplyChainAnalytics();

      expect(analytics).toBeDefined();
      expect(analytics.totalInventoryValue).toBeDefined();
      expect(analytics.totalOrders).toBeDefined();
      expect(analytics.totalShipments).toBeDefined();
    });

    test('Should calculate total inventory value', () => {
      service.createInventoryItem({
        sku: 'ITEM-001',
        productName: 'Item 1',
        quantity: 100,
        unitCost: 50,
      });
      service.createInventoryItem({
        sku: 'ITEM-002',
        productName: 'Item 2',
        quantity: 50,
        unitCost: 100,
      });

      const analytics = service.getSupplyChainAnalytics();

      expect(analytics.totalInventoryValue).toBeGreaterThan(0);
    });

    test('Should provide supplier performance analysis', () => {
      const supplier = service.createSupplier({
        name: 'Test Supplier',
        country: 'USA',
        contact: 'Contact',
        rating: 4.5,
      });

      const performance = service.getSupplierPerformance(supplier.id);

      expect(performance).toBeDefined();
      expect(performance.rating).toBe(4.5);
      expect(performance.performanceMetrics).toBeDefined();
    });

    test('Should provide logistics optimization recommendations', () => {
      service.createWarehouse({
        name: 'Warehouse',
        location: 'Location',
        capacity: 1000,
      });

      const optimization = service.getLogisticsOptimization();

      expect(optimization).toBeDefined();
      expect(optimization.recommendations).toBeDefined();
      expect(Array.isArray(optimization.recommendations)).toBe(true);
    });
  });

  describe('INTEGRATION TESTS', () => {
    test('Should complete end-to-end supply chain workflow', async () => {
      // Create supplier
      const supplier = service.createSupplier({
        name: 'Quality Supplier',
        country: 'Germany',
        contact: 'Max Mueller',
        rating: 4.8,
      });

      // Create inventory
      const item = service.createInventoryItem({
        sku: 'WIDGET-100',
        productName: 'Premium Widget',
        quantity: 200,
        minQuantity: 50,
        unitCost: 25,
        supplierId: supplier.id,
      });

      // Create purchase order
      const order = service.createPurchaseOrder({
        supplierId: supplier.id,
        items: [{ sku: 'WIDGET-100', quantity: 100, unitPrice: 25 }],
        totalCost: 2500,
        priority: 'normal',
      });

      // Create shipment
      const shipment = service.createShipment({
        orderId: order.id,
        items: [{ sku: 'WIDGET-100', quantity: 100 }],
        carrier: 'DHL',
        destination: 'New York, USA',
      });

      // Track shipment
      const tracking = service.trackShipment(shipment.id);

      expect(supplier.id).toBeDefined();
      expect(item.id).toBeDefined();
      expect(order.id).toBeDefined();
      expect(shipment.id).toBeDefined();
      expect(tracking.currentStatus).toBe('pending');
    });

    test('Should handle inventory management with warehouse integration', () => {
      const warehouse = service.createWarehouse({
        name: 'Central Hub',
        location: 'Dallas, USA',
        capacity: 5000,
      });

      const item1 = service.createInventoryItem({
        sku: 'PROD-001',
        productName: 'Product 1',
        quantity: 500,
        minQuantity: 100,
      });

      const item2 = service.createInventoryItem({
        sku: 'PROD-002',
        productName: 'Product 2',
        quantity: 300,
        minQuantity: 50,
      });

      const warehouseInventory = service.getWarehouseInventory(warehouse.id);

      expect(warehouseInventory).toBeDefined();
      expect(service.getInventory({})).toHaveLength(2);
    });

    test('Should track multiple concurrent shipments', async () => {
      const shipment1 = service.createShipment({
        orderId: 'ORDER-001',
        items: [{ sku: 'ITEM-001', quantity: 50 }],
        carrier: 'FedEx',
        destination: 'Boston, USA',
      });

      const shipment2 = service.createShipment({
        orderId: 'ORDER-002',
        items: [{ sku: 'ITEM-002', quantity: 75 }],
        carrier: 'UPS',
        destination: 'Chicago, USA',
      });

      const shipment3 = service.createShipment({
        orderId: 'ORDER-003',
        items: [{ sku: 'ITEM-003', quantity: 100 }],
        carrier: 'DHL',
        destination: 'Denver, USA',
      });

      const track1 = service.trackShipment(shipment1.id);
      const track2 = service.trackShipment(shipment2.id);
      const track3 = service.trackShipment(shipment3.id);

      expect(track1.shipmentId).toBe(shipment1.id);
      expect(track2.shipmentId).toBe(shipment2.id);
      expect(track3.shipmentId).toBe(shipment3.id);
    });

    test('Should generate comprehensive system analytics', () => {
      // Setup: Create multiple entities
      service.createSupplier({
        name: 'Supplier 1',
        country: 'USA',
        contact: 'Contact',
      });
      service.createSupplier({
        name: 'Supplier 2',
        country: 'Canada',
        contact: 'Contact',
      });

      service.createInventoryItem({
        sku: 'ITEM-001',
        productName: 'Item 1',
        quantity: 100,
        unitCost: 50,
      });

      service.createWarehouse({
        name: 'Warehouse',
        location: 'Location',
        capacity: 1000,
      });

      // Get analytics
      const analytics = service.getSupplyChainAnalytics();

      expect(analytics.totalSuppliers).toBeGreaterThan(0);
      expect(analytics.totalInventoryItems).toBeGreaterThan(0);
      expect(analytics.totalWarehouses).toBeGreaterThan(0);
      expect(analytics.systemMetrics).toBeDefined();
    });
  });

  describe('DATA VALIDATION TESTS', () => {
    test('Should maintain data integrity for supplier operations', () => {
      const supplier = service.createSupplier({
        name: 'Integrity Test',
        country: 'USA',
        contact: 'Contact',
      });

      const suppliers = service.getSuppliers({});
      const found = suppliers.find((s) => s.id === supplier.id);

      expect(found).toBeDefined();
      expect(found.name).toBe('Integrity Test');
    });

    test('Should maintain inventory quantity consistency', () => {
      const item = service.createInventoryItem({
        sku: 'CONSISTENCY-001',
        productName: 'Consistency Test',
        quantity: 100,
        minQuantity: 10,
      });

      service.updateInventory(item.id, 50);
      service.updateInventory(item.id, -25);

      const inventory = service.getInventory({});
      const found = inventory.find((i) => i.id === item.id);

      expect(found.quantity).toBe(125); // 100 + 50 - 25
    });

    test('Should properly isolate data between service instances', () => {
      const service1 = new SupplyChainService();
      const service2 = new SupplyChainService();

      service1.createSupplier({
        name: 'Service 1 Supplier',
        country: 'USA',
        contact: 'Contact',
      });

      const service1Suppliers = service1.getSuppliers({});
      const service2Suppliers = service2.getSuppliers({});

      expect(service1Suppliers).toHaveLength(1);
      expect(service2Suppliers).toHaveLength(0);
    });
  });
});
