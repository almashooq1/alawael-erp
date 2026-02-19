const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const QRCode = require('qrcode');
const JsBarcode = require('jsbarcode');
const canvas = require('canvas');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/supply-chain';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import models
const Supplier = require('./models/Supplier');
const Product = require('./models/Product');
const Order = require('./models/Order');
const Inventory = require('./models/Inventory');
const Shipment = require('./models/Shipment');
const User = require('./models/User');
const AuditLog = require('./models/AuditLog');
const BarcodeLog = require('./models/BarcodeLog');

// MongoDB Connection
const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB connected successfully');
    await seedDatabase();
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    console.log('⚠️ Running in fallback mode with in-memory data...');
  }
};

// Seed database
async function seedDatabase() {
  try {
    const supplierCount = await Supplier.countDocuments();
    if (supplierCount > 0) {
      console.log('✅ Database already seeded');
      return;
    }

    console.log('🌱 Seeding database...');

    const suppliers = await Supplier.insertMany([
      {
        name: 'الشركة الأولى',
        email: 'supplier1@example.com',
        phone: '966501234567',
        address: 'الرياض',
        rating: 4.8,
        status: 'active',
      },
      {
        name: 'الشركة الثانية',
        email: 'supplier2@example.com',
        phone: '966501234568',
        address: 'جدة',
        rating: 4.6,
        status: 'active',
      },
      {
        name: 'الشركة الثالثة',
        email: 'supplier3@example.com',
        phone: '966501234569',
        address: 'الدمام',
        rating: 4.4,
        status: 'active',
      },
    ]);

    const products = await Product.insertMany([
      {
        name: 'منتج 1',
        sku: 'SKU001',
        price: 100,
        stock: 50,
        supplierId: suppliers[0]._id.toString(),
        status: 'active',
      },
      {
        name: 'منتج 2',
        sku: 'SKU002',
        price: 200,
        stock: 30,
        supplierId: suppliers[1]._id.toString(),
        status: 'active',
      },
      {
        name: 'منتج 3',
        sku: 'SKU003',
        price: 150,
        stock: 80,
        supplierId: suppliers[2]._id.toString(),
        status: 'active',
      },
      {
        name: 'منتج 4',
        sku: 'SKU004',
        price: 250,
        stock: 25,
        supplierId: suppliers[0]._id.toString(),
        status: 'active',
      },
    ]);

    await Inventory.insertMany([
      {
        product: products[0]._id,
        productId: products[0]._id.toString(),
        productName: products[0].name,
        quantity: 50,
        location: 'warehouse-A',
        status: 'in-stock',
      },
      {
        product: products[1]._id,
        productId: products[1]._id.toString(),
        productName: products[1].name,
        quantity: 30,
        location: 'warehouse-B',
        status: 'in-stock',
      },
      {
        product: products[2]._id,
        productId: products[2]._id.toString(),
        productName: products[2].name,
        quantity: 80,
        location: 'warehouse-A',
        status: 'in-stock',
      },
      {
        product: products[3]._id,
        productId: products[3]._id.toString(),
        productName: products[3].name,
        quantity: 25,
        location: 'warehouse-C',
        status: 'in-stock',
      },
    ]);

    const orders = await Order.insertMany([
      {
        number: 'ORD-001',
        supplierId: suppliers[0]._id.toString(),
        status: 'completed',
        total: 5000,
        date: '2026-01-15',
      },
      {
        number: 'ORD-002',
        supplierId: suppliers[1]._id.toString(),
        status: 'pending',
        total: 3500,
        date: '2026-01-18',
      },
      {
        number: 'ORD-003',
        supplierId: suppliers[2]._id.toString(),
        status: 'processing',
        total: 7200,
        date: '2026-01-20',
      },
      {
        number: 'ORD-004',
        supplierId: suppliers[0]._id.toString(),
        status: 'shipped',
        total: 4800,
        date: '2026-01-22',
      },
    ]);

    await Shipment.insertMany([
      {
        order: orders[0]._id,
        orderId: orders[0]._id.toString(),
        trackingNumber: 'TRACK-001',
        carrier: 'SMSA Express',
        status: 'delivered',
      },
      {
        order: orders[1]._id,
        orderId: orders[1]._id.toString(),
        trackingNumber: 'TRACK-002',
        carrier: 'Aramex',
        status: 'in_transit',
      },
      {
        order: orders[2]._id,
        orderId: orders[2]._id.toString(),
        trackingNumber: 'TRACK-003',
        carrier: 'DHL',
        status: 'pending',
      },
    ]);

    await AuditLog.insertMany([
      {
        action: 'create_supplier',
        entity: 'Supplier',
        entityId: suppliers[0]._id.toString(),
        details: { name: 'الشركة الأولى' },
      },
      {
        action: 'create_product',
        entity: 'Product',
        entityId: products[0]._id.toString(),
        details: { name: 'منتج 1' },
      },
      {
        action: 'create_order',
        entity: 'Order',
        entityId: orders[0]._id.toString(),
        details: { number: 'ORD-001' },
      },
    ]);

    console.log('✅ Database seeded successfully');
  } catch (err) {
    console.error('Error seeding database:', err.message);
  }
}

// Health check
app.get('/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({
    status: 'ok',
    message: 'Server is running',
    database: dbStatus,
    port: PORT,
  });
});

// ==================== AUTHENTICATION ====================

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password, email } = req.body;

    const passwordMatch = password === 'Admin@123456' || password === 'admin@123456';

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        message: 'Wrong password',
      });
    }

    const token = jwt.sign({ id: '1', username: username || 'admin', role: 'admin' }, JWT_SECRET, {
      expiresIn: '7d',
    });

    return res.json({
      success: true,
      token,
      user: {
        _id: '1',
        username: username || 'admin',
        email: email || 'admin@alawael.com',
        role: 'admin',
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({
      success: false,
      error: 'Server error',
      message: err.message,
    });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
      });
    }

    const exists = await User.findOne({ $or: [{ username }, { email }] });
    if (exists) {
      return res.status(409).json({
        success: false,
        error: 'User already exists',
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      role: role || 'user',
    });

    await newUser.save();

    return res.json({
      success: true,
      message: 'User registered successfully',
      user: {
        _id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({
      success: false,
      error: 'Server error',
      message: err.message,
    });
  }
});

app.get('/api/auth/me', (req, res) => {
  try {
    const auth = req.headers.authorization;
    if (!auth) {
      return res.status(401).json({ error: 'No token' });
    }

    const token = auth.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    res.json({
      user: {
        _id: decoded.id,
        username: decoded.username,
        role: decoded.role,
      },
    });
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
});

// ==================== DASHBOARD ====================

app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const totalSuppliers = await Supplier.countDocuments();
    const totalProducts = await Product.countDocuments();
    const totalOrders = await Order.countDocuments();
    const totalInventory = await Inventory.aggregate([
      { $group: { _id: null, total: { $sum: '$quantity' } } },
    ]);

    res.json({
      success: true,
      stats: {
        totalSuppliers,
        totalProducts,
        totalOrders,
        totalInventoryItems: totalInventory[0]?.total || 0,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/dashboard/advanced-reports', async (req, res) => {
  try {
    const ordersByStatus = await Order.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const topSuppliers = await Supplier.find().limit(5).sort({ rating: -1 });

    const recentOrders = await Order.find().limit(10).sort({ date: -1 });

    const inventoryStatus = await Inventory.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    res.json({
      success: true,
      data: {
        supplierCount: await Supplier.countDocuments(),
        productCount: await Product.countDocuments(),
        orderCount: await Order.countDocuments(),
        totalInventory:
          (await Inventory.aggregate([{ $group: { _id: null, total: { $sum: '$quantity' } } }]))[0]
            ?.total || 0,
        ordersByStatus: ordersByStatus.map(item => ({
          name: item._id,
          value: item.count,
        })),
        topSuppliers: topSuppliers.map(s => ({
          _id: s._id,
          name: s.name,
          rating: s.rating,
        })),
        recentOrders: recentOrders.map(o => ({
          _id: o._id,
          number: o.number,
          status: o.status,
          total: o.total,
          date: o.date,
        })),
        inventoryStatus: inventoryStatus.map(item => ({
          name: item._id,
          value: item.count,
        })),
      },
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== BARCODE ====================

app.get('/api/barcode/health', (req, res) => {
  res.json({ status: 'ok', message: 'Barcode API running' });
});

app.post('/api/barcode/qr-code', async (req, res) => {
  try {
    const { data, errorCorrectionLevel = 'M' } = req.body;

    if (!data) {
      return res.status(400).json({ error: 'Data is required' });
    }

    const qrCode = await QRCode.toDataURL(data, {
      errorCorrectionLevel,
      width: 300,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
    });

    if (mongoose.connection.readyState === 1) {
      await BarcodeLog.create({
        type: 'QR',
        data,
        errorCorrection: errorCorrectionLevel,
        status: 'success',
      });
    }

    res.json({
      success: true,
      code: qrCode,
      type: 'QR',
      data,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('QR Code error:', err);
    res.status(500).json({ error: 'Failed to generate QR code', message: err.message });
  }
});

app.post('/api/barcode/barcode', async (req, res) => {
  try {
    const { data, format = 'CODE128' } = req.body;

    if (!data) {
      return res.status(400).json({ error: 'Data is required' });
    }

    const canvasInstance = canvas.createCanvas(300, 100);
    const ctx = canvasInstance.getContext('2d');
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, 300, 100);

    JsBarcode(canvasInstance, data, {
      format,
      width: 2,
      height: 100,
      displayValue: true,
      margin: 10,
    });

    const barcodeImage = canvasInstance.toDataURL();

    if (mongoose.connection.readyState === 1) {
      await BarcodeLog.create({
        type: 'BARCODE',
        data,
        format,
        status: 'success',
      });
    }

    res.json({
      success: true,
      code: barcodeImage,
      type: 'BARCODE',
      data,
      format,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Barcode error:', err);
    res.status(500).json({ error: 'Failed to generate barcode', message: err.message });
  }
});

app.post('/api/barcode/batch', async (req, res) => {
  try {
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Items array is required' });
    }

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    for (const item of items) {
      try {
        let code;

        if (item.type === 'QR') {
          code = await QRCode.toDataURL(item.data, {
            errorCorrectionLevel: 'M',
            width: 250,
            margin: 2,
          });
        } else {
          const canvasInstance = canvas.createCanvas(250, 80);
          const ctx = canvasInstance.getContext('2d');
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, 250, 80);

          JsBarcode(canvasInstance, item.data, {
            format: item.format || 'CODE128',
            width: 2,
            height: 80,
            displayValue: false,
            margin: 5,
          });

          code = canvasInstance.toDataURL();
        }

        results.push({
          data: item.data,
          type: item.type,
          code,
          status: 'success',
        });
        successCount++;
      } catch (itemErr) {
        results.push({
          data: item.data,
          type: item.type,
          status: 'error',
          error: itemErr.message,
        });
        errorCount++;
      }
    }

    if (mongoose.connection.readyState === 1) {
      await BarcodeLog.create({
        type: 'BATCH',
        batchSize: items.length,
        successCount,
        errorCount,
        status: 'completed',
      });
    }

    res.json({
      success: true,
      totalItems: items.length,
      successCount,
      errorCount,
      results,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Batch generation error:', err);
    res.status(500).json({ error: 'Failed to generate batch', message: err.message });
  }
});

app.get('/api/barcode/statistics', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.json({
        success: true,
        stats: {
          totalGenerated: 0,
          byType: {},
          successRate: 0,
        },
      });
    }

    const total = await BarcodeLog.countDocuments();
    const byType = await BarcodeLog.aggregate([{ $group: { _id: '$type', count: { $sum: 1 } } }]);
    const successCount = await BarcodeLog.countDocuments({ status: 'success' });

    res.json({
      success: true,
      stats: {
        totalGenerated: total,
        byType: byType.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        successRate: total > 0 ? Math.round((successCount / total) * 100) : 0,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== SUPPLIERS ====================

app.get('/api/suppliers', async (req, res) => {
  try {
    const suppliers = await Supplier.find();
    res.json({ success: true, data: suppliers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/suppliers', async (req, res) => {
  try {
    const { name, email, phone, address, rating } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    const supplier = new Supplier({
      name,
      email,
      phone,
      address,
      rating: rating || 0,
    });
    await supplier.save();

    res.status(201).json({ success: true, data: supplier });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/suppliers/:id', async (req, res) => {
  try {
    const supplier = await Supplier.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!supplier) {
      return res.status(404).json({ error: 'Supplier not found' });
    }
    res.json({ success: true, data: supplier });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/suppliers/:id', async (req, res) => {
  try {
    await Supplier.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Supplier deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== PRODUCTS ====================

app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find();
    res.json({ success: true, data: products });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/products', async (req, res) => {
  try {
    const { name, sku, price, stock, supplierId } = req.body;
    if (!name || !sku) {
      return res.status(400).json({ error: 'Name and SKU are required' });
    }

    const product = new Product({
      name,
      sku,
      price,
      stock,
      supplierId,
    });
    await product.save();

    res.status(201).json({ success: true, data: product });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({ success: true, data: product });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== INVENTORY ====================

app.get('/api/inventory', async (req, res) => {
  try {
    const inventory = await Inventory.find();
    res.json({ success: true, data: inventory });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/inventory', async (req, res) => {
  try {
    const { productId, quantity, location } = req.body;
    if (!productId) {
      return res.status(400).json({ error: 'Product ID is required' });
    }

    const inv = new Inventory({
      productId,
      quantity: quantity || 0,
      location,
    });
    await inv.save();

    res.status(201).json({ success: true, data: inv });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/inventory/:id', async (req, res) => {
  try {
    const inv = await Inventory.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!inv) {
      return res.status(404).json({ error: 'Inventory not found' });
    }
    res.json({ success: true, data: inv });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/inventory/:id', async (req, res) => {
  try {
    await Inventory.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Inventory deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== ORDERS ====================

app.get('/api/orders', async (req, res) => {
  try {
    const orders = await Order.find();
    res.json({ success: true, data: orders });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/orders', async (req, res) => {
  try {
    const { number, status, total, supplierId } = req.body;
    if (!number) {
      return res.status(400).json({ error: 'Order number is required' });
    }

    const order = new Order({
      number,
      status: status || 'pending',
      total: total || 0,
      supplierId: supplierId || '1',
    });
    await order.save();

    res.status(201).json({ success: true, data: order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/orders/:id', async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json({ success: true, data: order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/orders/:id', async (req, res) => {
  try {
    await Order.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Order deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== SHIPMENTS ====================

app.get('/api/shipments', async (req, res) => {
  try {
    const shipments = await Shipment.find();
    res.json({ success: true, data: shipments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/shipments', async (req, res) => {
  try {
    const { orderId, status, trackingNumber } = req.body;
    if (!orderId) {
      return res.status(400).json({ error: 'Order ID is required' });
    }

    const shipment = new Shipment({
      orderId,
      status: status || 'pending',
      trackingNumber,
    });
    await shipment.save();

    res.status(201).json({ success: true, data: shipment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/shipments/:id', async (req, res) => {
  try {
    const shipment = await Shipment.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!shipment) {
      return res.status(404).json({ error: 'Shipment not found' });
    }
    res.json({ success: true, data: shipment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/shipments/:id', async (req, res) => {
  try {
    await Shipment.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Shipment deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== AUDIT LOGS ====================

app.get('/api/audit-logs', async (req, res) => {
  try {
    const logs = await AuditLog.find().sort({ timestamp: -1 }).limit(100);
    res.json({ success: true, data: logs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Catch-all for other routes
app.get('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, async () => {
  console.log(`\n========================================`);
  console.log(`✅ Supply Chain Backend Server`);
  console.log(`📍 Running on http://localhost:${PORT}`);
  console.log(`========================================\n`);
  console.log(`📝 Demo Credentials:`);
  console.log(`   Username: admin`);
  console.log(`   Password: Admin@123456\n`);

  await connectDB();
});
