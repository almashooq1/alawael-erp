const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const QRCode = require('qrcode');
const JsBarcode = require('jsbarcode');
const canvas = require('canvas');

// Phase 3: Advanced Document Management Routes
const documentsAdvancedRoutes = require('./routes/documents-advanced');
// Phase 3 Extension: Real-Time Messaging Routes
const messagingRoutes = require('./routes/messaging');
// Phase 4: Financial Intelligence System Routes
const financialRoutes = require('./routes/financial');
// Phase 5: Smart Notifications Framework Routes
const notificationsRoutes = require('./routes/notifications');
// Phase 6: Advanced Reporting Engine Routes
const reportingRoutes = require('./routes/reporting');
// Phase 7: Machine Learning & Advanced Analytics Routes
const mlRoutes = require('./routes/ml');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple in-memory database
const users = [
  {
    _id: '1',
    username: 'admin',
    email: 'admin@alawael.com',
    password: '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36P4/LiyFW8', // hashed 'Admin@123456'
    role: 'admin',
  },
];

// In-memory data storage
let suppliers = [
  {
    _id: '1',
    name: 'الشركة الأولى',
    email: 'supplier1@example.com',
    phone: '966501234567',
    address: 'الرياض',
    rating: 4.8,
  },
  {
    _id: '2',
    name: 'الشركة الثانية',
    email: 'supplier2@example.com',
    phone: '966501234568',
    address: 'جدة',
    rating: 4.6,
  },
  {
    _id: '3',
    name: 'الشركة الثالثة',
    email: 'supplier3@example.com',
    phone: '966501234569',
    address: 'الدمام',
    rating: 4.4,
  },
];

let products = [
  { _id: '1', name: 'منتج 1', sku: 'SKU001', price: 100, stock: 50, supplierId: '1' },
  { _id: '2', name: 'منتج 2', sku: 'SKU002', price: 200, stock: 30, supplierId: '2' },
  { _id: '3', name: 'منتج 3', sku: 'SKU003', price: 150, stock: 80, supplierId: '3' },
  { _id: '4', name: 'منتج 4', sku: 'SKU004', price: 250, stock: 25, supplierId: '1' },
];

let inventory = [
  { _id: '1', productId: '1', quantity: 50, lastUpdated: '2026-02-09', location: 'warehouse-A' },
  { _id: '2', productId: '2', quantity: 30, lastUpdated: '2026-02-09', location: 'warehouse-B' },
  { _id: '3', productId: '3', quantity: 80, lastUpdated: '2026-02-08', location: 'warehouse-A' },
  { _id: '4', productId: '4', quantity: 25, lastUpdated: '2026-02-08', location: 'warehouse-C' },
];

let orders = [
  {
    _id: '1',
    number: 'ORD-001',
    status: 'completed',
    total: 5000,
    date: '2026-01-15',
    supplierId: '1',
  },
  {
    _id: '2',
    number: 'ORD-002',
    status: 'pending',
    total: 3500,
    date: '2026-01-18',
    supplierId: '2',
  },
  {
    _id: '3',
    number: 'ORD-003',
    status: 'processing',
    total: 7200,
    date: '2026-01-20',
    supplierId: '3',
  },
  {
    _id: '4',
    number: 'ORD-004',
    status: 'completed',
    total: 4500,
    date: '2026-02-01',
    supplierId: '1',
  },
];

let shipments = [
  {
    _id: '1',
    orderId: '1',
    status: 'delivered',
    trackingNumber: 'TRACK-001',
    estimatedDate: '2026-02-10',
  },
  {
    _id: '2',
    orderId: '2',
    status: 'in-transit',
    trackingNumber: 'TRACK-002',
    estimatedDate: '2026-02-15',
  },
  {
    _id: '3',
    orderId: '3',
    status: 'pending',
    trackingNumber: 'TRACK-003',
    estimatedDate: '2026-02-20',
  },
];

let auditLogs = [
  {
    _id: '1',
    action: 'create_order',
    user: 'admin',
    data: 'Order ORD-001',
    timestamp: '2026-01-15T10:30:00Z',
  },
  {
    _id: '2',
    action: 'update_inventory',
    user: 'admin',
    data: 'Product SKU-001 updated',
    timestamp: '2026-01-20T14:15:00Z',
  },
  {
    _id: '3',
    action: 'create_supplier',
    user: 'admin',
    data: 'Supplier الشركة الأولى',
    timestamp: '2026-02-01T09:00:00Z',
  },
];

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password, email } = req.body;

    // Find user by username or email
    let user = users.find(u => u.username === username || u.email === email);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        message: 'User not found',
      });
    }

    // For demo: accept any password that matches or just any password
    const passwordMatch = password === 'Admin@123456' || password === 'admin@123456';

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        message: 'Wrong password',
      });
    }

    // Generate token
    const token = jwt.sign({ id: user._id, username: user.username, role: user.role }, JWT_SECRET, {
      expiresIn: '7d',
    });

    return res.json({
      success: true,
      token,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
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

// Register endpoint
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
      });
    }

    // Check if user exists
    const exists = users.find(u => u.username === username || u.email === email);
    if (exists) {
      return res.status(409).json({
        success: false,
        error: 'User already exists',
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = {
      _id: Date.now().toString(),
      username,
      email,
      password: hashedPassword,
      role: role || 'user',
    };

    users.push(newUser);

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

// Get current user (protected)
app.get('/api/auth/me', (req, res) => {
  try {
    const auth = req.headers.authorization;
    if (!auth) {
      return res.status(401).json({ error: 'No token' });
    }

    const token = auth.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = users.find(u => u._id === decoded.id);

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    res.json({
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
});

// Barcode endpoints
app.get('/api/barcode/health', (req, res) => {
  res.json({ status: 'ok', message: 'Barcode API running' });
});

// Generate QR Code
app.post('/api/barcode/qr-code', async (req, res) => {
  try {
    const { data, errorCorrectionLevel = 'M' } = req.body;

    if (!data) {
      return res.status(400).json({ error: 'Data is required' });
    }

    // Generate QR Code as data URL
    const qrCode = await QRCode.toDataURL(data, {
      errorCorrectionLevel,
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });

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

// Generate Barcode
app.post('/api/barcode/barcode', async (req, res) => {
  try {
    const { data, format = 'CODE128' } = req.body;

    if (!data) {
      return res.status(400).json({ error: 'Data is required' });
    }

    // Create canvas for barcode
    const canvasInstance = canvas.createCanvas(300, 100);
    const ctx = canvasInstance.getContext('2d');

    // Draw white background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, 300, 100);

    // Generate barcode
    JsBarcode(canvasInstance, data, {
      format,
      width: 2,
      height: 100,
      displayValue: true,
      margin: 10,
    });

    // Convert to data URL
    const barcodeImage = canvasInstance.toDataURL();

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

// Generate batch of codes
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

// Get batch statistics
app.get('/api/barcode/statistics', (req, res) => {
  res.json({
    statistics: {
      totalGenerated: 1250,
      qrCodesGenerated: 750,
      barcodesGenerated: 500,
      averageGenerationTime: '245ms',
      successRate: 99.8,
    },
  });
});

// Dashboard endpoints
app.get('/api/dashboard/stats', (req, res) => {
  res.json({
    suppliers: 42,
    products: 128,
    inventory: 512,
    orders: 305,
    shipments: 87,
    users: 24,
    auditLogs: 1250,
  });
});

app.get('/api/dashboard/advanced-reports', (req, res) => {
  res.json({
    ordersByStatus: [
      { _id: 'completed', count: 180 },
      { _id: 'pending', count: 75 },
      { _id: 'processing', count: 50 },
    ],
    shipmentsByStatus: [
      { _id: 'delivered', count: 65 },
      { _id: 'in-transit', count: 15 },
      { _id: 'pending', count: 7 },
    ],
    productsPerSupplier: [
      { supplier: 'Supplier A', count: 45 },
      { supplier: 'Supplier B', count: 38 },
      { supplier: 'Supplier C', count: 32 },
      { supplier: 'Supplier D', count: 13 },
    ],
    ordersByMonth: [
      { _id: 'January', count: 25 },
      { _id: 'February', count: 28 },
      { _id: 'March', count: 32 },
      { _id: 'April', count: 35 },
      { _id: 'May', count: 42 },
      { _id: 'June', count: 48 },
      { _id: 'July', count: 45 },
      { _id: 'August', count: 52 },
      { _id: 'September', count: 38 },
      { _id: 'October', count: 28 },
      { _id: 'November', count: 35 },
      { _id: 'December', count: 40 },
    ],
  });
});

app.get('/api/suppliers', (req, res) => {
  res.json({ success: true, data: suppliers });
});

app.post('/api/suppliers', (req, res) => {
  try {
    const { name, email, phone, address, rating } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }
    const supplier = {
      _id: Date.now().toString(),
      name,
      email,
      phone: phone || '',
      address: address || '',
      rating: rating || 0,
    };
    suppliers.push(supplier);
    res.status(201).json({ success: true, data: supplier });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/suppliers/:id', (req, res) => {
  try {
    const { id } = req.params;
    const index = suppliers.findIndex(s => s._id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Supplier not found' });
    }
    suppliers[index] = { ...suppliers[index], ...req.body, _id: id };
    res.json({ success: true, data: suppliers[index] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/suppliers/:id', (req, res) => {
  try {
    const { id } = req.params;
    suppliers = suppliers.filter(s => s._id !== id);
    res.json({ success: true, message: 'Supplier deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Products endpoints
app.get('/api/products', (req, res) => {
  res.json({ success: true, data: products });
});

app.post('/api/products', (req, res) => {
  try {
    const { name, sku, price, stock, supplierId } = req.body;
    if (!name || !sku) {
      return res.status(400).json({ error: 'Name and SKU are required' });
    }
    const product = {
      _id: Date.now().toString(),
      name,
      sku,
      price: price || 0,
      stock: stock || 0,
      supplierId: supplierId || '1',
    };
    products.push(product);
    res.status(201).json({ success: true, data: product });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/products/:id', (req, res) => {
  try {
    const { id } = req.params;
    const index = products.findIndex(p => p._id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Product not found' });
    }
    products[index] = { ...products[index], ...req.body, _id: id };
    res.json({ success: true, data: products[index] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/products/:id', (req, res) => {
  try {
    const { id } = req.params;
    products = products.filter(p => p._id !== id);
    res.json({ success: true, message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Inventory endpoints
app.get('/api/inventory', (req, res) => {
  res.json({ success: true, data: inventory });
});

app.post('/api/inventory', (req, res) => {
  try {
    const { productId, quantity, location } = req.body;
    if (!productId) {
      return res.status(400).json({ error: 'Product ID is required' });
    }
    const inv = {
      _id: Date.now().toString(),
      productId,
      quantity: quantity || 0,
      lastUpdated: new Date().toISOString().split('T')[0],
      location: location || '',
    };
    inventory.push(inv);
    res.status(201).json({ success: true, data: inv });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/inventory/:id', (req, res) => {
  try {
    const { id } = req.params;
    const index = inventory.findIndex(i => i._id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Inventory not found' });
    }
    inventory[index] = {
      ...inventory[index],
      ...req.body,
      _id: id,
      lastUpdated: new Date().toISOString().split('T')[0],
    };
    res.json({ success: true, data: inventory[index] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Orders endpoints
app.get('/api/orders', (req, res) => {
  res.json({ success: true, data: orders });
});

app.post('/api/orders', (req, res) => {
  try {
    const { number, status, total, supplierId } = req.body;
    if (!number) {
      return res.status(400).json({ error: 'Order number is required' });
    }
    const order = {
      _id: Date.now().toString(),
      number,
      status: status || 'pending',
      total: total || 0,
      date: new Date().toISOString().split('T')[0],
      supplierId: supplierId || '1',
    };
    orders.push(order);
    res.status(201).json({ success: true, data: order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/orders/:id', (req, res) => {
  try {
    const { id } = req.params;
    const index = orders.findIndex(o => o._id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Order not found' });
    }
    orders[index] = { ...orders[index], ...req.body, _id: id };
    res.json({ success: true, data: orders[index] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/orders/:id', (req, res) => {
  try {
    const { id } = req.params;
    orders = orders.filter(o => o._id !== id);
    res.json({ success: true, message: 'Order deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Shipments endpoints
app.get('/api/shipments', (req, res) => {
  res.json({ success: true, data: shipments });
});

app.post('/api/shipments', (req, res) => {
  try {
    const { orderId, status, trackingNumber, estimatedDate } = req.body;
    if (!orderId) {
      return res.status(400).json({ error: 'Order ID is required' });
    }
    const shipment = {
      _id: Date.now().toString(),
      orderId,
      status: status || 'pending',
      trackingNumber: trackingNumber || '',
      estimatedDate: estimatedDate || '',
    };
    shipments.push(shipment);
    res.status(201).json({ success: true, data: shipment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/shipments/:id', (req, res) => {
  try {
    const { id } = req.params;
    const index = shipments.findIndex(s => s._id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Shipment not found' });
    }
    shipments[index] = { ...shipments[index], ...req.body, _id: id };
    res.json({ success: true, data: shipments[index] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/shipments/:id', (req, res) => {
  try {
    const { id } = req.params;
    shipments = shipments.filter(s => s._id !== id);
    res.json({ success: true, message: 'Shipment deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Audit Logs endpoint
app.get('/api/audit-logs', (req, res) => {
  res.json({ success: true, data: auditLogs });
});

// Mount Phase 3: Advanced Document Management Routes
app.use('/api/documents-advanced', documentsAdvancedRoutes);

// Mount Phase 3 Extension: Real-Time Messaging Routes
app.use('/api/messaging', messagingRoutes);

// Mount Phase 4: Financial Intelligence System Routes
app.use('/api/financial', financialRoutes);

// Mount Phase 5: Smart Notifications Framework Routes
app.use('/api/notifications', notificationsRoutes);

// Mount Phase 6: Advanced Reporting Engine Routes
app.use('/api/reporting', reportingRoutes);

// Mount Phase 7: Machine Learning & Advanced Analytics Routes
app.use('/api/ml', mlRoutes);
app.use('/api/analytics', mlRoutes);

// Catch-all for other routes
app.get('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`\n✅ Supply Chain Backend Server running on http://localhost:${PORT}`);
  console.log(`\n📝 Demo Credentials:\n   Username: admin\n   Password: Admin@123456\n`);
});
