/**
 * examples/database-usage-examples.js
 * Practical Examples for Using MongoDB with the Supply Chain System
 * 
 * Shows how to:
 * 1. Connect to database
 * 2. Use repository methods
 * 3. Handle errors
 * 4. Query data
 * 5. Update records
 */

const repository = require('../repositories/supplyChainRepository');
const logger = require('../config/logger');

/**
 * Example 1: Create Supplier
 */
const exampleCreateSupplier = async () => {
  try {
    logger.info('📝 Example 1: Creating a supplier...');

    const supplier = await repository.createSupplier({
      name: 'Tech Electronics Co.',
      email: 'sales@techelectronics.com',
      phone: '+966-50-1234567',
      address: '123 Technology Street, Riyadh, Saudi Arabia',
      category: 'electronics',
      status: 'active',
    });

    logger.info('✅ Supplier created:', supplier._id);
    logger.info('Data:', {
      name: supplier.name,
      email: supplier.email,
      rating: supplier.rating,
    });

    return supplier;
  } catch (error) {
    logger.error('❌ Failed to create supplier:', error.message);
    throw error;
  }
};

/**
 * Example 2: List All Suppliers with Filters
 */
const exampleListSuppliers = async () => {
  try {
    logger.info('📋 Example 2: Listing suppliers...');

    // Simple list
    const suppliers = await repository.listSuppliers();
    logger.info('✅ Found suppliers:', suppliers.length);
    suppliers.forEach(s => {
      logger.info(`  - ${s.name} (${s.status}) | Rating: ${s.rating}/5`);
    });

    return suppliers;
  } catch (error) {
    logger.error('❌ Failed to list suppliers:', error.message);
    throw error;
  }
};

/**
 * Example 3: Create Product
 */
const exampleCreateProduct = async (supplierId) => {
  try {
    logger.info('📦 Example 3: Adding a product...');

    const product = await repository.addProduct({
      sku: 'LAPTOP-HP-001',
      name: 'HP Pavilion Laptop',
      description: '15.6" HD Display, Intel Core i7, 16GB RAM',
      category: 'computers',
      price: 899.99,
      cost: 550,
      quantity: 25,
      minLevel: 5,
      maxLevel: 100,
      unit: 'piece',
      supplierId: supplierId,
    });

    logger.info('✅ Product added:', product._id);
    logger.info('Data:', {
      sku: product.sku,
      name: product.name,
      price: product.price,
      quantity: product.quantity,
    });

    return product;
  } catch (error) {
    logger.error('❌ Failed to add product:', error.message);
    throw error;
  }
};

/**
 * Example 4: Get Inventory Status
 */
const exampleGetInventoryStatus = async () => {
  try {
    logger.info('📊 Example 4: Getting inventory status...');

    const status = await repository.getInventoryStatus();

    logger.info('✅ Inventory Status:');
    logger.info(`  - Total Products: ${status.totalProducts}`);
    logger.info(`  - Total Value: $${status.totalValue.toFixed(2)}`);
    logger.info(`  - Low Stock Items: ${status.lowStockItems.length}`);

    if (status.lowStockItems.length > 0) {
      logger.warn('⚠️  Low Stock Alert:');
      status.lowStockItems.forEach(item => {
        logger.warn(
          `   - ${item.name}: ${item.quantity} units (min: ${item.minLevel})`
        );
      });
    }

    return status;
  } catch (error) {
    logger.error('❌ Failed to get inventory status:', error.message);
    throw error;
  }
};

/**
 * Example 5: Update Product Quantity
 */
const exampleUpdateProductQuantity = async (productId) => {
  try {
    logger.info('🔄 Example 5: Updating product quantity...');

    // Simulate selling 5 units
    const updated = await repository.updateProductQuantity(
      productId,
      -5,
      'Sold to customer order #12345'
    );

    logger.info('✅ Product quantity updated:');
    logger.info(`  - New Quantity: ${updated.quantity}`);
    logger.info(`  - Transaction: -5 units`);
    logger.info(`  - Total Stock Value: $${(updated.quantity * updated.price).toFixed(2)}`);

    return updated;
  } catch (error) {
    logger.error('❌ Failed to update quantity:', error.message);
    throw error;
  }
};

/**
 * Example 6: Create Purchase Order
 */
const exampleCreatePurchaseOrder = async (supplierId, productId) => {
  try {
    logger.info('🛒 Example 6: Creating purchase order...');

    const order = await repository.createPurchaseOrder({
      supplierId: supplierId,
      items: [
        {
          productId: productId,
          quantity: 50,
          unitPrice: 550,
        },
      ],
      priority: 'high',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    });

    logger.info('✅ Purchase order created:', order._id);
    logger.info('Details:', {
      poNumber: order.poNumber,
      supplier: supplierId,
      items: order.items.length,
      totalAmount: `$${order.totalAmount.toFixed(2)}`,
      status: order.status,
      dueDate: order.dueDate.toLocaleDateString(),
    });

    return order;
  } catch (error) {
    logger.error('❌ Failed to create purchase order:', error.message);
    throw error;
  }
};

/**
 * Example 7: Update Order Status
 */
const exampleUpdateOrderStatus = async (orderId) => {
  try {
    logger.info('📬 Example 7: Updating order status...');

    const updated = await repository.updateOrderStatus(
      orderId,
      'shipped',
      'Order dispatched via DHL - Tracking #1234567890'
    );

    logger.info('✅ Order status updated:');
    logger.info(`  - PO Number: ${updated.poNumber}`);
    logger.info(`  - New Status: ${updated.status}`);
    logger.info(`  - Status History:`, updated.statusHistory.length, 'entries');

    return updated;
  } catch (error) {
    logger.error('❌ Failed to update order status:', error.message);
    throw error;
  }
};

/**
 * Example 8: Create Shipment
 */
const exampleCreateShipment = async (orderId) => {
  try {
    logger.info('🚚 Example 8: Creating shipment...');

    const shipment = await repository.createShipment({
      orderId: orderId,
      carrier: 'DHL',
      weight: 25.5,
      cost: 45.00,
    });

    logger.info('✅ Shipment created:', shipment._id);
    logger.info('Details:', {
      trackingNumber: shipment.trackingNumber,
      carrier: shipment.carrier,
      status: shipment.status,
      estimatedDelivery: shipment.estimatedDelivery.toLocaleDateString(),
      weight: `${shipment.weight} kg`,
    });

    return shipment;
  } catch (error) {
    logger.error('❌ Failed to create shipment:', error.message);
    throw error;
  }
};

/**
 * Example 9: Track Shipment
 */
const exampleTrackShipment = async (trackingNumber) => {
  try {
    logger.info('🔍 Example 9: Tracking shipment...');

    const shipment = await repository.getShipmentByTracking(trackingNumber);

    if (!shipment) {
      logger.warn('⚠️  Shipment not found:', trackingNumber);
      return null;
    }

    logger.info('✅ Shipment found:');
    logger.info(`  - Status: ${shipment.status}`);
    logger.info(`  - Location: ${shipment.location || 'Processing'}`);
    logger.info(`  - Estimated Delivery: ${shipment.estimatedDelivery.toLocaleDateString()}`);
    logger.info(`  - Carrier: ${shipment.carrier}`);

    if (shipment.statusHistory.length > 0) {
      logger.info('  - Status Updates:');
      shipment.statusHistory.forEach((entry, index) => {
        logger.info(
          `    ${index + 1}. ${entry.status} - ${entry.timestamp.toLocaleString()}`
        );
      });
    }

    return shipment;
  } catch (error) {
    logger.error('❌ Failed to track shipment:', error.message);
    throw error;
  }
};

/**
 * Example 10: Get Analytics
 */
const exampleGetAnalytics = async () => {
  try {
    logger.info('📈 Example 10: Getting analytics...');

    const analytics = await repository.getAnalytics();

    logger.info('✅ Analytics Summary:');
    logger.info(`  - Total Suppliers: ${analytics.suppliers}`);
    logger.info(`  - Total Products: ${analytics.products}`);
    logger.info(`  - Total Orders: ${analytics.orders}`);
    logger.info(`  - Total Shipments: ${analytics.shipments}`);
    logger.info(`  - Total Inventory Value: $${analytics.inventoryValue.toFixed(2)}`);
    logger.info(`  - Average Supplier Rating: ${analytics.avgSupplierRating.toFixed(2)}/5`);
    logger.info(`  - Order Success Rate: ${analytics.successfulOrders}/${analytics.orders} delivered`);

    return analytics;
  } catch (error) {
    logger.error('❌ Failed to get analytics:', error.message);
    throw error;
  }
};

/**
 * Example 11: Advanced Query - Filter Products
 */
const exampleFilterProducts = async () => {
  try {
    logger.info('🔎 Example 11: Filtering products...');

    // Get low stock products
    const products = await repository.listProducts({
      limit: 50,
    });

    const lowStock = products.filter(p => p.quantity < p.minLevel);

    logger.info('✅ Low Stock Products:');
    lowStock.forEach(p => {
      logger.info(
        `  - ${p.name}: ${p.quantity}/${p.minLevel} units (${((p.quantity / p.minLevel) * 100).toFixed(0)}% capacity)`
      );
    });

    return lowStock;
  } catch (error) {
    logger.error('❌ Failed to filter products:', error.message);
    throw error;
  }
};

/**
 * Example 12: Error Handling Pattern
 */
const exampleErrorHandling = async (supplierId) => {
  try {
    logger.info('⚠️  Example 12: Error handling pattern...');

    // Try to get non-existent supplier
    const supplier = await repository.getSupplier('invalid-id');

    if (!supplier) {
      logger.warn('Supplier not found - handling gracefully');
      return { error: 'Supplier not found', statusCode: 404 };
    }

    return supplier;
  } catch (error) {
    logger.error('Error occurred:', error.message);

    // Return appropriate error response
    return {
      error: error.message,
      statusCode: 500,
      timestamp: new Date().toISOString(),
    };
  }
};

/**
 * Run All Examples
 */
const runAllExamples = async () => {
  logger.info('\n🚀 Starting Database Usage Examples...\n');

  try {
    // 1. Create supplier
    const supplier = await exampleCreateSupplier();

    // 2. List suppliers
    await exampleListSuppliers();

    // 3. Add product
    const product = await exampleCreateProduct(supplier._id);

    // 4. Get inventory status
    await exampleGetInventoryStatus();

    // 5. Update quantity
    await exampleUpdateProductQuantity(product._id);

    // 6. Create order
    const order = await exampleCreatePurchaseOrder(supplier._id, product._id);

    // 7. Update order status
    await exampleUpdateOrderStatus(order._id);

    // 8. Create shipment
    const shipment = await exampleCreateShipment(order._id);

    // 9. Track shipment
    await exampleTrackShipment(shipment.trackingNumber);

    // 10. Get analytics
    await exampleGetAnalytics();

    // 11. Filter products
    await exampleFilterProducts();

    // 12. Error handling
    await exampleErrorHandling(supplier._id);

    logger.info('\n✅ All examples completed successfully!\n');
  } catch (error) {
    logger.error('❌ Example execution failed:', error.message);
  }
};

// Export all examples
module.exports = {
  exampleCreateSupplier,
  exampleListSuppliers,
  exampleCreateProduct,
  exampleGetInventoryStatus,
  exampleUpdateProductQuantity,
  exampleCreatePurchaseOrder,
  exampleUpdateOrderStatus,
  exampleCreateShipment,
  exampleTrackShipment,
  exampleGetAnalytics,
  exampleFilterProducts,
  exampleErrorHandling,
  runAllExamples,
};

// If run directly, execute all examples
if (require.main === module) {
  const { connectDB } = require('../config/database');

  connectDB().then(() => {
    runAllExamples().then(() => {
      process.exit(0);
    });
  });
}
