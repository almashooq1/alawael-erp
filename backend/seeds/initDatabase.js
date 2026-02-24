/**
 * Database Seeding & Migration Script
 * Populate initial data for testing and development
 */

const { Supplier, Product, PurchaseOrder, Shipment } = require('../models');
const logger = require('../utils/logger');

const seedData = async () => {
  try {
    logger.info('🌱 Starting database seeding...');

    // Check if data already exists
    const supplierCount = await Supplier.countDocuments();
    if (supplierCount > 0) {
      logger.info('✅ Database already populated, skipping seed');
      return;
    }

    // ==================== SEED SUPPLIERS ====================
    const suppliers = await Supplier.insertMany([
      {
        name: 'Premium Electronics Ltd',
        email: 'contact@premium-electronics.com',
        phone: '+966-556-789-012',
        address: 'Jeddah, Saudi Arabia',
        category: 'electronics',
        status: 'active',
        rating: 4.8,
        totalOrders: 45,
        totalSpent: 450000
      },
      {
        name: 'Global Furniture Co',
        email: 'sales@globalfurniture.com',
        phone: '+966-501-234-567',
        address: 'Riyadh, Saudi Arabia',
        category: 'furniture',
        status: 'active',
        rating: 4.5,
        totalOrders: 30,
        totalSpent: 125000
      },
      {
        name: 'Chemical Supplies Inc',
        email: 'order@chemsupp.com',
        phone: '+966-544-567-890',
        address: 'Dammam, Saudi Arabia',
        category: 'chemicals',
        status: 'active',
        rating: 4.2,
        totalOrders: 60,
        totalSpent: 280000
      },
      {
        name: 'Raw Materials Hub',
        email: 'procurement@rawmat.com',
        phone: '+966-555-111-222',
        address: 'Medina, Saudi Arabia',
        category: 'raw-materials',
        status: 'active',
        rating: 3.9,
        totalOrders: 25,
        totalSpent: 95000
      }
    ]);

    logger.info(`✅ Seeded ${suppliers.length} suppliers`);

    // ==================== SEED PRODUCTS ====================
    const products = await Product.insertMany([
      {
        sku: 'LAPTOP-001',
        name: 'Dell XPS 13',
        category: 'electronics',
        quantity: 45,
        minLevel: 5,
        maxLevel: 100,
        price: 1299.99,
        cost: 800.00,
        unit: 'piece',
        supplierId: suppliers[0]._id,
        reorderPoint: 15
      },
      {
        sku: 'MONITOR-001',
        name: '27" 4K Monitor',
        category: 'electronics',
        quantity: 120,
        minLevel: 10,
        maxLevel: 200,
        price: 599.99,
        cost: 350.00,
        unit: 'piece',
        supplierId: suppliers[0]._id,
        reorderPoint: 20
      },
      {
        sku: 'CHAIR-001',
        name: 'Ergonomic Office Chair',
        category: 'furniture',
        quantity: 35,
        minLevel: 5,
        maxLevel: 50,
        price: 299.99,
        cost: 150.00,
        unit: 'piece',
        supplierId: suppliers[1]._id,
        reorderPoint: 10
      },
      {
        sku: 'DESK-001',
        name: 'Executive Desk',
        category: 'furniture',
        quantity: 20,
        minLevel: 3,
        maxLevel: 30,
        price: 449.99,
        cost: 250.00,
        unit: 'piece',
        supplierId: suppliers[1]._id,
        reorderPoint: 8
      },
      {
        sku: 'CHEM-001',
        name: 'Industrial Cleaning Agent',
        category: 'chemicals',
        quantity: 500,
        minLevel: 50,
        maxLevel: 1000,
        price: 50.00,
        cost: 25.00,
        unit: 'liter',
        supplierId: suppliers[2]._id,
        reorderPoint: 150
      },
      {
        sku: 'STEEL-001',
        name: 'Stainless Steel Sheet (1mm)',
        category: 'raw-materials',
        quantity: 250,
        minLevel: 50,
        maxLevel: 500,
        price: 100.00,
        cost: 60.00,
        unit: 'piece',
        supplierId: suppliers[3]._id,
        reorderPoint: 100
      }
    ]);

    logger.info(`✅ Seeded ${products.length} products`);

    // ==================== SEED PURCHASE ORDERS ====================
    const orders = await PurchaseOrder.insertMany([
      {
        supplierId: suppliers[0]._id,
        items: [
          {
            productId: products[0]._id,
            quantity: 10,
            unitPrice: 1299.99,
            subtotal: 12999.90
          }
        ],
        totalAmount: 12999.90,
        status: 'delivered',
        priority: 'high',
        dueDate: new Date(Date.now() + 7*24*60*60*1000),
        deliveryDate: new Date(Date.now() - 2*24*60*60*1000),
        statusHistory: [
          {
            status: 'draft',
            timestamp: new Date(Date.now() - 10*24*60*60*1000),
            note: 'Order created'
          },
          {
            status: 'confirmed',
            timestamp: new Date(Date.now() - 8*24*60*60*1000),
            note: 'Order confirmed'
          },
          {
            status: 'shipped',
            timestamp: new Date(Date.now() - 5*24*60*60*1000),
            note: 'Order shipped'
          },
          {
            status: 'delivered',
            timestamp: new Date(Date.now() - 2*24*60*60*1000),
            note: 'Order delivered'
          }
        ]
      },
      {
        supplierId: suppliers[1]._id,
        items: [
          {
            productId: products[2]._id,
            quantity: 5,
            unitPrice: 299.99,
            subtotal: 1499.95
          }
        ],
        totalAmount: 1499.95,
        status: 'confirmed',
        priority: 'medium',
        dueDate: new Date(Date.now() + 7*24*60*60*1000),
        statusHistory: [
          {
            status: 'draft',
            timestamp: new Date(Date.now() - 3*24*60*60*1000),
            note: 'Order created'
          },
          {
            status: 'confirmed',
            timestamp: new Date(Date.now() - 1*24*60*60*1000),
            note: 'Order confirmed'
          }
        ]
      },
      {
        supplierId: suppliers[2]._id,
        items: [
          {
            productId: products[4]._id,
            quantity: 100,
            unitPrice: 50.00,
            subtotal: 5000.00
          }
        ],
        totalAmount: 5000.00,
        status: 'draft',
        priority: 'low',
        dueDate: new Date(Date.now() + 14*24*60*60*1000),
        statusHistory: [
          {
            status: 'draft',
            timestamp: new Date(),
            note: 'Order created'
          }
        ]
      }
    ]);

    logger.info(`✅ Seeded ${orders.length} purchase orders`);

    // ==================== SEED SHIPMENTS ====================
    const shipments = await Shipment.insertMany([
      {
        trackingNumber: 'DHL-' + Date.now(),
        orderId: orders[0]._id,
        carrier: 'DHL',
        status: 'delivered',
        location: 'Delivered',
        estimatedDelivery: new Date(Date.now() + 5*24*60*60*1000),
        actualDelivery: new Date(Date.now() - 2*24*60*60*1000),
        weight: 5.5,
        cost: 150.00,
        statusHistory: [
          {
            status: 'pending',
            location: 'Warehouse',
            timestamp: new Date(Date.now() - 10*24*60*60*1000),
            note: 'Shipment created'
          },
          {
            status: 'picked-up',
            location: 'Warehouse',
            timestamp: new Date(Date.now() - 8*24*60*60*1000),
            note: 'Picked up from warehouse'
          },
          {
            status: 'in-transit',
            location: 'Regional Hub - Jeddah',
            timestamp: new Date(Date.now() - 5*24*60*60*1000),
            note: 'International transit'
          },
          {
            status: 'out-for-delivery',
            location: 'Local Delivery Center',
            timestamp: new Date(Date.now() - 1*24*60*60*1000),
            note: 'Out for delivery'
          },
          {
            status: 'delivered',
            location: 'Customer Location',
            timestamp: new Date(Date.now() - 2*24*60*60*1000),
            note: 'Delivered successfully',
            coordinates: {
              latitude: 21.5433,
              longitude: 39.1728
            }
          }
        ],
        signedBy: 'John Doe'
      },
      {
        trackingNumber: 'ARAMEX-' + Date.now(),
        orderId: orders[1]._id,
        carrier: 'ARAMEX',
        status: 'in-transit',
        location: 'Regional Hub - Riyadh',
        estimatedDelivery: new Date(Date.now() + 3*24*60*60*1000),
        weight: 2.0,
        cost: 75.00,
        statusHistory: [
          {
            status: 'pending',
            location: 'Warehouse',
            timestamp: new Date(Date.now() - 1*24*60*60*1000),
            note: 'Shipment created'
          },
          {
            status: 'picked-up',
            location: 'Warehouse',
            timestamp: new Date(Date.now() - 12*60*60*1000),
            note: 'Picked up'
          },
          {
            status: 'in-transit',
            location: 'Regional Hub - Riyadh',
            timestamp: new Date(Date.now() - 2*60*60*1000),
            note: 'In transit'
          }
        ]
      }
    ]);

    logger.info(`✅ Seeded ${shipments.length} shipments`);

    logger.info('✅ Database seeding completed successfully');
    return {
      suppliers: suppliers.length,
      products: products.length,
      orders: orders.length,
      shipments: shipments.length
    };
  } catch (error) {
    logger.error(`❌ Seeding failed: ${error.message}`);
    throw error;
  }
};

/**
 * Clear all data
 */
const clearDatabase = async () => {
  try {
    logger.warn('🗑️  Clearing database...');
    
    await Promise.all([
      Supplier.deleteMany({}),
      Product.deleteMany({}),
      PurchaseOrder.deleteMany({}),
      Shipment.deleteMany({})
    ]);

    logger.warn('✅ Database cleared');
  } catch (error) {
    logger.error(`❌ Clear failed: ${error.message}`);
    throw error;
  }
};

/**
 * Reset database (clear + seed)
 */
const resetDatabase = async () => {
  try {
    await clearDatabase();
    return await seedData();
  } catch (error) {
    logger.error(`❌ Reset failed: ${error.message}`);
    throw error;
  }
};

module.exports = {
  seedData,
  clearDatabase,
  resetDatabase
};
