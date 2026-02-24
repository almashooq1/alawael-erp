/**
 * tests/database.integration.test.js
 * Database Integration Tests
 * 
 * Tests the repository layer and database operations
 * Verifies all CRUD operations work correctly
 * 
 * Run: npm test -- tests/database.integration.test.js
 */

const { connectDB, disconnectDB } = require('../config/database');
const repository = require('../repositories/supplyChainRepository');
const { resetDatabase, seedData } = require('../seeds/initDatabase');
const { Supplier, Product, PurchaseOrder, Shipment } = require('../models');

describe('🗄️  Database Integration Tests', () => {
  let supplierId;
  let productId;
  let orderId;
  let shipmentId;

  // Setup before all tests
  beforeAll(async () => {
    console.log('\n📡 Connecting to test database...');
    await connectDB();
    console.log('✅ Connected\n');
  });

  // Clean up after each test
  afterEach(async () => {
    // Keep data for next tests unless test requires clean state
  });

  // Disconnect after all tests
  afterAll(async () => {
    console.log('\n🧹 Cleaning up...');
    await resetDatabase();
    await disconnectDB();
    console.log('✅ Cleaned up\n');
  });

  describe('📦 Supplier Operations', () => {
    test('should create a supplier', async () => {
      const supplier = await repository.createSupplier({
        name: 'Tech Solutions Inc',
        email: `supplier-${Date.now()}@test.com`,
        phone: '+966-50-1234567',
        address: 'Riyadh, Saudi Arabia',
        category: 'electronics',
        status: 'active',
      });

      expect(supplier).toBeDefined();
      expect(supplier._id).toBeDefined();
      expect(supplier.name).toBe('Tech Solutions Inc');
      expect(supplier.status).toBe('active');
      expect(supplier.rating).toBe(5); // Default rating

      supplierId = supplier._id;
    });

    test('should get supplier by ID', async () => {
      const supplier = await repository.getSupplier(supplierId);

      expect(supplier).toBeDefined();
      expect(supplier._id.toString()).toBe(supplierId.toString());
      expect(supplier.name).toBe('Tech Solutions Inc');
    });

    test('should list suppliers', async () => {
      const suppliers = await repository.listSuppliers();

      expect(Array.isArray(suppliers)).toBe(true);
      expect(suppliers.length).toBeGreaterThan(0);
    });

    test('should list suppliers with filter', async () => {
      const suppliers = await repository.listSuppliers({
        status: 'active',
        limit: 10,
      });

      expect(Array.isArray(suppliers)).toBe(true);
      suppliers.forEach(supplier => {
        expect(supplier.status).toBe('active');
      });
    });

    test('should update supplier', async () => {
      const updated = await repository.updateSupplier(supplierId, {
        rating: 4.5,
        status: 'active',
      });

      expect(updated.rating).toBe(4.5);
      expect(updated.status).toBe('active');
    });

    test('should handle duplicate email', async () => {
      const email = `duplicate-${Date.now()}@test.com`;

      // Create first supplier
      await repository.createSupplier({
        name: 'First Supplier',
        email: email,
        category: 'electronics',
      });

      // Try to create duplicate - should fail
      await expect(
        repository.createSupplier({
          name: 'Second Supplier',
          email: email,
          category: 'furniture',
        })
      ).rejects.toThrow();
    });
  });

  describe('🏭 Product Operations', () => {
    test('should add product', async () => {
      const product = await repository.addProduct({
        sku: `SKU-${Date.now()}`,
        name: 'Laptop Computer',
        category: 'electronics',
        price: 999.99,
        cost: 600,
        quantity: 50,
        minLevel: 10,
        maxLevel: 200,
        unit: 'piece',
        supplierId: supplierId,
      });

      expect(product).toBeDefined();
      expect(product._id).toBeDefined();
      expect(product.sku).toBeDefined();
      expect(product.quantity).toBe(50);

      productId = product._id;
    });

    test('should get product by ID', async () => {
      const product = await repository.getProduct(productId);

      expect(product).toBeDefined();
      expect(product.name).toBe('Laptop Computer');
      expect(product.price).toBe(999.99);
    });

    test('should get product by SKU', async () => {
      const product = await repository.getProduct(productId);
      const productBySku = await repository.getProductBySku(product.sku);

      expect(productBySku._id.toString()).toBe(productId.toString());
    });

    test('should list products', async () => {
      const products = await repository.listProducts();

      expect(Array.isArray(products)).toBe(true);
      expect(products.length).toBeGreaterThan(0);
    });

    test('should update product quantity', async () => {
      // Sell 5 units
      const updated = await repository.updateProductQuantity(
        productId,
        -5,
        'Sold to customer'
      );

      expect(updated.quantity).toBe(45); // 50 - 5
    });

    test('should get inventory status', async () => {
      const status = await repository.getInventoryStatus();

      expect(status).toBeDefined();
      expect(status.totalProducts).toBeGreaterThan(0);
      expect(status.totalValue).toBeGreaterThan(0);
      expect(Array.isArray(status.lowStockItems)).toBe(true);
    });
  });

  describe('🛒 Purchase Order Operations', () => {
    test('should create purchase order', async () => {
      const order = await repository.createPurchaseOrder({
        supplierId: supplierId,
        items: [
          {
            productId: productId,
            quantity: 10,
            unitPrice: 600,
          },
        ],
        priority: 'high',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      expect(order).toBeDefined();
      expect(order._id).toBeDefined();
      expect(order.poNumber).toBeDefined();
      expect(order.status).toBe('draft');
      expect(order.items.length).toBe(1);
      expect(order.totalAmount).toBeGreaterThan(0);

      orderId = order._id;
    });

    test('should get purchase order', async () => {
      const order = await repository.getPurchaseOrder(orderId);

      expect(order).toBeDefined();
      expect(order.poNumber).toBeDefined();
      expect(order.items.length).toBe(1);
    });

    test('should list purchase orders', async () => {
      const orders = await repository.listPurchaseOrders();

      expect(Array.isArray(orders)).toBe(true);
      expect(orders.length).toBeGreaterThan(0);
    });

    test('should update order status', async () => {
      const updated = await repository.updateOrderStatus(
        orderId,
        'confirmed',
        'Order confirmed by supplier'
      );

      expect(updated.status).toBe('confirmed');
      expect(updated.statusHistory.length).toBeGreaterThan(0);

      const lastStatus = updated.statusHistory[updated.statusHistory.length - 1];
      expect(lastStatus.status).toBe('confirmed');
    });

    test('should update order to shipped', async () => {
      const updated = await repository.updateOrderStatus(
        orderId,
        'shipped',
        'Dispatched via DHL'
      );

      expect(updated.status).toBe('shipped');
    });
  });

  describe('🚚 Shipment Operations', () => {
    test('should create shipment', async () => {
      const shipment = await repository.createShipment({
        orderId: orderId,
        carrier: 'DHL',
        weight: 15.5,
        cost: 50,
      });

      expect(shipment).toBeDefined();
      expect(shipment._id).toBeDefined();
      expect(shipment.trackingNumber).toBeDefined();
      expect(shipment.carrier).toBe('DHL');
      expect(shipment.status).toBe('pending');

      shipmentId = shipment._id;
    });

    test('should get shipment by ID', async () => {
      const shipment = await repository.getShipment(shipmentId);

      expect(shipment).toBeDefined();
      expect(shipment.carrier).toBe('DHL');
    });

    test('should get shipment by tracking number', async () => {
      const shipment = await repository.getShipment(shipmentId);
      const byTracking = await repository.getShipmentByTracking(shipment.trackingNumber);

      expect(byTracking._id.toString()).toBe(shipmentId.toString());
    });

    test('should list shipments', async () => {
      const shipments = await repository.listShipments();

      expect(Array.isArray(shipments)).toBe(true);
      expect(shipments.length).toBeGreaterThan(0);
    });

    test('should update shipment status', async () => {
      const updated = await repository.updateShipmentStatus(
        shipmentId,
        'in-transit',
        'Package in transit to destination'
      );

      expect(updated.status).toBe('in-transit');
      expect(updated.statusHistory.length).toBeGreaterThan(0);
    });

    test('should track shipment to delivery', async () => {
      let shipment = await repository.getShipment(shipmentId);

      // Simulate delivery
      shipment = await repository.updateShipmentStatus(
        shipmentId,
        'delivered',
        'Package delivered successfully'
      );

      expect(shipment.status).toBe('delivered');
      expect(shipment.statusHistory.length).toBe(3); // pending → in-transit → delivered
    });
  });

  describe('📊 Analytics Operations', () => {
    test('should get analytics', async () => {
      const analytics = await repository.getAnalytics();

      expect(analytics).toBeDefined();
      expect(analytics.suppliers).toBeGreaterThanOrEqual(0);
      expect(analytics.products).toBeGreaterThanOrEqual(0);
      expect(analytics.orders).toBeGreaterThanOrEqual(0);
      expect(analytics.shipments).toBeGreaterThanOrEqual(0);
      expect(typeof analytics.inventoryValue).toBe('number');
      expect(typeof analytics.avgSupplierRating).toBe('number');
    });

    test('should have correct supplier count in analytics', async () => {
      const suppliers = await repository.listSuppliers();
      const analytics = await repository.getAnalytics();

      expect(analytics.suppliers).toBe(suppliers.length);
    });

    test('should have correct product count in analytics', async () => {
      const products = await repository.listProducts();
      const analytics = await repository.getAnalytics();

      expect(analytics.products).toBe(products.length);
    });
  });

  describe('🗑️  Delete Operations', () => {
    test('should delete shipment', async () => {
      const result = await repository.deleteShipment(shipmentId);
      expect(result.deletedCount).toBeGreaterThan(0);
    });

    test('should delete purchase order', async () => {
      const result = await repository.deletePurchaseOrder(orderId);
      expect(result.deletedCount).toBeGreaterThan(0);
    });

    test('should delete product', async () => {
      const result = await repository.deleteProduct(productId);
      expect(result.deletedCount).toBeGreaterThan(0);
    });

    test('should delete supplier', async () => {
      const result = await repository.deleteSupplier(supplierId);
      expect(result.deletedCount).toBeGreaterThan(0);
    });
  });

  describe('⚠️  Error Handling', () => {
    test('should handle invalid supplier ID', async () => {
      const supplier = await repository.getSupplier('invalid-id');
      expect(supplier).toBeNull();
    });

    test('should handle invalid product ID', async () => {
      const product = await repository.getProduct('invalid-id');
      expect(product).toBeNull();
    });

    test('should handle creating order without supplier', async () => {
      await expect(
        repository.createPurchaseOrder({
          supplierId: 'invalid-id',
          items: [],
        })
      ).rejects.toThrow();
    });

    test('should validate required fields', async () => {
      await expect(
        repository.createSupplier({
          // missing required fields
        })
      ).rejects.toThrow();
    });
  });

  describe('🔄 Data Relationships', () => {
    test('product should reference supplier', async () => {
      const newSupplier = await repository.createSupplier({
        name: 'Test Supplier',
        email: `test-${Date.now()}@test.com`,
        category: 'electronics',
      });

      const product = await repository.addProduct({
        sku: `TEST-${Date.now()}`,
        name: 'Test Product',
        price: 100,
        cost: 50,
        supplierId: newSupplier._id,
      });

      expect(product.supplierId.toString()).toBe(newSupplier._id.toString());
    });

    test('order should reference supplier and products', async () => {
      const supplier = await repository.createSupplier({
        name: 'Order Test Supplier',
        email: `order-${Date.now()}@test.com`,
        category: 'electronics',
      });

      const product = await repository.addProduct({
        sku: `ORDER-${Date.now()}`,
        name: 'Order Product',
        price: 200,
        cost: 100,
        supplierId: supplier._id,
      });

      const order = await repository.createPurchaseOrder({
        supplierId: supplier._id,
        items: [
          {
            productId: product._id,
            quantity: 5,
            unitPrice: 100,
          },
        ],
      });

      expect(order.supplierId.toString()).toBe(supplier._id.toString());
      expect(order.items[0].productId.toString()).toBe(product._id.toString());
    });
  });

  describe('📈 Performance Tests', () => {
    test('should list 100+ products efficiently', async () => {
      const startTime = Date.now();
      const products = await repository.listProducts({ limit: 100 });
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(1000); // Should complete in under 1 second
      expect(Array.isArray(products)).toBe(true);
    });

    test('should query by filter efficiently', async () => {
      const startTime = Date.now();
      const suppliers = await repository.listSuppliers({
        status: 'active',
        limit: 50,
      });
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(500); // Should complete in under 500ms
    });
  });
});
